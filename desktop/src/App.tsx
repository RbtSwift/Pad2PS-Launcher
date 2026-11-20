import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControllerLayoutProvider } from './components/ControllerIcons';
import { CoverFinderHandle, CoverFinderModal } from './components/CoverFinderModal';
import { FooterLegend } from './components/FooterLegend';
import {
  GameCarousel,
  LIBRARY_PLATFORM_FILTERS,
} from './components/GameCarousel';
import { GameFormModal } from './components/GameFormModal';
import { GameOptionsModal } from './components/GameOptionsModal';
import { HeroBackdrop } from './components/HeroBackdrop';
import { LaunchOverlay } from './components/LaunchOverlay';
import { PageSwitcherPill } from './components/PageSwitcherPill';
import {
  QuickSearchModal,
  QuickSearchModalHandle,
} from './components/QuickSearchModal';
import { ScreensaverOverlay } from './components/ScreensaverOverlay';
import { SystemView, SystemViewHandle } from './components/SystemView';
import { TopBar } from './components/TopBar';
import { TranslatorModal } from './components/TranslatorModal';
import { UpdateModal } from './components/UpdateModal';
import { ControllerTestModal } from './components/ControllerTestModal';
import { checkForAppUpdate, type UpdateCheckResult } from './utils/updateChecker';
import {
  WelcomeControllerModal,
  WelcomeControllerModalHandle,
} from './components/WelcomeControllerModal';
import {
  DEFAULT_CUSTOM_THEME_CONFIG,
  DEFAULT_GAMES,
  DEFAULT_TRANSLATOR_URL,
  hexToRgbString,
  isLightHexColor,
  THEMES,
} from './data/defaultGames';
import {
  detectGamepadLayout,
  resolveControllerLayout,
  useGamepadNavigation,
} from './hooks/useGamepadNavigation';
import {
  ActiveModal,
  ControllerLayout,
  CustomBorderRadiusPreset,
  CustomFontPreset,
  CustomSoundPreset,
  CustomThemeConfig,
  Game,
  GamepadButtonMapping,
  IdleTimeoutMinutes,
  LauncherPage,
  LauncherSettings,
  LibraryPlatformFilter,
  RemappableAction,
  ResolvedControllerLayout,
  ScreensaverMode,
  SystemCategory,
  SteamSyncData,
  ThemeId,
} from './types';
import {
  DEFAULT_BUTTON_MAPPING,
  formatGamepadButtonName,
  loadStoredButtonMapping,
  REMAPPABLE_ACTIONS_META,
  saveStoredButtonMapping,
} from './utils/gamepadMapping';
import { soundEngine } from './utils/sound';
import { extractSteamAppId, findAutomaticSteamGridDbCover } from './utils/coverSearch';

const GAMES_STORAGE_KEY = 'pad2ps_launcher_games_v1';
const SETTINGS_STORAGE_KEY = 'pad2ps_launcher_settings_v1';
const ONBOARDED_STORAGE_KEY = 'pad2ps_launcher_onboarded_v1';

function mergeExternalGames(previous: Game[], scanned: Game[]): Game[] {
  const matched = new Set<string>();
  const updated = scanned.map((incoming) => {
    const saved = previous.find((game) => game.id === incoming.id ||
      (game.platformLabel === 'Android' && incoming.platformLabel === 'Android' && game.command === incoming.command));
    if (!saved) return incoming;
    matched.add(saved.id);
    const sameAndroidIcon = incoming.isAutomaticCoverFallback && saved.coverUrl === incoming.coverUrl;
    const savedIsFallback = Boolean(saved.isAutomaticCoverFallback || sameAndroidIcon);
    const keepSavedCover = Boolean(saved.coverUrl?.trim()) && !savedIsFallback;
    return {
      ...incoming,
      ...saved,
      title: incoming.title,
      platform: incoming.platform,
      platformLabel: incoming.platformLabel,
      command: incoming.command,
      coverUrl: saved.isCustomCover || keepSavedCover ? saved.coverUrl : incoming.coverUrl,
      isCustomCover: Boolean(saved.isCustomCover || incoming.isCustomCover),
      isAutomaticCoverFallback: saved.isCustomCover || keepSavedCover ? false : incoming.isAutomaticCoverFallback,
      favorite: Boolean(saved.favorite || incoming.favorite),
      hoursPlayed: saved.hoursPlayed,
      lastPlayed: saved.lastPlayed ?? incoming.lastPlayed,
      steamAppId: incoming.steamAppId ?? saved.steamAppId,
      steamInstalled: incoming.steamInstalled ?? saved.steamInstalled,
      steamRemote: incoming.steamRemote ?? saved.steamRemote,
      steamPlaytimeHours: incoming.steamPlaytimeHours ?? saved.steamPlaytimeHours,
      steamRecentHours: incoming.steamRecentHours ?? saved.steamRecentHours,
      steamRecentlyPlayed: incoming.steamRecentlyPlayed ?? saved.steamRecentlyPlayed,
      steamHeroUrl: incoming.steamHeroUrl ?? saved.steamHeroUrl,
      steamLogoUrl: incoming.steamLogoUrl ?? saved.steamLogoUrl,
    };
  });
  return [...updated, ...previous.filter((game) => !matched.has(game.id) && !scanned.some((incoming) => incoming.id === game.id))];
}

const PAGE_ORDER: LauncherPage[] = ['favorites', 'library', 'system'];
const VALID_THEME_IDS: ThemeId[] = [
  'pad2ps-default',
  'futuristic',
  'horror',
  'cute',
  'pixel',
  'ps2-classic',
  'synthwave',
  'clean-light',
  'emerald-matrix',
  'custom',
];

const VALID_CUSTOM_RADII: CustomBorderRadiusPreset[] = [
  'default',
  'cute',
  'tech',
  'pixel',
];
const VALID_CUSTOM_FONTS: CustomFontPreset[] = [
  'outfit',
  'jetbrains',
  'cinzel',
  'silkscreen',
];
const VALID_CUSTOM_SOUNDS: CustomSoundPreset[] = [
  'pad2ps-default',
  'futuristic',
  'cute',
  'pixel',
  'horror',
];

const CUSTOM_THEME_CSS_VARS = [
  '--bg-deep',
  '--bg-surface',
  '--border-subtle',
  '--text-primary',
  '--text-secondary',
  '--accent',
  '--accent-rgb',
  '--accent-secondary',
  '--panel-radius',
  '--card-radius',
  '--btn-radius',
  '--font-display',
  '--panel-border-width',
  '--panel-shadow',
  '--accent-glow',
  '--accent-glow-strong',
] as const;

const CUSTOM_RADIUS_MAP: Record<
  CustomBorderRadiusPreset,
  { panel: string; card: string; btn: string; borderWidth: string }
> = {
  default: { panel: '1rem', card: '1rem', btn: '0.75rem', borderWidth: '1px' },
  cute: { panel: '1.5rem', card: '1.5rem', btn: '1.25rem', borderWidth: '1.5px' },
  tech: { panel: '0.5rem', card: '0.5rem', btn: '0.5rem', borderWidth: '1px' },
  pixel: { panel: '0px', card: '0px', btn: '0px', borderWidth: '2px' },
};

