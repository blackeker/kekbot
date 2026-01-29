package com.keke.yediwyedi.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.keke.yediwyedi.utils.rememberBase64Image
import com.keke.yediwyedi.viewmodel.HomeViewModel

@Composable
fun CaptchaScreen(
    viewModel: HomeViewModel = viewModel(),
    onSolved: () -> Unit
) {
    val captchaBase64 by viewModel.captchaImage.collectAsState()
    
    // Pulse Animation for Red Alert
    val infiniteTransition = rememberInfiniteTransition(label = "alert")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    // Polling Logic: Check status every 3 seconds while on this screen
    LaunchedEffect(Unit) {
        while (true) {
            viewModel.checkStatus()
            kotlinx.coroutines.delay(3000)
        }
    }

    // Auto-Exit Logic: If captcha is cleared, go back
    LaunchedEffect(captchaBase64) {
        if (captchaBase64 == null) {
            onSolved()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0505)) // Very Dark Red
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "⚠️ SISTEM KİLİTLENDİ",
            style = MaterialTheme.typography.displaySmall,
            color = Color.Red,
            fontWeight = FontWeight.Black,
            modifier = Modifier.alpha(alpha)
        )
        
        Spacer(modifier = Modifier.height(32.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .border(2.dp, Color.Red, RoundedCornerShape(12.dp))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            if (captchaBase64 != null) {
                val bitmap = rememberBase64Image(captchaBase64)
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap,
                        contentDescription = "Captcha",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                    )
                } else {
                    CircularProgressIndicator(color = Color.Red)
                }
            } else {
                Text("Captcha yükleniyor...", color = Color.Gray)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        
        var solutionText by remember { mutableStateOf("") }
        var isSolving by remember { mutableStateOf(false) }

        OutlinedTextField(
            value = solutionText,
            onValueChange = { solutionText = it },
            label = { Text("Captcha Kodu", color = Color.Gray) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.Gray,
                focusedBorderColor = Color.Red,
                unfocusedBorderColor = Color.Red.copy(alpha = 0.5f),
                cursorColor = Color.Red
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = { 
                if (solutionText.isNotBlank()) {
                    isSolving = true
                    viewModel.solveCaptcha(solutionText)
                    // Reset field
                    solutionText = ""
                    // We don't close screen immediately, we wait for unlock status update
                }
             },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
            modifier = Modifier.fillMaxWidth().height(50.dp),
            enabled = solutionText.isNotBlank()
        ) {
            Text("ÇÖZÜMÜ GÖNDER", fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onSolved) {
             Text("Veya direkt geç (sadece izleme)", color = Color.Gray)
        }
    }
}
