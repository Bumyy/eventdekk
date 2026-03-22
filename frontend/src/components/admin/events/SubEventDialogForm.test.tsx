import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubEventDialogForm } from "./SubEventDialogForm";
import { SubEventFormState } from "./types";

vi.mock("@/components/ui/datetime-picker", () => ({
  DateTimePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const baseForm: SubEventFormState = {
  name: "SE1",
  description: "Desc",
  type: "GroupFlight",
  startTime: new Date("2026-01-01T10:00:00Z"),
  endTime: new Date("2026-01-01T12:00:00Z"),
  hubIcao: "",
  departureIcao: "KJFK",
  arrivalIcao: "KLAX",
  route: "KJFK DCT KLAX",
  notes: "Note",
  eventLeadHex: "none",
};

describe("SubEventDialogForm", () => {
  it("renders explicit props and updates name", () => {
    const setForm = vi.fn();
    render(
      <SubEventDialogForm
        form={baseForm}
        setForm={setForm}
        userTimezone="UTC"
        members={[{ identityHex: "none", displayName: "None" }]}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated Name" },
    });

    expect(setForm).toHaveBeenCalled();
    const latest = setForm.mock.calls.at(-1)?.[0] as SubEventFormState;
    expect(latest.name).toBe("Updated Name");
  });

  it("hides type field when showTypeField is false", () => {
    render(
      <SubEventDialogForm
        form={baseForm}
        setForm={vi.fn()}
        userTimezone="UTC"
        members={[{ identityHex: "none", displayName: "None" }]}
        showTypeField={false}
      />
    );

    expect(screen.queryByText("Select type")).not.toBeInTheDocument();
  });

  it("renders hub field for FlyIn type", () => {
    render(
      <SubEventDialogForm
        form={{ ...baseForm, type: "FlyIn", hubIcao: "EGLL" }}
        setForm={vi.fn()}
        userTimezone="UTC"
        members={[{ identityHex: "none", displayName: "None" }]}
      />
    );

    expect(screen.getByLabelText("Hub ICAO")).toBeInTheDocument();
    expect(screen.queryByLabelText("Departure ICAO")).not.toBeInTheDocument();
  });

  it("throws when no context and required props are missing", () => {
    expect(() => render(<SubEventDialogForm />)).toThrow(
      "SubEventDialogForm requires context or explicit form, setForm, userTimezone, and members props"
    );
  });
});
