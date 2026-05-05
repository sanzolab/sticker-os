import { stickersById } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TradeStickerCard({
  stickerId,
  selected,
  onToggle,
}: {
  stickerId: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const sticker = stickersById[stickerId];
  const animations = useStickerStore((state) => state.settings.animations);

  if (!sticker) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group text-left"
      aria-pressed={selected}
      aria-label={`${selected ? "Remove" : "Select"} ${sticker.code}`}
    >
      <span
        className={cn(
          "relative flex aspect-[3/4.35] items-center justify-center rounded-sm border text-2xl font-medium",
          "transition-[background-color,border-color,color,transform]",
          animations && "active:scale-[0.97]",
          selected
            ? "border-primary/35 bg-primary/20 text-foreground"
            : "border-dashed border-border/70 bg-background text-muted-foreground/70",
        )}
      >
        {sticker.special && (
          <span className="absolute right-3 top-3 text-yellow-400">✨</span>
        )}
        <span>{sticker.number}</span>
      </span>
      <span className="mt-1 block truncate text-center text-[11px] text-muted-foreground">
        {sticker.code}
      </span>
    </button>
  );
}
