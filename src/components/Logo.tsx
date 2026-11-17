import React from 'react';
import { Download } from 'lucide-react';

interface LogoProps {
  accentHex?: string;
  size?: 'sm' | 'md' | 'lg';
  onDownloadPng?: () => void;
  showDownloadButton?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  accentHex = 'var(--accent)',
  size = 'md',
  onDownloadPng,
  showDownloadButton = false,
}) => {
  const iconDimensions =
    size === 'sm' ? 'w-8 h-6' : size === 'lg' ? 'w-14 h-10' : 'w-11 h-8';
  const textClass =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      {/* Minimalist D-Pad / Controller Vector Emblem */}
      <svg
        viewBox="0 0 112 80"
        className={`${iconDimensions} shrink-0`}
        style={{
          filter: `drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.5))`,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pad2psBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1E2E" />
            <stop offset="100%" stopColor="#101018" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="104"
          height="72"
          rx="22"
          fill="url(#pad2psBody)"
          stroke={accentHex}
          strokeWidth="3.5"
        />
        {/* D-Pad Left */}
        <path
          d="M27 25 H35 V33 H43 V41 H35 V49 H27 V41 H19 V33 H27 Z"
          fill="#F4F4F6"
        />
        <circle cx="31" cy="37" r="3" fill={accentHex} />

        {/* PlayStation Action Glyphs Right */}
        <polygon
          points="79,23 84,31 74,31"
          fill="none"
          stroke="#00FF88"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle
          cx="89"
          cy="37"
          r="3.8"
          fill="none"
          stroke={accentHex}
          strokeWidth="2.2"
        />
        <g stroke="#00F0FF" strokeWidth="2.2" strokeLinecap="round">
          <line x1="76" y1="44" x2="82" y2="50" />
          <line x1="82" y1="44" x2="76" y2="50" />
        </g>
        <rect
          x="65"
          y="33.5"
          width="7"
          height="7"
          rx="1.2"
          fill="none"
          stroke="#C084FC"
          strokeWidth="2.2"
        />
        {/* Center Glow Bar */}
        <rect x="49" y="59" width="14" height="3.5" rx="1.75" fill={accentHex} />
      </svg>

      {/* Wordmark + LAUNCHER Tag */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span
          className={`font-display font-extrabold tracking-tight text-[#F4F4F6] ${textClass}`}
        >
          Pad
          <span
            style={{
              color: accentHex,
              textShadow: '0 0 14px rgba(var(--accent-rgb), 0.65)',
            }}
          >
            2
          </span>
          PS
        </span>
        <span
          className="font-display text-[10px] font-bold tracking-[0.22em] px-1.5 py-0.5 rounded bg-[#121218] text-[#F4F4F6] border"
          style={{
            borderColor: 'rgba(var(--accent-rgb), 0.55)',
            boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.18)',
          }}
        >
          LAUNCHER
        </span>
      </div>

      {showDownloadButton && onDownloadPng && (
        <button
          type="button"
          onClick={onDownloadPng}
          title="Baixar Logo (PNG 1024x1024)"
          aria-label="Baixar Logo em PNG"
          className="ml-0.5 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F4F4F6] hover:bg-[#121218] border border-transparent hover:border-[#27273A] transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
