# Manual técnico de empacotamento — Pad2PS Launcher

Guia de manutenção, compilação e publicação do **RbtSwift/Pad2PS-Launcher**.
Os caminhos deste documento são relativos à raiz do repositório, salvo quando
um caminho absoluto é indicado. A versão observada nos arquivos é **1.0.19**;
confira os arquivos no commit que será lançado antes de reutilizar qualquer
versão ou comando.

## 1. Arquitetura e arquivos de referência

O repositório contém dois aplicativos que compartilham a interface React, mas
têm hospedeiros nativos diferentes:

| Caminho | Responsabilidade |
| --- | --- |
| `desktop/` | Aplicativo Linux/Windows: React + TypeScript + Vite, empacotado com Electron. `src/` contém interface e lógica; `electron-main.cjs` é o processo principal; `package.json` configura electron-builder, identificador e destinos. |
| `android/` | Aplicativo Android: React + Vite dentro de Capacitor. `src/` contém interface e ponte JS; `android/` contém o projeto Gradle e plugins Java próprios em `android/app/src/main/java/io/github/rbtswift/Pad2PSLauncher/`. |
| `.github/workflows/release.yml` | Em tags `v*`, compila Linux e Windows; Android é condicional. Publica os artefatos e atualiza o índice APT. Também aceita `workflow_dispatch` com `release_tag`. |
| `.github/workflows/publish-linux-stores.yml` | Ao publicar uma GitHub Release, tenta publicar no Snap Store e AUR, se os respectivos segredos existirem. |
| `.github/scripts/generate-apt-changelog.py` | Converte `RELEASE_NOTES.md` para o changelog Debian publicado no GitHub Pages. |
| `desktop/build_linux_packages.sh` | Receita local para AppImage, `.deb`, `.rpm`, `.tar.gz` e bundle Flatpak. |
| `snap/snapcraft.yaml`, `PKGBUILD`, `.SRCINFO` | Receita e metadados para Snap e AUR. |
| `io.github.rbtswift.Pad2PSLauncher.yml` | Manifesto Flatpak fonte/build para submissão ao Flathub. Há também `desktop/io.github.rbtswift.Pad2PSLauncher.yml`, consumido pelo workflow e pelo script Linux. |
| `fastlane/metadata/android/` | Metadados localizados de listagem e changelog Android. Não há `Fastfile`, `Appfile` ou automação de envio ao Google Play no repositório. |
| `store-assets/STORE_LISTING.md` | Texto auxiliar de listagem para lojas. |
| `RELEASE_NOTES.md` | Notas bilingues usadas no corpo da GitHub Release e como origem do changelog APT. |

### Versões e dependências observadas

- Node.js **22** é a versão selecionada pelos workflows; use npm com os
  `package-lock.json` existentes e `npm ci`.
- `desktop/package.json`: Electron **45.3.4**, electron-builder **^26.18.0**,
  React **19.0.1**, Vite **^8.3.0** e TypeScript **^7.0.2**.
- `android/package.json`: Capacitor Android/Core/CLI **^6.2.0**, React
  **^19.0.1** e Vite **^8.3.0**.
- Android: Gradle wrapper **8.2.1**, Android Gradle Plugin **8.2.1**, Java
  **17** no workflow, `minSdkVersion` **22**, `compileSdkVersion` e
  `targetSdkVersion` **34**.
- Flatpak: runtime e SDK `org.freedesktop.{Platform,Sdk}//25.08`.
- Dependências detalhadas e travadas ficam em `desktop/package-lock.json` e
  `android/package-lock.json`; os números acima são referências declaradas
  pela configuração, não substituem a leitura dos lockfiles.

## 2. Empacotamento local

### Preparação comum para Desktop

Instale Node.js 22 e Git. O workflow cria `steamgriddb-secret.cjs` antes do
build porque electron-builder o inclui no pacote. Em cada compilação local,
execute a partir de `desktop/` (as chaves podem ficar vazias; defina-as no
ambiente somente se quiser habilitar as integrações):

```bash
cd desktop
npm ci
node -e 'require("fs").writeFileSync("steamgriddb-secret.cjs", "module.exports = " + JSON.stringify({ STEAMGRIDDB_API_KEY: process.env.STEAMGRIDDB_API_KEY || "", IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID || "", IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET || "" }) + ";")'
npm run build
```

O arquivo gerado contém chaves da aplicação se elas forem definidas. Não
publique valores secretos em logs, no repositório ou nos artefatos.

