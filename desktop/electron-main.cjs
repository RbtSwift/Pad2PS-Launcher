const { app, BrowserWindow, dialog, shell, safeStorage } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const DiscordRPC = require('discord-rpc');

// Diretórios de dados e cache
const IS_WIN = process.platform === 'win32';
const USER_HOME = os.homedir();
const DATA_DIR = IS_WIN
  ? path.join(process.env.APPDATA || path.join(USER_HOME, 'AppData', 'Roaming'), 'pad2ps-launcher')
  : path.join(USER_HOME, '.local', 'share', 'pad2ps-launcher');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {}

const LIBRARY_CACHE = path.join(DATA_DIR, 'biblioteca.json');
const STEAM_CREDENTIALS_FILE = path.join(DATA_DIR, 'steam-credentials.enc');
const RETRO_CREDENTIALS_FILE = path.join(DATA_DIR, 'retro-credentials.enc');
const DISCORD_PRESENCE_FILE = path.join(DATA_DIR, 'discord-presence.json');
const AUTOSTART_DESKTOP = path.join(USER_HOME, '.config', 'autostart', 'pad2ps-launcher.desktop');
const DIST_DIR = path.join(__dirname, 'dist');

let httpServer = null;
let mainWindow = null;
let allowQuit = false;
let quitDialogOpen = false;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID';
let discordRpc = null;
let discordRpcReady = false;
let discordActivity = { game: '', controller: '', startedAt: Date.now() };
function discordEnabled() { try { return JSON.parse(fs.readFileSync(DISCORD_PRESENCE_FILE, 'utf8')).enabled !== false; } catch { return true; } }
function setDiscordEnabled(enabled) { fs.writeFileSync(DISCORD_PRESENCE_FILE, JSON.stringify({ enabled: Boolean(enabled) })); if (enabled) updateDiscordPresence(); else { discordRpcReady = false; try { discordRpc?.destroy(); } catch {} discordRpc = null; } }
function updateDiscordPresence() {
  if (!discordEnabled() || !DISCORD_CLIENT_ID || DISCORD_CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID') return;
  try {
    if (!discordRpc) {
      DiscordRPC.register(DISCORD_CLIENT_ID); discordRpc = new DiscordRPC.Client({ transport: 'ipc' });
      discordRpc.on('ready', () => { discordRpcReady = true; updateDiscordPresence(); });
      discordRpc.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {
        discordRpcReady = false;
        try { discordRpc?.destroy(); } catch {}
        discordRpc = null;
        setTimeout(updateDiscordPresence, 15000).unref?.();
      });
      return;
    }
    if (!discordRpcReady) return;
    const playing = Boolean(discordActivity.game);
    discordRpc.setActivity({ details: playing ? `Jogando ${discordActivity.game}` : 'Navegando na biblioteca • Pad2PS Launcher', state: discordActivity.controller ? `Com controle ${discordActivity.controller}` : 'Pad2PS Launcher', startTimestamp: discordActivity.startedAt, largeImageKey: 'pad2ps', largeImageText: 'Pad2PS Launcher', instance: false });
  } catch { discordRpcReady = false; }
}
function setDiscordGame(game, controller = '') { discordActivity = { game: String(game || ''), controller: String(controller || ''), startedAt: Date.now() }; updateDiscordPresence(); }

function readSteamCredentials() {
  try {
    if (!fs.existsSync(STEAM_CREDENTIALS_FILE) || !safeStorage.isEncryptionAvailable()) return null;
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(STEAM_CREDENTIALS_FILE)));
  } catch { return null; }
}

function saveSteamCredentials(credentials) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre criptografado do sistema não está disponível.');
  if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') {
    throw new Error('Configure um cofre do sistema (Secret Service ou KWallet) para armazenar as credenciais com segurança.');
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(credentials));
  fs.writeFileSync(STEAM_CREDENTIALS_FILE, encrypted, { mode: 0o600 });
  try { fs.chmodSync(STEAM_CREDENTIALS_FILE, 0o600); } catch {}
}

