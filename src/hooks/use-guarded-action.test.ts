// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useGuardedAction } from "@/hooks/use-guarded-action";
import { useStickerStore } from "@/lib/store";

function resetStore() {
  useStickerStore.setState({
    isLocked: false,
    lastBlockedAttemptAt: null,
    collectionByStickerId: {},
    searchQuery: "",
  });
}

describe("useGuardedAction", () => {
  beforeEach(() => {
    resetStore();
  });

  it("guard calls fn and returns its value when unlocked", () => {
    const { result } = renderHook(() => useGuardedAction());
    const fn = vi.fn((x: number) => x + 1);
    const guarded = result.current.guard(fn);

    const returnValue = guarded(5);

    expect(fn).toHaveBeenCalledWith(5);
    expect(returnValue).toBe(6);
  });

  it("guard does not call fn when locked and triggers feedback", () => {
    act(() => {
      useStickerStore.setState({ isLocked: true });
    });

    const { result } = renderHook(() => useGuardedAction());
    const fn = vi.fn();
    const guarded = result.current.guard(fn);

    const returnValue = guarded();

    expect(fn).not.toHaveBeenCalled();
    expect(returnValue).toBeUndefined();
    expect(
      useStickerStore.getState().lastBlockedAttemptAt,
    ).not.toBeNull();
  });

  it("guard reflects updated isLocked state", () => {
    const { result, rerender } = renderHook(() => useGuardedAction());

    const fnUnlocked = vi.fn();
    const guardedUnlocked = result.current.guard(fnUnlocked);
    guardedUnlocked();
    expect(fnUnlocked).toHaveBeenCalled();

    act(() => {
      useStickerStore.setState({ isLocked: true });
    });
    rerender();

    const fnLocked = vi.fn();
    const guardedLocked = result.current.guard(fnLocked);
    guardedLocked();
    expect(fnLocked).not.toHaveBeenCalled();
  });
});
