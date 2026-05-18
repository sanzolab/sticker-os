"use client";

import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimatedTabItem<T extends string> = {
  id: T;
  label: ReactNode;
};

export type AnimatedTabsProps<T extends string> = {
  tabs: readonly AnimatedTabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  indicatorClassName?: string;
};

export function AnimatedTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
  tabClassName,
  activeTabClassName,
  indicatorClassName,
}: AnimatedTabsProps<T>) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  const focusTab = useCallback((index: number) => {
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-animated-tab]",
    );
    buttons?.[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!tabs.length) return;

      let nextIndex = index;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (index + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      onTabChange(tabs[nextIndex]!.id);
      window.requestAnimationFrame(() => focusTab(nextIndex));
    },
    [focusTab, onTabChange, tabs],
  );

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-orientation="horizontal"
      className={cn("relative grid", className)}
      style={{
        gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-animated-tab
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "h-12 text-sm font-medium text-muted-foreground transition-colors",
              active && "text-primary",
              tabClassName,
              active && activeTabClassName,
            )}
          >
            {tab.label}
          </button>
        );
      })}

      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-full bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ease-out",
            indicatorClassName,
          )}
          style={{
            width: `${100 / Math.max(tabs.length, 1)}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      )}
    </div>
  );
}
