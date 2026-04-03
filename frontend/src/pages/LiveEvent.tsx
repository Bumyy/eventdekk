import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams } from "react-router-dom";
import { Infer } from "spacetimedb";
import { LiveChatMessage } from "@/module_bindings";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  useLiveChatMessages,
  useUsers,
  useGroups,
  useGroupMemberships,
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
import {
  ApiFlight,
  useEventFlightFiltering,
} from "@/hooks/useEventFlightFiltering";
import "leaflet/dist/leaflet.css";
import { useUserTimezone, formatInTimezone } from "@/utils/timezoneUtils";

type LiveChatMessage = Infer<typeof LiveChatMessage>;

const LiveEvent = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { identity, getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const chatMessages = useLiveChatMessages();
  const users = useUsers();
  const groups = useGroups();
  const groupMembers = useGroupMemberships();
  const userTimezone = useUserTimezone();

  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState<LiveChatMessage | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [flights, setFlights] = useState<ApiFlight[]>([]);
  const [flightLoadingError, setFlightLoadingError] = useState<string | null>(
    null
  );
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number>(() =>
    typeof window !== "undefined"
      ? (window.visualViewport?.height ?? window.innerHeight)
      : 0
  );
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const NAV_HEIGHT = 56;
  const SHEET_HEIGHTS = useMemo(() => {
    const expanded = Math.max(320, mobileViewportHeight - NAV_HEIGHT);
    const partial = Math.min(380, Math.max(220, Math.round(expanded * 0.6)));
    return { collapsed: 60, partial, expanded };
  }, [mobileViewportHeight]);

  const handleSheetDragStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartY.current = clientY;
      dragStartHeight.current = sheetHeight ?? SHEET_HEIGHTS.partial;
      setIsDragging(true);
    },
    [sheetHeight, SHEET_HEIGHTS]
  );

  const handleSheetDragMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging) return;
      const clientY =
        "touches" in e
          ? (e as TouchEvent).touches[0].clientY
          : (e as MouseEvent).clientY;
      const delta = dragStartY.current - clientY;
      const newHeight = Math.max(
        SHEET_HEIGHTS.collapsed,
        Math.min(SHEET_HEIGHTS.expanded, dragStartHeight.current + delta)
      );
      setSheetHeight(newHeight);
    },
    [isDragging, SHEET_HEIGHTS]
  );

  const handleSheetDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (sheetHeight !== null) {
      const collapsedToPartial =
        (SHEET_HEIGHTS.collapsed + SHEET_HEIGHTS.partial) / 2;
      const partialToExpanded =
        (SHEET_HEIGHTS.partial + SHEET_HEIGHTS.expanded) / 2;

      if (sheetHeight < collapsedToPartial) {
        setSheetHeight(SHEET_HEIGHTS.collapsed);
      } else if (sheetHeight < partialToExpanded) {
        setSheetHeight(SHEET_HEIGHTS.partial);
      } else {
        setSheetHeight(SHEET_HEIGHTS.expanded);
      }
    }
  }, [isDragging, sheetHeight, SHEET_HEIGHTS]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("touchmove", handleSheetDragMove);
    window.addEventListener("touchend", handleSheetDragEnd);
    window.addEventListener("mousemove", handleSheetDragMove);
    window.addEventListener("mouseup", handleSheetDragEnd);
    return () => {
      window.removeEventListener("touchmove", handleSheetDragMove);
      window.removeEventListener("touchend", handleSheetDragEnd);
      window.removeEventListener("mousemove", handleSheetDragMove);
      window.removeEventListener("mouseup", handleSheetDragEnd);
    };
  }, [isDragging, handleSheetDragMove, handleSheetDragEnd]);

  useEffect(() => {
    if (!isMobile) return;

    const updateMobileViewportMetrics = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const nextKeyboardInset = Math.max(
        0,
        window.innerHeight - viewportHeight - viewportOffsetTop
      );

      setMobileViewportHeight(viewportHeight);
      setKeyboardInset(nextKeyboardInset);
    };

    updateMobileViewportMetrics();

    window.addEventListener("resize", updateMobileViewportMetrics);
    window.addEventListener("orientationchange", updateMobileViewportMetrics);
    window.visualViewport?.addEventListener("resize", updateMobileViewportMetrics);
    window.visualViewport?.addEventListener("scroll", updateMobileViewportMetrics);

    return () => {
      window.removeEventListener("resize", updateMobileViewportMetrics);
      window.removeEventListener("orientationchange", updateMobileViewportMetrics);
      window.visualViewport?.removeEventListener(
        "resize",
        updateMobileViewportMetrics
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        updateMobileViewportMetrics
      );
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && sheetHeight === null) {
      setSheetHeight(SHEET_HEIGHTS.partial);
    }
  }, [isMobile, sheetHeight, SHEET_HEIGHTS]);

  useEffect(() => {
    if (!isMobile || sheetHeight === null) return;
    if (sheetHeight > SHEET_HEIGHTS.expanded) {
      setSheetHeight(SHEET_HEIGHTS.expanded);
    }
  }, [isMobile, sheetHeight, SHEET_HEIGHTS]);

  const {
    event,
    eventSubEvents,
    eventFlightSignups,
    groupMap,
    filteredFlights,
  } = useEventFlightFiltering(eventId, flights);

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

  // Estimate size for each message group (base height + height per message)
  const estimateSize = useCallback(
    (index: number) => {
      const group = groupedMessages[index];
      if (!group) return 80;
      const baseHeight = 60;
      const messageHeight = 22;
      return baseHeight + group.messages.length * messageHeight;
    },
    [groupedMessages]
  );

  const mobileChatContainerRef = useRef<HTMLDivElement>(null);

  // Virtualizer for chat messages
  const virtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => chatContainerRef.current,
    estimateSize,
    overscan: 5,
  });

  const mobileVirtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => mobileChatContainerRef.current,
    estimateSize,
    overscan: 5,
  });

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (groupedMessages.length > 0) {
      virtualizer.scrollToIndex(groupedMessages.length - 1, { align: "end" });
      mobileVirtualizer.scrollToIndex(groupedMessages.length - 1, {
        align: "end",
      });
    }
  }, [groupedMessages.length]);

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
        groupId: BigInt(selectedGroupId),
        eventId: BigInt(eventId!),
        message: newMessage,
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
        online: user?.online || false,
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

  // Chat content renderer
  const renderChatContent = (isMobileView = false) => (
    <>
      {/* Chat Title Area */}
      <div
        className={`p-4 border-b flex justify-between items-center ${isMobileView ? "flex-col gap-2" : ""}`}
      >
        <h2 className="text-xl font-bold">Live Chat</h2>

        {/* Group Selector */}
        {userGroups.length > 1 ? (
          <Select
            value={selectedGroupId || undefined}
            onValueChange={(value) => setSelectedGroupId(value)}
          >
            <SelectTrigger className={isMobileView ? "w-full" : "w-[180px]"}>
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

      <div
        ref={isMobileView ? mobileChatContainerRef : chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 touch-pan-y"
      >
        <div
          style={{
            height: `${(isMobileView ? mobileVirtualizer : virtualizer).getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {(isMobileView ? mobileVirtualizer : virtualizer)
            .getVirtualItems()
            .map((virtualItem) => {
              const group = groupedMessages[virtualItem.index];
              const firstMessage = group.messages[0];
              const {
                user,
                group: messageGroup,
                isHost,
              } = getUserAndGroupInfo(firstMessage);
              const isCurrentUser = group.sender === identity?.toHexString();

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  data-index={virtualItem.index}
                  ref={
                    (isMobileView ? mobileVirtualizer : virtualizer)
                      .measureElement
                  }
                  className="pb-6"
                >
                  <div className="flex items-start space-x-2">
                    <div className="relative">
                      <Avatar className="h-10 w-10 mt-0.5 flex-shrink-0">
                        <AvatarImage src={user.profilePicture} />
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {user.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1 flex-wrap">
                        <span className="font-semibold text-sm mr-2">
                          {user.name}
                        </span>

                        <span
                          className="text-xs rounded-full pl-0.5 pr-1 py-0.5 flex items-center mr-2"
                          style={{
                            backgroundColor: `${messageGroup.color}20`,
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
                          {formatInTimezone(
                            firstMessage.timestamp,
                            userTimezone,
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {group.messages.map((message) => (
                          <div
                            key={message.messageId.toString()}
                            className="group relative"
                          >
                            <p className="text-sm break-words whitespace-pre-wrap">
                              {message.message}
                            </p>

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
                </div>
              );
            })}
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                ? `Message as ${selectedGroupInfo.tag || selectedGroupInfo.name}`
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
    </>
  );

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-[calc(100dvh-56px)] overflow-hidden">
        {/* Left side - Map Section */}
        <div className="w-2/3 flex flex-col h-full border-r">
          <div className="px-4 py-5 border-b flex justify-between items-center">
            <h1 className="text-xl font-bold">{event.name}</h1>
            {flightLoadingError && (
              <div className="text-xs text-destructive">
                Flight data error: {flightLoadingError}
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-50 dark:bg-background">
            <EventMap
              subEvents={eventSubEvents}
              flightSignups={eventFlightSignups}
              eventId={eventId}
              creatorGroupId={event.creatorGroupId}
              groupMap={groupMap}
              flights={filteredFlights}
              className="w-full h-full z-0"
            />
          </div>
        </div>

        {/* Right side - Chat Section */}
        <div className="w-1/3 flex flex-col h-full">
          {renderChatContent()}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden fixed left-0 right-0 top-14 bottom-0 overflow-hidden">
        {/* Full-screen Map */}
        <div className="absolute inset-0 bg-gray-50 dark:bg-background">
          <EventMap
            subEvents={eventSubEvents}
            flightSignups={eventFlightSignups}
            eventId={eventId}
            creatorGroupId={event.creatorGroupId}
            groupMap={groupMap}
            flights={filteredFlights}
            className="w-full h-full"
          />
        </div>

        {/* Event name overlay */}
        <div className="absolute top-3 left-3 z-10 max-w-[70%] rounded-md bg-background/70 backdrop-blur-sm px-3 py-2 pointer-events-none">
          <h1 className="text-sm font-semibold truncate">{event.name}</h1>
          {flightLoadingError && (
            <div className="text-[10px] text-destructive mt-1 truncate">
              {flightLoadingError}
            </div>
          )}
        </div>

        {/* Bottom Sheet for Chat */}
        <div
          ref={sheetRef}
          className="absolute left-0 right-0 bottom-0 bg-background border-t rounded-t-2xl shadow-lg z-20 flex flex-col"
          style={{
            height: sheetHeight ?? SHEET_HEIGHTS.collapsed,
            bottom: keyboardInset,
            transition: isDragging ? "none" : "height 0.2s ease-out",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div
              className="h-8 w-24 cursor-grab touch-none select-none flex items-center justify-center"
              onMouseDown={handleSheetDragStart}
              onTouchStart={handleSheetDragStart}
            >
              <div className="w-14 h-1.5 bg-muted-foreground/40 rounded-full" />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {renderChatContent(true)}
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveEvent;
