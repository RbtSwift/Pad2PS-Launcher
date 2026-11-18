import React from 'react';
import { LauncherPage } from '../types';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
} from './ControllerIcons';

interface FooterLegendProps {
  activePage: LauncherPage;
  hasSelectedGame: boolean;
  isModalOpen: boolean;
  onPlayOrSelect?: () => void;
  onRandomGame?: () => void;
  onOpenOptions?: () => void;
  onBack?: () => void;
}

const PAGE_NAMES: Record<LauncherPage, string> = {
  favorites: 'FAVORITOS',
  library: 'BIBLIOTECA',
  system: 'SISTEMA',
};

export const FooterLegend: React.FC<FooterLegendProps> = ({
  activePage,
  hasSelectedGame,
  isModalOpen,
  onPlayOrSelect,
  onRandomGame,
  onOpenOptions,
  onBack,
}) => {
  return (
    <footer
      className="relative z-20 flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-16 py-4 border-t backdrop-blur-md text-sm font-bold tracking-wider uppercase text-[var(--text-secondary)] shrink-0"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'color-mix(in srgb, var(--bg-deep) 88%, transparent)',
      }}
    >
      {/* Esquerda: PAD2PS LAUNCHER + Nome da página atual */}
      <div className="flex items-center gap-3 min-w-0 truncate">
        <span className="font-display font-extrabold text-[var(--text-primary)] tracking-wider shrink-0">
          PAD2PS LAUNCHER
        </span>
        <span aria-hidden="true" className="text-[var(--text-secondary)]">
          ·
        </span>
        <span
          className="font-display font-bold truncate"
          style={{ color: 'var(--accent)' }}
        >
          {PAGE_NAMES[activePage]}
        </span>
      </div>

      {/* Direita: Atalhos grandes com ícones dinâmicos do layout de controle */}
      <div className="flex flex-wrap items-center justify-end gap-5 sm:gap-7 shrink-0">
        {!isModalOpen ? (
          <>
            <div className="hidden lg:inline-flex items-center gap-2 whitespace-nowrap">
              <KeyCap label="D-Pad" className="px-2 py-1 text-[11px]" />
              <span>NAVEGAR</span>
            </div>

            {activePage !== 'system' && hasSelectedGame && (
              <button
                type="button"
                onClick={onOpenOptions}
                className="hidden sm:inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
              >
                <OptionsButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                <span>OPÇÕES</span>
              </button>
            )}

            {activePage !== 'system' && (
              <button
                type="button"
                onClick={onRandomGame}
                title="Sortear um jogo aleatório (Botão Y / △ / Tecla F)"
                className="hidden md:inline-flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
              >
                <FavoriteButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                <span>JOGO ALEATÓRIO</span>
              </button>
            )}

            <button
              type="button"
              onClick={onPlayOrSelect}
              className="inline-flex items-center gap-2 text-[var(--text-primary)] hover:brightness-125 transition-all cursor-pointer whitespace-nowrap"
            >
              <ConfirmButtonIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              <span>JOGAR / SELECIONAR</span>
            </button>
          </>
        ) : (
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
