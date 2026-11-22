# Arquitetura e manutenção do Pad2PS-Launcher

Este guia descreve o código de `RbtSwift/Pad2PS-Launcher` e os limites entre o Pad2PS-Launcher e o Pad2PS. As referências a permissões e lojas refletem os arquivos deste repositório; configuração externa de contas e segredos não pode ser inferida do código.

## Visão geral

O Pad2PS-Launcher possui duas bases de interface React/TypeScript separadas por plataforma, cada qual com seu próprio `package.json`, build Vite e empacotador nativo:

- `desktop/` → React + TypeScript + Vite → `desktop/dist/` → Electron (Linux e Windows)
- `android/` → React + TypeScript + Vite → `android/dist/` → Capacitor → `android/android/` (Gradle)

O `package.json` na raiz atua apenas como workspace de conveniência (`pad2ps-launcher-workspace`, versão `1.0.19`), delegando `dev`, `build`, `preview` e `lint` para `npm --prefix desktop`.

## Arquivos principais

- `package.json`: Workspace raiz; sincroniza instalação e scripts com `desktop/`
- `desktop/src/App.tsx`, `desktop/src/main.tsx`: Entrada e composição da interface Desktop (central de jogos estilo console)
- `desktop/src/components/ControllerTestModal.tsx`: Modal de teste de controle que oferece link direto para o Pad2PS para diagnósticos avançados e bateria
- `desktop/src/utils/updateChecker.ts`: Consulta a release mais recente no GitHub e seleciona o instalador apropriado para Desktop
- `desktop/electron-main.cjs`: Processo principal Electron (janela, execução de jogos/apps e integração Desktop)
- `desktop/package.json`: Versão Desktop (`1.0.19`), dependências (Electron 45.3.4, electron-builder) e configurações de empacotamento
- `desktop/build_linux_packages.sh`: Script local para gerar `.AppImage`, `.deb`, `.rpm`, `.tar.gz` e `.flatpak`
- `desktop/pad2ps-launcher-bin.sh`, `desktop/pad2ps-launcher-flatpak.sh`, `desktop/pad2ps-launcher-snap.sh`: Launchers de execução para pacotes nativos Linux, Flatpak e Snap
- `desktop/io.github.rbtswift.Pad2PSLauncher.yml`: Manifesto Flatpak de build local/CI (`type: archive` apontando para o tarball da release)
- `io.github.rbtswift.Pad2PSLauncher.yml`: Manifesto Flatpak raiz para submissão oficial ao Flathub (com `desktop/generated-sources.json`)
- `desktop/io.github.rbtswift.Pad2PSLauncher.metainfo.xml`, `io.github.rbtswift.Pad2PSLauncher.metainfo.xml`: Metadados AppStream (cópia desktop e cópia raiz)
- `desktop/pad2ps-launcher.desktop`, `desktop/io.github.rbtswift.Pad2PSLauncher.desktop`: Entradas de menu Linux
- `desktop/pad2ps-launcher.list`: Configuração de origem APT (`deb [trusted=yes]`) instalada em `/etc/apt/sources.list.d/`
- `android/src/App.tsx`, `android/src/main.tsx`: Interface Android empacotada via Capacitor (`webDir` em `android/dist/`)
- `android/src/utils/updateChecker.ts`: Consulta a API do GitHub para listar APKs da release mais recente no Android
- `android/capacitor.config.json`: Configuração Capacitor do aplicativo Android
- `android/android/build.gradle`, `android/android/app/`: Projeto Gradle nativo Android (`compileSdkVersion` 34, `minSdkVersion` 22) e plugins Java em `io/github/rbtswift/Pad2PSLauncher/`
- `.github/workflows/release.yml`: Pipeline principal de build multiplataforma (Linux, Windows, Android condicional), GitHub Releases, APT e dispatch Flatpak
- `.github/workflows/publish-linux-stores.yml`: Publicação automática no Snap Store e AUR ao publicar uma GitHub Release
- `.github/workflows/discord-changelog.yml`: Envio automático de embed de release para o servidor oficial do Discord

## Comunicação entre Pad2PS-Launcher e Pad2PS

