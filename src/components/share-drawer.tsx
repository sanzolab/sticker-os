"use client";

import { Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { OptionGroup } from "@/components/ui/option-group";
import { buildTxtExportByKind, getExportMeta, stickerExportOptions, type ExportKind } from "@/lib/export";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { copyText, downloadText } from "./export-actions";

export function ShareDrawer({
  open,
  onOpenChange,
  collectionName,
  collectionByStickerId,
  onShareStateChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  collectionByStickerId: Record<string, number>;
  onShareStateChange: (state: "idle" | "copied" | "downloaded") => void;
}) {
  const [exportKind, setExportKind] = useState<ExportKind>("missing");
  const locale = useStickerStore((state) => state.settings.locale);

  const getExportText = () =>
    buildTxtExportByKind(
      exportKind,
      collectionName,
      collectionByStickerId,
      locale,
    );
  const exportMeta = getExportMeta(exportKind, locale);

  const announceShareState = (state: "copied" | "downloaded") => {
    onShareStateChange(state);
    window.setTimeout(() => onShareStateChange("idle"), 1400);
  };

  const shareExport = async () => {
    const exportText = getExportText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: exportMeta.shareTitle,
          text: exportText,
        });
        onOpenChange(false);
        return;
      } catch {
        // Fall back to local export actions.
      }
    }

    const copied = await copyText(exportText);
    if (copied) {
      announceShareState("copied");
    } else {
      downloadText(exportMeta.fileName, exportText);
      announceShareState("downloaded");
    }
    onOpenChange(false);
  };

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange}>
      <div className="space-y-5">
        <div>
          <DrawerTitle className="text-lg font-semibold">
            {t(locale, "share.title")}
          </DrawerTitle>
          <DrawerDescription className="mt-1 text-sm text-muted-foreground">
            {t(locale, "share.description")}
          </DrawerDescription>
        </div>

        <OptionGroup
          options={stickerExportOptions.map((option) => ({
            value: option.id,
            label: t(locale, option.labelKey),
          }))}
          value={exportKind}
          onChange={setExportKind}
          columns={3}
          buttonClassName="min-h-11 rounded-sm border px-2 text-sm font-medium transition-colors"
        />

        <div className="grid grid-cols-3 gap-2">
          <Button
            size="pill"
            className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
            onClick={shareExport}
          >
            <Share2 className="size-4" />
            {t(locale, "share.action.share")}
          </Button>
          <Button
            variant="secondary"
            size="pill"
            className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
            onClick={async () => {
              const exportText = getExportText();
              const copied = await copyText(exportText);
              if (copied) {
                announceShareState("copied");
              } else {
                downloadText(exportMeta.fileName, exportText);
                announceShareState("downloaded");
              }
            }}
          >
            <Copy className="size-4" />
            {t(locale, "share.action.copyTxt")}
          </Button>
          <Button
            variant="secondary"
            size="pill"
            className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
            onClick={() => {
              downloadText(exportMeta.fileName, getExportText());
              announceShareState("downloaded");
            }}
          >
            <Download className="size-4" />
            {t(locale, "share.action.downloadTxt")}
          </Button>
        </div>
      </div>
    </AppDrawer>
  );
}
