<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import JobCampBanner from "$lib/assets/jobcampbanner.jpg";
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  const { data } = $props();
  const {
    isHost,
    loggedIn,
    isAdmin,
    seasonActive,
    hasActiveEvent,
    eventEnabled,
    eventName,
    studentAccountsEnabled,
    companyAccountsEnabled,
    showSignupLogin,
  } = data;
</script>

<Navbar 
  {isHost} 
  {loggedIn} 
  {isAdmin} 
  {showSignupLogin}
  {studentAccountsEnabled}
  {companyAccountsEnabled}
/>

<div
  class="w-screen h-screen bg-cover bg-center flex flex-col justify-center items-center"
  style="background-image: url({JobCampBanner});"
>
  <h1 class="text-7xl md:text-9xl text-black px-4">JobCamp</h1>

  {#if !seasonActive || !showSignupLogin}
    <!-- Season Over / Preparation Mode -->
    <div
      class="mt-8 max-w-lg mx-4 p-6 bg-white/90 rounded-lg shadow-2xl text-center"
    >
      {#if !hasActiveEvent}
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Season Has Ended</h2>
        <p class="text-gray-700 mb-4">
          Thank you for participating in JobCamp! We hope you had a great
          experience.
        </p>
        <p class="text-lg font-semibold text-blue-600">See you next year! 🎉</p>
      {:else if !eventEnabled}
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Coming Soon</h2>
        <p class="text-gray-700 mb-4">
          {eventName || "JobCamp"} is currently in preparation.
        </p>
        <p class="text-lg font-semibold text-blue-600">
          Check back soon for registration! 🚀
        </p>
      {:else if !showSignupLogin}
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Coming Soon</h2>
        <p class="text-gray-700 mb-4">
          {eventName || "JobCamp"} is currently in preparation.
        </p>
        <p class="text-lg font-semibold text-blue-600">
          Check back soon for registration! 🚀
        </p>
      {/if}

      {#if loggedIn && isAdmin}
        <div class="mt-4 pt-4 border-t border-gray-200">
          <Button href="/dashboard" variant="outline" class="text-sm">
            Admin Dashboard
          </Button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Normal Season Active -->
    <Button
      class="text-2xl mt-8 py-6 shadow-2xl"
      href={loggedIn ? "/dashboard" : "/signup"}
      >{loggedIn ? "Dashboard" : "Sign Up"}</Button
    >
    <!-- <Button variant="link" href="/lghs/view-companies" class="text-2xl text-black mt-5">View Companies</Button> -->
  {/if}
</div>
