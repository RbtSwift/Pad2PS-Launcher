import React, { useEffect, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  ExternalLink,
  Gamepad2,
  Search,
} from 'lucide-react';
import { DEFAULT_TRANSLATOR_URL } from '../data/defaultGames';
import { Logo } from './Logo';

interface TopBarProps {
  connectedGamepad: string | null;
  translatorUrl?: string;
  onLogoClick?: () => void;
  onOpenSearch: () => void;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  connectedGamepad,
  translatorUrl = DEFAULT_TRANSLATOR_URL,
  onLogoClick,
  onOpenSearch,
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

  const safeTranslatorUrl = /^https?:\/\//i.test(translatorUrl.trim())
    ? translatorUrl.trim()
    : DEFAULT_TRANSLATOR_URL;

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-16 py-4 lg:py-5 shrink-0">
      {/* Esquerda: Logo compacta Pad2PS LAUNCHER */}
      <button
        type="button"
        onClick={onLogoClick}
        title="Ir para Biblioteca de Jogos"
        className="cursor-pointer focus:outline-none hover:opacity-90 transition-opacity shrink-0"
      >
        <Logo size="sm" />
      </button>

      {/* Direita: Atalho Testador/Tradutor Pad2PS, Lupa de Busca, Controle, Bateria e Relógio Grande */}
      <div className="flex items-center gap-3.5 sm:gap-5 shrink-0 whitespace-nowrap">
        <a
          href={safeTranslatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir Testador / Tradutor Pad2PS (pad2ps.vercel.app)"
          className="theme-control hidden sm:inline-flex items-center gap-2 px-3.5 py-2 border text-xs lg:text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shrink-0"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
            borderColor: 'rgba(var(--accent-rgb), 0.45)',
          }}
        >
          <ExternalLink
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--accent)' }}
          />
          <span>Testador / Tradutor Pad2PS</span>
        </a>

        <button
          type="button"
          onClick={onOpenSearch}
          title="Busca Rápida com Teclado Virtual (/)"
          aria-label="Buscar jogo"
          className="theme-control p-2.5 border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] backdrop-blur-md transition-colors cursor-pointer shrink-0"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Search className="w-5 h-5" />
        </button>

        <div
          className="hidden md:flex items-center gap-2 text-base lg:text-lg text-[var(--text-primary)] shrink-0"
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

        <div className="hidden sm:flex items-center gap-1.5 text-base lg:text-lg font-mono-tech tabular-nums text-[var(--text-secondary)] shrink-0">
          {batteryCharging ? (
            <BatteryCharging className="w-5 h-5 lg:w-6 lg:h-6 text-[#00FF88]" />
          ) : (
            <Battery className="w-5 h-5 lg:w-6 lg:h-6 text-[var(--text-secondary)]" />
          )}
          <span className="font-semibold text-[var(--text-primary)]">
            {batteryLevel}%
          </span>
        </div>

        <span className="font-display text-xl lg:text-2xl font-bold tabular-nums text-[var(--text-primary)] tracking-tight shrink-0">
          {timeStr}
        </span>
      </div>
    </header>
  );
};
