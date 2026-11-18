/**
 * Identidade visual vetorial oficial do Pad2PS Launcher (v1.0.0).
 * Cartucho Neon (#FF1E8E sobre #09090D) em SVG puro 1024x1024.
 */

export function getCartridgeIconSvg(accentHex = '#FF1E8E', size = 1024): string {
  const accent = accentHex.startsWith('#') ? accentHex : '#FF1E8E';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024" fill="none">
  <defs>
    <filter id="pad2psGlowSoft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="pad2psGlowStrong" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="20" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="squircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D0D14" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
    <linearGradient id="cartBodyBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#13131E" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
  </defs>

  <!-- Moldura Squircle com margem ampla para o glow -->
  <rect x="64" y="64" width="896" height="896" rx="220" fill="url(#squircleBg)" stroke="${accent}" stroke-width="14" filter="url(#pad2psGlowStrong)" />

  <!-- Linha interna dupla fina rosa neon -->
  <rect x="96" y="96" width="832" height="832" rx="190" fill="none" stroke="${accent}" stroke-width="3.5" stroke-opacity="0.72" filter="url(#pad2psGlowSoft)" />

  <!-- Cartucho de Console Clássico Centralizado -->
  <g filter="url(#pad2psGlowSoft)">
    <!-- Corpo principal do cartucho com chanfro superior esquerdo -->
    <path
      d="M 326 198 H 726 C 748 198 766 216 766 238 V 778 C 766 800 748 818 726 818 H 298 C 276 818 258 800 258 778 V 266 L 326 198 Z"
      fill="url(#cartBodyBg)"
      stroke="${accent}"
      stroke-width="12"
      stroke-linejoin="round"
    />

    <!-- Entalhes laterais de grip do cartucho -->
    <line x1="258" y1="312" x2="292" y2="312" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
    <line x1="258" y1="344" x2="292" y2="344" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
    <line x1="732" y1="312" x2="766" y2="312" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
    <line x1="732" y1="344" x2="766" y2="344" stroke="${accent}" stroke-width="8" stroke-linecap="round" />

    <!-- Barra superior decorativa de encaixe -->
    <line x1="354" y1="248" x2="548" y2="248" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.85" />
  </g>

  <!-- Três indicadores circulares coloridos no topo superior direito -->
  <g filter="url(#pad2psGlowSoft)">
    <circle cx="628" cy="248" r="15" fill="#22C55E" />
    <circle cx="672" cy="248" r="15" fill="#3B82F6" />
    <circle cx="716" cy="248" r="15" fill="#F97316" />
  </g>

  <!-- Área frontal / Etiqueta do Cartucho -->
  <rect
    x="318"
    y="326"
    width="388"
    height="324"
    rx="34"
    fill="#0E0E17"
    stroke="${accent}"
    stroke-width="8"
    filter="url(#pad2psGlowSoft)"
  />

  <!-- Ícone nítido de Play em Branco Puro (#FFFFFF) -->
  <path
    d="M 442 406 C 442 396 453 390 462 395 L 584 466 C 593 471 593 485 584 490 L 462 561 C 453 566 442 560 442 550 Z"
    fill="#FFFFFF"
  />

  <!-- Número "2" geométrico vetorial puro (#FFFFFF) no canto inferior direito da etiqueta -->
  <path
    d="M 622 562
       C 622 544 636 534 653 534
       C 670 534 682 544 682 559
       C 682 572 673 581 657 593
       L 636 609
       H 683
       V 623
       H 618
       V 610
       L 648 586
       C 661 576 666 569 666 560
       C 666 552 660 547 652 547
       C 643 547 637 553 637 563
       Z"
    fill="#FFFFFF"
  />

  <!-- Base inferior do cartucho: encaixe e pinos conectores em linhas neon limpas -->
  <g filter="url(#pad2psGlowSoft)">
    <path
      d="M 326 818 V 714 C 326 700 338 688 352 688 H 672 C 686 688 698 700 698 714 V 818"
      fill="#09090D"
      stroke="${accent}"
      stroke-width="8"
      stroke-linejoin="round"
    />
    <line x1="376" y1="734" x2="376" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="421" y1="734" x2="421" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="466" y1="734" x2="466" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="512" y1="734" x2="512" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="558" y1="734" x2="558" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="603" y1="734" x2="603" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    <line x1="648" y1="734" x2="648" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
  </g>
</svg>
`.trim();
}

export function getFullBrandLogoSvg(accentHex = '#FF1E8E', size = 1024): string {
  const accent = accentHex.startsWith('#') ? accentHex : '#FF1E8E';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024" fill="none">
  <defs>
    <filter id="fullGlowSoft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="fullGlowStrong" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="20" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="fullSquircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D0D14" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
    <linearGradient id="fullCartBodyBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#13131E" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
  </defs>

  <!-- Cartucho Neon centralizado na metade superior (600x600 em x=212, y=76) -->
  <g transform="translate(212, 76) scale(0.5859375)">
    <rect x="64" y="64" width="896" height="896" rx="220" fill="url(#fullSquircleBg)" stroke="${accent}" stroke-width="14" filter="url(#fullGlowStrong)" />
    <rect x="96" y="96" width="832" height="832" rx="190" fill="none" stroke="${accent}" stroke-width="3.5" stroke-opacity="0.72" filter="url(#fullGlowSoft)" />

    <g filter="url(#fullGlowSoft)">
      <path
        d="M 326 198 H 726 C 748 198 766 216 766 238 V 778 C 766 800 748 818 726 818 H 298 C 276 818 258 800 258 778 V 266 L 326 198 Z"
        fill="url(#fullCartBodyBg)"
        stroke="${accent}"
        stroke-width="12"
        stroke-linejoin="round"
      />
      <line x1="258" y1="312" x2="292" y2="312" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <line x1="258" y1="344" x2="292" y2="344" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <line x1="732" y1="312" x2="766" y2="312" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <line x1="732" y1="344" x2="766" y2="344" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <line x1="354" y1="248" x2="548" y2="248" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.85" />
    </g>

    <g filter="url(#fullGlowSoft)">
      <circle cx="628" cy="248" r="15" fill="#22C55E" />
      <circle cx="672" cy="248" r="15" fill="#3B82F6" />
      <circle cx="716" cy="248" r="15" fill="#F97316" />
    </g>

    <rect x="318" y="326" width="388" height="324" rx="34" fill="#0E0E17" stroke="${accent}" stroke-width="8" filter="url(#fullGlowSoft)" />
    <path d="M 442 406 C 442 396 453 390 462 395 L 584 466 C 593 471 593 485 584 490 L 462 561 C 453 566 442 560 442 550 Z" fill="#FFFFFF" />
    <path d="M 622 562 C 622 544 636 534 653 534 C 670 534 682 544 682 559 C 682 572 673 581 657 593 L 636 609 H 683 V 623 H 618 V 610 L 648 586 C 661 576 666 569 666 560 C 666 552 660 547 652 547 C 643 547 637 553 637 563 Z" fill="#FFFFFF" />

    <g filter="url(#fullGlowSoft)">
      <path d="M 326 818 V 714 C 326 700 338 688 352 688 H 672 C 686 688 698 700 698 714 V 818" fill="#09090D" stroke="${accent}" stroke-width="8" stroke-linejoin="round" />
      <line x1="376" y1="734" x2="376" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="421" y1="734" x2="421" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="466" y1="734" x2="466" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="512" y1="734" x2="512" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="558" y1="734" x2="558" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="603" y1="734" x2="603" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <line x1="648" y1="734" x2="648" y2="812" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
    </g>
  </g>

  <!-- Assinatura Tipográfica: Pad2PS -->
  <g transform="translate(512, 815)" text-anchor="middle">
    <text
      font-family="Outfit, Plus Jakarta Sans, Segoe UI, Arial, sans-serif"
      font-weight="800"
      font-size="146"
      letter-spacing="-3"
      fill="#FFFFFF"
    >Pad<tspan fill="${accent}" filter="url(#fullGlowSoft)">2</tspan>PS</text>
  </g>

  <!-- Badge LAUNCHER logo abaixo -->
  <g transform="translate(342, 858)">
    <rect x="0" y="0" width="340" height="66" rx="16" fill="#09090D" stroke="${accent}" stroke-width="4" filter="url(#fullGlowSoft)" />
    <text
      x="170"
      y="45"
      text-anchor="middle"
      font-family="Outfit, Plus Jakarta Sans, Segoe UI, Arial, sans-serif"
      font-weight="700"
      font-size="36"
      letter-spacing="11"
      fill="#FFFFFF"
    >LAUNCHER</text>
  </g>
</svg>
`.trim();
}

export function getHorizontalBrandLogoSvg(
  accentHex = '#FF1E8E',
  mode: 'dark' | 'light' = 'dark',
  width = 1024
): string {
  const accent = accentHex.startsWith('#') ? accentHex : '#FF1E8E';
  const height = Math.round((width * 340) / 1024);
  const textColor = mode === 'light' ? '#0F172A' : '#FFFFFF';
  const badgeBg = mode === 'light' ? '#F1F5F9' : '#09090D';
  const badgeText = mode === 'light' ? '#0F172A' : '#FFFFFF';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1024 340" fill="none">
  <defs>
    <filter id="horizGlowSoft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="horizGlowStrong" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="20" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="horizSquircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D0D14" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
    <linearGradient id="horizCartBodyBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#13131E" />
      <stop offset="100%" stop-color="#09090D" />
    </linearGradient>
  </defs>

  <!-- Ícone Cartucho Neon à esquerda (272x272 em x=34, y=34) -->
  <g transform="translate(34, 34) scale(0.265625)">
    <rect x="64" y="64" width="896" height="896" rx="220" fill="url(#horizSquircleBg)" stroke="${accent}" stroke-width="18" filter="url(#horizGlowStrong)" />
    <rect x="96" y="96" width="832" height="832" rx="190" fill="none" stroke="${accent}" stroke-width="5" stroke-opacity="0.72" />
    <g filter="url(#horizGlowSoft)">
      <path d="M 326 198 H 726 C 748 198 766 216 766 238 V 778 C 766 800 748 818 726 818 H 298 C 276 818 258 800 258 778 V 266 L 326 198 Z" fill="url(#horizCartBodyBg)" stroke="${accent}" stroke-width="14" stroke-linejoin="round" />
      <line x1="258" y1="312" x2="292" y2="312" stroke="${accent}" stroke-width="9" stroke-linecap="round" />
      <line x1="258" y1="344" x2="292" y2="344" stroke="${accent}" stroke-width="9" stroke-linecap="round" />
      <line x1="732" y1="312" x2="766" y2="312" stroke="${accent}" stroke-width="9" stroke-linecap="round" />
      <line x1="732" y1="344" x2="766" y2="344" stroke="${accent}" stroke-width="9" stroke-linecap="round" />
      <line x1="354" y1="248" x2="548" y2="248" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.85" />
    </g>
    <circle cx="628" cy="248" r="16" fill="#22C55E" />
    <circle cx="672" cy="248" r="16" fill="#3B82F6" />
    <circle cx="716" cy="248" r="16" fill="#F97316" />
    <rect x="318" y="326" width="388" height="324" rx="34" fill="#0E0E17" stroke="${accent}" stroke-width="10" />
    <path d="M 442 406 C 442 396 453 390 462 395 L 584 466 C 593 471 593 485 584 490 L 462 561 C 453 566 442 560 442 550 Z" fill="#FFFFFF" />
    <path d="M 622 562 C 622 544 636 534 653 534 C 670 534 682 544 682 559 C 682 572 673 581 657 593 L 636 609 H 683 V 623 H 618 V 610 L 648 586 C 661 576 666 569 666 560 C 666 552 660 547 652 547 C 643 547 637 553 637 563 Z" fill="#FFFFFF" />
    <path d="M 326 818 V 714 C 326 700 338 688 352 688 H 672 C 686 688 698 700 698 714 V 818" fill="#09090D" stroke="${accent}" stroke-width="10" stroke-linejoin="round" />
    <line x1="376" y1="734" x2="376" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="421" y1="734" x2="421" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="466" y1="734" x2="466" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="512" y1="734" x2="512" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="558" y1="734" x2="558" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="603" y1="734" x2="603" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
    <line x1="648" y1="734" x2="648" y2="812" stroke="${accent}" stroke-width="11" stroke-linecap="round" />
  </g>

  <!-- Assinatura horizontal à direita -->
  <text
    x="354"
    y="186"
    font-family="Outfit, Plus Jakarta Sans, DejaVu Sans, Segoe UI, Arial, sans-serif"
    font-weight="800"
    font-size="144"
    letter-spacing="-3"
    fill="${textColor}"
  >Pad<tspan fill="${accent}" filter="url(#horizGlowSoft)">2</tspan>PS</text>

  <g transform="translate(358, 224)">
    <rect x="0" y="0" width="320" height="62" rx="14" fill="${badgeBg}" stroke="${accent}" stroke-width="4" />
    <text
      x="160"
      y="43"
      text-anchor="middle"
      font-family="Outfit, Plus Jakarta Sans, DejaVu Sans, Segoe UI, Arial, sans-serif"
      font-weight="700"
      font-size="34"
      letter-spacing="10"
      fill="${badgeText}"
    >LAUNCHER</text>
  </g>
</svg>
`.trim();
}
