import type { Locale } from "@/lib/i18n";
import { stickerToIndex } from "@/lib/stickeros/album";

export type StickerCategory = "fwc" | "cc" | "country";
export type StickerKind =
  | "trophy"
  | "world"
  | "history"
  | "sponsor"
  | "shield"
  | "team"
  | "player";
export type StickerVisualState = "missing" | "owned" | "duplicate" | "special";

export type CompactStickerLabel = {
  primary: string;
  secondary: string;
  detail: string;
};

export type StickerGroup = {
  id: string;
  label: string;
  exportLabel: string;
  labels?: Partial<Record<Locale, string>>;
  exportLabels?: Partial<Record<Locale, string>>;
  category: StickerCategory;
  countryCode?: string;
  flag?: string;
};

export type Sticker = {
  id: string;
  stickerOsIndex: number;
  number: string;
  code: string;
  title: string;
  groupId: string;
  groupLabel: string;
  exportLabel: string;
  category: StickerCategory;
  countryCode?: string;
  flag?: string;
  special?: boolean;
  kind: StickerKind;
};

const fwcGroups: StickerGroup[] = [
  {
    id: "fwc-trophy",
    label: "FWC - Specials 🏆",
    exportLabel: "FWC - Specials 🏆",
    labels: {
      en: "FWC - Specials 🏆",
      es: "FWC - Especiales 🏆",
    },
    exportLabels: {
      en: "FWC - Specials 🏆",
      es: "FWC - Especiales 🏆",
    },
    category: "fwc",
  },
  {
    id: "fwc-world",
    label: "FWC - Ball and Countries 🌎",
    exportLabel: "FWC - Ball and Countries 🌎",
    labels: {
      en: "FWC - Ball and Countries 🌎",
      es: "FWC - Balón y Países 🌎",
    },
    exportLabels: {
      en: "FWC - Ball and Countries 🌎",
      es: "FWC - Balón y Países 🌎",
    },
    category: "fwc",
  },
  {
    id: "fwc-history",
    label: "FWC - History 📜",
    exportLabel: "FWC - History 📜",
    labels: {
      en: "FWC - History 📜",
      es: "FWC - Historia 📜",
    },
    exportLabels: {
      en: "FWC - History 📜",
      es: "FWC - Historia 📜",
    },
    category: "fwc",
  },
];

const ccGroups: StickerGroup[] = [
  {
    id: "cc",
    label: "CC - COCA COLA 🥤",
    exportLabel: "CC - COCA COLA 🥤",
    category: "cc",
  },
];

