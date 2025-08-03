// src/App.tsx
import React, { useRef } from "react"; // Import useRef
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import CalendarView from "./pages/CalendarView";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";
import { AdminLayout } from "@/components/AdminLayout";
import AdminEntry from "@/pages/admin/AdminEntry";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminMembers from "@/pages/admin/AdminMembers";
import SiteAdmin from "@/pages/admin/SiteAdmin";
// Import AuthProvider and useAuth
import { AuthProvider } from "@/components/AuthProvider";
// Import SpacetimeProvider and its handle type
import {
  SpacetimeProvider,
  SpacetimeProviderHandle,
} from "@/components/SpacetimeProvider";
import "./App.css";
import "leaflet/dist/leaflet.css";
import Profile from "@/pages/Profile";
import CreateGroup from "./pages/admin/CreateGroup";
import EditEvent from "./pages/admin/EditEvent";
import { Toaster } from "sonner";
// Import new pages and ProtectedRoute
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ProtectedRoute from "./pages/ProtectedRoute";
import { Link } from "react-router-dom";
import AdminGroupSettings from "./pages/admin/AdminGroupSettings";
import LiveEvent from "@/pages/LiveEvent";

function App() {
  // Create refs to pass down to AuthProvider
  const connectSpacetimeRef = useRef<((token: string) => void) | null>(null);
  const disconnectSpacetimeRef = useRef<(() => void) | null>(null);
  const connectAnonymouslyRef = useRef<(() => void) | null>(null); // New ref for anonymous connection
  const spacetimeProviderRef = useRef<SpacetimeProviderHandle>(null); // Ref for SpacetimeProvider itself

  // Use useEffect to link the refs after SpacetimeProvider mounts
  React.useEffect(() => {
    if (spacetimeProviderRef.current) {
      connectSpacetimeRef.current =
        spacetimeProviderRef.current.connectWithToken;
      disconnectSpacetimeRef.current = spacetimeProviderRef.current.disconnect;
      connectAnonymouslyRef.current =
        spacetimeProviderRef.current.connectAnonymously; // Link the new anonymous connection method
      console.log(
        "App: Linked AuthProvider refs to SpacetimeProvider methods."
      );
    } else {
      console.warn("App: SpacetimeProvider ref not available on mount.");
    }
  }, []); // Empty dependency array ensures this runs once after mount

  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        {" "}
        {/* Router should be outermost */}
        <AuthProvider
          connectSpacetimeRef={connectSpacetimeRef}
          disconnectSpacetimeRef={disconnectSpacetimeRef}
          connectAnonymouslyRef={connectAnonymouslyRef} // Pass the new ref to AuthProvider
        >
          <SpacetimeProvider ref={spacetimeProviderRef}>
            {/* SpacetimeProvider now inside AuthProvider */}
            <div className="min-h-screen bg-background text-foreground">
              <Navigation /> {/* Navigation uses useAuth and useSpacetime */}
              <Toaster richColors />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/auth/callback"
                  element={<AuthCallbackPage />}
                />{" "}
                {/* Assuming public */}
                <Route path="/live-event/:eventId" element={<LiveEvent />} />
                {/* Protected Routes */}
                <Route path="/calendar" element={<CalendarView />} />
                <Route
                  path="/profile" // The user's own profile
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                {/* Admin Routes (already behind AdminLayout, protect the layout entry) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* These are nested routes, protection is handled by the parent */}
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
                {/* Add a 404 or catch-all route if needed */}
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
            </div>
          </SpacetimeProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
