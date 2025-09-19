<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import User from "lucide-svelte/icons/user";
  import LogOut from "lucide-svelte/icons/log-out";
  import AlignJustify from "lucide-svelte/icons/align-justify";
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { buttonVariants } from "../ui/button";
  import logo from "$lib/assets/favicon.png";

  const { loggedIn, isHost, isAdmin } = $props();

  let collapsed = $state(false);
  let form = $state<HTMLFormElement | undefined>(undefined);

  onMount(() => {
    var x = window.matchMedia("(max-width: 768px)");
    $effect(() => {
      if (x.matches) {
        collapsed = false;
      }
    });
  });
</script>

<nav
  class="w-screen fixed top-0 left-0 bg-gray-800 flex flex-col z-50 justify-center"
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
          <Button href="/messaging" variant="link" class="text-white text-xl"
            >Messaging</Button
          >
          <Button href="/edit-data" variant="link" class="text-white text-xl"
            >Edit/Search Data</Button
          >
          <Button href="/lottery" variant="link" class="text-white text-xl"
            >Lottery</Button
          >
          <Button
            href="/visualizations"
            variant="link"
            class="text-white text-xl">Visualizations</Button
          >
          <Button
            href="/dashboard/admin/event-mgmt"
            variant="link"
            class="text-white text-xl">Event Mgmt</Button
          >
          <Button href="/dashboard" variant="link" class="text-white text-xl"
            >Dashboard</Button
          >
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <span
                class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                style="height: 2.5rem; width: 2.5rem;"
              >
                <User />
              </span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item>
                <form
                  method="POST"
                  use:enhance
                  action="/dashboard/?/logOut"
                  bind:this={form}
                >
                  <DropdownMenu.Item onclick={() => form?.submit()}>
                    <LogOut class="mr-2 h-4 w-4" />
                    <input type="submit" value="Log out" />
                  </DropdownMenu.Item>
                </form>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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
            <Button href="/signup" variant="link" class="text-white text-xl"
              >Sign Up</Button
            >
            <Button href="/login" variant="link" class="text-white text-xl"
              >Login</Button
            >
          {:else}
            <Button href="/dashboard" variant="link" class="text-white text-xl"
              >Dashboard</Button
            >
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <span
                  class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                  style="height: 2.5rem; width: 2.5rem;"
                >
                  <User />
                </span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <!-- <DropdownMenu.Item>
                            <button class="nav-dropdown-button">
                                <Settings class="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </button>
                        </DropdownMenu.Item> -->
                <DropdownMenu.Item>
                  <form
                    method="POST"
                    use:enhance
                    action="/dashboard/?/logOut"
                    bind:this={form}
                  >
                    <DropdownMenu.Item onclick={() => form?.submit()}>
                      <LogOut class="mr-2 h-4 w-4" />
                      <input type="submit" value="Log out" />
                    </DropdownMenu.Item>
                  </form>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
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
    <div class="flex flex-col gap-4 pb-5">
      {#if isAdmin}
        <Button href="/messaging" variant="link" class="text-white text-xl"
          >Messaging</Button
        >
        <Button href="/edit-data" variant="link" class="text-white text-xl"
          >Edit Data</Button
        >
        <Button href="/lottery" variant="link" class="text-white text-xl"
          >Lottery</Button
        >
        <Button href="/visualizations" variant="link" class="text-white text-xl"
          >Visualizations</Button
        >
        <Button href="/dashboard" variant="link" class="text-white text-xl"
          >Dashboard</Button
        >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <span
              class="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              style="height: 2.5rem; width: 2.5rem;"
            >
              <User />
            </span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item>
              <form
                method="POST"
                use:enhance
                action="/dashboard/?/logOut"
                bind:this={form}
              >
                <DropdownMenu.Item onclick={() => form?.submit()}>
                  <LogOut class="mr-2 h-4 w-4" />
                  <input type="submit" value="Log out" />
                </DropdownMenu.Item>
              </form>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        {#if loggedIn && !isHost}
          <!-- <Button href="/dashboard/student/pick" variant="link" class="text-white text-xl">Pick Favorites</Button> -->
        {/if}

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
          <Button href="/signup" variant="link" class="text-white text-xl"
            >Sign Up</Button
          >
          <Button href="/login" variant="link" class="text-white text-xl"
            >Login</Button
          >
        {:else}
          <Button href="/dashboard" variant="link" class="text-white text-xl"
            >Dashboard</Button
          >
          <form
            method="POST"
            use:enhance
            action="/dashboard/?/logOut"
            class="w-full flex items-center justify-center"
          >
            <button
              type="submit"
              class={buttonVariants({ variant: "link" }) +
                " text-white text-xl"}
              ><LogOut class="mr-2 h-4 w-4" />Log Out</button
            >
          </form>
        {/if}
      {/if}
    </div>
  {/if}
</nav>
