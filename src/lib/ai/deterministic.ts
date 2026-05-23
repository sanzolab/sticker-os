import {
  stickerGroups,
  stickers,
  type Sticker,
  type StickerGroup,
} from "@/lib/sticker-data";
import type {
  ModelStickerSuggestion,
  ParseStickerCandidate,
  ParseStickerUnresolved,
  ResolvedStickerCandidate,
} from "@/lib/ai/types";

export type DeterministicVoiceParseResult = {
  candidates: ResolvedStickerCandidate[];
  unresolved: ParseStickerUnresolved[];
  needsFallback: boolean;
  unmatchedTokens: string[];
  unmatchedFragments: string[];
};

const exactCodeByNormalized = new Map(
  stickers.flatMap((sticker) => [
    [normalizeStickerCode(sticker.code), sticker],
    [normalizeStickerCode(`${getGroupCode(sticker)} ${sticker.number}`), sticker],
  ]),
);

const countryNameAliases: Record<string, string> = {
  mexico: "MEX",
  mejico: "MEX",
  "south africa": "RSA",
  korea: "KOR",
  "south korea": "KOR",
  czechia: "CZE",
  "czech republic": "CZE",
  canada: "CAN",
  bosnia: "BIH",
  "bosnia and herzegovina": "BIH",
  qatar: "QAT",
  switzerland: "SUI",
  brazil: "BRA",
  morocco: "MAR",
  haiti: "HAI",
  scotland: "SCO",
  "united states": "USA",
  "estados unidos": "USA",
  usa: "USA",
  paraguay: "PAR",
  australia: "AUS",
  turkey: "TUR",
  germany: "GER",
  curacao: "CUW",
  "ivory coast": "CIV",
  ecuador: "ECU",
  netherlands: "NED",
  japan: "JPN",
  sweden: "SWE",
  tunisia: "TUN",
  belgium: "BEL",
  egypt: "EGY",
  iran: "IRN",
  "new zealand": "NZL",
  spain: "ESP",
  "cape verde": "CPV",
  "saudi arabia": "KSA",
  uruguay: "URU",
  france: "FRA",
  senegal: "SEN",
  iraq: "IRQ",
  norway: "NOR",
  argentina: "ARG",
  algeria: "ALG",
  austria: "AUT",
  jordan: "JOR",
  portugal: "POR",
  congo: "COD",
  "dr congo": "COD",
  uzbekistan: "UZB",
  colombia: "COL",
  england: "ENG",
  croatia: "CRO",
  ghana: "GHA",
  panama: "PAN",
};

const spokenNumberAliases: Record<string, string> = {
  "cero cero": "00",
  "zero zero": "00",
  cero: "0",
  zero: "0",
  uno: "1",
  one: "1",
  dos: "2",
  two: "2",
  tres: "3",
  three: "3",
  cuatro: "4",
  four: "4",
  cinco: "5",
  five: "5",
  seis: "6",
  six: "6",
  siete: "7",
  seven: "7",
  ocho: "8",
  eight: "8",
  nueve: "9",
  nine: "9",
  diez: "10",
  ten: "10",
  once: "11",
  eleven: "11",
  doce: "12",
  twelve: "12",
  trece: "13",
  thirteen: "13",
  catorce: "14",
  fourteen: "14",
  quince: "15",
  fifteen: "15",
  dieciseis: "16",
  sixteen: "16",
  diecisiete: "17",
  seventeen: "17",
  dieciocho: "18",
  eighteen: "18",
  diecinueve: "19",
  nineteen: "19",
  veinte: "20",
  twenty: "20",
};

