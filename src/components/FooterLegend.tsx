import React from 'react';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
} from './ControllerIcons';

interface FooterLegendProps {
  hasSelectedGame: boolean;
  isModalOpen: boolean;
  isDockOpen: boolean;
  onToggleDock: () => void;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onOpenOptions?: () => void;
  onOpenTranslator?: () => void;
  onBack?: () => void;
}

export const FooterLegend: React.FC<FooterLegendProps> = ({
  hasSelectedGame,
  isModalOpen,
  isDockOpen,
  onToggleDock,
  onPlay,
  onToggleFavorite,
  onOpenOptions,
  onOpenTranslator,
  onBack,
}) => {
  return (
    <footer
      className="relative z-20 flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 py-3 border-t backdrop-blur-md text-sm font-semibold tracking-wide uppercase text-[var(--text-secondary)] shrink-0"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'color-mix(in srgb, var(--bg-deep) 86%, transparent)',
      }}
    >
      {/* Canto Esquerdo: Botão clicável [PAD2PS] MENU para o Dock Central */}
      <button
        type="button"
        onClick={onToggleDock}
        title="Abrir Dock Central Pad2PS (Botão Home / Tab / Esc)"
        className="theme-control inline-flex items-center gap-2.5 px-4 py-2 border text-sm font-display font-bold tracking-wider text-[var(--text-primary)] hover:brightness-110 transition-all cursor-pointer shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: isDockOpen ? 'var(--accent)' : 'var(--border-subtle)',
          boxShadow: isDockOpen ? 'var(--accent-glow)' : undefined,
        }}
      >
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold text-white"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.5)',
          }}
        >
          2
        </span>
        <span>PAD2PS</span>
        <span className="text-[var(--text-secondary)] font-semibold">MENU</span>
      </button>

      {/* Canto Direito: Ícones grandes e claros dos atalhos do controle ativo */}
      <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6">
        {hasSelectedGame && !isModalOpen && !isDockOpen && (
          <>
            <button
              type="button"
              onClick={onOpenTranslator}
              className="hidden lg:inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <KeyCap label="R2 / T" />
              <span>TRADUTOR</span>
            </button>

            <button
              type="button"
              onClick={onOpenOptions}
              className="hidden sm:inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <OptionsButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>OPÇÕES</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              className="hidden md:inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <FavoriteButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>FAVORITAR</span>
            </button>

            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center gap-2 text-[var(--text-primary)] hover:brightness-125 transition-all cursor-pointer whitespace-nowrap"
            >
              <ConfirmButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>JOGAR / SELECIONAR</span>
            </button>
          </>
        )}

        {(isModalOpen || isDockOpen) && (
          <>
            <div className="inline-flex items-center gap-2 text-[var(--text-primary)] whitespace-nowrap">
              <ConfirmButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>SELECIONAR</span>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <CancelButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>VOLTAR</span>
            </button>
          </>
        )}
      </div>
    </footer>
  );
};
