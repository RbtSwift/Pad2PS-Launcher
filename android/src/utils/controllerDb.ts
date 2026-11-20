const DB_CACHE_KEY = 'pad2ps_sdl_controller_db_v1';
const DB_URL = 'https://raw.githubusercontent.com/mdqinc/SDL_GameControllerDB/master/gamecontrollerdb.txt';

let mappings: string[] | null = null;

async function loadDatabase(): Promise<string[]> {
  if (mappings) return mappings;
  try {
    const cached = localStorage.getItem(DB_CACHE_KEY);
    if (cached) mappings = JSON.parse(cached) as string[];
  } catch {}
  try {
    const response = await fetch('/gamecontrollerdb.txt');
    if (response.ok) mappings = (await response.text()).split(/\r?\n/);
  } catch {}
  if (!mappings?.length) mappings = [];
  void fetch(DB_URL).then((response) => response.ok ? response.text() : '').then((body) => {
    if (!body) return;
    const lines = body.split(/\r?\n/);
    mappings = lines;
    try { localStorage.setItem(DB_CACHE_KEY, JSON.stringify(lines)); } catch {}
  }).catch(() => {});
  return mappings;
}

function vendorProduct(id: string): { vendor: string; product: string } | null {
  const vendor = id.match(/vendor\s*[:=]\s*([0-9a-f]{4})/i)?.[1];
  const product = id.match(/product\s*[:=]\s*([0-9a-f]{4})/i)?.[1];
  return vendor && product ? { vendor: vendor.toLowerCase(), product: product.toLowerCase() } : null;
}

export async function identifyController(rawId: string): Promise<{ name: string; mapping?: string }> {
  const normalized = rawId.trim();
  const ids = vendorProduct(normalized);
  const lines = await loadDatabase();
  if (ids) {
    const reverseBytes = (value: string) => value.match(/../g)?.reverse().join('') || value;
    const candidates = [ids.vendor + ids.product, reverseBytes(ids.vendor) + reverseBytes(ids.product)];
    for (const line of lines) {
      const [guid, name] = line.split(',', 3);
      if (!guid || !name || line.startsWith('#')) continue;
      if (candidates.some((candidate) => guid.toLowerCase().includes(candidate))) return { name, mapping: line };
    }
  }
  return { name: normalized.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Controle conectado' };
}
