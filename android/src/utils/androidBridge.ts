import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AndroidScannedGame {
  id: string;
  title: string;
  packageName?: string;
  command: string;
  platform?: string;
  genre?: string;
  isEmulator?: boolean;
  isRom?: boolean;
  uri?: string;
  cover?: string;
  iconBase64?: string;
  source?: string;
}

export interface AndroidLaunchableApp {
  title: string;
  packageName: string;
}

export interface GameScannerPlugin {
  getInstalledGames(): Promise<{ games: AndroidScannedGame[]; romFolderUri: string }>;
  getLaunchableApps(): Promise<{ apps: AndroidLaunchableApp[] }>;
  getAppIcon(options: { packageName: string }): Promise<{ iconBase64: string }>;
  pickRomFolder(): Promise<{ uri: string; roms: AndroidScannedGame[]; count: number }>;
  scanRomFolder(): Promise<{ uri: string; roms: AndroidScannedGame[]; count: number }>;
  clearRomFolder(): Promise<{ ok: boolean }>;
  launchGame(options: { packageName?: string; uri?: string; command?: string }): Promise<{ ok: boolean }>;
  getDeviceStatus(): Promise<{ devices: Array<{ name: string; type: string; percentage: number; charging: boolean }> }>;
  openHomeSettings(): Promise<{ ok: boolean }>;
  steamGridDbRequest(options: { kind: string; query?: string; gameId?: number; dimensions?: string }): Promise<Record<string, unknown>>;
}

interface SaveSyncPluginContract {
  config(): Promise<{ mode: 'local' | 'webdav'; baseFolderUri: string; webdavUrl: string; username: string; configured: boolean }>;
  saveConfig(options: { mode: 'local' | 'webdav'; baseFolderUri: string; webdavUrl: string; username: string; password: string }): Promise<{ ok: boolean }>;
  pickFolder(): Promise<{ uri: string; name: string }>;
  testConnection(): Promise<{ ok: boolean }>;
  sync(options: { saveFolderUri: string; gameId: string; title: string; direction: 'pull' | 'push' }): Promise<{ ok: boolean; savedAt: number }>;
}

export const GameScanner = registerPlugin<GameScannerPlugin>('GameScanner');
export const SaveSyncNative = registerPlugin<SaveSyncPluginContract>('SaveSync');

let pendingSaveSyncTimer: number | undefined;
let pendingSaveSyncRunning = false;

export async function syncAndroidSaves(saveFolderUri: string, gameId: string, title: string, direction: 'pull' | 'push') {
  if (!isAndroidNative() || !saveFolderUri) return { ok: false, savedAt: 0 };
  return SaveSyncNative.sync({ saveFolderUri, gameId, title, direction });
}

export async function finishPendingAndroidSaveSync() {
  if (pendingSaveSyncRunning) return;
  try {
    const stored = localStorage.getItem('pad2ps_pending_save_sync');
    if (!stored) return;
    const pending = JSON.parse(stored) as { saveFolderUri: string; gameId: string; title: string; startedAt?: number };
    const delay = 2500 - (Date.now() - Number(pending.startedAt || 0));
    if (delay > 0) {
      if (pendingSaveSyncTimer === undefined) {
        pendingSaveSyncTimer = window.setTimeout(() => {
          pendingSaveSyncTimer = undefined;
          if (document.visibilityState === 'visible') void finishPendingAndroidSaveSync();
        }, delay);
      }
      return;
    }
    pendingSaveSyncRunning = true;
    const result = await syncAndroidSaves(pending.saveFolderUri, pending.gameId, pending.title, 'push');
    if (result.ok && localStorage.getItem('pad2ps_pending_save_sync') === stored) {
      localStorage.removeItem('pad2ps_pending_save_sync');
    }
  } catch { /* Sync is best-effort when the foreground game returns. */ }
  finally { pendingSaveSyncRunning = false; }
}

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function listAndroidLaunchableApps(): Promise<AndroidLaunchableApp[]> {
  if (!isAndroidNative()) return [];
  const result = await GameScanner.getLaunchableApps();
  return result.apps || [];
}

export async function getAndroidAppIcon(packageName: string): Promise<string> {
  if (!isAndroidNative()) return '';
  const result = await GameScanner.getAppIcon({ packageName });
  return result.iconBase64 || '';
}

