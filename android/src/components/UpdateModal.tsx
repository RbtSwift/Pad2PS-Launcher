import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { UpdateCheckResult } from '../utils/updateChecker';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateCheckResult | null;
  appName?: string;
}

export function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  appName = 'Pad2PS Launcher',
}: UpdateModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [notesLanguage, setNotesLanguage] = useState<'pt' | 'en'>('pt');

  useEffect(() => {
    if (isOpen) {
      primaryButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const localizedNotes = useMemo(() => {
    const releaseNotes = updateInfo?.releaseNotes ?? '';
    const sections = [...releaseNotes.matchAll(/(?:^|\n)#{1,3}\s*([^\n]+)\n([\s\S]*?)(?=\n#{1,3}\s|$)/g)];
    const headingMatch = (heading: string) => notesLanguage === 'pt'
      ? /portugu[eê]s|brasil|pt-br/i.test(heading)
      : /english|ingl[eê]s/i.test(heading);
    const section = sections.find(([_, heading]) => headingMatch(heading));
    const raw = section?.[2] ?? releaseNotes;
    return raw
      .split('\n')
      .map((line) => line.replace(/^\s*[-*]\s*/, '').replace(/\*\*/g, '').replace(/`/g, '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [notesLanguage, updateInfo?.releaseNotes]);

  if (!isOpen || !updateInfo) return null;

  const handleDownload = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="android-update-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="android-update-panel relative w-full max-w-xl rounded-2xl bg-[var(--bg-deep,#0B0B0F)] border border-[var(--border-subtle,#27273A)] shadow-2xl overflow-hidden text-left"
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          className="android-update-header relative p-6 border-b flex items-center justify-between gap-4"
          style={{
            borderColor: 'var(--border-subtle,#27273A)',
            backgroundColor: 'var(--bg-surface,#14141B)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{
                backgroundColor: 'var(--accent,#FF2E93)',
                color: '#FFFFFF',
                boxShadow: 'var(--accent-glow, 0 0 20px rgba(255, 46, 147, 0.4))',
              }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-xl text-[var(--text-primary,#FFFFFF)]">
                Nova Versão Disponível!
              </h3>
              <p className="text-sm text-[var(--text-secondary,#A1A1AA)] mt-0.5">
                {appName} <strong className="text-[var(--accent,#FF2E93)]">v{updateInfo.latestVersion}</strong> (instalada: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="theme-control p-2.5 rounded-xl text-[var(--text-secondary,#A1A1AA)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Notas de Atualização */}
        <div className="android-update-body p-6 max-h-[55vh] overflow-y-auto space-y-4">
          {updateInfo.releaseName && updateInfo.releaseName !== `v${updateInfo.latestVersion}` && (
            <p className="font-display font-bold text-base text-[var(--text-primary,#FFFFFF)]">
              {updateInfo.releaseName}
            </p>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary,#A1A1AA)] mb-2">
              Novidades e Melhorias desta Versão:
            </h4>
            <div
              className="android-update-notes p-4 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-primary,#E4E4E7)]"
              style={{
                backgroundColor: 'var(--bg-surface,#14141B)',
                borderColor: 'var(--border-subtle,#27273A)',
              }}
            >
              <div className="android-update-language flex gap-1.5 mb-3">
                <button type="button" onClick={() => setNotesLanguage('pt')} aria-pressed={notesLanguage === 'pt'}>PT-BR</button>
                <button type="button" onClick={() => setNotesLanguage('en')} aria-pressed={notesLanguage === 'en'}>EN</button>
              </div>
              <ul className="android-update-note-list">
                {(localizedNotes.length ? localizedNotes : [notesLanguage === 'pt' ? 'Atualizações de desempenho, correções de compatibilidade e melhorias gerais.' : 'Performance improvements, compatibility fixes, and general enhancements.']).map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
              </ul>
            </div>
          </div>

          {/* Botão Primário Recomendado */}
          {updateInfo.primaryAsset && (
            <div className="pt-2">
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={() => handleDownload(updateInfo.primaryAsset!.url)}
                className="theme-control w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold text-white transition-all hover:brightness-110 cursor-pointer shadow-lg"
                style={{
                  backgroundColor: 'var(--accent,#FF2E93)',
                  boxShadow: 'var(--accent-glow, 0 0 24px rgba(255, 46, 147, 0.45))',
                }}
              >
                <Download className="w-5 h-5" />
                <span>{updateInfo.primaryAsset.label}</span>
              </button>
            </div>
          )}

          {/* Outros Instaladores */}
          {updateInfo.allAssets.length > 1 && (
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary,#A1A1AA)] mb-2">
                Outros formatos disponíveis:
              </p>
              <div className="flex flex-wrap gap-2">
                {updateInfo.allAssets
                  .filter((a) => a.browser_download_url !== updateInfo.primaryAsset?.url)
                  .map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => handleDownload(a.browser_download_url)}
                      className="theme-control px-3.5 py-2 rounded-xl text-xs font-medium border text-[var(--text-secondary,#A1A1AA)] hover:text-white transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface,#14141B)',
                        borderColor: 'var(--border-subtle,#27273A)',
                      }}
                    >
                      {a.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com atalho e link GitHub */}
        <div
          className="android-update-footer p-4 border-t flex items-center justify-between gap-4"
          style={{
            borderColor: 'var(--border-subtle,#27273A)',
            backgroundColor: 'var(--bg-surface,#14141B)',
          }}
        >
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary,#A1A1AA)] hover:text-[var(--accent,#FF2E93)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver Release no GitHub</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="theme-control px-5 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary,#A1A1AA)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
