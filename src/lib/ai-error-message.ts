const hasAny = (message: string, patterns: string[]) =>
  patterns.some((pattern) => message.includes(pattern));

export function getSafeGenerationErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : String(error || 'Unknown generation error');
  const message = rawMessage.toLowerCase();

  if (hasAny(message, ['api key', 'gemini_api_key', 'google_api_key'])) {
    return 'AI key missing or not loaded.';
  }

  if (hasAny(message, ['quota', 'too many requests', 'billing', 'rate-limits'])) {
    return 'AI quota or billing issue. Check the Google AI plan, billing, and rate limits.';
  }

  if (hasAny(message, ['not found', 'unsupported model', 'not supported for generatecontent', 'not supported for predict'])) {
    return 'Image or text model unavailable for the current Google AI setup.';
  }

  if (hasAny(message, ['provider returned no image', 'returned no predictions', 'no text output'])) {
    return 'The AI provider returned no image.';
  }

  if (hasAny(message, ['image in input is not supported', 'invalid media', 'invalid_argument', 'data uri'])) {
    return 'Invalid media input for the selected image model.';
  }

  if (hasAny(message, ['payload', 'too large', 'max file size', '413'])) {
    return 'Uploaded image is too large for generation.';
  }

  if (hasAny(message, ['timeout', 'timed out', 'deadline'])) {
    return 'Generation timed out.';
  }

  return 'Unknown generation error. Check the server logs for the provider response.';
}
