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
  buildFinalInventoryFromMissingOnly,
  type FinalAlbumInventory,
} from "@/lib/ai/album-page-inventory";
import {
  dedupeResolvedCandidates,
  normalizeStickerText,
  parseTextDeterministically,
  resolveGroupAlias,
  resolveStickerCandidate,
  resolveStickerCode,
  toParseCandidate,
} from "@/lib/ai/deterministic";
import { analyzeAlbumPage } from "@/lib/ai/providers/gemini-album-page";
import { parseStickersWithGemini } from "@/lib/ai/providers/gemini";
import { parseStickersWithOpenAi } from "@/lib/ai/providers/openai";
import { logger } from "@/lib/logger";
import sharp from "sharp";

export { parseTextDeterministically } from "@/lib/ai/deterministic";

type ProviderRequestOptions = {
  signal?: AbortSignal;
  timingLabelPrefix?: string;
};

type ProviderResult = {
  result: ModelParseResult;
  provider: AiProviderName;
  model?: string;
};

type ProviderParser = (
  input: ParseStickersInput,
  options?: ProviderRequestOptions,
) => Promise<ProviderResult>;

type ParseOptions = {
  providerParser?: ProviderParser;
  timingId?: string;
};

const maxTextChars = getNumberEnv("AI_MAX_TEXT_CHARS", 2000);
const parseTimeoutMs = getCappedNumberEnv("AI_PARSE_TIMEOUT_MS", 15000, 20000);
const fallbackFastFailureMs = getCappedNumberEnv("AI_FAST_FAIL_FALLBACK_MS", 3000, 10000);
const maxImageSuggestions = getNumberEnv("AI_MAX_IMAGE_SUGGESTIONS", 12);
const maxUnresolvedSuggestions = getNumberEnv("AI_MAX_UNRESOLVED_SUGGESTIONS", 12);
const imageResizeMaxWidth = getNumberEnv("AI_IMAGE_MAX_WIDTH", 1600);
const imageResizeQuality = getNumberEnv("AI_IMAGE_QUALITY", 90);
const imageCodePattern = /\b(?:[a-z]{2,4})\s*[- ]?\s*(?:00|\d{1,2})\b/i;
const weakVisualEvidenceValues = new Set([
  "weak",
  "artwork",
  "face",
  "filled-sticker",
  "filled-sticker-area",
  "filled-area",
  "texture-only",
]);
const emptyVisualEvidenceValues = new Set([
  "empty",
  "blank",
  "placeholder",
  "album-frame",
  "frame-only",
  "uniform-grid",
  "background-only",
]);
const emptySlotPattern =
  /\b(blank|empty|placeholder|frame|album frame|faded|sin sticker|no sticker|no figurita)\b/i;
const uniformHighConfidenceTolerance = 0.01;

type EvidenceLevel = "strong" | "medium" | "weak" | "none";
type ImageResolvedCandidate = {
  candidate: ResolvedStickerCandidate;
  evidence: EvidenceLevel;
  hasStrongCodePattern: boolean;
  hasReadableText: boolean;
};

type TimingContext = {
  labelPrefix: string;
};

