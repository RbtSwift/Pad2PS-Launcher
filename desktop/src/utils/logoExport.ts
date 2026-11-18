import { getCartridgeIconSvg, getFullBrandLogoSvg } from './pad2psBrandSvg';

export type Pad2PSLogoVariant = 'full' | 'icon';

async function renderSvgToTransparentPngDownload(
  svgMarkup: string,
  filename: string,
  size = 1024
): Promise<void> {
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
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Exporta a Logo Completa (Cartucho + Pad2PS LAUNCHER) ou apenas o Ícone do Cartucho
 * em PNG 1024x1024 com fundo transparente e filtros de brilho sem corte.
 */
export async function exportPad2PSLogoPng(
  accentHex = '#FF1E8E',
  variant: Pad2PSLogoVariant = 'full'
): Promise<void> {
  const size = 1024;
  if (variant === 'icon') {
    const svg = getCartridgeIconSvg(accentHex, size);
    await renderSvgToTransparentPngDownload(svg, 'pad2ps-launcher-icon.png', size);
    return;
  }

  const svg = getFullBrandLogoSvg(accentHex, size);
  await renderSvgToTransparentPngDownload(svg, 'pad2ps-launcher-logo.png', size);
}

export async function exportPad2PSCartridgeIconPng(
  accentHex = '#FF1E8E'
): Promise<void> {
  return exportPad2PSLogoPng(accentHex, 'icon');
}
