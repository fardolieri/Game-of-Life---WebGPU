<script lang="ts">
import GameOfLife from './lib/GameOfLife.svelte';
import Settings from './lib/Settings.svelte';
import { localStorageStore } from './lib/utils/local-storage-store';

const devicePromise = Promise.resolve()
  .then(() => navigator.gpu.requestAdapter())
  .then((adapter) => adapter!.requestDevice());

let width = localStorageStore('width', Math.floor(window.innerWidth * 0.9));
let height = localStorageStore('height', Math.floor(window.innerHeight * 0.9));
let scale = localStorageStore('scale', 10);
let chance = localStorageStore('chance', 0.01);
let framesPerSecond = localStorageStore('framesPerSecond', 60);
</script>

<div class="body-wrapper">
  {#await devicePromise then device}
    <div class="canvas-container">
      {#key $width + $height + $scale}
        <GameOfLife
          {device}
          width={$width}
          height={$height}
          scale={$scale}
          chance={$chance}
          framesPerSecond={$framesPerSecond}
        />
      {/key}
    </div>
    <Settings
      bind:chance={$chance}
      bind:framesPerSecond={$framesPerSecond}
      bind:width={$width}
      bind:height={$height}
      bind:scale={$scale}
    />
  {:catch}
    <div>It looks like your browser does not support WebGPU yet 😕</div>
    <a
      href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility"
      >Check WebGPU's browser compatibility here</a
    >
  {/await}
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
