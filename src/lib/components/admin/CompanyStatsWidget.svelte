<script lang="ts">
  export let stats: {
    totalCompanies: number;
    companiesLoggedInThisYear: number;
    positionsThisYear: number;
    slotsThisYear: number;
  };
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-xl font-bold mb-4">Company Statistics</h2>

  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">{stats.totalCompanies}</div>
      <div class="text-sm text-gray-600">Total Companies</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-green-600">
        {stats.companiesLoggedInThisYear}
      </div>
      <div class="text-sm text-gray-600">Logged In This Event</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-orange-600">
        {stats.positionsThisYear}
      </div>
      <div class="text-sm text-gray-600">Positions This Event</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-purple-600">
        {stats.slotsThisYear}
      </div>
      <div class="text-sm text-gray-600">Slots This Event</div>
    </div>
  </div>
</div>
