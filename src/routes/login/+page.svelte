<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import type { PageData } from "./$types";
  import { Input } from "$lib/components/ui/input";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const { form, errors, enhance, message } = superForm(data.form, {
    resetForm: false,
    clearOnSubmit: "none",
  });

  let showPassword = $state(false);
  let passwordEntryType = $derived(showPassword ? "text" : "password");

  // Determine if signup/login should be shown
  const showSignupLogin = data.seasonActive && (data.studentAccountsEnabled || data.companyAccountsEnabled);
</script>

<Navbar 
  isHost={false} 
  loggedIn={false} 
  isAdmin={false}
  {showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<div class="w-full h-screen flex flex-col sm:gap-8 justify-center items-center">
  {#if !data.seasonActive}
    <!-- Season Inactive Notice -->
    <div
      class="max-w-md mx-4 mb-6 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg"
    >
      <h2 class="text-lg font-semibold text-yellow-800 mb-2">
        {#if !data.hasActiveEvent}
          JobCamp Season Has Ended
        {:else if !data.eventEnabled}
          JobCamp In Preparation
        {/if}
      </h2>
      <p class="text-yellow-700 text-sm">
        {#if !data.hasActiveEvent}
          Thank you for participating! Please check back next year for the next
          JobCamp season.
        {:else if !data.eventEnabled}
          We're currently preparing for the upcoming JobCamp event. Student and
          company access will be available soon.
        {/if}
      </p>
      {#if !data.hasActiveEvent}
        <p class="text-yellow-600 text-xs mt-2">
          Administrators can still log in to manage events.
        </p>
      {/if}
    </div>
  {:else if !data.studentAccountsEnabled && !data.companyAccountsEnabled}
    <!-- Both Account Types Disabled -->
    <div
      class="max-w-md mx-4 mb-6 p-6 bg-orange-50 border-l-4 border-orange-400 rounded-lg"
    >
      <h2 class="text-lg font-semibold text-orange-800 mb-2">
        Account Access Temporarily Disabled
      </h2>
      <p class="text-orange-700 text-sm">
        Student and company accounts are currently disabled for {data.eventName || "this event"}. 
        This may be during event preparation or maintenance.
      </p>
      <p class="text-orange-600 text-xs mt-2">
        Administrators can still access the system.
      </p>
    </div>
  {:else if !data.studentAccountsEnabled || !data.companyAccountsEnabled}
    <!-- One Account Type Disabled -->
    <div
      class="max-w-md mx-4 mb-6 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg"
    >
      <h2 class="text-lg font-semibold text-blue-800 mb-2">
        Limited Account Access
      </h2>
      <p class="text-blue-700 text-sm">
        {#if !data.studentAccountsEnabled}
          Student accounts are currently disabled for {data.eventName || "this event"}.
        {/if}
        {#if !data.companyAccountsEnabled}
          Company accounts are currently disabled for {data.eventName || "this event"}.
        {/if}
        Please check back later or contact an administrator if you need access.
      </p>
    </div>
  {/if}

  <form
    method="POST"
    class="max-w-full flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
    use:enhance
  >
    <h1 class="text-4xl">Login</h1>
    {#if $message}<span class="text-sm text-red-500">{$message}</span>{/if}

    <div class="flex max-w-full w-96 justify-between items-center">
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

    <div class="flex max-w-full w-96 justify-between items-center">
      <label for="password">Password</label>
      <Input
        class="px-2 py-0.5 rounded w-52 min-w-52"
        {...{ type: passwordEntryType }}
        name="password"
        bind:value={$form.password}
      />
    </div>
    {#if $errors.password}<span class="text-sm text-red-500"
        >{$errors.password}</span
      >{/if}

    <div class="flex max-w-full w-96 justify-center">
      <label
        ><input type="checkbox" bind:checked={showPassword} /> Show Password</label
      >
    </div>

    <button
      type="submit"
      class="mt-2 w-24 h-8 rounded bg-blue-500 text-white hover:bg-blue-600"
      >Login</button
    >
  </form>
  <a href="/reset-password" class="underline text-blue-500">Forgot Password?</a>
  {#if showSignupLogin}
    <a href="/signup" class="underline text-blue-500">Do you want to signup?</a>
  {:else}
    <a href="/admin/login" class="underline text-blue-500">Administrator Login</a>
  {/if}
</div>
