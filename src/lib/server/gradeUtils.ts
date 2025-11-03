/**
 * Grade and Graduating Class Year Utilities
 * 
 * Handles conversion between "current grade" (9, 10, 11, 12) and 
 * "graduating class year" (e.g., 2025, 2026, 2027, 2028).
 * 
 * School year transitions occur in June. Events typically occur in spring (Jan-Jun),
 * so the event year is the graduation year for seniors in that event.
 */

/**
 * Get the school year ending year for a given event date.
 * School years run from July 1 to June 30.
 * 
 * @param eventDate - The date of the event
 * @returns The year in which the school year ends (graduation year)
 */
export function getSchoolYearEndingYear(eventDate: Date): number {
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1; // getMonth() returns 0-11
  
  // If event is Jan-Jun, school year ending is same year
  // If event is Jul-Dec, school year ending is next year
  if (month >= 7) {
    return year + 1;
  }
  return year;
}

/**
 * Convert graduating class year to current grade based on event date.
 * 
 * @param graduatingClassYear - The year the student will graduate (e.g., 2026)
 * @param eventDate - The date of the event
 * @returns The current grade (9, 10, 11, or 12)
 */
export function getCurrentGrade(graduatingClassYear: number, eventDate: Date): number {
  const schoolYearEnding = getSchoolYearEndingYear(eventDate);
  const grade = 12 - (graduatingClassYear - schoolYearEnding);
  
  // Clamp to valid grade range (9-12)
  if (grade < 9) return 9;
  if (grade > 12) return 12;
  return grade;
}

/**
 * Convert current grade to graduating class year based on event date.
 * 
 * @param currentGrade - The student's current grade (9, 10, 11, or 12)
 * @param eventDate - The date of the event
 * @returns The year the student will graduate (e.g., 2026)
 */
export function getGraduatingClassYear(currentGrade: number, eventDate: Date): number {
  const schoolYearEnding = getSchoolYearEndingYear(eventDate);
  return schoolYearEnding + (12 - currentGrade);
}

/**
 * Get valid graduating class year options for a signup dropdown.
 * Returns the four years that would correspond to grades 9-12.
 * 
 * @param eventDate - The date of the event
 * @returns Array of graduating class years [seniors, juniors, sophomores, freshmen]
 */
export function getGraduatingClassYearOptions(eventDate: Date): number[] {
  const schoolYearEnding = getSchoolYearEndingYear(eventDate);
  // For an event in school year ending in YYYY:
  // Class of YYYY = Grade 12 (seniors)
  // Class of YYYY+1 = Grade 11 (juniors)
  // Class of YYYY+2 = Grade 10 (sophomores)
  // Class of YYYY+3 = Grade 9 (freshmen)
  return [
    schoolYearEnding,      // Grade 12
    schoolYearEnding + 1,  // Grade 11
    schoolYearEnding + 2,  // Grade 10
    schoolYearEnding + 3   // Grade 9
  ];
}

/**
 * Validate that a graduating class year is in a valid range.
 * 
 * @param graduatingClassYear - The year to validate
 * @returns true if valid, false otherwise
 */
export function isValidGraduatingClassYear(graduatingClassYear: number): boolean {
  // Based on user requirements: 2025-2035
  return graduatingClassYear >= 2025 && graduatingClassYear <= 2035;
}