const countryGroups: StickerGroup[] = [
  {
    id: "mex",
    label: "MEX 🇲🇽",
    exportLabel: "MEX 🇲🇽",
    category: "country",
    countryCode: "MEX",
    flag: "🇲🇽",
  },
  {
    id: "rsa",
    label: "RSA 🇿🇦",
    exportLabel: "RSA 🇿🇦",
    category: "country",
    countryCode: "RSA",
    flag: "🇿🇦",
  },
  {
    id: "kor",
    label: "KOR 🇰🇷",
    exportLabel: "KOR 🇰🇷",
    category: "country",
    countryCode: "KOR",
    flag: "🇰🇷",
  },
  {
    id: "cze",
    label: "CZE 🇨🇿",
    exportLabel: "CZE 🇨🇿",
    category: "country",
    countryCode: "CZE",
    flag: "🇨🇿",
  },
  {
    id: "can",
    label: "CAN 🇨🇦",
    exportLabel: "CAN 🇨🇦",
    category: "country",
    countryCode: "CAN",
    flag: "🇨🇦",
  },
  {
    id: "bih",
    label: "BIH 🇧🇦",
    exportLabel: "BIH 🇧🇦",
    category: "country",
    countryCode: "BIH",
    flag: "🇧🇦",
  },
  {
    id: "qat",
    label: "QAT 🇶🇦",
    exportLabel: "QAT 🇶🇦",
    category: "country",
    countryCode: "QAT",
    flag: "🇶🇦",
  },
  {
    id: "sui",
    label: "SUI 🇨🇭",
    exportLabel: "SUI 🇨🇭",
    category: "country",
    countryCode: "SUI",
    flag: "🇨🇭",
  },
  {
    id: "bra",
    label: "BRA 🇧🇷",
    exportLabel: "BRA 🇧🇷",
    category: "country",
    countryCode: "BRA",
    flag: "🇧🇷",
  },
  {
    id: "mar",
    label: "MAR 🇲🇦",
    exportLabel: "MAR 🇲🇦",
    category: "country",
    countryCode: "MAR",
    flag: "🇲🇦",
  },
  {
    id: "hai",
    label: "HAI 🇭🇹",
    exportLabel: "HAI 🇭🇹",
    category: "country",
    countryCode: "HAI",
    flag: "🇭🇹",
  },
  {
    id: "sco",
    label: "SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    exportLabel: "SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    category: "country",
    countryCode: "SCO",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  },
  {
    id: "usa",
    label: "USA 🇺🇸",
    exportLabel: "USA 🇺🇸",
    category: "country",
    countryCode: "USA",
    flag: "🇺🇸",
  },
  {
    id: "par",
    label: "PAR 🇵🇾",
    exportLabel: "PAR 🇵🇾",
    category: "country",
    countryCode: "PAR",
    flag: "🇵🇾",
  },
  {
    id: "aus",
    label: "AUS 🇦🇺",
    exportLabel: "AUS 🇦🇺",
    category: "country",
    countryCode: "AUS",
    flag: "🇦🇺",
  },
  {
    id: "tur",
    label: "TUR 🇹🇷",
    exportLabel: "TUR 🇹🇷",
    category: "country",
    countryCode: "TUR",
    flag: "🇹🇷",
  },
  {
    id: "ger",
    label: "GER 🇩🇪",
    exportLabel: "GER 🇩🇪",
    category: "country",
    countryCode: "GER",
    flag: "🇩🇪",
  },
  {
    id: "cuw",
    label: "CUW 🇨🇼",
    exportLabel: "CUW 🇨🇼",
    category: "country",
    countryCode: "CUW",
    flag: "🇨🇼",
  },
  {
    id: "civ",
    label: "CIV 🇨🇮",
    exportLabel: "CIV 🇨🇮",
    category: "country",
    countryCode: "CIV",
    flag: "🇨🇮",
  },
  {
    id: "ecu",
    label: "ECU 🇪🇨",
    exportLabel: "ECU 🇪🇨",
    category: "country",
    countryCode: "ECU",
    flag: "🇪🇨",
  },
  {
    id: "ned",
    label: "NED 🇳🇱",
    exportLabel: "NED 🇳🇱",
    category: "country",
    countryCode: "NED",
    flag: "🇳🇱",
  },
  {
    id: "jpn",
    label: "JPN 🇯🇵",
    exportLabel: "JPN 🇯🇵",
    category: "country",
    countryCode: "JPN",
    flag: "🇯🇵",
  },
  {
    id: "swe",
    label: "SWE 🇸🇪",
    exportLabel: "SWE 🇸🇪",
    category: "country",
    countryCode: "SWE",
    flag: "🇸🇪",
  },
  {
    id: "tun",
    label: "TUN 🇹🇳",
    exportLabel: "TUN 🇹🇳",
    category: "country",
    countryCode: "TUN",
    flag: "🇹🇳",
  },
  {
    id: "bel",
    label: "BEL 🇧🇪",
    exportLabel: "BEL 🇧🇪",
    category: "country",
    countryCode: "BEL",
    flag: "🇧🇪",
  },
  {
    id: "egy",
    label: "EGY 🇪🇬",
    exportLabel: "EGY 🇪🇬",
    category: "country",
    countryCode: "EGY",
    flag: "🇪🇬",
  },
  {
    id: "irn",
    label: "IRN 🇮🇷",
    exportLabel: "IRN 🇮🇷",
    category: "country",
    countryCode: "IRN",
    flag: "🇮🇷",
  },
  {
    id: "nzl",
    label: "NZL 🇳🇿",
    exportLabel: "NZL 🇳🇿",
    category: "country",
    countryCode: "NZL",
    flag: "🇳🇿",
  },
  {
    id: "esp",
    label: "ESP 🇪🇸",
    exportLabel: "ESP 🇪🇸",
    category: "country",
    countryCode: "ESP",
    flag: "🇪🇸",
  },
  {
    id: "cpv",
    label: "CPV 🇨🇻",
    exportLabel: "CPV 🇨🇻",
    category: "country",
    countryCode: "CPV",
    flag: "🇨🇻",
  },
  {
    id: "ksa",
    label: "KSA 🇸🇦",
    exportLabel: "KSA 🇸🇦",
    category: "country",
    countryCode: "KSA",
    flag: "🇸🇦",
  },
  {
    id: "uru",
    label: "URU 🇺🇾",
    exportLabel: "URU 🇺🇾",
    category: "country",
    countryCode: "URU",
    flag: "🇺🇾",
  },
  {
    id: "fra",
    label: "FRA 🇫🇷",
    exportLabel: "FRA 🇫🇷",
    category: "country",
    countryCode: "FRA",
    flag: "🇫🇷",
  },
  {
    id: "sen",
    label: "SEN 🇸🇳",
    exportLabel: "SEN 🇸🇳",
    category: "country",
    countryCode: "SEN",
    flag: "🇸🇳",
  },
  {
    id: "irq",
    label: "IRQ 🇮🇶",
    exportLabel: "IRQ 🇮🇶",
    category: "country",
    countryCode: "IRQ",
    flag: "🇮🇶",
  },
  {
    id: "nor",
    label: "NOR 🇳🇴",
    exportLabel: "NOR 🇳🇴",
    category: "country",
    countryCode: "NOR",
    flag: "🇳🇴",
  },
  {
    id: "arg",
    label: "ARG 🇦🇷",
    exportLabel: "ARG 🇦🇷",
    category: "country",
    countryCode: "ARG",
    flag: "🇦🇷",
  },
  {
    id: "alg",
    label: "ALG 🇩🇿",
    exportLabel: "ALG 🇩🇿",
    category: "country",
    countryCode: "ALG",
    flag: "🇩🇿",
  },
  {
    id: "aut",
    label: "AUT 🇦🇹",
    exportLabel: "AUT 🇦🇹",
    category: "country",
    countryCode: "AUT",
    flag: "🇦🇹",
  },
  {
    id: "jor",
    label: "JOR 🇯🇴",
    exportLabel: "JOR 🇯🇴",
    category: "country",
    countryCode: "JOR",
    flag: "🇯🇴",
  },
  {
    id: "por",
    label: "POR 🇵🇹",
    exportLabel: "POR 🇵🇹",
    category: "country",
    countryCode: "POR",
    flag: "🇵🇹",
  },
  {
    id: "cod",
    label: "COD 🇨🇩",
    exportLabel: "COD 🇨🇩",
    category: "country",
    countryCode: "COD",
    flag: "🇨🇩",
  },
  {
    id: "uzb",
    label: "UZB 🇺🇿",
    exportLabel: "UZB 🇺🇿",
    category: "country",
    countryCode: "UZB",
    flag: "🇺🇿",
  },
  {
    id: "col",
    label: "COL 🇨🇴",
    exportLabel: "COL 🇨🇴",
    category: "country",
    countryCode: "COL",
    flag: "🇨🇴",
  },
  {
    id: "eng",
    label: "ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    exportLabel: "ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    category: "country",
    countryCode: "ENG",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    id: "cro",
    label: "CRO 🇭🇷",
    exportLabel: "CRO 🇭🇷",
    category: "country",
    countryCode: "CRO",
    flag: "🇭🇷",
  },
  {
    id: "gha",
    label: "GHA 🇬🇭",
    exportLabel: "GHA 🇬🇭",
    category: "country",
    countryCode: "GHA",
    flag: "🇬🇭",
  },
  {
    id: "pan",
    label: "PAN 🇵🇦",
    exportLabel: "PAN 🇵🇦",
    category: "country",
    countryCode: "PAN",
    flag: "🇵🇦",
  },
];

