export type Platform =
  | 'Steam'
  | 'Epic'
  | 'Heroic'
  | 'GOG'
  | 'Xbox'
  | 'Lutris'
  | 'itch.io'
  | 'Emulador'
  | 'Outro';

export type LauncherPage = 'favorites' | 'library' | 'system';

export type LibraryPlatformFilter =
  | 'Todos'
  | 'Android'
  | 'Steam'
  | 'Epic'
  | 'Heroic'
  | 'GOG'
  | 'Xbox'
  | 'Lutris'
  | 'itch.io'
  | 'Emuladores';

export type SystemCategory =
  | 'appearance'
  | 'controller'
  | 'integrations'
  | 'library'
  | 'power';

export type FilterTab =
  | 'Início'
  | 'Todos'
  | 'Steam'
  | 'Epic'
  | 'Heroic'
  | 'GOG'
  | 'Xbox'
  | 'Lutris'
  | 'itch.io'
  | 'Emuladores'
  | 'Favoritos';

export type SortMode = 'recent' | 'az' | 'most-played';

export type ControllerLayout = 'playstation' | 'xbox' | 'nintendo' | 'auto';
export type ResolvedControllerLayout = 'playstation' | 'xbox' | 'nintendo';

export type RemappableAction =
  | 'confirm'
  | 'cancel'
  | 'options'
  | 'favorite'
  | 'prevTab'
  | 'nextTab'
  | 'translator';

export type GamepadButtonMapping = Record<RemappableAction, number>;

export type ThemeId =
  | 'pad2ps-default'
  | 'futuristic'
  | 'horror'
  | 'cute'
  | 'pixel'
  | 'ps2-classic'
  | 'synthwave'
  | 'clean-light'
  | 'emerald-matrix'
  | 'custom';

export type CustomBorderRadiusPreset = 'default' | 'cute' | 'tech' | 'pixel';
export type CustomFontPreset = 'outfit' | 'jetbrains' | 'cinzel' | 'silkscreen';
export type CustomSoundPreset =
  | 'pad2ps-default'
  | 'futuristic'
  | 'cute'
  | 'pixel'
  | 'horror';

export interface CustomThemeConfig {
  accentHex: string;
  bgDeep: string;
  borderRadius: CustomBorderRadiusPreset;
  fontPreset: CustomFontPreset;
  soundPreset: CustomSoundPreset;
}

export type ScreensaverMode =
  | 'minimal'
  | 'library-slideshow'
  | 'custom-image';

export type IdleTimeoutMinutes = 0 | 5 | 10 | 15 | 30 | 60;

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  hex: string;
  rgb: string;
  secondaryHex?: string;
  bgDeep: string;
  bgSurface: string;
  isLight?: boolean;
}

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  platformLabel?: string;
  consoleSystem?: string;
  coverUrl: string;
  isCustomCover?: boolean;
  isAutomaticCoverFallback?: boolean;
  retroGameId?: number;
  command: string;
  hoursPlayed: number;
  favorite: boolean;
  genre?: string;
  lastPlayed?: string;
}

export interface SteamSyncData {
  steamId: string;
  profile: { name: string; avatar: string; profileUrl: string };
  privateProfile: boolean;
  games: Array<{ appId: number; name: string; playtimeForever: number; playtimeTwoWeeks: number }>;
  recentIds: number[];
}

export interface LauncherSettings {
  theme: ThemeId;
  customThemeConfig: CustomThemeConfig;
  soundEnabled: boolean;
  controllerLayout: ControllerLayout;
  translatorUrl: string;
  idleTimeoutMinutes: IdleTimeoutMinutes;
  screensaverMode: ScreensaverMode;
  screensaverCustomImage: string;
}

export type ActiveModal =
  | 'none'
  | 'welcome'
  | 'search'
  | 'translator'
  | 'add-game'
  | 'edit-game'
  | 'game-options'
  | 'cover-finder';

declare global {
  interface Window {
    loadExternalGames?: (input: unknown) => {
      success: boolean;
      count: number;
      message: string;
    };
  }
}
