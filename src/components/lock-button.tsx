"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Lock, LockOpen } from "lucide-react";
import { haptic } from "@/lib/haptic";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LockButton() {
  const isLocked = useStickerStore((state) => state.isLocked);
  const toggleLock = useStickerStore((state) => state.toggleLock);
  const lastBlockedAttemptAt = useStickerStore(
    (state) => state.lastBlockedAttemptAt,
  );
  const locale = useStickerStore((state) => state.settings.locale);
  const hapticsEnabled = useStickerStore((state) => state.settings.haptics);

  const controls = useAnimationControls();
  const prevLockedRef = useRef(isLocked);

  useEffect(() => {
    if (lastBlockedAttemptAt === null) return;

    if (hapticsEnabled) haptic("medium");

    controls.start({
      x: [0, -3, 3, -2, 2, 0],
      scale: [1, 0.97, 1.01, 1, 1, 1],
      transition: {
        duration: 0.32,
        ease: "easeOut",
      },
    });
  }, [lastBlockedAttemptAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prevLockedRef.current === isLocked) return;
    prevLockedRef.current = isLocked;

    controls.start({
      scale: [1, 0.92],
      // rotate: [0, isLocked ? -4 : 4],
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
      },
    });
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(() => {
    toggleLock();
  }, [toggleLock]);

  return (
    <motion.button
      type="button"
      animate={controls}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-sm shadow-none transition-[background-color,color] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isLocked && "text-primary/70",
      )}
      onClick={handleToggle}
      aria-label={
        isLocked
          ? t(locale, "topbar.unlockAria")
          : t(locale, "topbar.lockAria")
      }
    >
      {isLocked ? (
        <Lock className="size-5" />
      ) : (
        <LockOpen className="size-5" />
      )}
    </motion.button>
  );
}
