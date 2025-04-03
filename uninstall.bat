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
set "JS_FILE=C:\Program Files\Jellyfin\Server\jellyfin-web\home-html.*.chunk.js"

:: JS dosya adını dinamik olarak bul
for %%f in ("C:\Program Files\Jellyfin\Server\jellyfin-web\home-html.*.chunk.js") do set "JS_FILE=%%f"

set "SLIDER_HTML=<script src=\"/web/slider/auth.js\"></script><link rel=\"stylesheet\" href=\"/web/slider/src/slider.css\"><script type=\"module\" async src=\"/web/slider/main.js\"></script>"
set "SLIDER_JS=<div id=\"slides-container\"></div><script>slidesInit()</script>"

echo HTML dosyasindaki slider kodlari kontrol ediliyor...
findstr /C:"slider.css" "%HTML_FILE%" >nul
if %errorlevel% equ 0 (
    powershell -Command "(Get-Content '%HTML_FILE%') -replace [regex]::Escape('%SLIDER_HTML%'), '' | Set-Content '%HTML_FILE%'"
    echo [BASARILI] HTML slider kodu kaldirildi!
) else (
    echo [BILGI] HTML dosyasinda slider kodu bulunamadi.
)

echo JS dosyasindaki slider kodlari kontrol ediliyor...
findstr /C:"slides-container" "%JS_FILE%" >nul
if %errorlevel% equ 0 (
    powershell -Command "(Get-Content '%JS_FILE%') -replace [regex]::Escape('%SLIDER_JS%'), '' | Set-Content '%JS_FILE%'"
    echo [BASARILI] JS slider kodu kaldirildi!
) else (
    echo [BILGI] JS dosyasinda slider kodu bulunamadi.
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