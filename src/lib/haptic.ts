export function haptic(type: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns = { light: 10, medium: 20, heavy: 30 };
  try { navigator.vibrate(patterns[type]); } catch { /* ignore */ }
}
