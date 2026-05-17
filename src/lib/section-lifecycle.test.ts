/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

const mockListeners = new Set<() => void>();
let mockDirection: "up" | "down" | "idle" = "idle";

const mockTracker = {
  subscribe: (cb: () => void) => {
    mockListeners.add(cb);
    return () => mockListeners.delete(cb);
  },
  getSnapshot: () => ({
    scrollY: 0,
    deltaY: 0,
    direction: mockDirection,
    chromeProgress: 0,
    sharedChromeProgress: 0,
    tabsProgress: 0,
    headerProgress: 0,
    isStickyPinned: false,
    isScrollChromeActive: false,
    isStickyActive: false,
  }),
  getContainer: () => window,
  setActivationScrollY: vi.fn(),
  setStickyChromeMetrics: vi.fn(),
};

vi.mock("./scroll-visibility", () => ({
  getPageScrollVisibilityTracker: () => mockTracker,
}));

import { SectionLifecycleRegistry } from "./section-lifecycle";

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements = new Set<Element>();
  static instances: MockIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    void options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

class MockResizeObserver {
  elements = new Set<Element>();
  callback: ResizeObserverCallback;
  static instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  disconnect() {
    this.elements.clear();
  }

  trigger(entries: ResizeObserverEntry[]) {
    this.callback(entries, this as unknown as ResizeObserver);
  }
}

function makeEntry(
  target: Element,
  isIntersecting: boolean,
): IntersectionObserverEntry {
  return {
    target,
    isIntersecting,
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    time: Date.now(),
  } as IntersectionObserverEntry;
}

