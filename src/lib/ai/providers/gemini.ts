import { stickerGroups } from "@/lib/sticker-data";
import {
  AiParseError,
  type ModelParseResult,
  type ParseStickersInput,
} from "@/lib/ai/types";

export async function parseStickersWithGemini(input: ParseStickersInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    throw new AiParseError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "Gemini API key and model must be configured.",
      503,
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: await buildGeminiParts(input),
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new AiParseError(
      "AI_PROVIDER_ERROR",
      "Gemini could not analyze the stickers.",
      502,
    );
  }

  const body = (await response.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("");

  return {
    result: parseProviderJson(text),
    provider: "gemini" as const,
    model,
  };
}

async function buildGeminiParts(input: ParseStickersInput) {
  const parts: GeminiPart[] = [{ text: buildPrompt(input) }];

  if (input.type === "text") {
    parts.push({ text: input.text });
    return parts;
  }

  parts.push({
    inline_data: {
      mime_type: input.file.mimeType,
      data: Buffer.from(input.file.data).toString("base64"),
    },
  });

  return parts;
}

function buildPrompt(input: ParseStickersInput) {
  const type = input.type;
  const isVoiceContext =
    type === "audio" || (type === "text" && input.source === "voice-transcript");
  const isBackendOnlyFallback = type === "audio" && input.reason === "local-engine-fail";

  return [
    "Identify Panini World Cup 2026 stickers from this input.",
    "Return strict JSON only with this shape:",
    '{"stickers":[{"rawText":"Mexico 13","code":"MEX 13","group":"MEX","number":"13","confidence":0.95}],"unresolved":[{"rawText":"sticker 14","reason":"Missing group/team"}]}',
    "Use codes only when confident. Do not invent IDs.",
    "Examples: Mexico 13, México 13, and MEX 13 mean MEX 13. FWC 00 means FWC 00. Coca Cola 14, CC14, and CC 14 mean CC 14.",
    "Sticker ranges: FWC 00 through 19. Team stickers 1 through 20. Coca Cola/CC stickers 1 through 14.",
    isVoiceContext
      ? "Voice-specific extraction: handle split code letters like F W C 1 and C C 14, glue forms like FWC1 and CC14, treat especial/special as FWC, treat coca cola/coca/cc as CC, and parse burst utterances with multiple country-number pairs."
      : "",
    isVoiceContext
      ? "If a fragment is ambiguous, keep it in unresolved instead of guessing."
      : "",
    `Valid team codes: ${getTeamCodes().join(", ")}.`,
    type === "image"
      ? "Analyze visible sticker codes, teams, and numbers in the image."
      : "",
    type === "audio"
      ? "Analyze the spoken request in the audio."
      : "",
    isBackendOnlyFallback
      ? "The local speech recognition engine failed to produce a transcript. Perform a full transcription of the audio first, then extract sticker codes from the transcribed text. Prioritize accuracy over speed."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getTeamCodes() {
  return stickerGroups
    .map((group) => group.countryCode)
    .filter((code): code is string => Boolean(code));
}

function parseProviderJson(text?: string): ModelParseResult {
  if (!text) {
    throw new AiParseError(
      "AI_INVALID_MODEL_RESPONSE",
      "The AI response was empty.",
      502,
    );
  }

  try {
    const parsed = JSON.parse(text) as Partial<ModelParseResult>;

    if (!Array.isArray(parsed.stickers) || !Array.isArray(parsed.unresolved)) {
      throw new Error("Invalid model shape");
    }

    return {
      stickers: parsed.stickers,
      unresolved: parsed.unresolved,
    };
  } catch {
    throw new AiParseError(
      "AI_INVALID_MODEL_RESPONSE",
      "The AI response was not valid sticker JSON.",
      502,
    );
  }
}

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
