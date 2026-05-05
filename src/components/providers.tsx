"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useStickerStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
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
    </NextThemesProvider>
  );
}
