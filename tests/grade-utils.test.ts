import { describe, it, expect } from 'vitest';
import {
  getCurrentGrade,
  getGraduatingClassYear,
  getGraduatingClassYearOptions,
  getSchoolYearEndingYear,
  isValidGraduatingClassYear
} from '$lib/server/gradeUtils';

describe('Grade Utilities', () => {
  describe('getSchoolYearEndingYear', () => {
    it('should return same year for Jan-Jun dates (spring events)', () => {
      const march2025 = new Date('2025-03-10');
      expect(getSchoolYearEndingYear(march2025)).toBe(2025);

      const jan2026 = new Date('2026-01-15');
      expect(getSchoolYearEndingYear(jan2026)).toBe(2026);
    });

    it('should return next year for Jul-Dec dates', () => {
      const october2025 = new Date('2025-10-15');
      expect(getSchoolYearEndingYear(october2025)).toBe(2026);

      // Use explicit date constructor to avoid timezone issues with string parsing
      const july2026 = new Date(2026, 6, 1); // Month is 0-indexed: 6 = July
      // July 1 is at the start of the school year that ends the following year
      // School year July 1, 2026 - June 30, 2027 ends in 2027
      expect(getSchoolYearEndingYear(july2026)).toBe(2027);
    });
  });

  describe('getCurrentGrade', () => {
    it('should convert Class of 2025 to Grade 12 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getCurrentGrade(2025, eventDate)).toBe(12);
    });

    it('should convert Class of 2026 to Grade 11 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getCurrentGrade(2026, eventDate)).toBe(11);
    });

    it('should convert Class of 2027 to Grade 10 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getCurrentGrade(2027, eventDate)).toBe(10);
    });

    it('should convert Class of 2028 to Grade 9 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getCurrentGrade(2028, eventDate)).toBe(9);
    });

    it('should convert Class of 2026 to Grade 12 for March 2026 event', () => {
      const eventDate = new Date('2026-03-10');
      expect(getCurrentGrade(2026, eventDate)).toBe(12);
    });

    it('should clamp to valid grade range for out-of-range class years', () => {
      const eventDate = new Date('2025-03-10');
      // Class of 2024 (would be grade 13, should clamp to 12)
      expect(getCurrentGrade(2024, eventDate)).toBe(12);
      // Class of 2029 (would be grade 8, should clamp to 9)
      expect(getCurrentGrade(2029, eventDate)).toBe(9);
    });
  });

  describe('getGraduatingClassYear', () => {
    it('should convert Grade 12 to Class of 2025 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getGraduatingClassYear(12, eventDate)).toBe(2025);
    });

    it('should convert Grade 11 to Class of 2026 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getGraduatingClassYear(11, eventDate)).toBe(2026);
    });

    it('should convert Grade 10 to Class of 2027 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getGraduatingClassYear(10, eventDate)).toBe(2027);
    });

    it('should convert Grade 9 to Class of 2028 for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      expect(getGraduatingClassYear(9, eventDate)).toBe(2028);
    });

    it('should convert Grade 12 to Class of 2026 for March 2026 event', () => {
      const eventDate = new Date('2026-03-10');
      expect(getGraduatingClassYear(12, eventDate)).toBe(2026);
    });
  });

  describe('getGraduatingClassYearOptions', () => {
    it('should return correct class years for March 2025 event', () => {
      const eventDate = new Date('2025-03-10');
      const options = getGraduatingClassYearOptions(eventDate);
      expect(options).toEqual([2025, 2026, 2027, 2028]);
    });

    it('should return correct class years for March 2026 event', () => {
      const eventDate = new Date('2026-03-10');
      const options = getGraduatingClassYearOptions(eventDate);
      expect(options).toEqual([2026, 2027, 2028, 2029]);
    });

    it('should handle fall events correctly', () => {
      const eventDate = new Date('2025-10-15');
      const options = getGraduatingClassYearOptions(eventDate);
      // October 2025 is in school year ending 2026
      expect(options).toEqual([2026, 2027, 2028, 2029]);
    });
  });

  describe('isValidGraduatingClassYear', () => {
    it('should accept valid years in range 2025-2035', () => {
      expect(isValidGraduatingClassYear(2025)).toBe(true);
      expect(isValidGraduatingClassYear(2030)).toBe(true);
      expect(isValidGraduatingClassYear(2035)).toBe(true);
    });

    it('should reject years below 2025', () => {
      expect(isValidGraduatingClassYear(2024)).toBe(false);
      expect(isValidGraduatingClassYear(2000)).toBe(false);
    });

    it('should reject years above 2035', () => {
      expect(isValidGraduatingClassYear(2036)).toBe(false);
      expect(isValidGraduatingClassYear(2050)).toBe(false);
    });
  });

  describe('Round-trip conversion', () => {
    it('should convert grade to class year and back to same grade', () => {
      const eventDate = new Date('2025-03-10');
      const originalGrade = 11;
      const classYear = getGraduatingClassYear(originalGrade, eventDate);
      const convertedGrade = getCurrentGrade(classYear, eventDate);
      expect(convertedGrade).toBe(originalGrade);
    });

    it('should work for all grades 9-12', () => {
      const eventDate = new Date('2025-03-10');
      for (let grade = 9; grade <= 12; grade++) {
        const classYear = getGraduatingClassYear(grade, eventDate);
        const convertedGrade = getCurrentGrade(classYear, eventDate);
        expect(convertedGrade).toBe(grade);
      }
    });
  });
});