const voiceCountryAliasesByCode: Record<string, string[]> = {
  MEX: ["mexico", "mejico"],
  RSA: ["south africa", "africa del sur", "sudafrica", "sud africa"],
  KOR: ["korea", "corea", "south korea", "corea del sur"],
  CZE: ["czech republic", "czechia", "chequia", "republica checa"],
  CAN: ["canada"],
  BIH: ["bosnia", "bosnia herzegovina", "bosnia and herzegovina"],
  QAT: ["qatar", "catar"],
  SUI: ["switzerland", "suiza"],
  BRA: ["brazil", "brasil"],
  MAR: ["morocco", "marruecos"],
  HAI: ["haiti"],
  SCO: ["scotland", "escocia"],
  USA: ["united states", "estados unidos", "usa", "us", "eeuu", "ee uu"],
  PAR: ["paraguay"],
  AUS: ["australia"],
  TUR: ["turkey", "turquia", "turkiye"],
  GER: ["germany", "alemania"],
  CUW: ["curacao", "curazao"],
  CIV: [
    "ivory coast",
    "costa de marfil",
    "cote d ivoire",
    "cote divoire",
  ],
  ECU: ["ecuador"],
  NED: ["netherlands", "holland", "holanda", "paises bajos", "paises de bajos"],
  JPN: ["japan", "japon"],
  SWE: ["sweden", "suecia"],
  TUN: ["tunisia", "tunez"],
  BEL: ["belgium", "belgica"],
  EGY: ["egypt", "egipto"],
  IRN: ["iran"],
  NZL: ["new zealand", "nueva zelanda"],
  ESP: ["spain", "espana"],
  CPV: ["cape verde", "cabo verde"],
  KSA: ["saudi arabia", "arabia saudita", "arabia saudi"],
  URU: ["uruguay"],
  FRA: ["france", "francia"],
  SEN: ["senegal"],
  IRQ: ["iraq", "irak"],
  NOR: ["norway", "noruega"],
  ARG: ["argentina"],
  ALG: ["algeria", "argelia"],
  AUT: ["austria"],
  JOR: ["jordan", "jordania"],
  POR: ["portugal"],
  COD: [
    "congo",
    "dr congo",
    "rd congo",
    "democratic republic of congo",
    "democratic republic of the congo",
    "republica democratica del congo",
  ],
  UZB: ["uzbekistan"],
  COL: ["colombia"],
  ENG: ["england", "inglaterra"],
  CRO: ["croatia", "croacia"],
  GHA: ["ghana", "gana"],
  PAN: ["panama"],
  FWC: [
    "fwc",
    "fifa world cup",
    "world cup",
    "copa mundial",
    "mundial",
    "especial",
    "especiales",
    "special",
    "specials",
  ],
  CC: ["cc", "ce ce", "coca cola", "coca-cola", "cocacola", "coca", "coke"],
};

const fallbackTokenAllowlist = new Set([
  "add",
  "agrega",
  "anade",
  "anadir",
  "and",
  "card",
  "de",
  "del",
  "e",
  "el",
  "figurita",
  "ficha",
  "for",
  "from",
  "la",
  "number",
  "numero",
  "num",
  "please",
  "por",
  "favor",
  "sticker",
  "the",
  "y",
]);

const groupAliases = buildGroupAliases();
const voiceBlockAliasCodeMap = buildVoiceBlockAliasCodeMap();
const voiceBlockCountryPattern = buildVoiceBlockCountryPattern();

export function parseTextDeterministically(text: string): {
  candidates: ResolvedStickerCandidate[];
  unresolved: ParseStickerUnresolved[];
} {
  const candidates: ResolvedStickerCandidate[] = [];
  const unresolved: ParseStickerUnresolved[] = [];

  for (const phrase of splitPhrases(normalizeSpokenStickerText(text))) {
    const cleaned = stripCommandWords(phrase);
    if (!cleaned) continue;

    const resolved = resolvePhrase(cleaned);

    if (resolved) {
      candidates.push(resolved);
      continue;
    }

    if (/\b(?:sticker|ficha|figurita)\s+\d{1,2}\b/i.test(cleaned)) {
      unresolved.push({
        rawText: cleaned,
        reason: "Missing group or team.",
      });
      continue;
    }

    unresolved.push({
      rawText: cleaned,
      reason: "Could not resolve to a known sticker.",
    });
  }

  return {
    candidates: dedupeResolvedCandidates(candidates),
    unresolved,
  };
}

export function parseVoiceTranscriptDeterministically(
  text: string,
): DeterministicVoiceParseResult {
  const normalizedTranscript = normalizeVoiceTranscriptForParsing(text);
  const normalizedTokens = splitNormalizedTokens(normalizedTranscript);
  const phoneticTokens = normalizedTokens.map(phoneticNormalizeToken);
  const phoneticTranscript = phoneticTokens.join(" ");
  const consumedTokenIndexes = new Set<number>();
  const candidates: ResolvedStickerCandidate[] = [];

  candidates.push(
    ...collectVoiceBlockCandidates({
      normalizedTokens,
      phoneticTranscript,
      consumedTokenIndexes,
    }),
  );
  candidates.push(
    ...collectCompactCodeCandidates({
      normalizedTokens,
      consumedTokenIndexes,
    }),
  );

  const dedupedCandidates = dedupeResolvedCandidates(candidates);
  const unmatched = collectUnmatchedVoiceTokens({
    normalizedTokens,
    consumedTokenIndexes,
  });

  const unresolved = unmatched.fragments.map((fragment) => ({
    rawText: fragment,
    reason: "Could not resolve voice transcript completely.",
  }));

  return {
    candidates: dedupedCandidates,
    unresolved,
    needsFallback: unmatched.tokens.length > 0,
    unmatchedTokens: unmatched.tokens,
    unmatchedFragments: unmatched.fragments,
  };
}

