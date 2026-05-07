"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { DrawerOverlay } from "./drawer-overlay";
import { cn } from "@/lib/utils";

export const DrawerContent = forwardRef<
  ElementRef<typeof DrawerPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPrimitive.Portal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 flex max-h-[92dvh] max-w-2xl flex-col rounded-t-sm border bg-card outline-none safe-bottom",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPrimitive.Portal>
));
DrawerContent.displayName = "DrawerContent";
