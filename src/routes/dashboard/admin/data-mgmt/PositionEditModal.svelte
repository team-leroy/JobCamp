<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { Edit, Save, X } from "lucide-svelte";
  import { untrack } from "svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";

  interface Position {
    id: string;
    title: string;
    career: string;
    slots: number;
    summary: string;
    contactName: string;
    contactEmail: string;
    address: string;
    instructions: string;
    attire: string;
    arrival: string;
    start: string;
    end: string;
    createdAt: Date;
    hostName: string;
    companyName: string;
    isPublished: boolean;
  }

  interface Props {
    position: Position;
    careers: string[];
  }

  let { position, careers }: Props = $props();

  let isOpen = $state(false);

  let formData = $state(
    untrack(() => ({
      id: position.id,
      title: position.title,
      career: position.career,
      slots: position.slots.toString(),
      summary: position.summary,
      contactName: position.contactName,
      contactEmail: position.contactEmail,
      address: position.address,
      instructions: position.instructions,
      attire: position.attire,
      arrival: position.arrival,
      start: position.start,
      end: position.end,
    }))
  );

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  function resetForm() {
    formData = {
      id: position.id,
      title: position.title,
      career: position.career,
      slots: position.slots.toString(),
      summary: position.summary,
      contactName: position.contactName,
      contactEmail: position.contactEmail,
      address: position.address,
      instructions: position.instructions,
      attire: position.attire,
      arrival: position.arrival,
      start: position.start,
      end: position.end,
    };
    message = null;
    error = null;
  }

  function handleSuccess() {
    message = "Position updated successfully";
    error = null;
    setTimeout(() => {
      isOpen = false;
      resetForm();
      window.location.reload();
    }, 1000);
  }

  function handleError() {
    error = "Failed to update position";
    message = null;
  }

  function handleSubmit() {
    message = null;
    error = null;
  }

  function formatDate(date: Date | null): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const careerOptions = $derived(
    careers.map((career) => ({
      value: career,
      label: career,
    }))
  );
</script>

<Button variant="outline" size="sm" onclick={() => (isOpen = true)}>
  <Edit class="h-4 w-4 mr-2" />
  Edit
</Button>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    isOpen = open;
    if (!open) {
      resetForm();
    }
  }}
>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Position: {position.title}</DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action="?/updatePosition"
      use:enhance={() => {
        handleSubmit();
        return async ({ update }) => {
          try {
            await update();
            handleSuccess();
          } catch {
            handleError();
          }
        };
      }}
      onsubmit={resetForm}
    >
      <input type="hidden" name="positionId" value={position.id} />

      {#if message}
        <div
          class="p-3 rounded bg-green-50 text-green-700 border border-green-200"
        >
          {message}
        </div>
      {/if}
      {#if error}
        <div class="p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label for="title">Title *</Label>
            <Input
              id="title"
              name="title"
              bind:value={formData.title}
              required
            />
          </div>

          <div>
            <Label for="career">Career *</Label>
            <FilterSelect
              label="Career"
              options={careerOptions}
              placeholder="Select a career"
              bind:value={formData.career}
              class="w-full"
            />
            <input type="hidden" name="career" value={formData.career} />
          </div>

          <div>
            <Label for="slots">Slots *</Label>
            <Input
              id="slots"
              name="slots"
              type="number"
              bind:value={formData.slots}
              required
              min="1"
            />
          </div>

          <div>
            <Label for="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              name="contactName"
              bind:value={formData.contactName}
              required
            />
          </div>
        </div>
      </div>

      <!-- Detailed Information -->
      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-4">Detailed Information</h3>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <Label for="summary">Summary *</Label>
            <textarea
              id="summary"
              name="summary"
              bind:value={formData.summary}
              required
              rows="4"
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <div>
            <Label for="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              bind:value={formData.contactEmail}
              required
            />
          </div>

          <div>
            <Label for="address">Address *</Label>
            <textarea
              id="address"
              name="address"
              bind:value={formData.address}
              required
              rows="2"
              class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <div>
            <Label for="instructions">Instructions</Label>
            <textarea
              id="instructions"
              name="instructions"
              bind:value={formData.instructions}
              rows="3"
              class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <div>
            <Label for="attire">Attire</Label>
            <textarea
              id="attire"
              name="attire"
              bind:value={formData.attire}
              rows="2"
              class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label for="arrival">Arrival Time *</Label>
              <Input
                id="arrival"
                name="arrival"
                bind:value={formData.arrival}
                required
              />
            </div>

            <div>
              <Label for="start">Start Time *</Label>
              <Input
                id="start"
                name="start"
                bind:value={formData.start}
                required
              />
            </div>

            <div>
              <Label for="end">End Time *</Label>
              <Input id="end" name="end" bind:value={formData.end} required />
            </div>
          </div>
        </div>
      </div>

      <!-- Read-only Information -->
      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-4">Additional Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Host Name</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="font-medium">{position.hostName}</span>
            </div>
          </div>

          <div>
            <Label>Company Name</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="font-medium">{position.companyName}</span>
            </div>
          </div>

          <div>
            <Label>Created At</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="text-sm">{formatDate(position.createdAt)}</span>
            </div>
          </div>

          <div>
            <Label>Published Status</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="font-medium"
                >{position.isPublished ? "Published" : "Draft"}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onclick={() => {
            isOpen = false;
            resetForm();
          }}
        >
          <X class="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <Button type="submit">
          <Save class="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
