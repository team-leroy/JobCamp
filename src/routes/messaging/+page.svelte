<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  export let data;
  const { isAdmin, loggedIn, isHost } = data;
</script>

<Navbar {isAdmin} {loggedIn} {isHost} userRole={data.userRole} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-4xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Admin Messaging</h1>

    <div class="bg-white rounded-lg shadow p-6">
      <p class="text-gray-600 mb-4">
        Messaging functionality for administrators.
      </p>
      <!-- Add your messaging UI here -->
      <div class="space-y-4">
        <div class="border rounded p-4">
          <h3 class="font-semibold">Send Announcement</h3>
          <p class="text-sm text-gray-500">
            Send messages to students, hosts, or all users
          </p>
        </div>

        <div class="border rounded p-4">
          <h3 class="font-semibold">Message History</h3>
          <p class="text-sm text-gray-500">View sent messages and responses</p>
        </div>
      </div>
    </div>
  </div>
</div>
