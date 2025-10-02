<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { goto } from "$app/navigation";
  import type { EventWithStats } from "$lib/server/eventManagement";

  interface FormResult {
    success?: boolean;
    message?: string;
  }

  interface EventWithFilteredStats extends EventWithStats {
    filteredStats?: {
      totalPositions: number;
      totalSlots: number;
      studentsWithChoices: number;
    };
  }

  let {
    schoolEvents = [],
    form = null,
  }: { schoolEvents?: EventWithFilteredStats[]; form?: FormResult | null } = $props();

  // Debug: Log schoolEvents on component load/update
  console.log("🏫 EventManagementWidget rendered with schoolEvents:", {
    count: schoolEvents.length,
    events: schoolEvents.map((e) => ({
      id: e.id,
      name: e.name,
      isActive: e.isActive,
    })),
  });

  let isActivating = $state(false);
  let isDeleting = $state(false);
  let expandedEventId = $state<string | null>(null);

  // Handle event activation using proper form submission
  function handleActivateEvent(eventId: string) {
    if (
      confirm(
        "Are you sure you want to activate this event? This will deactivate any currently active event."
      )
    ) {
      // Create and submit a form programmatically
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '?/activateEvent';
      
      const eventIdInput = document.createElement('input');
      eventIdInput.type = 'hidden';
      eventIdInput.name = 'eventId';
      eventIdInput.value = eventId;
      
      form.appendChild(eventIdInput);
      document.body.appendChild(form);
      
      console.log("🔄 Submitting activation form for event:", eventId);
      form.submit();
    }
  }

  // Format date for display (fix timezone issue)
  function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  // Get event status display
  function getEventStatus(event: EventWithFilteredStats) {
    if (event.isActive) return { text: "Active", variant: "default" as const };
    if (event.isArchived)
      return { text: "Archived", variant: "secondary" as const };
    return { text: "Inactive", variant: "outline" as const };
  }

  // Handle event deletion using proper form submission
  function handleDeleteEvent(eventId: string, eventName: string) {
    const confirmMessage = `⚠️ DELETE EVENT: "${eventName}"

This will permanently delete the event and cannot be undone.

✅ Safe to delete if:
• Event was created by mistake
• No students have signed up
• No lottery has been run
• You want to completely remove it

❌ Consider ARCHIVING instead if:
• Students have participated
• Event was completed
• You want to preserve historical data

Continue with deletion?`;

    if (confirm(confirmMessage)) {
      // Create and submit a form programmatically
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '?/deleteEvent';
      
      const eventIdInput = document.createElement('input');
      eventIdInput.type = 'hidden';
      eventIdInput.name = 'eventId';
      eventIdInput.value = eventId;
      
      form.appendChild(eventIdInput);
      document.body.appendChild(form);
      
      console.log("🔄 Submitting deletion form for event:", eventId);
      form.submit();
    }
  }

  // Toggle event details
  function showEventDetails(eventId: string) {
    expandedEventId = expandedEventId === eventId ? null : eventId;
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Event Management</CardTitle>
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

    {#if schoolEvents.length === 0}
      <p class="text-gray-500 italic">
        No events found. Create your first event below.
      </p>
    {:else}
      <div class="space-y-4">
        {#each schoolEvents as event}
          <div
            class="border rounded-lg p-4 {event.isActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'}"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <h3 class="font-semibold">
                  {event.name || `Event ${formatDate(event.date)}`}
                </h3>
                <Badge variant={getEventStatus(event).variant}>
                  {getEventStatus(event).text}
                </Badge>
              </div>
              <div class="flex items-center gap-2">
                {#if !event.isActive && !event.isArchived}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => handleActivateEvent(event.id)}
                    disabled={isActivating}
                  >
                    {isActivating ? "Activating..." : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onclick={() =>
                      handleDeleteEvent(
                        event.id,
                        event.name || `Event ${formatDate(event.date)}`
                      )}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                {/if}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => {
                    if (event.isActive) {
                      // For active events, show detailed statistics in place
                      showEventDetails(event.id);
                    } else {
                      // For archived events, go to the archived page
                      goto(`/dashboard/admin/archived?eventId=${event.id}`);
                    }
                  }}
                >
                  {event.isActive ? "Show Details" : "View Details"}
                </Button>
              </div>
            </div>

            <div
              class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600"
            >
              <div>
                <span class="font-medium">Date:</span>
                <br />
                {formatDate(event.date)}
              </div>
              <div>
                <span class="font-medium">Positions:</span>
                <br />
                {event.filteredStats?.totalPositions ?? 0}
              </div>
              <div>
                <span class="font-medium">Total Slots:</span>
                <br />
                {event.filteredStats?.totalSlots ?? 0}
              </div>
              <div>
                <span class="font-medium">Students with Choices:</span>
                <br />
                {event.filteredStats?.studentsWithChoices ?? 0}
              </div>
            </div>

            {#if event.displayLotteryResults}
              <div class="mt-3">
                <Badge
                  variant="outline"
                  class="text-green-600 border-green-600"
                >
                  ✓ Lottery results displayed
                </Badge>
              </div>
            {/if}

            <!-- Expanded Details for Active Events -->
            {#if event.isActive && expandedEventId === event.id}
              <div class="mt-4 pt-4 border-t border-gray-200">
                <h4 class="font-semibold text-gray-800 mb-3">Event Details</h4>
                <div class="space-y-3 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Event Status:</span>
                    <span class="font-medium text-blue-600">Active</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Event ID:</span>
                    <span class="font-mono text-xs">{event.id}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Created:</span>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Lottery Results:</span>
                    <span
                      class={event.displayLotteryResults
                        ? "text-green-600"
                        : "text-gray-500"}
                    >
                      {event.displayLotteryResults
                        ? "Displayed to Students"
                        : "Hidden from Students"}
                    </span>
                  </div>
                </div>

                <!-- Quick Actions for Active Event -->
                <div class="mt-4 pt-3 border-t border-gray-100">
                  <div class="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => goto("/dashboard/admin")}
                    >
                      View Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => goto("/visualizations")}
                    >
                      View Analytics
                    </Button>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Event Management Guidelines -->
    {#if schoolEvents.length > 0}
      <div class="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        <h4 class="text-sm font-semibold text-gray-800 mb-2">
          💡 Event Management Guidelines
        </h4>
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600"
        >
          <div>
            <p class="font-medium text-green-700 mb-1">
              ✅ Delete events when:
            </p>
            <ul class="space-y-1 ml-3">
              <li>• Created by mistake or as test</li>
              <li>• No student signups yet</li>
              <li>• Planning was abandoned</li>
              <li>• Want to completely remove</li>
            </ul>
          </div>
          <div>
            <p class="font-medium text-orange-700 mb-1">
              📚 Archive events when:
            </p>
            <ul class="space-y-1 ml-3">
              <li>• Students have participated</li>
              <li>• Event was completed</li>
              <li>• Lottery was run</li>
              <li>• Want to preserve history</li>
            </ul>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3 italic">
          💡 Tip: The system will automatically prevent deletion if students
          have signed up or lottery has been run.
        </p>
      </div>
    {/if}

    <!-- Quick Actions -->
    <div class="mt-6 pt-6 border-t">
      <h4 class="font-medium mb-3">Quick Actions</h4>
      <div class="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onclick={() => goto("/dashboard/admin/archived")}
        >
          View Event History
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
