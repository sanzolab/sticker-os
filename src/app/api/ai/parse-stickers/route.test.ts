import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { parseStickersFromInputMock } = vi.hoisted(() => ({
  parseStickersFromInputMock: vi.fn(),
}));

vi.mock("@/lib/ai", () => {
  class AiParseError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  return {
    AiParseError,
    parseStickersFromInput: parseStickersFromInputMock,
  };
});

import { AiParseError } from "@/lib/ai";
import { POST } from "./route";

describe("POST /api/ai/parse-stickers", () => {
  const originalMaxAudioMb = process.env.AI_MAX_AUDIO_MB;

  beforeEach(() => {
    parseStickersFromInputMock.mockReset();
    delete process.env.AI_MAX_AUDIO_MB;
  });

  afterEach(() => {
    if (originalMaxAudioMb === undefined) {
      delete process.env.AI_MAX_AUDIO_MB;
    } else {
      process.env.AI_MAX_AUDIO_MB = originalMaxAudioMb;
    }
  });

  it("accepts voice transcript JSON and passes source to the parser", async () => {
    parseStickersFromInputMock.mockResolvedValue({
      candidates: [],
      unresolved: [],
      provider: "deterministic",
      source: "text",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/parse-stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          source: "voice-transcript",
          text: "agrega México trece",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(parseStickersFromInputMock).toHaveBeenCalledWith({
      type: "text",
      source: "voice-transcript",
      provider: undefined,
      text: "agrega México trece",
    });
  });

  it("accepts audio multipart uploads and passes audio input to the parser", async () => {
    parseStickersFromInputMock.mockResolvedValue({
      candidates: [],
      unresolved: [],
      provider: "gemini",
      model: "configured-model",
      source: "audio",
    });

    const response = await POST(
      requestWithFile("audio", new File(["voice"], "voice.webm", { type: "audio/webm" })),
    );

    expect(response.status).toBe(200);
    expect(parseStickersFromInputMock).toHaveBeenCalledWith({
      type: "audio",
      provider: undefined,
      file: expect.objectContaining({
        mimeType: "audio/webm",
        name: "voice.webm",
      }),
    });
  });

  it("accepts codec audio MIME variants and canonicalizes to supported container type", async () => {
    parseStickersFromInputMock.mockResolvedValue({
      candidates: [],
      unresolved: [],
      provider: "gemini",
      model: "configured-model",
      source: "audio",
    });

    const response = await POST(
      requestWithFile(
        "audio",
        new File(["voice"], "voice.webm", { type: "audio/webm;codecs=opus" }),
      ),
    );

    expect(response.status).toBe(200);
    expect(parseStickersFromInputMock).toHaveBeenCalledWith({
      type: "audio",
      provider: undefined,
      file: expect.objectContaining({
        mimeType: "audio/webm",
        name: "voice.webm",
      }),
    });
  });

  it("rejects unsupported audio MIME types before calling the parser", async () => {
    const response = await POST(
      requestWithFile("audio", new File(["voice"], "voice.txt", { type: "text/plain" })),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("AI_UNSUPPORTED_MIME_TYPE");
    expect(parseStickersFromInputMock).not.toHaveBeenCalled();
  });

  it("rejects oversized audio before calling the parser", async () => {
    process.env.AI_MAX_AUDIO_MB = "0.000001";

    const response = await POST(
      requestWithFile("audio", new File(["voice"], "voice.webm", { type: "audio/webm" })),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("AI_FILE_TOO_LARGE");
    expect(parseStickersFromInputMock).not.toHaveBeenCalled();
  });

  it("returns provider configuration errors from the parser", async () => {
    parseStickersFromInputMock.mockRejectedValue(
      new AiParseError(
        "AI_PROVIDER_NOT_CONFIGURED",
        "Gemini API key and model must be configured.",
        503,
      ),
    );

    const response = await POST(
      requestWithFile("audio", new File(["voice"], "voice.webm", { type: "audio/webm" })),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
  });

  it("returns invalid model response errors from the parser", async () => {
    parseStickersFromInputMock.mockRejectedValue(
      new AiParseError(
        "AI_INVALID_MODEL_RESPONSE",
        "The AI response was not valid sticker JSON.",
        502,
      ),
    );

    const response = await POST(
      requestWithFile("audio", new File(["voice"], "voice.webm", { type: "audio/webm" })),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.code).toBe("AI_INVALID_MODEL_RESPONSE");
  });
});

function requestWithFile(type: "image" | "audio", file: File) {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);

  return new Request("http://localhost/api/ai/parse-stickers", {
    method: "POST",
    body: formData,
  });
}