### Linux: `.AppImage`, `.deb`, `.rpm`, `.tar.gz` e `.flatpak`

Além da preparação acima, instale as ferramentas usadas pelo script:
`dpkg-deb`, `rpm`/`rpmbuild`, Flatpak, `flatpak-builder`, `tar` e `gzip`.
Configure Flathub e instale o runtime/SDK 25.08 se o gerenciador não os instalar
automaticamente. Em Debian/Ubuntu, por exemplo:

```bash
sudo apt-get update
sudo apt-get install -y flatpak flatpak-builder rpm
flatpak remote-add --user --if-not-exists flathub \
  https://flathub.org/repo/flathub.flatpakrepo
flatpak install --noninteractive --user flathub \
  org.freedesktop.Platform//25.08 org.freedesktop.Sdk//25.08
```

Na raiz do repositório, rode:

```bash
bash desktop/build_linux_packages.sh
```

O script compila a interface, invoca electron-builder para AppImage, `.deb`,
`.rpm` e diretório descompactado, cria o `.tar.gz` e tenta criar o bundle
Flatpak. Os arquivos são gravados em `desktop/artifacts/` com nomes como
`Pad2PS-Launcher-1.0.19-x86_64.AppImage`,
`Pad2PS-Launcher-1.0.19-amd64.deb`,
`Pad2PS-Launcher-1.0.19-x86_64.rpm`,
`Pad2PS-Launcher-1.0.19-x86_64.tar.gz` e
`Pad2PS-Launcher-1.0.19-x86_64.flatpak`.

**Limitação Flatpak a verificar:** os dois manifestos acima atualmente apontam
para o tarball remoto da versão 1.0.19 e fixam seu SHA-256. O workflow executa
`flatpak-builder` antes de publicar o tarball da tag nova; portanto, sem uma
mudança específica na receita/pipeline, o bundle pode consumir o payload antigo
(ou falhar se a referência não existir). Não trate o `.flatpak` produzido como
atual só por ter sido anexado à nova release: confirme o conteúdo/versão ou
corrija a receita para usar o payload da compilação atual. O manifesto raiz de
Flathub também precisa de URL e hash válidos para cada novo tarball.

Valide os arquivos gerados antes da distribuição:

```bash
cd desktop/artifacts
file ./*
dpkg-deb --info Pad2PS-Launcher-1.0.19-amd64.deb
dpkg-deb --contents Pad2PS-Launcher-1.0.19-amd64.deb
rpm -qip Pad2PS-Launcher-1.0.19-x86_64.rpm
rpm -qlp Pad2PS-Launcher-1.0.19-x86_64.rpm
tar -tzf Pad2PS-Launcher-1.0.19-x86_64.tar.gz
chmod +x Pad2PS-Launcher-1.0.19-x86_64.AppImage
./Pad2PS-Launcher-1.0.19-x86_64.AppImage
flatpak install --user ./Pad2PS-Launcher-1.0.19-x86_64.flatpak
```

Use a versão real nos nomes ao copiar os exemplos. Teste o AppImage e o app
instalado em uma máquina Linux compatível. A instalação local do bundle Flatpak
é também uma validação prática; remova-o pelo gerenciador Flatpak quando
terminar.

### Windows: Setup e Portable

Compile em Windows com Node.js 22, pois esse é o ambiente suportado pelo
workflow:

```powershell
cd desktop
npm ci
node -e 'require("fs").writeFileSync("steamgriddb-secret.cjs", "module.exports = " + JSON.stringify({ STEAMGRIDDB_API_KEY: process.env.STEAMGRIDDB_API_KEY || "", IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID || "", IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET || "" }) + ";")'
npm run build
npx electron-builder --win nsis portable --publish never
```

Saídas em `desktop/release/`, normalmente
`Pad2PS-Launcher-1.0.19-Setup.exe` e
`Pad2PS-Launcher-1.0.19-Portable.exe`. Teste o instalador e a execução
portátil em Windows limpo. O `publisherName` de electron-builder, sozinho, não
assina executáveis: não há certificado, segredo ou etapa Authenticode configurada.
**MSIX não é um destino configurado ou gerado.**

### Android: APK e AAB

Pré-requisitos: Node.js 22, Java 17, SDK Android compatível com compile SDK 34,
Android SDK Build Tools (`apksigner`) e o wrapper Gradle incluso.

