<script lang="ts">
  import { untrack } from "svelte";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import PositionForm from "../PositionForm.svelte";
  import { superForm } from "sveltekit-superforms";
  import { zod } from "sveltekit-superforms/adapters";
  import { editPositionSchema } from "./schema";

  let { data, form } = $props();

  const sf = superForm(untrack(() => form || data.form), {
    resetForm: false,
    invalidateAll: true,
    timeoutMs: 60000, // 60 seconds timeout for large uploads
    validators:
      data.position
        ? zod(
            editPositionSchema(data.position) as import("sveltekit-superforms/adapters").ZodObjectType
          )
        : undefined,
    onError: ({ result }) => {
      console.error("Upload error:", result);
    }
  });
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<PositionForm {data} {sf} formTitle="Edit Position" buttonName="Publish" />

<div class="h-2"></div>
