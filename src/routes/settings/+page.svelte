<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { enhance } from "$app/forms";
  import { Eye, EyeOff } from "lucide-svelte";

  let { data, form } = $props();

  let showCurrentPassword = $state(false);
  let showNewPassword = $state(false);
  let showConfirmPassword = $state(false);

  function formatDate(date: Date | string) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRoleBadge(role: string | null) {
    if (role === "FULL_ADMIN")
      return { text: "Full Admin", class: "bg-blue-500" };
    if (role === "READ_ONLY_ADMIN")
      return { text: "Read-Only Admin", class: "bg-purple-500" };
    if (data.isStudent) return { text: "Student", class: "bg-green-500" };
    if (data.isHost) return { text: "Host", class: "bg-orange-500" };
    return { text: "User", class: "bg-gray-500" };
  }

  const roleBadge = getRoleBadge(data.user.role);
</script>

<Navbar
  isAdmin={data.isAdmin}
  loggedIn={data.loggedIn}
  isHost={data.isHost}
  userRole={data.userRole}
/>

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-2xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Account Settings</h1>

    <!-- Account Information -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <Label class="text-gray-600">Email</Label>
          <p class="text-lg">{data.user.email}</p>
        </div>
        <div>
          <Label class="text-gray-600">Account Type</Label>
          <div class="mt-1">
            <Badge class={roleBadge.class}>{roleBadge.text}</Badge>
          </div>
        </div>
        <div>
          <Label class="text-gray-600">Member Since</Label>
          <p>{formatDate(data.user.createdAt)}</p>
        </div>
        <div>
          <Label class="text-gray-600">Last Login</Label>
          <p>{formatDate(data.user.lastLogin)}</p>
        </div>
      </CardContent>
    </Card>

    <!-- Change Password -->
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
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

        <form
          method="POST"
          action="?/changePassword"
          class="space-y-4"
          use:enhance
        >
          <div>
            <Label for="currentPassword">Current Password</Label>
            <div class="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                onclick={() => (showCurrentPassword = !showCurrentPassword)}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {#if showCurrentPassword}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            </div>
          </div>

          <div>
            <Label for="newPassword">New Password</Label>
            <div class="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                autocomplete="new-password"
              />
              <button
                type="button"
                onclick={() => (showNewPassword = !showNewPassword)}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {#if showNewPassword}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <Label for="confirmPassword">Confirm New Password</Label>
            <div class="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                autocomplete="new-password"
              />
              <button
                type="button"
                onclick={() => (showConfirmPassword = !showConfirmPassword)}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {#if showConfirmPassword}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            </div>
          </div>

          <div class="pt-4">
            <Button type="submit">Change Password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
