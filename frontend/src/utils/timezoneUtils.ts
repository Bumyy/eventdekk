/**
 * Central timezone management utilities for the frontend.
 * Provides functions and hooks to convert timestamps to user's local timezone.
 */

import { useMemo } from "react";
import { useCurrentUser } from "../hooks/spacetimeHooks";

export const TIMEZONE_GROUPS = {
  "UTC/GMT": ["UTC"],
  Africa: [
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
  ],
  Americas: [
    "America/Anchorage",
    "America/Bogota",
    "America/Buenos_Aires",
    "America/Caracas",
    "America/Chicago",
    "America/Denver",
    "America/Halifax",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Phoenix",
    "America/Santiago",
    "America/Sao_Paulo",
    "America/St_Johns",
    "America/Toronto",
    "America/Vancouver",
  ],
  Asia: [
    "Asia/Baghdad",
    "Asia/Bangkok",
    "Asia/Dhaka",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Istanbul",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Kuala_Lumpur",
    "Asia/Manila",
    "Asia/Riyadh",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Tehran",
    "Asia/Tokyo",
  ],
  Europe: [
    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Belgrade",
    "Europe/Berlin",
    "Europe/Brussels",
    "Europe/Budapest",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Helsinki",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Moscow",
    "Europe/Oslo",
    "Europe/Paris",
    "Europe/Prague",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Zurich",
  ],
  Oceania: [
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Darwin",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Honolulu",
  ],
};

// Flatten the timezone groups for searching
export const ALL_TIMEZONES = Object.values(TIMEZONE_GROUPS).flat();

/**
 * Detect the user's current timezone from the browser.
 * Falls back to UTC if the detected timezone is not in our list.
 */
export const detectUserTimezone = (): string => {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ALL_TIMEZONES.includes(userTimezone) ? userTimezone : "UTC";
  } catch (error) {
    console.error("Error detecting timezone:", error);
    return "UTC";
  }
};

/**
 * Format timezone name for display (e.g., "America/New_York" -> "New York")
 */
export const formatTimezoneName = (tz: string): string => {
  const parts = tz.split("/");
  if (parts.length === 1) return tz;
  return parts[parts.length - 1].replace(/_/g, " ");
};

/**
 * Get the current time in a specific timezone
 */
export const getTimeInTimezone = (timezone: string): string => {
  return new Date().toLocaleTimeString(undefined, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Convert a Date or SpacetimeDB Timestamp to a Date object in the user's timezone.
 * This doesn't actually convert the time - it just returns the Date object.
 * The conversion happens at display time using format functions with timeZone option.
 */
export const toUserTimezoneDate = (
  timestamp: Date | { toDate: () => Date }
): Date => {
  if ("toDate" in timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

/**
 * Format a date/time in the user's specified timezone.
 * Works with both native Date objects and SpacetimeDB Timestamp objects.
 */
export const formatInTimezone = (
  date: Date | { toDate: () => Date },
  timezone: string,
  formatOptions: Intl.DateTimeFormatOptions
): string => {
  const dateObj = toUserTimezoneDate(date);
  return dateObj.toLocaleString(undefined, {
    ...formatOptions,
    timeZone: timezone,
  });
};

/**
 * Format a date in the user's timezone (e.g., "March 1, 2026")
 */
export const formatDateInTimezone = (
  date: Date | { toDate: () => Date },
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format time in the user's timezone (e.g., "3:30 PM")
 */
export const formatTimeInTimezone = (
  date: Date | { toDate: () => Date },
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format both date and time in the user's timezone
 */
export const formatDateTimeInTimezone = (
  date: Date | { toDate: () => Date },
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Hook to get the current user's timezone.
 * Falls back to browser-detected timezone if user has not set one.
 */
export const useUserTimezone = (): string => {
  const currentUser = useCurrentUser();

  return useMemo(() => {
    return currentUser?.timezone || detectUserTimezone();
  }, [currentUser?.timezone]);
};
