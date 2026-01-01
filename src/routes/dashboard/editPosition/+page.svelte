<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import PositionForm from "../PositionForm.svelte";

  let { data, form } = $props();
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<PositionForm {data} {form} formTitle="Edit Position" buttonName="Publish" />

<div class="h-2"></div>
