import React, { useMemo, useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster, toast } from "sonner"; // <-- Added toast import

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
  // <-- Extracted logout here
  const { sdbToken, isLoading, logout } = useAuth();

  const [connectionKey, setConnectionKey] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const triggerReconnect = () => {
      if (!isConnectedRef.current) {
        console.log("Network restored. Remounting SpacetimeDB...");
        setIsConnecting(true);
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

  const connectionBuilder = useMemo(() => {
    void connectionKey;

    return DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIME_URL || "ws://localhost:3000")
      .withDatabaseName("eventdekk")
      .withToken(sdbToken || undefined)
      .onConnect((conn: DbConnection, identity: Identity, token: string) => {
        isConnectedRef.current = true;
        setIsConnecting(false);
        console.log("Connected to STDB with identity:", identity.toHexString());

        if (!sdbToken) {
          localStorage.setItem("eventdekk_auth_token", token);
        }
      })
      .onDisconnect(() => {
        isConnectedRef.current = false;
        console.warn("Disconnected from SpacetimeDB");

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

        // <-- NEW: Check for Auth / Token Errors
        const errorMessage = err.message || err.toString();
        if (
          errorMessage.includes("Failed to verify token") ||
          errorMessage.includes("401") ||
          errorMessage.includes("Unauthorized")
        ) {
          console.warn("Invalid or expired token detected. Forcing logout...");
          toast.error("Your session has expired. Please log in again.");

          logout(true); // Call silent logout (avoids duplicate toast messages)

          return; // IMPORTANT: Return here to stop the auto-retry loop entirely
        }

        // Auto-retry mechanism (Only runs if it's a standard network drop, not a bad token)
        setTimeout(() => {
          if (!isConnectedRef.current) {
            setIsConnecting(true);
            setConnectionKey((prev) => prev + 1);
          }
        }, 5000);
      });
  }, [sdbToken, connectionKey, logout]); // <-- Added logout to dependencies

  if (isLoading) {
    return <AuthLoading />;
  }

  return (
    <SpacetimeDBProvider
      key={connectionKey}
      connectionBuilder={connectionBuilder}
    >
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
          <SpacetimeWrapper>
            <Toaster richColors />

            <div className="relative isolate min-h-screen bg-background text-foreground">
              <AppBackground />
              <Navigation />

              <main>
                <Routes>
                  {/* ... Keep the exact same routing rules here ... */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/live-event/:eventId" element={<LiveEvent />} />
                  <Route path="/calendar" element={<CalendarView />} />

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
