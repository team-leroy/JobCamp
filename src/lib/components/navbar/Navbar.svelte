<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import User from "lucide-svelte/icons/user";
  import LogOut from "lucide-svelte/icons/log-out";
  import AlignJustify from "lucide-svelte/icons/align-justify";
  import { onMount } from "svelte";
  import { page } from "$app/state";
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

  onMount(() => {
    const x = window.matchMedia("(max-width: 768px)");
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) collapsed = false;
    };
    x.addEventListener("change", listener);
    if (x.matches) collapsed = false;
    return () => x.removeEventListener("change", listener);
  });
</script>

<nav
  class="w-full fixed top-0 left-0 bg-gray-800 flex flex-col z-50 justify-center shadow-md"
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
            <Button href="/messaging" variant="link" class="text-white text-xl"
              >Messaging</Button
            >
          {/if}
          <Button
            href="/dashboard/admin/data-mgmt"
            variant="link"
            class="text-white text-xl">Edit/Search Data</Button
          >
          {#if isFullAdmin}
            <Button href="/lottery" variant="link" class="text-white text-xl"
              >Lottery</Button
            >
          {/if}
          <Button
            href="/visualizations"
            variant="link"
            class="text-white text-xl">Visualizations</Button
          >
          {#if isFullAdmin}
            <Button
              href="/dashboard/admin/event-mgmt"
              variant="link"
              class="text-white text-xl">Event Mgmt</Button
            >
          {/if}
          <Button href="/dashboard" variant="link" class="text-white text-xl"
            >Dashboard</Button
          >
          {#key page.url.pathname}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer h-10 w-10"
              >
                <User />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="z-[100]" align="end">
                <DropdownMenu.Item asChild>
                  <a
                    href="/settings"
                    class="flex items-center cursor-pointer px-2 py-1.5 w-full"
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
                  >
                    <LogOut class="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </a>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {/key}
        {:else}
          {#if !loggedIn}
            <Button
              href="/lghs/view-companies"
              variant="link"
              class="text-white text-xl">View Companies</Button
            >
          {/if}
          <Button href="/about" variant="link" class="text-white text-xl"
            >About</Button
          >
          {#if loggedIn && isHost}
            <Button href="/host-tips" variant="link" class="text-white text-xl"
              >Host Tips</Button
            >
          {/if}
          <Button href="/faq" variant="link" class="text-white text-xl"
            >FAQ</Button
          >
          {#if !loggedIn}
            {#if showSignupLogin}
              <Button
                href="/signup"
                variant="link"
                class="text-white text-xl"
                disabled={!studentAccountsEnabled && !companyAccountsEnabled}
              >
                Sign Up
              </Button>
              <Button
                href="/login"
                variant="link"
                class="text-white text-xl"
                disabled={!studentAccountsEnabled && !companyAccountsEnabled}
              >
                Login
              </Button>
            {/if}
          {:else}
            <Button href="/dashboard" variant="link" class="text-white text-xl"
              >Dashboard</Button
            >
            {#key page.url.pathname}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer h-10 w-10"
                >
                  <User />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content class="z-[100]" align="end">
                  <DropdownMenu.Item asChild>
                    <a
                      href="/settings"
                      class="flex items-center cursor-pointer px-2 py-1.5 w-full"
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
                    >
                      <LogOut class="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            {/key}
          {/if}
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
    <div class="flex flex-col gap-4 pb-5 items-center">
      {#if isAdmin}
        {#if isFullAdmin}
          <Button href="/messaging" variant="link" class="text-white text-xl"
            >Messaging</Button
          >
        {/if}
        <Button
          href="/dashboard/admin/data-mgmt"
          variant="link"
          class="text-white text-xl">Edit/Search Data</Button
        >
        {#if isFullAdmin}
          <Button href="/lottery" variant="link" class="text-white text-xl"
            >Lottery</Button
          >
        {/if}
        <Button href="/visualizations" variant="link" class="text-white text-xl"
          >Visualizations</Button
        >
        {#if isFullAdmin}
          <Button
            href="/dashboard/admin/event-mgmt"
            variant="link"
            class="text-white text-xl">Event Mgmt</Button
          >
        {/if}
        <Button href="/dashboard" variant="link" class="text-white text-xl"
          >Dashboard</Button
        >
        <Button href="/settings" variant="link" class="text-white text-xl">Settings</Button>
        <Button href="/logout" variant="link" class="text-white text-xl text-red-400">
          <LogOut class="mr-2 h-4 w-4" />Log Out
        </Button>
      {:else}
        {#if !loggedIn}
          <Button
            href="/lghs/view-companies"
            variant="link"
            class="text-white text-xl">View Companies</Button
          >
        {/if}

        <Button href="/about" variant="link" class="text-white text-xl"
          >About</Button
        >

        {#if loggedIn && isHost}
          <Button href="/host-tips" variant="link" class="text-white text-xl"
            >Host Tips</Button
          >
        {/if}

        <Button href="/faq" variant="link" class="text-white text-xl"
          >FAQ</Button
        >

        {#if !loggedIn}
          {#if showSignupLogin}
            <Button
              href="/signup"
              variant="link"
              class="text-white text-xl"
              disabled={!studentAccountsEnabled && !companyAccountsEnabled}
            >
              Sign Up
            </Button>
            <Button
              href="/login"
              variant="link"
              class="text-white text-xl"
              disabled={!studentAccountsEnabled && !companyAccountsEnabled}
            >
              Login
            </Button>
          {/if}
        {:else}
          <Button href="/dashboard" variant="link" class="text-white text-xl"
            >Dashboard</Button
          >
          <Button href="/settings" variant="link" class="text-white text-xl">Settings</Button>
          <Button href="/logout" variant="link" class="text-white text-xl text-red-400">
            <LogOut class="mr-2 h-4 w-4" />Log Out
          </Button>
        {/if}
      {/if}
    </div>
  {/if}
</nav>
