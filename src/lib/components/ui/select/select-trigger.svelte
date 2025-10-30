<script lang="ts">
  import {
    Select as SelectPrimitive,
    type WithoutChildrenOrChild,
  } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    class: className,
    children,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.TriggerProps> & {
    children: Snippet;
  } = $props();
</script>

<SelectPrimitive.Trigger
  class={cn(
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Trigger>
