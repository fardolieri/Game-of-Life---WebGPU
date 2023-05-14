<script lang="ts">
  // https://codelabs.developers.google.com/your-first-webgpu-app
  (async () => {
    const WORKGROUP_SIZE = 8;

    const adapter = await navigator?.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();

    if (!device) {
      const msg = "It looks like your browser does not support WebGPU 😕";
      document.body.innerText = msg;
      throw new Error(msg);
    }

    const canvas = document.querySelector("canvas");
    canvas.width = Math.floor(window.innerWidth * 0.9);
    canvas.height = Math.floor(window.innerHeight * 0.9);

    const chance = reactiveVariable(
      0.01,
      ".chance-setting input",
      ".chance-setting span"
    );

    let intervalCleaner;
    const framesPerSecond = reactiveVariable(
      60,
      ".frame-setting input",
      ".frame-setting span",
      () => {
        clearInterval(intervalCleaner);
        intervalCleaner = setInterval(updateGrid, getUpdateInterval());
      }
    );

    function getUpdateInterval() {
      return Math.min(
        Math.pow(2, 31) - 1, // Max allowed value for setInterval
        (1 / +framesPerSecond.value) * 1000
      );
    }

    const scale = 10;
    const GRID = [
      Math.floor(canvas.width / scale),
      Math.floor(canvas.height / scale),
    ];

    const context = canvas.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: canvasFormat });

    const vertices = new Float32Array([
      // X,    Y,
      -0.8,
      -0.8, // Triangle 1 (Blue)
      +0.8,
      -0.8,
      +0.8,
      +0.8,

      -0.8,
      -0.8, // Triangle 2 (Red)
      +0.8,
      +0.8,
      -0.8,
      +0.8,
    ]);

    const vertexBuffer = device.createBuffer({
      label: "Cell vertices",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position, see vertex shader
        },
      ],
    };

    const cellShaderModule = device.createShaderModule({
      label: "Cell shader",
      code: `
    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) cell: vec2f,
    };

    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellState: array<u32>;

    @vertex
    fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) -> VertexOutput {
      let i = f32(instance);
      let cell = vec2f(i % grid.x, floor(i / grid.x));
      let state = f32(cellState[instance]);

      let cellOffset = (cell / grid) * 2;
      let gridPos = (pos * state + 1) / grid - 1 + cellOffset;

      var output: VertexOutput;
      output.pos = vec4f(gridPos, 0, 1);
      output.cell = cell;

      return output;
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
      return vec4f(input.cell / grid, 1 - input.cell.x / grid.x, 1);
    }
    `,
    });

    const simulationShaderModule = device.createShaderModule({
      label: "Game of Life simulation shader",
      code: `
    @group(0) @binding(0) var<uniform> grid: vec2f;

    @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

    @group(0) @binding(3) var<uniform> randomFlip: u32;

    fn cellIndex(cell: vec2u) -> u32 {
      let y = cell.y % u32(grid.y);
      let x = cell.x % u32(grid.x);
      return y * u32(grid.x) + x;
    }

    fn cellActive(x: u32, y: u32) -> u32 {
      return cellStateIn[cellIndex(vec2u(x, y))];
    }

    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
      let i = cellIndex(cell.xy);

      let activeNeighbors = 0 +
        cellActive(cell.x-1, cell.y-1) +
        cellActive(cell.x,   cell.y-1) +
        cellActive(cell.x+1, cell.y-1) +
        cellActive(cell.x-1, cell.y)   +
        cellActive(cell.x+1, cell.y)   +
        cellActive(cell.x-1, cell.y+1) +
        cellActive(cell.x,   cell.y+1) +
        cellActive(cell.x+1, cell.y+1);

      switch activeNeighbors {
        case 2: { // Active cells with 2 neighbors stay active.
          cellStateOut[i] = cellStateIn[i];
        }
        case 3: { // Cells with 3 neighbors become or stay active.
          cellStateOut[i] = 1;
        }
        default: { // Cells with < 2 or > 3 neighbors become inactive.
          cellStateOut[i] = 0;
        }
      }

      if ((randomFlip - 1) == i) { cellStateOut[i] = 1 - cellStateOut[i]; }
    }`,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Cell Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility:
            GPUShaderStage.VERTEX |
            GPUShaderStage.FRAGMENT |
            GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      label: "Cell Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    const cellPipeline = device.createRenderPipeline({
      label: "Cell pipeline",
      layout: pipelineLayout,
      vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout],
      },
      fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: canvasFormat }],
      },
    });

    const simulationPipeline = device.createComputePipeline({
      label: "Simulation pipeline",
      layout: pipelineLayout,
      compute: {
        module: simulationShaderModule,
        entryPoint: "computeMain",
      },
    });

    const uniformArray = new Float32Array(GRID);
    const uniformBuffer = device.createBuffer({
      label: "Grid Uniforms",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    const randomFlip = new Uint32Array([0]);
    const randomFlipBuffer = device.createBuffer({
      label: "Random Flip Buffer",
      size: randomFlip.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(randomFlipBuffer, 0, randomFlip);

    const cellStateArray = new Uint32Array(GRID[0] * GRID[1]);
    const cellStateStorage = [
      device.createBuffer({
        label: "Cell State A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      device.createBuffer({
        label: "Cell State B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    for (let i = 0; i < cellStateArray.length; i++) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

    const bindGroups = [
      device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: cellStateStorage[0] } },
          { binding: 2, resource: { buffer: cellStateStorage[1] } },
          { binding: 3, resource: { buffer: randomFlipBuffer } },
        ],
      }),
      device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: cellStateStorage[1] } },
          { binding: 2, resource: { buffer: cellStateStorage[0] } },
          { binding: 3, resource: { buffer: randomFlipBuffer } },
        ],
      }),
    ];

    let step = 0; // Track how many simulation steps have been run
    function updateGrid() {
      const encoder = device.createCommandEncoder();

      const randomness = Math.random();
      const i =
        randomness < chance.value
          ? Math.floor((randomness / chance.value) * (GRID[0] * GRID[1])) + 1
          : 0;
      device.queue.writeBuffer(randomFlipBuffer, 0, new Int32Array([i]));

      const computePass = encoder.beginComputePass();

      computePass.setPipeline(simulationPipeline);
      computePass.setBindGroup(0, bindGroups[step % 2]);

      computePass.dispatchWorkgroups(
        Math.ceil(GRID[0] / WORKGROUP_SIZE),
        Math.ceil(GRID[1] / WORKGROUP_SIZE)
      );

      computePass.end();

      step++;

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(cellPipeline);
      pass.setBindGroup(0, bindGroups[step % 2]);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.draw(vertices.length / 2, GRID[0] * GRID[1]);

      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    intervalCleaner = setInterval(updateGrid, UPDATE_INTERVAL);

    function reactiveVariable(
      init,
      inputElSelector,
      outputElSelector,
      onChange?
    ) {
      let result = { value: init };

      const inputEl = document.querySelector(inputElSelector);
      const outputEl = document.querySelector(outputElSelector);

      outputEl.innerHTML = inputEl.value = result.value;

      inputEl.oninput = function () {
        outputEl.innerHTML = result.value = this.value;
        onChange?.(result.value);
      };

      return result;
    }
  })();
</script>

<main>
  <div class="body-wrapper">
    <div class="canvas-container">
      <canvas></canvas>
    </div>
    <div class="settings">
      <div class="settings-item chance-setting">
        <div>Chance of random bit-flip per frame</div>
        <input type="range" min="0" max="1" step="0.01">
        <span></span>
      </div>
      <div class="settings-item frame-setting">
        <div>Frames per second</div>
        <input type="range" min="0" max="60" step="0.1">
        <span></span>
      </div>
    </div>
  </div>
</main>

<style>
.body-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}

.canvas-container {
  width: fit-content;
  /* width: 100vw; */
  height: 100vh;
  max-width: 100vh;
  max-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  max-height: 100%;
}

.settings {
  /* width: 100%; */
  margin-top: 2rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: row;
  gap: 2rem;
}

.settings-item {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
}

::-webkit-scrollbar {
  /* Hide chrome's ugly scrollbar */
  width: 0;
}
</style>
