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
  onSaveSaveFolder?: (folder: string) => void;
  onSyncSaves?: () => void;
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
  onSaveSaveFolder,
  onSyncSaves,
  onClose,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [achievements, setAchievements] = useState<{ unlocked: number; total: number; percentage: number } | null>(null);
  const [retroProgress, setRetroProgress] = useState<{ title?: string; total: number; unlocked: number; achievements: Array<{ title: string; description: string; points: number }> } | null>(null);
  const [retroIdInput, setRetroIdInput] = useState(game.retroGameId ? String(game.retroGameId) : '');
  const [igdbMetadata, setIgdbMetadata] = useState<IgdbGameMetadata | null>(null);
  const [protonTier, setProtonTier] = useState<string | null>(null);
  const [saveFolder, setSaveFolder] = useState(game.saveFolder || '');
  const [pcgwFeatures, setPcgwFeatures] = useState<{ xboxController: boolean; playstationController: boolean; ultrawide: boolean } | null>(null);

  useEffect(() => {
    setConfirmDelete(false);
    setSaveFolder(game.saveFolder || '');
    setAchievements(null);
    setRetroIdInput(game.retroGameId ? String(game.retroGameId) : '');
    setIgdbMetadata(null);
    setProtonTier(null);
    setPcgwFeatures(null);
    void fetchIgdbMetadata(game.title).then(setIgdbMetadata).catch(() => {});
    const appId = Number(game.steamAppId || game.command.match(/steam:\/\/(?:rungameid|install)\/(\d+)/i)?.[1]);
    if (appId && !game.steamRemote) {
      fetch(`/api/steam/achievements?appId=${appId}`).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.available) setAchievements(data); }).catch(() => {});
      fetch(`/api/game-tech/pcgw?appId=${appId}&title=${encodeURIComponent(game.title)}`).then((response) => response.ok ? response.json() : null).then((result) => { if (result?.available) setPcgwFeatures(result.data); }).catch(() => {});
      fetch(`/api/game-tech/protondb?appId=${appId}`).then((response) => response.ok ? response.json() : null).then((result) => { if (result?.available) setProtonTier(result.data.tier); }).catch(() => {});
    } else if (game.platformLabel === 'PC') {
      fetch(`/api/game-tech/pcgw?title=${encodeURIComponent(game.title)}`).then((response) => response.ok ? response.json() : null).then((result) => { if (result?.available) setPcgwFeatures(result.data); }).catch(() => {});
    }
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
      <div className="theme-surface w-full max-w-6xl max-h-[90vh] overflow-y-auto no-scrollbar p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[minmax(240px,0.78fr)_minmax(0,1.45fr)] md:gap-x-6 content-start">
        <div className="flex items-start justify-between gap-4 mb-3 md:col-span-2">
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

        <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 mb-3 min-h-44 md:row-span-2 flex items-end" style={{ backgroundColor: 'var(--bg-deep)' }}>
          {game.coverUrl && <img src={game.coverUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40 blur-xl scale-110" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />
          {game.coverUrl && <img src={game.coverUrl} alt={`Capa de ${game.title}`} className="m-4 h-36 w-24 shrink-0 rounded-lg object-cover shadow-xl" />}
          <div className="min-w-0 p-4 pl-0">
            <span className="mb-2 inline-flex rounded-full bg-[var(--accent)]/20 px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">{game.platformLabel || game.platform}{game.consoleSystem ? ` · ${game.consoleSystem}` : ''}</span>
            <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">{game.title}</h3>
            {game.genre && <p className="mt-1 text-sm text-white/70">{game.genre}</p>}
          </div>
        </section>
        {game.steamLogoUrl && <img src={game.steamLogoUrl} alt={`${game.title} logo`} onError={(event) => { event.currentTarget.style.display = 'none'; }} className="max-h-14 max-w-[70%] object-contain mb-3 md:col-start-2" />}
        {igdbMetadata && <section className="mb-3 p-4 rounded-xl bg-white/5 space-y-2 text-sm md:col-start-2 text-[var(--text-secondary)]"><h3 className="font-bold text-base text-[var(--text-primary)]">Ficha técnica</h3><div className="flex flex-wrap gap-x-4 gap-y-1">{igdbMetadata.year && <p>Lançamento: {igdbMetadata.year}</p>}{igdbMetadata.rating !== null && <p>Avaliação: {Math.round(igdbMetadata.rating)}%</p>}{igdbMetadata.genres.length > 0 && <p>Gêneros: {igdbMetadata.genres.join(', ')}</p>}{igdbMetadata.developers.length > 0 && <p>Desenvolvedora: {igdbMetadata.developers.join(', ')}</p>}</div>{igdbMetadata.summary && <p className="max-h-32 overflow-y-auto no-scrollbar leading-relaxed">{igdbMetadata.summary}</p>}{igdbMetadata.screenshots.length > 0 && <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">{igdbMetadata.screenshots.map((url) => <img key={url} src={url} alt={`Captura de ${igdbMetadata.name}`} loading="lazy" className="h-24 w-auto rounded object-cover" />)}</div>}<p className="text-[10px]">Metadados fornecidos por IGDB.</p></section>}
        {(protonTier || pcgwFeatures) && <section className="mb-3 flex flex-wrap gap-2 md:col-start-2">{protonTier && <span className={`rounded-full px-3 py-1 text-xs font-bold ${protonTier === 'Platinum' ? 'bg-sky-400/20 text-sky-300' : protonTier === 'Gold' ? 'bg-amber-400/20 text-amber-300' : protonTier === 'Silver' ? 'bg-slate-300/20 text-slate-200' : protonTier === 'Bronze' ? 'bg-orange-500/20 text-orange-300' : 'bg-rose-500/20 text-rose-300'}`}>ProtonDB · {protonTier}</span>}{pcgwFeatures?.xboxController && <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Controle Xbox</span>}{pcgwFeatures?.playstationController && <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs font-semibold text-blue-300">Controle PlayStation</span>}{pcgwFeatures?.ultrawide && <span className="rounded-full bg-violet-400/15 px-3 py-1 text-xs font-semibold text-violet-300">Ultrawide</span>}</section>}
        {(typeof game.steamPlaytimeHours === 'number' || achievements) && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 text-xs md:col-start-1 text-[var(--text-secondary)] space-y-1">
            {typeof game.steamPlaytimeHours === 'number' && <p>{game.steamPlaytimeHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h jogadas na Steam{game.steamRecentlyPlayed ? ' · jogado nas últimas 2 semanas' : ''}</p>}
            {achievements && <p>Conquistas: <strong className="text-[var(--text-primary)]">{achievements.unlocked}/{achievements.total} ({achievements.percentage}%)</strong></p>}
          </div>
        )}

        {(game.platform === 'Emulador' || Boolean(game.consoleSystem)) && <div className="mb-3 p-3 rounded-lg bg-white/5 space-y-2 md:col-start-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">GameID do RetroAchievements (jogos retrô)</label>
          <div className="flex gap-2"><input value={retroIdInput} onChange={(event) => setRetroIdInput(event.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Ex.: 12345" className="theme-control min-w-0 flex-1 px-3 py-2 text-sm bg-black/20 text-[var(--text-primary)]"/><button type="button" className="theme-control px-3 py-2 text-xs font-bold bg-[var(--accent)] text-white" onClick={() => onSaveRetroGameId(Number(retroIdInput) || undefined)}>Vincular</button></div>
          {retroProgress && <div className="space-y-2 text-xs text-[var(--text-secondary)]"><p className="font-bold text-[var(--text-primary)]">{retroProgress.title}: {retroProgress.unlocked}/{retroProgress.total} conquistas</p><progress className="w-full accent-[var(--accent)]" value={retroProgress.unlocked} max={Math.max(1,retroProgress.total)}/>{retroProgress.achievements.map((item) => <p key={item.title}>🏆 {item.title} · {item.points} pts</p>)}</div>}
        </div>}

        <section className="mb-3 rounded-xl bg-white/5 p-3 space-y-2 md:col-start-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">Pasta de Saves (Save Sync)</label>
          <div className="flex gap-2"><input value={saveFolder} onChange={(event) => setSaveFolder(event.target.value)} placeholder="Caminho da pasta de saves" className="theme-control min-w-0 flex-1 px-3 py-2 text-sm"/><button type="button" disabled={!onSaveSaveFolder} onClick={() => onSaveSaveFolder?.(saveFolder.trim())} className="theme-control px-3 py-2 text-xs font-bold text-white disabled:opacity-40" style={{backgroundColor:'var(--accent)'}}>Vincular</button></div>
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"><span>{game.saveSyncLastAt ? `Última sincronização: ${new Date(game.saveSyncLastAt).toLocaleString()}` : 'A sincronização só acontece ao iniciar/encerrar um jogo ou manualmente.'}</span><button type="button" disabled={!saveFolder || !onSyncSaves} onClick={onSyncSaves} className="theme-control px-3 py-2 font-bold text-[var(--text-primary)] disabled:opacity-40">Sincronizar Agora</button></div>
        </section>

        <div className="flex flex-col gap-2 md:col-start-1 md:row-span-2">
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
          className="mt-3 pt-3 border-t flex items-center justify-between md:col-span-2 text-xs text-[var(--text-secondary)]"
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
