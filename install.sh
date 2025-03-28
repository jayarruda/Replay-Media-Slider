#!/bin/bash

HTML_FILE="/usr/share/jellyfin/web/index.html"
JS_FILE="/usr/share/jellyfin/web/home-html.8ce38bc7d6dc073656d4.chunk.js"

INSERT_HTML='<script src="/web/slider/auth.js"></script><link rel="stylesheet" href="/web/slider/src/slider.css"><script type="module" async src="/web/slider/main.js"></script>'

INSERT_JS='<div id="slides-container"></div><script>slidesInit()</script>'

if ! grep -q "slider.css" "$HTML_FILE"; then
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
