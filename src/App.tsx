import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConsoleDockHandle,
  ConsoleDockModal,
} from './components/ConsoleDockModal';
import { ControllerLayoutProvider } from './components/ControllerIcons';
import { FooterLegend } from './components/FooterLegend';
import {
  CollectionShortcut,
  GameCarousel,
} from './components/GameCarousel';
import { GameFormModal } from './components/GameFormModal';
import { GameOptionsModal } from './components/GameOptionsModal';
import { HeroBackdrop } from './components/HeroBackdrop';
import { LaunchOverlay } from './components/LaunchOverlay';
import { Logo } from './components/Logo';
import { PowerModal } from './components/PowerModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import {
  SettingsModal,
  SettingsModalHandle,
} from './components/SettingsModal';
import { TopBar } from './components/TopBar';
import { TranslatorModal } from './components/TranslatorModal';
import {
  WelcomeControllerModal,
  WelcomeControllerModalHandle,
} from './components/WelcomeControllerModal';
import {
  DEFAULT_GAMES,
  DEFAULT_TRANSLATOR_URL,
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
  FilterTab,
  Game,
  LauncherSettings,
  SortMode,
  ThemeId,
} from './types';
import { exportPad2PSLogoPng } from './utils/logoExport';
import { soundEngine } from './utils/sound';

const GAMES_STORAGE_KEY = 'pad2ps_launcher_games_v1';
const SETTINGS_STORAGE_KEY = 'pad2ps_launcher_settings_v1';
const ONBOARDED_STORAGE_KEY = 'pad2ps_launcher_onboarded_v1';

const CYCLABLE_TABS: FilterTab[] = [
  'Início',
  'Todos',
  'Steam',
  'Heroic / Epic',
  'GOG',
  'Emuladores',
  'Favoritos',
];

const VALID_THEME_IDS: ThemeId[] = [
  'pad2ps-default',
  'futuristic',
  'horror',
  'cute',
  'pixel',
];

