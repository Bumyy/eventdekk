import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventSidebar } from "./EventSidebar";

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: vi.fn(() => ({
    copied: false,
    copyToClipboard: vi.fn(),
  })),
}));

describe("EventSidebar", () => {
  it("renders share button", () => {
    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
      />
    );

    expect(screen.getByText("Share Event")).toBeInTheDocument();
  });

  it("renders quick snapshot section on desktop", () => {
    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
      />
    );

    expect(screen.getByText("Quick Snapshot")).toBeInTheDocument();
    expect(screen.getByText("5 sub-events")).toBeInTheDocument();
    expect(screen.getByText("25 total signups")).toBeInTheDocument();
    expect(screen.getByText("3 participating groups")).toBeInTheDocument();
  });

  it("renders IFC event link when provided", () => {
    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink="https://community.infiniteflight.com/t/event/123"
      />
    );

    expect(screen.getByText("View IFC Event Page")).toBeInTheDocument();
  });

  it("does not render IFC event link when null", () => {
    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
      />
    );

    expect(screen.queryByText("View IFC Event Page")).not.toBeInTheDocument();
  });

  it("renders register button when canRegister is true and onRegister is provided", () => {
    const onRegister = vi.fn();

    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
        canRegister={true}
        onRegister={onRegister}
      />
    );

    expect(screen.getByText("Register for Event")).toBeInTheDocument();
  });

  it("does not render register button when canRegister is false", () => {
    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
        canRegister={false}
        onRegister={vi.fn()}
      />
    );

    expect(screen.queryByText("Register for Event")).not.toBeInTheDocument();
  });

  it("calls onRegister when register button is clicked", () => {
    const onRegister = vi.fn();

    render(
      <EventSidebar
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
        canRegister={true}
        onRegister={onRegister}
      />
    );

    fireEvent.click(screen.getByText("Register for Event"));
    expect(onRegister).toHaveBeenCalled();
  });

  it("calls copyToClipboard when share button is clicked", async () => {
    const mockCopyToClipboard = vi.fn();
    vi.clearAllMocks();
    vi.doMock("@/hooks/useCopyToClipboard", () => ({
      useCopyToClipboard: vi.fn(() => ({
        copied: false,
        copyToClipboard: mockCopyToClipboard,
      })),
    }));

    const { EventSidebar: EventSidebarFresh } = await import("./EventSidebar");

    render(
      <EventSidebarFresh
        eventId={BigInt(1)}
        subEventCount={5}
        totalSignups={25}
        participantGroups={3}
        ifcEventLink={null}
      />
    );

    fireEvent.click(screen.getByText("Share Event"));
  });
});