O Gradle procura o arquivo de chave em
`android/android/app/signing.keystore` e lê `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` do ambiente (ou de propriedades
Gradle). Para um aplicativo já distribuído, use a mesma chave de assinatura
autorizada; uma chave nova não atualiza instalações assinadas com outra chave.
Se for a primeira publicação, gere uma chave upload conforme as exigências do
Google Play e faça backup seguro. Não a versione nem a envie para GitHub.

```bash
cd android
npm ci
npm run build
npx cap sync android
cd android
chmod +x gradlew
export ANDROID_KEYSTORE_PASSWORD='senha-do-keystore'
export ANDROID_KEY_ALIAS='alias-da-chave'
export ANDROID_KEY_PASSWORD='senha-da-chave'
./gradlew assembleRelease bundleRelease
```

Com `signing.keystore` e as três credenciais presentes, `build.gradle` aplica
essa configuração ao tipo `release`. Sem elas, o Gradle continua sem
`signingConfig`: os arquivos podem ser gerados, mas não são publicáveis como
artefatos assinados para instalação direta ou Play Console.

Saídas Gradle:

- APK: `android/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/android/app/build/outputs/bundle/release/app-release.aab`

Valide e teste:

```bash
apksigner verify --verbose --print-certs \
  android/android/app/build/outputs/apk/release/app-release.apk
jarsigner -verify -verbose -certs \
  android/android/app/build/outputs/bundle/release/app-release.aab
adb install -r android/android/app/build/outputs/apk/release/app-release.apk
```

O APK assinado é o artefato para instalação direta/Obtainium; o AAB assinado é
o formato de envio ao Play Console. O Play Console aplica suas próprias etapas
de revisão e assinatura de distribuição, conforme a configuração da ficha do
app.

## 3. Build e publicação por GitHub Actions

O workflow `.github/workflows/release.yml` inicia em push de tag `v*` ou por
`workflow_dispatch`. O nome da tag deve ser `vMAJOR.MINOR.PATCH` e, no job
Linux, a versão sem `v` precisa ser exatamente a de `desktop/package.json`.
Os jobs usam Node 22; o job Windows gera Setup e Portable; o Linux gera os
formatos descritos acima.

1. Atualize as versões, metadados e notas (seção 6), faça commit e push.
2. Crie e publique a tag:

   ```bash
   TAG=v1.0.20
   git tag -a "$TAG" -m "$TAG"
   git push origin "$TAG"
   ```

3. Acompanhe em **Actions → Release Multiplataforma** ou com
   `gh run list --workflow release.yml` e `gh run watch ID --exit-status`.
4. Quando a execução concluir, confira a release e os nomes/tamanhos dos
   assets em `gh release view "$TAG"` ou na página da release.

Alternativamente, para uma tag já existente, use Actions → Release
Multiplataforma → Run workflow e informe `release_tag`. Com `gh`:

```bash
gh workflow run release.yml --ref main -f release_tag=v1.0.20
```

O workflow publica uma GitHub Release com `RELEASE_NOTES.md`, e envia para
`gh-pages` os arquivos APT gerados. O job Android só roda se a variável de
repositório `ANDROID_SIGNING_ENABLED` for exatamente `true`; caso contrário,
fica como skipped. **A configuração atual não fornece keystore nem credenciais
Android ao Gradle**: o job apenas compila APK/AAB. Habilitar a variável, por si
só, não assina os arquivos. Não anuncie APK/AAB da Action como assinados sem
verificar os certificados; para publicar builds Android assinados é necessário
provisionar a chave com segurança e integrar explicitamente sua instalação e
credenciais ao workflow, ou compilar localmente como na seção anterior.

Após a GitHub Release ser publicada, `publish-linux-stores.yml` é acionado:

- Sem `SNAPCRAFT_STORE_CREDENTIALS`, Snap Store é ignorado; com o segredo
  configurado, o workflow baixa o tarball versionado, empacota e faz upload no
  canal `stable`.
- Sem `AUR_SSH_PRIVATE_KEY`, AUR é ignorado; com a chave autorizada, atualiza
  o `PKGBUILD`/`.SRCINFO` no repositório AUR `pad2ps-launcher-bin`.
- Esse workflow não publica no Flathub nem na Play Store.

## 4. APT em GitHub Releases e GitHub Pages

No job `publish-release`, depois que os builds terminam, todos os artifacts das
plataformas são baixados para `all-artifacts/`. O script de changelog gera
`pages/apt/changelogs/main/p/pad2ps-launcher/pad2ps-launcher_<versão>.changelog`
a partir de `RELEASE_NOTES.md`. No diretório dos artefatos:

