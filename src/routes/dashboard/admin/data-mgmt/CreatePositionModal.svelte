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
  import { Plus, Save, X, Trash2 } from "lucide-svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";

  interface Props {
    careers: string[];
    targetHostId?: string;
    targetCompanyName?: string;
  }

  let { careers, targetHostId, targetCompanyName }: Props = $props();

  let isOpen = $state(false);

  let formData = $state({
    title: "",
    career: "",
    slots: "1",
    summary: "",
    contactName: "admin@jobcamp.org",
    contactEmail: "admin@jobcamp.org",
    address: "",
    instructions: "",
    attire: "",
    arrival: "",
    start: "",
    end: "",
    hostId: targetHostId || "",
  });

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  // Attachment state
  let file1Input: HTMLInputElement | null = $state(null);
  let file2Input: HTMLInputElement | null = $state(null);
  let selectedFile1Name = $state("");
  let selectedFile2Name = $state("");

  function resetForm() {
    formData = {
      title: "",
      career: "",
      slots: "1",
      summary: "",
      contactName: "admin@jobcamp.org",
      contactEmail: "admin@jobcamp.org",
      address: "",
      instructions: "",
      attire: "",
      arrival: "",
      start: "",
      end: "",
      hostId: targetHostId || "",
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

  function handleSuccess() {
    message = "Position created successfully";
    error = null;
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  function handleError() {
    error = "Failed to create position";
    message = null;
  }

  function handleSubmit() {
    message = null;
    error = null;
  }

  const careerOptions = $derived(
    careers.map((career) => ({
      value: career,
      label: career,
    }))
  );
</script>

<Button variant="default" size="sm" onclick={() => (isOpen = true)}>
  <Plus class="h-4 w-4 mr-2" />
  {targetCompanyName ? "Create Position" : "Create Position as Admin"}
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
      <DialogTitle>
        Create New Position
        {#if targetCompanyName}
          for {targetCompanyName}
        {/if}
      </DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action="?/createPosition"
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
      <input type="hidden" name="hostId" value={formData.hostId} />
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Attachment 1 -->
              <div class="flex flex-col gap-2">
                <Label for="attachment1">Attachment 1</Label>
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

              <!-- Attachment 2 -->
              <div class="flex flex-col gap-2">
                <Label for="attachment2">Attachment 2</Label>
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
            </div>
            <p class="text-xs text-slate-500 mt-2 italic">
              Maximum of 2 attachments allowed. Maximum size is 10MB per file.
            </p>
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

        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        >
          <Save class="h-4 w-4 mr-2" />
          Create Position
        </button>
      </div>
    </form>
  </DialogContent>
</Dialog>
