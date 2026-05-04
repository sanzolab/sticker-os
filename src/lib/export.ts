"use client";

import {
  getStickerCopies,
  stickerGroups,
  stickers,
} from "@/lib/sticker-data";

type CollectionByStickerId = Record<string, number>;

export type ExportKind = "missing" | "duplicates" | "both";

const exportOptions: Record<
  ExportKind,
  { label: string; fileName: string; shareTitle: string }
> = {
  missing: {
    label: "Missing Stickers",
    fileName: "stickeros-missing-list.txt",
    shareTitle: "StickerOS missing list",
  },
  duplicates: {
    label: "Duplicate Stickers",
    fileName: "stickeros-duplicate-list.txt",
    shareTitle: "StickerOS duplicate list",
  },
  both: {
    label: "Both",
    fileName: "stickeros-collection-list.txt",
    shareTitle: "StickerOS collection list",
  },
};

export const stickerExportOptions = (
  Object.entries(exportOptions) as [ExportKind, (typeof exportOptions)[ExportKind]][]
).map(([id, option]) => ({ id, ...option }));

export function getExportMeta(kind: ExportKind) {
  return exportOptions[kind];
}

export function buildMissingTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
) {
  return buildTxtExport(collectionName, [
    {
      title: "Me faltan:",
      rows: buildMissingRows(collectionByStickerId),
    },
  ]);
}

export function buildDuplicatesTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
) {
  return buildTxtExport(collectionName, [
    {
      title: "Tengo repetidas:",
      rows: buildDuplicateRows(collectionByStickerId),
    },
  ]);
}

export function buildCombinedTxtExport(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
) {
  return buildTxtExport(collectionName, [
    {
      title: "Me faltan:",
      rows: buildMissingRows(collectionByStickerId),
    },
    {
      title: "Tengo repetidas:",
      rows: buildDuplicateRows(collectionByStickerId),
    },
  ]);
}

export function buildTxtExportByKind(
  kind: ExportKind,
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
) {
  if (kind === "duplicates") {
    return buildDuplicatesTxtExport(collectionName, collectionByStickerId);
  }

  if (kind === "both") {
    return buildCombinedTxtExport(collectionName, collectionByStickerId);
  }

  return buildMissingTxtExport(collectionName, collectionByStickerId);
}

function buildTxtExport(
  collectionName: string,
  sections: { title: string; rows: string[] }[],
) {
  const lines = ["Figuritas App - Lista", collectionName, ""];

  sections.forEach((section, index) => {
    if (index > 0) lines.push("");
    lines.push(section.title, "", ...section.rows);
  });

  return lines.join("\n");
}

function buildMissingRows(collectionByStickerId: CollectionByStickerId) {
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
      return `${group.exportLabel}: ${missing.join(", ")}`;
    })
    .filter((row): row is string => Boolean(row));
}

function buildDuplicateRows(collectionByStickerId: CollectionByStickerId) {
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
      return `${group.exportLabel}: ${duplicates.join(", ")}`;
    })
    .filter((row): row is string => Boolean(row));
}
