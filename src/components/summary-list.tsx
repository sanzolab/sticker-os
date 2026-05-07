"use client";

import { stickersById } from "@/lib/sticker-data";

export function SummaryList({ title, ids }: { title: string; ids: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {ids.map((id) => stickersById[id]?.code ?? id).join(", ")}
      </p>
    </div>
  );
}
