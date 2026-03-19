import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Infer } from "spacetimedb";
import { LiveChatMessage, Group } from "@/module_bindings";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  useEvents,
  useLiveChatMessages,
  useUsers,
  useGroups,
  useGroupMemberships,
  useSubEvents,
  useFlightSignups,
} from "@/hooks/spacetimeHooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, Trash2, Crown } from "lucide-react";
import EventMap from "@/components/map/EventMap";
import "leaflet/dist/leaflet.css";
import { useUserTimezone, formatInTimezone } from "@/utils/timezoneUtils";

type LiveChatMessage = Infer<typeof LiveChatMessage>;
type Group = Infer<typeof Group>;

// Flight type definition
interface Flight {
  flight_id: string;
  callsign: string;
  aircraft_id: string;
  livery_id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  ground_speed: number;
  last_updated: string;
}

const LiveEvent = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { identity, getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const events = useEvents();
  const chatMessages = useLiveChatMessages();
  const users = useUsers();
  const groups = useGroups();
  const groupMembers = useGroupMemberships();
  const allSubEvents = useSubEvents();
  const allFlightSignups = useFlightSignups();
  const userTimezone = useUserTimezone();

  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState<LiveChatMessage | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightLoadingError, setFlightLoadingError] = useState<string | null>(
    null
  );

  // Find the current event
  const event = events.find((e) => e.eventId.toString() === eventId);

  // Filter subEvents related to this event
  const subEvents = useMemo(() => {
    if (!eventId) return [];
    return allSubEvents.filter(
      (subEvent) => subEvent.eventId.toString() === eventId
    );
  }, [allSubEvents, eventId]);

  // Filter flight signups related to this event's subEvents
  const flightSignups = useMemo(() => {
    const subEventIds = subEvents.map((se) => se.subEventId);
    return allFlightSignups.filter((signup) =>
      subEventIds.includes(signup.subEventId)
    );
  }, [allFlightSignups, subEvents]);

  // Get user's groups and check if they're part of the host group
  const userGroups = useMemo(() => {
    if (!identity || !event) return [];

    const userMemberships = groupMembers.filter(
      (member) => member.userIdentity.toHexString() === identity.toHexString()
    );

    return groups.filter((group) =>
      userMemberships.some((membership) => membership.groupId === group.groupId)
    );
  }, [identity, groupMembers, groups, event]);

  // Check if user is part of host group
  const isUserPartOfHostGroup = useMemo(() => {
    if (!identity || !event) return false;

    return userGroups.some((group) => group.groupId === event.creatorGroupId);
  }, [identity, userGroups, event]);

  // Set default selected group when userGroups loads
  // Prioritize host group if user is a member
  useEffect(() => {
    if (userGroups.length > 0 && !selectedGroupId) {
      // If user is part of the host group, select that one by default
      if (event && isUserPartOfHostGroup) {
        setSelectedGroupId(event.creatorGroupId.toString());
      } else {
        // Otherwise select the first available group
        setSelectedGroupId(userGroups[0].groupId.toString());
      }
    }
  }, [userGroups, selectedGroupId, event, isUserPartOfHostGroup]);

  // Get currently selected group info for display
  const selectedGroupInfo = useMemo(() => {
    if (!selectedGroupId) return null;
    const group = groups.find((g) => g.groupId.toString() === selectedGroupId);
    return group
      ? {
          name: group.name,
          logo: group.logoUrl,
          tag: group.tag,
        }
      : null;
  }, [selectedGroupId, groups]);

  // Create a map of group IDs to group info for efficient lookup
  const groupMap = useMemo(() => {
    const map = new Map<string, Group>(); // Store the full Group object
    groups.forEach((group) => {
      map.set(group.groupId.toString(), group);
    });
    return map;
  }, [groups]);

  // Filter messages for this event and sort by timestamp
  const eventMessages = useMemo(() => {
    return chatMessages
      .filter((msg) => msg.eventId.toString() === eventId)
      .sort(
        (a, b) =>
          a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      );
  }, [chatMessages, eventId]);

  // Group messages by sender, group, and adjacent timestamps
  const groupedMessages = useMemo(() => {
    const groups: {
      sender: string;
      groupId: string;
      messages: LiveChatMessage[];
    }[] = [];

    eventMessages.forEach((message) => {
      const senderId = message.sender.toHexString();
      const messageGroupId = message.groupId.toString();
      const lastGroup = groups[groups.length - 1];

      // Check if we should add to existing group (same sender, same group, and within 5 minutes)
      if (
        lastGroup &&
        lastGroup.sender === senderId &&
        lastGroup.groupId === messageGroupId &&
        message.timestamp.toDate().getTime() -
          lastGroup.messages[lastGroup.messages.length - 1].timestamp
            .toDate()
            .getTime() <
          5 * 60 * 1000
      ) {
        lastGroup.messages.push(message);
      } else {
        // Create new group
        groups.push({
          sender: senderId,
          groupId: messageGroupId,
          messages: [message],
        });
      }
    });

    return groups;
  }, [eventMessages]);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [eventMessages.length]);

  // Fetch flight data from API
  const fetchFlightData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/flights`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data.flights) {
        setFlights(data.data.flights);
        setFlightLoadingError(null);
      } else {
        throw new Error("Invalid data format received from API");
      }
    } catch (error) {
      console.error("Error fetching flight data:", error);
      setFlightLoadingError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  // Fetch flight data periodically
  useEffect(() => {
    // Initial fetch
    fetchFlightData();

    // Set up interval for refreshing flight data (every 3 seconds for smoother animation)
    const intervalId = setInterval(fetchFlightData, 5000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle sending a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !event || !selectedGroupId) return;

    if (editingMessage) {
      // Edit existing message
      connection?.reducers.editLiveChatMessage({
        messageId: editingMessage.messageId,
        newMessage,
      });
      setEditingMessage(null);
    } else {
      // Create new message using the selected group
      connection?.reducers.addLiveChatMessage({
        selectedGroupId: BigInt(selectedGroupId),
        eventId: BigInt(eventId!),
        newMessage,
      });
    }

    setNewMessage("");
  };

  // Handle message deletion
  const handleDeleteMessage = (messageId: bigint) => {
    connection?.reducers.deleteLiveChatMessage(messageId);
  };

  // Handle message editing
  const handleEditMessage = (message: LiveChatMessage) => {
    setEditingMessage(message);
    setNewMessage(message.message);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  // Get user and group info
  const getUserAndGroupInfo = (message: LiveChatMessage) => {
    const user = users.find(
      (u) => u.identity.toHexString() === message.sender.toHexString()
    );
    const group = groupMap.get(message.groupId.toString());
    const isHost = message.groupId === event?.creatorGroupId;

    return {
      user: {
        name: user?.displayName || "Unknown User",
        profilePicture: user?.ifcProfileUrl || undefined,
      },
      group: {
        tag: group?.tag || "...",
        logo: group?.logoUrl || undefined,
        color: group?.color || "#000000",
      },
      isHost,
    };
  };

  if (!event) {
    return <div className="p-4">Event not found</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left side - Map Section */}
      <div className="w-2/3 flex flex-col h-full border-r">
        {/* Map Title Area */}
        <div className="px-4 py-5 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold">{event.name}</h1>
          {flightLoadingError && (
            <div className="text-xs text-destructive">
              Flight data error: {flightLoadingError}
            </div>
          )}
        </div>

        {/* Map Content Area */}
        <div className="flex-1 bg-gray-50 dark:bg-background">
          {" "}
          {/* Adjusted background for dark theme */}
          <EventMap
            subEvents={subEvents}
            flightSignups={flightSignups}
            eventId={eventId}
            creatorGroupId={event.creatorGroupId} // Pass creator group ID
            groupMap={groupMap} // Pass the group map
            flights={flights} // Pass flights data to the map
            className="w-full h-full z-0"
          />
        </div>
      </div>

      {/* Right side - Chat Section */}
      <div className="w-1/3 flex flex-col h-full">
        {/* Chat Title Area */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Live Chat</h2>

          {/* Only show Group Selector if user is part of multiple groups */}
          {userGroups.length > 1 ? (
            <Select
              value={selectedGroupId || undefined}
              onValueChange={(value) => setSelectedGroupId(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {userGroups.map((group) => (
                  <SelectItem
                    key={group.groupId.toString()}
                    value={group.groupId.toString()}
                  >
                    <div className="flex items-center gap-2">
                      {group.logoUrl && (
                        <img
                          src={group.logoUrl}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            // If only one group, show a badge with the group name
            selectedGroupInfo && (
              <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm">
                {selectedGroupInfo.logo && (
                  <img
                    src={selectedGroupInfo.logo}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>Chatting as {selectedGroupInfo.name}</span>
              </div>
            )
          )}
        </div>

        {/* Chat messages - Discord style */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-6"
        >
          {groupedMessages.map((group, groupIndex) => {
            const firstMessage = group.messages[0];
            const {
              user,
              group: messageGroup,
              isHost,
            } = getUserAndGroupInfo(firstMessage);
            const isCurrentUser = group.sender === identity?.toHexString();

            return (
              <div key={groupIndex} className="flex items-start space-x-2">
                <Avatar className="h-10 w-10 mt-0.5 flex-shrink-0">
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback>
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Username, Group, and timestamp */}
                  <div className="flex items-center mb-1 flex-wrap">
                    <span className="font-semibold text-sm mr-2">
                      {user.name}
                    </span>

                    {/* Group badge with logo */}
                    <span
                      className="text-xs rounded-full pl-0.5 pr-1 py-0.5 flex items-center mr-2"
                      style={{
                        backgroundColor: `${messageGroup.color}20`, // Adding transparency
                        color: messageGroup.color,
                      }}
                    >
                      {messageGroup.logo && (
                        <img
                          src={messageGroup.logo}
                          alt=""
                          className="w-4 h-4 rounded-full mr-0.5"
                        />
                      )}
                      {messageGroup.tag}
                    </span>

                    {/* Host badge */}
                    {isHost && (
                      <span
                        className="text-xs text-amber-500 flex items-center mr-2"
                        title="Event Host"
                      >
                        <Crown size={12} className="mr-0.5" />
                        Host
                      </span>
                    )}

                    <span className="text-xs text-muted-foreground">
                      {formatInTimezone(firstMessage.timestamp, userTimezone, {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="space-y-1">
                    {group.messages.map((message) => (
                      <div
                        key={message.messageId.toString()}
                        className="group relative"
                      >
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {message.message}
                        </p>

                        {/* Edit/Delete controls with Lucide icons */}
                        {isCurrentUser && (
                          <div className="absolute -right-2 -top-1 hidden group-hover:flex bg-background/90 rounded px-1 py-0.5 shadow-sm items-center gap-1">
                            <button
                              onClick={() => handleEditMessage(message)}
                              className="text-blue-500 hover:text-blue-600 p-0.5 rounded-sm hover:bg-blue-100/30"
                              title="Edit message"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMessage(message.messageId)
                              }
                              className="text-destructive hover:text-destructive/90 p-0.5 rounded-sm hover:bg-red-100/30"
                              title="Delete message"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message input */}
        <div className="p-4 border-t">
          {editingMessage && (
            <div className="bg-muted p-2 mb-2 rounded-md text-sm flex justify-between items-center">
              <span>Editing message</span>
              <button
                onClick={handleCancelEdit}
                className="text-destructive hover:text-destructive/90 text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                selectedGroupInfo
                  ? `Message as ${
                      selectedGroupInfo.tag || selectedGroupInfo.name
                    }`
                  : "Select a group to chat"
              }
              className="flex-1"
              disabled={!selectedGroupId}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              className="shrink-0"
              disabled={!selectedGroupId}
            >
              {editingMessage ? "Update" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveEvent;
