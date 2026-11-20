export interface AppReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export const CURRENT_APP_VERSION = '1.0.17';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
  primaryAsset?: {
    name: string;
    url: string;
    label: string;
  };
  allAssets: AppReleaseAsset[];
  error?: string;
}

export function compareSemver(v1: string, v2: string): number {
  const parseParts = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const p1 = parseParts(v1);
  const p2 = parseParts(v2);
  const maxLen = Math.max(p1.length, p2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function detectPlatform(): 'android' | 'windows' | 'linux' {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase();
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);

  if (isCapacitor || ua.includes('android')) {
    return 'android';
  }
  if (ua.includes('win') || platform.includes('win')) {
    return 'windows';
  }
  return 'linux';
}

export async function checkForAppUpdate(
  repo: 'RbtSwift/Pad2PS' | 'RbtSwift/Pad2PS-Launcher' = 'RbtSwift/Pad2PS-Launcher',
  currentVersion = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: '',
        releaseNotes: '',
        releaseUrl: `https://github.com/${repo}/releases`,
        publishedAt: '',
        allAssets: [],
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const tag = (data.tag_name || '').trim();
    const latestVersion = tag.replace(/^v/, '');
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

    const allAssets: AppReleaseAsset[] = (data.assets || []).map((a: { name: string; browser_download_url: string; size: number }) => ({
      name: a.name,
      browser_download_url: a.browser_download_url,
      size: a.size,
    }));

    const plat = detectPlatform();
    let primaryAsset: { name: string; url: string; label: string } | undefined;

    if (plat === 'android') {
      const apk = allAssets.find((a) => a.name.endsWith('.apk'));
      if (apk) {
        primaryAsset = { name: apk.name, url: apk.browser_download_url, label: 'Baixar APK (Android)' };
      }
    } else if (plat === 'windows') {
      const exe = allAssets.find((a) => a.name.endsWith('-Setup.exe') || a.name.endsWith('.exe'));
      if (exe) {
        primaryAsset = { name: exe.name, url: exe.browser_download_url, label: 'Baixar Instalador Windows (.exe)' };
      }
    } else {
      // Linux
      const deb = allAssets.find((a) => a.name.endsWith('.deb'));
      if (deb) {
        primaryAsset = { name: deb.name, url: deb.browser_download_url, label: 'Baixar Pacote .deb (Linux / Zorin / Ubuntu)' };
      } else {
        const appimage = allAssets.find((a) => a.name.endsWith('.AppImage'));
        if (appimage) {
          primaryAsset = { name: appimage.name, url: appimage.browser_download_url, label: 'Baixar .AppImage (Linux Universal)' };
        }
      }
    }

    if (!primaryAsset && allAssets.length > 0) {
      primaryAsset = {
        name: allAssets[0].name,
        url: allAssets[0].browser_download_url,
        label: `Baixar ${allAssets[0].name}`,
      };
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: data.name || tag,
      releaseNotes: data.body || '',
      releaseUrl: data.html_url || `https://github.com/${repo}/releases`,
      publishedAt: data.published_at || '',
      primaryAsset,
      allAssets,
    };
  } catch (err) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseName: '',
      releaseNotes: '',
      releaseUrl: `https://github.com/${repo}/releases`,
      publishedAt: '',
      allAssets: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
