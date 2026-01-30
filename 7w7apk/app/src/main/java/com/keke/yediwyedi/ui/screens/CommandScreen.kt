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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberSwipeToDismissBoxState
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.data.network.CommandItem
import com.keke.yediwyedi.data.network.CommandStat
import com.keke.yediwyedi.data.network.NetworkModule
import com.keke.yediwyedi.viewmodel.CommandViewModel
import kotlinx.coroutines.launch

@Composable
fun CommandScreen(
    viewModel: CommandViewModel = viewModel()
) {
    val commands by viewModel.commands.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    // Search State
    var searchQuery by remember { mutableStateOf("") }
    
    // Filter Commands
    val filteredCommands = remember(commands, searchQuery) {
        if (searchQuery.isBlank()) commands
        else commands.filter { 
            it.trigger.contains(searchQuery, ignoreCase = true) || 
            it.response.contains(searchQuery, ignoreCase = true) 
        }
    }
    
    var showAddDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var editingCommand by remember { mutableStateOf<CommandItem?>(null) }
    var editingIndex by remember { mutableStateOf(-1) }
    
    // Stats State
    var showStatsDialog by remember { mutableStateOf(false) }
    var statsList by remember { mutableStateOf<List<com.keke.yediwyedi.data.network.CommandStat>>(emptyList()) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F2027)) // Deep Dark Base
    ) {
        // Header & Search
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                     brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF2C5364), Color.Transparent)
                    )
                )
                .padding(16.dp)
        ) {
            Text(
                text = "Komut Merkezi",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Komut Ara...", color = Color.Gray) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color(0xFF1E2A32),
                    unfocusedContainerColor = Color(0xFF1E2A32),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent
                ),
                singleLine = true
            )
        }

        Box(modifier = Modifier.fillMaxSize()) {
            if (isLoading) {
                 CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp)
                ) {
                    itemsIndexed(filteredCommands) { index, command ->
                        val dismissState = rememberSwipeToDismissBoxState(
                             confirmValueChange = {
                                 if (it == SwipeToDismissBoxValue.EndToStart) {
                                     // Finding actual index in original list based on object reference might be safer if filtered
                                     // But for simple "filtered view" ensuring we match correct ID or Ref is key.
                                     // Since we don't have IDs on commands easily, we fallback to index matching ONLY IF NOT FILTERED.
                                     if (searchQuery.isBlank()) {
                                         viewModel.deleteCommand(index)
                                         true
                                     } else {
                                         // Disable swipe delete while searching to avoid index mismatch
                                         false 
                                     }
                                 } else false
                             }
                        )

                        SwipeToDismissBox(
                            state = dismissState,
                            backgroundContent = {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(Color(0xFFBD3F32), shape = RoundedCornerShape(16.dp))
                                        .padding(end = 24.dp),
                                    contentAlignment = Alignment.CenterEnd
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Sil", tint = Color.White)
                                }
                            },
                            content = {
                                Card(
                                    onClick = {
                                        // Find index in original list
                                        val realIndex = commands.indexOf(command)
                                        if (realIndex != -1) {
                                            editingCommand = command
                                            editingIndex = realIndex
                                            showEditDialog = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2A32)),
                                    shape = RoundedCornerShape(16.dp),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .background(Color(0xFF2C3E50), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "#",
                                                color = MaterialTheme.colorScheme.primary,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        
                                        Spacer(modifier = Modifier.width(16.dp))
                                        
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = command.trigger,
                                                style = MaterialTheme.typography.titleMedium,
                                                color = Color.White,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Text(
                                                text = command.response,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color.Gray,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        
                                        if (command.interval != null && command.interval > 0) {
                                            Box(
                                                modifier = Modifier
                                                    .background(Color(0xFF2980B9), RoundedCornerShape(8.dp))
                                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                            ) {
                                                Text(
                                                    text = "${command.interval/1000}s",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        )
                    }
                    
                    item { 
                        Spacer(modifier = Modifier.height(80.dp)) // Floating Action Button Space
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                 FloatingActionButton(
                    onClick = { 
                        scope.launch {
                            try {
                                val res = NetworkModule.api?.getStats()
                                if (res?.isSuccessful == true) {
                                    statsList = res.body()?.data ?: emptyList()
                                    showStatsDialog = true
                                }
                            } catch (e: Exception) { }
                        }
                    },
                    containerColor = Color(0xFF00E676),
                    modifier = Modifier.padding(bottom = 16.dp)
                ) {
                    Icon(Icons.Default.Info, contentDescription = "İstatistikler")
                }
                
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.Black
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Görev Ekle")
                }
            }
        }
    }
    
    if (showStatsDialog) {
        AlertDialog(
            onDismissRequest = { showStatsDialog = false },
            title = { Text("Komut İstatistikleri") },
            text = {
                LazyColumn(modifier = Modifier.height(300.dp)) {
                    if (statsList.isEmpty()) {
                        item { Text("Henüz veri yok.") }
                    } else {
                        items(statsList.size) { i ->
                            val stat = statsList[i]
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween
                            ) {
                                Text(stat.commandText, fontWeight = FontWeight.Bold)
                                Text("${stat.count} kez")
                            }
                            androidx.compose.material3.HorizontalDivider()
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showStatsDialog = false }) {
                    Text("Kapat")
                }
            }
        )
    }

    if (showAddDialog) {
        CommandDialog(
            title = "Yeni Komut Oluştur",
            initialTrigger = "",
            initialResponse = "",
            initialInterval = 0L,
            onDismiss = { showAddDialog = false },
            onConfirm = { trigger, response, interval ->
                viewModel.addCommand(trigger, response, interval)
                showAddDialog = false
            },
            confirmText = "OLUŞTUR"
        )
    }

    val currentEditingCommand = editingCommand
    if (showEditDialog && currentEditingCommand != null) {
        CommandDialog(
            title = "Komutu Düzenle",
            initialTrigger = currentEditingCommand.trigger,
            initialResponse = currentEditingCommand.response,
            initialInterval = currentEditingCommand.interval ?: 0L,
            onDismiss = { showEditDialog = false },
            onConfirm = { trigger, response, interval ->
                viewModel.updateCommand(editingIndex, trigger, response, interval)
                showEditDialog = false
            },
            confirmText = "KAYDET"
        )
    }
}

@Composable
fun CommandDialog(
    title: String,
    initialTrigger: String,
    initialResponse: String,
    initialInterval: Long,
    onDismiss: () -> Unit,
    onConfirm: (String, String, Long) -> Unit,
    confirmText: String
) {
    var trigger by remember { mutableStateOf(initialTrigger) }
    var response by remember { mutableStateOf(initialResponse) }
    var interval by remember { mutableStateOf(initialInterval.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                OutlinedTextField(
                    value = trigger,
                    onValueChange = { trigger = it },
                    label = { Text("Görev Adı (Ref)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = response,
                    onValueChange = { response = it },
                    label = { Text("Mesaj İçeriği") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = interval,
                    onValueChange = { 
                        if (it.all { char -> char.isDigit() }) interval = it 
                    },
                    label = { Text("Döngü Süresi (ms)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { 
                    val intervalLong = interval.toLongOrNull() ?: 30000L
                    if (trigger.isNotBlank() && response.isNotBlank()) onConfirm(trigger, response, intervalLong) 
                }
            ) {
                Text(confirmText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("İPTAL")
            }
        }
    )
}
