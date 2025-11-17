<script lang="ts">
  import Company from "./Company.svelte";
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  let { data } = $props();
</script>

{#if data.accessDenied}
  <Navbar isHost={false} loggedIn={true} isAdmin={false} />

  <div class="w-full mt-28 flex flex-col items-center">
    <div class="max-w-2xl w-full px-4">
      <div class="p-6 bg-red-50 border-l-4 border-red-400 rounded-lg">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-lg font-medium text-red-800">Access Restricted</h3>
            <p class="mt-2 text-sm text-red-700">
              {data.message}
            </p>
            <div class="mt-4 text-sm text-red-600">
              <p><strong>Current Status:</strong></p>
              <ul class="mt-1 list-disc list-inside">
                <li>Event: Active</li>
                <li>
                  Student Accounts: {data.studentAccountsEnabled
                    ? "Enabled"
                    : "Disabled"}
                </li>
                <li>
                  Company Accounts: {data.companyAccountsEnabled
                    ? "Enabled"
                    : "Disabled"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 text-center">
        <a href="/logout" class="text-blue-600 hover:text-blue-800 underline">
          Log Out
        </a>
      </div>
    </div>
  </div>
{:else}
  <Company {data} />
{/if}
