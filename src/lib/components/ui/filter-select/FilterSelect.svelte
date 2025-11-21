<script lang="ts">
  import { Select as BitsSelect } from "bits-ui";

  interface OptionItem {
    value: string;
    label: string;
  }

  // Runes props with bindable value
  let {
    label,
    options = [] as OptionItem[],
    placeholder = "Select…",
    class: className = "",
    value = $bindable(""),
  }: {
    label: string;
    options?: OptionItem[];
    placeholder?: string;
    class?: string;
    value?: string;
  } = $props();

  // Generate unique ID for accessibility
  const selectId = `filter-select-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class={"flex flex-col gap-2 " + className}>
  <label for={selectId} class="text-sm font-medium text-foreground">{label}</label>
  <BitsSelect.Root type="single" bind:value>
    <BitsSelect.Trigger
      id={selectId}
      class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
    >
      {value || placeholder}
    </BitsSelect.Trigger>
    <BitsSelect.Content
      class="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
    >
      <BitsSelect.Viewport class="max-h-[300px] overflow-y-auto">
        {#each options as opt}
          <BitsSelect.Item value={opt.value}>{opt.label}</BitsSelect.Item>
        {/each}
      </BitsSelect.Viewport>
    </BitsSelect.Content>
  </BitsSelect.Root>
</div>
