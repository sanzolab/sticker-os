import { afterEach, describe, expect, it, vi } from "vitest";
import { parseStickersWithGemini } from "./gemini";

describe("parseStickersWithGemini prompt behavior", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_MODEL = originalModel;
    vi.restoreAllMocks();
  });

  it("adds voice-specific extraction guidance for voice transcripts", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "{\"stickers\":[],\"unresolved\":[]}" }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await parseStickersWithGemini({
      type: "text",
      text: "fw c1",
      source: "voice-transcript",
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const body = String(request && "body" in request ? request.body : "");

    expect(body).toContain("Voice-specific extraction");
    expect(body).toContain("especial/special as FWC");
    expect(body).toContain("coca cola/coca/cc as CC");
  });

  it("keeps manual text prompts without voice-specific guidance", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "{\"stickers\":[],\"unresolved\":[]}" }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await parseStickersWithGemini({
      type: "text",
      text: "mexico 13",
      source: "manual",
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const body = String(request && "body" in request ? request.body : "");

    expect(body).not.toContain("Voice-specific extraction");
  });
});
