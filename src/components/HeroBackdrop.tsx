import React from 'react';
import { Game, ThemeId } from '../types';

interface HeroBackdropProps {
  game: Game | null;
  theme: ThemeId;
}

export const HeroBackdrop: React.FC<HeroBackdropProps> = ({ game, theme }) => {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: 'var(--bg-deep)' }}
      aria-hidden="true"
    >
      {/* Crossfading blurred cover backdrop */}
      {game && (
        <div
          key={game.id}
          className="absolute inset-0 transition-opacity duration-700 ease-out"
        >
          <img
            src={game.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-110 blur-2xl opacity-30 transition-all duration-700"
          />
        </div>
      )}

      {/* Radial and vertical dark gradient scrim adapting to theme deep bg */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 82% 72% at 50% 42%, color-mix(in srgb, var(--bg-deep) 38%, transparent) 0%, color-mix(in srgb, var(--bg-deep) 88%, transparent) 68%, var(--bg-deep) 100%)',
        }}
      />

      {/* Pure CSS theme atmosphere overlays (zero external images) */}
      {theme === 'futuristic' && (
        <>
          <div className="absolute inset-0 theme-atmosphere-grid opacity-80" />
          <div
            className="animate-scanline absolute inset-x-0 h-28 opacity-25"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.22), transparent)',
            }}
          />
        </>
      )}

      {theme === 'horror' && (
        <div className="absolute inset-0 theme-atmosphere-horror" />
      )}

      {theme === 'cute' && (
        <div className="absolute inset-0 theme-atmosphere-cute" />
      )}

      {theme === 'pixel' && (
        <div className="absolute inset-0 theme-atmosphere-pixel" />
      )}

      {/* Subtle ambient glow in active theme color */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[70vw] h-[42vh] rounded-full blur-[120px] opacity-20 transition-colors duration-500"
        style={{
          backgroundColor: 'var(--accent)',
        }}
      />

      {/* Bottom dark vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-44"
        style={{
          background:
            'linear-gradient(to top, var(--bg-deep) 12%, color-mix(in srgb, var(--bg-deep) 74%, transparent) 55%, transparent 100%)',
        }}
      />
    </div>
  );
};
