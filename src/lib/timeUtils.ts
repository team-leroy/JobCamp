/**
 * Format a time string for display in 12-hour format (e.g. "2:20 PM").
 * Accepts "HH:mm" / "H:mm" (24-hour) or "h:mm AM/PM" (12-hour) and returns "h:mm AM/PM".
 */
export function formatTimeTo12h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return timeStr;
  const trimmed = timeStr.trim();
  if (!trimmed) return timeStr;

  // Already 12-hour with AM/PM (case insensitive)
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (amPmMatch) {
    const h = parseInt(amPmMatch[1], 10);
    const m = amPmMatch[2];
    const ampm = amPmMatch[3].toUpperCase();
    const hour24 = ampm === 'PM' && h !== 12 ? h + 12 : ampm === 'AM' && h === 12 ? 0 : h;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    return `${hour12}:${m} ${ampm}`;
  }

  // 24-hour format HH:mm or H:mm
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const min = match[2];
    if (hour < 0 || hour > 23) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${min} ${ampm}`;
  }

  return timeStr;
}

/**
 * Convert a time string to 24-hour "HH:mm" for use in <input type="time">.
 * Accepts "HH:mm", "H:mm", or "h:mm AM/PM".
 */
export function parseTimeTo24h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // Already 24-hour HH:mm or H:mm
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const min = match24[2];
    if (hour >= 0 && hour <= 23 && min.length === 2) {
      const h = hour < 10 ? `0${hour}` : `${hour}`;
      return `${h}:${min}`;
    }
  }

  // 12-hour with AM/PM
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const min = amPmMatch[2];
    const ampm = amPmMatch[3].toLowerCase();
    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    const h = hour < 10 ? `0${hour}` : `${hour}`;
    return `${h}:${min}`;
  }

  return '';
}
