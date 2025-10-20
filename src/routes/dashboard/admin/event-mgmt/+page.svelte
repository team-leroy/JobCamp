<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import EventManagementWidget from "$lib/components/admin/EventManagementWidget.svelte";
  import EventControlsWidget from "$lib/components/admin/EventControlsWidget.svelte";
  import ImportantDatesWidget from "$lib/components/admin/ImportantDatesWidget.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import type { EventWithStats } from "$lib/server/eventManagement";

  interface ImportantDate {
    id: string;
    date: Date;
    time: string | null;
    title: string;
    description: string;
    displayOrder: number;
  }

  interface PageData {
    isAdmin: boolean;
    loggedIn: boolean;
    isHost: boolean;
    schoolEvents: EventWithStats[];
    upcomingEvent?: EventWithStats | null;
    schools?: Array<{ id: string; name: string }>;
    importantDates: ImportantDate[];
  }

  interface FormResult {
    success?: boolean;
    message?: string;
  }

  let { data, form }: { data: PageData; form: FormResult | null } = $props();
  const {
    isAdmin,
    loggedIn,
    isHost,
    schoolEvents,
    upcomingEvent,
    importantDates,
  }: {
    isAdmin: boolean;
    loggedIn: boolean;
    isHost: boolean;
    schoolEvents: EventWithStats[];
    upcomingEvent?: EventWithStats | null;
    importantDates: ImportantDate[];
  } = data;

  // Track active tab
  let activeTab = $state("controls");

  // Tab change handler
  function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<Navbar {isAdmin} {loggedIn} {isHost} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Event Management</h1>

    <!-- Event Management Widget -->
    <div class="mb-8">
      <EventManagementWidget {schoolEvents} {form} />
    </div>

    <!-- Main Event Management Interface -->
    <div class="w-full">
      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'controls'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setActiveTab("controls")}
          >
            Event Controls
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'dates'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setActiveTab("dates")}
          >
            Important Dates
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'create'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setActiveTab("create")}
          >
            Create Event
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setActiveTab("history")}
          >
            Event History
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      {#if activeTab === "controls"}
        <EventControlsWidget {upcomingEvent} />
      {:else if activeTab === "dates"}
        <ImportantDatesWidget {upcomingEvent} {importantDates} />
      {:else if activeTab === "create"}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-green-600">📅</span>
              Create New Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            {#if form?.message}
              <div
                class="mb-4 p-3 rounded-md {form.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'}"
              >
                {form.message}
              </div>
            {/if}

            <form method="POST" action="?/createEvent" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    for="eventName"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Event Name *
                  </label>
                  <input
                    type="text"
                    id="eventName"
                    name="eventName"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Spring 2025 Job Shadow"
                  />
                </div>
                <div>
                  <label
                    for="eventDate"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Event Date *
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
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

              <div class="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                <p>
                  <strong>💡 Creation:</strong> New events are created as "Inactive"
                  - they exist but are not the primary event.
                </p>
                <p>
                  <strong>⚡ Activation:</strong> Use the "Activate" button to make
                  this the active event for your school.
                </p>
                <p>
                  <strong>🎛️ Controls:</strong> Once active, configure user access
                  permissions in the Event Controls tab.
                </p>
                <p>
                  <strong>🏫 Scope:</strong> This event will be created for
                  <strong>{data.schools?.[0]?.name || "your school"}</strong>.
                </p>
              </div>

              <div class="pt-4">
                <Button type="submit" class="bg-green-600 hover:bg-green-700">
                  Create New Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      {:else if activeTab === "history"}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-blue-600">📚</span>
              Event History & Archives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <p class="text-gray-600">
                View and manage your past events, including archived events with
                complete statistics and data.
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 border rounded-lg">
                  <h3 class="font-medium text-gray-900 mb-2">
                    📊 Archived Events
                  </h3>
                  <p class="text-sm text-gray-600 mb-3">
                    View complete statistics, student participation, and lottery
                    results from past events.
                  </p>
                  <Button
                    variant="outline"
                    onclick={() =>
                      (window.location.href = "/dashboard/admin/archived")}
                  >
                    View Archives
                  </Button>
                </div>

                <div class="p-4 border rounded-lg">
                  <h3 class="font-medium text-gray-900 mb-2">📈 Analytics</h3>
                  <p class="text-sm text-gray-600 mb-3">
                    Compare data across events and analyze trends in student
                    participation and company engagement.
                  </p>
                  <Button
                    variant="outline"
                    onclick={() => (window.location.href = "/visualizations")}
                  >
                    View Analytics
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
</div>
