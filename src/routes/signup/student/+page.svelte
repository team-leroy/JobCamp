<script lang="ts">
  import { untrack } from "svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { superForm } from "sveltekit-superforms";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import type { PageData } from "./$types";
  import { EyeClosedIcon, EyeIcon } from "lucide-svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const { form, errors, enhance, message } = superForm(
    untrack(() => data.form),
    {
      resetForm: false,
      clearOnSubmit: "none",
    }
  );

  const showSignupLogin = $derived(data.showSignupLogin);
  const studentAccountsEnabled = $derived(data.studentAccountsEnabled);
  const companyAccountsEnabled = $derived(data.companyAccountsEnabled);
  const gradeOptions = $derived(data.gradeOptions);

  let showPassword = $state(false);
  let passwordEntryType = $derived(showPassword ? "text" : "password");

  // Cast for checkbox binding to avoid TS unknown error
  let allowPhoneMessaging = $state(false);
  $effect.pre(() => {
    if (form) {
      allowPhoneMessaging = $form.allowPhoneMessaging as boolean;
    }
  });
  $effect(() => {
    $form.allowPhoneMessaging = allowPhoneMessaging;
  });
</script>

<Navbar
  isHost={false}
  loggedIn={false}
  isAdmin={false}
  {showSignupLogin}
  {studentAccountsEnabled}
  {companyAccountsEnabled}
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
      <label for="grade">Grade</label>
      <select
        class="px-2 py-2 rounded w-52 min-w-52 border"
        name="grade"
        bind:value={$form.grade}
      >
        <option value="" disabled>Select grade</option>
        {#each gradeOptions as grade}
          <option value={grade}>Grade {grade}</option>
        {/each}
      </select>
    </div>
    {#if $errors.grade}<span class="text-sm text-red-500">{$errors.grade}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="email">School Email</label>
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
      <label for="phone">STUDENT Phone</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        type="tel"
        name="phone"
        placeholder="(555) 555-5555"
        bind:value={$form.phone}
      />
    </div>
    {#if $errors.phone}<span class="text-sm text-red-500">{$errors.phone}</span
      >{/if}

    <div
      class="w-96 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
    >
      <div class="flex items-start gap-2">
        <input
          type="checkbox"
          class="rounded mt-1"
          name="allowPhoneMessaging"
          bind:checked={allowPhoneMessaging}
        />
        <label for="allowPhoneMessaging" class="text-sm text-gray-700">
          I agree to receive SMS messages from JobCamp. Up to 5 SMS reminders
          will be sent over the next two months. Message & data rates may apply.
          Reply STOP to opt out.
        </label>
      </div>
    </div>
    {#if $errors.allowPhoneMessaging}<span class="text-sm text-red-500"
        >{$errors.allowPhoneMessaging}</span
      >{/if}

    <div class="flex w-96 justify-between">
      <label for="parentEmail">PARENT Email</label>
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
    <p class="text-xs text-gray-500 text-center mt-2">
      By continuing, you agree to our
      <a href="/terms" class="underline hover:text-gray-700">Terms of Service</a>
      and
      <a href="/privacy" class="underline hover:text-gray-700">Privacy Policy</a>.
    </p>
  </form>
  <a href="/login" class="underline text-blue-500">Do you want to login?</a>
</div>
