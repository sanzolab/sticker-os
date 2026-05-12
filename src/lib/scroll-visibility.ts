"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

export type ScrollDirection = "up" | "down" | "idle";

export type ScrollVisibilitySnapshot = {
  scrollY: number;
  deltaY: number;
  direction: ScrollDirection;
  chromeProgress: number;
  sharedChromeProgress: number;
  tabsProgress: number;
  headerProgress: number;
  isStickyPinned: boolean;
  isScrollChromeActive: boolean;
  // Compatibility alias for existing consumers.
  isStickyActive: boolean;
};

type ScrollVisibilityListener = () => void;
type FrameHandle = number | ReturnType<typeof globalThis.setTimeout>;

type ScrollVisibilityTrackerOptions = {
  container?: Window | HTMLElement | null;
  deadzonePx?: number;
  scheduleFrame?: (callback: FrameRequestCallback) => FrameHandle;
  cancelFrame?: (id: FrameHandle) => void;
};

const DEFAULT_DEADZONE_PX = 2;
const DEFAULT_SAFETY_BUFFER_PX = 8;
const PROGRESS_SNAP_EPSILON = 0.0001;

const DEFAULT_SNAPSHOT: ScrollVisibilitySnapshot = {
  scrollY: 0,
  deltaY: 0,
  direction: "idle",
  chromeProgress: 0,
  sharedChromeProgress: 0,
  tabsProgress: 0,
  headerProgress: 0,
  isStickyPinned: false,
  isScrollChromeActive: false,
  isStickyActive: false,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clamp02 = (value: number) => Math.min(2, Math.max(0, value));

const snapProgress = (value: number) => {
  if (Math.abs(value) < PROGRESS_SNAP_EPSILON) return 0;
  if (Math.abs(value - 1) < PROGRESS_SNAP_EPSILON) return 1;
  if (Math.abs(value - 2) < PROGRESS_SNAP_EPSILON) return 2;
  return value;
};

const consumeProgressTowardBoundary = ({
  currentProgress,
  boundaryProgress,
  stageDistancePx,
  remainingPx,
}: {
  currentProgress: number;
  boundaryProgress: number;
  stageDistancePx: number;
  remainingPx: number;
}) => {
  const progressToBoundary = Math.abs(boundaryProgress - currentProgress);
  if (progressToBoundary <= PROGRESS_SNAP_EPSILON) {
    return {
      nextProgress: boundaryProgress,
      remainingPx,
    };
  }

  const pxToBoundary = progressToBoundary * stageDistancePx;
  const consumedPx = Math.min(remainingPx, pxToBoundary);
  const deltaProgress = consumedPx / stageDistancePx;
  const nextProgress =
    boundaryProgress > currentProgress
      ? currentProgress + deltaProgress
      : currentProgress - deltaProgress;

  return {
    nextProgress: snapProgress(nextProgress),
    remainingPx: remainingPx - consumedPx,
  };
};

const applyChromeDelta = ({
  currentProgress,
  deltaY,
  tabsDistance,
  headerDistance,
}: {
  currentProgress: number;
  deltaY: number;
  tabsDistance: number;
  headerDistance: number;
}) => {
  let nextProgress = clamp02(currentProgress);
  let remainingPx = Math.abs(deltaY);

  if (deltaY > 0 && remainingPx > 0) {
    if (nextProgress < 1) {
      const tabsStage = consumeProgressTowardBoundary({
        currentProgress: nextProgress,
        boundaryProgress: 1,
        stageDistancePx: tabsDistance,
        remainingPx,
      });
      nextProgress = tabsStage.nextProgress;
      remainingPx = tabsStage.remainingPx;
    }

    if (remainingPx > 0 && nextProgress < 2) {
      const headerStage = consumeProgressTowardBoundary({
        currentProgress: nextProgress,
        boundaryProgress: 2,
        stageDistancePx: headerDistance,
        remainingPx,
      });
      nextProgress = headerStage.nextProgress;
    }
  } else if (deltaY < 0 && remainingPx > 0) {
    if (nextProgress > 1) {
      const headerStage = consumeProgressTowardBoundary({
        currentProgress: nextProgress,
        boundaryProgress: 1,
        stageDistancePx: headerDistance,
        remainingPx,
      });
      nextProgress = headerStage.nextProgress;
      remainingPx = headerStage.remainingPx;
    }

    if (remainingPx > 0 && nextProgress > 0) {
      const tabsStage = consumeProgressTowardBoundary({
        currentProgress: nextProgress,
        boundaryProgress: 0,
        stageDistancePx: tabsDistance,
        remainingPx,
      });
      nextProgress = tabsStage.nextProgress;
    }
  }

  return snapProgress(clamp02(nextProgress));
};

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
  getContainer: () => Window | HTMLElement | null;
  setActivationScrollY: (scrollY: number | null) => void;
  setStickyChromeMetrics: (metrics: StickyChromeMetrics | null) => void;
};

type StickyChromeMetrics = {
  tabsHeight: number;
  topBarHeight: number;
  stickyTopPx: number;
  safetyBufferPx?: number;
  naturalBufferPx?: number;
  tabsStageDistancePx?: number;
};

