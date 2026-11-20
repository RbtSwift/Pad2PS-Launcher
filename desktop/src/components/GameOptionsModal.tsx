import React, { useEffect, useState } from 'react';
import { Edit3, Filter, FolderOpen, Heart, Play, Search, Trash2, X } from 'lucide-react';
import { Game, LibraryPlatformFilter } from '../types';
import { CancelButtonIcon, ConfirmButtonIcon } from './ControllerIcons';
import { fetchIgdbMetadata, type IgdbGameMetadata } from '../utils/igdb';

interface GameOptionsModalProps {
  game: Game;
  focusedIndex: number;
  platformFilter?: LibraryPlatformFilter;
  onCyclePlatformFilter?: () => void;
  onSearchCoverOnline: () => void;
  onChangeFocus: (idx: number) => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenFolder?: () => void;
  onSaveRetroGameId: (gameId: number | undefined) => void;
  onClose: () => void;
}

export const GameOptionsModal: React.FC<GameOptionsModalProps> = ({
  game,
  focusedIndex,
  platformFilter,
  onCyclePlatformFilter,
  onSearchCoverOnline,
  onChangeFocus,
  onPlay,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenFolder,
  onSaveRetroGameId,
  onClose,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [achievements, setAchievements] = useState<{ unlocked: number; total: number; percentage: number } | null>(null);
  const [retroProgress, setRetroProgress] = useState<{ title?: string; total: number; unlocked: number; achievements: Array<{ title: string; description: string; points: number }> } | null>(null);
  const [retroIdInput, setRetroIdInput] = useState(game.retroGameId ? String(game.retroGameId) : '');
  const [igdbMetadata, setIgdbMetadata] = useState<IgdbGameMetadata | null>(null);

  useEffect(() => {
    setConfirmDelete(false);
    setAchievements(null);
    setRetroIdInput(game.retroGameId ? String(game.retroGameId) : '');
    setIgdbMetadata(null);
    void fetchIgdbMetadata(game.title).then(setIgdbMetadata).catch(() => {});
    const appId = Number(game.steamAppId || game.command.match(/steam:\/\/(?:rungameid|install)\/(\d+)/i)?.[1]);
    if (!appId || game.steamRemote) return;
    fetch(`/api/steam/achievements?appId=${appId}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.available) setAchievements(data); })
      .catch(() => {});
  }, [game.id]);

  useEffect(() => {
    const id = Number(game.retroGameId);
    if (!id) { setRetroProgress(null); return; }
    fetch(`/api/retro/game-progress?gameId=${id}`).then((r) => r.ok ? r.json() : null).then((result) => {
      const data = result?.data; if (!result?.available || !data) return;
      const achievements = Object.values(data.Achievements || {}) as Array<{ Title: string; Description: string; Points: number; DateEarned?: string | null; DateEarnedHardcore?: string | null }>;
      const unlocked = achievements.filter((item) => item.DateEarned || item.DateEarnedHardcore);
      setRetroProgress({ title: data.Title, total: achievements.length, unlocked: unlocked.length, achievements: unlocked.slice(0, 8).map((item) => ({ title: item.Title, description: item.Description, points: item.Points })) });
    }).catch(() => {});
  }, [game.id, game.retroGameId]);

  const items = [
    {
      id: 'play',
      label: game.steamRemote ? 'Instalar pela Steam' : 'Iniciar Jogo',
      icon: Play,
      action: onPlay,
      danger: false,
    },
    {
      id: 'favorite',
      label: game.favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos',
      icon: Heart,
      action: onToggleFavorite,
      danger: false,
    },
    {
      id: 'cover',
      label: 'Buscar Capa Online',
      icon: Search,
      action: onSearchCoverOnline,
      danger: false,
    },
    ...(onCyclePlatformFilter
      ? [
          {
            id: 'filter',
            label: `Filtro de Plataforma: ${platformFilter ?? 'Todos'}`,
            icon: Filter,
            action: onCyclePlatformFilter,
            danger: false,
          },
        ]
      : []),
    {
      id: 'edit',
      label: 'Editar Informações e Comando',
      icon: Edit3,
      action: onEdit,
      danger: false,
    },
    ...(onOpenFolder ? [{ id: 'folder', label: 'Abrir pasta do jogo', icon: FolderOpen, action: onOpenFolder, danger: false }] : []),
    {
      id: 'delete',
      label: confirmDelete
        ? 'Confirmar Ocultação da Biblioteca'
        : 'Ocultar / Remover da Biblioteca',
      icon: Trash2,
      action: () => {
        if (!confirmDelete) {
          setConfirmDelete(true);
        } else {
          onDelete();
        }
      },
      danger: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="options-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="theme-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold mb-0.5"
              style={{ color: 'var(--accent)' }}
            >
              Opções do Jogo
            </p>
            <h2
              id="options-modal-title"
              className="font-display text-xl font-bold text-[var(--text-primary)] truncate"
            >
              {game.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="theme-control p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 mb-4 min-h-44 flex items-end" style={{ backgroundColor: 'var(--bg-deep)' }}>
          {game.coverUrl && <img src={game.coverUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40 blur-xl scale-110" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />
          {game.coverUrl && <img src={game.coverUrl} alt={`Capa de ${game.title}`} className="m-4 h-36 w-24 shrink-0 rounded-lg object-cover shadow-xl" />}
          <div className="min-w-0 p-4 pl-0">
            <span className="mb-2 inline-flex rounded-full bg-[var(--accent)]/20 px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">{game.platformLabel || game.platform}{game.consoleSystem ? ` · ${game.consoleSystem}` : ''}</span>
            <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">{game.title}</h3>
            {game.genre && <p className="mt-1 text-sm text-white/70">{game.genre}</p>}
          </div>
        </section>
        {game.steamLogoUrl && <img src={game.steamLogoUrl} alt={`${game.title} logo`} onError={(event) => { event.currentTarget.style.display = 'none'; }} className="max-h-14 max-w-[70%] object-contain mb-3" />}
        {igdbMetadata && <section className="mb-4 p-4 rounded-xl bg-white/5 space-y-2 text-sm text-[var(--text-secondary)]"><h3 className="font-bold text-base text-[var(--text-primary)]">Ficha técnica</h3><div className="flex flex-wrap gap-x-4 gap-y-1">{igdbMetadata.year && <p>Lançamento: {igdbMetadata.year}</p>}{igdbMetadata.rating !== null && <p>Avaliação: {Math.round(igdbMetadata.rating)}%</p>}{igdbMetadata.genres.length > 0 && <p>Gêneros: {igdbMetadata.genres.join(', ')}</p>}{igdbMetadata.developers.length > 0 && <p>Desenvolvedora: {igdbMetadata.developers.join(', ')}</p>}</div>{igdbMetadata.summary && <p className="max-h-32 overflow-y-auto leading-relaxed">{igdbMetadata.summary}</p>}{igdbMetadata.screenshots.length > 0 && <div className="flex gap-2 overflow-x-auto py-1">{igdbMetadata.screenshots.map((url) => <img key={url} src={url} alt={`Captura de ${igdbMetadata.name}`} loading="lazy" className="h-24 w-auto rounded object-cover" />)}</div>}<p className="text-[10px]">Metadados fornecidos por IGDB.</p></section>}
        {(typeof game.steamPlaytimeHours === 'number' || achievements) && (
          <div className="mb-4 p-3 rounded-lg bg-white/5 text-xs text-[var(--text-secondary)] space-y-1">
            {typeof game.steamPlaytimeHours === 'number' && <p>{game.steamPlaytimeHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h jogadas na Steam{game.steamRecentlyPlayed ? ' · jogado nas últimas 2 semanas' : ''}</p>}
            {achievements && <p>Conquistas: <strong className="text-[var(--text-primary)]">{achievements.unlocked}/{achievements.total} ({achievements.percentage}%)</strong></p>}
          </div>
        )}

        <div className="mb-4 p-3 rounded-lg bg-white/5 space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">GameID do RetroAchievements (jogos retrô)</label>
          <div className="flex gap-2"><input value={retroIdInput} onChange={(event) => setRetroIdInput(event.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Ex.: 12345" className="theme-control min-w-0 flex-1 px-3 py-2 text-sm bg-black/20 text-[var(--text-primary)]"/><button type="button" className="theme-control px-3 py-2 text-xs font-bold bg-[var(--accent)] text-white" onClick={() => onSaveRetroGameId(Number(retroIdInput) || undefined)}>Vincular</button></div>
          {retroProgress && <div className="space-y-2 text-xs text-[var(--text-secondary)]"><p className="font-bold text-[var(--text-primary)]">{retroProgress.title}: {retroProgress.unlocked}/{retroProgress.total} conquistas</p><progress className="w-full accent-[var(--accent)]" value={retroProgress.unlocked} max={Math.max(1,retroProgress.total)}/>{retroProgress.achievements.map((item) => <p key={item.title}>🏆 {item.title} · {item.points} pts</p>)}</div>}
        </div>

        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isFocused = focusedIndex === idx;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => onChangeFocus(idx)}
                onClick={item.action}
                className={`theme-control w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
                  item.danger
                    ? 'text-rose-400 hover:bg-rose-500/10'
                    : 'text-[var(--text-primary)] hover:bg-white/5'
                }`}
                style={
                  isFocused
                    ? {
                        backgroundColor: item.danger
                          ? 'rgba(244, 63, 94, 0.14)'
                          : 'rgba(var(--accent-rgb), 0.15)',
                        border: item.danger
                          ? '1px solid rgba(244, 63, 94, 0.6)'
                          : '1px solid var(--accent)',
                      }
                    : { border: '1px solid var(--border-subtle)' }
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {isFocused && (
                  <ConfirmButtonIcon className="w-4 h-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div
          className="mt-5 pt-4 border-t flex items-center justify-between text-xs text-[var(--text-secondary)]"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span>Use D-Pad ↑/↓ para navegar</span>
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
};
