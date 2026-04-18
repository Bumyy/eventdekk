import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventDateTimeInfo } from "./EventDateTimeInfo";

describe("EventDateTimeInfo", () => {
  it("renders formatted date and time", () => {
    const startTime = new Date("2026-03-22T10:00:00Z");
    const endTime = new Date("2026-03-22T18:00:00Z");
    
    render(
      <EventDateTimeInfo
        startTime={startTime}
        endTime={endTime}
        timezone="UTC"
        groupCount={5}
        signupCount={20}
      />
    );

    expect(screen.getByText(/Sunday/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("displays singular labels for 1 group and 1 signup", () => {
    const startTime = new Date("2026-03-22T10:00:00Z");
    const endTime = new Date("2026-03-22T18:00:00Z");
    
    render(
      <EventDateTimeInfo
        startTime={startTime}
        endTime={endTime}
        timezone="UTC"
        groupCount={1}
        signupCount={1}
      />
    );

    expect(screen.getByText("1 group")).toBeInTheDocument();
    expect(screen.getByText("1 signup")).toBeInTheDocument();
  });

  it("displays plural labels for multiple groups and signups", () => {
    const startTime = new Date("2026-03-22T10:00:00Z");
    const endTime = new Date("2026-03-22T18:00:00Z");
    
    render(
      <EventDateTimeInfo
        startTime={startTime}
        endTime={endTime}
        timezone="UTC"
        groupCount={5}
        signupCount={25}
      />
    );

    expect(screen.getByText("5 groups")).toBeInTheDocument();
    expect(screen.getByText("25 signups")).toBeInTheDocument();
  });

  it("applies correct container classes", () => {
    const { container } = render(
      <EventDateTimeInfo
        startTime={new Date("2026-03-22T10:00:00Z")}
        endTime={new Date("2026-03-22T18:00:00Z")}
        timezone="UTC"
        groupCount={5}
        signupCount={20}
      />
    );

    expect(container.firstChild).toHaveClass("border-l-4", "px-3");
  });
});
