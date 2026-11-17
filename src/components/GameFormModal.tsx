import React, { RefObject, useRef, useState } from 'react';
import { Gamepad2, ImagePlus, Search, Upload, X } from 'lucide-react';
import { Game, Platform } from '../types';
import { resizeImageFileTo600x900 } from '../utils/coverSearch';
import { CancelButtonIcon } from './ControllerIcons';
import { CoverFinderHandle, CoverFinderModal } from './CoverFinderModal';

interface GameFormModalProps {
  initialGame?: Game | null;
  coverFinderRef?: RefObject<CoverFinderHandle | null>;
  isCoverFinderOpen?: boolean;
  onCoverFinderOpenChange?: (open: boolean) => void;
  onGoToApiSettings?: () => void;
  onSave: (game: Game) => void;
  onClose: () => void;
}

const PLATFORMS: Platform[] = [
  'Steam',
  'Epic',
  'Heroic',
  'GOG',
  'Xbox',
  'Lutris',
  'itch.io',
  'Emulador',
  'Outro',
];

const CONSOLE_PRESETS = [
  'PS2',
  'PS1',
  'PSP',
  'Switch',
  'N64',
  'Xbox',
  'Wii U',
  'Dreamcast',
];

export const GameFormModal: React.FC<GameFormModalProps> = ({
  initialGame,
  coverFinderRef,
  isCoverFinderOpen: controlledFinderOpen,
  onCoverFinderOpenChange,
  onGoToApiSettings,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(initialGame);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(initialGame?.title ?? '');
  const [platform, setPlatform] = useState<Platform>(
    initialGame?.platform ?? 'Steam'
  );
  const [platformLabel, setPlatformLabel] = useState(
    initialGame?.platformLabel ?? ''
  );
  const [consoleSystem, setConsoleSystem] = useState(
    initialGame?.consoleSystem ?? ''
  );
  const [genre, setGenre] = useState(initialGame?.genre ?? '');
  const [hoursPlayed, setHoursPlayed] = useState(
    initialGame ? String(initialGame.hoursPlayed) : '0'
  );
  const [coverUrl, setCoverUrl] = useState(initialGame?.coverUrl ?? '');
  const [command, setCommand] = useState(initialGame?.command ?? '');
  const [favorite, setFavorite] = useState(initialGame?.favorite ?? false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resizingCover, setResizingCover] = useState(false);
  const [internalFinderOpen, setInternalFinderOpen] = useState(false);

  const showCoverFinder = controlledFinderOpen ?? internalFinderOpen;
  const setShowCoverFinder = (open: boolean) => {
    setInternalFinderOpen(open);
    onCoverFinderOpenChange?.(open);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setResizingCover(true);
      const optimizedDataUrl = await resizeImageFileTo600x900(file);
      setCoverUrl(optimizedDataUrl);
      setErrorMsg('');
    } catch {
      setErrorMsg('Não foi possível processar a imagem selecionada.');
    } finally {
      setResizingCover(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedCmd = command.trim();

    if (!trimmedTitle) {
      setErrorMsg('Informe o título do jogo.');
      return;
    }
    if (!trimmedCmd) {
      setErrorMsg('Informe o comando ou caminho de execução.');
      return;
    }

    const parsedHours = Math.max(0, Number.parseFloat(hoursPlayed) || 0);
    const id =
      initialGame?.id ??
      `${trimmedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

    const trimmedConsole = consoleSystem.trim();
    const resolvedLabel =
      platformLabel.trim() ||
      (platform === 'Emulador' && trimmedConsole
        ? trimmedConsole
        : platform);

    onSave({
      id,
      title: trimmedTitle,
      platform,
      platformLabel: resolvedLabel,
      consoleSystem: trimmedConsole || undefined,
      coverUrl: coverUrl.trim(),
      command: trimmedCmd,
      hoursPlayed: Number(parsedHours.toFixed(1)),
      favorite,
      genre: genre.trim() || undefined,
      lastPlayed: initialGame?.lastPlayed ?? 'Recente',
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-form-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !showCoverFinder) onClose();
        }}
      >
        <div className="theme-surface w-full max-w-3xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar">
          <div
            className="flex items-center justify-between gap-4 pb-4 mb-5 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                {isEditing ? 'Editar Biblioteca' : 'Novo Título'}
              </p>
              <h2
                id="game-form-title"
                className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]"
              >
                {isEditing ? `Editar ${initialGame?.title}` : 'Adicionar Jogo'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6"
          >
            {/* Live 2:3 Cover Preview + Local Upload (600x900) + Buscar Capa Online */}
            <div className="flex flex-col items-center gap-2.5">
              <div
                className="theme-control w-40 md:w-full aspect-[2/3] overflow-hidden border flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-deep)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Pré-visualização da capa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center p-3 text-[var(--text-secondary)]">
                    <ImagePlus className="w-8 h-8 mb-2 opacity-70" />
                    <span className="text-xs font-semibold">Capa 600×900</span>
                    <span className="text-[11px] opacity-75">Proporção 2:3</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCoverFinder(true)}
                className="theme-control w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white transition-all cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: 'var(--accent-glow)',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar Capa Online</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={resizingCover}
                onClick={() => fileInputRef.current?.click()}
                className="theme-control w-full flex items-center justify-center gap-2 px-3 py-2 border text-xs font-medium text-[var(--text-primary)] hover:border-white/30 transition-colors cursor-pointer disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--bg-deep)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {resizingCover ? 'Otimizando 600×900...' : 'Enviar do PC (600×900)'}
                </span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              {errorMsg && (
                <div className="theme-control px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="game-title"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Título do Jogo *
                </label>
                <input
                  id="game-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Ex: Cyberpunk 2077"
                  autoFocus
                  className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="game-platform"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Plataforma
                  </label>
                  <select
                    id="game-platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="game-platform-label"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Etiqueta Exibida (Opcional)
                  </label>
                  <input
                    id="game-platform-label"
                    type="text"
                    value={platformLabel}
                    onChange={(e) => setPlatformLabel(e.target.value)}
                    placeholder="Ex: PCSX2 · PS2"
                    className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  />
                </div>
              </div>

              {/* Console / System Field */}
              <div>
                <label
                  htmlFor="game-console-system"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Sistema / Console (Opcional)
                </label>
                <input
                  id="game-console-system"
                  type="text"
                  list="console-system-presets"
                  value={consoleSystem}
                  onChange={(e) => setConsoleSystem(e.target.value)}
                  placeholder="Ex: PS2, PS1, PSP, Switch, N64, Xbox, Wii U, Dreamcast"
                  className="theme-control w-full px-3.5 py-2 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
                <datalist id="console-system-presets">
                  {CONSOLE_PRESETS.map((sys) => (
                    <option key={sys} value={sys} />
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {CONSOLE_PRESETS.map((sys) => {
                    const selected =
                      consoleSystem.trim().toLowerCase() === sys.toLowerCase();
                    return (
                      <button
                        key={sys}
                        type="button"
                        onClick={() => setConsoleSystem(selected ? '' : sys)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        style={
                          selected
                            ? {
                                backgroundColor: 'rgba(var(--accent-rgb), 0.25)',
                                border: '1px solid var(--accent)',
                              }
                            : {
                                backgroundColor: 'var(--bg-deep)',
                                border: '1px solid var(--border-subtle)',
                              }
                        }
                      >
                        {sys}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="game-genre"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Gênero (Opcional)
                  </label>
                  <input
                    id="game-genre"
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Ex: RPG de Ação"
                    className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="game-hours"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Horas Jogadas
                  </label>
                  <input
                    id="game-hours"
                    type="number"
                    min="0"
                    step="0.1"
                    value={hoursPlayed}
                    onChange={(e) => setHoursPlayed(e.target.value)}
                    className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] font-mono-tech focus:outline-none focus:border-[var(--accent)]"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="game-cover-url"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  URL da Capa (ou use Buscar Capa Online / Enviar do PC)
                </label>
                <input
                  id="game-cover-url"
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... ou data:image/..."
                  className="theme-control w-full px-3.5 py-2.5 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="game-command"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Comando ou Caminho de Execução *
                </label>
                <input
                  id="game-command"
                  type="text"
                  value={command}
                  onChange={(e) => {
                    setCommand(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder='steam://rungameid/1091500 ou pcsx2-qt -fullscreen "/roms/jogo.iso"'
                  className="theme-control w-full px-3.5 py-2.5 border text-sm font-mono-tech text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>

              <label className="inline-flex items-center gap-2.5 text-sm text-[var(--text-primary)] cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] rounded"
                />
                <span>Marcar como favorito</span>
              </label>

              <div
                className="pt-3 mt-1 border-t flex flex-wrap items-center justify-end gap-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="theme-control inline-flex items-center gap-2 px-4 py-2.5 border text-sm font-medium text-[var(--text-primary)] hover:border-white/30 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-deep)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <CancelButtonIcon className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  className="theme-control inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: 'var(--accent-glow)',
                  }}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>
                    {isEditing ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showCoverFinder && (
        <CoverFinderModal
          ref={coverFinderRef}
          initialTitle={title}
          initialCommand={command}
          onSelectCover={(selectedUrl) => {
            setCoverUrl(selectedUrl);
            setShowCoverFinder(false);
          }}
          onGoToApiSettings={
            onGoToApiSettings
              ? () => {
                  setShowCoverFinder(false);
                  onGoToApiSettings();
                }
              : undefined
          }
          onClose={() => setShowCoverFinder(false)}
        />
      )}
    </>
  );
};
