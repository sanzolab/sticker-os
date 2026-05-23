import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  uploadSharedAlbum,
  fetchSharedAlbum,
  createShareLink,
  updateSharedAlbum,
  getShareUrl,
  getShareAbsoluteUrl,
} from "@/lib/share-album";

const mockSupabase = {
  from: vi.fn(),
  select: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock("nanoid", () => ({
  customAlphabet: () => () => "abc123abcd",
}));

vi.mock("@/lib/shared-album-import", () => ({
  hasLocalAlbumProgress: (collection: Record<string, number>) =>
    Object.values(collection).some((v) => v > 0),
}));

const { buildSharedAlbumLinkDataMock } = vi.hoisted(() => ({
  buildSharedAlbumLinkDataMock: vi.fn(),
}));

vi.mock("@/lib/shared-album-link", () => ({
  buildSharedAlbumLinkData: buildSharedAlbumLinkDataMock,
  MAX_SHARED_ALBUM_URL_LENGTH: 1800,
}));

const COLLECTION = {
  [stickers[0].id]: 2,
  [stickers[1].id]: 1,
};

beforeAll(() => {
  globalThis.window = {
    location: { origin: "https://sticker.os" },
  } as Window & typeof globalThis;
});

afterAll(() => {
  (globalThis as { window?: Window }).window = undefined;
});

describe("uploadSharedAlbum", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a shared album and returns the share id and secret", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await uploadSharedAlbum({
      collectionByStickerId: COLLECTION,
      senderName: "  Alice  ",
    });

    expect(result.id).toBe("abc123abcd");
    expect(result.secret).toBe("abc123abcd");
    expect(mockInsert).toHaveBeenCalledWith({
      id: "abc123abcd",
      payload: expect.objectContaining({
        v: 1,
        senderName: "Alice",
      }),
      sender_name: "Alice",
      update_secret: "abc123abcd",
    });
  });

  it("retries on primary key collision", async () => {
    const mockInsert = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: "23505", message: "duplicate key" } })
      .mockResolvedValueOnce({ error: null });

    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await uploadSharedAlbum({
      collectionByStickerId: COLLECTION,
    });

    expect(result.id).toBe("abc123abcd");
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("throws after 3 consecutive collisions", async () => {
    const collisionResult = { error: { code: "23505", message: "duplicate key" } };
    const mockInsert = vi.fn().mockResolvedValue(collisionResult);
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    await expect(
      uploadSharedAlbum({ collectionByStickerId: {} }),
    ).rejects.toBeDefined();

    expect(mockInsert).toHaveBeenCalledTimes(3);
  });
});

describe("updateSharedAlbum", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful update", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const result = await updateSharedAlbum({
      id: "abc123abcd",
      secret: "sec",
      collectionByStickerId: COLLECTION,
      senderName: "Bob",
    });

    expect(result).toBe(true);
  });

  it("returns false on update error", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("boom") }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const result = await updateSharedAlbum({
      id: "abc123abcd",
      secret: "sec",
      collectionByStickerId: COLLECTION,
    });

    expect(result).toBe(false);
  });
});

describe("createShareLink", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty for albums with no stickers", async () => {
    const result = await createShareLink({
      collectionByStickerId: {},
      senderName: "Test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("updates existing persistent share", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const result = await createShareLink({
      collectionByStickerId: COLLECTION,
      localShareId: "persistent1",
      localShareSecret: "secret1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("remote");
    expect(result.url).toContain("/shared-album/persistent1");
    expect(result.id).toBe("persistent1");
    expect(result.secret).toBe("secret1");
  });

  it("falls through to new share when update fails", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("deleted") }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    buildSharedAlbumLinkDataMock.mockResolvedValueOnce("abcdefghij".repeat(200));

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await createShareLink({
      collectionByStickerId: COLLECTION,
      localShareId: "persistent1",
      localShareSecret: "secret1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("remote");
    expect(result.url).toContain("/shared-album/abc123abcd");
  });

  it("returns inline URL for small albums without persistent share", async () => {
    buildSharedAlbumLinkDataMock.mockResolvedValueOnce("short");

    const result = await createShareLink({
      collectionByStickerId: COLLECTION,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("inline");
    expect(result.id).toBeUndefined();
  });

  it("returns remote URL for large albums without persistent share", async () => {
    buildSharedAlbumLinkDataMock.mockResolvedValueOnce("abcdefghij".repeat(200));

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await createShareLink({
      collectionByStickerId: COLLECTION,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("remote");
    expect(result.id).toBe("abc123abcd");
  });

  it("returns error when remote creation fails for large album", async () => {
    buildSharedAlbumLinkDataMock.mockResolvedValueOnce("abcdefghij".repeat(200));

    const mockInsert = vi.fn().mockResolvedValue({ error: { code: "server", message: "boom" } });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await createShareLink({
      collectionByStickerId: COLLECTION,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });
});

describe("fetchSharedAlbum", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid share id format", async () => {
    const result = await fetchSharedAlbum("invalid!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });

  it("returns network error on supabase failure", async () => {
    const mockChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("no connection"),
      }),
    };
    mockSupabase.from.mockReturnThis();
    mockSupabase.select = vi.fn().mockReturnValue(mockChain);

    const result = await fetchSharedAlbum("abc123abcd");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network");
  });

  it("returns not-found when no row exists", async () => {
    const mockChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnThis();
    mockSupabase.select = vi.fn().mockReturnValue(mockChain);

    const result = await fetchSharedAlbum("abc123abcd");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });

  it("returns expired for old albums", async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    const mockChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "abc123abcd",
          payload: { v: 1, stickerCount: stickers.length, stickers: [] },
          sender_name: "Bob",
          created_at: oldDate,
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnThis();
    mockSupabase.select = vi.fn().mockReturnValue(mockChain);

    const result = await fetchSharedAlbum("abc123abcd");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("fetches and validates a shared album successfully", async () => {
    const recentDate = new Date().toISOString();
    const knownId = stickers[0].id;

    const mockChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "abc123abcd",
          payload: {
            v: 1,
            stickerCount: stickers.length,
            senderName: "Bob",
            createdAt: recentDate,
            stickers: [[knownId, 3]],
          },
          sender_name: "Bob",
          created_at: recentDate,
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnThis();
    mockSupabase.select = vi.fn().mockReturnValue(mockChain);

    const result = await fetchSharedAlbum("abc123abcd");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.senderName).toBe("Bob");
    expect(result.snapshot.collectionByStickerId[knownId]).toBe(3);
    expect(result.snapshot.duplicateIds).toContain(knownId);
    expect(result.snapshot.stats.collected).toBeGreaterThan(0);
  });

  it("returns invalid for payload with different sticker count", async () => {
    const recentDate = new Date().toISOString();

    const mockChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "abc123abcd",
          payload: { v: 1, stickerCount: 99999, stickers: [] },
          sender_name: "Bob",
          created_at: recentDate,
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnThis();
    mockSupabase.select = vi.fn().mockReturnValue(mockChain);

    const result = await fetchSharedAlbum("abc123abcd");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });
});

describe("getShareUrl and getShareAbsoluteUrl", () => {
  it("returns a relative URL", () => {
    expect(getShareUrl("abc123abcd")).toBe("/shared-album/abc123abcd");
  });

  it("returns an absolute URL in browser", () => {
    expect(getShareAbsoluteUrl("abc123abcd")).toBe(
      "https://sticker.os/shared-album/abc123abcd",
    );
  });
});
