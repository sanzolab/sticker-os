"use client";

import { GlobalSpeedDial } from "@/components/global-speed-dial";
import { PendingConfirmationsIndicator } from "@/components/pending-confirmations-indicator";
import { VoiceAssistantOverlay } from "@/components/features/add-stickers/voice/voice-assistant-overlay";
import { useAssistantStore } from "@/lib/assistant-store";

export function GlobalShell() {
  const activeMode = useAssistantStore((s) => s.activeMode);
  const isVoiceActive = activeMode === "voice";

  return (
    <>
      <GlobalSpeedDial isHidden={isVoiceActive} />
      <PendingConfirmationsIndicator isHidden={isVoiceActive} />
      <VoiceAssistantOverlay />
    </>
  );
}
