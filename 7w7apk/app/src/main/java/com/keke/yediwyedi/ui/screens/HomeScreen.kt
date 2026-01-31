package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.keke.yediwyedi.api.BotStatusData
import com.keke.yediwyedi.api.RetrofitClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {
    var status by mutableStateOf<BotStatusData?>(null)
    var isAutomationOn by mutableStateOf(false)
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    init {
        refreshStatus()
    }

    fun refreshStatus() {
        // Run in VM scope
        // Using strict coroutine scope not available directly in base ViewModel without androidx-lifecycle-viewmodel-ktx extension
        // Assuming dependencies valid, usage of basic CoroutineScope via Composable effect is safer if libs missing.
        // But dependencies included lifecycle-runtime-ktx.
    }
    
    // We will handle logic in Composable for this prototype speed
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onLogout: () -> Unit, navController: NavController) {
    val scope = rememberCoroutineScope()
    var statusData by remember { mutableStateOf<BotStatusData?>(null) }
    var automationEnabled by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    
    // Auto Refresh
    LaunchedEffect(Unit) {
        while(true) {
            try {
                val res = RetrofitClient.getService().getBotStatus()
                if (res.isSuccessful && res.body()?.success == true) {
                    val body = res.body()!!
                    statusData = body.data?.data
                    automationEnabled = body.data?.automationEnabled ?: false
                }
            } catch (e: Exception) {
                // Ignore silent errors for polling
            }
            delay(5000)
        }
    }

    fun toggleBot(start: Boolean) {
        scope.launch {
            isLoading = true
            try {
                if (start) RetrofitClient.getService().startBot()
                else RetrofitClient.getService().stopBot()
                // Refresh immediately
                val res = RetrofitClient.getService().getBotStatus()
                if(res.isSuccessful) {
                    statusData = res.body()?.data?.data
                    automationEnabled = res.body()?.data?.automationEnabled ?: false
                }
            } catch (e: Exception) {
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("7W7 Dashboard") },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, "Logout")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (statusData?.isReady == true) Color(0xFFE6FFEA) else Color(0xFFFFEAEA)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (statusData?.isReady == true) "ONLINE" else "OFFLINE",
                            style = MaterialTheme.typography.titleLarge,
                            color = if (statusData?.isReady == true) Color(0xFF00C853) else Color.Red
                        )
                        if (isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("User: ${statusData?.username ?: "Unknown"}")
                    Text("Uptime: ${statusData?.stats?.uptime ?: "-"}")
                    Text("Ping: ${statusData?.stats?.ping ?: -1}ms")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Actions
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                Button(
                    onClick = { toggleBot(true) },
                    enabled = !isLoading && statusData?.isReady != true,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                ) {
                    Icon(Icons.Default.PlayArrow, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("START")
                }

                Button(
                    onClick = { toggleBot(false) },
                    enabled = !isLoading && statusData?.isReady == true,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                ) {
                    Icon(Icons.Default.Stop, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("STOP")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Divider()
            Spacer(modifier = Modifier.height(24.dp))

            // Menu Grid
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MenuButton("Commands", Icons.Default.Terminal) { navController.navigate("commands") }
                MenuButton("Spam Army", Icons.Default.Groups) { navController.navigate("spam") }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MenuButton("Settings", Icons.Default.Settings) { navController.navigate("settings") }
                MenuButton("Logs", Icons.Default.List) { navController.navigate("logs") }
            }
        }
    }
}

@Composable
fun MenuButton(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .width(160.dp)
            .height(100.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(text)
        }
    }
}
