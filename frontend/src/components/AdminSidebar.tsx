import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Shield,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useSpacetime } from "@/components/SpacetimeProvider";
import { useGroups } from "@/hooks/spacetimeHooks";

const navigation = [
  {
    name: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Events",
    href: "events",
    icon: Calendar,
  },
  {
    name: "Members",
    href: "members",
    icon: Users,
  },
  {
    name: "Settings",
    href: "settings",
    icon: Settings,
  },
];

function SidebarContent() {
  const location = useLocation();
  const { groupId } = useParams();
  const { connection } = useSpacetime();
  const groups = useGroups(connection);
  const isEntryPage = location.pathname === "/admin";
  const isSiteAdmin = location.pathname === "/admin/site";

  const currentGroup = groups?.find(
    (group) => group.groupId.toString() === groupId
  );

  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/admin" className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span className="font-semibold">
            {isEntryPage
              ? "Select Group"
              : isSiteAdmin
              ? "Site Administration"
              : currentGroup?.name || "Loading..."}
          </span>
        </Link>
      </div>
      {!isEntryPage && !isSiteAdmin && (
        <>
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const isActive =
                location.pathname === `/admin/${item.href}/${groupId}`;
              return (
                <Link
                  key={item.name}
                  to={`/admin/${item.href}/${groupId}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-2">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Back to Main
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-16 z-50"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-64 border-r bg-background lg:block">
        <div className="flex h-full flex-col">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
