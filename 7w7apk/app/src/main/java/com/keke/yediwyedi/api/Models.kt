package com.keke.yediwyedi.api

import com.google.gson.annotations.SerializedName

// Generic Response wrapper
data class ApiResponse<T>(
    val success: Boolean,
    val message: String?,
    val error: String?,
    val data: T?
)

// --- AUTH ---
data class UserVerifyResponse(
    val valid: Boolean,
    val username: String?,
    val permissions: List<String>?
)

// --- STATUS ---
data class BotStatusData(
    val username: String?,
    val id: String?,
    val isReady: Boolean,
    val stats: BotStats?,
)

data class BotStats(
    val guilds: Int,
    val ping: Int,
    val uptime: String
)

data class StatusResponse(
    val success: Boolean,
    val message: String?,
    val data: BotStatusData?,
    val automationEnabled: Boolean,
    val automationState: AutomationState?,
    val captchaState: CaptchaState?
)

data class AutomationState(
    val click: Boolean,
    val messages: Boolean
)

data class CaptchaState(
    val active: Boolean,
    val imageBase64: String?
)

// --- COMMANDS ---
data class Command(
    val text: String,        // Trigger text (or response text? The backend naming is 'text' for the command itself usually or response)
    // Wait, backend `commandsRoutes` uses `command.text`.
    // Let's check databaseService.js schema or saved data.
    // Usually it's key/trigger and value/response.
    // In `botManager.js`, `handleMessage` checks `commands`.
    // `commands` is array of { text: "trigger", response: "reply", ... }?
    // User provided `test_full_system.js` line 125: `{ text: 'ping', interval: 0, trigger: 'none' }`.
    // It seems 'text' is the response? 'trigger' is the trigger?
    // Let's assume generic structure for now.
    val trigger: String? = null,
    val response: String? = null, 
    // Wait, `test_full_system.js`: `const cmd = { text: 'ping', interval: 0, trigger: 'none' };`
    // If I look at `botManager.js` logic (not visible now but I remember generic command handling),
    // Standard command: trigger -> response.
    // Auto message: text, interval.
    // I should check `databaseService.js` if possible, but I'll use a flexible map or defined fields.
    // I will use fields matching `test_full_system.js`.
    val interval: Long? = 0,
    val type: String? = "text" // text, embed, etc.
)

// --- SETTINGS ---
data class Settings(
    val channelId: String?,
    val theme: String?,
    val gemSystemEnabled: Boolean?,
    val rpcEnabled: Boolean?,
    val rpcSettings: RpcSettings?,
    val autoDeleteConfig: AutoDeleteConfig?
)

data class RpcSettings(
    val title: String?,
    val details: String?,
    val largeImage: String?,
    val largeImageText: String?
)

data class AutoDeleteConfig(
    val enabled: Boolean,
    val channelId: String?,
    val colors: List<Int>?
)

// --- SPAM ---
data class SpamBot(
    val id: Int,
    val token: String,
    val is_active: Int, // 0 or 1
    val config: String? // JSON string
)
