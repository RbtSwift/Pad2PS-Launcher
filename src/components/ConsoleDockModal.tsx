import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  Cpu,
  Download,
  ExternalLink,
  Gamepad2,
  Heart,
  Home,
  Layers,
  Library,
  Plus,
  Power,
  Settings,
  X,
} from 'lucide-react';
import { FilterTab } from '../types';
import { soundEngine } from '../utils/sound';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  KeyCap,
} from './ControllerIcons';
import { Logo } from './Logo';

export interface ConsoleDockHandle {
  navigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
  confirm: () => void;
}

interface ConsoleDockModalProps {
  isOpen: boolean;
  activeTab: FilterTab;
  onSelectSection: (tab: FilterTab) => void;
  onAddGame: () => void;
  onOpenTranslator: () => void;
  onOpenSettings: () => void;
  onOpenPower: () => void;
  onDownloadLogo: () => void;
  onClose: () => void;
}

interface DockItem {
  id: string;
  label: string;
  subtitle: string;
  tab?: FilterTab;
  action?: 'add' | 'translator' | 'settings' | 'power';
  icon: React.ReactNode;
}

const COLS = 3;

export const ConsoleDockModal = forwardRef<
  ConsoleDockHandle,
  ConsoleDockModalProps
>(
  (
    {
      isOpen,
      activeTab,
      onSelectSection,
      onAddGame,
      onOpenTranslator,
      onOpenSettings,
      onOpenPower,
      onDownloadLogo,
      onClose,
    },
    ref
  ) => {
    const items: DockItem[] = [
      {
        id: 'home',
        label: 'Início',
        subtitle: 'Destaques e recentes',
        tab: 'Início',
        icon: <Home className="w-6 h-6" />,
      },
      {
        id: 'all',
        label: 'Toda a Biblioteca',
        subtitle: 'Todos os jogos instalados',
        tab: 'Todos',
        icon: <Library className="w-6 h-6" />,
      },
      {
        id: 'steam',
        label: 'Steam',
        subtitle: 'Catálogo Valve Steam',
        tab: 'Steam',
        icon: <Gamepad2 className="w-6 h-6" />,
      },
      {
        id: 'heroic-gog',
        label: 'Heroic / Epic & GOG',
        subtitle: 'Epic Games, Heroic e GOG',
        tab: 'Heroic / Epic & GOG',
        icon: <Layers className="w-6 h-6" />,
      },
      {
        id: 'emulators',
        label: 'Emuladores',
        subtitle: 'PS2, PS1, PSP e clássicos',
        tab: 'Emuladores',
        icon: <Cpu className="w-6 h-6" />,
      },
      {
        id: 'favorites',
        label: 'Favoritos',
        subtitle: 'Seus jogos marcados',
        tab: 'Favoritos',
        icon: <Heart className="w-6 h-6" />,
      },
      {
        id: 'add-game',
        label: 'Adicionar Jogo',
        subtitle: 'Novo atalho na biblioteca',
        action: 'add',
        icon: <Plus className="w-6 h-6" />,
      },
      {
        id: 'translator',
        label: 'Tradutor Pad2PS (Web)',
        subtitle: 'PlayStation ↔ Xbox / PC',
        action: 'translator',
        icon: <ExternalLink className="w-6 h-6" />,
      },
      {
        id: 'settings',
        label: 'Configurações',
        subtitle: 'Temas, controle e JSON',
        action: 'settings',
        icon: <Settings className="w-6 h-6" />,
      },
      {
        id: 'power',
        label: 'Energia / Modo Descanso',
        subtitle: 'Suspender ou reiniciar',
        action: 'power',
        icon: <Power className="w-6 h-6" />,
      },
    ];

    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
      if (isOpen) {
        const activeIdx = items.findIndex((it) => it.tab === activeTab);
        setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
      }
    }, [isOpen, activeTab]);

    const activateItem = (item: DockItem) => {
      if (item.tab) {
        onSelectSection(item.tab);
      } else if (item.action === 'add') {
        soundEngine.playMove();
        onAddGame();
      } else if (item.action === 'translator') {
        soundEngine.playMove();
        onOpenTranslator();
      } else if (item.action === 'settings') {
        onOpenSettings();
      } else if (item.action === 'power') {
        onOpenPower();
      }
    };

    useImperativeHandle(ref, () => ({
      navigate: (dir) => {
        soundEngine.playMove();
        setFocusedIndex((curr) => {
          const total = items.length;
          if (dir === 'left') {
            return (curr - 1 + total) % total;
          }
          if (dir === 'right') {
            return (curr + 1) % total;
          }
          if (dir === 'up') {
            const candidate = curr - COLS;
            if (candidate >= 0) return candidate;
            const col = curr % COLS;
            const lastRowStart = Math.floor((total - 1) / COLS) * COLS;
            const wrapped = lastRowStart + col;
            return wrapped < total ? wrapped : total - 1;
          }
          // down
          const candidate = curr + COLS;
          if (candidate < total) return candidate;
          return curr % COLS;
        });
      },
      confirm: () => {
        const item = items[focusedIndex];
        if (item) activateItem(item);
      },
    }));

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Dock Central Pad2PS"
      >
        {/* Fundo com desfoque intenso */}
        <button
          type="button"
          aria-label="Fechar Dock Central"
          onClick={onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-xl brightness-50 cursor-default focus:outline-none"
        />

        {/* Dock Central em Grade de 3 Colunas */}
        <div className="theme-surface relative z-10 w-full max-w-4xl max-h-[88vh] flex flex-col p-6 sm:p-8 overflow-hidden">
          {/* Topo do Dock */}
          <div
            className="flex items-center justify-between gap-4 pb-4 mb-5 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span
                className="hidden sm:inline-block h-5 w-px"
                style={{ backgroundColor: 'var(--border-subtle)' }}
              />
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Dock Central do Console
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownloadLogo}
                title="Baixar Logo Oficial Pad2PS (PNG 1024x1024)"
                className="theme-control hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-deep)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Download
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--accent)' }}
                />
                <span>Logo PNG</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar Dock Central"
                className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Grade 3 Colunas de Botões Grandes e Espaçados */}
          <nav
            aria-label="Ações e Coleções Pad2PS"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto no-scrollbar py-1"
          >
            {items.map((item, idx) => {
              const isFocused = focusedIndex === idx;
              const isCurrentSection = item.tab === activeTab;
              const isTranslator = item.action === 'translator';
              const isPower = item.action === 'power';

              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(idx)}
                  onClick={() => activateItem(item)}
                  className={`theme-control group flex items-center gap-4 p-4 sm:p-5 text-left transition-all duration-150 cursor-pointer border ${
                    idx === items.length - 1 ? 'lg:col-span-3' : ''
                  }`}
                  style={{
                    backgroundColor: isFocused
                      ? 'rgba(var(--accent-rgb), 0.16)'
                      : isCurrentSection
                      ? 'rgba(var(--accent-rgb), 0.09)'
                      : 'var(--bg-deep)',
                    borderColor: isFocused
                      ? 'var(--accent)'
                      : isTranslator
                      ? 'rgba(var(--accent-rgb), 0.45)'
                      : isCurrentSection
                      ? 'rgba(var(--accent-rgb), 0.5)'
                      : 'var(--border-subtle)',
                    boxShadow: isFocused ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <div
                    className="theme-control w-12 h-12 flex items-center justify-center shrink-0 border transition-colors"
                    style={{
                      backgroundColor: isFocused
                        ? 'var(--accent)'
                        : 'var(--bg-surface)',
                      borderColor: isFocused
                        ? 'var(--accent)'
                        : 'var(--border-subtle)',
                      color: isFocused
                        ? '#FFFFFF'
                        : isPower
                        ? '#FB7185'
                        : isTranslator || isCurrentSection
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {item.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Rodapé do Dock */}
          <div
            className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-secondary)] shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <KeyCap label="D-Pad / Setas" />
                <span>Navegar</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ConfirmButtonIcon className="w-4 h-4" />
                <span>Abrir</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <CancelButtonIcon className="w-4 h-4" />
              <span>Fechar Dock</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ConsoleDockModal.displayName = 'ConsoleDockModal';
