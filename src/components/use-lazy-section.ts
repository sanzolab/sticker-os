"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

export function useLazySection(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const revealedRef = useRef(false);

  const [shouldRender, setShouldRender] = useState(false);
  const [enter, setEnter] = useState(false);

  const scheduleEnter = useCallback(() => {
    if (enter || rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setEnter(true);
    });
  }, [enter]);

  const reveal = useCallback((animate: boolean) => {
    if (revealedRef.current) return;

    revealedRef.current = true;
    setShouldRender(true);

    if (!animate) {
      setEnter(true);
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !shouldRender || enter) return;

    scheduleEnter();
  }, [enabled, enter, scheduleEnter, shouldRender]);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;

    if (!enabled || shouldRender || !node) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      reveal(false);
      return;
    }

    const rootMargin = 600;
    const rect = node.getBoundingClientRect();
    const withinMargin =
      rect.bottom >= -rootMargin &&
      rect.top <= window.innerHeight + rootMargin;

    if (withinMargin) {
      reveal(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        reveal(true);
        observer.disconnect();

        if (observerRef.current === observer) {
          observerRef.current = null;
        }
      },
      { rootMargin: `${rootMargin}px` },
    );

    observer.observe(node);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      if (observerRef.current === observer) {
        observerRef.current = null;
      }
    };
  }, [enabled, reveal, shouldRender]);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [],
  );

  return { ref, shouldRender, enter };
}
