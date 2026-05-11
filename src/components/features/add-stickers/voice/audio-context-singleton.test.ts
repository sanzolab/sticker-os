import { describe, expect, it, beforeEach, vi } from "vitest";

class MockAudioContext {
  _state: "running" | "suspended" | "closed" = "running";
  get state() { return this._state; }
  async resume() { if (this._state === "suspended") this._state = "running"; }
  async suspend() { if (this._state === "running") this._state = "suspended"; }
  async close() { this._state = "closed"; }
}

vi.stubGlobal("AudioContext", MockAudioContext);

import {
  getAudioContext,
  resumeAudioContext,
  suspendAudioContext,
  closeAudioContext,
  getAudioContextState,
} from "./audio-context-singleton";

describe("audio-context-singleton", () => {
  beforeEach(async () => {
    await closeAudioContext();
  });

  it("creates a single AudioContext instance", () => {
    const ctx1 = getAudioContext();
    const ctx2 = getAudioContext();
    expect(ctx1).toBe(ctx2);
  });

  it("returns running state initially", () => {
    const ctx = getAudioContext();
    expect(ctx.state).toBe("running");
  });

  it("suspends after suspendAudioContext with ref count 0", async () => {
    getAudioContext();
    await suspendAudioContext();
    expect(getAudioContextState()).toBe("suspended");
  });

  it("keeps context running when ref count > 0", async () => {
    getAudioContext();
    getAudioContext();
    await suspendAudioContext();
    expect(getAudioContextState()).toBe("running");
    await suspendAudioContext();
    expect(getAudioContextState()).toBe("suspended");
  });

  it("resumes a suspended context", async () => {
    getAudioContext();
    await suspendAudioContext();
    expect(getAudioContextState()).toBe("suspended");
    await resumeAudioContext();
    expect(getAudioContextState()).toBe("running");
  });

  it("closes context and returns null state", async () => {
    getAudioContext();
    await closeAudioContext();
    expect(getAudioContextState()).toBeNull();
  });

  it("creates a new context after close", async () => {
    const ctx1 = getAudioContext();
    await closeAudioContext();
    const ctx2 = getAudioContext();
    expect(ctx2).not.toBe(ctx1);
  });

  it("handles multiple close calls gracefully", async () => {
    getAudioContext();
    await closeAudioContext();
    await closeAudioContext();
    expect(getAudioContextState()).toBeNull();
  });

  it("only suspends when ref count reaches zero after nested gets", async () => {
    getAudioContext(); // ref count = 1
    getAudioContext(); // ref count = 2
    getAudioContext(); // ref count = 3

    await suspendAudioContext(); // ref count = 2, should NOT suspend
    expect(getAudioContextState()).toBe("running");

    await suspendAudioContext(); // ref count = 1, should NOT suspend
    expect(getAudioContextState()).toBe("running");

    await suspendAudioContext(); // ref count = 0, should suspend
    expect(getAudioContextState()).toBe("suspended");
  });

  it("survives rapid start/stop without leaking or crashing", async () => {
    for (let i = 0; i < 5; i++) {
      getAudioContext();
      getAudioContext();
      await resumeAudioContext();
      expect(getAudioContextState()).toBe("running");
      await suspendAudioContext();
      await suspendAudioContext();
    }
    expect(getAudioContextState()).toBe("suspended");
    await closeAudioContext();
    expect(getAudioContextState()).toBeNull();
  });

  it("ref count does not drop below zero", async () => {
    getAudioContext();
    await suspendAudioContext(); // count 1 -> 0, suspends
    await suspendAudioContext(); // count 0 -> 0 (clamped), stays suspended
    expect(getAudioContextState()).toBe("suspended");
  });

  it("creates new context after close and ref count resets", async () => {
    getAudioContext();
    getAudioContext();
    await closeAudioContext();

    const ctx = getAudioContext();
    expect(ctx.state).toBe("running");

    await suspendAudioContext();
    expect(getAudioContextState()).toBe("suspended");
  });
});
