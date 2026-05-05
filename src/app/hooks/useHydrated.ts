import { useStickerStore } from "@/lib/store";

export function useHydrated() {
  return useStickerStore((state) => state.hasHydrated);
}
