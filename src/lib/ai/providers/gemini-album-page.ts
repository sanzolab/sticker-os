import { AiParseError } from "@/lib/ai/types";

export type AlbumPageType = "team" | "cc" | "fwc" | null;
export type AlbumPageImageQuality = "good" | "ok" | "poor";

export type AlbumPageSlot = {
  group: string | null;
  number: string;
};

export type AlbumPageUncertainSlot = {
  group: string | null;
  number: string | null;
  reason: string;
};

export type AlbumPageModelResult = {
  pageType?: unknown;
  country?: unknown;
  group?: unknown;
  isFullTeamPage?: unknown;
  imageQuality?: unknown;
  faltantes?: unknown;
  uncertainEmptySlots?: unknown;
  warnings?: unknown;
  presentes?: unknown;
  [key: string]: unknown;
};

export type AlbumPageResult = {
  modelResult: AlbumPageModelResult;
  meta?: {
    model?: string;
  };
};

export type AlbumPageInput = {
  imageBase64: string;
  mimeType?: string;
  cachedContent?: string;
};

type AlbumPageOptions = {
  signal?: AbortSignal;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const USER_PROMPT = `Analyze this Panini World Cup 2026 album page photo as an inventory task.

Return strict JSON only.

Do not identify players.
Do not return player names.
Do not list filled stickers.
Only detect EMPTY album slots.

Step 1: Mentally rotate the image so the text is upright.
Step 2: Detect all visible album placeholders.
Step 3: Classify each visible placeholder:
- EMPTY if it is bare printed album paper with no pasted sticker.
- FILLED if a physical sticker/photo/logo/artwork is pasted on it.
Step 4: For EMPTY placeholders only, read the printed code and number, such as "MEX 11".
Step 5: Return only the readable empty slot numbers.

Determine:
- pageType: "team", "cc", "fwc", or null
- country: full country name if visible and this is a team page, otherwise null
- group:
  - for team pages, the 3-letter country/team code if identifiable
  - for Coca-Cola pages, "CC"
  - for FWC pages, "FWC"
  - null if not identifiable
- isFullTeamPage:
  - true only if this is a team page and all 20 team slots are visible
  - false otherwise
- imageQuality: "good", "ok", or "poor"

Important:
- Empty placeholders may be pale green, flat, and have large white printed shapes.
- Filled stickers usually have photos, logos, strong color blocks, borders, or glossy sticker texture.
- Do not infer missing numbers from sequence.
- Do not guess.
- If an empty placeholder is visible but the number cannot be read, put it in uncertainEmptySlots.
- For team pages, valid slot numbers are 1 to 20.

Full team page rule:
- A full team page means that the 20 numbered team slots from 1 to 20 are visible somewhere in the image.
- The 20 slots may be spread across two facing album pages.
- The image can be rotated, tilted, shadowed, or slightly cropped and still be a full team page if all 20 slot positions are visible.
- Set isFullTeamPage to true when the visible team page contains the full numbered set 1 through 20, whether slots are filled or empty.
- Set isFullTeamPage to false only if one or more slot positions from 1 through 20 are not visible at all.

Examples:
- A rectangle with a player photo is FILLED. Do not output it.
- A rectangle with a team crest/logo sticker is FILLED. Do not output it.
- A pale printed placeholder that says "[TEAM_CODE] [NUMBER]" and has no pasted image is EMPTY. Output its code and number.
- If the placeholder is empty but only the number is readable, output code as null and include the number.
- If the placeholder is empty but the number is not readable, put it in uncertainEmptySlots.

Do not rely on country-specific assumptions. The album page may belong to any national team. Always read the printed 3-letter code directly from each empty placeholder.

JSON schema:
{
  "pageType": "team | cc | fwc | null",
  "country": "string or null",
  "group": "string or null",
  "isFullTeamPage": true,
  "imageQuality": "good | ok | poor",
  "faltantes": [
    {
      "group": "string or null",
      "number": "string"
    }
  ],
  "uncertainEmptySlots": [
    {
      "group": "string or null",
      "number": "string or null",
      "reason": "brief reason"
    }
  ],
  "warnings": [
    "brief warning if needed"
  ]
}`

const useerprompt2=`Analyze this Panini World Cup 2026 album page photo.

This is an inventory task.
Do not identify players.
Do not return player names.
Do not describe stickers that are already pasted.
Do not list present stickers.

Your task is to detect ONLY EMPTY album slots with printed numbers.

A slot is EMPTY / "faltante" when:
- it is bare album paper
- it has no pasted sticker
- it shows a printed slot number on the album page
- it looks like an empty placeholder/frame

A slot is NOT empty when:
- a physical sticker is pasted there
- it shows a player photo, team photo, shield, crest, logo, artwork, or glossy sticker surface

Important:
- Only list empty slots.
- Do not list filled slots.
- Do not infer or guess empty numbers that are not visible.
- Do not return player names.
- Do not return sticker descriptions.
- If a printed empty-slot number is readable, include it.
- If an empty slot is visible but the number is unreadable, put it in "uncertainEmptySlots".
- If the photo is cropped, rotated, blurry, or does not show the full page, reflect that in the output.

Determine:
- pageType: "team", "cc", "fwc", or null
- country: full country name if visible and this is a team page, otherwise null
- group:
  - for team pages, the 3-letter country/team code if identifiable
  - for Coca-Cola pages, "CC"
  - for FWC pages, "FWC"
  - null if not identifiable
- isFullTeamPage:
  - true only if this is a team page and all 20 team slots are visible
  - false otherwise
- imageQuality: "good", "ok", or "poor"

For team pages:
- Expected slot numbers are "1" through "20".
- Do not output presentes.
- The backend will calculate presentes by subtracting faltantes from 1..20.
- Therefore, be conservative: only report a faltante when the empty slot and its number are clearly visible.

Return strict JSON only.
No markdown.
No explanations.

JSON schema:
{
  "pageType": "team | cc | fwc | null",
  "country": "string or null",
  "group": "string or null",
  "isFullTeamPage": true,
  "imageQuality": "good | ok | poor",
  "faltantes": [
    {
      "group": "string or null",
      "number": "string"
    }
  ],
  "uncertainEmptySlots": [
    {
      "group": "string or null",
      "number": "string or null",
      "reason": "brief reason"
    }
  ],
  "warnings": [
    "brief warning if needed"
  ]
}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    pageType: {
      type: "STRING",
      enum: ["team", "cc", "fwc"],
      nullable: true,
    },
    country: {
      type: "STRING",
      nullable: true,
    },
    group: {
      type: "STRING",
      nullable: true,
    },
    isFullTeamPage: {
      type: "BOOLEAN",
    },
    imageQuality: {
      type: "STRING",
      enum: ["good", "ok", "poor"],
    },
    faltantes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          group: {
            type: "STRING",
            nullable: true,
          },
          number: { type: "STRING" },
        },
        required: ["number"],
      },
    },
    uncertainEmptySlots: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          group: {
            type: "STRING",
            nullable: true,
          },
          number: {
            type: "STRING",
            nullable: true,
          },
          reason: { type: "STRING" },
        },
        required: ["reason"],
      },
    },
    warnings: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "pageType",
    "country",
    "group",
    "isFullTeamPage",
    "imageQuality",
    "faltantes",
    "uncertainEmptySlots",
    "warnings",
  ],
};

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export function analyzeAlbumPage(
  input: AlbumPageInput,
  options: AlbumPageOptions = {},
): Promise<AlbumPageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new AiParseError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "Gemini API key must be configured.",
      503,
    );
  }

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [
          { text: USER_PROMPT },
          {
            inline_data: {
              mime_type: input.mimeType ?? "image/jpeg",
              data: input.imageBase64,
            },
          } satisfies GeminiPart,
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 2048,
    },
  };

  if (input.cachedContent) {
    payload.cachedContent = input.cachedContent;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: options.signal,
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new AiParseError(
          "AI_PROVIDER_ERROR",
          "Gemini could not analyze the album page.",
          502,
        );
      }

      const body = (await response.json()) as GeminiResponse;
      const text = body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("");

      if (!text) {
        throw new AiParseError(
          "AI_INVALID_MODEL_RESPONSE",
          "Empty response from Gemini.",
          502,
        );
      }

      return parseAlbumPageJson(text);
    })
    .then((modelResult) => ({
      modelResult,
      meta: { model },
    }));
}

function parseAlbumPageJson(text: string): AlbumPageModelResult {
  const normalized = text.trim();
  const parsed = parseJsonCandidate(normalized);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as AlbumPageModelResult;
  }

  throw new AiParseError(
    "AI_INVALID_MODEL_RESPONSE",
    "Gemini returned non-JSON response.",
    502,
  );
}

function parseJsonCandidate(text: string): unknown {
  const candidates: string[] = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();

  if (fenced) candidates.push(fenced);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Move to the next candidate format.
    }
  }

  return undefined;
}
