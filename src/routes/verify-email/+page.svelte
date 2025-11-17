<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";

  var { data } = $props();

  var formEl: HTMLFormElement;

  const loginLinkClasses = buttonVariants({
    variant: "link",
    class: "-mb-32 text-lg",
  });
</script>

<div
  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-between items-center gap-4 py-10 px-10 sm:border-2 sm:rounded-lg sm:shadow-2xl"
>
  <h1 class="text-xl text-center">
    Check your inbox for an email verification link
  </h1>
  {#if data.msg}<p class="text-red">{data.msg}</p>{/if}
  <form method="POST" action="?/resend" bind:this={formEl}>
    <Button
      onclick={() => formEl.submit()}
      variant="outline"
      class="mb-16 text-lg">Resend Email</Button
    >
  </form>

  <a href="/login" class={loginLinkClasses}>Return to login</a>
</div>
