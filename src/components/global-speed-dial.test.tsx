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
