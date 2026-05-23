import { describe, expect, it } from "vitest";
import { PROXY_MATCHER } from "./proxy";

describe("proxy matcher", () => {
  it("uses the expected matcher pattern", () => {
    expect(PROXY_MATCHER).toBe(
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    );
  });

  it("excludes static assets and file paths", () => {
    const matcher = new RegExp(
      "^/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)$",
    );

    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/shared-album")).toBe(true);
    expect(matcher.test("/api/ai/parse-stickers")).toBe(false);
    expect(matcher.test("/_next/static/chunks/main.js")).toBe(false);
    expect(matcher.test("/_next/image?url=%2Ficon.svg&w=64&q=75")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    expect(matcher.test("/manifest.webmanifest")).toBe(false);
  });
});
