import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Delete,
  Gamepad2,
  Play,
  RotateCcw,
  Search,
  Space,
  X,
} from 'lucide-react';
import { Game } from '../types';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  KeyCap,
} from './ControllerIcons';

export interface QuickSearchModalHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
}

interface QuickSearchModalProps {
  games: Game[];
  onSelectAndPlay: (game: Game) => void;
  onFocusGame: (game: Game) => void;
  onClose: () => void;
}

const KEYBOARD_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'APAGAR'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ESPAÇO', 'LIMPAR', 'OK'],
];

export const QuickSearchModal = forwardRef<
  QuickSearchModalHandle,
  QuickSearchModalProps
>(({ games, onSelectAndPlay, onFocusGame, onClose }, ref) => {
  const [query, setQuery] = useState('');
  const [focusZone, setFocusZone] = useState<'keyboard' | 'results'>('keyboard');
  const [kbRow, setKbRow] = useState(1);
  const [kbCol, setKbCol] = useState(0);
  const [resultIdx, setResultIdx] = useState(0);

  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 6);
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
    setResultIdx(0);
  }, [results.length]);

  useEffect(() => {
    if (focusZone === 'results') {
      resultRefs.current[resultIdx]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusZone, resultIdx]);

  const handleVirtualKey = (key: string) => {
    soundEngine.playMove();
    if (key === 'APAGAR') {
      setQuery((prev) => prev.slice(0, -1));
    } else if (key === 'ESPAÇO') {
      setQuery((prev) => `${prev} `);
    } else if (key === 'LIMPAR') {
      setQuery('');
    } else if (key === 'OK') {
      if (results.length > 0) {
        setFocusZone('results');
        setResultIdx(0);
      }
    } else {
      setQuery((prev) => `${prev}${key.toLowerCase()}`);
    }
  };

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

  useImperativeHandle(ref, () => ({
    navigate: (dir) => {
      soundEngine.playMove();
      if (focusZone === 'keyboard') {
        const rowLen = KEYBOARD_ROWS[kbRow].length;
        if (dir === 'left') {
          setKbCol((c) => (c - 1 + rowLen) % rowLen);
        } else if (dir === 'right') {
          setKbCol((c) => (c + 1) % rowLen);
        } else if (dir === 'up') {
          if (kbRow > 0) {
            setKbRow((r) => r - 1);
          } else if (results.length > 0) {
            setFocusZone('results');
            setResultIdx(results.length - 1);
          }
        } else if (dir === 'down') {
          if (kbRow < KEYBOARD_ROWS.length - 1) {
            setKbRow((r) => r + 1);
          } else if (results.length > 0) {
            setFocusZone('results');
            setResultIdx(0);
          }
        }
        return;
      }

      // focusZone === 'results'
      if (results.length === 0) {
        setFocusZone('keyboard');
        return;
      }
      if (dir === 'up') {
        if (resultIdx > 0) {
          setResultIdx((i) => i - 1);
        } else {
          setFocusZone('keyboard');
          setKbRow(KEYBOARD_ROWS.length - 1);
        }
      } else if (dir === 'down') {
        if (resultIdx < results.length - 1) {
          setResultIdx((i) => i + 1);
        } else {
          setFocusZone('keyboard');
          setKbRow(0);
        }
      }
    },
    confirm: () => {
      if (focusZone === 'keyboard') {
        const key = KEYBOARD_ROWS[kbRow]?.[kbCol];
        if (key) handleVirtualKey(key);
        return;
      }
      const chosen = results[resultIdx];
      if (chosen) {
        onFocusGame(chosen);
      }
    },
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar na biblioteca"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="theme-surface w-full max-w-3xl p-5 sm:p-6 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Campo de Texto */}
        <div
          className="flex items-center gap-3 pb-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search
            className="w-6 h-6 shrink-0"
            style={{ color: 'var(--accent)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jogo, plataforma, gênero ou console..."
            className="flex-1 bg-transparent text-lg sm:text-xl font-display font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teclado Virtual de Console (100% navegável por D-Pad + Confirmar) */}
        <div
          aria-label="Teclado Virtual de Console"
          className="mt-4 p-3 border shrink-0 space-y-2"
          style={{
            backgroundColor: 'var(--bg-deep)',
            borderColor:
              focusZone === 'keyboard'
                ? 'rgba(var(--accent-rgb), 0.45)'
                : 'var(--border-subtle)',
            borderRadius: 'var(--btn-radius)',
          }}
        >
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-10 gap-1.5">
              {row.map((key, cIdx) => {
                const isFocused =
                  focusZone === 'keyboard' && kbRow === rIdx && kbCol === cIdx;
                const isSpecial =
                  key === 'APAGAR' ||
                  key === 'ESPAÇO' ||
                  key === 'LIMPAR' ||
                  key === 'OK';

                return (
                  <button
                    key={key}
                    type="button"
                    onMouseEnter={() => {
                      setFocusZone('keyboard');
                      setKbRow(rIdx);
                      setKbCol(cIdx);
                    }}
                    onClick={() => handleVirtualKey(key)}
                    className="theme-control h-10 sm:h-11 flex items-center justify-center text-xs sm:text-sm font-bold transition-all cursor-pointer select-none"
                    style={{
                      backgroundColor:
                        key === 'OK'
                          ? 'var(--accent)'
                          : isFocused
                          ? 'rgba(var(--accent-rgb), 0.25)'
                          : 'var(--bg-surface)',
                      border: isFocused
                        ? '2px solid var(--accent)'
                        : '1px solid var(--border-subtle)',
                      color:
                        key === 'OK' || isFocused
                          ? '#FFFFFF'
                          : isSpecial
                          ? 'var(--accent)'
                          : 'var(--text-primary)',
                      boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                    }}
                  >
                    {key === 'APAGAR' ? (
                      <Delete className="w-4 h-4" />
                    ) : key === 'ESPAÇO' ? (
                      <Space className="w-4 h-4" />
                    ) : (
                      <span className="truncate px-1">{key}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Lista de Resultados */}
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
              Nenhum jogo encontrado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((game, idx) => {
              const isFocused = focusZone === 'results' && resultIdx === idx;
              return (
                <div
                  key={game.id}
                  ref={(el) => {
                    resultRefs.current[idx] = el;
                  }}
                  onMouseEnter={() => {
                    setFocusZone('results');
                    setResultIdx(idx);
                  }}
                  className="theme-control flex items-center justify-between gap-4 p-3 border transition-all"
                  style={{
                    backgroundColor: isFocused
                      ? 'rgba(var(--accent-rgb), 0.14)'
                      : 'var(--bg-deep)',
                    borderColor: isFocused
                      ? 'var(--accent)'
                      : 'var(--border-subtle)',
                    boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onFocusGame(game)}
                    className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className="theme-control w-11 aspect-[2/3] overflow-hidden shrink-0 border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt={game.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="w-4 h-4 text-[var(--text-secondary)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
                        {game.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                        {game.platformLabel || game.platform} ·{' '}
                        {game.hoursPlayed.toFixed(1)}h
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectAndPlay(game)}
                    className="theme-control inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:brightness-110 shrink-0"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: 'var(--accent-glow)',
                    }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>JOGAR</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com dicas de D-Pad */}
        <div
          className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs text-[var(--text-secondary)]"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <KeyCap label="D-Pad" />
              <span>Digitar / Resultados</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ConfirmButtonIcon className="w-4 h-4" />
              <span>Selecionar</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 font-semibold uppercase hover:text-[var(--text-primary)] cursor-pointer"
          >
            <CancelButtonIcon className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
});

QuickSearchModal.displayName = 'QuickSearchModal';
