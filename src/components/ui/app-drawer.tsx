"use client";

import type { ComponentProps, ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type AppDrawerProps = ComponentProps<typeof Drawer> & {
  contentClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function AppDrawer({
  contentClassName,
  bodyClassName = "space-y-5 px-5 pb-5 pt-4",
  children,
  ...props
}: AppDrawerProps) {
  return (
    <Drawer {...props}>
      <DrawerContent className={contentClassName}>
        <div className={cn(bodyClassName)}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
