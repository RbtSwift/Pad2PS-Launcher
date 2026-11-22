# Lojas, distribuição e pendências do Pad2PS-Launcher

**Escopo e data da verificação:** repositório `RbtSwift/Pad2PS-Launcher`, versão de código/release `1.0.19`, consulta em 21/11/2026. A presença de arquivos neste repositório comprova preparação local, não aprovação ou listagem ativa em lojas externas.

## Estado resumido dos canais

- **Google Play / Fastlane:** Metadados localizados (`fastlane/metadata/android/{pt-BR,en-US}/`, changelog `20.txt`) e artes em `store-assets/` preparados; sem `Fastfile` ou upload automatizado. Pendente confirmar ficha no Play Console, screenshots reais e upload manual do AAB assinado.
- **Flathub:** Manifesto fonte (`io.github.rbtswift.Pad2PSLauncher.yml`) e `desktop/generated-sources.json` preparados; submissão e revisão no Flathub são manuais.
- **Snap Store:** Receita `snap/snapcraft.yaml` e workflow `.github/workflows/publish-linux-stores.yml` configurados com `SNAPCRAFT_STORE_CREDENTIALS`. Pendente confirmar se o segredo está configurado e ativo no GitHub.
- **AUR (`pad2ps-launcher-bin`):** Pacote binário gerado dinamicamente a partir do tarball Linux no `publish-linux-stores.yml` via `AUR_SSH_PRIVATE_KEY`. Pendente confirmar conta/chave SSH no AUR e primeiro envio bem-sucedido.
- **Repositório APT (GitHub Pages):** `release.yml` gera índices APT (`Packages`, `Release`) e publica em `gh-pages` (`https://rbtswift.github.io/Pad2PS-Launcher/apt`). Pendente confirmar que `gh-pages` está ativo nas configurações do repositório.
- **Discord (Webhook):** `.github/workflows/discord-changelog.yml` publica embed ao criar release se `DISCORD_WEBHOOK_URL` estiver definido no GitHub.

## Segredos e variáveis esperados nos workflows

Não há como auditar os valores reais configurados no GitHub Actions apenas pelos arquivos locais, mas os workflows exigem:

- **Em `release.yml`:** `STEAMGRIDDB_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` (opcionais; fallback vazio), `ANDROID_SIGNING_ENABLED` (`'true'` para habilitar build Android) e `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- **Em `publish-linux-stores.yml`:** `SNAPCRAFT_STORE_CREDENTIALS` e `AUR_SSH_PRIVATE_KEY`.
- **Em `discord-changelog.yml`:** `DISCORD_WEBHOOK_URL`.

## Checklist prático antes da próxima release

1. Sincronizar versão e `versionCode` nos manifests e `updateChecker.ts` (Desktop e Android).
2. Atualizar `RELEASE_NOTES.md`, changelogs Fastlane e `.metainfo.xml`.
3. Validar build local Desktop (`npm run build`) e Android (`npx cap sync android`).
4. Gerar a tag `vMAJOR.MINOR.PATCH`, acompanhar `release.yml` e `publish-linux-stores.yml` e rodar `/home/eusolravi/Projetos/finalizados/sync-releases.sh`.
