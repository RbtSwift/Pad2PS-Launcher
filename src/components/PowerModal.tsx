import React from 'react';
import { MonitorOff, Power, RefreshCw, X } from 'lucide-react';
import { CircleIcon, CrossIcon } from './PlayStationIcons';

interface PowerModalProps {
  focusedIndex: number;
  onChangeFocus: (idx: number) => void;
  onSleepMode: () => void;
  onReload: () => void;
  onClose: () => void;
}

export const PowerModal: React.FC<PowerModalProps> = ({
  focusedIndex,
  onChangeFocus,
  onSleepMode,
  onReload,
  onClose,
}) => {
  const options = [
    {
      id: 'sleep',
      label: 'Entrar em Modo Descanso',
      description: 'Escurece a tela e mantém o launcher pronto para retomar',
      icon: MonitorOff,
      action: onSleepMode,
    },
    {
      id: 'reload',
      label: 'Reiniciar Pad2PS Launcher',
      description: 'Recarrega a interface e os controles conectados',
      icon: RefreshCw,
      action: onReload,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="power-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#121218] border border-[#27273A] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Power className="w-5 h-5 text-rose-400" />
            <h2
              id="power-modal-title"
              className="font-display text-xl font-bold text-[#F4F4F6]"
            >
              Energia do Console
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

        <div className="flex flex-col gap-2.5">
          {options.map((opt, idx) => {
            const Icon = opt.icon;
            const isFocused = focusedIndex === idx;
            return (
              <button
                key={opt.id}
                type="button"
                onMouseEnter={() => onChangeFocus(idx)}
                onClick={opt.action}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-[#0B0B0F] text-left transition-all cursor-pointer"
                style={{
                  border: isFocused
                    ? '1px solid var(--accent)'
                    : '1px solid #27273A',
                  backgroundColor: isFocused
                    ? 'rgba(var(--accent-rgb), 0.12)'
                    : '#0B0B0F',
                }}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={isFocused ? { color: 'var(--accent)' } : { color: '#94A3B8' }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#F4F4F6]">
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </div>
                {isFocused && <CrossIcon className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#27273A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F4F4F6] cursor-pointer"
          >
            <CircleIcon className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
