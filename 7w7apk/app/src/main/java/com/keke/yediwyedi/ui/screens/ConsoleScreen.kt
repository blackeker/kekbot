package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.keke.yediwyedi.data.network.LogEntry
import com.keke.yediwyedi.data.network.NetworkModule
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ConsoleScreen(navController: NavController) {
    val logs = remember { mutableStateListOf<LogEntry>() }
    var isLoading by remember { mutableStateOf(true) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Polling Logic
    LaunchedEffect(Unit) {
        while (true) {
            try {
                // Get last timestamp
                val lastLog = logs.lastOrNull()
                val since = lastLog?.timestamp

                val response = NetworkModule.api?.getLogs(since)
                if (response != null && response.isSuccessful) {
                    val newLogs = response.body()?.data ?: emptyList()
                    if (newLogs.isNotEmpty()) {
                        logs.addAll(newLogs)
                        // Auto-scroll
                        scope.launch {
                            listState.animateScrollToItem(logs.size - 1)
                        }
                    }
                }
                isLoading = false
            } catch (e: Exception) {
                // Ignore errors to keep polling alive
            }
            delay(10000) // 10 sn polling (Reduced Load)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C0C0C)) // Terminal Black
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF1E1E1E))
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri", tint = Color.White)
            }
            Text("Canlı Konsol (Live)", color = Color.Green, fontFamily = FontFamily.Monospace, fontSize = 16.sp)
        }

        if (isLoading && logs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.Green)
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(logs) { log ->
                    LogItem(log)
                }
            }
        }
    }
}

@Composable
fun LogItem(log: LogEntry) {
    val color = when (log.type) {
        "ERROR" -> Color(0xFFFF5252)
        "WARN" -> Color(0xFFFFD740)
        else -> Color(0xFFE0E0E0)
    }

    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(
            text = "[${log.timestamp.takeLast(12)}]", // Show time part approx
            color = Color.Gray,
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier.width(80.dp)
        )
        Text(
            text = log.message,
            color = color,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace
        )
    }
}
