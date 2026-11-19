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
}

export const GameScanner = registerPlugin<GameScannerPlugin>('GameScanner');

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
          await GameScanner.launchGame({ packageName: pkg, uri });
        } else {
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

    if (url.startsWith('/api/save')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
}
