import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EditEvent from "./EditEvent";
import { EventStatus } from "@/module_bindings/types";

const {
  mockNavigate,
  mockUpdateEvent,
  mockToastError,
  mockHooks,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUpdateEvent: vi.fn(),
  mockToastError: vi.fn(),
  mockHooks: {
    useEvents: vi.fn(),
    useSubEvents: vi.fn(() => []),
    useGroups: vi.fn(() => []),
    useFlightSignups: vi.fn(() => []),
    useGroupLeadMembersForGroup: vi.fn(() => []),
    useEventParticipantsForEvent: vi.fn(() => []),
    useGroupMemberships: vi.fn(() => []),
    useGroupById: vi.fn(() => null),
  },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ eventId: "123", groupId: "77" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/spacetimeHooks", () => mockHooks);

vi.mock("spacetimedb/react", () => ({
  useSpacetimeDB: () => ({
    getConnection: () => ({
      reducers: {
        updateEvent: mockUpdateEvent,
        addSubEvent: vi.fn(),
        updateSubEvent: vi.fn(),
        deleteSubEvent: vi.fn(),
        inviteGroupToEvent: vi.fn(),
        deleteFlightSignup: vi.fn(),
        updateFlightSignup: vi.fn(),
        signupForFlight: vi.fn(),
      },
    }),
  }),
}));

vi.mock("@/utils/timezoneUtils", async () => {
  const actual = await vi.importActual("@/utils/timezoneUtils");
  return {
    ...actual,
    useUserTimezone: () => "UTC",
  };
});

vi.mock("@/components/admin/events", () => ({
  EditEventProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EventDetailsFormCard: () => <div>EventDetailsFormCard</div>,
  SubEventsManagementCard: () => <div>SubEventsManagementCard</div>,
  InviteGroupsCard: () => <div>InviteGroupsCard</div>,
  ManageParticipantsCard: () => <div>ManageParticipantsCard</div>,
  ManageOwnFlightsCard: () => <div>ManageOwnFlightsCard</div>,
}));

vi.mock("@/api/apiService", () => ({
  uploadImage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

describe("EditEvent page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates back when event is missing", async () => {
    mockHooks.useEvents.mockReturnValue([
      {
        eventId: 999n,
        name: "Other Event",
        description: "Desc",
        startTime: { toDate: () => new Date("2026-01-01T10:00:00Z") },
        endTime: { toDate: () => new Date("2026-01-01T12:00:00Z") },
        isInternal: false,
        ifcEventLink: null,
        bannerUrl: null,
        status: EventStatus.Draft,
      },
    ]);

    render(<EditEvent />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/admin/events/77");
    });
  });

  it("renders save action and saves event", async () => {
    mockHooks.useEvents.mockReturnValue([
      {
        eventId: 123n,
        name: "Draft Event",
        description: "Desc",
        startTime: { toDate: () => new Date("2026-01-01T10:00:00Z") },
        endTime: { toDate: () => new Date("2026-01-01T12:00:00Z") },
        isInternal: false,
        ifcEventLink: null,
        bannerUrl: null,
        status: EventStatus.Draft,
      },
    ]);

    mockUpdateEvent.mockResolvedValue(undefined);

    render(<EditEvent />);

    expect(await screen.findByText("Save")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(mockUpdateEvent).toHaveBeenCalledTimes(1));
    const payload = mockUpdateEvent.mock.calls[0][0];
    expect(payload.eventId).toBe(123n);
    expect(payload.name).toBe("Draft Event");
    expect(payload.description).toBe("Desc");
    expect(payload.status).toEqual(EventStatus.Draft);
  });
});
