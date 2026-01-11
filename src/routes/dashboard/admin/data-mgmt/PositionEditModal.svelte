<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { Edit, Save, X, Trash2, Loader2 } from "lucide-svelte";
  import { untrack } from "svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";

  interface Attachment {
    id: string;
    fileName: string;
    storagePath: string;
  }

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
    createdAt: Date | string;
    publishedAt: Date | string | null;
    hostName: string;
    companyName: string;
    isPublished: boolean;
    attachments: Attachment[];
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

  // Attachment state
  let file1Input: HTMLInputElement | null = $state(null);
  let file2Input: HTMLInputElement | null = $state(null);
  let selectedFile1Name = $state("");
  let selectedFile2Name = $state("");
  let deletingAttachmentId = $state("");

  const existingAttachments = $derived(position.attachments || []);
  const remainingSlots = $derived(Math.max(0, 2 - existingAttachments.length));

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
    selectedFile1Name = "";
    selectedFile2Name = "";
    if (file1Input) file1Input.value = "";
    if (file2Input) file2Input.value = "";
    message = null;
    error = null;
  }

  function handleFileChange(index: number, e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        input.value = "";
        return;
      }
      if (index === 1) selectedFile1Name = file.name;
      if (index === 2) selectedFile2Name = file.name;
    } else {
      if (index === 1) selectedFile1Name = "";
      if (index === 2) selectedFile2Name = "";
    }
  }

  function clearFile(index: number) {
    if (index === 1 && file1Input) {
      file1Input.value = "";
      selectedFile1Name = "";
    }
    if (index === 2 && file2Input) {
      file2Input.value = "";
      selectedFile2Name = "";
    }
  }

  function triggerFileInput(index: number) {
    if (index === 1) file1Input?.click();
    if (index === 2) file2Input?.click();
  }

  async function deleteExistingAttachment(attachmentId: string) {
    deletingAttachmentId = attachmentId;
    try {
      const form = new FormData();
      form.append("attachmentId", attachmentId);
      form.append("posId", position.id);

      const response = await fetch(`?/deleteAttachment`, {
        method: "POST",
        body: form,
        headers: {
          "x-sveltekit-action": "true",
        },
      });

      if (response.ok) {
        // Find the index of the attachment to remove it from the UI immediately
        const index = position.attachments.findIndex(
          (a) => a.id === attachmentId
        );
        if (index !== -1) {
          position.attachments.splice(index, 1);
        }
        message = "Attachment deleted successfully";
      } else {
        error = "Failed to delete attachment";
      }
    } catch (e) {
      console.error("Error deleting attachment:", e);
      error = "Error deleting attachment";
    } finally {
      deletingAttachmentId = "";
    }
  }

  function handleSuccess() {
    message = "Position updated successfully";
    error = null;
    setTimeout(() => {
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

  function formatDate(date: Date | string | null): string {
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
      enctype="multipart/form-data"
      use:enhance={() => {
        handleSubmit();
        return async ({ result }) => {
          if (result.type === "success") {
            handleSuccess();
          } else {
            handleError();
          }
        };
      }}
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
            <input
              id="title"
              name="title"
              bind:value={formData.title}
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <FilterSelect
              label="Career *"
              options={careerOptions}
              placeholder="Select a career"
              bind:value={formData.career}
              class="w-full"
            />
            <input type="hidden" name="career" value={formData.career} />
          </div>

          <div>
            <Label for="slots">Slots *</Label>
            <input
              id="slots"
              name="slots"
              type="number"
              bind:value={formData.slots}
              required
              min="1"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <Label for="contactName">Contact Name *</Label>
            <input
              id="contactName"
              name="contactName"
              bind:value={formData.contactName}
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <Label for="contactEmail">Contact Email *</Label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              bind:value={formData.contactEmail}
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <input
                id="arrival"
                name="arrival"
                bind:value={formData.arrival}
                required
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <Label for="start">Start Time *</Label>
              <input
                id="start"
                name="start"
                bind:value={formData.start}
                required
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <Label for="end">End Time *</Label>
              <input
                id="end"
                name="end"
                bind:value={formData.end}
                required
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <!-- Attachments Section -->
          <div class="mt-4">
            <h3 class="text-lg font-semibold mb-4">Attachments</h3>

            <!-- Existing Attachments -->
            {#if position.attachments && position.attachments.length > 0}
              <div class="mb-4 space-y-2">
                <Label>Existing Attachments</Label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {#each position.attachments as attachment}
                    <div
                      class="flex items-center justify-between p-2 border rounded-md bg-slate-50"
                    >
                      <span
                        class="text-sm truncate mr-2"
                        title={attachment.fileName}
                      >
                        {attachment.fileName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="text-red-600 p-1 h-8 w-8"
                        disabled={deletingAttachmentId === attachment.id}
                        onclick={() => deleteExistingAttachment(attachment.id)}
                      >
                        {#if deletingAttachmentId === attachment.id}
                          <Loader2 class="h-4 w-4 animate-spin" />
                        {:else}
                          <Trash2 class="h-4 w-4" />
                        {/if}
                      </Button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- New Attachments -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#if remainingSlots > 0}
                <!-- Attachment 1 -->
                <div class="flex flex-col gap-2">
                  <Label for="attachment1">
                    {existingAttachments.length === 0
                      ? "Attachment 1"
                      : "New Attachment 1"}
                  </Label>
                  <div class="flex items-center gap-2">
                    <input
                      bind:this={file1Input}
                      onchange={(e) => handleFileChange(1, e)}
                      class="hidden"
                      name="attachment1"
                      id="attachment1"
                      type="file"
                    />
                    <div
                      class="flex items-center gap-2 border border-input bg-background ring-offset-background h-10 w-full rounded-md px-3 py-2 text-sm"
                    >
                      <button
                        type="button"
                        class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs border whitespace-nowrap"
                        onclick={() => triggerFileInput(1)}
                      >
                        Choose File
                      </button>
                      <span class="truncate flex-1 text-slate-500">
                        {selectedFile1Name || "No file chosen"}
                      </span>
                    </div>
                    {#if selectedFile1Name}
                      <button
                        type="button"
                        class="text-red-600 p-1 hover:bg-red-50 rounded-md"
                        onclick={() => clearFile(1)}
                        title="Clear selection"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Attachment 2 (if slots available) -->
                {#if remainingSlots > 1}
                  <div class="flex flex-col gap-2">
                    <Label for="attachment2">
                      {existingAttachments.length === 0
                        ? "Attachment 2"
                        : "New Attachment 2"}
                    </Label>
                    <div class="flex items-center gap-2">
                      <input
                        bind:this={file2Input}
                        onchange={(e) => handleFileChange(2, e)}
                        class="hidden"
                        name="attachment2"
                        id="attachment2"
                        type="file"
                      />
                      <div
                        class="flex items-center gap-2 border border-input bg-background ring-offset-background h-10 w-full rounded-md px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs border whitespace-nowrap"
                          onclick={() => triggerFileInput(2)}
                        >
                          Choose File
                        </button>
                        <span class="truncate flex-1 text-slate-500">
                          {selectedFile2Name || "No file chosen"}
                        </span>
                      </div>
                      {#if selectedFile2Name}
                        <button
                          type="button"
                          class="text-red-600 p-1 hover:bg-red-50 rounded-md"
                          onclick={() => clearFile(2)}
                          title="Clear selection"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      {/if}
                    </div>
                  </div>
                {/if}
              {:else}
                <div
                  class="col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-700 italic"
                >
                  Maximum of 2 attachments reached. Delete an existing
                  attachment to upload a new one.
                </div>
              {/if}
            </div>
            {#if remainingSlots > 0}
              <p class="text-xs text-slate-500 mt-2 italic">
                Maximum of 2 attachments total. Maximum size is 10MB per file.
              </p>
            {/if}
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
            <Label>{position.isPublished ? "Published At" : "Created At"}</Label
            >
            <div class="p-3 bg-gray-50 rounded border">
              <span class="text-sm"
                >{formatDate(position.publishedAt || position.createdAt)}</span
              >
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
      <div class="flex justify-between items-center pt-4 border-t">
        <div>
          {#if !position.isPublished}
            <button
              type="submit"
              formaction="?/publishPositionAsAdmin"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-green-600 bg-white text-green-600 hover:bg-green-50 h-9 px-4 py-2"
            >
              <Save class="h-4 w-4 mr-2" />
              Publish as Admin
            </button>
          {/if}
        </div>
        <div class="flex space-x-3">
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

          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Save class="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </form>
  </DialogContent>
</Dialog>
