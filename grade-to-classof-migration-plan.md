# Grade to Graduating Class Migration Plan

## Current State Analysis

### Database Schema

- `Student.grade` is an `Int` field (values: 9, 10, 11, 12)
- Used throughout the codebase for filtering, sorting, statistics, and display

### Key Usage Areas Found

1. **Student Signup Form** (`src/routes/signup/student/+page.svelte`)

   - Dropdown with options: 9th, 10th, 11th, 12th Grade
   - Schema validation: `grade: z.number().int().min(9).max(12)`

2. **Admin Data Management** (`src/routes/dashboard/admin/data-mgmt/`)

   - Filters by grade (All, 9, 10, 11, 12)
   - Displays grade in student cards
   - Editable grade field in `StudentEditModal`
   - CSV export includes grade column

3. **Lottery System** (`src/lib/server/lottery.ts`)

   - Sorts students by grade (ASCENDING/DESCENDING/NONE)
   - Line 330-333: `studentsCopy.sort((a, b) => a.grade - b.grade)`

4. **Statistics & Visualizations** (`src/routes/visualizations/+page.server.ts`)

   - Grade distribution calculations
   - Groups students by grade for charts
   - Displays "Grade X" labels in UI
   - Student lists include grade

5. **Admin Dashboard** (`src/routes/dashboard/admin/+page.server.ts`)

   - Grade statistics (freshman, sophomore, junior, senior counts)
   - Lines 138-141: Maps grade numbers to names

6. **Graduation Logic** (`src/lib/server/eventManagement.ts`)

   - `getGraduationEligibleStudents()` queries `grade: 12`
   - Used to identify graduating seniors

7. **Archived Events** (`src/routes/dashboard/admin/archived/+page.server.ts`)

   - Grade distribution for archived events
   - Maps grades to freshman/sophomore/junior/senior

8. **CSV Exports** (`src/routes/dashboard/admin/data-mgmt/export/+server.ts`)

   - Includes "Grade" column in exported data

9. **Graduation Dialog** (`src/lib/components/admin/GraduationDialog.svelte`)
   - Displays "Grade 12 Student(s)" message
   - Student list interface includes `grade: number`

## Proposed Design Changes

### Database Schema Change

- **From**: `grade Int` (9, 10, 11, 12)
- **To**: `graduatingClassYear Int` (e.g., 2026, 2027, 2028, 2029)
- This field represents the year the student will graduate (e.g., "Class of 2026")

### Helper Functions Needed

Since we need to convert between "Class of" and "Grade" for UI/display purposes, we'll need:

1. **`getCurrentGrade(classOfYear: number, eventDate: Date): number`**

   - Converts graduating class year to current grade based on event date
   - Logic: If event is in 2026, Class of 2026 = Grade 12, Class of 2027 = Grade 11, etc.
   - Formula: `grade = 12 - (classOfYear - eventYear)`
   - Edge case: Handle school year transitions (typically June)

2. **`getGraduatingClassYear(currentGrade: number, eventDate: Date): number`**

   - Converts current grade to graduating class year
   - Formula: `classOfYear = eventYear + (12 - currentGrade)`
   - Edge case: Handle school year transitions

3. **`getGraduatingClassYearOptions(eventDate: Date): number[]`**
   - Returns array of valid graduating class years for signup dropdown
   - Typically: [eventYear, eventYear+1, eventYear+2, eventYear+3]
   - For event in 2026: [2026, 2027, 2028, 2029]

### Migration Strategy

1. **One-time Data Migration Script**
   - Query all students with their grade
   - Need event context to determine which year they were in
   - **Challenge**: We don't have historical event dates for each student
   - **Solution Options**:
     a. Use most recent event date for the student's school
     b. Use current year and assume existing grades are "current grade"
     c. Prompt admin to specify base year for migration
2. **Migration Logic**:
   - For each student, determine the event year context
   - Calculate: `graduatingClassYear = eventYear + (12 - grade)`
   - Update student record

## Implementation Plan

### Phase 1: Database Migration

1. Create migration to:
   - Add new `graduatingClassYear` field (nullable initially)
   - Run data migration script to populate `graduatingClassYear` from `grade`
   - Make `graduatingClassYear` required (not nullable)
   - Remove `grade` field OR keep it temporarily for rollback

### Phase 2: Helper Functions

1. Create `src/lib/server/gradeUtils.ts` with:
   - `getCurrentGrade(classOfYear, eventDate)`
   - `getGraduatingClassYear(currentGrade, eventDate)`
   - `getGraduatingClassYearOptions(eventDate)`
   - `getSchoolYearEndingYear(eventDate)` - determines if event is in school year ending in eventYear or eventYear+1

### Phase 3: Update Student Signup

