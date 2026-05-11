"use client";

import { useRef, type ReactNode } from "react";
import { useTabSwipe } from "@/hooks/use-tab-swipe";
import { cn } from "@/lib/utils";

type TabSliderProps = {
  activeIndex: number;
  tabCount: number;
  onTabChange: (index: number) => void;
  children: ReactNode;
  className?: string;
};

export function TabSlider({
  activeIndex,
  tabCount,
  onTabChange,
  children,
  className,
}: TabSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const { isSwiping } = useTabSwipe({
    activeIndex,
    tabCount,
    containerRef,
    trackRef,
    onTabChange,
  });

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden", className)}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          width: `${tabCount * 100}%`,
          transform: `translateX(calc(${-activeIndex * 100}% / ${tabCount}))`,
          transition: isSwiping
            ? "none"
            : "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
