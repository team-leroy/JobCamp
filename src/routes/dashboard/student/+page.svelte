<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { ArrowBigDown, ArrowBigUp, Trash2Icon } from "lucide-svelte";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";
  import Button from "$lib/components/ui/button/button.svelte";

  let { data, form } = $props();

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

  let positions = $state({ posList: data.positions });

  const permissionSlipStatus = (() => {
    if (data.permissionSlipCompleted) {
      return {
        label: "Completed",
        tone: "text-emerald-600",
        helper: "You're cleared to participate.",
      };
    }

    return {
      label: "Needs Action",
      tone: "text-amber-600",
      helper:
        "Ask your parent to sign the permission slip so you can pick jobs.",
    };
  })();

  const lotterySummary = (() => {
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
  })();

  const nextStepSummary = (() => {
    if (!data.hasActiveEvent) {
      return {
        label: "Waiting for Event",
        helper:
          "We’ll let you know as soon as the next JobCamp event launches.",
      };
    }

    if (!data.permissionSlipCompleted) {
      return {
        label: "Complete Permission Slip",
        helper:
          "Get the permission slip signed so you can add your favorite jobs.",
      };
    }

    if (!data.studentSignupsEnabled) {
      return {
        label: "Signups Closed",
        helper: "You can review your picks, but changes are currently locked.",
      };
    }

    return {
      label: "Build Your Picks",
      helper: "Add or reorder your favorite jobs below.",
    };
  })();

  const deletePosition = async (posID: string) => {
    // Optimistically update UI
    positions.posList = positions.posList.filter((val) => val.id != posID);

    // Submit form natively to trigger data invalidation
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "?/deletePosition";

    const posIdInput = document.createElement("input");
    posIdInput.type = "hidden";
    posIdInput.name = "id";
    posIdInput.value = posID;
    form.appendChild(posIdInput);

    document.body.appendChild(form);
    form.submit();
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

    // Submit form natively to trigger data invalidation
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "?/move";

    const posIdInput = document.createElement("input");
    posIdInput.type = "hidden";
    posIdInput.name = "id";
    posIdInput.value = posID;
    form.appendChild(posIdInput);

    const dirInput = document.createElement("input");
    dirInput.type = "hidden";
    dirInput.name = "dir";
    dirInput.value = "down";
    form.appendChild(dirInput);

    document.body.appendChild(form);
    form.submit();
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

    // Submit form natively to trigger data invalidation
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "?/move";

    const posIdInput = document.createElement("input");
    posIdInput.type = "hidden";
    posIdInput.name = "id";
    posIdInput.value = posID;
    form.appendChild(posIdInput);

    const dirInput = document.createElement("input");
    dirInput.type = "hidden";
    dirInput.name = "dir";
    dirInput.value = "up";
    form.appendChild(dirInput);

    document.body.appendChild(form);
    form.submit();
  };

  let leftWidth = $derived(
    data.lotteryResult
      ? " w-full"
      : positions.posList.length == 0
        ? " w-72"
        : " min-w-[32rem] w-full"
  );
</script>

<Navbar loggedIn={true} isHost={false} isAdmin={false} />

<section class="w-full border-b bg-slate-50/60 mb-6 mt-20 sm:mt-20">
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
          Favorite Jobs
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