export async function parseStickersFromInput(
  input: ParseStickersInput,
  options: ParseOptions = {},
): Promise<ParseStickersResult> {
  const timing = createTimingContext(options.timingId);
  const totalTimer = startTimer(timing, "total");

  try {
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

      const modelResult = await parseWithSelectedParser({
        ...input,
        text:
          deterministic.candidates.length > 0 && deterministic.unresolved.length > 0
            ? deterministic.unresolved.map((item) => item.rawText).join(", ")
            : text,
      }, options.providerParser, timing);
      const normalized = normalizeModelResultForInput(
        modelResult.result,
        deterministic.candidates,
        input.type,
        timing,
      );

      return {
        candidates: normalized.candidates.map(toParseCandidate),
        unresolved: normalized.unresolved,
        provider: modelResult.provider,
        model: modelResult.model,
        source: input.type,
        ...(deterministic.candidates.length > 0 && deterministic.unresolved.length > 0
          ? {}
          : {}),
      };
    }

    if (input.type === "image") {
      if (options.providerParser) {
        const preparedInput = await preprocessImageInput(input, timing);
        const modelResult = await parseWithSelectedParser(
          preparedInput,
          options.providerParser,
          timing,
        );
        const normalized = normalizeModelResultForInput(
          modelResult.result,
          [],
          input.type,
          timing,
          modelResult,
        );

        return {
          candidates: normalized.candidates.map(toParseCandidate),
          unresolved: normalized.unresolved,
          provider: modelResult.provider,
          model: modelResult.model,
          source: input.type,
          meta: getResultMeta(input.type, normalized),
        };
      }

      const pageTimer = startTimer(timing, "provider:primary");
      const preparedInput = (await preprocessImageInput(
        input,
        timing,
      )) as Extract<ParseStickersInput, { file: unknown }>;

      const base64 = Buffer.from(preparedInput.file.data).toString(
        "base64",
      );
      const mimeType = preparedInput.file.mimeType;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), parseTimeoutMs);

      try {
        const result = await analyzeAlbumPage(
          {
            imageBase64: base64,
            mimeType,
          },
          { signal: controller.signal },
        );
        const inventory = buildFinalInventoryFromMissingOnly(result.modelResult);
        const candidates = buildInferredCandidatesFromInventory(inventory);
        const warnings = [...inventory.warnings];

        for (const item of inventory.presentes) {
          const code = `${item.group} ${item.number}`;
          const wasResolved = candidates.some((candidate) => candidate.code === code);

          if (!wasResolved) {
            warnings.push(`Could not resolve inferred presente '${code}' to a known sticker.`);
          }
        }

        endTimer(pageTimer);

        return {
          candidates,
          unresolved: [],
          provider: "gemini",
          model: result.meta?.model,
          source: "image",
          status: inventory.status,
          methodology: inventory.methodology,
          pageType: inventory.pageType ?? undefined,
          country: inventory.country,
          group: inventory.group,
          presentes: inventory.presentes,
          faltantes: inventory.faltantes,
          uncertain: inventory.uncertain,
          warnings,
          rawModelResult: inventory.rawModelResult,
          meta: { status: "success" },
        };
      } catch (error) {
        endTimer(pageTimer);

        if (isAbortError(error)) {
          throw new AiParseError(
            "AI_TIMEOUT_ERROR",
            "Album page analysis timed out.",
            504,
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const preparedInput = await preprocessImageInput(input, timing);
    const modelResult = await parseWithSelectedParser(preparedInput, options.providerParser, timing);
    const normalized = normalizeModelResultForInput(
      modelResult.result,
      [],
      input.type,
      timing,
      modelResult,
    );

    return {
      candidates: normalized.candidates.map(toParseCandidate),
      unresolved: normalized.unresolved,
      provider: modelResult.provider,
      model: modelResult.model,
      source: input.type,
      meta: getResultMeta(input.type, normalized),
    };
  } finally {
    endTimer(totalTimer);
  }
}

export function normalizeModelResult(
  result: ModelParseResult,
  existingCandidates: ResolvedStickerCandidate[] = [],
  options: {
    inputType?: ParseStickersInput["type"];
    validationTimer?: TimerHandle;
  } = {},
): {
  candidates: ResolvedStickerCandidate[];
  unresolved: ParseStickerUnresolved[];
} {
  const unresolved = result.unresolved.slice(0, maxUnresolvedSuggestions).map((item) => ({
    rawText: item.rawText?.trim() || "Unresolved sticker",
    reason: item.reason?.trim() || "Could not resolve to a known sticker.",
  }));
  const stickerSuggestions = result.stickers.slice(0, maxImageSuggestions);
  const imageCandidates: ImageResolvedCandidate[] = [];
  const fallbackCandidates = stickerSuggestions
    .map(resolveStickerCandidate)
    .filter((candidate): candidate is ResolvedStickerCandidate => Boolean(candidate));

  if (options.inputType === "image") {
    for (const suggestion of stickerSuggestions) {
      const normalizedRawText = suggestion.rawText?.trim() ?? "";
      const normalizedEvidence = normalizeStickerText(suggestion.visualEvidence ?? "");
      const hasEmptyVisualEvidence = emptyVisualEvidenceValues.has(normalizedEvidence);
      const hasWeakVisualEvidence = weakVisualEvidenceValues.has(normalizedEvidence);
      const hasStrongCodePattern = hasCodePattern(suggestion.rawText);
      const hasCodeFieldPattern = hasCodePattern(suggestion.code);
      const hasReadableText = hasReadableSignalText(suggestion.rawText);
      const hasResolvableParts =
        Boolean(resolveGroupAlias(suggestion.group ?? "")) && Boolean(suggestion.number?.trim());
      const hasEmptyTextSignal = emptySlotPattern.test(normalizedRawText);

      if (hasEmptyVisualEvidence || hasEmptyTextSignal) {
        continue;
      }

      const evidence: EvidenceLevel = hasStrongCodePattern
        ? "strong"
        : hasReadableText && (hasResolvableParts || hasCodeFieldPattern)
          ? "medium"
          : hasWeakVisualEvidence || hasCodeFieldPattern || hasResolvableParts
            ? "weak"
            : "none";

      if (evidence === "none") continue;

      if (evidence === "weak") {
        pushBoundedUnresolved(unresolved, {
          rawText: normalizedRawText || suggestion.code?.trim() || "Unresolved sticker",
          reason: "Weak visual signal without readable sticker code/text.",
        });
        continue;
      }

      const resolvedCandidate = resolveStickerCandidate(suggestion);
      if (!resolvedCandidate) {
        pushBoundedUnresolved(unresolved, {
          rawText: normalizedRawText || suggestion.code?.trim() || "Unresolved sticker",
          reason: "Could not resolve to a known sticker.",
        });
        continue;
      }

      imageCandidates.push({
        candidate: {
          ...resolvedCandidate,
          confidence:
            evidence === "medium"
              ? Math.min(resolvedCandidate.confidence, 0.78)
              : resolvedCandidate.confidence,
        },
        evidence,
        hasStrongCodePattern,
        hasReadableText,
      });
    }
  }

  const filteredImageCandidates = options.inputType === "image"
    ? applyImageGridHallucinationGuards(imageCandidates)
    : [];
  endTimer(options.validationTimer);
  const candidates = options.inputType === "image"
    ? filteredImageCandidates
    : fallbackCandidates;

  const deduped = dedupeResolvedCandidates([
    ...existingCandidates,
    ...candidates,
  ]);

  if (deduped.length === 0 && unresolved.length === 0) {
    if (options.inputType === "image" || options.inputType === "audio") {
      return {
        candidates: [],
        unresolved: [],
      };
    }

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

function normalizeModelResultForInput(
  result: ModelParseResult,
  existingCandidates: ResolvedStickerCandidate[],
  inputType: ParseStickersInput["type"],
  timing: TimingContext,
  providerResult?: Pick<ProviderResult, "provider" | "model">,
) {
  const normalizeTimer = startTimer(timing, "normalize");
  const validationTimer = inputType === "image"
    ? startTimer(timing, "validation-guards")
    : undefined;

  try {
    return normalizeModelResult(result, existingCandidates, {
      inputType,
      validationTimer,
    });
  } catch (error) {
    logger.error("normalizeModelResult failed", error);
    endTimer(validationTimer);

    if (inputType === "image") {
      return {
        candidates: [],
        unresolved: [],
        meta: {
          status: "error" as const,
          errorCode: error instanceof AiParseError ? error.code : "AI_PROVIDER_ERROR",
        },
        provider: providerResult?.provider,
        model: providerResult?.model,
      };
    }

    throw error;
  } finally {
    endTimer(normalizeTimer);
  }
}

function getResultMeta(
  inputType: ParseStickersInput["type"],
  normalized: {
    candidates: ResolvedStickerCandidate[];
    unresolved: ParseStickerUnresolved[];
    meta?: ParseStickersResult["meta"];
  },
): ParseStickersResult["meta"] | undefined {
  if (normalized.meta) return normalized.meta;
  if (inputType !== "image") return undefined;

  return normalized.candidates.length === 0 && normalized.unresolved.length === 0
    ? { status: "empty" }
    : { status: "success" };
}

function applyImageGridHallucinationGuards(
  records: ImageResolvedCandidate[],
): ResolvedStickerCandidate[] {
  if (records.length === 0) return [];

  const grouped = new Map<string, ImageResolvedCandidate[]>();

  for (const record of records) {
    const groupKey = getGroupKey(record.candidate.sticker);
    const bucket = grouped.get(groupKey) ?? [];
    bucket.push(record);
    grouped.set(groupKey, bucket);
  }

  const output: ResolvedStickerCandidate[] = [];

  for (const groupRecords of grouped.values()) {
    const expectedSize = getExpectedGroupSize(groupRecords[0]!.candidate.sticker);
    const numbers = groupRecords.map((record) =>
      toSortableStickerNumber(record.candidate.sticker.number),
    );
    const uniqueNumberSet = new Set(numbers);
    const coverage = uniqueNumberSet.size / expectedSize;
    const nearPerfectSequence = isNearPerfectGroupSequence(
      [...uniqueNumberSet],
      groupRecords[0]!.candidate.sticker.category,
      expectedSize,
    );
    const uniformHighConfidence = hasUniformHighConfidence(groupRecords);
    const suspiciousCoverage = coverage > 0.8;
    const lowCoverageLikelyReal = coverage < 0.5;
    const suspicious =
      (suspiciousCoverage && !lowCoverageLikelyReal) ||
      nearPerfectSequence ||
      uniformHighConfidence;

    for (const record of groupRecords) {
      if (!suspicious) {
        output.push(record.candidate);
        continue;
      }

      if (record.evidence === "strong" && record.hasStrongCodePattern) {
        output.push(record.candidate);
        continue;
      }

      if (record.evidence === "medium" && record.hasReadableText) {
        output.push({
          ...record.candidate,
          confidence: Math.min(
            record.candidate.confidence,
            uniformHighConfidence ? 0.35 : 0.55,
          ),
        });
        continue;
      }
    }
  }

  return dedupeResolvedCandidates(output);
}

function getExpectedGroupSize(sticker: ResolvedStickerCandidate["sticker"]) {
  if (sticker.category === "cc") return 14;
  return 20;
}

function getGroupKey(sticker: ResolvedStickerCandidate["sticker"]) {
  if (sticker.category === "fwc") return "FWC";
  if (sticker.category === "cc") return "CC";
  return sticker.countryCode ?? sticker.groupId.toUpperCase();
}

function toSortableStickerNumber(number: string) {
  if (number === "00") return 0;
  return Number(number);
}

function isNearPerfectGroupSequence(
  numbers: number[],
  category: ResolvedStickerCandidate["sticker"]["category"],
  expectedSize: number,
) {
  if (numbers.length < expectedSize - 2) return false;

  const start = category === "fwc" ? 0 : 1;
  const end = start + expectedSize - 1;
  if (numbers.some((value) => !Number.isFinite(value) || value < start || value > end)) {
    return false;
  }

  const numberSet = new Set(numbers);
  let missing = 0;

  for (let value = start; value <= end; value += 1) {
    if (!numberSet.has(value)) missing += 1;
  }

  return missing <= 2;
}

function hasUniformHighConfidence(records: ImageResolvedCandidate[]) {
  if (records.length < 6) return false;
  const rounded = records.map((record) => Math.round(record.candidate.confidence * 100) / 100);
  const first = rounded[0] ?? 0;
  if (first < 0.85) return false;

  return rounded.every((value) => Math.abs(value - first) <= uniformHighConfidenceTolerance);
}

function hasCodePattern(value?: string) {
  if (!value) return false;
  return imageCodePattern.test(value);
}

function hasReadableSignalText(value?: string) {
  if (!value) return false;
  const normalized = normalizeStickerText(value);
  if (!normalized) return false;
  const hasWord = /[a-z]{2,}/.test(normalized);
  const hasDigit = /\d{1,2}/.test(normalized);
  return hasWord && hasDigit;
}

async function parseWithSelectedParser(
  input: ParseStickersInput,
  providerParser?: ProviderParser,
  timing?: TimingContext,
) {
  if (providerParser) {
    return parseWithProviderTimeout(input, providerParser, timing, "provider:primary");
  }

  return parseWithConfiguredProvider(input, timing);
}

async function parseWithConfiguredProvider(input: ParseStickersInput, timing?: TimingContext) {
  const requestedProvider =
    input.provider && input.provider !== "deterministic"
      ? input.provider
      : getProviderEnv();

  if (requestedProvider === "openai") {
    return parseWithProviderTimeout(input, parseStickersWithOpenAi, timing, "provider:primary");
  }

  const primaryStart = Date.now();

  try {
    return await parseWithProviderTimeout(input, parseStickersWithGemini, timing, "provider:primary");
  } catch (error) {
    const elapsedMs = Date.now() - primaryStart;
    const canFallback =
      process.env.AI_ENABLE_FALLBACKS === "true" &&
      Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

    if (!canFallback || isTimeoutError(error) || elapsedMs > fallbackFastFailureMs) {
      throw error;
    }

    console.info(
      `[ai.parse] provider fallback triggered after fast primary failure (${elapsedMs}ms).`,
    );
    return parseWithProviderTimeout(input, parseStickersWithOpenAi, timing, "provider:fallback");
  }
}

async function parseWithProviderTimeout(
  input: ParseStickersInput,
  providerParser: ProviderParser,
  timing?: TimingContext,
  stageLabel: "provider:primary" | "provider:fallback" = "provider:primary",
) {
  const providerTimer = startTimer(timing, stageLabel);
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(createTimeoutError());
    }, parseTimeoutMs);
  });

  try {
    // Provider fetches used to have no timeout, so a stuck upstream request kept
    // the UI spinner alive forever. Racing and aborting guarantees completion.
    return await Promise.race([
      providerParser(input, {
        signal: controller.signal,
        timingLabelPrefix: timing?.labelPrefix,
      }),
      timeout,
    ]);
  } catch (error) {
    if (isAbortError(error)) throw createTimeoutError();
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    endTimer(providerTimer);
  }
}

