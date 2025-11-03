<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { enhance } from "$app/forms";
  import { UserPlus, Edit, Trash2, Eye, EyeOff } from "lucide-svelte";

  interface AdminUser {
    id: string;
    email: string;
    createdAt: Date;
    lastLogin: Date;
    adminOfSchools: Array<{ id: string; name: string }>;
  }

  interface School {
    id: string;
    name: string;
  }

  interface FormResult {
    success?: boolean;
    message?: string;
  }

  let {
    readOnlyAdmins = [],
    schools = [],
    form = null,
  }: {
    readOnlyAdmins?: AdminUser[];
    schools?: School[];
    form?: FormResult | null;
  } = $props();

  let createDialogOpen = $state(false);
  let editingAdmin = $state<AdminUser | null>(null);
  let showPassword = $state(false);
  let showPasswordEdit = $state(false);

  function formatDate(date: Date | string) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleDeleteAdmin(admin: AdminUser) {
    if (
      confirm(
        `Are you sure you want to delete read-only admin "${admin.email}"? This action cannot be undone.`
      )
    ) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "?/deleteReadOnlyAdmin";

      const userIdInput = document.createElement("input");
      userIdInput.type = "hidden";
      userIdInput.name = "userId";
      userIdInput.value = admin.id;

      form.appendChild(userIdInput);
      document.body.appendChild(form);
      form.submit();
    }
  }
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle class="flex items-center gap-2">
        <span class="text-purple-600">👥</span>
        Admin Users
      </CardTitle>
      <Dialog bind:open={createDialogOpen}>
        <DialogTrigger>
          <Button class="bg-purple-600 hover:bg-purple-700">
            <UserPlus class="h-4 w-4 mr-2" />
            Create Read-Only Admin
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Read-Only Admin</DialogTitle>
          </DialogHeader>
          <form
            method="POST"
            action="?/createReadOnlyAdmin"
            class="space-y-4"
            use:enhance={() => {
              return async ({ result, update }) => {
                await update();
                if (result.type === "success") {
                  createDialogOpen = false;
                }
              };
            }}
          >
            <div>
              <Label for="create-email">Email</Label>
              <Input
                id="create-email"
                name="email"
                type="email"
                required
                placeholder="volunteer@example.com"
              />
            </div>
            <div>
              <Label for="create-password">Initial Password</Label>
              <div class="relative">
                <Input
                  id="create-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Set initial password"
                />
                <button
                  type="button"
                  onclick={() => (showPassword = !showPassword)}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {#if showPassword}
                    <EyeOff class="h-4 w-4" />
                  {:else}
                    <Eye class="h-4 w-4" />
                  {/if}
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                User can change this password after logging in
              </p>
            </div>
            <div>
              <Label for="create-school">School</Label>
              <select
                id="create-school"
                name="schoolId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {#each schools as school}
                  <option value={school.id}>{school.name}</option>
                {/each}
              </select>
            </div>
            <div class="bg-blue-50 p-3 rounded-md text-sm">
              <p class="font-medium">Read-Only Admin Access:</p>
              <ul class="list-disc list-inside mt-1 space-y-1 text-gray-700">
                <li>View Dashboard and Visualizations</li>
                <li>View and export student/company data</li>
                <li>Cannot edit data or manage events</li>
                <li>No access to Messaging, Lottery, or Event Management</li>
              </ul>
            </div>
            <div class="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onclick={() => (createDialogOpen = false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Admin</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  </CardHeader>
  <CardContent>
    {#if form?.message}
      <div
        class="mb-4 p-3 rounded-md {form.success
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'}"
      >
        {form.message}
      </div>
    {/if}

    {#if readOnlyAdmins.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p class="mb-2">No read-only admin accounts created yet.</p>
        <p class="text-sm">
          Create read-only admin accounts for volunteers who need to view data
          during your event.
        </p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each readOnlyAdmins as admin}
          <Card>
            <CardContent class="pt-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-medium">{admin.email}</span>
                    <Badge variant="secondary">Read-Only</Badge>
                  </div>
                  <div class="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>School:</strong>
                      {admin.adminOfSchools[0]?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Created:</strong>
                      {formatDate(admin.createdAt)}
                    </p>
                    <p>
                      <strong>Last Login:</strong>
                      {formatDate(admin.lastLogin)}
                    </p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Dialog>
                    <DialogTrigger>
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => (editingAdmin = admin)}
                      >
                        <Edit class="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Read-Only Admin</DialogTitle>
                      </DialogHeader>
                      <form
                        method="POST"
                        action="?/updateReadOnlyAdmin"
                        class="space-y-4"
                        use:enhance
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={editingAdmin?.id}
                        />
                        <div>
                          <Label for="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            name="email"
                            type="email"
                            required
                            value={editingAdmin?.email}
                          />
                        </div>
                        <div>
                          <Label for="edit-password"
                            >New Password (optional)</Label
                          >
                          <div class="relative">
                            <Input
                              id="edit-password"
                              name="password"
                              type={showPasswordEdit ? "text" : "password"}
                              placeholder="Leave blank to keep current password"
                            />
                            <button
                              type="button"
                              onclick={() =>
                                (showPasswordEdit = !showPasswordEdit)}
                              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {#if showPasswordEdit}
                                <EyeOff class="h-4 w-4" />
                              {:else}
                                <Eye class="h-4 w-4" />
                              {/if}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label for="edit-school">School</Label>
                          <select
                            id="edit-school"
                            name="schoolId"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {#each schools as school}
                              <option
                                value={school.id}
                                selected={school.id ===
                                  editingAdmin?.adminOfSchools[0]?.id}
                              >
                                {school.name}
                              </option>
                            {/each}
                          </select>
                        </div>
                        <div class="flex justify-end gap-2">
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                          <Button type="submit">Save Changes</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onclick={() => handleDeleteAdmin(admin)}
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}

    <div class="mt-6 bg-gray-50 p-4 rounded-lg">
      <h4 class="font-medium text-gray-900 mb-2">About Read-Only Admins</h4>
      <ul class="text-sm text-gray-700 space-y-1 list-disc list-inside">
        <li>Created for volunteers during job shadow events</li>
        <li>Can view all student and company data</li>
        <li>Can export CSV files for reporting</li>
        <li>Cannot create, edit, or delete any data</li>
        <li>No access to messaging, lottery, or event management</li>
        <li>Can change their own password after first login</li>
      </ul>
    </div>
  </CardContent>
</Card>