function readRetroCredentials() {
  try { if (!fs.existsSync(RETRO_CREDENTIALS_FILE) || !safeStorage.isEncryptionAvailable()) return null; return JSON.parse(safeStorage.decryptString(fs.readFileSync(RETRO_CREDENTIALS_FILE))); } catch { return null; }
}
function saveRetroCredentials(credentials) {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('Configure um cofre seguro (Secret Service ou KWallet) para guardar as credenciais.');
  fs.writeFileSync(RETRO_CREDENTIALS_FILE, safeStorage.encryptString(JSON.stringify(credentials)), { mode: 0o600 });
  try { fs.chmodSync(RETRO_CREDENTIALS_FILE, 0o600); } catch {}
}
async function retroApi(endpoint, params) {
  const url = new URL(`https://retroachievements.org/API/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`RetroAchievements respondeu HTTP ${response.status}.`);
  const data = await response.json();
  if (data?.Error) throw new Error(String(data.Error));
  return data;
}
async function syncRetroAccount(usernameInput, keyInput) {
  const username = String(usernameInput || '').trim(); const key = String(keyInput || '').trim();
  if (!username || key.length < 10) throw new Error('Informe seu usuário e a Web API Key do RetroAchievements.');
  const profile = await retroApi('API_GetUserSummary.php', { u: username, y: key });
  if (!profile?.User) throw new Error('Não foi possível validar essa conta RetroAchievements.');
  const safeProfile = { username: profile.User, avatar: profile.UserPic || '', points: Number(profile.TotalPoints || 0), softcorePoints: Number(profile.TotalSoftcorePoints || 0), hardcorePoints: Number(profile.TotalTruePoints || 0), rank: Number(profile.Rank || 0) };
  saveRetroCredentials({ username: profile.User, key, profile: safeProfile });
  return safeProfile;
}

function parseSteamProfileInput(input) {
  const value = String(input || '').trim();
  const profileMatch = value.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileMatch) return { steamId: profileMatch[1] };
  const vanityMatch = value.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch) return { vanity: decodeURIComponent(vanityMatch[1]) };
  if (/^\d{17}$/.test(value)) return { steamId: value };
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(value)) return { vanity: value };
  throw new Error('Informe um SteamID64 de 17 dígitos ou uma URL válida do perfil Steam.');
}

async function steamApi(interfaceName, methodName, params) {
  const url = new URL(`https://api.steampowered.com/${interfaceName}/${methodName}/v1/`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status === 403 ? 'A Steam recusou a chave da Web API.' : `A Steam respondeu com erro HTTP ${response.status}.`);
  return response.json();
}

async function resolveSteamId(profileInput, apiKey) {
  const parsed = parseSteamProfileInput(profileInput);
  if (parsed.steamId) return parsed.steamId;
  const result = await steamApi('ISteamUser', 'ResolveVanityURL', { key: apiKey, vanityurl: parsed.vanity });
  const resolved = result?.response?.steamid;
  if (!result?.response?.success || !/^\d{17}$/.test(String(resolved || ''))) throw new Error('Não foi possível localizar esse perfil Steam. Confira o link ou apelido.');
  return String(resolved);
}

async function syncSteamAccount(apiKeyInput, profileInput) {
  const apiKey = String(apiKeyInput || '').trim();
  if (!/^[a-f0-9]{32}$/i.test(apiKey)) throw new Error('A Steam Web API Key deve conter 32 caracteres hexadecimais.');
  const steamId = await resolveSteamId(profileInput, apiKey);
  const [summaryResult, ownedResult, recentResult] = await Promise.all([
    steamApi('ISteamUser', 'GetPlayerSummaries', { key: apiKey, steamids: steamId }),
    steamApi('IPlayerService', 'GetOwnedGames', { key: apiKey, steamid: steamId, include_appinfo: true, include_played_free_games: true }),
    steamApi('IPlayerService', 'GetRecentlyPlayedGames', { key: apiKey, steamid: steamId, count: 100 }),
  ]);
  const profile = summaryResult?.response?.players?.[0];
  if (!profile) throw new Error('A Steam não encontrou o perfil informado.');
  const owned = ownedResult?.response;
  const privateProfile = !owned || !Array.isArray(owned.games);
  const games = privateProfile ? [] : owned.games.map((game) => ({
    appId: Number(game.appid),
    name: String(game.name || `Steam App ${game.appid}`),
    playtimeForever: Number(game.playtime_forever || 0),
    playtimeTwoWeeks: Number(game.playtime_2weeks || 0),
  }));
  const recentIds = (recentResult?.response?.games || []).map((game) => Number(game.appid));
  saveSteamCredentials({ apiKey, steamId, profile: { name: profile.personaname, avatar: profile.avatarfull, profileUrl: profile.profileurl } });
  return { steamId, profile: { name: profile.personaname, avatar: profile.avatarfull, profileUrl: profile.profileurl }, privateProfile, games, recentIds };
}

function requestQuit() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  else app.quit();
}

// ============================================================================
// MIME TYPES PARA O SERVIDOR DE ARQUIVOS ESTÁTICOS
// ============================================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

