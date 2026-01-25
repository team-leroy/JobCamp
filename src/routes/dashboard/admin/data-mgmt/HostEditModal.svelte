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
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Edit, Save, X, Trash2, AlertTriangle } from "lucide-svelte";
  import { untrack } from "svelte";

  interface Host {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    lastLogin: Date | string | null;
    isInternalTester: boolean;
  }

  let { host }: { host: Host } = $props();

  let isOpen = $state(false);
  let showDeleteConfirm = $state(false);

  let formData = $state(
    untrack(() => ({
      id: host.id,
      name: host.name,
      email: host.email,
      isInternalTester: host.isInternalTester,
    }))
  );

  let message: string | null = $state(null);
  let error: string | null = $state(null);

  function resetForm() {
    formData = {
      id: host.id,
      name: host.name,
      email: host.email,
      isInternalTester: host.isInternalTester,
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

  function formatDate(date: Date | string | null): string {
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
    Edit Host
  </Button>

  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Host: {host.name}</DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action="?/updateHost"
      use:enhance={() => {
        message = null;
        error = null;
        return async ({ result, update }) => {
          if (result.type === "success") {
            handleSuccess("Host updated successfully!");
          } else {
            handleError("Failed to update host.");
          }
          await update({ reset: false });
        };
      }}
    >
      <input type="hidden" name="hostId" value={host.id} />
      <input
        type="hidden"
        name="isInternalTester"
        value={formData.isInternalTester ? "true" : "false"}
      />

      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4">Host Information</h3>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <Label for="edit-host-name-{host.id}">Name</Label>
              <Input
                id="edit-host-name-{host.id}"
                name="name"
                bind:value={formData.name}
                required
              />
            </div>

            <div>
              <Label for="edit-host-email-{host.id}">Email</Label>
              <Input
                id="edit-host-email-{host.id}"
                name="email"
                bind:value={formData.email}
                type="email"
                required
              />
            </div>

            <div class="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="edit-host-tester-{host.id}"
                bind:checked={formData.isInternalTester}
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label
                for="edit-host-tester-{host.id}"
                class="text-sm font-medium text-gray-700"
              >
                Internal Tester Account (Hidden from admin dashboards)
              </Label>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4">Status Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Email Status</Label>
              <div class="p-3 bg-gray-50 rounded border">
                {#if host.emailVerified}
                  <span class="text-green-600 font-medium">Verified</span>
                {:else}
                  <span class="text-red-600 font-medium">Unverified</span>
                {/if}
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

        <div class="flex justify-between items-center pt-4 border-t">
          <div>
            {#if !host.emailVerified}
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
        Are you sure you want to delete the account for <strong>{host.name}</strong>? 
        This will permanently remove their user record and associated host profile.
        <br /><br />
        <span class="text-red-600 font-bold">This action cannot be undone.</span>
      </DialogDescription>
    </DialogHeader>
    <DialogFooter class="flex gap-2">
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
        <input type="hidden" name="hostId" value={host.id} />
        <Button type="submit" variant="destructive">
          Delete Account
        </Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
