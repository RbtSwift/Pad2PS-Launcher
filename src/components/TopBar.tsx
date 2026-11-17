import React, { useEffect, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  Gamepad2,
  Plus,
  Power,
  Settings,
} from 'lucide-react';
import { FILTER_TABS } from '../data/defaultGames';
import { FilterTab } from '../types';
import { Logo } from './Logo';
import { KeyCap } from './PlayStationIcons';

interface TopBarProps {
  activeTab: FilterTab;
  onSelectTab: (tab: FilterTab) => void;
  connectedGamepad: string | null;
  onAddGame: () => void;
  onOpenSettings: () => void;
  onOpenPower: () => void;
  onDownloadLogo: () => void;
  tabCounts: Record<FilterTab, number>;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  connectedGamepad,
  onAddGame,
  onOpenSettings,
  onOpenPower,
  onDownloadLogo,
  tabCounts,
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

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 md:px-8 lg:px-12 py-3.5 lg:py-5 border-b border-[#27273A]/70 bg-[#0B0B0F]/65 backdrop-blur-md shrink-0">
      {/* Left: Logo + L1/R1 Quick Filter Tabs */}
      <div className="flex items-center gap-4 lg:gap-7 min-w-0">
        <Logo
          size="md"
          showDownloadButton
          onDownloadPng={onDownloadLogo}
        />

        <nav
          aria-label="Filtros da biblioteca"
          className="hidden md:flex items-center gap-1.5 bg-[#121218]/90 border border-[#27273A] rounded-xl p-1"
        >
          <span
            className="px-1.5 text-[10px] font-mono-tech text-[#94A3B8] select-none"
            title="Aba anterior (L1 / Q)"
          >
            <KeyCap label="L1" />
          </span>

          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            const count = tabCounts[tab] ?? 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(var(--accent-rgb), 0.18)',
                        boxShadow: '0 0 14px rgba(var(--accent-rgb), 0.25)',
                        border: '1px solid rgba(var(--accent-rgb), 0.55)',
                      }
                    : { border: '1px solid transparent' }
                }
              >
                <span>{tab}</span>
                <span
                  className={`text-[11px] font-mono-tech tabular-nums ${
                    isActive ? 'text-white/90' : 'text-[#94A3B8]/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <span
            className="px-1.5 text-[10px] font-mono-tech text-[#94A3B8] select-none"
            title="Próxima aba (R1 / E)"
          >
            <KeyCap label="R1" />
          </span>
        </nav>
      </div>

      {/* Right: Gamepad indicator, Battery, Clock, Quick Actions */}
      <div className="flex items-center gap-2.5 lg:gap-3.5 shrink-0">
        {/* Gamepad Connection Indicator */}
        <div
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121218]/90 border border-[#27273A] text-xs whitespace-nowrap"
          title={
            connectedGamepad
              ? `Controle ativo: ${connectedGamepad}`
              : 'Nenhum gamepad detectado (use teclado ou mouse)'
          }
        >
          <Gamepad2
            className="w-4 h-4 shrink-0"
            style={{
              color: connectedGamepad ? 'var(--accent)' : '#94A3B8',
            }}
          />
          <span
            className={
              connectedGamepad ? 'text-[#F4F4F6] font-medium' : 'text-[#94A3B8]'
            }
          >
            {connectedGamepad ?? 'Teclado / Mouse'}
          </span>
        </div>

        {/* Battery & Clock */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#121218]/90 border border-[#27273A] text-xs text-[#F4F4F6] font-mono-tech tabular-nums">
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            {batteryCharging ? (
              <BatteryCharging className="w-4 h-4 text-[#00FF88]" />
            ) : (
              <Battery className="w-4 h-4 text-[#94A3B8]" />
            )}
            <span>{batteryLevel}%</span>
          </span>
          <span className="text-[#27273A]" aria-hidden="true">
            |
          </span>
          <span className="font-semibold text-[#F4F4F6]">{timeStr}</span>
        </div>

        {/* + Adicionar Jogo */}
        <button
          type="button"
          onClick={onAddGame}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs lg:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer hover:brightness-110 active:scale-95"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: 'var(--accent-glow)',
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar Jogo</span>
        </button>

        {/* Configurações */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Configurações (Start / Options)"
          aria-label="Configurações"
          className="p-2 lg:p-2.5 rounded-lg bg-[#121218] border border-[#27273A] text-[#94A3B8] hover:text-[#F4F4F6] hover:border-[#94A3B8]/50 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>

        {/* Energia */}
        <button
          type="button"
          onClick={onOpenPower}
          title="Energia"
          aria-label="Menu de Energia"
          className="p-2 lg:p-2.5 rounded-lg bg-[#121218] border border-[#27273A] text-[#94A3B8] hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
        >
          <Power className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </header>
  );
};
