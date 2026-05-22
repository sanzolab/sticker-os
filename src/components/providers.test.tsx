// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
} from "@/lib/locale";
import { useStickerStore } from "@/lib/store";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

describe("Providers locale hydration sync", () => {
  beforeEach(() => {
    localStorage.clear();
    useStickerStore.persist.clearStorage();
    useStickerStore.setState((state) => ({
      ...state,
      hasHydrated: false,
      settings: {
        ...state.settings,
        locale: "en",
        localeSource: "auto",
      },
    }));
    document.documentElement.lang = "en";
    document.cookie = `${LOCALE_COOKIE_NAME}=; Path=/; Max-Age=0`;
    document.cookie = `${LOCALE_SOURCE_COOKIE_NAME}=; Path=/; Max-Age=0`;
  });

  it("resyncs html lang and cookies from the hydrated store state", async () => {
    useStickerStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        locale: "es",
        localeSource: "manual",
      },
    }));

    render(
      <Providers initialLocale="es" initialLocaleSource="manual">
        <div>app</div>
      </Providers>,
    );

    await waitFor(() => {
      expect(useStickerStore.getState().hasHydrated).toBe(true);
    });

    expect(useStickerStore.getState().settings.locale).toBe("es");
    expect(useStickerStore.getState().settings.localeSource).toBe("manual");
    expect(document.documentElement.lang).toBe("es");
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`);
    expect(document.cookie).toContain(`${LOCALE_SOURCE_COOKIE_NAME}=manual`);
  });

  it("uses server initial auto locale when localStorage is empty", async () => {
    render(
      <Providers initialLocale="es" initialLocaleSource="auto">
        <div>app</div>
      </Providers>,
    );

    await waitFor(() => {
      expect(useStickerStore.getState().hasHydrated).toBe(true);
    });

    expect(useStickerStore.getState().settings.locale).toBe("es");
    expect(useStickerStore.getState().settings.localeSource).toBe("auto");
    expect(document.documentElement.lang).toBe("es");
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`);
    expect(document.cookie).toContain(`${LOCALE_SOURCE_COOKIE_NAME}=auto`);
  });
});
