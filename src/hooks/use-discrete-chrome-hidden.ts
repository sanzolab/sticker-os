"use client";

import { useState } from "react";

const HIDE_THRESHOLD = 0.55;
const SHOW_THRESHOLD = 0.45;

export const SCROLL_CHROME_TRANSITION = {
  duration: "280ms",
  timingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  staggerDelay: "80ms",
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function useDiscreteChromeHidden({
  hiddenProgress,
  isStickyActive,
}: {
  hiddenProgress: number;
  isStickyActive: boolean;
}) {
  const progress = clamp01(hiddenProgress);
  const [state, setState] = useState(() => ({
    prevProgress: progress,
    prevStickyActive: isStickyActive,
    isHidden: isStickyActive && progress >= HIDE_THRESHOLD,
  }));

  const hasInputChange =
    state.prevProgress !== progress || state.prevStickyActive !== isStickyActive;
  if (hasInputChange) {
    const nextHidden = !isStickyActive
      ? false
      : state.isHidden
        ? progress > SHOW_THRESHOLD
        : progress >= HIDE_THRESHOLD;

    setState({
      prevProgress: progress,
      prevStickyActive: isStickyActive,
      isHidden: nextHidden,
    });

    return nextHidden;
  }

  return state.isHidden;
}
