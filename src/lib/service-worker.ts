export function extractCacheNameFromServiceWorker(script: string): string | null {
  const match = script.match(/const\s+CACHE_NAME\s*=\s*["'`]([^"'`]+)["'`]\s*;/);
  return match?.[1] ?? null;
}

export function extractCacheVersion(cacheName: string): string | null {
  const match = cacheName.match(/(v\d+(?:\.\d+)*)$/);
  return match?.[1] ?? null;
}
