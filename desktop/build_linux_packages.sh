#!/usr/bin/env bash
set -e

echo "=== [1/3] Configurando dependências de build (electron-builder) ==/bin/bash"
npm install --save-dev electron-builder --legacy-peer-deps

echo "=== [2/3] Adicionando configuração de empacotamento no package.json ==/bin/bash"
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
pkg.build = {
  appId: "com.github.rbtswift.pad2pslauncher",
  productName: "Pad2PS Launcher",
  directories: {
    output: "release"
  },
  files: [
    "dist/**/*",
    "pad2ps_launcher.py",
    "electron-main.cjs",
    "electron-preload.cjs",
    "package.json"
  ],
  linux: {
    target: ["AppImage", "deb", "rpm"],
    category: "Game",
    icon: "dist"
  }
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
'

echo "=== [3/3] Gerando os pacotes instaladores (.AppImage, .deb, .rpm) ==/bin/bash"
npx electron-builder --linux --dir

echo "=== TUDO PRONTO! ==="
echo "Os instaladores e binários portáveis foram gerados na pasta 'release/'!"
ls -la release/
