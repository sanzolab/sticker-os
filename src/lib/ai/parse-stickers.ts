import {
  AiParseError,
  type AiProviderName,
  type ModelParseResult,
  type ParseStickerUnresolved,
  type ParseStickersInput,
  type ParseStickersResult,
  type ResolvedStickerCandidate,
} from "@/lib/ai/types";
import {
  dedupeResolvedCandidates,
  parseTextDeterministically,
  resolveStickerCandidate,
  toParseCandidate,
} from "@/lib/ai/deterministic";
import { parseStickersWithGemini } from "@/lib/ai/providers/gemini";
import { parseStickersWithOpenAi } from "@/lib/ai/providers/openai";

export { parseTextDeterministically } from "@/lib/ai/deterministic";

type ProviderParser = (
  input: ParseStickersInput,
) => Promise<{ result: ModelParseResult; provider: AiProviderName; model?: string }>;

type ParseOptions = {
  providerParser?: ProviderParser;
};

const maxTextChars = getNumberEnv("AI_MAX_TEXT_CHARS", 2000);

export async function parseStickersFromInput(
  input: ParseStickersInput,
  options: ParseOptions = {},
): Promise<ParseStickersResult> {
  if (input.type === "text") {
    const text = input.text.trim();

    if (!text) {
      throw new AiParseError("AI_EMPTY_INPUT", "Enter sticker text to parse.");
    }

    if (text.length > maxTextChars) {
      throw new AiParseError(
        "AI_FILE_TOO_LARGE",
        `Text must be ${maxTextChars} characters or fewer.`,
      );
    }

    const deterministic = parseTextDeterministically(text);

    if (deterministic.candidates.length > 0 && deterministic.unresolved.length === 0) {
      return {
        candidates: deterministic.candidates.map(toParseCandidate),
        unresolved: [],
        provider: "deterministic",
        source: input.type,
      };
    }

    const parser = options.providerParser ?? parseWithConfiguredProvider;
    const modelResult = await parser({
      ...input,
      text:
        deterministic.candidates.length > 0 && deterministic.unresolved.length > 0
          ? deterministic.unresolved.map((item) => item.rawText).join(", ")
          : text,
    });
    const normalized = normalizeModelResult(modelResult.result, deterministic.candidates);

    return {
      candidates: normalized.candidates.map(toParseCandidate),
      unresolved: normalized.unresolved,
      provider: modelResult.provider,
      model: modelResult.model,
      source: input.type,
    };
  }

  const parser = options.providerParser ?? parseWithConfiguredProvider;
  const modelResult = await parser(input);
  const normalized = normalizeModelResult(modelResult.result);

  return {
    candidates: normalized.candidates.map(toParseCandidate),
    unresolved: normalized.unresolved,
    provider: modelResult.provider,
    model: modelResult.model,
    source: input.type,
  };
}

export function normalizeModelResult(
  result: ModelParseResult,
  existingCandidates: ResolvedStickerCandidate[] = [],
): {
  candidates: ResolvedStickerCandidate[];
  unresolved: ParseStickerUnresolved[];
} {
  const candidates = result.stickers
    .map(resolveStickerCandidate)
    .filter((candidate): candidate is ResolvedStickerCandidate => Boolean(candidate));

  const unresolved = result.unresolved.map((item) => ({
    rawText: item.rawText?.trim() || "Unresolved sticker",
    reason: item.reason?.trim() || "Could not resolve to a known sticker.",
  }));

  const deduped = dedupeResolvedCandidates([
    ...existingCandidates,
    ...candidates,
  ]);

  if (deduped.length === 0 && unresolved.length === 0) {
    throw new AiParseError(
      "AI_NO_STICKERS_FOUND",
      "No stickers were found in that input.",
    );
  }

  return {
    candidates: deduped,
    unresolved,
  };
}

async function parseWithConfiguredProvider(input: ParseStickersInput) {
  const requestedProvider =
    input.provider && input.provider !== "deterministic"
      ? input.provider
      : getProviderEnv();

  if (requestedProvider === "openai") return parseStickersWithOpenAi(input);

  try {
    return await parseStickersWithGemini(input);
  } catch (error) {
    const canFallback =
      process.env.AI_ENABLE_FALLBACKS === "true" &&
      Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

    if (!canFallback) throw error;
    return parseStickersWithOpenAi(input);
  }
}

function getProviderEnv(): AiProviderName {
  const provider = process.env.AI_DEFAULT_PROVIDER;
  return provider === "openai" ? "openai" : "gemini";
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
