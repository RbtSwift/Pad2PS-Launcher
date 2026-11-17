import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Gamepad2, Sparkles, X } from 'lucide-react';
import { DEFAULT_TRANSLATOR_URL } from '../data/defaultGames';
import {
  CancelButtonIcon,
  ConfirmButtonIcon,
  FavoriteButtonIcon,
  KeyCap,
  OptionsButtonIcon,
} from './ControllerIcons';

interface TranslatorModalProps {
  translatorUrl: string;
  gameTitle?: string;
  onClose: () => void;
}

function getSafeTranslatorUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_TRANSLATOR_URL;
}

export const TranslatorModal: React.FC<TranslatorModalProps> = ({
  translatorUrl,
  gameTitle,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const safeUrl = getSafeTranslatorUrl(translatorUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="translator-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="theme-surface w-full max-w-2xl p-6 sm:p-7">
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 pb-4 mb-5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="theme-control w-12 h-12 flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'rgba(var(--accent-rgb), 0.14)',
                borderColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              <Gamepad2
                className="w-6 h-6"
                style={{ color: 'var(--accent)' }}
              />
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                Integração Ecossistema Pad2PS
              </p>
              <h2
                id="translator-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]"
              >
                Tradutor Pad2PS (Web)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Tradutor Pad2PS"
            className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicação + Contexto do jogo */}
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-[var(--text-primary)]/90 leading-relaxed">
            Converta instantaneamente prompts e comandos entre controles{' '}
            <strong className="font-bold text-[var(--text-primary)]">
              PlayStation (DualSense / DualShock)
            </strong>{' '}
            e{' '}
            <strong className="font-bold text-[var(--text-primary)]">
              Xbox / PC / Nintendo
            </strong>{' '}
            — ideal para jogos de PS1, PS2, PSP ou ports de PC com ícones
            trocados.
          </p>

          {gameTitle && (
            <div
              className="theme-control px-4 py-2.5 border flex items-center gap-2.5 text-xs sm:text-sm"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Sparkles
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--accent)' }}
              />
              <span className="text-[var(--text-secondary)]">
                Jogo selecionado:
              </span>
              <strong className="font-semibold text-[var(--text-primary)] truncate">
                {gameTitle}
              </strong>
            </div>
          )}

          {/* Tabela visual rápida de correspondência de botões */}
          <div
            className="theme-control p-4 border space-y-3"
            style={{
              backgroundColor: 'var(--bg-deep)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              <span>Ação</span>
              <div className="flex items-center gap-6 sm:gap-8">
                <span className="w-16 text-center">PlayStation</span>
                <span className="w-16 text-center">Xbox / PC</span>
                <span className="w-16 text-center">Nintendo</span>
              </div>
            </div>

            <div
              className="flex items-center justify-between py-1.5 border-t text-sm"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="font-medium text-[var(--text-primary)]">
                Confirmar / Sul
              </span>
              <div className="flex items-center gap-6 sm:gap-8">
                <span className="w-16 flex justify-center">
                  <ConfirmButtonIcon layout="playstation" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <ConfirmButtonIcon layout="xbox" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <ConfirmButtonIcon layout="nintendo" className="w-6 h-6" />
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-between py-1.5 border-t text-sm"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="font-medium text-[var(--text-primary)]">
                Voltar / Leste
              </span>
              <div className="flex items-center gap-6 sm:gap-8">
                <span className="w-16 flex justify-center">
                  <CancelButtonIcon layout="playstation" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <CancelButtonIcon layout="xbox" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <CancelButtonIcon layout="nintendo" className="w-6 h-6" />
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-between py-1.5 border-t text-sm"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="font-medium text-[var(--text-primary)]">
                Opções / Oeste
              </span>
              <div className="flex items-center gap-6 sm:gap-8">
                <span className="w-16 flex justify-center">
                  <OptionsButtonIcon layout="playstation" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <OptionsButtonIcon layout="xbox" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <OptionsButtonIcon layout="nintendo" className="w-6 h-6" />
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-between py-1.5 border-t text-sm"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="font-medium text-[var(--text-primary)]">
                Favoritar / Norte
              </span>
              <div className="flex items-center gap-6 sm:gap-8">
                <span className="w-16 flex justify-center">
                  <FavoriteButtonIcon layout="playstation" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <FavoriteButtonIcon layout="xbox" className="w-6 h-6" />
                </span>
                <span className="w-16 flex justify-center">
                  <FavoriteButtonIcon layout="nintendo" className="w-6 h-6" />
                </span>
              </div>
            </div>
          </div>

          {/* URL configurada */}
          <div
            className="theme-control flex items-center justify-between gap-3 px-4 py-2.5 border"
            style={{
              backgroundColor: 'var(--bg-deep)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span className="font-mono-tech text-xs sm:text-sm text-[var(--text-secondary)] truncate">
              {safeUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="theme-control inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] border hover:border-white/40 transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {copied ? (
                <>
                  <Check
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--accent)' }}
                  />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div
          className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <KeyCap label="R2 / T" />
            <span>Atalho rápido do Tradutor</span>
          </span>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="theme-control inline-flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold text-[var(--text-primary)] hover:border-white/30 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-deep)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <CancelButtonIcon className="w-4 h-4" />
              <span>Fechar</span>
            </button>

            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="theme-control inline-flex items-center gap-2.5 px-5 py-2.5 font-display text-sm sm:text-base font-bold text-white transition-all hover:brightness-110 active:scale-95"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              <span>Abrir Tradutor Pad2PS</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
