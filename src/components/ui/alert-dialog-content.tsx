"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertDialogOverlay } from "./alert-dialog-overlay";
import { cn } from "@/lib/utils";

export const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[71] grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-sm border bg-card p-5 shadow-lg outline-none",
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
