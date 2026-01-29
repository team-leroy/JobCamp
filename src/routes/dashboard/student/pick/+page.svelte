<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";
  import Label from "$lib/components/ui/label/label.svelte";

  let { data, form } = $props();

  let parentEmail = $state(data.parentEmail);
  let selected = $state("career");
  let selectedTerm = $state("");

  interface PositionData {
    id: string;
    title: string;
    career: string;
    slots: number;
    summary: string;
    address: string;
    instructions: string;
    attire: string;
    arrival: string;
    start: string;
    end: string;
    host: {
      company: {
        companyName: string;
        companyDescription?: string;
        companyUrl?: string | null;
      } | null;
    };
    selected?: boolean;
    attachments?: Array<{
      id: string;
      fileName: string;
    }>;
    [key: string]: unknown;
  }

  let filteredPositions = $derived(
    (() => {
      return data.positionData.filter((value: PositionData) => {
        if (selected == "career") {
          return value.career == selectedTerm;
        } else {
          return value.host.company?.companyName == selectedTerm;
        }
      });
    })()
  );

  let terms = $derived(
    (() => {
      let possible: Record<string, number> = {};
      data.positionData.forEach((value: PositionData) => {
        if (selected == "career") {
          possible[value.career] = 1;
        } else {
          if (!value.host.company) {
            return -1;
          }
          possible[value.host.company.companyName] = 1;
        }
      });
      return Object.keys(possible).sort();
    })()
  );

  const selectTerm = (term: string) => {
    if (term == selectedTerm) {
      selectedTerm = "";
      return;
    }
    selectedTerm = term;
  };

  let count = $state(0);
  let initialized = false;
  $effect.pre(() => {
    if (!initialized) {
      count = data.countSelected;
      initialized = true;
    }
  });

  const togglePosition = async (posID: string) => {
    const fdata = new FormData();
    fdata.append("id", posID);

    await fetch("/dashboard/student/pick?/togglePosition", {
      method: "POST",
      body: fdata,
      headers: {
        "x-sveltekit-action": "true",
      },
    });

    data.positionData.map((val: PositionData) => {
      if (val.id == posID) {
        val.selected = !val.selected;
        if (val.selected == true) {
          count += 1;
        } else {
          count -= 1;
        }
      }
      return val;
    });
  };

  let claimingPosId = $state<string | null>(null);
  let showConfirmModal = $state(false);
  let claimError = $state<string | null>(null);

  async function handleClaim(posId: string) {
    claimingPosId = posId;
    showConfirmModal = true;
    claimError = null;
  }

  async function confirmClaim() {
    if (!claimingPosId) return;

    const formData = new FormData();
    formData.append("id", claimingPosId);

    const response = await fetch("/dashboard/student/pick?/claimPosition", {
      method: "POST",
      body: formData,
      headers: {
        "x-sveltekit-action": "true",
      },
    });

    const result = await response.json();
    const actionResult = JSON.parse(result.data);

    if (actionResult.success) {
      // Redirect to dashboard on success
      window.location.href = "/dashboard/student";
    } else {
      claimError = actionResult.message || "Failed to claim position.";
      showConfirmModal = false;
      claimingPosId = null;
    }
  }
</script>

<Navbar isHost={false} loggedIn={true} isAdmin={false} />

