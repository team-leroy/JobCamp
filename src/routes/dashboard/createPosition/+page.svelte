<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import PositionForm from "../PositionForm.svelte";

  let { data } = $props();
</script>

<Navbar loggedIn={true} isHost={true} isAdmin={false} />

<PositionForm {data} formTitle="Create New Position" buttonName="Publish" />

<div class="h-2"></div>
