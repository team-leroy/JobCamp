<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { AlertCircle } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import logo from "$lib/assets/favicon.png";

  export let data;
  export let form;

  const { hasActiveEvent, eventName, studentAccountsEnabled, companyAccountsEnabled } = data;
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
        <CardDescription>
          Login with your administrator credentials to access the admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {#if form?.message}
          <Alert class="mb-4" variant={form.success ? "default" : "destructive"}>
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>{form.message}</AlertDescription>
          </Alert>
        {/if}

        <!-- Event Status Information -->
        {#if !hasActiveEvent}
          <Alert class="mb-4">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              <strong>No Active Event:</strong> There is currently no active event. 
              Student and company signups are disabled.
            </AlertDescription>
          </Alert>
        {:else if !studentAccountsEnabled && !companyAccountsEnabled}
          <Alert class="mb-4">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              <strong>Event Preparation Mode:</strong> {eventName} is active but student and company accounts are disabled. 
              Only administrators can access the system.
            </AlertDescription>
          </Alert>
        {:else}
          <Alert class="mb-4" variant="default">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              <strong>Event Active:</strong> {eventName} is currently active with user signups enabled.
            </AlertDescription>
          </Alert>
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

          <Button type="submit" class="w-full">
            Sign In as Administrator
          </Button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Regular users can 
            <a href="/login" class="font-medium text-blue-600 hover:text-blue-500">
              login here
            </a>
            {#if hasActiveEvent && (studentAccountsEnabled || companyAccountsEnabled)}
              or 
              <a href="/signup" class="font-medium text-blue-600 hover:text-blue-500">
                sign up
              </a>
            {/if}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
