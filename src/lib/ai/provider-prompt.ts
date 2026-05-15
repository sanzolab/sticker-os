import { stickerGroups } from "@/lib/sticker-data";
import type { ParseStickersInput } from "@/lib/ai/types";

export function buildProviderPrompt(input: ParseStickersInput) {
  const type = input.type;
  const isVoiceContext =
    type === "audio" || (type === "text" && input.source === "voice-transcript");
  const isBackendOnlyFallback = type === "audio" && input.reason === "local-engine-fail";

  return [
    "Identify Panini World Cup 2026 stickers from this input.",
    "Return strict JSON only with this shape:",
    '{"stickers":[{"rawText":"Mexico 13","code":"MEX 13","group":"MEX","number":"13","confidence":0.95}],"unresolved":[{"rawText":"sticker 14","reason":"Missing group/team"}]}',
    "Always include both top-level keys: stickers and unresolved. Use empty arrays when there are no items.",
    "Use codes only when confident. Do not invent IDs.",
    "Normalization:",
    "- Mexico 13, México 13, MEX 13 -> MEX 13",
    "- CC14, CC 14, Coca Cola 14 -> CC 14",
    "- FWC00, FWC 00 -> FWC 00",
    "Sticker ranges:",
    "- FWC: 00–19 (00 = logo)",
    "- TEAM: 1–20",
    "- CC: 1–14",
    "Visual extraction priority:",
    "1) Read printed code (MEX 13, CC 4, FWC-05)",
    "2) If missing -> infer from visible text (country, number, year)",
    "3) If unclear -> unresolved",
    "FWC hints:",
    "- 00 logo",
    "- 03 mascot",
    "- 05 ball",
    "- 06–08 hosts (Canada, Mexico, USA)",
    "- years -> champions (e.g. 1986 -> FWC 14)",
    "TEAM hints:",
    "- Stickers contain team code + number",
    "- Do NOT infer team from page title unless visible on sticker",
    "COCA-COLA hints:",
    "- Codes CC1–CC14",
    "- Player must match known list; else unresolved",
    type === "image"
      ? "Image safety rules: full team/country pages are high hallucination risk. Validate each slot independently with visual evidence."
      : "",
    type === "image"
      ? "Never infer sticker presence from slot count, page title, grid position, or expected sequence."
      : "",
    type === "image"
      ? "A sticker is present only when readable printed code/text is visible in that slot."
      : "",
    type === "image"
      ? "Do not scan the entire page. Extract only clearly visible stickers."
      : "",
    type === "image"
      ? "Artwork-only, face-only, or filled-area-only observations are weak signal: include in unresolved, not stickers."
      : "",
    type === "image"
      ? "Reject empty slots and placeholders: blank boxes, faded placeholder backgrounds, printed album frames, or uniform empty grids."
      : "",
    isVoiceContext
      ? "Voice: merge split letters (F W C -> FWC, C C -> CC), handle glued forms (FWC1), parse multiple pairs."
      : "",
    isVoiceContext ? "If ambiguous -> unresolved (no guessing)." : "",
    `Valid team codes: ${getTeamCodes().join(", ")}.`,
    type === "image"
      ? "Extract only stickers with readable code/text. If uncertain, use unresolved."
      : "",
    type === "image"
      ? "Return at most 10 stickers and at most 5 unresolved items."
      : "",
    type === "audio" ? "Transcribe and extract sticker codes from speech." : "",
    isBackendOnlyFallback ? "If no transcript, transcribe first, then extract." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getTeamCodes() {
  return stickerGroups
    .map((group) => group.countryCode)
    .filter((code): code is string => Boolean(code));
}
