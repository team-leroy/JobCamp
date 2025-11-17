# Email Template Examples

This document shows what each email template will look like when filled with sample event data.

## Sample Event Data Used

- **Event Name**: "Spring 2025 JobCamp"
- **Event Date**: "Mon, Mar 10, 2025"
- **School Name**: "Los Gatos High School"
- **Previous Event Stats**: "Our 2024 event placed 285 students to over 58 companies"

---

## 1. Position Update Email

**Subject**: `JobCamp.org position published for Mon, Mar 10, 2025`

**Template**: `src/lib/emails/positionUpdate.html`

**Filled Example**:

```
Hi,
Thank you for planning to participate in Los Gatos High School's Spring 2025 JobCamp on Mon, Mar 10, 2025. You have published a new position or updated an existing one. This position will now be visible to students for selection.

Title: Software Engineer Intern
# of slots for students: 3
Summary: Learn about software development in a fast-paced tech startup environment. Students will work alongside engineers on real projects.

You'll receive an email approximately 2 weeks before the event with the names of student(s) assigned to your position.

Go To Dashboard

Note: The primary contact's name and email will NOT be shared with students at this time. Immediately preceding Spring 2025 JobCamp, students will receive contact information in order to reach out with an introductory email and to confirm their attendance.

Please let us know if you have any questions.
Regards,
JobCamp Team
admin@jobcamp.org
```

---

## 2. Permission Slip Email

**Subject**: `Permission Slip for Sarah`

**Template**: `src/lib/emails/permissionSlip.html`

**Filled Example**:

```
Hi,
Sarah plans to participate in Los Gatos High School's Spring 2025 JobCamp on Mon, Mar 10, 2025. JobCamp provides an opportunity for high school students to learn about various careers by shadowing local professionals.

Los Gatos High School requires a permission slip be completed for every student who plans to participate. This link is specific to your child's JobCamp registration.
https://jobcamp.org/permission-slip/abc123def456

Our 2024 event placed 285 students to over 58 companies and the students learned about careers from engineering to real estate and marketing to medicine. You can view the list of participating companies here. Also view these FAQs for more information on what to expect.

We would love your support to encourage your child to research companies and careers they are interested in and select their top choices. We will run a lottery to match students with their position preferences. You and your child will be notified of their assigned position.

Please let us know if you have any questions.
Regards,
JobCamp Team
admin@jobcamp.org
```

---

## 3. Lottery Results Email

**Subject**: `JobCamp lottery results are out!`

**Template**: `src/lib/emails/lotteryResults.html`

**Filled Example**:

```
Hello,
Your job shadow day assignment has been posted to JobCamp.org.  Please log in with your account and view your Dashboard.  A few important things:
<ul>
    <li>PLEASE READ your position details carefully.  There may be forms to sign or other immediate steps to take.</li>
    <li>If your plans have changed and you cannot participate, you must email admin@jobcamp.org now.  No-shows on Mon, Mar 10, 2025 are unacceptable.</li>
    <li>Upcoming deadlines are shown on the dashboard, but for quick reference they are:
        <ul>
            <li>Fri, Feb 28 - MANDATORY Job Shadow Orientation in theater at Tutorial</li>
            <li>Feb 28 thru Mar 6 - Email your host an introduction and confirmation you'll be there</li>
            <li>Mon Mar 10 - JOB SHADOW DAY!</li>
            <li>Tues Mar 18 - Email your host a "thank you" and take the survey</li>
        </ul>
    </li>
</ul>

Please let us know if you have any questions.
Thanks and enjoy this unique experience!

-JobCamp Team
```

---

## 4. Permission Slip Page (Web Form)

**Template**: `src/routes/permission-slip/[code]/+page.svelte`

**Filled Example** (key sections):

### Header:

```
Permission Slip for Sarah

This form is required for every student participating in Spring 2025 JobCamp on Mon, Mar 10, 2025.
It includes:
- Contact Information
- Parent/Guardian Permission
- Medical Treatment Authorization
- Liability and Photo/Video Release
```

### Phone Number Field:

```
Parent/Guardian phone number (reachable on Mon, Mar 10, 2025)
```

### Student Agreement Section:

```
Students Agree to:
• MANDATORY Job Shadow Orientation on Fri, Feb 28, 2025 at Tutorial
• Email host introduction by Mar 6, 2025 - Confirm attendance for job shadow day
• Attend any job shadow position to which they are assigned.
• Secure transportation to/from job shadow position.
• Abide by dress and behavior expectations befitting a Los Gatos High School student, including being on time.
• Contact job shadow host if an emergency situation arises and can no longer attend.
• Write a thank-you email to the host and complete a Job Shadow survey by Mon, Mar 17, 2025.
```

### Liability Section:

```
Student is voluntarily participating in the Spring 2025 JobCamp program sponsored by the Los Gatos High School Home & School Club. Parent/legal guardian gives permission for the student to attend job shadow assignment.

We (the student and parent/legal guardian) in consideration for Los Gatos High School and its school district permitting my child to participate in the Spring 2025 JobCamp program, the undersigned on behalf of student, student heirs, executors, administrators, and assigns, voluntarily releases, discharges, waives any and all actions or causes of action for personal injury, property damage, or wrongful death (including attorney's fees and costs) arising out of or in connection with the student's time at the Spring 2025 JobCamp program, or any activity incidental thereto, whether or not such injuries, death or damages are caused by the negligence, active or passive, of Los Gatos High School, its school district, Home & School Club, Parent Volunteers and/or the job shadow hosting companies.

[Additional liability clauses continue with Spring 2025 JobCamp and Los Gatos High School references...]

Photos and videos may be taken during Spring 2025 JobCamp. This media may be used to promote JobCamp, Los Gatos High School College and Career Center, or the hosting company's community relations. If you would like to decline permission, please email admin@jobcamp.org.
```

---

## Key Dynamic Elements

### Template Variables Used:

- `${eventName}` → "Spring 2025 JobCamp"
- `${eventDate}` → "Mon, Mar 10, 2025"
- `${schoolName}` → "Los Gatos High School"
- `${previousEventStats}` → "Our 2024 event placed 285 students to over 58 companies"
- `${importantDates}` → HTML list of important dates from database
- `${assignmentNotificationDate}` → Calculated 2 weeks before event
- `${thankYouDeadline}` → Calculated 1 week after event

### Calculated Dates:

- **Assignment Notification**: ~2 weeks before event
- **Thank You Deadline**: 1 week after event (Mon, Mar 17, 2025)
- **Important Dates**: Pulled from database ImportantDate records

### Fallback Behavior:

- If no event data: Uses "Job Shadow Day", "the event date", "the school"
- If no important dates: Shows generic message
- If no previous event stats: Shows generic success message
