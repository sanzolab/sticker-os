"use client";

import { useRef, useState, useEffect, useLayoutEffect, useCallback, type RefObject } from "react";

type GesturePhase = "idle" | "detecting" | "dragging" | "scrolling";

interface UseTabSwipeParams {
  activeIndex: number;
  tabCount: number;
  containerRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLElement | null>;
  onTabChange: (index: number) => void;
}

interface UseTabSwipeResult {
  dragOffset: number;
  isDragging: boolean;
  isSettling: boolean;
  transitionEnabled: boolean;
  handleTrackTransitionEnd: (event: TransitionEvent | Event) => void;
}

const THRESHOLD_PX = 8;
const VELOCITY_THRESHOLD = 0.3;
const SNAP_FRACTION = 0.35;
const RUBBER_BAND_FACTOR = 0.2;

export function useTabSwipe({
  activeIndex,
  tabCount,
  containerRef,
  trackRef,
  onTabChange,
}: UseTabSwipeParams): UseTabSwipeResult {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const phaseRef = useRef<GesturePhase>("idle");
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  const onTabChangeRef = useRef(onTabChange);
  const dragOffsetRef = useRef(0);
  const isSettlingRef = useRef(false);

  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
    onTabChangeRef.current = onTabChange;
  });

  useEffect(() => {
    isSettlingRef.current = isSettling;
  }, [isSettling]);

  const setDragOffsetSync = useCallback((nextOffset: number) => {
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }, []);

  const setIsSettlingSync = useCallback((nextSettling: boolean) => {
    isSettlingRef.current = nextSettling;
    setIsSettling(nextSettling);
  }, []);

  const clampOffset = useCallback(
    (rawOffset: number) => {
      const currentIndex = activeIndexRef.current;

      if (currentIndex === 0 && rawOffset > 0) {
        return rawOffset * RUBBER_BAND_FACTOR;
      }

      if (currentIndex === tabCount - 1 && rawOffset < 0) {
        return rawOffset * RUBBER_BAND_FACTOR;
      }

      return rawOffset;
    },
    [tabCount],
  );

  const readTranslateX = useCallback((element: HTMLElement): number => {
    const style = window.getComputedStyle(element);
    const { transform } = style;
    if (!transform || transform === "none") return 0;

    if (typeof DOMMatrixReadOnly !== "undefined") {
      try {
        return new DOMMatrixReadOnly(transform).m41;
      } catch {
        // Fall through to manual parsing.
      }
    }

    const matrixMatch = transform.match(/^matrix\((.+)\)$/);
    if (matrixMatch) {
      const values = matrixMatch[1]?.split(",").map((value) => Number.parseFloat(value.trim())) ?? [];
      return values[4] ?? 0;
    }

    const matrix3dMatch = transform.match(/^matrix3d\((.+)\)$/);
    if (matrix3dMatch) {
      const values = matrix3dMatch[1]?.split(",").map((value) => Number.parseFloat(value.trim())) ?? [];
      return values[12] ?? 0;
    }

    return 0;
  }, []);

  const interruptTransition = useCallback(() => {
    if (!isSettlingRef.current) return;

    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const visualTranslateX = readTranslateX(track);
    const baseTranslateX = -activeIndexRef.current * container.clientWidth;
    const relativeOffset = visualTranslateX - baseTranslateX;

    // Freeze the visual position as a relative drag offset before the next gesture frame.
    setTransitionEnabled(false);
    setIsSettlingSync(false);
    setDragOffsetSync(relativeOffset);
  }, [containerRef, readTranslateX, setDragOffsetSync, setIsSettlingSync, trackRef]);

  const endInteraction = useCallback(
    (event: PointerEvent) => {
      const container = containerRef.current;
      const activePointerId = pointerIdRef.current ?? 0;

      if (phaseRef.current === "dragging") {
        const deltaX = event.clientX - startXRef.current;
        const elapsed = Date.now() - startTimeRef.current;
        const velocity = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0;
        const absOffset = Math.abs(dragOffsetRef.current);
        const containerWidth = container?.clientWidth ?? 0;

        const shouldChange =
          containerWidth > 0 &&
          (absOffset > containerWidth * SNAP_FRACTION || velocity > VELOCITY_THRESHOLD);

        let didChangeTab = false;

        if (shouldChange) {
          if (dragOffsetRef.current < 0 && activeIndexRef.current < tabCount - 1) {
            onTabChangeRef.current(activeIndexRef.current + 1);
            didChangeTab = true;
          } else if (dragOffsetRef.current > 0 && activeIndexRef.current > 0) {
            onTabChangeRef.current(activeIndexRef.current - 1);
            didChangeTab = true;
          }
        }

        setIsDragging(false);
        setTransitionEnabled(true);
        setIsSettlingSync(true);
        setDragOffsetSync(0);

        if (!didChangeTab && absOffset < 0.01) {
          setIsSettlingSync(false);
        }
      }

      if (
        container &&
        typeof container.hasPointerCapture === "function" &&
        container.hasPointerCapture(activePointerId)
      ) {
        container.releasePointerCapture(activePointerId);
      }

      pointerIdRef.current = null;
      phaseRef.current = "idle";
    },
    [containerRef, setDragOffsetSync, setIsSettlingSync, tabCount],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getPointerId = (event: PointerEvent) => {
      if (typeof event.pointerId === "number") return event.pointerId;
      return 0;
    };

    const isActivePointer = (event: PointerEvent) =>
      pointerIdRef.current !== null && getPointerId(event) === pointerIdRef.current;

    const handlePointerDown = (event: PointerEvent) => {
      if (pointerIdRef.current !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerIdRef.current = getPointerId(event);
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      startOffsetRef.current = dragOffsetRef.current;
      startTimeRef.current = Date.now();
      phaseRef.current = "detecting";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isActivePointer(event)) return;
      if (phaseRef.current === "idle" || phaseRef.current === "scrolling") return;

      const x = event.clientX;
      const y = event.clientY;
      const deltaX = x - startXRef.current;
      const deltaY = y - startYRef.current;

      if (phaseRef.current === "detecting") {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY && absX > THRESHOLD_PX) {
          interruptTransition();
          startOffsetRef.current = dragOffsetRef.current;
          phaseRef.current = "dragging";
          setTransitionEnabled(false);
          setIsSettlingSync(false);
          setIsDragging(true);
          if (typeof container.setPointerCapture === "function") {
            container.setPointerCapture(getPointerId(event));
          }
        } else if (absY > absX && absY > THRESHOLD_PX) {
          phaseRef.current = "scrolling";
          return;
        } else {
          return;
        }
      }

      if (phaseRef.current === "dragging") {
        if (event.cancelable) {
          event.preventDefault();
        }
        const rawOffset = startOffsetRef.current + deltaX;
        const clamped = clampOffset(rawOffset);
        setDragOffsetSync(clamped);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isActivePointer(event)) return;
      endInteraction(event);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (!isActivePointer(event)) return;
      endInteraction(event);
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove, { passive: false });
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerCancel);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [clampOffset, containerRef, endInteraction, interruptTransition, setDragOffsetSync, setIsSettlingSync]);

  const handleTrackTransitionEnd = useCallback((event: TransitionEvent | Event) => {
    const transitionEvent = event as TransitionEvent;
    if (transitionEvent.propertyName && transitionEvent.propertyName !== "transform") {
      return;
    }
    setIsSettlingSync(false);
  }, [setIsSettlingSync]);

  return {
    dragOffset,
    isDragging,
    isSettling,
    transitionEnabled,
    handleTrackTransitionEnd,
  };
}
