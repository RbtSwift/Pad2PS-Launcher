import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { Game } from '../types';
import { CircleIcon } from './PlayStationIcons';

interface LaunchOverlayProps {
  game: Game;
  onClose: () => void;
}

export const LaunchOverlay: React.FC<LaunchOverlayProps> = ({
  game,
  onClose,
}) => {
  const [progress, setProgress] = useState(12);
  const [statusLabel, setStatusLabel] = useState('Preparando ambiente do jogo...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setProgress(58);
      setStatusLabel('Carregando perfil do controle Pad2PS...');
    }, 550);

    const t2 = window.setTimeout(() => {
      setProgress(100);
      setStatusLabel('Comando pronto para execução no sistema');
    }, 1350);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [game.id]);

  const handleCopyCommand = () => {
    navigator.clipboard?.writeText(game.command).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const isUriScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(game.command);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0F]/95 backdrop-blur-xl p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-game-title"
    >
      {/* Background cover blur */}
      <img
        src={game.coverUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl pointer-events-none"
      />

      {/* Ambient accent sweep */}
      <div
        className="absolute inset-x-0 top-0 h-1 animate-scanline opacity-40 pointer-events-none"
        style={{ backgroundColor: 'var(--accent)' }}
      />

      <div className="relative z-10 w-full max-w-2xl bg-[#121218]/90 border border-[#27273A] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-7">
        {/* Game Cover */}
        <div
          className="w-40 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-[#0B0B0F]"
          style={{
            border: '2px solid var(--accent)',
            boxShadow: 'var(--accent-glow)',
          }}
        >
          <img
            src={game.coverUrl}
            alt={game.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Status & Command */}
        <div className="flex-1 min-w-0 w-full text-center sm:text-left">
          <p
            className="text-xs font-semibold tracking-wider uppercase mb-1.5"
            style={{ color: 'var(--accent)' }}
          >
            {game.platformLabel || game.platform}
          </p>
          <h2
            id="launch-game-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4F4F6] mb-2 truncate"
          >
            Iniciando {game.title}...
          </h2>
          <p className="text-sm text-[#94A3B8] mb-5">{statusLabel}</p>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#0B0B0F] border border-[#27273A] overflow-hidden mb-5">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            />
          </div>

          {/* Execution Command Box */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Comando do Sistema
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="inline-flex items-center gap-1 text-[#F4F4F6] hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00FF88]" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#0B0B0F] border border-[#27273A] font-mono-tech text-xs text-[#F4F4F6] break-all text-left">
              {game.command}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            {isUriScheme && (
              <a
                href={game.command}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: 'var(--accent-glow)',
                }}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Protocolo</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0B0B0F] border border-[#27273A] text-[#F4F4F6] hover:border-white/30 transition-colors cursor-pointer"
            >
              <CircleIcon className="w-4 h-4" />
              <span>Voltar ao Launcher</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
