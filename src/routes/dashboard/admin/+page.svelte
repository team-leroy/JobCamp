<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import StudentStatsWidget from "$lib/components/admin/StudentStatsWidget.svelte";
  import CompanyStatsWidget from "$lib/components/admin/CompanyStatsWidget.svelte";
  import EventControlsWidget from "$lib/components/admin/EventControlsWidget.svelte";
  import { enhance } from "$app/forms";

  export let data;
  export let form;
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

    <!-- Upcoming Event Section -->
    <div
      class="mb-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500"
    >
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Upcoming Event</h2>
      {#if upcomingEvent}
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-medium text-gray-900">
              {upcomingEvent.date
                ? new Date(upcomingEvent.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Date TBD"}
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
        <p class="text-gray-600 italic">No upcoming events</p>
      {/if}
    </div>

    <!-- Event Controls Widget -->
    <div class="mb-8">
      <EventControlsWidget />
    </div>

    <!-- Create New Event Section -->
    <div
      class="mb-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-green-500"
    >
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Create New Event</h2>

      {#if form?.message}
        <div
          class="mb-4 p-3 rounded-md {form.success
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'}"
        >
          {form.message}
        </div>
      {/if}

      <form method="POST" action="?/createEvent" class="space-y-4" use:enhance>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              for="eventName"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Event Name (Optional)</label
            >
            <input
              type="text"
              id="eventName"
              name="eventName"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Spring 2025 Job Shadow"
            />
          </div>
          <div>
            <label
              for="eventDate"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Event Date *</label
            >
            <input
              type="date"
              id="eventDate"
              name="eventDate"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center">
            <input
              type="checkbox"
              id="displayLotteryResults"
              name="displayLotteryResults"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              for="displayLotteryResults"
              class="ml-2 block text-sm text-gray-700"
            >
              Display lottery results to students
            </label>
          </div>

          <div class="flex items-center">
            <input
              type="checkbox"
              id="carryForwardData"
              name="carryForwardData"
              checked
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              for="carryForwardData"
              class="ml-2 block text-sm text-gray-700"
            >
              Carry forward positions from previous event (recommended)
            </label>
          </div>
        </div>

        <div class="pt-4">
          <button
            type="submit"
            class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors font-medium"
          >
            Create New Event
          </button>
        </div>
      </form>
    </div>

    <!-- Archived Events Link -->
    <div class="mb-8 p-4 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Archived Events</h3>
          <p class="text-sm text-gray-600">
            View statistics and data from previous events
          </p>
        </div>
        <a
          href="/dashboard/admin/archived"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          View Archived Events
        </a>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentStatsWidget stats={studentStats} />
      <CompanyStatsWidget stats={companyStats} />
    </div>
  </div>
</div>
