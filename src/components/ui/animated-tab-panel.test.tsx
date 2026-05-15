/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedTabPanel } from "./animated-tab-panel";

describe("AnimatedTabPanel", () => {
  it("keeps active panels without accidental vertical scroll container styles", () => {
    render(
      <AnimatedTabPanel active index={0} tabCount={4}>
        <div>content</div>
      </AnimatedTabPanel>,
    );

    const panel = screen.getByText("content").closest("section");
    expect(panel).not.toBeNull();
    expect(panel?.style.overflow).toBe("");
    expect(panel?.style.overflowX).toBe("");
    expect(panel?.style.overflowY).toBe("");
    expect(panel?.getAttribute("aria-hidden")).toBeNull();
  });

  it("collapses inactive panels while preserving flex width and hidden accessibility state", () => {
    render(
      <AnimatedTabPanel active={false} index={1} tabCount={4}>
        <div>hidden-content</div>
      </AnimatedTabPanel>,
    );

    const panel = screen.getByText("hidden-content").closest("section");
    expect(panel).not.toBeNull();
    expect(panel?.style.height).toBe("0px");
    expect(panel?.style.overflow).toBe("hidden");
    expect(panel?.style.visibility).toBe("hidden");
    expect(panel?.style.flex).toContain("0 0");
    expect(panel?.style.flex).toContain("25%");
    expect(panel?.style.minWidth).toBe("0");
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(panel?.getAttribute("inert")).toBe("");
  });
});
