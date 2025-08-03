// src/components/Navigation.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  Calendar,
  Home,
  Users, // Keep if public profile list exists
  Shield,
  LogOut,
  Settings,
  User,
  LogIn, // Import LogIn icon
  Loader2, // Import Loader
} from "lucide-react";
import { useEffect, useState } from "react";

import eventdekkLogo from "../assets/eventdekk_logo.png";
import { cn } from "@/lib/utils";
import { useSpacetime } from "@/components/SpacetimeProvider";
import { useUsers } from "@/hooks/spacetimeHooks"; // Assuming this hook exists and works
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import useAuth
import { useAuth } from "@/components/AuthProvider";
import { SpacetimeDbClient } from "@clockworklabs/spacetimedb-sdk"; // Needed for User type if used

// Define User type if not globally available (adjust based on your actual type)
type SpacetimeUser = InstanceType<typeof SpacetimeDbClient.DbSets.User>;

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Use both Auth and Spacetime contexts
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
  const { connection, identity, isConnected, isInitialized } = useSpacetime();
  const users = useUsers(connection); // This hook likely needs the connection

  const [currentUser, setCurrentUser] = useState<SpacetimeUser | undefined>(
    undefined
  );

  // Update currentUser when users array or identity changes AND connection is ready
  useEffect(() => {
    if (isConnected && identity && users.length > 0) {
      const foundUser = users.find(
        (u) => u.identity.toHexString() === identity.toHexString()
      );
      setCurrentUser(foundUser);
      console.log(
        "Navigation: Found current user in Spacetime:",
        foundUser?.displayName
      );
    } else {
      console.log(
        "Navigation: Clearing current user (disconnected or no identity/users)."
      );
      setCurrentUser(undefined); // Clear user if disconnected or identity is lost
    }
  }, [users, identity, isConnected]); // Depend on connection status too

  const handleLogout = async () => {
    await logout(); // AuthContext handles redirect
  };

  // Determine overall loading state (auth check OR spacetime connection/init)
  const isLoading =
    isAuthLoading || (isAuthenticated && (!isConnected || !isInitialized));

  return (
    <header className="sticky px-2 top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center">
        {/* Logo and Public Nav (mostly unchanged) */}
        <div className="mr-4 flex">
          <Link to="/" className="mr-4 flex items-center space-x-2">
            <img
              src={eventdekkLogo}
              alt="EventDekk Logo"
              className="h-12 w-auto"
            />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location.pathname === "/"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              <Home className="h-4 w-4" />
            </Link>
            <Link
              to="/calendar"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location.pathname === "/calendar"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              <Calendar className="h-4 w-4" />
            </Link>
            {isAuthenticated && (
              <Link
                to="/admin"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  location.pathname.startsWith("/admin")
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
          </nav>
        </div>

        {/* Right Side: Theme Toggle, Auth Buttons/User Menu */}
        <div className="flex flex-1 items-center justify-between space-x-2">
          <div className="w-full flex-1">{/* Search placeholder */}</div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />

            {/* Loading Indicator */}
            {isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}

            {/* Auth Buttons / User Menu */}
            {!isLoading && ( // Don't show buttons while initially loading
              <>
                {!isAuthenticated ? (
                  // Show Login Button if not authenticated
                  <Button variant="outline" onClick={() => navigate("/login")}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                ) : currentUser ? (
                  // Show User Dropdown if authenticated and currentUser data is available
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={currentUser.ifcProfileUrl || undefined}
                          />
                          <AvatarFallback>
                            {currentUser.displayName
                              ? currentUser.displayName
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "???"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {currentUser.displayName || "Unnamed User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {currentUser.identity.toHexString()}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        {" "}
                        {/* Placeholder Settings */}
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // Authenticated but user data not yet loaded from Spacetime
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                    disabled
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
