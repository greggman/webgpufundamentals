import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el
} from './resources/elem.js';

async function drawSine(elem) {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    return;
  }

  const canvas = el('canvas', { className: 'fill-container' });
  elem.append(canvas);
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const code = `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
      ) -> VSOutput {
        var pos = array(
          vec2f(-1.0, -1.0),
          vec2f(-1.0,  3.0),
          vec2f( 3.0, -1.0),
        );

        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
        return vsOutput;
      }

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = abs(sin((fsInput.texcoord.x * 2.0 - 1.0) * 40.0));
        return vec4f(color, color, color, 1);
      }
  `;
  const module = device.createShaderModule({code});
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [
        {format: presentationFormat},
      ],
    },
  });

  const renderPassDescriptor = {
    colorAttachments: [
      {
        // view: undefined, // Assigned later
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  function render() {
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
    render();
  });
  observer.observe(canvas);
}


async function main() {
  renderDiagrams({
    'sine': elem => drawSine(elem),
  });
}

main();
