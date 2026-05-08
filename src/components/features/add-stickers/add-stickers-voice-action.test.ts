import { describe, expect, it } from "vitest";
import { normalizeRecordedAudioMimeType } from "./add-stickers-voice-action";

describe("normalizeRecordedAudioMimeType", () => {
  it("canonicalizes codec MIME variants to supported containers", () => {
    expect(normalizeRecordedAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeRecordedAudioMimeType("audio/mp4;codecs=mp4a.40.2")).toBe("audio/mp4");
    expect(normalizeRecordedAudioMimeType("audio/x-m4a")).toBe("audio/mp4");
    expect(normalizeRecordedAudioMimeType("audio/ogg;codecs=opus")).toBe("audio/ogg");
  });
});
