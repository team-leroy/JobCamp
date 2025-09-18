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

  let {
    schoolEvents = [],
    form = null,
  }: { schoolEvents?: EventWithStats[]; form?: FormResult | null } = $props();

  let isActivating = $state(false);

  // Handle event activation
  async function handleActivateEvent(eventId: string) {
    if (
      confirm(
        "Are you sure you want to activate this event? This will deactivate any currently active event."
      )
    ) {
      isActivating = true;
      try {
        const formData = new FormData();
        formData.append("eventId", eventId);

        const response = await fetch("/dashboard/admin?/activateEvent", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Refresh the page to show updated state
          goto("/dashboard/admin", { replaceState: true });
        } else {
          alert("Failed to activate event. Please try again.");
        }
      } catch (error) {
        console.error("Error activating event:", error);
        alert("An error occurred while activating the event.");
      } finally {
        isActivating = false;
      }
    }
  }

  // Format date for display
  function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Get event status display
  function getEventStatus(event: EventWithStats) {
    if (event.isActive) return { text: "Active", variant: "default" as const };
    if (event.isArchived)
      return { text: "Archived", variant: "secondary" as const };
    return { text: "Inactive", variant: "outline" as const };
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
                {/if}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() =>
                    goto(`/dashboard/admin/archived?eventId=${event.id}`)}
                >
                  View Details
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
                {event.stats?.totalPositions ?? 0}
              </div>
              <div>
                <span class="font-medium">Total Slots:</span>
                <br />
                {event.stats?.totalSlots ?? 0}
              </div>
              <div>
                <span class="font-medium">Students with Choices:</span>
                <br />
                {event.stats?.studentsWithChoices ?? 0}
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
          </div>
        {/each}
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
        <Button variant="outline" size="sm" onclick={() => goto("/lottery")}>
          Manage Lottery
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