// ============================================================================
// SISTEMAS DE ROMS PARA EMULADORES
// ============================================================================
const ROM_SYSTEMS = {
  PS2: {
    folders: ['ps2', 'pcsx2', 'playstation 2', 'playstation2'],
    exts: ['.iso', '.chd', '.gz', '.cso'],
    cmd: 'pcsx2-qt -fullscreen "{rom}"',
    label: 'PCSX2 · PS2',
  },
  PS1: {
    folders: ['psx', 'ps1', 'duckstation', 'playstation', 'playstation 1'],
    exts: ['.chd', '.cue', '.pbp', '.m3u'],
    cmd: 'duckstation-qt -fullscreen "{rom}"',
    label: 'DuckStation · PS1',
  },
  PSP: {
    folders: ['psp', 'ppsspp'],
    exts: ['.iso', '.cso', '.chd'],
    cmd: 'PPSSPPSDL --fullscreen "{rom}"',
    label: 'PPSSPP · PSP',
  },
  Switch: {
    folders: ['switch', 'yuzu', 'ryujinx', 'eden', 'sudachi'],
    exts: ['.nsp', '.xci'],
    cmd: 'eden -f -g "{rom}"',
    label: 'Switch',
  },
  N64: {
    folders: ['n64', 'nintendo 64', 'nintendo64'],
    exts: ['.z64', '.n64', '.v64'],
    cmd: 'mupen64plus --fullscreen "{rom}"',
    label: 'Nintendo 64',
  },
  GameCube: {
    folders: ['gc', 'gamecube', 'ngc'],
    exts: ['.rvz', '.iso', '.gcz'],
    cmd: 'dolphin-emu -b -e "{rom}"',
    label: 'Dolphin · GameCube',
  },
  Wii: {
    folders: ['wii'],
    exts: ['.rvz', '.wbfs', '.iso'],
    cmd: 'dolphin-emu -b -e "{rom}"',
    label: 'Dolphin · Wii',
  },
  WiiU: {
    folders: ['wiiu', 'cemu'],
    exts: ['.wua', '.wux', '.rpx'],
    cmd: 'cemu -f -g "{rom}"',
    label: 'Cemu · Wii U',
  },
  Dreamcast: {
    folders: ['dreamcast', 'dc'],
    exts: ['.chd', '.cdi', '.gdi'],
    cmd: 'flycast "{rom}"',
    label: 'Dreamcast',
  },
};

// ============================================================================
// SCANNER NATIVO DE JOGOS (STEAM, HEROIC, LUTRIS, ROMS)
// ============================================================================
function getMountedDrives() {
  const drives = [USER_HOME];
  if (IS_WIN) {
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const char of letters) {
      const root = `${char}:\\`;
      try {
        if (fs.existsSync(root)) drives.push(root);
      } catch {}
    }
  } else {
    const user = process.env.USER || '';
    const candidates = [
      `/media/${user}`,
      '/mnt',
      `/run/media/${user}`,
    ];
    for (const base of candidates) {
      try {
        if (fs.existsSync(base)) {
          const entries = fs.readdirSync(base, { withFileTypes: true });
          for (const ent of entries) {
            if (ent.isDirectory()) drives.push(path.join(base, ent.name));
          }
        }
      } catch {}
    }
  }
  return drives;
}

// Parser simples para VDF da Steam
function parseVdf(content) {
  const lines = content.split('\n');
  const libraryFolders = [];
  for (const line of lines) {
    const match = line.match(/"path"\s+"([^"]+)"/i);
    if (match && match[1]) {
      libraryFolders.push(match[1].replace(/\\\\/g, '/'));
    }
  }
  return libraryFolders;
}

function scanSteamGames() {
  const games = [];
  const libraryPaths = new Set();

  if (IS_WIN) {
    const defaultPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps',
      'C:\\Program Files\\Steam\\steamapps',
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) libraryPaths.add(p);
      const vdf = path.join(p, 'libraryfolders.vdf');
      if (fs.existsSync(vdf)) {
        try {
          const dirs = parseVdf(fs.readFileSync(vdf, 'utf-8'));
          dirs.forEach((d) => {
            const sp = path.join(d, 'steamapps');
            if (fs.existsSync(sp)) libraryPaths.add(sp);
          });
        } catch {}
      }
    }
  } else {
    const vdfCandidates = [
      path.join(USER_HOME, '.local/share/Steam/steamapps/libraryfolders.vdf'),
      path.join(USER_HOME, '.steam/steam/steamapps/libraryfolders.vdf'),
      path.join(USER_HOME, '.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/libraryfolders.vdf'),
    ];
    for (const vdfFile of vdfCandidates) {
      if (fs.existsSync(vdfFile)) {
        libraryPaths.add(path.dirname(vdfFile));
        try {
          const dirs = parseVdf(fs.readFileSync(vdfFile, 'utf-8'));
          dirs.forEach((d) => {
            const sp = path.join(d, 'steamapps');
            if (fs.existsSync(sp)) libraryPaths.add(sp);
          });
        } catch {}
      }
    }
  }

  // Verificar bibliotecas nos discos montados
  const drives = getMountedDrives();
  for (const drive of drives) {
    for (const candidate of ['Steam/steamapps', 'SteamLibrary/steamapps']) {
      const full = path.join(drive, candidate);
      if (fs.existsSync(full)) libraryPaths.add(full);
    }
  }

  const seenIds = new Set();
  for (const steamapps of libraryPaths) {
    try {
      const files = fs.readdirSync(steamapps);
      for (const file of files) {
        if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;
        const appid = file.replace('appmanifest_', '').replace('.acf', '');
        if (seenIds.has(appid) || appid === '228980') continue;

        try {
          const raw = fs.readFileSync(path.join(steamapps, file), 'utf-8');
          let name = null;
          for (const line of raw.split('\n')) {
            if (line.includes('"name"')) {
              const parts = line.split('"');
              if (parts.length >= 4) {
                name = parts[3];
                break;
              }
            }
          }

          if (name && !name.includes('Proton') && !name.includes('Steam Linux Runtime')) {
            seenIds.add(appid);
            games.push({
              id: `steam-${appid}`,
              title: name,
              platform: 'Steam',
              platformLabel: 'Steam',
              coverUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900_2x.jpg`,
              steamAppId: Number(appid),
              steamInstalled: true,
              steamRemote: false,
              steamHeroUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/library_hero.jpg`,
              steamLogoUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/logo.png`,
              command: `steam://rungameid/${appid}`,
              hoursPlayed: 0,
              favorite: false,
            });
          }
        } catch {}
      }
    } catch {}
  }

  return games;
}

