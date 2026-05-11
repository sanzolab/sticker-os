/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useTabSwipe } from "./use-tab-swipe";

interface FakeTouch {
  clientX: number;
  clientY: number;
}

function createContainer(): {
  container: HTMLDivElement;
  track: HTMLDivElement;
} {
  const container = document.createElement("div");
  const track = document.createElement("div");
  container.appendChild(track);

  Object.defineProperty(container, "clientWidth", {
    value: 400,
    writable: true,
    configurable: true,
  });

  return { container, track };
}

function dispatchTouchEvent(
  el: HTMLElement,
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  clientX: number,
  clientY: number,
): { event: Event; preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  const touch: FakeTouch = { clientX, clientY };

  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: FakeTouch[];
    changedTouches: FakeTouch[];
    preventDefault: () => void;
  };

  event.touches =
    type === "touchend" || type === "touchcancel" ? [] : [touch];
  event.changedTouches = [touch];
  event.preventDefault = preventDefault;

  el.dispatchEvent(event);

  return { event, preventDefault };
}

function dispatchMouseEvent(
  el: HTMLElement | Document,
  type: "mousedown" | "mouseup" | "mousemove",
  clientX: number,
  clientY: number,
  button = 0,
): { event: MouseEvent; preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();

  const event = new MouseEvent(type, {
    clientX,
    clientY,
    button,
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, "preventDefault", {
    value: preventDefault,
    writable: true,
  });

  el.dispatchEvent(event);

  return { event, preventDefault };
}

describe("useTabSwipe", () => {
  let container: HTMLDivElement;
  let track: HTMLDivElement;
  let onTabChange: ReturnType<typeof vi.fn<(index: number) => void>>;

  beforeEach(() => {
    const elements = createContainer();
    container = elements.container;
    track = elements.track;
    onTabChange = vi.fn<(index: number) => void>();
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  function render(activeIndex = 0, tabCount = 4) {
    const containerRef = { current: container } as const;
    const trackRef = { current: track } as const;

    return renderHook(
      ({ ai, tc }: { ai: number; tc: number }) =>
        useTabSwipe({
          activeIndex: ai,
          tabCount: tc,
          containerRef,
          trackRef,
          onTabChange,
        }),
      {
        initialProps: { ai: activeIndex, tc: tabCount },
      },
    );
  }

  describe("initial state", () => {
    it("returns isSwiping as false", () => {
      const { result } = render();
      expect(result.current.isSwiping).toBe(false);
    });
  });

  describe("touch gesture detection", () => {
    it("enters swiping phase on horizontal drag > 8px", () => {
      const { result } = render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 202);
      });

      expect(result.current.isSwiping).toBe(true);
    });

    it("enters scrolling phase on vertical drag > 8px", () => {
      const { result } = render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      act(() => {
        dispatchTouchEvent(container, "touchmove", 102, 220);
      });

      expect(result.current.isSwiping).toBe(false);
    });

    it("stays detecting when drag is < 8px", () => {
      const { result } = render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      act(() => {
        dispatchTouchEvent(container, "touchmove", 106, 204);
      });

      expect(result.current.isSwiping).toBe(false);
    });

    it("calls preventDefault on horizontal swipe move", () => {
      render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      const { preventDefault } = (() => {
        let result: ReturnType<typeof dispatchTouchEvent> = {
          event: new Event("touchmove"),
          preventDefault: vi.fn(),
        };
        act(() => {
          result = dispatchTouchEvent(container, "touchmove", 120, 202);
        });
        return result;
      })();

      expect(preventDefault).toHaveBeenCalled();
    });

    it("does not call preventDefault when entering scrolling phase", () => {
      render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      const { preventDefault } = (() => {
        let result = dispatchTouchEvent(container, "touchmove", 102, 220);
        result = result;
        return result;
      })();

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("swipe direction", () => {
    it("horizontal swipe takes precedence when both axes exceed threshold", () => {
      const { result } = render();

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 215);
      });

      expect(result.current.isSwiping).toBe(true);
    });
  });

  describe("snap behavior on release", () => {
    it("changes to next tab when drag exceeds 35% of container width", () => {
      render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", -50, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", -50, 202);
      });

      expect(onTabChange).toHaveBeenCalledWith(1);
    });

    it("snaps back when drag is less than 35%", () => {
      const now = vi.spyOn(Date, "now");
      let t = 0;
      now.mockImplementation(() => t);

      render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      t = 300;
      act(() => {
        dispatchTouchEvent(container, "touchmove", -30, 202);
      });

      t = 600;
      act(() => {
        dispatchTouchEvent(container, "touchend", -30, 202);
      });

      expect(onTabChange).not.toHaveBeenCalled();
      now.mockRestore();
    });

    it("swipes right to previous tab", () => {
      render(1, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 260, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", 260, 202);
      });

      expect(onTabChange).toHaveBeenCalledWith(0);
    });
  });

  describe("edge rubber-banding", () => {
    it("does not tab change past first tab", () => {
      render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 200, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", 200, 202);
      });

      expect(onTabChange).not.toHaveBeenCalled();
    });

    it("does not tab change past last tab", () => {
      render(3, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 0, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", 0, 202);
      });

      expect(onTabChange).not.toHaveBeenCalled();
    });

    it("applies clamped transform to track during edge drag", () => {
      render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });

      // First move: detect swipe
      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 202);
      });

      // Second move: drag further right to trigger rubber-band
      act(() => {
        dispatchTouchEvent(container, "touchmove", 200, 202);
      });

      // At tab 0 dragging right 100px from start (100px extra) → clamped = 100 * 0.2 = 20px
      expect(track.style.transform).toContain("20px");
    });
  });

  describe("touch end cleanup", () => {
    it("clears track transform on touchend", () => {
      render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 140, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 180, 202);
      });

      expect(track.style.transform).not.toBe("");

      act(() => {
        dispatchTouchEvent(container, "touchend", 180, 202);
      });

      expect(track.style.transform).toBe("");
    });

    it("resets isSwiping on touchend", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 202);
      });
      expect(result.current.isSwiping).toBe(true);

      act(() => {
        dispatchTouchEvent(container, "touchend", 120, 202);
      });

      expect(result.current.isSwiping).toBe(false);
    });
  });

  describe("touch cancel", () => {
    it("handles touchcancel like touchend", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchcancel", 120, 202);
      });

      expect(result.current.isSwiping).toBe(false);
      expect(track.style.transform).toBe("");
    });
  });

  describe("mouse support", () => {
    it("enters swiping phase on mouse drag > 8px with left button", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchMouseEvent(container, "mousedown", 100, 200);
      });
      act(() => {
        dispatchMouseEvent(document, "mousemove", 120, 202);
      });

      expect(result.current.isSwiping).toBe(true);
    });

    it("ignores mousedown with non-left button", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchMouseEvent(container, "mousedown", 100, 200, 2);
      });
      act(() => {
        dispatchMouseEvent(document, "mousemove", 120, 202);
      });

      expect(result.current.isSwiping).toBe(false);
    });

    it("resets isSwiping on mouseup", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchMouseEvent(container, "mousedown", 100, 200);
      });
      act(() => {
        dispatchMouseEvent(document, "mousemove", 120, 202);
      });
      expect(result.current.isSwiping).toBe(true);

      act(() => {
        dispatchMouseEvent(document, "mouseup", 120, 202);
      });

      expect(result.current.isSwiping).toBe(false);
    });
  });

  describe("multiple sequential gestures", () => {
    it("handles multiple swipes in sequence", () => {
      const { result } = render(0, 4);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 120, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", 120, 202);
      });
      expect(result.current.isSwiping).toBe(false);

      act(() => {
        dispatchTouchEvent(container, "touchstart", 100, 200);
      });
      act(() => {
        dispatchTouchEvent(container, "touchmove", 80, 202);
      });
      act(() => {
        dispatchTouchEvent(container, "touchend", 80, 202);
      });
      expect(result.current.isSwiping).toBe(false);
    });
  });
});
