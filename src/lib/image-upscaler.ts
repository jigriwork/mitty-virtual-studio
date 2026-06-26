/**
 * Client-side image upscaler for e-commerce downloads.
 *
 * Gemini image generation models typically output images at ~1024×1024.
 * For e-commerce listings, 2048×2048+ is preferred so images stay sharp
 * when zoomed on product pages, pinch-zoomed on mobile, or printed.
 *
 * This utility upscales the AI-generated data-URI image using the browser's
 * canvas with high-quality bicubic interpolation before download.
 */

/** Target long-edge for upscaled e-commerce images. */
const UPSCALE_TARGET = 2048;

/** Quality for the output PNG/WebP encoding (1.0 = lossless PNG). */
const UPSCALE_QUALITY = 1.0;

/**
 * Upscale a data-URI image for high-quality download.
 *
 * - Loads the data URI into an HTMLImageElement.
 * - If it's already ≥ UPSCALE_TARGET, returns it as-is.
 * - Otherwise upscales to UPSCALE_TARGET (longest edge) preserving aspect ratio.
 * - Returns a PNG data URI for maximum quality.
 */
export async function upscaleForDownload(dataUri: string): Promise<string> {
  const img = await loadImageFromUri(dataUri);
  const { width, height } = img;

  // Already high-res. Return as-is.
  if (width >= UPSCALE_TARGET && height >= UPSCALE_TARGET) {
    return dataUri;
  }

  const scale = UPSCALE_TARGET / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUri; // fallback

  // Enable highest-quality interpolation.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Return as lossless PNG for maximum download quality.
  return canvas.toDataURL('image/png', UPSCALE_QUALITY);
}

/**
 * Upscale a data-URI and return a Blob for ZIP packaging.
 * Returns the raw binary (not base64) for JSZip.
 */
export async function upscaleToBlob(dataUri: string): Promise<Blob> {
  const upscaled = await upscaleForDownload(dataUri);
  const base64 = upscaled.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

function loadImageFromUri(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for upscaling.'));
    img.src = uri;
  });
}

export { UPSCALE_TARGET };
