"use client";

import { useSyncExternalStore } from "react";

export type ScrollDirection = "up" | "down" | "idle";

export type ScrollVisibilitySnapshot = {
  scrollY: number;
  deltaY: number;
  direction: ScrollDirection;
  hiddenProgress: number;
};

type ScrollVisibilityListener = () => void;
type FrameHandle = number | ReturnType<typeof globalThis.setTimeout>;

type ScrollVisibilityTrackerOptions = {
  container?: Window | HTMLElement | null;
  deadzonePx?: number;
  revealDistancePx?: number;
  topVisibleOffsetPx?: number;
  scheduleFrame?: (callback: FrameRequestCallback) => FrameHandle;
  cancelFrame?: (id: FrameHandle) => void;
};

const DEFAULT_DEADZONE_PX = 2;
const DEFAULT_REVEAL_DISTANCE_PX = 72;
const DEFAULT_TOP_VISIBLE_OFFSET_PX = 2;

const DEFAULT_SNAPSHOT: ScrollVisibilitySnapshot = {
  scrollY: 0,
  deltaY: 0,
  direction: "idle",
  hiddenProgress: 0,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getDefaultScheduler = () => ({
  scheduleFrame: (callback: FrameRequestCallback) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return globalThis.setTimeout(() => callback(Date.now()), 16);
  },
  cancelFrame: (id: FrameHandle) => {
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(Number(id));
      return;
    }
    globalThis.clearTimeout(id);
  },
});

const resolveContainer = (
  container: ScrollVisibilityTrackerOptions["container"],
): Window | HTMLElement | null => {
  if (container) return container;
  if (typeof window !== "undefined") return window;
  return null;
};

const readScrollY = (container: Window | HTMLElement): number => {
  if ("scrollY" in container) {
    return Math.max(0, container.scrollY || window.scrollY || 0);
  }
  return Math.max(0, container.scrollTop);
};

export type ScrollVisibilityTracker = {
  getSnapshot: () => ScrollVisibilitySnapshot;
  subscribe: (listener: ScrollVisibilityListener) => () => void;
};

export function createScrollVisibilityTracker(
  options: ScrollVisibilityTrackerOptions = {},
): ScrollVisibilityTracker {
  const deadzonePx = options.deadzonePx ?? DEFAULT_DEADZONE_PX;
  const revealDistancePx = options.revealDistancePx ?? DEFAULT_REVEAL_DISTANCE_PX;
  const topVisibleOffsetPx = options.topVisibleOffsetPx ?? DEFAULT_TOP_VISIBLE_OFFSET_PX;
  const defaultScheduler = getDefaultScheduler();
  const scheduleFrame = options.scheduleFrame ?? defaultScheduler.scheduleFrame;
  const cancelFrame = options.cancelFrame ?? defaultScheduler.cancelFrame;

  const listeners = new Set<ScrollVisibilityListener>();
  const container = resolveContainer(options.container);

  let snapshot = DEFAULT_SNAPSHOT;
  let lastScrollY = container ? readScrollY(container) : 0;
  let rafId: FrameHandle | null = null;
  let listening = false;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const updateSnapshot = () => {
    if (!container) return;

    const nextScrollY = readScrollY(container);
    const deltaY = nextScrollY - lastScrollY;
    const absDeltaY = Math.abs(deltaY);

    let hiddenProgress = snapshot.hiddenProgress;
    let direction: ScrollDirection = snapshot.direction;
    let normalizedDeltaY = 0;

    if (nextScrollY <= topVisibleOffsetPx) {
      hiddenProgress = 0;
      direction = "up";
    } else if (absDeltaY > deadzonePx) {
      const progressDelta = deltaY / revealDistancePx;
      hiddenProgress = clamp01(hiddenProgress + progressDelta);
      direction = deltaY > 0 ? "down" : "up";
      normalizedDeltaY = deltaY;
    }

    const nextSnapshot: ScrollVisibilitySnapshot = {
      scrollY: nextScrollY,
      deltaY: normalizedDeltaY,
      direction,
      hiddenProgress,
    };

    const changed =
      nextSnapshot.scrollY !== snapshot.scrollY ||
      nextSnapshot.deltaY !== snapshot.deltaY ||
      nextSnapshot.direction !== snapshot.direction ||
      nextSnapshot.hiddenProgress !== snapshot.hiddenProgress;

    snapshot = nextSnapshot;
    lastScrollY = nextScrollY;

    if (changed) notify();
  };

  const scheduleUpdate = () => {
    if (rafId !== null) return;
    rafId = scheduleFrame(() => {
      rafId = null;
      updateSnapshot();
    });
  };

  const handleScroll = () => {
    scheduleUpdate();
  };

  const stop = () => {
    if (!container || !listening) return;
    container.removeEventListener("scroll", handleScroll as EventListener);
    listening = false;
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
  };

  const start = () => {
    if (!container || listening) return;
    container.addEventListener("scroll", handleScroll as EventListener, { passive: true });
    listening = true;
    updateSnapshot();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1) start();

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
  };
}

let pageScrollVisibilityTracker: ScrollVisibilityTracker | null = null;

export function getPageScrollVisibilityTracker() {
  if (!pageScrollVisibilityTracker) {
    pageScrollVisibilityTracker = createScrollVisibilityTracker();
  }
  return pageScrollVisibilityTracker;
}

export function usePageScrollVisibility() {
  const tracker = getPageScrollVisibilityTracker();
  return useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    () => DEFAULT_SNAPSHOT,
  );
}
