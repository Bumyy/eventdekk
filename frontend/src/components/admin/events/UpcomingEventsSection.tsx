import { EventCard } from "./EventCard";
import { SubEvent, FlightSignup, Group, Event } from "@/module_bindings/types";

interface UpcomingEventsSectionProps {
  upcomingEvents: Event[];
  upcomingAttendingEvents: Event[];
  subEvents: SubEvent[];
  flightSignups: FlightSignup[];
  groups: Group[];
  userTimezone: string;
  groupId: bigint;
  expandedEvents: string[];
  currentUser?: any;
  users?: any[];
  onToggleExpand: (eventId: string) => void;
  onManageEvent: (eventId: bigint) => void;
  onDeleteEvent: (eventId: bigint) => void;
  onManageParticipation: (event: Event) => void;
  onPublishEvent?: (eventId: bigint) => void;
}

export function UpcomingEventsSection({
  upcomingEvents,
  upcomingAttendingEvents,
  subEvents,
  flightSignups,
  groups,
  userTimezone,
  groupId,
  expandedEvents,
  currentUser,
  users,
  onToggleExpand,
  onManageEvent,
  onDeleteEvent,
  onManageParticipation,
  onPublishEvent,
}: UpcomingEventsSectionProps) {
  const getGroupInfo = (groupId: bigint) => {
    const group = groups?.find((g) => g.groupId === groupId);
    return {
      name: group?.name || "Unknown Group",
      logo: group?.logoUrl || "",
      tag: group?.tag || "",
    };
  };

  const getFlightSignupsForGroup = (): Array<{
    groupId: bigint;
    subEventId: bigint;
  }> => {
    return (
      flightSignups?.map((signup) => ({
        groupId: signup.groupId,
        subEventId: signup.subEventId,
      })) || []
    );
  };

  const flightSignupsInfo = getFlightSignupsForGroup();

  return (
    <div className="space-y-4">
      {upcomingEvents && upcomingEvents.length > 0 && (
        <>
          <h2 className="text-xl font-medium mt-4">Events You're Hosting</h2>
          <div className="grid grid-cols-1 gap-6">
            {upcomingEvents.map((event) => {
              const eventSubEvents = subEvents.filter(
                (se) => se.eventId === event.eventId
              );
              return (
                <EventCard
                  key={event.eventId.toString()}
                  event={event}
                  subEvents={eventSubEvents}
                  userTimezone={userTimezone}
                  isHosting={true}
                  expanded={expandedEvents.includes(event.eventId.toString())}
                  currentUser={currentUser}
                  users={users}
                  onToggleExpand={() =>
                    onToggleExpand(event.eventId.toString())
                  }
                  onManage={() => onManageEvent(event.eventId)}
                  onDelete={() => onDeleteEvent(event.eventId)}
                  onPublish={() => onPublishEvent?.(event.eventId)}
                />
              );
            })}
          </div>
        </>
      )}

      {upcomingAttendingEvents && upcomingAttendingEvents.length > 0 && (
        <>
          <h2 className="text-xl font-medium mt-6">Events You're Attending</h2>
          <div className="grid grid-cols-1 gap-6">
            {upcomingAttendingEvents.map((event) => {
              const eventSubEvents = subEvents.filter(
                (se) => se.eventId === event.eventId
              );

              // Find all sub-events this group is participating in by counting flight signups
              const participatingSubEventIds =
                flightSignups
                  ?.filter(
                    (signup) =>
                      signup.groupId === groupId &&
                      eventSubEvents.some(
                        (se) => se.subEventId === signup.subEventId
                      )
                  )
                  .map((signup) => signup.subEventId) || [];

              // Remove duplicates to get accurate count
              const uniqueParticipatingIds = [
                ...new Set(participatingSubEventIds),
              ];
              const participatingCount = uniqueParticipatingIds.length;

              // Get creator group info
              const creatorGroupInfo = getGroupInfo(event.creatorGroupId);

              return (
                <EventCard
                  key={event.eventId.toString()}
                  event={event}
                  subEvents={eventSubEvents}
                  userTimezone={userTimezone}
                  isAttending={true}
                  participatingCount={participatingCount}
                  creatorGroupInfo={creatorGroupInfo}
                  expanded={expandedEvents.includes(
                    `attending-${event.eventId.toString()}`
                  )}
                  currentUser={currentUser}
                  users={users}
                  onToggleExpand={() =>
                    onToggleExpand(`attending-${event.eventId.toString()}`)
                  }
                  onManageParticipation={() => onManageParticipation(event)}
                  flightSignups={flightSignupsInfo}
                />
              );
            })}
          </div>
        </>
      )}

      {(!upcomingEvents || upcomingEvents.length === 0) &&
        (!upcomingAttendingEvents || upcomingAttendingEvents.length === 0) && (
          <p className="text-muted-foreground">No upcoming events found.</p>
        )}
    </div>
  );
}
