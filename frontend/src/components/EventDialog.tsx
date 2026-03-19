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
      <DialogContent className="w-[calc(100vw-1rem)] h-[calc(100vh-1rem)] sm:w-[calc(100vw-2rem)] sm:h-[calc(100vh-2rem)] max-w-none sm:max-w-none overflow-hidden p-0 gap-0 [&>button]:opacity-100 [&>button]:bg-background/95 [&>button]:border [&>button]:border-border [&>button]:shadow-sm">
        <EventDetailsContent
          event={event}
          canRegister={canRegister}
          onRegister={onRegister}
        />
      </DialogContent>
    </Dialog>
  );
}
