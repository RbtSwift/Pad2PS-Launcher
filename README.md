<div align="center">

<img src="https://www.pad2ps.com.br/logos/launcher-logo.png" alt="Pad2PS Launcher" width="104" />

# Pad2PS Launcher

**Central de jogos estilo console para PC e Android, com navegação 100% por controle.**

[![Versão](https://img.shields.io/badge/vers%C3%A3o-1.0.19-EC4899?style=flat-square)](https://github.com/RbtSwift/Pad2PS-Launcher/releases/latest)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-A855F7?style=flat-square)](LICENSE)
[![Plataformas](https://img.shields.io/badge/plataformas-Linux%20%C2%B7%20Windows%20%C2%B7%20Android-121218?style=flat-square)](#-português)
[![Portal](https://img.shields.io/badge/portal-pad2ps.com.br-F472B6?style=flat-square)](https://pad2ps.com.br/launcher)

[Português](#-português) · [English](#-english)

</div>

---

## 🇧🇷 Português

### Visão geral & ecossistema Pad2PS

O **Pad2PS Launcher** transforma o PC ou o dispositivo Android em um console dedicado: uma biblioteca única
reúne jogos da Steam, Heroic, Lutris e emuladores clássicos, com capas automáticas, temas visuais e navegação
completa por gamepad — sem depender de mouse ou teclado.

Ele faz parte da suíte gratuita e open-source **Pad2PS**, junto de:

- **[Pad2PS Controller](https://github.com/RbtSwift/Pad2PS-Controller)** — testador e tradutor visual de controles.
- **[Pad2PS Connect](https://github.com/RbtSwift/Pad2PS-Connect)** — integração local entre PC e Android.
- **[Pad2PS Dock](https://github.com/RbtSwift/Pad2PS-Dock)** — dock modular para GNOME Shell.

Portal oficial: **[pad2ps.com.br](https://pad2ps.com.br)**

### Principais recursos

- **Navegação 100% via controle e toque:** suporte nativo à *Gamepad API* (DualSense, DualShock, Xbox,
  Switch Pro, GameSir, Backbone) com ícones adaptativos, mapeamento personalizável e navegação fluida no Android.
- **Scanner inteligente de jogos e emuladores:**
  - **Desktop:** detecta jogos da Steam, Heroic Games Launcher, Lutris, PCSX2, DuckStation e discos montados
    via `scanner_jogos.py` + `pad2ps_launcher.py`.
  - **Android:** plugin nativo Capacitor (`GameScannerPlugin`) que encontra emuladores populares (PPSSPP,
    DuckStation, AetherSX2/NetherSX2, RetroArch, Dolphin, Citra/Lime3DS, Drastic, Lemuroid, Yuzu/Sudachi,
    Vita3K, Mupen64Plus) e varre pastas de ROMs escolhidas via *Storage Access Framework*.
- **Personalização e temas visuais:** *Pad2PS Neon*, *Futuristic*, *Horror*, *Cute*, *Pixel*, *PS2 Classic*,
  *Synthwave*, *Clean Light* e *Emerald Matrix*, além do editor de tema personalizado com efeitos sonoros.
- **Busca integrada de capas:** integração com o SteamGridDB para baixar capas e *hero banners* automática
  ou manualmente.
- **Modo descanso / proteção de tela:** ativação por inatividade com modo minimalista, slideshow da biblioteca
  ou imagem personalizada.
- **Integração com Discord Rich Presence** e inicialização em tela cheia pensada para TV, monitor ou portátil.

### Instalação & atualizações

**1. Site oficial e GitHub Releases (recomendado)**

- Portal: **[pad2ps.com.br/launcher](https://pad2ps.com.br/launcher)**
- Releases: **[github.com/RbtSwift/Pad2PS-Launcher/releases](https://github.com/RbtSwift/Pad2PS-Launcher/releases)**

| Plataforma | Formatos |
| --- | --- |
| Linux | `.AppImage`, `.deb`, `.rpm`, `.flatpak`, `.tar.gz` |
| Windows | `Setup.exe`, `Portable.exe` |
| Android | `.apk` e atualizações via **Obtainium** |

**2. Android com Obtainium**

[Adicionar Pad2PS Launcher ao Obtainium](https://apps.obtainium.imranr.dev/redirect.html?r=obtainium://add/https://github.com/RbtSwift/Pad2PS-Launcher)
— receba cada versão sem depender de loja de aplicativos.

**3. Instalação manual no Linux**

```bash
chmod +x Pad2PS-Launcher-*.AppImage && ./Pad2PS-Launcher-*.AppImage
sudo apt install ./Pad2PS-Launcher-*.deb     # Debian / Ubuntu / Mint
sudo dnf install ./Pad2PS-Launcher-*.rpm     # Fedora / Nobara / openSUSE
flatpak install --user ./Pad2PS-Launcher-*.flatpak
```

### Desenvolvimento & compilação local

```bash
npm install                  # instala o workspace e o shell desktop
npm run dev                  # interface em modo desenvolvimento
npm run lint                 # tsc --noEmit

cd desktop
npm run build
npm run pack:linux           # AppImage + .deb + .rpm + .tar.gz
npm run pack:win             # Setup.exe + Portable.exe
bash build_linux_packages.sh # pacotes Linux + Flatpak

cd ../android
npm install && npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
```

Estrutura do repositório:

```text
desktop/                  React 19 + Vite + Electron + scanners em Python
android/                  React 19 + Vite + Capacitor + GameScannerPlugin.java
.github/workflows/        builds e releases multiplataforma
```

### Comunidade, suporte & créditos

- **Discord:** [discord.gg/TWfKNvGkcj](https://discord.gg/TWfKNvGkcj)
- **Issues:** [github.com/RbtSwift/Pad2PS-Launcher/issues](https://github.com/RbtSwift/Pad2PS-Launcher/issues)
- **Portal:** [pad2ps.com.br](https://pad2ps.com.br) · **X:** [@Pad2PS](https://x.com/Pad2PS) · **Paçoca:** [@Pad2PS](https://pacoca.net/@Pad2PS)
- **Contato:** [contato@pad2ps.com.br](mailto:contato@pad2ps.com.br)

Desenvolvido por **Pad2PS (Ravi Rosa)** sob licença **MIT**. Projeto independente, sem vínculo oficial com
Sony Interactive Entertainment, Microsoft, Nintendo ou Valve. O Pad2PS não hospeda nem distribui jogos, ROMs
ou arquivos BIOS; marcas citadas aparecem apenas como referência de compatibilidade.

---

## 🇬🇧 English

### Overview & Pad2PS ecosystem

**Pad2PS Launcher** turns a PC or Android device into a dedicated console: a single library gathers Steam,
Heroic, Lutris and classic emulator games with automatic cover art, visual themes and full gamepad navigation —
no mouse or keyboard required.

It is part of the free, open-source **Pad2PS** suite, alongside:

- **[Pad2PS Controller](https://github.com/RbtSwift/Pad2PS-Controller)** — gamepad tester and visual translator.
- **[Pad2PS Connect](https://github.com/RbtSwift/Pad2PS-Connect)** — local PC-to-Android bridge.
- **[Pad2PS Dock](https://github.com/RbtSwift/Pad2PS-Dock)** — modular GNOME Shell dock.

Official portal: **[pad2ps.com.br](https://pad2ps.com.br)**

### Highlights

- **100% gamepad and touch navigation:** native *Gamepad API* support (DualSense, DualShock, Xbox, Switch Pro,
  GameSir, Backbone) with adaptive button icons, customizable mapping and smooth Android touch navigation.
- **Smart game and emulator scanner:**
  - **Desktop:** detects Steam, Heroic Games Launcher, Lutris, PCSX2, DuckStation and mounted drives through
    `scanner_jogos.py` + `pad2ps_launcher.py`.
  - **Android:** native Capacitor plugin (`GameScannerPlugin`) that finds popular emulators (PPSSPP, DuckStation,
    AetherSX2/NetherSX2, RetroArch, Dolphin, Citra/Lime3DS, Drastic, Lemuroid, Yuzu/Sudachi, Vita3K,
    Mupen64Plus) and scans ROM folders picked through the *Storage Access Framework*.
- **Themes and customization:** *Pad2PS Neon*, *Futuristic*, *Horror*, *Cute*, *Pixel*, *PS2 Classic*,
  *Synthwave*, *Clean Light* and *Emerald Matrix*, plus a custom theme editor with sound effects.
- **Integrated cover art lookup:** SteamGridDB integration for automatic or manual cover and hero banner downloads.
- **Screensaver / rest mode:** idle activation with a minimalist layout, library slideshow or custom image.
- **Discord Rich Presence** and fullscreen startup designed for TVs, monitors and handhelds.

### Installation & updates

**1. Official website and GitHub Releases (recommended)**

- Portal: **[pad2ps.com.br/launcher](https://pad2ps.com.br/launcher)**
- Releases: **[github.com/RbtSwift/Pad2PS-Launcher/releases](https://github.com/RbtSwift/Pad2PS-Launcher/releases)**

| Platform | Formats |
| --- | --- |
| Linux | `.AppImage`, `.deb`, `.rpm`, `.flatpak`, `.tar.gz` |
| Windows | `Setup.exe`, `Portable.exe` |
| Android | `.apk` and updates through **Obtainium** |

**2. Android with Obtainium**

[Add Pad2PS Launcher to Obtainium](https://apps.obtainium.imranr.dev/redirect.html?r=obtainium://add/https://github.com/RbtSwift/Pad2PS-Launcher)
— receive every build without relying on an app store.

**3. Manual Linux install**

```bash
chmod +x Pad2PS-Launcher-*.AppImage && ./Pad2PS-Launcher-*.AppImage
sudo apt install ./Pad2PS-Launcher-*.deb     # Debian / Ubuntu / Mint
sudo dnf install ./Pad2PS-Launcher-*.rpm     # Fedora / Nobara / openSUSE
flatpak install --user ./Pad2PS-Launcher-*.flatpak
```

### Development & local builds

```bash
npm install                  # installs the workspace and the desktop shell
npm run dev                  # development UI
npm run lint                 # tsc --noEmit

cd desktop
npm run build
npm run pack:linux           # AppImage + .deb + .rpm + .tar.gz
npm run pack:win             # Setup.exe + Portable.exe
bash build_linux_packages.sh # Linux packages + Flatpak

cd ../android
npm install && npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
```

Repository layout:

```text
desktop/                  React 19 + Vite + Electron + Python scanners
android/                  React 19 + Vite + Capacitor + GameScannerPlugin.java
.github/workflows/        cross-platform builds and releases
```

### Community, support & credits

- **Discord:** [discord.gg/TWfKNvGkcj](https://discord.gg/TWfKNvGkcj)
- **Issues:** [github.com/RbtSwift/Pad2PS-Launcher/issues](https://github.com/RbtSwift/Pad2PS-Launcher/issues)
- **Portal:** [pad2ps.com.br](https://pad2ps.com.br) · **X:** [@Pad2PS](https://x.com/Pad2PS) · **Paçoca:** [@Pad2PS](https://pacoca.net/@Pad2PS)
- **Contact:** [contato@pad2ps.com.br](mailto:contato@pad2ps.com.br)

Built by **Pad2PS (Ravi Rosa)** under the **MIT** license. Independent project, not affiliated with Sony
Interactive Entertainment, Microsoft, Nintendo or Valve. Pad2PS never hosts or distributes games, ROMs or BIOS
files; trademarks appear only as compatibility references.
