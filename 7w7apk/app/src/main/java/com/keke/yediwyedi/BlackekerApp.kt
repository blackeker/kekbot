package com.keke.yediwyedi

import android.app.Application
import com.keke.yediwyedi.data.network.NetworkModule

class BlackekerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        NetworkModule.initialize(this)
        com.keke.yediwyedi.utils.NotificationUtils.createNotificationChannel(this)
    }
}
