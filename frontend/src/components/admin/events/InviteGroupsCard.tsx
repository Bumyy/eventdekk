import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X } from "lucide-react";
import { useEditEventContext } from "./EditEventContext";

export function InviteGroupsCard() {
  const {
    showInviteGroupsDialog,
    setShowInviteGroupsDialog,
    selectedGroups,
    availableInviteGroups,
    handleSelectGroup,
    handleRemoveGroup,
    handleInviteGroups,
  } = useEditEventContext();

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invite Groups</CardTitle>
          <CardDescription>
            Invite other groups to participate in this event
          </CardDescription>
        </div>
        <Dialog
          open={showInviteGroupsDialog}
          onOpenChange={setShowInviteGroupsDialog}
        >
          <DialogTrigger asChild>
            <Button>Invite Groups</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Groups to Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selected Groups</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedGroups.map((group) => (
                    <Badge
                      key={group.id.toString()}
                      className="pr-1 flex items-center gap-1"
                    >
                      {group.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => handleRemoveGroup(group.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No groups selected
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Groups</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      Select Groups
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px]" align="start">
                    <ScrollArea className="h-[300px]">
                      {availableInviteGroups.map((group) => (
                        <DropdownMenuItem
                          key={group.groupId.toString()}
                          onClick={() =>
                            handleSelectGroup({
                              id: group.groupId,
                              name: group.name,
                            })
                          }
                        >
                          {group.name}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteGroupsDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteGroups}
                disabled={selectedGroups.length === 0}
              >
                Send Invites
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Invite other groups to participate in this event. They will receive a
          notification and can choose to accept or decline the invitation.
        </p>
      </CardContent>
    </Card>
  );
}
