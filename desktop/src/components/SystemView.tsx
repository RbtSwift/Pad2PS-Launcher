import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  Gamepad2,
  Image as ImageIcon,
  Images,
  KeyRound,
  Library,
  Monitor,
  Moon,
  Palette,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { checkForAppUpdate, type UpdateCheckResult } from '../utils/updateChecker';
import { DEFAULT_TRANSLATOR_URL, THEMES } from '../data/defaultGames';
import {
  ControllerLayout,
  CustomBorderRadiusPreset,
  CustomFontPreset,
  CustomSoundPreset,
  CustomThemeConfig,
  Game,
  GamepadButtonMapping,
  IdleTimeoutMinutes,
  LauncherSettings,
  RemappableAction,
  ResolvedControllerLayout,
  ScreensaverMode,
  SystemCategory,
  ThemeId,
} from '../types';
import { hexToRgbString } from '../data/defaultGames';
import {
  getStoredSteamGridDbKey,
  resizeImageFileTo1920x1080,
  saveStoredSteamGridDbKey,
} from '../utils/coverSearch';
import {
  formatGamepadButtonName,
  REMAPPABLE_ACTIONS_META,
} from '../utils/gamepadMapping';
import { exportPad2PSLogoPng } from '../utils/logoExport';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  OptionsButtonIcon,
  TabPairKeyCap,
} from './ControllerIcons';

export interface SystemViewHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
  back: () => boolean;
}

interface SystemViewProps {
  settings: LauncherSettings;
  detectedLayout: ResolvedControllerLayout;
  games: Game[];
  initialCategory?: SystemCategory;
  buttonMapping: GamepadButtonMapping;
  capturingAction: RemappableAction | null;
  captureMessage: string | null;
  onChangeTheme: (theme: ThemeId) => void;
  onChangeCustomThemeConfig: (config: CustomThemeConfig) => void;
  onChangeControllerLayout: (layout: ControllerLayout) => void;
  onToggleSound: () => void;
  onChangeIdleTimeout: (minutes: IdleTimeoutMinutes) => void;
  onChangeScreensaverMode: (mode: ScreensaverMode) => void;
  onChangeScreensaverCustomImage: (url: string) => void;
  onStartCaptureButton: (action: RemappableAction) => void;
  onCancelCaptureButton: () => void;
  onResetButtonMapping: () => void;
  onAddGame: () => void;
  onImportGames: (games: Game[]) => void;
  onResetDefaultGames: () => void;
  onSleepMode: () => void;
  onRestart: () => void;
  onOpenUpdateModal?: (info: UpdateCheckResult) => void;
}

const CATEGORIES: {
  id: SystemCategory;
  label: string;
  icon: typeof Palette;
}[] = [
  { id: 'appearance', label: 'Aparência & Temas', icon: Palette },
  { id: 'controller', label: 'Controle & Atalhos', icon: Gamepad2 },
  { id: 'covers', label: 'Capas & API SteamGridDB', icon: ImageIcon },
  { id: 'library', label: 'Biblioteca & Dados', icon: Library },
  { id: 'power', label: 'Energia & Web Pad2PS', icon: Power },
];

const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  'pad2ps-default':
    'Fundo profundo #0B0B0F com superfícies em vidro escuro, brilho Neon Pink e áudio eletrônico suave.',
  futuristic:
    'Grade cibernética em CSS puro, linhas de varredura animadas, Cyber Cyan e bipes digitais de HUD.',
  horror:
    'Vinheta sombria intensa nas bordas, destaque carmesim e graves profundos estilo survival horror.',
  cute:
    'Paleta acolhedora rosa pastel & lilás com cantos bem arredondados e sinos leves de marimba.',
  pixel:
    'Tipografia Pixel Art (Silkscreen), cantos retos 0px, sombras sólidas arcade e áudio chiptune 8-bit.',
  'ps2-classic':
    'Fundo azul abismo #050914, bordas arredondadas, brilho Azul Elétrico #0070D1 e sinos cristalinos.',
  synthwave:
    'Atmosfera retrô anos 80 (#12071F) com Laranja Neon #FF6B00, brilho magenta e sintetizador analógico.',
  'clean-light':
    'Modo claro dia (#EEF2F6) com cards brancos puros, textos escuros de alto contraste e Azul Cobalto #2563EB.',
  'emerald-matrix':
    'Terminal escuro #040D08 com grade verde neon #00FF88, fonte JetBrains Mono e bipes digitais.',
  custom:
    'Personalize livremente a cor de destaque, fundo, arredondamento das bordas, fonte dos títulos e perfil sonoro.',
};

const CUSTOM_ACCENT_SWATCHES = [
  { hex: '#FF2E93', label: 'Neon Pink' },
  { hex: '#0070D1', label: 'Azul PS2' },
  { hex: '#00F0FF', label: 'Cyber Cyan' },
  { hex: '#00FF88', label: 'Verde Neon' },
  { hex: '#FF6B00', label: 'Laranja Neon' },
  { hex: '#A855F7', label: 'Roxo Violeta' },
];

const CUSTOM_BG_PRESETS = [
  { hex: '#0B0B0F', label: 'Preto OLED' },
  { hex: '#050914', label: 'Azul Abismo' },
  { hex: '#160D24', label: 'Roxo Escuro' },
  { hex: '#EEF2F6', label: 'Branco Gelo' },
];

const CUSTOM_RADIUS_OPTIONS: {
  id: CustomBorderRadiusPreset;
  label: string;
}[] = [
  { id: 'default', label: 'Padrão (16px)' },
  { id: 'cute', label: 'Fofo (24px)' },
  { id: 'tech', label: 'Técnico (8px)' },
  { id: 'pixel', label: 'Retrô Quadrado (0px)' },
];

const CUSTOM_FONT_OPTIONS: {
  id: CustomFontPreset;
  label: string;
}[] = [
  { id: 'outfit', label: 'Outfit (Moderna)' },
  { id: 'jetbrains', label: 'JetBrains Mono (Tech)' },
  { id: 'cinzel', label: 'Cinzel (Épica)' },
  { id: 'silkscreen', label: 'Silkscreen (Pixel Art)' },
];

const CUSTOM_SOUND_OPTIONS: {
  id: CustomSoundPreset;
  label: string;
}[] = [
  { id: 'pad2ps-default', label: 'Pad2PS Eletrônico' },
  { id: 'futuristic', label: 'Sci-Fi HUD' },
  { id: 'cute', label: 'Marimba Fofa' },
  { id: 'pixel', label: 'Chiptune 8-Bit' },
  { id: 'horror', label: 'Grave Cinematográfico' },
];

const CONTROLLER_OPTIONS: {
  id: ControllerLayout;
  label: string;
  desc: string;
}[] = [
  {
    id: 'auto',
    label: 'Automático',
    desc: 'Detecta automaticamente o modelo do gamepad conectado via navegador.',
  },
  {
    id: 'playstation',
    label: 'PlayStation (✕ ○ □ △)',
    desc: 'Exibe os ícones oficiais DualSense / DualShock com L1, R1 e Options.',
  },
  {
    id: 'xbox',
    label: 'Xbox / PC (A B X Y)',
    desc: 'Padrão ideal para controles Xbox, GameSir, 8BitDo e teclado.',
  },
  {
    id: 'nintendo',
    label: 'Nintendo (B A Y X)',
    desc: 'Layout Switch / Pro Controller com botões B/A/Y/X e gatilhos L / R.',
  },
];