1. `dpkg-scanpackages -m . /dev/null` indexa os `.deb` e grava `Packages`;
   o `sed` remove o prefixo `./` do campo `Filename`.
2. `gzip -n -9 -c Packages` gera `Packages.gz`.
3. O workflow cria `Release` com versão, suite `stable`, arquitetura `amd64`,
   URL de changelogs, tamanhos e SHA-256 de `Packages` e `Packages.gz`.
4. `Packages`, `Packages.gz`, `Release` e changelogs são copiados para o
   checkout `gh-pages` e enviados ao GitHub Pages. Os arquivos do diretório
   `all-artifacts/` também são anexados à GitHub Release pelo padrão
   `all-artifacts/*`.

**Assinatura APT não está implementada.** Não há chamada GPG, chave, segredo
GPG, geração de `InRelease` ou `Release.gpg` neste workflow. O arquivo
`desktop/pad2ps-launcher.list` usa `deb [trusted=yes]` para a URL
`https://github.com/RbtSwift/Pad2PS-Launcher/releases/latest/download/ ./`,
portanto o APT não autentica esses metadados com uma chave de repositório.
Os hashes no `Release` não substituem uma assinatura autenticada. Não
documente nem prometa repositório APT assinado até que a geração/publicação
GPG e a distribuição da chave pública estejam implementadas e verificadas.

## 5. Lojas e distribuição externa

| Canal | Localização e estado observado |
| --- | --- |
| Snap Store | `snap/snapcraft.yaml` e `snap/launcher.sh`; a Action automatiza upload se `SNAPCRAFT_STORE_CREDENTIALS` estiver configurado. Credenciais e autorização do pacote `pad2ps-launcher` são pré-requisitos externos. |
| AUR | `PKGBUILD` e `.SRCINFO`; a Action atualiza o pacote binário se `AUR_SSH_PRIVATE_KEY` estiver configurada e autorizada. Os metadados do repositório local são modelos; a Action não os commita de volta ao projeto. |
| Flathub | `io.github.rbtswift.Pad2PSLauncher.yml` é o manifesto de build/submissão, com runtime, fonte GitHub e `x-checker-data`; `desktop/generated-sources.json` guarda fontes npm vendorizadas. Não há publicação automática; submissão, revisão e eventual atualização do Flathub são manuais. Ao mudar `desktop/package-lock.json`, a orientação do repositório é regenerar fontes com `flatpak-node-generator npm desktop/package-lock.json --output desktop/generated-sources.json`. |
| Bundle Flatpak da Release | A Action e `desktop/build_linux_packages.sh` usam `desktop/io.github.rbtswift.Pad2PSLauncher.yml`; ele também fixa URL e hash do tarball. Ver a limitação de payload da seção 2 antes de distribuir o bundle. |
| Google Play / Fastlane | `fastlane/metadata/android/{pt-BR,en-US}/` contém título, descrições, imagens e changelog `20.txt`. Não existe lane/Fastfile ou upload automatizado; assinar AAB, enviar ao Play Console, preencher declarações/ficha e conduzir revisão continuam passos manuais. Confira também os requisitos vigentes de `targetSdkVersion` do Play. |
| Obtainium | O README fornece um deep link para o repositório GitHub e o app Android consulta a GitHub API para listar assets APK da release mais recente (`android/src/utils/updateChecker.ts`). Não há manifesto Obtainium separado. A instalação direta requer APK assinado pela identidade esperada pelo dispositivo. |
| GitHub Releases | Canal automatizado principal para os arquivos de Linux, Windows e, se o job Android rodar, Android. O app seleciona APK/EXE/DEB/AppImage na verificação de atualização conforme a plataforma. |

## 6. Checklist de nova versão

Antes de criar a tag, atualize e confira os locais versionados. O próximo
exemplo é `1.0.20` / `v1.0.20`; adapte o número:

1. `package.json` na raiz, `desktop/package.json` e
   `android/package.json`. Para atualizar os arquivos npm e lockfiles
   correspondentes:

   ```bash
   npm version 1.0.20 --no-git-tag-version
   (cd desktop && npm version 1.0.20 --no-git-tag-version)
   (cd android && npm version 1.0.20 --no-git-tag-version)
   ```

2. `desktop/src/utils/updateChecker.ts` e
   `android/src/utils/updateChecker.ts`: atualizar a versão corrente codificada.
