<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  export let isOpen = false;
  export let eventName = '';
  export let students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
  }> = [];

  let graduateStudents = true; // Default to recommended option
  
  const dispatch = createEventDispatcher<{
    confirm: { graduateStudents: boolean };
    cancel: void;
  }>();

  function handleConfirm() {
    console.log("✅ Graduation dialog confirmed with graduateStudents:", graduateStudents);
    console.log("✅ Type of graduateStudents:", typeof graduateStudents);
    dispatch('confirm', { graduateStudents });
    isOpen = false;
  }

  function handleArchiveButtonClick() {
    console.log("🔴 Archive button clicked!");
    handleConfirm();
  }

  function handleCancel() {
    console.log("❌ Graduation dialog cancelled");
    dispatch('cancel');
    isOpen = false;
  }

  function handleCheckboxChange() {
    console.log("📋 Checkbox changed to:", graduateStudents);
  }

  // Debug: Watch for changes to graduateStudents
  $: console.log("🔄 graduateStudents reactive change:", graduateStudents);

  // Close on Escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }

  // Close on backdrop click (only if clicking directly on backdrop)
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Modal backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="graduation-dialog-title"
    tabindex="-1"
  >
    <!-- Modal content -->
    <div 
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      role="document"
    >
      <Card class="border-0 shadow-none">
        <CardHeader class="pb-4">
          <CardTitle id="graduation-dialog-title" class="text-xl font-semibold text-gray-900">
            Archive Event: "{eventName}"
          </CardTitle>
          <p class="text-sm text-gray-600 mt-2">
            Choose whether to graduate senior students when archiving this event.
          </p>
        </CardHeader>
        
        <CardContent class="space-y-6">
          <!-- Senior Students List -->
          {#if students.length > 0}
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 class="font-medium text-blue-900 mb-3 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Found {students.length} Grade 12 Student{students.length === 1 ? '' : 's'}
              </h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {#each students as student}
                  <div class="text-sm text-blue-800 bg-white rounded px-3 py-2 border border-blue-200">
                    {student.firstName} {student.lastName}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Graduation Option -->
          <div class="space-y-4">
            <div class="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <Checkbox 
                id="graduate-seniors" 
                bind:checked={graduateStudents}
                on:click={handleCheckboxChange}
                class="mt-1"
              />
              <div class="flex-1">
                <Label 
                  for="graduate-seniors" 
                  class="text-sm font-medium text-green-900 cursor-pointer"
                >
                  Graduate senior students (Recommended)
                </Label>
                <div class="mt-2 text-sm text-green-700 space-y-1">
                  <p>✅ Preserves their data for historical statistics</p>
                  <p>✅ Removes them from future event management</p>
                  <p>✅ They won't appear in new event creation</p>
                  <p>✅ Keeps student lists clean for next year</p>
                </div>
              </div>
            </div>

            {#if !graduateStudents}
              <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="flex items-start">
                  <svg class="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-yellow-800">
                      Seniors will remain in the system
                    </p>
                    <p class="text-sm text-yellow-700 mt-1">
                      They will appear in future event creation and student lists. You can graduate them manually later.
                    </p>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              on:click={handleCancel}
              class="px-6"
            >
              Cancel
            </Button>
            <Button 
              on:click={handleArchiveButtonClick}
              class="px-6 bg-red-600 hover:bg-red-700 text-white"
            >
              Archive Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal appears above everything */
  :global(.fixed.z-50) {
    z-index: 9999;
  }
</style>
