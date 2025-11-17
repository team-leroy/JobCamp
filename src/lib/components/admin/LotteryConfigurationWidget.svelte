<script lang="ts">
  import { enhance } from "$app/forms";

  interface Student {
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
  }

  interface Position {
    id: string;
    title: string;
    host: {
      company: {
        companyName: string;
        companyDescription?: string;
        companyUrl?: string | null;
      } | null;
    };
  }

  interface Company {
    id: string;
    companyName: string;
  }

  interface LotteryConfig {
    id?: string;
    schoolId?: string;
    gradeOrder?: string;
    manualAssignments?: Array<{
      studentId: string;
      positionId: string;
      student?: Student;
      position?: Position;
    }>;
    prefillSettings?: Array<{
      companyId: string;
      prefillPercentage: number;
      company?: Company;
    }>;
  }

  export let lotteryConfig: LotteryConfig | null;
  export let students: Student[];
  export let positions: Position[];
  export let companies: Company[];

  let selectedStudent = "";
  let selectedPosition = "";
  let selectedCompany = "";
  let prefillPercentage = 0;
  // Default to NONE (random) if no config exists or if gradeOrder is not set
  let gradeOrder = lotteryConfig?.gradeOrder || "NONE";

  // If the config exists but gradeOrder is ASCENDING or DESCENDING, and we want to default to NONE,
  // we need to handle this case. For now, let's just ensure NONE is the fallback
  if (!gradeOrder || gradeOrder === "ASCENDING") {
    gradeOrder = "NONE";
  }
  let message = "";
  let messageType = "";
  let isExpanded = false;

  function showMessage(msg: string, type: "success" | "error" = "success") {
    message = msg;
    messageType = type;
    setTimeout(() => {
      message = "";
    }, 3000);
  }

  function getStudentName(student: Student) {
    return `${student.lastName}, ${student.firstName} (Grade ${student.grade})`;
  }

  function getPositionName(position: Position) {
    return `${position.host.company?.companyName || "Unknown Company"} - ${position.title}`;
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

<div class="bg-white rounded-lg shadow mb-6">
  <!-- Header with toggle -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-semibold">Lottery Configuration</h3>
      <button
        on:click={toggleExpanded}
        class="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? "Hide Options" : "Show Options"}
        <svg
          class="w-4 h-4 ml-1 transform transition-transform {isExpanded
            ? 'rotate-180'
            : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>
    </div>

    <!-- Quick summary when collapsed -->
    {#if !isExpanded}
      <div class="mt-3 text-sm text-gray-600">
        <span class="inline-block mr-4">
          <span class="font-medium"
            >{lotteryConfig?.manualAssignments?.length || 0}</span
          > manual assignments
        </span>
        <span class="inline-block mr-4">
          <span class="font-medium"
            >{lotteryConfig?.prefillSettings?.length || 0}</span
          > prefill settings
        </span>
        <span class="inline-block">
          Grade order: <span class="font-medium">
            {gradeOrder === "NONE"
              ? "Random"
              : gradeOrder === "ASCENDING"
                ? "Ascending"
                : "Descending"}
          </span>
        </span>
      </div>
    {/if}
  </div>

  <!-- Expandable content -->
  {#if isExpanded}
    <div class="p-6 space-y-6">
      {#if message}
        <div
          class="p-3 rounded {messageType === 'success'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'}"
        >
          {message}
        </div>
      {/if}

      <!-- Manual Assignments -->
      <div>
        <h4 class="font-medium mb-2">Manual Assignments</h4>
        <p class="text-sm text-gray-600 mb-4">
          Manually assign students to specific positions. These assignments will
          be applied before the lottery runs.
        </p>

        <form
          method="POST"
          action="?/addManualAssignment"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === "success") {
                showMessage("Manual assignment added successfully");
                selectedStudent = "";
                selectedPosition = "";
                // Refresh the page to show updated assignments
                window.location.reload();
              } else {
                showMessage("Failed to add manual assignment", "error");
              }
            };
          }}
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label for="student-select" class="block text-sm font-medium mb-1"
                >Student</label
              >
              <select
                id="student-select"
                bind:value={selectedStudent}
                name="studentId"
                required
                class="w-full border rounded px-3 py-2"
              >
                <option value="">Select a student...</option>
                {#each students as student}
                  <option value={student.id}>{getStudentName(student)}</option>
                {/each}
              </select>
            </div>
            <div>
              <label
                for="position-select"
                class="block text-sm font-medium mb-1">Position</label
              >
              <select
                id="position-select"
                bind:value={selectedPosition}
                name="positionId"
                required
                class="w-full border rounded px-3 py-2"
              >
                <option value="">Select a position...</option>
                {#each positions as position}
                  <option value={position.id}
                    >{getPositionName(position)}</option
                  >
                {/each}
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="submit"
                class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Assignment
              </button>
            </div>
          </div>
        </form>

        <!-- Current Manual Assignments -->
        {#if lotteryConfig && lotteryConfig.manualAssignments && lotteryConfig.manualAssignments.length > 0}
          <div class="mt-4">
            <h5 class="font-medium mb-2">Current Manual Assignments</h5>
            <div class="space-y-2">
              {#each lotteryConfig.manualAssignments as assignment}
                {@const typedAssignment = assignment as {
                  studentId: string;
                  positionId: string;
                  student?: Student;
                  position?: Position;
                }}
                <div
                  class="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <span class="font-medium">
                      {students.find((s) => s.id === typedAssignment.studentId)
                        ? getStudentName(
                            students.find(
                              (s) => s.id === typedAssignment.studentId
                            )!
                          )
                        : "Unknown Student"}
                    </span>
                    <span class="text-gray-500"> → </span>
                    <span>
                      {positions.find(
                        (p) => p.id === typedAssignment.positionId
                      )
                        ? getPositionName(
                            positions.find(
                              (p) => p.id === typedAssignment.positionId
                            )!
                          )
                        : "Unknown Position"}
                    </span>
                  </div>
                  <form
                    method="POST"
                    action="?/removeManualAssignment"
                    use:enhance={() => {
                      return async ({ result }) => {
                        if (result.type === "success") {
                          showMessage("Manual assignment removed successfully");
                          // Refresh the page to show updated assignments
                          window.location.reload();
                        } else {
                          showMessage(
                            "Failed to remove manual assignment",
                            "error"
                          );
                        }
                      };
                    }}
                  >
                    <input
                      type="hidden"
                      name="studentId"
                      value={typedAssignment.studentId}
                    />
                    <button
                      type="submit"
                      class="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-sm text-gray-500 mt-2">
            No manual assignments configured.
          </p>
        {/if}
      </div>

      <!-- Prefill Settings -->
      <div>
        <h4 class="font-medium mb-2">Prefill Settings</h4>
        <p class="text-sm text-gray-600 mb-4">
          Automatically fill a percentage of slots for specific companies before
          running the lottery.
        </p>

        <form
          method="POST"
          action="?/updatePrefillSetting"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === "success") {
                showMessage("Prefill setting updated successfully");
                selectedCompany = "";
                prefillPercentage = 0;
                // Refresh the page to show updated settings
                window.location.reload();
              } else {
                showMessage("Failed to update prefill setting", "error");
              }
            };
          }}
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label for="company-select" class="block text-sm font-medium mb-1"
                >Company</label
              >
              <select
                id="company-select"
                bind:value={selectedCompany}
                name="companyId"
                required
                class="w-full border rounded px-3 py-2"
              >
                <option value="">Select a company...</option>
                {#each companies as company}
                  <option value={company.id}>{company.companyName}</option>
                {/each}
              </select>
            </div>
            <div>
              <label
                for="prefill-percentage"
                class="block text-sm font-medium mb-1"
                >Prefill Percentage (0-100%)</label
              >
              <input
                id="prefill-percentage"
                type="number"
                bind:value={prefillPercentage}
                name="prefillPercentage"
                min="0"
                max="100"
                required
                class="w-full border rounded px-3 py-2"
              />
            </div>
            <div class="flex items-end">
              <button
                type="submit"
                class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Prefill
              </button>
            </div>
          </div>
        </form>

        <!-- Current Prefill Settings -->
        {#if lotteryConfig && lotteryConfig.prefillSettings && lotteryConfig.prefillSettings.length > 0}
          <div class="mt-4">
            <h5 class="font-medium mb-2">Current Prefill Settings</h5>
            <div class="space-y-2">
              {#each lotteryConfig.prefillSettings as setting}
                {@const typedSetting = setting as {
                  companyId: string;
                  prefillPercentage: number;
                  company?: Company;
                }}
                <div
                  class="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <span class="font-medium">
                      {companies.find((c) => c.id === typedSetting.companyId)
                        ?.companyName || "Unknown Company"}
                    </span>
                    <span class="text-gray-500"> → </span>
                    <span>{typedSetting.prefillPercentage}% of slots</span>
                  </div>
                  <form
                    method="POST"
                    action="?/removePrefillSetting"
                    use:enhance={() => {
                      return async ({ result }) => {
                        if (result.type === "success") {
                          showMessage("Prefill setting removed successfully");
                          // Refresh the page to show updated settings
                          window.location.reload();
                        } else {
                          showMessage(
                            "Failed to remove prefill setting",
                            "error"
                          );
                        }
                      };
                    }}
                  >
                    <input
                      type="hidden"
                      name="companyId"
                      value={typedSetting.companyId}
                    />
                    <button
                      type="submit"
                      class="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-sm text-gray-500 mt-2">
            No prefill settings configured.
          </p>
        {/if}
      </div>

      <!-- Grade Order Configuration -->
      <div>
        <h4 class="font-medium mb-2">Grade Order</h4>
        <p class="text-sm text-gray-600 mb-4">
          Select the order in which students will be processed during the
          lottery.
        </p>
        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              type="radio"
              name="gradeOrder"
              value="NONE"
              bind:group={gradeOrder}
              class="mr-2"
              id="grade-none"
            />
            None (Random order)
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              name="gradeOrder"
              value="ASCENDING"
              bind:group={gradeOrder}
              class="mr-2"
              id="grade-ascending"
            />
            Ascending (9, 10, 11, 12)
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              name="gradeOrder"
              value="DESCENDING"
              bind:group={gradeOrder}
              class="mr-2"
              id="grade-descending"
            />
            Descending (12, 11, 10, 9)
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>
