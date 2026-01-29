package com.keke.yediwyedi.data.network

import android.content.Context
import com.keke.yediwyedi.data.local.TokenManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    private var retrofit: Retrofit? = null
    var api: BotApi? = null

    // Default URL, can be changed dynamically
    var BASE_URL = "http://193.106.196.39:3000/api/" 

    fun initialize(context: Context) {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val tokenManager = TokenManager(context)
        
        // Restore saved URL
        val savedUrl = tokenManager.getServerUrl()
        if (!savedUrl.isNullOrBlank()) {
            BASE_URL = if (savedUrl.endsWith("/")) savedUrl else "$savedUrl/"
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor(AuthInterceptor(tokenManager))
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .client(client)
            .build()

        api = retrofit?.create(BotApi::class.java)
    }

    fun updateBaseUrl(newUrl: String, context: Context) {
        BASE_URL = if (newUrl.endsWith("/")) newUrl else "$newUrl/"
        // Re-initialize to apply new URL
        initialize(context) 
    }
}
