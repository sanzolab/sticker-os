// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { TradeSection } from "@/components/trade-section";

afterEach(() => {
  cleanup();
});

describe("TradeSection", () => {
  it("selects and clears every sticker in the section", async () => {
    const user = userEvent.setup();

    function Harness() {
      const stickerIds = ["MEX1", "MEX2", "MEX3"];
      const [selectedIds, setSelectedIds] = useState<string[]>([]);

      return (
        <TradeSection
          title="What you can receive (3)"
          detail="Collector has 3 stickers you need."
          stickerIds={stickerIds}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((ids) =>
              ids.includes(id)
                ? ids.filter((candidate) => candidate !== id)
                : [...ids, id],
            )
          }
          onToggleAll={() =>
            setSelectedIds((ids) =>
              stickerIds.every((id) => ids.includes(id)) ? [] : stickerIds,
            )
          }
        />
      );
    }

    render(<Harness />);

    expect(screen.getByText("0/3")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByText("3/3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByText("0/3")).toBeTruthy();
  });
});
