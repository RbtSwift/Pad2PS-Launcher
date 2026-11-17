import React, { useEffect, useState } from 'react';
import { Edit3, Heart, Play, Trash2, X } from 'lucide-react';
import { Game } from '../types';
import { CancelButtonIcon, ConfirmButtonIcon } from './ControllerIcons';

interface GameOptionsModalProps {
  game: Game;
  focusedIndex: number;
  onChangeFocus: (idx: number) => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const GameOptionsModal: React.FC<GameOptionsModalProps> = ({
  game,
  focusedIndex,
  onChangeFocus,
  onPlay,
  onToggleFavorite,
  onEdit,
  onDelete,
  onClose,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [game.id]);

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
      id: 'edit',
      label: 'Editar Informações e Comando',
      icon: Edit3,
      action: onEdit,
      danger: false,
    },
    {
      id: 'delete',
      label: confirmDelete
        ? 'Confirmar Remoção da Biblioteca'
        : 'Remover Jogo da Biblioteca',
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
      <div className="w-full max-w-md bg-[#121218] border border-[#27273A] rounded-2xl p-6 shadow-2xl">
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
              className="font-display text-xl font-bold text-[#F4F4F6] truncate"
            >
              {game.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  item.danger
                    ? 'text-rose-400 hover:bg-rose-500/10'
                    : 'text-[#F4F4F6] hover:bg-white/5'
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
                    : { border: '1px solid #27273A' }
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
                {isFocused && (
                  <ConfirmButtonIcon className="w-4 h-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#27273A] flex items-center justify-between text-xs text-[#94A3B8]">
          <span>Use D-Pad ↑/↓ para navegar</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 hover:text-[#F4F4F6] cursor-pointer"
          >
            <CancelButtonIcon className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
