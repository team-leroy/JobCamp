<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "$lib/components/ui/dialog";
  import { Edit, Save, X, Trash2, AlertTriangle } from "lucide-svelte";
  import { untrack } from "svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";

  interface Student {
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
    phone: string;
    email: string;
    emailVerified: boolean;
    parentEmail: string;
    permissionSlipStatus: string;
    permissionSlipDate: Date | null;
    lastLogin: Date | null;
    studentPicks: Array<{
      rank: number;
      positionId: string;
      title: string;
      companyName: string;
    }>;
    lotteryAssignment: {
      positionId: string;
      title: string;
      companyName: string;
      assignedAt: Date;
    } | null;
    lotteryStatus: string;
    isInternalTester: boolean;
  }

  let { student }: { student: Student } = $props();

  let isOpen = $state(false);
  let showDeleteConfirm = $state(false);

  let formData = $state(
    untrack(() => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: String(student.grade),
      phone: student.phone,
      email: student.email,
      parentEmail: student.parentEmail,
      isInternalTester: student.isInternalTester,
    }))
  );

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  function resetForm() {
    formData = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: String(student.grade),
      phone: student.phone,
      email: student.email,
      parentEmail: student.parentEmail,
      isInternalTester: student.isInternalTester,
    };
    message = null;
    error = null;
  }

  function handleSuccess(msg: string) {
    message = msg;
    setTimeout(async () => {
      isOpen = false;
      message = null;
      await invalidateAll();
    }, 1000);
  }

  function handleError(msg: string) {
    error = msg;
  }

  function formatDate(date: Date | null): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    isOpen = open;
    if (!open) {
      resetForm();
    }
  }}
