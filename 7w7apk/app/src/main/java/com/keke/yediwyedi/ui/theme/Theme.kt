package com.keke.yediwyedi.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = NeonGreen,
    secondary = NeonPurple,
    background = BlackBackground,
    surface = DarkSurface,
    onBackground = OnBackground,
    onSurface = OnBackground,
)

// We enforce Dark Mode for Blackeker aesthetic and rename to BlackekerTheme
@Composable
fun BlackekerTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}