export const STEAMGRIDDB_KEY_STORAGE = 'pad2ps_steamgriddb_key';

export interface OnlineCoverCandidate {
  id: string;
  url: string;
  thumbUrl: string;
  source: 'Steam CDN' | 'SteamGridDB';
  label: string;
  dimensions: string;
}

export function getStoredSteamGridDbKey(): string {
  try {
    return localStorage.getItem(STEAMGRIDDB_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveStoredSteamGridDbKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STEAMGRIDDB_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(STEAMGRIDDB_KEY_STORAGE);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Extracts a numeric Steam AppID from a launch command (e.g. steam://rungameid/1091500)
 * or raw AppID input.
 */
export function extractSteamAppId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const steamUriMatch = trimmed.match(
    /steam:\/\/(?:rungameid|launch|run)\/(\d+)/i
  );
  if (steamUriMatch?.[1]) return steamUriMatch[1];

  const appUrlMatch = trimmed.match(/store\.steampowered\.com\/app\/(\d+)/i);
  if (appUrlMatch?.[1]) return appUrlMatch[1];

  if (/^\d{4,10}$/.test(trimmed)) return trimmed;
  return null;
}

export function probeImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export async function fetchSteamCdnCover(
  appId: string
): Promise<OnlineCoverCandidate | null> {
  const cleanId = appId.trim();
  if (!/^\d+$/.test(cleanId)) return null;

  const hdUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_600x900_2x.jpg`;
  const sdUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_600x900.jpg`;

  if (await probeImageUrl(hdUrl)) {
    return {
      id: `steam-hd-${cleanId}`,
      url: hdUrl,
      thumbUrl: hdUrl,
      source: 'Steam CDN',
      label: `Steam App ${cleanId} (HD)`,
      dimensions: '600×900 (2x)',
    };
  }

  if (await probeImageUrl(sdUrl)) {
    return {
      id: `steam-sd-${cleanId}`,
      url: sdUrl,
      thumbUrl: sdUrl,
      source: 'Steam CDN',
      label: `Steam App ${cleanId}`,
      dimensions: '600×900',
    };
  }

  return null;
}

interface SteamGridSearchItem {
  id: number;
  name: string;
}

interface SteamGridImageItem {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  style?: string;
}

export async function searchSteamGridDbCovers(
  query: string,
  apiKey: string
): Promise<{
  matchedGameName: string | null;
  covers: OnlineCoverCandidate[];
  error?: string;
}> {
  const cleanQuery = query.trim();
  const cleanKey = apiKey.trim();

  if (!cleanQuery || !cleanKey) {
    return { matchedGameName: null, covers: [] };
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: 'application/json',
  };

  try {
    const searchRes = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
        cleanQuery
      )}`,
      { headers }
    );

    if (searchRes.status === 401 || searchRes.status === 403) {
      return {
        matchedGameName: null,
        covers: [],
        error:
          'API Key do SteamGridDB inválida ou expirada. Verifique em Sistema → Capas & API SteamGridDB.',
      };
    }

    if (!searchRes.ok) {
      return {
        matchedGameName: null,
        covers: [],
        error: `Erro ${searchRes.status} ao consultar SteamGridDB.`,
      };
    }

    const searchJson = (await searchRes.json()) as {
      success?: boolean;
      data?: SteamGridSearchItem[];
    };

    const matches = Array.isArray(searchJson?.data) ? searchJson.data : [];
    if (matches.length === 0) {
      return { matchedGameName: null, covers: [] };
    }

    const topGame = matches[0];
    const gridsRes = await fetch(
      `https://www.steamgriddb.com/api/v2/grids/game/${topGame.id}?dimensions=600x900`,
      { headers }
    );

    if (!gridsRes.ok) {
      return {
        matchedGameName: topGame.name,
        covers: [],
        error: `Erro ${gridsRes.status} ao carregar capas de "${topGame.name}".`,
      };
    }

    const gridsJson = (await gridsRes.json()) as {
      success?: boolean;
      data?: SteamGridImageItem[];
    };

    const rawGrids = Array.isArray(gridsJson?.data) ? gridsJson.data : [];
    const covers: OnlineCoverCandidate[] = rawGrids.slice(0, 12).map((g) => ({
      id: `sgdb-${g.id}`,
      url: g.url,
      thumbUrl: g.thumb || g.url,
      source: 'SteamGridDB',
      label: topGame.name,
      dimensions: `${g.width || 600}×${g.height || 900}`,
    }));

    return {
      matchedGameName: topGame.name,
      covers,
    };
  } catch {
    return {
      matchedGameName: null,
      covers: [],
      error:
        'Não foi possível conectar diretamente à API do SteamGridDB neste navegador (bloqueio CORS ou rede). Capas da Steam CDN via AppID funcionam normalmente.',
    };
  }
}

