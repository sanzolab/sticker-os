// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ImageUploadPreparationError,
  prepareImageForUpload,
} from "@/lib/image-upload";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("prepareImageForUpload", () => {
  it("passes through trusted JPEG files unchanged", async () => {
    const file = new File(["jpeg"], "capture.jpg", { type: "image/jpeg" });

    const prepared = await prepareImageForUpload(file);

    expect(prepared).toBe(file);
  });

  it("converts trusted JPEG files when forced for camera captures", async () => {
    const { canvasMock, close } = mockCanvasJpegConversion({
      width: 1200,
      height: 900,
    });

    const file = new File(["jpeg"], "camera.jpg", { type: "image/jpeg" });
    const prepared = await prepareImageForUpload(file, { forceNormalize: true });

    expect(prepared).not.toBe(file);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("camera.jpg");
    expect(canvasMock.width).toBe(1200);
    expect(canvasMock.height).toBe(900);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("converts large trusted JPEG files before upload", async () => {
    const { canvasMock } = mockCanvasJpegConversion({
      width: 4000,
      height: 3000,
    });

    const file = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    const prepared = await prepareImageForUpload(file);

    expect(prepared).not.toBe(file);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("large.jpg");
    expect(canvasMock.width).toBe(2048);
    expect(canvasMock.height).toBe(1536);
  });

  it("converts ambiguous image uploads to JPEG and downscales large dimensions", async () => {
    const { canvasMock, drawImage, close } = mockCanvasJpegConversion({
      width: 4000,
      height: 3000,
    });

    const file = new File(["image"], "mobile-capture.heic", {
      type: "application/octet-stream",
    });
    const prepared = await prepareImageForUpload(file);

    expect(prepared).not.toBe(file);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("mobile-capture.jpg");
    expect(canvasMock.width).toBe(2048);
    expect(canvasMock.height).toBe(1536);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("attempts conversion for unknown mobile uploads without MIME type or extension", async () => {
    mockCanvasJpegConversion({
      width: 1000,
      height: 800,
    });

    const file = new File(["image"], "camera", { type: "" });
    const prepared = await prepareImageForUpload(file);

    expect(prepared).not.toBe(file);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("camera.jpg");
  });

  it("throws a typed error for files that are clearly not images", async () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    await expect(prepareImageForUpload(file)).rejects.toBeInstanceOf(
      ImageUploadPreparationError,
    );
  });

  it("revokes object URLs when fallback decode fails", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("no bitmap")));
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    class FailingImage {
      decoding = "";
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 0;
      naturalHeight = 0;
      width = 0;
      height = 0;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }

    vi.stubGlobal("Image", FailingImage as unknown as typeof Image);

    const file = new File(["image"], "capture.heic", { type: "image/heic" });

    await expect(prepareImageForUpload(file)).rejects.toBeInstanceOf(
      ImageUploadPreparationError,
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });
});

function mockCanvasJpegConversion({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
    width,
    height,
    close,
  }));

  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
    expect(type).toBe("image/jpeg");
    expect(quality).toBe(0.92);
    callback(new Blob(["converted"], { type: "image/jpeg" }));
  });

  const canvasMock = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({ drawImage }),
    toBlob,
  } as unknown as HTMLCanvasElement;

  const originalCreateElement = document.createElement.bind(document);
  const createElementSpy = vi.spyOn(document, "createElement");
  createElementSpy.mockImplementation((tagName: string) => {
    if (tagName === "canvas") {
      return canvasMock;
    }
    return originalCreateElement(tagName);
  });

  return {
    canvasMock,
    close,
    drawImage,
  };
}