export function createScrollVisibilityTracker(
  options: ScrollVisibilityTrackerOptions = {},
): ScrollVisibilityTracker {
  const deadzonePx = options.deadzonePx ?? DEFAULT_DEADZONE_PX;
  const defaultScheduler = getDefaultScheduler();
  const scheduleFrame = options.scheduleFrame ?? defaultScheduler.scheduleFrame;
  const cancelFrame = options.cancelFrame ?? defaultScheduler.cancelFrame;

  const listeners = new Set<ScrollVisibilityListener>();
  const container = resolveContainer(options.container);

  let snapshot = DEFAULT_SNAPSHOT;
  let lastScrollY = container ? readScrollY(container) : 0;
  let rafId: FrameHandle | null = null;
  let listening = false;
  let activationScrollY: number | null = null;
  let stickyChromeMetrics: StickyChromeMetrics | null = null;
  let currentChromeProgress = 0;
  let currentSharedChromeProgress = 0;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const updateSnapshot = () => {
    if (!container) return;

    const nextScrollY = readScrollY(container);
    const rawDeltaY = nextScrollY - lastScrollY;
    let normalizedDeltaY = 0;
    let direction: ScrollDirection = "idle";
    let chromeProgress = 0;
    let sharedChromeProgress = 0;
    let tabsProgress = 0;
    let headerProgress = 0;
    let isStickyPinned = false;
    let isScrollChromeActive = false;
    let isStickyActive = false;

    if (Math.abs(rawDeltaY) > deadzonePx) {
      normalizedDeltaY = rawDeltaY;
      direction = rawDeltaY > 0 ? "down" : "up";
    }

    const hasActivation = typeof activationScrollY === "number";
    const hasMetrics = stickyChromeMetrics !== null;

    if (hasActivation && activationScrollY !== null && hasMetrics && stickyChromeMetrics) {
      const metricsAreFinite =
        Number.isFinite(stickyChromeMetrics.tabsHeight) &&
        Number.isFinite(stickyChromeMetrics.topBarHeight) &&
        Number.isFinite(stickyChromeMetrics.stickyTopPx) &&
        Number.isFinite(stickyChromeMetrics.safetyBufferPx ?? DEFAULT_SAFETY_BUFFER_PX) &&
        (stickyChromeMetrics.tabsStageDistancePx === undefined ||
          Number.isFinite(stickyChromeMetrics.tabsStageDistancePx));

      if (!metricsAreFinite) {
        currentChromeProgress = 0;
        currentSharedChromeProgress = 0;
        const nextSnapshot: ScrollVisibilitySnapshot = {
          scrollY: nextScrollY,
          deltaY: normalizedDeltaY,
          direction,
          chromeProgress: 0,
          sharedChromeProgress: 0,
          tabsProgress: 0,
          headerProgress: 0,
          isStickyPinned: false,
          isScrollChromeActive: false,
          isStickyActive: false,
        };

        const changed =
          nextSnapshot.scrollY !== snapshot.scrollY ||
          nextSnapshot.deltaY !== snapshot.deltaY ||
          nextSnapshot.direction !== snapshot.direction ||
          nextSnapshot.chromeProgress !== snapshot.chromeProgress ||
          nextSnapshot.sharedChromeProgress !== snapshot.sharedChromeProgress ||
          nextSnapshot.tabsProgress !== snapshot.tabsProgress ||
          nextSnapshot.headerProgress !== snapshot.headerProgress ||
          nextSnapshot.isStickyPinned !== snapshot.isStickyPinned ||
          nextSnapshot.isScrollChromeActive !== snapshot.isScrollChromeActive ||
          nextSnapshot.isStickyActive !== snapshot.isStickyActive;

        snapshot = nextSnapshot;
        lastScrollY = nextScrollY;

        if (changed) notify();
        return;
      }

      const safeTabsHeight = Math.max(stickyChromeMetrics.tabsHeight || 0, 1);
      const safeTopBarHeight = Math.max(stickyChromeMetrics.topBarHeight || 0, 1);
      const safeStickyTopPx = Math.max(stickyChromeMetrics.stickyTopPx || 0, 0);
      const safeSafetyBufferPx = Math.max(
        stickyChromeMetrics.safetyBufferPx ?? DEFAULT_SAFETY_BUFFER_PX,
        0,
      );

      const stickyStart = Math.max(0, activationScrollY);

      isStickyPinned = nextScrollY >= stickyStart;
      isScrollChromeActive = isStickyPinned;
      isStickyActive = isStickyPinned;

      if (nextScrollY < stickyStart) {
        currentChromeProgress = 0;
        currentSharedChromeProgress = 0;
        isStickyPinned = false;
        isScrollChromeActive = false;
        isStickyActive = false;
      } else if (isStickyActive) {
        const tabsHiddenOffset =
          safeTabsHeight + Math.max(safeStickyTopPx, safeTopBarHeight) + safeSafetyBufferPx;
        const safeTabsStageDistancePx = Math.max(
          stickyChromeMetrics.tabsStageDistancePx ?? tabsHiddenOffset,
          1,
        );
        const headerDistance = Math.max(safeTopBarHeight, 1);

        if (normalizedDeltaY !== 0) {
          const stickyDeltaY =
            normalizedDeltaY > 0
              ? nextScrollY - Math.max(lastScrollY, stickyStart)
              : nextScrollY - lastScrollY;

          if (stickyDeltaY !== 0) {
            currentChromeProgress = applyChromeDelta({
              currentProgress: currentChromeProgress,
              deltaY: stickyDeltaY,
              tabsDistance: safeTabsStageDistancePx,
              headerDistance,
            });

            currentSharedChromeProgress = clamp01(
              applyChromeDelta({
                currentProgress: currentSharedChromeProgress,
                deltaY: stickyDeltaY,
                tabsDistance: safeTabsStageDistancePx,
                headerDistance: safeTabsStageDistancePx,
              }),
            );
          }
        }

        chromeProgress = currentChromeProgress;
        sharedChromeProgress = currentSharedChromeProgress;
        tabsProgress = clamp01(chromeProgress);
        headerProgress = clamp01(chromeProgress - 1);
      }
    } else {
      currentChromeProgress = 0;
      currentSharedChromeProgress = 0;
    }

    const nextSnapshot: ScrollVisibilitySnapshot = {
      scrollY: nextScrollY,
      deltaY: normalizedDeltaY,
      direction,
      chromeProgress,
      sharedChromeProgress,
      tabsProgress,
      headerProgress,
      isStickyPinned,
      isScrollChromeActive,
      isStickyActive,
    };

    const changed =
      nextSnapshot.scrollY !== snapshot.scrollY ||
      nextSnapshot.deltaY !== snapshot.deltaY ||
      nextSnapshot.direction !== snapshot.direction ||
      nextSnapshot.chromeProgress !== snapshot.chromeProgress ||
      nextSnapshot.sharedChromeProgress !== snapshot.sharedChromeProgress ||
      nextSnapshot.tabsProgress !== snapshot.tabsProgress ||
      nextSnapshot.headerProgress !== snapshot.headerProgress ||
      nextSnapshot.isStickyPinned !== snapshot.isStickyPinned ||
      nextSnapshot.isScrollChromeActive !== snapshot.isScrollChromeActive ||
      nextSnapshot.isStickyActive !== snapshot.isStickyActive;

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
    getContainer: () => container,
    setActivationScrollY: (scrollY) => {
      activationScrollY = typeof scrollY === "number" ? Math.max(0, scrollY) : null;
      if (activationScrollY === null) {
        currentChromeProgress = 0;
        currentSharedChromeProgress = 0;
      }
      if (!container) return;
      updateSnapshot();
    },
    setStickyChromeMetrics: (metrics) => {
      stickyChromeMetrics = metrics;
      if (stickyChromeMetrics === null) {
        currentChromeProgress = 0;
        currentSharedChromeProgress = 0;
      }
      if (!container) return;
      updateSnapshot();
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

type StickyActivationOptions = {
  sentinelRef: RefObject<HTMLElement | null>;
  stickyTopPx: number;
  tabsHeight?: number;
  topBarHeight?: number;
  safetyBufferPx?: number;
  naturalBufferPx?: number;
  tabsStageDistancePx?: number;
};

const readContainerTop = (container: Window | HTMLElement) => {
  if ("scrollY" in container) return 0;
  return container.getBoundingClientRect().top;
};

export function useRegisterStickyActivation({
  sentinelRef,
  stickyTopPx,
  tabsHeight,
  topBarHeight,
  safetyBufferPx,
  naturalBufferPx,
  tabsStageDistancePx,
}: StickyActivationOptions) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tracker = getPageScrollVisibilityTracker();
    const sentinel = sentinelRef.current;
    const container = tracker.getContainer();

    if (!sentinel || !container) {
      tracker.setActivationScrollY(null);
      return;
    }

    let rafId: number | null = null;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      const currentScrollY = readScrollY(container);
      const sentinelRect = sentinel.getBoundingClientRect();
      const sentinelTopRelativeToContainer = sentinelRect.top - readContainerTop(container);
      const activationY = currentScrollY + sentinelTopRelativeToContainer - stickyTopPx;
      tracker.setActivationScrollY(activationY);
      tracker.setStickyChromeMetrics({
        tabsHeight: tabsHeight ?? 0,
        topBarHeight: topBarHeight ?? 0,
        stickyTopPx,
        safetyBufferPx,
        naturalBufferPx,
        tabsStageDistancePx,
      });
    };

    const scheduleMeasure = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    measure();
    window.addEventListener("resize", scheduleMeasure);

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(document.body);
      observer.observe(sentinel);
    }

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
      tracker.setActivationScrollY(null);
      tracker.setStickyChromeMetrics(null);
    };
  }, [
    naturalBufferPx,
    safetyBufferPx,
    sentinelRef,
    stickyTopPx,
    tabsHeight,
    topBarHeight,
    tabsStageDistancePx,
  ]);
}
