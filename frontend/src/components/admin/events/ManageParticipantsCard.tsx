import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ChevronDown, Crown, Users, MoreVertical, UserPlus } from "lucide-react";
import { useState } from "react";
import { useEditEventContext } from "./EditEventContext";
import { ParticipantRole } from "@/module_bindings/types";

export function ManageParticipantsCard() {
  const {
    groups,
    hosts,
    participants,
    eventParticipants,
    handleAddCohost,
    handleRemoveParticipant,
    handleUpdateParticipantRole,
    currentGroupId,
    creatorGroupId,
  } = useEditEventContext();

  const [showAddCohostDialog, setShowAddCohostDialog] = useState(false);
  const [selectedCohostGroupId, setSelectedCohostGroupId] = useState<bigint | null>(null);

  const getGroupName = (groupId: bigint) => {
    const group = groups.find((g) => g.groupId === groupId);
    return group?.name || "Unknown Group";
  };

  const availableGroupsForCohost = groups.filter((group) => {
    if (group.groupId === currentGroupId) return false;
    const existingParticipant = eventParticipants.find((p) => p.groupId === group.groupId);
    if (!existingParticipant) return true;
    return existingParticipant.role.tag !== "Host" && existingParticipant.status.tag === "Accepted";
  });

  const onAddCohost = async () => {
    if (!selectedCohostGroupId) return;
    await handleAddCohost(selectedCohostGroupId);
    setSelectedCohostGroupId(null);
    setShowAddCohostDialog(false);
  };

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Event Participants</CardTitle>
          <CardDescription>
            Manage co-hosts and participants for this event
          </CardDescription>
        </div>
        <Dialog open={showAddCohostDialog} onOpenChange={setShowAddCohostDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Co-host
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Co-host</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Group to Add as Co-host</Label>
                {availableGroupsForCohost.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available groups to add as co-host. Groups must be participants first.
                  </p>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedCohostGroupId
                          ? getGroupName(selectedCohostGroupId)
                          : "Select Group"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px]" align="start">
                      <ScrollArea className="h-[200px]">
                        {availableGroupsForCohost.map((group) => (
                          <DropdownMenuItem
                            key={group.groupId.toString()}
                            onClick={() => setSelectedCohostGroupId(group.groupId)}
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCohostDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={onAddCohost}
                disabled={!selectedCohostGroupId}
              >
                Add as Co-host
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-yellow-500" />
            <h4 className="font-medium">Hosts</h4>
            <Badge variant="secondary">{hosts.length}</Badge>
          </div>
          <div className="space-y-2">
            {hosts.map((host) => (
              <div
                key={host.participationId.toString()}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getGroupName(host.groupId)}</span>
                  {host.groupId === creatorGroupId && (
                    <Badge variant="outline" className="text-xs">
                      Creator
                    </Badge>
                  )}
                </div>
                {host.groupId !== creatorGroupId && hosts.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUpdateParticipantRole(host.groupId, "Participant")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Demote to Participant
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveParticipant(host.groupId)}
                      >
                        Remove from Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <h4 className="font-medium">Participants</h4>
            <Badge variant="secondary">{participants.length}</Badge>
          </div>
          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants yet</p>
            ) : (
              participants.map((participant) => (
                <div
                  key={participant.participationId.toString()}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getGroupName(participant.groupId)}</span>
                    <Badge
                      variant={participant.status.tag === "Accepted" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {participant.status.tag === "Pending"
                        ? "Pending"
                        : participant.status.tag === "Accepted"
                        ? "Accepted"
                        : "Declined"}
                    </Badge>
                  </div>
                  {participant.status.tag === "Accepted" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUpdateParticipantRole(participant.groupId, "Host")}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Promote to Co-host
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveParticipant(participant.groupId)}
                        >
                          Remove from Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}