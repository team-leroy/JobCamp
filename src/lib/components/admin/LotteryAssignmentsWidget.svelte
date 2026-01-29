<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Loader2, Download, UserX } from "lucide-svelte";
  import { enhance } from "$app/forms";

  interface StudentAssignment {
    id: string;
    firstName: string;
    lastName: string;
    grade: number | null;
    assignmentId: string;
  }

  interface PositionAssignment {
    position: {
      id: string;
      title: string;
      slots: number;
      companyName: string;
    };
    students: StudentAssignment[];
  }

  interface Props {
    assignments: PositionAssignment[];
  }

  const { assignments }: Props = $props();

  let releasingId = $state<string | null>(null);

  function downloadCsv() {
    window.location.href = "/dashboard/admin/data-mgmt/export?type=lottery-results";
  }
</script>

<div class="bg-white rounded-lg shadow p-6 mt-8">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-xl font-bold">Current Assignments</h2>
      <p class="text-sm text-slate-500 mt-1">
        Review and manage student assignments from the latest lottery and manual claims.
      </p>
    </div>
    <Button
      variant="outline"
      onclick={downloadCsv}
      disabled={assignments.length === 0}
      class="flex gap-2 items-center"
    >
      <Download size={18} />
      Export CSV
    </Button>
  </div>

  {#if assignments.length === 0}
    <div class="text-center py-12 border-2 border-dashed rounded-lg">
      <p class="text-slate-500">No assignments found for the current event.</p>
    </div>
  {:else}
    <Accordion.Root type="multiple" class="w-full">
      {#each assignments as group}
        <Accordion.Item value={group.position.id} class="border rounded-md mb-3 overflow-hidden">
          <Accordion.Trigger class="px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div class="flex justify-between items-center w-full pr-6">
              <div class="flex flex-col items-start text-left">
                <span class="font-bold text-slate-900">{group.position.companyName}</span>
                <span class="text-sm text-slate-600">{group.position.title}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-medium px-2 py-1 rounded-full {group.students.length >= group.position.slots ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                  {group.students.length} / {group.position.slots} slots filled
                </span>
              </div>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="p-0 border-t bg-white">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <th class="px-4 py-2 text-left">Student Name</th>
                    <th class="px-4 py-2 text-center">Grade</th>
                    <th class="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  {#each group.students as student}
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="px-4 py-3 font-medium">
                        {student.lastName}, {student.firstName}
                      </td>
                      <td class="px-4 py-3 text-center">
                        {student.grade || 'N/A'}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <form
                          method="POST"
                          action="?/releaseStudent"
                          use:enhance={() => {
                            releasingId = student.assignmentId;
                            return async ({ update }) => {
                              await update();
                              releasingId = null;
                            };
                          }}
                        >
                          <input type="hidden" name="assignmentId" value={student.assignmentId} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            disabled={releasingId !== null}
                            class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 gap-1.5"
                          >
                            {#if releasingId === student.assignmentId}
                              <Loader2 class="h-3 w-3 animate-spin" />
                              Releasing...
                            {:else}
                              <UserX size={14} />
                              Release
                            {/if}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  {/if}
</div>
