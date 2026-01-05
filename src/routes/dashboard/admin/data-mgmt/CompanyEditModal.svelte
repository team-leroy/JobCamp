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
  } from "$lib/components/ui/dialog";
  import { Edit, Save, X } from "lucide-svelte";

  import { untrack } from "svelte";

  interface Company {
    id: string;
    companyName: string;
    companyDescription: string;
    companyUrl: string;
    activePositionCount: number;
    isInternalTester: boolean;
  }

  let { company }: { company: Company } = $props();

  let isOpen = $state(false);

  let formData = $state(
    untrack(() => ({
      id: company.id,
      companyName: company.companyName,
      companyDescription: company.companyDescription,
      companyUrl: company.companyUrl || "",
      isInternalTester: company.isInternalTester
    }))
  );

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  function resetForm() {
    formData = {
      id: company.id,
      companyName: company.companyName,
      companyDescription: company.companyDescription,
      companyUrl: company.companyUrl || "",
      isInternalTester: company.isInternalTester
    };
    message = null;
    error = null;
  }

  function handleSuccess() {
    message = "Company updated successfully";
    error = null;
    setTimeout(async () => {
      isOpen = false;
      await invalidateAll();
    }, 1000);
  }

  function handleError() {
    error = "Failed to update company";
    message = null;
  }

  function handleSubmit() {
    message = null;
    error = null;
  }
</script>

<Button variant="outline" size="sm" onclick={() => (isOpen = true)}>
  <Edit class="h-4 w-4 mr-2" />
  Edit
</Button>

<Dialog
  bind:open={isOpen}
  onOpenChange={(open) => {
    isOpen = open;
    if (!open) {
      resetForm();
    }
  }}
>
  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Company: {company.companyName}</DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action="?/updateCompany"
      use:enhance={() => {
        handleSubmit();
        return async ({ update }) => {
          try {
            await update({ reset: false });
            handleSuccess();
          } catch {
            handleError();
          }
        };
      }}
    >
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="isInternalTester" value={formData.isInternalTester ? 'true' : 'false'} />

      {#if message}
        <div
          class="p-3 rounded bg-green-50 text-green-700 border border-green-200"
        >
          {message}
        </div>
      {/if}
      {#if error}
        <div class="p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      {/if}

      <!-- Company Information -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Company Information</h3>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <Label for="companyName">Company Name *</Label>
            <Input
              id="companyName"
              name="companyName"
              bind:value={formData.companyName}
              required
            />
          </div>

          <div>
            <Label for="companyDescription">Company Description *</Label>
            <textarea
              id="companyDescription"
              name="companyDescription"
              bind:value={formData.companyDescription}
              required
              rows="5"
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <div>
            <Label for="companyUrl">Company URL</Label>
            <Input
              id="companyUrl"
              name="companyUrl"
              bind:value={formData.companyUrl}
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <div class="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isInternalTester"
              bind:checked={formData.isInternalTester}
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label for="isInternalTester" class="text-sm font-medium text-gray-700">
              Internal Tester Account (Hides all hosts/positions of this company)
            </Label>
          </div>
        </div>
      </div>

      <!-- Read-only Information -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Additional Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Active Positions in Current Event</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="font-medium">{company.activePositionCount}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t">
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
    </form>
  </DialogContent>
</Dialog>
