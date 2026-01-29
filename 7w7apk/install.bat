@echo off
cd /d "%~dp0"
setlocal EnableDelayedExpansion

:Main
echo ==========================================
echo Gelismis Kurulum Araci - Blackeker
echo ==========================================

REM -------------------------------------------
REM Cihaz Secimi
REM -------------------------------------------
echo [Kontrol] Bagli cihazlar araniyor...
adb start-server >nul 2>&1
set count=0

REM adb devices ciktisini isle
for /f "skip=1 tokens=1" %%d in ('adb devices') do (
    set "device=%%d"
    if "!device!" neq "" (
        set /a count+=1
        set "dev[!count!]=!device!"
    )
)

if %count%==0 (
    echo.
    echo [HATA] Hicbir cihaz bulunamadi!
    echo Lutfen USB hata ayiklamayi acin ve cihazinizi baglayin.
    echo Emulator kullaniyorsaniz acik oldugundan emin olun.
    pause
    exit /b 1
)

if %count%==1 (
    echo Tek cihaz bulundu: !dev[1]!
    set "SELECTED_DEVICE=!dev[1]!"
) else (
    echo.
    echo Birden fazla cihaz bulundu:
    for /L %%i in (1, 1, %count%) do (
        echo %%i. !dev[%%i]!
    )
    echo.
    set /p "choice=Cihaz secin [1-%count%]: "
    if "!choice!"=="" set "choice=1"
    
    REM Secilen cihazi al
    for %%i in (!choice!) do set "SELECTED_DEVICE=!dev[%%i]!"
)

if "!SELECTED_DEVICE!"=="" (
    echo Gecersiz secim!
    exit /b 1
)

set "ADB_CMD=adb -s !SELECTED_DEVICE!"
echo.
echo Hedef Cihaz: !SELECTED_DEVICE!

REM -------------------------------------------
REM Islem Secimi
REM -------------------------------------------
echo.
echo Islem Secin:
echo 1. Sadece APK Olustur (Debug)
echo 2. Sadece Sil (Yuklu uygulamayi kaldirir)
echo 3. Temiz Kurulum (Eskiyi siler, sifirdan kurar - Veriler GIDER)
echo 4. Guncelle (Uzerine kurar - Veriler KORUNUR)
echo.

set /p "mode=Seciminiz [1-4] (Varsayilan: 4): "
if "%mode%"=="" set mode=4

echo.
if "%mode%"=="1" goto :BuildOnly
if "%mode%"=="2" goto :UninstallOnly
if "%mode%"=="3" goto :CleanInstall
if "%mode%"=="4" goto :UpdateInstall

echo [HATA] Gecersiz secenek!
goto :Main

REM -------------------------------------------
REM Mod 1: Sadece Derle
REM -------------------------------------------
:BuildOnly
echo [1/1] Debug APK Olusturuluyor...
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 goto :Error
echo.
echo Derleme Basarili! APK Konumu:
echo app\build\outputs\apk\debug\app-debug.apk
goto :Success

REM -------------------------------------------
REM Mod 2: Sadece Sil
REM -------------------------------------------
:UninstallOnly
echo [1/1] Uygulama kaldiriliyor (com.keke.yediwyedi)...
%ADB_CMD% uninstall com.keke.yediwyedi
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Normal kaldirma basarisiz oldu. --user 0 ile deneniyor...
    %ADB_CMD% uninstall --user 0 com.keke.yediwyedi
)
if %ERRORLEVEL% NEQ 0 (
     echo [Bilgi] Uygulama zaten yuklu degil veya kaldirilamadi.
) else (
    echo Kaldirma Basarili.
)
goto :Success

REM -------------------------------------------
REM Mod 3: Temiz Kurulum
REM -------------------------------------------
:CleanInstall
echo [1/3] Eski surum kaldiriliyor...
%ADB_CMD% uninstall com.keke.yediwyedi
if %ERRORLEVEL% NEQ 0 (
    echo [Bilgi] Normal kaldirma basarisiz. --user 0 ile deneniyor...
    %ADB_CMD% uninstall --user 0 com.keke.yediwyedi
)
REM Hata olsa bile devam et (belki yuklu degildir)
echo [Bilgi] Kaldirma adimi tamamlandi (veya atlandi).

echo [2/3] Temizleniyor ve derleniyor...
call gradlew.bat clean assembleDebug
if %ERRORLEVEL% NEQ 0 goto :Error

echo [3/3] APK Yukleniyor...
%ADB_CMD% install -r app\build\outputs\apk\debug\app-debug.apk
if %ERRORLEVEL% NEQ 0 goto :Error
goto :Success

REM -------------------------------------------
REM Mod 4: Guncelle
REM -------------------------------------------
:UpdateInstall
echo [1/2] Debug APK Olusturuluyor...
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 goto :Error

echo [2/2] Guncelleniyor (Veriler Korunuyor)...
%ADB_CMD% install -r app\build\outputs\apk\debug\app-debug.apk
if %ERRORLEVEL% NEQ 0 goto :Error
goto :Success

REM -------------------------------------------
REM Hata Yonetimi
REM -------------------------------------------
:Error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo [HATA] Islem sirasinda bir hata olustu!
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
pause
exit /b 1

REM -------------------------------------------
REM Basari Yonetimi
REM -------------------------------------------
:Success
echo.
echo ==========================================
echo ISLEM BASARIYLA TAMAMLANDI!
echo ==========================================
pause
exit /b 0
