<script lang="ts">
  import { untrack } from "svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { careers } from "$lib/appconfig";
  import { superForm } from "sveltekit-superforms";
  import { Trash2, Loader2 } from "lucide-svelte";

  let { data, form: actionForm, formTitle, buttonName } = $props();

  const {
    form,
    errors,
    submitting,
    enhance: formEnhance,
  } = superForm(actionForm || untrack(() => data.form), {
    resetForm: false,
    invalidateAll: true, // Force a full data refresh on success
    onResult: ({ result }) => {
      if (result.type === "redirect") {
        console.log("[PositionForm] Redirecting to:", result.location);
      }
    },
    onSubmit: ({ formData }) => {
      // Manually append files from our state to ensure they are sent
      // even if the browser cleared the input element on 'Cancel'
      if (file1Object) {
        formData.set("attachment1", file1Object);
      }
      if (file2Object) {
        formData.set("attachment2", file2Object);
      }
    },
  });

  function getPositionId(): string | null {
    return $form.positionId || null;
  }

  // Local state to track selected files for UI display and clearing
  let file1Input: HTMLInputElement | null = $state(null);
  let file2Input: HTMLInputElement | null = $state(null);
  let selectedFile1Name = $state("");
  let selectedFile2Name = $state("");
  let file1Object = $state<File | null>(null);
  let file2Object = $state<File | null>(null);
  let deletingAttachmentId = $state("");

  const existingAttachments = $derived(data.position?.attachments || []);
  const remainingSlots = $derived(Math.max(0, 2 - existingAttachments.length));

  function handleFileChange(index: number, e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (index === 1) {
        selectedFile1Name = file.name;
        file1Object = file;
        $form.attachment1 = file;
      }
      if (index === 2) {
        selectedFile2Name = file.name;
        file2Object = file;
        $form.attachment2 = file;
      }
    }
  }

  function clearFile(index: number) {
    if (index === 1 && file1Input) {
      file1Input.value = "";
      selectedFile1Name = "";
      file1Object = null;
      $form.attachment1 = undefined;
    }
    if (index === 2 && file2Input) {
      file2Input.value = "";
      selectedFile2Name = "";
      file2Object = null;
      $form.attachment2 = undefined;
    }
  }

  function triggerFileInput(index: number) {
    if (index === 1) file1Input?.click();
    if (index === 2) file2Input?.click();
  }

  async function deleteExistingAttachment(attachmentId: string) {
    if (!getPositionId()) return;
    
    deletingAttachmentId = attachmentId;
    try {
      const formData = new FormData();
      formData.append("attachmentId", attachmentId);
      formData.append("posId", getPositionId() || "");

      const response = await fetch(`?/deleteAttachment&posId=${getPositionId()}`, {
        method: "POST",
        body: formData,
        headers: {
          "x-sveltekit-action": "true",
        },
      });

      if (response.ok) {
        // Force SvelteKit to refresh the 'data' prop so the attachment disappears from the list
        const { invalidateAll } = await import("$app/navigation");
        await invalidateAll();
      } else {
        console.error("Failed to delete attachment");
      }
    } catch (e) {
      console.error("Error deleting attachment:", e);
    } finally {
      deletingAttachmentId = "";
    }
  }
</script>

