<script lang="ts">
  import FAQ from "./faq.json";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  const questions = FAQ.Q;
  const answers = FAQ.A;

  const { data } = $props();
  const isHost = $derived(data.isHost);
  const loggedIn = $derived(data.loggedIn);
  const isAdmin = $derived(data.isAdmin);
</script>

<Navbar
  {isHost}
  {loggedIn}
  {isAdmin}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<div class="flex flex-col justify-center mt-28 mb-10 w-full">
  <h1 class="flex justify-center text-4xl mb-3">FAQs</h1>
  <Accordion.Root type="multiple" class="w-full px-10">
    {#each questions as question, index}
      <Accordion.Item value={question}>
        <Accordion.Trigger class="text-xl text-left">
          <span>{question}</span>
        </Accordion.Trigger>
        <Accordion.Content>
          <p class=" mt-1">{answers[index]}</p>
        </Accordion.Content>
      </Accordion.Item>
    {/each}
  </Accordion.Root>
</div>
