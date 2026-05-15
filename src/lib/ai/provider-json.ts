import {
  AiParseError,
  type ModelParseResult,
} from "@/lib/ai/types";

export function parseProviderJson(text?: string): ModelParseResult {
  const normalized = text?.trim();

  if (!normalized) {
    throw new AiParseError(
      "AI_INVALID_MODEL_RESPONSE",
      "The AI response was empty.",
      502,
    );
  }

  const parsed = parseJsonCandidate(normalized);

  if (!parsed) {
    throwInvalidStickerJson();
  }

  return normalizeProviderJson(parsed);
}

function parseJsonCandidate(text: string): unknown {
  for (const candidate of getJsonCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next recoverable shape before reporting the provider response.
    }
  }

  return undefined;
}

function getJsonCandidates(text: string) {
  const candidates: string[] = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const balancedObject = extractFirstBalancedObject(text);

  if (fenced) candidates.push(fenced);
  if (balancedObject) candidates.push(balancedObject);

  return candidates;
}

function extractFirstBalancedObject(text: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (start === -1) {
      if (character === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = inString;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (character === "{") depth += 1;

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function normalizeProviderJson(parsed: unknown): ModelParseResult {
  if (!isPlainObject(parsed)) {
    throwInvalidStickerJson();
  }

  const stickers = parsed.stickers;
  const unresolved = parsed.unresolved;

  if (stickers !== undefined && !Array.isArray(stickers)) {
    throwInvalidStickerJson();
  }

  if (unresolved !== undefined && !Array.isArray(unresolved)) {
    throwInvalidStickerJson();
  }

  return {
    stickers: stickers ?? [],
    unresolved: unresolved ?? [],
  };
}

function isPlainObject(value: unknown): value is Partial<ModelParseResult> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function throwInvalidStickerJson(): never {
  throw new AiParseError(
    "AI_INVALID_MODEL_RESPONSE",
    "The AI response was not valid sticker JSON.",
    502,
  );
}
