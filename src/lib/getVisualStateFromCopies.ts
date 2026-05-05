import { Sticker } from "./sticker-data";

export function getVisualStateFromCopies(copies: number, sticker: Sticker) {
  if (copies === 0) return "missing";
  if (copies === 1 && !sticker.special) return "owned";
  if (copies > 1) return "duplicate";
  if (sticker.special) return "special";
}