**Não existe protocolo IPC em tempo de execução, socket local ou esquema URI customizado entre o Pad2PS-Launcher e o Pad2PS no código verificado.** Os dois projetos são independentes e mantêm ciclos de versão próprios (`1.0.19` no Launcher vs. `1.0.6` no Pad2PS).

A integração entre eles ocorre exclusivamente por referência de ecossistema e links de download:
- No Launcher, `desktop/src/components/ControllerTestModal.tsx` exibe link direto para as releases do `RbtSwift/Pad2PS` quando o usuário deseja recursos dedicados de overlay, bateria e diagnóstico.
- No `Pad2PS`, `src/data/installers.ts`, `src/components/InstallAppModal.tsx` e `api/latest-release.ts` listam e consultam as releases públicas do `RbtSwift/Pad2PS-Launcher`.

## Controles, permissões e udev

Não há arquivos `*.rules` nem configuração de regras `udev` neste repositório. A navegação por controle utiliza a API Gamepad padrão exposta pelo Chromium/Electron e WebView Android, apoiada pelo banco `gamecontrollerdb.txt` presente em `desktop/public/` e `android/public/`.

No Linux empacotado, o acesso a dispositivos e serviços gráficos/áudio depende das permissões declaradas nos manifestos Flatpak (`io.github.rbtswift.Pad2PSLauncher.yml` e `desktop/io.github.rbtswift.Pad2PSLauncher.yml`) e confinamentos do Snap (`snap/snapcraft.yaml`).

## Invariantes e armadilhas técnicas já resolvidas

1. **Dois diretórios de frontend independentes:** Ao contrário do `Pad2PS`, o `Pad2PS-Launcher` mantém `desktop/` e `android/` como projetos Node/Vite separados. Alterações compartilhadas precisam ser aplicadas e testadas em ambos.
2. **Arquivo `steamgriddb-secret.cjs` obrigatório no build Desktop:** O `electron-builder` exige que `desktop/steamgriddb-secret.cjs` exista antes de empacotar (gerado dinamicamente a partir de `STEAMGRIDDB_API_KEY`, `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET`, podendo ser strings vazias). Nunca commite chaves reais.
3. **Contrato do tarball Linux (`Pad2PS-Launcher-<versão>-x86_64.tar.gz`):** Empacota `linux-unpacked/` com os scripts launchers, `.desktop`, ícones e `metainfo.xml`. Flatpak, Snap e AUR consomem esse tarball.
4. **Dois manifestos Flatpak:** `desktop/io.github.rbtswift.Pad2PSLauncher.yml` consome o tarball da release; `io.github.rbtswift.Pad2PSLauncher.yml` (com `desktop/generated-sources.json`) é a receita de build fonte para o Flathub.
5. **`flatpak build-bundle` não aceita `--user`:** Removido no commit `c27d4f0`; mantenha `--user` apenas em `remote-add`, `install` e `flatpak-builder`.
6. **Dispatch isolado de Flatpak em `release.yml`:** Via `workflow_dispatch` com `release_tag`, executa apenas `build-flatpak-dispatch` a partir de `main` e anexa somente o `.flatpak` (`--clobber`), sem reconstruir `.deb`, `.rpm`, `.AppImage`, `.exe` ou APT.
7. **Sincronia entre tag e `desktop/package.json`:** O build Linux aborta se a tag `v*` divergir de `desktop/package.json`.
8. **Assinatura Android condicional:** O job Android exige `ANDROID_SIGNING_ENABLED == 'true'` e só assina release se `android/android/app/signing.keystore` e as três variáveis de senha/alias existirem.

## Rotina de manutenção

- Antes de gerar uma tag `vMAJOR.MINOR.PATCH`, atualize a versão em `package.json`, `desktop/package.json`, `android/package.json`, `updateChecker.ts` (Desktop e Android) e `android/android/app/build.gradle` (`versionName` e `versionCode`).
- Atualize `RELEASE_NOTES.md`, changelogs Fastlane e os arquivos `.metainfo.xml`.
- Após publicar a release, rode `/home/eusolravi/Projetos/finalizados/sync-releases.sh` e consulte [`GUIA_LOJAS_E_PENDENCIAS.md`](GUIA_LOJAS_E_PENDENCIAS.md).
