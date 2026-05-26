// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TradeStickerCard } from "./trade-sticker-card";
import { stickers } from "@/lib/sticker-data";

afterEach(() => {
  cleanup();
});

const regularSticker = stickers.find((sticker) => !sticker.special);
const specialSticker = stickers.find((sticker) => sticker.special);

describe("TradeStickerCard", () => {
  it("keeps missing regular stickers transparent with dashed readable treatment", () => {
    if (!regularSticker) throw new Error("Missing regular sticker fixture");

    const { container } = render(
      <TradeStickerCard
        stickerId={regularSticker.id}
        selected={false}
        onToggle={() => {}}
        readOnly={true}
      />,
    );

    const tile = container.querySelector("[class*='border-dashed']");
    expect(tile?.className).toContain("border-muted-foreground/45");
    expect(tile?.className).toContain("bg-transparent");
    expect(tile?.className).toContain("text-muted-foreground");
    expect(tile?.className).toContain("hover:bg-transparent");
    expect(tile?.className).toContain("dark:bg-transparent");
    expect(tile?.className).not.toContain("bg-muted/");
    expect(tile?.className).not.toContain("bg-white/");
  });

  it("keeps missing special stickers transparent and distinct from owned special", () => {
    if (!specialSticker) throw new Error("Missing special sticker fixture");

    const { container } = render(
      <TradeStickerCard
        stickerId={specialSticker.id}
        selected={false}
        onToggle={() => {}}
        readOnly={true}
      />,
    );

    const tile = container.querySelector("[class*='border-dashed'][class*='amber']");
    expect(tile?.className).toContain("border-amber-500/55");
    expect(tile?.className).toContain("bg-transparent");
    expect(tile?.className).toContain("text-amber-800");
    expect(tile?.className).toContain("dark:border-amber-300/45");
    expect(tile?.className).toContain("dark:text-amber-200");
    expect(tile?.className).toContain("hover:bg-transparent");
    expect(tile?.className).toContain("dark:hover:bg-transparent");
    expect(tile?.className).not.toContain("bg-amber-");
    expect(tile?.className).not.toContain("bg-muted/");
    expect(tile?.className).not.toContain("bg-white/");
  });

  it("keeps selected special stickers filled and solid", () => {
    if (!specialSticker) throw new Error("Missing special sticker fixture");

    const { container } = render(
      <TradeStickerCard
        stickerId={specialSticker.id}
        selected={true}
        onToggle={() => {}}
        readOnly={true}
      />,
    );

    const tile = container.querySelector("[class*='bg-primary']");
    expect(tile?.className).toContain("border-border/75");
    expect(tile?.className).toContain("bg-primary/[0.07]");
    expect(tile?.className).toContain("text-foreground");
  });
});
