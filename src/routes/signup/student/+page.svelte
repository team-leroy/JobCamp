<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { superForm } from "sveltekit-superforms";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { EyeClosedIcon, EyeIcon } from "lucide-svelte";

  let { data } = $props();

  const { form, errors, enhance, message } = superForm(data.form, {
    resetForm: false,
    clearOnSubmit: "none",
  });

  let showPassword = $state(false);
  let passwordEntryType = $derived(showPassword ? "text" : "password");
</script>

<Navbar
  isHost={false}
  loggedIn={false}
  isAdmin={false}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<div
  class="w-full mt-28 flex flex-col sm:gap-8 justify-center items-center px-6"
>
  <form
    method="POST"
    class="max-w-full flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
    use:enhance
  >
    <h1 class="text-4xl">Sign Up</h1>
    {#if $message}<span class="text-sm text-red-500">{$message}</span>{/if}

    <div class="flex w-96 justify-between">
      <label for="firstName">First Name</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="text"
        name="firstName"
        bind:value={$form.firstName}
      />
    </div>
    {#if $errors.firstName}<span class="text-sm text-red-500"
        >{$errors.firstName}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="lastName">Last Name</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="text"
        name="lastName"
        bind:value={$form.lastName}
      />
    </div>
    {#if $errors.lastName}<span class="text-sm text-red-500"
        >{$errors.lastName}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="graduatingClassYear">Graduating Class</label>
      <select
        class="px-2 py-2 rounded w-52 min-w-52 border"
        name="graduatingClassYear"
        bind:value={$form.graduatingClassYear}
      >
        {#each data.graduatingClassYearOptions as classYear}
          <option
            value={classYear}
            selected={$form.graduatingClassYear == classYear}
            >Class of {classYear}</option
          >
        {/each}
      </select>
    </div>
    {#if $errors.graduatingClassYear}<span class="text-sm text-red-500"
        >{$errors.graduatingClassYear}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="email">Email</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="text"
        name="email"
        bind:value={$form.email}
      />
    </div>
    {#if $errors.email}<span class="text-sm text-red-500">{$errors.email}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="phone">Phone</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="text"
        name="phone"
        bind:value={$form.phone}
      />
    </div>
    {#if $errors.phone}<span class="text-sm text-red-500">{$errors.phone}</span
      >{/if}

    <div class="flex w-96 justify-center items-center gap-2">
      <input
        type="checkbox"
        class="rounded"
        name="allowPhoneMessaging"
        bind:checked={$form.allowPhoneMessaging}
      />
      <label for="allowPhoneMessaging">I Accept SMS Messages</label>
    </div>
    {#if $errors.allowPhoneMessaging}<span class="text-sm text-red-500"
        >{$errors.allowPhoneMessaging}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="parentEmail">Parent Email</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="text"
        name="parentEmail"
        bind:value={$form.parentEmail}
      />
    </div>
    {#if $errors.parentEmail}<span class="text-sm text-red-500"
        >{$errors.parentEmail}</span
      >{/if}

    <div class="flex w-96 justify-between items-center gap-4">
      <label for="password">Password</label>
      <Input
        class="px-2 py-0.5 rounded grow min-w-52"
        {...{ type: passwordEntryType }}
        name="password"
        bind:value={$form.password}
      />
      {#if showPassword}
        <EyeIcon
          class="hover:cursor-pointer w-8"
          onclick={() => (showPassword = false)}
        ></EyeIcon>
      {:else}
        <EyeClosedIcon
          class="hover:cursor-pointer w-8"
          onclick={() => (showPassword = true)}
        ></EyeClosedIcon>
      {/if}
      <!-- <Checkbox class="rounded mr-2" bind:checked={showPassword} /> -->
    </div>
    {#if $errors.password}<span class="text-sm text-red-500"
        >{$errors.password}</span
      >{/if}

    <button
      type="submit"
      class="mt-2 w-24 h-8 rounded bg-blue-500 text-white hover:bg-blue-600"
      >Sign Up</button
    >
  </form>
  <a href="/login" class="underline text-blue-500">Do you want to login?</a>
</div>