const CUSTOM_FONT_MAP: Record<CustomFontPreset, string> = {
  outfit: "'Outfit', system-ui, -apple-system, sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
  cinzel: "'Cinzel', Georgia, serif",
  silkscreen: "'Silkscreen', 'JetBrains Mono', monospace",
};

function normalizeHex(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
    return raw.trim();
  }
  return fallback;
}

function sanitizeCustomThemeConfig(raw: unknown): CustomThemeConfig {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    accentHex: normalizeHex(obj.accentHex, DEFAULT_CUSTOM_THEME_CONFIG.accentHex),
    bgDeep: normalizeHex(obj.bgDeep, DEFAULT_CUSTOM_THEME_CONFIG.bgDeep),
    borderRadius: VALID_CUSTOM_RADII.includes(
      obj.borderRadius as CustomBorderRadiusPreset
    )
      ? (obj.borderRadius as CustomBorderRadiusPreset)
      : DEFAULT_CUSTOM_THEME_CONFIG.borderRadius,
    fontPreset: VALID_CUSTOM_FONTS.includes(obj.fontPreset as CustomFontPreset)
      ? (obj.fontPreset as CustomFontPreset)
      : DEFAULT_CUSTOM_THEME_CONFIG.fontPreset,
    soundPreset: VALID_CUSTOM_SOUNDS.includes(
      obj.soundPreset as CustomSoundPreset
    )
      ? (obj.soundPreset as CustomSoundPreset)
      : DEFAULT_CUSTOM_THEME_CONFIG.soundPreset,
  };
}

function normalizeThemeId(raw: unknown): ThemeId {
  if (typeof raw === 'string') {
    if (VALID_THEME_IDS.includes(raw as ThemeId)) {
      return raw as ThemeId;
    }
    if (raw === 'ps2-blue') return 'ps2-classic';
    if (raw === 'cyber-cyan') return 'futuristic';
  }
  return 'pad2ps-default';
}

function loadStoredGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_STORAGE_KEY);
    if (!raw) return DEFAULT_GAMES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_GAMES;
}

const VALID_IDLE_TIMEOUTS: IdleTimeoutMinutes[] = [0, 5, 10, 15, 30, 60];
const VALID_SCREENSAVER_MODES: ScreensaverMode[] = [
  'minimal',
  'library-slideshow',
  'custom-image',
];

function loadStoredSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawTimeout = Number(parsed.idleTimeoutMinutes);
      const idleTimeoutMinutes: IdleTimeoutMinutes = VALID_IDLE_TIMEOUTS.includes(
        rawTimeout as IdleTimeoutMinutes
      )
        ? (rawTimeout as IdleTimeoutMinutes)
        : 15;
      const screensaverMode: ScreensaverMode = VALID_SCREENSAVER_MODES.includes(
        parsed.screensaverMode as ScreensaverMode
      )
        ? (parsed.screensaverMode as ScreensaverMode)
        : 'minimal';

      return {
        theme: normalizeThemeId(parsed.theme),
        customThemeConfig: sanitizeCustomThemeConfig(parsed.customThemeConfig),
        soundEnabled:
          typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
        controllerLayout: parsed.controllerLayout || 'auto',
        translatorUrl:
          typeof parsed.translatorUrl === 'string' && parsed.translatorUrl.trim()
            ? parsed.translatorUrl.trim()
            : DEFAULT_TRANSLATOR_URL,
        idleTimeoutMinutes,
        screensaverMode,
        screensaverCustomImage:
          typeof parsed.screensaverCustomImage === 'string'
            ? parsed.screensaverCustomImage
            : '',
      };
    }
  } catch {
    // fallback
  }
  return {
    theme: 'pad2ps-default',
    customThemeConfig: { ...DEFAULT_CUSTOM_THEME_CONFIG },
    soundEnabled: true,
    controllerLayout: 'auto',
    translatorUrl: DEFAULT_TRANSLATOR_URL,
    idleTimeoutMinutes: 15,
    screensaverMode: 'minimal',
    screensaverCustomImage: '',
  };
}

function getInitialModal(): ActiveModal {
  try {
    if (!localStorage.getItem(ONBOARDED_STORAGE_KEY)) {
      return 'welcome';
    }
  } catch {
    // ignore
  }
  return 'none';
}

function matchesPlatformFilter(
  game: Game,
  filter: LibraryPlatformFilter
): boolean {
  switch (filter) {
    case 'Todos':
      return true;
    case 'Steam':
      return game.platform === 'Steam';
    case 'Epic':
      return game.platform === 'Epic';
    case 'Heroic':
      return game.platform === 'Heroic';
    case 'GOG':
      return game.platform === 'GOG';
    case 'Xbox':
      return game.platform === 'Xbox';
    case 'Lutris':
      return game.platform === 'Lutris';
    case 'itch.io':
      return game.platform === 'itch.io';
    case 'Emuladores':
      return game.platform === 'Emulador';
    default:
      return true;
  }
}

