/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createScrollVisibilityTracker,
  type ScrollVisibilitySnapshot,
} from "./scroll-visibility";

function setWindowScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

function createQueuedTracker() {
  const rafQueue: FrameRequestCallback[] = [];
  const tracker = createScrollVisibilityTracker({
    container: window,
    scheduleFrame: (callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    },
    cancelFrame: vi.fn(),
  });

  const flush = (): ScrollVisibilitySnapshot => {
    rafQueue.shift()?.(0);
    return tracker.getSnapshot();
  };

  return { tracker, flush, rafQueue };
}

function registerStickyChrome(
  tracker: ReturnType<typeof createScrollVisibilityTracker>,
  overrides: Partial<{
    tabsHeight: number;
    topBarHeight: number;
    stickyTopPx: number;
    safetyBufferPx: number;
    naturalBufferPx: number;
    tabsStageDistancePx: number;
  }> = {},
) {
  tracker.setActivationScrollY(100);
  tracker.setStickyChromeMetrics({
    tabsHeight: overrides.tabsHeight ?? 80,
    topBarHeight: overrides.topBarHeight ?? 56,
    stickyTopPx: overrides.stickyTopPx ?? 56,
    safetyBufferPx: overrides.safetyBufferPx ?? 8,
    naturalBufferPx: overrides.naturalBufferPx ?? 24,
    tabsStageDistancePx: overrides.tabsStageDistancePx,
  });
}

function scrollAndFlush(
  flush: () => ScrollVisibilitySnapshot,
  scrollY: number,
) {
  setWindowScrollY(scrollY);
  window.dispatchEvent(new Event("scroll"));
  return flush();
}

