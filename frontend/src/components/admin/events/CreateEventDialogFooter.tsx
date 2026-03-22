import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useCreateEventContext } from "./CreateEventContext";

export function CreateEventDialogFooter() {
  const { isCreating, isUploading, onOpenChange } = useCreateEventContext();

  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isCreating || isUploading}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isUploading || isCreating}>
        {isUploading || isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isUploading ? "Uploading..." : "Creating..."}
          </>
        ) : (
          "Create Event"
        )}
      </Button>
    </DialogFooter>
  );
}
