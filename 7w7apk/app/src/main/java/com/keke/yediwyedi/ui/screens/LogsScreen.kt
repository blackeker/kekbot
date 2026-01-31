package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.keke.yediwyedi.api.RetrofitClient
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogsScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var logs by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            isLoading = true
            try {
                val res = RetrofitClient.getService().getLogs(null)
                if (res.isSuccessful) {
                    logs = res.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { refresh() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Console Logs") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { refresh() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize().background(Color.Black)) {
            if (isLoading) LinearProgressIndicator(modifier = Modifier.fillMaxWidth())

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(8.dp),
                reverseLayout = true // Show newest at bottom usually logs, but API returns list? 
                // IF API returns [old...new], we want to see new.
                // Reversing or scrolling to bottom.
                // Let's assume standard order.
            ) {
                // If logs is big, this might be heavy.
                // We'll just list them.
                items(logs.reversed()) { log ->
                     Text(
                        text = log,
                        color = Color(0xFF00FF00),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                    Divider(color = Color.DarkGray, thickness = 0.5.dp)
                }
            }
        }
    }
}
