package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.keke.yediwyedi.api.RetrofitClient
import com.keke.yediwyedi.data.UserPreferences
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit, prefs: UserPreferences) {
    var url by remember { mutableStateOf(prefs.getBaseUrl()) }
    var apiKey by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("7W7 Bot Control", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("API URL") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = apiKey,
            onValueChange = { apiKey = it },
            label = { Text("API Key") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(24.dp))

        if (isLoading) {
            CircularProgressIndicator()
        } else {
            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        errorMsg = null
                        try {
                            // Update Client
                            RetrofitClient.updateConfig(url, apiKey)
                            // Test Connect
                            val response = RetrofitClient.getService().verifyToken()
                            if (response.isSuccessful && response.body()?.success == true) {
                                prefs.saveConfig(url, apiKey)
                                onLoginSuccess()
                            } else {
                                errorMsg = "Login Failed: ${response.code()} ${response.message()}"
                            }
                        } catch (e: Exception) {
                            errorMsg = "Connection Error: ${e.message}"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Connect")
            }
        }

        errorMsg?.let {
            Spacer(modifier = Modifier.height(16.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
    }
}
