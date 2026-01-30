package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.viewmodel.HomeViewModel
import com.keke.yediwyedi.ui.components.StatCard

import androidx.compose.foundation.Image
import androidx.compose.animation.core.*
import androidx.compose.ui.draw.scale
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.background

@Composable
fun HomeScreen(
    navController: androidx.navigation.NavController,
    viewModel: HomeViewModel = viewModel()
) {
    val isReady by viewModel.isBotReady.collectAsState()
    val statusMsg by viewModel.statusMessage.collectAsState()
    val captchaBase64 by viewModel.captchaImage.collectAsState()
    val botUsername by viewModel.botUsername.collectAsState()
    
    // Auto-navigate to Captcha Screen if locked
    LaunchedEffect(captchaBase64) {
        if (captchaBase64 != null) {
            navController.navigate("captcha") {
                launchSingleTop = true
            }
        }
    }
    
    // Messaging Dialog State
    var showMessageDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F2027)) // Deep Dark Base
    ) {
        // 1. Header Section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF2C5364), Color.Transparent)
                    )
                )
                .padding(24.dp)
        ) {
            Column {
                Text(
                    text = "Hoş Geldin,",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.Gray
                )
                Text(
                    text = botUsername ?: "Kullanıcı",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 2. Status Hero Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(160.dp)
                .background(
                    brush = Brush.linearGradient(
                        colors = if (isReady) 
                            listOf(Color(0xFF11998e), Color(0xFF38ef7d)) // Green Gradient
                        else 
                            listOf(Color(0xFFCB356B), Color(0xFFBD3F32)) // Red Gradient
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(24.dp))
                .padding(20.dp)
        ) {
            Column(modifier = Modifier.align(Alignment.BottomStart)) {
                Text(
                    text = "DURUM",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White.copy(alpha = 0.7f)
                )
                Text(
                    text = if (isReady) "AKTİF" else "PASİF",
                    style = MaterialTheme.typography.displaySmall,
                    color = Color.White,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = statusMsg,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.9f)
                )
            }
            
            // Icon or Pulse indicator
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(12.dp)
                    .background(Color.White, CircleShape)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
        
        // 2.5 Stats Grid
        val stats by viewModel.botStats.collectAsState()
        
        if (isReady && stats != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard(title = "Sunucu", value = "${stats?.guilds}", modifier = Modifier.weight(1f))
                StatCard(title = "Ping", value = "${stats?.ping}ms", modifier = Modifier.weight(1f))
                StatCard(title = "Süre", value = "${stats?.uptime}", modifier = Modifier.weight(1.5f)) // Wider for text
            }
            Spacer(modifier = Modifier.height(24.dp))
        }

        // 3. Action Grid
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            Text(
                "Hızlı İşlemler",
                style = MaterialTheme.typography.titleMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                // Toggle Button Card
                DashboardCard(
                    title = if (isReady) "Durdur" else "Başlat",
                    icon = if (isReady) Icons.Default.Close else Icons.Default.PlayArrow,
                    color = if (isReady) Color(0xFFBD3F32) else Color(0xFF38ef7d),
                    modifier = Modifier.weight(1f),
                    onClick = { if (isReady) viewModel.stopBot() else viewModel.startBot() }
                )

                // Message Button Card
                DashboardCard(
                    title = "Mesaj Yaz",
                    icon = Icons.AutoMirrored.Filled.Send,
                    color = Color(0xFF4FA1F1),
                    modifier = Modifier.weight(1f),
                    onClick = { showMessageDialog = true }
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                // Commands Nav
                DashboardCard(
                    title = "Komutlar",
                    icon = Icons.Default.List,
                    color = Color(0xFFF2994A),
                    modifier = Modifier.weight(1f),
                    onClick = { navController.navigate("commands") }
                )

                // Settings Nav
                DashboardCard(
                    title = "Ayarlar",
                    icon = Icons.Default.Settings,
                    color = Color(0xFF9B51E0),
                    modifier = Modifier.weight(1f),
                    onClick = { navController.navigate("settings") }
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Console Button (New Row)
            // Console & Spam Buttons
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                DashboardCard(
                    title = "Canlı Konsol",
                    icon = Icons.Default.Info,
                    color = Color(0xFF333333), // Terminal Grey
                    modifier = Modifier.weight(1f),
                    onClick = { navController.navigate("console") }
                )
                DashboardCard(
                    title = "Spam Botları",
                    icon = Icons.Default.Settings, // Using Settings icon for now
                    color = Color(0xFFD32F2F),
                    modifier = Modifier.weight(1f),
                    onClick = { navController.navigate("spam") }
                )
            }
        }
    }
    
    // Message Dialog
    if (showMessageDialog) {
        MessageDialog(
             onDismiss = { showMessageDialog = false },
             onSend = { ch, msg -> 
                 viewModel.sendMessage(ch, msg)
                 showMessageDialog = false
             }
        )
    }
}

@Composable
fun DashboardCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(120.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E2A32)), // Dark card bg
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun MessageDialog(onDismiss: () -> Unit, onSend: (String, String) -> Unit) {
    var channelId by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Mesaj Gönder") },
        text = {
            Column {
                OutlinedTextField(
                    value = channelId,
                    onValueChange = { channelId = it },
                    label = { Text("Kanal ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = message, 
                    onValueChange = { message = it },
                    label = { Text("Mesaj") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSend(channelId, message) }) {
                Text("Gönder")
            }
        },
        dismissButton = {
            androidx.compose.material3.TextButton(onClick = onDismiss) {
                Text("İptal")
            }
        }
    )
}
