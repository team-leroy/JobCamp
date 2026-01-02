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
    }
  });
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<PositionForm {data} {sf} formTitle="Edit Position" buttonName="Publish" />

<div class="h-2"></div>