function scanHeroicGames() {
  const games = [];
  const heroicConfigs = IS_WIN
    ? [path.join(process.env.APPDATA || path.join(USER_HOME, 'AppData', 'Roaming'), 'heroic')]
    : [
        path.join(USER_HOME, '.config', 'heroic'),
        path.join(USER_HOME, '.var/app/com.heroicgameslauncher.hgl/config/heroic'),
      ];

  for (const cfg of heroicConfigs) {
    // Epic Games
    const epicInstalled = path.join(cfg, 'legendaryConfig', 'legendary', 'installed.json');
    if (fs.existsSync(epicInstalled)) {
      try {
        const data = JSON.parse(fs.readFileSync(epicInstalled, 'utf-8'));
        for (const [appName, info] of Object.entries(data)) {
          const title = (info && info.title) || appName;
          games.push({
            id: `heroic-epic-${appName}`,
            title,
            platform: 'Heroic',
            platformLabel: 'Heroic · Epic',
            coverUrl: '',
            command: `heroic://launch/legendary/${appName}`,
            hoursPlayed: 0,
            favorite: false,
          });
        }
      } catch {}
    }

    // GOG
    const gogInstalled = path.join(cfg, 'gog_store', 'installed.json');
    if (fs.existsSync(gogInstalled)) {
      try {
        const data = JSON.parse(fs.readFileSync(gogInstalled, 'utf-8'));
        const list = Array.isArray(data.installed) ? data.installed : [];
        for (const info of list) {
          const appName = info.appName;
          const title = info.title || appName;
          if (appName) {
            games.push({
              id: `heroic-gog-${appName}`,
              title,
              platform: 'GOG',
              platformLabel: 'Heroic · GOG',
              coverUrl: '',
              command: `heroic://launch/gog/${appName}`,
              hoursPlayed: 0,
              favorite: false,
            });
          }
        }
      } catch {}
    }
  }

  return games;
}

function scanLutrisGames() {
  const games = [];
  if (IS_WIN) return games;

  const dbCandidates = [
    path.join(USER_HOME, '.local/share/lutris/pga.db'),
    path.join(USER_HOME, '.var/app/net.lutris.Lutris/data/lutris/pga.db'),
  ];

  for (const dbPath of dbCandidates) {
    if (!fs.existsSync(dbPath)) continue;
    try {
      const { execFileSync } = require('child_process');
      const out = execFileSync('sqlite3', [dbPath, 'SELECT id, name, slug, runner FROM games WHERE installed = 1;'], {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of out.split('\n')) {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const gid = parts[0].trim();
          const name = parts[1].trim();
          const runner = parts[3].trim();
          if (gid && name) {
            games.push({
              id: `lutris-${gid}`,
              title: name,
              platform: 'Lutris',
              platformLabel: `Lutris · ${runner || 'PC'}`,
              coverUrl: '',
              command: `lutris lutris:rungameid/${gid}`,
              hoursPlayed: 0,
              favorite: false,
            });
          }
        }
      }
    } catch {}
  }

  return games;
}

function scanRomsAcrossDrives() {
  const games = [];
  const drives = getMountedDrives();
  const romRoots = [
    'ROMs',
    'Roms',
    'roms',
    'Emuladores',
    'RetroDECK/retrodeck/roms',
    'retrodeck/roms',
    'Emulation/roms',
  ];

  for (const drive of drives) {
    for (const rel of romRoots) {
      const romBase = path.join(drive, rel);
      if (!fs.existsSync(romBase)) continue;
      try {
        const sysFolders = fs.readdirSync(romBase, { withFileTypes: true });
        for (const sysEnt of sysFolders) {
          if (!sysEnt.isDirectory()) continue;
          const folderLower = sysEnt.name.toLowerCase();
          let matchedSys = null;
          for (const [sysKey, spec] of Object.entries(ROM_SYSTEMS)) {
            if (spec.folders.includes(folderLower)) {
              matchedSys = sysKey;
              break;
            }
          }
          if (!matchedSys) continue;

          const spec = ROM_SYSTEMS[matchedSys];
          const sysDirPath = path.join(romBase, sysEnt.name);

          // Varredura recursiva da pasta do sistema
          const walkDir = (dir) => {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const e of entries) {
                const fullPath = path.join(dir, e.name);
                if (e.isDirectory()) {
                  walkDir(fullPath);
                } else if (e.isFile()) {
                  const ext = path.extname(e.name).toLowerCase();
                  if (spec.exts.includes(ext)) {
                    const rawStem = path.basename(e.name, ext);
                    const cleanTitle = rawStem.split('(')[0].trim();
                    games.push({
                      id: `emu-${matchedSys.toLowerCase()}-${rawStem}`,
                      title: cleanTitle,
                      platform: 'Emulador',
                      consoleSystem: matchedSys,
                      platformLabel: spec.label,
                      coverUrl: '',
                      command: spec.cmd.replace('{rom}', fullPath),
                      hoursPlayed: 0,
                      favorite: false,
                    });
                  }
                }
              }
            } catch {}
          };

          walkDir(sysDirPath);
        }
      } catch {}
    }
  }

  return games;
}