const countryDisplayNames: Record<string, Partial<Record<Locale, string>>> = {
  MEX: { en: "Mexico", es: "México" },
  RSA: { en: "South Africa", es: "Sudáfrica" },
  KOR: { en: "South Korea", es: "Corea del Sur" },
  CZE: { en: "Czechia", es: "Chequia" },
  CAN: { en: "Canada", es: "Canadá" },
  BIH: { en: "Bosnia and Herzegovina", es: "Bosnia y Herzegovina" },
  QAT: { en: "Qatar", es: "Catar" },
  SUI: { en: "Switzerland", es: "Suiza" },
  BRA: { en: "Brazil", es: "Brasil" },
  MAR: { en: "Morocco", es: "Marruecos" },
  HAI: { en: "Haiti", es: "Haití" },
  SCO: { en: "Scotland", es: "Escocia" },
  USA: { en: "United States", es: "Estados Unidos" },
  PAR: { en: "Paraguay", es: "Paraguay" },
  AUS: { en: "Australia", es: "Australia" },
  TUR: { en: "Turkey", es: "Turquía" },
  GER: { en: "Germany", es: "Alemania" },
  CUW: { en: "Curacao", es: "Curazao" },
  CIV: { en: "Cote d'Ivoire", es: "Costa de Marfil" },
  ECU: { en: "Ecuador", es: "Ecuador" },
  NED: { en: "Netherlands", es: "Países Bajos" },
  JPN: { en: "Japan", es: "Japón" },
  SWE: { en: "Sweden", es: "Suecia" },
  TUN: { en: "Tunisia", es: "Túnez" },
  BEL: { en: "Belgium", es: "Bélgica" },
  EGY: { en: "Egypt", es: "Egipto" },
  IRN: { en: "Iran", es: "Irán" },
  NZL: { en: "New Zealand", es: "Nueva Zelanda" },
  ESP: { en: "Spain", es: "España" },
  CPV: { en: "Cape Verde", es: "Cabo Verde" },
  KSA: { en: "Saudi Arabia", es: "Arabia Saudita" },
  URU: { en: "Uruguay", es: "Uruguay" },
  FRA: { en: "France", es: "Francia" },
  SEN: { en: "Senegal", es: "Senegal" },
  IRQ: { en: "Iraq", es: "Irak" },
  NOR: { en: "Norway", es: "Noruega" },
  ARG: { en: "Argentina", es: "Argentina" },
  ALG: { en: "Algeria", es: "Argelia" },
  AUT: { en: "Austria", es: "Austria" },
  JOR: { en: "Jordan", es: "Jordania" },
  POR: { en: "Portugal", es: "Portugal" },
  COD: { en: "DR Congo", es: "RD Congo" },
  UZB: { en: "Uzbekistan", es: "Uzbekistán" },
  COL: { en: "Colombia", es: "Colombia" },
  ENG: { en: "England", es: "Inglaterra" },
  CRO: { en: "Croatia", es: "Croacia" },
  GHA: { en: "Ghana", es: "Ghana" },
  PAN: { en: "Panama", es: "Panamá" },
};

