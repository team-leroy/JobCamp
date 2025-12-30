<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import type { EventWithStats } from "$lib/server/eventManagement";

  interface Props {
    upcomingEvent?: EventWithStats | null;
  }

  const { upcomingEvent }: Props = $props();
  
  // Check if there's an active event
  const hasActiveEvent = $derived(!!upcomingEvent && upcomingEvent.isActive);

  // Event control states - derived from props
  const companyAccountsEnabled = $derived(
    upcomingEvent?.companyAccountsEnabled ?? false
  );
  const companySignupsEnabled = $derived(
    upcomingEvent?.companySignupsEnabled ?? false
  );
  const studentAccountsEnabled = $derived(
    upcomingEvent?.studentAccountsEnabled ?? false
  );
  const studentSignupsEnabled = $derived(
    upcomingEvent?.studentSignupsEnabled ?? false
  );
  const lotteryPublished = $derived(upcomingEvent?.lotteryPublished ?? false);
  const companyDirectoryEnabled = $derived(
    upcomingEvent?.companyDirectoryEnabled ?? false
  );

  let isUpdating = $state(false);

  // Handle control changes using native form submission
  function handleControlChange(control: string, currentValue: boolean) {
    const newValue = !currentValue;
    isUpdating = true;

    console.log(
      `🔄 Attempting to change ${control} from ${currentValue} to ${newValue}`
    );

    // Create a form and submit it natively
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/dashboard/admin/event-mgmt?/updateEventControls";

    const controlTypeInput = document.createElement("input");
    controlTypeInput.type = "hidden";
    controlTypeInput.name = "controlType";
    controlTypeInput.value = control;
    form.appendChild(controlTypeInput);

    const enabledInput = document.createElement("input");
    enabledInput.type = "hidden";
    enabledInput.name = "enabled";
    enabledInput.value = newValue.toString();
    form.appendChild(enabledInput);

    document.body.appendChild(form);
    form.submit();
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
      {#if upcomingEvent}
        <strong>Active Event:</strong>
        {upcomingEvent.name} ({upcomingEvent.date.toLocaleDateString("en-US", {
          timeZone: "UTC",
        })})
      {/if}
        <br />
        <strong>Event Controls:</strong> These access controls determine what users
        can do within the active event. You can keep controls disabled while preparing
        your active event, then enable them when ready.
      </p>
    </div>
  {/if}

  {#if hasActiveEvent}
    <div class="space-y-4">
      <!-- Top Level Controls -->
      <div class="space-y-4">
        <!-- Company Account Section -->
        <div class="space-y-3">
          <!-- Enable Company Account Logins -->
          <div
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <Switch
                checked={companyAccountsEnabled}
                disabled={isUpdating}
                onclick={() =>
                  handleControlChange(
                    "companyAccounts",
                    companyAccountsEnabled
                  )}
              />
              <Label class="text-base font-medium"
                >Enable company account logins</Label
              >
            </div>
            <span class="text-sm text-gray-500">
              {companyAccountsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <!-- Enable Company Position Management (under Company Accounts) -->
          <div
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg ml-6"
            class:opacity-50={!companyAccountsEnabled}
          >
            <div class="flex items-center space-x-3">
              <Switch
                checked={companySignupsEnabled}
                disabled={isUpdating || !companyAccountsEnabled}
                onclick={() =>
                  handleControlChange("companySignups", companySignupsEnabled)}
              />
              <Label class="text-base font-medium"
                >Enable company position management</Label
              >
            </div>
            <span class="text-sm text-gray-500">
              {!companyAccountsEnabled
                ? "Requires Company Account Logins"
                : companySignupsEnabled
                  ? "Enabled"
                  : "Disabled"}
            </span>
          </div>
        </div>

        <!-- Student Account Section -->
        <div class="space-y-3">
          <!-- Enable Student Account Logins -->
          <div
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <Switch
                checked={studentAccountsEnabled}
                disabled={isUpdating}
                onclick={() =>
                  handleControlChange(
                    "studentAccounts",
                    studentAccountsEnabled
                  )}
              />
              <Label class="text-base font-medium"
                >Enable student account logins</Label
              >
            </div>
            <span class="text-sm text-gray-500">
              {studentAccountsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <!-- Allow Students to Pick Jobs (under Student Accounts) -->
          <div
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg ml-6"
            class:opacity-50={!studentAccountsEnabled || lotteryPublished}
          >
            <div class="flex items-center space-x-3">
              <Switch
                checked={studentSignupsEnabled}
                disabled={isUpdating ||
                  !studentAccountsEnabled ||
                  lotteryPublished}
                onclick={() =>
                  handleControlChange("studentSignups", studentSignupsEnabled)}
              />
              <Label class="text-base font-medium"
                >Allow students to pick jobs</Label
              >
            </div>
            <span class="text-sm text-gray-500">
              {!studentAccountsEnabled
                ? "Requires Student Account Logins"
                : lotteryPublished
                  ? "Cannot enable while lottery results are published"
                  : studentSignupsEnabled
                    ? "Enabled"
                    : "Disabled"}
            </span>
          </div>

          <!-- Publish Lottery Results to Students (under Student Accounts) -->
          <div
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg ml-6"
            class:opacity-50={!studentAccountsEnabled || studentSignupsEnabled}
          >
            <div class="flex items-center space-x-3">
              <Switch
                checked={lotteryPublished}
                disabled={isUpdating ||
                  !studentAccountsEnabled ||
                  studentSignupsEnabled}
                onclick={() =>
                  handleControlChange("lotteryPublished", lotteryPublished)}
              />
              <Label class="text-base font-medium"
                >Publish lottery results to students</Label
              >
            </div>
            <span class="text-sm text-gray-500">
              {!studentAccountsEnabled
                ? "Requires Student Account Logins"
                : studentSignupsEnabled
                  ? "Cannot enable while students can pick jobs"
                  : lotteryPublished
                    ? "Published"
                    : "Hidden"}
            </span>
          </div>
        </div>

        <!-- Publish Company Directory -->
        <div
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <Switch
              checked={companyDirectoryEnabled}
              disabled={isUpdating}
              onclick={() =>
                handleControlChange(
                  "companyDirectory",
                  companyDirectoryEnabled
                )}
            />
            <Label class="text-base font-medium"
              >Publish company directory</Label
            >
          </div>
          <span class="text-sm text-gray-500">
            {companyDirectoryEnabled ? "Published" : "Hidden"}
          </span>
        </div>
      </div>
    </div>

    <!-- Status Summary -->
    <div class="mt-6 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Active Controls:</span>
        <span class="font-medium text-blue-600">
          {[
            companyAccountsEnabled,
            companySignupsEnabled,
            studentAccountsEnabled,
            studentSignupsEnabled,
            lotteryPublished,
            companyDirectoryEnabled,
          ].filter(Boolean).length}/6
        </span>
      </div>
    </div>
  {/if}
</div>
