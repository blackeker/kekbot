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
            snackbarHostState.showSnackbar("Failed to load commands")
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Custom Commands") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "Add Command")
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
                            onDelete = {
                                scope.launch {
                                    val res = RetrofitClient.getService().deleteCommand(index) // API expects index
                                    if (res.isSuccessful) {
                                        commands = res.body()?.data ?: emptyList()
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
        AddCommandDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { cmd ->
                scope.launch {
                    val map = mapOf("command" to cmd)
                    val res = RetrofitClient.getService().addCommand(map)
                    if (res.isSuccessful) {
                        commands = res.body()?.data ?: emptyList()
                        showAddDialog = false
                    }
                }
            }
        )
    }
}

@Composable
fun CommandItem(command: Command, onDelete: () -> Unit) {
    Card(
        elevation = CardDefaults.cardElevation(4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
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
                    text = command.text ?: "No Text", // Or response? API ambiguity.
                    style = MaterialTheme.typography.bodyLarge
                )
                if ((command.interval ?: 0) > 0) {
                    Text(
                        text = "Interval: ${command.interval}ms",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, "Delete", tint = Color.Red)
            }
        }
    }
}

@Composable
fun AddCommandDialog(onDismiss: () -> Unit, onConfirm: (Command) -> Unit) {
    var text by remember { mutableStateOf("") }
    var intervalStr by remember { mutableStateOf("0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Command") },
        text = {
            Column {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("Message Text") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = intervalStr,
                    onValueChange = { if (it.all { c -> c.isDigit() }) intervalStr = it },
                    label = { Text("Interval (ms, 0 to disable)") },
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
                Text("Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