/**
 * Resizes and center-crops any uploaded image file to exact 600x900 (2:3)
 * using HTML5 Canvas before storing as compressed JPEG base64 in localStorage.
 */
export function resizeImageFileTo600x900(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const targetW = 600;
        const targetH = 900;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas 2D indisponível'));
          return;
        }

        const srcRatio = img.width / img.height;
        const dstRatio = targetW / targetH;

        let drawW = targetW;
        let drawH = targetH;
        let offsetX = 0;
        let offsetY = 0;

        if (srcRatio > dstRatio) {
          // Source is wider: match height and center-crop horizontally
          drawH = targetH;
          drawW = img.width * (targetH / img.height);
          offsetX = (targetW - drawW) / 2;
        } else {
          // Source is taller: match width and center-crop vertically
          drawW = targetW;
          drawH = img.height * (targetW / img.width);
          offsetY = (targetH - drawH) / 2;
        }

        ctx.fillStyle = '#0B0B0F';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem selecionada'));
    };

    img.src = objectUrl;
  });
}

const heroCache = new Map<string, string | null>();

export async function fetchSteamCdnHero(appId: string): Promise<string | null> {
  const cleanId = appId.trim();
  if (!/^\d+$/.test(cleanId)) return null;
  const cacheKey = `steam-hero:${cleanId}`;
  if (heroCache.has(cacheKey)) {
    return heroCache.get(cacheKey) ?? null;
  }
  const heroUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_hero.jpg`;
  const ok = await probeImageUrl(heroUrl);
  const result = ok ? heroUrl : null;
  heroCache.set(cacheKey, result);
  return result;
}

/**
 * Queries SteamGridDB v2 /heroes/game/{id} for a high-res widescreen banner
 * for the screensaver slideshow when an API Key is configured.
 */
export async function searchSteamGridDbHero(
  query: string,
  apiKey: string
): Promise<string | null> {
  const cleanQuery = query.trim();
  const cleanKey = apiKey.trim();
  if (!cleanQuery || !cleanKey) return null;

  const cacheKey = `sgdb-hero:${cleanQuery.toLowerCase()}`;
  if (heroCache.has(cacheKey)) {
    return heroCache.get(cacheKey) ?? null;
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: 'application/json',
  };

  try {
    const searchRes = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
        cleanQuery
      )}`,
      { headers }
    );
    if (!searchRes.ok) {
      heroCache.set(cacheKey, null);
      return null;
    }

    const searchJson = (await searchRes.json()) as {
      data?: SteamGridSearchItem[];
    };
    const topGame = Array.isArray(searchJson?.data)
      ? searchJson.data[0]
      : undefined;
    if (!topGame) {
      heroCache.set(cacheKey, null);
      return null;
    }

    const heroesRes = await fetch(
      `https://www.steamgriddb.com/api/v2/heroes/game/${topGame.id}`,
      { headers }
    );
    if (!heroesRes.ok) {
      heroCache.set(cacheKey, null);
      return null;
    }

    const heroesJson = (await heroesRes.json()) as {
      data?: SteamGridImageItem[];
    };
    const firstHero = Array.isArray(heroesJson?.data)
      ? heroesJson.data[0]
      : undefined;
    const url = firstHero?.url ?? null;
    heroCache.set(cacheKey, url);
    return url;
  } catch {
    heroCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Resizes and center-crops an uploaded image file to 1920x1080 (16:9)
 * using HTML5 Canvas for custom screensaver wallpapers.
 */
export function resizeImageFileTo1920x1080(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const targetW = 1920;
        const targetH = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas 2D indisponível'));
          return;
        }

        const srcRatio = img.width / img.height;
        const dstRatio = targetW / targetH;

        let drawW = targetW;
        let drawH = targetH;
        let offsetX = 0;
        let offsetY = 0;

        if (srcRatio > dstRatio) {
          drawH = targetH;
          drawW = img.width * (targetH / img.height);
          offsetX = (targetW - drawW) / 2;
        } else {
          drawW = targetW;
          drawH = img.height * (targetW / img.width);
          offsetY = (targetH - drawH) / 2;
        }

        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem selecionada'));
    };

    img.src = objectUrl;
  });
}
