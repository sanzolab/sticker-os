/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTabSwipe } from "./use-tab-swipe";

interface PointerDispatchResult {
  preventDefault: ReturnType<typeof vi.fn>;
}

type PointerMethods = HTMLDivElement & {
  hasPointerCapture: ReturnType<typeof vi.fn>;
  setPointerCapture: ReturnType<typeof vi.fn>;
  releasePointerCapture: ReturnType<typeof vi.fn>;
};

function createContainer(): { container: HTMLDivElement; track: HTMLDivElement } {
  const container = document.createElement("div");
  const track = document.createElement("div");
  container.appendChild(track);

  Object.defineProperty(container, "clientWidth", {
    value: 400,
    writable: true,
    configurable: true,
  });

  // jsdom may not fully implement pointer capture methods.
  (container as HTMLDivElement & {
    hasPointerCapture: (pointerId: number) => boolean;
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  }).hasPointerCapture = vi.fn(() => false);
  (container as HTMLDivElement & {
    setPointerCapture: (pointerId: number) => void;
  }).setPointerCapture = vi.fn();
  (container as HTMLDivElement & {
    releasePointerCapture: (pointerId: number) => void;
  }).releasePointerCapture = vi.fn();

  return { container, track };
}

function getPointerMethods(container: HTMLDivElement): PointerMethods {
  return container as PointerMethods;
}

