import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubEventCard } from "./SubEventCard";
import { SubEvent } from "@/module_bindings";

describe("SubEventCard", () => {
  const mockSubEvent: SubEvent = {
    subEventId: BigInt(1),
    eventId: BigInt(1),
    name: "Test Flight",
    description: "A test flight",
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

  it("renders sub-event name and signup count", () => {
    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText("Test Flight")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders GroupFlight badge", () => {
    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText("Group Flight")).toBeInTheDocument();
  });

  it("renders FlyIn badge", () => {
    const flyInSubEvent = {
      ...mockSubEvent,
      subEventType: { tag: "FlyIn" } as const,
      hubIcao: "KLAX",
      groupFlightDepartureIcao: null,
      groupFlightArrivalIcao: null,
    };

    render(
      <SubEventCard
        subEvent={flyInSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText("Fly-in")).toBeInTheDocument();
  });

  it("renders FlyOut badge", () => {
    const flyOutSubEvent = {
      ...mockSubEvent,
      subEventType: { tag: "FlyOut" } as const,
      hubIcao: "KJFK",
      groupFlightDepartureIcao: null,
      groupFlightArrivalIcao: null,
    };

    render(
      <SubEventCard
        subEvent={flyOutSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText("Fly-out")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();

    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText("Test Flight").closest("div")!);
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onClick when Enter key is pressed", () => {
    const onClick = vi.fn();

    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
        onClick={onClick}
      />
    );

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onClick when Space key is pressed", () => {
    const onClick = vi.fn();

    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
        onClick={onClick}
      />
    );

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalled();
  });

  it("renders route for GroupFlight", () => {
    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText("KJFK")).toBeInTheDocument();
    expect(screen.getByText("KLAX")).toBeInTheDocument();
  });

  it("does not show different date when sub-event is same day as main event", () => {
    render(
      <SubEventCard
        subEvent={mockSubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.queryByText(/Mar/)).not.toBeInTheDocument();
  });

  it("shows different date when sub-event is on different day", () => {
    const differentDaySubEvent = {
      ...mockSubEvent,
      scheduledStartTime: { toDate: () => new Date("2026-03-23T10:00:00Z") },
      scheduledEndTime: { toDate: () => new Date("2026-03-23T12:00:00Z") },
    };

    render(
      <SubEventCard
        subEvent={differentDaySubEvent}
        signupCount={15}
        userTimezone="UTC"
        mainEventStartTime={new Date("2026-03-22T10:00:00Z")}
      />
    );

    expect(screen.getByText(/Mon/)).toBeInTheDocument();
    expect(screen.getByText(/23/)).toBeInTheDocument();
  });
});