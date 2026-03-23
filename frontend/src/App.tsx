import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster, toast } from "sonner";

// --- SpacetimeDB Imports ---
import { SpacetimeDBProvider } from "spacetimedb/react";
import { Identity } from "spacetimedb";
import { DbConnection, ErrorContext } from "./module_bindings";

import "./App.css";
import "leaflet/dist/leaflet.css";

// Components & Pages
import Navigation from "@/components/Navigation";
import { AppBackground } from "@/components/AppBackground";
import { AuthLoading } from "@/components/AuthLoading";
import Home from "@/pages/Home";
import CalendarView from "./pages/CalendarView";
import EventPage from "./pages/EventPage";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ProtectedRoute from "./pages/ProtectedRoute";
import LiveEvent from "@/pages/LiveEvent";
import Profile from "@/pages/Profile";

// Admin
import { AdminLayout } from "@/components/AdminLayout";
import AdminEntry from "@/pages/admin/AdminEntry";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminMembers from "@/pages/admin/AdminMembers";
import SiteAdmin from "@/pages/admin/SiteAdmin";
import CreateGroup from "./pages/admin/CreateGroup";
import EditEvent from "./pages/admin/EditEvent";
import AdminGroupSettings from "./pages/admin/AdminGroupSettings";
import GroupPlanner from "@/pages/admin/GroupPlanner";

const SpacetimeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { sdbToken, isLoading, logout } = useAuth();

  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  const isConnectedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const activeNonceRef = useRef(reconnectNonce);
  activeNonceRef.current = reconnectNonce;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const triggerReconnect = useCallback((delay = 3000, force = false) => {
    if (isConnectedRef.current) return;

    if (timerRef.current !== null && !force) {
      return;
    }

    if (force) {
      clearTimer();
    }

    setIsConnecting(true);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!isConnectedRef.current) {
        console.log("Attempting to reconnect...");
        setReconnectNonce((prev) => prev + 1);
      }
    }, delay);
  }, []);

  useEffect(() => {
    const handleResume = () => {
      if (!isConnectedRef.current) {
        console.log("App resumed/online, scheduling fast reconnect");
        triggerReconnect(100, true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    window.addEventListener("online", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleResume);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimer();
    };
  }, [triggerReconnect]);

  const connectionBuilder = useMemo(() => {
    const instanceNonce = reconnectNonce;
    const url = new URL(import.meta.env.VITE_SPACETIME_URL || "ws://localhost:3000");
    url.searchParams.set("reconnect", String(instanceNonce));

    return DbConnection.builder()
      .withUri(url)
      .withDatabaseName("eventdekk")
      .withToken(sdbToken || undefined)
      .onConnect((conn: DbConnection, identity: Identity, token: string) => {
        if (activeNonceRef.current !== instanceNonce) return;

        clearTimer();
        isConnectedRef.current = true;
        setIsConnected(true);
        setHasConnected(true);
        setIsConnecting(false);
        console.log("Connected to STDB with identity:", identity.toHexString());

        if (!sdbToken) {
          localStorage.setItem("eventdekk_auth_token", token);
        }
      })
      .onDisconnect(() => {
        if (activeNonceRef.current !== instanceNonce) return;

        isConnectedRef.current = false;
        setIsConnected(false);
        console.warn("Disconnected from SpacetimeDB");
        triggerReconnect(3000);
      })
      .onConnectError((_ctx: ErrorContext, err: Error) => {
        if (activeNonceRef.current !== instanceNonce) return;

        isConnectedRef.current = false;
        setIsConnected(false);
        console.error("Error connecting to SpacetimeDB:", err);

        const errorMessage = err.message || err.toString();
        if (
          errorMessage.includes("Failed to verify token") ||
          errorMessage.includes("401") ||
          errorMessage.includes("Unauthorized")
        ) {
          console.warn("Invalid or expired token detected. Forcing logout...");
          toast.error("Your session has expired. Please log in again.");
          logout(true);
          return;
        }

        triggerReconnect(3000);
      });
  }, [sdbToken, reconnectNonce, logout, triggerReconnect]);

  if (isLoading) {
    return <AuthLoading />;
  }

  const showBanner = isConnecting && hasConnected && !isConnected;

  return (
    <SpacetimeDBProvider
      key={reconnectNonce}
      connectionBuilder={connectionBuilder}
    >
      {showBanner && (
        <div className="fixed top-0 left-0 w-full bg-yellow-500 text-black text-center py-1 z-50 text-sm font-semibold">
          Reconnecting to server...
        </div>
      )}

      {children}
    </SpacetimeDBProvider>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <AuthProvider>
          <SpacetimeWrapper>
            <Toaster richColors />

            <div className="relative isolate min-h-screen bg-background text-foreground">
              <AppBackground />
              <Navigation />

              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/live-event/:eventId" element={<LiveEvent />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/event/:eventId" element={<EventPage />} />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminEntry />} />
                    <Route path="site" element={<SiteAdmin />} />
                    <Route path="site/group/create" element={<CreateGroup />} />
                    <Route
                      path="dashboard/:groupId"
                      element={<AdminDashboard />}
                    />
                    <Route path="planner/:groupId" element={<GroupPlanner />} />
                    <Route path="events/:groupId" element={<AdminEvents />} />
                    <Route path="members/:groupId" element={<AdminMembers />} />
                    <Route
                      path="settings/:groupId"
                      element={<AdminGroupSettings />}
                    />
                    <Route
                      path="groups/:groupId/events/:eventId/edit"
                      element={<EditEvent />}
                    />
                  </Route>

                  <Route
                    path="*"
                    element={
                      <div>
                        <h2>404 Not Found</h2>
                        <Link to="/">Go Home</Link>
                      </div>
                    }
                  />
                </Routes>
              </main>
            </div>
          </SpacetimeWrapper>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