function normalizeThemeId(raw: unknown): ThemeId {
  if (typeof raw === 'string') {
    if (VALID_THEME_IDS.includes(raw as ThemeId)) {
      return raw as ThemeId;
    }
    if (raw === 'ps2-blue' || raw === 'cyber-cyan') return 'futuristic';
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

function loadStoredSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: normalizeThemeId(parsed.theme),
        soundEnabled:
          typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
        controllerLayout: parsed.controllerLayout || 'auto',
        translatorUrl:
          typeof parsed.translatorUrl === 'string' && parsed.translatorUrl.trim()
            ? parsed.translatorUrl.trim()
            : DEFAULT_TRANSLATOR_URL,
      };
    }
  } catch {
    // fallback
  }
  return {
    theme: 'pad2ps-default',
    soundEnabled: true,
    controllerLayout: 'auto',
    translatorUrl: DEFAULT_TRANSLATOR_URL,
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

function matchesTab(game: Game, tab: FilterTab): boolean {
  switch (tab) {
    case 'Início':
    case 'Todos':
      return true;
    case 'Steam':
      return game.platform === 'Steam';
    case 'Heroic / Epic':
      return game.platform === 'Epic' || game.platform === 'Heroic';
    case 'Heroic / Epic & GOG':
      return (
        game.platform === 'Epic' ||
        game.platform === 'Heroic' ||
        game.platform === 'GOG'
      );
    case 'GOG':
      return game.platform === 'GOG';
    case 'Emuladores':
      return game.platform === 'Emulador';
    case 'Favoritos':
      return game.favorite;
    default:
      return true;
  }
}

export default function App() {
  const [games, setGames] = useState<Game[]>(loadStoredGames);
  const [settings, setSettings] = useState<LauncherSettings>(loadStoredSettings);
  const [activeTab, setActiveTab] = useState<FilterTab>('Início');
  const [activeConsole, setActiveConsole] = useState<string>('Todos');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [focusRow, setFocusRow] = useState<'games' | 'collections'>('games');
  const [collectionFocusIndex, setCollectionFocusIndex] = useState<number>(0);
  const [isDockOpen, setIsDockOpen] = useState<boolean>(false);

  const [activeModal, setActiveModal] = useState<ActiveModal>(getInitialModal);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null);
  const [modalFocusIndex, setModalFocusIndex] = useState<number>(0);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);

  const settingsModalRef = useRef<SettingsModalHandle | null>(null);
  const welcomeModalRef = useRef<WelcomeControllerModalHandle | null>(null);
  const dockRef = useRef<ConsoleDockHandle | null>(null);

  // Persist games to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    } catch {
      // ignore quota errors
    }
  }, [games]);

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
    root.style.setProperty('--accent', theme.hex);
    root.style.setProperty('--accent-rgb', theme.rgb);

    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setTheme(theme.id);
  }, [settings]);

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
            command: String(item.command || ''),
            hoursPlayed: Number(item.hoursPlayed) || 0,
            favorite: Boolean(item.favorite),
            genre: item.genre ? String(item.genre) : undefined,
            lastPlayed: item.lastPlayed ? String(item.lastPlayed) : undefined,
          }));

        setGames(sanitized);
        setActiveTab('Início');
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

  const consoleSystems = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const g of games) {
      if (g.platform === 'Emulador' && g.consoleSystem?.trim()) {
        const sys = g.consoleSystem.trim();
        countsMap.set(sys, (countsMap.get(sys) ?? 0) + 1);
      }
    }
    return Array.from(countsMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [games]);

  useEffect(() => {
    if (
      activeConsole !== 'Todos' &&
      !consoleSystems.some((c) => c.name === activeConsole)
    ) {
      setActiveConsole('Todos');
    }
  }, [consoleSystems, activeConsole]);

  const filteredGames = useMemo(() => {
    const base = games.filter((g) => {
      if (!matchesTab(g, activeTab)) return false;
      if (
        activeTab === 'Emuladores' &&
        activeConsole !== 'Todos' &&
        (g.consoleSystem?.trim() || '') !== activeConsole
      ) {
        return false;
      }
      return true;
    });

    if (sortMode === 'az') {
      return [...base].sort((a, b) =>
        a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
      );
    }
    if (sortMode === 'most-played') {
      return [...base].sort((a, b) => b.hoursPlayed - a.hoursPlayed);
    }
    return [...base].sort((a, b) => {
      const aNow = a.lastPlayed === 'Agora' ? 1 : 0;
      const bNow = b.lastPlayed === 'Agora' ? 1 : 0;
      return bNow - aNow;
    });
  }, [games, activeTab, activeConsole, sortMode]);

  const collections: CollectionShortcut[] = useMemo(
    () => [
      {
        id: 'all',
        label: 'Todos os Jogos',
        tab: 'Todos',
        count: games.length,
        icon: 'all',
      },
      {
        id: 'steam',
        label: 'Steam',
        tab: 'Steam',
        count: games.filter((g) => matchesTab(g, 'Steam')).length,
        icon: 'steam',
      },
      {
        id: 'epic',
        label: 'Heroic & Epic',
        tab: 'Heroic / Epic',
        count: games.filter((g) => matchesTab(g, 'Heroic / Epic')).length,
        icon: 'epic',
      },
      {
        id: 'gog',
        label: 'GOG',
        tab: 'GOG',
        count: games.filter((g) => matchesTab(g, 'GOG')).length,
        icon: 'gog',
      },
      {
        id: 'emu',
        label: 'Emuladores',
        tab: 'Emuladores',
        count: games.filter((g) => matchesTab(g, 'Emuladores')).length,
        icon: 'emu',
      },
      {
        id: 'fav',
        label: 'Favoritos',
        tab: 'Favoritos',
        count: games.filter((g) => matchesTab(g, 'Favoritos')).length,
        icon: 'fav',
      },
    ],
    [games]
  );

  // Keep selectedIndex within bounds
  useEffect(() => {
    if (filteredGames.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= filteredGames.length) {
      setSelectedIndex(filteredGames.length - 1);
    }
  }, [filteredGames.length, selectedIndex]);

  const selectedGame = filteredGames[selectedIndex] ?? null;

  const handleSelectTab = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
    setActiveConsole('Todos');
    setSelectedIndex(0);
    setFocusRow('games');
    setIsDockOpen(false);
    soundEngine.playTab();
  }, []);

  const handleSelectConsole = useCallback((consoleName: string) => {
    setActiveConsole(consoleName);
    setSelectedIndex(0);
    setFocusRow('games');
    soundEngine.playTab();
  }, []);

  const handleCycleSort = useCallback(() => {
    soundEngine.playTab();
    setSortMode((prev) =>
      prev === 'recent' ? 'az' : prev === 'az' ? 'most-played' : 'recent'
    );
    setSelectedIndex(0);
  }, []);

  const handleSelectIndex = useCallback(
    (idx: number) => {
      setFocusRow('games');
      if (idx !== selectedIndex) {
        soundEngine.playMove();
        setSelectedIndex(idx);
      }
    },
    [selectedIndex]
  );

  const handleStepTab = useCallback(
    (delta: number) => {
      const currIdx = CYCLABLE_TABS.indexOf(activeTab);
      const safeIdx = currIdx === -1 ? 0 : currIdx;
      const nextIdx =
        (safeIdx + delta + CYCLABLE_TABS.length) % CYCLABLE_TABS.length;
      handleSelectTab(CYCLABLE_TABS[nextIdx]);
    },
    [activeTab, handleSelectTab]
  );

  const handlePlayGame = useCallback((game: Game) => {
    soundEngine.playConfirm();
    setIsDockOpen(false);
    setActiveModal('none');
    setLaunchingGame(game);
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id ? { ...g, lastPlayed: 'Agora' } : g
      )
    );
  }, []);

  const handleToggleFavorite = useCallback((game: Game) => {
    soundEngine.playFavorite();
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id ? { ...g, favorite: !g.favorite } : g
      )
    );
  }, []);

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
      setActiveModal('none');
      setEditingGame(null);
      if (!editingGame) {
        setActiveTab('Início');
        setSelectedIndex(0);
      }
    },
    [editingGame]
  );

  const handleDeleteGame = useCallback((game: Game) => {
    soundEngine.playCancel();
    setGames((prev) => prev.filter((g) => g.id !== game.id));
    setActiveModal('none');
  }, []);

  const handleDownloadLogo = useCallback(() => {
    const theme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];
    soundEngine.playConfirm();
    exportPad2PSLogoPng(theme.hex).catch(() => {});
  }, [settings.theme]);

  const handleOpenOptions = useCallback(() => {
    if (!selectedGame) return;
    soundEngine.playMove();
    setIsDockOpen(false);
    setModalFocusIndex(0);
    setActiveModal('game-options');
  }, [selectedGame]);

  const handleOpenTranslator = useCallback(() => {
    soundEngine.playMove();
    setIsDockOpen(false);
    setActiveModal('translator');
  }, []);

  const handleOpenSettings = useCallback(() => {
    soundEngine.playMove();
    setIsDockOpen(false);
    setActiveModal('settings');
  }, []);

  const handleOpenPower = useCallback(() => {
    soundEngine.playMove();
    setIsDockOpen(false);
    setModalFocusIndex(0);
    setActiveModal('power');
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
      setActiveTab('Todos');
      setActiveConsole('Todos');
      setFocusRow('games');
      const idx = games.findIndex((g) => g.id === game.id);
      if (idx >= 0) {
        setSortMode('recent');
        setSelectedIndex(idx);
      }
    },
    [games]
  );

  // Unified Gamepad + Keyboard Navigation
  const { connectedGamepad, rawGamepadId } = useGamepadNavigation({
    onMenu: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame || activeModal !== 'none') return;
      soundEngine.playMove();
      setIsDockOpen((prev) => !prev);
    },
    onSearch: () => {
      if (isSleeping || launchingGame || activeModal !== 'none') return;
      soundEngine.playMove();
      setIsDockOpen(false);
      setActiveModal('search');
    },
    onTranslator: () => {
      if (isSleeping || launchingGame) return;
      if (activeModal === 'translator') {
        soundEngine.playCancel();
        setActiveModal('none');
      } else if (activeModal === 'none') {
        handleOpenTranslator();
      }
    },
    onLeft: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (isDockOpen) {
        dockRef.current?.navigate('left');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('left');
        return;
      }
      if (activeModal === 'settings') {
        settingsModalRef.current?.navigate('left');
        return;
      }
      if (activeModal !== 'none') return;

      if (focusRow === 'collections') {
        soundEngine.playMove();
        setCollectionFocusIndex(
          (prev) => (prev - 1 + collections.length) % collections.length
        );
        return;
      }

      if (filteredGames.length <= 1) return;
      const next =
        (selectedIndex - 1 + filteredGames.length) % filteredGames.length;
      handleSelectIndex(next);
    },
    onRight: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (isDockOpen) {
        dockRef.current?.navigate('right');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('right');
        return;
      }
      if (activeModal === 'settings') {
        settingsModalRef.current?.navigate('right');
        return;
      }
      if (activeModal !== 'none') return;

      if (focusRow === 'collections') {
        soundEngine.playMove();
        setCollectionFocusIndex((prev) => (prev + 1) % collections.length);
        return;
      }

      if (filteredGames.length <= 1) return;
      const next = (selectedIndex + 1) % filteredGames.length;
      handleSelectIndex(next);
    },
    onUp: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (isDockOpen) {
        dockRef.current?.navigate('up');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('up');
      } else if (activeModal === 'settings') {
        settingsModalRef.current?.navigate('up');
      } else if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev - 1 + 4) % 4);
      } else if (activeModal === 'power') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev - 1 + 2) % 2);
      } else if (activeModal === 'none' && focusRow === 'collections') {
        soundEngine.playMove();
        setFocusRow('games');
      }
    },
    onDown: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (isDockOpen) {
        dockRef.current?.navigate('down');
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.navigate('down');
      } else if (activeModal === 'settings') {
        settingsModalRef.current?.navigate('down');
      } else if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev + 1) % 4);
      } else if (activeModal === 'power') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev + 1) % 2);
      } else if (activeModal === 'none' && focusRow === 'games') {
        soundEngine.playMove();
        setFocusRow('collections');
      }
    },
    onPrevTab: () => {
      if (isSleeping || launchingGame || isDockOpen || activeModal !== 'none')
        return;
      handleStepTab(-1);
    },
    onNextTab: () => {
      if (isSleeping || launchingGame || isDockOpen || activeModal !== 'none')
        return;
      handleStepTab(1);
    },
    onConfirm: () => {
      if (isSleeping) {
        soundEngine.playConfirm();
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (isDockOpen) {
        dockRef.current?.confirm();
        return;
      }
      if (activeModal === 'none') {
        if (focusRow === 'collections') {
          const col = collections[collectionFocusIndex];
          if (col) handleSelectTab(col.tab);
          return;
        }
        if (selectedGame) handlePlayGame(selectedGame);
        return;
      }
      if (activeModal === 'welcome') {
        welcomeModalRef.current?.confirm();
        return;
      }
      if (activeModal === 'settings') {
        settingsModalRef.current?.confirm();
        return;
      }
      if (activeModal === 'game-options' && selectedGame) {
        if (modalFocusIndex === 0) handlePlayGame(selectedGame);
        else if (modalFocusIndex === 1) {
          handleToggleFavorite(selectedGame);
          setActiveModal('none');
        } else if (modalFocusIndex === 2) {
          setEditingGame(selectedGame);
          setActiveModal('edit-game');
        } else if (modalFocusIndex === 3) {
          handleDeleteGame(selectedGame);
        }
      } else if (activeModal === 'power') {
        if (modalFocusIndex === 0) {
          soundEngine.playCancel();
          setActiveModal('none');
          setIsSleeping(true);
        } else {
          window.location.reload();
        }
      }
    },
    onCancel: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame) {
        soundEngine.playCancel();
        setLaunchingGame(null);
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
      if (isDockOpen) {
        soundEngine.playCancel();
        setIsDockOpen(false);
        return;
      }
      if (focusRow === 'collections') {
        soundEngine.playMove();
        setFocusRow('games');
        return;
      }
      soundEngine.playMove();
      setIsDockOpen(true);
    },
    onFavorite: () => {
      if (isSleeping || launchingGame || isDockOpen || activeModal !== 'none')
        return;
      if (selectedGame) handleToggleFavorite(selectedGame);
    },
    onOptions: () => {
      if (isSleeping || launchingGame || isDockOpen) return;
      if (activeModal === 'none' && selectedGame) {
        handleOpenOptions();
      } else if (activeModal === 'game-options') {
        soundEngine.playCancel();
        setActiveModal('none');
      }
    },
    onSettings: () => {
      if (isSleeping || launchingGame) return;
      if (activeModal === 'settings') {
        soundEngine.playCancel();
        setActiveModal('none');
      } else if (activeModal === 'none') {
        handleOpenSettings();
      }
    },
    onSort: () => {
      if (isSleeping || launchingGame || isDockOpen || activeModal !== 'none')
        return;
      handleCycleSort();
    },
  });

  const detectedLayout = useMemo(
    () => detectGamepadLayout(rawGamepadId),
    [rawGamepadId]
  );
  const resolvedLayout = useMemo(
    () => resolveControllerLayout(settings.controllerLayout, rawGamepadId),
    [settings.controllerLayout, rawGamepadId]
  );

  return (
    <ControllerLayoutProvider layout={resolvedLayout}>
      <div
        className="relative h-screen w-screen overflow-hidden flex flex-col select-none transition-colors duration-500"
        style={{
          backgroundColor: 'var(--bg-deep)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Dynamic Blurred Cover Backdrop + Pure CSS Theme Atmosphere */}
        <HeroBackdrop game={selectedGame} theme={settings.theme} />

        {/* Ultra-Minimalist 10-Foot Top HUD */}
        <TopBar
          activeTab={activeTab}
          activeConsole={activeConsole}
          connectedGamepad={connectedGamepad}
          onOpenSearch={() => {
            soundEngine.playMove();
            setIsDockOpen(false);
            setActiveModal('search');
          }}
          onOpenMenu={() => {
            soundEngine.playMove();
            setIsDockOpen(true);
          }}
        />

        {/* Palco Pad2PS: Painel Hero Flutuante + Miniaturas + Coleções */}
        <GameCarousel
          games={filteredGames}
          selectedIndex={selectedIndex}
          activeTab={activeTab}
          sortMode={sortMode}
          focusRow={focusRow}
          collectionFocusIndex={collectionFocusIndex}
          collections={collections}
          consoleSystems={consoleSystems}
          activeConsole={activeConsole}
          onSelectConsole={handleSelectConsole}
          onCycleSort={handleCycleSort}
          onSelectTab={handleSelectTab}
          onSelectIndex={handleSelectIndex}
          onFocusCollections={(idx) => {
            setFocusRow('collections');
            setCollectionFocusIndex(idx);
          }}
          onPlayGame={handlePlayGame}
          onToggleFavorite={handleToggleFavorite}
          onOpenOptions={handleOpenOptions}
          onOpenTranslator={handleOpenTranslator}
          onAddGame={() => {
            soundEngine.playMove();
            setEditingGame(null);
            setActiveModal('add-game');
          }}
        />

        {/* Bottom Console Bar */}
        <FooterLegend
          hasSelectedGame={Boolean(selectedGame)}
          isModalOpen={activeModal !== 'none' || Boolean(launchingGame)}
          isDockOpen={isDockOpen}
          onToggleDock={() => {
            soundEngine.playMove();
            setIsDockOpen((prev) => !prev);
          }}
          onPlay={() => selectedGame && handlePlayGame(selectedGame)}
          onToggleFavorite={() =>
            selectedGame && handleToggleFavorite(selectedGame)
          }
          onOpenOptions={handleOpenOptions}
          onOpenTranslator={handleOpenTranslator}
          onBack={() => {
            soundEngine.playCancel();
            if (launchingGame) setLaunchingGame(null);
            else if (activeModal !== 'none') setActiveModal('none');
            else if (isDockOpen) setIsDockOpen(false);
          }}
        />

        {/* Dock Central Flutuante Pad2PS (3 Colunas) */}
        <ConsoleDockModal
          ref={dockRef}
          isOpen={isDockOpen}
          activeTab={activeTab}
          onSelectSection={handleSelectTab}
          onAddGame={() => {
            setIsDockOpen(false);
            setEditingGame(null);
            setActiveModal('add-game');
          }}
          onOpenTranslator={handleOpenTranslator}
          onOpenSettings={handleOpenSettings}
          onOpenPower={handleOpenPower}
          onDownloadLogo={handleDownloadLogo}
          onClose={() => {
            soundEngine.playCancel();
            setIsDockOpen(false);
          }}
        />

        {/* Tradutor Pad2PS Web Modal */}
        {activeModal === 'translator' && (
          <TranslatorModal
            translatorUrl={settings.translatorUrl}
            gameTitle={selectedGame?.title}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Quick Search Modal */}
        {activeModal === 'search' && (
          <QuickSearchModal
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
            onSave={handleSaveGame}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
              setEditingGame(null);
            }}
          />
        )}

        {/* Settings Modal */}
        {activeModal === 'settings' && (
          <SettingsModal
            ref={settingsModalRef}
            settings={settings}
            detectedLayout={detectedLayout}
            games={games}
            onChangeTheme={(theme: ThemeId) => {
              setSettings((prev) => ({ ...prev, theme }));
              soundEngine.setTheme(theme);
              soundEngine.playTab();
            }}
            onChangeControllerLayout={(controllerLayout: ControllerLayout) => {
              soundEngine.playTab();
              setSettings((prev) => ({ ...prev, controllerLayout }));
            }}
            onChangeTranslatorUrl={(translatorUrl: string) => {
              setSettings((prev) => ({ ...prev, translatorUrl }));
            }}
            onToggleSound={() => {
              setSettings((prev) => {
                const next = !prev.soundEnabled;
                soundEngine.setEnabled(next);
                if (next) soundEngine.playConfirm();
                return { ...prev, soundEnabled: next };
              });
            }}
            onImportGames={(imported) => {
              soundEngine.playConfirm();
              setGames(imported);
              setActiveTab('Início');
              setSelectedIndex(0);
            }}
            onResetDefaultGames={() => {
              soundEngine.playConfirm();
              setGames(DEFAULT_GAMES);
              setActiveTab('Início');
              setSelectedIndex(0);
            }}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
            }}
          />
        )}

        {/* Power Modal */}
        {activeModal === 'power' && (
          <PowerModal
            focusedIndex={modalFocusIndex}
            onChangeFocus={setModalFocusIndex}
            onSleepMode={() => {
              soundEngine.playCancel();
              setActiveModal('none');
              setIsSleeping(true);
            }}
            onReload={() => window.location.reload()}
            onClose={() => {
              soundEngine.playCancel();
              setActiveModal('none');
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

        {/* Rest / Sleep Screen */}
        {isSleeping && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playConfirm();
              setIsSleeping(false);
            }}
            className="fixed inset-0 z-50 bg-[#050508] flex flex-col items-center justify-center gap-6 cursor-pointer focus:outline-none"
          >
            <div className="opacity-70 animate-pulse">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Modo Descanso — Clique ou pressione qualquer botão para retomar
            </p>
          </button>
        )}
      </div>
    </ControllerLayoutProvider>
  );
}
