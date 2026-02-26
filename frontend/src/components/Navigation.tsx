import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  Calendar,
  Home,
  Shield,
  LogOut,
  User as UserIcon,
  LogIn,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import eventdekkLogo from "../assets/eventdekk_logo.png";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/spacetimeHooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Infer } from "spacetimedb";
import { User } from "../module_bindings";
import { useSpacetimeDB } from "spacetimedb/react";

type User = Infer<typeof User>;

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();

  const { identity, isActive: isConnected } = useSpacetimeDB();

  const users = useUsers();
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    if (isConnected && identity) {
      const foundUser = users.find(
        (u) => u.identity.toHexString() === identity.toHexString()
      );

      console.log(users);

      if (foundUser) {
        setCurrentUser(foundUser);
      } else {
        console.warn(
          "Navigation: Authenticated, but no User row found in DB for this identity."
        );
        // This is a common case if your backend hasn't run a 'create_user' reducer yet.
        setCurrentUser(undefined);
      }
    } else {
      setCurrentUser(undefined);
    }
  }, [users, identity, isConnected]);

  const handleLogout = async () => {
    await logout();
  };

  const isLoading = isAuthLoading || (isAuthenticated && !isConnected);

  const getInitials = (name?: string) => {
    return name ? name.slice(0, 2).toUpperCase() : "??";
  };

  return (
    <header className="sticky px-2 top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center">
        {/* --- Left Side (Logo & Links) --- */}
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

        {/* --- Right Side (User & Actions) --- */}
        <div className="flex flex-1 items-center justify-between space-x-2">
          <div className="w-full flex-1"></div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />

            {/* Global Loader (Connecting/Syncing) */}
            {isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}

            {!isLoading && (
              <>
                {!isAuthenticated ? (
                  <Button variant="outline" onClick={() => navigate("/login")}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                ) : (
                  /* Authenticated State */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full"
                      >
                        <Avatar className="h-8 w-8">
                          {currentUser?.ifcProfileUrl && (
                            <AvatarImage src={currentUser.ifcProfileUrl} />
                          )}
                          <AvatarFallback>
                            {/* If we have a user object, show initials. If null (record missing), show '??' */}
                            {currentUser
                              ? getInitials(currentUser.displayName)
                              : "??"}
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
                            {currentUser?.displayName || "Profile Not Found"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {identity?.toHexString().slice(0, 10)}...
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {currentUser ? (
                        <DropdownMenuItem asChild>
                          <Link
                            to="/profile"
                            className="flex items-center cursor-pointer"
                          >
                            <UserIcon className="w-4 h-4 mr-2" />
                            My Profile
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem asChild>
                          <Link
                            to="/onboarding"
                            className="flex items-center text-orange-500 cursor-pointer"
                          >
                            <UserIcon className="w-4 h-4 mr-2" />
                            Create Profile
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
