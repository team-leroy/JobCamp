<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import StudentStatsWidget from "$lib/components/admin/StudentStatsWidget.svelte";
  import CompanyStatsWidget from "$lib/components/admin/CompanyStatsWidget.svelte";
  import EventControlsWidget from "$lib/components/admin/EventControlsWidget.svelte";

  export let data;
  const {
    isAdmin,
    loggedIn,
    isHost,
    upcomingEvent,
    studentStats,
    companyStats,
  } = data;
</script>

<Navbar {isAdmin} {loggedIn} {isHost} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>

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
                `Event ${new Date(upcomingEvent.date).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}`}
            </h3>
            <p class="text-sm text-gray-600">
              {new Date(upcomingEvent.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {#if upcomingEvent.displayLotteryResults}
              <p class="text-sm text-green-600 mt-1">
                ✓ Lottery results will be displayed
              </p>
            {:else}
              <p class="text-sm text-gray-500 mt-1">Lottery results hidden</p>
            {/if}
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500">Event ID: {upcomingEvent.id}</p>
          </div>
        </div>
      {:else}
        <p class="text-gray-600 italic">
          No active event. Create and activate an event below.
        </p>
      {/if}
    </div>

    <!-- Navigation to Event Management -->
    <div class="mb-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-blue-900">Event Management</h3>
          <p class="text-blue-700">
            Create, activate, and manage your school's job shadow events
          </p>
        </div>
        <a
          href="/dashboard/admin/event-mgmt"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
        >
          Manage Events
        </a>
      </div>
    </div>

    <!-- Event Controls Widget -->
    <div class="mb-8">
      <EventControlsWidget />
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
