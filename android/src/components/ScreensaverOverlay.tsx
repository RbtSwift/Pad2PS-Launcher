import React, { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Star } from 'lucide-react';
import { Game, ScreensaverMode } from '../types';
import {
  extractSteamAppId,
  fetchSteamCdnHero,
  searchSteamGridDbHero,
} from '../utils/coverSearch';
import { Logo } from './Logo';

interface ScreensaverOverlayProps {
  mode: ScreensaverMode;
  games: Game[];
  customImageUrl: string;
  onWake: () => void;
}

interface SlideAsset {
  game: Game;
  heroUrl: string | null;
}

export const ScreensaverOverlay: React.FC<ScreensaverOverlayProps> = ({
  mode,
  games,
  customImageUrl,
  onWake,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [armed, setArmed] = useState(false);

  // Brief arming delay so the click/tap that activates manual sleep doesn't immediately dismiss it
  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  // Update clock every 10s
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  // Prioritize favorites first, then remaining games with artwork (or all games)
  const orderedGames = useMemo(() => {
    const favs = games.filter((g) => g.favorite);
    const others = games.filter((g) => !g.favorite);
    const combined = [...favs, ...others];
    const withArtwork = combined.filter(
      (g) => Boolean(g.coverUrl?.trim()) || Boolean(extractSteamAppId(g.command))
    );
    return withArtwork.length > 0 ? withArtwork : combined;
  }, [games]);

  const [heroUrls, setHeroUrls] = useState<Record<string, string | null>>({});
  const [slideIndex, setSlideIndex] = useState(0);
  const [prevSlideIndex, setPrevSlideIndex] = useState<number | null>(null);

  // Fetch widescreen SteamGridDB Heroes & Steam CDN Heroes in background
  useEffect(() => {
    if (mode !== 'library-slideshow' || orderedGames.length === 0) return;

    let cancelled = false;

    const loadHeroes = async () => {
      // Load sequentially/in small batches to avoid bursting requests
      for (const game of orderedGames.slice(0, 18)) {
        if (cancelled) return;
        let resolvedHero: string | null = null;

        resolvedHero = await searchSteamGridDbHero(game.title, '');

        if (!resolvedHero) {
          const appId = extractSteamAppId(game.command);
          if (appId) {
            resolvedHero = await fetchSteamCdnHero(appId);
          }
        }

        if (cancelled) return;
        if (resolvedHero) {
          setHeroUrls((prev) => ({ ...prev, [game.id]: resolvedHero }));
        }
      }
    };

    loadHeroes();
    return () => {
      cancelled = true;
    };
  }, [mode, orderedGames]);

  // Rotate slideshow every 15 seconds
  useEffect(() => {
    if (mode !== 'library-slideshow' || orderedGames.length <= 1) return;

    const timer = window.setInterval(() => {
      setSlideIndex((curr) => {
        setPrevSlideIndex(curr);
        return (curr + 1) % orderedGames.length;
      });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [mode, orderedGames.length]);

  const slides: SlideAsset[] = useMemo(
    () =>
      orderedGames.map((game) => ({
        game,
        heroUrl: heroUrls[game.id] ?? null,
      })),
    [orderedGames, heroUrls]
  );

  const currentSlide = slides[slideIndex % Math.max(1, slides.length)] ?? null;
  const prevSlide =
    prevSlideIndex !== null && prevSlideIndex !== slideIndex
      ? slides[prevSlideIndex % Math.max(1, slides.length)] ?? null
      : null;

  const handleInteract = () => {
    if (!armed) return;
    onWake();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Modo Descanso ativo. Pressione qualquer botão ou toque na tela para voltar."
      onClick={handleInteract}
      onTouchStart={handleInteract}
      className="fixed inset-0 z-50 bg-[#050508] overflow-hidden select-none cursor-pointer focus:outline-none"
    >
      {/* MODO 1: MINIMALISTA OLED */}
      {mode === 'minimal' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-oled-drift flex flex-col items-center text-center gap-5 px-6">
            <div className="opacity-85">
              <Logo size="lg" forceLightText />
            </div>
            <div>
              <p className="font-display text-6xl sm:text-7xl lg:text-8xl font-extrabold tabular-nums tracking-tight text-white/90">
                {timeStr}
              </p>
              <p className="text-sm sm:text-base uppercase tracking-[0.22em] text-[#94A3B8]/80 mt-2 font-semibold">
                {dateStr}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: GALERIA DE JOGOS (SLIDESHOW 15s + HEROES STEAMGRIDDB) */}
      {mode === 'library-slideshow' && (
        <>
          {prevSlide && (
            <SlideBackdropLayer
              key={`prev-${prevSlide.game.id}-${prevSlideIndex}`}
              slide={prevSlide}
              isActive={false}
            />
          )}
          {currentSlide ? (
            <SlideBackdropLayer
              key={`curr-${currentSlide.game.id}-${slideIndex}`}
              slide={currentSlide}
              isActive={true}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(var(--accent-rgb), 0.22), #050508 72%)',
              }}
            />
          )}
        </>
      )}

      {/* MODO 3: IMAGEM PERSONALIZADA */}
      {mode === 'custom-image' && (
        <div className="absolute inset-0 overflow-hidden">
          {customImageUrl ? (
            <img
              src={customImageUrl}
              alt="Papel de parede do Modo Descanso"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover animate-ken-burns"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(var(--accent-rgb), 0.24), #050508 75%)',
              }}
            >
              <p className="text-sm sm:text-base text-[#94A3B8]">
                Nenhuma imagem personalizada configurada em Energia &amp; Web
                Pad2PS.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Degradê escuro suave nas bordas para contraste OLED & HUD */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            mode === 'minimal'
              ? 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.72) 100%)'
              : 'linear-gradient(180deg, rgba(5,5,8,0.68) 0%, rgba(5,5,8,0.16) 35%, rgba(5,5,8,0.22) 68%, rgba(5,5,8,0.88) 100%), radial-gradient(ellipse 90% 85% at 50% 50%, transparent 45%, rgba(5,5,8,0.72) 100%)',
        }}
      />

      {/* HUD Superior Direito (Logo compacta Pad2PS + Relógio Grande nos modos visuais) */}
      {mode !== 'minimal' && (
        <div className="pointer-events-none absolute top-6 right-6 sm:top-9 sm:right-10 lg:top-10 lg:right-14 flex flex-col items-end gap-2 text-right">
          <div className="opacity-90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]">
            <Logo size="sm" forceLightText />
          </div>
          <p className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tabular-nums tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.9)] leading-none">
            {timeStr}
          </p>
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-white/75 font-semibold drop-shadow">
            {dateStr}
          </p>
        </div>
      )}

      {/* Nome do Jogo Discreto no Canto Inferior Esquerdo (no modo Galeria de Jogos) */}
      {mode === 'library-slideshow' && currentSlide && (
        <div className="pointer-events-none absolute bottom-12 left-6 sm:bottom-10 sm:left-10 lg:left-14 max-w-[65vw] flex items-center gap-3">
          {currentSlide.game.favorite && (
            <span
              className="theme-control w-8 h-8 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(var(--accent-rgb), 0.25)',
                border: '1px solid rgba(var(--accent-rgb), 0.5)',
              }}
            >
              <Star
                className="w-4 h-4 fill-current"
                style={{ color: 'var(--accent)' }}
              />
            </span>
          )}
          <div className="min-w-0 drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
            <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white/90 truncate">
              {currentSlide.game.title}
            </p>
            <p className="text-xs sm:text-sm text-white/65 uppercase tracking-wider font-semibold">
              {currentSlide.game.platformLabel || currentSlide.game.platform}
              {currentSlide.heroUrl ? ' · Hero HD' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Aviso Discreto na Base */}
      <div className="pointer-events-none absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center px-6">
        <p className="text-xs sm:text-sm font-medium text-white/60 tracking-wide text-center drop-shadow">
          Pressione qualquer botão do controle ou toque na tela para voltar
        </p>
      </div>
    </div>
  );
};

interface SlideBackdropLayerProps {
  slide: SlideAsset;
  isActive: boolean;
}

const SlideBackdropLayer: React.FC<SlideBackdropLayerProps> = ({
  slide,
  isActive,
}) => {
  const { game, heroUrl } = slide;

  if (heroUrl) {
    return (
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img
          src={heroUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover animate-ken-burns"
        />
      </div>
    );
  }

  if (game.coverUrl) {
    return (
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Blurred full-screen atmosphere */}
        <img
          src={game.coverUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover blur-2xl scale-115 opacity-55 animate-ken-burns"
        />
        {/* Crisp centered 2:3 showcase card */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div
            className="theme-control h-[58vh] aspect-[2/3] overflow-hidden border shadow-2xl"
            style={{
              borderColor: 'rgba(var(--accent-rgb), 0.5)',
              boxShadow:
                '0 28px 80px rgba(0,0,0,0.85), 0 0 40px rgba(var(--accent-rgb), 0.28)',
            }}
          >
            <img
              src={game.coverUrl}
              alt={game.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(var(--accent-rgb), 0.25), #050508 75%)',
      }}
    >
      <Gamepad2
        className="w-24 h-24 opacity-25"
        style={{ color: 'var(--accent)' }}
      />
    </div>
  );
};
