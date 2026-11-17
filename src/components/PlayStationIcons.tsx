import React from 'react';

interface IconProps {
  className?: string;
}

/** PlayStation Cross (✕) */
export const CrossIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
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

/** PlayStation Circle (○) */
export const CircleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" fill="#121218" stroke="#FB7185" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="4.6" fill="none" stroke="#FB7185" strokeWidth="2.1" />
  </svg>
);

/** PlayStation Square (□) */
export const SquareIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
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

/** PlayStation Triangle (△) */
export const TriangleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
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

export const KeyCap: React.FC<{ label: string; className?: string }> = ({
  label,
  className = '',
}) => (
  <span
    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono-tech font-semibold rounded bg-[#121218] text-[#F4F4F6] border border-[#27273A] leading-none ${className}`}
  >
    {label}
  </span>
);
