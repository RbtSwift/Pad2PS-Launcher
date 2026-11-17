import React, { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Gamepad2, Search } from 'lucide-react';
import { FilterTab } from '../types';
import { Logo } from './Logo';

interface TopBarProps {
  activeTab: FilterTab;
  activeConsole: string;
  connectedGamepad: string | null;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

function getSectionDisplayName(tab: FilterTab, activeConsole: string): string {
  if (tab === 'Todos') return 'Toda a Biblioteca';
  if (tab === 'Emuladores' && activeConsole !== 'Todos') {
    return `Emuladores · ${activeConsole}`;
  }
  return tab;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  activeConsole,
  connectedGamepad,
  onOpenSearch,
  onOpenMenu,
}) => {
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [batteryCharging, setBatteryCharging] = useState<boolean>(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (!nav.getBattery) return;

    let batteryObj: BatteryManagerLike | null = null;
    const updateBattery = () => {
      if (!batteryObj) return;
      setBatteryLevel(Math.round(batteryObj.level * 100));
      setBatteryCharging(batteryObj.charging);
    };

    nav
      .getBattery()
      .then((bat) => {
        batteryObj = bat;
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
      })
      .catch(() => {});

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', updateBattery);
        batteryObj.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  const sectionLabel = getSectionDisplayName(activeTab, activeConsole);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 py-3.5 lg:py-4 shrink-0">
      {/* Esquerda: Logo compacta + Nome da seção atual em destaque */}
      <div className="flex items-center gap-4 sm:gap-5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          title="Abrir Dock Central Pad2PS (Tab / Guide)"
          className="cursor-pointer focus:outline-none hover:opacity-90 transition-opacity shrink-0"
        >
          <Logo size="sm" />
        </button>

        <span
          className="h-6 w-px shrink-0 hidden sm:block"
          style={{ backgroundColor: 'var(--border-subtle)' }}
          aria-hidden="true"
        />

        <span className="font-display text-lg sm:text-2xl lg:text-[26px] font-bold tracking-tight text-[var(--text-primary)] truncate">
          {sectionLabel}
        </span>
      </div>

      {/* Direita: Busca rápida, Controle conectado, Bateria e Relógio digital grande */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0 whitespace-nowrap">
        <button
          type="button"
          onClick={onOpenSearch}
          title="Buscar jogo (/)"
          aria-label="Buscar jogo"
          className="theme-control p-2.5 border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/30 backdrop-blur-md transition-colors cursor-pointer shrink-0"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Search className="w-5 h-5" />
        </button>

        <div
          className="hidden md:flex items-center gap-2.5 text-base lg:text-lg text-[var(--text-primary)] shrink-0"
          title={
            connectedGamepad
              ? `Controle ativo: ${connectedGamepad}`
              : 'Nenhum gamepad detectado'
          }
        >
          <Gamepad2
            className="w-5 h-5 lg:w-6 lg:h-6 shrink-0"
            style={{
              color: connectedGamepad
                ? 'var(--accent)'
                : 'var(--text-secondary)',
            }}
          />
          <span
            className={
              connectedGamepad
                ? 'font-semibold text-[var(--text-primary)]'
                : 'font-medium text-[var(--text-secondary)]'
            }
          >
            {connectedGamepad ?? 'Teclado / Mouse'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-base lg:text-lg font-mono-tech tabular-nums text-[var(--text-secondary)] shrink-0">
          {batteryCharging ? (
            <BatteryCharging className="w-5 h-5 lg:w-6 lg:h-6 text-[#00FF88]" />
          ) : (
            <Battery className="w-5 h-5 lg:w-6 lg:h-6 text-[var(--text-secondary)]" />
          )}
          <span className="font-medium text-[var(--text-primary)]">
            {batteryLevel}%
          </span>
        </div>

        <span className="font-display text-lg sm:text-xl lg:text-2xl font-bold tabular-nums text-[var(--text-primary)] tracking-tight shrink-0">
          {timeStr}
        </span>
      </div>
    </header>
  );
};
