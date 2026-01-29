package com.keke.yediwyedi.data.network

import com.google.gson.annotations.SerializedName

data class CaptchaSolution(
    val solution: String
)

data class RegisterRequest(
    val token: String
)

data class RegisterResponse(
    val success: Boolean,
    val apiKey: String,
    val message: String?
)

data class StatusResponse(
    val success: Boolean,
    val data: BotStatusData?,
    val captchaState: CaptchaState?,
    val error: String?,
    val captchaRequired: Boolean?
)

data class BotStatusData(
    val username: String?,
    val id: String?,
    val isReady: Boolean,
    val stats: BotStats?
)

data class BotStats(
    val guilds: Int,
    val ping: Int,
    val uptime: String
)

data class CaptchaState(
    val active: Boolean,
    val imageBase64: String?,
    val timestamp: Long?
)

data class MessageRequest(
    val channelId: String,
    val message: String
)


// Command structure wrapped in "command" object for Add request
data class AddCommandRequest(
    val command: CommandItem
)

data class CommandItem(
    val trigger: String,
    @SerializedName("text") val response: String,
    val interval: Long?, 
    val type: String = "exact"
)

data class CommandListResponse(
    val success: Boolean,
    val data: List<CommandItem>
)

data class Settings(
    val theme: String,
    val rpcEnabled: Boolean,
    val rpcSettings: RpcSettings
)

data class RpcSettings(
    val type: String = "PLAYING",
    val name: String?,
    val details: String?,
    val state: String?,
    val largeImageKey: String?
)

data class VerifyResponse(
    val success: Boolean,
    val message: String,
    val user: UserData?
)

data class UserData(
    val username: String,
    val id: String
)

data class RpcUpdateRequest(
    val rpcEnabled: Boolean,
    val rpcSettings: RpcSettings
)

data class LogEntry(
    val timestamp: String,
    val type: String,
    val message: String
)

data class LogListResponse(
    val success: Boolean,
    val data: List<LogEntry>
)

data class CommandStat(
    @com.google.gson.annotations.SerializedName("command_text") val commandText: String,
    val count: Int
)

data class StatsResponse(
    val success: Boolean,
    val data: List<CommandStat>
)

data class SpamConfig(
    val channels: List<String> = emptyList(),
    val delay: Long = 10000,
    val randomMessages: Boolean = true
)

data class SpamBot(
    val id: Int,
    val user_id: String,
    val token: String, // Mask in UI
    val config: String?, // JSON String, stored as string in DB/API
    val is_active: Int // 0 or 1
)

data class SpamBotListResponse(
    val success: Boolean,
    val data: List<SpamBot>
)
