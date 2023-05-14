<script lang="ts">
import SettingsItem from './SettingsItem.svelte';

export let width: number;
export let height: number;
export let scale: number;
// export let scale: number;
export let chance: number;
export let framesPerSecond: number;
</script>

<div class="settings">
  <SettingsItem
    name="Chance of random bit-flip per frame"
    bind:value={chance}
  />
  <SettingsItem name="Frames per second" bind:value={framesPerSecond} />
  <SettingsItem name="Width" bind:value={width} />
  <SettingsItem name="Height" bind:value={height} />
  <SettingsItem name="Scale" bind:value={scale} />
</div>

<style>
.settings {
  margin-top: 2rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: row;
  gap: 2rem;
}
</style>