export function normalizeStickerText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeSpokenStickerText(value: string) {
  let normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bce\s+ce\b/gi, "CC");

  for (const [spoken, numeric] of Object.entries(spokenNumberAliases)) {
    normalized = normalized.replace(
      new RegExp(`\\b${spoken}\\b`, "gi"),
      numeric,
    );
  }

  return normalized;
}

export function normalizeVoiceTranscriptForParsing(value: string) {
  const normalized = normalizeSpokenStickerText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeVoiceSpecialCodeTokens(normalized);
}

export function resolveGroupAlias(alias: string) {
  const normalized = normalizeStickerText(alias);
  return groupAliases.get(normalized) ?? null;
}

export function resolveStickerCode(code: string): ResolvedStickerCandidate | null {
  const sticker = exactCodeByNormalized.get(normalizeStickerCode(code));

  if (!sticker) return null;

  return {
    sticker,
    confidence: 1,
    source: code,
  };
}

export function resolveStickerCandidate(
  candidate: ModelStickerSuggestion,
): ResolvedStickerCandidate | null {
  if (candidate.code) {
    const byCode = resolveStickerCode(candidate.code);
    if (byCode) {
      return {
        ...byCode,
        confidence: clampConfidence(candidate.confidence ?? byCode.confidence),
        source: candidate.rawText || candidate.code,
      };
    }
  }

  if (!candidate.group || !candidate.number) return null;

  const groupCode = resolveGroupAlias(candidate.group);
  if (!groupCode) return null;

  const number = normalizeStickerNumber(candidate.number, groupCode);
  if (!number) return null;

  const byParts = resolveStickerCode(`${groupCode} ${number}`);
  if (!byParts) return null;

  return {
    ...byParts,
    confidence: clampConfidence(candidate.confidence ?? byParts.confidence),
    source: candidate.rawText || `${groupCode} ${number}`,
  };
}

export function toParseCandidate(
  candidate: ResolvedStickerCandidate,
): ParseStickerCandidate {
  const sticker = candidate.sticker;
  const code = getCanonicalDisplayCode(sticker);

  return {
    stickerId: sticker.id,
    stickerOsIndex: sticker.stickerOsIndex,
    code,
    label: code,
    groupLabel: sticker.groupLabel,
    number: sticker.number,
    confidence: candidate.confidence,
    selected: true,
    source: candidate.source,
  };
}

export function dedupeResolvedCandidates(candidates: ResolvedStickerCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.sticker.id)) return false;
    seen.add(candidate.sticker.id);
    return true;
  });
}

