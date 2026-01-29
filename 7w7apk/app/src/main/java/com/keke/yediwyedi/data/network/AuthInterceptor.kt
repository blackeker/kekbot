package com.keke.yediwyedi.data.network

import com.keke.yediwyedi.data.local.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val apiKey = tokenManager.getApiKey()
        val requestBuilder = chain.request().newBuilder()

        if (!apiKey.isNullOrBlank()) {
            requestBuilder.addHeader("x-api-key", apiKey)
        }

        return chain.proceed(requestBuilder.build())
    }
}
