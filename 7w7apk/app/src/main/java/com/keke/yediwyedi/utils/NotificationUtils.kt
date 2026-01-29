package com.keke.yediwyedi.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.keke.yediwyedi.R

object NotificationUtils {
    const val CHANNEL_ID = "bot_alerts"
    const val NOTIFICATION_ID = 1001

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Bot Alerts"
            val descriptionText = "Notifications for Bot Status and Captcha"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showCaptchaNotification(context: Context) {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher_round) // Fallback to launcher icon
            .setContentTitle("⚠ Captcha Gerekli!")
            .setContentText("Bot kilitlendi. Captcha'yı çözmek için lütfen uygulamayı açın.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(android.app.Notification.DEFAULT_ALL)
            .setAutoCancel(true)

        try {
             // In a real app we check permission first, but assuming it's granted or handled
             // This is a helper function
             val notificationManager = NotificationManagerCompat.from(context)
             if (notificationManager.areNotificationsEnabled()) { 
                notificationManager.notify(NOTIFICATION_ID, builder.build())
             }
        } catch (e: SecurityException) {
            // Permission not granted
        }
    }
}