export const stickerGroups = [...fwcGroups, ...countryGroups, ...ccGroups];
export const sectionOrder = stickerGroups.map((group) => group.id);
export const stickerGroupsById = Object.fromEntries(
  stickerGroups.map((group) => [group.id, group]),
);

const stickerKindSearchLabels: Record<Locale, Record<StickerKind, string[]>> = {
  en: {
    trophy: ["trophy"],
    world: ["world", "ball", "countries"],
    history: ["history"],
    sponsor: ["sponsor"],
    shield: ["shield"],
    team: ["team", "team photo"],
    player: ["player"],
  },
  es: {
    trophy: ["trofeo", "copa"],
    world: ["mundo", "balon", "balón", "paises", "países"],
    history: ["historia"],
    sponsor: ["patrocinador"],
    shield: ["escudo"],
    team: ["equipo", "foto de equipo"],
    player: ["jugador"],
  },
};

export function normalizeStickerSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getStickerGroupLabel(group: StickerGroup, locale: Locale) {
  return group.labels?.[locale] ?? group.label;
}

export function getStickerExportLabel(group: StickerGroup, locale: Locale) {
  return group.exportLabels?.[locale] ?? group.exportLabel;
}

export function getStickerGroupLabelById(groupId: string, locale: Locale) {
  const group = stickerGroupsById[groupId];

  return group ? getStickerGroupLabel(group, locale) : groupId;
}

