"use client";

import { Copy, Download, Link2, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { OptionGroup } from "@/components/ui/option-group";
import {
  buildTxtExportByKind,
  getExportMeta,
  stickerExportOptions,
  type ExportKind,
} from "@/lib/export";
import { t } from "@/lib/i18n";
import {
  MAX_SHARED_ALBUM_URL_LENGTH,
  buildSharedAlbumLinkData,
} from "@/lib/shared-album-link";
import { useStickerStore } from "@/lib/store";
import { copyText, downloadText } from "./export-actions";

const SHARE_LINK_BUILD_TIMEOUT_MS = 1500;

type ShareLinkState =
  | "idle"
  | "preparingSilent"
  | "buildingVisible"
  | "ready"
  | "too-large"
  | "error";

type ShareLinkBuildResult =
  | { state: "ready"; url: string }
  | { state: "too-large" }
  | { state: "error" };

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
  const [linkState, setLinkState] = useState<ShareLinkState>("idle");
  const [albumShareUrl, setAlbumShareUrl] = useState("");
  const [manualCopyVisible, setManualCopyVisible] = useState(false);
  const backgroundRequestIdRef = useRef(0);
  const backgroundBuildPromiseRef = useRef<Promise<ShareLinkBuildResult> | null>(
    null,
  );
  const backgroundBuildResultRef = useRef<ShareLinkBuildResult | null>(null);
  const locale = useStickerStore((state) => state.settings.locale);

  const getExportText = () =>
    buildTxtExportByKind(
      exportKind,
      collectionName,
      collectionByStickerId,
      locale,
    );
  const exportMeta = getExportMeta(exportKind, locale);

  const announceShareState = useCallback((state: "copied" | "downloaded") => {
    onShareStateChange(state);
    window.setTimeout(() => onShareStateChange("idle"), 1400);
  }, [onShareStateChange]);

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

  const buildShareLink = useCallback(async (): Promise<ShareLinkBuildResult> => {
    try {
      const data = await withTimeout(
        buildSharedAlbumLinkData({
          collectionByStickerId,
          senderName: collectionName,
        }),
        SHARE_LINK_BUILD_TIMEOUT_MS,
      );

      const url = `${window.location.origin}/shared-album?data=${encodeURIComponent(data)}`;
      if (url.length > MAX_SHARED_ALBUM_URL_LENGTH) {
        return { state: "too-large" };
      }

      return { state: "ready", url };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("buildShareLink failed:", error);
      }
      return { state: "error" };
    }
  }, [collectionByStickerId, collectionName]);

  useEffect(() => {
    if (!open) {
      const requestId = ++backgroundRequestIdRef.current;
      queueMicrotask(() => {
        if (backgroundRequestIdRef.current !== requestId) return;
        setManualCopyVisible(false);
        setLinkState("idle");
        setAlbumShareUrl("");
      });
      return;
    }

    let canceled = false;
    const requestId = ++backgroundRequestIdRef.current;

    queueMicrotask(() => {
      if (canceled || backgroundRequestIdRef.current !== requestId) return;
      setManualCopyVisible(false);
      setLinkState("preparingSilent");
      setAlbumShareUrl("");
    });
    backgroundBuildResultRef.current = null;

    const backgroundPromise = buildShareLink();
    backgroundBuildPromiseRef.current = backgroundPromise;

    void backgroundPromise.then((result) => {
      if (canceled || backgroundRequestIdRef.current !== requestId) return;

      backgroundBuildResultRef.current = result;
      backgroundBuildPromiseRef.current = null;

      if (result.state === "ready") {
        setAlbumShareUrl(result.url);
        setLinkState("ready");
        return;
      }

      // Silent preparation failures do not show errors immediately.
      setLinkState("idle");
    });

    return () => {
      canceled = true;
    };
  }, [buildShareLink, open]);

  const shareOrCopyUrl = useCallback(
    async (url: string) => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: t(locale, "share.link.title"),
            text: t(locale, "share.link.description"),
            url,
          });
          onOpenChange(false);
          return;
        } catch {
          // Fall through to clipboard/manual copy.
        }
      }

      const copied = await copyText(url);
      if (copied) {
        announceShareState("copied");
        onOpenChange(false);
        return;
      }

      setManualCopyVisible(true);
    },
    [announceShareState, locale, onOpenChange],
  );

  const shareAlbumLink = async () => {
    setManualCopyVisible(false);

    if (linkState === "ready" && albumShareUrl) {
      try {
        await shareOrCopyUrl(albumShareUrl);
      } catch {
        setManualCopyVisible(true);
      }
      return;
    }

    const cachedResult = backgroundBuildResultRef.current;
    if (cachedResult?.state === "too-large") {
      setAlbumShareUrl("");
      setLinkState("too-large");
      return;
    }

    setLinkState("buildingVisible");

    const pendingBackgroundResult = backgroundBuildPromiseRef.current
      ? await backgroundBuildPromiseRef.current
      : null;

    const result =
      pendingBackgroundResult ??
      (cachedResult?.state === "ready" ? cachedResult : await buildShareLink());

    backgroundBuildResultRef.current = result;
    backgroundBuildPromiseRef.current = null;

    if (result.state === "ready") {
      setAlbumShareUrl(result.url);
      setLinkState("ready");
      try {
        await shareOrCopyUrl(result.url);
      } catch {
        setManualCopyVisible(true);
      }
      return;
    }

    setAlbumShareUrl("");
    setLinkState(result.state);
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

        {linkState === "too-large" ? (
          <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {t(locale, "share.link.errorTooLong")}
          </p>
        ) : null}

        {linkState === "error" ? (
          <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {t(locale, "share.link.errorGeneric")}
          </p>
        ) : null}

        <Button
          variant="secondary"
          size="pill"
          className="w-full shadow-none"
          onClick={() => void shareAlbumLink()}
          disabled={linkState === "buildingVisible"}
        >
          {linkState === "buildingVisible" ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t(locale, "share.link.preparing")}
            </>
          ) : (
            <>
              <Link2 className="size-4" />
              {t(locale, "share.action.shareAlbumLink")}
            </>
          )}
        </Button>

        {manualCopyVisible ? (
          <div className="space-y-2 rounded-sm border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {t(locale, "share.link.manualCopyHint")}
            </p>
            <Input
              value={albumShareUrl}
              readOnly
              aria-label={t(locale, "share.link.manualCopyFieldAria")}
            />
            <Button
              variant="secondary"
              size="pill"
              className="w-full shadow-none"
              onClick={async () => {
                const copied = await copyText(albumShareUrl);
                if (!copied) return;
                announceShareState("copied");
                onOpenChange(false);
              }}
            >
              <Copy className="size-4" />
              {t(locale, "share.link.manualCopyAction")}
            </Button>
          </div>
        ) : null}
      </div>
    </AppDrawer>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
