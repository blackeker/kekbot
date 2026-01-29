package com.keke.yediwyedi.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.keke.yediwyedi.data.network.AddCommandRequest
import com.keke.yediwyedi.data.network.CommandItem
import com.keke.yediwyedi.data.network.NetworkModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CommandViewModel : ViewModel() {
    private val _commands = MutableStateFlow<List<CommandItem>>(emptyList())
    val commands = _commands.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    fun fetchCommands() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = NetworkModule.api?.getCommands()
                if (response != null && response.isSuccessful) {
                    _commands.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle Error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addCommand(trigger: String, response: String, interval: Long) {
        viewModelScope.launch {
            try {
                val request = AddCommandRequest(CommandItem(trigger, response, interval))
                NetworkModule.api?.addCommand(request)
                fetchCommands()
            } catch (e: Exception) {}
        }
    }

    fun updateCommand(index: Int, trigger: String, response: String, interval: Long) {
        viewModelScope.launch {
            try {
                val request = AddCommandRequest(CommandItem(trigger, response, interval))
                NetworkModule.api?.updateCommand(index, request)
                fetchCommands()
            } catch (e: Exception) {}
        }
    }

    fun deleteCommand(index: Int) {
        viewModelScope.launch {
             try {
                NetworkModule.api?.deleteCommand(index)
                fetchCommands()
            } catch (e: Exception) {}
        }
    }

    init {
        fetchCommands()
    }
}
