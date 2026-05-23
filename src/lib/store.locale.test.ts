import { describe, expect, it } from "vitest";
import { resolveMergedSettings, type Settings } from "@/lib/store";

function buildCurrentSettings(): Settings {
  return {
    locale: "en",
    localeSource: "auto",
    animations: true,
    haptics: true,
    theme: "system",
  };
}

describe("store locale merge", () => {
  it("does not treat default English as persisted when storage is empty", () => {
    expect(resolveMergedSettings(undefined, buildCurrentSettings())).toEqual(
      buildCurrentSettings(),
    );
  });

  it("keeps server initial locale when localStorage is empty", () => {
    const serverSettings: Settings = {
      ...buildCurrentSettings(),
      locale: "es",
      localeSource: "auto",
    };

    expect(resolveMergedSettings(undefined, serverSettings)).toEqual(
      serverSettings,
    );
  });

  it("keeps server locale when persisted locale is missing or invalid", () => {
    expect(
      resolveMergedSettings(
        { locale: "fr" as never, localeSource: "manual" },
        buildCurrentSettings(),
      ),
    ).toEqual(buildCurrentSettings());
  });

  it("lets persisted localStorage locale override server auto locale", () => {
    expect(
      resolveMergedSettings(
        { locale: "es", localeSource: "manual" },
        buildCurrentSettings(),
      ),
    ).toEqual({
      ...buildCurrentSettings(),
      locale: "es",
      localeSource: "manual",
    });
  });

  it("treats persisted locale without source as protected persisted", () => {
    expect(
      resolveMergedSettings(
        { locale: "es" },
        buildCurrentSettings(),
      ),
    ).toEqual({
      ...buildCurrentSettings(),
      locale: "es",
      localeSource: "persisted",
    });
  });
});
