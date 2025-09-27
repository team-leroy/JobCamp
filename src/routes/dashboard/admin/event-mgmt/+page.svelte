<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import EventManagementWidget from "$lib/components/admin/EventManagementWidget.svelte";
  import EventControlsWidget from "$lib/components/admin/EventControlsWidget.svelte";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import type { EventWithStats } from "$lib/server/eventManagement";

  export let data;
  export let form;
  const {
    isAdmin,
    loggedIn,
    isHost,
    schoolEvents,
    upcomingEvent,
  }: {
    isAdmin: boolean;
    loggedIn: boolean;
    isHost: boolean;
    schoolEvents: EventWithStats[];
    upcomingEvent?: EventWithStats | null;
  } = data;
</script>

<Navbar {isAdmin} {loggedIn} {isHost} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Event Management</h1>

    <!-- Event Management Widget -->
    <div class="mb-8">
      <EventManagementWidget {schoolEvents} {form} />
    </div>

    <!-- Event Controls Widget -->
    <div class="mb-8">
      <EventControlsWidget {upcomingEvent} />
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

      <form
        method="POST"
        action="?/createEvent"
        class="space-y-4"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === "success" && result.data?.success) {
              // Clear form
              const form = document.querySelector(
                'form[action="?/createEvent"]'
              ) as HTMLFormElement;
              form?.reset();
              // Refresh data to show new event
              await invalidateAll();
            }
          };
        }}
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              for="eventName"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Event Name *</label
            >
            <input
              type="text"
              id="eventName"
              name="eventName"
              required
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
              id="carryForwardData"
              name="carryForwardData"
              checked
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              for="carryForwardData"
              class="ml-2 block text-sm text-gray-700"
            >
              Copy positions from previous event (recommended)
            </label>
          </div>
          <p class="text-xs text-gray-500 ml-6">
            This will copy position listings from your most recent event.
            Companies and hosts remain linked to their existing accounts.
          </p>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <h3 class="text-lg font-medium text-gray-800 mb-3">
            Event Creation Notes
          </h3>
          <div class="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
            <p>
              <strong>Creation:</strong> New events are created as "Inactive" - they
              exist but are not the primary event.
            </p>
            <p>
              <strong>Activation:</strong> Use the "Activate" button to make this
              the active event for your school (only one active event allowed).
            </p>
            <p>
              <strong>Event Controls:</strong> Once active, configure user access
              permissions in the Event Controls section.
            </p>
            <p>
              <strong>School Scope:</strong> This event will be created for
              <strong>{data.schools?.[0]?.name || "your school"}</strong>.
            </p>
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

    <!-- Quick Actions -->
    <div class="mb-8 p-4 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
          <p class="text-sm text-gray-600">Additional event management tools</p>
        </div>
        <div class="flex gap-2">
          <a
            href="/dashboard/admin/archived"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            View Event History
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