function resolvePhrase(phrase: string): ResolvedStickerCandidate | null {
  const searchable = normalizeStickerText(phrase);
  const numberThenGroup = searchable.match(
    /\b(?:sticker|ficha|figurita|card)\s+#?\s*(\d{1,2})\s+([a-z][a-z\s-]*)\b/i,
  );

  if (numberThenGroup) {
    const group = resolveGroupAlias(numberThenGroup[2]!);
    const number = group ? normalizeStickerNumber(numberThenGroup[1]!, group) : null;
    if (group && number) {
      const resolved = resolveStickerCode(`${group} ${number}`);
      if (resolved) return { ...resolved, source: phrase };
    }
  }

  const compactCode = searchable.match(/\b([a-z]{2,4})\s*[-#]?\s*(\d{1,2})\b/i);

  if (compactCode) {
    const group = resolveGroupAlias(compactCode[1]!);
    const number = group ? normalizeStickerNumber(compactCode[2]!, group) : null;
    if (group && number) return resolveStickerCode(`${group} ${number}`);
  }

  const groupNumber = searchable.match(
    /\b([a-z][a-z\s-]*?)\s+(?:sticker|ficha|figurita|card)?\s*#?\s*(\d{1,2})\b/i,
  );

  if (groupNumber) {
    const group = resolveGroupAlias(groupNumber[1]!);
    const number = group ? normalizeStickerNumber(groupNumber[2]!, group) : null;
    if (group && number) {
      const resolved = resolveStickerCode(`${group} ${number}`);
      if (resolved) return { ...resolved, source: phrase };
    }
  }

  const stickerNumber = searchable.match(/\b(?:sticker|ficha|figurita)\s+#?\s*(\d{1,2})\b/i);
  if (stickerNumber?.[1] === "00" || stickerNumber?.[1] === "0") {
    return resolveStickerCode("FWC 00");
  }

  return null;
}

function splitPhrases(text: string) {
  return text
    .replace(/\+/g, " and ")
    .split(/\s*(?:,|;|\band\b|\by\b|\n)\s*/i)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

function stripCommandWords(value: string) {
  return value
    .replace(/^\s*(?:please\s+)?(?:add|agrega|añade|anadir|añadir)\s+/i, "")
    .replace(/^\s*(?:the|la|el)\s+/i, "")
    .replace(/\b(?:from|de|del)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStickerNumber(value: string, groupCode: string) {
  const numeric = value.trim().replace(/^#/, "");
  const asNumber = Number(numeric);

  if (!Number.isInteger(asNumber)) return null;

  if (groupCode === "FWC") {
    if (numeric === "00" || asNumber === 0) return "00";
    if (asNumber >= 1 && asNumber <= 19) return `${asNumber}`;
    return null;
  }

  if (groupCode === "CC") {
    return asNumber >= 1 && asNumber <= 14 ? `${asNumber}` : null;
  }

  return asNumber >= 1 && asNumber <= 20 ? `${asNumber}` : null;
}

function getCanonicalDisplayCode(sticker: Sticker) {
  return `${getGroupCode(sticker)} ${sticker.number}`;
}

function getGroupCode(sticker: Sticker) {
  if (sticker.category === "fwc") return "FWC";
  if (sticker.category === "cc") return "CC";
  return sticker.countryCode ?? sticker.groupId.toUpperCase();
}

function buildGroupAliases() {
  const aliases = new Map<string, string>();

  aliases.set("fwc", "FWC");
  aliases.set("world cup", "FWC");
  aliases.set("fifa world cup", "FWC");
  aliases.set("coca cola", "CC");
  aliases.set("cocacola", "CC");
  aliases.set("coke", "CC");
  aliases.set("cc", "CC");

  for (const [name, code] of Object.entries(countryNameAliases)) {
    aliases.set(normalizeStickerText(name), code);
  }

  for (const group of stickerGroups) {
    const code = getGroupAliasCode(group);
    aliases.set(normalizeStickerText(group.id), code);
    aliases.set(normalizeStickerText(group.label), code);
    aliases.set(normalizeStickerText(group.exportLabel), code);
    aliases.set(normalizeStickerText(group.name), code);
    if (group.countryCode) aliases.set(normalizeStickerText(group.countryCode), code);
  }

  return aliases;
}

function getGroupAliasCode(group: StickerGroup) {
  if (group.category === "fwc") return "FWC";
  if (group.category === "cc") return "CC";
  return group.countryCode ?? group.id.toUpperCase();
}

function normalizeStickerCode(value: string) {
  return normalizeStickerText(value).replace(/\s+/g, "");
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.75;
  return Math.min(1, Math.max(0, value));
}

function splitNormalizedTokens(value: string) {
  if (!value) return [];
  return value.split(" ").filter(Boolean);
}

function normalizeVoiceSpecialCodeTokens(value: string) {
  if (!value) return value;

  return value
    .replace(/\bf\s*w\s*c(?=\b|\d)/g, "fwc")
    .replace(/\bce\s*ce(?=\b|\d)/g, "cc")
    .replace(/\bc\s*c(?=\b|\d)/g, "cc")
    .replace(/\b(fwc|cc)(\d{1,2})\b/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function collectVoiceBlockCandidates({
  normalizedTokens,
  phoneticTranscript,
  consumedTokenIndexes,
}: {
  normalizedTokens: string[];
  phoneticTranscript: string;
  consumedTokenIndexes: Set<number>;
}) {
  if (!phoneticTranscript) return [];

  const matches = [...phoneticTranscript.matchAll(voiceBlockCountryPattern)];
  const candidates: ResolvedStickerCandidate[] = [];
  const matchStartTokens = matches.map((match) =>
    countTokensBeforeIndex(phoneticTranscript, match.index ?? 0),
  );

  for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
    const match = matches[matchIndex];
    const alias = match?.[1] ?? "";
    const codeCandidates = voiceBlockAliasCodeMap.get(alias);
    if (!codeCandidates || codeCandidates.size !== 1) continue;

    const groupCode = [...codeCandidates][0];
    if (!groupCode) continue;

    const aliasStartToken = matchStartTokens[matchIndex] ?? 0;
    const aliasTokenCount = countTokensInText(alias);
    const aliasEndToken = aliasStartToken + aliasTokenCount - 1;

    if (aliasTokenCount > 0) {
      for (let tokenIndex = aliasStartToken; tokenIndex <= aliasEndToken; tokenIndex += 1) {
        consumedTokenIndexes.add(tokenIndex);
      }
    }

    const nextAliasStartToken =
      matchStartTokens[matchIndex + 1] ?? normalizedTokens.length;
    const blockNumberStart = aliasEndToken + 1;
    const blockNumberEnd = nextAliasStartToken - 1;

    for (
      let tokenIndex = blockNumberStart;
      tokenIndex <= blockNumberEnd && tokenIndex < normalizedTokens.length;
      tokenIndex += 1
    ) {
      const token = normalizedTokens[tokenIndex];
      if (!token || !/^\d+$/.test(token)) continue;

      const normalizedNumber = normalizeNumberForVoiceBlock(token, groupCode);
      if (!normalizedNumber) continue;

      const resolved = resolveStickerCode(`${groupCode} ${normalizedNumber}`);
      if (!resolved) continue;

      consumedTokenIndexes.add(tokenIndex);
      candidates.push({
        ...resolved,
        source: `${groupCode} ${normalizedNumber}`,
      });
    }
  }

  return candidates;
}

function collectCompactCodeCandidates({
  normalizedTokens,
  consumedTokenIndexes,
}: {
  normalizedTokens: string[];
  consumedTokenIndexes: Set<number>;
}) {
  const candidates: ResolvedStickerCandidate[] = [];

  for (let tokenIndex = 0; tokenIndex < normalizedTokens.length; tokenIndex += 1) {
    const token = normalizedTokens[tokenIndex];
    if (!token || consumedTokenIndexes.has(tokenIndex)) continue;

    const compactCode = token.match(/^([a-z]{2,4})(\d{1,2})$/i);
    if (!compactCode) continue;

    const groupCode = resolveGroupAlias(compactCode[1] ?? "");
    if (!groupCode) continue;

    const number = normalizeStickerNumber(compactCode[2] ?? "", groupCode);
    if (!number) continue;

    const resolved = resolveStickerCode(`${groupCode} ${number}`);
    if (!resolved) continue;

    consumedTokenIndexes.add(tokenIndex);
    candidates.push({
      ...resolved,
      source: token,
    });
  }

  return candidates;
}

function normalizeNumberForVoiceBlock(value: string, groupCode: string) {
  const sanitized = value.trim().replace(/^#/, "");
  if (!sanitized) return null;

  if (groupCode === "FWC") {
    if (sanitized === "00") return "00";
    const asNumber = Number(sanitized);
    if (!Number.isInteger(asNumber)) return null;
    if (asNumber === 0) return "00";
    if (asNumber >= 1 && asNumber <= 19) return `${asNumber}`;
    return null;
  }

  const asNumber = Number(sanitized);
  if (!Number.isInteger(asNumber)) return null;

  if (groupCode === "CC") {
    return asNumber >= 1 && asNumber <= 14 ? `${asNumber}` : null;
  }

  return asNumber >= 1 && asNumber <= 20 ? `${asNumber}` : null;
}

function buildVoiceBlockAliasCodeMap() {
  const aliasMap = new Map<string, Set<string>>();

  const addAlias = (alias: string, code: string) => {
    const normalizedAlias = normalizeVoiceAliasForMatching(alias);
    if (!normalizedAlias || !code) return;

    const existing = aliasMap.get(normalizedAlias);
    if (existing) {
      existing.add(code);
      return;
    }

    aliasMap.set(normalizedAlias, new Set([code]));
  };

  for (const group of stickerGroups) {
    const code = getGroupAliasCode(group);
    addAlias(code, code);
    addAlias(group.id, code);
    addAlias(group.label, code);
    addAlias(group.exportLabel, code);
    addAlias(group.name, code);
  }

  for (const [alias, code] of groupAliases.entries()) {
    addAlias(alias, code);
  }

  for (const [code, aliases] of Object.entries(voiceCountryAliasesByCode)) {
    addAlias(code, code);
    for (const alias of aliases) addAlias(alias, code);
  }

  return aliasMap;
}

function buildVoiceBlockCountryPattern() {
  const aliases = [...voiceBlockAliasCodeMap.keys()].sort((a, b) => b.length - a.length);
  if (aliases.length === 0) return /$^/g;

  const aliasPattern = aliases.map(escapeAliasPattern).join("|");
  return new RegExp(
    `\\b(${aliasPattern})\\b\\s*([^]*?)(?=\\b(?:${aliasPattern})\\b\\s*|$)`,
    "gi",
  );
}

function collectUnmatchedVoiceTokens({
  normalizedTokens,
  consumedTokenIndexes,
}: {
  normalizedTokens: string[];
  consumedTokenIndexes: Set<number>;
}) {
  const unmatchedIndexes: number[] = [];
  const unmatchedTokens: string[] = [];

  for (let tokenIndex = 0; tokenIndex < normalizedTokens.length; tokenIndex += 1) {
    if (consumedTokenIndexes.has(tokenIndex)) continue;

    const token = normalizedTokens[tokenIndex];
    if (!token || !isMeaningfulUnmatchedVoiceToken(token, tokenIndex, normalizedTokens)) continue;

    unmatchedIndexes.push(tokenIndex);
    unmatchedTokens.push(token);
  }

  const fragments = toTokenFragments(normalizedTokens, unmatchedIndexes);
  return {
    tokens: unmatchedTokens,
    fragments,
  };
}

function isMeaningfulUnmatchedVoiceToken(
  token: string,
  tokenIndex: number,
  tokens: string[],
) {
  if (fallbackTokenAllowlist.has(token)) return false;
  if (/^\d+$/.test(token)) return true;
  if (!/^[a-z]+$/.test(token)) return false;
  if (token.length === 1) {
    return looksLikeFailedCodeFragment(token, tokenIndex, tokens);
  }
  return token.length >= 2;
}

function looksLikeFailedCodeFragment(token: string, tokenIndex: number, tokens: string[]) {
  if (!/[fcw]/.test(token)) return false;

  const previousToken = tokens[tokenIndex - 1] ?? "";
  const nextToken = tokens[tokenIndex + 1] ?? "";
  const neighbors = [previousToken, nextToken].filter(Boolean);

  for (const neighbor of neighbors) {
    if (/^\d+$/.test(neighbor)) return true;
    if (/^[a-z]\d{1,2}$/.test(neighbor)) return true;
    if (/^(?:f|w|c|fw|wc|cf|fc)$/i.test(neighbor)) return true;
  }

  return false;
}

function toTokenFragments(tokens: string[], indexes: number[]) {
  if (indexes.length === 0) return [];

  const sorted = [...indexes].sort((a, b) => a - b);
  const fragments: string[] = [];
  let currentStart = sorted[0]!;
  let previous = sorted[0]!;

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]!;
    if (next === previous + 1) {
      previous = next;
      continue;
    }

    fragments.push(tokens.slice(currentStart, previous + 1).join(" "));
    currentStart = next;
    previous = next;
  }

  fragments.push(tokens.slice(currentStart, previous + 1).join(" "));
  return fragments;
}

function normalizeVoiceAliasForMatching(value: string) {
  const normalized = normalizeVoiceTranscriptForParsing(value);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((token) => phoneticNormalizeToken(token))
    .join(" ")
    .trim();
}

function phoneticNormalizeToken(token: string) {
  if (!token || /^\d+$/.test(token)) return token;
  if (token === "fwc" || token === "cc") return token;

  return token
    .replace(/h/g, "")
    .replace(/g(?=[ei])/g, "j")
    .replace(/j/g, "g")
    .replace(/[kq]/g, "c")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/([a-z])\1+/g, "$1");
}

function countTokensBeforeIndex(value: string, index: number) {
  if (index <= 0) return 0;

  const prefix = value.slice(0, index).trim();
  if (!prefix) return 0;
  return prefix.split(" ").length;
}

function countTokensInText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(" ").length;
}

function escapeAliasPattern(value: string) {
  return value
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}
