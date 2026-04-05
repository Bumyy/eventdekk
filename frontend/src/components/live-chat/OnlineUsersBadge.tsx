import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OnlineUsersBadgeProps {
  count: number;
  users: Array<{
    identity: { toHexString: () => string };
    displayName: string | null;
    ifcProfileUrl: string | null;
  }>;
}

export const OnlineUsersBadge = ({ count, users }: OnlineUsersBadgeProps) => {
  if (count === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium hover:bg-green-500/20 transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>{count} online</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Online Users
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {users.slice(0, 10).map((user) => (
            <div
              key={user.identity.toHexString()}
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.ifcProfileUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(user.displayName || "U").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">
                {user.displayName || "Unknown"}
              </span>
            </div>
          ))}
          {users.length > 10 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{users.length - 10} more
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};