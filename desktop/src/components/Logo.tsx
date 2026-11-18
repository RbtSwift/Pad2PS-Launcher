import React, { useId } from 'react';
import { Download } from 'lucide-react';

interface LogoProps {
  accentHex?: string;
  size?: 'sm' | 'md' | 'lg';
  forceLightText?: boolean;
  onDownloadPng?: () => void;
  showDownloadButton?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  accentHex = 'var(--accent)',
  size = 'md',
  forceLightText = false,
  onDownloadPng,
  showDownloadButton = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const glowSoftId = `pad2psGlowSoft_${uid}`;
  const glowStrongId = `pad2psGlowStrong_${uid}`;
  const squircleBgId = `pad2psSquircleBg_${uid}`;
  const cartBgId = `pad2psCartBg_${uid}`;

  const iconDimensions =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const textClass =
    size === 'sm' ? 'text-lg leading-none' : size === 'lg' ? 'text-2xl leading-none' : 'text-xl leading-none';
  const badgeClass =
    size === 'sm'
      ? 'text-[9px] tracking-[0.26em] px-1.5 py-[2px]'
      : size === 'lg'
      ? 'text-[11px] tracking-[0.28em] px-2 py-[3px]'
      : 'text-[10px] tracking-[0.26em] px-1.5 py-[2px]';

  return (
    <div className="flex items-center gap-3 shrink-0 select-none">
      {/* Ícone Vetorial Oficial: Cartucho Neon (Squircle #09090D + #FF1E8E) */}
      <svg
        viewBox="0 0 1024 1024"
        className={`${iconDimensions} shrink-0 overflow-visible`}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={glowSoftId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id={glowStrongId}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="20" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={squircleBgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D0D14" />
            <stop offset="100%" stopColor="#09090D" />
          </linearGradient>
          <linearGradient id={cartBgId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#13131E" />
            <stop offset="100%" stopColor="#09090D" />
          </linearGradient>
        </defs>

        {/* Moldura Squircle */}
        <rect
          x="64"
          y="64"
          width="896"
          height="896"
          rx="220"
          fill={`url(#${squircleBgId})`}
          stroke={accentHex}
          strokeWidth="18"
          filter={`url(#${glowStrongId})`}
        />
        <rect
          x="96"
          y="96"
          width="832"
          height="832"
          rx="190"
          fill="none"
          stroke={accentHex}
          strokeWidth="5"
          strokeOpacity="0.72"
        />

        {/* Silhueta do Cartucho */}
        <g filter={`url(#${glowSoftId})`}>
          <path
            d="M 326 198 H 726 C 748 198 766 216 766 238 V 778 C 766 800 748 818 726 818 H 298 C 276 818 258 800 258 778 V 266 L 326 198 Z"
            fill={`url(#${cartBgId})`}
            stroke={accentHex}
            strokeWidth="14"
            strokeLinejoin="round"
          />
          <line x1="258" y1="312" x2="292" y2="312" stroke={accentHex} strokeWidth="9" strokeLinecap="round" />
          <line x1="258" y1="344" x2="292" y2="344" stroke={accentHex} strokeWidth="9" strokeLinecap="round" />
          <line x1="732" y1="312" x2="766" y2="312" stroke={accentHex} strokeWidth="9" strokeLinecap="round" />
          <line x1="732" y1="344" x2="766" y2="344" stroke={accentHex} strokeWidth="9" strokeLinecap="round" />
          <line x1="354" y1="248" x2="548" y2="248" stroke={accentHex} strokeWidth="8" strokeLinecap="round" strokeOpacity="0.85" />
        </g>

        {/* Três LEDs coloridos Pad2PS */}
        <circle cx="628" cy="248" r="16" fill="#22C55E" />
        <circle cx="672" cy="248" r="16" fill="#3B82F6" />
        <circle cx="716" cy="248" r="16" fill="#F97316" />

        {/* Etiqueta do Cartucho */}
        <rect
          x="318"
          y="326"
          width="388"
          height="324"
          rx="34"
          fill="#0E0E17"
          stroke={accentHex}
          strokeWidth="10"
        />

        {/* Ícone Play branco puro */}
        <path
          d="M 442 406 C 442 396 453 390 462 395 L 584 466 C 593 471 593 485 584 490 L 462 561 C 453 566 442 560 442 550 Z"
          fill="#FFFFFF"
        />

        {/* Número 2 geométrico branco puro */}
        <path
          d="M 622 562 C 622 544 636 534 653 534 C 670 534 682 544 682 559 C 682 572 673 581 657 593 L 636 609 H 683 V 623 H 618 V 610 L 648 586 C 661 576 666 569 666 560 C 666 552 660 547 652 547 C 643 547 637 553 637 563 Z"
          fill="#FFFFFF"
        />

        {/* Base inferior: Pinos conectores */}
        <path
          d="M 326 818 V 714 C 326 700 338 688 352 688 H 672 C 686 688 698 700 698 714 V 818"
          fill="#09090D"
          stroke={accentHex}
          strokeWidth="10"
          strokeLinejoin="round"
        />
        <line x1="376" y1="734" x2="376" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="421" y1="734" x2="421" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="466" y1="734" x2="466" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="512" y1="734" x2="512" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="558" y1="734" x2="558" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="603" y1="734" x2="603" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
        <line x1="648" y1="734" x2="648" y2="812" stroke={accentHex} strokeWidth="11" strokeLinecap="round" />
      </svg>

      {/* Assinatura Visual: Pad2PS + LAUNCHER logo abaixo */}
      <div className="flex flex-col items-start justify-center gap-1 whitespace-nowrap">
        <span
          className={`font-display font-extrabold tracking-tight ${textClass}`}
          style={{
            color: forceLightText ? '#FFFFFF' : 'var(--text-primary)',
          }}
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
          className={`font-display font-bold rounded border leading-none ${badgeClass}`}
          style={{
            backgroundColor: forceLightText ? '#09090D' : 'var(--bg-surface)',
            color: forceLightText ? '#FFFFFF' : 'var(--text-primary)',
            borderColor: 'rgba(var(--accent-rgb), 0.6)',
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
          className="ml-0.5 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
