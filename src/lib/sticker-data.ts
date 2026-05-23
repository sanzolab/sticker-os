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
  code: string;
  name: string;
  emoji?: string;
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
    code: "FWC",
    name: "Specials",
    emoji: "🏆",
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
    code: "FWC",
    name: "Ball and Countries",
    emoji: "🌎",
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
    code: "FWC",
    name: "History",
    emoji: "📜",
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
    code: "CC",
    name: "Coca Cola",
    emoji: "🥤",
    label: "CC - Coca Cola 🥤",
    exportLabel: "CC - Coca Cola 🥤",
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
    code: "MEX",
    name: "Mexico",
    emoji: "🇲🇽",
  },
  {
    id: "rsa",
    label: "RSA 🇿🇦",
    exportLabel: "RSA 🇿🇦",
    category: "country",
    countryCode: "RSA",
    flag: "🇿🇦",
    code: "RSA",
    name: "South Africa",
    emoji: "🇿🇦",
  },
  {
    id: "kor",
    label: "KOR 🇰🇷",
    exportLabel: "KOR 🇰🇷",
    category: "country",
    countryCode: "KOR",
    flag: "🇰🇷",
    code: "KOR",
    name: "South Korea",
    emoji: "🇰🇷",
  },
  {
    id: "cze",
    label: "CZE 🇨🇿",
    exportLabel: "CZE 🇨🇿",
    category: "country",
    countryCode: "CZE",
    flag: "🇨🇿",
    code: "CZE",
    name: "Czechia",
    emoji: "🇨🇿",
  },
  {
    id: "can",
    label: "CAN 🇨🇦",
    exportLabel: "CAN 🇨🇦",
    category: "country",
    countryCode: "CAN",
    flag: "🇨🇦",
    code: "CAN",
    name: "Canada",
    emoji: "🇨🇦",
  },
  {
    id: "bih",
    label: "BIH 🇧🇦",
    exportLabel: "BIH 🇧🇦",
    category: "country",
    countryCode: "BIH",
    flag: "🇧🇦",
    code: "BIH",
    name: "Bosnia and Herzegovina",
    emoji: "🇧🇦",
  },
  {
    id: "qat",
    label: "QAT 🇶🇦",
    exportLabel: "QAT 🇶🇦",
    category: "country",
    countryCode: "QAT",
    flag: "🇶🇦",
    code: "QAT",
    name: "Qatar",
    emoji: "🇶🇦",
  },
  {
    id: "sui",
    label: "SUI 🇨🇭",
    exportLabel: "SUI 🇨🇭",
    category: "country",
    countryCode: "SUI",
    flag: "🇨🇭",
    code: "SUI",
    name: "Switzerland",
    emoji: "🇨🇭",
  },
  {
    id: "bra",
    label: "BRA 🇧🇷",
    exportLabel: "BRA 🇧🇷",
    category: "country",
    countryCode: "BRA",
    flag: "🇧🇷",
    code: "BRA",
    name: "Brazil",
    emoji: "🇧🇷",
  },
  {
    id: "mar",
    label: "MAR 🇲🇦",
    exportLabel: "MAR 🇲🇦",
    category: "country",
    countryCode: "MAR",
    flag: "🇲🇦",
    code: "MAR",
    name: "Morocco",
    emoji: "🇲🇦",
  },
  {
    id: "hai",
    label: "HAI 🇭🇹",
    exportLabel: "HAI 🇭🇹",
    category: "country",
    countryCode: "HAI",
    flag: "🇭🇹",
    code: "HAI",
    name: "Haiti",
    emoji: "🇭🇹",
  },
  {
    id: "sco",
    label: "SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    exportLabel: "SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    category: "country",
    countryCode: "SCO",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    code: "SCO",
    name: "Scotland",
    emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  },
  {
    id: "usa",
    label: "USA 🇺🇸",
    exportLabel: "USA 🇺🇸",
    category: "country",
    countryCode: "USA",
    flag: "🇺🇸",
    code: "USA",
    name: "United States",
    emoji: "🇺🇸",
  },
  {
    id: "par",
    label: "PAR 🇵🇾",
    exportLabel: "PAR 🇵🇾",
    category: "country",
    countryCode: "PAR",
    flag: "🇵🇾",
    code: "PAR",
    name: "Paraguay",
    emoji: "🇵🇾",
  },
  {
    id: "aus",
    label: "AUS 🇦🇺",
    exportLabel: "AUS 🇦🇺",
    category: "country",
    countryCode: "AUS",
    flag: "🇦🇺",
    code: "AUS",
    name: "Australia",
    emoji: "🇦🇺",
  },
  {
    id: "tur",
    label: "TUR 🇹🇷",
    exportLabel: "TUR 🇹🇷",
    category: "country",
    countryCode: "TUR",
    flag: "🇹🇷",
    code: "TUR",
    name: "Turkey",
    emoji: "🇹🇷",
  },
  {
    id: "ger",
    label: "GER 🇩🇪",
    exportLabel: "GER 🇩🇪",
    category: "country",
    countryCode: "GER",
    flag: "🇩🇪",
    code: "GER",
    name: "Germany",
    emoji: "🇩🇪",
  },
  {
    id: "cuw",
    label: "CUW 🇨🇼",
    exportLabel: "CUW 🇨🇼",
    category: "country",
    countryCode: "CUW",
    flag: "🇨🇼",
    code: "CUW",
    name: "Curacao",
    emoji: "🇨🇼",
  },
  {
    id: "civ",
    label: "CIV 🇨🇮",
    exportLabel: "CIV 🇨🇮",
    category: "country",
    countryCode: "CIV",
    flag: "🇨🇮",
    code: "CIV",
    name: "Cote d'Ivoire",
    emoji: "🇨🇮",
  },
  {
    id: "ecu",
    label: "ECU 🇪🇨",
    exportLabel: "ECU 🇪🇨",
    category: "country",
    countryCode: "ECU",
    flag: "🇪🇨",
    code: "ECU",
    name: "Ecuador",
    emoji: "🇪🇨",
  },
  {
    id: "ned",
    label: "NED 🇳🇱",
    exportLabel: "NED 🇳🇱",
    category: "country",
    countryCode: "NED",
    flag: "🇳🇱",
    code: "NED",
    name: "Netherlands",
    emoji: "🇳🇱",
  },
  {
    id: "jpn",
    label: "JPN 🇯🇵",
    exportLabel: "JPN 🇯🇵",
    category: "country",
    countryCode: "JPN",
    flag: "🇯🇵",
    code: "JPN",
    name: "Japan",
    emoji: "🇯🇵",
  },
  {
    id: "swe",
    label: "SWE 🇸🇪",
    exportLabel: "SWE 🇸🇪",
    category: "country",
    countryCode: "SWE",
    flag: "🇸🇪",
    code: "SWE",
    name: "Sweden",
    emoji: "🇸🇪",
  },
  {
    id: "tun",
    label: "TUN 🇹🇳",
    exportLabel: "TUN 🇹🇳",
    category: "country",
    countryCode: "TUN",
    flag: "🇹🇳",
    code: "TUN",
    name: "Tunisia",
    emoji: "🇹🇳",
  },
  {
    id: "bel",
    label: "BEL 🇧🇪",
    exportLabel: "BEL 🇧🇪",
    category: "country",
    countryCode: "BEL",
    flag: "🇧🇪",
    code: "BEL",
    name: "Belgium",
    emoji: "🇧🇪",
  },
  {
    id: "egy",
    label: "EGY 🇪🇬",
    exportLabel: "EGY 🇪🇬",
    category: "country",
    countryCode: "EGY",
    flag: "🇪🇬",
    code: "EGY",
    name: "Egypt",
    emoji: "🇪🇬",
  },
  {
    id: "irn",
    label: "IRN 🇮🇷",
    exportLabel: "IRN 🇮🇷",
    category: "country",
    countryCode: "IRN",
    flag: "🇮🇷",
    code: "IRN",
    name: "Iran",
    emoji: "🇮🇷",
  },
  {
    id: "nzl",
    label: "NZL 🇳🇿",
    exportLabel: "NZL 🇳🇿",
    category: "country",
    countryCode: "NZL",
    flag: "🇳🇿",
    code: "NZL",
    name: "New Zealand",
    emoji: "🇳🇿",
  },
  {
    id: "esp",
    label: "ESP 🇪🇸",
    exportLabel: "ESP 🇪🇸",
    category: "country",
    countryCode: "ESP",
    flag: "🇪🇸",
    code: "ESP",
    name: "Spain",
    emoji: "🇪🇸",
  },
  {
    id: "cpv",
    label: "CPV 🇨🇻",
    exportLabel: "CPV 🇨🇻",
    category: "country",
    countryCode: "CPV",
    flag: "🇨🇻",
    code: "CPV",
    name: "Cape Verde",
    emoji: "🇨🇻",
  },
  {
    id: "ksa",
    label: "KSA 🇸🇦",
    exportLabel: "KSA 🇸🇦",
    category: "country",
    countryCode: "KSA",
    flag: "🇸🇦",
    code: "KSA",
    name: "Saudi Arabia",
    emoji: "🇸🇦",
  },
  {
    id: "uru",
    label: "URU 🇺🇾",
    exportLabel: "URU 🇺🇾",
    category: "country",
    countryCode: "URU",
    flag: "🇺🇾",
    code: "URU",
    name: "Uruguay",
    emoji: "🇺🇾",
  },
  {
    id: "fra",
    label: "FRA 🇫🇷",
    exportLabel: "FRA 🇫🇷",
    category: "country",
    countryCode: "FRA",
    flag: "🇫🇷",
    code: "FRA",
    name: "France",
    emoji: "🇫🇷",
  },
  {
    id: "sen",
    label: "SEN 🇸🇳",
    exportLabel: "SEN 🇸🇳",
    category: "country",
    countryCode: "SEN",
    flag: "🇸🇳",
    code: "SEN",
    name: "Senegal",
    emoji: "🇸🇳",
  },
  {
    id: "irq",
    label: "IRQ 🇮🇶",
    exportLabel: "IRQ 🇮🇶",
    category: "country",
    countryCode: "IRQ",
    flag: "🇮🇶",
    code: "IRQ",
    name: "Iraq",
    emoji: "🇮🇶",
  },
  {
    id: "nor",
    label: "NOR 🇳🇴",
    exportLabel: "NOR 🇳🇴",
    category: "country",
    countryCode: "NOR",
    flag: "🇳🇴",
    code: "NOR",
    name: "Norway",
    emoji: "🇳🇴",
  },
  {
    id: "arg",
    label: "ARG 🇦🇷",
    exportLabel: "ARG 🇦🇷",
    category: "country",
    countryCode: "ARG",
    flag: "🇦🇷",
    code: "ARG",
    name: "Argentina",
    emoji: "🇦🇷",
  },
  {
    id: "alg",
    label: "ALG 🇩🇿",
    exportLabel: "ALG 🇩🇿",
    category: "country",
    countryCode: "ALG",
    flag: "🇩🇿",
    code: "ALG",
    name: "Algeria",
    emoji: "🇩🇿",
  },
  {
    id: "aut",
    label: "AUT 🇦🇹",
    exportLabel: "AUT 🇦🇹",
    category: "country",
    countryCode: "AUT",
    flag: "🇦🇹",
    code: "AUT",
    name: "Austria",
    emoji: "🇦🇹",
  },
  {
    id: "jor",
    label: "JOR 🇯🇴",
    exportLabel: "JOR 🇯🇴",
    category: "country",
    countryCode: "JOR",
    flag: "🇯🇴",
    code: "JOR",
    name: "Jordan",
    emoji: "🇯🇴",
  },
  {
    id: "por",
    label: "POR 🇵🇹",
    exportLabel: "POR 🇵🇹",
    category: "country",
    countryCode: "POR",
    flag: "🇵🇹",
    code: "POR",
    name: "Portugal",
    emoji: "🇵🇹",
  },
  {
    id: "cod",
    label: "COD 🇨🇩",
    exportLabel: "COD 🇨🇩",
    category: "country",
    countryCode: "COD",
    flag: "🇨🇩",
    code: "COD",
    name: "DR Congo",
    emoji: "🇨🇩",
  },
  {
    id: "uzb",
    label: "UZB 🇺🇿",
    exportLabel: "UZB 🇺🇿",
    category: "country",
    countryCode: "UZB",
    flag: "🇺🇿",
    code: "UZB",
    name: "Uzbekistan",
    emoji: "🇺🇿",
  },
  {
    id: "col",
    label: "COL 🇨🇴",
    exportLabel: "COL 🇨🇴",
    category: "country",
    countryCode: "COL",
    flag: "🇨🇴",
    code: "COL",
    name: "Colombia",
    emoji: "🇨🇴",
  },
  {
    id: "eng",
    label: "ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    exportLabel: "ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    category: "country",
    countryCode: "ENG",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    code: "ENG",
    name: "England",
    emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    id: "cro",
    label: "CRO 🇭🇷",
    exportLabel: "CRO 🇭🇷",
    category: "country",
    countryCode: "CRO",
    flag: "🇭🇷",
    code: "CRO",
    name: "Croatia",
    emoji: "🇭🇷",
  },
  {
    id: "gha",
    label: "GHA 🇬🇭",
    exportLabel: "GHA 🇬🇭",
    category: "country",
    countryCode: "GHA",
    flag: "🇬🇭",
    code: "GHA",
    name: "Ghana",
    emoji: "🇬🇭",
  },
  {
    id: "pan",
    label: "PAN 🇵🇦",
    exportLabel: "PAN 🇵🇦",
    category: "country",
    countryCode: "PAN",
    flag: "🇵🇦",
    code: "PAN",
    name: "Panama",
    emoji: "🇵🇦",
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

export function getLocalizedCountryDisplayName(
  code: string,
  locale: Locale,
) {
  return getCountryDisplayName(code, locale) ?? code;
}

export function getCompactStickerLabel(
  sticker: Sticker,
  locale: Locale,
): CompactStickerLabel {
  if (sticker.category === "fwc") {
    const group = stickerGroupsById[sticker.groupId];
    return {
      primary: "FWC",
      secondary: sticker.number,
      detail: group ? getCompactGroupDetail(group, locale) : "FWC",
    };
  }

  if (sticker.category === "cc") {
    const group = stickerGroupsById[sticker.groupId];
    return {
      primary: "CC",
      secondary: sticker.number,
      detail: group ? getCompactGroupDetail(group, locale) : "CC",
    };
  }

  const code = sticker.countryCode ?? sticker.groupId.toUpperCase();

  return {
    primary: code,
    secondary: sticker.number,
    detail: getLocalizedCountryDisplayName(code, locale) ?? (() => {
      const group = stickerGroupsById[sticker.groupId];
      return group ? getCompactGroupDetail(group, locale) : code;
    })(),
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
      group.name,
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
    code: `FWC ${number}`,
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
    code: `CC ${number}`,
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
      code: `${group.countryCode} ${number}`,
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

function getCompactGroupDetail(group: StickerGroup, locale: Locale) {
  const label = getStickerGroupLabel(group, locale);
  const withoutEmoji = group.emoji
    ? label.replace(new RegExp(escapeRegExp(group.emoji), "g"), "")
    : label;
  const withoutCode = withoutEmoji
    .replace(new RegExp(`^${escapeRegExp(group.code)}\\s*-?\\s*`, "i"), "")
    .trim();
  const compact = withoutCode || group.name;

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
