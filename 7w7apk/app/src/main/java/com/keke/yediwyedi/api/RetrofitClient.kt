package com.keke.yediwyedi.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var retrofit: Retrofit? = null
    private var currentBaseUrl: String = "http://193.106.196.39/api/" // Default
    private var apiKey: String? = null

    fun updateConfig(baseUrl: String, key: String?) {
        // Ensure trailing slash and api/ suffix
        var url = baseUrl
        if (!url.endsWith("/")) url += "/"
        if (!url.endsWith("api/")) url += "api/"
        
        currentBaseUrl = url
        apiKey = key
        retrofit = null // Force rebuild
    }

    fun getService(): ApiService {
        if (retrofit == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val authInterceptor = Interceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                
                apiKey?.let {
                    requestBuilder.header("x-api-key", it)
                    requestBuilder.header("Authorization", it)
                }

                val request = requestBuilder.build()
                chain.proceed(request)
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }
}
