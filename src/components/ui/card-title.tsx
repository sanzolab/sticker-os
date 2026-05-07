"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-semibold leading-none tracking-normal", className)}
      {...props}
    />
  );
}
