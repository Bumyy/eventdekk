import { Infer } from "spacetimedb";
import { Event } from "@/module_bindings";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EventDetailsContent } from "@/components/events/EventDetailsContent";

type EventType = Infer<typeof Event>;

interface EventDialogProps {
  event: EventType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister?: () => void;
  canRegister?: boolean;
}

export default function EventDialog({
  event,
  open,
  onOpenChange,
  onRegister,
  canRegister = false,
}: EventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1536px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 gap-0 border-0 [&>button]:absolute [&>button]:top-3 [&>button]:right-3 [&>button]:z-50 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:p-0 [&>button]:leading-none [&>button]:h-8 [&>button]:w-8 [&>button]:touch-manipulation [&>button]:opacity-100 [&>button]:bg-background/95 [&>button]:border [&>button]:border-border [&>button]:text-foreground [&>button]:shadow-sm [&>button>svg]:size-5 sm:[&>button]:after:content-['ESC'] sm:[&>button]:after:absolute sm:[&>button]:after:top-[calc(100%+0.35rem)] sm:[&>button]:after:left-1/2 sm:[&>button]:after:-translate-x-1/2 sm:[&>button]:after:text-[11px] sm:[&>button]:after:font-semibold sm:[&>button]:after:tracking-[0.08em] sm:[&>button]:after:text-muted-foreground">
        <EventDetailsContent
          event={event}
          canRegister={canRegister}
          onRegister={onRegister}
        />
      </DialogContent>
    </Dialog>
  );
}
