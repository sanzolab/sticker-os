"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;
const AlertDialogAction = AlertDialogPrimitive.Action;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
};
export { AlertDialogContent } from "./alert-dialog-content";
export { AlertDialogDescription } from "./alert-dialog-description";
export { AlertDialogFooter } from "./alert-dialog-footer";
export { AlertDialogHeader } from "./alert-dialog-header";
export { AlertDialogOverlay } from "./alert-dialog-overlay";
export { AlertDialogTitle } from "./alert-dialog-title";
