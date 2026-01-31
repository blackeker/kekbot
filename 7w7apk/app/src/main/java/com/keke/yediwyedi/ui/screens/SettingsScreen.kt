package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.keke.yediwyedi.api.AutoDeleteConfig
import com.keke.yediwyedi.api.RetrofitClient
import com.keke.yediwyedi.api.RpcSettings
import com.keke.yediwyedi.api.Settings
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }
    
    // State
    var channelId by remember { mutableStateOf("") }
    var rpcEnabled by remember { mutableStateOf(false) }
    var rpcTitle by remember { mutableStateOf("") }
    var rpcDetails by remember { mutableStateOf("") }
    
    var autoDeleteEnabled by remember { mutableStateOf(false) }
    var autoDeleteChannelId by remember { mutableStateOf("") }
    
    // Load
    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val res = RetrofitClient.getService().getSettings()
            if (res.isSuccessful) {
                val data = res.body()?.data
                if (data != null) {
                    channelId = data.channelId ?: ""
                    rpcEnabled = data.rpcEnabled ?: false
                    rpcTitle = data.rpcSettings?.title ?: ""
                    rpcDetails = data.rpcSettings?.details ?: ""
                    
                    autoDeleteEnabled = data.autoDeleteConfig?.enabled ?: false
                    autoDeleteChannelId = data.autoDeleteConfig?.channelId ?: ""
                }
            }
        } catch (e: Exception) {
        } finally {
            isLoading = false
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }

    fun save() {
        scope.launch {
            isLoading = true
            try {
                val settings = Settings(
                    channelId = channelId,
                    theme = "dark", // default
                    gemSystemEnabled = false,
                    rpcEnabled = rpcEnabled,
                    rpcSettings = RpcSettings(rpcTitle, rpcDetails, "large_image", "7W7 Bot"),
                    autoDeleteConfig = AutoDeleteConfig(autoDeleteEnabled, autoDeleteChannelId, null)
                )
                
                val res = RetrofitClient.getService().updateSettings(settings)
                if (res.isSuccessful) {
                    snackbarHostState.showSnackbar("Ayarlar Başarıyla Kaydedildi")
                } else {
                    snackbarHostState.showSnackbar("Hata: ${res.message()}")
                }
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Bağlantı Hatası: ${e.message}")
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Ayarlar") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Geri")
                    }
                },
                actions = {
                    IconButton(onClick = { save() }) {
                        Icon(Icons.Default.Save, "Kaydet")
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading) LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(padding))
        
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Genel", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            OutlinedTextField(
                value = channelId,
                onValueChange = { channelId = it },
                label = { Text("Ana Kanal ID") },
                modifier = Modifier.fillMaxWidth()
            )
            
            Divider()
            
            Text("Rich Presence (RPC)", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = rpcEnabled, onCheckedChange = { rpcEnabled = it })
                Spacer(modifier = Modifier.width(8.dp))
                Text("RPC Aktif Et")
            }
            if (rpcEnabled) {
                OutlinedTextField(
                    value = rpcTitle,
                    onValueChange = { rpcTitle = it },
                    label = { Text("Başlık (Oynuyor...)") },
                    modifier = Modifier.fillMaxWidth()
                )
                 OutlinedTextField(
                    value = rpcDetails,
                    onValueChange = { rpcDetails = it },
                    label = { Text("Detaylar") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            Divider()
            
            Text("Otomatik Silme", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
             Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = autoDeleteEnabled, onCheckedChange = { autoDeleteEnabled = it })
                Spacer(modifier = Modifier.width(8.dp))
                Text("Otomatik Silme Aktif")
            }
             if (autoDeleteEnabled) {
                OutlinedTextField(
                    value = autoDeleteChannelId,
                    onValueChange = { autoDeleteChannelId = it },
                    label = { Text("Hedef Kanal ID") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = { save() }, modifier = Modifier.fillMaxWidth()) {
                Text("TÜMÜNÜ KAYDET")
            }
        }
    }
}
