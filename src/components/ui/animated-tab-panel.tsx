"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimatedTabPanelProps = {
  active: boolean;
  index: number;
  tabCount: number;
  className?: string;
  children: ReactNode;
};

export function AnimatedTabPanel({
  active,
  tabCount,
  className,
  children,
}: AnimatedTabPanelProps) {
  return (
    <section
      aria-hidden={!active || undefined}
      // @ts-expect-error inert is a new HTML attribute
      inert={!active ? "" : undefined}
      className={cn("tab-slider-panel", className)}
      style={{
        flex: `0 0 calc(100% / ${tabCount})`,
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      {children}
    </section>
  );
}
