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

export type FilterTab =
  | 'Início'
  | 'Todos'
  | 'Steam'
  | 'Heroic / Epic'
  | 'Heroic / Epic & GOG'
  | 'GOG'
  | 'Emuladores'
  | 'Favoritos';

export type SortMode = 'recent' | 'az' | 'most-played';

export type ControllerLayout = 'playstation' | 'xbox' | 'nintendo' | 'auto';
export type ResolvedControllerLayout = 'playstation' | 'xbox' | 'nintendo';

export type ThemeId =
  | 'pad2ps-default'
  | 'futuristic'
  | 'horror'
  | 'cute'
  | 'pixel';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  hex: string;
  rgb: string;
  secondaryHex?: string;
  bgDeep: string;
  bgSurface: string;
}

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  platformLabel?: string;
  consoleSystem?: string;
  coverUrl: string;
  command: string;
  hoursPlayed: number;
  favorite: boolean;
  genre?: string;
  lastPlayed?: string;
}

export interface LauncherSettings {
  theme: ThemeId;
  soundEnabled: boolean;
  controllerLayout: ControllerLayout;
  translatorUrl: string;
}

export type ActiveModal =
  | 'none'
  | 'welcome'
  | 'search'
  | 'translator'
  | 'add-game'
  | 'edit-game'
  | 'game-options'
  | 'settings'
  | 'power';

declare global {
  interface Window {
    loadExternalGames?: (input: unknown) => {
      success: boolean;
      count: number;
      message: string;
    };
  }
}
