import { defaultLocale, supportedLocales, type Locale } from "@/lib/locale-meta";

export const LOCALE_COOKIE_NAME = "worldcup_stickers_locale";
export const LOCALE_SOURCE_COOKIE_NAME = "worldcup_stickers_locale_source";
export const LOCALE_HEADER_NAME = "x-app-locale";
export const LOCALE_SOURCE_HEADER_NAME = "x-app-locale-source";

export type LocaleSource = "manual" | "auto" | "persisted";

type ResolveProxyLocaleInput = {
  cookieLocale?: string | null;
  cookieSource?: string | null;
  acceptLanguage?: string | null;
  countryCode?: string | null;
};

type ResolveProxyLocaleResult = {
  locale: Locale;
  source: LocaleSource;
  shouldSetAutoCookie: boolean;
};

type ResolveInitialLocaleInput = {
  headerLocale?: string | null;
  headerSource?: string | null;
  cookieLocale?: string | null;
  cookieSource?: string | null;
  acceptLanguage?: string | null;
  countryCode?: string | null;
};

type ResolveInitialLocaleResult = {
  locale: Locale;
  source: LocaleSource;
};

const SPANISH_REGION_CODES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
]);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function normalizeLocale(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return null;
  if (isLocale(normalized)) return normalized;

  const [base] = normalized.split("-");
  return isLocale(base) ? base : null;
}

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function normalizeLocaleSource(
  value: string | null | undefined,
): LocaleSource | null {
  if (!value) return null;
  if (value === "manual" || value === "auto" || value === "persisted") {
    return value;
  }
  return null;
}

export function toProtectedSource(
  value: string | null | undefined,
): LocaleSource {
  const normalized = normalizeLocaleSource(value);
  return normalized ?? "persisted";
}

export function pickLocaleFromAcceptLanguage(
  headerValue: string | null | undefined,
): Locale | null {
  if (!headerValue) return null;

  const ranked = headerValue
    .split(",")
    .map((raw, index) => {
      const [tagPart, ...params] = raw.trim().split(";");
      const locale = normalizeLocale(tagPart);
      if (!locale) return null;

      let weight = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q") {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            weight = parsed;
          }
        }
      }

      return { locale, weight, index };
    })
    .filter((entry): entry is { locale: Locale; weight: number; index: number } => {
      return entry !== null;
    })
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.index - b.index;
    });

  return ranked[0]?.locale ?? null;
}

export function pickLocaleFromRegion(
  countryCode: string | null | undefined,
): Locale | null {
  if (!countryCode) return null;
  const normalized = countryCode.trim().toUpperCase();
  if (!normalized) return null;
  if (SPANISH_REGION_CODES.has(normalized)) return "es";
  return null;
}

export function resolveProxyLocalePreference(
  input: ResolveProxyLocaleInput,
): ResolveProxyLocaleResult {
  const cookieLocale = normalizeLocale(input.cookieLocale);
  if (cookieLocale) {
    return {
      locale: cookieLocale,
      source: toProtectedSource(input.cookieSource),
      shouldSetAutoCookie: false,
    };
  }

  const detectedLocale =
    pickLocaleFromAcceptLanguage(input.acceptLanguage) ??
    pickLocaleFromRegion(input.countryCode) ??
    defaultLocale;

  return {
    locale: detectedLocale,
    source: "auto",
    shouldSetAutoCookie: true,
  };
}

export function resolveInitialLocalePreference(
  input: ResolveInitialLocaleInput,
): ResolveInitialLocaleResult {
  const headerLocale = normalizeLocale(input.headerLocale);
  if (headerLocale) {
    return {
      locale: headerLocale,
      source: normalizeLocaleSource(input.headerSource) ?? "auto",
    };
  }

  const cookieLocale = normalizeLocale(input.cookieLocale);
  if (cookieLocale) {
    return {
      locale: cookieLocale,
      source: toProtectedSource(input.cookieSource),
    };
  }

  return {
    locale:
      pickLocaleFromAcceptLanguage(input.acceptLanguage) ??
      pickLocaleFromRegion(input.countryCode) ??
      defaultLocale,
    source: "auto",
  };
}

export function getCookieAttributes() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  };
}

export function buildDocumentCookie(
  name: string,
  value: string,
  secure: boolean,
) {
  const secureFlag = secure ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secureFlag}`;
}