3. `android/android/app/build.gradle`: atualizar `versionName` e incrementar
   `versionCode` (inteiro sempre crescente, especialmente para o Play).
   Acrescentar changelogs para o novo código em
   `fastlane/metadata/android/pt-BR/changelogs/<versionCode>.txt` e
   `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
4. `RELEASE_NOTES.md`: substituir/adicionar as notas da versão nos dois
   idiomas; são o corpo da release e a origem do changelog APT.
5. `desktop/io.github.rbtswift.Pad2PSLauncher.metainfo.xml` e
   `io.github.rbtswift.Pad2PSLauncher.metainfo.xml`: adicionar entrada de
   release com versão e data válidas. A cópia usada no pacote desktop é a
   primeira; mantenha a cópia raiz consistente.
6. `store-assets/STORE_LISTING.md`: atualizar versão/notas da loja se o
   conteúdo continuar sendo usado.
7. `desktop/io.github.rbtswift.Pad2PSLauncher.yml` e
   `io.github.rbtswift.Pad2PSLauncher.yml`: atualizar URL e SHA-256 do tarball
   versionado quando o artefato estiver disponível. Planeje essa etapa junto
   da correção/ordenação da receita Flatpak; o workflow atual tenta gerar o
   bundle antes de publicar o tarball novo.
8. `snap/snapcraft.yaml` contém versão estática; a Action substitui-a pela
   versão da tag antes de empacotar. Atualize-a também para builds fora da
   Action ou para manter a árvore atualizada.
9. `PKGBUILD` e `.SRCINFO` contêm versão/hash do AUR no checkout, mas a Action
   os reescreve temporariamente usando a tag e o SHA-256 do tarball. Para
   publicação manual no AUR, atualize ambos e regenere `.SRCINFO` com
   `makepkg --printsrcinfo`; não publique hash antigo.
10. O cabeçalho de `README.md` ainda exibe `v1.0.0` no estado observado; corrija
    essa informação se mantiver o README como apresentação da versão atual.

Antes da tag, confirme que nenhum arquivo ainda aponta para uma versão antiga,
que `desktop/package.json` coincide com o sufixo da tag e que o
`versionCode` Android avançou. Revise o diff e faça commit/push dos metadados
junto com o código. Só então publique a tag e acompanhe os jobs e os assets
conforme a seção 3.

### Sincronizar os artefatos finalizados

Depois que **as releases dos dois projetos** (`RbtSwift/Pad2PS` e
`RbtSwift/Pad2PS-Launcher`) estiverem publicadas e com os assets finais,
execute o script externo:

```bash
/home/eusolravi/Projetos/finalizados/sync-releases.sh --check-only
/home/eusolravi/Projetos/finalizados/sync-releases.sh
```

O script requer `gh` autenticado, `jq`, `sha256sum`, `stat` e `diff`. A primeira
invocação é pré-checagem e não altera as pastas de releases. A segunda baixa
os assets de ambos os repositórios, verifica a contagem, tamanho e SHA-256
contra a API do GitHub e organiza cada release em
`Pad2PS/Versao atual/<tag>/` e `Pad2PS-Launcher/Versao atual/<tag>/`,
arquivando a versão anterior e atualizando `LEIA-ME.md` no diretório
`/home/eusolravi/Projetos/finalizados/`. O script interrompe a sincronização se
um destino já existente tiver conteúdo diferente; preserve e investigue esse
caso em vez de apagar ou sobrescrever arquivos.

## 7. Assinatura e limites que não devem ser presumidos

- Linux: os scripts de release não assinam AppImage, `.deb`, `.rpm`, tarball,
  bundle Flatpak, `Release` APT ou índices. A publicação Snap é uma integração
  com a loja, não uma assinatura configurada para os demais assets.
- Windows: Setup e Portable são gerados, mas não há assinatura Authenticode
  configurada. MSIX não é gerado.
- Android: Gradle suporta assinatura local condicional, mas a Action não
  injeta a chave; APK/AAB precisam ser verificados antes de publicação.
- APT: há arquivos `Packages`, `Packages.gz` e `Release`, mas não há
  `InRelease`/GPG e a fonte usa `trusted=yes`.
- Flathub e Play Console: metadados existem, mas submissão/revisão/publicação
  não são automatizadas por estes workflows.

Não transforme esses limites em promessas de segurança ou distribuição:
confirme sempre assinatura, hash, arquitetura, versão e instalação do artefato
final que será publicado.
