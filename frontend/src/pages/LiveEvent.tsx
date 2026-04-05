import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import EventMap from "@/components/map/EventMap";
import { LiveChatPanel } from "@/components/live-chat";
import {
  ApiFlight,
  useEventFlightFiltering,
} from "@/hooks/useEventFlightFiltering";
import "leaflet/dist/leaflet.css";
import { useLiveEventContext } from "@/contexts/LiveEventContext";

const LiveEvent = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { setCurrentEventId } = useLiveEventContext();

  useEffect(() => {
    if (eventId) {
      setCurrentEventId(eventId);
    }
  }, [eventId, setCurrentEventId]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const [flights, setFlights] = useState<ApiFlight[]>([]);
  const [flightLoadingError, setFlightLoadingError] = useState<string | null>(
    null
  );
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number>(
    () =>
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
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
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
    window.visualViewport?.addEventListener(
      "resize",
      updateMobileViewportMetrics
    );
    window.visualViewport?.addEventListener(
      "scroll",
      updateMobileViewportMetrics
    );

    return () => {
      window.removeEventListener("resize", updateMobileViewportMetrics);
      window.removeEventListener(
        "orientationchange",
        updateMobileViewportMetrics
      );
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

  if (!event) {
    return <div className="p-4">Event not found</div>;
  }

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
          {eventId && <LiveChatPanel eventId={eventId} />}
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
            {eventId && <LiveChatPanel eventId={eventId} isMobileView />}
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveEvent;