export function getCompactStickerLabel(
  sticker: Sticker,
  locale: Locale,
): CompactStickerLabel {
  if (sticker.category === "fwc") {
    return {
      primary: "FWC",
      secondary: sticker.number,
      detail: getCompactGroupDetail(getStickerGroupLabelById(sticker.groupId, locale), "FWC"),
    };
  }

  if (sticker.category === "cc") {
    return {
      primary: "CC",
      secondary: sticker.number,
      detail: getCompactGroupDetail(getStickerGroupLabelById(sticker.groupId, locale), "CC"),
    };
  }

  const code = sticker.countryCode ?? sticker.groupId.toUpperCase();

  return {
    primary: code,
    secondary: sticker.number,
    detail: getCountryDisplayName(code, locale) ?? getCompactGroupDetail(
      getStickerGroupLabelById(sticker.groupId, locale),
      code,
    ),
  };
}

export function getCompactStickerCode(sticker: Sticker) {
  if (sticker.category === "fwc") {
    return `FWC ${sticker.number}`;
  }

  if (sticker.category === "cc") {
    return `CC ${sticker.number}`;
  }

  const code = sticker.countryCode ?? sticker.groupId.toUpperCase();
  return `${code} ${sticker.number}`;
}

export function getStickerSearchValues(sticker: Sticker, locale: Locale) {
  const group = stickerGroupsById[sticker.groupId];
  const values = [
    sticker.number,
    sticker.code,
    sticker.title,
    sticker.groupLabel,
    sticker.countryCode,
    sticker.exportLabel,
    sticker.kind,
    ...stickerKindSearchLabels.en[sticker.kind],
    ...stickerKindSearchLabels[locale][sticker.kind],
  ];

  if (group) {
    values.push(
      getStickerGroupLabel(group, locale),
      getStickerExportLabel(group, locale),
      getStickerGroupLabel(group, "en"),
      getStickerExportLabel(group, "en"),
    );
  }

  return values.filter((value): value is string => Boolean(value));
}

function makeFwcSticker(
  group: StickerGroup,
  number: string,
  kind: StickerKind,
): Sticker {
  return {
    id: `${group.id}-${number}`,
    stickerOsIndex: getStickerOsIndex(`FWC ${number}`),
    number,
    code: `${group.exportLabel} ${number}`,
    title: `${group.label} ${number}`,
    groupId: group.id,
    groupLabel: group.label,
    exportLabel: group.exportLabel,
    category: "fwc",
    special: true,
    kind,
  };
}

