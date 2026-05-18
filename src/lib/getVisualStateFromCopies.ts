export function getVisualStateFromCopies(copies: number) {
  if (copies === 0) return "missing";
  return "owned";
}
