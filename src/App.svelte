<script lang="ts">
import GameOfLife from './lib/GameOfLife.svelte';
import Settings from './lib/Settings.svelte';

export let width: number = 800;
export let height: number = 500;
export let scale: number = 10;
export let chance: number = 0.01;
export let framesPerSecond: number = 60;
</script>

<div class="body-wrapper">
  <div class="canvas-container">
    {#key width + height + scale}
      <GameOfLife
        {width}
        {height}
        {scale}
        {chance}
        {framesPerSecond}
      />
    {/key}
  </div>
  <Settings
    bind:chance
    bind:framesPerSecond
    bind:width
    bind:height
    bind:scale
  />
</div>

<style>
.body-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}

.canvas-container {
  width: fit-content;
  height: 100vh;
  max-width: 100vh;
  max-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
