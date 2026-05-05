"use client";

import * as React from "react";
import { ImageUp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScannerStatus = "loading" | "ready" | "error";

export function TradeScanner({
  onScan,
}: {
  onScan: (value: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const scannerRef = React.useRef<import("qr-scanner").default | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const scannedRef = React.useRef(false);
  const [status, setStatus] = React.useState<ScannerStatus>("loading");
  const [message, setMessage] = React.useState("Preparing camera...");

  React.useEffect(() => {
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
          setMessage("Point the camera at a StickerOS trade QR.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Camera access is unavailable. Upload a QR image instead.");
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
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
      setMessage("No readable StickerOS QR was found in that image.");
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
              Preparing camera
            </span>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{message}</p>

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
        Upload QR Image
      </Button>
    </div>
  );
}
