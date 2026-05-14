"use client";

import { useState, useCallback } from "react";
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
  const visualProgress = isHidden ? 1 : clampedProgress;
  const isInteractionHidden = isHidden || visualProgress >= 0.98;

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

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
        className={`speed-dial-overlay${isOpen && !isInteractionHidden ? " is-open" : ""}`}
        onClick={dismiss}
        aria-hidden
      />

      <div
        className={`speed-dial-container${isInteractionHidden ? " is-hidden" : ""}`}
        style={{
          transform: `translate3d(0, ${visualProgress * 16}px, 0) scale(${1 - visualProgress * 0.04})`,
          opacity: 1 - visualProgress,
          pointerEvents: isInteractionHidden ? "none" : undefined,
          transition: isScrollControlled ? "none" : undefined,
          willChange: "transform, opacity",
        }}
      >
        <div className="speed-dial-actions">
          <button
            type="button"
            className={`speed-dial-action${isOpen ? " open-1" : " closed"}`}
            onClick={handleVoice}
            aria-label="Voice assistant"
          >
            <Mic className="size-5" />
            <span className="speed-dial-label">Voice</span>
          </button>

          <button
            type="button"
            className={`speed-dial-action${isOpen ? " open-0" : " closed"}`}
            onClick={handleCamera}
            aria-label="Add stickers via camera"
          >
            <Camera className="size-5" />
            <span className="speed-dial-label">Camera</span>
          </button>
        </div>

        <button
          type="button"
          className="speed-dial-fab"
          onClick={toggle}
          aria-label={isOpen ? "Close actions" : "Open actions"}
        >
          <span className={`speed-dial-fab-icon${isOpen ? " is-open" : ""}`}>
            {isOpen ? <X className="size-6" /> : <Plus className="size-6" />}
          </span>
        </button>
      </div>
    </>
  );
}
