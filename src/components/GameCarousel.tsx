import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Gamepad2,
  Heart,
  Layers,
  Library,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react';
import { FilterTab, Game, SortMode } from '../types';
import {
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
} from './ControllerIcons';

export interface CollectionShortcut {
  id: string;
  label: string;
  tab: FilterTab;
  count: number;
  icon: 'all' | 'steam' | 'epic' | 'gog' | 'emu' | 'fav';
}

interface ConsoleFilterItem {
  name: string;
  count: number;
}

interface GameCarouselProps {
  games: Game[];
  selectedIndex: number;
  activeTab: FilterTab;
  sortMode: SortMode;
  focusRow: 'games' | 'collections';
  collectionFocusIndex: number;
  collections: CollectionShortcut[];
  consoleSystems: ConsoleFilterItem[];
  activeConsole: string;
  onSelectConsole: (consoleName: string) => void;
  onCycleSort: () => void;
  onSelectTab: (tab: FilterTab) => void;
  onSelectIndex: (index: number) => void;
  onFocusCollections: (idx: number) => void;
  onPlayGame: (game: Game) => void;
  onToggleFavorite: (game: Game) => void;
  onOpenOptions: (game: Game) => void;
  onOpenTranslator: () => void;
  onAddGame: () => void;
}

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Recentes',
  az: 'A-Z',
  'most-played': 'Mais Jogados',
};

