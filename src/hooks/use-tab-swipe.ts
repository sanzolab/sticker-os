"use client";

import { useRef, useState, useEffect, useLayoutEffect, useCallback, type RefObject } from "react";

type GesturePhase = "idle" | "detecting" | "swiping" | "scrolling";

interface UseTabSwipeParams {
  activeIndex: number;
  tabCount: number;
  containerRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLElement | null>;
  onTabChange: (index: number) => void;
}

interface UseTabSwipeResult {
  isSwiping: boolean;
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
  const [isSwiping, setIsSwiping] = useState(false);

  const phaseRef = useRef<GesturePhase>("idle");
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  const onTabChangeRef = useRef(onTabChange);

  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
    onTabChangeRef.current = onTabChange;
  });

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getClientX = (e: TouchEvent | MouseEvent): number => {
      if ("touches" in e) {
        if (e.type === "touchend" || e.type === "touchcancel") {
          return (e as TouchEvent).changedTouches[0]?.clientX ?? 0;
        }
        return (e as TouchEvent).touches[0]?.clientX ?? 0;
      }
      return (e as MouseEvent).clientX;
    };

    const getClientY = (e: TouchEvent | MouseEvent): number => {
      if ("touches" in e) {
        if (e.type === "touchend" || e.type === "touchcancel") {
          return (e as TouchEvent).changedTouches[0]?.clientY ?? 0;
        }
        return (e as TouchEvent).touches[0]?.clientY ?? 0;
      }
      return (e as MouseEvent).clientY;
    };

    const handleStart = (e: TouchEvent | MouseEvent) => {
      if (!("touches" in e) && (e as MouseEvent).button !== 0) return;

      startXRef.current = getClientX(e);
      startYRef.current = getClientY(e);
      startTimeRef.current = Date.now();
      phaseRef.current = "detecting";
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (phaseRef.current === "idle" || phaseRef.current === "scrolling") return;

      const x = getClientX(e);
      const y = getClientY(e);
      const deltaX = x - startXRef.current;
      const deltaY = y - startYRef.current;

      if (phaseRef.current === "detecting") {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY && absX > THRESHOLD_PX) {
          phaseRef.current = "swiping";
          setIsSwiping(true);
        } else if (absY > absX && absY > THRESHOLD_PX) {
          phaseRef.current = "scrolling";
          return;
        } else {
          return;
        }
      }

      if (phaseRef.current === "swiping") {
        e.preventDefault();

        const clamped = clampOffset(deltaX);

        if (trackRef.current) {
          const basePercent = -(activeIndexRef.current * 100) / tabCount;
          trackRef.current.style.transform = `translateX(calc(${basePercent}% + ${clamped}px))`;
        }
      }
    };

    const handleEnd = (e: TouchEvent | MouseEvent) => {
      if (phaseRef.current !== "swiping") {
        phaseRef.current = "idle";
        return;
      }

      const x = getClientX(e);
      const deltaX = x - startXRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0;

      const containerWidth = container.clientWidth;
      const clamped = clampOffset(deltaX);
      const absOffset = Math.abs(clamped);

      const shouldChange =
        containerWidth > 0 &&
        (absOffset > containerWidth * SNAP_FRACTION || velocity > VELOCITY_THRESHOLD);

      if (shouldChange) {
        if (deltaX < 0 && activeIndexRef.current < tabCount - 1) {
          onTabChangeRef.current(activeIndexRef.current + 1);
        } else if (deltaX > 0 && activeIndexRef.current > 0) {
          onTabChangeRef.current(activeIndexRef.current - 1);
        }
      }

      if (trackRef.current) {
        trackRef.current.style.transform = "";
      }

      setIsSwiping(false);
      phaseRef.current = "idle";
    };

    container.addEventListener("touchstart", handleStart, { passive: true });
    container.addEventListener("touchmove", handleMove, { passive: false });
    container.addEventListener("touchend", handleEnd);
    container.addEventListener("touchcancel", handleEnd);

    container.addEventListener("mousedown", handleStart as EventListener);
    document.addEventListener("mousemove", handleMove as EventListener);
    document.addEventListener("mouseup", handleEnd as EventListener);

    return () => {
      container.removeEventListener("touchstart", handleStart);
      container.removeEventListener("touchmove", handleMove);
      container.removeEventListener("touchend", handleEnd);
      container.removeEventListener("touchcancel", handleEnd);
      container.removeEventListener("mousedown", handleStart as EventListener);
      document.removeEventListener("mousemove", handleMove as EventListener);
      document.removeEventListener("mouseup", handleEnd as EventListener);
    };
  }, [containerRef, tabCount, onTabChange, clampOffset, trackRef]);

  return { isSwiping };
}
