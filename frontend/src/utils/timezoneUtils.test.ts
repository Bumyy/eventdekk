import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../hooks/spacetimeHooks", () => ({
  useCurrentUser: vi.fn(),
}));

import {
  TIMEZONE_GROUPS,
  ALL_TIMEZONES,
  detectUserTimezone,
  formatTimezoneName,
  getTimeInTimezone,
  toUserTimezoneDate,
  formatInTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatDateTimeInTimezone,
  useUserTimezone,
} from "./timezoneUtils";
import { useCurrentUser } from "../hooks/spacetimeHooks";

describe("timezoneUtils", () => {
  describe("TIMEZONE_GROUPS", () => {
    it("contains expected timezone groups", () => {
      expect(TIMEZONE_GROUPS).toHaveProperty("UTC/GMT");
      expect(TIMEZONE_GROUPS).toHaveProperty("Africa");
      expect(TIMEZONE_GROUPS).toHaveProperty("Americas");
      expect(TIMEZONE_GROUPS).toHaveProperty("Asia");
      expect(TIMEZONE_GROUPS).toHaveProperty("Europe");
      expect(TIMEZONE_GROUPS).toHaveProperty("Oceania");
    });

    it("UTC group contains only UTC", () => {
      expect(TIMEZONE_GROUPS["UTC/GMT"]).toEqual(["UTC"]);
    });

    it("Americas contains New York and Los Angeles", () => {
      expect(TIMEZONE_GROUPS.Americas).toContain("America/New_York");
      expect(TIMEZONE_GROUPS.Americas).toContain("America/Los_Angeles");
    });

    it("Europe contains London and Paris", () => {
      expect(TIMEZONE_GROUPS.Europe).toContain("Europe/London");
      expect(TIMEZONE_GROUPS.Europe).toContain("Europe/Paris");
    });

    it("Asia contains Tokyo and Dubai", () => {
      expect(TIMEZONE_GROUPS.Asia).toContain("Asia/Tokyo");
      expect(TIMEZONE_GROUPS.Asia).toContain("Asia/Dubai");
    });
  });

  describe("ALL_TIMEZONES", () => {
    it("is a flattened array of all timezones", () => {
      expect(ALL_TIMEZONES).toContain("UTC");
      expect(ALL_TIMEZONES).toContain("America/New_York");
      expect(ALL_TIMEZONES).toContain("Europe/London");
      expect(ALL_TIMEZONES.length).toBeGreaterThan(50);
    });

    it("does not contain duplicates", () => {
      const uniqueTimezones = [...new Set(ALL_TIMEZONES)];
      expect(uniqueTimezones.length).toBe(ALL_TIMEZONES.length);
    });
  });

  describe("detectUserTimezone", () => {
    it("returns user timezone when in supported list", () => {
      const originalResolvedOptions = Intl.DateTimeFormat().resolvedOptions;
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        timeZone: "America/New_York",
      } as Intl.ResolvedDateTimeFormatOptions);

      const result = detectUserTimezone();
      expect(result).toBe("America/New_York");

      vi.restoreAllMocks();
    });

    it("returns UTC when user timezone is not in supported list", () => {
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        timeZone: "Unknown/Timezone",
      } as Intl.ResolvedDateTimeFormatOptions);

      const result = detectUserTimezone();
      expect(result).toBe("UTC");

      vi.restoreAllMocks();
    });

    it("returns UTC when Intl throws an error", () => {
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
        throw new Error("Intl error");
      });

      const result = detectUserTimezone();
      expect(result).toBe("UTC");

      vi.restoreAllMocks();
    });
  });

  describe("formatTimezoneName", () => {
    it("formats America/New_York as New York", () => {
      expect(formatTimezoneName("America/New_York")).toBe("New York");
    });

    it("formats Europe/London as London", () => {
      expect(formatTimezoneName("Europe/London")).toBe("London");
    });

    it("replaces underscores with spaces", () => {
      expect(formatTimezoneName("America/Los_Angeles")).toBe("Los Angeles");
    });

    it("returns the timezone as-is for single-part names", () => {
      expect(formatTimezoneName("UTC")).toBe("UTC");
    });

    it("handles multi-level timezone paths", () => {
      expect(formatTimezoneName("America/Argentina/Buenos_Aires")).toBe(
        "Buenos Aires"
      );
    });
  });

  describe("getTimeInTimezone", () => {
    it("returns time string for a given timezone", () => {
      const testDate = new Date("2026-03-22T15:30:00Z");
      const result = getTimeInTimezone(testDate, "UTC");

      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("formats time in UTC correctly", () => {
      const testDate = new Date("2026-03-22T15:30:00Z");
      const result = getTimeInTimezone(testDate, "UTC");

      expect(result).toBe("15:30");
    });

    it("accepts timezone string as first argument and returns current time", () => {
      const result = getTimeInTimezone("UTC");

      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("toUserTimezoneDate", () => {
    it("returns Date object as-is when passed a Date", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const result = toUserTimezoneDate(date);

      expect(result).toBe(date);
    });

    it("converts object with toDate method to Date", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const timestamp = { toDate: () => date };
      const result = toUserTimezoneDate(timestamp);

      expect(result).toBe(date);
    });
  });

  describe("formatInTimezone", () => {
    it("formats date with provided options in specified timezone", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const result = formatInTimezone(date, "UTC", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      expect(result).toContain("2026");
      expect(result).toContain("March");
    });

    it("works with timestamp objects", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const timestamp = { toDate: () => date };
      const result = formatInTimezone(timestamp, "UTC", {
        year: "numeric",
      });

      expect(result).toContain("2026");
    });
  });

  describe("formatDateInTimezone", () => {
    it("formats date in long format", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const result = formatDateInTimezone(date, "UTC");

      expect(result).toContain("2026");
      expect(result).toContain("March");
      expect(result).toContain("22");
    });

    it("works with timestamp objects", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const timestamp = { toDate: () => date };
      const result = formatDateInTimezone(timestamp, "UTC");

      expect(result).toContain("2026");
    });
  });

  describe("formatTimeInTimezone", () => {
    it("formats time in 12-hour format with AM/PM", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const result = formatTimeInTimezone(date, "UTC");

      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it("works with timestamp objects", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const timestamp = { toDate: () => date };
      const result = formatTimeInTimezone(timestamp, "UTC");

      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe("formatDateTimeInTimezone", () => {
    it("formats both date and time", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const result = formatDateTimeInTimezone(date, "UTC");

      expect(result).toContain("2026");
      expect(result).toContain("March");
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it("works with timestamp objects", () => {
      const date = new Date("2026-03-22T15:30:00Z");
      const timestamp = { toDate: () => date };
      const result = formatDateTimeInTimezone(timestamp, "UTC");

      expect(result).toContain("2026");
    });
  });

  describe("useUserTimezone", () => {
    it("returns user's timezone when set", () => {
      const mockUser = { timezone: "Europe/Paris" };
      (useCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUser);

      const { result } = renderHook(() => useUserTimezone());

      expect(result.current).toBe("Europe/Paris");
    });

    it("falls back to detected timezone when user has no timezone set", () => {
      const mockUser = { timezone: null };
      (useCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUser);

      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        timeZone: "America/Los_Angeles",
      } as Intl.ResolvedDateTimeFormatOptions);

      const { result } = renderHook(() => useUserTimezone());

      expect(result.current).toBe("America/Los_Angeles");

      vi.restoreAllMocks();
    });

    it("falls back to UTC when user is null and detection fails", () => {
      (useCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);

      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
        throw new Error("Intl error");
      });

      const { result } = renderHook(() => useUserTimezone());

      expect(result.current).toBe("UTC");

      vi.restoreAllMocks();
    });

    it("returns detected timezone when user is undefined", () => {
      (useCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const originalResolvedOptions =
        Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = vi
        .fn()
        .mockReturnValue({
          timeZone: "Asia/Tokyo",
        } as Intl.ResolvedDateTimeFormatOptions) as unknown as typeof originalResolvedOptions;

      const { result } = renderHook(() => useUserTimezone());

      expect(result.current).toBe("Asia/Tokyo");

      Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    });
  });
});
