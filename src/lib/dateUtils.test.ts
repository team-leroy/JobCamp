import { describe, it, expect } from 'vitest';
import { formatEventDate } from './dateUtils';

describe('formatEventDate', () => {
  it('returns empty string for null', () => {
    expect(formatEventDate(null, 'America/New_York')).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatEventDate(undefined, 'America/New_York')).toBe('');
  });

  it('displays UTC midnight as the same calendar day in UTC', () => {
    // Stored as midnight UTC → should be Mar 15 when displayed in UTC
    const result = formatEventDate(new Date('2025-03-15T00:00:00Z'), 'UTC');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('displays UTC midnight as the previous day in US Eastern (the critical edge case)', () => {
    // Midnight UTC = 8:00 PM EST on Mar 14 — so Eastern display shows Mar 14
    // This is the root cause of past date bugs when hardcoding timeZone: "UTC"
    // while the school is in a US timezone.
    const result = formatEventDate(new Date('2025-03-15T00:00:00Z'), 'America/New_York');
    expect(result).toContain('Mar');
    expect(result).toContain('14');
    expect(result).toContain('2025');
  });

  it('displays UTC noon correctly in Eastern (same calendar day)', () => {
    // Noon UTC = 8 AM EST → still Mar 15 in Eastern
    const result = formatEventDate(new Date('2025-03-15T12:00:00Z'), 'America/New_York');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('accepts a date string as input', () => {
    const result = formatEventDate('2025-06-01T00:00:00Z', 'UTC');
    expect(result).toContain('Jun');
    expect(result).toContain('1');
  });

  it('falls back to UTC on invalid timezone without throwing', () => {
    // Should not throw — just fall back
    expect(() => formatEventDate(new Date('2025-03-15T00:00:00Z'), 'INVALID_TZ')).not.toThrow();
    const result = formatEventDate(new Date('2025-03-15T00:00:00Z'), 'INVALID_TZ');
    expect(result).toContain('15');
  });

  it('displays UTC noon correctly in Pacific (same calendar day — the fix for March 8 bug)', () => {
    // Root cause of the March 8/9 bug: dates stored as midnight UTC display as
    // the previous day in Pacific time (UTC-8). The fix: store at noon UTC.
    // Noon UTC = 4 AM PT → still the same calendar day even in Hawaii (UTC-10 = 2 AM).
    const result = formatEventDate(new Date('2026-03-09T12:00:00Z'), 'America/Los_Angeles');
    expect(result).toContain('Mar');
    expect(result).toContain('9');
    expect(result).toContain('2026');
  });

  it('displays UTC midnight as the previous day in Pacific (the bug this fix prevents)', () => {
    // Midnight UTC = 4:00 PM PT on Mar 8 — displays as March 8, not March 9
    const result = formatEventDate(new Date('2026-03-09T00:00:00Z'), 'America/Los_Angeles');
    expect(result).toContain('Mar');
    expect(result).toContain('8');
    expect(result).toContain('2026');
  });

  it('accepts custom Intl format options', () => {
    const result = formatEventDate(new Date('2025-03-15T12:00:00Z'), 'UTC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toContain('March');
    expect(result).toContain('2025');
  });
});
