import React, { useImperativeHandle, useState, forwardRef } from 'react';
import { Check, Gamepad2, Sparkles } from 'lucide-react';
import { ControllerLayout, ResolvedControllerLayout } from '../types';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
  TabPairKeyCap,
} from './ControllerIcons';
import { Logo } from './Logo';

export interface WelcomeControllerModalHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
}

interface WelcomeControllerModalProps {
  detectedLayout: ResolvedControllerLayout;
  connectedGamepad: string | null;
  onSelectLayout: (layout: ControllerLayout) => void;
}

interface LayoutOption {
  id: ControllerLayout;
  title: string;
  subtitle: string;
  previewLayout: ResolvedControllerLayout;
  badge?: string;
}

const GRID: number[][] = [
  [0, 1],
  [2, 3],
];

function findPos(index: number): [number, number] {
  for (let r = 0; r < GRID.length; r++) {
    const c = GRID[r].indexOf(index);
    if (c !== -1) return [r, c];
  }
  return [0, 0];
}

export const WelcomeControllerModal = forwardRef<
  WelcomeControllerModalHandle,
  WelcomeControllerModalProps
>(({ detectedLayout, connectedGamepad, onSelectLayout }, ref) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const options: LayoutOption[] = [
    {
      id: 'auto',
      title: 'Automático',
      subtitle: connectedGamepad
        ? `Controle detectado: ${connectedGamepad}`
        : 'Detecta automaticamente seu controle conectado',
      previewLayout: detectedLayout,
      badge: 'Recomendado',
    },
    {
      id: 'playstation',
      title: 'PlayStation',
      subtitle: 'Ícones ✕ ○ □ △ e L1 / R1',
      previewLayout: 'playstation',
    },
    {
      id: 'xbox',
      title: 'Xbox / PC (GameSir, 8BitDo)',
      subtitle: 'Ícones A B X Y e LB / RB',
      previewLayout: 'xbox',
    },
    {
      id: 'nintendo',
      title: 'Nintendo Switch',
      subtitle: 'Ícones B A Y X e L / R',
      previewLayout: 'nintendo',
    },
  ];

  useImperativeHandle(ref, () => ({
    navigate: (dir) => {
      soundEngine.playMove();
      setFocusedIndex((curr) => {
        const [r, c] = findPos(curr);
        if (dir === 'left' || dir === 'right') {
          return GRID[r][(c + 1) % 2];
        }
        return GRID[(r + 1) % 2][c];
      });
    },
    confirm: () => {
      onSelectLayout(options[focusedIndex].id);
    },
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0F]/92 backdrop-blur-xl p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-controller-title"
    >
      <div className="w-full max-w-3xl bg-[#121218] border border-[#27273A] rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header with Pad2PS Logo */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <h2
            id="welcome-controller-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4F4F6] tracking-tight mb-2"
          >
            Qual padrão de controle você está usando?
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-lg">
            Personalize os ícones dos botões exibidos na interface. Você pode alterar esta preferência a qualquer momento nas Configurações.
          </p>
        </div>

        {/* 2x2 Navigable Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-6">
          {options.map((opt, idx) => {
            const isFocused = focusedIndex === idx;
            return (
              <button
                key={opt.id}
                type="button"
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => onSelectLayout(opt.id)}
                className="relative flex flex-col justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#0B0B0F] text-left transition-all duration-150 cursor-pointer"
                style={{
                  border: isFocused
                    ? '2px solid var(--accent)'
                    : '1px solid #27273A',
                  boxShadow: isFocused
                    ? '0 0 24px rgba(var(--accent-rgb), 0.3)'
                    : undefined,
                  backgroundColor: isFocused
                    ? 'rgba(var(--accent-rgb), 0.08)'
                    : '#0B0B0F',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {opt.id === 'auto' ? (
                        <Sparkles
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent)' }}
                        />
                      ) : (
                        <Gamepad2
                          className="w-4 h-4 shrink-0"
                          style={
                            isFocused
                              ? { color: 'var(--accent)' }
                              : { color: '#94A3B8' }
                          }
                        />
                      )}
                      <span className="font-display font-bold text-base text-[#F4F4F6]">
                        {opt.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {opt.subtitle}
                    </p>
                  </div>

                  {opt.badge && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 text-white"
                      style={{
                        backgroundColor: 'rgba(var(--accent-rgb), 0.25)',
                        border: '1px solid rgba(var(--accent-rgb), 0.55)',
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>

                {/* Live Button Glyph Preview */}
                <div className="flex items-center justify-between pt-3 border-t border-[#27273A]/80">
                  <div className="flex items-center gap-2">
                    <ConfirmButtonIcon
                      layout={opt.previewLayout}
                      className="w-5 h-5"
                    />
                    <CancelButtonIcon
                      layout={opt.previewLayout}
                      className="w-5 h-5"
                    />
                    <OptionsButtonIcon
                      layout={opt.previewLayout}
                      className="w-5 h-5"
                    />
                    <FavoriteButtonIcon
                      layout={opt.previewLayout}
                      className="w-5 h-5"
                    />
                    <TabPairKeyCap layout={opt.previewLayout} />
                  </div>

                  {isFocused && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Selecionar
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5">
            <KeyCap label="D-Pad / Setas" />
            <span>Escolher padrão</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyCap label="Enter / Confirmar" />
            <span>Continuar</span>
          </span>
        </div>
      </div>
    </div>
  );
});

WelcomeControllerModal.displayName = 'WelcomeControllerModal';
