"use client";

import { useCallback } from "react";
import { useStickerStore } from "@/lib/store";

export function useGuardedAction() {
  const isLocked = useStickerStore((state) => state.isLocked);

  const guard = useCallback(
    <Args extends unknown[], R>(action: (...args: Args) => R) => {
      return (...args: Args): R | undefined => {
        if (isLocked) {
          useStickerStore.getState().triggerBlockedFeedback();
          return undefined;
        }
        return action(...args);
      };
    },
    [isLocked],
  );

  return { isLocked, guard };
}
