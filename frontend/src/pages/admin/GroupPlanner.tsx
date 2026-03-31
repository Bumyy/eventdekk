import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Calendar from "@/components/Calendar";
import { Loader2, Users, User as UserIcon, Layers } from "lucide-react";
import {
  useEvents,
  useSubEvents,
  useGroups,
  useGroupMemberships,
  useUsers,
  useEventParticipants,
} from "@/hooks/spacetimeHooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpacetimeDB } from "spacetimedb/react";
import { Separator } from "@/components/ui/separator";

export default function GroupPlanner() {
  const { groupId } = useParams();
  const { identity } = useSpacetimeDB();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;

  const events = useEvents();
  const subEvents = useSubEvents();
  const groups = useGroups();
  const memberships = useGroupMemberships();
  const users = useUsers();
  const eventParticipants = useEventParticipants();
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    groupIdBigInt ? new Set([groupIdBigInt.toString()]) : new Set()
  );
  const [selectedUserIdentity, setSelectedUserIdentity] = useState<string>("all");
  const [showAllGroups, setShowAllGroups] = useState(!groupIdBigInt);

  const currentIdentityHex = identity?.toHexString() ?? "";

  const hasAdminAccess = useMemo(() => {
    if (!currentIdentityHex) return false;

    return groups.some((group) => {
      const isCeo = group.ceoIdentity.toHexString() === currentIdentityHex;
      const membership = memberships.find(
        (m) =>
          m.groupId === group.groupId &&
          m.userIdentity.toHexString() === currentIdentityHex
      );

      if (!membership) return isCeo;
      return (
        isCeo ||
        membership.permissionLevel.tag === "Staff" ||
        membership.permissionLevel.tag === "CEO"
      );
    });
  }, [groups, memberships, currentIdentityHex]);

  const staffForSelectedGroups = useMemo(() => {
    const selectedGroupSet = selectedGroupIds;
    
    const staffByIdentity = new Map<
      string,
      { displayName: string; callsign?: string; groupTags: Set<string> }
    >();

    if (selectedGroupSet.size === 0) return [];

    memberships
      .filter((m) => selectedGroupSet.has(m.groupId.toString()))
      .forEach((membership) => {
        const hex = membership.userIdentity.toHexString();
        const user = users.find((u) => u.identity.toHexString() === hex);
        const group = groups.find((g) => g.groupId === membership.groupId);
        const existing = staffByIdentity.get(hex);

        if (existing) {
          if (group?.tag) existing.groupTags.add(group.tag);
          return;
        }

        staffByIdentity.set(hex, {
          displayName: user?.displayName || `${hex.slice(0, 10)}...`,
          callsign: user?.ifcCallsignPrefix || undefined,
          groupTags: new Set(group?.tag ? [group.tag] : []),
        });
      });

    groups.forEach((group) => {
      const ceoHex = group.ceoIdentity.toHexString();
      if (selectedGroupSet.has(group.groupId.toString())) {
        const user = users.find((u) => u.identity.toHexString() === ceoHex);
        if (!staffByIdentity.has(ceoHex)) {
          staffByIdentity.set(ceoHex, {
            displayName: user?.displayName || `${ceoHex.slice(0, 10)}...`,
            callsign: user?.ifcCallsignPrefix || undefined,
            groupTags: new Set(group.tag ? [group.tag] : []),
          });
        } else {
          const existing = staffByIdentity.get(ceoHex);
          if (existing && group.tag) existing.groupTags.add(group.tag);
        }
      }
    });

    return [...staffByIdentity.entries()]
      .map(([hex, data]) => ({
        hex,
        displayName: data.displayName,
        callsign: data.callsign,
        groupTags: [...data.groupTags].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [selectedGroupIds, memberships, users, groups]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let result = events;
    if (selectedGroupIds.size > 0) {
      const groupSet = selectedGroupIds;

      result = result.filter((event) => {
        const isCreator = groupSet.has(event.creatorGroupId.toString());

        if (isCreator) return true;

        const isParticipant = eventParticipants.some(
          (p) =>
            groupSet.has(p.groupId.toString()) &&
            p.eventId === event.eventId &&
            p.status.tag === "Accepted"
        );

        return isParticipant;
      });
    }

    if (selectedUserIdentity !== "all") {
      const subEventsForUser = subEvents.filter(
        (se) => se.eventLead?.toHexString() === selectedUserIdentity
      );
      const eventIdsWithUserLead = new Set(
        subEventsForUser.map((se) => se.eventId.toString())
      );

      result = result.filter((event) =>
        eventIdsWithUserLead.has(event.eventId.toString())
      );
    }

    return result;
  }, [events, selectedGroupIds, selectedUserIdentity, subEvents, eventParticipants]);

  const filteredSubEvents = useMemo(() => {
    if (!subEvents) return [];

    const eventIdsSet = new Set(filteredEvents.map((e) => e.eventId.toString()));
    let result = subEvents.filter((se) => eventIdsSet.has(se.eventId.toString()));

    if (selectedUserIdentity !== "all") {
      result = result.filter(
        (se) => se.eventLead?.toHexString() === selectedUserIdentity
      );
    }

    return result;
  }, [subEvents, filteredEvents, selectedUserIdentity]);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllGroups = () => {
    setSelectedGroupIds(new Set(groups.map((g) => g.groupId.toString())));
  };

  const clearAllGroups = () => {
    setSelectedGroupIds(new Set());
  };

  const isLoading = !events || !subEvents || !groups;

  if (!identity) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          You need Admin or Staff permissions to use the planner.
        </p>
      </div>
    );
  }

  const displayGroups = showAllGroups
    ? groups
    : groups.filter((g) => selectedGroupIds.has(g.groupId.toString()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Group Planner</h1>
          <p className="text-sm text-muted-foreground">
            Cross-group calendar with VA assignment visibility
          </p>
        </div>
        <Badge variant="outline">
          {selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? "s" : ""}{" "}
          selected
        </Badge>
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Groups</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllGroups(!showAllGroups)}
            >
              {showAllGroups ? "Hide" : "Show"} all ({groups.length})
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {displayGroups.map((group) => {
              const id = group.groupId.toString();
              const selected = selectedGroupIds.has(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleGroup(id)}
                  />
                  <span className="text-sm">
                    {group.tag ? `[${group.tag}] ` : ""}
                    {group.name}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={selectAllGroups}>
              <Layers className="h-4 w-4 mr-2" />
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllGroups}>
              Clear
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Filter by VA / Staff</p>
          <Select
            value={selectedUserIdentity}
            onValueChange={setSelectedUserIdentity}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="All staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All staff
                </div>
              </SelectItem>
              {staffForSelectedGroups.map((staff) => (
                <SelectItem key={staff.hex} value={staff.hex}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    {staff.callsign ? `[${staff.callsign}] ` : ""}
                    {staff.displayName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUserIdentity !== "all" && (
            <p className="text-xs text-muted-foreground">
              Showing events where this VA is assigned as lead
            </p>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Calendar events={filteredEvents} subEvents={filteredSubEvents} />
      )}
    </div>
  );
}
