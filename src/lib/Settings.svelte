<script lang="ts">
import SettingsItem from './SettingsItem.svelte';

export let width: number;
export let height: number;
export let scale: number;
// export let scale: number;
export let chance: number;
export let framesPerSecond: number;

let percentChance = chance * 100;
$: chance = percentChance / 100;
</script>

<div class="settings">
  <SettingsItem
    name="Chance of random bit-flip per frame in percent"
    bind:value={percentChance}
    min={0}
    max={100}
    step={1}
  />
  <SettingsItem
    name="Frames per second"
    bind:value={framesPerSecond}
    min={0}
    max={60}
    step={1}
  />
  <SettingsItem name="Scale" bind:value={scale} min={1} max={100} step={1} />
  <SettingsItem name="Width" bind:value={width} min={10} max={3000} step={1} />
  <SettingsItem
    name="Height"
    bind:value={height}
    min={10}
    max={3000}
    step={1}
  />
  <button
    on:click={() => {
      width = window.innerWidth;
      height = window.innerHeight;
    }}>Fullscreen</button
  >
  <button
    on:click={() => {
      localStorage.clear();
      location.reload();
    }}>Reset</button
  >
</div>

<style>
.settings {
  margin-top: 2rem;
  margin-bottom: 2rem;
  max-width: 100vw;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  gap: 2rem;
}

button {
  border-radius: 4px;
  align-self: center;
  padding: 1rem;
}
</style>
