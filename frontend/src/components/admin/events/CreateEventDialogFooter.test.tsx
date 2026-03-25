import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEventDialogFooter } from "./CreateEventDialogFooter";
import { CreateEventProvider, CreateEventContextValue } from "./CreateEventContext";

const makeValue = (
  overrides: Partial<CreateEventContextValue> = {}
): CreateEventContextValue => ({
  name: "",
  description: "",
  startDateTime: undefined,
  endDateTime: undefined,
  isInternal: false,
  ifcEventLink: "",
  bannerUrl: "",
  selectedFile: null,
  previewUrl: null,
  isUploading: false,
  isCreating: false,
  subEvents: [],
  expandedSubEvents: [],
  isAdvancedSubEventsMode: false,
  userTimezone: "UTC",
  memberOptions: [],
  setName: vi.fn(),
  setDescription: vi.fn(),
  setStartDateTime: vi.fn(),
  setEndDateTime: vi.fn(),
  setIsInternal: vi.fn(),
  setIfcEventLink: vi.fn(),
  setBannerUrl: vi.fn(),
  handleFileChange: vi.fn(),
  clearBanner: vi.fn(),
  handleAddSubEvent: vi.fn(),
  handleRemoveSubEvent: vi.fn(),
  handleSetSubEventType: vi.fn(),
  toggleSubEventExpansion: vi.fn(),
  toDialogSubEventFormState: vi.fn(),
  fromDialogSubEventFormState: vi.fn(),
  updateSubEventFromDialog: vi.fn(),
  handleSubmit: vi.fn(async () => {}),
  onOpenChange: vi.fn(),
  ...overrides,
});

describe("CreateEventDialogFooter", () => {
  it("calls onOpenChange(false) when cancel clicked", () => {
    const value = makeValue();
    render(
      <CreateEventProvider value={value}>
        <CreateEventDialogFooter />
      </CreateEventProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(value.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows creating label and disables buttons", () => {
    const value = makeValue({ isCreating: true });
    render(
      <CreateEventProvider value={value}>
        <CreateEventDialogFooter />
      </CreateEventProvider>
    );

    expect(screen.getByRole("button", { name: /Creating.../i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
