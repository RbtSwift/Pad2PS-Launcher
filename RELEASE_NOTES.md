## Português (Brasil)

- Busca capas verticais automaticamente no SteamGridDB para jogos sem capa, incluindo jogos Android que usam o ícone do app como fallback. Limpa tags técnicas, usa até três buscas em paralelo e mantém cache local persistente.
- Preserva capas personalizadas durante novas varreduras, sincronizações e resultados automáticos; mantém a busca e seleção manual de capas e mostra os créditos do SteamGridDB.
- Adiciona sincronização opcional da biblioteca Steam no desktop, com perfil, jogos instalados/não instalados, horas, atividade recente e conquistas. A Steam Web API Key fica criptografada no cofre do sistema e as consultas seguem diretamente para a API oficial.
- Adiciona integração opcional com RetroAchievements no desktop e Android: credenciais criptografadas localmente, perfil com pontuação e ranking, vinculação manual de GameID e progresso/lista de conquistas nos detalhes dos jogos.
- Inclui o banco SDL GameControllerDB nos apps desktop e Android, com consulta offline, identificação de modelos e atualização silenciosa do cache quando há conexão.
- Adiciona Discord Rich Presence somente no desktop, opcional e seguro quando o Discord não está aberto ou o CLIENT_ID ainda não foi configurado.

## English

- Automatically finds vertical SteamGridDB artwork for games without covers, including Android titles using their app icon as a fallback. Cleans technical tags, runs up to three lookups concurrently, and keeps a persistent local cache.
- Preserves custom artwork during scans, synchronization, and automatic lookups; keeps manual cover search and selection, and displays SteamGridDB attribution.
- Adds optional Steam library sync on desktop, including profile, installed/uninstalled games, playtime, recent activity, and achievements. The Steam Web API key is encrypted in the operating system vault, and requests go directly to the official API.
- Adds optional RetroAchievements integration on desktop and Android: locally encrypted credentials, profile points and rank, manual GameID linking, and achievement progress/list in game details.
- Bundles SDL GameControllerDB with the desktop and Android apps for offline lookup, controller model identification, and silent cache updates when internet is available.
- Adds Discord Rich Presence on desktop only, with an opt-in setting and safe behavior when Discord is closed or CLIENT_ID has not been configured.
