<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { ArrowBigDown, ArrowBigUp, Trash2Icon, Loader2 } from "lucide-svelte";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";
  import Button from "$lib/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";

  let { data, form } = $props();

  let parentEmail = $state(data.parentEmail);

  // Format date for display
  function formatDate(date: string | Date | null): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  let positions = $state({ posList: [] as typeof data.positions });
  let initialized = false;
  $effect.pre(() => {
    if (!initialized) {
      positions.posList = data.positions;
      initialized = true;
    }
  });

  const permissionSlipStatus = $derived(
    data.permissionSlipCompleted
      ? {
          label: "Completed",
          tone: "text-emerald-600",
          helper: "You're cleared to participate.",
        }
      : {
          label: "Needs Action",
          tone: "text-amber-600",
          helper:
            "Ask your parent to sign the permission slip so you can pick jobs.",
        },
  );

  const lotterySummary = $derived(
    (() => {
      if (!data.lotteryPublished) {
        return {
          label: "Not Published",
          tone: "text-slate-500",
          helper: "We’ll email you once lottery results are released.",
        };
      }

      if (data.lotteryResult) {
        return {
          label: "Assigned",
          tone: "text-emerald-600",
          helper: "Review the details of your assigned position below.",
        };
      }

      return {
        label: "Pending",
        tone: "text-amber-600",
        helper: "Lottery is published — results will appear here soon.",
      };
    })(),
  );

  const nextStepSummary = $derived(
    (() => {
      if (!data.hasActiveEvent) {
        return {
          label: "Waiting for Event",
          helper:
            "We'll let you know as soon as the next JobCamp event launches.",
        };
      }

      if (!data.permissionSlipCompleted) {
        return {
          label: "Complete Permission Slip",
          helper:
            "Get the permission slip signed so you can add your favorite jobs.",
        };
      }

      // If lottery is published and student has been assigned, show review dates message
      if (data.lotteryPublished && data.lotteryResult) {
        return {
          label: "Review important dates",
          helper:
            "Check the important dates section for upcoming deadlines and events.",
        };
      }

      if (!data.studentSignupsEnabled) {
        return {
          label: "Signups Closed",
          helper:
            "You can review your picks, but changes are currently locked.",
        };
      }

      return {
        label: "Pick Favorite Jobs",
        helper: "Add or reorder your favorite jobs below.",
      };
    })(),
  );

  const deletePosition = async (posID: string) => {
    // Optimistically update UI
    positions.posList = positions.posList.filter((val) => val.id != posID);

    const formData = new FormData();
    formData.append("id", posID);

    await fetch("/dashboard/student?/deletePosition", {
      method: "POST",
      body: formData,
      headers: {
        "x-sveltekit-action": "true",
      },
    });
  };

  const moveUp = async (posID: string) => {
    // Optimistically update UI
    let posRankIndex = 0;
    for (let i = 0; i < positions.posList.length; i++) {
      if (positions.posList[i].id == posID) {
        posRankIndex = i;
      }
    }

    var temp = positions.posList[posRankIndex + 1];
    positions.posList[posRankIndex + 1] = positions.posList[posRankIndex];
    positions.posList[posRankIndex] = temp;

    const formData = new FormData();
    formData.append("id", posID);
    formData.append("dir", "down");

    await fetch("/dashboard/student?/move", {
      method: "POST",
      body: formData,
      headers: {
        "x-sveltekit-action": "true",
      },
    });
  };

  const moveDown = async (posID: string) => {
    // Optimistically update UI
    let posRankIndex = 0;
    for (let i = 0; i < positions.posList.length; i++) {
      if (positions.posList[i].id == posID) {
        posRankIndex = i;
      }
    }

    var temp = positions.posList[posRankIndex - 1];
    positions.posList[posRankIndex - 1] = positions.posList[posRankIndex];
    positions.posList[posRankIndex] = temp;

    const formData = new FormData();
    formData.append("id", posID);
    formData.append("dir", "up");

    await fetch("/dashboard/student?/move", {
      method: "POST",
      body: formData,
      headers: {
        "x-sveltekit-action": "true",
      },
    });
  };

  let leftWidth = $derived(
    data.lotteryResult
      ? " w-full"
      : positions.posList.length == 0
        ? " w-full md:w-72"
        : " w-full md:min-w-[32rem]",
  );

  // Scramble mode (manual selection) state
  let claimingPosId = $state<string | null>(null);
  let showConfirmModal = $state(false);
  let claimError = $state<string | null>(null);
  let isClaiming = $state(false);

  async function handleClaim(posId: string) {
    claimingPosId = posId;
    showConfirmModal = true;
    claimError = null;
  }
</script>

