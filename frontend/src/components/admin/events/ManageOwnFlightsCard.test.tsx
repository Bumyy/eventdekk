import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageOwnFlightsCard } from "./ManageOwnFlightsCard";

vi.mock("@/components/events/SubEventFlightForm", () => ({
  SubEventFlightForm: () => (
    <div data-testid="sub-event-flight-form">Flight Form</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/admin/events/EditEventContext", () => ({
  useEditEventContext: () => ({
    showManageOwnFlightsDialog: true,
    setShowManageOwnFlightsDialog: vi.fn(),
    eventSubEvents: [
      {
        subEventId: BigInt(1),
        eventId: BigInt(10),
        name: "Group Flight 1",
        description: "A test flight",
        subEventType: { tag: "GroupFlight" },
        scheduledStartTime: { toDate: () => new Date("2026-01-01T10:00:00Z") },
        scheduledEndTime: { toDate: () => new Date("2026-01-01T12:00:00Z") },
        hubIcao: "EGLL",
        groupFlightDepartureIcao: "KJFK",
        groupFlightArrivalIcao: "KLAX",
        groupFlightRoute: "KJFK DCT KLAX",
        notes: null,
        eventLead: null,
      },
    ],
    selectedOwnSubEvents: [],
    ownFlightDetails: {},
    isSubmittingFlights: false,
    userTimezone: "UTC",
    memberOptions: [],
    selectedOwnGroupLeadHex: "none",
    setSelectedOwnGroupLeadHex: vi.fn(),
    handleToggleOwnSubEvent: vi.fn(),
    updateOwnFlightDetail: vi.fn(),
    handleSubmitOwnFlights: vi.fn(),
  }),
}));

vi.mock("@/components/AircraftLiveryPicker", () => ({
  AircraftLiveryPicker: () => (
    <div data-testid="aircraft-picker">Aircraft Picker</div>
  ),
}));

describe("ManageOwnFlightsCard", () => {
  it("renders the card title", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Manage Own Flights")).toBeInTheDocument();
  });

  it("renders sign up button", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Sign Up for Flights")).toBeInTheDocument();
  });

  it("renders event lead selector label", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Group Event Lead (Optional)")).toBeInTheDocument();
  });

  it("renders sub-event name in dialog", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Group Flight 1")).toBeInTheDocument();
  });

  it("renders sub-event type badge element", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Group Flight")).toBeInTheDocument();
  });

  it("shows info message when no sub-events are selected", () => {
    render(<ManageOwnFlightsCard />);
    expect(
      screen.getByText("Select at least one sub-event to participate in.")
    ).toBeInTheDocument();
  });

  it("renders cancel and save buttons in dialog", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save Flight Details")).toBeInTheDocument();
  });

  it("disables save button when no sub-events selected", () => {
    render(<ManageOwnFlightsCard />);
    expect(screen.getByText("Save Flight Details")).toBeDisabled();
  });

  it("renders description text", () => {
    render(<ManageOwnFlightsCard />);
    expect(
      screen.getByText(/Select which sub-events your group will participate in/)
    ).toBeInTheDocument();
  });
});
