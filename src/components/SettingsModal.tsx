import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Check,
  Code2,
  Download,
  ExternalLink,
  FileJson,
  Gamepad2,
  Palette,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DEFAULT_TRANSLATOR_URL, THEMES } from '../data/defaultGames';
import {
  ControllerLayout,
  Game,
  LauncherSettings,
  ResolvedControllerLayout,
  ThemeId,
} from '../types';
import { exportPad2PSLogoPng } from '../utils/logoExport';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
  TabPairKeyCap,
} from './ControllerIcons';
import { Logo } from './Logo';

export interface SettingsModalHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
}

interface SettingsModalProps {
  settings: LauncherSettings;
  detectedLayout: ResolvedControllerLayout;
  games: Game[];
  onChangeTheme: (theme: ThemeId) => void;
  onChangeControllerLayout: (layout: ControllerLayout) => void;
  onChangeTranslatorUrl: (url: string) => void;
  onToggleSound: () => void;
  onImportGames: (games: Game[]) => void;
  onResetDefaultGames: () => void;
  onClose: () => void;
}

// 2D focus grid for D-Pad / Arrow navigation across all interactive controls:
// 0..4: Themes (5 complete themes: 2 + 2 + 1),
// 5..8: Controller Layouts (2x2: Automático, PlayStation, Xbox, Nintendo),
// 9: Sound toggle,
// 10: Download Logo PNG,
// 11: Restore Default Translator URL,
// 12..14: Export / Import / Reset JSON,
// 15: Close button
const SETTINGS_GRID: number[][] = [
  [0, 1],
  [2, 3],
  [4],
  [5, 6],
  [7, 8],
  [9],
  [10],
  [11],
  [12, 13, 14],
  [15],
];

const CONTROLLER_OPTIONS: {
  id: ControllerLayout;
  label: string;
  desc: string;
}[] = [
  { id: 'auto', label: 'Automático', desc: 'Detecta pelo controle' },
  { id: 'playstation', label: 'PlayStation', desc: '✕ ○ □ △ · L1/R1' },
  { id: 'xbox', label: 'Xbox / PC', desc: 'A B X Y · LB/RB' },
  { id: 'nintendo', label: 'Nintendo', desc: 'B A Y X · L/R' },
];

function findGridPosition(index: number): [number, number] {
  for (let r = 0; r < SETTINGS_GRID.length; r++) {
    const c = SETTINGS_GRID[r].indexOf(index);
    if (c !== -1) return [r, c];
  }
  return [0, 0];
}

export const SettingsModal = forwardRef<
  SettingsModalHandle,
  SettingsModalProps
