"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type OptionGroupItem<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

type OptionGroupProps<T extends string> = {
  options: readonly OptionGroupItem<T>[];
  value: T;
  onChange: (value: T) => void;
  columns: number;
  className?: string;
  buttonClassName?: string;
  selectedClassName?: string;
  unselectedClassName?: string;
};

export function OptionGroup<T extends string>({
  options,
  value,
  onChange,
  columns,
  className,
  buttonClassName = "min-h-11 rounded-sm border px-2 text-sm font-medium transition-colors",
  selectedClassName = "border-primary/45 bg-primary/10 text-primary",
  unselectedClassName = "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
}: OptionGroupProps<T>) {
  return (
    <div
      className={cn("grid gap-2", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              buttonClassName,
              selected ? selectedClassName : unselectedClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
