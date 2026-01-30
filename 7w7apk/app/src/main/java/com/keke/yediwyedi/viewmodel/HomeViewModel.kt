package com.keke.yediwyedi.viewmodel

import androidx.lifecycle.viewModelScope
// import androidx.lifecycle.ViewModel // Removed in favor of AndroidViewModel for Context access
import com.keke.yediwyedi.data.network.MessageRequest
import com.keke.yediwyedi.data.network.NetworkModule
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HomeViewModel(application: android.app.Application) : androidx.lifecycle.AndroidViewModel(application) {
    private val _isBotReady = MutableStateFlow(false)
    val isBotReady = _isBotReady.asStateFlow()

    private val _statusMessage = MutableStateFlow("Bekleniyor...")
    val statusMessage = _statusMessage.asStateFlow()

    private val _botUsername = MutableStateFlow<String?>(null)
    val botUsername = _botUsername.asStateFlow()

    private val _botStats = MutableStateFlow<com.keke.yediwyedi.data.network.BotStats?>(null)
    val botStats = _botStats.asStateFlow()

    private val _captchaImage = MutableStateFlow<String?>(null)
    val captchaImage = _captchaImage.asStateFlow()

    private var pollingJob: kotlinx.coroutines.Job? = null

    fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (true) {
                checkStatus()
                delay(30000) // 30 saniyede bir güncelle (Reduced Load)
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
    }

    private var previousReadyState = false

    fun checkStatus() {
        viewModelScope.launch {
            try {
                val response = NetworkModule.api?.getStatus()
                if (response != null && response.isSuccessful) {
                    val body = response.body()
                    val isNowReady = body?.data?.isReady == true
                    
                    // Notification Logic: If bot was ready and now is not
                    if (previousReadyState && !isNowReady) {
                         com.keke.yediwyedi.utils.NotificationHelper.showOfflineNotification(getApplication())
                    }
                    previousReadyState = isNowReady

                    _isBotReady.value = isNowReady
                    _botUsername.value = body?.data?.username
                    _botStats.value = body?.data?.stats
                    
                    if (body?.captchaState?.active == true) {
                        _captchaImage.value = body.captchaState.imageBase64
                        _statusMessage.value = "KİLİTLİ: Captcha Gerekli"
                        // Bildirim Servisi arka planda hallediyor, burada sadece UI state'i güncelliyoruz.
                    } else {
                        _captchaImage.value = null
                        _statusMessage.value = if (_isBotReady.value) "Çevrimiçi" else "Çevrimdışı"
                    }
                } else {
                    if (response?.code() == 423) {
                         _statusMessage.value = "KİLİTLİ (423)"
                         _captchaImage.value = "CAPTCHA_PLACEHOLDER"
                    } else {
                        _statusMessage.value = "Durum Hatası: ${response?.code()}"
                    }
                }
            } catch (e: Exception) {
                _statusMessage.value = "Bağlantı Hatası"
            }
        }
    }

    fun startBot() {
        viewModelScope.launch {
            try {
                NetworkModule.api?.startBot()
                delay(1000)
                checkStatus()
            } catch (e: Exception) {
                 _statusMessage.value = "Başlatma Hatası: ${e.localizedMessage}"
            }
        }
    }

    fun stopBot() {
        viewModelScope.launch {
            try {
                NetworkModule.api?.stopBot()
                delay(1000)
                checkStatus()
            } catch (e: Exception) {
                _statusMessage.value = "Durdurma Hatası: ${e.localizedMessage}"
            }
        }
    }
    
    fun sendMessage(channelId: String, message: String) {
         viewModelScope.launch {
            try {
                val response = NetworkModule.api?.sendMessage(MessageRequest(channelId, message))
                if (response?.code() == 423) {
                    _statusMessage.value = "KİLİTLİ: Önce Captcha'yı Çözün"
                    checkStatus() // Refresh to get captcha image
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun solveCaptcha(solution: String) {
        viewModelScope.launch {
            try {
                val response = NetworkModule.api?.solveCaptcha(com.keke.yediwyedi.data.network.CaptchaSolution(solution))
                if (response != null && response.isSuccessful) {
                    _statusMessage.value = "Çözüm Gönderildi, Bekleniyor..."
                    delay(3000)
                    checkStatus()
                } else {
                    _statusMessage.value = "Hata: ${response?.code()} - ${response?.message()}"
                }
            } catch (e: Exception) {
                 _statusMessage.value = "Hata: ${e.localizedMessage}"
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
    
    init {
        startPolling()
    }
}
