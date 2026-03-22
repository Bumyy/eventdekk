import {
  formatInTimezone,
  formatTimeInTimezone,
} from "@/utils/timezoneUtils";

interface EventDateTimeInfoProps {
  startTime: Date;
  endTime: Date;
  timezone: string;
  groupCount: number;
  signupCount: number;
}

export function EventDateTimeInfo({
  startTime,
  endTime,
  timezone,
  groupCount,
  signupCount,
}: EventDateTimeInfoProps) {
  const groupLabel = groupCount === 1 ? "group" : "groups";
  const signupLabel = signupCount === 1 ? "signup" : "signups";

  return (
    <div className="rounded-2xl border bg-muted/30 px-4 py-3 sm:px-5">
      <div className="space-y-1">
        <p className="text-lg sm:text-2xl font-semibold leading-tight">
          {formatInTimezone(startTime, timezone, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-sm sm:text-lg font-medium text-muted-foreground">
          {formatTimeInTimezone(startTime, timezone)} -{" "}
          {formatTimeInTimezone(endTime, timezone)}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {groupCount} {groupLabel}
          </span>{" "}
          /{" "}
          <span className="font-semibold text-foreground">
            {signupCount} {signupLabel}
          </span>
        </p>
      </div>
    </div>
  );
}