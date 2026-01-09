<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";

  var { data } = $props();

  var formEl: HTMLFormElement;

  const loginLinkClasses = buttonVariants({
    variant: "link",
    class: "text-lg",
  });
</script>

<div
  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
>
  <h1 class="text-xl text-center">
    Check your inbox for an email verification link.
  </h1>

  {#if data.email}
    <div
      class="text-center font-medium text-lg text-primary bg-muted px-4 py-2 rounded-md"
    >
      {data.email}
    </div>
  {/if}

  {#if data.msg}<p class="text-red-500 font-medium">{data.msg}</p>{/if}

  <form method="POST" action="?/resend" bind:this={formEl}>
    <Button onclick={() => formEl.submit()} variant="outline" class="text-lg"
      >Resend Email</Button
    >
  </form>

  <a href="/logout" class={loginLinkClasses}>Return to Login</a>
</div>
