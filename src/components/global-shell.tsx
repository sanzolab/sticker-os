"use client";

import { GlobalSpeedDial } from "@/components/global-speed-dial";
import { PendingConfirmationsIndicator } from "@/components/pending-confirmations-indicator";
import { VoiceAssistantOverlay } from "@/components/features/add-stickers/voice/voice-assistant-overlay";
import { useAssistantStore } from "@/lib/assistant-store";
import { usePageScrollVisibility } from "@/lib/scroll-visibility";

export function GlobalShell() {
  const activeMode = useAssistantStore((s) => s.activeMode);
  const isVoiceActive = activeMode === "voice";
  const { sharedChromeProgress, isScrollChromeActive } = usePageScrollVisibility();
  const dialProgress = isScrollChromeActive ? sharedChromeProgress : 0;

  return (
    <>
      <GlobalSpeedDial
        isHidden={isVoiceActive}
        hiddenProgress={dialProgress}
        isScrollControlled={isScrollChromeActive}
      />
      <PendingConfirmationsIndicator isHidden={isVoiceActive} />
      <VoiceAssistantOverlay />
    </>
  );
}
