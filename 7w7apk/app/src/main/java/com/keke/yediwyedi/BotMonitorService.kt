package com.keke.yediwyedi

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.keke.yediwyedi.api.RetrofitClient
import com.keke.yediwyedi.data.UserPreferences
import kotlinx.coroutines.*

class BotMonitorService : Service() {

    private val serviceJob = Job()
    private val scope = CoroutineScope(Dispatchers.IO + serviceJob)
    private val NOTIFICATION_ID = 1
    private val ALERT_ID = 2
    private val CHANNEL_ID = "BotMonitorChannel"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification("Bot İzleniyor", "Bağlantı kuruluyor..."))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Ensure config is loaded
        val prefs = UserPreferences(this)
        val key = prefs.getApiKey()
        if (key != null) {
            RetrofitClient.updateConfig(prefs.getBaseUrl(), key)
            startMonitoring()
        } else {
            stopSelf()
        }
        return START_STICKY
    }

    private fun startMonitoring() {
        scope.launch {
            while (isActive) {
                try {
                    val res = RetrofitClient.getService().getBotStatus()
                    if (res.isSuccessful && res.body()?.success == true) {
                        val body = res.body()!!
                        val data = body.data
                        val isReady = data?.isReady == true
                        val captchaActive = body.captchaState?.active == true
                        
                        // Update Foreground Notification
                        val statusText = if (isReady) "Bot: AKTİF" else "Bot: KAPALI"
                        val contentText = if (captchaActive) "⚠️ CAPTCHA BEKLİYOR!" else "Ping: ${data?.stats?.ping}ms"
                        
                        val notif = createNotification(statusText, contentText)
                        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        manager.notify(NOTIFICATION_ID, notif)

                        // Send Alert if Captcha
                        if (captchaActive) {
                             sendAlert("⚠️ DİKKAT: CAPTCHA", "Bot doğrulama bekliyor! Çözmek için dokunun.")
                        }
                    }
                } catch (e: Exception) {
                    // Ignore errors
                }
                delay(3000) // 3 Seconds Loop - Faster
            }
        }
    }

    private fun sendAlert(title: String, content: String) {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(ALERT_ID, builder.build())
    }

    private fun createNotification(title: String, content: String): android.app.Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.sym_def_app_icon)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Bot İzleme Servisi",
                NotificationManager.IMPORTANCE_LOW 
            ).apply {
                description = "Bot durumunu arka planda izler"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }
}
