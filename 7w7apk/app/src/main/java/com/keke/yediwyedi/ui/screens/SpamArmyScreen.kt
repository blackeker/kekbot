package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.keke.yediwyedi.api.RetrofitClient
import com.keke.yediwyedi.api.SpamBot
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpamArmyScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var bots by remember { mutableStateOf<List<SpamBot>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }
    var showPotatoDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    fun refresh() {
        scope.launch {
            isLoading = true
            try {
                val res = RetrofitClient.getService().getSpamBots()
                if (res.isSuccessful) {
                    bots = res.body()?.data ?: emptyList()
                } else {
                    snackbarHostState.showSnackbar("Yenileme başarısız: ${res.message()}")
                }
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Hata: ${e.message}")
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { refresh() }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Spam Ordusu (${bots.size})") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Geri")
                    }
                },
                actions = {
                    IconButton(onClick = { showPotatoDialog = true }) {
                        Icon(Icons.Default.Agriculture, "Patates Saldırısı") 
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "Bot Ekle")
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (isLoading) LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(bots) { bot ->
                    SpamBotItem(bot, onRefresh = { refresh() })
                }
            }
        }
    }

    if (showAddDialog) {
        var token by remember { mutableStateOf("") }
        var channelId by remember { mutableStateOf("") }
        
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Spam Bot Ekle") },
            text = {
                 Column {
                     OutlinedTextField(
                         value = token,
                         onValueChange = { token = it },
                         label = { Text("Discord Tokeni") },
                         modifier = Modifier.fillMaxWidth()
                     )
                     Spacer(modifier = Modifier.height(8.dp))
                     OutlinedTextField(
                         value = channelId,
                         onValueChange = { channelId = it },
                         label = { Text("Hedef Kanal ID (İsteğe Bağlı)") },
                         placeholder = { Text("Boş ise varsayılan yok") },
                         modifier = Modifier.fillMaxWidth()
                     )
                 }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        val config = if(channelId.isNotBlank()) mapOf("channels" to listOf(channelId)) else emptyMap()
                        val body = mapOf("token" to token, "config" to config)
                        
                        RetrofitClient.getService().addSpamBot(body)
                        showAddDialog = false
                        refresh()
                        snackbarHostState.showSnackbar("Bot Eklendi")
                    }
                }) { Text("Ekle") }
            },
            dismissButton = { TextButton(onClick = { showAddDialog = false }) { Text("İptal") } }
        )
    }

    if (showPotatoDialog) {
        var target by remember { mutableStateOf("") }
        var resultMsg by remember { mutableStateOf<String?>(null) }
        
        AlertDialog(
            onDismissRequest = { showPotatoDialog = false },
            title = { Text("🥔 Patates Saldırısı") },
            text = {
                Column {
                    Text("Patates yağmuru için hedef Kullanıcı ID'si girin.")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = target,
                        onValueChange = { target = it },
                        label = { Text("Hedef Kullanıcı ID") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (resultMsg != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(resultMsg!!, color = Color.Green)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        try {
                            val res = RetrofitClient.getService().sendPotato(mapOf("targetUserId" to target))
                            resultMsg = res.body()?.message ?: "Tamamlandı"
                        } catch(e: Exception) {
                            resultMsg = "Hata: ${e.message}"
                        }
                    }
                }) { Text("SALDIR") }
            },
            dismissButton = { TextButton(onClick = { showPotatoDialog = false }) { Text("Kapat") } }
        )
    }
}

@Composable
fun SpamBotItem(bot: SpamBot, onRefresh: () -> Unit) {
    val scope = rememberCoroutineScope()
    val isRunning = bot.is_active == 1
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E1E1E)
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isRunning) Color(0xFF00C853) else Color.Red)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Bot #${bot.id}", fontWeight = FontWeight.Bold, color = Color.White)
                Text(
                    text = if(isRunning) "DURUM: ÇALIŞIYOR" else "DURUM: DURDU",
                    color = if(isRunning) Color(0xFF00C853) else Color.Red,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                // Mask Token
                Text(
                    text = "Token: " + bot.token.take(10) + "...",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }
            
            Row {
                IconButton(onClick = {
                    scope.launch {
                        if (isRunning) RetrofitClient.getService().stopSpamBot(bot.id)
                        else RetrofitClient.getService().startSpamBot(bot.id)
                        onRefresh()
                    }
                }) {
                    Icon(
                        if (isRunning) Icons.Default.Stop else Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = if (isRunning) Color.Red else Color.Green
                    )
                }
                IconButton(onClick = {
                    scope.launch {
                         RetrofitClient.getService().deleteSpamBot(bot.id)
                         onRefresh()
                    }
                }) {
                    Icon(Icons.Default.Delete, "Sil", tint = Color.Gray)
                }
            }
        }
    }
}