{#if showConfirmModal}
  <div
    class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <h3 class="text-xl font-bold mb-4">Confirm Position Claim</h3>
      <p class="text-gray-600 mb-6">
        Claiming this position will finalize your JobCamp assignment. You cannot
        change this later. Are you sure?
      </p>
      <div class="flex justify-end gap-3">
        <Button
          variant="outline"
          onclick={() => {
            showConfirmModal = false;
            claimingPosId = null;
          }}>Cancel</Button
        >
        <Button
          class="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          onclick={confirmClaim}>Confirm & Claim</Button
        >
      </div>
    </div>
  </div>
{/if}

{#if claimError}
  <div
    class="fixed top-24 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4"
  >
    <div
      class="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg shadow-lg flex justify-between items-center"
    >
      <p class="text-red-700 font-medium">{claimError}</p>
      <button
        onclick={() => (claimError = null)}
        class="text-red-500 hover:text-red-700"
        aria-label="Close error message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><line x1="18" y1="6" x2="6" y2="18" /><line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          /></svg
        >
      </button>
    </div>
  </div>
{/if}

<!-- Event Access Disabled Warning -->
{#if !data.canSignUp}
  <div class="mt-24 mx-auto max-w-4xl px-4">
    <div class="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-yellow-700 mb-2">
            <strong>Position selection is currently unavailable.</strong>
          </p>
          {#if !data.studentAccountsEnabled}
            <p class="text-sm text-yellow-600">
              • Student accounts are disabled
            </p>
          {/if}
          {#if data.studentAccountsEnabled && !data.studentSignupsEnabled}
            <p class="text-sm text-yellow-600">
              • Student signups are disabled
            </p>
          {/if}
          <p class="text-sm text-yellow-700 mt-2">
            Please contact your administrator for more information.
          </p>
        </div>
      </div>
    </div>
  </div>
{:else if !data.permissionSlipCompleted}
  <div class="mt-24 mx-auto max-w-4xl px-4 mb-[-4rem] relative z-10">
    <div class="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg shadow-sm">
      <div class="flex items-center">
        <div class="shrink-0 text-orange-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-orange-800">
            <strong>Browsing Mode:</strong> You can view all available positions, but you must have a signed permission slip on file before you can select favorites.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<div
  class="flex sm:flex-row flex-col w-full h-screen pt-28"
  class:pointer-events-none={!data.canSignUp}
  class:opacity-50={!data.canSignUp}
>
  <div
    class="flex flex-col px-4 gap-2 h-full justify-start items-start p-4 border-r-2 border-r-slate-950 min-w-[300px]"
  >
    {#if !data.permissionSlipCompleted}
      <div
        class="flex flex-col p-4 border rounded-lg mb-4 bg-orange-50 border-orange-200"
      >
        <span class="text-lg font-bold text-orange-800 mb-2">Permission Slip Needed</span>
        <span class="text-sm text-orange-700 mb-3"
          >To select Favorite Jobs, your parent permission slip must be completed.
          You can view companies below, but cannot add them to your list yet.</span
        >
        <form
          class="flex flex-col gap-2"
          method="post"
          action="?/sendPermissionSlip"
          use:enhance
        >
          <Label class="text-xs font-semibold text-orange-900">RESEND TO PARENT EMAIL
            <Input
              type="email"
              name="parent-email"
              bind:value={parentEmail}
              class="mt-1 bg-white"
            />
          </Label>
          <button
            type="submit"
            class="mt-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-white text-sm font-medium transition-colors"
            >Send Email</button
          >
          {#if form && form.sent}
            <span class="text-green-600 text-sm font-bold mt-1">✓ Sent successfully</span>
          {/if}
          {#if form && form.err}
            <span class="text-red-600 text-sm font-bold mt-1"
              >✕ Error sending email</span
            >
          {/if}
        </form>
      </div>
    {/if}

    <h1>Search positions by...</h1>
    <div class="flex justify-center items-center gap-3">
      <Button
        class="w-24"
        variant={selected == "career" ? "default" : "outline"}
        onclick={() => (selected = "career")}>Career</Button
      >
      <Button
        class="w-24"
        variant={selected == "career" ? "outline" : "default"}
        onclick={() => (selected = "company")}>Company</Button
      >
    </div>
    <hr class="border-t-2 border-t-slate-950 w-full" />
    {#each terms as term}
      <Button
        class="text-xl sm:text-sm hidden sm:block"
        variant={selectedTerm == term ? "default" : "outline"}
        onclick={() => {
          selectTerm(term);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>{term}</Button
      >
      <Button
        class="text-xl sm:text-sm sm:hidden"
        variant={selectedTerm == term ? "default" : "outline"}
        onclick={() => selectTerm(term)}>{term}</Button
      >
      {#if selectedTerm == term}
        <div class="sm:hidden mx-4 mt-2 w-fit">
          <Accordion.Root type="multiple">
            {#each filteredPositions as position}
              <Accordion.Item value={position.id} class="my-2">
                <Accordion.Trigger
                  class="text-xl bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5"
                >
                  <div class="flex flex-col items-start w-full pr-4">
                    <span class="font-bold"
                      >{position.host?.company?.companyName}</span
                    >
                    <div class="flex items-center justify-between w-full">
                      <span class="text-lg">{position.title}</span>
                      <span class="text-lg text-slate-500 italic shrink-0"
                        >({position.slots} slots)</span
                      >
                    </div>
                  </div>
                </Accordion.Trigger>
            <Accordion.Content class="px-5">
              {#if data.permissionSlipCompleted}
                {#if data.isScrambleMode}
                  {#if data.isAssigned}
                    <div class="bg-blue-50 p-3 rounded-md mb-4 text-blue-800 text-sm">
                      You are already assigned to a position.
                    </div>
                  {:else}
                    <Button 
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold my-3"
                      onclick={() => handleClaim(position.id)}
                    >
                      Claim this Position
                    </Button>
                  {/if}
                {:else}
                  <label class="flex gap-2 text-lg my-3 items-center">
                    {#if count < 10}
                      <input
                        type="checkbox"
                        name="selected"
                        class="w-4 h-4 rounded"
                        disabled={count >= 10}
                        bind:checked={position.selected}
                        onchange={() => togglePosition(position.id)}
                      />
                      Add to My Favorite Jobs
                    {:else}
                      <span class="bg-red-200 px-1"
                        >You have 10 Favorite Jobs selected. If you want to
                        add this one, you'll need to <a
                          href="/dashboard/student"
                          >delete one from your list.</a
                        ></span
                      >
                    {/if}
                  </label>
                {/if}
              {/if}

              <p class="mt-1">Career: {position.career}</p>
                  <br />
                  <p class="mt-1">
                    Description: {position.host?.company?.companyDescription}
                  </p>
                  <p class="mt-1">URL: {position.host?.company?.companyUrl}</p>
                  <p class=""># of slots for students: {position.slots}</p>

                  <hr class="my-2" />

                  <p class=" whitespace-pre-line">
                    Address:
                    {position.address}

                    Summary:
                    {position.summary}

                    Instructions For Students:
                    {position.instructions}

                    Attire:
                    {position.attire}
                  </p>

                  <hr class="my-2" />

                  <p class="">Arrival: {position.arrival}</p>
                  <p class="">Start: {position.start}</p>
                  <p class="">End: {position.end}</p>

                  {#if position.attachments && Array.isArray(position.attachments) && position.attachments.length > 0}
                    <hr class="my-2" />
                    <div class="mt-2">
                      <p class="font-semibold mb-2">Attachments:</p>
                      <ul class="list-disc list-inside space-y-1">
                        {#each position.attachments as attachment}
                          <li>
                            <a
                              href="/api/attachments/{attachment.id}/download"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {attachment.fileName}
                            </a>
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </Accordion.Content>
              </Accordion.Item>
            {/each}
          </Accordion.Root>
        </div>
      {/if}
    {/each}
  </div>
  <div class="hidden sm:flex flex-col w-full h-full">
    {#if selectedTerm == ""}
      <div class="flex flex-col items-center justify-center h-full mt-10 px-4 text-center">
        <h1 class="text-2xl font-bold mb-2">
          {data.isScrambleMode ? "Available Positions" : "Find Your Favorite Jobs"}
        </h1>
        <p class="text-slate-600 max-w-md">
          {data.isScrambleMode 
            ? "Browse the list of positions that still have available slots. Select a category on the left to see jobs you can claim." 
            : "Please select a career or company on the left to view positions and build your favorites list."}
        </p>
        {#if data.isScrambleMode && data.positionData.length === 0}
          <div class="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl max-w-lg">
            <p class="text-amber-800 font-medium">
              All job shadow positions for this event are currently full. 
              Please contact your administrator if you still need assistance.
            </p>
          </div>
        {/if}
      </div>
    {/if}
    <div class="mx-4 mt-2">
      <Accordion.Root type="multiple">
        {#each filteredPositions as position}
          <Accordion.Item value={position.id} class="my-2">
            <Accordion.Trigger
              class="text-xl bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5"
            >
              <div class="flex flex-col items-start w-full pr-4">
                <span class="font-bold"
                  >{position.host?.company?.companyName}</span
                >
                <div class="flex items-center justify-between w-full">
                  <span class="text-lg">{position.title}</span>
                  <span class="text-lg text-slate-500 italic shrink-0"
                    >({position.slots} slots)</span
                  >
                </div>
              </div>
            </Accordion.Trigger>
            <Accordion.Content class="px-5">
              {#if data.permissionSlipCompleted}
                {#if data.isScrambleMode}
                  {#if data.isAssigned}
                    <div class="bg-blue-50 p-3 rounded-md mb-4 text-blue-800 text-sm">
                      You are already assigned to a position.
                    </div>
                  {:else}
                    <Button 
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold my-3"
                      onclick={() => handleClaim(position.id)}
                    >
                      Claim this Position
                    </Button>
                  {/if}
                {:else}
                  <label class="flex gap-2 text-lg my-3 items-center">
                    {#if count < 10}
                      <input
                        type="checkbox"
                        name="selected"
                        class="w-4 h-4 rounded"
                        disabled={count >= 10}
                        bind:checked={position.selected}
                        onchange={() => togglePosition(position.id)}
                      />
                      Add to My Favorite Jobs
                    {:else}
                      <span class="bg-red-200 px-1"
                        >You have 10 Favorite Jobs selected. If you want to add
                        this one, you'll need to <a href="/dashboard/student"
                          >delete one from your list.</a
                        ></span
                      >
                    {/if}
                  </label>
                {/if}
              {/if}

              <p class="mt-1">Career: {position.career}</p>
              <br />
              <p class="mt-1">
                Description: {position.host?.company?.companyDescription}
              </p>
              <p class="mt-1">URL: {position.host?.company?.companyUrl}</p>
              <p class=""># of slots for students: {position.slots}</p>

              <hr class="my-2" />

              <p class=" whitespace-pre-line">
                Address:
                {position.address}

                Summary:
                {position.summary}

                Instructions For Students:
                {position.instructions}

                Attire:
                {position.attire}
              </p>

              <hr class="my-2" />

              <p class="">Arrival: {position.arrival}</p>
              <p class="">Start: {position.start}</p>
              <p class="">End: {position.end}</p>

              {#if position.attachments && Array.isArray(position.attachments) && position.attachments.length > 0}
                <hr class="my-2" />
                <div class="mt-2">
                  <p class="font-semibold mb-2">Attachments:</p>
                  <ul class="list-disc list-inside space-y-1">
                    {#each position.attachments as attachment}
                      <li>
                        <a
                          href="/api/attachments/{attachment.id}/download"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {attachment.fileName}
                        </a>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    </div>
  </div>
</div>
