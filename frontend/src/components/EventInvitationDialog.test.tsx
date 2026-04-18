import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventInvitationDialog } from "./EventInvitationDialog";

vi.mock("@/components/events/SubEventFlightForm", () => ({
  SubEventFlightForm: () => <div data-testid="sub-event-flight-form">Flight Form</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/hooks/spacetimeHooks", () => ({
  useGroupLeadMembersForGroup: () => [],
}));

vi.mock("date-fns", () => ({
  format: (date: Date, fmt: string) => {
    if (fmt === "PPP") return "Jan 1, 2026";
    if (fmt === "p") return "10:00 AM";
    return date.toISOString();
  },
}));

const mockSubEvent = {
  subEventId: BigInt(1),
  eventId: BigInt(10),
  name: "Test Sub-Event",
  description: "A test sub-event",
  subEventType: { tag: "GroupFlight" },
  scheduledStartTime: { toDate: () => new Date("2026-01-01T10:00:00Z") },
  scheduledEndTime: { toDate: () => new Date("2026-01-01T12:00:00Z") },
  hubIcao: "EGLL",
  groupFlightDepartureIcao: "KJFK",
  groupFlightArrivalIcao: "KLAX",
  groupFlightRoute: "KJFK DCT KLAX",
  notes: null,
  eventLead: null,
};

describe("EventInvitationDialog", () => {
  const defaultInvitation = {
    eventId: BigInt(10),
    groupId: BigInt(1),
    participationId: BigInt(1),
    role: { tag: "Participant" },
    status: { tag: "Pending" },
  };

  it("renders dialog title for new invitation", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Respond to Event Invitation")).toBeInTheDocument();
  });

  it("renders dialog title for managing existing participation", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        preSelectedSubEvents={[BigInt(1)]}
      />
    );
    expect(screen.getByText("Manage Event Participation")).toBeInTheDocument();
  });

  it("renders sub-event name", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Test Sub-Event")).toBeInTheDocument();
  });

  it("renders accept and decline buttons", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Accept & Submit")).toBeInTheDocument();
    expect(screen.getByText("Decline Invitation")).toBeInTheDocument();
  });

  it("disables accept button when no sub-events are selected", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Accept & Submit")).toBeDisabled();
  });

  it("renders Event Invitation description", () => {
    render(
      <EventInvitationDialog
        open={true}
        onOpenChange={vi.fn()}
        invitation={defaultInvitation}
        events={[{ eventId: BigInt(10), name: "Test Event" } as any]}
        subEvents={[mockSubEvent]}
        groupId={BigInt(1)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });
});