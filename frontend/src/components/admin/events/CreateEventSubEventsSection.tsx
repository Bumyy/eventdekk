import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCreateEventContext } from "./CreateEventContext";
import { CreateEventSubEventCard } from "./CreateEventSubEventCard";
import { SubEventDialogForm } from "./SubEventDialogForm";

export function CreateEventSubEventsSection() {
  const {
    subEvents,
    handleAddSubEvent,
    isAdvancedSubEventsMode,
    toDialogSubEventFormState,
    updateSubEventFromDialog,
    userTimezone,
    memberOptions,
  } = useCreateEventContext();

  if (!isAdvancedSubEventsMode) {
    const defaultWave = subEvents[0];
    if (!defaultWave) return null;

    return (
      <div className="space-y-4">
        <SubEventDialogForm
          form={toDialogSubEventFormState(defaultWave)}
          setForm={(formState) => updateSubEventFromDialog(0, formState)}
          userTimezone={userTimezone}
          members={memberOptions}
          showTypeField
          showIdentityFields={false}
          showScheduleFields
          idPrefix="create-default-wave-"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubEvent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Wave
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Waves</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubEvent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Wave
        </Button>
      </div>

      <div className="space-y-4">
        {subEvents.map((subEvent, index) => (
          <CreateEventSubEventCard key={`create-wave-${index}`} index={index} />
        ))}
      </div>
    </div>
  );
}
