import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-sm border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
export { CardContent } from "./card-content";
export { CardHeader } from "./card-header";
export { CardTitle } from "./card-title";
