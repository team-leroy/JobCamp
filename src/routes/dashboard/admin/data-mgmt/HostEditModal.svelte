<script lang="ts">
  import { enhance } from "$app/forms";
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

  interface Host {
    id: string;
    name: string;
    email: string;
    lastLogin: Date | null;
    companyName: string;
  }

  let { host }: { host: Host } = $props();

  let isOpen = $state(false);

  let formData = $state(
    untrack(() => ({
      id: host.id,
      name: host.name,
      email: host.email,
    }))
  );

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  function resetForm() {
    formData = {
      id: host.id,
      name: host.name,
      email: host.email,
    };
    message = null;
    error = null;
  }

  function handleSuccess() {
    message = "Host updated successfully";
    error = null;
    setTimeout(() => {
      isOpen = false;
      resetForm();
      window.location.reload();
    }, 1000);
  }

  function handleError() {
    error = "Failed to update host";
    message = null;
  }

  function handleSubmit() {
    message = null;
    error = null;
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
      <DialogTitle>Edit Host: {host.name}</DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action="?/updateHost"
      use:enhance={() => {
        handleSubmit();
        return async ({ update }) => {
          try {
            await update();
            handleSuccess();
          } catch {
            handleError();
          }
        };
      }}
      onsubmit={resetForm}
    >
      <input type="hidden" name="hostId" value={host.id} />

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

      <!-- Host Information -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Host Information</h3>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <Label for="name">Host Name *</Label>
            <Input id="name" name="name" bind:value={formData.name} required />
          </div>

          <div>
            <Label for="email">Email *</Label>
            <Input
              id="email"
              name="email"
              bind:value={formData.email}
              type="email"
              required
            />
          </div>
        </div>
      </div>

      <!-- Read-only Information -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Additional Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Company Name</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="font-medium">{host.companyName}</span>
            </div>
          </div>

          <div>
            <Label>Last Login</Label>
            <div class="p-3 bg-gray-50 rounded border">
              <span class="text-sm">{formatDate(host.lastLogin)}</span>
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
