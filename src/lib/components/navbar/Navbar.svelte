<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import User from "lucide-svelte/icons/user";
  import LogOut from "lucide-svelte/icons/log-out";
  import AlignJustify from "lucide-svelte/icons/align-justify";
  import { onMount } from "svelte";
  import logo from "$lib/assets/favicon.png";

  const {
    loggedIn,
    isHost,
    isAdmin,
    userRole = null,
    showSignupLogin = true,
    studentAccountsEnabled = true,
    companyAccountsEnabled = true,
  }: {
    loggedIn: boolean;
    isHost: boolean;
    isAdmin: boolean;
    userRole?: string | null;
    showSignupLogin?: boolean;
    studentAccountsEnabled?: boolean;
    companyAccountsEnabled?: boolean;
  } = $props();

  // Check if user is full admin (can see Messaging, Lottery, Event Mgmt)
  const isFullAdmin = $derived(isAdmin && userRole === "FULL_ADMIN");

  let collapsed = $state(false);
  let dropdownOpen = $state(false);

  onMount(() => {
    const x = window.matchMedia("(max-width: 768px)");
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) collapsed = false;
    };
    x.addEventListener("change", listener);
    if (x.matches) collapsed = false;
    return () => x.removeEventListener("change", listener);
  });

  const navLinkClass = "text-white text-xl hover:text-blue-200 transition-colors px-3 py-2";
  const mobileNavLinkClass = "text-white text-xl hover:text-blue-200 transition-colors py-2";
</script>

<nav
  class="fixed top-0 left-0 right-0 bg-gray-800 flex flex-col z-50 justify-center shadow-md"
  class:h-20={!collapsed}
>
  {#if !collapsed}
    <div class="flex h-20 flex-row justify-between items-center px-5">
      <a
        href={isHost ? "/dashboard" : "/lghs"}
        class="ml-4 text-2xl text-white flex justify-center items-center"
        ><img src={logo} alt="logo" class="h-8 pr-2" />JobCamp</a
      >
      <div class="hidden md:flex flex-row gap-4 mr-4 items-center">
        {#if isAdmin}
          {#if isFullAdmin}
            <a href="/messaging" class={navLinkClass}>Messaging</a>
          {/if}
          <a href="/dashboard/admin/data-mgmt" class={navLinkClass}>Edit/Search Data</a>
          {#if isFullAdmin}
            <a href="/lottery" class={navLinkClass}>Lottery</a>
          {/if}
          <a href="/visualizations" class={navLinkClass}>Visualizations</a>
          {#if isFullAdmin}
            <a href="/dashboard/admin/event-mgmt" class={navLinkClass}>Event Mgmt</a>
          {/if}
          <a href="/dashboard" class={navLinkClass}>Dashboard</a>
        {:else}
          {#if !loggedIn}
            <a href="/lghs/view-companies" class={navLinkClass}>View Companies</a>
          {:else if !isHost && !isAdmin}
            <a href="/dashboard/student/pick" class={navLinkClass}>View Companies</a>
          {/if}
          <a href="/about" class={navLinkClass}>About</a>
          {#if loggedIn && isHost}
            <a href="/host-tips" class={navLinkClass}>Host Tips</a>
          {/if}
          <a href="/faq" class={navLinkClass}>FAQ</a>
          {#if loggedIn}
            <a href="/dashboard" class={navLinkClass}>Dashboard</a>
          {/if}
          
          {#if !loggedIn && showSignupLogin}
            <a href="/signup" 
               class={navLinkClass + ( (!studentAccountsEnabled && !companyAccountsEnabled) ? " opacity-50 pointer-events-none" : "" )}>
              Sign Up
            </a>
            <a href="/login" 
               class={navLinkClass + ( (!studentAccountsEnabled && !companyAccountsEnabled) ? " opacity-50 pointer-events-none" : "" )}>
              Login
            </a>
          {/if}
        {/if}

        {#if loggedIn}
          <DropdownMenu.Root bind:open={dropdownOpen}>
            <DropdownMenu.Trigger
              class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer h-10 w-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <User class="text-gray-800" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="z-[100]" align="end">
              <DropdownMenu.Item asChild>
                <a
                  href="/settings"
                  class="flex items-center cursor-pointer px-2 py-1.5 w-full"
                  onclick={() => (dropdownOpen = false)}
                >
                  <User class="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item asChild>
                <a
                  href="/logout"
                  class="flex items-center cursor-pointer px-2 py-1.5 w-full text-red-600"
                  onclick={() => (dropdownOpen = false)}
                >
                  <LogOut class="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </a>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}
      </div>
      <AlignJustify
        onclick={() => (collapsed = !collapsed)}
        class="md:hidden text-white hover:cursor-pointer"
      />
    </div>
  {:else}
    <div class="flex h-20 flex-row justify-between items-center px-5">
      <a
        href={isHost ? "/dashboard" : "/lghs"}
        class="ml-4 text-2xl text-white flex justify-center items-center"
        ><img src={logo} alt="logo" class="h-8 pr-2" />JobCamp</a
      >
      <AlignJustify
        onclick={() => (collapsed = !collapsed)}
        class="text-white hover:cursor-pointer"
      />
    </div>
    <div class="flex flex-col gap-2 pb-5 items-center">
      {#if isAdmin}
        {#if isFullAdmin}
          <a href="/messaging" class={mobileNavLinkClass}>Messaging</a>
        {/if}
        <a href="/dashboard/admin/data-mgmt" class={mobileNavLinkClass}>Edit/Search Data</a>
        {#if isFullAdmin}
          <a href="/lottery" class={mobileNavLinkClass}>Lottery</a>
        {/if}
        <a href="/visualizations" class={mobileNavLinkClass}>Visualizations</a>
        {#if isFullAdmin}
          <a href="/dashboard/admin/event-mgmt" class={mobileNavLinkClass}>Event Mgmt</a>
        {/if}
        <a href="/dashboard" class={mobileNavLinkClass}>Dashboard</a>
        <a href="/settings" class={mobileNavLinkClass}>Settings</a>
        <a href="/logout" class={mobileNavLinkClass + " text-red-400"}>Log Out</a>
      {:else}
        {#if !loggedIn}
          <a href="/lghs/view-companies" class={mobileNavLinkClass}>View Companies</a>
        {:else if !isHost && !isAdmin}
          <a href="/dashboard/student/pick" class={mobileNavLinkClass}>View Companies</a>
        {/if}
        <a href="/about" class={mobileNavLinkClass}>About</a>
        {#if loggedIn && isHost}
          <a href="/host-tips" class={mobileNavLinkClass}>Host Tips</a>
        {/if}
        <a href="/faq" class={mobileNavLinkClass}>FAQ</a>
        
        {#if !loggedIn}
          {#if showSignupLogin}
            <a href="/signup" 
               class={mobileNavLinkClass + ( (!studentAccountsEnabled && !companyAccountsEnabled) ? " opacity-50 pointer-events-none" : "" )}>
              Sign Up
            </a>
            <a href="/login" 
               class={mobileNavLinkClass + ( (!studentAccountsEnabled && !companyAccountsEnabled) ? " opacity-50 pointer-events-none" : "" )}>
              Login
            </a>
          {/if}
        {:else}
          <a href="/dashboard" class={mobileNavLinkClass}>Dashboard</a>
          <a href="/settings" class={mobileNavLinkClass}>Settings</a>
          <a href="/logout" class={mobileNavLinkClass + " text-red-400"}>Log Out</a>
        {/if}
      {/if}
    </div>
  {/if}
</nav>
