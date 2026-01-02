<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import PositionForm from "../PositionForm.svelte";
  import { superForm } from "sveltekit-superforms";

  let { data, form } = $props();

  const sf = superForm(form || data.form, {
    resetForm: false,
    invalidateAll: true,
    timeoutMs: 60000, // 60 seconds timeout for large uploads
    onError: ({ result }) => {
      console.error("Upload error:", result);
      // The blanking happens because the page reloads on hard error.
      // Superforms usually handles this, but let's be safe.
    }
  });
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<PositionForm {data} {sf} formTitle="Create New Position" buttonName="Publish" />

<div class="h-2"></div>
