package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.viewmodel.SettingsViewModel

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = viewModel()
) {
    val settings by viewModel.settings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var rpcEnabled by remember(settings) { mutableStateOf(settings?.rpcEnabled ?: true) }
    
    // RPC V2 Variables
    var rpcType by remember(settings) { mutableStateOf(settings?.rpcSettings?.type ?: "PLAYING") }
    var rpcName by remember(settings) { mutableStateOf(settings?.rpcSettings?.name ?: "") }
    var rpcDetails by remember(settings) { mutableStateOf(settings?.rpcSettings?.details ?: "") }
    var rpcState by remember(settings) { mutableStateOf(settings?.rpcSettings?.state ?: "") }
    var rpcLargeImage by remember(settings) { mutableStateOf(settings?.rpcSettings?.largeImageKey ?: "") }
    
    var theme by remember(settings) { mutableStateOf(settings?.theme ?: "dark") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F2027))
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Text(
                text = "Ayarlar",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
        }

        if (isLoading && settings == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                 CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
            ) {
                // RPC Section
                SettingsSection(title = "Rich Presence (RPC)") {
                    Row(
                        verticalAlignment = Alignment.CenterVertically, 
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Text("Aktif Et", color = Color.White, modifier = Modifier.weight(1f))
                        Switch(checked = rpcEnabled, onCheckedChange = { rpcEnabled = it })
                    }
                    
                    if (rpcEnabled) {
                        StyledTextField(value = rpcType, onValueChange = { rpcType = it }, label = "Aktivite Tipi (PLAYING/WATCHING)")
                        StyledTextField(value = rpcName, onValueChange = { rpcName = it }, label = "Başlık (Uygulama Adı)")
                        StyledTextField(value = rpcDetails, onValueChange = { rpcDetails = it }, label = "Üst Satır (Details)")
                        StyledTextField(value = rpcState, onValueChange = { rpcState = it }, label = "Alt Satır (State)")
                        StyledTextField(value = rpcLargeImage, onValueChange = { rpcLargeImage = it }, label = "Büyük Resim Key/URL")
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(
                            onClick = {
                                viewModel.updateRpc(rpcEnabled, rpcType, rpcName, rpcDetails, rpcState, rpcLargeImage)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                             Text("RPC GÜNCELLE", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // General Section (Placeholder for now)
                SettingsSection(title = "Uygulama") {
                     Row(
                        verticalAlignment = Alignment.CenterVertically, 
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Tema Modu (Yakında)", color = Color.Gray, modifier = Modifier.weight(1f))
                        Text(theme.uppercase(), color = MaterialTheme.colorScheme.primary)
                    }
                }
                
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun SettingsSection(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1E2A32), RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        content()
    }
}

@Composable
fun StyledTextField(value: String, onValueChange: (String) -> Unit, label: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = Color.Gray) },
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
        ),
        singleLine = true
    )
}
