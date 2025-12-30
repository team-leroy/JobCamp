<script lang="ts">
  import { untrack } from "svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { careers } from "$lib/appconfig";
  import { superForm } from "sveltekit-superforms";
  import { Trash2 } from "lucide-svelte";

  let { data, formTitle, buttonName } = $props();

  const {
    form,
    errors,
    enhance: formEnhance,
  } = superForm(untrack(() => data.form), {
    resetForm: false,
  });

  function getPositionId(): string | null {
    return $form.positionId || null;
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

    <div class="flex w-full max-w-sm flex-col gap-1.5 mb-5">
      <div class="flex justify-between items-center w-full max-w-sm gap-1.5">
        <Label class="text-lg" for="attachment1">Attachment 1</Label>
        <Input
          bind:value={$form.attachment1}
          class="w-64"
          name="attachment1"
          id="attachment1"
          type="file"
        />
      </div>
      {#if $errors.attachment1}<span class="text-sm text-red-500 text-right"
          >{$errors.attachment1}</span
        >{/if}
    </div>

    <div class="flex w-full max-w-sm flex-col gap-1.5 mb-5">
      <div class="flex justify-between items-center w-full max-w-sm gap-1.5">
        <Label class="text-lg" for="attachment2">Attachment 2</Label>
        <Input
          bind:value={$form.attachment2}
          class="w-64"
          name="attachment2"
          id="attachment2"
          type="file"
        />
      </div>
      {#if $errors.attachment2}<span class="text-sm text-red-500 text-right"
          >{$errors.attachment2}</span
        >{/if}
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
                onclick={async () => {
                  const form = document.createElement("form");
                  form.method = "POST";
                  form.action = getPositionId()
                    ? `?/deleteAttachment&posId=${getPositionId()}`
                    : "#";

                  const attachmentIdInput = document.createElement("input");
                  attachmentIdInput.type = "hidden";
                  attachmentIdInput.name = "attachmentId";
                  attachmentIdInput.value = attachment.id;
                  form.appendChild(attachmentIdInput);

                  const posIdInput = document.createElement("input");
                  posIdInput.type = "hidden";
                  posIdInput.name = "posId";
                  posIdInput.value = getPositionId() || "";
                  form.appendChild(posIdInput);

                  document.body.appendChild(form);
                  form.submit();
                }}
              >
                <Trash2 class="h-4 w-4" />
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
        class={buttonVariants({ variant: "default" }) + " w-28 py-4"}
        >{buttonName}</button
      >
    </div>
  </form>
</div>

<div class="h-2"></div>
