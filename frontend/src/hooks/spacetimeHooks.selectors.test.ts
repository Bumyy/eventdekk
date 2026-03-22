import { describe, expect, it, vi } from "vitest";

vi.mock("spacetimedb/react", () => ({
  useTable: vi.fn(),
  useSpacetimeDB: vi.fn(),
}));

vi.mock("spacetimedb", () => ({
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

vi.mock("../module_bindings", () => ({
  tables: {},
}));

import {
  selectAllActiveEvents,
  selectGroupMembersForGroup,
  selectGroupRelatedEvents,
  selectPendingEventInvitations,
  selectSubEventsForEvents,
  selectSubEventsForGroup,
  selectUpcomingAttendingEvents,
} from "./spacetimeHooks";

const time = (iso: string) => ({ toDate: () => new Date(iso) });

describe("spacetimeHooks selectors", () => {
  it("filters and sorts sub-events for a group", () => {
    const events = [{ eventId: 1n }, { eventId: 3n }];
    const subEvents = [
      { eventId: 2n, scheduledStartTime: time("2026-01-01T12:00:00Z") },
      { eventId: 1n, scheduledStartTime: time("2026-01-01T15:00:00Z") },
      { eventId: 3n, scheduledStartTime: time("2026-01-01T10:00:00Z") },
    ];

    const result = selectSubEventsForGroup(events, subEvents);

    expect(result).toHaveLength(2);
    expect(result.map((se) => se.eventId)).toEqual([3n, 1n]);
  });

  it("handles single and multiple event selection paths", () => {
    const singleRows = [
      { eventId: 2n, scheduledStartTime: time("2026-02-01T15:00:00Z") },
      { eventId: 2n, scheduledStartTime: time("2026-02-01T10:00:00Z") },
    ];

    const allSubEvents = [
      { eventId: 2n, scheduledStartTime: time("2026-02-01T10:00:00Z") },
      { eventId: 4n, scheduledStartTime: time("2026-02-01T09:00:00Z") },
      { eventId: 9n, scheduledStartTime: time("2026-02-01T08:00:00Z") },
    ];

    const single = selectSubEventsForEvents([2n], singleRows, allSubEvents);
    const multi = selectSubEventsForEvents([2n, 4n], singleRows, allSubEvents);

    expect(single.map((se) => se.scheduledStartTime.toDate().toISOString())).toEqual([
      "2026-02-01T10:00:00.000Z",
      "2026-02-01T15:00:00.000Z",
    ]);
    expect(multi.map((se) => se.eventId)).toEqual([4n, 2n]);
  });

  it("returns active events sorted by start time", () => {
    const events = [
      {
        eventId: 1n,
        status: { tag: "Cancelled" },
        startTime: time("2026-03-01T10:00:00Z"),
      },
      {
        eventId: 2n,
        status: { tag: "Published" },
        startTime: time("2026-03-01T12:00:00Z"),
      },
      {
        eventId: 3n,
        status: { tag: "Draft" },
        startTime: time("2026-03-01T09:00:00Z"),
      },
    ];

    const result = selectAllActiveEvents(events);

    expect(result.map((e) => e.eventId)).toEqual([3n, 2n]);
  });

  it("returns hosted and accepted group-related events excluding cancelled", () => {
    const hostedEvents = [{ eventId: 1n }];
    const eventParticipants = [
      { eventId: 2n, status: { tag: "Accepted" } },
      { eventId: 3n, status: { tag: "Pending" } },
    ];
    const allEvents = [
      {
        eventId: 2n,
        status: { tag: "Published" },
        startTime: time("2026-04-01T10:00:00Z"),
      },
      {
        eventId: 1n,
        status: { tag: "Published" },
        startTime: time("2026-04-01T09:00:00Z"),
      },
      {
        eventId: 3n,
        status: { tag: "Published" },
        startTime: time("2026-04-01T11:00:00Z"),
      },
      {
        eventId: 4n,
        status: { tag: "Cancelled" },
        startTime: time("2026-04-01T08:00:00Z"),
      },
    ];

    const result = selectGroupRelatedEvents(
      99n,
      hostedEvents,
      eventParticipants,
      allEvents
    );

    expect(result.map((e) => e.eventId)).toEqual([1n, 2n]);
  });

  it("returns upcoming attending events for accepted participants", () => {
    const events = [
      { eventId: 8n, startTime: time("2026-05-01T11:00:00Z") },
      { eventId: 7n, startTime: time("2026-05-01T09:00:00Z") },
    ];
    const eventParticipants = [
      { eventId: 7n, status: { tag: "Accepted" } },
      { eventId: 8n, status: { tag: "Pending" } },
    ];

    const result = selectUpcomingAttendingEvents(events, eventParticipants);

    expect(result.map((e) => e.eventId)).toEqual([7n]);
  });

  it("returns pending invitation events sorted by start time", () => {
    const events = [
      { eventId: 10n, startTime: time("2026-06-01T11:00:00Z") },
      { eventId: 9n, startTime: time("2026-06-01T09:00:00Z") },
      { eventId: 8n, startTime: time("2026-06-01T10:00:00Z") },
    ];
    const eventParticipants = [
      { eventId: 8n, status: { tag: "Pending" } },
      { eventId: 9n, status: { tag: "Pending" } },
      { eventId: 10n, status: { tag: "Accepted" } },
    ];

    const result = selectPendingEventInvitations(events, eventParticipants);

    expect(result.map((e) => e.eventId)).toEqual([9n, 8n]);
  });

  it("pairs memberships with matching users", () => {
    const memberships = [
      { id: 1n, userIdentity: { toHexString: () => "0xabc" } },
      { id: 2n, userIdentity: { toHexString: () => "0xdef" } },
    ];

    const users = [
      { identity: { toHexString: () => "0xabc" }, displayName: "Alice" },
    ];

    const result = selectGroupMembersForGroup(memberships, users);

    expect(result).toHaveLength(2);
    expect(result[0].user?.displayName).toBe("Alice");
    expect(result[1].user).toBeUndefined();
  });
});