>
  <Button variant="outline" size="sm" onclick={() => (isOpen = true)}>
    <Edit class="h-4 w-4 mr-2" />
    Edit
  </Button>

  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle
        >Edit Student: {student.firstName} {student.lastName}</DialogTitle
      >
    </DialogHeader>

    <form
      method="POST"
      action="?/updateStudent"
      use:enhance={({ formData: fData }) => {
        message = null;
        error = null;
        console.log('--- ENHANCE START ---');
        console.log('Form entries:', Array.from(fData.entries()));
        
        return async ({ result, update }) => {
          console.log('--- ENHANCE RESULT ---', result.type);
          if (result.type === 'success') {
            handleSuccess("Student updated successfully!");
          } else if (result.type === 'error' || result.type === 'failure') {
            handleError("Failed to update student. Please try again.");
          }
          await update({ reset: false });
        };
      }}
    >
      <input type="hidden" name="studentId" value={student.id} />
      <!-- Ensure value is actually a string 'true' or 'false' -->
      <input type="hidden" name="isInternalTester" value={formData.isInternalTester ? 'true' : 'false'} />

      <div class="space-y-6">
        <!-- Personal Information -->
        <div>
          <h3 class="text-lg font-semibold mb-4">Personal Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label for="edit-firstName-{student.id}">First Name</Label>
              <Input
                id="edit-firstName-{student.id}"
                name="firstName"
                bind:value={formData.firstName}
                required
                autocomplete="given-name"
              />
            </div>

            <div>
              <Label for="edit-lastName-{student.id}">Last Name</Label>
              <Input
                id="edit-lastName-{student.id}"
                name="lastName"
                bind:value={formData.lastName}
                required
                autocomplete="family-name"
              />
            </div>

            <div>
              <Label for="edit-grade-{student.id}">Grade</Label>
              <div id="edit-grade-{student.id}">
                <FilterSelect
                  label=""
                  bind:value={formData.grade}
                  placeholder="Select grade"
                  options={[
                    { value: "9", label: "Grade 9" },
                    { value: "10", label: "Grade 10" },
                    { value: "11", label: "Grade 11" },
                    { value: "12", label: "Grade 12" },
                  ]}
                />
              </div>
              <input type="hidden" name="grade" value={formData.grade} />
            </div>

            <div>
              <Label for="edit-phone-{student.id}">STUDENT Phone</Label>
              <Input
                id="edit-phone-{student.id}"
                name="phone"
                bind:value={formData.phone}
                type="tel"
                placeholder="(555) 123-4567"
                autocomplete="tel"
              />
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div>
          <h3 class="text-lg font-semibold mb-4">Contact Information</h3>
          <div class="space-y-4">
            <div>
              <Label for="edit-email-{student.id}">Student Email</Label>
              <Input
                id="edit-email-{student.id}"
                name="email"
                bind:value={formData.email}
                type="email"
                required
                autocomplete="email"
              />
            </div>

            <div>
              <Label for="edit-parentEmail-{student.id}">PARENT Email</Label>
              <Input
                id="edit-parentEmail-{student.id}"
                name="parentEmail"
                bind:value={formData.parentEmail}
                type="email"
                autocomplete="email"
              />
            </div>

          <div class="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="edit-isInternalTester-{student.id}"
              bind:checked={formData.isInternalTester}
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label for="edit-isInternalTester-{student.id}" class="text-sm font-medium text-gray-700">
              Internal Tester Account (Hidden from admin dashboards)
            </Label>
          </div>
          </div>
        </div>

        <!-- Status Information (Read-only) -->
        <div>
          <h3 class="text-lg font-semibold mb-4">Status Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Permission Slip Status</Label>
              <div class="p-3 bg-gray-50 rounded border">
                <span class="font-medium">{student.permissionSlipStatus}</span>
                {#if student.permissionSlipDate}
                  <p class="text-sm text-gray-600">
                    Completed: {formatDate(student.permissionSlipDate)}
                  </p>
                {/if}
              </div>
            </div>

            <div>
              <Label>Lottery Status</Label>
              <div class="p-3 bg-gray-50 rounded border">
                <span class="font-medium">{student.lotteryStatus}</span>
                {#if student.lotteryAssignment}
                  <p class="text-sm text-gray-600">
                    Assigned: {formatDate(student.lotteryAssignment.assignedAt)}
                  </p>
                {/if}
              </div>
            </div>

            <div>
              <Label>Last Login</Label>
              <div class="p-3 bg-gray-50 rounded border">
                <span class="text-sm">{formatDate(student.lastLogin)}</span>
              </div>
            </div>

            <div>
              <Label>Student Picks</Label>
              <div class="p-3 bg-gray-50 rounded border">
                <span class="text-sm">
                  {student.studentPicks.length} position{student.studentPicks
                    .length !== 1
                    ? "s"
                    : ""} selected
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Preferences (Read-only) -->
        {#if student.studentPicks.length > 0}
          <div>
            <h3 class="text-lg font-semibold mb-4">Student Preferences</h3>
            <div class="space-y-2">
              {#each student.studentPicks as pick}
                <div
                  class="flex items-center space-x-3 p-3 bg-gray-50 rounded border"
                >
                  <span class="font-medium text-sm w-8">#{pick.rank}</span>
                  <div class="flex-1">
                    <span class="font-medium">{pick.companyName}</span>
                    <span class="text-gray-600"> - {pick.title}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Lottery Assignment (Read-only) -->
        {#if student.lotteryAssignment}
          <div>
            <h3 class="text-lg font-semibold mb-4">Lottery Assignment</h3>
            <div class="p-4 bg-green-50 rounded border border-green-200">
              <div class="flex items-center space-x-2 mb-2">
                <span class="font-medium text-green-800">
                  {student.lotteryAssignment.companyName}
                </span>
                <span class="text-green-600">-</span>
                <span class="text-green-700"
                  >{student.lotteryAssignment.title}</span
                >
              </div>
              <p class="text-sm text-green-600">
                Assigned: {formatDate(student.lotteryAssignment.assignedAt)}
              </p>
            </div>
          </div>
        {/if}

        <!-- Submit Message -->
        {#if message}
          <div
            class="p-3 rounded {message.includes('successfully')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'}"
          >
            {message}
          </div>
        {/if}
        {#if error}
          <div class="p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex justify-between items-center pt-4 border-t">
          <div>
            {#if !student.emailVerified}
              <Button
                type="button"
                variant="destructive"
                onclick={() => (showDeleteConfirm = true)}
              >
                <Trash2 class="h-4 w-4 mr-2" />
                Delete Unverified Account
              </Button>
            {/if}
          </div>

          <div class="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onclick={() => {
                isOpen = false;
                resetForm();
              }}
            >
              <X class="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button type="submit">
              <Save class="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </form>
  </DialogContent>
</Dialog>

<Dialog bind:open={showDeleteConfirm}>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2 text-red-600">
        <AlertTriangle class="h-5 w-5" />
        Confirm Deletion
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete the account for <strong>{student.firstName} {student.lastName}</strong>? 
        This will permanently remove their user record and associated student profile.
        <br /><br />
        <span class="text-red-600 font-bold">This action cannot be undone.</span>
      </DialogDescription>
    </DialogHeader>
    <div class="flex justify-end gap-2 pt-4">
      <Button variant="outline" onclick={() => (showDeleteConfirm = false)}>
        Cancel
      </Button>
      <form
        method="POST"
        action="?/deleteUserAccount"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === "success") {
              showDeleteConfirm = false;
              handleSuccess("Account deleted successfully");
            } else {
              handleError("Failed to delete account");
            }
          };
        }}
      >
        <input type="hidden" name="studentId" value={student.id} />
        <Button type="submit" variant="destructive">
          Delete Account
        </Button>
      </form>
    </div>
  </DialogContent>
</Dialog>
