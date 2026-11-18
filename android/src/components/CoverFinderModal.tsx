import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Check,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  extractSteamAppId,
  fetchSteamCdnCover,
  getStoredSteamGridDbKey,
  OnlineCoverCandidate,
  searchSteamGridDbCovers,
} from '../utils/coverSearch';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  KeyCap,
} from './ControllerIcons';

export interface CoverFinderHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
}

interface CoverFinderModalProps {
  initialTitle: string;
  initialCommand?: string;
  onSelectCover: (url: string) => void;
  onGoToApiSettings?: () => void;
  onClose: () => void;
}

export const CoverFinderModal = forwardRef<
  CoverFinderHandle,
  CoverFinderModalProps
>(
  (
    {
      initialTitle,
      initialCommand = '',
      onSelectCover,
      onGoToApiSettings,
      onClose,
    },
    ref
  ) => {
    const detectedAppId = extractSteamAppId(initialCommand) ?? '';
    const [query, setQuery] = useState(initialTitle);
    const [appId, setAppId] = useState(detectedAppId);
    const [results, setResults] = useState<OnlineCoverCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusNote, setStatusNote] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);

    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const apiKey = getStoredSteamGridDbKey();

    const runSearch = async (searchTerm: string, steamIdInput: string) => {
      const cleanTerm = searchTerm.trim();
      const cleanId =
        extractSteamAppId(steamIdInput) ??
        (/^\d+$/.test(steamIdInput.trim()) ? steamIdInput.trim() : '');

      if (!cleanTerm && !cleanId) {
        setErrorMsg('Informe o nome do jogo ou um AppID da Steam.');
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      setStatusNote(null);

      const collected: OnlineCoverCandidate[] = [];
      let sgdbNote: string | null = null;
      let sgdbError: string | undefined;

      // 1. Steam Official CDN lookup if AppID is present
      if (cleanId) {
        const steamCover = await fetchSteamCdnCover(cleanId);
        if (steamCover) {
          collected.push(steamCover);
        }
      }

      // 2. SteamGridDB 600x900 lookup if API key is configured
      if (apiKey && cleanTerm) {
        const sgdb = await searchSteamGridDbCovers(cleanTerm, apiKey);
        if (sgdb.covers.length > 0) {
          collected.push(...sgdb.covers);
          sgdbNote = `Resultados de "${sgdb.matchedGameName}" (600×900)`;
        }
        sgdbError = sgdb.error;
      }

      setResults(collected);
      setFocusedIndex(0);

      if (collected.length === 0) {
        if (sgdbError) {
          setErrorMsg(sgdbError);
        } else if (!apiKey && !cleanId) {
          setStatusNote(
            'Nenhuma chave SteamGridDB salva e nenhum AppID informado. Informe um AppID da Steam acima ou configure sua chave gratuita em Sistema → Capas & API SteamGridDB.'
          );
        } else {
          setStatusNote(
            'Nenhuma capa vertical 600×900 encontrada para este termo ou AppID.'
          );
        }
      } else if (sgdbError) {
        setStatusNote(
          `Capa oficial da Steam carregada. (${sgdbError})`
        );
      } else if (sgdbNote) {
        setStatusNote(sgdbNote);
      } else if (collected.length > 0) {
        setStatusNote('Capa vertical oficial da Steam carregada.');
      }

      setLoading(false);
    };

    useEffect(() => {
      if (initialTitle.trim() || detectedAppId) {
        runSearch(initialTitle, detectedAppId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const el = cardRefs.current[focusedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [focusedIndex]);

    const getGridCols = () => {
      if (typeof window === 'undefined') return 4;
      if (window.innerWidth >= 768) return 4;
      if (window.innerWidth >= 640) return 3;
      return 2;
    };

    useImperativeHandle(ref, () => ({
      navigate: (dir) => {
        if (results.length === 0) return;
        soundEngine.playMove();
        const cols = getGridCols();
        setFocusedIndex((curr) => {
          const total = results.length;
          if (dir === 'left') return (curr - 1 + total) % total;
          if (dir === 'right') return (curr + 1) % total;
          if (dir === 'up') {
            const next = curr - cols;
            return next >= 0 ? next : curr;
          }
          const next = curr + cols;
          return next < total ? next : curr;
        });
      },
      confirm: () => {
        const chosen = results[focusedIndex];
        if (chosen) {
          soundEngine.playConfirm();
          onSelectCover(chosen.url);
        }
      },
    }));

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-finder-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="theme-surface w-full max-w-4xl p-6 sm:p-7 max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-start justify-between gap-4 pb-4 mb-4 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                Steam CDN &amp; SteamGridDB (600×900)
              </p>
              <h2
                id="cover-finder-title"
                className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]"
              >
                Buscar Capa Online
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar buscador de capas"
              className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query, appId);
            }}
            className="grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-3 mb-4 shrink-0"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome do jogo (para SteamGridDB)..."
              aria-label="Nome do jogo"
              className="theme-control px-4 py-2.5 border text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            />

            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="AppID Steam (opcional)"
              aria-label="AppID da Steam"
              className="theme-control px-4 py-2.5 border text-sm font-mono-tech text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className="theme-control inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white cursor-pointer hover:brightness-110 disabled:opacity-60 shrink-0"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar</span>
            </button>
          </form>

          {/* API Key banner if missing */}
          {!apiKey && (
            <div
              className="theme-control mb-4 px-4 py-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <KeyRound
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--accent)' }}
                />
                <span>
                  Buscando apenas por <strong className="text-[var(--text-primary)]">AppID da Steam</strong>. Configure sua chave gratuita do SteamGridDB para buscar por nome.
                </span>
              </div>
              {onGoToApiSettings && (
                <button
                  type="button"
                  onClick={onGoToApiSettings}
                  className="theme-control px-3 py-1.5 border text-xs font-semibold text-[var(--text-primary)] hover:border-white/40 transition-colors cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--accent)',
                  }}
                >
                  Configurar API Key
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="theme-control mb-4 px-4 py-3 bg-rose-500/15 border border-rose-500/40 text-xs sm:text-sm text-rose-200 shrink-0">
              {errorMsg}
            </div>
          )}

          {statusNote && !errorMsg && (
            <div
              className="theme-control mb-4 px-4 py-2.5 border text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-2 shrink-0"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Sparkles
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--accent)' }}
              />
              <span>{statusNote}</span>
            </div>
          )}

          {/* Cover Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-1">
            {loading ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: 'var(--accent)' }}
                />
                <span className="text-sm font-medium">
                  Buscando capas verticais 600×900...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--text-secondary)] gap-2">
                <ImageIcon className="w-10 h-10 opacity-50" />
                <p className="text-sm">
                  Use o nome do jogo (com SteamGridDB) ou um AppID da Steam (ex: 1091500) para listar capas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                {results.map((item, idx) => {
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        cardRefs.current[idx] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => {
                        soundEngine.playConfirm();
                        onSelectCover(item.url);
                      }}
                      className={`theme-control group relative aspect-[2/3] overflow-hidden text-left transition-all cursor-pointer focus:outline-none ${
                        isFocused ? 'scale-[1.03] z-10' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: 'var(--bg-deep)',
                        border: isFocused
                          ? '2.5px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                        boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                      }}
                    >
                      <img
                        src={item.thumbUrl}
                        alt={item.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                        <p className="text-xs font-bold text-white truncate">
                          {item.source}
                        </p>
                        <p className="text-[11px] font-mono-tech text-white/75 truncate">
                          {item.dimensions}
                        </p>
                      </div>

                      {isFocused && (
                        <span
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                          style={{
                            backgroundColor: 'var(--accent)',
                            boxShadow: 'var(--accent-glow)',
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs text-[var(--text-secondary)]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <KeyCap label="D-Pad / Setas" />
                <span>Navegar grade</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ConfirmButtonIcon className="w-4 h-4" />
                <span>Usar capa</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] cursor-pointer"
            >
              <CancelButtonIcon className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

CoverFinderModal.displayName = 'CoverFinderModal';
