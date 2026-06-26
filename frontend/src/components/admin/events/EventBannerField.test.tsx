import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventBannerField } from "./EventBannerField";

describe("EventBannerField", () => {
  it("renders from explicit props and calls handlers", () => {
    const onFileChange = vi.fn();
    const onBannerUrlChange = vi.fn();
    const onClear = vi.fn();

    render(
      <EventBannerField
        previewUrl="https://example.com/banner.png"
        bannerUrl=""
        selectedFile={null}
        isUploading={false}
        isLoading={false}
        onFileChange={onFileChange}
        onBannerUrlChange={onBannerUrlChange}
        onClear={onClear}
      />
    );

    const fileInput = screen.getByLabelText(
      "Upload New Banner"
    ) as HTMLInputElement;
    const file = new File(["data"], "banner.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button"));
    expect(onClear).toHaveBeenCalled();

    const urlInput = screen.getByLabelText("Or Enter Image URL Directly");
    fireEvent.change(urlInput, {
      target: { value: "https://new-url.com/x.png" },
    });
    expect(onBannerUrlChange).toHaveBeenCalledWith("https://new-url.com/x.png");
  });

  it("disables URL input when a file is selected", () => {
    render(
      <EventBannerField
        previewUrl={null}
        bannerUrl="https://example.com/banner.png"
        selectedFile={null}
        isUploading={false}
        isLoading={true}
        onFileChange={vi.fn()}
        onBannerUrlChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Or Enter Image URL Directly")).toBeDisabled();
  });

  it("throws when handlers are missing and no context exists", () => {
    expect(() => render(<EventBannerField />)).toThrow(
      "EventBannerField requires either EditEventProvider context or explicit handler props"
    );
  });
});
