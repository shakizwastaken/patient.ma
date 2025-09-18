import {
  format,
  formatInTimeZone,
  toZonedTime,
  fromZonedTime,
} from "date-fns-tz";

// Common timezones for French medical practices
export const COMMON_TIMEZONES = [
  {
    value: "Europe/Paris",
    label: "Europe/Paris (CET/CEST)",
    country: "France",
  },
  {
    value: "Europe/Brussels",
    label: "Europe/Brussels (CET/CEST)",
    country: "Belgium",
  },
  {
    value: "Europe/Geneva",
    label: "Europe/Geneva (CET/CEST)",
    country: "Switzerland",
  },
  {
    value: "Europe/Luxembourg",
    label: "Europe/Luxembourg (CET/CEST)",
    country: "Luxembourg",
  },
  {
    value: "Europe/Monaco",
    label: "Europe/Monaco (CET/CEST)",
    country: "Monaco",
  },
  {
    value: "Africa/Casablanca",
    label: "Africa/Casablanca (WEST)",
    country: "Morocco",
  },
  {
    value: "Africa/Algiers",
    label: "Africa/Algiers (CET)",
    country: "Algeria",
  },
  { value: "Africa/Tunis", label: "Africa/Tunis (CET)", country: "Tunisia" },
  {
    value: "America/Montreal",
    label: "America/Montreal (EST/EDT)",
    country: "Canada (Quebec)",
  },
  {
    value: "America/New_York",
    label: "America/New_York (EST/EDT)",
    country: "USA (East Coast)",
  },
  {
    value: "America/Los_Angeles",
    label: "America/Los_Angeles (PST/PDT)",
    country: "USA (West Coast)",
  },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)", country: "UAE" },
  { value: "UTC", label: "UTC (GMT)", country: "Universal" },
];

// Get timezone offset string (e.g., "+01:00", "-05:00")
export function getTimezoneOffset(
  timezone: string,
  date: Date = new Date(),
): string {
  try {
    const zonedDate = toZonedTime(date, timezone);
    const utcDate = fromZonedTime(zonedDate, timezone);
    const offsetMs = zonedDate.getTime() - utcDate.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
    const offsetMinutes = Math.floor(
      (Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60),
    );
    const sign = offsetMs >= 0 ? "+" : "-";
    return `${sign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`;
  } catch (error) {
    console.error("Error getting timezone offset:", error);
    return "+00:00";
  }
}

// Convert a date from one timezone to another
export function convertTimezone(
  date: Date,
  fromTimezone: string,
  toTimezone: string,
): Date {
  try {
    // First convert to UTC from source timezone
    const utcDate = fromZonedTime(date, fromTimezone);
    // Then convert from UTC to target timezone
    return toZonedTime(utcDate, toTimezone);
  } catch (error) {
    console.error("Error converting timezone:", error);
    return date;
  }
}

// Format a date in a specific timezone
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatString: string = "yyyy-MM-dd HH:mm:ss",
): string {
  try {
    return formatInTimeZone(date, timezone, formatString);
  } catch (error) {
    console.error("Error formatting in timezone:", error);
    return format(date, formatString);
  }
}

// Get current time in a specific timezone
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    return toZonedTime(new Date(), timezone);
  } catch (error) {
    console.error("Error getting current time in timezone:", error);
    return new Date();
  }
}

// Validate if a timezone string is valid
export function isValidTimezone(timezone: string): boolean {
  try {
    // Check if it's a valid timezone by trying to create a DateTimeFormat
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    // Also check against our known list of common timezones as a fallback
    return COMMON_TIMEZONES.some((tz) => tz.value === timezone);
  }
}

