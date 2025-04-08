@echo off
setlocal enabledelayedexpansion

set "JELLYFIN_WEB=C:\Program Files\Jellyfin\Server\jellyfin-web"
set "HTML_FILE=%JELLYFIN_WEB%\index.html"

set "SLIDER_DIR=%JELLYFIN_WEB%\slider"
set "SOURCE_DIR=%~dp0"

set "INSERT_HTML=<script type=\"module\" async src=\"/web/slider/main.js\"></script>"


net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Bu scriptin calismasi icin yonetici olarak calistirilmalidir.
    pause
    exit /b
)

echo Slider klasoru olusturuluyor ve dosyalar kopyalaniyor...
if not exist "%SLIDER_DIR%" (
    mkdir "%SLIDER_DIR%"
    xcopy /E /Y "%SOURCE_DIR%*" "%SLIDER_DIR%\"
    echo Dosyalar basariyla kopyalandi.
) else (
    echo Slider klasoru zaten mevcut. Dosyalar guncelleniyor...
    xcopy /E /Y "%SOURCE_DIR%*" "%SLIDER_DIR%\"
)

findstr /C:"slider/main.js" "%HTML_FILE%" >nul


if %errorlevel% neq 0 (
    powershell -Command "(Get-Content '%HTML_FILE%') -replace '</body>', '%INSERT_HTML%</body>' | Set-Content '%HTML_FILE%'"
    echo HTML degisiklikleri basariyla uygulandi!
) else (
    echo HTML degisiklikleri zaten uygulanmis. Atlandi...
)









