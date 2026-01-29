# JobCamp Event Workflow - Complete Test Plan

## Prerequisites
- Clean event created but NOT activated yet
- Admin account with full permissions
- Access to test email accounts for students and hosts
- Access to test phone numbers (optional for SMS testing)

---

## Phase 1: Event Setup & Configuration

### 1.1 Event Activation
- [ ] Navigate to Admin Dashboard
- [ ] Verify event shows as "Draft" status
- [ ] Activate the event
- [ ] Confirm event status changes to "Active"
- [ ] Verify only one event can be active at a time

### 1.2 Event Controls Configuration
- [ ] Navigate to Event Management page
- [ ] Configure event controls:
  - [ ] Enable "Student Accounts"
  - [ ] Enable "Company Accounts"
  - [ ] Enable "Student Signups"
  - [ ] Enable "Company Directory"
  - [ ] Keep "Lottery Published" DISABLED (for now)
- [ ] Verify controls save successfully
- [ ] Verify navbar shows Login/Signup links when controls are enabled

### 1.3 Important Dates (Optional)
- [ ] Add important dates for the event (e.g., "Position Selection Deadline")
- [ ] Verify dates display correctly
- [ ] Test editing/deleting dates

---

## Phase 2: Company & Host Setup

### 2.1 Company Signup
- [ ] Log out from admin
- [ ] Navigate to school homepage
- [ ] Click "Company Signup"
- [ ] Create 3-5 test companies with different names
- [ ] Verify email verification process for each company
- [ ] Log in as each company host

### 2.2 Position Creation
For each company/host:
- [ ] Navigate to Dashboard
- [ ] Create 2-3 positions with:
  - [ ] Different careers (select from dropdown)
  - [ ] Different slot counts (1, 2, 5)
  - [ ] Complete all required fields (title, summary, contact info, address, times)
  - [ ] Some with instructions/attire, some without
- [ ] Verify positions save as "Draft" initially
- [ ] Verify positions appear in "My Positions" list

### 2.3 Position Publishing
- [ ] Edit each position
- [ ] Click "Publish Position"
- [ ] Verify status changes from "Draft" to "Published"
- [ ] Verify published positions appear in company directory (if enabled)
- [ ] Test unpublishing and republishing

### 2.4 Admin Position Creation
- [ ] Log back in as admin
- [ ] Navigate to Edit/Search Data → Position tab
- [ ] Click "Create Position"
- [ ] Create a position as admin (gets assigned to "JobCamp Admin" company)
- [ ] Publish the position

---

## Phase 3: Student Enrollment & Position Selection

### 3.1 Student Signup
- [ ] Log out
- [ ] Navigate to school homepage
- [ ] Click "Student Signup"
- [ ] Create 10-15 test students across different grades (9-12)
- [ ] Verify school email domain enforcement (if enabled)
- [ ] Verify email verification process
- [ ] Log in as each student

### 3.2 View Company Directory
For each student:
- [ ] Navigate to "View Companies" page
- [ ] Verify all published positions appear
- [ ] Test filtering by career
- [ ] Test search functionality
- [ ] View position details

### 3.3 Permission Slip Completion
For each student:
- [ ] Navigate to Dashboard
- [ ] Click "Complete Permission Slip"
- [ ] Fill out all required fields:
  - [ ] Phone number
  - [ ] Parent email
  - [ ] Emergency contact info
  - [ ] Medical information
  - [ ] Agreements/signatures
- [ ] Submit permission slip
- [ ] Verify status changes to "Complete"

### 3.4 Position Selection/Ranking
For each student:
- [ ] Navigate to Dashboard
- [ ] Click "Select Your Positions"
- [ ] Search/filter available positions
- [ ] Add 3-5 positions to picks
- [ ] Rank positions in order of preference (drag to reorder)
- [ ] Verify rank order updates correctly
- [ ] Submit position selections
- [ ] Verify selections appear on dashboard

### 3.5 Test Edge Cases
- [ ] Create 1-2 students with NO position selections (test "No Picks" status)
- [ ] Create 1-2 students who complete permission slip but don't select positions
- [ ] Create 1-2 students who select positions but don't complete permission slip

