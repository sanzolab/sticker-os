export const STICKEROS_QR_PREFIX = "⋋~";
export const STICKEROS_TOTAL_STICKERS = 994;
export const STICKEROS_BLOCK_SIZE = 125;
export const STICKEROS_LAST_BYTE_VALID_MASK = 0x03;

export type StickerOsSticker = {
  index: number;
  section: string;
  team?: string;
  number: string;
  code: string;
};

const TEAM_CODES = [
  "MEX",
  "RSA",
  "KOR",
  "CZE",
  "CAN",
  "BIH",
  "QAT",
  "SUI",
  "BRA",
  "MAR",
  "HAI",
  "SCO",
  "USA",
  "PAR",
  "AUS",
  "TUR",
  "GER",
  "CUW",
  "CIV",
  "ECU",
  "NED",
  "JPN",
  "SWE",
  "TUN",
  "BEL",
  "EGY",
  "IRN",
  "NZL",
  "ESP",
  "CPV",
  "KSA",
  "URU",
  "FRA",
  "SEN",
  "IRQ",
  "NOR",
  "ARG",
  "ALG",
  "AUT",
  "JOR",
  "POR",
  "COD",
  "UZB",
  "COL",
  "ENG",
  "CRO",
  "GHA",
  "PAN",
] as const;

export function buildStickerOsAlbum(): StickerOsSticker[] {
  const album: StickerOsSticker[] = [];

  album.push({
    index: album.length,
    section: "FWC - Specials",
    number: "00",
    code: "FWC 00",
  });

  for (let number = 1; number <= 4; number += 1) {
    album.push({
      index: album.length,
      section: "FWC - Specials",
      number: `${number}`,
      code: `FWC ${number}`,
    });
  }

  for (let number = 5; number <= 8; number += 1) {
    album.push({
      index: album.length,
      section: "FWC - Ball and Countries",
      number: `${number}`,
      code: `FWC ${number}`,
    });
  }

  for (let number = 9; number <= 19; number += 1) {
    album.push({
      index: album.length,
      section: "FWC - History",
      number: `${number}`,
      code: `FWC ${number}`,
    });
  }

  TEAM_CODES.forEach((team) => {
    for (let number = 1; number <= 20; number += 1) {
      album.push({
        index: album.length,
        section: team,
        team,
        number: `${number}`,
        code: `${team} ${number}`,
      });
    }
  });

  for (let number = 1; number <= 14; number += 1) {
    album.push({
      index: album.length,
      section: "CC - COCA COLA",
      number: `${number}`,
      code: `CC ${number}`,
    });
  }

  if (album.length !== STICKEROS_TOTAL_STICKERS) {
    throw new Error(`StickerOS album must contain ${STICKEROS_TOTAL_STICKERS} stickers`);
  }

  return album;
}

export const STICKEROS_ALBUM = buildStickerOsAlbum();

const stickersByCode = new Map(
  STICKEROS_ALBUM.map((sticker) => [normalizeStickerOsCode(sticker.code), sticker]),
);

export function indexToSticker(index: number): StickerOsSticker {
  const sticker = STICKEROS_ALBUM[index];

  if (!sticker) {
    throw new RangeError(`StickerOS index out of range: ${index}`);
  }

  return sticker;
}

export function stickerToIndex(sticker: string | Pick<StickerOsSticker, "code">): number {
  const code = typeof sticker === "string" ? sticker : sticker.code;
  const match = stickersByCode.get(normalizeStickerOsCode(code));

  if (!match) {
    throw new RangeError(`Unknown StickerOS sticker code: ${code}`);
  }

  return match.index;
}

export function normalizeStickerOsCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase();
}
