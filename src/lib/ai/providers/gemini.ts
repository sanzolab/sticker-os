import {
  AiParseError,
  type ParseStickersInput,
} from "@/lib/ai/types";
import { parseProviderJson } from "@/lib/ai/provider-json";
import { buildProviderPrompt } from "@/lib/ai/provider-prompt";

type ProviderRequestOptions = {
  signal?: AbortSignal;
  timingLabelPrefix?: string;
};

export async function parseStickersWithGemini(
  input: ParseStickersInput,
  options: ProviderRequestOptions = {},
) {
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
      signal: options.signal,
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
          maxOutputTokens: 500,
        },
      }),
    },
  );

  if (!response.ok) {
    console.error("Gemini response error:", response.status, response.statusText);
    throw new AiParseError(
      "AI_PROVIDER_ERROR",
      "Gemini could not analyze the stickers.",
      502,
    );
  }

  const body = (await response.json()) as GeminiResponse;
  console.log("Gemini raw response body:", body); // Log the entire raw response body from Gemini
  const text = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("");
    const jsonLabel = `${options.timingLabelPrefix ?? "ai-parse"}:provider-json-parse`;
    console.time(jsonLabel);
    let parsed;
    
    
    console.log("Gemini response text:", text); // Log the raw text response from Gemini before parsing
  try {
    parsed = parseProviderJson(text);
  } finally {
    console.timeEnd(jsonLabel);
  }
  console.log("Gemini response parsed:", parsed);
  return {
    result: parsed,
    provider: "gemini" as const,
    model,
  };
}

async function buildGeminiParts(input: ParseStickersInput) {
  const parts: GeminiPart[] = [{ text: buildProviderPrompt(input) }];

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
