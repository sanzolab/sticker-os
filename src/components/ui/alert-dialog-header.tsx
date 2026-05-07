"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function AlertDialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2 text-left", className)} {...props} />;
}
