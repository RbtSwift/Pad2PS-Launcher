import { CustomThemeConfig, FilterTab, Game, ThemeConfig } from '../types';

export const DEFAULT_TRANSLATOR_URL = 'https://pad2ps.vercel.app';

export const DEFAULT_CUSTOM_THEME_CONFIG: CustomThemeConfig = {
  accentHex: '#FF2E93',
  bgDeep: '#0B0B0F',
  borderRadius: 'default',
  fontPreset: 'outfit',
  soundPreset: 'pad2ps-default',
};

export function hexToRgbString(hex: string): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return '255, 46, 147';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function isLightHexColor(hex: string): boolean {
  const [r, g, b] = hexToRgbString(hex)
    .split(',')
    .map((v) => Number(v.trim()));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'pad2ps-default',
    name: 'Pad2PS Padrão',
    subtitle: 'Neon Pink & Vidro Escuro',
    hex: '#FF2E93',
    rgb: '255, 46, 147',
    bgDeep: '#0B0B0F',
    bgSurface: '#121218',
  },
  {
    id: 'futuristic',
    name: 'Futurista Cyber',
    subtitle: 'Grade HUD & Cyber Cyan',
    hex: '#00F0FF',
    rgb: '0, 240, 255',
    bgDeep: '#040A12',
    bgSurface: '#091422',
  },
  {
    id: 'horror',
    name: 'Terror / Survival',
    subtitle: 'Vinheta Sombria & Carmesim',
    hex: '#DC2626',
    rgb: '220, 38, 38',
    bgDeep: '#070607',
    bgSurface: '#120D0E',
  },
  {
    id: 'cute',
    name: 'Fofo / Cozy',
    subtitle: 'Rosa Pastel & Lilás Suave',
    hex: '#F472B6',
    rgb: '244, 114, 182',
    secondaryHex: '#C084FC',
    bgDeep: '#191326',
    bgSurface: '#241B35',
  },
  {
    id: 'pixel',
    name: 'Pixel Art 16-Bit',
    subtitle: 'Retrô Arcade & Chiptune',
    hex: '#FF8906',
    rgb: '255, 137, 6',
    bgDeep: '#0F0E17',
    bgSurface: '#1A1828',
  },
  {
    id: 'ps2-classic',
    name: 'PS2 Nostalgia',
    subtitle: 'Azul Elétrico & Brilho Cristalino',
    hex: '#0070D1',
    rgb: '0, 112, 209',
    secondaryHex: '#38BDF8',
    bgDeep: '#050914',
    bgSurface: '#0C1428',
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s',
    subtitle: 'Laranja Neon & Magenta Analógico',
    hex: '#FF6B00',
    rgb: '255, 107, 0',
    secondaryHex: '#FF2E93',
    bgDeep: '#12071F',
    bgSurface: '#1C0D30',
  },
  {
    id: 'clean-light',
    name: 'Console Claro / Dia',
    subtitle: 'Branco Puro & Azul Cobalto',
    hex: '#2563EB',
    rgb: '37, 99, 235',
    bgDeep: '#EEF2F6',
    bgSurface: '#FFFFFF',
    isLight: true,
  },
  {
    id: 'emerald-matrix',
    name: 'Terminal Esmeralda',
    subtitle: 'Verde Neon & JetBrains Mono',
    hex: '#00FF88',
    rgb: '0, 255, 136',
    bgDeep: '#040D08',
    bgSurface: '#091A11',
  },
  {
    id: 'custom',
    name: 'Meu Tema Personalizado',
    subtitle: 'Crie cores, bordas, fonte e áudio próprios',
    hex: '#FF2E93',
    rgb: '255, 46, 147',
    secondaryHex: '#00F0FF',
    bgDeep: '#0B0B0F',
    bgSurface: '#121218',
  },
];

export const FILTER_TABS: FilterTab[] = [
  'Todos',
  'Steam',
  'Epic',
  'Heroic',
  'GOG',
  'Xbox',
  'Lutris',
  'itch.io',
  'Emuladores',
  'Favoritos',
];

// Library starts empty: imported, scanned and manually added titles are the only entries.
export const DEFAULT_GAMES: Game[] = [];
