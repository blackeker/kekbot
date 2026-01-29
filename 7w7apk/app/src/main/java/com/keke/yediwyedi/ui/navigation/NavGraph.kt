package com.keke.yediwyedi.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.keke.yediwyedi.ui.screens.CommandScreen
import com.keke.yediwyedi.ui.screens.HomeScreen
import com.keke.yediwyedi.ui.screens.LoginScreen
import com.keke.yediwyedi.ui.screens.SettingsScreen

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    // Shared ViewModel for Home and Captcha screens to prevent state flicker
    val sharedViewModel: com.keke.yediwyedi.viewmodel.HomeViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
    
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val isLoggedIn = currentRoute != "login"

    Scaffold(
        bottomBar = {
            if (isLoggedIn) {
                NavigationBar(
                    containerColor = Color(0xFF1E1E1E)
                ) {
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Home, contentDescription = "Ana Sayfa") },
                        label = { Text("Ana Sayfa") },
                        selected = currentRoute == "home",
                        onClick = {
                            navController.navigate("home") {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.List, contentDescription = "Komutlar") },
                        label = { Text("Komutlar") },
                        selected = currentRoute == "commands",
                        onClick = {
                            navController.navigate("commands") {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Ayarlar") },
                        label = { Text("Ayarlar") },
                        selected = currentRoute == "settings",
                        onClick = {
                            navController.navigate("settings") {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "login",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("login") {
                LoginScreen(onLoginSuccess = {
                     navController.navigate("home") {
                         popUpTo("login") { inclusive = true }
                     }
                })
            }
            composable("home") {
                HomeScreen(navController = navController, viewModel = sharedViewModel)
            }
            composable("commands") {
                CommandScreen()
            }
            composable("settings") {
                SettingsScreen()
            }
            composable("captcha") {
                com.keke.yediwyedi.ui.screens.CaptchaScreen(viewModel = sharedViewModel, onSolved = {
                    navController.popBackStack()
                })
            }
            composable("console") {
                com.keke.yediwyedi.ui.screens.ConsoleScreen(navController)
            }
            composable("spam") {
                com.keke.yediwyedi.ui.screens.SpamScreen()
            }
        }
    }
}
