<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import StudentStatsWidget from "$lib/components/admin/StudentStatsWidget.svelte";
  import CompanyStatsWidget from "$lib/components/admin/CompanyStatsWidget.svelte";

  export let data;
  const {
    isAdmin,
    loggedIn,
    isHost,
    upcomingEvent,
    schools,
    studentStats,
    companyStats,
  } = data;
</script>

<Navbar {isAdmin} {loggedIn} {isHost} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-2">Admin Dashboard</h1>
    <h2 class="text-xl text-gray-600 mb-6">
      {schools?.[0]?.name || "School Dashboard"}
    </h2>

    <!-- Active Event Section -->
    <div
      class="mb-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500"
    >
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Active Event</h2>
      {#if upcomingEvent}
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium text-gray-900">
              {upcomingEvent.name ||
                `Event ${upcomingEvent.date.toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC"
                  }
                )}`}
            </h3>
            <p class="text-sm text-gray-600">
              {upcomingEvent.date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC"
              })}
            </p>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-600">
              <div class="mb-1">
                <span class="font-medium">Event Controls:</span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.eventEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Event {upcomingEvent.eventEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.studentAccountsEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Student Accounts {upcomingEvent.studentAccountsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.companyAccountsEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Company Accounts {upcomingEvent.companyAccountsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.studentSignupsEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Student Assignments {upcomingEvent.studentSignupsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.companySignupsEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Company Signups {upcomingEvent.companySignupsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.lotteryPublished ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Lottery {upcomingEvent.lotteryPublished ? 'Published' : 'Hidden'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {upcomingEvent.companyDirectoryEnabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="text-xs">Company Directory {upcomingEvent.companyDirectoryEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <p class="text-gray-600 italic">
          No active event.
          <a
            href="/dashboard/admin/event-mgmt"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            Go to Event Mgmt tab
          </a> to create and activate an event.
        </p>
      {/if}
    </div>

    <!-- Active Event Statistics Notice -->
    {#if !upcomingEvent}
      <div
        class="mb-8 p-6 bg-yellow-50 rounded-lg border-l-4 border-yellow-400"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">No Active Event</h3>
            <p class="mt-1 text-sm text-yellow-700">
              Statistics below will be empty until you have an active event.
              <a
                href="/dashboard/admin/event-mgmt"
                class="font-medium underline hover:text-yellow-600"
              >
                Create and activate an event
              </a> to see live data.
            </p>
          </div>
        </div>
      </div>
    {:else}
      <div class="mb-8 p-6 bg-green-50 rounded-lg border-l-4 border-green-400">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              Active Event Statistics
            </h3>
            <p class="mt-1 text-sm text-green-700">
              The statistics below reflect data for your active event: <strong
                >{upcomingEvent.name || "Unnamed Event"}</strong
              >
            </p>
          </div>
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentStatsWidget stats={studentStats} />
      <CompanyStatsWidget stats={companyStats} />
    </div>
  </div>
</div>
