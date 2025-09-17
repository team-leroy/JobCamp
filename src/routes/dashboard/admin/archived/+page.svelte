<script lang="ts">
    import Navbar from "$lib/components/navbar/Navbar.svelte";
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    
    export let data;
    const { isAdmin, loggedIn, isHost, schools, archivedEvents, selectedEvent, selectedEventStats } = data;

    function formatDate(dateString: string | Date) {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function selectEvent(eventId: string) {
        goto(`/dashboard/admin/archived?eventId=${eventId}`);
    }

    function goToActiveEvent() {
        goto('/dashboard/admin');
    }
</script>

<Navbar {isAdmin} {loggedIn} {isHost} />

<div class="w-full mt-28 flex flex-col items-center">
    <div class="max-w-6xl w-full px-4">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">Archived Events</h1>
            <button 
                on:click={goToActiveEvent}
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
                View Active Event
            </button>
        </div>

        {#if archivedEvents.length === 0}
            <div class="text-center py-12">
                <div class="text-gray-500 text-lg mb-4">No archived events found</div>
                <p class="text-gray-400">Events will appear here once they are archived.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Archived Events List -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">Select an Archived Event</h2>
                    <div class="space-y-3">
                        {#each archivedEvents as event}
                            <button
                                on:click={() => selectEvent(event.id)}
                                class="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors
                                       {selectedEvent?.id === event.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
                            >
                                <div class="font-medium">{event.name || 'Unnamed Event'}</div>
                                <div class="text-sm text-gray-500">{formatDate(event.date)}</div>
                                <div class="text-xs text-gray-400 mt-1">
                                    {event.isActive ? 'Active' : 'Archived'} • 
                                    {event.displayLotteryResults ? 'Lottery Results Shown' : 'Lottery Results Hidden'}
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Selected Event Details -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    {#if selectedEvent && selectedEventStats}
                        <h2 class="text-xl font-semibold mb-4">{selectedEvent.name || 'Unnamed Event'}</h2>
                        <div class="text-sm text-gray-500 mb-6">{formatDate(selectedEvent.date)}</div>
                        
                        <!-- Event Statistics -->
                        <div class="space-y-6">
                            <!-- Student Statistics -->
                            <div>
                                <h3 class="text-lg font-medium mb-3">Student Statistics</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-blue-600">{selectedEventStats.totalStudents}</div>
                                        <div class="text-sm text-gray-600">Total Students</div>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-green-600">{selectedEventStats.permissionSlipsSigned}</div>
                                        <div class="text-sm text-gray-600">Permission Slips Signed</div>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-orange-600">{selectedEventStats.studentsWithoutChoices}</div>
                                        <div class="text-sm text-gray-600">No Choices Made</div>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-purple-600">{selectedEventStats.totalStudentChoices}</div>
                                        <div class="text-sm text-gray-600">Total Choices</div>
                                    </div>
                                </div>
                                
                                <!-- Grade Distribution -->
                                <div class="mt-4">
                                    <h4 class="font-medium mb-2">Grade Distribution</h4>
                                    <div class="grid grid-cols-4 gap-2">
                                        <div class="text-center">
                                            <div class="text-lg font-semibold">{selectedEventStats.gradeStats.freshman}</div>
                                            <div class="text-xs text-gray-600">Freshman</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-lg font-semibold">{selectedEventStats.gradeStats.sophomore}</div>
                                            <div class="text-xs text-gray-600">Sophomore</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-lg font-semibold">{selectedEventStats.gradeStats.junior}</div>
                                            <div class="text-xs text-gray-600">Junior</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-lg font-semibold">{selectedEventStats.gradeStats.senior}</div>
                                            <div class="text-xs text-gray-600">Senior</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Company Statistics -->
                            <div>
                                <h3 class="text-lg font-medium mb-3">Company Statistics</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-blue-600">{selectedEventStats.totalCompanies}</div>
                                        <div class="text-sm text-gray-600">Total Companies</div>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded">
                                        <div class="text-2xl font-bold text-green-600">{selectedEventStats.positionsCount}</div>
                                        <div class="text-sm text-gray-600">Positions</div>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded col-span-2">
                                        <div class="text-2xl font-bold text-purple-600">{selectedEventStats.slotsCount}</div>
                                        <div class="text-sm text-gray-600">Total Slots Available</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {:else if selectedEvent}
                        <div class="text-center py-8">
                            <div class="text-gray-500">Loading event statistics...</div>
                        </div>
                    {:else}
                        <div class="text-center py-8">
                            <div class="text-gray-500">Select an event to view its statistics</div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>