<div class="flex flex-col md:flex-row w-full min-h-screen pt-4 sm:pt-20">
  <div
    class={"flex flex-col gap-2 justify-start items-center md:m-4" + leftWidth}
  >
    {#if data.lotteryResult}
      <h1 class="text-2xl text-center w-full mt-4 md:mt-0">
        PLEASE CHECK ALL DETAILS OF THE POSITION, INCLUDING FORMS TO COMPLETE,
        START TIME, LOCATION, REQUIRED ID (if needed) and INFO TO SEND TO
        admin@jobcamp.org
        <br />
        You've been assigned to the following position:
      </h1>
      <Accordion.Root
        type="single"
        value={data.lotteryResult.id}
        class="mt-2 max-w-screen md:w-full md:px-4 mx-4"
      >
        <Accordion.Item value={data.lotteryResult.id} class="my-2 relative">
          <Accordion.Trigger
            class="relative text-md md:text-lg text-left bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5 pl-9 min-h-[110px]"
          >
            <span class="pl-12 pr-32 text-wrap"
              >{data.lotteryResult.host?.company?.companyName} - {data
                .lotteryResult.title}</span
            >
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
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    {:else if positions.posList.length != 0}
      <!-- Show student's position selections -->
      <h1 class="text-2xl pb-4 w-full px-4">My Favorite Jobs</h1>
      <Button href="/dashboard/student/pick" class="mb-4 mx-4">
        Browse All Positions
      </Button>
      <Accordion.Root type="multiple" class="w-full px-4">
        {#each positions.posList as position, i}
          <Accordion.Item value={position.id} class="my-2 relative">
            {#if data.studentSignupsEnabled}
              {#if i != positions.posList.length - 1}
                <button
                  type="button"
                  class={"absolute left-5 hover:cursor-pointer z-10 p-1 [touch-action:manipulation]" +
                    (i == 0 ? " top-12" : " top-20")}
                  onclick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    moveUp(position.id);
                  }}
                  aria-label="Move position down"
                >
                  <ArrowBigDown size={32} />
                </button>
              {/if}
              {#if i != 0}
                <button
                  type="button"
                  class="absolute top-12 left-5 hover:cursor-pointer z-10 p-1 [touch-action:manipulation]"
                  onclick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    moveDown(position.id);
                  }}
                  aria-label="Move position up"
                >
                  <ArrowBigUp size={32} />
                </button>
              {/if}
              <button
                type="button"
                class="absolute left-[20px] top-3 hover:cursor-pointer z-10 p-1 [touch-action:manipulation]"
                onclick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deletePosition(position.id);
                }}
                aria-label="Delete position"
              >
                <Trash2Icon size={32} />
              </button>
            {/if}
            <Accordion.Trigger
              class={"text-xl text-left bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5" +
                (i == positions.posList.length - 1 || i == 0
                  ? " h-[90px]"
                  : " h-[120px]")}
            >
              <span class="pl-12 pr-2"
                >{position.host?.company?.companyName} - {position.title}</span
              >
            </Accordion.Trigger>
            <Accordion.Content class="px-5">
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
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    {:else}
      <div class="text-center mt-4 md:mt-0 px-4">
        <h1 class="text-2xl pb-4">My Favorite Jobs</h1>
        <p class="text-gray-600 mb-4">No favorite jobs selected yet.</p>
        {#if data.studentSignupsEnabled && data.permissionSlipCompleted}
          <Button href="/dashboard/student/pick">Browse Positions</Button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="flex flex-col w-full md:border-l-2 md:border-l-slate-950">
    {#if !data.permissionSlipCompleted}
      <!-- Mobile version -->
      <div
        class="flex sm:hidden flex-col px-4 py-4 border rounded-lg m-3 bg-yellow-100"
      >
        <span class="text-base sm:text-2xl mb-3"
          >To add Favorite Jobs, your parent permission slip must be completed.
          To resend the permission slip, enter your parent's email address:</span
        >
        <form
          class="flex flex-col gap-3"
          method="post"
          action="?/sendPermissionSlip"
          use:enhance
        >
          <Label
            >Parent Email<Input
              type="email"
              name="parent-email"
              bind:value={data.parentEmail}
              class="w-full"
            /></Label
          >
          <button
            type="submit"
            class="w-full px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white"
            >Send</button
          >
          {#if form && form.sent}
            <span class="text-green-500 text-lg font-bold">Sent</span>
          {:else if form?.err}
            {#if form?.reason === "school-domain"}
              <span class="text-red-500 text-sm font-semibold">
                Parent email cannot use school email domain (
                {form.schoolDomain ?? "@lgsstudent.org"}). Please provide a
                different email.
              </span>
            {:else}
              <span class="text-red-500 text-sm font-semibold">
                Internal error. Please try again.
              </span>
            {/if}
          {/if}
        </form>
      </div>

      <!-- Desktop version -->
      <div
        class="hidden sm:flex flex-col px-10 py-4 border rounded-lg m-3 bg-yellow-100"
      >
        <span class="text-2xl"
          >To add Favorite Jobs, your parent permission slip must be completed.
          To resend the permission slip, enter your parent's email address:</span
        >
        <form
          class="flex items-end gap-6 mt-3"
          method="post"
          action="?/sendPermissionSlip"
          use:enhance
        >
          <Label
            >Parent Email<Input
              type="email"
              name="parent-email"
              bind:value={data.parentEmail}
              class="max-w-72"
            /></Label
          >
          <button
            type="submit"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white"
            >Send</button
          >
          {#if form && form.sent}
            <span class="text-green-500 text-lg font-bold pb-1.5">Sent</span>
          {:else if form?.err}
            {#if form?.reason === "school-domain"}
              <span class="text-red-500 text-sm font-semibold pb-1.5">
                Parent email cannot use school email domain (
                {form.schoolDomain ?? "@lgsstudent.org"}). Please provide a
                different email.
              </span>
            {:else}
              <span class="text-red-500 text-sm font-semibold pb-1.5">
                Internal error. Please try again.
              </span>
            {/if}
          {/if}
        </form>
      </div>
    {/if}
    {#if data.importantDates && data.importantDates.length > 0}
      <h1 class="text-2xl px-4 py-4 text-center w-full">Important Dates</h1>
      {#each data.importantDates as dateInfo}
        <div class="m-2 mx-4 p-4 rounded-md shadow-xl border-2">
          <h1 class="text-xl mb-2">
            {formatDate(dateInfo.date)}
            {#if dateInfo.time}
              <span class="text-gray-600">at {dateInfo.time}</span>
            {:else}
              <span class="text-gray-600">- All Day</span>
            {/if}
          </h1>
          <h2 class="text-lg font-semibold mb-2">{dateInfo.title}</h2>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p class="whitespace-pre-wrap">{@html dateInfo.description}</p>
        </div>
      {/each}
    {/if}
  </div>
</div>
