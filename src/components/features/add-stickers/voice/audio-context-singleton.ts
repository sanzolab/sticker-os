let singletonContext: AudioContext | null = null;
let contextRefCount = 0;

export function getAudioContext(): AudioContext {
  if (!singletonContext || singletonContext.state === "closed") {
    singletonContext = new AudioContext();
    contextRefCount = 0;
  }
  contextRefCount += 1;
  return singletonContext;
}

export async function resumeAudioContext(): Promise<void> {
  if (singletonContext && singletonContext.state === "suspended") {
    await singletonContext.resume();
  }
}

export async function suspendAudioContext(): Promise<void> {
  contextRefCount = Math.max(0, contextRefCount - 1);

  if (contextRefCount <= 0 && singletonContext && singletonContext.state !== "closed") {
    await singletonContext.suspend();
  }
}

export async function closeAudioContext(): Promise<void> {
  contextRefCount = 0;
  if (singletonContext && singletonContext.state !== "closed") {
    await singletonContext.close().catch(() => undefined);
  }
  singletonContext = null;
}

export function getAudioContextState(): string | null {
  return singletonContext?.state ?? null;
}
