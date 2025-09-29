<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { AlertCircle } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import logo from "$lib/assets/favicon.png";

  export let data;
  export let form;

  const {
    hasActiveEvent,
    eventName,
    studentAccountsEnabled,
    companyAccountsEnabled,
  } = data;
</script>

<div
  class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
>
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="flex justify-center">
      <img src={logo} alt="JobCamp" class="h-12 w-auto" />
    </div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Admin Login
    </h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Administrative access to JobCamp
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Administrator Access</CardTitle>
        <p class="text-sm text-gray-600">
          Login with your administrator credentials to access the admin
          dashboard.
        </p>
      </CardHeader>
      <CardContent>
        {#if form?.message}
          <div
            class="mb-4 p-4 rounded-lg border-l-4 {form.success
              ? 'bg-green-50 border-green-400 text-green-700'
              : 'bg-red-50 border-red-400 text-red-700'}"
          >
            <div class="flex items-center">
              <AlertCircle class="h-4 w-4 mr-2" />
              <span>{form.message}</span>
            </div>
          </div>
        {/if}

        <!-- Event Status Information -->
        {#if !hasActiveEvent}
          <div
            class="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg"
          >
            <div class="flex items-center">
              <AlertCircle class="h-4 w-4 mr-2 text-yellow-600" />
              <div>
                <strong class="text-yellow-800">No Active Event:</strong> There is
                currently no active event. Student and company signups are disabled.
              </div>
            </div>
          </div>
        {:else if !studentAccountsEnabled && !companyAccountsEnabled}
          <div
            class="mb-4 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg"
          >
            <div class="flex items-center">
              <AlertCircle class="h-4 w-4 mr-2 text-orange-600" />
              <div>
                <strong class="text-orange-800">Event Preparation Mode:</strong>
                {eventName} is active but student and company accounts are disabled.
                Only administrators can access the system.
              </div>
            </div>
          </div>
        {:else}
          <div
            class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg"
          >
            <div class="flex items-center">
              <AlertCircle class="h-4 w-4 mr-2 text-blue-600" />
              <div>
                <strong class="text-blue-800">Event Active:</strong>
                {eventName} is currently active with user signups enabled.
              </div>
            </div>
          </div>
        {/if}

        <form method="POST" use:enhance class="space-y-4">
          <div>
            <Label for="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              class="mt-1"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <Label for="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              class="mt-1"
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" class="w-full">Sign In as Administrator</Button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Regular users can
            <a
              href="/login"
              class="font-medium text-blue-600 hover:text-blue-500"
            >
              login here
            </a>
            {#if hasActiveEvent && (studentAccountsEnabled || companyAccountsEnabled)}
              or
              <a
                href="/signup"
                class="font-medium text-blue-600 hover:text-blue-500"
              >
                sign up
              </a>
            {/if}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
