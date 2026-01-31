package com.keke.yediwyedi

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.keke.yediwyedi.api.RetrofitClient
import com.keke.yediwyedi.data.UserPreferences
import com.keke.yediwyedi.ui.AppNavigation

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Init Config
        val prefs = UserPreferences(this)
        val savedKey = prefs.getApiKey()
        if (savedKey != null) {
            RetrofitClient.updateConfig(prefs.getBaseUrl(), savedKey)
        }

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(prefs)
                }
            }
        }
    }
}
