<#
.SYNOPSIS
    Deploys 7W7 project to VDS, excluding heavy folders.
.DESCRIPTION
    1. Stages files in a temp directory.
    2. Excludes node_modules, data, 7w7apk.
    3. SCPs files to 193.106.196.39.
#>

$VDS_HOST = "193.106.196.39"
$VDS_USER = "administrator"
# Şifre: Yusufcuk1234
$REMOTE_PATH = "C:/Users/Administrator/Desktop/7w7test"
$LOCAL_PROJECT = "C:\Users\keke\Desktop\projeler\7W7"
$EXCLUDES = @("node_modules", "data", "7w7apk", ".git", ".idea", ".gradle", "build", "dist", ".gemini")

$TEMP_DIR = "$env:TEMP\7w7_deploy_stage"

Write-Host ">>> 1. Temizleme ve Hazırlık..." -ForegroundColor Cyan
if (Test-Path $TEMP_DIR) { Remove-Item -Recurse -Force $TEMP_DIR }
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null

Write-Host ">>> 2. Dosyalar Kopyalanıyor (Yedeksiz)..." -ForegroundColor Cyan

# Copy items excluding the list
$items = Get-ChildItem -Path $LOCAL_PROJECT
foreach ($item in $items) {
    if ($EXCLUDES -contains $item.Name) {
        Write-Host "   Skipping: $($item.Name)" -ForegroundColor DarkGray
        continue
    }
    
    Write-Host "   Staging: $($item.Name)" -ForegroundColor Green
    Copy-Item -Path $item.FullName -Destination $TEMP_DIR -Recurse -Force
}

Write-Host ">>> 3. VDS'e Gönderiliyor ($VDS_HOST)..." -ForegroundColor Yellow

# Use SCP to upload
# Note: Using standard scp. Assuming SSH key is set up or password will be asked.
# We copy contents of TEMP_DIR to REMOTE_PATH
$scpCommand = "scp -r -o StrictHostKeyChecking=no $TEMP_DIR/* ${VDS_USER}@${VDS_HOST}:${REMOTE_PATH}"

Write-Host "   Executing: $scpCommand"
Invoke-Expression $scpCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> BAŞARILI! VDS Güncellendi." -ForegroundColor Green
} else {
    Write-Host ">>> HATA! Dosyalar gönderilemedi." -ForegroundColor Red
}

Write-Host ">>> Geçici dosyalar siliniyor..."
Remove-Item -Recurse -Force $TEMP_DIR
Pause
