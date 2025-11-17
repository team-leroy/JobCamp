<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import LotteryWidget from "$lib/components/admin/LotteryWidget.svelte";
  import LotteryConfigurationWidget from "$lib/components/admin/LotteryConfigurationWidget.svelte";

  export let data;
  const {
    isAdmin,
    loggedIn,
    isHost,
    userRole,
    lotteryData,
    lotteryConfig,
    students,
    positions,
    companies,
  } = data;
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
