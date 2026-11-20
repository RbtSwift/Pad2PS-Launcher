const CACHE_PREFIX = 'pad2ps:libretro-cover:';
const PLATFORM_NAMES: Record<string, string> = {
  ps1: 'Sony - PlayStation', playstation: 'Sony - PlayStation', ps2: 'Sony - PlayStation 2', psp: 'Sony - PlayStation Portable',
  snes: 'Nintendo - Super Nintendo Entertainment System', 'super nintendo': 'Nintendo - Super Nintendo Entertainment System',
  nes: 'Nintendo - Nintendo Entertainment System', 'mega drive': 'Sega - Mega Drive - Genesis', genesis: 'Sega - Mega Drive - Genesis',
  gba: 'Nintendo - Game Boy Advance', gbc: 'Nintendo - Game Boy Color', 'game boy': 'Nintendo - Game Boy', n64: 'Nintendo - Nintendo 64',
};
function safeName(value: string): string { return value.replace(/[&*/:<>?\\|]/g, '_').trim(); }
export async function findLibretroThumbnail(platform: string | undefined, title: string): Promise<string | null> {
  const playlist = PLATFORM_NAMES[String(platform || '').trim().toLowerCase()];
  const cleanTitle = safeName(title.replace(/\s*[([](?:USA|Europe|Japan|Disc\s*\d+|\w{4,})[^)\]]*[)\]]/gi, ' '));
  if (!playlist || !cleanTitle) return null;
  const key = `${CACHE_PREFIX}${playlist}:${cleanTitle}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;
  const url = `https://thumbnails.libretro.com/${encodeURIComponent(playlist)}/Named_Boxarts/${encodeURIComponent(cleanTitle)}.png`;
  try {
    const response = await fetch(url); if (!response.ok) return null;
    const blob = await response.blob(); if (!blob.type.startsWith('image/')) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    if (dataUrl.length < 650_000) { try { localStorage.setItem(key, dataUrl); } catch { /* cache is optional */ } }
    return dataUrl;
  } catch { return null; }
}
