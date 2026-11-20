import React, { useEffect, useState } from 'react';
import { Edit3, Filter, Heart, Play, Search, Trash2, X } from 'lucide-react';
import { Game, LibraryPlatformFilter } from '../types';
import { CancelButtonIcon, ConfirmButtonIcon } from './ControllerIcons';
import { loadRetroCredentials, retroRequest } from '../utils/retroAchievements';
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
  onSaveRetroGameId: (id?: number) => void;
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
  onSaveRetroGameId,
  onClose,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retroId, setRetroId] = useState(game.retroGameId ? String(game.retroGameId) : '');
  const [retroInfo, setRetroInfo] = useState<{title:string;unlocked:number;total:number;achievements:Array<{Title:string;Points:number}>}|null>(null);
  const [igdbMetadata, setIgdbMetadata] = useState<IgdbGameMetadata | null>(null);

  useEffect(() => {
    setConfirmDelete(false);
    setRetroId(game.retroGameId ? String(game.retroGameId) : '');
    setIgdbMetadata(null);
    void fetchIgdbMetadata(game.title).then(setIgdbMetadata).catch(() => {});
  }, [game.id]);

  useEffect(() => { void (async()=>{ if(!game.retroGameId)return; const credentials=await loadRetroCredentials(); if(!credentials)return; try { const data=await retroRequest<any>('API_GetGameInfoAndUserProgress.php',credentials.username,credentials.key,{g:String(game.retroGameId)}); const rows=Object.values(data.Achievements||{}) as Array<any>; const earned=rows.filter((a)=>a.DateEarned||a.DateEarnedHardcore); setRetroInfo({title:data.Title,unlocked:earned.length,total:rows.length,achievements:earned.slice(0,8).map((a)=>({Title:a.Title,Points:a.Points}))}); }catch{} })(); },[game.id,game.retroGameId]);

  const items = [
    {
      id: 'play',
      label: 'Iniciar Jogo',
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
      <div className="theme-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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

        <section className="relative mb-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-black/30">
          {game.coverUrl && <img src={game.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-xl" />}
          <div className="relative flex min-h-36 items-center gap-4 p-4 sm:p-5">
            {game.coverUrl && <img src={game.coverUrl} alt={`Capa de ${game.title}`} className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-lg" />}
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{game.platform || 'Jogo'}</p><h3 className="mt-1 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{game.title}</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">{game.hoursPlayed || 0} h jogadas{game.favorite ? ' · Favorito' : ''}</p></div>
          </div>
        </section>
        {igdbMetadata && <section className="mb-4 p-4 rounded-xl bg-white/5 space-y-2 text-sm text-[var(--text-secondary)]"><h3 className="font-bold text-base text-[var(--text-primary)]">Ficha técnica · IGDB</h3>{igdbMetadata.year&&<p>Lançamento: {igdbMetadata.year}</p>}{igdbMetadata.genres.length>0&&<p>Gêneros: {igdbMetadata.genres.join(', ')}</p>}{igdbMetadata.developers.length>0&&<p>Desenvolvedora: {igdbMetadata.developers.join(', ')}</p>}{igdbMetadata.summary&&<p className="max-h-36 overflow-y-auto leading-relaxed">{igdbMetadata.summary}</p>}{igdbMetadata.screenshots.length>0&&<div className="flex gap-2 overflow-x-auto py-1">{igdbMetadata.screenshots.map((url)=><img key={url} src={url} alt={`Captura de ${igdbMetadata.name}`} loading="lazy" className="h-24 w-auto rounded-lg object-cover"/>)}</div>}<p className="text-[10px]">Metadados fornecidos por IGDB.</p></section>}
        <div className="mb-4 p-3 rounded-lg bg-white/5 space-y-2"><label className="block text-xs font-semibold text-[var(--text-secondary)]">GameID RetroAchievements</label><div className="flex gap-2"><input value={retroId} onChange={(e)=>setRetroId(e.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Vincule um jogo retrô" className="theme-control min-w-0 flex-1 px-3 py-2 text-sm"/><button type="button" onClick={()=>onSaveRetroGameId(Number(retroId)||undefined)} className="theme-control px-3 py-2 text-xs font-bold text-white" style={{backgroundColor:'var(--accent)'}}>Vincular</button></div>{retroInfo&&<><p className="text-xs font-bold">{retroInfo.title}: {retroInfo.unlocked}/{retroInfo.total}</p><progress className="w-full" value={retroInfo.unlocked} max={Math.max(1,retroInfo.total)}/>{retroInfo.achievements.map(a=><p key={a.Title} className="text-xs">🏆 {a.Title} · {a.Points} pts</p>)}</>}</div>

        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
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
