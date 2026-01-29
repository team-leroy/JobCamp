<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Loader2, Download, UserMinus } from "lucide-svelte";
  import { enhance } from "$app/forms";

  interface StudentAssignment {
    id: string;
    firstName: string;
    lastName: string;
    grade: number | null;
    assignmentId: string;
    rank: number | null;
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

  interface UnassignedStudent {
    id: string;
    firstName: string;
    lastName: string;
    grade: number | null;
  }

  interface Props {
    assignments: PositionAssignment[];
    unassignedStudents: UnassignedStudent[];
  }

  const { assignments, unassignedStudents }: Props = $props();

  let releasingId = $state<string | null>(null);

  function downloadCsv() {
    window.location.href =
      "/dashboard/admin/data-mgmt/export?type=lottery-results";
  }
</script>

<Accordion.Root type="multiple" class="w-full mt-8 space-y-4">
  <!-- Unassigned Students Table -->
  <Accordion.Item value="unassigned" class="bg-white rounded-lg shadow border overflow-hidden">
    <Accordion.Trigger class="px-6 py-4 hover:bg-slate-50 transition-colors w-full">
      <div class="flex justify-between items-center w-full pr-6">
        <div class="flex flex-col items-start text-left">
          <h2 class="text-xl font-bold">Students not Assigned</h2>
          <p class="text-sm text-slate-500 mt-1">
            Students who made choices but did not receive a position in the lottery.
          </p>
        </div>
        <span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
          {unassignedStudents.length} Students
        </span>
      </div>
    </Accordion.Trigger>
    <Accordion.Content class="p-6 border-t">
      {#if unassignedStudents.length === 0}
        <div class="text-center py-12 border-2 border-dashed rounded-lg">
          <p class="text-slate-500">All students who made choices have been assigned.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th class="px-4 py-2 text-left">Student Name</th>
                <th class="px-4 py-2 text-center">Grade</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each unassignedStudents as student}
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium">
                    {student.lastName}, {student.firstName}
                  </td>
                  <td class="px-4 py-3 text-center">
                    {student.grade || "N/A"}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Accordion.Content>
  </Accordion.Item>

  <!-- Current Assignments Table -->
  <Accordion.Item value="assignments" class="bg-white rounded-lg shadow border overflow-hidden">
    <Accordion.Trigger class="px-6 py-4 hover:bg-slate-50 transition-colors w-full">
      <div class="flex justify-between items-center w-full pr-6">
        <div class="flex flex-col items-start text-left">
          <h2 class="text-xl font-bold">Current Assignments</h2>
          <p class="text-sm text-slate-500 mt-1">
            Review and manage student assignments from the latest lottery and manual claims.
          </p>
        </div>
        <div class="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onclick={(e) => {
              e.stopPropagation();
              downloadCsv();
            }}
            disabled={assignments.length === 0}
            class="flex gap-2 items-center"
          >
            <Download size={16} />
            Export CSV
          </Button>
          <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
            {assignments.reduce((acc, g) => acc + g.students.length, 0)} Assignments
          </span>
        </div>
      </div>
    </Accordion.Trigger>
    <Accordion.Content class="p-6 border-t">
      {#if assignments.length === 0}
        <div class="text-center py-12 border-2 border-dashed rounded-lg">
          <p class="text-slate-500">No assignments found for the current event.</p>
        </div>
      {:else}
        <Accordion.Root type="multiple" class="w-full space-y-3">
          {#each assignments as group}
            <Accordion.Item
              value={group.position.id}
              class="border rounded-md overflow-hidden"
            >
              <Accordion.Trigger
                class="px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors w-full"
              >
                <div class="flex justify-between items-center w-full pr-6">
                  <div class="flex flex-col items-start text-left">
                    <span class="font-bold text-slate-900"
                      >{group.position.companyName}</span
                    >
                    <span class="text-sm text-slate-600"
                      >{group.position.title}</span
                    >
                  </div>
                  <div class="flex items-center gap-3">
                    <span
                      class="text-xs font-medium px-2 py-1 rounded-full {group
                        .students.length >= group.position.slots
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'}"
                    >
                      {group.students.length} / {group.position.slots} slots filled
                    </span>
                  </div>
                </div>
              </Accordion.Trigger>
              <Accordion.Content class="p-0 border-t bg-white">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr
                        class="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider"
                      >
                        <th class="px-4 py-2 text-left">Student Name</th>
                        <th class="px-4 py-2 text-center">Grade</th>
                        <th class="px-4 py-2 text-center">Choice</th>
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
                            {student.grade || "N/A"}
                          </td>
                          <td class="px-4 py-3 text-center">
                            {#if student.rank}
                              <span
                                class="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold {student.rank ===
                                1
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'}"
                              >
                                #{student.rank}
                              </span>
                            {:else}
                              <span class="text-slate-400 italic text-xs"
                                >Manual</span
                              >
                            {/if}
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
                              <input
                                type="hidden"
                                name="assignmentId"
                                value={student.assignmentId}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                disabled={releasingId !== null}
                                class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 gap-1.5"
                              >
                                {#if releasingId === student.assignmentId}
                                  <Loader2 class="h-3 w-3 animate-spin" />
                                  Unassigning...
                                {:else}
                                  <UserMinus size={14} />
                                  Unassign
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
    </Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
