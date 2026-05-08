// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddStickersCaptureOptions } from "./add-stickers-capture-options";

afterEach(() => {
  cleanup();
});

describe("AddStickersCaptureOptions", () => {
  it("shows review-pending action when pending stickers exist", () => {
    render(
      <AddStickersCaptureOptions
        loading={false}
        pendingCount={3}
        onReviewPending={vi.fn()}
        onSubmitAudio={vi.fn()}
        onSubmitPhoto={vi.fn()}
        onSubmitText={vi.fn()}
        onSubmitVoiceTranscript={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    expect(screen.getByRole("button", { name: "Review pending (3)" })).toBeTruthy();
  });

  it("asks to review pending items before manual submit starts a new capture", async () => {
    const user = userEvent.setup();
    const onReviewPending = vi.fn();
    const onSubmitText = vi.fn();

    render(
      <AddStickersCaptureOptions
        loading={false}
        pendingCount={2}
        onReviewPending={onReviewPending}
        onSubmitAudio={vi.fn()}
        onSubmitPhoto={vi.fn()}
        onSubmitText={onSubmitText}
        onSubmitVoiceTranscript={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    const input = screen.getByLabelText("Or type them manually");
    fireEvent.change(input, { target: { value: "MEX 13" } });
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]!);

    expect(screen.getByText("Pending stickers need review")).toBeTruthy();
    expect(onSubmitText).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Review pending" }));
    expect(onReviewPending).toHaveBeenCalledTimes(1);
    expect(onSubmitText).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: "Add" })[0]!);
    await user.click(screen.getByRole("button", { name: "Start new capture" }));
    expect(onSubmitText).toHaveBeenCalledWith("MEX 13");
  });
});
