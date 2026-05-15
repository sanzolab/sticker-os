type ResolveTabScrollTargetParams = {
  savedY?: number;
  maxY: number;
  viewportHeight: number;
  activeContentBottomY: number;
  fallbackY: number;
};

type ResolveTabScrollTargetResult = {
  targetY: number;
  usedFallback: boolean;
};

const clampScrollY = (value: number, maxY: number) =>
  Math.min(Math.max(value, 0), Math.max(maxY, 0));

export function resolveTabScrollTarget({
  savedY,
  maxY,
  viewportHeight,
  activeContentBottomY,
  fallbackY,
}: ResolveTabScrollTargetParams): ResolveTabScrollTargetResult {
  const safeMaxY = Math.max(maxY, 0);
  const safeFallbackY = clampScrollY(fallbackY, safeMaxY);

  if (savedY === undefined || Number.isNaN(savedY)) {
    return { targetY: safeFallbackY, usedFallback: true };
  }

  const clampedSavedY = clampScrollY(savedY, safeMaxY);
  const viewportBottomY = clampedSavedY + Math.max(viewportHeight, 0);

  if (viewportBottomY > activeContentBottomY) {
    return { targetY: safeFallbackY, usedFallback: true };
  }

  return { targetY: clampedSavedY, usedFallback: false };
}

