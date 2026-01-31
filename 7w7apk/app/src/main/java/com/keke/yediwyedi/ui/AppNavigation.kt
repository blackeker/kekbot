package com.keke.yediwyedi.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.keke.yediwyedi.data.UserPreferences
import com.keke.yediwyedi.ui.screens.LoginScreen
import com.keke.yediwyedi.ui.screens.HomeScreen
import com.keke.yediwyedi.ui.screens.CommandsScreen
import com.keke.yediwyedi.ui.screens.SpamArmyScreen
import com.keke.yediwyedi.ui.screens.SettingsScreen
import com.keke.yediwyedi.ui.screens.LogsScreen

@Composable
fun AppNavigation(prefs: UserPreferences) {
    val navController = rememberNavController()
    // Determine start destination
    val startDest = if (prefs.getApiKey() != null) "home" else "login"

    NavHost(navController = navController, startDestination = startDest) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                prefs = prefs
            )
        }
        composable("home") {
            HomeScreen(
                onLogout = {
                    prefs.clear()
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                },
                navController = navController
            )
        }
        composable("commands") {
            CommandsScreen(navController)
        }
        composable("spam") {
            SpamArmyScreen(navController)
        }
        composable("settings") {
            SettingsScreen(navController)
        }
        composable("logs") {
            LogsScreen(navController)
        }
    }
}
