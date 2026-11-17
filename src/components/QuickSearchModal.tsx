import React, { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Play, Search, X } from 'lucide-react';
import { Game } from '../types';
import { CancelButtonIcon } from './ControllerIcons';

interface QuickSearchModalProps {
  games: Game[];
  onSelectAndPlay: (game: Game) => void;
  onFocusGame: (game: Game) => void;
  onClose: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  games,
  onSelectAndPlay,
  onFocusGame,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 8);
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.platform.toLowerCase().includes(q) ||
        (g.platformLabel || '').toLowerCase().includes(q) ||
        (g.consoleSystem || '').toLowerCase().includes(q) ||
        (g.genre || '').toLowerCase().includes(q)
    );
  }, [games, query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && results.length > 0) {
        const active = document.activeElement;
        if (active?.tagName.toLowerCase() === 'input') {
          e.preventDefault();
          onFocusGame(results[0]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [results, onFocusGame]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-10 pt-16"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar na biblioteca"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#121218] border border-[#27273A] rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-3 pb-4 border-b border-[#27273A]">
          <Search className="w-6 h-6 shrink-0" style={{ color: 'var(--accent)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jogo, plataforma, gênero ou console..."
            autoFocus
            className="flex-1 bg-transparent text-lg sm:text-xl font-display font-semibold text-[#F4F4F6] placeholder-[#94A3B8]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[55vh] overflow-y-auto no-scrollbar flex flex-col gap-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#94A3B8]">
              Nenhum jogo encontrado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#0B0B0F] border border-[#27273A] hover:border-white/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onFocusGame(game)}
                  className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="w-11 aspect-[2/3] rounded-lg overflow-hidden bg-[#121218] shrink-0 border border-[#27273A]">
                    {game.coverUrl ? (
                      <img
                        src={game.coverUrl}
                        alt={game.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-[#94A3B8]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base sm:text-lg font-bold text-[#F4F4F6] truncate">
                      {game.title}
                    </p>
                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">
                      {game.platformLabel || game.platform} ·{' '}
                      {game.hoursPlayed.toFixed(1)}h
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAndPlay(game)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white cursor-pointer hover:brightness-110 shrink-0"
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: 'var(--accent-glow)',
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>JOGAR</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#27273A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#94A3B8] hover:text-[#F4F4F6] cursor-pointer"
          >
            <CancelButtonIcon className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
