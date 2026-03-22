import { EventCard } from "./EventCard";
import { SubEvent, FlightSignup } from "@/module_bindings/types";

function hasIncompleteFlightDetails(signup: FlightSignup, subEvent: SubEvent): boolean {
  const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
  const isFlyIn = subEvent.subEventType.tag === "FlyIn";
  const isFlyOut = subEvent.subEventType.tag === "FlyOut";

  if (!signup.callsign || signup.callsign.trim() === "") return true;
  if (!signup.aircraftType || signup.aircraftType.trim() === "") return true;

  if (!signup.desiredDepartureTime || !signup.desiredArrivalTime) return true;

  if (isFlyIn && (!signup.departureIcao || signup.departureIcao.trim() === "")) return true;
  if (isFlyOut && (!signup.arrivalIcao || signup.arrivalIcao.trim() === "")) return true;if (!isGroupFlight) {
    if (!signup.departureIcao || signup.departureIcao.trim() === "") return true;
    if (!signup.arrivalIcao || signup.arrivalIcao.trim() === "") return true;
  }

  return false;
}

interface SignupIssues {
  hasIssues: boolean;
  missingCallsign: boolean;
  missingAircraftType: boolean;
  missingDepartureTime: boolean;
  missingArrivalTime: boolean;
  missingDepartureIcao: boolean;
  missingArrivalIcao: boolean;
}

function getSignupIssues(signup: FlightSignup, subEvent: SubEvent): SignupIssues {
  const isGroupFlight = subEvent.subEventType.tag === "GroupFlight";
  const isFlyIn = subEvent.subEventType.tag === "FlyIn";
  const isFlyOut = subEvent.subEventType.tag === "FlyOut";

  const issues: SignupIssues = {
    hasIssues: false,
    missingCallsign: false,
    missingAircraftType: false,
    missingDepartureTime: false,
    missingArrivalTime: false,
    missingDepartureIcao: false,
    missingArrivalIcao: false,
  };

  if (!signup.callsign || signup.callsign.trim() === "") {
    issues.missingCallsign = true;
    issues.hasIssues = true;
  }
  if (!signup.aircraftType || signup.aircraftType.trim() === "") {
    issues.missingAircraftType = true;
    issues.hasIssues = true;
  }
  if (!signup.desiredDepartureTime) {
    issues.missingDepartureTime = true;
    issues.hasIssues = true;
  }
  if (!signup.desiredArrivalTime) {
    issues.missingArrivalTime = true;
    issues.hasIssues = true;
  }
  if (isFlyIn && (!signup.departureIcao || signup.departureIcao.trim() === "")) {
    issues.missingDepartureIcao = true;
    issues.hasIssues = true;
  }
  if (isFlyOut && (!signup.arrivalIcao || signup.arrivalIcao.trim() === "")) {
    issues.missingArrivalIcao = true;
    issues.hasIssues = true;
  }
  if (!isGroupFlight && !isFlyIn &&!isFlyOut) {
    if (!signup.departureIcao || signup.departureIcao.trim() === "") {
      issues.missingDepartureIcao = true;
      issues.hasIssues = true;
    }
    if (!signup.arrivalIcao || signup.arrivalIcao.trim() === "") {
      issues.missingArrivalIcao = true;
      issues.hasIssues = true;
    }
  }

  return issues;
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

              const groupSignupsForEvent = flightSignups?.filter(
                (signup) =>
                  signup.groupId === groupId &&
                  eventSubEvents.some(
                    (se) => se.subEventId === signup.subEventId
                  )
              ) || [];

              const participatingSubEventIds = groupSignupsForEvent.map(
                (signup) => signup.subEventId
              );

              const uniqueParticipatingIds = [
                ...new Set(participatingSubEventIds),
              ];
              const participatingCount = uniqueParticipatingIds.length;

              const hasIncompleteInfo = groupSignupsForEvent.some((signup) => {
                const subEvent = eventSubEvents.find(
                  (se) => se.subEventId === signup.subEventId
                );
                return subEvent ? hasIncompleteFlightDetails(signup, subEvent) : false;
              });

              const creatorGroupInfo = getGroupInfo(event.creatorGroupId);

              const signupsWithIssues = groupSignupsForEvent.map((signup) => {
                const subEvent = eventSubEvents.find(
                  (se) => se.subEventId === signup.subEventId
                );
                return {
                  signup,
                  subEvent,
                  issues: subEvent ? getSignupIssues(signup, subEvent) : null,
                };
              });

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
                  hasIncompleteInfo={hasIncompleteInfo}
                  signupsWithIssues={signupsWithIssues}
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
