const { app, BrowserWindow, dialog, shell, safeStorage } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const DiscordRPC = require('discord-rpc');
const { zipSync, unzipSync } = require('fflate');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
let packagedServiceKeys = {};
try { packagedServiceKeys = require('./steamgriddb-secret.cjs'); } catch {}
const STEAMGRIDDB_API_KEY = process.env.STEAMGRIDDB_API_KEY || packagedServiceKeys.STEAMGRIDDB_API_KEY || '';
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || packagedServiceKeys.IGDB_CLIENT_ID || '';
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || packagedServiceKeys.IGDB_CLIENT_SECRET || '';

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
const IGDB_CREDENTIALS_FILE = path.join(DATA_DIR, 'igdb-credentials.enc');
const IGDB_METADATA_CACHE_FILE = path.join(DATA_DIR, 'igdb-metadata-cache.json');
const GAME_TECH_CACHE_FILE = path.join(DATA_DIR, 'game-tech-cache.json');
const DISCORD_PRESENCE_FILE = path.join(DATA_DIR, 'discord-presence.json');
const SAVE_SYNC_CREDENTIALS_FILE = path.join(DATA_DIR, 'save-sync.enc');
const AUTOSTART_DESKTOP = path.join(USER_HOME, '.config', 'autostart', 'pad2ps-launcher.desktop');
const DIST_DIR = path.join(__dirname, 'dist');

let httpServer = null;
let mainWindow = null;
let allowQuit = false;
let quitDialogOpen = false;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1573131919728582806';
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
    discordRpc.setActivity({ details: playing ? `Jogando ${discordActivity.game}` : 'Navegando na biblioteca • Pad2PS Launcher', state: discordActivity.controller ? `Com controle ${discordActivity.controller}` : 'Pad2PS Launcher', startTimestamp: discordActivity.startedAt, largeImageKey: 'logo', largeImageText: 'Pad2PS Launcher', instance: false });
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

