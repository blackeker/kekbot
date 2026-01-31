# 7W7 Android App

Control your 7W7 Discord Bot from anywhere with this native Android application.

## Features
- **Dashboard**: Live monitoring of bot status, uptime, and ping. Start/Stop controls.
- **Commands Manager**: Add, edit, and delete custom auto-reply commands.
- **Spam Army**: Manage your fleet of spam bots. Deploy "Potato Attacks" instantly.
- **Console**: View live logs from the bot.
- **Settings**: Configure Rich Presence (RPC), Auto-Delete channels, and more.

## Build Instructions
1. Open the project in **Android Studio**.
2. Sync Gradle.
3. Build & Run on your device/emulator.

## Configuration
- Upon first launch, enter your **VDS API URL** (e.g., `http://193.106.196.39/`) and **API Key**.
- These are saved securely using Android `EncryptedSharedPreferences`.

## Tech Stack
- **Kotlin**
- **Jetpack Compose** (UI)
- **Retrofit** (Networking)
- **OkHttp** (Logging/Interceptors)
