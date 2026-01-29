package com.keke.yediwyedi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.viewmodel.LoginViewModel

import androidx.compose.animation.*
import androidx.compose.ui.graphics.Brush

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    var serverUrl by remember { mutableStateOf(com.keke.yediwyedi.data.network.NetworkModule.BASE_URL.removeSuffix("/")) }
    var apiKey by remember { mutableStateOf("") }
    var discordToken by remember { mutableStateOf("") }
    var isRegisterMode by remember { mutableStateOf(false) } // Default: Login Mode
    
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.loginError.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val context = LocalContext.current

    // Entry Animation
    var isVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isVisible = true
        viewModel.checkSession(context)
    }

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            onLoginSuccess()
        }
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn() + slideInVertically()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364))
                    )
                )
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
        Text(
            text = "BLACKEKER",
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                letterSpacing = 4.sp
            )
        )
        
        Text(
            text = "MOBİL KONTROL",
            style = MaterialTheme.typography.labelLarge.copy(
                color = Color.Gray,
                letterSpacing = 2.sp
            ),
            modifier = Modifier.padding(bottom = 32.dp)
        )

        // Mode Switcher
        androidx.compose.foundation.layout.Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
                .background(MaterialTheme.colorScheme.surface, shape = MaterialTheme.shapes.small)
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                onClick = { isRegisterMode = false },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (!isRegisterMode) MaterialTheme.colorScheme.primary else Color.Transparent,
                    contentColor = if (!isRegisterMode) Color.Black else Color.Gray
                ),
                elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("GİRİŞ YAP")
            }
            Button(
                onClick = { isRegisterMode = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isRegisterMode) MaterialTheme.colorScheme.primary else Color.Transparent,
                    contentColor = if (isRegisterMode) Color.Black else Color.Gray
                ),
                elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("KAYIT OL")
            }
        }

        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("Sunucu Adresi") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            singleLine = true
        )

        if (isRegisterMode) {
            OutlinedTextField(
                value = discordToken,
                onValueChange = { discordToken = it },
                label = { Text("Discord Token") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                singleLine = true,
                // visuallyTransformation = PasswordVisualTransformation()
            )
        } else {
             OutlinedTextField(
                value = apiKey,
                onValueChange = { apiKey = it },
                label = { Text("API Anahtarı (Key)") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                singleLine = true,
                // visuallyTransformation = PasswordVisualTransformation()
            )
        }

        if (error != null) {
            Text(
                text = error!!,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        // Remember Me Checkbox
        var rememberMe by remember { mutableStateOf(true) }
        androidx.compose.foundation.layout.Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        ) {
            Checkbox(
                checked = rememberMe,
                onCheckedChange = { rememberMe = it },
                colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary)
            )
            Text(
                text = "Beni Hatırla",
                color = Color.White,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        Button(
            onClick = { 
                if (isRegisterMode) {
                    viewModel.attemptRegister(discordToken, serverUrl, context, rememberMe)
                } else {
                    viewModel.loginWithKey(apiKey, serverUrl, context, rememberMe)
                }
            },
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            enabled = !isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.background
            )
        ) {
             if (isLoading) {
                 CircularProgressIndicator(modifier = Modifier.padding(4.dp), color = Color.Black)
             } else {
                 Text(text = if (isRegisterMode) "KAYIT OL & BAĞLAN" else "GİRİŞ YAP", fontWeight = FontWeight.Bold)
             }
        }
    }
    }
}
