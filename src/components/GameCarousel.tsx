import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Gamepad2,
  Heart,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { FilterTab, Game } from '../types';
import { CrossIcon, SquareIcon, TriangleIcon } from './PlayStationIcons';

interface GameCarouselProps {
  games: Game[];
  selectedIndex: number;
  activeTab: FilterTab;
  onSelectTab: (tab: FilterTab) => void;
  onSelectIndex: (index: number) => void;
  onPlayGame: (game: Game) => void;
  onToggleFavorite: (game: Game) => void;
  onOpenOptions: (game: Game) => void;
  onAddGame: () => void;
}

const CoverImage: React.FC<{ game: Game }> = ({ game }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [game.coverUrl]);

  if (failed || !game.coverUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#1C1C28] via-[#121218] to-[#0B0B0F]">
        <Gamepad2
          className="w-12 h-12 mb-3 opacity-80"
          style={{ color: 'var(--accent)' }}
        />
        <span className="font-display font-bold text-sm text-[#F4F4F6] line-clamp-3">
          {game.title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={game.coverUrl}
      alt={`Capa de ${game.title}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover select-none"
      draggable={false}
    />
  );
};

export const GameCarousel: React.FC<GameCarouselProps> = ({
  games,
  selectedIndex,
  activeTab,
  onSelectTab,
  onSelectIndex,
  onPlayGame,
  onToggleFavorite,
  onOpenOptions,
  onAddGame,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedGame = games[selectedIndex] ?? null;

  const centerActiveCard = (behavior: ScrollBehavior = 'smooth') => {
    const track = trackRef.current;
    const el = cardRefs.current[selectedIndex];
    if (!track || !el) return;

    const targetLeft =
      el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior,
    });
  };

  useEffect(() => {
    centerActiveCard('smooth');
  }, [selectedIndex, games.length]);

  useEffect(() => {
    const handleResize = () => centerActiveCard('auto');
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedIndex, games.length]);

  const handleStep = (delta: number) => {
    if (games.length === 0) return;
    const next = (selectedIndex + delta + games.length) % games.length;
    onSelectIndex(next);
  };

  return (
    <main className="relative z-10 flex-1 flex flex-col justify-center min-h-0 py-2 lg:py-4 overflow-hidden">
      {games.length === 0 ? (
        /* Empty Filter State */
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#121218] border border-[#27273A] flex items-center justify-center mb-4">
            <Gamepad2 className="w-8 h-8 text-[#94A3B8]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#F4F4F6] mb-2">
            Nenhum jogo em &ldquo;{activeTab}&rdquo;
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-md mb-6">
            {activeTab === 'Favoritos'
              ? 'Marque qualquer jogo com △ (ou F) para adicioná-lo rapidamente aos seus favoritos.'
              : 'Adicione um novo título nesta plataforma ou volte para visualizar toda a sua biblioteca.'}
          </p>
          <div className="flex items-center gap-3">
            {activeTab !== 'Todos' && (
              <button
                type="button"
                onClick={() => onSelectTab('Todos')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#121218] border border-[#27273A] text-[#F4F4F6] hover:border-[#94A3B8] transition-colors cursor-pointer"
              >
                Ver Todos os Jogos
              </button>
            )}
            <button
              type="button"
              onClick={onAddGame}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer hover:brightness-110"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Jogo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full gap-3 lg:gap-5">
          {/* Carousel Track Container */}
          <div className="relative w-full flex items-center justify-center min-h-0">
            {/* Left / Right Subtle Mouse Arrow Controls */}
            {games.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  aria-label="Jogo anterior"
                  className="hidden lg:flex absolute left-5 z-20 w-11 h-11 rounded-full bg-[#121218]/85 border border-[#27273A] items-center justify-center text-[#94A3B8] hover:text-[#F4F4F6] hover:border-white/30 backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  aria-label="Próximo jogo"
                  className="hidden lg:flex absolute right-5 z-20 w-11 h-11 rounded-full bg-[#121218]/85 border border-[#27273A] items-center justify-center text-[#94A3B8] hover:text-[#F4F4F6] hover:border-white/30 backdrop-blur-md transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div
              ref={trackRef}
              className="relative w-full flex items-center gap-4 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar py-5 scroll-smooth"
              style={{
                paddingInline: 'calc(50% - clamp(70px, 12vh, 140px))',
              }}
              role="listbox"
              aria-label="Biblioteca de Jogos"
            >
              {games.map((game, idx) => {
                const isSelected = idx === selectedIndex;
                const badgeText = game.platformLabel || game.platform;

                return (
                  <button
                    key={game.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        onPlayGame(game);
                      } else {
                        onSelectIndex(idx);
                      }
                    }}
                    onDoubleClick={() => onPlayGame(game)}
                    className={`group relative shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-[#121218] transition-all duration-300 ease-out cursor-pointer focus:outline-none ${
                      isSelected
                        ? 'scale-105 z-10 opacity-100 accent-ring-active'
                        : 'scale-95 opacity-60 hover:opacity-90 hover:scale-100'
                    }`}
                    style={{
                      height: 'clamp(210px, 36vh, 420px)',
                      border: isSelected
                        ? '2.5px solid var(--accent)'
                        : '1px solid #27273A',
                      boxShadow: isSelected
                        ? '0 24px 50px -12px rgba(0,0,0,0.85), var(--accent-glow-strong)'
                        : '0 14px 30px -10px rgba(0,0,0,0.7)',
                    }}
                  >
                    <CoverImage game={game} />

                    {/* Top scrim & platform tag */}
                    <div className="absolute inset-x-0 top-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/35 to-transparent">
                      <span className="px-2 py-0.5 rounded-md text-[10px] lg:text-[11px] font-semibold tracking-wide bg-[#0B0B0F]/85 text-[#F4F4F6] border border-white/15 backdrop-blur-sm">
                        {badgeText}
                      </span>

                      {game.favorite && (
                        <span
                          className="w-6 h-6 rounded-full bg-[#0B0B0F]/80 border border-white/15 flex items-center justify-center"
                          title="Favorito"
                        >
                          <Heart
                            className="w-3.5 h-3.5 fill-current"
                            style={{ color: 'var(--accent)' }}
                          />
                        </span>
                      )}
                    </div>

                    {/* Subtle bottom title preview on unselected cards */}
                    <div
                      className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-left transition-opacity duration-200 ${
                        isSelected ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <p className="font-display text-xs lg:text-sm font-semibold text-[#F4F4F6] truncate">
                        {game.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Game Stage — Centered & aligned directly below the active card */}
          {selectedGame && (
            <section
              aria-live="polite"
              className="w-full max-w-2xl mx-auto px-5 flex flex-col items-center text-center gap-2.5 shrink-0"
            >
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs lg:text-sm text-[#94A3B8]">
                <span
                  className="font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  {selectedGame.platformLabel || selectedGame.platform}
                </span>
                {selectedGame.genre && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{selectedGame.genre}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono-tech tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedGame.hoursPlayed.toFixed(1)}h jogadas
                </span>
                {selectedGame.lastPlayed && (
                  <>
                    <span className="hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden sm:inline">
                      Última sessão: {selectedGame.lastPlayed}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#F4F4F6] tracking-tight max-w-full truncate">
                {selectedGame.title}
              </h1>

              {/* Action Controls centered under the active cover */}
              <div className="flex items-center justify-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => onPlayGame(selectedGame)}
                  className="flex items-center gap-3 px-8 lg:px-10 py-3 lg:py-3.5 rounded-xl font-display font-bold text-base lg:text-lg text-white tracking-wide transition-all duration-150 cursor-pointer hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: 'var(--accent-glow-strong)',
                  }}
                >
                  <CrossIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                  <span>JOGAR</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedGame)}
                  title={
                    selectedGame.favorite
                      ? 'Remover dos Favoritos (△ / F)'
                      : 'Adicionar aos Favoritos (△ / F)'
                  }
                  className="flex items-center gap-2 px-4 py-3 lg:py-3.5 rounded-xl bg-[#121218]/90 border border-[#27273A] text-sm font-medium text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
                >
                  <TriangleIcon className="w-4 h-4" />
                  <Heart
                    className={`w-4 h-4 ${
                      selectedGame.favorite ? 'fill-current' : ''
                    }`}
                    style={
                      selectedGame.favorite
                        ? { color: 'var(--accent)' }
                        : undefined
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenOptions(selectedGame)}
                  title="Opções do Jogo (□ / M)"
                  className="flex items-center gap-2 px-4 py-3 lg:py-3.5 rounded-xl bg-[#121218]/90 border border-[#27273A] text-sm font-medium text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
                >
                  <SquareIcon className="w-4 h-4" />
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};
