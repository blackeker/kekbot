# Commit mesajı al (parametre veya kullanıcıdan)
param(
    [string]$CommitMessage = ""
)

# ==========================================
# GitHub Auto Push Script
# ==========================================
# Otomatik olarak değişiklikleri commit edip GitHub'a push eder

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  GitHub Auto Push - Blackeker" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = Read-Host "Commit mesaji girin (bos birakabilirsiniz)"
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "Auto commit: $timestamp"
    }
}

Write-Host ""
Write-Host ">>> 1. Git durumu kontrol ediliyor..." -ForegroundColor Yellow

# Git durumunu kontrol et
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "Hicbir degisiklik yok. Push yapilacak bir sey yok." -ForegroundColor Green
    Write-Host ""
    Read-Host "Devam etmek icin Enter'a basin"
    exit 0
}

Write-Host "Degisiklikler bulundu:" -ForegroundColor Green
git status --short

Write-Host ""
Write-Host ">>> 2. Tum degisiklikler ekleniyor..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host ">>> 3. Commit yapiliyor..." -ForegroundColor Yellow
git commit -m "$CommitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Commit basarisiz!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Devam etmek icin Enter'a basin"
    exit 1
}

Write-Host ""
Write-Host ">>> 4. GitHub'a push ediliyor..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "  BASARILI! GitHub'a push edildi." -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Red
    Write-Host "  HATA! Push basarisiz oldu." -ForegroundColor Red
    Write-Host "===========================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Devam etmek icin Enter'a basin"
