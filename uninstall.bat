@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Bu islemi yapabilmek icin yonetici olarak calistirmalisiniz.
    pause
    exit /b
)

echo Jellyfin servisi durduruluyor...
net stop JellyfinServer >nul 2>&1

set "HTML_FILE=C:\Program Files\Jellyfin\Server\jellyfin-web\index.html"
set "SLIDER_HTML=<script type=\"module\" async src=\"/web/slider/main.js\"></script>"

echo HTML dosyasindaki slider kodlari kontrol ediliyor...
findstr /C:"slider/main.js" "%HTML_FILE%" >nul
if %errorlevel% equ 0 (
    powershell -Command "(Get-Content '%HTML_FILE%') -replace [regex]::Escape('%SLIDER_HTML%'), '' | Set-Content '%HTML_FILE%'"
    echo [BASARILI] HTML slider kodu kaldirildi!
) else (
    echo [BILGI] HTML dosyasinda slider kodu bulunamadi.
)

set "SLIDER_DIR=C:\Program Files\Jellyfin\Server\jellyfin-web\slider"
if exist "%SLIDER_DIR%" (
    echo Slider dosyalari siliniyor...
    rmdir /s /q "%SLIDER_DIR%"
    echo [BASARILI] Slider dosyalari silindi.
) else (
    echo [BILGI] Slider dizini bulunamadi: %SLIDER_DIR%
)

echo Jellyfin servisi baslatiliyor...
net start JellyfinServer >nul 2>&1

endlocal
echo.
echo [TAMAMLANDI] Slider kaldirma islemi basariyla tamamlandi.
pause
