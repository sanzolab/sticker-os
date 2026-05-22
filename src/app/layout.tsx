import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GlobalShell } from "@/components/global-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_HEADER_NAME,
  resolveInitialLocalePreference,
} from "@/lib/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StickerOS",
  description: "A mobile-first FIFA World Cup 2026 sticker collector app.",
  applicationName: "StickerOS",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "StickerOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#151820" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const initialLocalePreference = resolveInitialLocalePreference({
    headerLocale: headerStore.get(LOCALE_HEADER_NAME),
    headerSource: headerStore.get(LOCALE_SOURCE_HEADER_NAME),
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    cookieSource: cookieStore.get(LOCALE_SOURCE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get("accept-language"),
    countryCode:
      headerStore.get("x-vercel-ip-country") ??
      headerStore.get("cf-ipcountry"),
  });

  return (
    <html
      lang={initialLocalePreference.locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <Providers
          initialLocale={initialLocalePreference.locale}
          initialLocaleSource={initialLocalePreference.source}
        >
          {children}
          <GlobalShell />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
