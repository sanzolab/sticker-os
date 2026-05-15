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

export async function parseStickersWithOpenAi(
  input: ParseStickersInput,
  options: ProviderRequestOptions = {},
) {
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
    signal: options.signal,
    body: JSON.stringify({
      model,
      max_output_tokens: 500,
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
  const jsonLabel = `${options.timingLabelPrefix ?? "ai-parse"}:provider-json-parse`;
  console.time(jsonLabel);
  let parsed;

  try {
    parsed = parseProviderJson(text);
  } finally {
    console.timeEnd(jsonLabel);
  }

  return {
    result: parsed,
    provider: "openai" as const,
    model,
  };
}

async function buildOpenAiContent(input: ParseStickersInput) {
  const content: OpenAiContent[] = [
    {
      type: "input_text",
      text: buildProviderPrompt(input),
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

function extractOpenAiText(body: OpenAiResponse) {
  if (typeof body.output_text === "string") return body.output_text;

  return body.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("");
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
