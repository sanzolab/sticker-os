import { resolveGroupAlias } from "@/lib/ai/deterministic";
import type { AlbumPageModelResult } from "@/lib/ai/providers/gemini-album-page";

const EXPECTED_TEAM_NUMBERS = Array.from({ length: 20 }, (_, index) => `${index + 1}`);
const EXPECTED_TEAM_NUMBER_SET = new Set(EXPECTED_TEAM_NUMBERS);
const ALLOWED_PAGE_TYPES = new Set(["team", "cc", "fwc"]);
const ALLOWED_IMAGE_QUALITY = new Set(["good", "ok", "poor"]);

export type InventoryStatus = "ok" | "needs_review";
export type InventoryMethodology = "missing_only_complement";
export type InventoryPageType = "team" | "cc" | "fwc" | null;
export type InventoryImageQuality = "good" | "ok" | "poor";

export type InventoryPresentSlot = {
  group: string;
  number: string;
};

export type InventoryMissingSlot = {
  group: string;
  number: string;
};

export type InventoryUncertainSlot = {
  group: string | null;
  number: string | null;
  reason?: string;
};

export type FinalAlbumInventory = {
  status: InventoryStatus;
  methodology: InventoryMethodology;
  pageType: InventoryPageType;
  country: string | null;
  group: string | null;
  presentes: InventoryPresentSlot[];
  faltantes: InventoryMissingSlot[];
  uncertain: InventoryUncertainSlot[];
  warnings: string[];
  rawModelResult: Record<string, unknown>;
};

export function buildFinalInventoryFromMissingOnly(
  modelResult: AlbumPageModelResult,
): FinalAlbumInventory {
  const rawModelResult = toPlainObject(modelResult);
  const warnings: string[] = [];

  if ("presentes" in rawModelResult) {
    warnings.push(
      "Model returned a 'presentes' field. It was ignored because only missing-only complement is allowed.",
    );
  }

  const pageType = normalizePageType(rawModelResult.pageType);
  if (rawModelResult.pageType !== undefined && pageType === null) {
    warnings.push("Model returned an invalid pageType value.");
  }

  const country = normalizeOptionalString(rawModelResult.country);
  const parsedGroup = normalizeOptionalString(rawModelResult.group);
  const parsedImageQuality = normalizeImageQuality(rawModelResult.imageQuality, warnings);
  const isFullTeamPage = rawModelResult.isFullTeamPage === true;
  const warningsFromModel = normalizeWarnings(rawModelResult.warnings);
  warnings.push(...warningsFromModel);

  const normalizedTeamGroup = normalizeTeamGroup(pageType, parsedGroup, warnings);
  const fallbackGroup = normalizedTeamGroup ?? parsedGroup ?? "UNKNOWN";

  const missingNumbersSet = new Set<string>();
  const faltantes = normalizeFaltantes(
    rawModelResult.faltantes,
    fallbackGroup,
    pageType,
    warnings,
    missingNumbersSet,
  );

  const uncertainReadableNumbers = new Set<string>();
  const uncertain = normalizeUncertain(
    rawModelResult.uncertainEmptySlots,
    fallbackGroup,
    pageType,
    warnings,
    uncertainReadableNumbers,
  );

  const safeForInference = (
    pageType === "team" &&
    isFullTeamPage &&
    normalizedTeamGroup !== null &&
    parsedImageQuality !== "poor"
  );

  const presentes = safeForInference
    ? EXPECTED_TEAM_NUMBERS
      .filter((number) => !missingNumbersSet.has(number) && !uncertainReadableNumbers.has(number))
      .map((number) => ({ group: normalizedTeamGroup!, number }))
    : [];

  if (!safeForInference) {
    if (pageType !== "team") {
      warnings.push("Presentes were not inferred because the page is not a team page.");
    }
    if (!isFullTeamPage) {
      warnings.push("Presentes were not inferred because the full 20-slot team page is not visible.");
    }
    if (!normalizedTeamGroup) {
      warnings.push("Presentes were not inferred because the team group could not be identified.");
    }
    if (parsedImageQuality === "poor") {
      warnings.push("Presentes were not inferred because image quality is poor.");
    }
  }

  return {
    status: safeForInference ? "ok" : "needs_review",
    methodology: "missing_only_complement",
    pageType,
    country,
    group: normalizedTeamGroup,
    presentes,
    faltantes,
    uncertain,
    warnings: dedupeStrings(warnings),
    rawModelResult,
  };
}

function normalizeFaltantes(
  value: unknown,
  fallbackGroup: string,
  pageType: InventoryPageType,
  warnings: string[],
  numbersSet: Set<string>,
) {
  if (!Array.isArray(value)) return [];

  const output: InventoryMissingSlot[] = [];

  for (const item of value) {
    const record = toPlainObject(item);
    const number = normalizeOptionalString(record.number);

    if (!number) {
      warnings.push("Ignored faltante with missing number.");
      continue;
    }

    if (pageType === "team" && !EXPECTED_TEAM_NUMBER_SET.has(number)) {
      warnings.push(`Ignored invalid team faltante number '${number}'.`);
      continue;
    }

    if (numbersSet.has(number)) continue;
    numbersSet.add(number);

    const group = normalizeOptionalString(record.group) ?? fallbackGroup;
    output.push({ group, number });
  }

  return output;
}

function normalizeUncertain(
  value: unknown,
  fallbackGroup: string,
  pageType: InventoryPageType,
  warnings: string[],
  readableNumbersSet: Set<string>,
) {
  if (!Array.isArray(value)) return [];

  const output: InventoryUncertainSlot[] = [];
  const seenNoNumber = new Set<string>();

  for (const item of value) {
    const record = toPlainObject(item);
    const rawNumber = normalizeOptionalString(record.number);
    const reason = normalizeOptionalString(record.reason) ?? undefined;
    const group = normalizeOptionalString(record.group) ?? fallbackGroup;

    let number: string | null = rawNumber;
    if (pageType === "team" && rawNumber && !EXPECTED_TEAM_NUMBER_SET.has(rawNumber)) {
      warnings.push(`Ignored invalid team uncertain slot number '${rawNumber}'.`);
      number = null;
    }

    if (number) {
      if (readableNumbersSet.has(number)) continue;
      readableNumbersSet.add(number);
      output.push({ group, number, reason });
      continue;
    }

    const key = `${group}:${reason ?? ""}`;
    if (seenNoNumber.has(key)) continue;
    seenNoNumber.add(key);
    output.push({ group, number: null, reason });
  }

  return output;
}

function normalizePageType(value: unknown): InventoryPageType {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_PAGE_TYPES.has(normalized)) return null;
  return normalized as InventoryPageType;
}

function normalizeImageQuality(value: unknown, warnings: string[]): InventoryImageQuality {
  if (typeof value !== "string") {
    warnings.push("Model imageQuality is missing. Defaulting to 'poor'.");
    return "poor";
  }

  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_IMAGE_QUALITY.has(normalized)) {
    warnings.push(`Model returned invalid imageQuality '${value}'. Defaulting to 'poor'.`);
    return "poor";
  }

  return normalized as InventoryImageQuality;
}

function normalizeWarnings(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeOptionalString(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeTeamGroup(
  pageType: InventoryPageType,
  parsedGroup: string | null,
  warnings: string[],
) {
  if (pageType !== "team") return null;
  if (!parsedGroup) return null;

  const resolved = resolveGroupAlias(parsedGroup);
  if (!resolved || resolved === "CC" || resolved === "FWC") {
    warnings.push(`Model returned unrecognized team group '${parsedGroup}'.`);
    return null;
  }

  return resolved;
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
