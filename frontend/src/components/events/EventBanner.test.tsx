import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventBanner } from "./EventBanner";

describe("EventBanner", () => {
  const mockEvent = {
    eventId: BigInt(1),
    creatorGroupId: BigInt(1),
    name: "Test Event",
    description: "A test event description",
    startTime: { toDate: () => new Date("2026-03-22T10:00:00Z") },
    endTime: { toDate: () => new Date("2026-03-22T18:00:00Z") },
    ifcEventLink: null,
    bannerUrl: null,
    status: { tag: "Published" },
    createdAt: { toDate: () => new Date("2026-01-01T00:00:00Z") },
    isInternal: false,
  };

  const mockHostGroup = {
    groupId: BigInt(1),
    name: "Alpha Group",
    tag: "ALP",
    description: "Test group",
    ceoIdentity: "identity1" as unknown as ArrayBuffer,
    ifvarbApproved: true,
    websiteUrl: null,
    logoUrl: "https://example.com/logo.png",
    rating: null,
    color: "#FF5500",
    createdAt: { toDate: () => new Date() },
  };

  it("renders event name and description", () => {
    render(<EventBanner event={mockEvent as Parameters<typeof EventBanner>[0]["event"]} />);
    
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("A test event description")).toBeInTheDocument();
  });

  it("renders banner image when bannerUrl is provided", () => {
    const eventWithBanner = {
      ...mockEvent,
      bannerUrl: "https://example.com/banner.jpg",
    };
    
    render(<EventBanner event={eventWithBanner as Parameters<typeof EventBanner>[0]["event"]} />);
    
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
    expect(img).toHaveAttribute("alt", "Test Event");
  });

  it("does not render banner image when bannerUrl is null", () => {
    render(<EventBanner event={mockEvent as Parameters<typeof EventBanner>[0]["event"]} />);
    
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("applies correct class names", () => {
    const { container } = render(<EventBanner event={mockEvent as Parameters<typeof EventBanner>[0]["event"]} />);
    
    expect(container.firstChild).toHaveClass("relative", "border-b");
  });

  it("renders host group when provided", () => {
    render(
      <EventBanner
        event={mockEvent as Parameters<typeof EventBanner>[0]["event"]}
        hostGroup={mockHostGroup as Parameters<typeof EventBanner>[0]["hostGroup"]}
      />
    );

    expect(screen.getByText("Alpha Group")).toBeInTheDocument();
  });

  it("displays group tag in avatar fallback", () => {
    render(
      <EventBanner
        event={mockEvent as Parameters<typeof EventBanner>[0]["event"]}
        hostGroup={mockHostGroup as Parameters<typeof EventBanner>[0]["hostGroup"]}
      />
    );

    expect(screen.getByText("ALP")).toBeInTheDocument();
  });

  it("does not render host section when hostGroup is null", () => {
    render(
      <EventBanner
        event={mockEvent as Parameters<typeof EventBanner>[0]["event"]}
        hostGroup={null}
      />
    );

    expect(screen.queryByText("Alpha Group")).not.toBeInTheDocument();
  });

  it("does not render host section when hostGroup is undefined", () => {
    render(<EventBanner event={mockEvent as Parameters<typeof EventBanner>[0]["event"]} />);

    expect(screen.queryByText("Alpha Group")).not.toBeInTheDocument();
  });
});