package com.keke.yediwyedi.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.keke.yediwyedi.MainActivity
import com.keke.yediwyedi.R
import com.keke.yediwyedi.data.network.NetworkModule
import kotlinx.coroutines.*

class CaptchaPollService : Service() {

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private var isRunning = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isRunning) {
            isRunning = true
            createNotificationChannel()
            startForeground(SERVICE_ID, createNotification("Bot İzleniyor...", "Arkaplan servisi aktif."))
            startPolling()
        }
        return START_STICKY
    }

    private fun startPolling() {
        var wasLocked = false
        serviceScope.launch {
            while (isActive) {
                try {
                    val response = NetworkModule.api?.getStatus()
                    if (response != null && response.isSuccessful) {
                        val body = response.body()
                        val isLocked = body?.captchaState?.active == true || response.code() == 423
                        
                        if (isLocked && !wasLocked) {
                             sendCaptchaAlert(body?.captchaState?.imageBase64)
                        }
                        
                        wasLocked = isLocked
                    } else if (response?.code() == 423) {
                        if (!wasLocked) {
                            sendCaptchaAlert(null)
                        }
                        wasLocked = true
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(10000) // Her 10 saniyede bir kontrol (Hızlandırıldı)
            }
        }
    }

    private fun sendCaptchaAlert(imageBase64: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, ALERT_ID_STRING)
            .setContentTitle("⚠ CAPTCHA TESPİT EDİLDİ!")
            .setContentText("Bot kilitlendi. Çözmek için dokunun.")
            .setSmallIcon(R.drawable.ic_app_logo)
            .setPriority(NotificationCompat.PRIORITY_MAX) // Max priority for heads-up
            .setCategory(NotificationCompat.CATEGORY_ALARM) // Treat as alarm
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on lock screen
            .setDefaults(Notification.DEFAULT_ALL)
            .setVibrate(longArrayOf(0, 500, 200, 500)) // Custom vibration pattern
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(ALERT_ID, notification)
    }

    private fun createNotification(title: String, content: String): Notification {
        val channelId = CHANNEL_ID
        
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(R.drawable.ic_app_logo) 
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Bot Monitoring Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val alertChannel = NotificationChannel(
                ALERT_ID_STRING,
                "Captcha Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
            manager.createNotificationChannel(alertChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        isRunning = false
    }

    companion object {
        const val CHANNEL_ID = "BotServiceChannel"
        const val ALERT_ID_STRING = "BotAlertChannel"
        const val SERVICE_ID = 1001
        const val ALERT_ID = 1002
    }
}
