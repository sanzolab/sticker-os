"use client";

import { densityConfig, getDensityGridClass, type DensityConfig } from "@/lib/density";
import { useStickerStore } from "@/lib/store";

export function useDensityConfig(): DensityConfig {
  const density = useStickerStore((state) => state.settings.density);
  return densityConfig[density];
}

export function useDensityGridClass(): string {
  const config = useDensityConfig();
  return getDensityGridClass(config);
}
