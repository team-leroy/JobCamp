/**
 * Common IANA timezone options for the event creation form.
 */
export const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Denver',      label: 'Mountain (MT)' },
  { value: 'America/Chicago',     label: 'Central (CT)' },
  { value: 'America/New_York',    label: 'Eastern (ET)' },
  { value: 'America/Anchorage',   label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (HT)' },
];

/**
 * Format a date for display using the event's IANA timezone.
 * Falls back to UTC if the timezone string is invalid.
 *
 * Use this for any event-day date (Event.date, ImportantDate.date, etc.).
 * Do NOT use for system timestamps like lastLogin or completedAt — those
 * should use toLocaleDateString with timeZone: "UTC" directly.
 */
export function formatEventDate(
  date: Date | string | null | undefined,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  try {
    return d.toLocaleDateString('en-US', { ...options, timeZone: timezone });
  } catch {
    // Invalid IANA timezone string — fall back to UTC
    return d.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
  }
}
