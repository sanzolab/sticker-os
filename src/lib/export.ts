"use client";

import {
  getStickerCopies,
  getStickerExportLabel,
  stickerGroups,
  stickers,
} from "@/lib/sticker-data";
import { t, type Locale } from "@/lib/i18n";

type CollectionByStickerId = Record<string, number>;

export type ExportKind = "missing" | "duplicates" | "both";

const exportOptions: Record<
  ExportKind,
  {
    labelKey: "export.kind.missing" | "export.kind.duplicates" | "export.kind.both";
    fileName: string;
    shareTitleKey:
      | "export.shareTitle.missing"
      | "export.shareTitle.duplicates"
      | "export.shareTitle.both";
  }
> = {
  missing: {
    labelKey: "export.kind.missing",
    fileName: "stickeros-missing-list.txt",
    shareTitleKey: "export.shareTitle.missing",
  },
  duplicates: {
    labelKey: "export.kind.duplicates",
    fileName: "stickeros-duplicate-list.txt",
    shareTitleKey: "export.shareTitle.duplicates",
  },
  both: {
    labelKey: "export.kind.both",
    fileName: "stickeros-collection-list.txt",
    shareTitleKey: "export.shareTitle.both",
  },
};

export const stickerExportOptions = (
  Object.entries(exportOptions) as [
    ExportKind,
    (typeof exportOptions)[ExportKind],
  ][]
).map(([id, option]) => ({ id, ...option }));

export function getExportMeta(kind: ExportKind, locale: Locale) {
  const option = exportOptions[kind];

  return {
    fileName: option.fileName,
    label: t(locale, option.labelKey),
    shareTitle: t(locale, option.shareTitleKey),
  };
}

export function buildMissingTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  return buildTxtExport(locale, collectionName, [
    {
      title: t(locale, "export.txt.missingSection"),
      rows: buildMissingRows(collectionByStickerId, locale),
    },
  ]);
}

export function buildDuplicatesTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  return buildTxtExport(locale, collectionName, [
    {
      title: t(locale, "export.txt.duplicatesSection"),
      rows: buildDuplicateRows(collectionByStickerId, locale),
    },
  ]);
}

export function buildCombinedTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  return buildTxtExport(locale, collectionName, [
    {
      title: t(locale, "export.txt.missingSection"),
      rows: buildMissingRows(collectionByStickerId, locale),
    },
    {
      title: t(locale, "export.txt.duplicatesSection"),
      rows: buildDuplicateRows(collectionByStickerId, locale),
    },
  ]);
}

export function buildTxtExportByKind(
  kind: ExportKind,
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  if (kind === "duplicates") {
    return buildDuplicatesTxtExport(collectionName, collectionByStickerId, locale);
  }

  if (kind === "both") {
    return buildCombinedTxtExport(collectionName, collectionByStickerId, locale);
  }

  return buildMissingTxtExport(collectionName, collectionByStickerId, locale);
}

function buildTxtExport(
  locale: Locale,
  collectionName: string,
  sections: { title: string; rows: string[] }[],
) {
  const lines = [t(locale, "export.txt.documentTitle"), collectionName, ""];

  sections.forEach((section, index) => {
    if (index > 0) lines.push("");
    lines.push(section.title, "", ...section.rows);
  });

  return lines.join("\n");
}

function buildMissingRows(
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  return stickerGroups
    .map((group) => {
      const missing = stickers
        .filter(
          (sticker) =>
            sticker.groupId === group.id &&
            getStickerCopies(collectionByStickerId, sticker.id) === 0,
        )
        .map((sticker) => sticker.number);

      if (missing.length === 0) return null;
      return `${getStickerExportLabel(group, locale)}: ${missing.join(", ")}`;
    })
    .filter((row): row is string => Boolean(row));
}

function buildDuplicateRows(
  collectionByStickerId: CollectionByStickerId,
  locale: Locale,
) {
  return stickerGroups
    .map((group) => {
      const duplicates = stickers
        .filter((sticker) => sticker.groupId === group.id)
        .map((sticker) => {
          const duplicateCopies =
            getStickerCopies(collectionByStickerId, sticker.id) - 1;

          if (duplicateCopies <= 0) return null;
          return `${sticker.number} x${duplicateCopies}`;
        })
        .filter((item): item is string => Boolean(item));

      if (duplicates.length === 0) return null;
      return `${getStickerExportLabel(group, locale)}: ${duplicates.join(", ")}`;
    })
    .filter((row): row is string => Boolean(row));
}
