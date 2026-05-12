/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedTabPanel } from "./animated-tab-panel";

describe("AnimatedTabPanel", () => {
  it("does not set overflow styles that create an accidental vertical scroll container", () => {
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
  });
});
