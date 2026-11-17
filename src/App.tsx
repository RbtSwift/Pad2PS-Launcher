import { useCallback, useEffect, useMemo, useState } from 'react';
import { FooterLegend } from './components/FooterLegend';
import { GameCarousel } from './components/GameCarousel';
import { GameFormModal } from './components/GameFormModal';
import { GameOptionsModal } from './components/GameOptionsModal';
import { HeroBackdrop } from './components/HeroBackdrop';
import { LaunchOverlay } from './components/LaunchOverlay';
import { Logo } from './components/Logo';
import { PowerModal } from './components/PowerModal';
import { SettingsModal } from './components/SettingsModal';
import { TopBar } from './components/TopBar';
import { DEFAULT_GAMES, FILTER_TABS, THEMES } from './data/defaultGames';
import { useGamepadNavigation } from './hooks/useGamepadNavigation';
import {
  ActiveModal,
  FilterTab,
  Game,
  LauncherSettings,
  ThemeId,
} from './types';
import { exportPad2PSLogoPng } from './utils/logoExport';
import { soundEngine } from './utils/sound';

const GAMES_STORAGE_KEY = 'pad2ps_launcher_games_v1';
const SETTINGS_STORAGE_KEY = 'pad2ps_launcher_settings_v1';

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
        theme: parsed.theme || 'neon-pink',
        soundEnabled:
          typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      };
    }
  } catch {
    // fallback
  }
  return { theme: 'neon-pink', soundEnabled: true };
}

