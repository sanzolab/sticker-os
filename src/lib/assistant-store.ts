"use client";

import { create } from "zustand";

export type AssistantMode = "closed" | "voice";

type AssistantState = {
  activeMode: AssistantMode;
  launch: (mode: AssistantMode) => void;
  dismiss: () => void;
  addStickersOpen: boolean;
  setAddStickersOpen: (open: boolean) => void;
};

export const useAssistantStore = create<AssistantState>()((set) => ({
  activeMode: "closed",
  launch: (mode) => set({ activeMode: mode }),
  dismiss: () => set({ activeMode: "closed" }),
  addStickersOpen: false,
  setAddStickersOpen: (open) => set({ addStickersOpen: open }),
}));
