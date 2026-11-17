import React, { createContext, useContext } from 'react';
import { ResolvedControllerLayout } from '../types';

const ControllerLayoutContext =
  createContext<ResolvedControllerLayout>('xbox');

export const ControllerLayoutProvider: React.FC<{
  layout: ResolvedControllerLayout;
  children: React.ReactNode;
}> = ({ layout, children }) => (
  <ControllerLayoutContext.Provider value={layout}>
    {children}
  </ControllerLayoutContext.Provider>
);

export function useControllerLayout(): ResolvedControllerLayout {
  return useContext(ControllerLayoutContext);
}

interface ButtonIconProps {
  className?: string;
  layout?: ResolvedControllerLayout;
}

const LetterButtonGlyph: React.FC<{
  letter: string;
  stroke: string;
  fill?: string;
  textColor?: string;
  className?: string;
}> = ({
  letter,
  stroke,
  fill = '#121218',
  textColor,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" fill={fill} stroke={stroke} strokeWidth="1.7" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
      fontWeight="800"
      fontSize="12"
      fill={textColor ?? stroke}
    >
      {letter}
    </text>
  </svg>
);

/**
 * Confirm Action:
 * - PlayStation: Cross (✕) cyan/blue
 * - Xbox: A green (#22C55E)
 * - Nintendo: B minimalist light/neutral (#F4F4F6)
 */
export const ConfirmButtonIcon: React.FC<ButtonIconProps> = ({
  className = 'w-5 h-5',
  layout,
}) => {
  const ctxLayout = useControllerLayout();
  const active = layout ?? ctxLayout;

  if (active === 'playstation') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#121218" stroke="#38BDF8" strokeWidth="1.6" />
        <path
          d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5"
          stroke="#38BDF8"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (active === 'nintendo') {
    return (
      <LetterButtonGlyph
        letter="B"
        stroke="#E2E8F0"
        fill="#16161F"
        textColor="#F8FAFC"
        className={className}
      />
    );
  }

  return (
    <LetterButtonGlyph
      letter="A"
      stroke="#22C55E"
      fill="#101B14"
      textColor="#4ADE80"
      className={className}
    />
  );
};

/**
 * Cancel / Back Action:
 * - PlayStation: Circle (○) rose/red
 * - Xbox: B red (#EF4444)
 * - Nintendo: A minimalist light/neutral
 */
export const CancelButtonIcon: React.FC<ButtonIconProps> = ({
  className = 'w-5 h-5',
  layout,
}) => {
  const ctxLayout = useControllerLayout();
  const active = layout ?? ctxLayout;

  if (active === 'playstation') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#121218" stroke="#FB7185" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.6" fill="none" stroke="#FB7185" strokeWidth="2.1" />
      </svg>
    );
  }

  if (active === 'nintendo') {
    return (
      <LetterButtonGlyph
        letter="A"
        stroke="#94A3B8"
        fill="#16161F"
        textColor="#E2E8F0"
        className={className}
      />
    );
  }

  return (
    <LetterButtonGlyph
      letter="B"
      stroke="#EF4444"
      fill="#1E1113"
      textColor="#F87171"
      className={className}
    />
  );
};

/**
 * Options Action:
 * - PlayStation: Square (□) fuchsia/purple
 * - Xbox: X blue (#3B82F6)
 * - Nintendo: Y minimalist neutral
 */
export const OptionsButtonIcon: React.FC<ButtonIconProps> = ({
  className = 'w-5 h-5',
  layout,
}) => {
  const ctxLayout = useControllerLayout();
  const active = layout ?? ctxLayout;

  if (active === 'playstation') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#121218" stroke="#E879F9" strokeWidth="1.6" />
        <rect
          x="7.8"
          y="7.8"
          width="8.4"
          height="8.4"
          rx="1.2"
          fill="none"
          stroke="#E879F9"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (active === 'nintendo') {
    return (
      <LetterButtonGlyph
        letter="Y"
        stroke="#94A3B8"
        fill="#16161F"
        textColor="#E2E8F0"
        className={className}
      />
    );
  }

  return (
    <LetterButtonGlyph
      letter="X"
      stroke="#3B82F6"
      fill="#101726"
      textColor="#60A5FA"
      className={className}
    />
  );
};

/**
 * Favorite Action:
 * - PlayStation: Triangle (△) emerald
 * - Xbox: Y yellow (#EAB308)
 * - Nintendo: X minimalist neutral
 */
export const FavoriteButtonIcon: React.FC<ButtonIconProps> = ({
  className = 'w-5 h-5',
  layout,
}) => {
  const ctxLayout = useControllerLayout();
  const active = layout ?? ctxLayout;

  if (active === 'playstation') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#121218" stroke="#34D399" strokeWidth="1.6" />
        <polygon
          points="12,7 16.8,15.5 7.2,15.5"
          fill="none"
          stroke="#34D399"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (active === 'nintendo') {
    return (
      <LetterButtonGlyph
        letter="X"
        stroke="#94A3B8"
        fill="#16161F"
        textColor="#E2E8F0"
        className={className}
      />
    );
  }

  return (
    <LetterButtonGlyph
      letter="Y"
      stroke="#EAB308"
      fill="#1E1A0E"
      textColor="#FACC15"
      className={className}
    />
  );
};

export const KeyCap: React.FC<{ label: string; className?: string }> = ({
  label,
  className = '',
}) => (
  <span
    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono-tech font-semibold rounded border leading-none ${className}`}
    style={{
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-subtle)',
    }}
  >
    {label}
  </span>
);

export const PrevTabKeyCap: React.FC<{
  className?: string;
  layout?: ResolvedControllerLayout;
}> = ({ className, layout }) => {
  const ctx = useControllerLayout();
  const active = layout ?? ctx;
  const label =
    active === 'playstation' ? 'L1' : active === 'nintendo' ? 'L' : 'LB';
  return <KeyCap label={label} className={className} />;
};

export const NextTabKeyCap: React.FC<{
  className?: string;
  layout?: ResolvedControllerLayout;
}> = ({ className, layout }) => {
  const ctx = useControllerLayout();
  const active = layout ?? ctx;
  const label =
    active === 'playstation' ? 'R1' : active === 'nintendo' ? 'R' : 'RB';
  return <KeyCap label={label} className={className} />;
};

export const TabPairKeyCap: React.FC<{
  className?: string;
  layout?: ResolvedControllerLayout;
}> = ({ className, layout }) => {
  const ctx = useControllerLayout();
  const active = layout ?? ctx;
  const label =
    active === 'playstation'
      ? 'L1 / R1'
      : active === 'nintendo'
      ? 'L / R'
      : 'LB / RB';
  return <KeyCap label={label} className={className} />;
};

export const SettingsKeyCap: React.FC<{
  className?: string;
  layout?: ResolvedControllerLayout;
}> = ({ className, layout }) => {
  const ctx = useControllerLayout();
  const active = layout ?? ctx;
  const label =
    active === 'playstation'
      ? 'Options'
      : active === 'nintendo'
      ? '+'
      : 'Menu';
  return <KeyCap label={label} className={className} />;
};
