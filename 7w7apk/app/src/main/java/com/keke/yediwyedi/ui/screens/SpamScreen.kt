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
}

@Composable
fun SpamScreen(viewModel: SpamViewModel = viewModel()) {
    LaunchedEffect(Unit) {
        viewModel.fetchBots()
    }

    var showAddDialog by remember { mutableStateOf(false) }

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
                    SpamBotCard(bot, viewModel)
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
}

@Composable
fun SpamBotCard(bot: SpamBot, viewModel: SpamViewModel) {
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
