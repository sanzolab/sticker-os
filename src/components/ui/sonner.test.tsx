// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "./sonner";

const sonnerMock = vi.fn((props: ComponentProps<"div">) => {
  void props;
  return null;
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: ComponentProps<"div">) => sonnerMock(props),
}));

describe("Toaster", () => {
  beforeEach(() => {
    sonnerMock.mockClear();
  });

  it("enables native four-way swipe dismissal while preserving default styling props", () => {
    render(<Toaster />);

    expect(sonnerMock).toHaveBeenCalledTimes(1);
    expect(sonnerMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        theme: "dark",
        position: "bottom-center",
        swipeDirections: ["top", "right", "bottom", "left"],
        closeButton: true,
        richColors: true,
        toastOptions: {
          classNames: {
            toast: "rounded-sm border bg-card text-card-foreground shadow-lg",
            description: "text-muted-foreground",
            actionButton:
              "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
            cancelButton:
              "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
          },
        },
      }),
    );
  });

  it("still forwards explicit caller overrides", () => {
    render(<Toaster position="top-right" richColors={false} />);

    expect(sonnerMock.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        position: "top-right",
        richColors: false,
        swipeDirections: ["top", "right", "bottom", "left"],
      }),
    );
  });
});
