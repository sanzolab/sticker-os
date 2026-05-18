"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSectionLifecycleRegistry,
  type SectionPhase,
  type SectionLifecycleRegistry,
} from "@/lib/section-lifecycle";

export function useSectionLifecycle(
  id: string,
  enabled: boolean,
  externalRegistry?: SectionLifecycleRegistry,
) {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhaseState] = useState<SectionPhase>("placeholder");
  const [height, setHeight] = useState<number | undefined>(() =>
    (externalRegistry ?? getSectionLifecycleRegistry()).getHeight(id),
  );
  const [skipEnter, setSkipEnter] = useState(false);
  const everVisibleRef = useRef(false);

  const handlePhaseChange = useCallback(
    (nextPhase: SectionPhase, opts?: { skipEnter?: boolean }) => {
      setPhaseState(nextPhase);
      if (opts?.skipEnter) setSkipEnter(true);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    const registry = externalRegistry ?? getSectionLifecycleRegistry();
    return registry.register(id, () => ref.current, handlePhaseChange);
  }, [id, enabled, handlePhaseChange, externalRegistry]);

  useEffect(() => {
    if (phase !== "visible" && phase !== "hidden") return;
    const node = ref.current;
    if (!node) return;

    const registry = externalRegistry ?? getSectionLifecycleRegistry();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (h > 0) {
          registry.setHeight(id, h);
          setHeight(h);
        }
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [id, phase, externalRegistry]);

  useEffect(() => {
    if (phase === "visible") {
      if (!everVisibleRef.current) {
        everVisibleRef.current = true;
      } else {
        setSkipEnter(false);
      }
    }
  }, [phase]);

  return { ref, phase, height, skipEnter };
}
