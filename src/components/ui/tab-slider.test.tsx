/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TabSlider } from "./tab-slider";

describe("TabSlider", () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function mockRect() {
      const rawHeight = (this as HTMLElement).dataset.testHeight;
      const height = rawHeight ? Number(rawHeight) : 0;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 100,
        bottom: height,
        width: 100,
        height,
        toJSON: () => ({}),
      } as DOMRect;
    };

    class ResizeObserverMock {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        const entry = {
          target,
          contentRect: target.getBoundingClientRect(),
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
      }

      unobserve() {}

      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("uses only the active panel height for the outer wrapper", async () => {
    const { container, rerender } = render(
      <TabSlider activeIndex={0} tabCount={2} onTabChange={() => {}}>
        <section data-tab-panel data-tab-panel-active="true" data-test-height="120" />
        <section data-tab-panel data-tab-panel-active="false" data-test-height="800" />
      </TabSlider>,
    );

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).not.toBeNull();

    await waitFor(() => {
      expect(wrapper?.style.height).toBe("120px");
    });

    rerender(
      <TabSlider activeIndex={1} tabCount={2} onTabChange={() => {}}>
        <section data-tab-panel data-tab-panel-active="false" data-test-height="120" />
        <section data-tab-panel data-tab-panel-active="true" data-test-height="800" />
      </TabSlider>,
    );

    await waitFor(() => {
      expect(wrapper?.style.height).toBe("800px");
    });
  });
});

