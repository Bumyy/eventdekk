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
import { SubEventFormState, SubEventFormType } from "./types";

interface MemberOption {
  identityHex: string;
  displayName: string;
  callsignPrefix?: string;
}

interface SubEventDialogFormProps {
  form: SubEventFormState;
  setForm: (form: SubEventFormState) => void;
  userTimezone: string;
  members: MemberOption[];
  idPrefix?: string;
}

export function SubEventDialogForm({
  form,
  setForm,
  userTimezone,
  members,
  idPrefix = "",
}: SubEventDialogFormProps) {
  const withPrefix = (id: string) => `${idPrefix}${id}`;

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor={withPrefix("subEventName")}>Name</Label>
        <Input
          id={withPrefix("subEventName")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter sub-event name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={withPrefix("subEventType")}>Type</Label>
        <Select
          value={form.type}
          onValueChange={(value: SubEventFormType) =>
            setForm({ ...form, type: value })
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

      <div className="space-y-2">
        <Label htmlFor={withPrefix("subEventDescription")}>Description</Label>
        <Textarea
          id={withPrefix("subEventDescription")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Enter sub-event description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateTimePicker
          label="Start Time"
          value={form.startTime}
          onChange={(date) => date && setForm({ ...form, startTime: date })}
          placeholder={formatDateTimeInTimezone(form.startTime, userTimezone)}
          timezone={userTimezone}
        />
        <DateTimePicker
          label="End Time"
          value={form.endTime}
          onChange={(date) => date && setForm({ ...form, endTime: date })}
          placeholder={formatDateTimeInTimezone(form.endTime, userTimezone)}
          timezone={userTimezone}
        />
      </div>

      {form.type === "FlyIn" || form.type === "FlyOut" ? (
        <div className="space-y-2">
          <Label htmlFor={withPrefix("hubIcao")}>Hub ICAO</Label>
          <Input
            id={withPrefix("hubIcao")}
            value={form.hubIcao}
            onChange={(e) => setForm({ ...form, hubIcao: e.target.value })}
            placeholder="KJFK"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={withPrefix("departureIcao")}>Departure ICAO</Label>
              <Input
                id={withPrefix("departureIcao")}
                value={form.departureIcao}
                onChange={(e) =>
                  setForm({ ...form, departureIcao: e.target.value })
                }
                placeholder="KJFK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={withPrefix("arrivalIcao")}>Arrival ICAO</Label>
              <Input
                id={withPrefix("arrivalIcao")}
                value={form.arrivalIcao}
                onChange={(e) => setForm({ ...form, arrivalIcao: e.target.value })}
                placeholder="KLAX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={withPrefix("route")}>Flight Route (Optional)</Label>
            <Input
              id={withPrefix("route")}
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
              placeholder="KJFK DCT KBOS DCT KLAX"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor={withPrefix("notes")}>Notes (Optional)</Label>
        <Textarea
          id={withPrefix("notes")}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any additional information"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={withPrefix("eventLead")}>Event Lead (Optional)</Label>
        <Select
          value={form.eventLeadHex}
          onValueChange={(value) => setForm({ ...form, eventLeadHex: value })}
        >
          <SelectTrigger id={withPrefix("eventLead")}>
            <SelectValue placeholder="Select event lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {members.map((member) => (
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
