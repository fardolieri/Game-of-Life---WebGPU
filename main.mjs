const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

const canvas = document.querySelector("canvas");
const context = canvas.getContext("webgpu");
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format })

const encoder = device.createCommandEncoder();
encoder.beginRenderPass({
    colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 1, a: 1 },
        storeOp: "store",
      }]
}).end()

device.queue.submit([encoder.finish()]);
