<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";
  import Label from "$lib/components/ui/label/label.svelte";

  let { data, form } = $props();

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
      company?: {
        companyName: string;
        companyDescription?: string;
        companyUrl?: string;
      };
    };
    selected?: boolean;
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

  let count = $state(data.countSelected);

  const togglePosition = async (posID: string) => {
    const fdata = new FormData();
    fdata.append("id", posID);

    await fetch("?/togglePosition", {
      method: "post",
      body: fdata,
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
</script>

<Navbar isHost={false} loggedIn={true} isAdmin={false} />

<div class="flex sm:flex-row flex-col w-full h-screen pt-20">
  <div
    class="flex flex-col px-4 gap-2 h-full justify-start items-start p-4 border-r-2 border-r-slate-950"
  >
    {#if !data.permissionSlipCompleted}
      <div
        class="sm:hidden flex flex-col px-10 py-4 border rounded-lg m-3 bg-yellow-100"
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
          {/if}
          {#if form && form.err}
            <span class="text-green-500 text-lg font-bold pb-1.5"
              >Internal Error</span
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
                  <span
                    >{position.host?.company?.companyName} - {position.title}</span
                  >
                </Accordion.Trigger>
                <Accordion.Content class="px-5">
                  {#if data.permissionSlipCompleted}
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
        </div>
      {/if}
    {/each}
  </div>
  <div class="hidden sm:flex flex-col w-full h-full">
    {#if !data.permissionSlipCompleted}
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
          {/if}
          {#if form && form.err}
            <span class="text-green-500 text-lg font-bold pb-1.5"
              >Internal Error</span
            >
          {/if}
        </form>
      </div>
    {/if}

    {#if selectedTerm == ""}
      <h1 class="text-xl text-center mt-5">
        Please select a career or company to view positions.
      </h1>
    {/if}
    <div class="mx-4 mt-2">
      <Accordion.Root type="multiple">
        {#each filteredPositions as position}
          <Accordion.Item value={position.id} class="my-2">
            <Accordion.Trigger
              class="text-xl bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5"
            >
              <span
                >{position.host?.company?.companyName} - {position.title}</span
              >
            </Accordion.Trigger>
            <Accordion.Content class="px-5">
              {#if data.permissionSlipCompleted}
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
    </div>
  </div>
</div>
