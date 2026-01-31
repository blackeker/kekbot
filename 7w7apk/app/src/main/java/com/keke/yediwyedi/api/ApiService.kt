package com.keke.yediwyedi.api

import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // --- Public ---
    @GET("health")
    suspend fun getHealth(): Response<ApiResponse<Any>>

    // --- Auth ---
    @GET("verify")
    suspend fun verifyToken(): Response<ApiResponse<UserVerifyResponse>>

    // --- Bot Control ---
    @GET("bot/status")
    suspend fun getBotStatus(): Response<ApiResponse<StatusResponse>>

    @POST("bot/start")
    suspend fun startBot(): Response<ApiResponse<Any>>

    @POST("bot/stop")
    suspend fun stopBot(): Response<ApiResponse<Any>>

    @POST("bot/features")
    suspend fun updateAutomationFeatures(@Body features: Map<String, Boolean>): Response<ApiResponse<Any>>

    @POST("bot/send-message")
    suspend fun sendMessage(@Body body: Map<String, String>): Response<ApiResponse<Any>>

    @GET("bot/logs")
    suspend fun getLogs(@Query("since") since: Long?): Response<ApiResponse<List<String>>>

    // --- Settings ---
    @GET("settings")
    suspend fun getSettings(): Response<ApiResponse<Settings>>

    @POST("settings")
    suspend fun updateSettings(@Body settings: Settings): Response<ApiResponse<Settings>>

    // --- Commands ---
    @GET("commands")
    suspend fun getCommands(): Response<ApiResponse<List<Command>>>

    @POST("commands/add")
    suspend fun addCommand(@Body body: Map<String, Command>): Response<ApiResponse<List<Command>>>

    @POST("commands")
    suspend fun saveCommands(@Body body: Map<String, List<Command>>): Response<ApiResponse<List<Command>>>

    @DELETE("commands/{index}")
    suspend fun deleteCommand(@Path("index") index: Int): Response<ApiResponse<List<Command>>>

    // --- Spam ---
    @GET("spam")
    suspend fun getSpamBots(): Response<ApiResponse<List<SpamBot>>>

    @POST("spam")
    suspend fun addSpamBot(@Body body: Map<String, String>): Response<ApiResponse<Any>> // body: { token: ... }

    @DELETE("spam/{id}")
    suspend fun deleteSpamBot(@Path("id") id: Int): Response<ApiResponse<Any>>

    @POST("spam/{id}/start")
    suspend fun startSpamBot(@Path("id") id: Int): Response<ApiResponse<Any>>

    @POST("spam/{id}/stop")
    suspend fun stopSpamBot(@Path("id") id: Int): Response<ApiResponse<Any>>

    @POST("spam/potato")
    suspend fun sendPotato(@Body body: Map<String, String>): Response<ApiResponse<Any>> // body: { targetUserId: ... }
}
