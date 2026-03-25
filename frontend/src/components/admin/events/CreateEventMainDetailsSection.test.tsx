import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEventMainDetailsSection } from "./CreateEventMainDetailsSection";
import { CreateEventProvider, CreateEventContextValue } from "./CreateEventContext";

vi.mock("@/components/ui/datetime-picker", () => ({
  DateTimePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const makeValue = (): CreateEventContextValue => ({
  name: "Event A",
  description: "Desc",
  startDateTime: new Date("2026-01-01T10:00:00Z"),
  endDateTime: new Date("2026-01-01T12:00:00Z"),
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
});

describe("CreateEventMainDetailsSection", () => {
  it("updates text fields via context setters", () => {
    const value = makeValue();
    render(
      <CreateEventProvider value={value}>
        <CreateEventMainDetailsSection />
      </CreateEventProvider>
    );

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "New Event" },
    });
    expect(value.setName).toHaveBeenCalledWith("New Event");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "New description" },
    });
    expect(value.setDescription).toHaveBeenCalledWith("New description");
  });

  it("toggles internal event via context setter", () => {
    const value = makeValue();
    render(
      <CreateEventProvider value={value}>
        <CreateEventMainDetailsSection />
      </CreateEventProvider>
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(value.setIsInternal).toHaveBeenCalled();
  });
});
