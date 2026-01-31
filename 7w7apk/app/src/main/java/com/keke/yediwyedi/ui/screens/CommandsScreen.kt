package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.keke.yediwyedi.api.Command
import com.keke.yediwyedi.api.RetrofitClient
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandsScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var commands by remember { mutableStateOf<List<Command>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    // Load Commands
    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val res = RetrofitClient.getService().getCommands()
            if (res.isSuccessful) {
                commands = res.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Komutlar yüklenemedi")
        } finally {
            isLoading = false
        }
    }

    var showUpdateDialog by remember { mutableStateOf<Command?>(null) }
    var updateIndex by remember { mutableStateOf(-1) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Özel Komutlar") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Geri")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "Komut Ekle")
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(commands) { index, cmd ->
                        CommandItem(
                            command = cmd,
                            onEdit = { 
                                updateIndex = index
                                showUpdateDialog = cmd 
                            },
                            onDelete = {
                                scope.launch {
                                    val res = RetrofitClient.getService().deleteCommand(index)
                                    if (res.isSuccessful) {
                                        commands = res.body()?.data ?: emptyList()
                                        snackbarHostState.showSnackbar("Komut silindi")
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        CommandDialog(
            title = "Yeni Komut",
            initialText = "",
            initialInterval = "0",
            onDismiss = { showAddDialog = false },
            onConfirm = { cmd ->
                scope.launch {
                    val map = mapOf("command" to cmd)
                    val res = RetrofitClient.getService().addCommand(map)
                    if (res.isSuccessful) {
                        commands = res.body()?.data ?: emptyList()
                        showAddDialog = false
                        snackbarHostState.showSnackbar("Komut eklendi")
                    }
                }
            }
        )
    }
    
    if (showUpdateDialog != null) {
        CommandDialog(
            title = "Komut Düzenle",
            initialText = showUpdateDialog!!.text,
            initialInterval = showUpdateDialog!!.interval?.toString() ?: "0",
            onDismiss = { showUpdateDialog = null },
            onConfirm = { cmd ->
                scope.launch {
                    val map = mapOf("command" to cmd)
                    val res = RetrofitClient.getService().updateCommand(updateIndex, map)
                    if (res.isSuccessful) {
                        commands = res.body()?.data ?: emptyList()
                        showUpdateDialog = null
                        snackbarHostState.showSnackbar("Komut güncellendi")
                    }
                }
            }
        )
    }
}

@Composable
fun CommandItem(command: Command, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(4.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)) // Dark
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = command.text ?: "Metin Yok", 
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
                val interval = command.interval ?: 0
                if (interval > 0) {
                    Text(
                        text = "Tekrar: ${interval}ms",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF00C853)
                    )
                } else {
                     Text(
                        text = "Tekrar: Yok",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }
            Row {
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, "Düzenle", tint = Color.Cyan)
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "Sil", tint = Color.Red)
                }
            }
        }
    }
}

@Composable
fun CommandDialog(
    title: String, 
    initialText: String, 
    initialInterval: String, 
    onDismiss: () -> Unit, 
    onConfirm: (Command) -> Unit
) {
    var text by remember { mutableStateOf(initialText) }
    var intervalStr by remember { mutableStateOf(initialInterval) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("Mesaj Metni") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = intervalStr,
                    onValueChange = { if (it.all { c -> c.isDigit() }) intervalStr = it },
                    label = { Text("Tekrar Süresi (ms, 0 kapalı)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = {
                val interval = intervalStr.toLongOrNull() ?: 0
                if (text.isNotEmpty()) {
                    onConfirm(Command(text = text, interval = interval, type = "text"))
                }
            }) {
                Text("Kaydet")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("İptal") }
        }
    )
}
