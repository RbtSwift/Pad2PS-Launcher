import React, { useRef, useState } from 'react';
import {
  Check,
  Code2,
  Download,
  FileJson,
  Palette,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { THEMES } from '../data/defaultGames';
import { Game, LauncherSettings, ThemeId } from '../types';
import { exportPad2PSLogoPng } from '../utils/logoExport';
import { Logo } from './Logo';
import { CircleIcon } from './PlayStationIcons';

interface SettingsModalProps {
  settings: LauncherSettings;
  games: Game[];
  onChangeTheme: (theme: ThemeId) => void;
  onToggleSound: () => void;
  onImportGames: (games: Game[]) => void;
  onResetDefaultGames: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  games,
  onChangeTheme,
  onToggleSound,
  onImportGames,
  onResetDefaultGames,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      <div className="w-full max-w-2xl bg-[#121218] border border-[#27273A] rounded-2xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-[#27273A]">
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Sistema Pad2PS
            </p>
            <h2
              id="settings-modal-title"
              className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F6]"
            >
              Configurações do Launcher
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className="mb-5 px-4 py-2.5 rounded-xl bg-[#0B0B0F] border text-xs font-medium text-[#F4F4F6] flex items-center gap-2"
            style={{ borderColor: 'var(--accent)' }}
          >
            <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span>{feedback}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. Theme Selector */}
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F6] mb-3">
              <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3>Tema e Cor de Destaque</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const isActive = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onChangeTheme(theme.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl bg-[#0B0B0F] transition-all text-left cursor-pointer ${
                      isActive ? 'ring-1' : 'hover:border-[#94A3B8]/50'
                    }`}
                    style={{
                      border: isActive
                        ? `1.5px solid ${theme.hex}`
                        : '1px solid #27273A',
                      boxShadow: isActive
                        ? `0 0 18px rgba(${theme.rgb}, 0.25)`
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full shrink-0 border border-white/20"
                        style={{
                          backgroundColor: theme.hex,
                          boxShadow: `0 0 12px rgba(${theme.rgb}, 0.7)`,
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#F4F4F6]">
                          {theme.name}
                        </p>
                        <p className="text-xs text-[#94A3B8]">{theme.subtitle}</p>
                      </div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 shrink-0" style={{ color: theme.hex }} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Audio Settings */}
          <section className="pt-4 border-t border-[#27273A]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                ) : (
                  <VolumeX className="w-5 h-5 text-[#94A3B8]" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-[#F4F4F6]">
                    Efeitos Sonoros da Interface
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Sintetizador Web Audio para navegação no carrossel, abas e confirmação
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleSound}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  settings.soundEnabled
                    ? 'text-white'
                    : 'bg-[#0B0B0F] border border-[#27273A] text-[#94A3B8]'
                }`}
                style={
                  settings.soundEnabled
                    ? {
                        backgroundColor: 'var(--accent)',
                        boxShadow: 'var(--accent-glow)',
                      }
                    : undefined
                }
              >
                {settings.soundEnabled ? 'Ativado' : 'Desativado'}
              </button>
            </div>
          </section>

          {/* 3. Official Pad2PS Launcher Logo PNG Export */}
          <section className="pt-4 border-t border-[#27273A]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0B0F] border border-[#27273A]">
              <div className="flex flex-col gap-1.5">
                <Logo size="sm" accentHex={activeTheme.hex} />
                <p className="text-xs text-[#94A3B8]">
                  Exporta a logo oficial em alta resolução (1024×1024 transparente) na cor do tema ativo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadLogo}
                disabled={exportingLogo}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#121218] border border-[#27273A] text-xs font-semibold text-[#F4F4F6] hover:border-white/40 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span>{exportingLogo ? 'Gerando PNG...' : 'Baixar Logo (PNG)'}</span>
              </button>
            </div>
          </section>

          {/* 4. Library JSON Import/Export & Desktop Integration */}
          <section className="pt-4 border-t border-[#27273A]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F6] mb-3">
              <FileJson className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3>Biblioteca JSON &amp; Integração Desktop</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-xs font-semibold text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
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
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-xs font-semibold text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Importar jogos.json</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetDefaultGames();
                  showToast('Biblioteca padrão restaurada (8 jogos).');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-xs font-semibold text-[#94A3B8] hover:text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar Exemplos</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-xs text-[#94A3B8] flex items-start gap-2.5">
              <Code2 className="w-4 h-4 mt-0.5 shrink-0 text-[#94A3B8]" />
              <div>
                <p className="text-[#F4F4F6] font-medium mb-0.5">
                  Endpoint para WebView Desktop / Python
                </p>
                <p>
                  Scripts locais podem injetar bibliotecas diretamente chamando{' '}
                  <code className="font-mono-tech text-[#F4F4F6] bg-[#121218] px-1.5 py-0.5 rounded">
                    window.loadExternalGames(json)
                  </code>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-[#27273A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm font-semibold text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
          >
            <CircleIcon className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