export default function App() {
  const connectedGamepadRef = useRef<string | null>(null);
  const [games, setGames] = useState<Game[]>(loadStoredGames);
  const [settings, setSettings] = useState<LauncherSettings>(loadStoredSettings);

  // Page 2 (Biblioteca de Jogos) is the initial home page
  const [activePage, setActivePage] = useState<LauncherPage>('library');
  const [systemCategory, setSystemCategory] =
    useState<SystemCategory>('appearance');
  const [platformFilter, setPlatformFilter] =
    useState<LibraryPlatformFilter>('Todos');
  const [libraryFocusZone, setLibraryFocusZone] = useState<'games' | 'filters'>(
    'games'
  );
  const [focusedFilterIndex, setFocusedFilterIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [activeModal, setActiveModal] = useState<ActiveModal>(getInitialModal);
  const [isFormCoverFinderOpen, setIsFormCoverFinderOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null);
  const [modalFocusIndex, setModalFocusIndex] = useState<number>(0);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    checkForAppUpdate('RbtSwift/Pad2PS-Launcher', '1.0.14')
      .then((res) => {
        if (isMounted && res.hasUpdate) {
          setUpdateInfo(res);
          setIsUpdateModalOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const [buttonMapping, setButtonMapping] = useState<GamepadButtonMapping>(
    loadStoredButtonMapping
  );
  const [capturingAction, setCapturingAction] =
    useState<RemappableAction | null>(null);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const systemViewRef = useRef<SystemViewHandle | null>(null);
  const welcomeModalRef = useRef<WelcomeControllerModalHandle | null>(null);
  const coverFinderRef = useRef<CoverFinderHandle | null>(null);
  const quickSearchRef = useRef<QuickSearchModalHandle | null>(null);
  const resolvedLayoutRef = useRef<ResolvedControllerLayout>('xbox');

  // Persist games to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    } catch {
      // ignore quota errors
    }
  }, [games]);

  // Fill missing covers in the background, with at most three SteamGridDB lookups at once.
  useEffect(() => {
    let cancelled = false;
    const pending = games.filter((game) => (!game.coverUrl?.trim() || game.isAutomaticCoverFallback) && !game.isCustomCover);
    if (!pending.length) return;
    void (async () => {
      const covers = new Map<string, string>();
      let cursor = 0;
      const worker = async () => {
        while (!cancelled) {
          const game = pending[cursor++];
          if (!game) return;
          const cover = await findAutomaticSteamGridDbCover(game.title);
          if (cover) covers.set(game.id, cover);
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
      if (!cancelled && covers.size) {
        setGames((current) => current.map((game) => {
          const cover = covers.get(game.id);
          return cover && (!game.coverUrl?.trim() || game.isAutomaticCoverFallback) && !game.isCustomCover
            ? { ...game, coverUrl: cover, isCustomCover: false, isAutomaticCoverFallback: false }
            : game;
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [games]);

  // Persist button mapping to localStorage
  useEffect(() => {
    saveStoredButtonMapping(buttonMapping);
  }, [buttonMapping]);

  // Auto-clear capture message after 4.5s
  useEffect(() => {
    if (!captureMessage) return;
    const timer = window.setTimeout(() => setCaptureMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [captureMessage]);

  // Persist settings, apply data-theme + CSS variables, and sync soundEngine theme
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }

    const theme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];
    const root = document.documentElement;
    root.dataset.theme = theme.id;

    if (theme.id === 'custom') {
      const cfg = settings.customThemeConfig;
      const accentRgb = hexToRgbString(cfg.accentHex);
      const isLightBg = isLightHexColor(cfg.bgDeep);
      const radius = CUSTOM_RADIUS_MAP[cfg.borderRadius];
      const font = CUSTOM_FONT_MAP[cfg.fontPreset];
      const isPixel = cfg.borderRadius === 'pixel';

      root.style.setProperty('--bg-deep', cfg.bgDeep);
      root.style.setProperty(
        '--bg-surface',
        isLightBg ? '#FFFFFF' : `color-mix(in srgb, ${cfg.bgDeep} 90%, #ffffff)`
      );
      root.style.setProperty(
        '--border-subtle',
        isLightBg ? '#CBD5E1' : `color-mix(in srgb, ${cfg.bgDeep} 76%, #ffffff)`
      );
      root.style.setProperty(
        '--text-primary',
        isLightBg ? '#0F172A' : '#F4F4F6'
      );
      root.style.setProperty(
        '--text-secondary',
        isLightBg ? '#475569' : '#94A3B8'
      );
      root.style.setProperty('--accent', cfg.accentHex);
      root.style.setProperty('--accent-rgb', accentRgb);
      root.style.setProperty('--accent-secondary', cfg.accentHex);
      root.style.setProperty('--panel-radius', radius.panel);
      root.style.setProperty('--card-radius', radius.card);
      root.style.setProperty('--btn-radius', radius.btn);
      root.style.setProperty('--font-display', font);
      root.style.setProperty('--panel-border-width', radius.borderWidth);
      root.style.setProperty(
        '--panel-shadow',
        isPixel
          ? '4px 4px 0px #000000'
          : isLightBg
          ? '0 18px 42px -12px rgba(15, 23, 42, 0.14)'
          : '0 24px 60px -15px rgba(0, 0, 0, 0.75)'
      );
      root.style.setProperty(
        '--accent-glow',
        isPixel
          ? '4px 4px 0px #000000'
          : `0 0 22px rgba(${accentRgb}, ${isLightBg ? '0.32' : '0.48'})`
      );
      root.style.setProperty(
        '--accent-glow-strong',
        isPixel
          ? `4px 4px 0px #000000, 0 0 18px rgba(${accentRgb}, 0.4)`
          : `0 0 36px rgba(${accentRgb}, ${isLightBg ? '0.45' : '0.68'})`
      );
    } else {
      CUSTOM_THEME_CSS_VARS.forEach((prop) => {
        root.style.removeProperty(prop);
      });
    }

    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setTheme(theme.id);
    soundEngine.setCustomSoundPreset(settings.customThemeConfig.soundPreset);
  }, [settings]);

  // Gera cursor fofinho arredondado dinâmico conforme o tema ativo
  useEffect(() => {
    const root = document.documentElement;
    const themeId = settings.theme;
    const themeObj = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
    const accent =
      themeId === 'custom' ? settings.customThemeConfig.accentHex : themeObj.hex;
    const isLight =
      themeId === 'clean-light' ||
      (themeId === 'custom' &&
        settings.customThemeConfig.bgDeep.toLowerCase() === '#eef2f6');
    const fillBase = isLight ? '#FFFFFF' : '#0E1018';
    const hoverStroke = isLight ? '#0F172A' : '#FFFFFF';

    let defaultSvg = '';
    let pointerSvg = '';

    if (themeId === 'pixel') {
      defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 16 16'><path d='M2 1h2v2h2v2h2v2h2v2h2v2H8v3H6v-3H4v2H2V1z' fill='${fillBase}' stroke='${accent}' stroke-width='1.2' shape-rendering='crispEdges'/></svg>`;
      pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 16 16'><path d='M2 1h2v2h2v2h2v2h2v2h2v2H8v3H6v-3H4v2H2V1z' fill='${accent}' stroke='${hoverStroke}' stroke-width='1.2' shape-rendering='crispEdges'/></svg>`;
    } else {
      // Seta fofinha bem arredondada (curvas suaves + ponta doce)
      defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M5.5 4.2 C5.5 2.7 7.2 1.9 8.4 2.9 L21.6 13.4 C22.9 14.4 22.3 16.5 20.6 16.7 L14.4 17.4 L17.1 22.8 C17.7 24.0 17.2 25.4 16.0 25.9 C14.8 26.5 13.4 26.0 12.8 24.8 L10.1 19.3 L6.8 22.9 C5.7 24.1 3.7 23.3 3.7 21.7 Z' fill='${fillBase}' stroke='${accent}' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
      pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M5.5 4.2 C5.5 2.7 7.2 1.9 8.4 2.9 L21.6 13.4 C22.9 14.4 22.3 16.5 20.6 16.7 L14.4 17.4 L17.1 22.8 C17.7 24.0 17.2 25.4 16.0 25.9 C14.8 26.5 13.4 26.0 12.8 24.8 L10.1 19.3 L6.8 22.9 C5.7 24.1 3.7 23.3 3.7 21.7 Z' fill='${accent}' stroke='${hoverStroke}' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
    }

    root.style.setProperty(
      '--pad2ps-cursor-default',
      `url("data:image/svg+xml;utf8,${encodeURIComponent(defaultSvg)}") 5 3, auto`
    );
    root.style.setProperty(
      '--pad2ps-cursor-pointer',
      `url("data:image/svg+xml;utf8,${encodeURIComponent(pointerSvg)}") 5 3, pointer`
    );
  }, [settings.theme, settings.customThemeConfig.accentHex, settings.customThemeConfig.bgDeep]);

  // Auto-oculta a seta do mouse após 2.5s parado (estilo console)
  useEffect(() => {
    let hideTimer: number | undefined;
    const root = document.documentElement;

    const showAndScheduleHide = () => {
      root.classList.remove('pad2ps-cursor-hidden');
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        root.classList.add('pad2ps-cursor-hidden');
      }, 2500);
    };

    showAndScheduleHide();
    window.addEventListener('mousemove', showAndScheduleHide, { passive: true });
    window.addEventListener('mousedown', showAndScheduleHide, { passive: true });

    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      window.removeEventListener('mousemove', showAndScheduleHide);
      window.removeEventListener('mousedown', showAndScheduleHide);
      root.classList.remove('pad2ps-cursor-hidden');
    };
  }, []);

  useEffect(() => {
    fetch('/api/games')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.games?.length && window.loadExternalGames) {
          window.loadExternalGames(data.games);
        }
      })
      .catch(() => {});
  }, []);

  // Register global WebView / Python bridge: window.loadExternalGames(json)
  useEffect(() => {
    window.loadExternalGames = (input: unknown) => {
      try {
        const parsed =
          typeof input === 'string' ? JSON.parse(input) : input;
        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray((parsed as { games?: unknown[] })?.games)
          ? (parsed as { games: unknown[] }).games
          : null;

        if (!rawList) {
          return {
            success: false,
            count: 0,
            message:
              'Formato inválido: esperado array de jogos ou { games: [] }.',
          };
        }

        const sanitized: Game[] = rawList
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof (item as Record<string, unknown>).title === 'string'
          )
          .map((item, idx) => ({
            id: String(item.id || `ext-${Date.now()}-${idx}`),
            title: String(item.title),
            platform: (item.platform as Game['platform']) || 'Outro',
            platformLabel: item.platformLabel
              ? String(item.platformLabel)
              : String(item.platform || 'Outro'),
            consoleSystem: item.consoleSystem
              ? String(item.consoleSystem)
              : undefined,
            coverUrl: String(item.coverUrl || ''),
            isCustomCover: Boolean(item.isCustomCover),
            isAutomaticCoverFallback: Boolean(item.isAutomaticCoverFallback),
            command: String(item.command || ''),
            steamAppId: Number(item.steamAppId || extractSteamAppId(String(item.command || ''))) || undefined,
            steamInstalled: Boolean(item.steamInstalled || ((item.platform as string) === 'Steam' && /^steam:\/\/rungameid\/\d+/i.test(String(item.command || '')))),
            steamRemote: Boolean(item.steamRemote),
            steamPlaytimeHours: Number(item.steamPlaytimeHours) || undefined,
            steamRecentHours: Number(item.steamRecentHours) || undefined,
            steamRecentlyPlayed: Boolean(item.steamRecentlyPlayed),
            steamHeroUrl: item.steamHeroUrl ? String(item.steamHeroUrl) : undefined,
            steamLogoUrl: item.steamLogoUrl ? String(item.steamLogoUrl) : undefined,
            hoursPlayed: Number(item.hoursPlayed) || 0,
            favorite: Boolean(item.favorite),
            genre: item.genre ? String(item.genre) : undefined,
            lastPlayed: item.lastPlayed ? String(item.lastPlayed) : undefined,
          }));

        setGames((previous) => mergeExternalGames(previous, sanitized));
        setActivePage('library');
        setPlatformFilter('Todos');
        setFocusedFilterIndex(0);
        setLibraryFocusZone('games');
        setSelectedIndex(0);

        return {
          success: true,
          count: sanitized.length,
          message: `${sanitized.length} jogos carregados no Pad2PS Launcher.`,
        };
      } catch (err) {
        return {
          success: false,
          count: 0,
          message:
            err instanceof Error ? err.message : 'Erro ao processar JSON.',
        };
      }
    };

    return () => {
      delete window.loadExternalGames;
    };
  }, []);

  const visibleGames = useMemo(() => {
    if (activePage === 'favorites') {
      return games.filter((g) => g.favorite);
    }
    if (activePage === 'library') {
      return games.filter((g) => matchesPlatformFilter(g, platformFilter));
    }
    return games;
  }, [games, activePage, platformFilter]);

  const maxCarouselSlots =
    activePage === 'library'
      ? visibleGames.length + 1
      : visibleGames.length;

  useEffect(() => {
    if (maxCarouselSlots === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= maxCarouselSlots) {
      setSelectedIndex(maxCarouselSlots - 1);
    }
  }, [maxCarouselSlots, selectedIndex]);

  const selectedGame =
    activePage === 'system'
      ? games[0] ?? null
      : visibleGames[selectedIndex] ?? null;

  const backdropGame =
    selectedGame ?? visibleGames[0] ?? games[0] ?? null;

  const handleSelectPage = useCallback((page: LauncherPage) => {
    setActivePage(page);
    setLibraryFocusZone('games');
    setSelectedIndex(0);
    soundEngine.playTab();
  }, []);

  const handleStepPage = useCallback(
    (delta: number) => {
      const idx = PAGE_ORDER.indexOf(activePage);
      const next =
        (idx + delta + PAGE_ORDER.length) % PAGE_ORDER.length;
      handleSelectPage(PAGE_ORDER[next]);
    },
    [activePage, handleSelectPage]
  );

  const handleSelectPlatformFilter = useCallback(
    (filter: LibraryPlatformFilter) => {
      setPlatformFilter(filter);
      setFocusedFilterIndex(LIBRARY_PLATFORM_FILTERS.indexOf(filter));
      setSelectedIndex(0);
      soundEngine.playTab();
    },
    []
  );

  const handleCyclePlatformFilter = useCallback(() => {
    soundEngine.playTab();
    setPlatformFilter((curr) => {
      const idx = LIBRARY_PLATFORM_FILTERS.indexOf(curr);
      const nextIdx = (idx + 1) % LIBRARY_PLATFORM_FILTERS.length;
      setFocusedFilterIndex(nextIdx);
      return LIBRARY_PLATFORM_FILTERS[nextIdx];
    });
    setSelectedIndex(0);
  }, []);

  const handleSelectIndex = useCallback(
    (idx: number) => {
      setLibraryFocusZone('games');
      if (idx !== selectedIndex) {
        soundEngine.playMove();
        setSelectedIndex(idx);
      }
    },
    [selectedIndex]
  );

  const bootTimestampRef = useRef<number>(Date.now());

  const handlePlayGame = useCallback((game: Game) => {
    if (activePage === 'system') return;
    if (Date.now() - bootTimestampRef.current < 850) return;
    soundEngine.playConfirm();
    setActiveModal('none');
    setLaunchingGame(game);
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id ? { ...g, lastPlayed: 'Agora' } : g
      )
    );

    fetch('/api/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: game.id, command: game.command, title: game.title, controller: connectedGamepadRef.current || '' }),
    }).catch(() => {});
  }, [activePage]);

  const handleToggleFavorite = useCallback((game: Game) => {
    soundEngine.playFavorite();
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id ? { ...g, favorite: !g.favorite } : g
      )
    );
  }, []);

  const handleRandomGame = useCallback(() => {
    if (games.length === 0) return;

    const pool =
      activePage === 'favorites' && visibleGames.length > 0
        ? visibleGames
        : activePage === 'library' && visibleGames.length > 0
        ? visibleGames
        : games;

    if (pool.length === 0) return;
    soundEngine.playFavorite();

    let randomIdx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && pool[randomIdx]?.id === selectedGame?.id) {
      randomIdx =
        (randomIdx + 1 + Math.floor(Math.random() * (pool.length - 1))) %
        pool.length;
    }

    if (activePage === 'system') {
      setActivePage('library');
      setPlatformFilter('Todos');
      setFocusedFilterIndex(0);
    }
    setLibraryFocusZone('games');
    setSelectedIndex(randomIdx);
  }, [games, activePage, visibleGames, selectedGame?.id]);

  const handleSaveGame = useCallback(
    (saved: Game) => {
      soundEngine.playConfirm();
      setGames((prev) => {
        const exists = prev.some((g) => g.id === saved.id);
        if (exists) {
          return prev.map((g) => (g.id === saved.id ? saved : g));
        }
        return [saved, ...prev];
      });
      setIsFormCoverFinderOpen(false);
      setActiveModal('none');
      setEditingGame(null);
      if (!editingGame) {
        setActivePage('library');
        setPlatformFilter('Todos');
        setFocusedFilterIndex(0);
        setLibraryFocusZone('games');
        setSelectedIndex(0);
      }
    },
    [editingGame]
  );

  const handleSteamSyncGames = useCallback(async (data: SteamSyncData, includeUninstalled: boolean) => {
    const ownedById = new Map(data.games.map((game) => [game.appId, game]));
    const recentIds = new Set(data.recentIds);
    setGames((previous) => {
      const matched = new Set<number>();
      const updated = previous.flatMap((game) => {
        const appId = Number(game.steamAppId || extractSteamAppId(game.command));
        const owned = ownedById.get(appId);
        if (!owned) return game.steamRemote && !data.privateProfile ? [] : [game];
        matched.add(appId);
        const installed = Boolean(game.steamInstalled || /^steam:\/\/rungameid\/\d+/i.test(game.command));
        if (!installed && !includeUninstalled) return game.steamRemote ? [] : [game];
        return [{
          ...game,
          title: installed ? game.title : owned.name,
          platform: 'Steam' as const,
          platformLabel: 'Steam',
          steamAppId: appId,
          steamInstalled: installed,
          steamRemote: !installed,
          steamPlaytimeHours: Math.round((owned.playtimeForever / 60) * 10) / 10,
          steamRecentHours: Math.round((owned.playtimeTwoWeeks / 60) * 10) / 10,
          steamRecentlyPlayed: recentIds.has(appId),
          steamHeroUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
          steamLogoUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`,
          coverUrl: game.isCustomCover ? game.coverUrl : `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
          command: installed ? game.command : `steam://install/${appId}`,
        }];
      });
      if (includeUninstalled) {
        for (const owned of data.games) {
          if (matched.has(owned.appId)) continue;
          updated.push({
            id: `steam-owned-${owned.appId}`, title: owned.name, platform: 'Steam', platformLabel: 'Steam',
            coverUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${owned.appId}/library_600x900_2x.jpg`,
            command: `steam://install/${owned.appId}`, hoursPlayed: 0, favorite: false,
            steamAppId: owned.appId, steamInstalled: false, steamRemote: true,
            steamPlaytimeHours: Math.round((owned.playtimeForever / 60) * 10) / 10,
            steamRecentHours: Math.round((owned.playtimeTwoWeeks / 60) * 10) / 10,
            steamRecentlyPlayed: recentIds.has(owned.appId),
            steamHeroUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${owned.appId}/library_hero.jpg`,
            steamLogoUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${owned.appId}/logo.png`,
          });
        }
      }
      return updated;
    });
  }, []);

  const handleSteamDisconnect = useCallback(() => {
    setGames((previous) => previous.filter((game) => !game.steamRemote).map((game) => {
      const { steamAppId: _appId, steamInstalled: _installed, steamRemote: _remote,
        steamPlaytimeHours: _hours, steamRecentHours: _recentHours, steamRecentlyPlayed: _recent,
        steamHeroUrl: _hero, steamLogoUrl: _logo, ...rest } = game;
      return rest;
    }));
  }, []);

  const handleAutomaticSteamCover = useCallback((gameId: string, coverUrl: string) => {
    setGames((previous) => previous.map((game) => game.id === gameId && !game.isCustomCover
      ? { ...game, coverUrl, isAutomaticCoverFallback: false }
      : game));
  }, []);

  const handleDeleteGame = useCallback((game: Game) => {
    soundEngine.playCancel();
    setGames((prev) => prev.filter((g) => g.id !== game.id));
    setActiveModal('none');
  }, []);

  const handleOpenOptions = useCallback(() => {
    if (activePage === 'system') return;
    if (!selectedGame) return;
    soundEngine.playMove();
    setModalFocusIndex(0);
    setActiveModal('game-options');
  }, [activePage, selectedGame]);

  const handleOpenTranslator = useCallback(() => {
    soundEngine.playMove();
    setActiveModal('translator');
  }, []);

  const handleJumpToSteamGridDbSettings = useCallback(() => {
    soundEngine.playTab();
    setIsFormCoverFinderOpen(false);
    setActiveModal('none');
    setEditingGame(null);
    setSystemCategory('covers');
    setActivePage('system');
  }, []);

  const handleCompleteOnboarding = useCallback((layout: ControllerLayout) => {
    soundEngine.playConfirm();
    setSettings((prev) => ({ ...prev, controllerLayout: layout }));
    try {
      localStorage.setItem(ONBOARDED_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setActiveModal('none');
  }, []);

  const handleFocusFromSearch = useCallback(
    (game: Game) => {
      soundEngine.playConfirm();
      setActiveModal('none');
      setActivePage('library');
      setPlatformFilter('Todos');
      setFocusedFilterIndex(0);
      setLibraryFocusZone('games');
      const idx = games.findIndex((g) => g.id === game.id);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    },
    [games]
  );

  const optionsItemCount = activePage === 'library' ? 6 : 5;

  const handleCaptureButton = useCallback(
    (btnIdx: number) => {
      if (!capturingAction) return;
      soundEngine.playConfirm();

      setButtonMapping((prev) => {
        const next: GamepadButtonMapping = { ...prev };
        const previousBtnForTarget = prev[capturingAction];

        // Swap if another action already uses btnIdx so no essential button is lost
        (Object.keys(next) as RemappableAction[]).forEach((actionKey) => {
          if (actionKey !== capturingAction && next[actionKey] === btnIdx) {
            next[actionKey] = previousBtnForTarget;
          }
        });
        next[capturingAction] = btnIdx;
        return next;
      });

      const meta = REMAPPABLE_ACTIONS_META.find(
        (m) => m.id === capturingAction
      );
      const btnName = formatGamepadButtonName(
        btnIdx,
        resolvedLayoutRef.current
      );
      setCaptureMessage(
        `${meta?.label ?? 'Ação'} atribuída a ${btnName}.`
      );
      setCapturingAction(null);
    },
    [capturingAction]
  );

  const lastActivityRef = useRef<number>(Date.now());

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const handleWakeScreensaver = useCallback(() => {
    soundEngine.playConfirm();
    lastActivityRef.current = Date.now();
    setIsSleeping(false);
  }, []);

  // Reset idle clock whenever a game overlay closes or timeout changes
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [launchingGame, settings.idleTimeoutMinutes, isSleeping]);

  // Monitor mouse, touch, wheel, keyboard activity and trigger Screensaver when idle
  useEffect(() => {
    const onUserEvent = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('pointerdown', onUserEvent, { passive: true });
    window.addEventListener('mousemove', onUserEvent, { passive: true });
    window.addEventListener('wheel', onUserEvent, { passive: true });
    window.addEventListener('touchstart', onUserEvent, { passive: true });
    window.addEventListener('keydown', onUserEvent);

    const idleCheckTimer = window.setInterval(() => {
      if (
        isSleeping ||
        Boolean(launchingGame) ||
        Boolean(capturingAction) ||
        settings.idleTimeoutMinutes <= 0
      ) {
        return;
      }
      const timeoutMs = settings.idleTimeoutMinutes * 60 * 1000;
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        setIsSleeping(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('pointerdown', onUserEvent);
      window.removeEventListener('mousemove', onUserEvent);
      window.removeEventListener('wheel', onUserEvent);
      window.removeEventListener('touchstart', onUserEvent);
      window.removeEventListener('keydown', onUserEvent);
      window.clearInterval(idleCheckTimer);
    };
  }, [
    isSleeping,
    launchingGame,
    capturingAction,
    settings.idleTimeoutMinutes,
  ]);

  // Unified Gamepad + Keyboard Navigation
  const { connectedGamepad, rawGamepadId } = useGamepadNavigation({
    buttonMapping,
    isCapturingButton: Boolean(capturingAction),
    isScreensaverActive: isSleeping,
    onCaptureButton: handleCaptureButton,
    onCaptureConflict: (message) => {
      soundEngine.playCancel();
      setCaptureMessage(message);
      setCapturingAction(null);
    },
    onWakeScreensaver: handleWakeScreensaver,
    onGamepadActivity: markActivity,
    onMenu: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (capturingAction || launchingGame || activeModal !== 'none') return;
      handleSelectPage(activePage === 'system' ? 'library' : 'system');
    },
    onSearch: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      soundEngine.playMove();
      setActiveModal('search');
    },
    onTranslator: () => {
      if (capturingAction || isSleeping || launchingGame) return;
      if (activeModal === 'translator') {
        soundEngine.playCancel();
        setActiveModal('none');
      } else if (activeModal === 'none') {
        handleOpenTranslator();
      }
    },
    onLeft: () => {
      if (capturingAction) return;
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (activeModal === 'search') {
        quickSearchRef.current?.navigate('left');
        return;
      }
      if (activeModal === 'cover-finder' || isFormCoverFinderOpen) {
        coverFinderRef.current?.navigate('left');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('left');
        return;
      }
      if (activeModal !== 'none') return;

      if (activePage === 'system') {
        systemViewRef.current?.navigate('left');
        return;
      }

      if (activePage === 'library' && libraryFocusZone === 'filters') {
        const nextFilterIdx =
          (focusedFilterIndex - 1 + LIBRARY_PLATFORM_FILTERS.length) %
          LIBRARY_PLATFORM_FILTERS.length;
        handleSelectPlatformFilter(LIBRARY_PLATFORM_FILTERS[nextFilterIdx]);
        return;
      }

      if (maxCarouselSlots <= 1) return;
      const next = (selectedIndex - 1 + maxCarouselSlots) % maxCarouselSlots;
      handleSelectIndex(next);
    },
    onRight: () => {
      if (capturingAction) return;
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (activeModal === 'search') {
        quickSearchRef.current?.navigate('right');
        return;
      }
      if (activeModal === 'cover-finder' || isFormCoverFinderOpen) {
        coverFinderRef.current?.navigate('right');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('right');
        return;
      }
      if (activeModal !== 'none') return;

      if (activePage === 'system') {
        systemViewRef.current?.navigate('right');
        return;
      }

      if (activePage === 'library' && libraryFocusZone === 'filters') {
        const nextFilterIdx =
          (focusedFilterIndex + 1) % LIBRARY_PLATFORM_FILTERS.length;
        handleSelectPlatformFilter(LIBRARY_PLATFORM_FILTERS[nextFilterIdx]);
        return;
      }

      if (maxCarouselSlots <= 1) return;
      const next = (selectedIndex + 1) % maxCarouselSlots;
      handleSelectIndex(next);
    },
    onUp: () => {
      if (capturingAction) return;
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (activeModal === 'search') {
        quickSearchRef.current?.navigate('up');
        return;
      }
      if (activeModal === 'cover-finder' || isFormCoverFinderOpen) {
        coverFinderRef.current?.navigate('up');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('up');
      } else if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex(
          (prev) => (prev - 1 + optionsItemCount) % optionsItemCount
        );
      } else if (activeModal === 'none' && activePage === 'system') {
        systemViewRef.current?.navigate('up');
      } else if (
        activeModal === 'none' &&
        activePage === 'library' &&
        libraryFocusZone === 'games'
      ) {
        soundEngine.playMove();
        setFocusedFilterIndex(
          Math.max(0, LIBRARY_PLATFORM_FILTERS.indexOf(platformFilter))
        );
        setLibraryFocusZone('filters');
      }
    },
    onDown: () => {
      if (capturingAction) return;
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (activeModal === 'search') {
        quickSearchRef.current?.navigate('down');
        return;
      }
      if (activeModal === 'cover-finder' || isFormCoverFinderOpen) {
        coverFinderRef.current?.navigate('down');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('down');
      } else if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev + 1) % optionsItemCount);
      } else if (activeModal === 'none' && activePage === 'system') {
        systemViewRef.current?.navigate('down');
      } else if (
        activeModal === 'none' &&
        activePage === 'library' &&
        libraryFocusZone === 'filters'
      ) {
        soundEngine.playMove();
        setLibraryFocusZone('games');
      }
    },
    onPrevTab: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      handleStepPage(-1);
    },
    onNextTab: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      handleStepPage(1);
    },
    onConfirm: () => {
      if (capturingAction) return;
      if (isSleeping) {
        soundEngine.playConfirm();
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;

      if (activeModal === 'search') {
        quickSearchRef.current?.confirm();
        return;
      }

      if (activeModal === 'cover-finder' || isFormCoverFinderOpen) {
        coverFinderRef.current?.confirm();
        return;
      }

      if (activeModal === 'none') {
        if (activePage === 'system') {
          systemViewRef.current?.confirm();
          return;
        }
        if (activePage === 'library' && libraryFocusZone === 'filters') {
          soundEngine.playConfirm();
          setLibraryFocusZone('games');
          return;
        }
        if (activePage === 'library' && selectedIndex === visibleGames.length) {
          soundEngine.playMove();
          setEditingGame(null);
          setActiveModal('add-game');
          return;
        }
        if (selectedGame) {
          handlePlayGame(selectedGame);
        }
        return;
      }

      if (activeModal === 'welcome') {
        welcomeModalRef.current?.confirm();
        return;
      }

      if (activeModal === 'game-options' && selectedGame) {
        // Items on Library: 0 Play, 1 Favorite, 2 Cover Finder, 3 Filter, 4 Edit, 5 Delete
        // Items on Favorites: 0 Play, 1 Favorite, 2 Cover Finder, 3 Edit, 4 Delete
        if (modalFocusIndex === 0) {
          handlePlayGame(selectedGame);
        } else if (modalFocusIndex === 1) {
          handleToggleFavorite(selectedGame);
          setActiveModal('none');
        } else if (modalFocusIndex === 2) {
          soundEngine.playMove();
          setActiveModal('cover-finder');
        } else if (activePage === 'library' && modalFocusIndex === 3) {
          handleCyclePlatformFilter();
        } else if (
          (activePage === 'library' && modalFocusIndex === 4) ||
          (activePage !== 'library' && modalFocusIndex === 3)
        ) {
          setEditingGame(selectedGame);
          setActiveModal('edit-game');
        } else {
          handleDeleteGame(selectedGame);
        }
      }
    },
    onEscape: () => {
      if (activeModal === 'controller-test') return true;
      if (
        activeModal === 'none' && !isUpdateModalOpen && !capturingAction &&
        !isSleeping && !launchingGame && !isFormCoverFinderOpen &&
        activePage === 'library' && libraryFocusZone === 'games'
      ) {
        fetch('/api/quit', { method: 'POST' }).catch(() => {
          if (window.confirm('Sair do Pad2PS Launcher?')) window.close();
        });
        return true;
      }
      return false;
    },
    onCancel: () => {
      if (activeModal === 'controller-test') return;
      if (capturingAction) {
        soundEngine.playCancel();
        setCapturingAction(null);
        setCaptureMessage('Captura de botão cancelada.');
        return;
      }
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) {
        soundEngine.playCancel();
        setLaunchingGame(null);
        return;
      }
      if (isFormCoverFinderOpen) {
        soundEngine.playCancel();
        setIsFormCoverFinderOpen(false);
        return;
      }
      if (activeModal === 'welcome') {
        handleCompleteOnboarding('auto');
        return;
      }
      if (activeModal !== 'none') {
        soundEngine.playCancel();
        setActiveModal('none');
        setEditingGame(null);
        return;
      }
      if (activePage === 'library' && libraryFocusZone === 'filters') {
        soundEngine.playMove();
        setLibraryFocusZone('games');
        return;
      }
      if (activePage === 'system') {
        const handled = systemViewRef.current?.back();
        if (handled) return;
        handleSelectPage('library');
        return;
      }
      if (activePage !== 'library') {
        handleSelectPage('library');
      }
    },
    onFavorite: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      if (activePage !== 'system') {
        handleRandomGame();
      }
    },
    onOptions: () => {
      if (capturingAction || isSleeping || launchingGame) return;
      if (activeModal === 'none' && activePage !== 'system' && selectedGame) {
        handleOpenOptions();
      } else if (activeModal === 'game-options') {
        soundEngine.playCancel();
        setActiveModal('none');
      }
    },
    onSettings: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      handleSelectPage(activePage === 'system' ? 'library' : 'system');
    },
    onSort: () => {
      if (
        capturingAction ||
        isSleeping ||
        launchingGame ||
        activeModal !== 'none'
      ) {
        return;
      }
      if (activePage === 'library') {
        handleCyclePlatformFilter();
      }
    },
  });
  connectedGamepadRef.current = connectedGamepad;

  const detectedLayout = useMemo(
    () => detectGamepadLayout(rawGamepadId),
    [rawGamepadId]
  );
  const resolvedLayout = useMemo(
    () => resolveControllerLayout(settings.controllerLayout, rawGamepadId),
    [settings.controllerLayout, rawGamepadId]
  );
  resolvedLayoutRef.current = resolvedLayout;

  return (
    <ControllerLayoutProvider layout={resolvedLayout}>
      <div
        className="relative h-screen w-screen overflow-hidden flex flex-col select-none transition-colors duration-500"
        style={{
          backgroundColor: 'var(--bg-deep)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Fundo Cinemático Desfocado + Atmosfera CSS do Tema Ativo */}
        <HeroBackdrop
          game={backdropGame}
          theme={settings.theme}
          isLight={
            settings.theme === 'clean-light' ||
            (settings.theme === 'custom' &&
              isLightHexColor(settings.customThemeConfig.bgDeep))
          }
        />

        {/* Topo Ultra-Limpo */}
        <TopBar
          connectedGamepad={connectedGamepad}
          translatorUrl={settings.translatorUrl}
          onLogoClick={() => handleSelectPage('library')}
          onOpenSearch={() => {
            soundEngine.playMove();
            setActiveModal('search');
          }}
        />

        {/* Conteúdo das 3 Páginas Principais */}
        {activePage === 'system' ? (
          <SystemView
            ref={systemViewRef}
            settings={settings}
            detectedLayout={detectedLayout}
            games={games}
            initialCategory={systemCategory}
            buttonMapping={buttonMapping}
            capturingAction={capturingAction}
            captureMessage={captureMessage}
            onChangeTheme={(theme: ThemeId) => {
              setSettings((prev) => ({ ...prev, theme }));
              soundEngine.setTheme(theme);
              soundEngine.playTab();
            }}
            onChangeCustomThemeConfig={(customThemeConfig) => {
              setSettings((prev) => ({
                ...prev,
                theme: 'custom',
                customThemeConfig,
              }));
              soundEngine.setTheme('custom');
              soundEngine.setCustomSoundPreset(customThemeConfig.soundPreset);
            }}
            onChangeControllerLayout={(controllerLayout: ControllerLayout) => {
              soundEngine.playTab();
              setSettings((prev) => ({ ...prev, controllerLayout }));
            }}
            onToggleSound={() => {
              setSettings((prev) => {
                const next = !prev.soundEnabled;
                soundEngine.setEnabled(next);
                if (next) soundEngine.playConfirm();
                return { ...prev, soundEnabled: next };
              });
            }}
            onChangeIdleTimeout={(idleTimeoutMinutes) => {
              soundEngine.playTab();
              setSettings((prev) => ({ ...prev, idleTimeoutMinutes }));
            }}
            onChangeScreensaverMode={(screensaverMode) => {
              soundEngine.playTab();
              setSettings((prev) => ({ ...prev, screensaverMode }));
            }}
            onChangeScreensaverCustomImage={(screensaverCustomImage) => {
              setSettings((prev) => ({ ...prev, screensaverCustomImage }));
            }}
            onStartCaptureButton={(action) => {
              setCaptureMessage(null);
              setCapturingAction(action);
            }}
            onCancelCaptureButton={() => {
              setCapturingAction(null);
              setCaptureMessage('Captura de botão cancelada.');
            }}
            onResetButtonMapping={() => {
              soundEngine.playConfirm();
              setCapturingAction(null);
              setButtonMapping({ ...DEFAULT_BUTTON_MAPPING });
              setCaptureMessage('Mapeamento padrão restaurado.');
            }}
            onAddGame={() => {
              soundEngine.playMove();
              setEditingGame(null);
              setActiveModal('add-game');
            }}
            onImportGames={(imported) => {
              soundEngine.playConfirm();
              setGames(imported);
              setActivePage('library');
              setPlatformFilter('Todos');
              setFocusedFilterIndex(0);
              setLibraryFocusZone('games');
              setSelectedIndex(0);
            }}
            onResetDefaultGames={() => {
              soundEngine.playConfirm();
              setGames(DEFAULT_GAMES);
              setActivePage('library');
              setPlatformFilter('Todos');
              setFocusedFilterIndex(0);
              setLibraryFocusZone('games');
              setSelectedIndex(0);
            }}
            onSleepMode={() => setIsSleeping(true)}
            onOpenControllerTest={() => setActiveModal('controller-test')}
            onSteamSyncGames={handleSteamSyncGames}
            onSteamDisconnected={handleSteamDisconnect}
            onOpenUpdateModal={(info) => {
              setUpdateInfo(info);
              setIsUpdateModalOpen(true);
            }}
            onRestart={() => {
              bootTimestampRef.current = Date.now();
              setLaunchingGame(null);
              setActiveModal('none');
              setActivePage('library');
              setPlatformFilter('Todos');
              setFocusedFilterIndex(0);
              setLibraryFocusZone('games');
              setSelectedIndex(0);
              fetch('/api/games')
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                  if (d?.games?.length && window.loadExternalGames) {
                    window.loadExternalGames(d.games);
                  }
                })
                .catch(() => {});
            }}
          />
        ) : (
          <GameCarousel
            page={activePage}
            games={visibleGames}
            selectedIndex={selectedIndex}
            platformFilter={platformFilter}
            focusZone={libraryFocusZone}
            focusedFilterIndex={focusedFilterIndex}
            onFocusFilterIndex={(idx) => {
              setFocusedFilterIndex(idx);
              setLibraryFocusZone('filters');
            }}
            onSelectPlatformFilter={(filter) => {
              handleSelectPlatformFilter(filter);
              setLibraryFocusZone('games');
            }}
            onSelectIndex={handleSelectIndex}
            onPlayGame={handlePlayGame}
            onAddGame={() => {
              soundEngine.playMove();
              setEditingGame(null);
              setActiveModal('add-game');
            }}
            onGoToLibrary={() => handleSelectPage('library')}
            onAutomaticCoverFound={handleAutomaticSteamCover}
          />
        )}

        {/* Pílula Flutuante Central (3 Páginas: Favoritos | Biblioteca | Sistema) */}
        <PageSwitcherPill
          activePage={activePage}
          onSelectPage={handleSelectPage}
          onPrevPage={() => handleStepPage(-1)}
          onNextPage={() => handleStepPage(1)}
        />

        {/* Barra de Rodapé Estilo Console */}
        <FooterLegend
          activePage={activePage}
          hasSelectedGame={
            activePage !== 'system' && Boolean(selectedGame)
          }
          isModalOpen={activeModal !== 'none' || Boolean(launchingGame)}
          onPlayOrSelect={() => {
            if (activePage === 'system') {
              systemViewRef.current?.confirm();
            } else if (
              activePage === 'library' &&
              selectedIndex === visibleGames.length
            ) {
              soundEngine.playMove();
              setEditingGame(null);
              setActiveModal('add-game');
            } else if (selectedGame) {
              handlePlayGame(selectedGame);
            }
          }}
          onRandomGame={handleRandomGame}
          onOpenOptions={handleOpenOptions}
          onBack={() => {
            soundEngine.playCancel();
            if (launchingGame) setLaunchingGame(null);
            else if (isFormCoverFinderOpen) setIsFormCoverFinderOpen(false);
            else if (activeModal !== 'none') setActiveModal('none');
          }}
        />

        {/* Tradutor Pad2PS Web Modal */}
        {activeModal === 'translator' && (
          <TranslatorModal
            translatorUrl={settings.translatorUrl}
            gameTitle={selectedGame?.title}
            onChangeTranslatorUrl={(translatorUrl: string) =>
              setSettings((prev) => ({ ...prev, translatorUrl }))
            }
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Quick Search Modal (atalho teclado '/' ou Lupa no topo) */}
        {activeModal === 'search' && (
          <QuickSearchModal
            ref={quickSearchRef}
            games={games}
            onSelectAndPlay={handlePlayGame}
            onFocusGame={handleFocusFromSearch}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Game Options Modal */}
        {activeModal === 'game-options' && selectedGame && (
          <GameOptionsModal
            game={selectedGame}
            focusedIndex={modalFocusIndex}
            platformFilter={
              activePage === 'library' ? platformFilter : undefined
            }
            onCyclePlatformFilter={
              activePage === 'library' ? handleCyclePlatformFilter : undefined
            }
            onSearchCoverOnline={() => {
              soundEngine.playMove();
              setActiveModal('cover-finder');
            }}
            onChangeFocus={setModalFocusIndex}
            onPlay={() => handlePlayGame(selectedGame)}
            onToggleFavorite={() => {
              handleToggleFavorite(selectedGame);
              setActiveModal('none');
            }}
            onEdit={() => {
              soundEngine.playMove();
              setEditingGame(selectedGame);
              setActiveModal('edit-game');
            }}
            onDelete={() => handleDeleteGame(selectedGame)}
            onSaveRetroGameId={(retroGameId) => setGames((previous) => previous.map((game) => game.id === selectedGame.id ? { ...game, retroGameId } : game))}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Cover Finder Modal opened directly from GameOptionsModal */}
        {activeModal === 'cover-finder' && selectedGame && (
          <CoverFinderModal
            ref={coverFinderRef}
            initialTitle={selectedGame.title}
            initialCommand={selectedGame.command}
            onSelectCover={(coverUrl) => {
              setGames((prev) =>
                prev.map((g) =>
                  g.id === selectedGame.id ? { ...g, coverUrl, isCustomCover: true, isAutomaticCoverFallback: false } : g
                )
              );
              setActiveModal('none');
            }}
            onGoToApiSettings={handleJumpToSteamGridDbSettings}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Add / Edit Game Modal */}
        {(activeModal === 'add-game' || activeModal === 'edit-game') && (
          <GameFormModal
            initialGame={activeModal === 'edit-game' ? editingGame : null}
            coverFinderRef={coverFinderRef}
            isCoverFinderOpen={isFormCoverFinderOpen}
            onCoverFinderOpenChange={setIsFormCoverFinderOpen}
            onGoToApiSettings={handleJumpToSteamGridDbSettings}
            onSave={handleSaveGame}
            onClose={() => {
              soundEngine.playCancel();
              setIsFormCoverFinderOpen(false);
              setActiveModal('none');
              setEditingGame(null);
            }}
          />
        )}

        {/* Launch Overlay */}
        {launchingGame && (
          <LaunchOverlay
            game={launchingGame}
            onClose={() => {
              soundEngine.playCancel();
              setLaunchingGame(null);
              fetch('/api/discord/menu', { method: 'POST' }).catch(() => {});
            }}
          />
        )}

        {/* Welcome Controller Onboarding Modal */}
        {activeModal === 'welcome' && (
          <WelcomeControllerModal
            ref={welcomeModalRef}
            detectedLayout={detectedLayout}
            connectedGamepad={connectedGamepad}
            onSelectLayout={handleCompleteOnboarding}
          />
        )}

        {activeModal === 'controller-test' && (
          <ControllerTestModal layout={resolvedLayout} onExit={() => setActiveModal('none')} />
        )}

        {/* Modo Descanso / Screensaver */}
        {isSleeping && (
          <ScreensaverOverlay
            mode={settings.screensaverMode}
            games={games}
            customImageUrl={settings.screensaverCustomImage}
            onWake={handleWakeScreensaver}
          />
        )}

        {/* Modal de Atualização */}
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateInfo={updateInfo}
          appName="Pad2PS Launcher"
        />
      </div>
    </ControllerLayoutProvider>
  );
}
