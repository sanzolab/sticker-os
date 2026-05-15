import { describe, expect, it } from "vitest";
import { resolveTabScrollTarget } from "./tab-scroll-restoration";

describe("resolveTabScrollTarget", () => {
  it("uses fallback when there is no saved position", () => {
    const result = resolveTabScrollTarget({
      savedY: undefined,
      maxY: 1200,
      viewportHeight: 900,
      activeContentBottomY: 1600,
      fallbackY: 420,
    });

    expect(result).toEqual({
      targetY: 420,
      usedFallback: true,
    });
  });

  it("clamps a saved position to the max document scroll", () => {
    const result = resolveTabScrollTarget({
      savedY: 2000,
      maxY: 900,
      viewportHeight: 500,
      activeContentBottomY: 1800,
      fallbackY: 200,
    });

    expect(result).toEqual({
      targetY: 900,
      usedFallback: false,
    });
  });

  it("falls back when restored viewport would land below active content", () => {
    const result = resolveTabScrollTarget({
      savedY: 950,
      maxY: 1400,
      viewportHeight: 700,
      activeContentBottomY: 1500,
      fallbackY: 280,
    });

    expect(result).toEqual({
      targetY: 280,
      usedFallback: true,
    });
  });
});

