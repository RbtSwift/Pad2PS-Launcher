import React, { useRef, useState } from 'react';
import { Gamepad2, ImagePlus, Upload, X } from 'lucide-react';
import { Game, Platform } from '../types';
import { CircleIcon } from './PlayStationIcons';

interface GameFormModalProps {
  initialGame?: Game | null;
  onSave: (game: Game) => void;
  onClose: () => void;
}

const PLATFORMS: Platform[] = [
  'Steam',
  'Epic',
  'Heroic',
  'GOG',
  'Xbox',
  'Emulador',
  'Outro',
];

export const GameFormModal: React.FC<GameFormModalProps> = ({
  initialGame,
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
  const [genre, setGenre] = useState(initialGame?.genre ?? '');
  const [hoursPlayed, setHoursPlayed] = useState(
    initialGame ? String(initialGame.hoursPlayed) : '0'
  );
  const [coverUrl, setCoverUrl] = useState(initialGame?.coverUrl ?? '');
  const [command, setCommand] = useState(initialGame?.command ?? '');
  const [favorite, setFavorite] = useState(initialGame?.favorite ?? false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

    onSave({
      id,
      title: trimmedTitle,
      platform,
      platformLabel: platformLabel.trim() || platform,
      coverUrl: coverUrl.trim(),
      command: trimmedCmd,
      hoursPlayed: Number(parsedHours.toFixed(1)),
      favorite,
      genre: genre.trim() || undefined,
      lastPlayed: initialGame?.lastPlayed ?? 'Recente',
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-[#121218] border border-[#27273A] rounded-2xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-[#27273A]">
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {isEditing ? 'Editar Biblioteca' : 'Novo Título'}
            </p>
            <h2
              id="game-form-title"
              className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F6]"
            >
              {isEditing ? `Editar ${initialGame?.title}` : 'Adicionar Jogo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
          {/* Live 2:3 Cover Preview + Local Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-40 md:w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#0B0B0F] border border-[#27273A] flex items-center justify-center">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Pré-visualização da capa"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-center p-3 text-[#94A3B8]">
                  <ImagePlus className="w-8 h-8 mb-2 opacity-70" />
                  <span className="text-xs">Capa 2:3</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-xs font-medium text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Imagem</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {errorMsg && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="game-title"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="game-platform"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Plataforma
                </label>
                <select
                  id="game-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] focus:outline-none focus:border-[var(--accent)]"
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
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Etiqueta Exibida (Opcional)
                </label>
                <input
                  id="game-platform-label"
                  type="text"
                  value={platformLabel}
                  onChange={(e) => setPlatformLabel(e.target.value)}
                  placeholder="Ex: PCSX2 · PS2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="game-genre"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Gênero (Opcional)
                </label>
                <input
                  id="game-genre"
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Ex: RPG de Ação"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="game-hours"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] font-mono-tech focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="game-cover-url"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                URL da Capa (ou envie uma imagem ao lado)
              </label>
              <input
                id="game-cover-url"
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... ou data:image/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm text-[#F4F4F6] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="game-command"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm font-mono-tech text-[#F4F4F6] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <label className="inline-flex items-center gap-2.5 text-sm text-[#F4F4F6] cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)] rounded"
              />
              <span>Marcar como favorito</span>
            </label>

            <div className="pt-3 mt-1 border-t border-[#27273A] flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-[#27273A] text-sm font-medium text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
              >
                <CircleIcon className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: 'var(--accent-glow)',
                }}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{isEditing ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
