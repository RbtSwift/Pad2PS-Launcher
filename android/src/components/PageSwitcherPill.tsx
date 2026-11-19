import React from 'react';
import { Gamepad2, Settings, Star } from 'lucide-react';
import { LauncherPage } from '../types';
import { NextTabKeyCap, PrevTabKeyCap } from './ControllerIcons';

interface PageSwitcherPillProps {
  activePage: LauncherPage;
  onSelectPage: (page: LauncherPage) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const PAGES: {
  id: LauncherPage;
  label: string;
  icon: typeof Star;
}[] = [
  { id: 'favorites', label: 'Favoritos', icon: Star },
  { id: 'library', label: 'Biblioteca de Jogos', icon: Gamepad2 },
  { id: 'system', label: 'Sistema e Personalização', icon: Settings },
];

export const PageSwitcherPill: React.FC<PageSwitcherPillProps> = ({
  activePage,
  onSelectPage,
  onPrevPage,
  onNextPage,
}) => {
  return (
    <div className="android-page-switcher relative z-20 flex items-center justify-center py-2 shrink-0 pointer-events-none">
      <nav
        aria-label="Navegação Principal"
        className="pointer-events-auto inline-flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-full border backdrop-blur-xl transition-all"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--bg-surface) 84%, transparent)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--panel-shadow)',
        }}
      >
        <button
          type="button"
          onClick={onPrevPage}
          title="Página Anterior"
          className="px-2 py-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer flex items-center"
        >
          <PrevTabKeyCap className="text-[11px] px-2 py-0.5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {PAGES.map((page) => {
            const Icon = page.icon;
            const isActive = activePage === page.id;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page.id)}
                title={page.label}
                aria-label={page.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-12 h-11 sm:w-14 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'scale-105 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--accent)',
                        boxShadow: 'var(--accent-glow)',
                      }
                    : undefined
                }
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${
                    page.id === 'favorites' && isActive ? 'fill-current' : ''
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNextPage}
          title="Próxima Página"
          className="px-2 py-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer flex items-center"
        >
          <NextTabKeyCap className="text-[11px] px-2 py-0.5" />
        </button>
      </nav>
    </div>
  );
};
