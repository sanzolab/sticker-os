"use client";

import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function ProgressRing({
  value,
  size = "default",
}: {
  value: number;
  size?: "default" | "large";
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const dimensions = size === "large" ? 112 : 72;
  const stroke = size === "large" ? 5 : 4;
  const radius = (dimensions - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn(
        "relative grid place-items-center",
        size === "large" ? "size-28" : "size-[72px]",
      )}
    >
      <svg width={dimensions} height={dimensions} className="-rotate-90">
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted"
        />
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-300 ease-out"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute text-center">
        <p
          className={cn(
            "font-semibold leading-none",
            size === "large" ? "text-4xl" : "text-xl",
          )}
        >
          {value}%
        </p>
        {size === "large" && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t(locale, "collection.complete")}
          </p>
        )}
      </div>
    </div>
  );
}
