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
  }: WithoutChildrenOrChild<SelectPrimitive.ViewportProps> & {
    children: Snippet;
  } = $props();
</script>

<SelectPrimitive.Viewport
  class={cn("max-h-[300px] overflow-y-auto", className)}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Viewport>
