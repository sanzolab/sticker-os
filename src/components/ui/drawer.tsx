"use client";

import { Drawer as DrawerPrimitive } from "vaul";
import type { ComponentProps } from "react";
export { DrawerOverlay } from "./drawer-overlay";
export { DrawerContent } from "./drawer-content";

const Drawer = ({
  shouldScaleBackground = false,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerClose = DrawerPrimitive.Close;
const DrawerTitle = DrawerPrimitive.Title;
const DrawerDescription = DrawerPrimitive.Description;

export {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
};
