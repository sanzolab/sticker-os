import type { AddStickersResult } from "./add-stickers-types";

const addStickersRequestTimeoutMs = 20000;

export async function fetchWithAddStickersTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, addStickersRequestTimeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function isAddStickersTimeoutError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError";
}

export function isFailedAnalysisResult(result: AddStickersResult) {
  return result.meta?.timeout === true ||
    result.meta?.status === "timeout" ||
    result.meta?.status === "error";
}

export function isEmptyAnalysisResult(result: AddStickersResult) {
  const hasAlbumAnalysis = result.methodology === "missing_only_complement";

  return result.candidates.length === 0 &&
    result.unresolved.length === 0 &&
    !hasAlbumAnalysis &&
    (result.meta?.status === "empty" || result.meta?.status === undefined);
}