function dispatchPointerEvent(
  target: HTMLElement | Document,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  {
    clientX,
    clientY,
    pointerId = 1,
    pointerType = "touch",
    button = 0,
  }: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    pointerType?: string;
    button?: number;
  },
): PointerDispatchResult {
  const preventDefault = vi.fn();
  const event =
    typeof PointerEvent !== "undefined"
      ? new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId,
          pointerType,
          button,
        })
      : (new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          button,
        }) as MouseEvent & {
          pointerId: number;
          pointerType: string;
        });

  if (!("pointerId" in event)) {
    Object.defineProperty(event, "pointerId", { value: pointerId, configurable: true });
  }

  if (!("pointerType" in event)) {
    Object.defineProperty(event, "pointerType", { value: pointerType, configurable: true });
  }

  Object.defineProperty(event, "preventDefault", {
    value: preventDefault,
    configurable: true,
  });

  target.dispatchEvent(event);
  return { preventDefault };
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
    vi.restoreAllMocks();
  });

  function render(activeIndex = 0, tabCount = 4) {
    const containerRef = { current: container } as const;
    const trackRef = { current: track } as const;

    const hook = renderHook(
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

    act(() => {});
    return hook;
  }

  it("changes to next tab on a normal left swipe", () => {
    render(0, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200 });
      dispatchPointerEvent(container, "pointermove", { clientX: -80, clientY: 204 });
      dispatchPointerEvent(container, "pointerup", { clientX: -80, clientY: 204 });
    });

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith(1);
  });

  it("changes to previous tab on a normal right swipe", () => {
    render(2, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200 });
      dispatchPointerEvent(container, "pointermove", { clientX: 280, clientY: 198 });
      dispatchPointerEvent(container, "pointerup", { clientX: 280, clientY: 198 });
    });

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith(1);
  });

  it("does not change tab for a short drag and settles back", () => {
    const { result } = render(1, 4);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_120);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200 });
      dispatchPointerEvent(container, "pointermove", { clientX: 120, clientY: 202 });
      dispatchPointerEvent(container, "pointerup", { clientX: 120, clientY: 202 });
    });

    expect(onTabChange).not.toHaveBeenCalled();
    expect(result.current.isSettling).toBe(true);
    expect(result.current.transitionEnabled).toBe(true);
    expect(result.current.dragOffset).toBe(0);
  });

  it("locks to vertical scroll and does not prevent default", () => {
    const { result } = render(1, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200 });
    });

    const move = dispatchPointerEvent(container, "pointermove", {
      clientX: 104,
      clientY: 224,
    });

    expect(move.preventDefault).not.toHaveBeenCalled();
    expect(getPointerMethods(container).setPointerCapture).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragOffset).toBe(0);
  });

  it("keeps vertical lock for the entire gesture even with later horizontal jitter", () => {
    render(1, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 7 });
    });

    const verticalMove = dispatchPointerEvent(container, "pointermove", {
      clientX: 103,
      clientY: 225,
      pointerId: 7,
    });
    const jitterMove = dispatchPointerEvent(container, "pointermove", {
      clientX: 170,
      clientY: 228,
      pointerId: 7,
    });

    act(() => {
      dispatchPointerEvent(container, "pointerup", { clientX: 170, clientY: 228, pointerId: 7 });
    });

    expect(verticalMove.preventDefault).not.toHaveBeenCalled();
    expect(jitterMove.preventDefault).not.toHaveBeenCalled();
    expect(getPointerMethods(container).setPointerCapture).not.toHaveBeenCalled();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("prevents default only after horizontal lock is confirmed", () => {
    const { result } = render(1, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200 });
    });

    let move: PointerDispatchResult = { preventDefault: vi.fn() };
    act(() => {
      move = dispatchPointerEvent(container, "pointermove", {
        clientX: 130,
        clientY: 203,
      });
    });

    expect(move.preventDefault).toHaveBeenCalled();
    expect(getPointerMethods(container).setPointerCapture).toHaveBeenCalledTimes(1);
    expect(result.current.isDragging).toBe(true);
  });

  it("does not interrupt settle on pointerdown and only interrupts after horizontal lock", () => {
    const { result } = render(1, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 1 });
      dispatchPointerEvent(container, "pointermove", { clientX: 130, clientY: 202, pointerId: 1 });
      dispatchPointerEvent(container, "pointerup", { clientX: 130, clientY: 202, pointerId: 1 });
    });

    expect(result.current.isSettling).toBe(true);

    const computedStyleSpy = vi.spyOn(window, "getComputedStyle").mockReturnValue({
      transform: "matrix(1, 0, 0, 1, -350, 0)",
    } as CSSStyleDeclaration);
    getPointerMethods(container).setPointerCapture.mockClear();

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 200, clientY: 200, pointerId: 2 });
    });

    expect(computedStyleSpy).not.toHaveBeenCalled();
    expect(getPointerMethods(container).setPointerCapture).not.toHaveBeenCalled();
    expect(result.current.isSettling).toBe(true);

    act(() => {
      dispatchPointerEvent(container, "pointermove", { clientX: 220, clientY: 200, pointerId: 2 });
    });

    expect(computedStyleSpy).toHaveBeenCalledTimes(1);
    expect(getPointerMethods(container).setPointerCapture).toHaveBeenCalledTimes(1);
    expect(result.current.transitionEnabled).toBe(false);
    expect(result.current.isSettling).toBe(false);
    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragOffset).toBeCloseTo(70, 3);
  });

  it("applies symmetric edge resistance and snap-back at first and last tabs", () => {
    const first = render(0, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 1 });
      dispatchPointerEvent(container, "pointermove", { clientX: 200, clientY: 200, pointerId: 1 });
    });

    const firstEdgeOffset = first.result.current.dragOffset;
    expect(firstEdgeOffset).toBeCloseTo(20, 3);

    act(() => {
      dispatchPointerEvent(container, "pointerup", { clientX: 200, clientY: 200, pointerId: 1 });
    });

    expect(onTabChange).not.toHaveBeenCalled();
    expect(first.result.current.isSettling).toBe(true);

    first.unmount();
    document.body.innerHTML = "";
    const elements = createContainer();
    container = elements.container;
    track = elements.track;
    document.body.appendChild(container);

    const last = render(3, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 2 });
      dispatchPointerEvent(container, "pointermove", { clientX: 0, clientY: 200, pointerId: 2 });
    });

    const lastEdgeOffset = last.result.current.dragOffset;
    expect(lastEdgeOffset).toBeCloseTo(-20, 3);
    expect(Math.abs(lastEdgeOffset)).toBeCloseTo(Math.abs(firstEdgeOffset), 3);

    act(() => {
      dispatchPointerEvent(container, "pointerup", { clientX: 0, clientY: 200, pointerId: 2 });
    });

    expect(onTabChange).not.toHaveBeenCalled();
    expect(last.result.current.isSettling).toBe(true);
  });

  it("does not stack duplicate tab changes across rapid sequential swipes", () => {
    const { rerender, result } = render(0, 4);

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 1 });
      dispatchPointerEvent(container, "pointermove", { clientX: -80, clientY: 200, pointerId: 1 });
      dispatchPointerEvent(container, "pointerup", { clientX: -80, clientY: 200, pointerId: 1 });
    });

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenLastCalledWith(1);

    rerender({ ai: 1, tc: 4 });
    act(() => {
      result.current.handleTrackTransitionEnd(new Event("transitionend"));
    });

    act(() => {
      dispatchPointerEvent(container, "pointerdown", { clientX: 100, clientY: 200, pointerId: 2 });
      dispatchPointerEvent(container, "pointermove", { clientX: -80, clientY: 200, pointerId: 2 });
      dispatchPointerEvent(container, "pointerup", { clientX: -80, clientY: 200, pointerId: 2 });
    });

    expect(onTabChange).toHaveBeenCalledTimes(2);
    expect(onTabChange).toHaveBeenLastCalledWith(2);
  });
});
