import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDateTimeInTimezone,
  getTimeInTimezone,
} from "@/utils/timezoneUtils";

interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  presetTimes?: string[];
  showCustomTime?: boolean;
  timezone?: string;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Select date and time",
  disabled = false,
  className,
  presetTimes,
  showCustomTime = true,
  timezone,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState<Date | undefined>(
    value || undefined
  );
  const [customTimeInput, setCustomTimeInput] = useState("");

  const defaultPresetTimes = [
    "00:00",
    "02:00",
    "04:00",
    "06:00",
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
    "22:00",
  ];
  const times = presetTimes || defaultPresetTimes;

  useEffect(() => {
    if (open) {
      setStep("date");
      setTempDate(value || undefined);
      if (value && timezone) {
        setCustomTimeInput(getTimeInTimezone(value, timezone));
      } else if (value) {
        setCustomTimeInput(
          `${value.getHours().toString().padStart(2, "0")}:${value
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        );
      }
    }
  }, [open, value, timezone]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve existing time if a value was already set
      if (value) {
        date.setHours(value.getHours(), value.getMinutes(), 0, 0);
      }
      setTempDate(date);
      setStep("time"); // Move to phase 2
    }
  };

  const handleTimeSelect = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    if (tempDate && onChange) {
      const newDate = new Date(tempDate);
      if (timezone) {
        const adjustedDate = setTimeInTimezone(newDate, hours, minutes, timezone);
        onChange(adjustedDate);
      } else {
        newDate.setHours(hours, minutes, 0, 0);
        onChange(newDate);
      }
      setOpen(false);
    }
  };

  const applyCustomTime = () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = customTimeInput.match(timeRegex);

    if (match && tempDate && onChange) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const newDate = new Date(tempDate);
      if (timezone) {
        const adjustedDate = setTimeInTimezone(newDate, hours, minutes, timezone);
        onChange(adjustedDate);
      } else {
        newDate.setHours(hours, minutes, 0, 0);
        onChange(newDate);
      }
      setOpen(false);
    }
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    if (timezone) {
      return formatDateTimeInTimezone(value, timezone);
    }
    return format(value, "MMM d, yyyy - h:mm a");
  };

  const getTimeInTimezoneLocal = (
    date: Date,
    tz: string
  ): { hour: number; minute: number } => {
    const hourStr = date.toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const minuteStr = date.toLocaleString("en-US", {
      timeZone: tz,
      minute: "2-digit",
    });
    return { hour: parseInt(hourStr), minute: parseInt(minuteStr) };
  };

  const setTimeInTimezone = (
    date: Date,
    hour: number,
    minute: number,
    tz: string
  ): Date => {
    const { hour: currentHour, minute: currentMinute } = getTimeInTimezoneLocal(
      date,
      tz
    );

    const hourDiff = hour - currentHour;
    const minuteDiff = minute - currentMinute;

    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hourDiff);
    newDate.setMinutes(newDate.getMinutes() + minuteDiff);

    return newDate;
  };

  const getCurrentHourInTimezone = (): number => {
    if (!value || !timezone) return value?.getHours() ?? 0;
    return getTimeInTimezoneLocal(value, timezone).hour;
  };

  const getCurrentMinuteInTimezone = (): number => {
    if (!value || !timezone) return value?.getMinutes() ?? 0;
    return getTimeInTimezoneLocal(value, timezone).minute;
  };

  const currentHour = getCurrentHourInTimezone();
  const currentMinute = getCurrentMinuteInTimezone();

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayValue()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          {step === "date" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">Select Date</span>
                {value && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setStep("time")}
                  >
                    Skip to Time <Clock className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
              <Calendar
                mode="single"
                selected={tempDate}
                onSelect={handleDateSelect}
                initialFocus
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
              />
            </div>
          ) : (
            <div className="space-y-4 sm:max-w-[260px]">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStep("date")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {tempDate ? format(tempDate, "MMM d, yyyy") : "Select Time"}
                </span>
                <div className="h-8 w-8" /> {/* Spacer for centering */}
              </div>

              {/* Preset Time Grid */}
              <div className="grid grid-cols-3 gap-2">
                {times.map((time) => {
                  const [h, m] = time.split(":").map(Number);
                  const isSelected =
                    currentHour === h && currentMinute === m;

                  return (
                    <Button
                      key={time}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSelect(time)}
                      className="text-xs font-normal"
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>

              {/* Custom Time Input */}
              {showCustomTime && (
                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="grid gap-1.5 flex-1">
                    <Label
                      htmlFor="customTime"
                      className="text-xs text-muted-foreground"
                    >
                      Custom Time
                    </Label>
                    <Input
                      id="customTime"
                      type="time"
                      value={customTimeInput}
                      onChange={(e) => setCustomTimeInput(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={applyCustomTime}
                    disabled={!customTimeInput}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
