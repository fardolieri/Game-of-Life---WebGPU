<script lang="ts">
type T = $$Generic;

export let value: T;
export let name: string;
export let min = 1;
export let max = 1;
export let step = 0.1;

</script>

<div class="settings-item">
  <div>{name}</div>
  <input type="range" {min} {max} {step} bind:value />
  <span>{value}</span>
</div>

<style>
.settings-item {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
}
</style>
