import { ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface EventSidebarProps {
  eventId: bigint;
  subEventCount: number;
  totalSignups: number;
  participantGroups: number;
  ifcEventLink?: string | null;
  canRegister?: boolean;
  onRegister?: () => void;
}

export function EventSidebar({
  eventId,
  subEventCount,
  totalSignups,
  participantGroups,
  ifcEventLink,
  canRegister = false,
  onRegister,
}: EventSidebarProps) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleShare = () => {
    copyToClipboard(`${window.location.origin}/event/${eventId}`);
  };

  return (
    <div className="border-t lg:border-t-0 p-2 sm:p-4 space-y-2 sm:space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs sm:h-10 sm:text-sm"
        onClick={handleShare}
      >
        <Share2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
        {copied ? "Link Copied" : "Share Event"}
      </Button>

      {canRegister && onRegister && (
        <Button
          size="sm"
          className="hidden sm:flex w-full h-8 text-xs sm:h-10 sm:text-sm"
          onClick={onRegister}
        >
          Register for Event
        </Button>
      )}

      <div className="hidden sm:block rounded-lg border px-2.5 py-2 sm:p-3">
        <h4 className="text-xs sm:text-sm font-semibold">Quick Snapshot</h4>
        <div className="mt-1.5 space-y-1 text-xs sm:text-sm text-muted-foreground leading-tight">
          <p>{subEventCount} sub-events</p>
          <p>{totalSignups} total signups</p>
          <p>{participantGroups} participating groups</p>
        </div>
      </div>

      {ifcEventLink && (
        <a
          href={ifcEventLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center text-xs sm:text-sm text-primary hover:underline"
        >
          View IFC Event Page
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