const IDLE_TIMEOUT_OPTIONS: {
  value: IdleTimeoutMinutes;
  label: string;
}[] = [
  { value: 0, label: 'Desativado' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
];

const SCREENSAVER_MODE_OPTIONS: {
  id: ScreensaverMode;
  label: string;
  desc: string;
  icon: typeof Monitor;
}[] = [
  {
    id: 'minimal',
    label: 'Minimalista OLED',
    desc: 'Fundo preto #050508 com a logo Pad2PS Launcher e relógio digital deslizando suavemente para proteger telas OLED.',
    icon: Moon,
  },
  {
    id: 'library-slideshow',
    label: 'Galeria de Jogos',
    desc: 'Alterna a cada 15 segundos entre artes dos jogos (priorizando Favoritos) e busca Heroes em alta definição no SteamGridDB.',
    icon: Images,
  },
  {
    id: 'custom-image',
    label: 'Imagem Personalizada',
    desc: 'Usa um wallpaper enviado do seu PC (otimizado em 1920×1080) ou uma URL direta de imagem como fundo exclusivo.',
    icon: Sparkles,
  },
];

function getSafeUrl(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : DEFAULT_TRANSLATOR_URL;
}

export const SystemView = forwardRef<SystemViewHandle, SystemViewProps>(
  (
    {
      settings,
      detectedLayout,
      games,
      initialCategory = 'appearance',
      buttonMapping,
      capturingAction,
      captureMessage,
      onChangeTheme,
      onChangeCustomThemeConfig,
      onChangeControllerLayout,
      onToggleSound,
      onChangeIdleTimeout,
      onChangeScreensaverMode,
      onChangeScreensaverCustomImage,
      onStartCaptureButton,
      onCancelCaptureButton,
      onResetButtonMapping,
      onAddGame,
      onImportGames,
      onResetDefaultGames,
      onSleepMode,
      onRestart,
      onOpenUpdateModal,
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const customImageInputRef = useRef<HTMLInputElement | null>(null);
    const contentRefs = useRef<(HTMLElement | null)[]>([]);
    const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

    const [activeCategory, setActiveCategory] =
      useState<SystemCategory>(initialCategory);
    const [focusPane, setFocusPane] = useState<'categories' | 'content'>(
      'categories'
    );
    const [contentFocusIndex, setContentFocusIndex] = useState<number>(0);

    const [apiKeyInput, setApiKeyInput] = useState<string>(() =>
      getStoredSteamGridDbKey()
    );
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [customImageUrlInput, setCustomImageUrlInput] = useState<string>(
      () =>
        settings.screensaverCustomImage.startsWith('data:')
          ? ''
          : settings.screensaverCustomImage
    );
    const [optimizingWallpaper, setOptimizingWallpaper] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [exportingLogo, setExportingLogo] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);

    useEffect(() => {
      fetch('/api/autostart')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (typeof d?.enabled === 'boolean') setAutostartEnabled(d.enabled);
        })
        .catch(() => {});
    }, []);

    const handleToggleAutostart = () => {
      const next = !autostartEnabled;
      setAutostartEnabled(next);
      soundEngine.playConfirm();
      fetch('/api/autostart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (typeof d?.enabled === 'boolean') setAutostartEnabled(d.enabled);
          showToast(
            next
              ? 'Modo Console ativado: o Pad2PS abrirá ao ligar o PC!'
              : 'Inicialização automática com o sistema desativada.'
          );
        })
        .catch(() => {
          showToast('Preferência de inicialização atualizada.');
        });
    };

    useEffect(() => {
      setActiveCategory(initialCategory);
      setContentFocusIndex(0);
    }, [initialCategory]);

    useEffect(() => {
      if (!settings.screensaverCustomImage.startsWith('data:')) {
        setCustomImageUrlInput(settings.screensaverCustomImage);
      }
    }, [settings.screensaverCustomImage]);

    const activeTheme =
      THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];

    const effectiveAccentHex =
      settings.theme === 'custom'
        ? settings.customThemeConfig.accentHex
        : activeTheme.hex;

    const resolvedActiveLayout: ResolvedControllerLayout =
      settings.controllerLayout === 'auto'
        ? detectedLayout
        : settings.controllerLayout;

    const showToast = (msg: string) => {
      setFeedback(msg);
      window.setTimeout(() => setFeedback(null), 3400);
    };

    const hasCustomImageControls = settings.screensaverMode === 'custom-image';
    const customControlsCount = hasCustomImageControls ? 2 : 0;
    const isCustomThemeActive = settings.theme === 'custom';
    const customThemeControlsCount = isCustomThemeActive
      ? CUSTOM_ACCENT_SWATCHES.length +
        CUSTOM_BG_PRESETS.length +
        CUSTOM_RADIUS_OPTIONS.length +
        CUSTOM_FONT_OPTIONS.length +
        CUSTOM_SOUND_OPTIONS.length
      : 0;

    const getContentItemCount = (cat: SystemCategory): number => {
      switch (cat) {
        case 'appearance':
          return THEMES.length + customThemeControlsCount;
        case 'controller':
          // 4 layouts + 1 sound toggle + 7 remappable actions + 1 reset button = 13
          return (
            CONTROLLER_OPTIONS.length + 1 + REMAPPABLE_ACTIONS_META.length + 1
          );
        case 'covers':
          return 2; // Save key + Clear key
        case 'library':
          return 4; // Add, Export, Import, Reset
        case 'power':
          return (
            2 +
            IDLE_TIMEOUT_OPTIONS.length +
            SCREENSAVER_MODE_OPTIONS.length +
            customControlsCount +
            6
          );
      }
    };

    const handleCheckUpdates = async () => {
      try {
        setIsCheckingUpdates(true);
        soundEngine.playMove();
        showToast('Verificando atualizações no GitHub...');
        const res = await checkForAppUpdate('RbtSwift/Pad2PS-Launcher', '1.0.4');
        if (res.hasUpdate && onOpenUpdateModal) {
          soundEngine.playConfirm();
          onOpenUpdateModal(res);
        } else if (res.error) {
          soundEngine.playCancel();
          showToast('Não foi possível verificar atualizações. Sem conexão.');
        } else {
          soundEngine.playConfirm();
          showToast('O Pad2PS Launcher está atualizado (v1.0.4)!');
        }
      } catch {
        showToast('Erro ao verificar atualizações.');
      } finally {
        setIsCheckingUpdates(false);
      }
    };

    const handleSaveApiKey = () => {
      saveStoredSteamGridDbKey(apiKeyInput);
      soundEngine.playConfirm();
      showToast(
        apiKeyInput.trim()
          ? 'Chave SteamGridDB salva no navegador!'
          : 'Chave SteamGridDB removida.'
      );
    };

    const handleClearApiKey = () => {
      setApiKeyInput('');
      saveStoredSteamGridDbKey('');
      soundEngine.playCancel();
      showToast('Chave SteamGridDB removida.');
    };

    const handleDownloadLogo = async (variant: 'full' | 'icon' = 'full') => {
      try {
        setExportingLogo(true);
        await exportPad2PSLogoPng(effectiveAccentHex, variant);
        showToast(
          variant === 'icon'
            ? 'Ícone pad2ps-launcher-icon.png (1024×1024) baixado!'
            : 'Logo pad2ps-launcher-logo.png (1024×1024) baixada!'
        );
      } catch {
        showToast('Erro ao gerar PNG da logo.');
      } finally {
        setExportingLogo(false);
      }
    };

    const handleExportJson = () => {
      const payload = JSON.stringify(games, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jogos.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Biblioteca exportada (${games.length} jogos em jogos.json).`);
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const list: unknown[] | null = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.games)
            ? parsed.games
            : null;

          if (!list) {
            showToast('Arquivo JSON inválido: esperado um array de jogos.');
            return;
          }

          const sanitized: Game[] = list
            .filter(
              (item): item is Record<string, unknown> =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as Record<string, unknown>).title === 'string'
            )
            .map((item, idx: number) => ({
              id: String(item.id || `imported-${Date.now()}-${idx}`),
              title: String(item.title),
              platform: (item.platform as Game['platform']) || 'Outro',
              platformLabel: String(
                item.platformLabel || item.platform || 'Outro'
              ),
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

          if (sanitized.length === 0) {
            showToast('Nenhum jogo válido encontrado no JSON.');
            return;
          }

          onImportGames(sanitized);
          showToast(`${sanitized.length} jogos importados com sucesso!`);
        } catch {
          showToast('Erro ao ler arquivo JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    const handleQuitApp = () => {
      soundEngine.playCancel();
      const desktop = (window as unknown as {
        pad2psDesktop?: { quitApp?: () => void };
      }).pad2psDesktop;
      if (desktop?.quitApp) {
        desktop.quitApp();
      } else {
        fetch('/api/quit', { method: 'POST' }).catch(() => {
          if (window.confirm('Sair do Pad2PS Launcher?')) {
            window.close();
          }
        });
      }
    };

    const activateContentItem = (idx: number) => {
      if (activeCategory === 'appearance') {
        if (idx < THEMES.length) {
          const theme = THEMES[idx];
          if (theme) onChangeTheme(theme.id);
          return;
        }
        if (!isCustomThemeActive) return;

        let cursor = THEMES.length;
        if (idx < cursor + CUSTOM_ACCENT_SWATCHES.length) {
          const sw = CUSTOM_ACCENT_SWATCHES[idx - cursor];
          if (sw) {
            soundEngine.playTab();
            onChangeCustomThemeConfig({
              ...settings.customThemeConfig,
              accentHex: sw.hex,
            });
          }
          return;
        }
        cursor += CUSTOM_ACCENT_SWATCHES.length;

        if (idx < cursor + CUSTOM_BG_PRESETS.length) {
          const bg = CUSTOM_BG_PRESETS[idx - cursor];
          if (bg) {
            soundEngine.playTab();
            onChangeCustomThemeConfig({
              ...settings.customThemeConfig,
              bgDeep: bg.hex,
            });
          }
          return;
        }
        cursor += CUSTOM_BG_PRESETS.length;

        if (idx < cursor + CUSTOM_RADIUS_OPTIONS.length) {
          const rad = CUSTOM_RADIUS_OPTIONS[idx - cursor];
          if (rad) {
            soundEngine.playTab();
            onChangeCustomThemeConfig({
              ...settings.customThemeConfig,
              borderRadius: rad.id,
            });
          }
          return;
        }
        cursor += CUSTOM_RADIUS_OPTIONS.length;

        if (idx < cursor + CUSTOM_FONT_OPTIONS.length) {
          const fnt = CUSTOM_FONT_OPTIONS[idx - cursor];
          if (fnt) {
            soundEngine.playTab();
            onChangeCustomThemeConfig({
              ...settings.customThemeConfig,
              fontPreset: fnt.id,
            });
          }
          return;
        }
        cursor += CUSTOM_FONT_OPTIONS.length;

        if (idx < cursor + CUSTOM_SOUND_OPTIONS.length) {
          const snd = CUSTOM_SOUND_OPTIONS[idx - cursor];
          if (snd) {
            soundEngine.setCustomSoundPreset(snd.id);
            soundEngine.playConfirm();
            onChangeCustomThemeConfig({
              ...settings.customThemeConfig,
              soundPreset: snd.id,
            });
          }
        }
        return;
      }
      if (activeCategory === 'controller') {
        if (idx < CONTROLLER_OPTIONS.length) {
          onChangeControllerLayout(CONTROLLER_OPTIONS[idx].id);
        } else if (idx === CONTROLLER_OPTIONS.length) {
          onToggleSound();
        } else if (
          idx <
          CONTROLLER_OPTIONS.length + 1 + REMAPPABLE_ACTIONS_META.length
        ) {
          const actionIdx = idx - (CONTROLLER_OPTIONS.length + 1);
          const meta = REMAPPABLE_ACTIONS_META[actionIdx];
          if (meta) {
            soundEngine.playMove();
            onStartCaptureButton(meta.id);
          }
        } else {
          onResetButtonMapping();
          showToast('Mapeamento de botões restaurado para o padrão!');
        }
        return;
      }
      if (activeCategory === 'covers') {
        if (idx === 0) handleSaveApiKey();
        else handleClearApiKey();
        return;
      }
      if (activeCategory === 'library') {
        if (idx === 0) onAddGame();
        else if (idx === 1) {
          soundEngine.playConfirm();
          handleExportJson();
        } else if (idx === 2) {
          soundEngine.playMove();
          fileInputRef.current?.click();
        } else if (idx === 3) {
          onResetDefaultGames();
          showToast('Biblioteca padrão restaurada (8 jogos).');
        }
        return;
      }
      if (activeCategory === 'power') {
        const timeoutStart = 2;
        const modeStart = timeoutStart + IDLE_TIMEOUT_OPTIONS.length; // 8
        const customStart = modeStart + SCREENSAVER_MODE_OPTIONS.length; // 11
        const utilitiesStart = customStart + customControlsCount;

        if (idx === 0) {
          contentRefs.current[0]?.click();
        } else if (idx === 1) {
          soundEngine.playCancel();
          onSleepMode();
        } else if (idx >= timeoutStart && idx < modeStart) {
          const opt = IDLE_TIMEOUT_OPTIONS[idx - timeoutStart];
          if (opt) onChangeIdleTimeout(opt.value);
        } else if (idx >= modeStart && idx < customStart) {
          const opt = SCREENSAVER_MODE_OPTIONS[idx - modeStart];
          if (opt) onChangeScreensaverMode(opt.id);
        } else if (hasCustomImageControls && idx === customStart) {
          soundEngine.playMove();
          customImageInputRef.current?.click();
        } else if (hasCustomImageControls && idx === customStart + 1) {
          handleApplyCustomImageUrl();
        } else if (idx === utilitiesStart) {
          handleToggleAutostart();
        } else if (idx === utilitiesStart + 1) {
          soundEngine.playConfirm();
          handleDownloadLogo('full');
        } else if (idx === utilitiesStart + 2) {
          soundEngine.playConfirm();
          handleDownloadLogo('icon');
        } else if (idx === utilitiesStart + 3) {
          handleCheckUpdates();
        } else if (idx === utilitiesStart + 4) {
          soundEngine.playConfirm();
          onRestart();
        } else if (idx === utilitiesStart + 5) {
          handleQuitApp();
        }
      }
    };

    const handleCustomImageUpload = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        setOptimizingWallpaper(true);
        const optimizedDataUrl = await resizeImageFileTo1920x1080(file);
        onChangeScreensaverCustomImage(optimizedDataUrl);
        setCustomImageUrlInput('');
        soundEngine.playConfirm();
        showToast('Imagem otimizada em 1920×1080 salva para o Modo Descanso!');
      } catch {
        soundEngine.playCancel();
        showToast('Erro ao processar imagem selecionada.');
      } finally {
        setOptimizingWallpaper(false);
      }
    };

    const handleApplyCustomImageUrl = () => {
      const trimmed = customImageUrlInput.trim();
      if (!trimmed) {
        onChangeScreensaverCustomImage('');
        soundEngine.playCancel();
        showToast('Imagem personalizada removida.');
        return;
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        soundEngine.playCancel();
        showToast('Informe uma URL válida iniciando com http:// ou https://.');
        return;
      }
      onChangeScreensaverCustomImage(trimmed);
      soundEngine.playConfirm();
      showToast('URL da imagem aplicada ao Modo Descanso!');
    };

    useEffect(() => {
      if (focusPane === 'content') {
        contentRefs.current[contentFocusIndex]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      } else {
        const catIdx = CATEGORIES.findIndex((c) => c.id === activeCategory);
        categoryRefs.current[catIdx]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }, [focusPane, contentFocusIndex, activeCategory]);

    useImperativeHandle(ref, () => ({
      navigate: (dir) => {
        if (capturingAction) return;
        soundEngine.playMove();
        const catIdx = CATEGORIES.findIndex((c) => c.id === activeCategory);

        if (focusPane === 'categories') {
          if (dir === 'up') {
            const prev =
              (catIdx - 1 + CATEGORIES.length) % CATEGORIES.length;
            setActiveCategory(CATEGORIES[prev].id);
            setContentFocusIndex(0);
          } else if (dir === 'down') {
            const next = (catIdx + 1) % CATEGORIES.length;
            setActiveCategory(CATEGORIES[next].id);
            setContentFocusIndex(0);
          } else if (dir === 'right') {
            setFocusPane('content');
            setContentFocusIndex(0);
          }
          return;
        }

        // focusPane === 'content'
        const count = getContentItemCount(activeCategory);
        if (dir === 'left') {
          setFocusPane('categories');
          return;
        }
        if (dir === 'up') {
          setContentFocusIndex((curr) => (curr - 1 + count) % count);
        } else if (dir === 'down' || dir === 'right') {
          setContentFocusIndex((curr) => (curr + 1) % count);
        }
      },
      confirm: () => {
        if (capturingAction) return;
        if (focusPane === 'categories') {
          soundEngine.playTab();
          setFocusPane('content');
          setContentFocusIndex(0);
          return;
        }
        activateContentItem(contentFocusIndex);
      },
      back: () => {
        if (capturingAction) {
          soundEngine.playCancel();
          onCancelCaptureButton();
          return true;
        }
        if (focusPane === 'content') {
          soundEngine.playCancel();
          setFocusPane('categories');
          return true;
        }
        return false;
      },
    }));

    const safeTranslatorUrl = getSafeUrl(settings.translatorUrl);

    return (
      <main className="relative z-10 flex-1 min-h-0 px-6 sm:px-10 lg:px-16 py-2 flex flex-col overflow-hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportJson}
          className="hidden"
        />

        {feedback && (
          <div
            className="theme-control fixed top-20 right-6 sm:right-10 lg:right-16 z-30 px-4 py-2.5 border backdrop-blur-md text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--accent)',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            <Check
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--accent)' }}
            />
            <span>{feedback}</span>
          </div>
        )}

        {/* Layout 2 Colunas Amplo Estilo Console */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 lg:gap-8">
          {/* Coluna Esquerda (w-80): Lista Vertical de Categorias */}
          <aside
            aria-label="Categorias do Sistema"
            className="w-full md:w-72 lg:w-80 shrink-0 flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto no-scrollbar py-1"
          >
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const isFocused = focusPane === 'categories' && isActive;

              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    categoryRefs.current[idx] = el;
                  }}
                  type="button"
                  onMouseEnter={() => {
                    setFocusPane('categories');
                    setActiveCategory(cat.id);
                    setContentFocusIndex(0);
                  }}
                  onClick={() => {
                    soundEngine.playTab();
                    setActiveCategory(cat.id);
                    setFocusPane('content');
                    setContentFocusIndex(0);
                  }}
                  className="theme-control flex items-center gap-3.5 py-3.5 md:py-4 px-5 text-base lg:text-lg font-bold text-left transition-all cursor-pointer shrink-0 md:w-full"
                  style={{
                    backgroundColor: isFocused
                      ? 'rgba(var(--accent-rgb), 0.18)'
                      : isActive
                      ? 'color-mix(in srgb, var(--bg-surface) 92%, transparent)'
                      : 'color-mix(in srgb, var(--bg-surface) 58%, transparent)',
                    border: isFocused
                      ? '2px solid var(--accent)'
                      : isActive
                      ? '1.5px solid rgba(var(--accent-rgb), 0.6)'
                      : '1px solid var(--border-subtle)',
                    color:
                      isFocused || isActive
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <Icon
                    className="w-5 h-5 lg:w-6 lg:h-6 shrink-0"
                    style={{
                      color:
                        isFocused || isActive
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                    }}
                  />
                  <span className="whitespace-nowrap md:whitespace-normal leading-snug">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Coluna Direita: Painel Amplo e Legível */}
          <section
            aria-live="polite"
            className="theme-surface flex-1 min-w-0 min-h-0 p-5 sm:p-6 lg:p-8 overflow-y-auto no-scrollbar backdrop-blur-xl"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bg-surface) 84%, transparent)',
              borderColor:
                focusPane === 'content'
                  ? 'rgba(var(--accent-rgb), 0.55)'
                  : 'var(--border-subtle)',
            }}
          >
            {/* 1. Aparência & Temas */}
            {activeCategory === 'appearance' && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl lg:text-2xl font-extrabold text-[var(--text-primary)]">
                    Aparência &amp; Temas do Console
                  </h2>
                  <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1">
                    Escolha entre 9 temas completos ou crie o seu próprio visual
                    100% em CSS e Web Audio API.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {THEMES.map((theme, idx) => {
                    const isActive = settings.theme === theme.id;
                    const isFocused =
                      focusPane === 'content' && contentFocusIndex === idx;
                    const swatchHex =
                      theme.id === 'custom'
                        ? settings.customThemeConfig.accentHex
                        : theme.hex;
                    const swatchRgb =
                      theme.id === 'custom'
                        ? hexToRgbString(settings.customThemeConfig.accentHex)
                        : theme.rgb;

                    return (
                      <button
                        key={theme.id}
                        ref={(el) => {
                          contentRefs.current[idx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(idx);
                        }}
                        onClick={() => onChangeTheme(theme.id)}
                        className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor: isFocused
                            ? 'rgba(var(--accent-rgb), 0.14)'
                            : 'var(--bg-deep)',
                          border: isFocused
                            ? '2px solid var(--accent)'
                            : isActive
                            ? `1.5px solid ${swatchHex}`
                            : '1px solid var(--border-subtle)',
                          boxShadow: isFocused
                            ? 'var(--accent-glow)'
                            : undefined,
                        }}
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                          <span
                            className="w-10 h-10 shrink-0 border"
                            style={{
                              borderColor: 'var(--border-subtle)',
                              borderRadius:
                                theme.id === 'pixel' ? '0px' : '9999px',
                              background:
                                theme.id === 'custom'
                                  ? `conic-gradient(${swatchHex}, #00F0FF, #FF8906, ${swatchHex})`
                                  : theme.secondaryHex
                                  ? `linear-gradient(135deg, ${theme.hex}, ${theme.secondaryHex})`
                                  : theme.hex,
                              boxShadow: `0 0 14px rgba(${swatchRgb}, 0.65)`,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                              {theme.name}
                            </p>
                            <p className="text-sm lg:text-base text-[var(--text-secondary)] leading-relaxed mt-0.5">
                              {THEME_DESCRIPTIONS[theme.id]}
                            </p>
                          </div>
                        </div>

                        {isActive && (
                          <span
                            className="theme-control px-3 py-1 text-xs sm:text-sm font-bold text-white shrink-0 inline-flex items-center gap-1.5"
                            style={{ backgroundColor: swatchHex }}
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {theme.id === 'custom'
                                ? 'Personalizar'
                                : 'Ativo'}
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Criador de Tema Personalizado */}
                {isCustomThemeActive && (() => {
                  const accentStart = THEMES.length;
                  const bgStart = accentStart + CUSTOM_ACCENT_SWATCHES.length;
                  const radiusStart = bgStart + CUSTOM_BG_PRESETS.length;
                  const fontStart = radiusStart + CUSTOM_RADIUS_OPTIONS.length;
                  const soundStart = fontStart + CUSTOM_FONT_OPTIONS.length;
                  const cfg = settings.customThemeConfig;

                  return (
                    <div
                      className="theme-control p-5 sm:p-6 border space-y-6"
                      style={{
                        backgroundColor: 'var(--bg-deep)',
                        borderColor: 'var(--accent)',
                        boxShadow: 'var(--accent-glow)',
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg lg:text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                            <Sparkles
                              className="w-5 h-5 shrink-0"
                              style={{ color: 'var(--accent)' }}
                            />
                            <span>Criador de Tema Personalizado</span>
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                            Todas as alterações são aplicadas em tempo real e
                            salvas automaticamente.
                          </p>
                        </div>
                      </div>

                      {/* 1. Cor de Destaque (Accent) */}
                      <div className="space-y-2.5">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          Cor de Destaque (Accent)
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label
                            className="theme-control inline-flex items-center gap-2 px-3 py-2 border cursor-pointer text-xs font-mono-tech font-bold text-[var(--text-primary)]"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <input
                              type="color"
                              value={cfg.accentHex}
                              onChange={(e) =>
                                onChangeCustomThemeConfig({
                                  ...cfg,
                                  accentHex: e.target.value,
                                })
                              }
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <span>{cfg.accentHex.toUpperCase()}</span>
                          </label>

                          {CUSTOM_ACCENT_SWATCHES.map((sw, i) => {
                            const flatIdx = accentStart + i;
                            const isSwActive =
                              cfg.accentHex.toLowerCase() ===
                              sw.hex.toLowerCase();
                            const isSwFocused =
                              focusPane === 'content' &&
                              contentFocusIndex === flatIdx;

                            return (
                              <button
                                key={sw.hex}
                                ref={(el) => {
                                  contentRefs.current[flatIdx] = el;
                                }}
                                type="button"
                                title={sw.label}
                                onMouseEnter={() => {
                                  setFocusPane('content');
                                  setContentFocusIndex(flatIdx);
                                }}
                                onClick={() => {
                                  soundEngine.playTab();
                                  onChangeCustomThemeConfig({
                                    ...cfg,
                                    accentHex: sw.hex,
                                  });
                                }}
                                className="w-9 h-9 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                                style={{
                                  backgroundColor: sw.hex,
                                  border: isSwFocused
                                    ? '3px solid var(--text-primary)'
                                    : isSwActive
                                    ? '2.5px solid var(--text-primary)'
                                    : '1px solid var(--border-subtle)',
                                  boxShadow:
                                    isSwActive || isSwFocused
                                      ? `0 0 14px ${sw.hex}`
                                      : undefined,
                                }}
                              >
                                {isSwActive && (
                                  <Check className="w-4 h-4 text-white drop-shadow" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Cor de Fundo Principal */}
                      <div className="space-y-2.5">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          Cor de Fundo Principal
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label
                            className="theme-control inline-flex items-center gap-2 px-3 py-2 border cursor-pointer text-xs font-mono-tech font-bold text-[var(--text-primary)]"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <input
                              type="color"
                              value={cfg.bgDeep}
                              onChange={(e) =>
                                onChangeCustomThemeConfig({
                                  ...cfg,
                                  bgDeep: e.target.value,
                                })
                              }
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <span>{cfg.bgDeep.toUpperCase()}</span>
                          </label>

                          {CUSTOM_BG_PRESETS.map((bg, i) => {
                            const flatIdx = bgStart + i;
                            const isBgActive =
                              cfg.bgDeep.toLowerCase() === bg.hex.toLowerCase();
                            const isBgFocused =
                              focusPane === 'content' &&
                              contentFocusIndex === flatIdx;

                            return (
                              <button
                                key={bg.hex}
                                ref={(el) => {
                                  contentRefs.current[flatIdx] = el;
                                }}
                                type="button"
                                onMouseEnter={() => {
                                  setFocusPane('content');
                                  setContentFocusIndex(flatIdx);
                                }}
                                onClick={() => {
                                  soundEngine.playTab();
                                  onChangeCustomThemeConfig({
                                    ...cfg,
                                    bgDeep: bg.hex,
                                  });
                                }}
                                className="theme-control inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold cursor-pointer transition-all"
                                style={{
                                  backgroundColor: isBgActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-surface)',
                                  border: isBgFocused
                                    ? '2px solid var(--text-primary)'
                                    : isBgActive
                                    ? '1.5px solid var(--accent)'
                                    : '1px solid var(--border-subtle)',
                                  color: isBgActive
                                    ? '#FFFFFF'
                                    : 'var(--text-primary)',
                                }}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                                  style={{ backgroundColor: bg.hex }}
                                />
                                <span>{bg.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Estilo das Bordas */}
                      <div className="space-y-2.5">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          Estilo das Bordas
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {CUSTOM_RADIUS_OPTIONS.map((opt, i) => {
                            const flatIdx = radiusStart + i;
                            const isRadActive = cfg.borderRadius === opt.id;
                            const isRadFocused =
                              focusPane === 'content' &&
                              contentFocusIndex === flatIdx;

                            return (
                              <button
                                key={opt.id}
                                ref={(el) => {
                                  contentRefs.current[flatIdx] = el;
                                }}
                                type="button"
                                onMouseEnter={() => {
                                  setFocusPane('content');
                                  setContentFocusIndex(flatIdx);
                                }}
                                onClick={() => {
                                  soundEngine.playTab();
                                  onChangeCustomThemeConfig({
                                    ...cfg,
                                    borderRadius: opt.id,
                                  });
                                }}
                                className="theme-control px-3 py-2.5 text-xs sm:text-sm font-bold text-center cursor-pointer transition-all"
                                style={{
                                  backgroundColor: isRadActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-surface)',
                                  border: isRadFocused
                                    ? '2px solid var(--text-primary)'
                                    : isRadActive
                                    ? '1.5px solid var(--accent)'
                                    : '1px solid var(--border-subtle)',
                                  color: isRadActive
                                    ? '#FFFFFF'
                                    : 'var(--text-primary)',
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Fonte dos Títulos */}
                      <div className="space-y-2.5">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          Fonte dos Títulos
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {CUSTOM_FONT_OPTIONS.map((opt, i) => {
                            const flatIdx = fontStart + i;
                            const isFontActive = cfg.fontPreset === opt.id;
                            const isFontFocused =
                              focusPane === 'content' &&
                              contentFocusIndex === flatIdx;

                            return (
                              <button
                                key={opt.id}
                                ref={(el) => {
                                  contentRefs.current[flatIdx] = el;
                                }}
                                type="button"
                                onMouseEnter={() => {
                                  setFocusPane('content');
                                  setContentFocusIndex(flatIdx);
                                }}
                                onClick={() => {
                                  soundEngine.playTab();
                                  onChangeCustomThemeConfig({
                                    ...cfg,
                                    fontPreset: opt.id,
                                  });
                                }}
                                className="theme-control px-3 py-2.5 text-xs sm:text-sm font-bold text-center cursor-pointer transition-all"
                                style={{
                                  backgroundColor: isFontActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-surface)',
                                  border: isFontFocused
                                    ? '2px solid var(--text-primary)'
                                    : isFontActive
                                    ? '1.5px solid var(--accent)'
                                    : '1px solid var(--border-subtle)',
                                  color: isFontActive
                                    ? '#FFFFFF'
                                    : 'var(--text-primary)',
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5. Perfil Sonoro */}
                      <div className="space-y-2.5">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          Perfil Sonoro (Web Audio API)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {CUSTOM_SOUND_OPTIONS.map((opt, i) => {
                            const flatIdx = soundStart + i;
                            const isSoundActive = cfg.soundPreset === opt.id;
                            const isSoundFocused =
                              focusPane === 'content' &&
                              contentFocusIndex === flatIdx;

                            return (
                              <button
                                key={opt.id}
                                ref={(el) => {
                                  contentRefs.current[flatIdx] = el;
                                }}
                                type="button"
                                onMouseEnter={() => {
                                  setFocusPane('content');
                                  setContentFocusIndex(flatIdx);
                                }}
                                onClick={() => {
                                  soundEngine.setCustomSoundPreset(opt.id);
                                  soundEngine.playConfirm();
                                  onChangeCustomThemeConfig({
                                    ...cfg,
                                    soundPreset: opt.id,
                                  });
                                }}
                                className="theme-control px-3 py-2.5 text-xs sm:text-sm font-bold text-center cursor-pointer transition-all"
                                style={{
                                  backgroundColor: isSoundActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-surface)',
                                  border: isSoundFocused
                                    ? '2px solid var(--text-primary)'
                                    : isSoundActive
                                    ? '1.5px solid var(--accent)'
                                    : '1px solid var(--border-subtle)',
                                  color: isSoundActive
                                    ? '#FFFFFF'
                                    : 'var(--text-primary)',
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2. Controle & Atalhos */}
            {activeCategory === 'controller' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl lg:text-2xl font-extrabold text-[var(--text-primary)]">
                    Controle &amp; Atalhos
                  </h2>
                  <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1">
                    Escolha o padrão visual dos ícones e personalize livremente os
                    botões do seu gamepad para cada ação.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {CONTROLLER_OPTIONS.map((opt, idx) => {
                    const isActive = settings.controllerLayout === opt.id;
                    const isFocused =
                      focusPane === 'content' && contentFocusIndex === idx;
                    const previewLayout: ResolvedControllerLayout =
                      opt.id === 'auto' ? detectedLayout : opt.id;

                    return (
                      <button
                        key={opt.id}
                        ref={(el) => {
                          contentRefs.current[idx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(idx);
                        }}
                        onClick={() => onChangeControllerLayout(opt.id)}
                        className="theme-control w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor: isFocused
                            ? 'rgba(var(--accent-rgb), 0.14)'
                            : 'var(--bg-deep)',
                          border: isFocused
                            ? '2px solid var(--accent)'
                            : isActive
                            ? '1.5px solid var(--accent)'
                            : '1px solid var(--border-subtle)',
                          boxShadow: isFocused
                            ? 'var(--accent-glow)'
                            : undefined,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                              {opt.label}
                            </p>
                            {isActive && (
                              <Check
                                className="w-5 h-5 shrink-0"
                                style={{ color: 'var(--accent)' }}
                              />
                            )}
                          </div>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            {opt.desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ConfirmButtonIcon
                            layout={previewLayout}
                            className="w-6 h-6"
                          />
                          <CancelButtonIcon
                            layout={previewLayout}
                            className="w-6 h-6"
                          />
                          <OptionsButtonIcon
                            layout={previewLayout}
                            className="w-6 h-6"
                          />
                          <FavoriteButtonIcon
                            layout={previewLayout}
                            className="w-6 h-6"
                          />
                          <TabPairKeyCap layout={previewLayout} />
                        </div>
                      </button>
                    );
                  })}

                  {/* Efeitos Sonoros Toggle */}
                  <button
                    ref={(el) => {
                      contentRefs.current[4] = el;
                    }}
                    type="button"
                    onMouseEnter={() => {
                      setFocusPane('content');
                      setContentFocusIndex(4);
                    }}
                    onClick={onToggleSound}
                    className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer mt-1"
                    style={{
                      backgroundColor:
                        focusPane === 'content' && contentFocusIndex === 4
                          ? 'rgba(var(--accent-rgb), 0.14)'
                          : 'var(--bg-deep)',
                      border:
                        focusPane === 'content' && contentFocusIndex === 4
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                      boxShadow:
                        focusPane === 'content' && contentFocusIndex === 4
                          ? 'var(--accent-glow)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {settings.soundEnabled ? (
                        <Volume2
                          className="w-6 h-6 shrink-0"
                          style={{ color: 'var(--accent)' }}
                        />
                      ) : (
                        <VolumeX className="w-6 h-6 shrink-0 text-[var(--text-secondary)]" />
                      )}
                      <div>
                        <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                          Efeitos Sonoros da Interface
                        </p>
                        <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5">
                          Sintetizador Web Audio adaptado ao tema selecionado.
                        </p>
                      </div>
                    </div>

                    <span
                      className="theme-control px-4 py-2 text-sm font-bold shrink-0"
                      style={{
                        backgroundColor: settings.soundEnabled
                          ? 'var(--accent)'
                          : 'var(--bg-surface)',
                        color: settings.soundEnabled
                          ? '#FFFFFF'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {settings.soundEnabled ? 'Ativado' : 'Desativado'}
                    </span>
                  </button>
                </div>

                {/* Mapeamento Personalizável de Botões */}
                <div
                  className="pt-5 border-t space-y-4"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg lg:text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
                        <SlidersHorizontal
                          className="w-5 h-5 shrink-0"
                          style={{ color: 'var(--accent)' }}
                        />
                        <span>Mapeamento Personalizável de Botões</span>
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Clique em uma ação e pressione qualquer botão do controle
                        para redefinir. Combos{' '}
                        <strong className="text-[var(--text-primary)]">
                          Start + Select
                        </strong>{' '}
                        são ignorados automaticamente para evitar conflito com
                        GameSir / 8BitDo.
                      </p>
                    </div>
                  </div>

                  {captureMessage && (
                    <div
                      className="theme-control px-4 py-3 border flex items-center gap-2.5 text-sm font-semibold text-[var(--text-primary)]"
                      style={{
                        backgroundColor: 'rgba(var(--accent-rgb), 0.12)',
                        borderColor: 'var(--accent)',
                      }}
                    >
                      <AlertTriangle
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                      <span>{captureMessage}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    {REMAPPABLE_ACTIONS_META.map((meta, actionIdx) => {
                      const flatIdx = CONTROLLER_OPTIONS.length + 1 + actionIdx;
                      const isFocused =
                        focusPane === 'content' && contentFocusIndex === flatIdx;
                      const isCapturing = capturingAction === meta.id;
                      const mappedBtnIdx = buttonMapping[meta.id];

                      return (
                        <button
                          key={meta.id}
                          ref={(el) => {
                            contentRefs.current[flatIdx] = el;
                          }}
                          type="button"
                          onMouseEnter={() => {
                            setFocusPane('content');
                            setContentFocusIndex(flatIdx);
                          }}
                          onClick={() => {
                            if (isCapturing) {
                              soundEngine.playCancel();
                              onCancelCaptureButton();
                            } else {
                              soundEngine.playMove();
                              onStartCaptureButton(meta.id);
                            }
                          }}
                          className="theme-control w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-left transition-all cursor-pointer"
                          style={{
                            backgroundColor: isCapturing
                              ? 'rgba(var(--accent-rgb), 0.22)'
                              : isFocused
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                            border:
                              isCapturing || isFocused
                                ? '2px solid var(--accent)'
                                : '1px solid var(--border-subtle)',
                            boxShadow:
                              isCapturing || isFocused
                                ? 'var(--accent-glow)'
                                : undefined,
                          }}
                        >
                          <div className="min-w-0">
                            <p className="font-display text-base font-bold text-[var(--text-primary)]">
                              {meta.label}
                            </p>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                              {meta.description}
                            </p>
                          </div>

                          <span
                            className={`theme-control px-3.5 py-2 text-xs sm:text-sm font-mono-tech font-bold shrink-0 border ${
                              isCapturing ? 'animate-pulse' : ''
                            }`}
                            style={{
                              backgroundColor: isCapturing
                                ? 'var(--accent)'
                                : 'var(--bg-surface)',
                              borderColor: isCapturing
                                ? 'var(--accent)'
                                : 'var(--border-subtle)',
                              color: isCapturing
                                ? '#FFFFFF'
                                : 'var(--text-primary)',
                            }}
                          >
                            {isCapturing
                              ? 'Pressione um botão... (Esc cancela)'
                              : formatGamepadButtonName(
                                  mappedBtnIdx,
                                  resolvedActiveLayout
                                )}
                          </span>
                        </button>
                      );
                    })}

                    {/* Restaurar Padrão */}
                    {(() => {
                      const resetIdx =
                        CONTROLLER_OPTIONS.length +
                        1 +
                        REMAPPABLE_ACTIONS_META.length;
                      const isResetFocused =
                        focusPane === 'content' &&
                        contentFocusIndex === resetIdx;

                      return (
                        <button
                          ref={(el) => {
                            contentRefs.current[resetIdx] = el;
                          }}
                          type="button"
                          onMouseEnter={() => {
                            setFocusPane('content');
                            setContentFocusIndex(resetIdx);
                          }}
                          onClick={() => {
                            onResetButtonMapping();
                            showToast(
                              'Mapeamento de botões restaurado para o padrão!'
                            );
                          }}
                          className="theme-control w-full flex items-center justify-center gap-2.5 p-3.5 text-sm lg:text-base font-bold transition-all cursor-pointer mt-1"
                          style={{
                            backgroundColor: isResetFocused
                              ? 'rgba(var(--accent-rgb), 0.16)'
                              : 'var(--bg-surface)',
                            border: isResetFocused
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                            color: isResetFocused
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
                            boxShadow: isResetFocused
                              ? 'var(--accent-glow)'
                              : undefined,
                          }}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restaurar Padrão</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Capas & API SteamGridDB */}
            {activeCategory === 'covers' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl lg:text-2xl font-extrabold text-[var(--text-primary)]">
                    Capas &amp; API SteamGridDB
                  </h2>
                  <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1">
                    Configure sua chave gratuita para buscar capas verticais
                    diretamente pelo nome do jogo ao adicionar ou editar títulos.
                  </p>
                </div>

                {/* Campo Grande da API Key */}
                <div
                  className="theme-control p-5 border space-y-3"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <label
                    htmlFor="sgdb-api-key-input"
                    className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]"
                  >
                    <KeyRound
                      className="w-5 h-5"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span>API Key do SteamGridDB</span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        id="sgdb-api-key-input"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Cole aqui sua chave da API do SteamGridDB..."
                        className="theme-control w-full px-4 py-3 pr-12 border text-base font-mono-tech text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((v) => !v)}
                        aria-label={
                          showApiKey ? 'Ocultar chave' : 'Mostrar chave'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      ref={(el) => {
                        contentRefs.current[0] = el;
                      }}
                      type="button"
                      onMouseEnter={() => {
                        setFocusPane('content');
                        setContentFocusIndex(0);
                      }}
                      onClick={handleSaveApiKey}
                      className="theme-control inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-bold text-white cursor-pointer hover:brightness-110 shrink-0"
                      style={{
                        backgroundColor: 'var(--accent)',
                        border:
                          focusPane === 'content' && contentFocusIndex === 0
                            ? '2px solid var(--text-primary)'
                            : '2px solid transparent',
                        boxShadow: 'var(--accent-glow)',
                      }}
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Chave</span>
                    </button>

                    <button
                      ref={(el) => {
                        contentRefs.current[1] = el;
                      }}
                      type="button"
                      onMouseEnter={() => {
                        setFocusPane('content');
                        setContentFocusIndex(1);
                      }}
                      onClick={handleClearApiKey}
                      className="theme-control inline-flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border:
                          focusPane === 'content' && contentFocusIndex === 1
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpar</span>
                    </button>
                  </div>
                </div>

                {/* Guia Visual Claro */}
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
                  {/* Diagrama 2:3 */}
                  <div
                    className="theme-control p-4 border flex flex-col items-center justify-center text-center gap-3"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div
                      className="w-24 aspect-[2/3] border-2 border-dashed flex flex-col items-center justify-center p-2"
                      style={{
                        borderColor: 'var(--accent)',
                        backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                        borderRadius: 'var(--btn-radius)',
                      }}
                    >
                      <span className="font-mono-tech text-sm font-bold text-[var(--text-primary)]">
                        600×900
                      </span>
                      <span
                        className="text-xs font-semibold mt-0.5"
                        style={{ color: 'var(--accent)' }}
                      >
                        Proporção 2:3
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                      .PNG, .JPG ou .WEBP
                    </p>
                  </div>

                  {/* Explicação e Passo a Passo */}
                  <div
                    className="theme-control p-5 border space-y-4"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div>
                      <h3 className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                        Dimensões Ideais para Capas Personalizadas
                      </h3>
                      <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Use imagens verticais de{' '}
                        <strong className="text-[var(--text-primary)]">
                          600 × 900 pixels (proporção 2:3)
                        </strong>{' '}
                        em <strong className="text-[var(--text-primary)]">.PNG</strong>,{' '}
                        <strong className="text-[var(--text-primary)]">.JPG</strong> ou{' '}
                        <strong className="text-[var(--text-primary)]">.WEBP</strong>. Ao importar um arquivo do seu PC, o Pad2PS redimensiona automaticamente para 600×900.
                      </p>
                    </div>

                    <div
                      className="pt-3 border-t"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <h3 className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)] mb-2">
                        Como gerar sua chave gratuita no steamgriddb.com:
                      </h3>
                      <ol className="space-y-1.5 text-sm lg:text-base text-[var(--text-secondary)] list-decimal list-inside">
                        <li>
                          Acesse{' '}
                          <a
                            href="https://www.steamgriddb.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline hover:text-[var(--text-primary)]"
                            style={{ color: 'var(--accent)' }}
                          >
                            steamgriddb.com
                          </a>{' '}
                          e faça login com sua conta Steam.
                        </li>
                        <li>
                          Abra <strong className="text-[var(--text-primary)]">Preferences</strong> no menu do seu perfil.
                        </li>
                        <li>
                          Selecione a aba <strong className="text-[var(--text-primary)]">API</strong>.
                        </li>
                        <li>
                          Clique em <strong className="text-[var(--text-primary)]">Generate API Key</strong>, copie o código e salve acima.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Biblioteca & Dados */}
            {activeCategory === 'library' && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl lg:text-2xl font-extrabold text-[var(--text-primary)]">
                    Biblioteca &amp; Dados
                  </h2>
                  <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1">
                    Gerencie seus jogos, faça backup em{' '}
                    <code className="font-mono-tech text-[var(--text-primary)]">
                      jogos.json
                    </code>{' '}
                    ou restaure os títulos de demonstração.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      label: 'Adicionar Novo Jogo',
                      desc: 'Cadastrar título Steam, Epic, Heroic, GOG, Emulador ou comando personalizado.',
                      icon: Plus,
                      onClick: onAddGame,
                      highlight: true,
                    },
                    {
                      label: 'Exportar jogos.json',
                      desc: `Baixar backup completo da biblioteca atual (${games.length} jogos).`,
                      icon: Download,
                      onClick: () => {
                        soundEngine.playConfirm();
                        handleExportJson();
                      },
                    },
                    {
                      label: 'Importar jogos.json',
                      desc: 'Carregar um arquivo JSON exportado anteriormente ou gerado por scripts externos.',
                      icon: Upload,
                      onClick: () => {
                        soundEngine.playMove();
                        fileInputRef.current?.click();
                      },
                    },
                    {
                      label: 'Restaurar Jogos de Exemplo',
                      desc: 'Substitui a lista atual pelos 8 jogos padrão de demonstração do Pad2PS.',
                      icon: RotateCcw,
                      onClick: () => {
                        onResetDefaultGames();
                        showToast('Biblioteca padrão restaurada (8 jogos).');
                      },
                    },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    const isFocused =
                      focusPane === 'content' && contentFocusIndex === idx;
                    return (
                      <button
                        key={item.label}
                        ref={(el) => {
                          contentRefs.current[idx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(idx);
                        }}
                        onClick={item.onClick}
                        className="theme-control w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor: isFocused
                            ? 'rgba(var(--accent-rgb), 0.14)'
                            : 'var(--bg-deep)',
                          border: isFocused
                            ? '2px solid var(--accent)'
                            : item.highlight
                            ? '1.5px solid rgba(var(--accent-rgb), 0.5)'
                            : '1px solid var(--border-subtle)',
                          boxShadow: isFocused
                            ? 'var(--accent-glow)'
                            : undefined,
                        }}
                      >
                        <div
                          className="theme-control w-12 h-12 border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: item.highlight
                              ? 'var(--accent)'
                              : 'var(--bg-surface)',
                            borderColor: item.highlight
                              ? 'var(--accent)'
                              : 'var(--border-subtle)',
                            color: item.highlight ? '#FFFFFF' : 'var(--accent)',
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                            {item.label}
                          </p>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Energia & Web Pad2PS */}
            {activeCategory === 'power' && (
              <div className="space-y-6">
                <input
                  ref={customImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />

                <div>
                  <h2 className="font-display text-xl lg:text-2xl font-extrabold text-[var(--text-primary)]">
                    Energia &amp; Web Pad2PS
                  </h2>
                  <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-1">
                    Acesse o site oficial Pad2PS, configure o Modo Descanso
                    automático (OLED, Galeria de Jogos ou Wallpaper) ou gerencie
                    energia.
                  </p>
                </div>

                {/* Ações Rápidas: Site Oficial & Ativar Descanso */}
                <div className="flex flex-col gap-3">
                  {/* 0: Link Externo Testador & Tradutor Pad2PS */}
                  <a
                    ref={(el) => {
                      contentRefs.current[0] = el;
                    }}
                    href={safeTranslatorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => {
                      setFocusPane('content');
                      setContentFocusIndex(0);
                    }}
                    className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor:
                        focusPane === 'content' && contentFocusIndex === 0
                          ? 'rgba(var(--accent-rgb), 0.16)'
                          : 'var(--bg-deep)',
                      border:
                        focusPane === 'content' && contentFocusIndex === 0
                          ? '2px solid var(--accent)'
                          : '1.5px solid rgba(var(--accent-rgb), 0.55)',
                      boxShadow:
                        focusPane === 'content' && contentFocusIndex === 0
                          ? 'var(--accent-glow)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="theme-control w-12 h-12 flex items-center justify-center shrink-0 text-white"
                        style={{
                          backgroundColor: 'var(--accent)',
                          boxShadow: 'var(--accent-glow)',
                        }}
                      >
                        <ExternalLink className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                          Abrir Testador &amp; Tradutor Pad2PS (pad2ps.vercel.app)
                        </p>
                        <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          Acesse o testador de controles e tradutor visual de prompts PlayStation ↔ Xbox/PC ({safeTranslatorUrl}).
                        </p>
                      </div>
                    </div>
                  </a>

                  {/* 1: Ativar Modo Descanso Agora */}
                  <button
                    ref={(el) => {
                      contentRefs.current[1] = el;
                    }}
                    type="button"
                    onMouseEnter={() => {
                      setFocusPane('content');
                      setContentFocusIndex(1);
                    }}
                    onClick={() => {
                      soundEngine.playCancel();
                      onSleepMode();
                    }}
                    className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor:
                        focusPane === 'content' && contentFocusIndex === 1
                          ? 'rgba(var(--accent-rgb), 0.14)'
                          : 'var(--bg-deep)',
                      border:
                        focusPane === 'content' && contentFocusIndex === 1
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                      boxShadow:
                        focusPane === 'content' && contentFocusIndex === 1
                          ? 'var(--accent-glow)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="theme-control w-12 h-12 border flex items-center justify-center shrink-0 text-amber-400"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <Moon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                          Ativar Modo Descanso Agora
                        </p>
                        <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          Inicia imediatamente a tela de descanso configurada abaixo.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Configurações do Modo Descanso */}
                <div
                  className="pt-5 border-t space-y-5"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <h3 className="font-display text-lg lg:text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
                      <Clock
                        className="w-5 h-5 shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                      <span>Tempo de Ativação Automática</span>
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Inicia o Modo Descanso automaticamente após inatividade
                      (pausado enquanto houver um jogo em execução).
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3">
                      {IDLE_TIMEOUT_OPTIONS.map((opt, idx) => {
                        const flatIdx = 2 + idx;
                        const isActive =
                          settings.idleTimeoutMinutes === opt.value;
                        const isFocused =
                          focusPane === 'content' &&
                          contentFocusIndex === flatIdx;

                        return (
                          <button
                            key={opt.value}
                            ref={(el) => {
                              contentRefs.current[flatIdx] = el;
                            }}
                            type="button"
                            onMouseEnter={() => {
                              setFocusPane('content');
                              setContentFocusIndex(flatIdx);
                            }}
                            onClick={() => onChangeIdleTimeout(opt.value)}
                            className="theme-control px-3 py-3 text-sm font-bold text-center transition-all cursor-pointer"
                            style={{
                              backgroundColor: isActive
                                ? 'var(--accent)'
                                : isFocused
                                ? 'rgba(var(--accent-rgb), 0.16)'
                                : 'var(--bg-deep)',
                              border: isFocused
                                ? '2px solid var(--text-primary)'
                                : isActive
                                ? '1.5px solid var(--accent)'
                                : '1px solid var(--border-subtle)',
                              color: isActive
                                ? '#FFFFFF'
                                : 'var(--text-primary)',
                              boxShadow:
                                isActive || isFocused
                                  ? 'var(--accent-glow)'
                                  : undefined,
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estilo da Tela de Descanso */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-display text-lg lg:text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
                        <Monitor
                          className="w-5 h-5 shrink-0"
                          style={{ color: 'var(--accent)' }}
                        />
                        <span>Estilo da Tela de Descanso</span>
                      </h3>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {SCREENSAVER_MODE_OPTIONS.map((modeOpt, idx) => {
                        const flatIdx = 2 + IDLE_TIMEOUT_OPTIONS.length + idx;
                        const Icon = modeOpt.icon;
                        const isActive = settings.screensaverMode === modeOpt.id;
                        const isFocused =
                          focusPane === 'content' &&
                          contentFocusIndex === flatIdx;

                        return (
                          <button
                            key={modeOpt.id}
                            ref={(el) => {
                              contentRefs.current[flatIdx] = el;
                            }}
                            type="button"
                            onMouseEnter={() => {
                              setFocusPane('content');
                              setContentFocusIndex(flatIdx);
                            }}
                            onClick={() => onChangeScreensaverMode(modeOpt.id)}
                            className="theme-control w-full flex items-center justify-between gap-4 p-4 text-left transition-all cursor-pointer"
                            style={{
                              backgroundColor: isFocused
                                ? 'rgba(var(--accent-rgb), 0.14)'
                                : 'var(--bg-deep)',
                              border: isFocused
                                ? '2px solid var(--accent)'
                                : isActive
                                ? '1.5px solid var(--accent)'
                                : '1px solid var(--border-subtle)',
                              boxShadow: isFocused
                                ? 'var(--accent-glow)'
                                : undefined,
                            }}
                          >
                            <div className="flex items-start sm:items-center gap-4 min-w-0">
                              <div
                                className="theme-control w-11 h-11 border flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: isActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-surface)',
                                  borderColor: isActive
                                    ? 'var(--accent)'
                                    : 'var(--border-subtle)',
                                  color: isActive ? '#FFFFFF' : 'var(--accent)',
                                }}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                                  {modeOpt.label}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                  {modeOpt.desc}
                                </p>
                              </div>
                            </div>

                            {isActive && (
                              <span
                                className="theme-control px-3 py-1 text-xs font-bold text-white shrink-0 inline-flex items-center gap-1"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Ativo</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Painel Extra: Imagem Personalizada */}
                    {hasCustomImageControls && (() => {
                      const customUploadIdx =
                        2 +
                        IDLE_TIMEOUT_OPTIONS.length +
                        SCREENSAVER_MODE_OPTIONS.length;
                      const customUrlApplyIdx = customUploadIdx + 1;

                      return (
                        <div
                          className="theme-control p-4 sm:p-5 border space-y-4 mt-2"
                          style={{
                            backgroundColor: 'var(--bg-deep)',
                            borderColor: 'rgba(var(--accent-rgb), 0.45)',
                          }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="font-display text-base font-bold text-[var(--text-primary)]">
                                Configurar Imagem Personalizada (1920×1080)
                              </p>
                              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                                Envie um arquivo do seu PC (otimizado
                                automaticamente em 1920×1080) ou cole uma URL.
                              </p>
                            </div>

                            <button
                              ref={(el) => {
                                contentRefs.current[customUploadIdx] = el;
                              }}
                              type="button"
                              disabled={optimizingWallpaper}
                              onMouseEnter={() => {
                                setFocusPane('content');
                                setContentFocusIndex(customUploadIdx);
                              }}
                              onClick={() => customImageInputRef.current?.click()}
                              className="theme-control inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white cursor-pointer hover:brightness-110 shrink-0 disabled:opacity-60"
                              style={{
                                backgroundColor: 'var(--accent)',
                                border:
                                  focusPane === 'content' &&
                                  contentFocusIndex === customUploadIdx
                                    ? '2px solid var(--text-primary)'
                                    : '2px solid transparent',
                                boxShadow: 'var(--accent-glow)',
                              }}
                            >
                              <Upload className="w-4 h-4" />
                              <span>
                                {optimizingWallpaper
                                  ? 'Otimizando 1920×1080...'
                                  : 'Enviar do PC'}
                              </span>
                            </button>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                              type="url"
                              value={customImageUrlInput}
                              onChange={(e) =>
                                setCustomImageUrlInput(e.target.value)
                              }
                              placeholder="Ou cole a URL do wallpaper (https://...)"
                              className="theme-control flex-1 px-4 py-2.5 border text-sm font-mono-tech text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            />

                            <button
                              ref={(el) => {
                                contentRefs.current[customUrlApplyIdx] = el;
                              }}
                              type="button"
                              onMouseEnter={() => {
                                setFocusPane('content');
                                setContentFocusIndex(customUrlApplyIdx);
                              }}
                              onClick={handleApplyCustomImageUrl}
                              className="theme-control inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold cursor-pointer shrink-0"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                border:
                                  focusPane === 'content' &&
                                  contentFocusIndex === customUrlApplyIdx
                                    ? '2px solid var(--accent)'
                                    : '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <Save className="w-4 h-4" />
                              <span>Aplicar URL</span>
                            </button>
                          </div>

                          {settings.screensaverCustomImage && (
                            <div
                              className="theme-control p-3 border flex items-center justify-between gap-4"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={settings.screensaverCustomImage}
                                  alt="Prévia do Modo Descanso"
                                  referrerPolicy="no-referrer"
                                  className="theme-control w-24 aspect-video object-cover border shrink-0"
                                  style={{ borderColor: 'var(--border-subtle)' }}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[var(--text-primary)]">
                                    Imagem ativa no Modo Descanso
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)] truncate">
                                    {settings.screensaverCustomImage.startsWith(
                                      'data:'
                                    )
                                      ? 'Imagem local otimizada (1920×1080)'
                                      : settings.screensaverCustomImage}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setCustomImageUrlInput('');
                                  onChangeScreensaverCustomImage('');
                                  soundEngine.playCancel();
                                  showToast('Imagem personalizada removida.');
                                }}
                                aria-label="Remover imagem personalizada"
                                className="theme-control p-2 text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Utilitários do Sistema (Logo PNG & Reiniciar) */}
                {(() => {
                  const autostartIdx =
                    2 +
                    IDLE_TIMEOUT_OPTIONS.length +
                    SCREENSAVER_MODE_OPTIONS.length +
                    customControlsCount;
                  const downloadIdx = autostartIdx + 1;
                  const downloadIconIdx = autostartIdx + 2;
                  const checkUpdatesIdx = autostartIdx + 3;
                  const restartIdx = autostartIdx + 4;
                  const quitIdx = autostartIdx + 5;

                  return (
                    <div
                      className="pt-5 border-t flex flex-col gap-3"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      {/* Iniciar com o Sistema (Modo Console - Opcional) */}
                      <button
                        ref={(el) => {
                          contentRefs.current[autostartIdx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(autostartIdx);
                        }}
                        onClick={handleToggleAutostart}
                        className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === autostartIdx
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === autostartIdx
                              ? '2px solid var(--accent)'
                              : autostartEnabled
                              ? '1.5px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === autostartIdx
                              ? 'var(--accent-glow)'
                              : undefined,
                        }}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className="theme-control w-12 h-12 border flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: autostartEnabled
                                ? 'var(--accent)'
                                : 'var(--bg-surface)',
                              borderColor: autostartEnabled
                                ? 'var(--accent)'
                                : 'var(--border-subtle)',
                              color: autostartEnabled ? '#FFFFFF' : 'var(--accent)',
                            }}
                          >
                            <Gamepad2 className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                              Iniciar com o Sistema (Modo Console)
                            </p>
                            <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                              Opcional: se ativado, abre o Pad2PS Launcher em tela cheia ao ligar o PC (estilo Steam Deck).
                            </p>
                          </div>
                        </div>

                        <span
                          className="theme-control px-4 py-2 text-sm font-bold shrink-0"
                          style={{
                            backgroundColor: autostartEnabled
                              ? 'var(--accent)'
                              : 'var(--bg-surface)',
                            color: autostartEnabled
                              ? '#FFFFFF'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {autostartEnabled ? 'Ativado' : 'Desativado'}
                        </span>
                      </button>

                      {/* Baixar Logo PNG */}
                      <button
                        ref={(el) => {
                          contentRefs.current[downloadIdx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(downloadIdx);
                        }}
                        onClick={() => {
                          soundEngine.playConfirm();
                          handleDownloadLogo('full');
                        }}
                        className="theme-control w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIdx
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIdx
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIdx
                              ? 'var(--accent-glow)'
                              : undefined,
                        }}
                      >
                        <div
                          className="theme-control w-12 h-12 border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--accent)',
                          }}
                        >
                          <Download className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                            {exportingLogo
                              ? 'Gerando PNG 1024×1024...'
                              : 'Baixar Logo Completa (PNG 1024×1024)'}
                          </p>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            Exporta o Cartucho Neon + assinatura Pad2PS LAUNCHER com fundo transparente na cor do tema ativo.
                          </p>
                        </div>
                      </button>

                      {/* Baixar Ícone do Cartucho PNG */}
                      <button
                        ref={(el) => {
                          contentRefs.current[downloadIconIdx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(downloadIconIdx);
                        }}
                        onClick={() => {
                          soundEngine.playConfirm();
                          handleDownloadLogo('icon');
                        }}
                        className="theme-control w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIconIdx
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIconIdx
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === downloadIconIdx
                              ? 'var(--accent-glow)'
                              : undefined,
                        }}
                      >
                        <div
                          className="theme-control w-12 h-12 border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--accent)',
                          }}
                        >
                          <Download className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                            {exportingLogo
                              ? 'Gerando PNG 1024×1024...'
                              : 'Baixar Ícone do Cartucho (PNG 1024×1024)'}
                          </p>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            Exporta apenas o ícone quadrado (squircle) do Cartucho Neon em alta resolução e fundo transparente.
                          </p>
                        </div>
                      </button>

                      {/* Verificar Atualizações */}
                      <button
                        ref={(el) => {
                          contentRefs.current[checkUpdatesIdx] = el;
                        }}
                        type="button"
                        disabled={isCheckingUpdates}
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(checkUpdatesIdx);
                        }}
                        onClick={handleCheckUpdates}
                        className="theme-control w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === checkUpdatesIdx
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === checkUpdatesIdx
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === checkUpdatesIdx
                              ? 'var(--accent-glow)'
                              : undefined,
                        }}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className="theme-control w-12 h-12 border flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent)',
                            }}
                          >
                            <RefreshCw className={`w-6 h-6 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                              Verificar Atualizações
                            </p>
                            <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                              Versão v1.0.4 instalada. Consulta releases oficiais no GitHub e oferece downloads compatíveis.
                            </p>
                          </div>
                        </div>

                        <span
                          className="theme-control px-4 py-2 text-sm font-bold shrink-0 text-white"
                          style={{
                            backgroundColor: 'var(--accent)',
                          }}
                        >
                          {isCheckingUpdates ? 'Verificando...' : 'Checar'}
                        </span>
                      </button>

                      {/* Reiniciar Launcher */}
                      <button
                        ref={(el) => {
                          contentRefs.current[restartIdx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(restartIdx);
                        }}
                        onClick={onRestart}
                        className="theme-control w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === restartIdx
                              ? 'rgba(var(--accent-rgb), 0.14)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === restartIdx
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border-subtle)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === restartIdx
                              ? 'var(--accent-glow)'
                              : undefined,
                        }}
                      >
                        <div
                          className="theme-control w-12 h-12 border flex items-center justify-center shrink-0 text-rose-400"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <FileJson className="w-6 h-6 hidden" />
                          <RotateCcw className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base lg:text-lg font-bold text-[var(--text-primary)]">
                            Reiniciar Launcher
                          </p>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            Recarrega a interface e reescaneia todos os jogos instalados.
                          </p>
                        </div>
                      </button>

                      {/* Sair do Pad2PS Launcher */}
                      <button
                        ref={(el) => {
                          contentRefs.current[quitIdx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => {
                          setFocusPane('content');
                          setContentFocusIndex(quitIdx);
                        }}
                        onClick={handleQuitApp}
                        className="theme-control w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            focusPane === 'content' &&
                            contentFocusIndex === quitIdx
                              ? 'rgba(244, 63, 94, 0.2)'
                              : 'var(--bg-deep)',
                          border:
                            focusPane === 'content' &&
                            contentFocusIndex === quitIdx
                              ? '2px solid #F43F5E'
                              : '1px solid rgba(244, 63, 94, 0.35)',
                          boxShadow:
                            focusPane === 'content' &&
                            contentFocusIndex === quitIdx
                              ? '0 0 24px rgba(244, 63, 94, 0.45)'
                              : undefined,
                        }}
                      >
                        <div
                          className="theme-control w-12 h-12 border flex items-center justify-center shrink-0 text-rose-500"
                          style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.12)',
                            borderColor: 'rgba(244, 63, 94, 0.4)',
                          }}
                        >
                          <Power className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base lg:text-lg font-bold text-rose-400">
                            Sair do Pad2PS Launcher
                          </p>
                          <p className="text-sm lg:text-base text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            Encerra o aplicativo e retorna para a área de trabalho do sistema.
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }
);

SystemView.displayName = 'SystemView';
