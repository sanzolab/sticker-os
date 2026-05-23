import { stickers, stickersById } from "@/lib/sticker-data";

const SHARED_ALBUM_LINK_TYPE = "shared_album_link";
const SHARED_ALBUM_LINK_VERSION = 1;
const SHARED_ALBUM_COLLECTION_ID = "stickeros-fwc26";
const MAX_STICKER_COPIES = 999;
const ENCODED_PREFIX_COMPRESSED = "gz.";
const ENCODED_PREFIX_JSON = "json.";
const STREAM_TIMEOUT_MS = 4000;

export const MAX_SHARED_ALBUM_URL_LENGTH = 1800;

type CollectionByStickerId = Record<string, number>;

export type SharedAlbumLinkPayloadV1 = {
  type: typeof SHARED_ALBUM_LINK_TYPE;
  v: typeof SHARED_ALBUM_LINK_VERSION;
  collection: {
    id: typeof SHARED_ALBUM_COLLECTION_ID;
    stickerCount: number;
    datasetHash: string;
  };
  createdAt: string;
  senderName?: string;
  stickers: [string, number][];
};

export type SharedAlbumSnapshot = {
  createdAt: string;
  senderName: string;
  collectionByStickerId: CollectionByStickerId;
  collectedIds: string[];
  missingIds: string[];
  duplicateIds: string[];
  stats: {
    total: number;
    collected: number;
    missing: number;
    duplicateCopies: number;
    completion: number;
  };
};

export type SharedAlbumLinkParseError =
  | "invalid"
  | "invalid-shape"
  | "invalid-version"
  | "invalid-collection"
  | "invalid-stickers"
  | "invalid-created-at"
  | "unsupported-compression";

export type SharedAlbumLinkParseResult =
  | { ok: true; snapshot: SharedAlbumSnapshot }
  | { ok: false; reason: SharedAlbumLinkParseError };

export async function buildSharedAlbumLinkData({
  collectionByStickerId,
  senderName,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
}) {
  const payload = buildSharedAlbumPayload({
    collectionByStickerId,
    senderName,
  });
  const json = JSON.stringify(payload);
  const compressed = await compressText(json);

  if (compressed) {
    return `${ENCODED_PREFIX_COMPRESSED}${bytesToBase64Url(compressed)}`;
  }

  return `${ENCODED_PREFIX_JSON}${stringToBase64Url(json)}`;
}

export async function parseSharedAlbumLinkData(
  data: string,
): Promise<SharedAlbumLinkParseResult> {
  const encoded = data.trim();

  if (!encoded) return { ok: false, reason: "invalid" };

  let json = "";

  if (encoded.startsWith(ENCODED_PREFIX_COMPRESSED)) {
    const compressed = base64UrlToBytes(
      encoded.slice(ENCODED_PREFIX_COMPRESSED.length),
    );
    if (!compressed) return { ok: false, reason: "invalid" };

    const decompressed = await decompressText(compressed);
    if (!decompressed) {
      return { ok: false, reason: "unsupported-compression" };
    }
    json = decompressed;
  } else if (encoded.startsWith(ENCODED_PREFIX_JSON)) {
    const decoded = base64UrlToString(encoded.slice(ENCODED_PREFIX_JSON.length));
    if (!decoded) return { ok: false, reason: "invalid" };
    json = decoded;
  } else {
    const decoded = base64UrlToString(encoded);
    if (!decoded) return { ok: false, reason: "invalid" };
    json = decoded;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid-shape" };
  }

  const payload = raw as Record<string, unknown>;
  if (payload.type !== SHARED_ALBUM_LINK_TYPE) {
    return { ok: false, reason: "invalid-shape" };
  }
  if (payload.v !== SHARED_ALBUM_LINK_VERSION) {
    return { ok: false, reason: "invalid-version" };
  }

  const collection = payload.collection;
  if (
    !collection ||
    typeof collection !== "object" ||
    Array.isArray(collection)
  ) {
    return { ok: false, reason: "invalid-shape" };
  }

  const collectionRecord = collection as Record<string, unknown>;
  if (
    collectionRecord.id !== SHARED_ALBUM_COLLECTION_ID ||
    collectionRecord.stickerCount !== stickers.length ||
    collectionRecord.datasetHash !== datasetHash
  ) {
    return { ok: false, reason: "invalid-collection" };
  }

  if (
    typeof payload.createdAt !== "string" ||
    Number.isNaN(Date.parse(payload.createdAt))
  ) {
    return { ok: false, reason: "invalid-created-at" };
  }

  if (!Array.isArray(payload.stickers)) {
    return { ok: false, reason: "invalid-stickers" };
  }

  const collectionByStickerId: CollectionByStickerId = {};
  const seenIds = new Set<string>();

  for (const entry of payload.stickers) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return { ok: false, reason: "invalid-stickers" };
    }

    const [stickerId, copies] = entry;
    if (typeof stickerId !== "string") {
      return { ok: false, reason: "invalid-stickers" };
    }

    if (seenIds.has(stickerId)) {
      return { ok: false, reason: "invalid-stickers" };
    }
    seenIds.add(stickerId);

    if (
      typeof copies !== "number" ||
      !Number.isInteger(copies) ||
      copies < 0 ||
      copies > MAX_STICKER_COPIES
    ) {
      return { ok: false, reason: "invalid-stickers" };
    }

    if (!stickersById[stickerId]) {
      continue;
    }

    if (copies > 0) {
      collectionByStickerId[stickerId] = copies;
    }
  }

  const senderName =
    typeof payload.senderName === "string" ? payload.senderName.trim() : "";

  return {
    ok: true,
    snapshot: buildSnapshot({
      createdAt: payload.createdAt,
      senderName,
      collectionByStickerId,
    }),
  };
}