<div class="mt-32 mb-5 w-full flex justify-center items-center">
  <form
    enctype="multipart/form-data"
    method="POST"
    action={$form.positionId
      ? "?/publishPosition&posId=" + $form.positionId
      : "?/publishPosition"}
    class="z-0 relative md:border-2 px-10 py-8 md:rounded-lg w-[700px] mx-5 flex flex-col gap-4 items-center justify-center"
    use:formEnhance
  >
    <h1 class="text-xl">{formTitle}</h1>

    {#if data.error || actionForm?.error}
      <div
        class="w-full max-w-sm p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md"
      >
        {data.error || actionForm?.error}
      </div>
    {/if}

    {#if $form.positionId}<input
        name="positionId"
        class="hidden"
        bind:value={$form.positionId}
      />{/if}

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="title">Position Title</Label>
      <Input name="title" id="title" bind:value={$form.title} />
      <span class="italic text-sm"
        >E.g., 3rd Grade Teacher, Orthopedic Surgeon, Electrical Engineer</span
      >
      {#if $errors.title}<span class="text-sm text-red-500"
          >{$errors.title}</span
        >{/if}
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="career">Career</Label>
      <select
        bind:value={$form.career}
        name="career"
        id="career"
        class="border rounded-md px-2 py-2"
      >
        {#each careers as career}
          <option value={career}>{career}</option>
        {/each}
      </select>
      <span class="italic text-sm"
        >If students will shadow more than 1 career, select "Multiple Careers"</span
      >
      {#if $errors.career}<span class="text-sm text-red-500"
          >{$errors.career}</span
        >{/if}
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg"># of slots for students</Label>
      <Input
        name="slots"
        bind:value={$form.slots}
        onscroll={(e) => e.preventDefault()}
      />
      {#if $errors.slots}<span class="text-sm text-red-500"
          >{$errors.slots}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="sumamry">Summary</Label>
      <Textarea bind:value={$form.summary} name="summary" id="summary" />
      <span class="italic text-sm">What will students learn about and do?</span>
      {#if $errors.summary}<span class="text-sm text-red-500"
          >{$errors.summary}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="fullName">Primary Contact's Name</Label>
      <Input
        class="w-full"
        id="fullName"
        name="fullName"
        placeholder="Full name"
        bind:value={$form.fullName}
      />
      <span class="italic text-sm"
        >This name will only be shared with students attending this position.</span
      >
      {#if $errors.fullName}<span class="text-sm text-red-500"
          >{$errors.fullName}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="email">Primary Contact's Email</Label>
      <Input class="w-full" id="email" name="email" bind:value={$form.email} />
      <span class="italic text-sm"
        >This email will only be shared with students attending this position.</span
      >
      {#if $errors.email}<span class="text-sm text-red-500"
          >{$errors.email}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="address">Address</Label>
      <Textarea name="address" id="address" bind:value={$form.address} />
      {#if $errors.address}<span class="text-sm text-red-500"
          >{$errors.address}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="instructions">Instructions For Students</Label
      >
      <Textarea
        name="instructions"
        bind:value={$form.instructions}
        id="instructions"
        placeholder=""
        class="h-full"
      />
      <span class="italic text-sm"
        >Include specific meeting spot (building #, lobby), bring ID? need forms
        signed? etc.</span
      >
      {#if $errors.instructions}<span class="text-sm text-red-500"
          >{$errors.instructions}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="text-lg" for="attire">Attire Requirements</Label>
      <Textarea
        name="attire"
        bind:value={$form.attire}
        id="attire"
        class="h-full"
      />
      <span class="italic text-sm"
        >E.g., Closed-toed shoes, no sneakers, no jeans, etc. Please be specific
        if you have requirements.</span
      >
      {#if $errors.attire}<span class="text-sm text-red-500"
          >{$errors.attire}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <div class="flex justify-between items-center w-full max-w-sm gap-1.5">
        <Label class="text-lg" for="arrival">Arrival Time</Label>
        <Input
          bind:value={$form.arrival}
          class="w-max"
          name="arrival"
          id="arrival"
          type="time"
        />
      </div>
      {#if $errors.arrival}<span class="text-sm text-red-500 text-right"
          >{$errors.arrival}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <div class="flex justify-between items-center w-full max-w-sm gap-1.5">
        <Label class="text-lg" for="start">Start Time</Label>
        <Input
          bind:value={$form.start}
          class="w-max"
          name="start"
          id="start"
          type="time"
        />
      </div>
      {#if $errors.start}<span class="text-sm text-red-500 text-right"
          >{$errors.start}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5 mb-5">
      <div class="flex justify-between items-center w-full max-w-sm gap-1.5">
        <Label class="text-lg" for="release">End Time</Label>
        <Input
          bind:value={$form.release}
          class="w-max"
          name="release"
          id="release"
          type="time"
        />
      </div>
      {#if $errors.release}<span class="text-sm text-red-500 text-right"
          >{$errors.release}</span
        >{/if}
    </div>

    <div class="w-full max-w-sm flex flex-col gap-1.5">
      {#if remainingSlots > 0}
        <!-- Attachment 1 Input -->
        <div class="flex flex-col gap-1.5 mb-5">
          <div class="flex justify-between items-center w-full gap-1.5">
            <Label class="text-lg" for="attachment1">
              {existingAttachments.length === 0
                ? "Attachment 1"
                : "New Attachment 1"}
            </Label>
            <div class="flex items-center gap-2">
              <input
                bind:this={file1Input}
                onchange={(e) => handleFileChange(1, e)}
                class="hidden"
                id="attachment1"
                type="file"
              />
              <div
                class="flex items-center gap-2 border-input bg-background ring-offset-background h-10 w-64 rounded-md border px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs border"
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
          {#if $errors.attachment1}
            <span class="text-sm text-red-500 text-right"
              >{$errors.attachment1}</span
            >
          {/if}
        </div>

        <!-- Attachment 2 Input (only if 2 slots remaining) -->
        {#if remainingSlots > 1}
          <div class="flex flex-col gap-1.5 mb-5">
            <div class="flex justify-between items-center w-full gap-1.5">
              <Label class="text-lg" for="attachment2">
                {existingAttachments.length === 0
                  ? "Attachment 2"
                  : "New Attachment 2"}
              </Label>
              <div class="flex items-center gap-2">
                <input
                  bind:this={file2Input}
                  onchange={(e) => handleFileChange(2, e)}
                  class="hidden"
                  id="attachment2"
                  type="file"
                />
                <div
                  class="flex items-center gap-2 border-input bg-background ring-offset-background h-10 w-64 rounded-md border px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs border"
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
            {#if $errors.attachment2}
              <span class="text-sm text-red-500 text-right"
                >{$errors.attachment2}</span
              >
            {/if}
          </div>
        {/if}
      {:else}
        <div
          class="p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-700 italic mb-5"
        >
          Maximum of 2 attachments reached. Delete an existing attachment to
          upload a new one.
        </div>
      {/if}
    </div>

    {#if data.position && data.position.attachments && data.position.attachments.length > 0}
      <div class="flex w-full max-w-sm flex-col gap-2 mb-5">
        <Label class="text-lg">Existing Attachments</Label>
        <div class="space-y-2">
          {#each data.position.attachments as attachment}
            <div
              class="flex items-center justify-between p-2 border border-slate-200 rounded-md bg-slate-50"
            >
              <span class="text-sm text-slate-700 truncate flex-1 mr-2">
                {attachment.fileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 h-auto"
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

    <div class="w-full flex justify-center gap-4">
      <a
        href="/dashboard"
        class={buttonVariants({ variant: "outline" }) +
          " w-28 py-4 border-blue-500 border-2"}>Cancel</a
      >
      <button
        type="submit"
        disabled={$submitting}
        class={buttonVariants({ variant: "default" }) + " w-28 py-4 flex items-center justify-center gap-2"}
      >
        {#if $submitting}
          <Loader2 class="h-4 w-4 animate-spin" />
          Processing...
        {:else}
          {buttonName}
        {/if}
      </button>
    </div>
  </form>
</div>

<div class="h-2"></div>
