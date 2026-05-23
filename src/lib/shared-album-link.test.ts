import { afterEach, describe, expect, it } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  buildSharedAlbumPayload,
  buildSharedAlbumLinkData,
  parseSharedAlbumLinkData,
} from "@/lib/shared-album-link";

const originalCompressionStream = globalThis.CompressionStream;
const originalDecompressionStream = globalThis.DecompressionStream;

describe("shared album links", () => {
  afterEach(() => {
    globalThis.CompressionStream = originalCompressionStream;
    globalThis.DecompressionStream = originalDecompressionStream;
  });

  it("roundtrips valid data and derives missing/duplicates", async () => {
    const collection = {
      [stickers[0].id]: 2,
      [stickers[1].id]: 1,
    };

    const data = await buildSharedAlbumLinkData({
      collectionByStickerId: collection,
      senderName: "  Alice  ",
    });
    const result = await parseSharedAlbumLinkData(data);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.senderName).toBe("Alice");
    expect(result.snapshot.collectionByStickerId[stickers[0].id]).toBe(2);
    expect(result.snapshot.collectionByStickerId[stickers[1].id]).toBe(1);
    expect(result.snapshot.duplicateIds).toEqual([stickers[0].id]);
    expect(result.snapshot.missingIds).toContain(stickers[2].id);
  });

  it("uses compressed payloads when compression streams are available", async () => {
    if (typeof originalCompressionStream === "undefined") {
      return;
    }

    const data = await buildSharedAlbumLinkData({
      collectionByStickerId: {
        [stickers[0].id]: 1,
      },
    });

    expect(data.startsWith("gz.")).toBe(true);
  });

  it("falls back to json payload when compression is unsupported", async () => {
    (
      globalThis as unknown as {
        CompressionStream: typeof CompressionStream | undefined;
      }
    ).CompressionStream = undefined;

    const data = await buildSharedAlbumLinkData({
      collectionByStickerId: {
        [stickers[0].id]: 1,
      },
    });

    expect(data.startsWith("json.")).toBe(true);
  });

  it("falls back to json payload when compression times out", async () => {
    class HangingCompressionStream {
      readable = new ReadableStream<Uint8Array>();
      writable = new WritableStream<Uint8Array>({
        write() {
          return new Promise<void>(() => {});
        },
      });
    }
    globalThis.CompressionStream =
      HangingCompressionStream as unknown as typeof CompressionStream;

    const data = await buildSharedAlbumLinkData({
      collectionByStickerId: {
        [stickers[0].id]: 1,
      },
    });

    expect(data.startsWith("json.")).toBe(true);
  });

  it("returns unsupported-compression when decompression times out", async () => {
    if (typeof originalCompressionStream === "undefined") {
      return;
    }

    class HangingDecompressionStream {
      readable = new ReadableStream<Uint8Array>();
      writable = new WritableStream<Uint8Array>({
        write() {
          return new Promise<void>(() => {});
        },
      });
    }
    globalThis.DecompressionStream =
      HangingDecompressionStream as unknown as typeof DecompressionStream;

    const validCompressed = await buildSharedAlbumLinkData({
      collectionByStickerId: {
        [stickers[0].id]: 1,
      },
    });

    const parsed = await parseSharedAlbumLinkData(validCompressed);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toBe("unsupported-compression");
  });

  it("rejects invalid version and contract", async () => {
    const validPayload = buildSharedAlbumPayload({
      collectionByStickerId: {},
    });

    const invalidVersion = encodePayload({ ...validPayload, v: 2 });
    const invalidCollection = encodePayload({
      ...validPayload,
      collection: { ...validPayload.collection, id: "other" },
    });

    await expectReason(invalidVersion, "invalid-version");
    await expectReason(invalidCollection, "invalid-collection");
  });

  it("rejects invalid stickers payloads", async () => {
    const validPayload = buildSharedAlbumPayload({
      collectionByStickerId: {},
    });
    const knownId = stickers[0].id;

    const duplicateIds = encodePayload({
      ...validPayload,
      stickers: [
        [knownId, 1],
        [knownId, 2],
      ],
    });
    const invalidCount = encodePayload({
      ...validPayload,
      stickers: [[knownId, -1]],
    });

    await expectReason(duplicateIds, "invalid-stickers");
    await expectReason(invalidCount, "invalid-stickers");
  });

  it("ignores unknown sticker ids without failing", async () => {
    const validPayload = buildSharedAlbumPayload({
      collectionByStickerId: {},
    });
    const knownId = stickers[0].id;

    const withUnknown = encodePayload({
      ...validPayload,
      stickers: [
        ["UNKNOWN-1", 4],
        [knownId, 2],
      ],
    });
    const result = await parseSharedAlbumLinkData(withUnknown);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      Object.prototype.hasOwnProperty.call(
        result.snapshot.collectionByStickerId,
        "UNKNOWN-1",
      ),
    ).toBe(false);
    expect(result.snapshot.collectionByStickerId[knownId]).toBe(2);
  });

  it("roundtrips correctly when Buffer exists but does not support base64url", async () => {
    const originalFrom = Buffer.from;
    const originalToString = Buffer.prototype.toString;

    Buffer.from = ((data: unknown, encoding?: string): Buffer => {
      if (encoding === "base64url") {
        throw new TypeError("Unknown encoding: base64url");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalFrom(data as any, (encoding ?? "utf8") as BufferEncoding);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    Buffer.prototype.toString = function (
      this: Buffer,
      encoding?: BufferEncoding,
    ): string {
      if (encoding === ("base64url" as BufferEncoding)) {
        throw new TypeError("Unknown encoding: base64url");
      }
      return originalToString.call(this, encoding as BufferEncoding);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    try {
      const collection = {
        [stickers[0].id]: 2,
        [stickers[1].id]: 1,
      };

      const data = await buildSharedAlbumLinkData({
        collectionByStickerId: collection,
        senderName: "Test",
      });
      expect(data).toBeTruthy();
      // Buffer base64url failure won't prevent compression — both gz./json. are valid
      expect(
        data.startsWith("gz.") || data.startsWith("json."),
      ).toBe(true);

      const result = await parseSharedAlbumLinkData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.snapshot.senderName).toBe("Test");
      expect(result.snapshot.collectionByStickerId[stickers[0].id]).toBe(2);
    } finally {
      Buffer.from = originalFrom;
      Buffer.prototype.toString = originalToString;
    }
  });

  it("roundtrips correctly without Node.js Buffer available", async () => {
    const originalBuffer = globalThis.Buffer;
    (globalThis as Record<string, unknown>).Buffer = undefined;

    try {
      const collection = {
        [stickers[0].id]: 2,
        [stickers[1].id]: 1,
      };

      const data = await buildSharedAlbumLinkData({
        collectionByStickerId: collection,
        senderName: "Test",
      });
      expect(data).toBeTruthy();
      expect(
        data.startsWith("gz.") || data.startsWith("json."),
      ).toBe(true);

      const result = await parseSharedAlbumLinkData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.snapshot.collectionByStickerId[stickers[0].id]).toBe(2);
    } finally {
      (globalThis as Record<string, unknown>).Buffer = originalBuffer;
    }
  });
});

async function expectReason(
  value: string,
  reason:
    | "invalid"
    | "invalid-shape"
    | "invalid-version"
    | "invalid-collection"
    | "invalid-stickers"
    | "invalid-created-at"
    | "unsupported-compression",
) {
  const parsed = await parseSharedAlbumLinkData(value);
  if (parsed.ok) throw new Error("Expected parser to reject");
  expect(parsed.reason).toBe(reason);
}

function encodePayload(payload: unknown) {
  return `json.${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}
