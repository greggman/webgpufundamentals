import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el
} from './resources/elem.js';
import {mat4} from '../../3rdparty/wgpu-matrix.module.js';
import {createTextureFromSource} from '../../3rdparty/webgpu-utils-1.x.module.js';


const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;
const hsla = (h, s, l, a) => `hsla(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%, ${a})`;

function createSourceImage(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);

  ctx.globalCompositeOperation = 'screen';
  const numCircles = 3;
  for (let i = 0; i < numCircles; ++i) {
    ctx.rotate(Math.PI * 2 / numCircles);
    ctx.save();
    ctx.translate(size / 6, 0);
    ctx.beginPath();

    const radius = size / 3;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(0, 0, radius / 2, 0, 0, radius);
    const h = i / numCircles;
    gradient.addColorStop(0.5, hsla(h, 1, 0.5, 1));
    gradient.addColorStop(1, hsla(h, 1, 0.5, 0));

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }
  return canvas;
}

function createDestinationImage(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  for (let i = 0; i <= 6; ++i) {
    gradient.addColorStop(i / 6, hsl(i / -6, 1, 0.5));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(0, 0, 0, 255)';
  ctx.globalCompositeOperation = 'destination-out';
  ctx.rotate(Math.PI / -4);
  for (let i = 0; i < size * 2; i += 32) {
    ctx.fillRect(-size, i, size * 2, 16);
  }

  return canvas;
}

const size = 300;
const srcCanvas = createSourceImage(size);
const dstCanvas = createDestinationImage(size);
const presentationFormat = navigator.gpu?.getPreferredCanvasFormat();

const deviceP = navigator.gpu?.requestAdapter()
  .then(adapter => adapter?.requestDevice());

const drawBlendResultsP = deviceP.then(device => {
  const module = device.createShaderModule({
    label: 'our hardcoded textured quad shaders',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(

          vec2f( 0.0,  0.0),  // center
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 0.0,  1.0),  // center, top

          // 2st triangle
          vec2f( 0.0,  1.0),  // center, top
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 1.0,  1.0),  // right, top
        );

        var vsOutput: OurVertexShaderOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy;
        return vsOutput;
      }

      @group(0) @binding(0) var ourSampler: sampler;
      @group(0) @binding(1) var ourTexture: texture_2d<f32>;

      @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
      }
    `,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { }, },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { } },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [
      bindGroupLayout,
    ],
  });

  const srcTexture = createTextureFromSource(device, srcCanvas, {mips: true, premultipliedAlpha: true});
  const dstTexture = createTextureFromSource(device, dstCanvas, {mips: true, premultipliedAlpha: true});

  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  // create a buffer for the uniform values
  const uniformBufferSize =
    16 * 4; // matrix is 16 32bit floats (4bytes each)
  const uniformBuffer = device.createBuffer({
    label: 'uniforms for quad',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // create a typedarray to hold the values for the uniforms in JavaScript
  const uniformValues = new Float32Array(uniformBufferSize / 4);
  const matrix = uniformValues.subarray(kMatrixOffset, 16);

  const srcBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: srcTexture.createView() },
      { binding: 2, resource: { buffer: uniformBuffer }},
    ],
  });

  const dstBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: dstTexture.createView() },
      { binding: 2, resource: { buffer: uniformBuffer }},
    ],
  });

  const clearValue = [0, 0, 0, 0];
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const dstPipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
    layout: pipelineLayout,
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [
        { format: presentationFormat },
      ],
    },
  });

  function makeBlendComponentValid(blend) {
    const { operation } = blend;
    if (operation === 'min' || operation === 'max') {
      blend.srcFactor = 'one';
      blend.dstFactor = 'one';
    }
  }

  return function render(canvas, preset) {
    const {color, alpha} = preset;
    makeBlendComponentValid(color);
    makeBlendComponentValid(alpha || color);

    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    const srcPipeline = device.createRenderPipeline({
      label: 'hardcoded textured quad pipeline',
      layout: pipelineLayout,
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [
          {
            format: presentationFormat,
            blend: {
              color,
              alpha: alpha || color,
            },
          },
        ],
      },
    });

    const encoder = device.createCommandEncoder({ label: 'render quad encoder' });

    const canvasTexture = context.getCurrentTexture();
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture.createView();

    const pass = encoder.beginRenderPass(renderPassDescriptor);

    const projectionMatrix = mat4.ortho(0, canvasTexture.width, canvasTexture.height, 0, -1, 1);

    for (let i = 0; i < 1; ++i) {
      pass.setPipeline(dstPipeline);

      mat4.scale(projectionMatrix, [dstTexture.width, dstTexture.height, 1], matrix);

      // copy the values from JavaScript to the GPU
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, dstBindGroup);
      pass.draw(6);  // call our vertex shader 6 times
    }

    for (let i = 0; i < 1; ++i) {
      pass.setPipeline(srcPipeline);

      mat4.scale(projectionMatrix, [srcTexture.width, srcTexture.height, 1], matrix);

      // copy the values from JavaScript to the GPU
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, srcBindGroup);
      pass.draw(6);  // call our vertex shader 6 times
    }

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };
});

const presets = {
  'default (copy)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'zero',
    },
  },
  'premultiplied blend (source-over)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'un-premultiplied blend': {
    color: {
      operation: 'add',
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'destination-over': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'one',
    },
  },
  'source-in': {
    color: {
      operation: 'add',
      srcFactor: 'dst-alpha',
      dstFactor: 'zero',
    },
  },
  'destination-in': {
    color: {
      operation: 'add',
      srcFactor: 'zero',
      dstFactor: 'src-alpha',
    },
  },
  'source-out': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'zero',
    },
  },
  'destination-out': {
    color: {
      operation: 'add',
      srcFactor: 'zero',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'source-atop': {
    color: {
      operation: 'add',
      srcFactor: 'dst-alpha',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'destination-atop': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'src-alpha',
    },
  },
  'additive (lighten)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one',
    },
  },
};

function deQuote(s) {
  return s.split('\n')
    .map(l => l
      .replace(/"(.*?)"/, '$1')
      .replace(/\}$/, '},')
      .replace(/"$/, '",')
      .replaceAll('"', '\'')
    )
    .join('\n');
}


function drawBlendResults(elem) {
  const name = elem.dataset.diagram.substring(6);
  const preset = presets[name];
  const canvas = el('canvas', {className: 'checkerboard'});
  canvas.width = 300;
  canvas.height = 300;
  drawBlendResultsP.then(fn => fn(canvas, preset));
  elem.appendChild(el('div', {className: 'blend-info'}, [
    el('hr'),
    el('div', {className: 'center blend-heading', textContent: name}),
    el('div', {className: 'blend-setting'}, [
      el('pre', { className: 'prettyprint lang-js' }, [
        el('code', {
          textContent: `blend: ${deQuote(JSON.stringify({
            color: preset.color,
            alpha: preset.alpha || preset.color,
          }, null, 2))}`,
        }),
      ]),
      canvas,
    ]),
  ]));
}

renderDiagrams({
  ...Object.fromEntries(
    Object.keys(presets)
      .map(k => [`blend-${k}`, drawBlendResults])),
  original(elem) {
    elem.appendChild(dstCanvas);
    elem.appendChild(srcCanvas);
  },
});