export function buildSharedAlbumPayload({
  collectionByStickerId,
  senderName,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
}): SharedAlbumLinkPayloadV1 {
  return {
    type: SHARED_ALBUM_LINK_TYPE,
    v: SHARED_ALBUM_LINK_VERSION,
    collection: {
      id: SHARED_ALBUM_COLLECTION_ID,
      stickerCount: stickers.length,
      datasetHash,
    },
    createdAt: new Date().toISOString(),
    senderName: sanitizeSenderName(senderName),
    stickers: stickers
      .map((sticker) => [sticker.id, collectionByStickerId[sticker.id] ?? 0] as [string, number])
      .filter((entry) => entry[1] > 0),
  };
}

export function getSharedAlbumSnapshotFromCollection({
  collectionByStickerId,
  senderName,
  createdAt,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
  createdAt?: string;
}): SharedAlbumSnapshot {
  return buildSnapshot({
    createdAt: createdAt ?? new Date().toISOString(),
    senderName: sanitizeSenderName(senderName),
    collectionByStickerId: sanitizeCollectionByStickerId(collectionByStickerId),
  });
}

function buildSnapshot({
  createdAt,
  senderName,
  collectionByStickerId,
}: {
  createdAt: string;
  senderName: string;
  collectionByStickerId: CollectionByStickerId;
}): SharedAlbumSnapshot {
  const collectedIds: string[] = [];
  const missingIds: string[] = [];
  const duplicateIds: string[] = [];
  let duplicateCopies = 0;

  for (const sticker of stickers) {
    const copies = collectionByStickerId[sticker.id] ?? 0;
    if (copies > 0) {
      collectedIds.push(sticker.id);
      if (copies > 1) {
        duplicateIds.push(sticker.id);
        duplicateCopies += copies - 1;
      }
    } else {
      missingIds.push(sticker.id);
    }
  }

  const total = stickers.length;
  const collected = collectedIds.length;

  return {
    createdAt,
    senderName,
    collectionByStickerId,
    collectedIds,
    missingIds,
    duplicateIds,
    stats: {
      total,
      collected,
      missing: total - collected,
      duplicateCopies,
      completion: total === 0 ? 0 : Math.round((collected / total) * 100),
    },
  };
}

function sanitizeCollectionByStickerId(
  value: CollectionByStickerId,
): CollectionByStickerId {
  const next: CollectionByStickerId = {};

  for (const sticker of stickers) {
    const copies = value[sticker.id] ?? 0;

    if (
      Number.isInteger(copies) &&
      copies > 0 &&
      copies <= MAX_STICKER_COPIES
    ) {
      next[sticker.id] = copies;
    }
  }

  return next;
}

function sanitizeSenderName(value: string | undefined) {
  if (!value) return "";
  return value.trim().slice(0, 48);
}

async function compressText(value: string): Promise<Uint8Array | null> {
  if (
    typeof CompressionStream === "undefined" ||
    typeof TextEncoder === "undefined"
  ) {
    return null;
  }

  try {
    const input = new TextEncoder().encode(value);
    const stream = new CompressionStream("gzip");
    const readerPromise = new Response(stream.readable).arrayBuffer();
    const writer = stream.writable.getWriter();
    await withTimeout(writer.write(input), STREAM_TIMEOUT_MS);
    await withTimeout(writer.close(), STREAM_TIMEOUT_MS);
    const arrayBuffer = await withTimeout(readerPromise, STREAM_TIMEOUT_MS);
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("compressText failed:", error);
    }
    return null;
  }
}

async function decompressText(value: Uint8Array): Promise<string | null> {
  if (
    typeof DecompressionStream === "undefined" ||
    typeof TextDecoder === "undefined"
  ) {
    return null;
  }

  try {
    const stream = new DecompressionStream("gzip");
    const readerPromise = new Response(stream.readable).arrayBuffer();
    const writer = stream.writable.getWriter();
    await withTimeout(writer.write(new Uint8Array(value)), STREAM_TIMEOUT_MS);
    await withTimeout(writer.close(), STREAM_TIMEOUT_MS);
    const arrayBuffer = await withTimeout(readerPromise, STREAM_TIMEOUT_MS);
    return new TextDecoder().decode(arrayBuffer);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("decompressText failed:", error);
    }
    return null;
  }
}

export { STREAM_TIMEOUT_MS };

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function stringToBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(value, "utf8").toString("base64url");
    } catch {
      // Browser Buffer polyfill may not support base64url; fall through.
    }
  }

  const bytes = new TextEncoder().encode(value);
  return bytesToBase64Url(bytes);
}

function base64UrlToString(value: string) {
  if (!value) return null;

  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(value, "base64url").toString("utf8");
    } catch {
      // Browser Buffer polyfill may not support base64url; fall through.
    }
  }

  const bytes = base64UrlToBytes(value);
  if (!bytes) return null;
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(bytes).toString("base64url");
    } catch {
      // Browser Buffer polyfill may not support base64url; fall through.
    }
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!value) return null;

  if (typeof Buffer !== "undefined") {
    try {
      return new Uint8Array(Buffer.from(value, "base64url"));
    } catch {
      // Browser Buffer polyfill may not support base64url; fall through.
    }
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function hashStickerIds(ids: string[]) {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  const input = ids.join("\n");

  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index);
    hashA ^= char;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB ^= char + index;
    hashB = Math.imul(hashB, 0x811c9dc5) >>> 0;
  }

  return `${hashA.toString(16).padStart(8, "0")}${hashB
    .toString(16)
    .padStart(8, "0")}`;
}

const datasetHash = hashStickerIds(
  [...stickers]
    .sort((a, b) => a.stickerOsIndex - b.stickerOsIndex)
    .map((sticker) => sticker.id),
);
