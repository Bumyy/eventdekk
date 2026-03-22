import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventDetailsFormCard } from "./EventDetailsFormCard";
import { EditEventProvider } from "./EditEventContext";

vi.mock("@/components/ui/datetime-picker", () => ({
  DateTimePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const editContextValue = {
  userTimezone: "UTC",
  name: "Event 1",
  description: "Description",
  startTime: new Date("2026-01-01T10:00:00Z"),
  endTime: new Date("2026-01-01T12:00:00Z"),
  ifcEventLink: "",
  isInternal: false,
  previewUrl: null,
  bannerUrl: "",
  selectedFile: null,
  isUploading: false,
  isLoading: false,
  setName: vi.fn(),
  setDescription: vi.fn(),
  setStartTime: vi.fn(),
  setEndTime: vi.fn(),
  setIfcEventLink: vi.fn(),
  setIsInternal: vi.fn(),
  handleFileChange: vi.fn(),
  setBannerUrl: vi.fn(),
  clearBanner: vi.fn(),
  eventSubEvents: [],
  signupsBySubEvent: {},
  groups: [],
  memberOptions: [],
  showAddSubEventDialog: false,
  setShowAddSubEventDialog: vi.fn(),
  showEditSubEventDialog: false,
  setShowEditSubEventDialog: vi.fn(),
  subEventForm: {
    name: "",
    description: "",
    type: "GroupFlight" as const,
    startTime: new Date(),
    endTime: new Date(),
    hubIcao: "",
    departureIcao: "",
    arrivalIcao: "",
    route: "",
    notes: "",
    eventLeadHex: "none",
  },
  setSubEventForm: vi.fn(),
  editSubEventForm: {
    name: "",
    description: "",
    type: "GroupFlight" as const,
    startTime: new Date(),
    endTime: new Date(),
    hubIcao: "",
    departureIcao: "",
    arrivalIcao: "",
    route: "",
    notes: "",
    eventLeadHex: "none",
  },
  setEditSubEventForm: vi.fn(),
  handleAddSubEvent: vi.fn(),
  handleUpdateSubEvent: vi.fn(),
  handleEditSubEventClick: vi.fn(),
  handleDeleteSubEvent: vi.fn(),
  showInviteGroupsDialog: false,
  setShowInviteGroupsDialog: vi.fn(),
  selectedGroups: [],
  currentGroupId: null,
  handleSelectGroup: vi.fn(),
  handleRemoveGroup: vi.fn(),
  handleInviteGroups: vi.fn(),
  showManageOwnFlightsDialog: false,
  setShowManageOwnFlightsDialog: vi.fn(),
  selectedOwnSubEvents: [],
  ownFlightDetails: {},
  isSubmittingFlights: false,
  handleToggleOwnSubEvent: vi.fn(),
  updateOwnFlightDetail: vi.fn(),
  handleSubmitOwnFlights: vi.fn(),
};

describe("EventDetailsFormCard", () => {
  it("updates fields through edit context setters", () => {
    render(
      <EditEventProvider value={editContextValue}>
        <EventDetailsFormCard />
      </EditEventProvider>
    );

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Updated Event" },
    });
    expect(editContextValue.setName).toHaveBeenCalledWith("Updated Event");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated Description" },
    });
    expect(editContextValue.setDescription).toHaveBeenCalledWith(
      "Updated Description"
    );
  });
});
