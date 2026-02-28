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
  Menu,
  LayoutDashboard,
  Users,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import eventdekkLogo from "../assets/eventdekk_logo.png";
import { cn } from "@/lib/utils";
import { useUsers, useGroups } from "@/hooks/spacetimeHooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Infer } from "spacetimedb";
import { User } from "../module_bindings";
import { useSpacetimeDB } from "spacetimedb/react";

type UserType = Infer<typeof User>;

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
  const { identity, isActive: isConnected } = useSpacetimeDB();
  const users = useUsers();
  const groups = useGroups();
  const [currentUser, setCurrentUser] = useState<UserType | undefined>(
    undefined
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isConnected && identity) {
      const foundUser = users.find(
        (u) => u.identity.toHexString() === identity.toHexString()
      );
      setCurrentUser(foundUser || undefined);
    } else {
      setCurrentUser(undefined);
    }
  }, [users, identity, isConnected]);

  const isLoading = isAuthLoading || (isAuthenticated && !isConnected);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  // --- Admin Context Logic ---
  const isAdminArea = location.pathname.startsWith("/admin");
  const pathParts = location.pathname.split("/");
  let groupId: string | null = null;

  if (isAdminArea) {
    if (pathParts[2] === "groups" && pathParts[4] === "events") {
      groupId = pathParts[3]; // Handles: /admin/groups/:groupId/events/:eventId/edit
    } else if (
      ["dashboard", "events", "members", "settings"].includes(pathParts[2])
    ) {
      groupId = pathParts[3]; // Handles standard admin sub-pages
    }
  }

  const currentGroup = groups?.find((g) => g.groupId.toString() === groupId);

  // Default App Links
  const mainNavLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "Calendar", path: "/calendar", icon: Calendar },
  ];

  // Admin Specific Links Context
  const adminNavLinks = groupId
    ? [
        {
          name: "Dashboard",
          path: `/admin/dashboard/${groupId}`,
          icon: LayoutDashboard,
        },
        { name: "Events", path: `/admin/events/${groupId}`, icon: Calendar },
        { name: "Members", path: `/admin/members/${groupId}`, icon: Users },
        {
          name: "Settings",
          path: `/admin/settings/${groupId}`,
          icon: Settings,
        },
      ]
    : [
        { name: "Select Group", path: "/admin", icon: Shield },
        { name: "Site Admin", path: "/admin/site", icon: Settings },
      ];

  // Morph navigation based on the current context
  const navLinks = isAdminArea ? adminNavLinks : mainNavLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto px-4 flex h-14 items-center justify-between relative">
        {/* --- Left Side (Hamburger & Desktop Logo/Links) --- */}
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex flex-col w-[280px] sm:w-[320px]"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

              {/* Mobile Menu Header */}
              <div className="flex flex-col gap-1 py-3 pl-2 border-b mb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={eventdekkLogo}
                    alt="EventDekk Logo"
                    className="h-10 w-auto"
                  />
                  <span className="text-lg font-semibold">eventdekk</span>
                </div>
                {isAdminArea && currentGroup && (
                  <div className="mt-2 text-sm pl-1 text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[200px]">
                      {currentGroup.name}
                    </span>
                  </div>
                )}
              </div>

              <nav className="flex flex-col gap-2 mx-3">
                {navLinks.map((link) => {
                  const isActive =
                    location.pathname === link.path ||
                    (link.name === "Events" &&
                      location.pathname.includes(
                        `/admin/groups/${groupId}/events`
                      ));

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.name}
                    </Link>
                  );
                })}

                {/* Optional switch to admin mode for standard users */}
                {!isAdminArea && isAuthenticated && (
                  <Link
                    to="/admin"
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-all duration-200"
                  >
                    <Shield className="h-5 w-5" />
                    Admin
                  </Link>
                )}

                {/* Exit Admin Mode */}
                {isAdminArea && (
                  <Link
                    to="/"
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-all duration-200"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Exit Admin
                  </Link>
                )}
              </nav>

              <div className="mt-auto border-t px-3 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Appearance
                </span>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo (Hidden on Mobile) */}
          <img
            src={eventdekkLogo}
            alt="EventDekk Logo"
            className="h-12 w-auto"
          />
          {isAdminArea && (
            <div className="flex items-center border-l pl-3 ml-1 h-8">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="font-semibold text-sm max-w-[200px] truncate text-muted-foreground">
                {currentGroup ? currentGroup.name : "Admin Panel"}
              </span>
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                (link.name === "Events" &&
                  location.pathname.includes(
                    `/admin/groups/${groupId}/events`
                  ));

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}

            {!isAdminArea && isAuthenticated && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* --- Center Side (Mobile Logo Centered) --- */}
        <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Link to="/" className="flex flex-col items-center">
            <img
              src={eventdekkLogo}
              alt="EventDekk Logo"
              className="h-10 w-auto"
            />
            {isAdminArea && currentGroup && (
              <span className="text-[10px] font-semibold text-primary/80 -mt-1 truncate max-w-[120px]">
                {currentGroup.name}
              </span>
            )}
          </Link>
        </div>

        {/* --- Right Side (Theme, Back to App & Profile) --- */}
        <div className="flex items-center gap-3">
          {isAdminArea && (
            <div className="hidden md:flex items-center pr-2 mr-2 border-r border-border/50">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit Admin
                </Link>
              </Button>
            </div>
          )}

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : !isAuthenticated ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/login")}
            >
              <LogIn className="mr-2 h-4 w-4 hidden sm:block" />
              Login
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full border border-border/50"
                >
                  <Avatar className="h-9 w-9">
                    {currentUser?.ifcProfileUrl && (
                      <AvatarImage
                        src={currentUser.ifcProfileUrl}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {currentUser?.displayName?.slice(0, 2).toUpperCase() ||
                        "??"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.displayName || "Profile Not Found"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {identity?.toHexString().slice(0, 16)}...
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={currentUser ? "/profile" : "/onboarding"}
                    className="cursor-pointer py-2"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    {currentUser ? (
                      "My Profile"
                    ) : (
                      <span className="text-orange-500">Create Profile</span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 py-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;
