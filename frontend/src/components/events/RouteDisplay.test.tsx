import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteDisplay } from "./RouteDisplay";

describe("RouteDisplay", () => {
  it("renders departure to arrival for GroupFlight", () => {
    render(
      <RouteDisplay
        subEventType={{ tag: "GroupFlight" }}
        departureIcao="KJFK"
        arrivalIcao="KLAX"
        hubIcao={null}
      />
    );

    expect(screen.getByText("KJFK")).toBeInTheDocument();
    expect(screen.getByText("KLAX")).toBeInTheDocument();
  });

  it("renders 'To' hub for FlyIn", () => {
    const { container } = render(
      <RouteDisplay
        subEventType={{ tag: "FlyIn" }}
        departureIcao={null}
        arrivalIcao={null}
        hubIcao="KLAX"
      />
    );

    expect(container.textContent).toContain("To");
    expect(container.textContent).toContain("KLAX");
  });

  it("renders 'From' hub for FlyOut", () => {
    const { container } = render(
      <RouteDisplay
        subEventType={{ tag: "FlyOut" }}
        departureIcao={null}
        arrivalIcao={null}
        hubIcao="KJFK"
      />
    );

    expect(container.textContent).toContain("From");
    expect(container.textContent).toContain("KJFK");
  });

  it("returns null when no route info is available", () => {
    const { container } = render(
      <RouteDisplay
        subEventType={{ tag: "GroupFlight" }}
        departureIcao={null}
        arrivalIcao={null}
        hubIcao={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null when only one ICAO is provided for GroupFlight", () => {
    const { container } = render(
      <RouteDisplay
        subEventType={{ tag: "GroupFlight" }}
        departureIcao="KJFK"
        arrivalIcao={null}
        hubIcao={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
