"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimatedTabPanelProps = {
  active: boolean;
  direction?: "left" | "right";
  hasChangedTab?: boolean;
  className?: string;
  children: ReactNode;
};

export function AnimatedTabPanel({
  active,
  direction = "right",
  hasChangedTab = true,
  className,
  children,
}: AnimatedTabPanelProps) {
  return (
    <section
      hidden={!active}
      data-direction={direction}
      className={cn(
        "tabs-content bg-background",
        active && hasChangedTab ? "tabs-content-active" : "",
        className,
      )}
    >
      {children}
    </section>
  );
}
