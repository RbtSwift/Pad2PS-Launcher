# 🎮 Pad2PS Launcher (`v1.0.0`)

Central de jogos nativa estilo console para **PC (Linux/Windows)** e **Android**, parte do ecossistema **Pad2PS**. Projetada para oferecer uma experiência fluida em tela cheia com navegação completa por **controle (Gamepad API)**, temas visuais dinâmicos, busca integrada de capas e proteção de tela.

---

## ✨ Recursos Principais

- **Navegação 100% via Controle & Toque:** Suporte nativo à *Gamepad API* (PlayStation DualSense/DualShock, Xbox, Nintendo Switch Pro, GameSir, Backbone) com ícones adaptativos, mapeamento personalizável de botões e navegação fluida por toque no Android.
- **Scanner Inteligente de Jogos e Emuladores:**
  - **Desktop (`desktop/`):** Detecta automaticamente jogos instalados na Steam, Heroic Games Launcher, Lutris, PCSX2, DuckStation e discos montados via `scanner_jogos.py` + `pad2ps_launcher.py`.
  - **Android (`android/`):** Plugin nativo Capacitor (`GameScannerPlugin`) que detecta jogos instalados, emuladores populares (PPSSPP, DuckStation, AetherSX2/NetherSX2, RetroArch, Dolphin, Citra/Lime3DS, DraStic, Lemuroid, Yuzu/Sudachi, Vita3K, Mupen64Plus) e escaneia pastas de ROMs selecionadas via *Storage Access Framework*.
- **Personalização & Temas Visuais:** Temas predefinidos (*Pad2PS Neon*, *Futuristic*, *Horror*, *Cute*, *Pixel*, *PS2 Classic*, *Synthwave*, *Clean Light*, *Emerald Matrix*) e editor de tema personalizado com efeitos sonoros.
- **Busca Integrada de Capas:** Integração com SteamGridDB para download automático e manual de artes de capa e planos de fundo (*hero banners*).
- **Modo Descanso / Proteção de Tela:** Proteção de tela configurável por inatividade com modo minimalista, slideshow da biblioteca ou imagem personalizada.

---

## 📁 Estrutura do Repositório

```text
Pad2PS-Launcher/
├── desktop/                # Versão Desktop (React 19 + Vite + Electron + Python)
│   ├── src/                # Interface React / TypeScript / Tailwind CSS v4
│   ├── electron-main.cjs   # Processo principal Electron
│   ├── pad2ps_launcher.py  # Servidor local e gerenciamento de processos
│   └── scanner_jogos.py    # Scanner automático de bibliotecas Linux
├── android/                # Versão Android (React 19 + Vite + Capacitor + Plugin Java)
│   ├── src/                # Interface adaptada com ponte nativa (androidBridge.ts)
│   └── android/            # Projeto nativo Gradle com GameScannerPlugin.java
└── .github/workflows/      # Automação CI/CD para geração de releases multiplataforma
```

---

## 🚀 Como Compilar Localmente

### Desktop (`desktop/`)
```bash
cd desktop
npm install
npm run build
npx electron-builder --linux AppImage --publish never
```

### Android (`android/`)
```bash
cd android
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleRelease bundleRelease
```

---

## 📄 Créditos e Licença

Desenvolvido por **Pad2PS (Ravi Rosa)** — `<pad2ps@eusolravi.com.br>`  
Repositório oficial: [https://github.com/RbtSwift/Pad2PS-Launcher](https://github.com/RbtSwift/Pad2PS-Launcher)
