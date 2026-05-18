export type Density = "comfortable" | "compact" | "ultra";

export interface DensityConfig {
  gridColsBase: number;
  gridCols430: number;
  gridColsSm: number;
  gridColsMd: number;
  gridColsLg: number;
  gap: string;
  sectionGap: string;
  cellFontSize: string;
}

export const densityConfig: Record<Density, DensityConfig> = {
  comfortable: {
    gridColsBase: 4,
    gridCols430: 5,
    gridColsSm: 6,
    gridColsMd: 8,
    gridColsLg: 10,
    gap: "gap-3",
    sectionGap: "py-3",
    cellFontSize: "text-2xl",
  },
  compact: {
    gridColsBase: 5,
    gridCols430: 6,
    gridColsSm: 7,
    gridColsMd: 9,
    gridColsLg: 11,
    gap: "gap-2",
    sectionGap: "py-2",
    cellFontSize: "text-xl",
  },
  ultra: {
    gridColsBase: 6,
    gridCols430: 7,
    gridColsSm: 8,
    gridColsMd: 10,
    gridColsLg: 12,
    gap: "gap-1.5",
    sectionGap: "py-1.5",
    cellFontSize: "text-lg",
  },
};

export function getDensityGridClass(config: DensityConfig): string {
  const { gridColsBase, gridCols430, gridColsSm, gridColsMd, gridColsLg, gap, sectionGap } = config;

  return [
    "grid",
    `grid-cols-${gridColsBase}`,
    `min-[430px]:grid-cols-${gridCols430}`,
    `sm:grid-cols-${gridColsSm}`,
    `md:grid-cols-${gridColsMd}`,
    `lg:grid-cols-${gridColsLg}`,
    gap,
    sectionGap,
  ].join(" ");
}
