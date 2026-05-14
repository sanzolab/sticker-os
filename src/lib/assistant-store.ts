"use client";

import { create } from "zustand";

export type AssistantMode = "closed" | "voice" | "photo";

export type QueuedPhotoCapture = {
  id: number;
  file: File;
};

type AssistantState = {
  activeMode: AssistantMode;
  launch: (mode: AssistantMode) => void;
  dismiss: () => void;
  addStickersOpen: boolean;
  setAddStickersOpen: (open: boolean) => void;
  queuedPhotoCapture: QueuedPhotoCapture | null;
  queuePhotoCapture: (file: File) => void;
  consumeQueuedPhotoCapture: () => void;
};

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  activeMode: "closed",
  launch: (mode) => set({ activeMode: mode }),
  dismiss: () => set({ activeMode: "closed" }),
  addStickersOpen: false,
  setAddStickersOpen: (open) => set({ addStickersOpen: open }),
  queuedPhotoCapture: null,
  queuePhotoCapture: (file) => {
    const nextId = (get().queuedPhotoCapture?.id ?? 0) + 1;
    set({
      queuedPhotoCapture: {
        id: nextId,
        file,
      },
    });
  },
  consumeQueuedPhotoCapture: () => set({ queuedPhotoCapture: null }),
}));
