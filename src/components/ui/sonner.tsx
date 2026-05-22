"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      swipeDirections={["top", "right", "bottom", "left"]}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-sm border bg-card text-card-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton:
            "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
        },
      }}
      {...props}
    />
  );
}
