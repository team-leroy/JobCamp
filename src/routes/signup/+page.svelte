<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const {
    studentAccountsEnabled,
    companyAccountsEnabled,
    companySignupsEnabled,
  } = data;

  const studentSignup = () => {
    goto("/signup/student");
  };

  const companySignup = () => {
    goto("/signup/company");
  };
</script>

<Navbar
  isHost={false}
  loggedIn={false}
  isAdmin={false}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
  eventName={data.eventName}
/>

<div
  class="w-full min-h-screen flex flex-col gap-8 justify-center items-center"
>
  <div
    class="flex flex-col justify-between items-center gap-16 py-10 px-10 border-2 rounded-lg shadow-2xl"
  >
    <h1 class="text-5xl">Sign Up</h1>
    <div class="flex flex-col justify-center items-center gap-2">
      <Button
        class="w-32 text-lg"
        onclick={studentSignup}
        disabled={!studentAccountsEnabled}
      >
        Student
      </Button>
      <Button
        class="w-32 text-lg"
        onclick={companySignup}
        disabled={!companyAccountsEnabled || !companySignupsEnabled}
      >
        Company
      </Button>
      {#if !companySignupsEnabled && companyAccountsEnabled}
        <span class="text-sm italic w-40 text-center text-gray-600">
          Company signups are currently disabled
        </span>
      {/if}
    </div>
    <a href="/login" class="text-lg">I already have an account</a>
  </div>
</div>
