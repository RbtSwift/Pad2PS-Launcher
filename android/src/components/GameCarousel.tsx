import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Heart,
  Plus,
  Star,
} from 'lucide-react';
import { Game, LauncherPage, LibraryPlatformFilter } from '../types';

export const LIBRARY_PLATFORM_FILTERS: LibraryPlatformFilter[] = ["Todos", "Android" as LibraryPlatformFilter, "Emuladores"];

interface GameCarouselProps {
  page: Extract<LauncherPage, 'favorites' | 'library'>;
  games: Game[];
  selectedIndex: number;
  platformFilter: LibraryPlatformFilter;
  focusZone: 'games' | 'filters';
  focusedFilterIndex: number;
  onFocusFilterIndex: (idx: number) => void;
  onSelectPlatformFilter: (filter: LibraryPlatformFilter) => void;
  onSelectIndex: (index: number) => void;
  onPlayGame: (game: Game) => void;
  onAddGame: () => void;
  onGoToLibrary: () => void;
}

const CoverImage: React.FC<{ game: Game }> = ({ game }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [game.coverUrl]);

  if (failed || !game.coverUrl) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-5 text-center"
        style={{
          background:
            'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
        }}
      >
        <Gamepad2
          className="w-14 h-14 mb-3 opacity-80"
          style={{ color: 'var(--accent)' }}
        />
        <span className="font-display font-bold text-base text-[var(--text-primary)] line-clamp-3">
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
  page,
  games,
  selectedIndex,
  platformFilter,
  focusZone,
  focusedFilterIndex,
  onFocusFilterIndex,
  onSelectPlatformFilter,
  onSelectIndex,
  onPlayGame,
  onAddGame,
  onGoToLibrary,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const filterRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hasAddCard = page === 'library';
  const totalSlots = games.length + (hasAddCard ? 1 : 0);
  const isAddCardSelected = hasAddCard && selectedIndex === games.length;
  const selectedGame = !isAddCardSelected ? (games[selectedIndex] ?? null) : null;

  const alignActiveCardLeft = (behavior: ScrollBehavior = "smooth") => {
    const el = cardRefs.current[selectedIndex];
    if (!el) return;
    el.scrollIntoView({ behavior, block: "nearest", inline: "center" });
  };

  useEffect(() => {
    alignActiveCardLeft('smooth');
  }, [selectedIndex, games.length, page, platformFilter]);

  useEffect(() => {
    const handleResize = () => alignActiveCardLeft('auto');
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedIndex, games.length, page]);

  useEffect(() => {
    if (focusZone === 'filters') {
      filterRefs.current[focusedFilterIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [focusZone, focusedFilterIndex]);

  const handleStep = (delta: number) => {
    if (totalSlots <= 1) return;
    const next = (selectedIndex + delta + totalSlots) % totalSlots;
    onSelectIndex(next);
  };

  return (
    <main className="android-game-carousel relative z-10 flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
      {/* Cabeçalho do Palco: Título do Jogo acima da capa + Pílulas Maiores e Separadas de Plataforma */}
      <div className="android-game-carousel-header px-6 sm:px-10 pb-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {selectedGame ? (
          <div aria-live="polite" className="min-w-0 max-w-2xl">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wider uppercase text-[var(--text-secondary)] mb-1">
              <span style={{ color: 'var(--accent)' }}>
                {selectedGame.platformLabel || selectedGame.platform}
              </span>
              {selectedGame.consoleSystem &&
                !(selectedGame.platformLabel || '')
                  .toLowerCase()
                  .includes(selectedGame.consoleSystem.toLowerCase()) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{selectedGame.consoleSystem}</span>
                  </>
                )}
              <span aria-hidden="true">·</span>
              <span className="font-mono-tech tabular-nums text-[var(--text-primary)]/90">
                {selectedGame.hoursPlayed.toFixed(1)}h jogadas
              </span>
              {selectedGame.favorite && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[var(--text-primary)]/90">
                    <Heart
                      className="w-3.5 h-3.5 fill-current"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span>Favorito</span>
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] tracking-tight truncate">
              {selectedGame.title}
            </h1>
          </div>
        ) : isAddCardSelected ? (
          <div aria-live="polite" className="min-w-0 max-w-2xl">
            <p
              className="text-xs sm:text-sm font-semibold tracking-wider uppercase mb-1"
              style={{ color: 'var(--accent)' }}
            >
              Biblioteca Pad2PS · Novo Atalho
            </p>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] tracking-tight truncate">
              Adicionar Novo Jogo
            </h1>
          </div>
        ) : (
          <div className="min-w-0">
            <p
              className="text-xs sm:text-sm font-semibold tracking-wider uppercase mb-1"
              style={{ color: 'var(--accent)' }}
            >
              {page === 'favorites' ? 'Coleção Favoritos' : 'Biblioteca de Jogos'}
            </p>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] tracking-tight">
              {page === 'favorites'
                ? 'Nenhum jogo favorito ainda'
                : `Nenhum jogo em "${platformFilter}"`}
            </h1>
          </div>
        )}

        {/* Pílulas de Filtro de Plataforma Maiores e Separadas (Epic e Heroic independentes) */}
        {page === 'library' && (
          <div
            role="tablist"
            aria-label="Filtros de plataforma"
            className="android-game-carousel-filters flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1 shrink-0"
          >
            {LIBRARY_PLATFORM_FILTERS.map((filter, idx) => {
              const isActive = platformFilter === filter;
              const isFocused =
                focusZone === 'filters' && focusedFilterIndex === idx;

              return (
                <button
                  key={filter}
                  ref={(el) => {
                    filterRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onMouseEnter={() => onFocusFilterIndex(idx)}
                  onClick={() => onSelectPlatformFilter(filter)}
                  className={`px-4 py-2 text-sm lg:text-base font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? 'var(--accent)'
                      : isFocused
                      ? 'rgba(var(--accent-rgb), 0.18)'
                      : 'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
                    border: isFocused
                      ? '2px solid var(--text-primary)'
                      : isActive
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border-subtle)',
                    boxShadow:
                      isFocused || isActive ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Área do Carrossel Horizontal Minimalista */}
      {totalSlots === 0 ? (
        <div className="px-10 lg:px-16 py-8 flex flex-col items-start">
          <div
            className="theme-control w-16 h-16 border flex items-center justify-center mb-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Star className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mb-6">
            {page === 'favorites'
              ? 'Marque seus jogos preferidos em Opções dentro da Biblioteca para vê-los em destaque aqui.'
              : 'Adicione um jogo ou selecione outro filtro de plataforma acima.'}
          </p>
          <button
            type="button"
            onClick={page === 'favorites' ? onGoToLibrary : onAddGame}
            className="theme-control inline-flex items-center gap-2.5 px-6 py-3 font-display text-base font-bold text-white transition-all cursor-pointer hover:brightness-110"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            {page === 'favorites' ? (
              <>
                <Gamepad2 className="w-5 h-5" />
                <span>Explorar Biblioteca</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Adicionar Jogo</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="android-game-carousel-content relative w-full flex items-center min-h-0">
          

          <div
            ref={trackRef}
            className="android-game-carousel-track w-full flex items-start gap-6 lg:gap-8 overflow-x-auto no-scrollbar pl-6 sm:pl-10 lg:pl-16 pr-[50vw] pt-2 pb-20 scroll-smooth"
            role="listbox"
            aria-label="Carrossel de Jogos"
          >
            {games.map((game, idx) => {
              const isSelected =
                idx === selectedIndex && focusZone === 'games';
              const isCurrentCard = idx === selectedIndex;

              return (
                <div
                  key={game.id}
                  className={`relative shrink-0 transition-all duration-300 ease-out ${
                    isSelected
                      ? '-translate-y-2 scale-[1.03] z-10 opacity-100'
                      : isCurrentCard
                      ? 'scale-[1.01] z-10 opacity-90'
                      : 'scale-[0.94] opacity-60 hover:opacity-95 hover:scale-[0.98]'
                  }`}
                >
                  <button
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isCurrentCard}
                    onClick={() => {
                      if (isCurrentCard && focusZone === 'games') {
                        onPlayGame(game);
                      } else {
                        onSelectIndex(idx);
                      }
                    }}
                    className={`android-game-cover theme-control relative block aspect-[2/3] overflow-hidden cursor-pointer focus:outline-none ${
                      isSelected ? 'accent-ring-active' : ''
                    }`}
                    style={{
                      height: 'clamp(130px, 31vh, 400px)',
                      backgroundColor: 'var(--bg-surface)',
                      border: isSelected
                        ? '3px solid var(--accent)'
                        : isCurrentCard
                        ? '2px solid rgba(var(--accent-rgb), 0.55)'
                        : '1px solid var(--border-subtle)',
                      boxShadow: isSelected
                        ? '0 24px 52px -12px rgba(0, 0, 0, 0.9), var(--accent-glow-strong)'
                        : '0 14px 28px -10px rgba(0, 0, 0, 0.72)',
                    }}
                  >
                    <CoverImage game={game} />

                    {!isCurrentCard && (
                      <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent text-left">
                        <p className="font-display text-sm lg:text-base font-bold text-white truncate">
                          {game.title}
                        </p>
                      </div>
                    )}
                  </button>

                  {/* Reflexo espelhado sutil logo abaixo do card selecionado */}
                  {isCurrentCard && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none select-none absolute left-0 right-0 top-full mt-1.5 h-12 overflow-hidden opacity-35"
                      style={{
                        borderRadius: 'var(--btn-radius)',
                        maskImage:
                          'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 92%)',
                        WebkitMaskImage:
                          'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 92%)',
                      }}
                    >
                      <div
                        className="android-game-reflection w-full aspect-[2/3] scale-y-[-1] blur-[1px]"
                        style={{
                          height: 'clamp(130px, 31vh, 400px)',
                        }}
                      >
                        <CoverImage game={game} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Card estilizado "+ Adicionar Jogo" no final da fila (Página Biblioteca) */}
            {hasAddCard && (
              <div
                className={`relative shrink-0 transition-all duration-300 ease-out ${
                  isAddCardSelected && focusZone === 'games'
                    ? '-translate-y-2 scale-[1.03] z-10 opacity-100'
                    : 'scale-[0.94] opacity-70 hover:opacity-100 hover:scale-[0.98]'
                }`}
              >
                <button
                  ref={(el) => {
                    cardRefs.current[games.length] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isAddCardSelected}
                  onClick={() => {
                    if (isAddCardSelected && focusZone === 'games') {
                      onAddGame();
                    } else {
                      onSelectIndex(games.length);
                    }
                  }}
                  className={`android-game-cover theme-control relative aspect-[2/3] flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer focus:outline-none ${
                    isAddCardSelected && focusZone === 'games'
                      ? 'accent-ring-active'
                      : ''
                  }`}
                  style={{
                    height: 'clamp(130px, 31vh, 400px)',
                    backgroundColor:
                      'color-mix(in srgb, var(--bg-surface) 78%, transparent)',
                    borderWidth:
                      isAddCardSelected && focusZone === 'games' ? '3px' : '2px',
                    borderStyle:
                      isAddCardSelected && focusZone === 'games'
                        ? 'solid'
                        : 'dashed',
                    borderColor: isAddCardSelected
                      ? 'var(--accent)'
                      : 'var(--border-subtle)',
                    boxShadow:
                      isAddCardSelected && focusZone === 'games'
                        ? 'var(--accent-glow-strong)'
                        : undefined,
                  }}
                >
                  <div
                    className="theme-control w-16 h-16 flex items-center justify-center border transition-transform"
                    style={{
                      backgroundColor: isAddCardSelected
                        ? 'var(--accent)'
                        : 'var(--bg-deep)',
                      borderColor: isAddCardSelected
                        ? 'var(--accent)'
                        : 'var(--border-subtle)',
                      color: isAddCardSelected ? '#FFFFFF' : 'var(--accent)',
                      boxShadow: isAddCardSelected
                        ? 'var(--accent-glow)'
                        : undefined,
                    }}
                  >
                    <Plus className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-display text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                      Adicionar Jogo
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                      Steam, Epic, Heroic, GOG ou Emulador
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
