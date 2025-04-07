#!/bin/bash
JELLYFIN_WEB="/usr/share/jellyfin/web"
HTML_FILE="$JELLYFIN_WEB/index.html"
SLIDER_DIR="$JELLYFIN_WEB/slider"

SLIDER_HTML='<script src="/web/slider/auth.js"></script><script type="module" async src="/web/slider/main.js"></script>'

if [ "$(id -u)" -ne 0 ]; then
    echo "Bu script root olarak çalıştırılmalıdır."
    exit 1
fi

echo "Jellyfin servisi durduruluyor..."
systemctl stop jellyfin

echo "HTML dosyasındaki slider kodları kaldırılıyor..."
if grep -q "slider/auth.js" "$HTML_FILE"; then
    sed -i "s|$SLIDER_HTML||g" "$HTML_FILE"
    echo "HTML slider kodları başarıyla kaldırıldı!"
else
    echo "HTML dosyasında slider kodu bulunamadı."
fi

echo "Slider dosyaları siliniyor..."
if [ -d "$SLIDER_DIR" ]; then
    rm -rf "$SLIDER_DIR"
    echo "Slider dosyaları başarıyla silindi: $SLIDER_DIR"
else
    echo "Slider dizini bulunamadı: $SLIDER_DIR"
fi

echo "Jellyfin servisi başlatılıyor..."
systemctl start jellyfin

echo "Slider kaldırma işlemi tamamlandı!"
