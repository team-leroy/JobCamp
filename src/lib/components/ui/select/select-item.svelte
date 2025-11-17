<script lang="ts">
  import {
    Select as SelectPrimitive,
    type WithoutChildrenOrChild,
  } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    class: className,
    value,
    children,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ItemProps> & {
    value: string;
    children: Snippet;
  } = $props();
</script>

<SelectPrimitive.Item
  class={cn(
    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    className
  )}
  {value}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Item>
