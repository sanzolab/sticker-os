import { describe, expect, it } from "vitest";
import { extractCacheNameFromServiceWorker, extractCacheVersion } from "@/lib/service-worker";

describe("extractCacheNameFromServiceWorker", () => {
  it("returns the cache name when CACHE_NAME is declared", () => {
    const script = "const CACHE_NAME = \"stickeros-shell-v1.8.3.0\";";

    expect(extractCacheNameFromServiceWorker(script)).toBe(
      "stickeros-shell-v1.8.3.0",
    );
  });

  it("returns null when CACHE_NAME is not present", () => {
    const script = "const OTHER = \"value\";";

    expect(extractCacheNameFromServiceWorker(script)).toBeNull();
  });
});

describe("extractCacheVersion", () => {
  it("returns only the semantic version token from a cache name", () => {
    expect(extractCacheVersion("stickeros-shell-v1.8.3.0")).toBe("v1.8.3.0");
  });

  it("returns null when the cache name has no version token", () => {
    expect(extractCacheVersion("stickeros-shell-latest")).toBeNull();
  });
});
