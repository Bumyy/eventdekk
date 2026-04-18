import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParticipantList } from "./ParticipantList";
import { Group, FlightSignup } from "@/module_bindings";

describe("ParticipantList", () => {
  const mockGroups: Group[] = [
    {
      groupId: BigInt(1),
      name: "Alpha Group",
      tag: "ALP",
      description: "Test group",
      ceoIdentity: "identity1" as unknown as ArrayBuffer,
      ifvarbApproved: true,
      websiteUrl: null,
      logoUrl: "https://example.com/logo1.png",
      rating: null,
      color: null,
      createdAt: { toDate: () => new Date() },
    },
    {
      groupId: BigInt(2),
      name: "Beta Group",
      tag: "BET",
      description: "Another test group",
      ceoIdentity: "identity2" as unknown as ArrayBuffer,
      ifvarbApproved: false,
      websiteUrl: null,
      logoUrl: null,
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
    {
      signupId: BigInt(2),
      subEventId: BigInt(1),
      groupId: BigInt(2),
      departureIcao: "KLAX",
      arrivalIcao: "KJFK",
      routeDetails: null,
      callsign: "BET456",
      aircraftType: "A320",
      desiredDepartureTime: null,
      desiredArrivalTime: null,
      createdAt: { toDate: () => new Date() },
    },
  ];

  it("renders empty state when no signups", () => {
    render(<ParticipantList signups={[]} groups={mockGroups} />);
    
    expect(screen.getByText("No groups have joined this wave yet.")).toBeInTheDocument();
  });

  it("renders participants with group names", () => {
    render(<ParticipantList signups={mockSignups} groups={mockGroups} />);
    
    expect(screen.getByText("Alpha Group")).toBeInTheDocument();
    expect(screen.getByText("Beta Group")).toBeInTheDocument();
  });

  it("renders callsign and aircraft type when available", () => {
    render(<ParticipantList signups={mockSignups} groups={mockGroups} />);
    
    expect(screen.getByText("(ALP123)")).toBeInTheDocument();
    expect(screen.getByText("(BET456)")).toBeInTheDocument();
    expect(screen.getByText("B737")).toBeInTheDocument();
    expect(screen.getByText("A320")).toBeInTheDocument();
  });

  it("displays group tag in avatar fallback when no logo", () => {
    render(<ParticipantList signups={mockSignups} groups={mockGroups} />);
    
    expect(screen.getByText("ALP")).toBeInTheDocument();
    expect(screen.getByText("BET")).toBeInTheDocument();
  });

  it("displays 'Unknown Group' when group is not found", () => {
    const signupWithoutGroup: FlightSignup[] = [
      {
        signupId: BigInt(3),
        subEventId: BigInt(1),
        groupId: BigInt(999),
        departureIcao: "KJFK",
        arrivalIcao: "KLAX",
        routeDetails: null,
        callsign: null,
        aircraftType: null,
        desiredDepartureTime: null,
        desiredArrivalTime: null,
        createdAt: { toDate: () => new Date() },
      },
    ];
    
    render(<ParticipantList signups={signupWithoutGroup} groups={mockGroups} />);
    
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders logo when available", () => {
    render(<ParticipantList signups={mockSignups} groups={mockGroups} />);
    
    expect(screen.getByText("Alpha Group")).toBeInTheDocument();
    expect(screen.getByText("ALP")).toBeInTheDocument();
  });
});
