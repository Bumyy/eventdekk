import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubEventDetails } from "./SubEventDetails";
import { SubEvent, Group, FlightSignup } from "@/module_bindings";

describe("SubEventDetails", () => {
  const mockSubEvent: SubEvent = {
    subEventId: BigInt(1),
    eventId: BigInt(1),
    name: "Test Flight",
    description: "This is a test flight description",
    subEventType: { tag: "GroupFlight" },
    scheduledStartTime: { toDate: () => new Date("2026-03-22T10:00:00Z") },
    scheduledEndTime: { toDate: () => new Date("2026-03-22T12:00:00Z") },
    hubIcao: null,
    groupFlightDepartureIcao: "KJFK",
    groupFlightArrivalIcao: "KLAX",
    groupFlightRoute: null,
    notes: null,
    eventLead: null,
  };

  const mockGroups: Group[] = [
    {
      groupId: BigInt(1),
      name: "Alpha Group",
      tag: "ALP",
      description: "Test group",
      ceoIdentity: "identity1" as unknown as ArrayBuffer,
      ifvarbApproved: true,
      websiteUrl: null,
      logoUrl: "https://example.com/logo.png",
      rating: null,
      color: null,
      createdAt: { toDate: () => new Date() },
    },
  ];

  const mockSignups: FlightSignup[] = [
    {
      signupId: BigInt(1),
      subEventId: BigInt(1),
      groupId: BigInt(1),
      departureIcao: "KJFK",
      arrivalIcao: "KLAX",
      routeDetails: null,
      callsign: "ALP123",
      aircraftType: "B737",
      desiredDepartureTime: null,
      desiredArrivalTime: null,
      createdAt: { toDate: () => new Date() },
    },
  ];

  it("renders sub-event name and description", () => {
    render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText("Test Flight")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test flight description")
    ).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText(/Sunday/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("renders GroupFlight badge", () => {
    render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText("Group Flight")).toBeInTheDocument();
  });

  it("renders FlyIn badge for FlyIn type", () => {
    const flyInSubEvent = {
      ...mockSubEvent,
      subEventType: { tag: "FlyIn" } as const,
      hubIcao: "KLAX",
      groupFlightDepartureIcao: null,
      groupFlightArrivalIcao: null,
    };

    render(
      <SubEventDetails
        subEvent={flyInSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText("Fly-in")).toBeInTheDocument();
  });

  it("renders FlyOut badge for FlyOut type", () => {
    const flyOutSubEvent = {
      ...mockSubEvent,
      subEventType: { tag: "FlyOut" } as const,
      hubIcao: "KJFK",
      groupFlightDepartureIcao: null,
      groupFlightArrivalIcao: null,
    };

    render(
      <SubEventDetails
        subEvent={flyOutSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText("Fly-out")).toBeInTheDocument();
  });

  it("renders participants section with signup count", () => {
    render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
      />
    );

    expect(screen.getByText("Who joined this wave")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("applies highlight styling when isHighlighted is true", () => {
    const { container } = render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
        isHighlighted={true}
      />
    );

    expect(container.querySelector("article")).toHaveClass(
      "ring-2",
      "ring-primary/40"
    );
  });

  it("does not apply highlight styling when isHighlighted is false", () => {
    const { container } = render(
      <SubEventDetails
        subEvent={mockSubEvent}
        signups={mockSignups}
        groups={mockGroups}
        userTimezone="UTC"
        isHighlighted={false}
      />
    );

    expect(container.querySelector("article")).not.toHaveClass("ring-2");
  });
});
