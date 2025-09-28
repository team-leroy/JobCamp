<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";

  // Props
  interface EventControls {
    eventEnabled: boolean;
    companyAccountsEnabled: boolean;
    studentAccountsEnabled: boolean;
    studentSignupsEnabled: boolean;
    lotteryPublished: boolean;
    companyDirectoryEnabled: boolean;
  }

  interface Props {
    upcomingEvent?: EventControls | null;
  }

  const { upcomingEvent }: Props = $props();

  // Event control states - initialize from props
  let eventEnabled = $state(upcomingEvent?.eventEnabled ?? false);
  let companyAccountsEnabled = $state(
    upcomingEvent?.companyAccountsEnabled ?? false
  );
  let studentAccountsEnabled = $state(
    upcomingEvent?.studentAccountsEnabled ?? false
  );
  let studentSignupsEnabled = $state(
    upcomingEvent?.studentSignupsEnabled ?? false
  );
  let lotteryPublished = $state(upcomingEvent?.lotteryPublished ?? false);
  let companyDirectoryEnabled = $state(
    upcomingEvent?.companyDirectoryEnabled ?? false
  );
  let isArchiving = $state(false);
  let isUpdating = $state(false);

  // Handle control changes
  async function handleControlChange(control: string, currentValue: boolean) {
    const newValue = !currentValue;
    isUpdating = true;

    try {
      const formData = new FormData();
      formData.append("controlType", control);
      formData.append("enabled", newValue.toString());

      const response = await fetch("?/updateEventControls", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Update local state to reflect the change
        switch (control) {
          case "event":
            eventEnabled = newValue;
            break;
          case "companyAccounts":
            companyAccountsEnabled = newValue;
            break;
          case "studentAccounts":
            studentAccountsEnabled = newValue;
            break;
          case "studentSignups":
            studentSignupsEnabled = newValue;
            break;
          case "lotteryPublished":
            lotteryPublished = newValue;
            break;
          case "companyDirectory":
            companyDirectoryEnabled = newValue;
            break;
        }
      } else {
        console.error("Failed to update event control");
        // Optionally show error message to user
      }
    } catch (error) {
      console.error("Error updating event control:", error);
    } finally {
      isUpdating = false;
    }
  }

  // Handle archive event with graduation workflow
  async function handleArchiveEvent() {
    // First, get graduation preview
    try {
      const previewResponse = await fetch("/dashboard/admin?/getGraduationPreview", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
        
        if (previewResult.success && previewResult.students.length > 0) {
          // Show graduation dialog
          const studentList = previewResult.students
            .map(s => `• ${s.firstName} ${s.lastName} (Grade ${s.grade})`)
            .join('\n');
          
          const graduateStudents = confirm(
            `Archive Event: "${upcomingEvent?.name || 'Current Event'}"\n\n` +
            `📚 Graduate Senior Students?\n\n` +
            `Found ${previewResult.students.length} Grade 12 students:\n${studentList}\n\n` +
            `✅ Recommended: Graduate seniors to keep clean student lists\n` +
            `• Preserves their data for historical statistics\n` +
            `• Removes them from future event management\n` +
            `• They won't appear in new event creation\n\n` +
            `Click OK to archive event AND graduate seniors\n` +
            `Click Cancel to archive event WITHOUT graduating seniors`
          );

          await performArchive(graduateStudents);
        } else {
          // No seniors to graduate, proceed with simple archive
          if (confirm(
            "Are you sure you want to archive the current event? This will make it inactive and move it to archived events."
          )) {
            await performArchive(false);
          }
        }
      } else {
        // Fallback to simple archive if preview fails
        if (confirm(
          "Are you sure you want to archive the current event? This will make it inactive and move it to archived events."
        )) {
          await performArchive(false);
        }
      }
    } catch (error) {
      console.error("Error getting graduation preview:", error);
      // Fallback to simple archive
      if (confirm(
        "Are you sure you want to archive the current event? This will make it inactive and move it to archived events."
      )) {
        await performArchive(false);
      }
    }
  }

  async function performArchive(graduateStudents: boolean) {
    isArchiving = true;
    try {
      const formData = new FormData();
      formData.append('graduateStudents', graduateStudents.toString());

      const response = await fetch("/dashboard/admin?/archiveEventWithGraduation", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(result.message);
          // Reload the page to show updated state
          window.location.reload();
        } else {
          alert(`Failed to archive event: ${result.message}`);
        }
      } else {
        alert("Failed to archive event. Please try again.");
      }
    } catch (error) {
      console.error("Error archiving event:", error);
      alert("An error occurred while archiving the event.");
    } finally {
      isArchiving = false;
    }
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-xl font-bold mb-2">Event Controls</h2>
  <div class="mb-4 p-3 bg-blue-50 rounded-lg">
    <p class="text-sm text-blue-700">
      <strong>Active Event:</strong> An event must be "active" to be the primary
      event for your school.
      <br />
      <strong>Event Controls:</strong> These access controls determine what users
      can do within the active event. You can keep controls disabled while preparing
      your active event, then enable them when ready.
    </p>
  </div>

  <div class="space-y-4">
    <!-- Event Control -->
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center space-x-3">
        <Switch
          checked={eventEnabled}
          disabled={isUpdating}
          onclick={() => handleControlChange("event", eventEnabled)}
        />
        <Label class="text-base font-medium">Event</Label>
      </div>
      <span class="text-sm text-gray-500">
        {eventEnabled ? "Enabled" : "Disabled"}
        {#if isUpdating}
          <span class="ml-1 text-xs">(updating...)</span>
        {/if}
      </span>
    </div>

    <!-- Company Accounts Control -->
    <div
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      class:opacity-50={!eventEnabled}
    >
      <div class="flex items-center space-x-3">
        <Switch
          checked={companyAccountsEnabled}
          disabled={isUpdating || !eventEnabled}
          onclick={() =>
            handleControlChange("companyAccounts", companyAccountsEnabled)}
        />
        <Label class="text-base font-medium">Company Accounts</Label>
      </div>
      <span class="text-sm text-gray-500">
        {!eventEnabled
          ? "Requires Event Enabled"
          : companyAccountsEnabled
            ? "Enabled"
            : "Disabled"}
      </span>
    </div>

    <!-- Student Accounts Control -->
    <div
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      class:opacity-50={!eventEnabled}
    >
      <div class="flex items-center space-x-3">
        <Switch
          checked={studentAccountsEnabled}
          disabled={isUpdating || !eventEnabled}
          onclick={() =>
            handleControlChange("studentAccounts", studentAccountsEnabled)}
        />
        <Label class="text-base font-medium">Student Accounts</Label>
      </div>
      <span class="text-sm text-gray-500">
        {!eventEnabled
          ? "Requires Event Enabled"
          : studentAccountsEnabled
            ? "Enabled"
            : "Disabled"}
      </span>
    </div>

    <!-- Student Signups Control -->
    <div
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      class:opacity-50={!eventEnabled || !studentAccountsEnabled}
    >
      <div class="flex items-center space-x-3">
        <Switch
          checked={studentSignupsEnabled}
          disabled={isUpdating || !eventEnabled || !studentAccountsEnabled}
          onclick={() =>
            handleControlChange("studentSignups", studentSignupsEnabled)}
        />
        <Label class="text-base font-medium">Student Signups</Label>
      </div>
      <span class="text-sm text-gray-500">
        {!eventEnabled
          ? "Requires Event Enabled"
          : !studentAccountsEnabled
            ? "Requires Student Accounts"
            : studentSignupsEnabled
              ? "Enabled"
              : "Disabled"}
      </span>
    </div>

    <!-- Lottery Published Control -->
    <div
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      class:opacity-50={!eventEnabled}
    >
      <div class="flex items-center space-x-3">
        <Switch
          checked={lotteryPublished}
          disabled={isUpdating || !eventEnabled}
          onclick={() =>
            handleControlChange("lotteryPublished", lotteryPublished)}
        />
        <Label class="text-base font-medium">Lottery Published</Label>
      </div>
      <span class="text-sm text-gray-500">
        {!eventEnabled
          ? "Requires Event Enabled"
          : lotteryPublished
            ? "Published"
            : "Hidden"}
      </span>
    </div>

    <!-- Company Directory Control -->
    <div
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      class:opacity-50={!eventEnabled}
    >
      <div class="flex items-center space-x-3">
        <Switch
          checked={companyDirectoryEnabled}
          disabled={isUpdating || !eventEnabled}
          onclick={() =>
            handleControlChange("companyDirectory", companyDirectoryEnabled)}
        />
        <Label class="text-base font-medium">Company Directory</Label>
      </div>
      <span class="text-sm text-gray-500">
        {!eventEnabled
          ? "Requires Event Enabled"
          : companyDirectoryEnabled
            ? "Public"
            : "Hidden"}
      </span>
    </div>
  </div>

  <!-- Status Summary -->
  <div class="mt-6 pt-4 border-t border-gray-200">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-600">Active Controls:</span>
      <span class="font-medium text-blue-600">
        {[
          eventEnabled,
          companyAccountsEnabled,
          studentAccountsEnabled,
          studentSignupsEnabled,
          lotteryPublished,
          companyDirectoryEnabled,
        ].filter(Boolean).length}/6
      </span>
    </div>
  </div>

  <!-- Archive Event Button -->
  <div class="mt-6 pt-4 border-t border-gray-200">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium text-gray-900">Archive Current Event</h3>
        <p class="text-xs text-gray-500">
          Move the current event to archived status
        </p>
      </div>
      <button
        onclick={handleArchiveEvent}
        disabled={isArchiving}
        class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"
      >
        {isArchiving ? "Archiving..." : "Archive Event"}
      </button>
    </div>
  </div>
</div>
