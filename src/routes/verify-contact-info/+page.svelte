<script lang="ts">
  import { untrack } from "svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { superForm } from "sveltekit-superforms";
  import Button from "$lib/components/ui/button/button.svelte";
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  let { data } = $props();

  const { form, errors, enhance } = superForm(untrack(() => data.form), {
    resetForm: false,
    clearOnSubmit: "none",
  });
</script>

<Navbar
  isHost={false}
  loggedIn={true}
  isAdmin={data.isAdmin}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<div
  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl max-w-full"
>
  <h1 class="text-xl text-center">
    Verify Contact Information for {data.eventName}
  </h1>
  <p class="text-center text-gray-600 max-w-md">
    Please verify your parent's email address and your phone number. This
    information is required for {data.eventName}.
  </p>

  <form
    method="POST"
    class="flex flex-col justify-between items-center gap-4 w-full max-w-md"
    use:enhance
  >
    <div class="flex w-full justify-between items-center gap-4">
      <label for="parentEmail" class="text-right min-w-32">PARENT Email</label>
      <Input
        class="px-2 py-0.5 rounded flex-1 min-w-52"
        type="email"
        name="parentEmail"
        placeholder="parent@example.com"
        bind:value={$form.parentEmail}
      />
    </div>
    {#if $errors.parentEmail}
      <span class="text-sm text-red-500 w-full text-center"
        >{$errors.parentEmail}</span
      >
    {/if}

    <div class="flex w-full justify-between items-center gap-4">
      <label for="phone" class="text-right min-w-32">STUDENT Phone</label>
      <Input
        class="px-2 py-0.5 rounded flex-1 min-w-52"
        type="tel"
        name="phone"
        placeholder="(555) 555-5555"
        bind:value={$form.phone}
      />
    </div>
    {#if $errors.phone}
      <span class="text-sm text-red-500 w-full text-center"
        >{$errors.phone}</span
      >
    {/if}

    <Button type="submit" variant="default" class="mt-4">
      Verify and Continue
    </Button>
  </form>
</div>
