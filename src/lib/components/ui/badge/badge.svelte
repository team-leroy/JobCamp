<script lang="ts">
  import { cn } from "../../../utils";

  type Variant = "default" | "secondary" | "destructive" | "outline";

  let className: string = "";
  export { className as class };
  export let variant: Variant = "default";

  function getVariantClasses(variant: Variant): string {
    switch (variant) {
      case "default":
        return "border-transparent bg-blue-600 text-white hover:bg-blue-700";
      case "secondary":
        return "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200";
      case "destructive":
        return "border-transparent bg-red-600 text-white hover:bg-red-700";
      case "outline":
        return "border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50";
      default:
        return "border-transparent bg-blue-600 text-white hover:bg-blue-700";
    }
  }
</script>

<div
  class={cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    getVariantClasses(variant),
    className
  )}
  {...$$restProps}
>
  <slot />
</div>
