import { describe, expect, it } from "vitest";
import {
  normalizeLocale,
  pickLocaleFromAcceptLanguage,
  resolveInitialLocalePreference,
  resolveProxyLocalePreference,
} from "@/lib/locale";

describe("locale normalization", () => {
  it("maps locale variants to supported base locales", () => {
    expect(normalizeLocale("es-CO")).toBe("es");
    expect(normalizeLocale("es_MX")).toBe("es");
    expect(normalizeLocale("en-GB")).toBe("en");
  });

  it("returns null for unsupported locales", () => {
    expect(normalizeLocale("fr-FR")).toBeNull();
    expect(normalizeLocale("pt")).toBeNull();
  });
});

describe("accept-language parsing", () => {
  it("uses q weighting and ignores unsupported locales", () => {
    expect(
      pickLocaleFromAcceptLanguage("fr-FR;q=1,es-CO;q=0.7,en-US;q=0.8"),
    ).toBe("en");
  });
});

describe("proxy locale resolution", () => {
  it("preserves valid cookie locale when source is missing", () => {
    expect(
      resolveProxyLocalePreference({
        cookieLocale: "es-CO",
        cookieSource: undefined,
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toEqual({
      locale: "es",
      source: "persisted",
      shouldSetAutoCookie: false,
    });
  });

  it("preserves manual cookie preference", () => {
    expect(
      resolveProxyLocalePreference({
        cookieLocale: "en",
        cookieSource: "manual",
        acceptLanguage: "es-CO,es;q=0.9",
      }),
    ).toEqual({
      locale: "en",
      source: "manual",
      shouldSetAutoCookie: false,
    });
  });

  it("auto-detects only when no valid cookie locale exists", () => {
    expect(
      resolveProxyLocalePreference({
        cookieLocale: null,
        cookieSource: null,
        acceptLanguage: "es-CO,es;q=0.9",
      }),
    ).toEqual({
      locale: "es",
      source: "auto",
      shouldSetAutoCookie: true,
    });
  });

  it("falls back to region when accept-language has no supported locale", () => {
    expect(
      resolveProxyLocalePreference({
        cookieLocale: null,
        cookieSource: null,
        acceptLanguage: "fr-FR,pt-BR;q=0.9",
        countryCode: "CO",
      }),
    ).toEqual({
      locale: "es",
      source: "auto",
      shouldSetAutoCookie: true,
    });
  });
});

describe("initial layout locale resolution", () => {
  it("uses Spanish accept-language with auto source when there is no persisted locale", () => {
    expect(
      resolveInitialLocalePreference({
        acceptLanguage: "es-CO,es;q=0.9,en;q=0.8",
      }),
    ).toEqual({
      locale: "es",
      source: "auto",
    });
  });

  it("uses region fallback with auto source when browser language is unsupported", () => {
    expect(
      resolveInitialLocalePreference({
        acceptLanguage: "fr-FR,pt-BR;q=0.9",
        countryCode: "CO",
      }),
    ).toEqual({
      locale: "es",
      source: "auto",
    });
  });

  it("falls back to English with auto source when no browser or region match exists", () => {
    expect(
      resolveInitialLocalePreference({
        acceptLanguage: "fr-FR,pt-BR;q=0.9",
        countryCode: "US",
      }),
    ).toEqual({
      locale: "en",
      source: "auto",
    });
  });

  it("treats valid cookie locale without source as persisted", () => {
    expect(
      resolveInitialLocalePreference({
        cookieLocale: "en",
        acceptLanguage: "es-CO,es;q=0.9",
        countryCode: "CO",
      }),
    ).toEqual({
      locale: "en",
      source: "persisted",
    });
  });

  it("preserves manual cookie locale over browser and region detection", () => {
    expect(
      resolveInitialLocalePreference({
        cookieLocale: "en",
        cookieSource: "manual",
        acceptLanguage: "es-CO,es;q=0.9",
        countryCode: "CO",
      }),
    ).toEqual({
      locale: "en",
      source: "manual",
    });
  });
});
