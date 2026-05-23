"use client";

import { Copy, Download, Link2, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  createShareLink,
  type ShareLinkResult,
} from "@/lib/share-album";
import { useStickerStore } from "@/lib/store";
import { copyText, downloadText } from "./export-actions";

const SHARE_LINK_BUILD_TIMEOUT_MS = 15000;

type ShareLinkState =
  | "idle"
  | "preparingSilent"
  | "uploading"
  | "ready"
  | "empty"
  | "error";

type ShareLinkBuildResult =
  | { state: "ready"; url: string; newRemoteId?: string; newRemoteSecret?: string }
  | { state: "empty" }
  | { state: "error" };

export function ShareDrawer({
  open,
  onOpenChange,
  collectionName,
  collectionByStickerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  collectionByStickerId: Record<string, number>;
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
  const localShareId = useStickerStore((state) => state.localShareId);
  const localShareSecret = useStickerStore((state) => state.localShareSecret);
  const setLocalShareId = useStickerStore((state) => state.setLocalShareId);

  const getExportText = () =>
    buildTxtExportByKind(
      exportKind,
      collectionName,
      collectionByStickerId,
      locale,
    );
  const exportMeta = getExportMeta(exportKind, locale);

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
      toast.success(t(locale, "toast.common.copiedSuccess"));
    } else {
      const downloaded = downloadText(exportMeta.fileName, exportText);
      if (downloaded) {
        toast.success(t(locale, "toast.common.txtDownloaded"), {
          description: t(locale, "toast.common.txtDownloadedDescription"),
        });
      } else {
        toast.error(t(locale, "toast.common.downloadFailed"));
      }
    }
    onOpenChange(false);
  };

  const buildShareLink = useCallback(async (): Promise<ShareLinkBuildResult> => {
    try {
      const result: ShareLinkResult = await withTimeout(
        createShareLink({
          collectionByStickerId,
          senderName: collectionName,
          localShareId,
          localShareSecret,
        }),
        SHARE_LINK_BUILD_TIMEOUT_MS,
      );

      if (!result.ok) {
        return { state: result.reason === "empty" ? "empty" : "error" };
      }

      return {
        state: "ready",
        url: result.url,
        newRemoteId: result.kind === "remote" ? result.id : undefined,
        newRemoteSecret: result.kind === "remote" ? result.secret : undefined,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("shareAlbumLink failed:", error);
      }
      return { state: "error" };
    }
  }, [collectionByStickerId, collectionName, localShareId, localShareSecret]);

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
        if (result.newRemoteId && result.newRemoteSecret) {
          setLocalShareId(result.newRemoteId, result.newRemoteSecret);
        }
        setAlbumShareUrl(result.url);
        setLinkState("ready");
        return;
      }

      if (result.state === "empty") {
        setLinkState("empty");
        return;
      }

      // Silent preparation failures do not show errors immediately.
      setLinkState("idle");
    });

    return () => {
      canceled = true;
    };
    // setLocalShareId is a Zustand store action — stable reference, safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.success(t(locale, "toast.common.copiedSuccess"));
        onOpenChange(false);
        return;
      }

      setManualCopyVisible(true);
    },
    [locale, onOpenChange],
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

    if (linkState === "empty") return;

    setLinkState("uploading");

    const pendingBackgroundResult = backgroundBuildPromiseRef.current
      ? await backgroundBuildPromiseRef.current
      : null;

    const result =
      pendingBackgroundResult ??
      (backgroundBuildResultRef.current?.state === "ready"
        ? backgroundBuildResultRef.current
        : await buildShareLink());

    backgroundBuildResultRef.current = result;
    backgroundBuildPromiseRef.current = null;

    if (result.state === "ready") {
      if (result.newRemoteId && result.newRemoteSecret) {
        setLocalShareId(result.newRemoteId, result.newRemoteSecret);
      }
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
                toast.success(t(locale, "toast.common.copiedSuccess"));
              } else {
                toast.error(t(locale, "toast.common.copyFailed"));
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
              const downloaded = downloadText(exportMeta.fileName, getExportText());
              if (downloaded) {
                toast.success(t(locale, "toast.common.txtDownloaded"), {
                  description: t(locale, "toast.common.txtDownloadedDescription"),
                });
                return;
              }
              toast.error(t(locale, "toast.common.downloadFailed"));
            }}
          >
            <Download className="size-4" />
            {t(locale, "share.action.downloadTxt")}
          </Button>
        </div>

        {linkState === "empty" ? (
          <p className="rounded-sm border border-muted-foreground/20 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
            {t(locale, "share.link.emptyAlbum")}
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
          disabled={linkState === "uploading" || linkState === "empty"}
        >
          {linkState === "uploading" ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t(locale, "share.link.uploading")}
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
                if (!copied) {
                  toast.error(t(locale, "toast.common.copyFailed"));
                  return;
                }
                toast.success(t(locale, "toast.common.copiedSuccess"));
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
