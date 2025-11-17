<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { Input } from "$lib/components/ui/input";
  import { enhance } from "$app/forms";

  let { data, form } = $props();
</script>

{#if (data.waiting == 0 && !form) || (form && form.waiting == 0)}
  <div
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-20 px-20 sm:border-2 sm:rounded-lg sm:shadow-2xl"
  >
    <h1 class="text-3xl mb-3">Forgot Password</h1>
    <form class="flex flex-col" method="POST" action="?/send" use:enhance>
      <div class="flex gap-4 justify-center items-center">
        <label class="text-xl" for="email">Email</label>
        <Input name="email" class="w-64" type="email" />
      </div>
      {#if form && form.msg}<p class="text-red-500">{form.msg}</p>{/if}
      <Button
        type="submit"
        class="mx-auto text-lg mt-5 px-6 h-10 rounded bg-blue-500 text-white hover:bg-blue-600"
        >Reset</Button
      >
    </form>
  </div>
{:else if (data.waiting == 1 && !form) || (form && form.waiting == 1)}
  <div
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
  >
    <h1 class="text-xl text-center">
      Check your email for a link to reset your password.
    </h1>
    {#if form && form.msg}<p class="text-red-500">{form.msg}</p>{/if}
  </div>
{:else}
  <div
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
  >
    <h1 class="text-3xl mb-3">Reset Password</h1>
    {#if form && form.msg}<p class="text-red-500">{form.msg}</p>{/if}
    <form class="flex flex-col" method="POST" action="?/submit" use:enhance>
      <input type="hidden" class="hidden" name="code" value={data.code} />
      <input type="hidden" class="hidden" name="uid" value={data.userId} />
      <div class="flex gap-4 justify-center items-center">
        <label class="text-lg" for="password">New Password:</label>
        <Input name="password" class="w-64" />
      </div>
      <Button
        type="submit"
        class="mx-auto text-lg mt-5 px-6 h-10 rounded bg-blue-500 text-white hover:bg-blue-600"
        >Reset</Button
      >
    </form>
  </div>
{/if}
