"use client";

import {
  getPageScrollVisibilityTracker,
  type ScrollDirection,
} from "./scroll-visibility";

export type SectionPhase = "placeholder" | "hidden" | "visible";

type PhaseChangeCallback = (
  phase: SectionPhase,
  opts?: { skipEnter?: boolean },
) => void;

type SectionRegistration = {
  id: string;
  getElement: () => HTMLElement | null;
  setPhase: PhaseChangeCallback;
};

const NEAR_MARGIN_DOWN = "200px 0px 1200px 0px";
const NEAR_MARGIN_UP = "1200px 0px 200px 0px";
const NEAR_MARGIN_IDLE = "600px 0px 600px 0px";
const VISIBLE_MARGIN = "100px 0px 100px 0px";
const UNMOUNT_DELAY_MS = 400;

function resolveNearMargin(direction: ScrollDirection): string {
  if (direction === "down") return NEAR_MARGIN_DOWN;
  if (direction === "up") return NEAR_MARGIN_UP;
  return NEAR_MARGIN_IDLE;
}

function getNearEdgePixels(direction: ScrollDirection): {
  top: number;
  bottom: number;
} {
  if (direction === "down") return { top: 200, bottom: 1200 };
  if (direction === "up") return { top: 1200, bottom: 200 };
  return { top: 600, bottom: 600 };
}

export class SectionLifecycleRegistry {
  private sections = new Map<string, SectionRegistration>();
  private heights = new Map<string, number>();
  private collapsed = new Map<string, boolean>();
  private phases = new Map<string, SectionPhase>();
  private unmountTimers = new Map<string, number>();
  private observerNear: IntersectionObserver | null = null;
  private observerVisible: IntersectionObserver | null = null;
  private trackerUnsub: (() => void) | null = null;
  private currentDirection: ScrollDirection = "idle";

  constructor() {
    if (typeof window === "undefined") return;
    this.trackerUnsub = getPageScrollVisibilityTracker().subscribe(() => {
      this.handleDirectionChange();
    });
    this.rebuildObservers();
  }

  /** @internal Test-only teardown. */
  __resetForTests(): void {
    this.sections.clear();
    this.heights.clear();
    this.collapsed.clear();
    this.phases.clear();
    this.unmountTimers.forEach((t) => window.clearTimeout(t));
    this.unmountTimers.clear();
    this.observerNear?.disconnect();
    this.observerVisible?.disconnect();
    this.observerNear = null;
    this.observerVisible = null;
    this.trackerUnsub?.();
    this.trackerUnsub = null;
    this.currentDirection = "idle";
  }

  private handleDirectionChange() {
    const tracker = getPageScrollVisibilityTracker();
    const snapshot = tracker.getSnapshot();
    if (snapshot.direction === this.currentDirection) return;
    this.currentDirection = snapshot.direction;
    this.rebuildObservers();
  }

  private rebuildObservers() {
    if (typeof window === "undefined") return;

    this.observerNear?.disconnect();
    this.observerVisible?.disconnect();
    this.observerNear = null;
    this.observerVisible = null;

    if (typeof IntersectionObserver === "undefined") {
      for (const [id] of this.sections) {
        this.setPhase(id, "visible", { skipEnter: true });
      }
      return;
    }

    this.observerNear = new IntersectionObserver(
      (entries) => this.handleNearEntries(entries),
      { rootMargin: resolveNearMargin(this.currentDirection) },
    );

    this.observerVisible = new IntersectionObserver(
      (entries) => this.handleVisibleEntries(entries),
      { rootMargin: VISIBLE_MARGIN },
    );

    for (const reg of this.sections.values()) {
      const el = reg.getElement();
      if (el) {
        this.observerNear.observe(el);
        this.observerVisible.observe(el);
      }
    }
  }

