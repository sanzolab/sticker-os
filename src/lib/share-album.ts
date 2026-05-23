import { customAlphabet } from "nanoid";
import { getSupabase } from "@/lib/supabase";
import { stickers, stickersById } from "@/lib/sticker-data";
import { hasLocalAlbumProgress } from "@/lib/shared-album-import";
import {
  buildSharedAlbumLinkData,
  MAX_SHARED_ALBUM_URL_LENGTH,
} from "@/lib/shared-album-link";

const SHARE_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SHARE_ID_LENGTH = 10;
const SHARE_SECRET_LENGTH = 32;

const generateShareId = customAlphabet(SHARE_ID_ALPHABET, SHARE_ID_LENGTH);
const generateShareSecret = customAlphabet(SHARE_ID_ALPHABET, SHARE_SECRET_LENGTH);
const MAX_STICKER_COPIES = 999;

/**
 * Remote share ownership is capability-based via id + update_secret.
 * This is acceptable for the lightweight public-sharing MVP because
 * shared albums contain no sensitive sticker data.
 *
 * Future hardening can move writes behind a Supabase Edge Function
 * without changing the public client API.
 */

type CollectionByStickerId = Record<string, number>;

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

type SharedAlbumRow = {
  id: string;
  payload: SharedAlbumPayload;
  sender_name: string;
  created_at: string;
};

type SharedAlbumPayload = {
  v: 1;
  stickerCount: number;
  senderName: string;
  createdAt: string;
  stickers: [string, number][];
};

export type FetchSharedAlbumResult =
  | { ok: true; snapshot: SharedAlbumSnapshot }
  | { ok: false; reason: "not-found" | "expired" | "invalid" | "network" };

export type ShareLinkResult =
  | { ok: true; url: string; kind: "inline" | "remote"; id?: string; secret?: string }
  | { ok: false; reason: "empty" | "error" };

export async function uploadSharedAlbum({
  collectionByStickerId,
  senderName,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
}): Promise<{ id: string; secret: string }> {
  const supabase = getSupabase();
  const name = sanitizeSenderName(senderName);
  const payload = buildPayload({ collectionByStickerId, senderName });
  const secret = generateShareSecret();

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = generateShareId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("shared_albums").insert({
      id,
      payload,
      sender_name: name,
      update_secret: secret,
    });

    if (!error) return { id, secret };

    const pgCode = (error as { code?: string }).code;
    if (pgCode !== "23505") {
      lastError = error;
      break;
    }

    lastError = error;
  }

  throw lastError ?? new Error("Failed to insert shared album after retries");
}

export async function fetchSharedAlbum(
  id: string,
): Promise<FetchSharedAlbumResult> {
  if (!isValidShareId(id)) {
    return { ok: false, reason: "not-found" };
  }

  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)("shared_albums")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("fetchSharedAlbum error:", error);
    }
    return { ok: false, reason: "network" };
  }

  if (!data) {
    return { ok: false, reason: "not-found" };
  }

  if (isExpired(data.created_at)) {
    return { ok: false, reason: "expired" };
  }

  const row = data as SharedAlbumRow;
  if (!isValidPayload(row.payload)) {
    return { ok: false, reason: "invalid" };
  }

  if (row.payload.stickerCount !== stickers.length) {
    return { ok: false, reason: "invalid" };
  }

  const collectionByStickerId: CollectionByStickerId = {};
  for (const [stickerId, copies] of row.payload.stickers) {
    if (
      typeof stickerId !== "string" ||
      typeof copies !== "number" ||
      !Number.isInteger(copies) ||
      copies < 1 ||
      copies > MAX_STICKER_COPIES ||
      !stickersById[stickerId]
    ) {
      continue;
    }
    collectionByStickerId[stickerId] = copies;
  }

  return {
    ok: true,
    snapshot: buildSnapshot({
      createdAt: row.payload.createdAt || row.created_at,
      senderName: sanitizeSenderName(row.payload.senderName || row.sender_name),
      collectionByStickerId,
    }),
  };
}

export function getShareUrl(id: string) {
  return `/shared-album/${id}`;
}

export function getShareAbsoluteUrl(id: string) {
  if (typeof window === "undefined") return getShareUrl(id);
  return `${window.location.origin}${getShareUrl(id)}`;
}

/**
 * Creates or updates a share link using the hybrid strategy:
 * - Empty albums return { ok: false, reason: "empty" }
 * - Existing persistent shares are always updated (stable URL)
 * - Without a persistent share, small albums use inline URLs,
 *   large albums create a new persistent remote share.
 */
export async function createShareLink({
  collectionByStickerId,
  senderName,
  localShareId,
  localShareSecret,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
  localShareId?: string;
  localShareSecret?: string;
}): Promise<ShareLinkResult> {
  if (!hasLocalAlbumProgress(collectionByStickerId)) {
    return { ok: false, reason: "empty" };
  }

  if (localShareId && localShareSecret) {
    const updated = await updateSharedAlbum({
      id: localShareId,
      secret: localShareSecret,
      collectionByStickerId,
      senderName,
    }).catch(() => false);

    if (updated) {
      return {
        ok: true,
        url: getShareAbsoluteUrl(localShareId),
        kind: "remote",
        id: localShareId,
        secret: localShareSecret,
      };
    }
  }

  try {
    const inlineData = await buildSharedAlbumLinkData({
      collectionByStickerId,
      senderName,
    });
    const inlineUrl = `${
      typeof window !== "undefined" ? window.location.origin : ""
    }/shared-album?data=${encodeURIComponent(inlineData)}`;

    if (inlineUrl.length <= MAX_SHARED_ALBUM_URL_LENGTH) {
      return { ok: true, url: inlineUrl, kind: "inline" };
    }
  } catch {
    // Inline generation failed — fall through to remote.
  }

  try {
    const { id, secret } = await uploadSharedAlbum({
      collectionByStickerId,
      senderName,
    });
    return {
      ok: true,
      url: getShareAbsoluteUrl(id),
      kind: "remote",
      id,
      secret,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function updateSharedAlbum({
  id,
  secret,
  collectionByStickerId,
  senderName,
}: {
  id: string;
  secret: string;
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
}): Promise<boolean> {
  const supabase = getSupabase();
  const name = sanitizeSenderName(senderName);
  const payload = buildPayload({ collectionByStickerId, senderName });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)("shared_albums")
    .update({ payload, sender_name: name })
    .eq("id", id)
    .eq("update_secret", secret);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("updateSharedAlbum failed:", error);
    }
    return false;
  }

  return true;
}

function buildPayload({
  collectionByStickerId,
  senderName,
}: {
  collectionByStickerId: CollectionByStickerId;
  senderName?: string;
}): SharedAlbumPayload {
  const name = sanitizeSenderName(senderName);

  return {
    v: 1,
    stickerCount: stickers.length,
    senderName: name,
    createdAt: new Date().toISOString(),
    stickers: stickers
      .map((sticker) => [sticker.id, collectionByStickerId[sticker.id] ?? 0] as [string, number])
      .filter(([, copies]) => copies > 0),
  };
}

function isValidShareId(value: string): boolean {
  if (value.length !== SHARE_ID_LENGTH) return false;
  for (let i = 0; i < value.length; i++) {
    if (!SHARE_ID_ALPHABET.includes(value[i])) return false;
  }
  return true;
}

function isValidPayload(value: unknown): value is SharedAlbumPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.stickerCount === "number" &&
    Array.isArray(p.stickers)
  );
}

function isExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - created > ninetyDays;
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

function sanitizeSenderName(value: string | undefined) {
  if (!value) return "";
  return value.trim().slice(0, 48);
}
