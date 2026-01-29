package com.keke.yediwyedi.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.keke.yediwyedi.data.network.NetworkModule
import com.keke.yediwyedi.data.network.RegisterRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.keke.yediwyedi.data.local.TokenManager
import android.content.Context

class LoginViewModel : ViewModel() {
    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _loginError = MutableStateFlow<String?>(null)
    val loginError = _loginError.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun loginWithKey(apiKey: String, serverUrl: String, context: Context, rememberMe: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            _loginError.value = null
            
            try {
                if (serverUrl.isNotBlank() && serverUrl != NetworkModule.BASE_URL) {
                     NetworkModule.updateBaseUrl(serverUrl, context)
                }

                // Verify request preparation
                val tokenManager = TokenManager(context)
                
                // We MUST save the key for the Interceptor to work for the verify() call and subsequent calls.
                tokenManager.saveApiKey(apiKey)
                tokenManager.saveServerUrl(serverUrl)
                
                // Perform Verification
                val response = NetworkModule.api?.verify()
                
                if (response != null && response.isSuccessful && response.body()?.success == true) {
                    _isLoggedIn.value = true
                    // If user DID NOT check remember me, we can't easily "session only" without arch changes.
                    // For now, we persist. Ideally we'd save a "remember_me" flag and check it on app launch.
                } else {
                    _loginError.value = "Geçersiz API Anahtarı veya Sunucu Hatası"
                    // Login failed, so clear the invalid key
                    tokenManager.clearApiKey() 
                }
            } catch (e: Exception) {
                _loginError.value = "Hata: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun attemptRegister(token: String, serverUrl: String, context: Context, rememberMe: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            _loginError.value = null
            
            try {
                if (serverUrl.isNotBlank() && serverUrl != NetworkModule.BASE_URL) {
                     NetworkModule.updateBaseUrl(serverUrl, context)
                }

                val response = NetworkModule.api?.register(RegisterRequest(token))
                if (response != null && response.isSuccessful) {
                     val apiKey = response.body()?.apiKey
                     if (apiKey != null) {
                         val tokenManager = TokenManager(context)
                         tokenManager.saveApiKey(apiKey) // Must save for session
                         tokenManager.saveServerUrl(serverUrl)
                         _isLoggedIn.value = true
                     } else {
                         _loginError.value = "Boş API Key döndü."
                     }
                } else {
                    _loginError.value = "Kayıt Başarısız: ${response?.code()} ${response?.message()}"
                }
            } catch (e: Exception) {
                _loginError.value = "Hata: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun checkSession(context: Context) {
        viewModelScope.launch {
            val tokenManager = TokenManager(context)
            if (tokenManager.getApiKey() != null) {
                _isLoading.value = true
                try {
                    val response = NetworkModule.api?.verify()
                    if (response != null && response.isSuccessful && response.body()?.success == true) {
                        _isLoggedIn.value = true
                    } else {
                        // Key invalid, clear it? Or just don't log in.
                        // tokenManager.clearApiKey() // Optional
                    }
                } catch (e: Exception) {
                    // Ignore connection errors during auto-check
                } finally {
                    _isLoading.value = false
                }
            }
        }
    }
}
