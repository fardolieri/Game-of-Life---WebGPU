<script lang="ts">
type T = $$Generic;

export let value: T;
export let name: string;
</script>

<div class="settings-item">
  <div>{name}</div>
  <input type="range" min="0" max="1" step="0.01" bind:value />
  <span>{value}</span>
</div>

<style>
.settings-item {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
}
</style>
