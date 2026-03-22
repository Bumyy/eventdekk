import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEventSubEventCard } from "./CreateEventSubEventCard";
import { CreateEventProvider, CreateEventContextValue } from "./CreateEventContext";

vi.mock("./SubEventDialogForm", () => ({
  SubEventDialogForm: () => <div>SubEventDialogForm</div>,
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
      name: "Alpha Flight",
      description: "Alpha desc",
      scheduledStartTime: new Date("2026-01-01T10:00:00Z"),
      scheduledEndTime: new Date("2026-01-01T12:00:00Z"),
      groupFlightDepartureIcao: "KJFK",
      groupFlightArrivalIcao: "KLAX",
      eventLeadHex: "none",
    },
  ],
  expandedSubEvents: [],
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
  toDialogSubEventFormState: vi.fn(() => ({
    name: "Alpha Flight",
    description: "Alpha desc",
    type: "GroupFlight",
    startTime: new Date("2026-01-01T10:00:00Z"),
    endTime: new Date("2026-01-01T12:00:00Z"),
    hubIcao: "",
    departureIcao: "KJFK",
    arrivalIcao: "KLAX",
    route: "",
    notes: "",
    eventLeadHex: "none",
  })),
  fromDialogSubEventFormState: vi.fn(),
  updateSubEventFromDialog: vi.fn(),
  handleSubmit: vi.fn(async () => {}),
  onOpenChange: vi.fn(),
  ...overrides,
});

describe("CreateEventSubEventCard", () => {
  it("renders collapsed preview and route info", () => {
    const value = makeValue();
    render(
      <CreateEventProvider value={value}>
        <CreateEventSubEventCard index={0} />
      </CreateEventProvider>
    );

    expect(screen.getByText("Alpha Flight")).toBeInTheDocument();
    expect(screen.getByText("KJFK -> KLAX")).toBeInTheDocument();
  });

  it("calls toggle and remove handlers", () => {
    const value = makeValue();
    const { container } = render(
      <CreateEventProvider value={value}>
        <CreateEventSubEventCard index={0} />
      </CreateEventProvider>
    );

    const iconButtons = container.querySelectorAll("button[data-size='icon']");
    fireEvent.click(iconButtons[0]);
    fireEvent.click(iconButtons[1]);

    expect(value.toggleSubEventExpansion).toHaveBeenCalledWith(0);
    expect(value.handleRemoveSubEvent).toHaveBeenCalledWith(0);
  });

  it("renders form when expanded", () => {
    const value = makeValue({ expandedSubEvents: [0] });
    render(
      <CreateEventProvider value={value}>
        <CreateEventSubEventCard index={0} />
      </CreateEventProvider>
    );

    expect(screen.getByText("SubEventDialogForm")).toBeInTheDocument();
  });
});
