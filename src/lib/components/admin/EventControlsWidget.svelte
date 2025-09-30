<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import GraduationDialog from "./GraduationDialog.svelte";
  import type { EventWithStats } from "$lib/server/eventManagement";

  interface Props {
    upcomingEvent?: EventWithStats | null;
  }

  const { upcomingEvent }: Props = $props();

  // Check if there's an active event
  const hasActiveEvent = upcomingEvent && upcomingEvent.isActive;

  // Event control states - initialize from props
  let eventEnabled = $state(upcomingEvent?.eventEnabled ?? false);
  let companyAccountsEnabled = $state(
    upcomingEvent?.companyAccountsEnabled ?? false
  );
  let companySignupsEnabled = $state(
    upcomingEvent?.companySignupsEnabled ?? false
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

  // State for graduation dialog
  let showGraduationDialog = $state(false);
  let graduationStudents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
  }> = $state([]);

        // Handle control changes using native form submission
        function handleControlChange(control: string, currentValue: boolean) {
          const newValue = !currentValue;
          isUpdating = true;

          console.log(`🔄 Attempting to change ${control} from ${currentValue} to ${newValue}`);

          // Create a form and submit it natively
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/dashboard/admin/event-mgmt?/updateEventControls';
          
          const controlTypeInput = document.createElement('input');
          controlTypeInput.type = 'hidden';
          controlTypeInput.name = 'controlType';
          controlTypeInput.value = control;
          form.appendChild(controlTypeInput);
          
          const enabledInput = document.createElement('input');
          enabledInput.type = 'hidden';
          enabledInput.name = 'enabled';
          enabledInput.value = newValue.toString();
          form.appendChild(enabledInput);
          
          document.body.appendChild(form);
          form.submit();
        }

  // Handle archive event with graduation workflow
  async function handleArchiveEvent() {
    console.log("🔍 Starting archive event with graduation workflow...");

    try {
      // Call the API endpoint to get actual graduation-eligible students
      const response = await fetch("/api/graduation-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("🎓 API response:", result);

        if (result.success && result.students) {
          graduationStudents = result.students;
          console.log(
            `🎓 Found ${graduationStudents.length} eligible seniors from database`
          );
          showGraduationDialog = true;
        } else {
          console.log(
            "❌ No eligible students found or server error:",
            result.message
          );
          graduationStudents = [];
          showGraduationDialog = true;
        }
      } else {
        console.error(
          "❌ Failed to fetch graduation preview:",
          response.status
        );
        graduationStudents = [];
        showGraduationDialog = true;
      }
    } catch (error) {
      console.error("❌ Error fetching graduation preview:", error);
      graduationStudents = [];
      showGraduationDialog = true;
    }
  }

  function performArchive(graduateStudents: boolean) {
    // Create and submit a form programmatically
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/dashboard/admin?/archiveEventWithGraduation";

    const graduateInput = document.createElement("input");
    graduateInput.type = "hidden";
    graduateInput.name = "graduateStudents";
    graduateInput.value = graduateStudents.toString();

    form.appendChild(graduateInput);
    document.body.appendChild(form);

    console.log(
      "🔄 Submitting archive form with graduation:",
      graduateStudents
    );
    form.submit();
  }

  // Handle graduation dialog events
  function handleGraduationConfirm(
    event: CustomEvent<{ graduateStudents: boolean }>
  ) {
    console.log("🎓 EventControlsWidget received confirm event:", event.detail);
    performArchive(event.detail.graduateStudents);
  }

  function handleGraduationCancel() {
    console.log("❌ EventControlsWidget received cancel event");
    showGraduationDialog = false;
    graduationStudents = [];
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-xl font-bold mb-2">Event Controls</h2>

  {#if !hasActiveEvent}
    <!-- No Active Event Message -->
    <div class="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <div class="flex items-start">
        <svg
          class="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-yellow-800">No Active Event</h3>
          <p class="text-sm text-yellow-700 mt-1">
            You need an active event to configure event controls. Create a new
            event above and activate it to access these controls.
          </p>
        </div>
      </div>
    </div>
  {:else}
    <!-- Active Event Info -->
    <div class="mb-4 p-3 bg-blue-50 rounded-lg">
      <p class="text-sm text-blue-700">
        <strong>Active Event:</strong>
        {upcomingEvent.name} ({upcomingEvent.date.toLocaleDateString()})
        <br />
        <strong>Event Controls:</strong> These access controls determine what users
        can do within the active event. You can keep controls disabled while preparing
        your active event, then enable them when ready.
      </p>
    </div>
  {/if}

  {#if hasActiveEvent}
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

      <!-- Company Signups Control -->
      <div
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        class:opacity-50={!eventEnabled || !companyAccountsEnabled}
      >
        <div class="flex items-center space-x-3">
          <Switch
            checked={companySignupsEnabled}
            disabled={isUpdating || !eventEnabled || !companyAccountsEnabled}
            onclick={() =>
              handleControlChange("companySignups", companySignupsEnabled)}
          />
          <Label class="text-base font-medium">Company Signups</Label>
        </div>
        <span class="text-sm text-gray-500">
          {!eventEnabled
            ? "Requires Event Enabled"
            : !companyAccountsEnabled
              ? "Requires Company Accounts"
              : companySignupsEnabled
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
          <Label class="text-base font-medium">Student Assignments</Label>
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
            companySignupsEnabled,
            studentAccountsEnabled,
            studentSignupsEnabled,
            lotteryPublished,
            companyDirectoryEnabled,
          ].filter(Boolean).length}/7
        </span>
      </div>
    </div>

    <!-- Archive Event Button -->
    <div class="mt-6 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-gray-900">
            Archive Current Event
          </h3>
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
  {/if}
</div>

<!-- Graduation Dialog -->
<GraduationDialog
  bind:isOpen={showGraduationDialog}
  eventName={upcomingEvent?.name || "Current Event"}
  students={graduationStudents}
  on:confirm={handleGraduationConfirm}
  on:cancel={handleGraduationCancel}
/>
