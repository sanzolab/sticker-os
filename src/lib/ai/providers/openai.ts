import { stickerGroups } from "@/lib/sticker-data";
import {
  AiParseError,
  type ModelParseResult,
  type ParseStickersInput,
} from "@/lib/ai/types";

export async function parseStickersWithOpenAi(input: ParseStickersInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    throw new AiParseError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "OpenAI API key and model must be configured.",
      503,
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: await buildOpenAiContent(input),
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new AiParseError(
      "AI_PROVIDER_ERROR",
      "OpenAI could not analyze the stickers.",
      502,
    );
  }

  const body = (await response.json()) as OpenAiResponse;
  const text = extractOpenAiText(body);

  return {
    result: parseProviderJson(text),
    provider: "openai" as const,
    model,
  };
}

async function buildOpenAiContent(input: ParseStickersInput) {
  const content: OpenAiContent[] = [
    {
      type: "input_text",
      text: buildPrompt(input),
    },
  ];

  if (input.type === "text") {
    content.push({ type: "input_text", text: input.text });
    return content;
  }

  if (input.type === "image") {
    content.push({
      type: "input_image",
      image_url: `data:${input.file.mimeType};base64,${Buffer.from(input.file.data).toString("base64")}`,
    });
    return content;
  }

  throw new AiParseError(
    "AI_UNSUPPORTED_INPUT_TYPE",
    "OpenAI fallback is not configured for audio uploads in v1.",
  );
}

function buildPrompt(input: ParseStickersInput) {
  const type = input.type;
  const isVoiceContext =
    type === "audio" || (type === "text" && input.source === "voice-transcript");

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
  ]
    .filter(Boolean)
    .join("\n");
}

function getTeamCodes() {
  return stickerGroups
    .map((group) => group.countryCode)
    .filter((code): code is string => Boolean(code));
}

function extractOpenAiText(body: OpenAiResponse) {
  if (typeof body.output_text === "string") return body.output_text;

  return body.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("");
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

type OpenAiContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ text?: string }>;
  }>;
};
