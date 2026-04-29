import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubEventFlightForm } from "./SubEventFlightForm";
import type { AircraftLiveryValue } from "@/components/AircraftLiveryPicker";

vi.mock("@/components/AircraftLiveryPicker", () => ({
  AircraftLiveryPicker: ({
    onChange,
    disabled,
  }: {
    onChange: (v: AircraftLiveryValue) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="aircraft-picker">
      <button disabled={disabled} onClick={() => onChange({ aircraftName: "B738", liveryId: "b738_1" })}>
        Pick Aircraft
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/datetime-picker", () => ({
  DateTimePicker: ({
    label,
    disabled,
  }: {
    label?: string;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} type="button">
      {label || "Date Time Picker"}
    </button>
  ),
}));

const baseSubEvent = {
  subEventId: BigInt(1),
  subEventType: { tag: "GroupFlight" as const },
  hubIcao: "EGLL",
  groupFlightDepartureIcao: "KJFK",
  groupFlightArrivalIcao: "KLAX",
  groupFlightRoute: "KJFK DCT KLAX",
};

describe("SubEventFlightForm", () => {
  const defaultProps = {
    subEvent: baseSubEvent,
    callsign: "",
    callsignError: undefined,
    aircraftType: "",
    liveryId: "",
    departureIcao: "KJFK",
    arrivalIcao: "KLAX",
    route: "",
    departureTime: undefined,
    arrivalTime: undefined,
    onCallsignChange: vi.fn(),
    onAircraftChange: vi.fn(),
    onDepartureIcaoChange: vi.fn(),
    onArrivalIcaoChange: vi.fn(),
    onRouteChange: vi.fn(),
    onDepartureTimeChange: vi.fn(),
    onArrivalTimeChange: vi.fn(),
    disabled: false,
  };

  it("renders callsign input", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    expect(screen.getByPlaceholderText("e.g. QFA123")).toBeInTheDocument();
  });

  it("shows callsign error when provided", () => {
    render(<SubEventFlightForm {...defaultProps} callsignError="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("disables inputs when disabled prop is true", () => {
    render(<SubEventFlightForm {...defaultProps} disabled={true} />);
    expect(screen.getByPlaceholderText("e.g. QFA123")).toBeDisabled();
  });

  it("calls onCallsignChange when typing in callsign", () => {
    const onCallsignChange = vi.fn();
    render(<SubEventFlightForm {...defaultProps} onCallsignChange={onCallsignChange} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. QFA123"), {
      target: { value: "QFA123" },
    });
    expect(onCallsignChange).toHaveBeenCalledWith("QFA123");
  });

  it("shows fixed departure label for GroupFlight", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    expect(screen.getByText("Departure Airport (Fixed)")).toBeInTheDocument();
  });

  it("shows fixed arrival label for GroupFlight", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    expect(screen.getByText("Arrival Airport (Fixed)")).toBeInTheDocument();
  });

  it("shows hub departure label for FlyOut", () => {
    render(
      <SubEventFlightForm
        {...defaultProps}
        subEvent={{ ...baseSubEvent, subEventType: { tag: "FlyOut" } }}
        departureIcao="EGLL"
      />
    );
    expect(screen.getByText("Departure Airport (Hub)")).toBeInTheDocument();
  });

  it("shows hub arrival label for FlyIn", () => {
    render(
      <SubEventFlightForm
        {...defaultProps}
        subEvent={{ ...baseSubEvent, subEventType: { tag: "FlyIn" } }}
        arrivalIcao="EGLL"
      />
    );
    expect(screen.getByText("Arrival Airport (Hub)")).toBeInTheDocument();
  });

  it("shows route with group flight label for GroupFlight", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    expect(screen.getByText("Route (Based on group flight)")).toBeInTheDocument();
  });

  it("shows custom route label for non-GroupFlight", () => {
    render(
      <SubEventFlightForm
        {...defaultProps}
        subEvent={{ ...baseSubEvent, subEventType: { tag: "FlyIn" } }}
      />
    );
    expect(screen.getByText("Your Flight Route")).toBeInTheDocument();
  });

  it("shows planned route for GroupFlight when provided", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    expect(screen.getByText(/Planned route:/)).toBeInTheDocument();
  });

  it("disables departure ICAO for GroupFlight", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    const departureInput = screen.getByDisplayValue("KJFK");
    expect(departureInput).toBeDisabled();
  });

  it("disables arrival ICAO for GroupFlight", () => {
    render(<SubEventFlightForm {...defaultProps} />);
    const arrivalInput = screen.getByDisplayValue("KLAX");
    expect(arrivalInput).toBeDisabled();
  });

  it("calls onAircraftChange when aircraft picker triggers", () => {
    const onAircraftChange = vi.fn();
    render(<SubEventFlightForm {...defaultProps} onAircraftChange={onAircraftChange} />);
    fireEvent.click(screen.getByText("Pick Aircraft"));
    expect(onAircraftChange).toHaveBeenCalledWith({ aircraftName: "B738", liveryId: "b738_1" });
  });

  it("renders departure and arrival time pickers", () => {
    render(
      <SubEventFlightForm
        {...defaultProps}
        departureTime="2026-01-01T10:00"
        arrivalTime="2026-01-01T12:00"
      />
    );
    expect(screen.getByRole("button", { name: "Planned Departure Time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planned Arrival Time" })).toBeInTheDocument();
  });
});
