<script lang="ts">
  import {
    Select as SelectPrimitive,
    type WithoutChildrenOrChild,
  } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    class: className,
    children,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.RootProps> & {
    children: Snippet;
  } = $props();
</script>

<SelectPrimitive.Root type="single" {...restProps}>
  {@render children?.()}
</SelectPrimitive.Root>
