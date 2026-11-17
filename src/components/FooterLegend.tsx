import React from 'react';
import {
  CircleIcon,
  CrossIcon,
  KeyCap,
  SquareIcon,
  TriangleIcon,
} from './PlayStationIcons';

interface FooterLegendProps {
  hasSelectedGame: boolean;
  isModalOpen: boolean;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onOpenOptions?: () => void;
  onOpenSettings?: () => void;
  onNextTab?: () => void;
}

export const FooterLegend: React.FC<FooterLegendProps> = ({
  hasSelectedGame,
  isModalOpen,
  onPlay,
  onToggleFavorite,
  onOpenOptions,
  onOpenSettings,
  onNextTab,
}) => {
  return (
    <footer className="relative z-20 flex items-center justify-between gap-4 px-5 md:px-8 lg:px-12 py-3 border-t border-[#27273A]/70 bg-[#0B0B0F]/80 backdrop-blur-md text-xs text-[#94A3B8] shrink-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <KeyCap label="D-Pad / Analógico" />
          <span>Navegar</span>
        </div>

        <button
          type="button"
          onClick={onNextTab}
          className="flex items-center gap-2 whitespace-nowrap hover:text-[#F4F4F6] transition-colors cursor-pointer"
        >
          <KeyCap label="L1 / R1" />
          <span>Trocar Aba</span>
        </button>

        {hasSelectedGame && !isModalOpen && (
          <>
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#F4F4F6] transition-colors cursor-pointer"
            >
              <CrossIcon className="w-4 h-4" />
              <span className="text-[#F4F4F6] font-medium">Iniciar Jogo</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#F4F4F6] transition-colors cursor-pointer"
            >
              <TriangleIcon className="w-4 h-4" />
              <span>Favoritar</span>
            </button>

            <button
              type="button"
              onClick={onOpenOptions}
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#F4F4F6] transition-colors cursor-pointer"
            >
              <SquareIcon className="w-4 h-4" />
              <span>Opções do Jogo</span>
            </button>
          </>
        )}

        {isModalOpen && (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <CircleIcon className="w-4 h-4" />
            <span>Voltar / Fechar</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="hidden sm:flex items-center gap-2 whitespace-nowrap hover:text-[#F4F4F6] transition-colors cursor-pointer shrink-0"
      >
        <KeyCap label="Options / Start" />
        <span>Configurações</span>
      </button>
    </footer>
  );
};
