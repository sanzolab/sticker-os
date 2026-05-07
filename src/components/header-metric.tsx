"use client";

import type { ReactNode } from "react";

export function HeaderMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 p-4 md:p-6">
      {icon}
      <p className="text-xl font-medium leading-none tracking-normal">
        {value}
      </p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
