import React from 'react';
import { Game } from '../types';

interface HeroBackdropProps {
  game: Game | null;
}

export const HeroBackdrop: React.FC<HeroBackdropProps> = ({ game }) => {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0B0B0F]"
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
            className="w-full h-full object-cover scale-110 blur-2xl opacity-35 transition-all duration-700"
          />
        </div>
      )}

      {/* Radial and vertical dark gradient scrim for crisp HUD & text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 42%, rgba(11, 11, 15, 0.35) 0%, rgba(11, 11, 15, 0.84) 65%, #0B0B0F 100%)',
        }}
      />

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
            'linear-gradient(to top, #0B0B0F 10%, rgba(11, 11, 15, 0.72) 55%, transparent 100%)',
        }}
      />
    </div>
  );
};
