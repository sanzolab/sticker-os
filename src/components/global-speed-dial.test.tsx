// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GlobalSpeedDial } from "./global-speed-dial";
import { useAssistantStore } from "@/lib/assistant-store";

beforeEach(() => {
  useAssistantStore.setState({
    activeMode: "closed",
    addStickersOpen: false,
    queuedPhotoCapture: null,
  });
});

afterEach(() => {
  cleanup();
});

describe("GlobalSpeedDial", () => {
  it("keeps collapsed actions hidden while main activator stays interactive", () => {
    const { container } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={0} />,
    );

    const dial = container.querySelector(".speed-dial-container") as HTMLDivElement;
    const actions = container.querySelector(".speed-dial-actions") as HTMLDivElement;
    const fab = screen.getByRole("button", { name: "Open actions" });
    const voiceButton = container.querySelector(
      'button[aria-label="Voice assistant"]',
    ) as HTMLButtonElement;
    const cameraButton = container.querySelector(
      'button[aria-label="Add stickers via camera"]',
    ) as HTMLButtonElement;

    expect(dial.style.pointerEvents).toBe("auto");
    expect(actions.getAttribute("aria-hidden")).toBe("true");
    expect(actions.className).not.toContain("is-open");
    expect(fab.className).toContain("is-interactive");
    expect(voiceButton.className).toContain("closed");
    expect(cameraButton.className).toContain("closed");
    expect(voiceButton).toHaveProperty("tabIndex", -1);
    expect(cameraButton).toHaveProperty("tabIndex", -1);
  });

  it("secondary actions are interactive only while expanded and reset when closed", async () => {
    const user = userEvent.setup();
    const { container } = render(<GlobalSpeedDial isHidden={false} />);

    const actions = container.querySelector(".speed-dial-actions") as HTMLDivElement;
    const openFab = screen.getByRole("button", { name: "Open actions" });

    await user.click(openFab);

    const closeFab = screen.getByRole("button", { name: "Close actions" });
    const voiceButton = screen.getByRole("button", { name: "Voice assistant" });
    const cameraButton = screen.getByRole("button", {
      name: "Add stickers via camera",
    });

    expect(closeFab.className).toContain("is-interactive");
    expect(actions.getAttribute("aria-hidden")).toBeNull();
    expect(actions.className).toContain("is-open");
    expect(voiceButton.className).toContain("is-open");
    expect(cameraButton.className).toContain("is-open");
    expect(voiceButton).toHaveProperty("tabIndex", 0);
    expect(cameraButton).toHaveProperty("tabIndex", 0);

    await user.click(closeFab);

    const reopenedFab = screen.getByRole("button", { name: "Open actions" });
    expect(reopenedFab.className).toContain("is-interactive");
    expect(actions.getAttribute("aria-hidden")).toBe("true");
    expect(actions.className).not.toContain("is-open");
    expect(voiceButton.className).toContain("closed");
    expect(cameraButton.className).toContain("closed");
    expect(voiceButton).toHaveProperty("tabIndex", -1);
    expect(cameraButton).toHaveProperty("tabIndex", -1);
  });

  it("promotes to full visibility when opened from partially revealed state", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={0.5} />,
    );

    const dial = container.querySelector(".speed-dial-container") as HTMLDivElement;
    expect(dial.style.opacity).toBe("0.5");
    expect(dial.style.transform).toBe("translate3d(0, 8px, 0) scale(0.98)");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(screen.getByRole("button", { name: "Close actions" })).toBeTruthy();
    expect(dial.style.opacity).toBe("1");
    expect(dial.style.transform).toBe("translate3d(0, 0px, 0) scale(1)");

    rerender(<GlobalSpeedDial isHidden={false} hiddenProgress={1} />);
    expect(dial.style.opacity).toBe("1");
    expect(dial.style.transform).toBe("translate3d(0, 0px, 0) scale(1)");
    expect(dial.className).not.toContain("is-hidden");
  });

  it("closes and disables actions immediately when explicitly hidden", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={0} />,
    );

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    expect(screen.getByRole("button", { name: "Close actions" })).toBeTruthy();

    rerender(<GlobalSpeedDial isHidden hiddenProgress={0} />);

    const dial = container.querySelector(".speed-dial-container") as HTMLDivElement;
    const actions = container.querySelector(".speed-dial-actions") as HTMLDivElement;
    const fab = screen.getByRole("button", { name: "Open actions" });
    const voiceButton = container.querySelector(
      'button[aria-label="Voice assistant"]',
    ) as HTMLButtonElement;
    const cameraButton = container.querySelector(
      'button[aria-label="Add stickers via camera"]',
    ) as HTMLButtonElement;

    expect(dial.className).toContain("is-hidden");
    expect(dial.style.pointerEvents).toBe("none");
    expect(actions.getAttribute("aria-hidden")).toBe("true");
    expect(actions.className).not.toContain("is-open");
    expect(fab.className).not.toContain("is-interactive");
    expect(voiceButton).toHaveProperty("tabIndex", -1);
    expect(cameraButton).toHaveProperty("tabIndex", -1);
  });

  it("launches photo mode from camera action", async () => {
    const user = userEvent.setup();

    render(<GlobalSpeedDial isHidden={false} />);

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(screen.getByRole("button", { name: "Add stickers via camera" }));

    expect(useAssistantStore.getState().activeMode).toBe("photo");
  });

  it("launches voice mode from voice action", async () => {
    const user = userEvent.setup();

    render(<GlobalSpeedDial isHidden={false} />);

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(screen.getByRole("button", { name: "Voice assistant" }));

    expect(useAssistantStore.getState().activeMode).toBe("voice");
  });
});
