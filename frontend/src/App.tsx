// src/App.tsx

import React, { useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
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
import { AuthProvider } from "@/components/AuthProvider";
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
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ProtectedRoute from "./pages/ProtectedRoute";
import AdminGroupSettings from "./pages/admin/AdminGroupSettings";
import LiveEvent from "@/pages/LiveEvent";

// Import the logo to use for the background
import eventdekkLogo from "@/assets/eventdekk_logo.png";

function App() {
  const connectSpacetimeRef = useRef<((token: string) => void) | null>(null);
  const disconnectSpacetimeRef = useRef<(() => void) | null>(null);
  const connectAnonymouslyRef = useRef<(() => void) | null>(null);
  const spacetimeProviderRef = useRef<SpacetimeProviderHandle>(null);

  React.useEffect(() => {
    if (spacetimeProviderRef.current) {
      connectSpacetimeRef.current =
        spacetimeProviderRef.current.connectWithToken;
      disconnectSpacetimeRef.current = spacetimeProviderRef.current.disconnect;
      connectAnonymouslyRef.current =
        spacetimeProviderRef.current.connectAnonymously;
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <AuthProvider
          connectSpacetimeRef={connectSpacetimeRef}
          disconnectSpacetimeRef={disconnectSpacetimeRef}
          connectAnonymouslyRef={connectAnonymouslyRef}
        >
          <SpacetimeProvider ref={spacetimeProviderRef}>
            <div className="relative isolate min-h-screen bg-background text-foreground">
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 overflow-hidden"
              >
                {/* Primary logo background - top left corner (fixed position) */}
                <div
                  className="absolute top-0 left-0 -z-10 h-[50rem] w-[90rem] -rotate-30 rounded-full opacity-10 blur-[6rem] -translate-x-1/3 -translate-y-1/3"
                  style={{
                    backgroundImage: `url(${eventdekkLogo})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    filter: "hue-rotate(15deg) saturate(1.2) blur(4rem)",
                  }}
                />

                {/* Secondary logo background - bottom right corner (fixed position) */}
                <div
                  className="absolute bottom-0 right-0 -z-10 h-[55rem] w-[85rem] -rotate-200 rounded-full opacity-8 blur-[5rem] translate-x-1/3 translate-y-1/3"
                  style={{
                    backgroundImage: `url(${eventdekkLogo})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    filter: "hue-rotate(-10deg) saturate(0.8) blur(4rem)",
                    animationDelay: "1s",
                  }}
                />

                {/* Additional accent elements */}
                <div
                  className="absolute top-1/3 right-1/4 -z-10 h-[30rem] w-[60rem] rotate-20 rounded-full opacity-8 blur-[8rem]"
                  style={{
                    backgroundImage: `url(${eventdekkLogo})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    filter:
                      "hue-rotate(30deg) saturate(1.5) brightness(1.2) blur(5rem)",
                  }}
                />

                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 -z-5 bg-gradient-to-br from-transparent via-background/5 to-background/20" />

                {/* Subtle noise texture overlay */}
                <div
                  className="absolute inset-0 -z-5 opacity-[0.02] mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  }}
                />
              </div>

              {/* END: GLOBAL BACKGROUND */}

              <Navigation />
              <Toaster richColors />
              <main>
                {" "}
                {/* Optional: wrap routes in a main tag for semantics */}
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
          </SpacetimeProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
