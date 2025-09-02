#!/bin/bash
set -euo pipefail

FILE="meta.json"
if [ ! -f "$FILE" ]; then
  echo "❌ $FILE bulunamadı!"
  exit 1
fi

TS=$(date -u +"%Y-%m-%dT%H:%M:%S.%7NZ")

NEWVER="${1:-}"

if command -v jq >/dev/null 2>&1; then
  if [ -n "$NEWVER" ]; then
    jq --arg ts "$TS" --arg ver "$NEWVER" \
      '.timestamp = $ts | .version = $ver' "$FILE" > "${FILE}.tmp"
  else
    jq --arg ts "$TS" '.timestamp = $ts' "$FILE" > "${FILE}.tmp"
  fi
  mv "${FILE}.tmp" "$FILE"
else
  echo "⚠️ jq yok; sadece sed ile timestamp güncellemeye çalışıyorum."
  sed -E -i "s#\"timestamp\"\s*:\s*\"[^\"]*\"#\"timestamp\": \"$TS\"#g" "$FILE"
  if [ -n "$NEWVER" ]; then
    sed -E -i "s#\"version\"\s*:\s*\"[^\"]*\"#\"version\": \"$NEWVER\"#g" "$FILE" || true
  fi
fi

echo "✅ meta.json güncellendi:"
echo "   timestamp = $TS"
[ -n "$NEWVER" ] && echo "   version   = $NEWVER"
