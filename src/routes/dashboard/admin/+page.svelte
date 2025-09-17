<script lang="ts">
    import Navbar from "$lib/components/navbar/Navbar.svelte";
    import StudentStatsWidget from "$lib/components/admin/StudentStatsWidget.svelte";
    import CompanyStatsWidget from "$lib/components/admin/CompanyStatsWidget.svelte";
    import EventControlsWidget from "$lib/components/admin/EventControlsWidget.svelte";
    
    export let data;
    const { isAdmin, loggedIn, isHost, upcomingEvent, studentStats, companyStats} = data;
</script>

<Navbar {isAdmin} {loggedIn} {isHost}/>

<div class="w-full mt-28 flex flex-col items-center">
    <div class="max-w-6xl w-full px-4">
        <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <!-- Upcoming Event Section -->
        <div class="mb-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500">
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Upcoming Event</h2>
            {#if upcomingEvent}
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-lg font-medium text-gray-900">{upcomingEvent.date ? new Date(upcomingEvent.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }) : 'Date TBD'}</p>
                        {#if upcomingEvent.displayLotteryResults}
                            <p class="text-sm text-green-600 mt-1">✓ Lottery results will be displayed</p>
                        {:else}
                            <p class="text-sm text-gray-500 mt-1">Lottery results hidden</p>
                        {/if}
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Event ID: {upcomingEvent.id}</p>
                    </div>
                </div>
            {:else}
                <p class="text-gray-600 italic">No upcoming events</p>
            {/if}
        </div>

        <!-- Event Controls Widget -->
        <div class="mb-8">
            <EventControlsWidget />
        </div>

        <!-- Archived Events Link -->
        <div class="mb-8 p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">Archived Events</h3>
                    <p class="text-sm text-gray-600">View statistics and data from previous events</p>
                </div>
                <a 
                    href="/dashboard/admin/archived" 
                    class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                    View Archived Events
                </a>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudentStatsWidget stats={studentStats} />
            <CompanyStatsWidget stats={companyStats} />
        </div>
    </div>
</div>
