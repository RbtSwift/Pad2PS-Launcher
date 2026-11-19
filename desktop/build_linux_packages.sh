#!/usr/bin/env bash
set -e

echo "=== [1/2] Compilando web e empacotando instaladores Linux ==="
npm run build
npx electron-builder --linux AppImage deb --publish never

echo "=== TUDO PRONTO! ==="
echo "Os instaladores foram gerados na pasta 'release/'!"
ls -la release/
