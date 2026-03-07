import React, { useMemo, useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

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

const SpacetimeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { sdbToken, isLoading } = useAuth();

  // We use this as a React 'key' to force the Provider to completely remount.
  const [connectionKey, setConnectionKey] = useState(0);

  // Keep track of connection state for the UI
  const [isConnecting, setIsConnecting] = useState(true);
  const isConnectedRef = useRef(false);

  // ---------------------------------------------------------
  // Focus & Network Event Listeners
  // ---------------------------------------------------------
  useEffect(() => {
    const triggerReconnect = () => {
      if (!isConnectedRef.current) {
        console.log("Network restored. Remounting SpacetimeDB...");
        setIsConnecting(true);
        // Incrementing the key completely destroys the old SpacetimeDBProvider
        // and creates a fresh one, preventing the "WebSocket is CLOSED" errors.
        setConnectionKey((prev) => prev + 1);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerReconnect();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", triggerReconnect);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", triggerReconnect);
    };
  }, []);

  // ---------------------------------------------------------
  // Connection Builder
  // ---------------------------------------------------------
  const connectionBuilder = useMemo(() => {
    void connectionKey;

    return DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIME_URL || "ws://localhost:3000")
      .withDatabaseName("eventdekk")
      .withToken(sdbToken || undefined)
      .onConnect((conn: DbConnection, identity: Identity, token: string) => {
        isConnectedRef.current = true;
        setIsConnecting(false); // Hide loading state
        console.log("Connected to STDB with identity:", identity.toHexString());

        if (!sdbToken) {
          localStorage.setItem("eventdekk_auth_token", token);
        }
      })
      .onDisconnect(() => {
        isConnectedRef.current = false;
        console.warn("Disconnected from SpacetimeDB");

        // Auto-reconnect mechanism
        setTimeout(() => {
          if (!isConnectedRef.current) {
            setIsConnecting(true);
            setConnectionKey((prev) => prev + 1);
          }
        }, 3000);
      })
      .onConnectError((_ctx: ErrorContext, err: Error) => {
        isConnectedRef.current = false;
        console.error("Error connecting to SpacetimeDB:", err);

        // Auto-retry mechanism
        setTimeout(() => {
          if (!isConnectedRef.current) {
            setIsConnecting(true);
            setConnectionKey((prev) => prev + 1);
          }
        }, 5000);
      });
  }, [sdbToken, connectionKey]); // Rebuild when connectionKey changes

  if (isLoading) {
    return <AuthLoading />;
  }

  return (
    // The key={connectionKey} is the magic fix here.
    // It guarantees old websockets/subscriptions are wiped from React's memory.
    <SpacetimeDBProvider
      key={connectionKey}
      connectionBuilder={connectionBuilder}
    >
      {/* Optional: Show a subtle reconnecting banner to the user */}
      {isConnecting && connectionKey > 0 && (
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
          {/* 3. Wrap your UI in the SpacetimeWrapper */}
          <SpacetimeWrapper>
            <Toaster richColors />

            <div className="relative isolate min-h-screen bg-background text-foreground">
              <AppBackground />
              <Navigation />

              <main>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/live-event/:eventId" element={<LiveEvent />} />

                  {/* Protected Routes */}
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
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

                  {/* 404 Route */}
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
