import React from "react";
import { cn } from "@/lib/utils";

type DataGridItem = {
  label: string;
  value: React.ReactNode;
};

type DataGridProps = {
  items: DataGridItem[];
  cols?: number;
  className?: string;
  cellClassName?: string;
  renderCell?: (item: DataGridItem, index: number) => React.ReactNode;
};

export function DataGrid({
  items,
  cols = 3,
  className,
  cellClassName,
  renderCell,
}: DataGridProps) {
  const totalItems = items.length;
  const lastRowStart = totalItems - cols;

  return (
    <div
      className={cn("grid overflow-hidden text-sm", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item, i) => {
        const isLastCol = (i + 1) % cols === 0;
        const isLastRow = i >= lastRowStart;

        return (
          <div
            key={i}
            className={cn(
              "p-2",
              !isLastCol && "border-r",
              !isLastRow && "border-b",
              cellClassName,
            )}
          >
            {renderCell ? (
              renderCell(item, i)
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
