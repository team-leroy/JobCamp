<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    placeholder?: string;
    children?: any;
  }

  let { class: className, placeholder, children }: Props = $props();
</script>

<span class={cn(className)} data-placeholder={placeholder}>
  {#if children}
    {@render children?.()}
  {:else if placeholder}
    <span class="text-muted-foreground">{placeholder}</span>
  {/if}
</span>