>(
  (
    {
      settings,
      detectedLayout,
      games,
      onChangeTheme,
      onChangeControllerLayout,
      onChangeTranslatorUrl,
      onToggleSound,
      onImportGames,
      onResetDefaultGames,
      onClose,
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number>(0);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [exportingLogo, setExportingLogo] = useState(false);

    const activeTheme =
      THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];

    const showToast = (msg: string) => {
      setFeedback(msg);
      window.setTimeout(() => setFeedback(null), 3200);
    };

    const handleDownloadLogo = async () => {
      try {
        setExportingLogo(true);
        await exportPad2PSLogoPng(activeTheme.hex);
        showToast('Logo pad2ps-launcher-logo.png (1024x1024) baixada!');
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

    useEffect(() => {
      const el = itemRefs.current[focusedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [focusedIndex]);

    const activateFocused = (idx: number) => {
      if (idx >= 0 && idx <= 4) {
        onChangeTheme(THEMES[idx].id);
        return;
      }
      if (idx >= 5 && idx <= 8) {
        onChangeControllerLayout(CONTROLLER_OPTIONS[idx - 5].id);
        return;
      }
      if (idx === 9) {
        onToggleSound();
        return;
      }
      if (idx === 10) {
        soundEngine.playConfirm();
        handleDownloadLogo();
        return;
      }
      if (idx === 11) {
        soundEngine.playTab();
        onChangeTranslatorUrl(DEFAULT_TRANSLATOR_URL);
        showToast('Link do Tradutor Pad2PS restaurado para o padrão.');
        return;
      }
      if (idx === 12) {
        soundEngine.playConfirm();
        handleExportJson();
        return;
      }
      if (idx === 13) {
        soundEngine.playMove();
        fileInputRef.current?.click();
        return;
      }
      if (idx === 14) {
        onResetDefaultGames();
        showToast('Biblioteca padrão restaurada (8 jogos).');
        return;
      }
      if (idx === 15) {
        onClose();
      }
    };

    useImperativeHandle(ref, () => ({
      navigate: (dir) => {
        soundEngine.playMove();
        setFocusedIndex((curr) => {
          const [row, col] = findGridPosition(curr);
          if (dir === 'left') {
            const r = SETTINGS_GRID[row];
            return r[(col - 1 + r.length) % r.length];
          }
          if (dir === 'right') {
            const r = SETTINGS_GRID[row];
            return r[(col + 1) % r.length];
          }
          if (dir === 'up') {
            const prevRow =
              (row - 1 + SETTINGS_GRID.length) % SETTINGS_GRID.length;
            const r = SETTINGS_GRID[prevRow];
            return r[Math.min(col, r.length - 1)];
          }
          const nextRow = (row + 1) % SETTINGS_GRID.length;
          const r = SETTINGS_GRID[nextRow];
          return r[Math.min(col, r.length - 1)];
        });
      },
      confirm: () => {
        activateFocused(focusedIndex);
      },
    }));

    const focusStyle = (
      idx: number,
      baseBorder = '1px solid var(--border-subtle)'
    ) => {
      const isFocused = focusedIndex === idx;
      return isFocused
        ? {
            border: '1.5px solid var(--accent)',
            boxShadow: 'var(--accent-glow)',
          }
        : { border: baseBorder };
    };

    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="theme-surface w-full max-w-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar">
          <div
            className="flex items-center justify-between gap-4 pb-4 mb-5 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                Sistema Pad2PS
              </p>
              <h2
                id="settings-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]"
              >
                Configurações do Launcher
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar configurações"
              className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {feedback && (
            <div
              className="theme-control mb-5 px-4 py-2.5 border text-xs font-medium text-[var(--text-primary)] flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--accent)',
              }}
            >
              <Check
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--accent)' }}
              />
              <span>{feedback}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* 1. 5 Complete Themes Selector (indices 0..4) */}
            <section>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-3">
                <Palette
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                />
                <h3>Temas do Console (Cores, Bordas e Áudio)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((theme, idx) => {
                  const isActive = settings.theme === theme.id;
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={theme.id}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => onChangeTheme(theme.id)}
                      className={`theme-control flex items-center justify-between p-3.5 transition-all text-left cursor-pointer ${
                        idx === 4 ? 'sm:col-span-2' : ''
                      }`}
                      style={{
                        border: isFocused
                          ? '1.5px solid var(--accent)'
                          : isActive
                          ? `1.5px solid ${theme.hex}`
                          : '1px solid var(--border-subtle)',
                        boxShadow: isFocused
                          ? 'var(--accent-glow)'
                          : isActive
                          ? `0 0 14px rgba(${theme.rgb}, 0.25)`
                          : undefined,
                        backgroundColor: isFocused
                          ? 'rgba(var(--accent-rgb), 0.1)'
                          : 'var(--bg-deep)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-7 h-7 shrink-0 border border-white/25 flex items-center justify-center"
                          style={{
                            borderRadius: theme.id === 'pixel' ? '0px' : '9999px',
                            background: theme.secondaryHex
                              ? `linear-gradient(135deg, ${theme.hex}, ${theme.secondaryHex})`
                              : theme.hex,
                            boxShadow: `0 0 12px rgba(${theme.rgb}, 0.65)`,
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {theme.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {theme.subtitle}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <Check
                          className="w-4 h-4 shrink-0"
                          style={{ color: theme.hex }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Controller Button Layout (indices 5..8) */}
            <section
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-3">
                <Gamepad2
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                />
                <h3>Padrão de Botões do Controle</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONTROLLER_OPTIONS.map((opt, i) => {
                  const idx = 5 + i;
                  const isActive = settings.controllerLayout === opt.id;
                  const isFocused = focusedIndex === idx;
                  const previewLayout: ResolvedControllerLayout =
                    opt.id === 'auto' ? detectedLayout : opt.id;

                  return (
                    <button
                      key={opt.id}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => onChangeControllerLayout(opt.id)}
                      className="theme-control flex items-center justify-between gap-3 p-3.5 transition-all text-left cursor-pointer"
                      style={{
                        border: isFocused
                          ? '1.5px solid var(--accent)'
                          : isActive
                          ? '1.5px solid rgba(var(--accent-rgb), 0.7)'
                          : '1px solid var(--border-subtle)',
                        boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                        backgroundColor: isFocused
                          ? 'rgba(var(--accent-rgb), 0.1)'
                          : 'var(--bg-deep)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {opt.label}
                          </p>
                          {isActive && (
                            <Check
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--accent)' }}
                            />
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {opt.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <ConfirmButtonIcon
                          layout={previewLayout}
                          className="w-4 h-4"
                        />
                        <CancelButtonIcon
                          layout={previewLayout}
                          className="w-4 h-4"
                        />
                        <OptionsButtonIcon
                          layout={previewLayout}
                          className="w-4 h-4"
                        />
                        <FavoriteButtonIcon
                          layout={previewLayout}
                          className="w-4 h-4"
                        />
                        <TabPairKeyCap layout={previewLayout} className="ml-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Audio Settings (index 9) */}
            <section
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? (
                    <Volume2
                      className="w-5 h-5"
                      style={{ color: 'var(--accent)' }}
                    />
                  ) : (
                    <VolumeX className="w-5 h-5 text-[var(--text-secondary)]" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Efeitos Sonoros Temáticos
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Sintetizador Web Audio que adapta o timbre ao tema ativo
                      (chiptune, cyber, cozy, sombrio)
                    </p>
                  </div>
                </div>

                <button
                  ref={(el) => {
                    itemRefs.current[9] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(9)}
                  onClick={onToggleSound}
                  className={`theme-control px-4 py-2 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    settings.soundEnabled
                      ? 'text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                  style={{
                    backgroundColor: settings.soundEnabled
                      ? 'var(--accent)'
                      : 'var(--bg-deep)',
                    border:
                      focusedIndex === 9
                        ? '1.5px solid var(--accent)'
                        : settings.soundEnabled
                        ? '1.5px solid transparent'
                        : '1px solid var(--border-subtle)',
                    boxShadow:
                      focusedIndex === 9 || settings.soundEnabled
                        ? 'var(--accent-glow)'
                        : undefined,
                  }}
                >
                  {settings.soundEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>
            </section>

            {/* 4. Official Pad2PS Launcher Logo PNG Export (index 10) */}
            <section
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="theme-control flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border"
                style={{
                  backgroundColor: 'var(--bg-deep)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <Logo size="sm" accentHex={activeTheme.hex} />
                  <p className="text-xs text-[var(--text-secondary)]">
                    Exporta a logo oficial em alta resolução (1024×1024
                    transparente) na cor do tema ativo.
                  </p>
                </div>
                <button
                  ref={(el) => {
                    itemRefs.current[10] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(10)}
                  onClick={handleDownloadLogo}
                  disabled={exportingLogo}
                  className="theme-control inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-white/40 transition-all cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    ...focusStyle(10),
                  }}
                >
                  <Download
                    className="w-4 h-4"
                    style={{ color: 'var(--accent)' }}
                  />
                  <span>
                    {exportingLogo ? 'Gerando PNG...' : 'Baixar Logo (PNG)'}
                  </span>
                </button>
              </div>
            </section>

            {/* 5. Pad2PS Web Translator URL Config (index 11) */}
            <section
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-2">
                <ExternalLink
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                />
                <h3>Integração Tradutor Pad2PS (Web)</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Endereço aberto pelo botão &ldquo;Tradutor Pad2PS&rdquo; (R2 ou
                tecla T).
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="url"
                  value={settings.translatorUrl}
                  onChange={(e) => onChangeTranslatorUrl(e.target.value)}
                  placeholder={DEFAULT_TRANSLATOR_URL}
                  aria-label="URL do Tradutor Pad2PS"
                  className="theme-control flex-1 px-3.5 py-2.5 border text-xs sm:text-sm font-mono-tech text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
                <button
                  ref={(el) => {
                    itemRefs.current[11] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(11)}
                  onClick={() => {
                    soundEngine.playTab();
                    onChangeTranslatorUrl(DEFAULT_TRANSLATOR_URL);
                    showToast('Link padrão do Tradutor Pad2PS restaurado.');
                  }}
                  className="theme-control inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    ...focusStyle(11),
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
              </div>
            </section>

            {/* 6. Library JSON Import/Export & Desktop Integration (indices 12, 13, 14) */}
            <section
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-3">
                <FileJson
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                />
                <h3>Biblioteca JSON &amp; Integração Desktop</h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                  ref={(el) => {
                    itemRefs.current[12] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(12)}
                  onClick={handleExportJson}
                  className="theme-control inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-white/30 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    ...focusStyle(12),
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar jogos.json</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportJson}
                  className="hidden"
                />
                <button
                  ref={(el) => {
                    itemRefs.current[13] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(13)}
                  onClick={() => fileInputRef.current?.click()}
                  className="theme-control inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-white/30 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    ...focusStyle(13),
                  }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar jogos.json</span>
                </button>

                <button
                  ref={(el) => {
                    itemRefs.current[14] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(14)}
                  onClick={() => {
                    onResetDefaultGames();
                    showToast('Biblioteca padrão restaurada (8 jogos).');
                  }}
                  className="theme-control inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/30 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    ...focusStyle(14),
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Exemplos</span>
                </button>
              </div>

              <div
                className="theme-control p-3.5 border text-xs text-[var(--text-secondary)] flex items-start gap-2.5"
                style={{
                  backgroundColor: 'var(--bg-deep)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Code2 className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-secondary)]" />
                <div>
                  <p className="text-[var(--text-primary)] font-medium mb-0.5">
                    Endpoint para WebView Desktop / Python
                  </p>
                  <p>
                    Scripts locais podem injetar bibliotecas diretamente
                    chamando{' '}
                    <code
                      className="font-mono-tech text-[var(--text-primary)] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      window.loadExternalGames(json)
                    </code>
                    .
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div
            className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <KeyCap label="D-Pad / Setas" />
                <span>Navegar</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ConfirmButtonIcon className="w-4 h-4" />
                <span>Selecionar</span>
              </span>
            </div>

            <button
              ref={(el) => {
                itemRefs.current[15] = el;
              }}
              type="button"
              onMouseEnter={() => setFocusedIndex(15)}
              onClick={onClose}
              className="theme-control inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-white/30 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-deep)',
                ...focusStyle(15),
              }}
            >
              <CancelButtonIcon className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SettingsModal.displayName = 'SettingsModal';
