@echo off
setlocal enabledelayedexpansion

set "JELLYFIN_WEB=C:\Program Files\Jellyfin\Server\jellyfin-web"
set "HTML_FILE=%JELLYFIN_WEB%\index.html"
set "JS_FILE=%JELLYFIN_WEB%\home-html.*.chunk.js"
set "SLIDER_DIR=%JELLYFIN_WEB%\slider"
set "SOURCE_DIR=%~dp0"

set "INSERT_HTML=<script src=\"/web/slider/auth.js\"></script><script type=\"module\" async src=\"/web/slider/main.js\"></script>"
set "INSERT_JS=<div id=\"slides-container\"></div><script>slidesInit()</script>"

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

for %%f in ("%JELLYFIN_WEB%\home-html.*.chunk.js") do set "JS_FILE=%%f"

findstr /C:"slider/auth.js" "%HTML_FILE%" >nul
if %errorlevel% neq 0 (
    powershell -Command "(Get-Content '%HTML_FILE%') -replace '</body>', '%INSERT_HTML%</body>' | Set-Content '%HTML_FILE%'"
    echo HTML degisiklikleri basariyla uygulandi!
) else (
    echo HTML degisiklikleri zaten uygulanmis. Atlandi...
)

findstr /C:"slides-container" "%JS_FILE%" >nul
if %errorlevel% neq 0 (
    powershell -Command "(Get-Content '%JS_FILE%') -replace 'id=\""homeTab\"" data-index=\""0\"">', 'id=\""homeTab\"" data-index=\""0\"">%INSERT_JS%' | Set-Content '%JS_FILE%'"
    echo JS degisiklikleri basariyla uygulandi!
) else (
    echo JS degisiklikleri zaten uygulanmis. Atlandi...
)

echo Kurulum tamamlandi!
pause
