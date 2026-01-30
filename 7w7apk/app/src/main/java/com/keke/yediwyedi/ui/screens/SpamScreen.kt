package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.data.network.NetworkModule
import com.keke.yediwyedi.data.network.SpamBot
import kotlinx.coroutines.launch

class SpamViewModel : ViewModel() {
    var bots by mutableStateOf<List<SpamBot>>(emptyList())
    var isLoading by mutableStateOf(false)

    fun fetchBots() {
        viewModelScope.launch {
            isLoading = true
            try {
                val res = NetworkModule.api?.getSpamBots()
                if (res?.isSuccessful == true) {
                    bots = res.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    fun addBot(token: String) {
        viewModelScope.launch {
            try {
                NetworkModule.api?.addSpamBot(mapOf("token" to token))
                fetchBots()
            } catch (e: Exception) {}
        }
    }

    fun deleteBot(id: Int) {
        viewModelScope.launch {
            try {
                NetworkModule.api?.deleteSpamBot(id)
                fetchBots()
            } catch (e: Exception) {}
        }
    }

    fun toggleBot(bot: SpamBot) {
        viewModelScope.launch {
            try {
                if (bot.is_active == 1) {
                    NetworkModule.api?.stopSpamBot(bot.id)
                } else {
                    NetworkModule.api?.startSpamBot(bot.id)
                }
                fetchBots()
            } catch (e: Exception) {}
        }
    }

    fun updateBotConfig(id: Int, channels: List<String>, delay: Long, targetType: String, messageType: String) {
        viewModelScope.launch {
            try {
                val req = com.keke.yediwyedi.data.network.SpamConfigRequest(
                    config = com.keke.yediwyedi.data.network.SpamConfigInner(
                        channels = channels,
                        delay = delay,
                        randomMessages = true,
                        targetType = targetType,
                        messageType = messageType
                    )
                )
                NetworkModule.api?.updateSpamConfig(id, req)
                fetchBots()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}

@Composable
fun SpamScreen(viewModel: SpamViewModel = viewModel()) {
    LaunchedEffect(Unit) {
        viewModel.fetchBots()
    }

    var showAddDialog by remember { mutableStateOf(false) }
    var showConfigDialog by remember { mutableStateOf(false) }
    var selectedBot by remember { mutableStateOf<SpamBot?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F2027))
    ) {
        // Header
        Text(
            text = "Spam Bot Yoneticisi",
            style = MaterialTheme.typography.headlineMedium,
            color = Color.White,
            modifier = Modifier.padding(16.dp),
            fontWeight = FontWeight.Bold
        )

        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(viewModel.bots) { bot ->
                    SpamBotCard(
                        bot, 
                        viewModel, 
                        onConfigClick = { 
                            selectedBot = bot
                            showConfigDialog = true
                        }
                    )
                }
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        FloatingActionButton(
            onClick = { showAddDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp),
            containerColor = MaterialTheme.colorScheme.primary
        ) {
            Icon(Icons.Default.Add, contentDescription = "Bot Ekle")
        }
    }

    if (showAddDialog) {
        var token by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Yeni Bot Ekle") },
            text = {
                OutlinedTextField(
                    value = token,
                    onValueChange = { token = it },
                    label = { Text("Discord Token") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (token.isNotBlank()) {
                        viewModel.addBot(token)
                        showAddDialog = false
                    }
                }) {
                    Text("EKLE")
                }
            }
        )
    }

    if (showConfigDialog && selectedBot != null) {
        var channelInput by remember { mutableStateOf("") }
        var delayInput by remember { mutableStateOf("10000") }
        var targetType by remember { mutableStateOf("channel") }
        var messageType by remember { mutableStateOf("text") }
        
        AlertDialog(
            onDismissRequest = { showConfigDialog = false },
            title = { Text("Bot Ayarları (#${selectedBot!!.id})") },
            text = {
                Column {
                    Text("Hedef Kanal/Kullanıcı ID (Virgülle ayırın)", color = Color.Gray, fontSize = 12.sp)
                    OutlinedTextField(
                        value = channelInput,
                        onValueChange = { channelInput = it },
                        label = { Text("ID Listesi") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = delayInput,
                        onValueChange = { delayInput = it },
                        label = { Text("Gecikme (ms)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Hedef Tipi:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = targetType == "channel", onClick = { targetType = "channel" })
                        Text("Kanal", modifier = Modifier.padding(end = 16.dp))
                        RadioButton(selected = targetType == "dm", onClick = { targetType = "dm" })
                        Text("DM (Kullanıcı)")
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Mesaj Tipi:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = messageType == "text", onClick = { messageType = "text" })
                        Text("Rastgele Yazı", modifier = Modifier.padding(end = 16.dp))
                        RadioButton(selected = messageType == "gif", onClick = { messageType = "gif" })
                        Text("Rastgele GIF")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val channels = channelInput.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    val delay = delayInput.toLongOrNull() ?: 10000L
                    viewModel.updateBotConfig(selectedBot!!.id, channels, delay, targetType, messageType)
                    showConfigDialog = false
                }) {
                    Text("KAYDET")
                }
            }
        )
    }
}

@Composable
fun SpamBotCard(
    bot: SpamBot, 
    viewModel: SpamViewModel,
    onConfigClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2A32)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(
                        if (bot.is_active == 1) Color.Green else Color.Red,
                        CircleShape
                    )
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Bot #${bot.id}",
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (bot.is_active == 1) "Aktif" else "Durduruldu",
                    color = if (bot.is_active == 1) Color.Green else Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            
            IconButton(onClick = onConfigClick) {
                Icon(Icons.Default.Settings, contentDescription = "Ayarlar", tint = Color.LightGray)
            }

            IconButton(onClick = { viewModel.toggleBot(bot) }) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Baslat/Durdur",
                    tint = if(bot.is_active == 1) Color.Red else Color.Green
                )
            }

            IconButton(onClick = { viewModel.deleteBot(bot.id) }) {
                Icon(Icons.Default.Delete, contentDescription = "Sil", tint = Color.Gray)
            }
        }
    }
}