  private handleNearEntries(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.sectionId;
      if (!id) continue;
      const reg = this.sections.get(id);
      if (!reg) continue;

      if (entry.isIntersecting) {
        this.clearUnmountTimer(id);
        const currentPhase = this.phases.get(id) ?? "placeholder";
        if (currentPhase === "placeholder") {
          this.setPhase(id, "hidden");
        }
      } else {
        this.scheduleUnmount(id);
      }
    }
  }

  private handleVisibleEntries(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.sectionId;
      if (!id) continue;
      const reg = this.sections.get(id);
      if (!reg) continue;

      if (entry.isIntersecting) {
        this.clearUnmountTimer(id);
        const currentPhase = this.phases.get(id) ?? "placeholder";
        if (currentPhase === "placeholder") {
          this.setPhase(id, "visible", { skipEnter: true });
        } else if (currentPhase === "hidden") {
          this.setPhase(id, "visible");
        }
      } else {
        const currentPhase = this.phases.get(id) ?? "placeholder";
        if (currentPhase === "visible") {
          this.setPhase(id, "hidden");
        }
      }
    }
  }

  private setPhase(
    id: string,
    phase: SectionPhase,
    opts?: { skipEnter?: boolean },
  ) {
    const current = this.phases.get(id);
    if (current === phase) return;
    this.phases.set(id, phase);
    const reg = this.sections.get(id);
    reg?.setPhase(phase, opts);
  }

  private scheduleUnmount(id: string) {
    this.clearUnmountTimer(id);
    const timer = window.setTimeout(() => {
      this.unmountTimers.delete(id);
      const currentPhase = this.phases.get(id);
      if (currentPhase === "hidden") {
        this.setPhase(id, "placeholder");
      }
    }, UNMOUNT_DELAY_MS);
    this.unmountTimers.set(id, timer);
  }

  private clearUnmountTimer(id: string) {
    const timer = this.unmountTimers.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.unmountTimers.delete(id);
    }
  }

  register(
    id: string,
    getElement: () => HTMLElement | null,
    setPhase: PhaseChangeCallback,
  ): () => void {
    const reg: SectionRegistration = { id, getElement, setPhase };
    this.sections.set(id, reg);

    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      this.phases.set(id, "visible");
      setPhase("visible", { skipEnter: true });
      return () => this.unregister(id);
    }

    const el = getElement();
    if (el) {
      const { phase, skipEnter } = this.computeInitialPhase(el);
      this.phases.set(id, phase);
      setPhase(phase, { skipEnter });

      this.observerNear?.observe(el);
      this.observerVisible?.observe(el);
    } else {
      this.phases.set(id, "placeholder");
      setPhase("placeholder");
    }

    return () => this.unregister(id);
  }

  private unregister(id: string) {
    const reg = this.sections.get(id);
    if (reg) {
      const el = reg.getElement();
      if (el) {
        this.observerNear?.unobserve(el);
        this.observerVisible?.unobserve(el);
      }
    }
    this.sections.delete(id);
    this.clearUnmountTimer(id);
    this.phases.delete(id);
    // Heights and collapsed state intentionally preserved for remounts
  }

  private computeInitialPhase(element: HTMLElement): {
    phase: SectionPhase;
    skipEnter: boolean;
  } {
    if (typeof window === "undefined") {
      return { phase: "visible", skipEnter: true };
    }

    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight;
    const { top: nearTop, bottom: nearBottom } = getNearEdgePixels(
      this.currentDirection,
    );

    const inViewport = rect.top < vh + 100 && rect.bottom > -100;
    const inNear = rect.top < vh + nearBottom && rect.bottom > -nearTop;

    if (inViewport) return { phase: "visible", skipEnter: true };
    if (inNear) return { phase: "hidden", skipEnter: false };
    return { phase: "placeholder", skipEnter: false };
  }

  setHeight(id: string, height: number) {
    this.heights.set(id, height);
  }

  getHeight(id: string): number | undefined {
    return this.heights.get(id);
  }

  setCollapsed(id: string, collapsed: boolean) {
    this.collapsed.set(id, collapsed);
  }

  getCollapsed(id: string): boolean {
    return this.collapsed.get(id) ?? true;
  }
}

let instance: SectionLifecycleRegistry | null = null;

export function getSectionLifecycleRegistry(): SectionLifecycleRegistry {
  if (!instance) {
    instance = new SectionLifecycleRegistry();
  }
  return instance;
}
