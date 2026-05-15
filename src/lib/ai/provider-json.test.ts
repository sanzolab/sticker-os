import { describe, expect, it } from "vitest";
import { AiParseError } from "@/lib/ai/types";
import { parseProviderJson } from "@/lib/ai/provider-json";

describe("parseProviderJson", () => {
  it("parses strict provider JSON", () => {
    expect(
      parseProviderJson(
        "{\"stickers\":[{\"code\":\"MEX 13\"}],\"unresolved\":[]}",
      ),
    ).toEqual({
      stickers: [{ code: "MEX 13" }],
      unresolved: [],
    });
  });

  it("parses JSON from markdown fences", () => {
    expect(
      parseProviderJson(
        "```json\n{\"stickers\":[{\"code\":\"CC 14\"}],\"unresolved\":[]}\n```",
      ),
    ).toEqual({
      stickers: [{ code: "CC 14" }],
      unresolved: [],
    });
  });

  it("parses the first balanced JSON object around extra text", () => {
    expect(
      parseProviderJson(
        "Here is the result: {\"stickers\":[{\"rawText\":\"FWC 00\",\"code\":\"FWC 00\"}],\"unresolved\":[]} done.",
      ),
    ).toEqual({
      stickers: [{ rawText: "FWC 00", code: "FWC 00" }],
      unresolved: [],
    });
  });

  it("defaults missing unresolved to an empty array", () => {
    expect(parseProviderJson("{\"stickers\":[{\"code\":\"MEX 13\"}]}")).toEqual({
      stickers: [{ code: "MEX 13" }],
      unresolved: [],
    });
  });

  it("defaults missing stickers to an empty array", () => {
    expect(
      parseProviderJson(
        "{\"unresolved\":[{\"rawText\":\"sticker 14\",\"reason\":\"Missing group/team\"}]}",
      ),
    ).toEqual({
      stickers: [],
      unresolved: [{ rawText: "sticker 14", reason: "Missing group/team" }],
    });
  });

  it("rejects responses without a JSON object", () => {
    expectInvalidStickerJson(() => parseProviderJson("I could not find stickers."));
  });

  it("rejects non-array stickers and unresolved fields", () => {
    expectInvalidStickerJson(() => parseProviderJson("{\"stickers\":{}}"));
    expectInvalidStickerJson(() => parseProviderJson("{\"unresolved\":{}}"));
  });
});

function expectInvalidStickerJson(fn: () => unknown) {
  expect(fn).toThrow(AiParseError);
  expect(fn).toThrow("The AI response was not valid sticker JSON.");
}
