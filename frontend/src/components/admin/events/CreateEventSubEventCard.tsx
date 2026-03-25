import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { SubEventDialogForm } from "./SubEventDialogForm";
import { SubEventTypeBadge } from "./SubEventTypeBadge";
import { useCreateEventContext } from "./CreateEventContext";

interface CreateEventSubEventCardProps {
  index: number;
}

export function CreateEventSubEventCard({ index }: CreateEventSubEventCardProps) {
  const {
    subEvents,
    isAdvancedSubEventsMode,
    expandedSubEvents,
    toggleSubEventExpansion,
    handleRemoveSubEvent,
    handleSetSubEventType,
    toDialogSubEventFormState,
    updateSubEventFromDialog,
    userTimezone,
    memberOptions,
  } = useCreateEventContext();

  const subEvent = subEvents[index];
  const isExpanded = expandedSubEvents.includes(index);
  const canRemove = subEvents.length > 1;

  if (!subEvent) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Event Type</Label>
            <SubEventTypeBadge type={subEvent.subEventType} />
          </div>

          {isExpanded && (
            <RadioGroup
              value={subEvent.subEventType.tag}
              onValueChange={(value: "GroupFlight" | "FlyIn" | "FlyOut") =>
                handleSetSubEventType(index, value)
              }
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="GroupFlight"
                  id={`group-flight-${index}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`group-flight-${index}`}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-sm font-medium">Group Flight</span>
                  <span className="text-xs text-muted-foreground">A to B</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="FlyIn"
                  id={`fly-in-${index}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`fly-in-${index}`}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-sm font-medium">Fly-in</span>
                  <span className="text-xs text-muted-foreground">To A</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="FlyOut"
                  id={`fly-out-${index}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`fly-out-${index}`}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-sm font-medium">Fly-out</span>
                  <span className="text-xs text-muted-foreground">From A</span>
                </Label>
              </div>
            </RadioGroup>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => toggleSubEventExpansion(index)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveSubEvent(index)}
            disabled={!canRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isExpanded && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">
              {subEvent.name || `Wave ${index + 1}`}
            </h4>
            <span className="text-muted-foreground">•</span>

            {subEvent.subEventType.tag === "GroupFlight" &&
              subEvent.groupFlightDepartureIcao &&
              subEvent.groupFlightArrivalIcao && (
                <span className="text-sm text-muted-foreground">
                  {subEvent.groupFlightDepartureIcao} -&gt; {subEvent.groupFlightArrivalIcao}
                </span>
              )}

            {subEvent.subEventType.tag === "FlyIn" && subEvent.hubIcao && (
              <span className="text-sm text-muted-foreground">To: {subEvent.hubIcao}</span>
            )}

            {subEvent.subEventType.tag === "FlyOut" && subEvent.hubIcao && (
              <span className="text-sm text-muted-foreground">From: {subEvent.hubIcao}</span>
            )}
          </div>

          {subEvent.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {subEvent.description}
            </p>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          <SubEventDialogForm
            form={toDialogSubEventFormState(subEvent)}
            setForm={(formState) => updateSubEventFromDialog(index, formState)}
            userTimezone={userTimezone}
            members={memberOptions}
            showTypeField={false}
            idPrefix={`create-sub-${index}-`}
          />
        </div>
      )}
    </Card>
  );
}
