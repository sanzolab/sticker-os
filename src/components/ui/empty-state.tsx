"use client";

import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex min-h-32 flex-col items-center justify-center p-5 text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
