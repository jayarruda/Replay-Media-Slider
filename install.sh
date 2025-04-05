#!/bin/bash
JELLYFIN_WEB="/usr/share/jellyfin/web"
HTML_FILE="$JELLYFIN_WEB/index.html"
JS_FILE=$(find "$JELLYFIN_WEB" -name "home-html.*.chunk.js" | head -n 1)
SLIDER_DIR="$JELLYFIN_WEB/slider"
SOURCE_DIR="$(dirname "$(realpath "$0")")"

INSERT_HTML='<script src="/web/slider/auth.js"></script><script type="module" async src="/web/slider/main.js"></script>'
INSERT_JS='<div id="slides-container"></div><script>slidesInit()</script>'

if [ "$(id -u)" -ne 0 ]; then
    echo "Bu script root olarak çalıştırılmalıdır."
    exit 1
fi

echo "Slider klasörü oluşturuluyor: $SLIDER_DIR"
if mkdir -p "$SLIDER_DIR"; then
    if [ -d "$SLIDER_DIR" ]; then
        echo "Klasör başarıyla oluşturuldu, dosyalar kopyalanıyor..."
        if cp -r "$SOURCE_DIR"/* "$SLIDER_DIR"/ 2>/dev/null; then
            echo "Dosyalar başarıyla kopyalandı: $SLIDER_DIR"
        else
            echo "HATA: Dosyalar kopyalanırken bir sorun oluştu!" >&2
            exit 1
        fi
    else
        echo "HATA: Klasör oluşturulamadı: $SLIDER_DIR" >&2
        exit 1
    fi
else
    echo "HATA: Klasör oluşturulamadı: $SLIDER_DIR" >&2
    exit 1
fi

JS_FILE=$(find "$JELLYFIN_WEB" -name "home-html.*.chunk.js" | head -n 1)

if ! grep -q "slider/auth.js" "$HTML_FILE"; then
    sed -i "s|</body>|${INSERT_HTML}</body>|g" "$HTML_FILE"
    echo "HTML snippet başarıyla eklendi!"
else
    echo "HTML snippet zaten mevcut. Atlanıyor..."
fi

if ! grep -q "slides-container" "$JS_FILE"; then
    sed -i "s|id=\"homeTab\" data-index=\"0\">|id=\"homeTab\" data-index=\"0\">${INSERT_JS}|g" "$JS_FILE"
    echo "JS snippet başarıyla eklendi!"
else
    echo "JS snippet zaten mevcut. Atlanıyor..."
fi

echo "Kurulum tamamlandı!"