describe("scroll visibility tracker", () => {
  beforeEach(() => {
    setWindowScrollY(0);
  });

  it("attaches one scroll listener for multiple subscribers and tears it down when unused", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const tracker = createScrollVisibilityTracker({
      container: window,
      scheduleFrame: (cb) => {
        cb(0);
        return 1;
      },
      cancelFrame: vi.fn(),
    });

    const unsubA = tracker.subscribe(() => {});
    const unsubB = tracker.subscribe(() => {});

    const scrollAddCalls = addSpy.mock.calls.filter((call) => call[0] === "scroll");
    expect(scrollAddCalls).toHaveLength(1);

    unsubA();
    let scrollRemoveCalls = removeSpy.mock.calls.filter((call) => call[0] === "scroll");
    expect(scrollRemoveCalls).toHaveLength(0);

    unsubB();
    scrollRemoveCalls = removeSpy.mock.calls.filter((call) => call[0] === "scroll");
    expect(scrollRemoveCalls).toHaveLength(1);
  });

  it("batches scroll updates in requestAnimationFrame", () => {
    const subscribers = vi.fn();
    const rafQueue: FrameRequestCallback[] = [];
    const tracker = createScrollVisibilityTracker({
      container: window,
      scheduleFrame: (callback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      },
      cancelFrame: vi.fn(),
    });

    tracker.subscribe(subscribers);
    subscribers.mockClear();
    setWindowScrollY(8);
    window.dispatchEvent(new Event("scroll"));
    setWindowScrollY(24);
    window.dispatchEvent(new Event("scroll"));

    expect(subscribers).toHaveBeenCalledTimes(0);
    expect(rafQueue).toHaveLength(1);

    rafQueue.shift()?.(0);

    expect(subscribers).toHaveBeenCalledTimes(1);
    expect(tracker.getSnapshot().scrollY).toBe(24);
  });

  it("keeps progress at zero when no sticky activation point is registered", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});

    const snapshot = scrollAndFlush(flush, 120);

    expect(snapshot.chromeProgress).toBe(0);
    expect(snapshot.sharedChromeProgress).toBe(0);
    expect(snapshot.tabsProgress).toBe(0);
    expect(snapshot.headerProgress).toBe(0);
    expect(snapshot.isStickyPinned).toBe(false);
    expect(snapshot.isScrollChromeActive).toBe(false);
    expect(snapshot.isStickyActive).toBe(false);
  });

  it("stays natural before sticky start and does not hide on the activation boundary", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    const beforeSticky = scrollAndFlush(flush, 99);
    expect(beforeSticky.isStickyPinned).toBe(false);
    expect(beforeSticky.isScrollChromeActive).toBe(false);
    expect(beforeSticky.isStickyActive).toBe(false);
    expect(beforeSticky.tabsProgress).toBe(0);
    expect(beforeSticky.headerProgress).toBe(0);
    expect(beforeSticky.chromeProgress).toBe(0);
    expect(beforeSticky.sharedChromeProgress).toBe(0);

    const atStickyStart = scrollAndFlush(flush, 100);
    expect(atStickyStart.isStickyPinned).toBe(true);
    expect(atStickyStart.isScrollChromeActive).toBe(true);
    expect(atStickyStart.isStickyActive).toBe(true);
    expect(atStickyStart.tabsProgress).toBe(0);
    expect(atStickyStart.headerProgress).toBe(0);
    expect(atStickyStart.chromeProgress).toBe(0);
    expect(atStickyStart.sharedChromeProgress).toBe(0);
  });

  it("uses sticky-only downward scroll to hide tabs first, then the header", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    scrollAndFlush(flush, 100);

    const tabsStage = scrollAndFlush(flush, 172);
    expect(tabsStage.tabsProgress).toBeCloseTo(0.5, 4);
    expect(tabsStage.headerProgress).toBe(0);
    expect(tabsStage.chromeProgress).toBeCloseTo(0.5, 4);
    expect(tabsStage.sharedChromeProgress).toBeCloseTo(0.5, 4);

    const tabsHidden = scrollAndFlush(flush, 244);
    expect(tabsHidden.tabsProgress).toBe(1);
    expect(tabsHidden.headerProgress).toBe(0);
    expect(tabsHidden.chromeProgress).toBe(1);
    expect(tabsHidden.sharedChromeProgress).toBe(1);

    const headerStage = scrollAndFlush(flush, 272);
    expect(headerStage.tabsProgress).toBe(1);
    expect(headerStage.headerProgress).toBeCloseTo(0.5, 4);
    expect(headerStage.chromeProgress).toBeCloseTo(1.5, 4);
    expect(headerStage.sharedChromeProgress).toBe(1);
  });

  it("keeps a shared chrome progress in sync so header and sticky controls can move together", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    scrollAndFlush(flush, 100);

    const halfHidden = scrollAndFlush(flush, 172);
    expect(halfHidden.sharedChromeProgress).toBeCloseTo(0.5, 4);

    const fullyHidden = scrollAndFlush(flush, 244);
    expect(fullyHidden.sharedChromeProgress).toBe(1);

    const halfRevealed = scrollAndFlush(flush, 172);
    expect(halfRevealed.sharedChromeProgress).toBeCloseTo(0.5, 4);

    const revealed = scrollAndFlush(flush, 100);
    expect(revealed.sharedChromeProgress).toBe(0);
  });

  it("reveals header first and then tabs on upward scroll while still far below the top", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    scrollAndFlush(flush, 320);
    const fullyHidden = tracker.getSnapshot();
    expect(fullyHidden.tabsProgress).toBe(1);
    expect(fullyHidden.headerProgress).toBe(1);

    const headerRevealing = scrollAndFlush(flush, 292);
    expect(headerRevealing.scrollY).toBe(292);
    expect(headerRevealing.tabsProgress).toBe(1);
    expect(headerRevealing.headerProgress).toBeCloseTo(0.5, 4);

    const tabsStillHidden = scrollAndFlush(flush, 264);
    expect(tabsStillHidden.tabsProgress).toBe(1);
    expect(tabsStillHidden.headerProgress).toBe(0);

    const tabsRevealing = scrollAndFlush(flush, 192);
    expect(tabsRevealing.scrollY).toBe(192);
    expect(tabsRevealing.tabsProgress).toBeCloseTo(0.5, 4);
    expect(tabsRevealing.headerProgress).toBe(0);

    const fullyRevealed = scrollAndFlush(flush, 120);
    expect(fullyRevealed.scrollY).toBe(120);
    expect(fullyRevealed.chromeProgress).toBe(0);
    expect(fullyRevealed.sharedChromeProgress).toBe(0);
    expect(fullyRevealed.headerProgress).toBe(0);
    expect(fullyRevealed.tabsProgress).toBe(0);
  });

  it("carries upward delta across the stage boundary instead of stopping at chromeProgress 1", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    const start = scrollAndFlush(flush, 255.2);
    expect(start.chromeProgress).toBeCloseTo(1.2, 4);

    const crossed = scrollAndFlush(flush, 227.2);
    expect(crossed.headerProgress).toBe(0);
    expect(crossed.tabsProgress).toBeCloseTo(0.8833, 4);
    expect(crossed.chromeProgress).toBeCloseTo(0.8833, 4);
    expect(crossed.chromeProgress).toBeLessThan(1);
  });

  it("carries downward delta across the stage boundary instead of stopping at chromeProgress 1", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    const start = scrollAndFlush(flush, 215.2);
    expect(start.chromeProgress).toBeCloseTo(0.8, 4);

    const crossed = scrollAndFlush(flush, 255.2);
    expect(crossed.tabsProgress).toBe(1);
    expect(crossed.headerProgress).toBeCloseTo(0.2, 4);
    expect(crossed.chromeProgress).toBeCloseTo(1.2, 4);
    expect(crossed.chromeProgress).toBeGreaterThan(1);
  });

  it("resets progress when scrolling back above sticky start", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    scrollAndFlush(flush, 272);
    const reset = scrollAndFlush(flush, 98);

    expect(reset.isStickyPinned).toBe(false);
    expect(reset.isScrollChromeActive).toBe(false);
    expect(reset.isStickyActive).toBe(false);
    expect(reset.tabsProgress).toBe(0);
    expect(reset.headerProgress).toBe(0);
    expect(reset.chromeProgress).toBe(0);
    expect(reset.sharedChromeProgress).toBe(0);
  });

  it("ignores tiny scroll jitter while sticky", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    scrollAndFlush(flush, 100);
    const jitter = scrollAndFlush(flush, 101);

    expect(jitter.direction).toBe("idle");
    expect(jitter.deltaY).toBe(0);
    expect(jitter.tabsProgress).toBe(0);
    expect(jitter.headerProgress).toBe(0);
    expect(jitter.chromeProgress).toBe(0);
    expect(jitter.sharedChromeProgress).toBe(0);
  });

  it("lands on the correct staged state after a one-frame sticky jump", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker);

    const jumped = scrollAndFlush(flush, 272);
    expect(jumped.tabsProgress).toBe(1);
    expect(jumped.headerProgress).toBeCloseTo(0.5, 4);
    expect(jumped.chromeProgress).toBeCloseTo(1.5, 4);
  });

  it("uses tabsStageDistance for tabs-stage consumption and keeps carryover across header boundary", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    registerStickyChrome(tracker, {
      tabsStageDistancePx: 72,
    });

    scrollAndFlush(flush, 100);
    const halfTabs = scrollAndFlush(flush, 136);
    expect(halfTabs.tabsProgress).toBeCloseTo(0.5, 4);
    expect(halfTabs.headerProgress).toBe(0);
    expect(halfTabs.chromeProgress).toBeCloseTo(0.5, 4);

    const crossedToHeaderStage = scrollAndFlush(flush, 200);
    expect(crossedToHeaderStage.tabsProgress).toBe(1);
    expect(crossedToHeaderStage.headerProgress).toBeCloseTo(0.5, 4);
    expect(crossedToHeaderStage.chromeProgress).toBeCloseTo(1.5, 4);

    const upwardCrossedBackIntoTabs = scrollAndFlush(flush, 160);
    expect(upwardCrossedBackIntoTabs.headerProgress).toBe(0);
    expect(upwardCrossedBackIntoTabs.tabsProgress).toBeCloseTo(0.8333, 4);
    expect(upwardCrossedBackIntoTabs.chromeProgress).toBeCloseTo(0.8333, 4);
  });

  it("freezes to safe defaults when sticky metrics are invalid", () => {
    const { tracker, flush } = createQueuedTracker();
    tracker.subscribe(() => {});
    tracker.setActivationScrollY(100);
    tracker.setStickyChromeMetrics({
      tabsHeight: Number.NaN,
      topBarHeight: 0,
      stickyTopPx: 56,
      safetyBufferPx: Number.POSITIVE_INFINITY,
      naturalBufferPx: Number.NaN,
    });

    const snapshot = scrollAndFlush(flush, 220);

    expect(snapshot.chromeProgress).toBe(0);
    expect(snapshot.sharedChromeProgress).toBe(0);
    expect(snapshot.tabsProgress).toBe(0);
    expect(snapshot.headerProgress).toBe(0);
    expect(snapshot.isStickyPinned).toBe(false);
    expect(snapshot.isScrollChromeActive).toBe(false);
    expect(snapshot.isStickyActive).toBe(false);
    expect(Number.isNaN(snapshot.chromeProgress)).toBe(false);
    expect(Number.isNaN(snapshot.sharedChromeProgress)).toBe(false);
    expect(Number.isNaN(snapshot.tabsProgress)).toBe(false);
    expect(Number.isNaN(snapshot.headerProgress)).toBe(false);
    expect(Number.isFinite(snapshot.chromeProgress)).toBe(true);
    expect(Number.isFinite(snapshot.sharedChromeProgress)).toBe(true);
    expect(Number.isFinite(snapshot.tabsProgress)).toBe(true);
    expect(Number.isFinite(snapshot.headerProgress)).toBe(true);
  });
});
