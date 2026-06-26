import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Infer } from "spacetimedb";
import { LiveChatMessage } from "@/module_bindings";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  useEvents,
  useGroupMemberships,
  useGroups,
  useLiveChatMessages,
  useOnlineAttendingUsers,
  useUsers,
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
import { Crown, Pencil, Trash2 } from "lucide-react";
import { formatInTimezone, useUserTimezone } from "@/utils/timezoneUtils";
import { OnlineUsersBadge } from "./OnlineUsersBadge";

type ChatMessage = Infer<typeof LiveChatMessage>;

interface LiveChatPanelProps {
  eventId: string;
  isMobileView?: boolean;
}

export const LiveChatPanel = ({
  eventId,
  isMobileView = false,
}: LiveChatPanelProps) => {
  const { identity, getConnection } = useSpacetimeDB();
  const connection = getConnection();
  const chatMessages = useLiveChatMessages();
  const users = useUsers();
  const groups = useGroups();
  const groupMembers = useGroupMemberships();
  const events = useEvents();
  const userTimezone = useUserTimezone();

  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const event = useMemo(
    () => events.find((e) => e.eventId.toString() === eventId),
    [events, eventId]
  );

  const eventIdBigInt = useMemo(() => {
    try {
      return BigInt(eventId);
    } catch {
      return null;
    }
  }, [eventId]);

  const { count: onlineUsersCount, users: onlineUsers } =
    useOnlineAttendingUsers(eventIdBigInt);

  const userGroups = useMemo(() => {
    if (!identity) return [];

    const userMemberships = groupMembers.filter(
      (member) => member.userIdentity.toHexString() === identity.toHexString()
    );

    return groups.filter((group) =>
      userMemberships.some((membership) => membership.groupId === group.groupId)
    );
  }, [identity, groupMembers, groups]);

  const isUserPartOfHostGroup = useMemo(() => {
    if (!event) return false;
    return userGroups.some((group) => group.groupId === event.creatorGroupId);
  }, [userGroups, event]);

  useEffect(() => {
    if (userGroups.length > 0 && !selectedGroupId) {
      if (event && isUserPartOfHostGroup) {
        setSelectedGroupId(event.creatorGroupId.toString());
      } else {
        setSelectedGroupId(userGroups[0].groupId.toString());
      }
    }
  }, [userGroups, selectedGroupId, event, isUserPartOfHostGroup]);

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

  const eventMessages = useMemo(() => {
    return chatMessages
      .filter((msg) => msg.eventId.toString() === eventId)
      .sort(
        (a, b) =>
          a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      );
  }, [chatMessages, eventId]);

  const groupedMessages = useMemo(() => {
    const result: {
      sender: string;
      groupId: string;
      messages: ChatMessage[];
    }[] = [];

    eventMessages.forEach((message) => {
      const senderId = message.sender.toHexString();
      const messageGroupId = message.groupId.toString();
      const lastGroup = result[result.length - 1];

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
        result.push({
          sender: senderId,
          groupId: messageGroupId,
          messages: [message],
        });
      }
    });

    return result;
  }, [eventMessages]);

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

  const virtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => chatContainerRef.current,
    estimateSize,
    overscan: 5,
  });

  useEffect(() => {
    if (groupedMessages.length > 0) {
      virtualizer.scrollToIndex(groupedMessages.length - 1, { align: "end" });
    }
  }, [groupedMessages.length, virtualizer]);

  const groupMap = useMemo(() => {
    const map = new Map<string, (typeof groups)[number]>();
    groups.forEach((group) => {
      map.set(group.groupId.toString(), group);
    });
    return map;
  }, [groups]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedGroupId) return;

    if (editingMessage) {
      connection?.reducers.editLiveChatMessage({
        messageId: editingMessage.messageId,
        newMessage,
      });
      setEditingMessage(null);
    } else {
      connection?.reducers.addLiveChatMessage({
        groupId: BigInt(selectedGroupId),
        eventId: BigInt(eventId),
        message: newMessage,
      });
    }

    setNewMessage("");
  };

  const handleDeleteMessage = (messageId: bigint) => {
    connection?.reducers.deleteLiveChatMessage({ messageId });
  };

  const handleEditMessage = (message: ChatMessage) => {
    setEditingMessage(message);
    setNewMessage(message.message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  const getUserAndGroupInfo = (message: ChatMessage) => {
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

  return (
    <>
      <div
        className={`p-4 border-b flex justify-between items-center ${isMobileView ? "flex-col gap-2" : ""}`}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Live Chat</h2>
          <OnlineUsersBadge count={onlineUsersCount} users={onlineUsers} />
        </div>

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
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 touch-pan-y"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
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
                ref={virtualizer.measureElement}
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
};
