export function requireGeneratedImage(
  media: {url?: string} | null | undefined,
  flowName: string
) {
  if (!media?.url) {
    throw new Error(`${flowName}: provider returned no image.`);
  }

  return media.url;
}
