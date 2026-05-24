/**
 * Client-side image compression utility.
 *
 * Resizes and compresses images in the browser before they are converted to
 * data URIs and sent through Next.js Server Actions.  This keeps total payload
 * well under Vercel's ~4.5 MB function body limit while preserving enough
 * quality for AI generation.
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Maximum pixel dimension (width or height) for uploaded images. */
const MAX_DIMENSION = 1280;

/** JPEG/WebP output quality (0-1). */
const OUTPUT_QUALITY = 0.75;

/** Target byte limit for each *reference* image (optional extras). */
const MAX_REFERENCE_IMAGE_BYTES = 700 * 1024; // 700 KB

/** Target byte limit for the *main* / required product image. */
const MAX_MAIN_IMAGE_BYTES = 900 * 1024; // 900 KB

/** Hard limit for the combined payload across all images. */
const MAX_TOTAL_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

/** Images at or below this size are kept as-is (no point re-encoding). */
const SKIP_THRESHOLD_BYTES = 200 * 1024; // 200 KB

/* ------------------------------------------------------------------ */
/*  Return type                                                       */
/* ------------------------------------------------------------------ */

export interface OptimizedImage {
  /** The (possibly compressed) file. */
  file: File;
  /** Data-URI of the optimised image. */
  dataUri: string;
  /** Original file size in bytes. */
  originalSize: number;
  /** Final file size in bytes (after compression, if any). */
  optimizedSize: number;
  /** Whether the image was actually compressed. */
  wasCompressed: boolean;
}

/* ------------------------------------------------------------------ */
/*  Core helpers                                                      */
/* ------------------------------------------------------------------ */

/** Load an image element from a File. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression.'));
    };
    img.src = url;
  });
}

/** Convert a canvas blob to a File and a data-URI. */
function canvasToBlobAndUri(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
  originalName: string,
): Promise<{ file: File; dataUri: string }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas compression returned empty blob.'));
          return;
        }

        const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
        const baseName = originalName.replace(/\.[^.]+$/, '');
        const file = new File([blob], `${baseName}${ext}`, { type: mimeType });

        const reader = new FileReader();
        reader.onload = () => resolve({ file, dataUri: reader.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      },
      mimeType,
      quality,
    );
  });
}

/** Choose output MIME – prefer WebP, fallback to JPEG. */
function chooseOutputMime(inputType: string): string {
  // Keep WebP if input is WebP.  Otherwise encode as JPEG which has
  // the widest canvas.toBlob support and compresses well.
  if (inputType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Optimise a single image file.
 *
 * - Resizes so that neither dimension exceeds `MAX_DIMENSION`.
 * - Re-encodes as JPEG/WebP at `OUTPUT_QUALITY`.
 * - If the original is already small enough, returns it unchanged.
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  const originalSize = file.size;

  // If the file is already tiny, skip compression entirely.
  if (originalSize <= SKIP_THRESHOLD_BYTES) {
    const dataUri = await fileToDataUriLocal(file);
    return { file, dataUri, originalSize, optimizedSize: originalSize, wasCompressed: false };
  }

  try {
    const img = await loadImage(file);
    let { width, height } = img;

    // Calculate new dimensions while preserving aspect ratio.
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2d context.');

    ctx.drawImage(img, 0, 0, width, height);

    const outputMime = chooseOutputMime(file.type);
    const { file: optimizedFile, dataUri } = await canvasToBlobAndUri(
      canvas,
      outputMime,
      OUTPUT_QUALITY,
      file.name,
    );

    // If compression actually made it larger (e.g. tiny PNGs), use original.
    if (optimizedFile.size >= originalSize) {
      const origUri = await fileToDataUriLocal(file);
      return { file, dataUri: origUri, originalSize, optimizedSize: originalSize, wasCompressed: false };
    }

    return {
      file: optimizedFile,
      dataUri,
      originalSize,
      optimizedSize: optimizedFile.size,
      wasCompressed: true,
    };
  } catch {
    // Graceful fallback – return the original file.
    const dataUri = await fileToDataUriLocal(file);
    return { file, dataUri, originalSize, optimizedSize: originalSize, wasCompressed: false };
  }
}

/** Read a file as a data URI (browser FileReader wrapper). */
function fileToDataUriLocal(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Payload estimation helpers                                        */
/* ------------------------------------------------------------------ */

/** Format bytes as a human-readable string (e.g. "1.2 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Estimate total payload of a list of optimised images and
 * return whether it exceeds the Vercel limit.
 */
export function estimatePayload(images: OptimizedImage[]): {
  totalBytes: number;
  exceedsLimit: boolean;
  formatted: string;
} {
  // Data-URI overhead: base64 encodes 3 bytes → 4 chars, plus the header.
  // We use the optimizedSize directly because the data-URI is roughly
  // (optimizedSize * 4/3) + small header, but we also have non-image form
  // fields so we add a 15 % safety margin.
  const totalBytes = images.reduce((sum, img) => sum + Math.ceil(img.optimizedSize * 1.4), 0);

  return {
    totalBytes,
    exceedsLimit: totalBytes > MAX_TOTAL_PAYLOAD_BYTES,
    formatted: formatBytes(totalBytes),
  };
}

/** Check whether a single image exceeds the per-file limit. */
export function exceedsPerImageLimit(
  img: OptimizedImage,
  isMain: boolean,
): boolean {
  const limit = isMain ? MAX_MAIN_IMAGE_BYTES : MAX_REFERENCE_IMAGE_BYTES;
  return img.optimizedSize > limit;
}

/* Re-export limits so callers can show them in UI. */
export {
  MAX_DIMENSION,
  MAX_REFERENCE_IMAGE_BYTES,
  MAX_MAIN_IMAGE_BYTES,
  MAX_TOTAL_PAYLOAD_BYTES,
};
