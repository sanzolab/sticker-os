"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  buildDocumentCookie,
  type LocaleSource,
} from "@/lib/locale";
import type { Locale } from "@/lib/locale-meta";
import {
  setInitialLocalePreference,
  useStickerStore,
} from "@/lib/store";

export function Providers({
  children,
  initialLocale,
  initialLocaleSource,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialLocaleSource: LocaleSource;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const localeSource = useStickerStore((state) => state.settings.localeSource);
  const hasHydrated = useStickerStore((state) => state.hasHydrated);

  useEffect(() => {
    setInitialLocalePreference(initialLocale, initialLocaleSource);
    useStickerStore.getState().setLocalePreference(initialLocale, initialLocaleSource);
    useStickerStore.persist.rehydrate();
  }, [initialLocale, initialLocaleSource]);

  useEffect(() => {
    if (!hasHydrated) return;

    document.documentElement.lang = locale;
    const secure = window.location.protocol === "https:";
    document.cookie = buildDocumentCookie(LOCALE_COOKIE_NAME, locale, secure);
    document.cookie = buildDocumentCookie(
      LOCALE_SOURCE_COOKIE_NAME,
      localeSource,
      secure,
    );
  }, [hasHydrated, locale, localeSource]);

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
