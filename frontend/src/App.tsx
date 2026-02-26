import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

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

// ==========================================
// 1. Create the SpacetimeDB Wrapper Component
// ==========================================
const SpacetimeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { sdbToken, isLoading } = useAuth();

  // Rebuild the connection ONLY when the sdbToken changes
  const connectionBuilder = useMemo(() => {
    return DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIME_URL || "ws://localhost:3000")
      .withModuleName("eventdekk")
      .withToken(sdbToken || undefined) // Pass the token from AuthContext
      .onConnect((conn: DbConnection, identity: Identity, token: string) => {
        console.log("Connected to STDB with identity:", identity.toHexString());
        // If logged out (sdbToken is null), STDB will generate an anonymous token.
        // We save it so anonymous users don't lose their identity on refresh.
        if (!sdbToken) {
          localStorage.setItem("eventdekk_auth_token", token);
        }
      })
      .onDisconnect(() => {
        console.log("Disconnected from SpacetimeDB");
      })
      .onConnectError((_ctx: ErrorContext, err: Error) => {
        console.error("Error connecting to SpacetimeDB:", err);
      });
  }, [sdbToken]);

  // Wait for AuthContext to check local storage / process OAuth URLs
  if (isLoading) {
    return <AuthLoading />;
  }

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
};

// ==========================================
// 2. Main App Component
// ==========================================
function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <AuthProvider>
          {/* 3. Wrap your UI in the SpacetimeWrapper */}
          <SpacetimeWrapper>
            <div className="relative isolate min-h-screen bg-background text-foreground">
              <AppBackground />
              <Navigation />
              <Toaster richColors />

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
