"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useStickerStore } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useStickerStore.persist.rehydrate();
  }, []);
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  );
}
