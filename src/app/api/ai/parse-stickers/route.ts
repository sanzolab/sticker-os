import { NextResponse } from "next/server";
import {
  AiParseError,
  parseStickersFromInput,
  type AiProviderName,
  type ParseStickersInput,
} from "@/lib/ai";

export const runtime = "nodejs";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioMimeTypes = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
]);

export async function POST(request: Request) {
  try {
    const input = await readParseInput(request);
    const result = await parseStickersFromInput(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AiParseError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "AI_PROVIDER_ERROR",
        message: "Sticker analysis failed.",
      },
      { status: 500 },
    );
  }
}

async function readParseInput(request: Request): Promise<ParseStickersInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      type?: string;
      text?: string;
      source?: string;
      provider?: string;
    };

    if (body.type !== "text") {
      throw new AiParseError(
        "AI_UNSUPPORTED_INPUT_TYPE",
        "JSON requests must use type=text.",
      );
    }

    return {
      type: "text",
      text: body.text ?? "",
      source: readTextSource(body.source),
      provider: readProvider(body.provider),
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const type = String(formData.get("type") ?? "");
    const provider = readProvider(String(formData.get("provider") ?? ""));
    const file = formData.get("file");

    if (type !== "image" && type !== "audio") {
      throw new AiParseError(
        "AI_UNSUPPORTED_INPUT_TYPE",
        "Multipart requests must use type=image or type=audio.",
      );
    }

    if (!(file instanceof File)) {
      throw new AiParseError("AI_EMPTY_INPUT", "Upload a file to analyze.");
    }

    const normalizedMimeType = validateFile(type, file);

    return {
      type,
      provider,
      file: {
        data: await file.arrayBuffer(),
        mimeType: normalizedMimeType,
        name: file.name,
      },
    };
  }

  throw new AiParseError(
    "AI_UNSUPPORTED_INPUT_TYPE",
    "Request must be JSON or multipart/form-data.",
  );
}

function validateFile(type: "image" | "audio", file: File) {
  const maxMb = type === "image" ? getNumberEnv("AI_MAX_IMAGE_MB", 5) : getNumberEnv("AI_MAX_AUDIO_MB", 10);
  const allowedMimeTypes = type === "image" ? imageMimeTypes : audioMimeTypes;
  const mimeType = type === "audio" ? normalizeAudioMimeType(file.type) : file.type;

  if (file.size === 0) {
    throw new AiParseError("AI_EMPTY_INPUT", "Upload a non-empty file.");
  }

  if (file.size > maxMb * 1024 * 1024) {
    throw new AiParseError(
      "AI_FILE_TOO_LARGE",
      `${type === "image" ? "Image" : "Audio"} files must be ${maxMb}MB or smaller.`,
    );
  }

  if (!allowedMimeTypes.has(mimeType)) {
    throw new AiParseError(
      "AI_UNSUPPORTED_MIME_TYPE",
      `${file.type || "This file type"} is not supported.`,
    );
  }

  return mimeType;
}

function readProvider(provider?: string): AiProviderName | undefined {
  if (provider === "gemini" || provider === "openai") return provider;
  return undefined;
}

function readTextSource(source?: string): "manual" | "voice-transcript" | undefined {
  if (source === "manual" || source === "voice-transcript") return source;
  return undefined;
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeAudioMimeType(value: string) {
  const normalized = value.toLowerCase();
  const container = normalized.split(";")[0]?.trim() ?? normalized;

  if (container.includes("webm")) return "audio/webm";
  if (container.includes("ogg")) return "audio/ogg";
  if (container.includes("mp4") || container.includes("m4a")) return "audio/mp4";
  if (container.includes("mpeg") || container.includes("mp3")) return "audio/mpeg";
  if (container.includes("wav")) return "audio/wav";
  if (container === "audio/x-m4a") return "audio/x-m4a";

  return container;
}
