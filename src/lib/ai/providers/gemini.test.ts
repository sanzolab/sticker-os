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

  it("adds shared prompt rules and voice guidance for voice transcripts", async () => {
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

    expect(body).toContain("Sticker ranges:");
    expect(body).toContain("- CC: 1–14");
    expect(body).toContain("Visual extraction priority:");
    expect(body).toContain("Do NOT infer team from page title unless visible on sticker");
    expect(body).toContain("Voice: merge split letters");
    expect(body).toContain("F W C -> FWC");
    expect(body).toContain("C C -> CC");
    expect(body).toContain("handle glued forms (FWC1)");
    expect(body).toContain("If ambiguous -> unresolved");
  });

  it("keeps manual text prompts without voice or image-only guidance", async () => {
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

    expect(body).not.toContain("Voice: merge split letters");
    expect(body).not.toContain("Layout hints");
    expect(body).not.toContain("Extract all visible sticker codes and numbers from the image.");
  });

  it("adds conservative image anti-hallucination guidance for images", async () => {
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
      type: "image",
      file: {
        data: new ArrayBuffer(1),
        mimeType: "image/jpeg",
        name: "stickers.jpg",
      },
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const body = String(request && "body" in request ? request.body : "");

    expect(body).not.toContain("Layout hints (fallback only)");
    expect(body).toContain("Image safety rules: full team/country pages are high hallucination risk");
    expect(body).toContain("Never infer sticker presence from slot count");
    expect(body).toContain("Do not scan the entire page. Extract only clearly visible stickers.");
    expect(body).toContain("Return at most 10 stickers and at most 5 unresolved items.");
    expect(body).toContain("Reject empty slots and placeholders");
    expect(body).toContain("Extract only stickers with readable code/text");
    expect(body).toContain("\"maxOutputTokens\":500");
  });

  it("asks Gemini to transcribe first for backend-only audio fallback", async () => {
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
      type: "audio",
      reason: "local-engine-fail",
      file: {
        data: new ArrayBuffer(1),
        mimeType: "audio/webm",
        name: "stickers.webm",
      },
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const body = String(request && "body" in request ? request.body : "");

    expect(body).toContain("Transcribe and extract sticker codes from speech.");
    expect(body).toContain("If no transcript, transcribe first, then extract.");
  });

  it("parses recoverable JSON responses from image analysis", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "```json\n{\"stickers\":[{\"code\":\"MEX 13\"}]}\n```",
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await parseStickersWithGemini({
      type: "image",
      file: {
        data: new ArrayBuffer(1),
        mimeType: "image/jpeg",
        name: "stickers.jpg",
      },
    });

    expect(result.result).toEqual({
      stickers: [{ code: "MEX 13" }],
      unresolved: [],
    });
  });

  it("passes abort signals to Gemini fetches", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";
    const controller = new AbortController();

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

    await parseStickersWithGemini(
      {
        type: "text",
        text: "MEX 13",
      },
      { signal: controller.signal },
    );

    const request = fetchSpy.mock.calls[0]?.[1];
    expect(request && "signal" in request ? request.signal : undefined)
      .toBe(controller.signal);
  });
});