<Navbar loggedIn={true} isHost={false} isAdmin={false} />

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
          disabled={isClaiming}
          onclick={() => {
            showConfirmModal = false;
            claimingPosId = null;
          }}>Cancel</Button
        >
        <form
          method="POST"
          action="/dashboard/student/pick?/claimPosition"
          use:enhance={() => {
            isClaiming = true;
            return async ({ result }) => {
              if (result.type === "redirect") {
                showConfirmModal = false;
                goto(result.location);
              } else if (result.type === "failure") {
                isClaiming = false;
                claimError =
                  (result.data as { message?: string })?.message ||
                  "Failed to claim position.";
                showConfirmModal = false;
                claimingPosId = null;
              } else {
                isClaiming = false;
                showConfirmModal = false;
                claimingPosId = null;
              }
            };
          }}
        >
          <input type="hidden" name="id" value={claimingPosId} />
          <Button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[140px]"
            disabled={isClaiming}
          >
            {#if isClaiming}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Claiming...
            {:else}
              Confirm & Claim
            {/if}
          </Button>
        </form>
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

<section class="w-full border-b bg-slate-50/60 mb-6 mt-28 overflow-x-hidden">
  <div
    class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Active Event
      </p>
      {#if data.hasActiveEvent}
        <h1 class="text-xl font-semibold text-slate-900">
          {data.activeEventName ?? "JobCamp"}
        </h1>
        {#if data.activeEventDate}
          <p class="text-sm text-slate-600">
            {formatDate(data.activeEventDate)}
          </p>
        {/if}
      {:else}
        <h1 class="text-xl font-semibold text-slate-900">
          No active event yet
        </h1>
        <p class="text-sm text-slate-600">
          We'll send an email as soon as the next JobCamp event opens.
        </p>
      {/if}
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {#if data.isScrambleMode && !data.lotteryResult}
        <div
          class="rounded-lg border border-blue-500 bg-blue-500 p-3 text-white shadow-sm sm:col-span-2 lg:col-span-4"
        >
          <div class="flex items-center gap-3">
            <div class="bg-white/20 p-2 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><circle cx="12" cy="12" r="10" /><line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
              >
            </div>
            <div>
              <p class="font-bold text-lg">Action Needed: Claim a Position</p>
              <p class="text-sm text-blue-50">
                The lottery is complete and you were not assigned a position.
                You can now manually claim any remaining available spot.
              </p>
            </div>
            <div class="ml-auto">
              <Button
                href="/dashboard/student/pick"
                class="bg-white text-blue-600 hover:bg-blue-50 font-bold"
              >
                Browse Available Jobs
              </Button>
            </div>
          </div>
        </div>
      {/if}

      <div
        class="rounded-lg border border-orange-500 bg-orange-500 p-3 text-white shadow-sm"
      >
        <p
          class="text-xs font-semibold uppercase tracking-wide text-orange-100"
        >
          Next Step
        </p>
        <p class="mt-1 text-lg font-semibold text-white">
          {nextStepSummary.label}
        </p>
        <p class="mt-1 text-xs text-orange-50 leading-snug">
          {nextStepSummary.helper}
        </p>
      </div>

      <div class="rounded-lg border bg-white p-3 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Permission Slip
        </p>
        <p
          class={"mt-1 text-lg font-semibold text-slate-900 " +
            permissionSlipStatus.tone}
        >
          {permissionSlipStatus.label}
        </p>
        <p class="mt-1 text-xs text-slate-600 leading-snug">
          {permissionSlipStatus.helper}
        </p>
      </div>

      <div class="rounded-lg border bg-white p-3 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Favorite Jobs (ranked)
        </p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">
          {positions.posList.length}
        </p>
        <p class="mt-1 text-xs text-slate-600 leading-snug">
          {#if positions.posList.length === 0}
            {#if data.permissionSlipCompleted}
              Start exploring positions to build your list.
            {:else}
              You must have the permission slip signed before you can pick jobs.
            {/if}
          {:else if positions.posList.length === 1}
            You've selected one favorite so far.
          {:else}
            You have {positions.posList.length} jobs ranked in your list.
          {/if}
        </p>
      </div>

      <div class="rounded-lg border bg-white p-3 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Lottery Status
        </p>
        <p
          class={"mt-1 text-lg font-semibold text-slate-900 " +
            lotterySummary.tone}
        >
          {lotterySummary.label}
        </p>
        <p class="mt-1 text-xs text-slate-600 leading-snug">
          {lotterySummary.helper}
        </p>
      </div>
    </div>
  </div>
</section>

<div
  class="flex flex-col md:flex-row w-full min-h-screen pt-4 sm:pt-24 overflow-x-hidden"
>
  <div
    class={"flex flex-col gap-2 justify-start items-center md:m-4" + leftWidth}
  >
    {#if data.lotteryResult}
      <div class="px-4 w-full">
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="text-sm font-bold text-blue-800">
            ACTION REQUIRED: PLEASE CHECK ALL DETAILS OF YOUR POSITION.
          </p>
          <p class="text-xs text-blue-700 mt-1">
            Review start time, location, required ID, and any forms to complete.
          </p>
        </div>
        <h2 class="text-xl font-semibold mb-2">Your Assigned Position:</h2>
      </div>
      <Accordion.Root
        type="single"
        value={data.lotteryResult.id}
        class="w-full px-4"
      >
        <Accordion.Item
          value={data.lotteryResult.id}
          class="my-2 border rounded-md shadow-sm overflow-hidden"
        >
          <Accordion.Trigger
            class="text-left bg-slate-100 hover:bg-slate-200 rounded-t-sm px-4 py-6 min-w-0"
          >
            <div class="flex flex-col gap-1 pr-8 min-w-0">
              <span class="font-bold text-slate-900 break-words overflow-hidden"
                >{data.lotteryResult.host?.company?.companyName}</span
              >
              <div class="flex items-start justify-between gap-2 min-w-0">
                <span class="text-slate-700 text-sm break-words overflow-hidden"
                  >{data.lotteryResult.title}</span
                >
                <span
                  class="text-sm text-slate-500 italic shrink-0 whitespace-nowrap"
                  >({data.lotteryResult.slots} slots)</span
                >
              </div>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="px-5">
            <p class="mt-1">Career: {data.lotteryResult.career}</p>
            <br />
            <p class="mt-1">
              Description: {data.lotteryResult.host?.company
                ?.companyDescription}
            </p>
            <p class="mt-1">
              URL: {data.lotteryResult.host?.company?.companyUrl}
            </p>
            <p class=""># of slots for students: {data.lotteryResult.slots}</p>

            <hr class="my-2" />

            <p class=" font-bold">Arrival: {data.lotteryResult.arrival}</p>
            <p class="font-bold">Start: {data.lotteryResult.start}</p>
            <p class="font-bold">End: {data.lotteryResult.end}</p>

            <hr class="my-2" />

            <p class=" whitespace-pre-line">
              Address:
              {data.lotteryResult.address}

              Summary:
              {data.lotteryResult.summary}

              Instructions For Students:
              {data.lotteryResult.instructions}

              Contact Name:
              {data.lotteryResult.contact_name}

              Contact Email:
              {data.lotteryResult.contact_email}

              Attire:
              {data.lotteryResult.attire}
            </p>

            {#if data.lotteryResult.attachments && data.lotteryResult.attachments.length > 0}
              <hr class="my-2" />
              <div class="mt-2">
                <p class="font-semibold mb-2">Attachments:</p>
                <ul class="list-disc list-inside space-y-1">
                  {#each data.lotteryResult.attachments as attachment}
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
      </Accordion.Root>
    {:else if positions.posList.length != 0}
      <h2 class="text-2xl font-bold pb-4 w-full px-4">
        My Favorite Jobs (ranked)
      </h2>
      <div class="px-4 mb-4">
        <Button href="/dashboard/student/pick" class="w-full sm:w-auto">
          View All Companies
        </Button>
      </div>
      <Accordion.Root type="multiple" class="w-full px-4">
        {#each positions.posList as position, i}
          <Accordion.Item
            value={position.id}
            class="my-3 border rounded-md shadow-sm overflow-hidden"
          >
            <div class="flex items-stretch">
              {#if data.studentSignupsEnabled && !data.isScrambleMode}
                <div
                  class="flex flex-col justify-center bg-slate-50 border-r w-12 shrink-0"
                >
                  {#if i != 0}
                    <button
                      type="button"
                      class="flex items-center justify-center h-1/3 hover:bg-blue-100 text-blue-600 transition-colors"
                      onclick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        moveDown(position.id);
                      }}
                      aria-label="Move position up"
                    >
                      <ArrowBigUp size={24} />
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="flex items-center justify-center h-1/3 hover:bg-red-100 text-red-600 transition-colors"
                    onclick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deletePosition(position.id);
                    }}
                    aria-label="Delete position"
                  >
                    <Trash2Icon size={20} />
                  </button>
                  {#if i != positions.posList.length - 1}
                    <button
                      type="button"
                      class="flex items-center justify-center h-1/3 hover:bg-blue-100 text-blue-600 transition-colors"
                      onclick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        moveUp(position.id);
                      }}
                      aria-label="Move position down"
                    >
                      <ArrowBigDown size={24} />
                    </button>
                  {/if}
                </div>
              {/if}
              <Accordion.Trigger
                class="flex-1 text-left bg-white hover:bg-slate-50 px-4 py-4 min-h-[80px] min-w-0"
              >
                <div class="flex flex-col gap-1 pr-4 min-w-0">
                  <div class="flex items-start gap-2 min-w-0">
                    {#if !data.isScrambleMode}
                      <span
                        class="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                        >#{i + 1}</span
                      >
                    {/if}
                    <span
                      class="font-bold text-slate-900 leading-tight break-words overflow-hidden"
                      >{position.host?.company?.companyName}</span
                    >
                    {#if data.isScrambleMode}
                      {#if (position.availableSlots ?? 0) > 0}
                        <span
                          class="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                          >Available</span
                        >
                      {:else}
                        <span
                          class="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                          >Full</span
                        >
                      {/if}
                    {/if}
                  </div>
                  <div
                    class="flex items-start justify-between gap-2 min-w-0"
                    class:ml-8={!data.isScrambleMode}
                  >
                    <span
                      class="text-slate-600 text-sm leading-tight break-words overflow-hidden"
                      >{position.title}</span
                    >
                    <span
                      class="text-sm text-slate-500 italic shrink-0 whitespace-nowrap"
                      >({position.slots} slots)</span
                    >
                  </div>
                </div>
              </Accordion.Trigger>
            </div>
            <Accordion.Content class="px-5 pb-4 bg-white border-t">
              {#if data.isScrambleMode && !data.lotteryResult}
                <div class="py-4 border-b mb-4">
                  {#if (position.availableSlots ?? 0) > 0}
                    <Button
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      onclick={() => handleClaim(position.id)}
                    >
                      Claim this Position
                    </Button>
                  {:else}
                    <div
                      class="w-full bg-slate-100 text-slate-500 font-bold py-2 px-4 rounded text-center"
                    >
                      Position Full
                    </div>
                  {/if}
                </div>
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

              {#if position.attachments && position.attachments.length > 0}
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
    {:else}
      <div class="text-center mt-4 md:mt-0 px-4">
        <h1 class="text-2xl pb-4">My Favorite Jobs (ranked)</h1>
        <p class="text-gray-600 mb-4">No favorite jobs selected yet.</p>
        {#if data.studentSignupsEnabled}
          <Button href="/dashboard/student/pick">View Companies</Button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="flex flex-col w-full md:border-l-2 md:border-l-slate-950">
    {#if !data.permissionSlipCompleted}
      <div class="px-4 py-6 w-full">
        <div
          class="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm"
        >
          <h3 class="text-lg font-bold text-amber-900 mb-2">
            Permission Slip Required
          </h3>
          <p class="text-sm text-amber-800 mb-4 leading-relaxed">
            To select favorite jobs, your parent permission slip must be
            completed. Need to resend it? Enter your parent's email below:
          </p>

          <form
            class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
            method="post"
            action="?/sendPermissionSlip"
            use:enhance
          >
            <div class="flex-1 space-y-1.5">
              <Label for="parent-email" class="text-amber-900 font-semibold"
                >PARENT Email</Label
              >
              <Input
                id="parent-email"
                type="email"
                name="parent-email"
                bind:value={parentEmail}
                placeholder="parent@example.com"
                class="bg-white border-amber-300 focus:ring-amber-500"
              />
            </div>
            <Button
              type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-8"
            >
              Send
            </Button>
          </form>

          {#if form && form.sent}
            <div
              class="mt-3 flex items-center gap-2 text-emerald-600 font-bold"
            >
              <span class="text-lg">✓</span> Sent successfully!
            </div>
          {:else if form?.err}
            <div
              class="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm font-semibold"
            >
              {#if form?.reason === "school-domain"}
                Parent email cannot use school email domain ({form.schoolDomain ??
                  "@lgsstudent.org"}).
              {:else}
                Internal error. Please try again.
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    {#if data.importantDates && data.importantDates.length > 0}
      <h2 class="text-2xl px-4 py-6 text-center w-full font-bold">
        Important Dates
      </h2>
      <div class="space-y-4 px-4 pb-8">
        {#each data.importantDates as dateInfo}
          <div
            class="bg-white p-5 rounded-lg shadow-sm border border-slate-200"
          >
            <div class="flex items-center gap-2 mb-3">
              <span
                class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded"
              >
                {formatDate(dateInfo.date)}
                {#if dateInfo.time}
                  - {dateInfo.time}
                {/if}
              </span>
              {#if !dateInfo.time}
                <span
                  class="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold px-2 py-1 rounded"
                  >All Day</span
                >
              {/if}
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-2 leading-tight">
              {dateInfo.title}
            </h3>
            <div class="text-sm text-slate-600 prose prose-sm max-w-none">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html dateInfo.description}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
