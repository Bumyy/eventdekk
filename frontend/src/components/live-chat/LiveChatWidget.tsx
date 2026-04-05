import { useMemo, useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useEvents, useLiveChatMessages, useUsers, useGroupMemberships, useAllActiveEvents } from "@/hooks/spacetimeHooks";
import { MessageCircle, X } from "lucide-react";
import { useLiveEventContext } from "@/contexts/LiveEventContext";
import { useSpacetimeDB } from "spacetimedb/react";
import { LiveChatPanel } from "./LiveChatPanel";
import { toUserTimezoneDate } from "@/utils/timezoneUtils";

const STORAGE_KEY_PREFIX = "eventdekk_chat_seen_";

const isEventLive = (event: { startTime: { toDate: () => Date }; endTime: { toDate: () => Date } }) => {
  const now = new Date();
  const startDate = toUserTimezoneDate(event.startTime);
  const endDate = toUserTimezoneDate(event.endTime);
  return now >= startDate && now < endDate;
};

export const LiveChatWidget = () => {
  const location = useLocation();
  const { currentEventId, isWidgetOpen, setIsWidgetOpen, clearCurrentEvent } = useLiveEventContext();
  const { identity } = useSpacetimeDB();
  const events = useEvents();
  const users = useUsers();
  const chatMessages = useLiveChatMessages();
  const memberships = useGroupMemberships();
  const activeEvents = useAllActiveEvents();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  const userGroupIds = useMemo(() => {
    if (!identity) return new Set<bigint>();
    return new Set(
      memberships
        .filter((m) => m.userIdentity.toHexString() === identity.toHexString())
        .map((m) => m.groupId)
    );
  }, [identity, memberships]);

  const hasLiveEventInUsersGroup = useMemo(() => {
    if (!identity || userGroupIds.size === 0) return false;
    const liveEvents = activeEvents.filter(isEventLive);
    return liveEvents.some((event) => userGroupIds.has(event.creatorGroupId));
  }, [identity, userGroupIds, activeEvents]);

  const currentEvent = useMemo(
    () => events.find((e) => e.eventId.toString() === currentEventId),
    [events, currentEventId]
  );

  const isEventFinished = useMemo(() => {
    if (!currentEvent) return false;
    const endTime = currentEvent.endTime.toDate();
    return endTime.getTime() < Date.now();
  }, [currentEvent]);

  useEffect(() => {
    if (currentEventId && isEventFinished) {
      clearCurrentEvent();
    }
  }, [currentEventId, isEventFinished, clearCurrentEvent]);

  const eventMessages = useMemo(() => {
    if (!currentEventId) return [];
    return chatMessages
      .filter((msg) => msg.eventId.toString() === currentEventId)
      .sort(
        (a, b) =>
          a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      );
  }, [chatMessages, currentEventId]);

  useEffect(() => {
    if (!currentEventId || !identity) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${currentEventId}_${identity.toHexString()}`;
    
    if (!isInitializedRef.current) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          lastSeenRef.current = parsed.lastSeenCount || 0;
          setUnreadCount(parsed.unreadCount || 0);
        } catch {
          lastSeenRef.current = 0;
          setUnreadCount(0);
        }
      }
      isInitializedRef.current = true;
    }

    if (isWidgetOpen) {
      lastSeenRef.current = eventMessages.length;
      setUnreadCount(0);
      localStorage.setItem(storageKey, JSON.stringify({
        lastSeenCount: eventMessages.length,
        unreadCount: 0
      }));
      return;
    }

    if (eventMessages.length <= lastSeenRef.current) return;

    const newMessages = eventMessages.slice(lastSeenRef.current);
    const incoming = newMessages.filter(
      (msg) => msg.sender.toHexString() !== identity.toHexString()
    ).length;

    if (incoming > 0) {
      const newUnread = unreadCount + incoming;
      setUnreadCount(newUnread);
      localStorage.setItem(storageKey, JSON.stringify({
        lastSeenCount: eventMessages.length,
        unreadCount: newUnread
      }));
    }
    
    lastSeenRef.current = eventMessages.length;
  }, [eventMessages, isWidgetOpen, identity, currentEventId, unreadCount]);

  useEffect(() => {
    if (!currentEventId) return;
    return () => {
      isInitializedRef.current = false;
    };
  }, [currentEventId]);

  const isOnLiveEventPage = location.pathname.startsWith("/live-event/");

  if (!identity ||!hasLiveEventInUsersGroup || !currentEventId || isEventFinished || isOnLiveEventPage) return null;

  return (
    <>
      {isWidgetOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsWidgetOpen(false)}
        />
      )}
      
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
        {isWidgetOpen && (
          <div className="w-[420px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100dvh-6rem)] bg-card rounded-xl shadow-xl border overflow-hidden flex flex-col">
            <div className="h-11 px-3 border-b flex items-center justify-between bg-card/95">
              <span className="font-medium text-sm truncate">{currentEvent?.name}</span>
              <button
                onClick={() => setIsWidgetOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>
            <LiveChatPanel eventId={currentEventId} />
          </div>
        )}

        <button
          onClick={() => setIsWidgetOpen(!isWidgetOpen)}
          className={`relative h-12 w-12 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
            isWidgetOpen 
              ? "bg-muted text-foreground" 
              : "bg-primary text-primary-foreground"
          }`}
          aria-label={isWidgetOpen ? "Close chat" : "Open chat"}
        >
          {isWidgetOpen ? (
            <X size={22} />
          ) : (
            <MessageCircle size={22} />
          )}
          
          {!isWidgetOpen && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
};