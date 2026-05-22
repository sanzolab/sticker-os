import type { ExternalToast } from "sonner";

export const MOBILE_TOAST_QUERY = "(max-width: 767px)";
export const STICKER_QUANTITY_ADD_UNDO_TOAST_ID = "sticker-quantity-add-undo";
export const STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID = "sticker-quantity-remove-undo";
export const STICKER_QUANTITY_SAVE_UNDO_TOAST_ID = "sticker-quantity-save-undo";

function isMobileToastViewport() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MOBILE_TOAST_QUERY).matches;
}

export function getStickerQuantityToastPosition(): NonNullable<ExternalToast["position"]> {
  return isMobileToastViewport() ? "top-center" : "bottom-center";
}

export function withStickerQuantityUndoToast(
  options: ExternalToast,
  toastId: string,
): ExternalToast {
  return {
    ...options,
    id: toastId,
    position: getStickerQuantityToastPosition(),
  };
}