function matchesTab(game: Game, tab: FilterTab): boolean {
  switch (tab) {
    case 'Todos':
      return true;
    case 'Steam':
      return game.platform === 'Steam';
    case 'Heroic / Epic':
      return game.platform === 'Epic' || game.platform === 'Heroic';
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
  const [activeTab, setActiveTab] = useState<FilterTab>('Todos');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null);
  const [modalFocusIndex, setModalFocusIndex] = useState<number>(0);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);

  // Persist games to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    } catch {
      // ignore quota errors
    }
  }, [games]);

  // Persist settings & apply active theme CSS variables
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }

    const theme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.hex);
    root.style.setProperty('--accent-rgb', theme.rgb);
    root.style.setProperty(
      '--accent-glow',
      `0 0 20px rgba(${theme.rgb}, 0.45)`
    );
    root.style.setProperty(
      '--accent-glow-strong',
      `0 0 34px rgba(${theme.rgb}, 0.65)`
    );

    soundEngine.setEnabled(settings.soundEnabled);
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
            message: 'Formato inválido: esperado array de jogos ou { games: [] }.',
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
            coverUrl: String(item.coverUrl || ''),
            command: String(item.command || ''),
            hoursPlayed: Number(item.hoursPlayed) || 0,
            favorite: Boolean(item.favorite),
            genre: item.genre ? String(item.genre) : undefined,
            lastPlayed: item.lastPlayed ? String(item.lastPlayed) : undefined,
          }));

        setGames(sanitized);
        setActiveTab('Todos');
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
          message: err instanceof Error ? err.message : 'Erro ao processar JSON.',
        };
      }
    };

    return () => {
      delete window.loadExternalGames;
    };
  }, []);

  const filteredGames = useMemo(
    () => games.filter((g) => matchesTab(g, activeTab)),
    [games, activeTab]
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<FilterTab, number>;
    for (const tab of FILTER_TABS) {
      counts[tab] = games.filter((g) => matchesTab(g, tab)).length;
    }
    return counts;
  }, [games]);

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
    setSelectedIndex(0);
    soundEngine.playTab();
  }, []);

  const handleStepTab = useCallback(
    (delta: number) => {
      const currIdx = FILTER_TABS.indexOf(activeTab);
      const nextIdx =
        (currIdx + delta + FILTER_TABS.length) % FILTER_TABS.length;
      handleSelectTab(FILTER_TABS[nextIdx]);
    },
    [activeTab, handleSelectTab]
  );

  const handleSelectIndex = useCallback(
    (idx: number) => {
      if (idx !== selectedIndex) {
        soundEngine.playMove();
        setSelectedIndex(idx);
      }
    },
    [selectedIndex]
  );

  const handlePlayGame = useCallback((game: Game) => {
    soundEngine.playConfirm();
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
        setActiveTab('Todos');
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
    setModalFocusIndex(0);
    setActiveModal('game-options');
  }, [selectedGame]);

  const handleOpenSettings = useCallback(() => {
    soundEngine.playMove();
    setActiveModal('settings');
  }, []);

  const handleOpenPower = useCallback(() => {
    soundEngine.playMove();
    setModalFocusIndex(0);
    setActiveModal('power');
  }, []);

  // Unified Gamepad + Keyboard Navigation
  const { connectedGamepad } = useGamepadNavigation({
    onLeft: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (launchingGame || activeModal !== 'none') return;
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
      if (launchingGame || activeModal !== 'none') return;
      if (filteredGames.length <= 1) return;
      const next = (selectedIndex + 1) % filteredGames.length;
      handleSelectIndex(next);
    },
    onUp: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev - 1 + 4) % 4);
      } else if (activeModal === 'power') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev - 1 + 2) % 2);
      }
    },
    onDown: () => {
      if (isSleeping) {
        setIsSleeping(false);
        return;
      }
      if (activeModal === 'game-options') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev + 1) % 4);
      } else if (activeModal === 'power') {
        soundEngine.playMove();
        setModalFocusIndex((prev) => (prev + 1) % 2);
      }
    },
    onPrevTab: () => {
      if (isSleeping || launchingGame || activeModal !== 'none') return;
      handleStepTab(-1);
    },
    onNextTab: () => {
      if (isSleeping || launchingGame || activeModal !== 'none') return;
      handleStepTab(1);
    },
    onConfirm: () => {
      if (isSleeping) {
        soundEngine.playConfirm();
        setIsSleeping(false);
        return;
      }
      if (launchingGame) return;
      if (activeModal === 'none') {
        if (selectedGame) handlePlayGame(selectedGame);
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
      if (activeModal !== 'none') {
        soundEngine.playCancel();
        setActiveModal('none');
        setEditingGame(null);
      }
    },
    onFavorite: () => {
      if (isSleeping || launchingGame || activeModal !== 'none') return;
      if (selectedGame) handleToggleFavorite(selectedGame);
    },
    onOptions: () => {
      if (isSleeping || launchingGame) return;
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
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-[#0B0B0F] text-[#F4F4F6] select-none">
      {/* Dynamic Blurred Cover Backdrop */}
      <HeroBackdrop game={selectedGame} />

      {/* Top HUD */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        connectedGamepad={connectedGamepad}
        onAddGame={() => {
          soundEngine.playMove();
          setEditingGame(null);
          setActiveModal('add-game');
        }}
        onOpenSettings={handleOpenSettings}
        onOpenPower={handleOpenPower}
        onDownloadLogo={handleDownloadLogo}
        tabCounts={tabCounts}
      />

      {/* Main Centered Carousel */}
      <GameCarousel
        games={filteredGames}
        selectedIndex={selectedIndex}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onSelectIndex={handleSelectIndex}
        onPlayGame={handlePlayGame}
        onToggleFavorite={handleToggleFavorite}
        onOpenOptions={handleOpenOptions}
        onAddGame={() => {
          soundEngine.playMove();
          setEditingGame(null);
          setActiveModal('add-game');
        }}
      />

      {/* Bottom Controller Legend */}
      <FooterLegend
        hasSelectedGame={Boolean(selectedGame)}
        isModalOpen={activeModal !== 'none' || Boolean(launchingGame)}
        onPlay={() => selectedGame && handlePlayGame(selectedGame)}
        onToggleFavorite={() =>
          selectedGame && handleToggleFavorite(selectedGame)
        }
        onOpenOptions={handleOpenOptions}
        onOpenSettings={handleOpenSettings}
        onNextTab={() => handleStepTab(1)}
      />

      {/* Modals & Overlays */}
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

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          games={games}
          onChangeTheme={(theme: ThemeId) => {
            soundEngine.playTab();
            setSettings((prev) => ({ ...prev, theme }));
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
            setActiveTab('Todos');
            setSelectedIndex(0);
          }}
          onResetDefaultGames={() => {
            soundEngine.playConfirm();
            setGames(DEFAULT_GAMES);
            setActiveTab('Todos');
            setSelectedIndex(0);
          }}
          onClose={() => {
            soundEngine.playCancel();
            setActiveModal('none');
          }}
        />
      )}

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

      {launchingGame && (
        <LaunchOverlay
          game={launchingGame}
          onClose={() => {
            soundEngine.playCancel();
            setLaunchingGame(null);
          }}
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
          <p className="text-sm text-[#94A3B8]">
            Modo Descanso — Clique ou pressione qualquer botão para retomar
          </p>
        </button>
      )}
    </div>
  );
}
