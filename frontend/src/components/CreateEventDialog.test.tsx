import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CreateEventDialog } from "./CreateEventDialog";

const mockUploadImage = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/api/apiService", () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/hooks/spacetimeHooks", () => ({
  useGroupLeadMembersForGroup: () => [],
}));

vi.mock("@/utils/timezoneUtils", async () => {
  const actual = await vi.importActual("@/utils/timezoneUtils");
  return {
    ...actual,
    useUserTimezone: () => "UTC",
  };
});

vi.mock("@/components/ui/datetime-picker", () => ({
  DateTimePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("CreateEventDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits event data and closes dialog", async () => {
    const onSubmit = vi.fn(async () => {});
    const onOpenChange = vi.fn();

    render(
      <CreateEventDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        groupId={1n}
        prefillStartTime={new Date("2026-01-01T10:00:00Z")}
        prefillEndTime={new Date("2026-01-01T12:00:00Z")}
      />
    );

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Test Event" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.name).toBe("Test Event");
    expect(payload.description).toBe("Test Description");
    expect(payload.startTime).toEqual(new Date("2026-01-01T10:00:00Z"));
    expect(payload.endTime).toEqual(new Date("2026-01-01T12:00:00Z"));
    expect(payload.subEvents).toHaveLength(1);
    expect(payload.subEvents[0].name).toBe("Test Event");
    expect(payload.subEvents[0].description).toBe("Test Description");
    expect(payload.subEvents[0].subEventType).toEqual({ tag: "GroupFlight" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uploads banner before submit when file is selected", async () => {
    mockUploadImage.mockResolvedValue("https://cdn.example/banner.png");
    const onSubmit = vi.fn(async () => {});

    render(
      <CreateEventDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        groupId={1n}
        prefillStartTime={new Date("2026-01-01T10:00:00Z")}
        prefillEndTime={new Date("2026-01-01T12:00:00Z")}
      />
    );

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Banner Event" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Description" },
    });

    const file = new File(["img"], "banner.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload New Banner"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(mockUploadImage).toHaveBeenCalledTimes(1));
    expect(mockUploadImage).toHaveBeenCalledWith(file, "Banner Event");
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Banner image uploaded successfully!"
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].bannerUrl).toBe(
      "https://cdn.example/banner.png"
    );
  });

  it("shows upload error and does not submit on upload failure", async () => {
    mockUploadImage.mockRejectedValue(new Error("Upload failed"));
    const onSubmit = vi.fn(async () => {});

    render(
      <CreateEventDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        groupId={1n}
        prefillStartTime={new Date("2026-01-01T10:00:00Z")}
        prefillEndTime={new Date("2026-01-01T12:00:00Z")}
      />
    );

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Fail Event" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Description" },
    });

    const file = new File(["img"], "banner.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload New Banner"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockToastError).toHaveBeenCalledWith(
      "Image upload failed: Upload failed"
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
