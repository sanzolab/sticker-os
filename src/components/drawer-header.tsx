"use client";

import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

export function DrawerHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
      <DrawerDescription className="mt-1 text-sm text-muted-foreground">
        {description}
      </DrawerDescription>
    </div>
  );
}
