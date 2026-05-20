"use client";

import type { ReactNode } from "react";

export function ProgressRow({
  label,
  value,
  detail,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  detail: string;
  icon?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span
              aria-hidden="true"
              className={iconClassName ?? "text-muted-foreground"}
            >
              {icon}
            </span>
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="text-muted-foreground">
          {detail} · {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
