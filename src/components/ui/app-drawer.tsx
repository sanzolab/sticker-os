"use client";

import type { ComponentProps, ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type AppDrawerProps = ComponentProps<typeof Drawer> & {
  contentClassName?: string;
  bodyClassName?: string;
  scrollable?: boolean;
  children: ReactNode;
};

export function AppDrawer({
  contentClassName,
  bodyClassName,
  scrollable = true,
  children,
  ...props
}: AppDrawerProps) {
  return (
    <Drawer {...props}>
      <DrawerContent className={contentClassName}>
        {scrollable ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4",
                bodyClassName,
              )}
            >
              {children}
            </div>
          </div>
        ) : (
          <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
            {children}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
