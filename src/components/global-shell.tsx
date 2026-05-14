"use client";

import { GlobalSpeedDial } from "@/components/global-speed-dial";
import { PendingConfirmationsIndicator } from "@/components/pending-confirmations-indicator";
import { VoiceAssistantOverlay } from "@/components/features/add-stickers/voice/voice-assistant-overlay";
import { PhotoCapturePanel } from "@/components/features/add-stickers/photo-capture-panel";
import { useAssistantStore } from "@/lib/assistant-store";
import { usePageScrollVisibility } from "@/lib/scroll-visibility";

export function GlobalShell() {
  const activeMode = useAssistantStore((s) => s.activeMode);
  const isAssistantModeActive = activeMode === "voice" || activeMode === "photo";
  const { sharedChromeProgress, isScrollChromeActive } = usePageScrollVisibility();
  const dialProgress = isScrollChromeActive ? sharedChromeProgress : 0;

  return (
    <>
      <GlobalSpeedDial
        isHidden={isAssistantModeActive}
        hiddenProgress={dialProgress}
        isScrollControlled={isScrollChromeActive}
      />
      <PendingConfirmationsIndicator isHidden={isAssistantModeActive} />
      <VoiceAssistantOverlay />
      <PhotoCapturePanel />
    </>
  );
}
