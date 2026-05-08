// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AddStickersDrawer } from "./add-stickers-drawer";
import { useAddStickersPendingStore } from "./add-stickers-session";
import type { AddStickerCandidate } from "./add-stickers-types";

vi.mock("@/components/ui/app-drawer", () => ({
  AppDrawer: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
}));

vi.mock("@/components/ui/drawer", () => ({
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

beforeEach(() => {
  useAddStickersPendingStore.getState().clearPending();
  useAddStickersPendingStore.persist.clearStorage();
});

afterEach(() => {
  cleanup();
});

describe("AddStickersDrawer", () => {
  it("opens directly in review mode when pending queue already has items", async () => {
    useAddStickersPendingStore.getState().appendResult({
      candidates: [candidate("MEX13", "MEX 13", true)],
      unresolved: [],
      provider: "deterministic",
      source: "text",
    });

    render(<AddStickersDrawer open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Confirm stickers")).toBeTruthy();
    expect(screen.getByText("MEX 13")).toBeTruthy();
  });

  it("clears pending queue after confirm and closes the drawer", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    useAddStickersPendingStore.getState().appendResult({
      candidates: [candidate("MEX13", "MEX 13", true)],
      unresolved: [],
      provider: "deterministic",
      source: "text",
    });

    render(<AddStickersDrawer open onOpenChange={onOpenChange} />);

    await user.click(screen.getAllByRole("button", { name: "Confirm add selected stickers (1)" })[0]!);

    expect(useAddStickersPendingStore.getState().candidates).toEqual([]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

function candidate(
  stickerId: string,
  code: string,
  selected: boolean,
): AddStickerCandidate {
  return {
    stickerId,
    stickerOsIndex: Number(code.replace(/\D/g, "")),
    code,
    label: code,
    groupLabel: code.split(" ")[0] ?? code,
    number: code.split(" ")[1] ?? "",
    confidence: 1,
    selected,
    source: code,
  };
}