describe("SectionLifecycleRegistry", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
    MockResizeObserver.instances.length = 0;
    mockListeners.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets initial phase to visible with skipEnter for elements in viewport", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s1";
    document.body.appendChild(el);

    // In viewport
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: { phase: string; skipEnter?: boolean }[] = [];
    registry.register("s1", () => el, (phase, opts) => {
      phases.push({ phase, skipEnter: opts?.skipEnter });
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]!.phase).toBe("visible");
    expect(phases[0]!.skipEnter).toBe(true);

    document.body.removeChild(el);
  });

  it("sets initial phase to hidden for elements in near margin but off-screen", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s2";
    document.body.appendChild(el);

    // Below viewport but within 600px idle near margin
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 100,
      bottom: window.innerHeight + 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: { phase: string; skipEnter?: boolean }[] = [];
    registry.register("s2", () => el, (phase, opts) => {
      phases.push({ phase, skipEnter: opts?.skipEnter });
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]!.phase).toBe("hidden");
    expect(phases[0]!.skipEnter).toBe(false);

    document.body.removeChild(el);
  });

  it("sets initial phase to placeholder for elements far away", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s3";
    document.body.appendChild(el);

    // Far below viewport
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 2000,
      bottom: window.innerHeight + 2200,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 2000,
      toJSON: () => "",
    } as DOMRect);

    const phases: string[] = [];
    registry.register("s3", () => el, (phase) => {
      phases.push(phase);
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]).toBe("placeholder");

    document.body.removeChild(el);
  });

  it("transitions placeholder -> hidden when near observer reports intersecting", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s4";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 2000,
      bottom: window.innerHeight + 2200,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 2000,
      toJSON: () => "",
    } as DOMRect);

    const phases: string[] = [];
    registry.register("s4", () => el, (phase) => {
      phases.push(phase);
    });

    expect(phases[0]).toBe("placeholder");

    const nearObserver = MockIntersectionObserver.instances[0];
    expect(nearObserver).toBeDefined();
    nearObserver!.trigger([makeEntry(el, true)]);

    expect(phases).toContain("hidden");

    document.body.removeChild(el);
  });

  it("transitions hidden -> visible when visible observer reports intersecting", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s5";
    document.body.appendChild(el);

    // Just below viewport, in near margin
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 100,
      bottom: window.innerHeight + 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: { phase: string; opts?: { skipEnter?: boolean } }[] = [];
    registry.register("s5", () => el, (phase, opts) => {
      phases.push({ phase, opts });
    });

    expect(phases[0]!.phase).toBe("hidden");

    const visibleObserver = MockIntersectionObserver.instances[1];
    expect(visibleObserver).toBeDefined();
    visibleObserver!.trigger([makeEntry(el, true)]);

    const visiblePhase = phases.find((p) => p.phase === "visible");
    expect(visiblePhase).toBeDefined();
    expect(visiblePhase!.opts?.skipEnter).toBeFalsy();

    document.body.removeChild(el);
  });

  it("transitions visible -> hidden when leaving viewport", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s6";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: string[] = [];
    registry.register("s6", () => el, (phase) => {
      phases.push(phase);
    });

    expect(phases[0]).toBe("visible");

    const visibleObserver = MockIntersectionObserver.instances[1];
    visibleObserver!.trigger([makeEntry(el, false)]);

    expect(phases[phases.length - 1]).toBe("hidden");

    document.body.removeChild(el);
  });

  it("debounces placeholder transition when leaving near margin", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s7";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 100,
      bottom: window.innerHeight + 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: string[] = [];
    registry.register("s7", () => el, (phase) => {
      phases.push(phase);
    });

    const nearObserver = MockIntersectionObserver.instances[0];

    // First leave near margin
    nearObserver!.trigger([makeEntry(el, false)]);
    expect(phases[phases.length - 1]).toBe("hidden");

    // Not yet timed out
    vi.advanceTimersByTime(200);
    expect(phases[phases.length - 1]).toBe("hidden");

    // Now timed out
    vi.advanceTimersByTime(250);
    expect(phases[phases.length - 1]).toBe("placeholder");

    document.body.removeChild(el);
  });

  it("cancels unmount timer when re-entering near margin", () => {
    const registry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s8";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 100,
      bottom: window.innerHeight + 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: window.innerHeight + 100,
      toJSON: () => "",
    } as DOMRect);

    const phases: string[] = [];
    registry.register("s8", () => el, (phase) => {
      phases.push(phase);
    });

    const nearObserver = MockIntersectionObserver.instances[0];

    nearObserver!.trigger([makeEntry(el, false)]);
    vi.advanceTimersByTime(200);

    // Re-enter before timeout
    nearObserver!.trigger([makeEntry(el, true)]);
    vi.advanceTimersByTime(500);

    // Should never have transitioned to placeholder
    expect(phases).not.toContain("placeholder");

    document.body.removeChild(el);
  });

  it("caches and returns section heights", () => {
    const registry = new SectionLifecycleRegistry();
    expect(registry.getHeight("h1")).toBeUndefined();
    registry.setHeight("h1", 320);
    expect(registry.getHeight("h1")).toBe(320);
  });

  it("persists collapsed state across registrations", () => {
    const registry = new SectionLifecycleRegistry();
    expect(registry.getCollapsed("c1")).toBe(true);
    registry.setCollapsed("c1", false);
    expect(registry.getCollapsed("c1")).toBe(false);
  });

  it("rebuilds observers when scroll direction changes", () => {
    const firstRegistry = new SectionLifecycleRegistry();
    void firstRegistry;
    const beforeCount = MockIntersectionObserver.instances.length;

    // Change direction via tracker notification
    mockDirection = "down";
    mockListeners.forEach((cb) => cb());

    const afterCount = MockIntersectionObserver.instances.length;
    expect(afterCount).toBeGreaterThan(beforeCount);
    mockDirection = "idle";
  });

  it("gracefully degrades when IntersectionObserver is unavailable", () => {
    const OriginalIO = globalThis.IntersectionObserver;
    // @ts-expect-error remove constructor
    globalThis.IntersectionObserver = undefined;

    const fallbackRegistry = new SectionLifecycleRegistry();
    const el = document.createElement("section");
    el.dataset.sectionId = "s9";

    const phases: { phase: string; opts?: { skipEnter?: boolean } }[] = [];
    fallbackRegistry.register("s9", () => el, (phase, opts) => {
      phases.push({ phase, opts });
    });

    expect(phases[0]!.phase).toBe("visible");
    expect(phases[0]!.opts?.skipEnter).toBe(true);

    globalThis.IntersectionObserver = OriginalIO;
  });
});
