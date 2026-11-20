#!/usr/bin/env bash
set -euo pipefail

echo "=== Compilando e empacotando formatos Linux ==="
npm run build
npx electron-builder --linux AppImage deb rpm dir --publish never

VERSION=$(node -p "require('./package.json').version")
mkdir -p artifacts
cp release/*.AppImage "artifacts/Pad2PS-Launcher-${VERSION}-x86_64.AppImage"
cp release/*.deb "artifacts/Pad2PS-Launcher-${VERSION}-amd64.deb"
cp release/*.rpm "artifacts/Pad2PS-Launcher-${VERSION}-x86_64.rpm"
tar -czf "artifacts/Pad2PS-Launcher-${VERSION}-x86_64.tar.gz" \
  -C release linux-unpacked \
  -C . pad2ps-launcher-bin.sh pad2ps-launcher-snap.sh \
  pad2ps-launcher.desktop icon-256.png icon.png \
  io.github.rbtswift.Pad2PSLauncher.metainfo.xml

flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak-builder --user --install-deps-from=flathub --force-clean \
  --repo=flatpak-repo flatpak-build io.github.rbtswift.Pad2PSLauncher.yml
flatpak build-bundle flatpak-repo \
  "artifacts/Pad2PS-Launcher-${VERSION}-x86_64.flatpak" \
  io.github.rbtswift.Pad2PSLauncher

echo "Artefatos gerados em artifacts/:"
ls -lh artifacts/