function createTimeoutError() {
  return new AiParseError(
    "AI_TIMEOUT_ERROR",
    "Sticker analysis timed out. Try again.",
    504,
  );
}

function isTimeoutError(error: unknown) {
  return error instanceof AiParseError && error.code === "AI_TIMEOUT_ERROR";
}

function isAbortError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError";
}

function getProviderEnv(): AiProviderName {
  const provider = process.env.AI_DEFAULT_PROVIDER;
  return provider === "openai" ? "openai" : "gemini";
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getCappedNumberEnv(name: string, fallback: number, max: number) {
  return Math.min(getNumberEnv(name, fallback), max);
}

type TimerHandle = {
  label: string;
  done: boolean;
} | undefined;

function createTimingContext(seed?: string): TimingContext {
  return {
    labelPrefix: `ai-parse:${seed ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
  };
}

function startTimer(
  timing: TimingContext | undefined,
  name: "total" | "image-preprocess" | "normalize" | "validation-guards" | "provider:primary" | "provider:fallback",
): TimerHandle {
  const label = `${timing?.labelPrefix ?? "ai-parse"}:${name}`;
  console.time(label);
  return { label, done: false };
}

function endTimer(timer: TimerHandle) {
  if (!timer || timer.done) return;
  timer.done = true;
  console.timeEnd(timer.label);
}

function pushBoundedUnresolved(
  unresolved: ParseStickerUnresolved[],
  item: ParseStickerUnresolved,
) {
  if (unresolved.length >= maxUnresolvedSuggestions) return;
  unresolved.push(item);
}

function buildInferredCandidatesFromInventory(
  inventory: FinalAlbumInventory,
) {
  if (inventory.status !== "ok") return [];

  const resolved = dedupeResolvedCandidates(
    inventory.presentes
      .map((slot) => resolveStickerCode(`${slot.group} ${slot.number}`))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .map((candidate) => ({
        ...candidate,
        source: "missing_only_complement",
      })),
  );

  return resolved.map((candidate) => toParseCandidate(candidate));
}

async function preprocessImageInput(
  input: ParseStickersInput,
  timing: TimingContext,
): Promise<ParseStickersInput> {
  if (input.type !== "image") return input;

  const preprocessTimer = startTimer(timing, "image-preprocess");

  try {
    const resized = await sharp(Buffer.from(input.file.data))
      .rotate()
      .resize({ width: imageResizeMaxWidth, fit: "inside", withoutEnlargement: true })
      .sharpen({ sigma: 1 })
      .linear(1.04, -4)
      .jpeg({ quality: imageResizeQuality });

    const buffer = await resized.toBuffer();
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(arrayBuffer).set(buffer);
    return {
      ...input,
      file: {
        ...input.file,
        data: arrayBuffer,
        mimeType: "image/jpeg",
      },
    };
  } catch {
    return input;
  } finally {
    endTimer(preprocessTimer);
  }
}
