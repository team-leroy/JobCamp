<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { dates } from "./important-dates.json";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";

  let { data, form } = $props();

  // const deletePosition = async (posID: string) => {
  //     positions.posList = positions.posList.filter((val) => val.id != posID);

  //     let posIds = positions.posList.map(val => val.id);
  //     console.log(posIds);

  //     const fdata = new FormData();
  //     fdata.append("posIds", JSON.stringify({ positions: posIds }));

  //     await fetch("?/update", {
  //         method: "post",
  //         body: fdata
  //     });
  // }

  // const moveUp = async (posID: string) => {
  //     let posRankIndex = 0;
  //     for (let i = 0; i < positions.posList.length; i++) {
  //         if (positions.posList[i].id == posID) {
  //             posRankIndex = i;
  //         }
  //     }

  //     var temp = positions.posList[posRankIndex + 1];
  //     positions.posList[posRankIndex + 1] = positions.posList[posRankIndex];
  //     positions.posList[posRankIndex] = temp;

  //     let posIds = positions.posList.map(val => val.id);

  //     const fdata = new FormData();
  //     fdata.append("posIds", JSON.stringify({ positions: posIds }));

  //     await fetch("?/update", {
  //         method: "post",
  //         body: fdata
  //     });
  // }

  // const moveDown = async (posID: string) => {
  //     let posRankIndex = 0;
  //     for (let i = 0; i < positions.posList.length; i++) {
  //         if (positions.posList[i].id == posID) {
  //             posRankIndex = i;
  //         }
  //     }

  //     var temp = positions.posList[posRankIndex - 1];
  //     positions.posList[posRankIndex - 1] = positions.posList[posRankIndex];
  //     positions.posList[posRankIndex] = temp;

  //     let posIds = positions.posList.map(val => val.id);

  //     const fdata = new FormData();
  //     fdata.append("posIds", JSON.stringify({ positions: posIds }));

  //     await fetch("?/update", {
  //         method: "post",
  //         body: fdata
  //     });
  // }

  let leftWidth = $derived(data.lotteryResult ? " w-full" : " w-72");
</script>

<Navbar loggedIn={true} isHost={false} isAdmin={false} />

<div class="flex flex-col md:flex-row w-full min-h-screen pt-20">
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
    {:else}
      <div class="text-center mt-4 md:mt-0 px-4">
        <h1 class="text-xl font-semibold text-gray-800 mb-4">
          Job Assignment Status
        </h1>
        {#if !data.eventEnabled}
          <div class="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <p class="text-yellow-700">
              <strong>Event is currently in draft mode.</strong><br />
              Job assignments are not yet available. Please contact your administrator
              for more information.
            </p>
          </div>
        {:else if !data.lotteryPublished}
          <div class="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
            <p class="text-blue-700">
              <strong>Job assignments have not been published yet.</strong><br
              />
              Please check back later or contact your administrator for updates.
            </p>
          </div>
        {:else}
          <div class="p-4 bg-gray-50 border-l-4 border-gray-400 rounded-lg">
            <p class="text-gray-700">
              No job assignment found. Please contact your administrator if you
              believe this is an error.
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <div class="flex flex-col w-full md:border-l-2 md:border-l-slate-950">
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
    <h1 class="text-2xl px-4 py-4 text-center w-full">Important Dates</h1>
    {#each dates as info}
      <div class="m-2 mx-4 p-4 rounded-md shadow-xl border-2">
        <h1 class="text-xl mb-2">{info.date} - {info.title}</h1>
        <p>{info.description}</p>
      </div>
    {/each}
  </div>
</div>
