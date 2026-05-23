import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_HEADER_NAME,
  getCookieAttributes,
  resolveProxyLocalePreference,
} from "@/lib/locale";

export const PROXY_MATCHER = "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)";

export function proxy(request: NextRequest) {
  const localeCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const sourceCookie = request.cookies.get(LOCALE_SOURCE_COOKIE_NAME)?.value;
  const acceptLanguage = request.headers.get("accept-language");
  const countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  const resolved = resolveProxyLocalePreference({
    cookieLocale: localeCookie,
    cookieSource: sourceCookie,
    acceptLanguage,
    countryCode,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, resolved.locale);
  requestHeaders.set(LOCALE_SOURCE_HEADER_NAME, resolved.source);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (resolved.shouldSetAutoCookie) {
    const cookieAttributes = getCookieAttributes();
    response.cookies.set(LOCALE_COOKIE_NAME, resolved.locale, cookieAttributes);
    response.cookies.set(
      LOCALE_SOURCE_COOKIE_NAME,
      resolved.source,
      cookieAttributes,
    );
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
};
