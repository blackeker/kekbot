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
                    snackbarHostState.showSnackbar("Failed to refresh: ${res.message()}")
                }
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Error: ${e.message}")
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
                title = { Text("Spam Army (${bots.size})") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showPotatoDialog = true }) {
                        Icon(Icons.Default.Agriculture, "Potato Attack") // Using agriculture as potato icon equivalent
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "Add Bot")
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
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Spam Bot") },
            text = {
                 OutlinedTextField(
                     value = token,
                     onValueChange = { token = it },
                     label = { Text("Discord Token") },
                     modifier = Modifier.fillMaxWidth()
                 )
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        RetrofitClient.getService().addSpamBot(mapOf("token" to token))
                        showAddDialog = false
                        refresh()
                    }
                }) { Text("Add") }
            },
            dismissButton = { TextButton(onClick = { showAddDialog = false }) { Text("Cancel") } }
        )
    }

    if (showPotatoDialog) {
        var target by remember { mutableStateOf("") }
        var resultMsg by remember { mutableStateOf<String?>(null) }
        
        AlertDialog(
            onDismissRequest = { showPotatoDialog = false },
            title = { Text("🥔 Potato Attack") },
            text = {
                Column {
                    Text("Enter Target User ID to spam with potatoes.")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = target,
                        onValueChange = { target = it },
                        label = { Text("Target User ID") },
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
                            resultMsg = res.body()?.message ?: "Completed"
                        } catch(e: Exception) {
                            resultMsg = "Error: ${e.message}"
                        }
                    }
                }) { Text("ATTACK") }
            },
            dismissButton = { TextButton(onClick = { showPotatoDialog = false }) { Text("Close") } }
        )
    }
}

@Composable
fun SpamBotItem(bot: SpamBot, onRefresh: () -> Unit) {
    val scope = rememberCoroutineScope()
    val isRunning = bot.is_active == 1
    
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isRunning) Color(0xFFE6FFEA) else ListItemDefaults.containerColor
        ),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Bot #${bot.id}", fontWeight = FontWeight.Bold)
                Text(
                    text = if(isRunning) "RUNNING" else "STOPPED",
                    color = if(isRunning) Color(0xFF00C853) else Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
                // Mask Token
                Text(
                    text = bot.token.take(10) + "...",
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
                    Icon(Icons.Default.Delete, "Delete")
                }
            }
        }
    }
}