---

## Phase 4: Admin Data Management

### 4.1 View Student Data
- [ ] Log in as admin
- [ ] Navigate to Edit/Search Data → Student tab
- [ ] Test filters:
  - [ ] Filter by last name
  - [ ] Filter by grade
  - [ ] Filter by permission slip status
  - [ ] Filter by lottery status
- [ ] View student details (expand a student record)
- [ ] Verify permission slip status displays correctly
- [ ] Verify student picks display correctly

### 4.2 Edit Student Data
- [ ] Click "Edit" on a student
- [ ] Modify name, grade, phone, email, parent email
- [ ] Save changes
- [ ] Verify changes persist after refresh

### 4.3 Export Student Data
- [ ] Apply various filters
- [ ] Click "Export CSV"
- [ ] Verify CSV downloads with filtered results
- [ ] Verify all columns are present and accurate

### 4.4 Message Students
- [ ] Apply filters to select a subset of students
- [ ] Click "Message Students" button
- [ ] Test Email:
  - [ ] Enter subject and message
  - [ ] Preview recipients
  - [ ] Send to students only
  - [ ] Send to students + parents
- [ ] Test SMS (if configured):
  - [ ] Enter message
  - [ ] Preview recipients
  - [ ] Send SMS

### 4.5 View & Export Company Data
- [ ] Navigate to Edit/Search Data → Company tab
- [ ] View all companies
- [ ] Verify position counts are accurate
- [ ] Test company name filter
- [ ] Edit a company (name, description, URL)
- [ ] Export companies to CSV
- [ ] Verify CSV data

### 4.6 View & Export Host Data
- [ ] Navigate to Edit/Search Data → Host tab
- [ ] View all hosts
- [ ] Verify company associations
- [ ] Test host name filter
- [ ] Edit a host (name, email)
- [ ] Export hosts to CSV
- [ ] Verify CSV data

### 4.7 View & Export Position Data
- [ ] Navigate to Edit/Search Data → Position tab
- [ ] View all positions
- [ ] Test filters (title, career)
- [ ] View position details
- [ ] Edit a position
- [ ] Export positions to CSV
- [ ] Verify CSV includes all position details

---

## Phase 5: Lottery Configuration & Execution

### 5.1 Review Pre-Lottery Statistics
- [ ] Navigate to Admin Dashboard
- [ ] Review statistics:
  - [ ] Total students
  - [ ] Students with picks vs. no picks
  - [ ] Total positions
  - [ ] Total slots available
  - [ ] Permission slip completion rates
  - [ ] Verify charts display correctly

### 5.2 Visualizations (Pre-Lottery)
- [ ] Navigate to Visualizations page
- [ ] Review timeline statistics
- [ ] Review student demographics
- [ ] Review position distribution by career
- [ ] Review company statistics
- [ ] Verify all charts render correctly

### 5.3 Manual Assignments
- [ ] Navigate to Lottery page
- [ ] Review lottery configuration
- [ ] Add 2-3 manual assignments:
  - [ ] Select specific students
  - [ ] Assign to specific positions
  - [ ] Verify assignments appear in configuration
- [ ] Test removing a manual assignment

### 5.4 Prefill Settings
- [ ] Add prefill settings for 1-2 companies:
  - [ ] Set prefill percentage (e.g., 50%)
  - [ ] Verify calculated slot count
- [ ] Test removing a prefill setting

### 5.5 Grade Order Configuration
- [ ] Test different grade orders:
  - [ ] NONE (random)
  - [ ] SENIORS_FIRST (12, 11, 10, 9)
  - [ ] JUNIORS_FIRST (11, 12, 10, 9)
  - [ ] SOPHOMORES_FIRST (10, 11, 12, 9)
  - [ ] FRESHMEN_FIRST (9, 10, 11, 12)
- [ ] Select desired grade order for lottery

### 5.6 Run Lottery
- [ ] Click "Run Lottery"
- [ ] Confirm lottery execution
- [ ] Wait for lottery to complete
- [ ] Verify success message appears
- [ ] Review lottery results summary

