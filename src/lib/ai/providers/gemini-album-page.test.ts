import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeAlbumPage } from "@/lib/ai/providers/gemini-album-page";

const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }

  if (originalModel === undefined) {
    delete process.env.GEMINI_MODEL;
  } else {
    process.env.GEMINI_MODEL = originalModel;
  }
});

describe("analyzeAlbumPage", () => {
  it("defaults the model to gemini-2.5-flash-lite and requests missing-only output schema", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    delete process.env.GEMINI_MODEL;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      pageType: "team",
                      country: "Mexico",
                      group: "MEX",
                      isFullTeamPage: true,
                      imageQuality: "good",
                      faltantes: [{ group: "MEX", number: "7" }],
                      uncertainEmptySlots: [],
                      warnings: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response,
    );

    await analyzeAlbumPage({
      imageBase64: "abc",
      mimeType: "image/jpeg",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain("gemini-2.5-flash-lite");
    const payload = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<{ text?: string }> }>;
      generationConfig: {
        responseSchema: {
          properties: Record<string, unknown>;
        };
      };
    };

    expect(payload.contents[0]?.parts[0]?.text).toContain("Do not list filled stickers");
    expect(payload.contents[0]?.parts[0]?.text).toContain(
      "Do not scan the entire page. Extract only clearly visible empty sticker slots.",
    );
    expect(payload.contents[0]?.parts[0]?.text).not.toContain("\"presentes\"");
    expect(payload.generationConfig.responseSchema.properties.presentes).toBeUndefined();
    expect(payload.generationConfig.responseSchema.properties.faltantes).toBeDefined();
    expect(payload.generationConfig.responseSchema.properties.uncertainEmptySlots).toBeDefined();
  });

  it("parses fenced JSON model output", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.GEMINI_MODEL = "gemini-custom";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "```json\n{\"pageType\":\"team\",\"country\":\"Mexico\",\"group\":\"MEX\",\"isFullTeamPage\":true,\"imageQuality\":\"ok\",\"faltantes\":[],\"uncertainEmptySlots\":[],\"warnings\":[]}\n```",
                  },
                ],
              },
            },
          ],
        }),
      } as Response,
    );

    const result = await analyzeAlbumPage({
      imageBase64: "abc",
      mimeType: "image/jpeg",
    });

    expect(result.modelResult.pageType).toBe("team");
    expect(result.meta?.model).toBe("gemini-custom");
  });
});
