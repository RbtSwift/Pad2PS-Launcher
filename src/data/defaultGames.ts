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

export const DEFAULT_GAMES: Game[] = [
  {
    id: 'cyber-drift-2099',
    title: 'Cyber Drift 2099',
    platform: 'Steam',
    platformLabel: 'Steam',
    coverUrl: '/src/assets/images/cover_cyber_drift_1794945407092.jpg',
    command: 'steam://rungameid/1091500',
    hoursPlayed: 142.5,
    favorite: true,
    genre: 'Corrida / Cyberpunk',
    lastPlayed: 'Hoje',
  },
  {
    id: 'elden-spire-shadowfall',
    title: 'Elden Spire: Shadowfall',
    platform: 'Steam',
    platformLabel: 'Steam',
    coverUrl: '/src/assets/images/cover_elden_spire_1794945408043.jpg',
    command: 'steam://rungameid/1245620',
    hoursPlayed: 88.2,
    favorite: true,
    genre: 'RPG de Ação',
    lastPlayed: 'Ontem',
  },
  {
    id: 'neon-odyssey-zero',
    title: 'Neon Odyssey: Zero',
    platform: 'Epic',
    platformLabel: 'Epic Games',
    coverUrl: '/src/assets/images/cover_neon_odyssey_1794945407219.jpg',
    command: 'heroic://launch/epic/neon-odyssey-zero',
    hoursPlayed: 34.0,
    favorite: false,
    genre: 'Aventura Sci-Fi',
    lastPlayed: 'Há 3 dias',
  },
  {
    id: 'chronicles-of-valoria',
    title: 'Chronicles of Valoria',
    platform: 'GOG',
    platformLabel: 'GOG Galaxy',
    coverUrl: '/src/assets/images/cover_valoria_chronicles_1794945408165.jpg',
    command: '"/opt/gog/valoria/start.sh"',
    hoursPlayed: 61.8,
    favorite: true,
    genre: 'RPG Clássico',
    lastPlayed: 'Há 5 dias',
  },
  {
    id: 'apex-horizon-motorsport',
    title: 'Apex Horizon Motorsport',
    platform: 'Xbox',
    platformLabel: 'Xbox PC',
    coverUrl: '/src/assets/images/cover_apex_motorsport_1794945408996.jpg',
    command: 'explorer.exe shell:AppsFolder\\Microsoft.ApexHorizon!Game',
    hoursPlayed: 47.4,
    favorite: false,
    genre: 'Simulador de Corrida',
    lastPlayed: 'Semana passada',
  },
  {
    id: 'shadow-of-the-colossus-ps2',
    title: 'Shadow of the Colossus',
    platform: 'Emulador',
    platformLabel: 'PCSX2 · PS2',
    consoleSystem: 'PS2',
    coverUrl: '/src/assets/images/cover_colossus_ps2_1794945409617.jpg',
    command: 'pcsx2-qt -fullscreen "/roms/ps2/ShadowOfTheColossus.iso"',
    hoursPlayed: 29.6,
    favorite: true,
    genre: 'Ação / Aventura PS2',
    lastPlayed: 'Há 2 dias',
  },
  {
    id: 'gran-turismo-4-spec',
    title: 'Gran Turismo 4 Spec II',
    platform: 'Emulador',
    platformLabel: 'PCSX2 · PS2',
    consoleSystem: 'PS2',
    coverUrl: '/src/assets/images/cover_gt4_ps2_1794945410067.jpg',
    command: 'pcsx2-qt -fullscreen "/roms/ps2/GranTurismo4.iso"',
    hoursPlayed: 115.0,
    favorite: false,
    genre: 'Automobilismo PS2',
    lastPlayed: 'Há 1 semana',
  },
  {
    id: 'starlight-tactics',
    title: 'Starlight Tactics',
    platform: 'Heroic',
    platformLabel: 'Heroic',
    coverUrl: '/src/assets/images/cover_starlight_tactics_1794945409733.jpg',
    command: 'heroic://launch/gog/starlight-tactics',
    hoursPlayed: 19.3,
    favorite: false,
    genre: 'Estratégia Tática',
    lastPlayed: 'Este mês',
  },
];