function normalizeAndroidGames(raw: AndroidScannedGame[]) {
  return raw.map((item) => {
    const isRom = Boolean(item.isRom && item.uri);
    const command = isRom
      ? `rom::${item.packageName || ''}::${item.uri}`
      : item.packageName || item.command || '';

    return {
      id: item.id,
      title: item.title,
      platform: item.isRom || item.isEmulator ? 'Emulador' : 'Outro',
      platformLabel: item.isRom ? item.platform || 'ROM' : item.isEmulator ? 'Emulador' : 'Android',
      consoleSystem: item.isRom ? item.platform : undefined,
      coverUrl: item.cover || item.iconBase64 || '',
      isAutomaticCoverFallback: Boolean(item.iconBase64 && item.source === 'android'),
      command,
      hoursPlayed: 0,
      favorite: false,
      genre: item.genre || (item.isEmulator ? 'Emulador' : 'Jogo Android'),
      lastPlayed: undefined,
    };
  });
}

export async function pickAndroidRomFolder(): Promise<{ count: number; games: ReturnType<typeof normalizeAndroidGames> }> {
  if (!isAndroidNative()) {
    return { count: 0, games: [] };
  }
  const res = await GameScanner.pickRomFolder();
  const full = await GameScanner.getInstalledGames();
  return {
    count: res.count || 0,
    games: normalizeAndroidGames(full.games || []),
  };
}

export async function rescanAndroidLibrary() {
  if (!isAndroidNative()) return [];
  const res = await GameScanner.getInstalledGames();
  return normalizeAndroidGames(res.games || []);
}

let interceptorInstalled = false;

export function installAndroidFetchInterceptor() {
  if (interceptorInstalled || !isAndroidNative()) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith('/api/steamgriddb/')) {
      try {
        const parsed = new URL(url, window.location.href);
        const kind = parsed.pathname.split('/').pop() || '';
        const result = await GameScanner.steamGridDbRequest({
          kind,
          query: parsed.searchParams.get('q') || undefined,
          gameId: Number(parsed.searchParams.get('gameId')) || undefined,
          dimensions: parsed.searchParams.get('dimensions') || undefined,
        });
        const status = Number(result.httpStatus) || 200;
        delete result.httpStatus;
        return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, errors: [String(error)] }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.startsWith('/api/save-sync/')) {
      try {
        const parsed = new URL(url, window.location.href);
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (parsed.pathname === '/api/save-sync/config' && init?.method === 'GET') {
          return new Response(JSON.stringify(await SaveSyncNative.config()), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (parsed.pathname === '/api/save-sync/config' && init?.method === 'POST') {
          return new Response(JSON.stringify(await SaveSyncNative.saveConfig(body)), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (parsed.pathname === '/api/save-sync/pick-folder') {
          return new Response(JSON.stringify(await SaveSyncNative.pickFolder()), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (parsed.pathname === '/api/save-sync/test') {
          return new Response(JSON.stringify(await SaveSyncNative.testConnection()), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (parsed.pathname === '/api/save-sync/sync') {
          await syncAndroidSaves(String(body.saveFolder || ''), String(body.gameId || ''), String(body.title || ''), 'pull');
          const result = await syncAndroidSaves(String(body.saveFolder || ''), String(body.gameId || ''), String(body.title || ''), 'push');
          return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.startsWith('/api/games')) {
      try {
        const res = await GameScanner.getInstalledGames();
        const games = normalizeAndroidGames(res.games || []);
        return new Response(JSON.stringify({ games, romFolderUri: res.romFolderUri || '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ games: [], error: String(err) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.startsWith('/api/launch')) {
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const cmd = String(body.command || '');
        if (cmd.startsWith('rom::')) {
          const rest = cmd.slice(5);
          const sep = rest.indexOf('::');
          const pkg = sep >= 0 ? rest.slice(0, sep) : '';
          const uri = sep >= 0 ? rest.slice(sep + 2) : rest;
          if (body.saveFolder) {
            await syncAndroidSaves(String(body.saveFolder), String(body.id || ''), String(body.title || ''), 'pull');
            localStorage.setItem('pad2ps_pending_save_sync', JSON.stringify({ saveFolderUri: String(body.saveFolder), gameId: String(body.id || ''), title: String(body.title || ''), startedAt: Date.now() }));
          }
          await GameScanner.launchGame({ packageName: pkg, uri });
        } else {
          if (body.saveFolder) {
            await syncAndroidSaves(String(body.saveFolder), String(body.id || ''), String(body.title || ''), 'pull');
            localStorage.setItem('pad2ps_pending_save_sync', JSON.stringify({ saveFolderUri: String(body.saveFolder), gameId: String(body.id || ''), title: String(body.title || ''), startedAt: Date.now() }));
          }
          await GameScanner.launchGame({ packageName: cmd, command: cmd });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.startsWith('/api/devices')) {
      try {
        const status = await GameScanner.getDeviceStatus();
        return new Response(JSON.stringify(status), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ devices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.startsWith('/api/autostart')) {
      return new Response(JSON.stringify({ enabled: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.startsWith('/api/home-settings')) {
      try {
        await GameScanner.openHomeSettings();
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.startsWith('/api/save')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
}