const CoverImage: React.FC<{ game: Game; compact?: boolean }> = ({
  game,
  compact = false,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [game.coverUrl]);

  if (failed || !game.coverUrl) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
        style={{
          background:
            'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
        }}
      >
        <Gamepad2
          className={compact ? 'w-8 h-8 mb-2 opacity-80' : 'w-14 h-14 mb-3 opacity-80'}
          style={{ color: 'var(--accent)' }}
        />
        <span
          className={`font-display font-bold text-[var(--text-primary)] line-clamp-3 ${
            compact ? 'text-xs' : 'text-base'
          }`}
        >
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

function renderCollectionIcon(kind: CollectionShortcut['icon'], active: boolean) {
  const cls = `w-4 h-4 shrink-0 ${active ? 'text-white' : ''}`;
  switch (kind) {
    case 'steam':
      return <Gamepad2 className={cls} />;
    case 'epic':
      return <Layers className={cls} />;
    case 'gog':
      return <Sparkles className={cls} />;
    case 'emu':
      return <Cpu className={cls} />;
    case 'fav':
      return <Heart className={cls} />;
    default:
      return <Library className={cls} />;
  }
}

function isPlayStationOrEmuGame(game: Game | null): boolean {
  if (!game) return false;
  if (game.platform === 'Emulador') return true;
  const hay = `${game.title} ${game.platformLabel ?? ''} ${game.consoleSystem ?? ''}`;
  return /ps1|ps2|psp|playstation|pcsx/i.test(hay);
}

export const GameCarousel: React.FC<GameCarouselProps> = ({
  games,
  selectedIndex,
  activeTab,
  sortMode,
  focusRow,
  collectionFocusIndex,
  collections,
  consoleSystems,
  activeConsole,
  onSelectConsole,
  onCycleSort,
  onSelectTab,
  onSelectIndex,
  onFocusCollections,
  onPlayGame,
  onToggleFavorite,
  onOpenOptions,
  onOpenTranslator,
  onAddGame,
}) => {
  const thumbTrackRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const collectionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedGame = games[selectedIndex] ?? null;
  const highlightTranslator = isPlayStationOrEmuGame(selectedGame);

  const scrollActiveThumbnailIntoView = (behavior: ScrollBehavior = 'smooth') => {
    const el = thumbRefs.current[selectedIndex];
    if (!el) return;
    el.scrollIntoView({
      behavior,
      inline: 'center',
      block: 'nearest',
    });
  };

  useEffect(() => {
    scrollActiveThumbnailIntoView('smooth');
  }, [selectedIndex, games.length, sortMode]);

  useEffect(() => {
    const handleResize = () => scrollActiveThumbnailIntoView('auto');
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedIndex, games.length]);

  useEffect(() => {
    if (focusRow === 'collections') {
      collectionRefs.current[collectionFocusIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [focusRow, collectionFocusIndex]);

  const handleStep = (delta: number) => {
    if (games.length === 0) return;
    const next = (selectedIndex + delta + games.length) % games.length;
    onSelectIndex(next);
  };

  const showConsoleSubFilters =
    activeTab === 'Emuladores' && consoleSystems.length > 0;

  return (
    <main className="relative z-10 flex-1 flex flex-col justify-between min-h-0 pt-1 pb-2.5 overflow-hidden">
      {/* Linha de contexto / sub-filtros de console + Ordenação rápida */}
      <div className="flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 shrink-0">
        {showConsoleSubFilters ? (
          <div
            aria-label="Sub-filtros de console"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 py-0.5"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mr-1 shrink-0">
              <Cpu className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Sistema:</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectConsole('Todos')}
              className={`theme-control px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeConsole === 'Todos'
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={
                activeConsole === 'Todos'
                  ? {
                      border: '1px solid var(--accent)',
                      backgroundColor: 'rgba(var(--accent-rgb), 0.2)',
                    }
                  : {
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }
              }
            >
              Todos
            </button>
            {consoleSystems.map((sys) => {
              const isSelected = activeConsole === sys.name;
              return (
                <button
                  key={sys.name}
                  type="button"
                  onClick={() => onSelectConsole(sys.name)}
                  className={`theme-control px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={
                    isSelected
                      ? {
                          border: '1px solid var(--accent)',
                          backgroundColor: 'rgba(var(--accent-rgb), 0.2)',
                        }
                      : {
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
                        }
                  }
                >
                  <span>{sys.name}</span>
                  <span className="text-[11px] font-mono-tech opacity-75">
                    {sys.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase text-[var(--text-secondary)] truncate">
            {activeTab === 'Início'
              ? 'Palco Pad2PS · Jogados Recentemente'
              : `Palco Pad2PS · ${
                  activeTab === 'Todos' ? 'Toda a Biblioteca' : activeTab
                }`}
          </p>
        )}

        <button
          type="button"
          onClick={onCycleSort}
          title="Alternar ordenação (R3 ou tecla S)"
          className="theme-control inline-flex items-center gap-2 px-3.5 py-1.5 border backdrop-blur-md text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <ArrowUpDown
            className="w-4 h-4"
            style={{ color: 'var(--accent)' }}
          />
          <span>
            Ordenar:{' '}
            <strong className="font-semibold text-[var(--text-primary)]">
              {SORT_LABELS[sortMode]}
            </strong>
          </span>
          <KeyCap label="R3 / S" className="hidden sm:inline-flex" />
        </button>
      </div>

      {/* Palco Principal Pad2PS: Painel Hero Flutuante + Faixa de Miniaturas */}
      {games.length === 0 ? (
        <div className="flex-1 flex flex-col items-start justify-center px-6 sm:px-10 lg:px-14">
          <div
            className="theme-control w-16 h-16 border flex items-center justify-center mb-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Gamepad2 className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-2">
            Nenhum jogo encontrado em &ldquo;{activeTab}&rdquo;
          </h2>
          <p className="text-base text-[var(--text-secondary)] max-w-xl mb-6">
            {activeTab === 'Favoritos'
              ? 'Use o botão Favoritar (ou tecla F) em qualquer jogo para adicioná-lo aos seus favoritos.'
              : 'Adicione um novo jogo para esta plataforma ou explore outra coleção abaixo.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTab('Início')}
              className="theme-control px-6 py-3 text-base font-semibold border text-[var(--text-primary)] hover:border-white/40 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Voltar ao Início
            </button>
            <button
              type="button"
              onClick={onAddGame}
              className="theme-control flex items-center gap-2 px-6 py-3 text-base font-semibold text-white transition-all cursor-pointer hover:brightness-110"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              <Plus className="w-5 h-5" />
              <span>Adicionar Jogo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center min-h-0 gap-3 px-6 sm:px-10 lg:px-14">
          {/* 1. Painel Hero Flutuante Assinatura Pad2PS */}
          {selectedGame && (
            <section
              aria-live="polite"
              aria-label="Jogo em destaque"
              className={`theme-surface relative w-full backdrop-blur-xl p-4 sm:p-5 lg:p-6 flex items-center gap-5 sm:gap-7 lg:gap-9 transition-all duration-300 ${
                focusRow === 'games' ? 'accent-ring-active' : ''
              }`}
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
                borderColor:
                  focusRow === 'games'
                    ? 'var(--accent)'
                    : 'var(--border-subtle)',
                boxShadow:
                  focusRow === 'games'
                    ? 'var(--panel-shadow), var(--accent-glow)'
                    : 'var(--panel-shadow)',
              }}
            >
              {/* Capa Vertical Grande à Esquerda */}
              <button
                type="button"
                onClick={() => onPlayGame(selectedGame)}
                title={`Iniciar ${selectedGame.title}`}
                className="theme-control relative shrink-0 aspect-[2/3] overflow-hidden cursor-pointer group focus:outline-none transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  height: 'clamp(165px, 26vh, 310px)',
                  backgroundColor: 'var(--bg-deep)',
                  border: '2px solid var(--accent)',
                  boxShadow: 'var(--accent-glow)',
                }}
              >
                <CoverImage game={selectedGame} />
                {selectedGame.favorite && (
                  <span
                    className="theme-control absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center border border-white/20"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--bg-deep) 85%, transparent)',
                    }}
                    title="Favorito"
                  >
                    <Heart
                      className="w-4 h-4 fill-current"
                      style={{ color: 'var(--accent)' }}
                    />
                  </span>
                )}
              </button>

              {/* Informações Gigantes + Ações à Direita */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 sm:gap-3">
                {/* Meta line */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm lg:text-base font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
                  <span
                    className="theme-control px-2.5 py-0.5 text-xs font-bold border"
                    style={{
                      color: 'var(--accent)',
                      backgroundColor: 'rgba(var(--accent-rgb), 0.14)',
                      borderColor: 'rgba(var(--accent-rgb), 0.45)',
                    }}
                  >
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
                    {selectedGame.hoursPlayed.toFixed(1)} HORAS JOGADAS
                  </span>

                  {selectedGame.lastPlayed && (
                    <>
                      <span className="hidden md:inline" aria-hidden="true">
                        ·
                      </span>
                      <span className="hidden md:inline">
                        ÚLTIMA SESSÃO: {selectedGame.lastPlayed}
                      </span>
                    </>
                  )}
                </div>

                {/* Título Gigante */}
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight leading-tight truncate">
                  {selectedGame.title}
                </h1>

                {selectedGame.genre && (
                  <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] truncate hidden sm:block">
                    {selectedGame.genre}
                  </p>
                )}

                {/* Botões Grandes de Ação */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onPlayGame(selectedGame)}
                    className="theme-control flex items-center gap-2.5 px-7 sm:px-9 py-3 sm:py-3.5 font-display font-extrabold text-base sm:text-lg lg:text-xl text-white tracking-wide transition-all duration-150 cursor-pointer hover:brightness-110 active:scale-95"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: 'var(--accent-glow-strong)',
                    }}
                  >
                    <ConfirmButtonIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>JOGAR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(selectedGame)}
                    title={
                      selectedGame.favorite
                        ? 'Remover dos Favoritos (Tecla F)'
                        : 'Adicionar aos Favoritos (Tecla F)'
                    }
                    className="theme-control flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border text-sm sm:text-base font-semibold text-[var(--text-primary)] hover:border-white/40 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: selectedGame.favorite
                        ? 'rgba(var(--accent-rgb), 0.55)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <FavoriteButtonIcon className="w-5 h-5" />
                    <Heart
                      className={`w-5 h-5 ${
                        selectedGame.favorite ? 'fill-current' : ''
                      }`}
                      style={
                        selectedGame.favorite
                          ? { color: 'var(--accent)' }
                          : undefined
                      }
                    />
                    <span className="hidden xl:inline">Favoritar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenOptions(selectedGame)}
                    title="Opções do Jogo (Tecla M)"
                    className="theme-control flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border text-sm sm:text-base font-semibold text-[var(--text-primary)] hover:border-white/40 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-deep)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <OptionsButtonIcon className="w-5 h-5" />
                    <MoreHorizontal className="w-5 h-5 hidden sm:inline" />
                    <span>Opções</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenTranslator}
                    title="Tradutor Pad2PS Web (R2 ou Tecla T)"
                    className="theme-control flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border text-sm sm:text-base font-semibold transition-all cursor-pointer hover:brightness-110"
                    style={{
                      backgroundColor: highlightTranslator
                        ? 'rgba(var(--accent-rgb), 0.16)'
                        : 'var(--bg-deep)',
                      borderColor: highlightTranslator
                        ? 'var(--accent)'
                        : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                      boxShadow: highlightTranslator
                        ? 'var(--accent-glow)'
                        : undefined,
                    }}
                  >
                    <Gamepad2
                      className="w-5 h-5 shrink-0"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span>Tradutor Pad2PS</span>
                    <ExternalLink className="w-4 h-4 opacity-80 hidden sm:inline" />
                    <KeyCap label="R2 / T" className="hidden lg:inline-flex" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 2. Faixa Horizontal de Miniaturas das Capas */}
          <div className="relative w-full flex items-center min-h-0">
            {games.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  aria-label="Jogo anterior"
                  className="theme-control hidden lg:flex absolute -left-3 z-20 w-9 h-9 border items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/40 backdrop-blur-md transition-all cursor-pointer"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  aria-label="Próximo jogo"
                  className="theme-control hidden lg:flex absolute -right-3 z-20 w-9 h-9 border items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/40 backdrop-blur-md transition-all cursor-pointer"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div
              ref={thumbTrackRef}
              className="w-full flex items-center gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar py-1.5 px-1 scroll-smooth"
              role="listbox"
              aria-label="Miniaturas da Biblioteca"
            >
              {games.map((game, idx) => {
                const isSelected =
                  idx === selectedIndex && focusRow === 'games';
                const isCurrentCard = idx === selectedIndex;

                return (
                  <button
                    key={game.id}
                    ref={(el) => {
                      thumbRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isCurrentCard}
                    onClick={() => {
                      if (isCurrentCard && focusRow === 'games') {
                        onPlayGame(game);
                      } else {
                        onSelectIndex(idx);
                      }
                    }}
                    onDoubleClick={() => onPlayGame(game)}
                    className={`theme-control group relative shrink-0 aspect-[2/3] overflow-hidden transition-all duration-200 ease-out cursor-pointer focus:outline-none ${
                      isSelected
                        ? 'scale-[1.06] z-10 opacity-100'
                        : isCurrentCard
                        ? 'scale-[1.02] z-10 opacity-95'
                        : 'opacity-60 hover:opacity-95 hover:scale-[1.02]'
                    }`}
                    style={{
                      height: 'clamp(102px, 15.5vh, 174px)',
                      backgroundColor: 'var(--bg-surface)',
                      border: isSelected
                        ? '2.5px solid var(--accent)'
                        : isCurrentCard
                        ? '2px solid rgba(var(--accent-rgb), 0.55)'
                        : '1px solid var(--border-subtle)',
                      boxShadow: isSelected
                        ? 'var(--accent-glow)'
                        : '0 10px 24px -10px rgba(0,0,0,0.7)',
                    }}
                  >
                    <CoverImage game={game} compact />

                    <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-left">
                      <p className="font-display text-[11px] sm:text-xs font-bold text-white truncate">
                        {game.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Segunda Fileira Inferior: Explorar por Plataforma (D-Pad ↓ / ↑) */}
      <section
        aria-label="Explorar por Plataforma"
        className="px-6 sm:px-10 lg:px-14 pt-1 shrink-0"
      >
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-[var(--text-secondary)] mb-1.5">
          Explorar por Plataforma
        </p>
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5">
          {collections.map((col, idx) => {
            const isTabActive = activeTab === col.tab;
            const isFocused =
              focusRow === 'collections' && collectionFocusIndex === idx;

            return (
              <button
                key={col.id}
                ref={(el) => {
                  collectionRefs.current[idx] = el;
                }}
                type="button"
                onMouseEnter={() => onFocusCollections(idx)}
                onClick={() => onSelectTab(col.tab)}
                className="theme-control flex items-center gap-2.5 px-4 sm:px-5 py-2 whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: isFocused
                    ? 'rgba(var(--accent-rgb), 0.22)'
                    : isTabActive
                    ? 'rgba(var(--accent-rgb), 0.14)'
                    : 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
                  border: isFocused
                    ? '2px solid var(--accent)'
                    : isTabActive
                    ? '1.5px solid rgba(var(--accent-rgb), 0.65)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                }}
              >
                <span
                  style={{
                    color:
                      isFocused || isTabActive
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {renderCollectionIcon(col.icon, isFocused || isTabActive)}
                </span>
                <span className="font-display text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {col.label}
                </span>
                <span className="text-xs font-mono-tech tabular-nums text-[var(--text-secondary)]">
                  {col.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};
