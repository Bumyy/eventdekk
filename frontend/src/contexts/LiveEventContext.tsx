import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "eventdekk_live_chat_event_id";

interface LiveEventContextType {
  currentEventId: string | null;
  setCurrentEventId: (eventId: string | null) => void;
  isWidgetOpen: boolean;
  setIsWidgetOpen: (open: boolean) => void;
  toggleWidget: () => void;
  clearCurrentEvent: () => void;
}

const LiveEventContext = createContext<LiveEventContextType | undefined>(
  undefined
);

export const LiveEventProvider = ({ children }: { children: ReactNode }) => {
  const [currentEventId, setCurrentEventIdState] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(STORAGE_KEY);
    }
  );
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  const setCurrentEventId = useCallback((eventId: string | null) => {
    setCurrentEventIdState(eventId);
    if (typeof window === "undefined") return;

    if (eventId) {
      window.localStorage.setItem(STORAGE_KEY, eventId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearCurrentEvent = useCallback(() => {
    setCurrentEventIdState(null);
    setIsWidgetOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toggleWidget = useCallback(() => {
    setIsWidgetOpen((prev) => !prev);
  }, []);

  const value: LiveEventContextType = {
    currentEventId,
    setCurrentEventId,
    isWidgetOpen,
    setIsWidgetOpen,
    toggleWidget,
    clearCurrentEvent,
  };

  return (
    <LiveEventContext.Provider value={value}>
      {children}
    </LiveEventContext.Provider>
  );
};

export const useLiveEventContext = () => {
  const context = useContext(LiveEventContext);
  if (!context) {
    throw new Error(
      "useLiveEventContext must be used within a LiveEventProvider"
    );
  }
  return context;
};
