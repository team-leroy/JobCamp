<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Trash2, Edit2, Plus, X } from "lucide-svelte";
  import type { EventWithStats } from "$lib/server/eventManagement";

  interface ImportantDate {
    id: string;
    date: Date;
    time: string | null;
    title: string;
    description: string;
    displayOrder: number;
  }

  interface Props {
    upcomingEvent?: EventWithStats | null;
    importantDates: ImportantDate[];
  }

  const { upcomingEvent, importantDates = [] }: Props = $props();

  // Check if there's an active event
  const hasActiveEvent = $derived(!!upcomingEvent && upcomingEvent.isActive);

  // Form state
  let showForm = $state(false);
  let isEditing = $state(false);
  let editingId = $state<string | null>(null);

  let formDate = $state("");
  let formTime = $state("");
  let formTitle = $state("");
  let formDescription = $state("");
  let formDisplayOrder = $state("0");

  // Sort dates by display order, then by date
  let sortedDates = $derived(
    [...importantDates].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
  );

  function startCreate() {
    showForm = true;
    isEditing = false;
    editingId = null;
    formDate = "";
    formTime = "";
    formTitle = "";
    formDescription = "";
    formDisplayOrder = "0";
  }

  function startEdit(date: ImportantDate) {
    showForm = true;
    isEditing = true;
    editingId = date.id;
    // Format date as YYYY-MM-DD for input
    const dateObj = new Date(date.date);
    formDate = dateObj.toISOString().split("T")[0];
    formTime = date.time || "";
    formTitle = date.title;
    formDescription = date.description;
    formDisplayOrder = date.displayOrder.toString();
  }

  function cancelForm() {
    showForm = false;
    isEditing = false;
    editingId = null;
  }

  function handleSubmit() {
    // Form will submit natively, triggering data reload
  }

  function handleDelete(dateId: string) {
    if (confirm("Are you sure you want to delete this important date?")) {
      // Create a form and submit it natively
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/dashboard/admin/event-mgmt?/deleteImportantDate";

      const idInput = document.createElement("input");
      idInput.type = "hidden";
      idInput.name = "dateId";
      idInput.value = dateId;
      form.appendChild(idInput);

      document.body.appendChild(form);
      form.submit();
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-bold">Important Dates</h2>
    {#if hasActiveEvent && !showForm}
      <Button onclick={startCreate} class="flex items-center gap-2">
        <Plus size={16} />
        Add Date
      </Button>
    {/if}
  </div>

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
            You need an active event to manage important dates. Create a new
            event and activate it to access this feature.
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
        Managing important dates for students to see on their dashboard.
      </p>
    </div>

    {#if showForm}
      <!-- Create/Edit Form -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">
            {isEditing ? "Edit Important Date" : "Add Important Date"}
          </h3>
          <button
            onclick={cancelForm}
            class="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form
          method="POST"
          action="?/{isEditing ? 'updateImportantDate' : 'createImportantDate'}"
          onsubmit={handleSubmit}
          class="space-y-4"
        >
          {#if isEditing}
            <input type="hidden" name="dateId" value={editingId || ""} />
          {/if}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label for="date">Date *</Label>
              <Input
                type="date"
                id="date"
                name="date"
                bind:value={formDate}
                required
                class="mt-1"
              />
            </div>

            <div>
              <Label for="time">Time and/or location (optional)</Label>
              <Input
                type="text"
                id="time"
                name="time"
                bind:value={formTime}
                placeholder="e.g., 2:00 PM, Tutorial @ Theater"
                class="mt-1"
              />
              <p class="text-xs text-gray-500 mt-1">
                Leave blank for all-day/anywhere events
              </p>
            </div>
          </div>

          <div>
            <Label for="title">Title *</Label>
            <Input
              type="text"
              id="title"
              name="title"
              bind:value={formTitle}
              required
              maxlength={255}
              placeholder="e.g., MANDATORY Job Shadow Orientation"
              class="mt-1"
            />
          </div>

          <div>
            <Label for="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              bind:value={formDescription}
              required
              maxlength={1024}
              rows={4}
              placeholder="Enter details about this important date..."
              class="mt-1"
            />
            <p class="text-xs text-gray-500 mt-1">
              You can include HTML links: &lt;a href="..."&gt;link
              text&lt;/a&gt;
            </p>
          </div>

          <div>
            <Label for="displayOrder">Display Order</Label>
            <Input
              type="number"
              id="displayOrder"
              name="displayOrder"
              bind:value={formDisplayOrder}
              min="0"
              class="mt-1 w-32"
            />
            <p class="text-xs text-gray-500 mt-1">
              Lower numbers appear first (0 = top)
            </p>
          </div>

          <div class="flex gap-2">
            <Button type="submit" class="bg-blue-600 hover:bg-blue-700">
              {isEditing ? "Update" : "Create"} Date
            </Button>
            <Button type="button" variant="outline" onclick={cancelForm}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    {/if}

    <!-- List of Important Dates -->
    {#if sortedDates.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p class="mb-2">No important dates have been added yet.</p>
        {#if !showForm}
          <Button onclick={startCreate} variant="outline" class="mt-2">
            <Plus size={16} class="mr-2" />
            Add Your First Date
          </Button>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        {#each sortedDates as date (date.id)}
          <div class="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex justify-between items-start gap-4">
              <div class="flex-1">
                <div class="flex items-start gap-2 mb-2">
                  <span
                    class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded"
                  >
                    {formatDate(date.date)}
                    {#if date.time}
                      <span class="text-gray-500"> - {date.time}</span>
                    {:else}
                      <span class="text-gray-500">- All Day</span>
                    {/if}
                  </span>
                  {#if date.displayOrder !== 0}
                    <span
                      class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded"
                    >
                      Order: {date.displayOrder}
                    </span>
                  {/if}
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-1">
                  {date.title}
                </h3>
                <p class="text-gray-600 whitespace-pre-wrap">
                  {date.description}
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  onclick={() => startEdit(date)}
                  class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onclick={() => handleDelete(date.id)}
                  class="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