### 5.7 Review Lottery Results (Admin)
- [ ] Navigate to Lottery page
- [ ] Review assignment statistics:
  - [ ] Total students assigned
  - [ ] Total students unassigned
  - [ ] Verify manual assignments were honored
  - [ ] Verify prefill settings were applied
- [ ] View individual student assignments
- [ ] Verify no position exceeds its slot limit

### 5.8 Re-run Lottery (Optional)
- [ ] Click "Run Lottery" again (should overwrite previous results)
- [ ] Verify new assignments are created
- [ ] Verify previous assignments are replaced

---

## Phase 6: Publish Lottery Results

### 6.1 Update Event Controls
- [ ] Navigate to Event Management
- [ ] Enable "Lottery Published" control
- [ ] Verify "Student Signups" is automatically disabled (mutual exclusivity)
- [ ] Save changes

### 6.2 Verify Student Access to Results
Log in as various students:
- [ ] Students WITH assignments:
  - [ ] Navigate to Dashboard
  - [ ] Verify lottery assignment displays prominently
  - [ ] Verify position details (company, title, address, times)
  - [ ] Verify "View Assignment" or similar CTA appears
- [ ] Students WITHOUT assignments:
  - [ ] Verify "Unassigned" status displays
  - [ ] Verify appropriate messaging appears
- [ ] Students with NO picks:
  - [ ] Verify "No Picks" status displays

### 6.3 Verify Visualizations (Post-Lottery)
- [ ] Log in as admin
- [ ] Navigate to Visualizations page
- [ ] Verify lottery statistics appear:
  - [ ] Choice distribution (1st choice, 2nd choice, etc.)
  - [ ] Assignment success rates
  - [ ] Lottery timeline data
- [ ] Verify event selector allows viewing previous events

---

## Phase 7: Event Lifecycle Management

### 7.1 Test Event State Transitions
- [ ] Disable "Lottery Published"
- [ ] Disable all event controls
- [ ] Verify homepage shows "Coming Soon" or event inactive state
- [ ] Re-enable controls
- [ ] Verify functionality returns

### 7.2 Archive Event
- [ ] Navigate to Admin Dashboard
- [ ] Archive the active event
- [ ] Verify event status changes to "Archived"
- [ ] Verify no active event exists
- [ ] Verify homepage shows "No Active Event" state
- [ ] Verify data management page shows "No Active Event" warning

### 7.3 View Archived Event Data
- [ ] Navigate to Visualizations page
- [ ] Select the archived event from dropdown
- [ ] Verify all historical data displays correctly
- [ ] Verify statistics are event-specific

### 7.4 Activate Another Event (if available)
- [ ] Create a new event
- [ ] Activate the new event
- [ ] Verify previous event data doesn't bleed into new event
- [ ] Verify new event starts with clean state

---

## Phase 8: Cross-Role Permission Testing

### 8.1 Student Account Restrictions
- [ ] Log in as student
- [ ] Attempt to access admin routes:
  - [ ] `/dashboard/admin` - should redirect
  - [ ] `/dashboard/admin/event-mgmt` - should redirect
  - [ ] `/dashboard/admin/data-mgmt` - should redirect
  - [ ] `/visualizations` - should redirect

### 8.2 Host Account Restrictions
- [ ] Log in as host
- [ ] Verify can only:
  - [ ] View own positions
  - [ ] Create/edit/publish own positions
  - [ ] View dashboard with position stats
- [ ] Attempt to access admin routes - should redirect
- [ ] Verify cannot see other companies' positions

### 8.3 Read-Only Admin (if applicable)
- [ ] Log in as read-only admin (if you have this role)
- [ ] Verify can view all data
- [ ] Verify cannot edit data
- [ ] Verify cannot run lottery
- [ ] Verify cannot send messages

### 8.4 Unauthenticated Access
- [ ] Log out completely
- [ ] Verify public pages are accessible:
  - [ ] School homepage
  - [ ] Company directory (if enabled)
  - [ ] Login/signup pages
- [ ] Verify protected pages redirect to login:
  - [ ] Dashboard
  - [ ] Admin pages
  - [ ] Position selection

