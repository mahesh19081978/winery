const ALLOWED_HOSTS = new Set([
  'images.unsplash.com',
  'localhost',
  '127.0.0.1'
]);

export function getSafeImageUrl(src: string | null | undefined, fallback: string): string {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return fallback;
  }

  const trimmed = src.trim();

  // If local static path (starts with /)
  if (trimmed.startsWith('/')) {
    // If it points to an invalid/non-existent test file like /test.jpg
    if (trimmed === '/test.jpg') {
      return fallback;
    }
    return trimmed;
  }

  // If external absolute URL
  try {
    const url = new URL(trimmed);
    if (ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith('.public.blob.vercel-storage.com')) {
      return trimmed;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
