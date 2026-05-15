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
  const inactiveStyles = !active
    ? {
        height: 0,
        overflow: "hidden" as const,
        visibility: "hidden" as const,
      }
    : {};

  return (
    <section
      aria-hidden={!active || undefined}
      inert={!active || undefined}
      className={cn("tab-slider-panel", className)}
      data-tab-panel
      data-tab-panel-active={active ? "true" : "false"}
      style={{
        flex: `0 0 calc(100% / ${tabCount})`,
        minWidth: 0,
        ...inactiveStyles,
      }}
    >
      {children}
    </section>
  );
}
