"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

type ScannerStatus = "loading" | "ready" | "error";
type ScannerMessageKey =
  | "scanner.message.preparing"
  | "scanner.message.ready"
  | "scanner.message.cameraUnavailable"
  | "scanner.message.noQrFound";

export function TradeScanner({
  onScan,
}: {
  onScan: (value: string) => void | Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("loading");
  const [messageKey, setMessageKey] =
    useState<ScannerMessageKey>("scanner.message.preparing");
  const locale = useStickerStore((state) => state.settings.locale);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const QrScanner = (await import("qr-scanner")).default;

        if (cancelled || !videoRef.current) return;

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScan(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          },
        );

        scannerRef.current = scanner;
        await scanner.start();

        if (!cancelled) {
          setStatus("ready");
          setMessageKey("scanner.message.ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessageKey("scanner.message.cameraUnavailable");
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scannedRef.current = false;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [onScan]);

  const scanImage = async (file: File) => {
    try {
      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      onScan(result.data);
    } catch {
      setStatus("error");
      setMessageKey("scanner.message.noQrFound");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-sm border bg-background">
        <video
          ref={videoRef}
          className="size-full object-cover"
          muted
          playsInline
        />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ScanLine className="size-4" />
              {t(locale, "scanner.overlay.preparing")}
            </span>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {t(locale, messageKey)}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void scanImage(file);
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="pill"
        className="w-full shadow-none"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageUp className="size-4" />
        {t(locale, "scanner.upload")}
      </Button>
    </div>
  );
}