1. Modify `src/routes/signup/student/schema.ts`:

   - Change from `grade: z.number().int().min(9).max(12)`
   - To: `graduatingClassYear: z.number().int().min(2020).max(2035)` (reasonable range)

2. Update `src/routes/signup/student/+page.svelte`:

   - Replace grade dropdown with graduating class year dropdown
   - Use `getGraduatingClassYearOptions()` to populate options
   - Display as "Class of 2026", "Class of 2027", etc.

3. Update signup server action to save `graduatingClassYear` instead of `grade`

### Phase 4: Update Admin Interfaces (Display Grade, Store ClassOf)

1. **Data Management Tab**:

   - When displaying students, calculate grade using `getCurrentGrade()`
   - When editing, show grade dropdown but save as `graduatingClassYear`
   - Filter dropdown shows grades (9, 10, 11, 12) but filters by converting to classOfYear

2. **Student Edit Modal**:
   - Display current grade (calculated)
   - Allow editing via grade dropdown
   - Convert grade selection to classOfYear when saving

### Phase 5: Update Lottery System

1. Modify `src/lib/server/lottery.ts`:
   - Before sorting, convert `graduatingClassYear` to `grade` for each student
   - Use converted grades for sorting logic
   - Keep all existing lottery algorithm logic unchanged

### Phase 6: Update Statistics & Visualizations

1. Modify `src/routes/visualizations/+page.server.ts`:

   - When calculating grade distributions, convert `graduatingClassYear` to `grade`
   - Display still shows "Grade X" but uses converted values
   - All charts and tables continue to show grades

2. Modify `src/routes/dashboard/admin/+page.server.ts`:
   - Convert graduatingClassYear to grade when calculating statistics
   - Keep freshman/sophomore/junior/senior naming

### Phase 7: Update Graduation Logic

1. Modify `getGraduationEligibleStudents()`:
   - Instead of `grade: 12`, calculate which classOfYear represents seniors
   - Query: `graduatingClassYear = eventYear` (for event in that year)

### Phase 8: CSV Exports

1. Continue exporting as "Grade" (converted from classOfYear)
2. No UI changes needed for CSV consumers

## Missing Considerations

### 1. School Year Transition Logic

**Question**: How do we determine which school year an event belongs to?

- **Option A**: Event date in Jan-Jun = previous school year (e.g., March 2026 event is 2025-2026 school year)
- **Option B**: Event date in Jul-Dec = current school year (e.g., October 2026 event is 2026-2027 school year)
- **Recommendation**: Assume events occur in spring (Jan-Jun), so event year = graduating year for seniors
  - Event in March 2026 → Class of 2026 = Grade 12
  - Event in March 2026 → Class of 2027 = Grade 11
  - etc.

### 2. Historical Data Context

**Challenge**: When migrating existing students, we need to know what "year" context their grade was set in.

- **Solution**: Use the most recent event date for the student's school as the reference year
- **Alternative**: Add a migration date parameter or ask admin to specify base year

### 3. Graduation Eligibility

**Current**: `grade === 12`
**New**: `graduatingClassYear === eventYear` (for event in that year)

- This will automatically identify seniors without needing grade increment logic

### 4. Filtering in Admin UI

**Current**: Filter dropdown shows "Grade 9", "Grade 10", etc.
**New**:

- Keep UI showing grades
- Convert filter selection to classOfYear range when querying
- Example: "Grade 10" filter → query students where `getCurrentGrade(graduatingClassYear, eventDate) === 10`

## Additional Files That May Need Updates

1. **Tests**: Update all test fixtures and mocks that reference `grade`
2. **Seed scripts**: Update to use `graduatingClassYear`
3. **Documentation**: Update any docs that reference grade fields

## Recommended Implementation Order

1. ✅ Create helper functions (`gradeUtils.ts`)
2. ✅ Create database migration (add field, migrate data, remove old field)
3. ✅ Update student signup form
4. ✅ Update admin data management (display grade, store classOf)
5. ✅ Update lottery system (convert when needed)
6. ✅ Update statistics/visualizations (convert when displaying)
7. ✅ Update graduation logic
8. ✅ Update tests
9. ✅ Update seed scripts

## Benefits of This Approach

1. ✅ Students carry forward automatically (no grade increment needed)
2. ✅ Graduation logic simpler (query by year, not grade)
3. ✅ More intuitive for students (they know their graduating class)
4. ✅ Historical accuracy (class of year doesn't change)
5. ✅ UI remains intuitive (still shows "Grade X" everywhere)

## Open Questions

1. **School Year Definition**: Should we hardcode June as the transition, or make it configurable?
2. **Migration Base Year**: How should we determine the reference year for existing students?
3. **Validation**: What's the valid range for graduatingClassYear? (e.g., 2020-2035?)
4. **Event Context**: Do we always need an event date to convert? Or can we use "current year"?
