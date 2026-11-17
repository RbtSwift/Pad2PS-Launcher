export type Platform =
  | 'Steam'
  | 'Epic'
  | 'Heroic'
  | 'GOG'
  | 'Xbox'
  | 'Emulador'
  | 'Outro';

export type FilterTab =
  | 'Todos'
  | 'Steam'
  | 'Heroic / Epic'
  | 'GOG'
  | 'Emuladores'
  | 'Favoritos';

export type ThemeId =
  | 'neon-pink'
  | 'ps2-blue'
  | 'cyber-cyan'
  | 'matrix-green';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  hex: string;
  rgb: string;
}

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  platformLabel?: string;
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
}

export type ActiveModal =
  | 'none'
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
