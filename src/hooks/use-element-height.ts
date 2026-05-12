"use client";

import { useEffect, useState, type RefObject } from "react";

type UseElementHeightOptions = {
  ref: RefObject<HTMLElement | null>;
};

export function useElementHeight({ ref }: UseElementHeightOptions) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number | null = null;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      setHeight(element.getBoundingClientRect().height || 0);
    };

    const scheduleMeasure = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(element);
    } else {
      window.addEventListener("resize", scheduleMeasure);
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
      if (!observer) {
        window.removeEventListener("resize", scheduleMeasure);
      }
    };
  }, [ref]);

  return height;
}
