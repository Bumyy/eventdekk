import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEventProvider, CreateEventContextValue } from "./CreateEventContext";
import { CreateEventSubEventsSection } from "./CreateEventSubEventsSection";

vi.mock("./CreateEventSubEventCard", () => ({
  CreateEventSubEventCard: ({ index }: { index: number }) => <div>Sub Event Card {index}</div>,
}));

vi.mock("./SubEventDialogForm", () => ({
  SubEventDialogForm: () => <div>Default Wave Form</div>,
}));

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
  subEvents: [
    {
      subEventType: { tag: "GroupFlight" },
      name: "Default Wave",
      description: "",
      scheduledStartTime: new Date("2026-01-01T10:00:00Z"),
      scheduledEndTime: new Date("2026-01-01T12:00:00Z"),
      eventLeadHex: "none",
    },
  ],
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

describe("CreateEventSubEventsSection", () => {
  it("shows single-wave form in simple mode", () => {
    const value = makeValue();
    render(
      <CreateEventProvider value={value}>
        <CreateEventSubEventsSection />
      </CreateEventProvider>
    );

    expect(screen.getByText("Default Wave Form")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Another Wave" }));
    expect(value.handleAddSubEvent).toHaveBeenCalled();
  });

  it("renders sub-event cards in advanced mode", () => {
    const value = makeValue({
      isAdvancedSubEventsMode: true,
      subEvents: [
        {
          subEventType: { tag: "GroupFlight" },
          name: "Wave 1",
          description: "",
          scheduledStartTime: new Date("2026-01-01T10:00:00Z"),
          scheduledEndTime: new Date("2026-01-01T12:00:00Z"),
          eventLeadHex: "none",
        },
        {
          subEventType: { tag: "FlyIn" },
          name: "Wave 2",
          description: "",
          scheduledStartTime: new Date("2026-01-01T13:00:00Z"),
          scheduledEndTime: new Date("2026-01-01T15:00:00Z"),
          eventLeadHex: "none",
        },
      ],
    });

    render(
      <CreateEventProvider value={value}>
        <CreateEventSubEventsSection />
      </CreateEventProvider>
    );

    expect(screen.getByText("Waves")).toBeInTheDocument();
    expect(screen.getByText("Sub Event Card 0")).toBeInTheDocument();
    expect(screen.getByText("Sub Event Card 1")).toBeInTheDocument();
  });
});
