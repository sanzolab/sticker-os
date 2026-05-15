"use client";

const TRUSTED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const IMAGE_LIKE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "avif",
  "gif",
  "bmp",
  "tif",
  "tiff",
]);

const MIME_EXTENSIONS: Record<string, Set<string>> = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
};

const MAX_UPLOAD_IMAGE_SIDE = 2048;
const JPEG_QUALITY = 0.92;

export class ImageUploadPreparationError extends Error {
  code: "IMAGE_UPLOAD_PREPARATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "ImageUploadPreparationError";
    this.code = "IMAGE_UPLOAD_PREPARATION_FAILED";
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (isTrustedUploadImage(file)) {
    return file;
  }

  if (!isLikelyImageFile(file)) {
    throw new ImageUploadPreparationError("The selected file is not a supported image.");
  }

  try {
    return await convertImageToJpeg(file);
  } catch {
    throw new ImageUploadPreparationError(
      "This photo format could not be prepared on this device.",
    );
  }
}

function isTrustedUploadImage(file: File) {
  const mimeType = normalizeMimeType(file.type);
  if (!TRUSTED_UPLOAD_MIME_TYPES.has(mimeType)) return false;

  const extension = getFileExtension(file.name);
  if (!extension) return true;

  const allowedExtensions = MIME_EXTENSIONS[mimeType];
  return Boolean(allowedExtensions?.has(extension));
}

function isLikelyImageFile(file: File) {
  const mimeType = normalizeMimeType(file.type);
  if (mimeType.startsWith("image/")) return true;
  if (mimeType === "application/octet-stream" || mimeType === "") {
    const extension = getFileExtension(file.name);
    return extension ? IMAGE_LIKE_EXTENSIONS.has(extension) : false;
  }
  return false;
}

function normalizeMimeType(value: string) {
  return value.toLowerCase().split(";")[0]?.trim() ?? "";
}

function getFileExtension(name: string) {
  const normalized = name.toLowerCase().trim();
  const idx = normalized.lastIndexOf(".");
  if (idx < 0 || idx === normalized.length - 1) return "";
  return normalized.slice(idx + 1);
}

async function convertImageToJpeg(file: File) {
  const decoded = await decodeImage(file);
  const { width, height } = scaleDimensions(decoded.width, decoded.height, MAX_UPLOAD_IMAGE_SIDE);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }

    context.drawImage(decoded.source, 0, 0, width, height);
    const blob = await canvasToJpegBlob(canvas);

    return new File([blob], withJpgExtension(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}

function scaleDimensions(width: number, height: number, maxSide: number) {
  if (width <= 0 || height <= 0) {
    throw new Error("Decoded image has invalid dimensions.");
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) {
    return { width, height };
  }

  const scale = maxSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function withJpgExtension(name: string) {
  const normalized = name.trim();
  if (!normalized) return "photo.jpg";

  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0) return `${normalized}.jpg`;
  return `${normalized.slice(0, dotIndex)}.jpg`;
}

async function decodeImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // Fallback to HTMLImageElement decode.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image decode failed."));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      cleanup: () => {
        URL.revokeObjectURL(objectUrl);
        image.src = "";
      },
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    image.src = "";
    throw error;
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas export failed."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