function buildFullLibrary() {
  const existingById = new Map();
  if (fs.existsSync(LIBRARY_CACHE)) {
    try {
      const oldList = JSON.parse(fs.readFileSync(LIBRARY_CACHE, 'utf-8'));
      if (Array.isArray(oldList)) {
        for (const item of oldList) {
          if (item && item.id) existingById.set(item.id, item);
        }
      }
    } catch {}
  }

  const detected = [
    ...scanSteamGames(),
    ...scanHeroicGames(),
    ...scanLutrisGames(),
    ...scanRomsAcrossDrives(),
  ];

  const merged = [];
  const seen = new Set();

  for (const game of detected) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    if (existingById.has(game.id)) {
      const old = existingById.get(game.id);
      game.coverUrl = old.coverUrl || game.coverUrl;
      game.favorite = Boolean(old.favorite);
      game.hoursPlayed = old.hoursPlayed || 0;
      game.lastPlayed = old.lastPlayed;
    }
    merged.push(game);
  }

  // Preserva jogos que estavam no cache
  for (const [gid, old] of existingById.entries()) {
    if (!seen.has(gid)) {
      merged.push(old);
    }
  }

  try {
    fs.writeFileSync(LIBRARY_CACHE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {}

  return merged;
}

// ============================================================================
// BATERIA DE DISPOSITIVOS E GAMEPADS
// ============================================================================
function getConnectedDevicesBattery() {
  const devices = [];
  const seenNames = new Set();

  if (!IS_WIN) {
    // 1. /sys/class/power_supply
    const psRoot = '/sys/class/power_supply';
    try {
      if (fs.existsSync(psRoot)) {
        const entries = fs.readdirSync(psRoot);
        for (const name of entries) {
          try {
            const entryPath = path.join(psRoot, name);
            const capFile = path.join(entryPath, 'capacity');
            if (!fs.existsSync(capFile)) continue;

            const nameRaw = name.toLowerCase();
            const scopeFile = path.join(entryPath, 'scope');
            const scope = fs.existsSync(scopeFile)
              ? fs.readFileSync(scopeFile, 'utf-8').trim().toLowerCase()
              : '';

            if (scope === 'system' || /^(bat|ac|acad|usb)/.test(nameRaw)) {
              if (
                !nameRaw.includes('sony_controller') &&
                !nameRaw.includes('ps-controller') &&
                !nameRaw.includes('xbox') &&
                !nameRaw.includes('nintendo')
              ) {
                continue;
              }
            }

            const capacity = parseInt(fs.readFileSync(capFile, 'utf-8').trim(), 10);
            if (Number.isNaN(capacity)) continue;

            const statusFile = path.join(entryPath, 'status');
            const status = fs.existsSync(statusFile)
              ? fs.readFileSync(statusFile, 'utf-8').trim().toLowerCase()
              : '';

            const modelFile = path.join(entryPath, 'model_name');
            const model = fs.existsSync(modelFile)
              ? fs.readFileSync(modelFile, 'utf-8').trim()
              : name;

            const isHeadset = /headset|headphone|audio|buds|airpods|wh-|wf-|jbl|hyperx|logitech g|razer|corsair|steelseries/i.test(
              `${model} ${nameRaw}`
            );
            const devType = isHeadset ? 'headset' : 'gamepad';

            let cleanName = model.replace(/_/g, ' ').trim();
            if (nameRaw.includes('sony_controller') || nameRaw.includes('ps-controller')) {
              cleanName = 'Controle PlayStation';
            } else if (nameRaw.includes('xbox') || nameRaw.includes('xpad')) {
              cleanName = 'Controle Xbox / PC';
            } else if (nameRaw.includes('nintendo')) {
              cleanName = 'Controle Nintendo';
            }

            const key = `${devType}:${cleanName.toLowerCase()}`;
            if (!seenNames.has(key)) {
              seenNames.add(key);
              devices.push({
                name: cleanName,
                type: devType,
                percentage: Math.max(0, Math.min(100, capacity)),
                charging: status === 'charging',
              });
            }
          } catch {}
        }
      }
    } catch {}

    // 2. upower -d
    try {
      const { execFileSync } = require('child_process');
      const out = execFileSync('upower', ['-d'], {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const blocks = out.split('Device: ');
      for (let i = 1; i < blocks.length; i++) {
        const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
        const header = (lines[0] || '').toLowerCase();
        if (header.includes('line_power') || header.includes('battery_bat') || header.includes('displaydevice')) {
          continue;
        }

        let model = '';
        let nativePath = '';
        let percentage = null;
        let charging = false;
        let isHeadset = header.includes('headset') || header.includes('headphones') || header.includes('audio');
        let isGamepad = header.includes('gaming') || header.includes('joystick') || header.includes('controller');

        for (const line of lines.slice(1)) {
          if (line.startsWith('model:')) model = line.slice(6).trim();
          else if (line.startsWith('native-path:')) nativePath = line.slice(12).trim().toLowerCase();
          else if (line.startsWith('percentage:')) {
            const val = parseInt(line.slice(11).trim().replace('%', ''), 10);
            if (!Number.isNaN(val)) percentage = val;
          } else if (line.startsWith('state:')) {
            const st = line.slice(6).toLowerCase();
            charging = st.includes('charging') && !st.includes('discharging');
          }
        }

        if (percentage === null) continue;
        const combined = `${header} ${model} ${nativePath}`.toLowerCase();
        if (/headset|headphone|earbud|buds|airpods|wh-|wf-|jbl|qcy|edifier|anker|soundcore|hyperx|arctis|cloud/i.test(combined)) {
          isHeadset = true;
        } else if (/gamepad|joystick|controller|dualsense|dualshock|xbox|gamesir|8bitdo|pro controller|joy-con/i.test(combined)) {
          isGamepad = true;
        } else if (nativePath.includes('bluez') && !/mouse|keyboard|teclado|trackpad/i.test(combined)) {
          isHeadset = true;
        }

        if (!isHeadset && !isGamepad) continue;

        const devType = isHeadset ? 'headset' : 'gamepad';
        const cleanName = model || (devType === 'headset' ? 'Headset Bluetooth' : 'Controle Bluetooth');
        const key = `${devType}:${cleanName.toLowerCase()}`;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          devices.push({
            name: cleanName,
            type: devType,
            percentage: Math.max(0, Math.min(100, percentage)),
            charging,
          });
        }
      }
    } catch {}
  }

  return devices;
}

// ============================================================================
// AUTOSTART
// ============================================================================
function getAutostartEnabled() {
  if (IS_WIN) {
    const startupDir = path.join(
      USER_HOME,
      'AppData',
      'Roaming',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    );
    return fs.existsSync(path.join(startupDir, 'Pad2PS-Launcher.lnk'));
  }
  return fs.existsSync(AUTOSTART_DESKTOP);
}

function setAutostartEnabled(enabled) {
  if (IS_WIN) {
    // No Windows, atalho na pasta Startup
    return Boolean(enabled);
  }

  if (enabled) {
    try {
      fs.mkdirSync(path.dirname(AUTOSTART_DESKTOP), { recursive: true });
      let execCmd = process.execPath;
      if (process.env.APPIMAGE) {
        execCmd = `"${process.env.APPIMAGE}"`;
      } else if (process.env.FLATPAK_ID) {
        execCmd = `flatpak run ${process.env.FLATPAK_ID}`;
      } else if (fs.existsSync('/usr/bin/pad2ps-launcher')) {
        execCmd = '"/usr/bin/pad2ps-launcher"';
      }

      const desktopEntry = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Pad2PS Launcher',
        'Comment=Console-style Game Launcher',
        `Exec=${execCmd}`,
        'Icon=pad2ps-launcher',
        'Terminal=false',
        'Categories=Game;',
        'X-GNOME-Autostart-enabled=true',
        'X-GNOME-Autostart-Delay=2',
        '',
      ].join('\n');

      fs.writeFileSync(AUTOSTART_DESKTOP, desktopEntry, 'utf-8');
      return true;
    } catch {
      return false;
    }
  } else {
    try {
      if (fs.existsSync(AUTOSTART_DESKTOP)) fs.unlinkSync(AUTOSTART_DESKTOP);
      return false;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// EXECUÇÃO DE JOGOS
// ============================================================================
function runGameProcess(gameId, command) {
  const startTime = Date.now();

  try {
    let proc = null;
    if (command.includes('://') && !command.startsWith('xdg-open')) {
      if (IS_WIN) {
        proc = spawn('cmd.exe', ['/c', 'start', '', command], {
          detached: true,
          stdio: 'ignore',
        });
      } else {
        proc = spawn('xdg-open', [command], {
          detached: true,
          stdio: 'ignore',
        });
      }
    } else {
      if (IS_WIN) {
        proc = spawn(command, {
          shell: true,
          detached: true,
          stdio: 'ignore',
        });
      } else {
        proc = spawn('/bin/sh', ['-c', command], {
          detached: true,
          stdio: 'ignore',
        });
      }
    }

    if (proc) {
      proc.on('close', () => {
        setDiscordGame('');
        const elapsedHours = Math.round(((Date.now() - startTime) / 3600000) * 100) / 100;
        if (elapsedHours > 0.01 && fs.existsSync(LIBRARY_CACHE)) {
          try {
            const games = JSON.parse(fs.readFileSync(LIBRARY_CACHE, 'utf-8'));
            for (const g of games) {
              if (g.id === gameId) {
                g.hoursPlayed = Math.round(((g.hoursPlayed || 0) + elapsedHours) * 10) / 10;
                g.lastPlayed = 'Agora';
              }
            }
            fs.writeFileSync(LIBRARY_CACHE, JSON.stringify(games, null, 2), 'utf-8');
          } catch {}
        }
      });
    }
  } catch (err) {
    console.error(`[Pad2PS] Erro ao iniciar '${command}':`, err);
  }
}

// ============================================================================
// SERVIDOR HTTP NATIVO NODE.JS
// ============================================================================
function startHttpServer() {
  return new Promise((resolve, reject) => {
    httpServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = url.pathname;

      const sendJson = (data, status = 200) => {
        const body = Buffer.from(JSON.stringify(data));
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': body.length,
          'Access-Control-Allow-Origin': '*',
        });
        res.end(body);
      };

      const readJsonBody = () => new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
          if (raw.length > 64 * 1024) reject(new Error('Corpo da solicitação muito grande.'));
        });
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); }
          catch { reject(new Error('JSON inválido.')); }
        });
        req.on('error', reject);
      });

      // Steam Web API: credentials stay encrypted locally and requests go directly to Valve.
      if (req.method === 'GET' && pathname === '/api/steam/config') {
        const credentials = readSteamCredentials();
        return sendJson({ configured: Boolean(credentials?.apiKey && credentials?.steamId), steamId: credentials?.steamId || '', profile: credentials?.profile || null });
      }
      if (req.method === 'GET' && pathname === '/api/retro/config') {
        const credentials = readRetroCredentials();
        return sendJson({ configured: Boolean(credentials?.username), username: credentials?.username || '', profile: credentials?.profile || null });
      }
      if (req.method === 'POST' && pathname === '/api/retro/sync') {
        void readJsonBody().then((body) => syncRetroAccount(body.username, body.key)).then((data) => sendJson(data)).catch((error) => sendJson({ error: error.message || 'Não foi possível conectar ao RetroAchievements.' }, 400));
        return;
      }
      if (req.method === 'POST' && pathname === '/api/retro/disconnect') {
        try { if (fs.existsSync(RETRO_CREDENTIALS_FILE)) fs.unlinkSync(RETRO_CREDENTIALS_FILE); } catch {}
        return sendJson({ ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/retro/game-progress') {
        const credentials = readRetroCredentials(); const gameId = Number(url.searchParams.get('gameId'));
        if (!credentials?.username || !Number.isInteger(gameId) || gameId <= 0) return sendJson({ available: false, reason: 'Conta não conectada ou GameID inválido.' }, 400);
        void retroApi('API_GetGameInfoAndUserProgress.php', { u: credentials.username, y: credentials.key, g: gameId }).then((data) => sendJson({ available: true, data })).catch((error) => sendJson({ available: false, reason: error.message || 'Progresso indisponível.' }));
        return;
      }
      if (req.method === 'GET' && pathname === '/api/discord/config') return sendJson({ enabled: discordEnabled(), configured: DISCORD_CLIENT_ID !== 'YOUR_DISCORD_CLIENT_ID' });
      if (req.method === 'POST' && pathname === '/api/discord/config') {
        void readJsonBody().then((body) => { setDiscordEnabled(body.enabled !== false); return sendJson({ enabled: discordEnabled(), configured: DISCORD_CLIENT_ID !== 'YOUR_DISCORD_CLIENT_ID' }); }).catch(() => sendJson({ error: 'Não foi possível salvar a preferência.' }, 400));
        return;
      }
      if (req.method === 'POST' && pathname === '/api/discord/menu') { setDiscordGame(''); return sendJson({ ok: true }); }
      if (req.method === 'POST' && pathname === '/api/steam/sync') {
        void readJsonBody().then((body) => syncSteamAccount(body.apiKey, body.profileInput)).then((data) => sendJson(data)).catch((error) => sendJson({ error: error.message || 'Falha ao sincronizar com a Steam.' }, 400));
        return;
      }
      if (req.method === 'POST' && pathname === '/api/steam/disconnect') {
        try { if (fs.existsSync(STEAM_CREDENTIALS_FILE)) fs.unlinkSync(STEAM_CREDENTIALS_FILE); } catch {}
        return sendJson({ ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/steam/achievements') {
        const credentials = readSteamCredentials();
        const appId = Number(url.searchParams.get('appId'));
        if (!credentials?.apiKey || !credentials?.steamId || !Number.isInteger(appId) || appId <= 0) return sendJson({ available: false, reason: 'Steam não conectada ou jogo inválido.' }, 400);
        void steamApi('ISteamUserStats', 'GetPlayerAchievements', { key: credentials.apiKey, steamid: credentials.steamId, appid: appId }).then((data) => {
          const list = data?.playerstats?.achievements;
          if (!data?.playerstats?.success || !Array.isArray(list) || !list.length) return sendJson({ available: false, reason: 'Conquistas indisponíveis ou perfil privado.' });
          const unlocked = list.filter((item) => Number(item.achieved) === 1).length;
          return sendJson({ available: true, unlocked, total: list.length, percentage: Math.round((unlocked / list.length) * 100) });
        }).catch(() => sendJson({ available: false, reason: 'Conquistas indisponíveis para este jogo ou perfil.' }));
        return;
      }

      // API: POST /api/pick-game
      if (req.method === "POST" && pathname === "/api/pick-game") {
        dialog.showOpenDialog({
          title: "Selecionar Executável, ROM ou Atalho do Jogo",
          properties: ["openFile"],
          filters: [
            { name: "Jogos, Executáveis e ROMs", extensions: ["exe", "sh", "AppImage", "desktop", "iso", "bin", "chd", "cso", "nsp", "xci", "z64", "n64", "gba", "sfc", "smc", "nds", "3ds", "pkg", "rpcs3"] },
            { name: "Todos os Arquivos", extensions: ["*"] }
          ]
        }).then((resDlg) => {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          if (resDlg.canceled || !resDlg.filePaths[0]) return res.end(JSON.stringify({ canceled: true }));
          const full = resDlg.filePaths[0];
          const base = path.basename(full, path.extname(full)).replace(/[_-]+/g, " ").trim();
          return res.end(JSON.stringify({ canceled: false, path: full, title: base }));
        }).catch(() => {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ canceled: true }));
        });
        return;
      }

      // API: POST /api/quit
      if (req.method === 'POST' && pathname === '/api/quit') {
        requestQuit();
        return sendJson({ ok: true });
      }
      // API: GET /api/games
      if (req.method === 'GET' && pathname === '/api/games') {
        const games = buildFullLibrary();
        return sendJson({ games });
      }

      // API: GET /api/autostart
      if (req.method === 'GET' && pathname === '/api/autostart') {
        return sendJson({ enabled: getAutostartEnabled() });
      }

      // API: GET /api/devices
      if (req.method === 'GET' && pathname === '/api/devices') {
        return sendJson({ devices: getConnectedDevicesBattery() });
      }

      // API: POST /api/launch
      if (req.method === 'POST' && pathname === '/api/launch') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          try {
            const body = JSON.parse(raw || '{}');
            const { id, command, title, controller } = body;
            if (command) {
              setDiscordGame(title || 'Jogo', controller || '');
              runGameProcess(id, command);
              return sendJson({ ok: true });
            }
            return sendJson({ ok: false, error: 'Comando vazio' }, 400);
          } catch (err) {
            return sendJson({ ok: false, error: String(err) }, 400);
          }
        });
        return;
      }

      // API: POST /api/autostart
      if (req.method === 'POST' && pathname === '/api/autostart') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          try {
            const body = JSON.parse(raw || '{}');
            const state = setAutostartEnabled(Boolean(body.enabled));
            return sendJson({ ok: true, enabled: state });
          } catch (err) {
            return sendJson({ ok: false, error: String(err) }, 400);
          }
        });
        return;
      }

      // API: POST /api/save
      if (req.method === 'POST' && pathname === '/api/save') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          try {
            const body = JSON.parse(raw || '{}');
            if (Array.isArray(body.games)) {
              fs.writeFileSync(LIBRARY_CACHE, JSON.stringify(body.games, null, 2), 'utf-8');
            }
            return sendJson({ ok: true });
          } catch (err) {
            return sendJson({ ok: false, error: String(err) }, 400);
          }
        });
        return;
      }

      // SERVIÇO DE ARQUIVOS ESTÁTICOS DO DIST
      let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
      if (safePath === '/' || safePath === '\\') {
        safePath = '/index.html';
      }
      let filePath = path.join(DIST_DIR, safePath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Arquivo não encontrado');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": data.length,
          "Cache-Control": ext === ".html" ? "no-cache" : "max-age=86400",
        });
        res.end(data);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err));
      }
    });

    httpServer.listen(0, '127.0.0.1', () => {
      const port = httpServer.address().port;
      resolve(port);
    });

    httpServer.on('error', reject);
  });
}

// ============================================================================
// CICLO DE VIDA DO ELECTRON
// ============================================================================
async function createWindow() {
  updateDiscordPresence();
  const port = await startHttpServer();
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    title: 'Pad2PS Launcher',
    fullscreen: true,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#0B0B0F',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      shell.openExternal(url);
    } catch {}
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  allowQuit = false;
  quitDialogOpen = false;
  mainWindow.on('close', (e) => {
    if (allowQuit) return;
    e.preventDefault();
    if (quitDialogOpen) return;
    quitDialogOpen = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
    dialog
      .showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Sim', 'Não'],
        defaultId: 1, // foco padrão em "Não"
        cancelId: 1,
        title: 'Pad2PS Launcher',
        message: 'Sair do Pad2PS Launcher?',
      })
      .then(({ response }) => {
        quitDialogOpen = false;
        if (response === 0) {
          allowQuit = true;
          app.exit(0);
        }
      })
      .catch(() => { quitDialogOpen = false; });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (app && typeof app.whenReady === 'function') {
  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (httpServer) {
      httpServer.close();
    }
    app.quit();
  });
}

module.exports = {
  startHttpServer,
  buildFullLibrary,
  getConnectedDevicesBattery,
  getAutostartEnabled,
  setAutostartEnabled,
};
