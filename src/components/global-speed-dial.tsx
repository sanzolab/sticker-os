"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, X, Camera, Mic } from "lucide-react";
import { useAssistantStore } from "@/lib/assistant-store";

export function GlobalSpeedDial({
  isHidden,
  hiddenProgress = 0,
  isScrollControlled = false,
}: {
  isHidden: boolean;
  hiddenProgress?: number;
  isScrollControlled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const launch = useAssistantStore((s) => s.launch);
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));
  const isExplicitlyHidden = isHidden;
  const isExpanded = isOpen && !isExplicitlyHidden;
  const effectiveHiddenProgress = isExplicitlyHidden ? 1 : isExpanded ? 0 : clampedProgress;
  const isScrollHidden = !isExpanded && effectiveHiddenProgress >= 0.98;
  const isRootHidden = isExplicitlyHidden || isScrollHidden;
  const isActivatorInteractive =
    !isExplicitlyHidden && (isExpanded || effectiveHiddenProgress < 0.98);

  useEffect(() => {
    if (isExplicitlyHidden) {
      // Explicit hide should immediately collapse the menu state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false);
    }
  }, [isExplicitlyHidden]);

  const toggle = useCallback(() => {
    if (isExplicitlyHidden || isScrollHidden) {
      return;
    }

    setIsOpen((prev) => !prev);
  }, [isExplicitlyHidden, isScrollHidden]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCamera = useCallback(() => {
    setIsOpen(false);
    launch("photo");
  }, [launch]);

  const handleVoice = useCallback(() => {
    setIsOpen(false);
    launch("voice");
  }, [launch]);

  return (
    <>
      <div
        className={`speed-dial-overlay${isExpanded ? " is-open" : ""}`}
        onClick={dismiss}
        aria-hidden
      />

      <div
        className={`speed-dial-container${isRootHidden ? " is-hidden" : ""}`}
        style={{
          transform: `translate3d(0, ${effectiveHiddenProgress * 16}px, 0) scale(${1 - effectiveHiddenProgress * 0.04})`,
          opacity: 1 - effectiveHiddenProgress,
          pointerEvents: isRootHidden ? "none" : "auto",
          transition: isScrollControlled ? "none" : undefined,
          willChange: "transform, opacity",
        }}
      >
        <div
          className={`speed-dial-actions${isExpanded ? " is-open" : ""}`}
          aria-hidden={isExpanded ? undefined : true}
        >
          <button
            type="button"
            className={`speed-dial-action${isExpanded ? " is-open open-1" : " closed"}`}
            onClick={handleVoice}
            aria-label="Voice assistant"
            tabIndex={isExpanded ? undefined : -1}
          >
            <Mic className="size-5" />
            <span className="speed-dial-label">Voice</span>
          </button>

          <button
            type="button"
            className={`speed-dial-action${isExpanded ? " is-open open-0" : " closed"}`}
            onClick={handleCamera}
            aria-label="Add stickers via camera"
            tabIndex={isExpanded ? undefined : -1}
          >
            <Camera className="size-5" />
            <span className="speed-dial-label">Camera</span>
          </button>
        </div>

        <button
          type="button"
          className={`speed-dial-fab${isActivatorInteractive ? " is-interactive" : ""}`}
          onClick={toggle}
          aria-label={isExpanded ? "Close actions" : "Open actions"}
          tabIndex={isActivatorInteractive ? undefined : -1}
        >
          <span className={`speed-dial-fab-icon${isExpanded ? " is-open" : ""}`}>
            {isExpanded ? <X className="size-6" /> : <Plus className="size-6" />}
          </span>
        </button>
      </div>
    </>
  );
}
