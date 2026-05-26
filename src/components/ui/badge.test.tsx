// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./badge";

afterEach(() => {
  cleanup();
});

describe("Badge", () => {
  it("keeps secondary badges visible with a border and readable text", () => {
    const { container } = render(<Badge variant="secondary">Sticker</Badge>);
    const badge = container.firstElementChild;

    expect(badge?.className).toContain("border-border/70");
    expect(badge?.className).toContain("bg-secondary");
    expect(badge?.className).toContain("text-secondary-foreground");
  });

  it("supports semantic review and status variants", () => {
    const { container } = render(
      <div>
        <Badge variant="success">95%</Badge>
        <Badge variant="warning">Needs review</Badge>
        <Badge variant="pending">Pending</Badge>
        <Badge variant="muted">Snapshot</Badge>
      </div>,
    );

    expect(container.querySelector("[class*='text-emerald-700']")).toBeTruthy();
    expect(container.querySelector("[class*='text-amber-800']")).toBeTruthy();
    expect(container.querySelector("[class*='text-sky-700']")).toBeTruthy();
    expect(container.querySelector("[class*='text-muted-foreground']")).toBeTruthy();
  });
});
