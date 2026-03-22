import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubEventTypeBadge } from "./SubEventTypeBadge";

describe("SubEventTypeBadge", () => {
  it("renders Group Flight label", () => {
    render(<SubEventTypeBadge type={{ tag: "GroupFlight" }} />);
    expect(screen.getByText("Group Flight")).toBeInTheDocument();
  });

  it("renders Fly-in label", () => {
    render(<SubEventTypeBadge type={{ tag: "FlyIn" }} />);
    expect(screen.getByText("Fly-in")).toBeInTheDocument();
  });

  it("renders Fly-out label", () => {
    render(<SubEventTypeBadge type={{ tag: "FlyOut" }} />);
    expect(screen.getByText("Fly-out")).toBeInTheDocument();
  });
});