---

## Phase 9: Email Verification & Password Reset

### 9.1 Email Verification Flow
- [ ] Create new student account
- [ ] Verify email verification page appears
- [ ] Check email for verification code
- [ ] Enter code and verify
- [ ] Verify redirect to dashboard after verification

### 9.2 Resend Verification Code
- [ ] Create new account
- [ ] Click "Resend Code" on verification page
- [ ] Verify new code is received
- [ ] Verify old code no longer works
- [ ] Verify new code works

### 9.3 Password Reset (if implemented)
- [ ] Click "Forgot Password" on login page
- [ ] Enter email address
- [ ] Check email for reset link/code
- [ ] Reset password
- [ ] Verify can log in with new password

---

## Phase 10: Edge Cases & Error Handling

### 10.1 Concurrent Access
- [ ] Have 2+ students select the same position simultaneously
- [ ] Run lottery
- [ ] Verify slot limits are respected

### 10.2 Oversubscribed Positions
- [ ] Create a position with 1 slot
- [ ] Have 5+ students select it
- [ ] Run lottery
- [ ] Verify only 1 student is assigned
- [ ] Verify others are marked as unassigned

### 10.3 Undersubscribed Positions
- [ ] Create positions with no student selections
- [ ] Run lottery
- [ ] Verify these positions show as "unfilled" in statistics

### 10.4 Invalid Data Entry
- [ ] Test form validations:
  - [ ] Invalid email formats
  - [ ] Missing required fields
  - [ ] Invalid phone numbers
  - [ ] Invalid slot counts (negative, zero, non-numeric)
- [ ] Verify appropriate error messages appear

### 10.5 Session Expiry
- [ ] Log in as student
- [ ] Leave browser idle for extended period
- [ ] Attempt to navigate
- [ ] Verify graceful handling (redirect to login)

### 10.6 Duplicate Account Prevention
- [ ] Attempt to create student account with existing email
- [ ] Attempt to create company account with existing email
- [ ] Verify appropriate error messages

---

## Phase 11: Mobile Responsiveness (Optional)

- [ ] Test all major pages on mobile device/viewport:
  - [ ] Homepage
  - [ ] Login/Signup
  - [ ] Student Dashboard
  - [ ] Position Selection
  - [ ] Company Directory
  - [ ] Admin Dashboard
  - [ ] Data Management
- [ ] Verify navigation works on mobile
- [ ] Verify forms are usable on mobile
- [ ] Verify tables/lists are readable on mobile

---

## Phase 12: Performance & Data Integrity

### 12.1 Large Dataset Testing
- [ ] Create 50+ students
- [ ] Create 20+ positions
- [ ] Test page load times
- [ ] Test filter performance
- [ ] Test export performance

### 12.2 Data Integrity Checks
- [ ] After lottery, verify:
  - [ ] No position exceeds slot limit
  - [ ] All manual assignments were honored
  - [ ] Student pick rankings were respected where possible
  - [ ] Grade ordering was applied correctly
- [ ] Export all data and verify accuracy

### 12.3 Browser Compatibility (Optional)
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

---

## Success Criteria

All test cases should pass with:
- ✅ No broken functionality
- ✅ No console errors
- ✅ Appropriate error messages for invalid input
- ✅ Data persists correctly across sessions
- ✅ Role-based access control works correctly
- ✅ Lottery results are accurate and fair
- ✅ Email/SMS notifications work (if configured)
- ✅ CSV exports contain accurate data
- ✅ UI is responsive and user-friendly

---

## Notes

- **Test Data Cleanup**: After testing, you may want to archive this event and create a fresh one for production use.
- **Email Testing**: Use email testing tools (like Mailtrap, MailHog) or real email addresses you control.
- **SMS Testing**: SMS requires valid Twilio configuration. Test with real phone numbers you control.
- **Backup**: Consider backing up your database before running destructive tests.
- **Documentation**: Note any bugs or issues discovered during testing for follow-up fixes.

---

**Estimated Testing Time**: 4-6 hours for complete workflow
**Recommended Approach**: Test in order, as each phase builds on the previous one