function readIgdbCredentials() {
  try {
    if (fs.existsSync(IGDB_CREDENTIALS_FILE) && safeStorage.isEncryptionAvailable()) return JSON.parse(safeStorage.decryptString(fs.readFileSync(IGDB_CREDENTIALS_FILE)));
    if (IGDB_CLIENT_ID && IGDB_CLIENT_SECRET) return { clientId: IGDB_CLIENT_ID, clientSecret: IGDB_CLIENT_SECRET };
  } catch {}
  return null;
}
function saveIgdbCredentials(credentials) {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('Configure um cofre seguro (Secret Service ou KWallet) para guardar as credenciais IGDB.');
  fs.writeFileSync(IGDB_CREDENTIALS_FILE, safeStorage.encryptString(JSON.stringify(credentials)), { mode: 0o600 });
  try { fs.chmodSync(IGDB_CREDENTIALS_FILE, 0o600); } catch {}
}
function cleanIgdbTitle(title) {
  return String(title || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\b(disc|disk|cd)\s*\d+\b/gi, ' ').replace(/\s+/g, ' ').trim();
}
async function getIgdbToken(credentials) {
  if (credentials.token && Number(credentials.tokenExpiresAt) > Date.now() + 60_000) return credentials.token;
  const body = new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, grant_type: 'client_credentials' });
  const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`Autenticação Twitch/IGDB falhou (HTTP ${response.status}).`);
  const token = await response.json();
  credentials.token = token.access_token;
  credentials.tokenExpiresAt = Date.now() + Number(token.expires_in || 0) * 1000;
  saveIgdbCredentials(credentials);
  return credentials.token;
}
function readIgdbMetadataCache() { try { return JSON.parse(fs.readFileSync(IGDB_METADATA_CACHE_FILE, 'utf8')); } catch { return {}; } }
function readGameTechCache() { try { return JSON.parse(fs.readFileSync(GAME_TECH_CACHE_FILE, 'utf8')); } catch { return {}; } }
function writeGameTechCache(cache) { try { fs.writeFileSync(GAME_TECH_CACHE_FILE, JSON.stringify(cache), { mode: 0o600 }); } catch {} }
function readSaveSyncConfig() {
  try { if (!safeStorage.isEncryptionAvailable()) return null; return JSON.parse(safeStorage.decryptString(fs.readFileSync(SAVE_SYNC_CREDENTIALS_FILE))); } catch { return null; }
}
function writeSaveSyncConfig(config) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre seguro do sistema não está disponível.');
  fs.writeFileSync(SAVE_SYNC_CREDENTIALS_FILE, safeStorage.encryptString(JSON.stringify(config)), { mode: 0o600 });
  try { fs.chmodSync(SAVE_SYNC_CREDENTIALS_FILE, 0o600); } catch {}
}
function collectSaveFiles(root, relative = '') {
  const result = {};
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const rel = path.join(relative, item.name).replace(/\\/g, '/');
    if (item.isDirectory()) Object.assign(result, collectSaveFiles(root, rel));
    else if (item.isFile()) result[rel] = new Uint8Array(fs.readFileSync(path.join(root, rel)));
  }
  return result;
}
async function syncSaveFolder({ gameId, title, saveFolder, direction = 'push' }) {
  const config = readSaveSyncConfig();
  if (!config) throw new Error('Configure o Save Sync Pessoal nas Integrações.');
  const source = String(saveFolder || '').trim();
  if (!source || !fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error('Vincule uma pasta local de saves válida no modal do jogo.');
  const safeId = String(gameId || title || 'game').replace(/[^a-z0-9_-]/gi, '_');
  const archiveName = `${safeId}.zip`;
  const cacheDir = path.join(DATA_DIR, 'save-sync'); fs.mkdirSync(cacheDir, { recursive: true });
  const archivePath = path.join(cacheDir, archiveName);
  const webdavUrl = String(config.webdavUrl || '').trim().replace(/\/+$/, '');
  const auth = config.mode === 'webdav' ? `Basic ${Buffer.from(`${config.username || ''}:${config.password || ''}`).toString('base64')}` : '';
  if (config.mode === 'local' && direction === 'pull') {
    const remoteArchive = path.join(String(config.localFolder || ''), 'Pad2PS-Saves', archiveName);
    if (fs.existsSync(remoteArchive)) {
      const sourceFiles = collectSaveFiles(source);
      const sourceNewest = fs.readdirSync(source, { withFileTypes: true }).reduce((latest, entry) => Math.max(latest, fs.statSync(path.join(source, entry.name)).mtimeMs), 0);
      if (fs.statSync(remoteArchive).mtimeMs > sourceNewest) {
        fs.writeFileSync(`${archivePath}.bak`, zipSync(sourceFiles, { level: 6 }));
        for (const [rel, bytes] of Object.entries(unzipSync(new Uint8Array(fs.readFileSync(remoteArchive))))) { const target = path.resolve(source, rel); if (!target.startsWith(path.resolve(source) + path.sep)) continue; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
      }
    }
    return { ok: true, direction: 'pull' };
  }
  if (config.mode === 'webdav' && direction === 'pull') {
    try {
      const response = await fetch(`${webdavUrl}/${encodeURIComponent(archiveName)}`, { headers: auth ? { Authorization: auth } : {} });
      if (response.ok) {
        const remote = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(`${archivePath}.bak`, zipSync(collectSaveFiles(source), { level: 6 }));
        for (const [rel, bytes] of Object.entries(unzipSync(new Uint8Array(remote)))) { const target = path.resolve(source, rel); if (!target.startsWith(path.resolve(source) + path.sep)) continue; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
        return { ok: true, direction: 'pull' };
      }
    } catch {}
    return { ok: true, direction: 'pull', unchanged: true };
  }
  const archive = zipSync(collectSaveFiles(source), { level: 6 });
  if (config.mode === 'local') {
    const root = path.resolve(String(config.localFolder || ''));
    if (!root || root === path.parse(root).root || !fs.existsSync(root)) throw new Error('Escolha uma pasta base local existente para o Save Sync.');
    const target = path.join(root, 'Pad2PS-Saves', archiveName); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, archive); fs.writeFileSync(archivePath, archive);
  } else if (config.mode === 'webdav' && webdavUrl) {
    const response = await fetch(`${webdavUrl}/${encodeURIComponent(archiveName)}`, { method: 'PUT', headers: { ...(auth ? { Authorization: auth } : {}), 'Content-Type': 'application/zip' }, body: archive });
    if (!response.ok) throw new Error(`O WebDAV respondeu HTTP ${response.status} ao enviar o save.`);
  } else throw new Error('Selecione Pasta Local ou WebDAV.');
  return { ok: true, direction: 'push', savedAt: Date.now() };
}
async function getProtonSummary(appId) {
  if (process.platform !== 'linux' || !/^\d+$/.test(String(appId))) return null;
  const cache = readGameTechCache(), key = `proton:${appId}`;
  if (cache[key] && cache[key].expiresAt > Date.now()) return cache[key].data;
  try {
    const response = await fetch(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`);
    if (!response.ok) return null;
    const result = await response.json();
    const tier = String(result.tier || '').toLowerCase();
    if (!['platinum', 'gold', 'silver', 'bronze', 'borked'].includes(tier)) return null;
    const data = { tier: tier[0].toUpperCase() + tier.slice(1) };
    cache[key] = { data, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }; writeGameTechCache(cache);
    return data;
  } catch { return null; }
}
async function getPcGamingWikiSummary(appId, title) {
  const cleanTitle = String(title || '').trim();
  if (!/^\d+$/.test(String(appId || '')) && !cleanTitle) return null;
  const cache = readGameTechCache(), key = `pcgw:${appId || cleanTitle.toLocaleLowerCase()}`;
  if (cache[key] && cache[key].expiresAt > Date.now()) return cache[key].data;
  try {
    const where = /^\d+$/.test(String(appId || '')) ? `Infobox_game.Steam_AppID HOLDS "${appId}"` : `Infobox_game._pageName = "${cleanTitle.replace(/["\\]/g, ' ')}"`;
    const params = new URLSearchParams({ action: 'cargoquery', format: 'json', tables: 'Infobox_game,Input,Video', fields: 'Infobox_game._pageName=Page,Infobox_game.Steam_AppID,Input.Xbox_360,Input.Xbox_One,Input.PlayStation_4,Input.PlayStation_5,Video.Ultrawidescreen', join_on: 'Infobox_game._pageID=Input._pageID,Infobox_game._pageID=Video._pageID', where, limit: '1' });
    const response = await fetch(`https://www.pcgamingwiki.com/w/api.php?${params}`, { headers: { 'User-Agent': 'Pad2PSLauncher/1.0 (game compatibility lookup)' } });
    if (!response.ok) return null;
    const result = await response.json(), row = result?.cargoquery?.[0]?.title;
    if (!row) return null;
    const yes = (...values) => values.some((value) => ['yes', 'y', 'true', '1', 'supported'].includes(String(value || '').trim().toLowerCase()));
    const data = { xboxController: yes(row['Xbox 360'], row.Xbox_360, row.Xbox_One), playstationController: yes(row['PlayStation 4'], row.PlayStation_4, row.PlayStation_5), ultrawide: yes(row.Ultrawidescreen) };
    cache[key] = { data, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }; writeGameTechCache(cache);
    return data;
  } catch { return null; }
}
async function getIgdbGameMetadata(titleInput, { refresh = false } = {}) {
  const title = cleanIgdbTitle(titleInput);
  if (!title) throw new Error('Título do jogo vazio.');
  const cache = readIgdbMetadataCache();
  const cacheKey = title.toLocaleLowerCase();
  if (!refresh && cache[cacheKey]) return cache[cacheKey];
  const credentials = readIgdbCredentials();
  if (!credentials?.clientId || !credentials?.clientSecret) throw new Error('Configure Client ID e Client Secret da IGDB nas Configurações.');
  const token = await getIgdbToken(credentials);
  const safeTitle = title.replace(/["\\]/g, ' ');
  const fields = 'fields name,summary,first_release_date,genres.name,involved_companies.company.name,involved_companies.developer,screenshots.image_id,rating,total_rating_count,follows;';
  const request = async (query) => {
    const response = await fetch('https://api.igdb.com/v4/games', { method: 'POST', headers: { 'Client-ID': credentials.clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }, body: query });
    if (!response.ok) throw new Error(`IGDB respondeu HTTP ${response.status}.`);
    return response.json();
  };
  const exactRows = await request(`${fields} where name = "${safeTitle}"; sort total_rating_count desc; limit 5;`);
  const rows = exactRows.length ? exactRows : await request(`${fields} search "${safeTitle}"; sort total_rating_count desc; limit 5;`);
  const normalized = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  rows.sort((a, b) => Number(normalized(b.name) === normalized(title)) - Number(normalized(a.name) === normalized(title)) || Number(b.total_rating_count || 0) - Number(a.total_rating_count || 0) || Number(b.follows || 0) - Number(a.follows || 0));
  const game = Array.isArray(rows) ? rows[0] : null;
  if (!game) throw new Error('Nenhum resultado encontrado na IGDB.');
  const data = {
    id: game.id, name: game.name || title, summary: game.summary || '',
    year: game.first_release_date ? new Date(game.first_release_date * 1000).getUTCFullYear() : null,
    genres: Array.isArray(game.genres) ? game.genres.map((genre) => genre.name).filter(Boolean) : [],
    developers: Array.isArray(game.involved_companies) ? game.involved_companies.filter((company) => company.developer).map((company) => company.company?.name).filter(Boolean) : [],
    screenshots: Array.isArray(game.screenshots) ? game.screenshots.map((shot) => `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${shot.image_id}.jpg`).filter(Boolean).slice(0, 5) : [],
    rating: game.rating || null,
  };
  cache[cacheKey] = data;
  fs.writeFileSync(IGDB_METADATA_CACHE_FILE, JSON.stringify(cache), { mode: 0o600 });
  return data;
}

function parseSteamProfileInput(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('Informe seu SteamID64 ou a URL do perfil Steam.');
  const urlCandidate = /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\//i.test(value);
  if (urlCandidate) {
    let profileUrl;
    try { profileUrl = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); }
    catch { throw new Error('A URL do perfil Steam não é válida.'); }
    if (!['steamcommunity.com', 'www.steamcommunity.com'].includes(profileUrl.hostname.toLowerCase())) {
      throw new Error('Use uma URL de perfil steamcommunity.com.');
    }
    const segments = profileUrl.pathname.split('/').filter(Boolean);
    const profileType = segments[0]?.toLowerCase();
    let profileValue = segments[1] || '';
    try { profileValue = decodeURIComponent(profileValue); } catch {}
    profileValue = profileValue.trim();
    if (profileType === 'profiles' && /^\d{17}$/.test(profileValue)) return { steamId: profileValue };
    if (profileType === 'id' && /^[^/?#]{2,64}$/.test(profileValue)) return { vanity: profileValue };
    throw new Error('O link precisa ter o formato steamcommunity.com/id/nome ou /profiles/SteamID64.');
  }
  if (/^\d{17}$/.test(value)) return { steamId: value };
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(value)) return { vanity: value };
  throw new Error('Informe um SteamID64 de 17 dígitos ou uma URL válida do perfil Steam.');
}

async function steamApi(interfaceName, methodName, params) {
  const methodVersions = {
    ResolveVanityURL: 'v0001',
    GetPlayerSummaries: 'v0002',
    GetOwnedGames: 'v0001',
    GetRecentlyPlayedGames: 'v0001',
    GetPlayerAchievements: 'v0001',
  };
  const version = methodVersions[methodName];
  if (!version) throw new Error(`Método Steam não reconhecido: ${methodName}.`);
  const url = new URL(`https://api.steampowered.com/${interfaceName}/${methodName}/${version}/`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  let response;
  try { response = await fetch(url, { headers: { Accept: 'application/json' } }); }
  catch (error) { throw new Error(`Falha de rede ao consultar a Steam: ${error.message || 'verifique sua conexão.'}`); }
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : {}; } catch { data = null; }
  if (!response.ok) {
    const apiMessage = data?.error || data?.message || body?.replace(/\s+/g, ' ').slice(0, 240);
    if (response.status === 403) throw new Error(`Steam Web API retornou HTTP 403 (Forbidden). Confira se a chave é válida${apiMessage ? `: ${apiMessage}` : '.'}`);
    throw new Error(`Steam Web API retornou HTTP ${response.status} (${response.statusText || 'erro'}).${apiMessage ? ` Detalhe: ${apiMessage}` : ''}`);
  }
  if (!data || typeof data !== 'object') throw new Error('A Steam retornou uma resposta inválida. Verifique a conexão e tente novamente.');
  return data;
}

async function resolveSteamId(profileInput, apiKey) {
  const parsed = parseSteamProfileInput(profileInput);
  if (parsed.steamId) return parsed.steamId;
  const result = await steamApi('ISteamUser', 'ResolveVanityURL', { key: apiKey, vanityurl: parsed.vanity });
  const resolved = result?.response?.steamid;
  if (!result?.response?.success || !/^\d{17}$/.test(String(resolved || ''))) {
    const status = result?.response?.success;
    if (status === 42) throw new Error('A Steam não encontrou esse Nome de domínio/URL personalizada. Confira o trecho após /id/.');
    throw new Error(`A Steam não conseguiu resolver o perfil informado${status ? ` (código ${status})` : ''}. Confira o link e se a Steam Web API Key está válida.`);
  }
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
  if (!profile) throw new Error(`A Steam não retornou dados para o SteamID ${steamId}. Confira se o ID está correto e se a chave da Web API é válida. Se o perfil estiver privado, torne os detalhes do perfil públicos para sincronizar.`);
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
function runGameProcess(gameId, command, gameTitle = '', saveFolder = '') {
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
        if (saveFolder) void syncSaveFolder({ gameId, title: gameTitle, saveFolder, direction: 'push' }).catch(() => {});
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

      if (req.method === 'GET' && pathname.startsWith('/api/steamgriddb/')) {
        const kind = pathname.slice('/api/steamgriddb/'.length);
        const query = url.searchParams.get('q') || '';
        const gameId = Number(url.searchParams.get('gameId'));
        let apiPath = '';
        if (kind === 'search' && query.trim()) apiPath = `/search/autocomplete/${encodeURIComponent(query.trim())}`;
        else if (['grids', 'heroes'].includes(kind) && Number.isInteger(gameId) && gameId > 0) {
          apiPath = kind === 'grids'
            ? `/grids/game/${gameId}${url.searchParams.has('dimensions') ? `?dimensions=${encodeURIComponent(url.searchParams.get('dimensions'))}&nsfw=false&humor=false` : '?nsfw=false&humor=false'}`
            : `/heroes/game/${gameId}?nsfw=false&humor=false`;
        }
        if (!apiPath) return sendJson({ success: false, errors: ['Consulta inválida.'] }, 400);
        if (!STEAMGRIDDB_API_KEY) return sendJson({ success: false, errors: ['SteamGridDB não configurado no processo do aplicativo.'] }, 503);
        void fetch(`https://www.steamgriddb.com/api/v2${apiPath}`, { headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` } })
          .then(async (response) => sendJson(await response.json().catch(() => ({ success: false, errors: ['Resposta inválida da SteamGridDB.'] })), response.status))
          .catch((error) => sendJson({ success: false, errors: [error.message || 'Falha de rede ao consultar SteamGridDB.'] }, 502));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/open-game-folder') {
        const command = url.searchParams.get('command') || '';
        const quoted = command.match(/["']([^"']+)["']/)?.[1];
        const candidate = quoted || command.trim().split(/\s+/)[0]?.replace(/^"|"$/g, '');
        if (!candidate || !path.isAbsolute(candidate) || !fs.existsSync(candidate)) {
          return sendJson({ error: 'O caminho do jogo não existe neste computador.' }, 404);
        }
        const target = fs.statSync(candidate).isDirectory() ? candidate : path.dirname(candidate);
        void shell.openPath(target).then((error) => sendJson(error ? { error } : { ok: true }, error ? 500 : 200));
        return;
      }

      // Steam Web API: credentials stay encrypted locally and requests go directly to Valve.
      if (req.method === 'GET' && pathname === '/api/steam/config') {
        const credentials = readSteamCredentials();
        return sendJson({ configured: Boolean(credentials?.apiKey && credentials?.steamId), steamId: credentials?.steamId || '', profile: credentials?.profile || null });
      }
      if (req.method === 'GET' && pathname === '/api/retro/config') {
        const credentials = readRetroCredentials();
        return sendJson({ configured: Boolean(credentials?.username), username: credentials?.username || '', profile: credentials?.profile || null });
      }
      if (req.method === 'GET' && pathname === '/api/igdb/config') {
        const credentials = readIgdbCredentials();
        return sendJson({ configured: Boolean(credentials?.clientId && credentials?.clientSecret), clientId: credentials?.clientId || '' });
      }
      if (req.method === 'POST' && pathname === '/api/igdb/config') {
        void readJsonBody().then(async (body) => {
          const existing = readIgdbCredentials();
          const clientId = String(body.clientId || IGDB_CLIENT_ID || existing?.clientId || '').trim();
          const clientSecret = String(body.clientSecret || IGDB_CLIENT_SECRET || existing?.clientSecret || '').trim();
          if (!clientId || !clientSecret) throw new Error('Informe Client ID e Client Secret.');
          saveIgdbCredentials({ clientId, clientSecret });
          const credentials = readIgdbCredentials();
          await getIgdbToken(credentials);
          return sendJson({ configured: true });
        }).catch((error) => sendJson({ error: error.message || 'Não foi possível validar as credenciais IGDB.' }, 400));
        return;
      }
      if (req.method === 'POST' && pathname === '/api/igdb/disconnect') {
        try { if (fs.existsSync(IGDB_CREDENTIALS_FILE)) fs.unlinkSync(IGDB_CREDENTIALS_FILE); } catch {}
        try { if (fs.existsSync(IGDB_METADATA_CACHE_FILE)) fs.unlinkSync(IGDB_METADATA_CACHE_FILE); } catch {}
        return sendJson({ ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/igdb/game') {
        const title = url.searchParams.get('title') || '';
        const refresh = url.searchParams.get('refresh') === '1';
        void getIgdbGameMetadata(title, { refresh }).then((data) => sendJson({ available: true, data })).catch((error) => sendJson({ available: false, reason: error.message || 'Metadados IGDB indisponíveis.' }));
        return;
      }
      if (req.method === 'GET' && pathname === '/api/game-tech/protondb') {
        void getProtonSummary(url.searchParams.get('appId')).then((data) => sendJson({ available: Boolean(data), data })).catch(() => sendJson({ available: false, data: null }));
        return;
      }
      if (req.method === 'GET' && pathname === '/api/game-tech/pcgw') {
        void getPcGamingWikiSummary(url.searchParams.get('appId'), url.searchParams.get('title')).then((data) => sendJson({ available: Boolean(data), data })).catch(() => sendJson({ available: false, data: null }));
        return;
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
      if (req.method === 'GET' && pathname === '/api/save-sync/config') { const value = readSaveSyncConfig() || {}; return sendJson({ mode: value.mode || 'local', localFolder: value.localFolder || '', webdavUrl: value.webdavUrl || '', username: value.username || '', configured: Boolean(value.mode) }); }
      if (req.method === 'GET' && pathname === '/api/save-sync/pick-folder') { void dialog.showOpenDialog({ title: 'Pasta base para os saves', properties: ['openDirectory', 'createDirectory'] }).then((result) => sendJson({ path: result.canceled ? '' : result.filePaths[0] || '' })).catch(() => sendJson({ path: '' })); return; }
      if (req.method === 'POST' && pathname === '/api/save-sync/config') { void readJsonBody().then((body) => { writeSaveSyncConfig({ mode: body.mode === 'webdav' ? 'webdav' : 'local', localFolder: String(body.localFolder || '').trim(), webdavUrl: String(body.webdavUrl || '').trim(), username: String(body.username || '').trim(), password: String(body.password || '').trim() }); sendJson({ ok: true }); }).catch((error) => sendJson({ error: error.message || 'Não foi possível salvar a configuração segura.' }, 400)); return; }
      if (req.method === 'POST' && pathname === '/api/save-sync/test') { void readJsonBody().then(async (body) => { const urlValue = String(body.webdavUrl || '').trim().replace(/\/+$/, ''); const auth = `Basic ${Buffer.from(`${body.username || ''}:${body.password || ''}`).toString('base64')}`; const response = await fetch(urlValue, { method: 'PROPFIND', headers: { Authorization: auth, Depth: '0' } }); if (![200, 207, 405].includes(response.status)) throw new Error(`WebDAV respondeu HTTP ${response.status}.`); return sendJson({ ok: true }); }).catch((error) => sendJson({ error: error.message || 'Falha ao testar o WebDAV.' }, 400)); return; }
      if (req.method === 'POST' && pathname === '/api/save-sync/sync') { void readJsonBody().then(async (body) => { await syncSaveFolder({ ...body, direction: 'pull' }); return syncSaveFolder({ ...body, direction: 'push' }); }).then((result) => sendJson(result)).catch((error) => sendJson({ error: error.message || 'Não foi possível sincronizar os saves.' }, 400)); return; }
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
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw || '{}');
            const { id, command, title, controller, saveFolder } = body;
            if (command) {
              if (saveFolder) { try { await syncSaveFolder({ gameId: id, title, saveFolder, direction: 'pull' }); } catch {} }
              setDiscordGame(title || 'Jogo', controller || '');
              runGameProcess(id, command, title, saveFolder);
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