// Get timezone info (offset, abbreviation)
export function getTimezoneInfo(timezone: string, date: Date = new Date()) {
  try {
    // First validate if the timezone is valid
    if (!isValidTimezone(timezone)) {
      return {
        offset: "+00:00",
        abbreviation: "UTC",
        isValid: false,
      };
    }

    const offset = getTimezoneOffset(timezone, date);

    // Try to get abbreviation, but handle errors gracefully
    let abbreviation = "UTC";
    try {
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        timeZoneName: "short",
      });
      const parts = formatter.formatToParts(date);
      abbreviation =
        parts.find((part) => part.type === "timeZoneName")?.value || "UTC";
    } catch (formatError) {
      console.warn(
        `Could not format timezone abbreviation for ${timezone}:`,
        formatError,
      );
      // Fallback to a simple abbreviation based on common patterns
      if (timezone.includes("Paris")) abbreviation = "CET";
      else if (timezone.includes("Geneva")) abbreviation = "CET";
      else if (timezone.includes("Brussels")) abbreviation = "CET";
      else if (timezone.includes("Luxembourg")) abbreviation = "CET";
      else if (timezone.includes("Monaco")) abbreviation = "CET";
      else if (timezone.includes("Casablanca")) abbreviation = "WEST";
      else if (timezone.includes("New_York")) abbreviation = "EST";
      else if (timezone.includes("Los_Angeles")) abbreviation = "PST";
      else if (timezone.includes("Dubai")) abbreviation = "GST";
      else abbreviation = "UTC";
    }

    return {
      offset,
      abbreviation,
      isValid: true,
    };
  } catch (error) {
    console.error("Error getting timezone info:", error);
    return {
      offset: "+00:00",
      abbreviation: "UTC",
      isValid: false,
    };
  }
}

// Convert availability hours from organization timezone to UTC for storage
export function convertAvailabilityToUTC(
  startTime: string,
  endTime: string,
  dayOfWeek: number,
  timezone: string,
  referenceDate: Date = new Date(),
): { startTimeUtc: string; endTimeUtc: string } {
  try {
    // Create a date for the specific day of week in the organization timezone
    const targetDate = new Date(referenceDate);
    const currentDayOfWeek = targetDate.getDay();
    const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
    targetDate.setDate(targetDate.getDate() + daysToAdd);

    // Set the time in the organization timezone
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDate = new Date(targetDate);
    startDate.setHours(startHour ?? 0, startMinute ?? 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(endHour ?? 0, endMinute ?? 0, 0, 0);

    // Convert to UTC
    const startUtc = fromZonedTime(startDate, timezone);
    const endUtc = fromZonedTime(endDate, timezone);

    return {
      startTimeUtc: format(startUtc, "HH:mm"),
      endTimeUtc: format(endUtc, "HH:mm"),
    };
  } catch (error) {
    console.error("Error converting availability to UTC:", error);
    return {
      startTimeUtc: startTime,
      endTimeUtc: endTime,
    };
  }
}

// Convert availability hours from UTC to organization timezone for display
export function convertAvailabilityFromUTC(
  startTimeUtc: string,
  endTimeUtc: string,
  dayOfWeek: number,
  timezone: string,
  referenceDate: Date = new Date(),
): { startTime: string; endTime: string } {
  try {
    // Create a date for the specific day of week in UTC
    const targetDate = new Date(referenceDate);
    const currentDayOfWeek = targetDate.getDay();
    const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
    targetDate.setDate(targetDate.getDate() + daysToAdd);

    // Set the UTC time
    const [startHour, startMinute] = startTimeUtc.split(":").map(Number);
    const [endHour, endMinute] = endTimeUtc.split(":").map(Number);

    const startDate = new Date(targetDate);
    startDate.setUTCHours(startHour ?? 0, startMinute ?? 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(endHour ?? 0, endMinute ?? 0, 0, 0);

    // Convert to organization timezone
    const startLocal = toZonedTime(startDate, timezone);
    const endLocal = toZonedTime(endDate, timezone);

    return {
      startTime: format(startLocal, "HH:mm"),
      endTime: format(endLocal, "HH:mm"),
    };
  } catch (error) {
    console.error("Error converting availability from UTC:", error);
    return {
      startTime: startTimeUtc,
      endTime: endTimeUtc,
    };
  }
}
