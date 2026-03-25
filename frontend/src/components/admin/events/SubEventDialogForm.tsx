import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeInTimezone } from "@/utils/timezoneUtils";
import { useOptionalEditEventContext } from "./EditEventContext";
import { MemberOption, SubEventFormState, SubEventFormType } from "./types";

interface SubEventDialogFormProps {
  mode?: "add" | "edit";
  form?: SubEventFormState;
  setForm?: (form: SubEventFormState) => void;
  userTimezone?: string;
  members?: MemberOption[];
  showTypeField?: boolean;
  showIdentityFields?: boolean;
  showScheduleFields?: boolean;
  idPrefix?: string;
}

export function SubEventDialogForm({
  mode = "add",
  form,
  setForm,
  userTimezone,
  members,
  showTypeField = true,
  showIdentityFields = true,
  showScheduleFields = true,
  idPrefix = "",
}: SubEventDialogFormProps) {
  if (form && setForm && userTimezone && members) {
    return (
      <SubEventDialogFormFields
        formState={form}
        setFormState={setForm}
        resolvedTimezone={userTimezone}
        memberOptions={members}
        showTypeField={showTypeField}
        showIdentityFields={showIdentityFields}
        showScheduleFields={showScheduleFields}
        idPrefix={idPrefix}
      />
    );
  }

  return (
    <SubEventDialogFormFromContext
      mode={mode}
      showTypeField={showTypeField}
      showIdentityFields={showIdentityFields}
      showScheduleFields={showScheduleFields}
      idPrefix={idPrefix}
    />
  );
}

function SubEventDialogFormFromContext({
  mode,
  showTypeField,
  showIdentityFields,
  showScheduleFields,
  idPrefix,
}: {
  mode: "add" | "edit";
  showTypeField: boolean;
  showIdentityFields: boolean;
  showScheduleFields: boolean;
  idPrefix: string;
}) {
  const context = useOptionalEditEventContext();

  const contextTimezone = context?.userTimezone;
  const contextMembers = context?.memberOptions;
  const contextForm = mode === "add" ? context?.subEventForm : context?.editSubEventForm;
  const contextSetForm = mode === "add" ? context?.setSubEventForm : context?.setEditSubEventForm;

  if (!contextForm || !contextSetForm || !contextTimezone || !contextMembers) {
    throw new Error(
      "SubEventDialogForm requires context or explicit form, setForm, userTimezone, and members props"
    );
  }

  return (
    <SubEventDialogFormFields
      formState={contextForm}
      setFormState={contextSetForm}
      resolvedTimezone={contextTimezone}
      memberOptions={contextMembers}
      showTypeField={showTypeField}
      showIdentityFields={showIdentityFields}
      showScheduleFields={showScheduleFields}
      idPrefix={idPrefix}
    />
  );
}

function SubEventDialogFormFields({
  formState,
  setFormState,
  resolvedTimezone,
  memberOptions,
  showTypeField,
  showIdentityFields,
  showScheduleFields,
  idPrefix,
}: {
  formState: SubEventFormState;
  setFormState: (form: SubEventFormState) => void;
  resolvedTimezone: string;
  memberOptions: MemberOption[];
  showTypeField: boolean;
  showIdentityFields: boolean;
  showScheduleFields: boolean;
  idPrefix: string;
}) {
  const withPrefix = (id: string) => `${idPrefix}${id}`;

  return (
    <div className="space-y-4 p-1">
      {showIdentityFields && (
        <div className="space-y-2">
          <Label htmlFor={withPrefix("subEventName")}>Name</Label>
          <Input
            id={withPrefix("subEventName")}
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            placeholder="Enter sub-event name"
          />
        </div>
      )}

      {showTypeField && (
        <div className="space-y-2">
          <Label htmlFor={withPrefix("subEventType")}>Type</Label>
          <Select
            value={formState.type}
            onValueChange={(value: SubEventFormType) =>
              setFormState({ ...formState, type: value })
            }
          >
            <SelectTrigger id={withPrefix("subEventType")}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="GroupFlight">Group Flight</SelectItem>
                <SelectItem value="FlyIn">Fly-In</SelectItem>
                <SelectItem value="FlyOut">Fly-Out</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      {showIdentityFields && (
        <div className="space-y-2">
          <Label htmlFor={withPrefix("subEventDescription")}>Description</Label>
          <Textarea
            id={withPrefix("subEventDescription")}
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            placeholder="Enter sub-event description"
            rows={3}
          />
        </div>
      )}

      {showScheduleFields && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimePicker
            label="Start Time"
            value={formState.startTime}
            onChange={(date) => date && setFormState({ ...formState, startTime: date })}
            placeholder={formatDateTimeInTimezone(formState.startTime, resolvedTimezone)}
            timezone={resolvedTimezone}
          />
          <DateTimePicker
            label="End Time"
            value={formState.endTime}
            onChange={(date) => date && setFormState({ ...formState, endTime: date })}
            placeholder={formatDateTimeInTimezone(formState.endTime, resolvedTimezone)}
            timezone={resolvedTimezone}
          />
        </div>
      )}

      {formState.type === "FlyIn" || formState.type === "FlyOut" ? (
        <div className="space-y-2">
          <Label htmlFor={withPrefix("hubIcao")}>Hub ICAO</Label>
          <Input
            id={withPrefix("hubIcao")}
            value={formState.hubIcao}
            onChange={(e) => setFormState({ ...formState, hubIcao: e.target.value })}
            placeholder="KJFK"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor={withPrefix("departureIcao")}>Departure ICAO</Label>
                <Input
                  id={withPrefix("departureIcao")}
                  value={formState.departureIcao}
                  onChange={(e) =>
                  setFormState({ ...formState, departureIcao: e.target.value })
                  }
                  placeholder="KJFK"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor={withPrefix("arrivalIcao")}>Arrival ICAO</Label>
              <Input
                id={withPrefix("arrivalIcao")}
                value={formState.arrivalIcao}
                onChange={(e) => setFormState({ ...formState, arrivalIcao: e.target.value })}
                placeholder="KLAX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={withPrefix("route")}>Flight Route (Optional)</Label>
            <Input
              id={withPrefix("route")}
              value={formState.route}
              onChange={(e) => setFormState({ ...formState, route: e.target.value })}
              placeholder="KJFK DCT KBOS DCT KLAX"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor={withPrefix("notes")}>Notes (Optional)</Label>
        <Textarea
          id={withPrefix("notes")}
          value={formState.notes}
          onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
          placeholder="Any additional information"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={withPrefix("eventLead")}>Event Lead (Optional)</Label>
        <Select
          value={formState.eventLeadHex}
          onValueChange={(value) => setFormState({ ...formState, eventLeadHex: value })}
        >
          <SelectTrigger id={withPrefix("eventLead")}>
            <SelectValue placeholder="Select event lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {memberOptions.map((member) => (
              <SelectItem key={member.identityHex} value={member.identityHex}>
                {member.callsignPrefix ? `[${member.callsignPrefix}] ` : ""}
                {member.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
