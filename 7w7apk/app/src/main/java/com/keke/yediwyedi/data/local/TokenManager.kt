package com.keke.yediwyedi.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveApiKey(apiKey: String) {
        sharedPreferences.edit().putString("api_key", apiKey).apply()
    }

    fun getApiKey(): String? {
        return sharedPreferences.getString("api_key", null)
    }

    fun clearApiKey() {
        sharedPreferences.edit().remove("api_key").apply()
    }

    fun saveServerUrl(url: String) {
        sharedPreferences.edit().putString("server_url", url).apply()
    }

    fun getServerUrl(): String? {
        return sharedPreferences.getString("server_url", null)
    }
}
