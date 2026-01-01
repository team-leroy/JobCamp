<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { Edit, Trash } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { enhance } from "$app/forms";

  let { data } = $props();

  // Format date for display
  function formatDate(date: string | Date | null): string {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<div class="h-24"></div>

{#if data.companyName}
  <div class="mx-10 mb-4">
    <h2 class="text-xl font-semibold text-slate-700">
      Company: {data.companyName}
    </h2>
  </div>
{/if}

<h1 class="mx-10 my-2 text-2xl">
  Positions for {data.eventName}: {formatDate(data.eventDate)}
</h1>

{#if !data.companySignupsEnabled}
  <div
    class="mx-10 mb-5 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg"
  >
    <div class="flex">
      <div class="ml-3">
        <h3 class="text-lg font-medium text-yellow-800">
          Position Management Disabled
        </h3>
        <p class="mt-2 text-sm text-yellow-700">
          Position management is currently disabled. Come back soon to
          create/edit positions for {data.eventName}.
        </p>
      </div>
    </div>
  </div>
{:else}
  {#if data.hasUnpublishedPositions}
    <div
      class="mx-10 mb-5 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg"
    >
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-lg font-medium text-blue-800">
            You have positions from a previous event
          </h3>
          <p class="mt-2 text-sm text-blue-700">
            You can delete or edit and publish them.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <p class="mx-10">
    Create one or more positions for job shadow day. A position represents a
    career you'll be exposing students to.<br />E.g., Teacher, Software
    developer, Architect, or Real estate agent.<br />Choose "Multiple Careers"
    if you will be covering a variety of career positions during job shadow day.
  </p>

  <Button href="/dashboard/createPosition" class="ml-10 mt-5 text-lg"
    >Create New Position</Button
  >
{/if}

<Accordion.Root type="multiple" class="w-full px-10 my-5">
  {#each data.positions as position}
    <Accordion.Item value={position.id} class="my-2">
      <Accordion.Trigger
        class="text-xl bg-slate-100 hover:bg-slate-200 rounded-t-sm px-5"
      >
        <div class="flex justify-between items-center w-full">
          <span>{position.title}</span>
          <span
            class="text-sm font-medium {position.isPublished
              ? 'text-green-600'
              : 'text-orange-600'}"
          >
            {position.isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </Accordion.Trigger>
      <Accordion.Content class="px-5">
        {#if data.companySignupsEnabled}
          <div class="flex gap-5">
            <a
              href={"/dashboard/editPosition?posId=" + position.id}
              class="flex gap-1 items-center align-middle text-lg mt-2"
              ><Edit class="z-50" size={24} />
              {position.isPublished ? "Edit" : "Edit & Publish"}</a
            >
            <AlertDialog.Root>
              <AlertDialog.Trigger
                class="flex gap-1 items-center align-middle text-lg mt-2"
                ><Trash class="z-50" size={24} /> Delete</AlertDialog.Trigger
              >
              <AlertDialog.Content>
                <AlertDialog.Header>
                  <AlertDialog.Title>Delete this position?</AlertDialog.Title>
                  <AlertDialog.Description>
                    This cannot be undone.
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                  <AlertDialog.Action
                    ><form
                      use:enhance
                      method="POST"
                      action={"?/deletePosition&posId=" + position.id}
                    >
                      <button type="submit">Delete</button>
                    </form></AlertDialog.Action
                  >
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </div>
        {:else}
          <div class="text-sm text-gray-500 italic mb-2">
            Position management is currently disabled
          </div>
        {/if}

        <hr class="my-2" />

        <p class=" mt-1">Career: {position.career}</p>
        <br />
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

        <p class="">
          <br />Primary Contact Name:<br />
          {position.contact_name}
        </p>
        <p class=""><br />Primary Email:<br /> {position.contact_email}</p>

        <hr class="my-2" />

        <p class="">Arrival: {position.arrival}</p>
        <p class="">Start: {position.start}</p>
        <p class="">End: {position.end}</p>

        <hr class="my-2" />

        <!--href={position.attachment1.url} href={position.attachment2.url}-->
        <!-- {#if position.attachment1}<a>Attachment 1: { position.attachment1.name }</a>{/if}
        {#if position.attachment2}<a>Attachment 2: { position.attachment2.name }</a>{/if} -->
      </Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>
