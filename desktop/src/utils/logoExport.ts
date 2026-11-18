/**
 * Exports the official Pad2PS Launcher SVG emblem & typography
 * onto a 1024x1024 transparent PNG using HTML5 Canvas.
 */
export async function exportPad2PSLogoPng(accentHex: string): Promise<void> {
  const size = 1024;
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
      <defs>
        <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E1E2E" />
          <stop offset="100%" stop-color="#101018" />
        </linearGradient>
      </defs>

      <!-- Minimalist Controller / D-Pad Emblem -->
      <g transform="translate(192, 130)">
        <!-- Outer rounded console shell -->
        <rect x="40" y="40" width="560" height="400" rx="116" fill="url(#bodyGrad)" stroke="${accentHex}" stroke-width="14" filter="url(#neonGlow)" />
        <rect x="64" y="64" width="512" height="352" rx="96" fill="none" stroke="#27273A" stroke-width="4" />

        <!-- Stylized D-Pad (Left) -->
        <g transform="translate(152, 165)" filter="url(#neonGlow)">
          <path d="M52 0 H88 V52 H140 V88 H88 V140 H52 V88 H0 V52 H52 Z" fill="#F4F4F6" />
          <circle cx="70" cy="70" r="16" fill="${accentHex}" />
        </g>

        <!-- Minimalist PlayStation-inspired Action Glyphs (Right) -->
        <g transform="translate(385, 165)">
          <!-- Triangle (Top) -->
          <polygon points="70,8 92,46 48,46" fill="none" stroke="#00FF88" stroke-width="9" stroke-linejoin="round" />
          <!-- Circle (Right) -->
          <circle cx="122" cy="70" r="19" fill="none" stroke="${accentHex}" stroke-width="9" filter="url(#neonGlow)" />
          <!-- Cross (Bottom) -->
          <g stroke="#00F0FF" stroke-width="9" stroke-linecap="round">
            <line x1="56" y1="106" x2="84" y2="134" />
            <line x1="84" y1="106" x2="56" y2="134" />
          </g>
          <!-- Square (Left) -->
          <rect x="2" y="52" width="34" height="34" rx="5" fill="none" stroke="#C084FC" stroke-width="9" />
        </g>

        <!-- Center Bridge Accent -->
        <rect x="292" y="340" width="56" height="14" rx="7" fill="${accentHex}" filter="url(#neonGlow)" />
      </g>

      <!-- Typography: Pad2PS -->
      <g transform="translate(512, 725)" text-anchor="middle">
        <text
          font-family="Outfit, Plus Jakarta Sans, Segoe UI, Arial, sans-serif"
          font-weight="800"
          font-size="148"
          letter-spacing="-3"
          fill="#F4F4F6"
        >Pad<tspan fill="${accentHex}" filter="url(#neonGlow)">2</tspan>PS</text>
      </g>

      <!-- LAUNCHER Tag -->
      <g transform="translate(352, 780)">
        <rect x="0" y="0" width="320" height="68" rx="14" fill="#121218" stroke="${accentHex}" stroke-width="5" />
        <text
          x="160"
          y="47"
          text-anchor="middle"
          font-family="Outfit, Plus Jakarta Sans, Segoe UI, Arial, sans-serif"
          font-weight="700"
          font-size="38"
          letter-spacing="10"
          fill="#F4F4F6"
        >LAUNCHER</text>
      </g>
    </svg>
  `.trim();

  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );

    if (!pngBlob) throw new Error('Failed to encode PNG');

    const downloadUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'pad2ps-launcher-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
