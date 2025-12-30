<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import LotteryWidget from "$lib/components/admin/LotteryWidget.svelte";
  import LotteryConfigurationWidget from "$lib/components/admin/LotteryConfigurationWidget.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const isAdmin = $derived(data.isAdmin);
  const loggedIn = $derived(data.loggedIn);
  const isHost = $derived(data.isHost);
  const userRole = $derived(data.userRole);
  const lotteryData = $derived(data.lotteryData);
  const lotteryConfig = $derived(data.lotteryConfig);
  const students = $derived(data.students);
  const positions = $derived(data.positions);
  const companies = $derived(data.companies);
</script>

<Navbar {isAdmin} {loggedIn} {isHost} {userRole} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Lottery Management</h1>

    <!-- Lottery Configuration -->
    <LotteryConfigurationWidget
      {lotteryConfig}
      {students}
      {positions}
      {companies}
    />

    <!-- Lottery Widget -->
    <LotteryWidget
      data={lotteryData}
      gradeOrder={lotteryConfig?.gradeOrder || "NONE"}
    />
  </div>
</div>
