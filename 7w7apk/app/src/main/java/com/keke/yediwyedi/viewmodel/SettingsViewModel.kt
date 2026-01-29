package com.keke.yediwyedi.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.keke.yediwyedi.data.network.NetworkModule
import com.keke.yediwyedi.data.network.Settings
import com.keke.yediwyedi.data.network.RpcSettings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel : ViewModel() {
    private val _settings = MutableStateFlow<Settings?>(null)
    val settings = _settings.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    fun fetchSettings() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = NetworkModule.api?.getSettings()
                if (response != null && response.isSuccessful) {
                    _settings.value = response.body()
                }
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateSettings(
        theme: String,
        rpcEnabled: Boolean
    ) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                // For general settings update, we might preserve existing RPC settings or pass null if not updating them here
                // But Settings data class requires rpcSettings.
                val currentRpc = _settings.value?.rpcSettings ?: RpcSettings(name="", details="", state="", largeImageKey="")
                
                val newSettings = Settings(
                    theme = theme,
                    rpcEnabled = rpcEnabled,
                    rpcSettings = currentRpc
                )
                val response = NetworkModule.api?.updateSettings(newSettings)
                if (response != null && response.isSuccessful) {
                    fetchSettings() 
                }
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateRpc(
        rpcEnabled: Boolean,
        type: String,
        name: String,
        details: String,
        state: String,
        largeImageKey: String
    ) {
        viewModelScope.launch {
             try {
                _isLoading.value = true
                val rpc = RpcSettings(
                    type = type,
                    name = name,
                    details = details,
                    state = state,
                    largeImageKey = largeImageKey
                )
                val request = com.keke.yediwyedi.data.network.RpcUpdateRequest(
                    rpcEnabled = rpcEnabled,
                    rpcSettings = rpc
                )
                val response = NetworkModule.api?.updateRpc(request)
                if (response != null && response.isSuccessful) {
                    fetchSettings()
                }
             } catch (e: Exception) {
                 e.printStackTrace()
             } finally {
                 _isLoading.value = false
             }
        }
    }

    init {
        fetchSettings()
    }
}