const fwcStickers: Sticker[] = [
  ...["00", "1", "2", "3", "4"].map((number) =>
    makeFwcSticker(fwcGroups[0], number, "trophy"),
  ),
  ...["5", "6", "7", "8"].map((number) =>
    makeFwcSticker(fwcGroups[1], number, "world"),
  ),
  ...Array.from({ length: 11 }, (_, index) => `${index + 9}`).map((number) =>
    makeFwcSticker(fwcGroups[2], number, "history"),
  ),
];

const ccStickers: Sticker[] = Array.from({ length: 14 }, (_, index) => {
  const number = `${index + 1}`;
  return {
    id: `CC${number}`,
    stickerOsIndex: getStickerOsIndex(`CC ${number}`),
    number,
    code: `CC${number}`,
    title: `CC sponsor ${number}`,
    groupId: ccGroups[0].id,
    groupLabel: ccGroups[0].label,
    exportLabel: ccGroups[0].exportLabel,
    category: "cc" as StickerCategory,
    special: true,
    kind: "sponsor" as StickerKind,
  };
});

const countryStickers: Sticker[] = countryGroups.flatMap((group) =>
  Array.from({ length: 20 }, (_, index) => {
    const number = `${index + 1}`;
    const kind: StickerKind =
      number === "1" ? "shield" : number === "13" ? "team" : "player";

    return {
      id: `${group.countryCode}${number}`,
      stickerOsIndex: getStickerOsIndex(`${group.countryCode} ${number}`),
      number,
      code: `${group.countryCode}${number}`,
      title:
        kind === "shield"
          ? `${group.countryCode} shield`
          : kind === "team"
            ? `${group.countryCode} team photo`
            : `${group.countryCode} player ${number}`,
      groupId: group.id,
      groupLabel: group.label,
      exportLabel: group.exportLabel,
      category: "country" as StickerCategory,
      countryCode: group.countryCode,
      flag: group.flag,
      special: kind === "shield" || kind === "team",
      kind,
    };
  }),
);

export const stickers: Sticker[] = [
  ...fwcStickers,
  ...countryStickers,
  ...ccStickers,
];

export const stickersById = Object.fromEntries(
  stickers.map((sticker) => [sticker.id, sticker]),
);
export const stickersByStickerOsIndex = Object.fromEntries(
  stickers.map((sticker) => [sticker.stickerOsIndex, sticker]),
);

export const starterCollection: Record<string, number> = {};

export function getStickerCopies(
  collectionByStickerId: Record<string, number>,
  id: string,
) {
  return collectionByStickerId[id] ?? 0;
}

export function getVisualState(
  collectionByStickerId: Record<string, number>,
  sticker: Sticker,
): StickerVisualState {
  const copies = getStickerCopies(collectionByStickerId, sticker.id);
  if (copies === 0) return "missing";
  if (copies > 1) return "duplicate";
  if (sticker.special) return "special";
  return "owned";
}

export function getGroupedStickers(items = stickers) {
  return stickerGroups
    .map((group) => ({
      group,
      stickers: items.filter((sticker) => sticker.groupId === group.id),
    }))
    .filter((section) => section.stickers.length > 0);
}

function getStickerOsIndex(code: string) {
  return stickerToIndex(code);
}

function getCountryDisplayName(code: string, locale: Locale) {
  const names = countryDisplayNames[code];

  return names?.[locale] ?? names?.en;
}

function getCompactGroupDetail(label: string, code: string) {
  const withoutEmoji = label.replace(/\p{Extended_Pictographic}/gu, "");
  const withoutCode = withoutEmoji
    .replace(new RegExp(`^${escapeRegExp(code)}\\s*-?\\s*`, "i"), "")
    .trim();
  const compact = withoutCode || label.replace(/\p{Extended_Pictographic}/gu, "").trim();

  return toTitleCase(compact);
}

function toTitleCase(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\b[\p{L}]/gu, (letter) => letter.toLocaleUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
