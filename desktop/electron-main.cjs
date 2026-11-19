const { app, BrowserWindow, dialog, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');

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
const AUTOSTART_DESKTOP = path.join(USER_HOME, '.config', 'autostart', 'pad2ps-launcher.desktop');
const DIST_DIR = path.join(__dirname, 'dist');

let httpServer = null;
let mainWindow = null;

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
        if (mainWindow) {
          mainWindow.close();
        } else {
          app.quit();
        }
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
            const { id, command } = body;
            if (command) {
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

  let allowQuit = false;
  mainWindow.on('close', (e) => {
    if (allowQuit) return;
    e.preventDefault();
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
        if (response === 0) {
          allowQuit = true;
          app.exit(0);
        }
      })
      .catch(() => {});
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
