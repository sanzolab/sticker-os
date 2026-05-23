"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [activePanelHeight, setActivePanelHeight] = useState<number | null>(null);

  const { dragOffset, isDragging, transitionEnabled, handleTrackTransitionEnd } = useTabSwipe({
    activeIndex,
    tabCount,
    containerRef,
    trackRef,
    onTabChange,
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const activePanel = track.querySelector<HTMLElement>(
      '[data-tab-panel-active="true"]',
    );
    if (!activePanel) return;

    let rafId: number | null = null;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      const nextHeight = Math.max(
        0,
        Math.ceil(activePanel.getBoundingClientRect().height),
      );
      setActivePanelHeight((previousHeight) =>
        previousHeight === nextHeight ? previousHeight : nextHeight,
      );
    };

    const scheduleMeasure = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(activePanel);
    } else {
      window.addEventListener("resize", scheduleMeasure);
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
      if (!observer) {
        window.removeEventListener("resize", scheduleMeasure);
      }
    };
  }, [activeIndex, tabCount]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full touch-pan-y overflow-hidden", className)}
      style={{
        height: activePanelHeight === null ? undefined : `${activePanelHeight}px`,
      }}
    >
      <div
        ref={trackRef}
        className="touch-pan-y"
        onTransitionEnd={(event) => handleTrackTransitionEnd(event.nativeEvent)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: `${tabCount * 100}%`,
          transform: `translateX(calc(${-activeIndex * 100}% / ${tabCount} + ${dragOffset}px))`,
          transition: transitionEnabled
            ? "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "none",
          willChange: "transform",
          cursor: isDragging ? "grabbing" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
