package com.keke.yediwyedi.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface BotApi {
    @POST("register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @GET("verify")
    suspend fun verify(): Response<VerifyResponse>

    @GET("bot/status")
    suspend fun getStatus(): Response<StatusResponse>

    @POST("bot/start")
    suspend fun startBot(): Response<Unit>

    @POST("bot/stop")
    suspend fun stopBot(): Response<Unit>

    @POST("bot/send-message")
    suspend fun sendMessage(@Body request: MessageRequest): Response<Unit>

    @POST("bot/solve-captcha")
    suspend fun solveCaptcha(@Body solution: CaptchaSolution): Response<Unit>

    @GET("bot/commands")
    suspend fun getCommands(): Response<CommandListResponse>

    @POST("bot/commands/add")
    suspend fun addCommand(@Body request: AddCommandRequest): Response<Unit>

    @PUT("bot/commands/{index}")
    suspend fun updateCommand(@Path("index") index: Int, @Body request: AddCommandRequest): Response<Unit>

    @DELETE("bot/commands/{index}")
    suspend fun deleteCommand(@Path("index") index: Int): Response<Unit>

    @GET("bot/settings")
    suspend fun getSettings(): Response<Settings>

    @POST("bot/settings")
    suspend fun updateSettings(@Body settings: Settings): Response<Unit>

    @POST("bot/settings/rpc")
    suspend fun updateRpc(@Body request: RpcUpdateRequest): Response<Unit>

    @GET("bot/logs")
    suspend fun getLogs(@Query("since") since: String?): Response<LogListResponse>

    @GET("bot/stats")
    suspend fun getStats(): Response<StatsResponse>

    // Spam System
    @GET("spam")
    suspend fun getSpamBots(): Response<SpamBotListResponse>

    @POST("spam")
    suspend fun addSpamBot(@Body body: Map<String, String>): Response<Unit>

    @DELETE("spam/{id}")
    suspend fun deleteSpamBot(@Path("id") id: Int): Response<Unit>

    @POST("spam/{id}/start")
    suspend fun startSpamBot(@Path("id") id: Int): Response<Unit>

    @POST("spam/{id}/stop")
    suspend fun stopSpamBot(@Path("id") id: Int): Response<Unit>

    @POST("spam/{id}/config")
    suspend fun updateSpamConfig(@Path("id") id: Int, @Body body: SpamConfigRequest): Response<Unit>
}
