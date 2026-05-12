/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
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

  it("forces the header visible at the top and applies deadzone and clamped progress rules", () => {
    const rafQueue: FrameRequestCallback[] = [];
    const tracker = createScrollVisibilityTracker({
      container: window,
      deadzonePx: 3,
      revealDistancePx: 40,
      topVisibleOffsetPx: 2,
      scheduleFrame: (callback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      },
      cancelFrame: vi.fn(),
    });

    tracker.subscribe(() => {});

    const flush = (): ScrollVisibilitySnapshot => {
      rafQueue.shift()?.(0);
      return tracker.getSnapshot();
    };

    setWindowScrollY(80);
    window.dispatchEvent(new Event("scroll"));
    expect(flush().hiddenProgress).toBeGreaterThan(0);

    const progressAfterDown = tracker.getSnapshot().hiddenProgress;
    setWindowScrollY(82);
    window.dispatchEvent(new Event("scroll"));
    expect(flush().hiddenProgress).toBe(progressAfterDown);

    setWindowScrollY(280);
    window.dispatchEvent(new Event("scroll"));
    expect(flush().hiddenProgress).toBe(1);

    setWindowScrollY(120);
    window.dispatchEvent(new Event("scroll"));
    expect(flush().hiddenProgress).toBeLessThan(1);

    setWindowScrollY(0);
    window.dispatchEvent(new Event("scroll"));
    const atTop = flush();
    expect(atTop.hiddenProgress).toBe(0);
    expect(atTop.direction).toBe("up");
  });
});
