/*
import {
  makeShaderDataDefinitions,
} from '../../3rdparty/webgpu-utils-1.x.module.js';
import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import {
  createElem as el
} from './resources/elem.js';
import {
  mat4,
  vec3,
} from '../../3rdparty/wgpu-matrix.module.js';
import {
  hsla,
} from './resources/utils.js';

const darkColors = {
  lines: [1, 1, 1, 1],
};
const lightColors = {
  lines: [0, 0, 0, 1],
};
const darkMatcher = window.matchMedia("(prefers-color-scheme: dark)");
const isDarkMode = darkMatcher.matches;
const colors = isDarkMode ? darkColors : lightColors;

const degToRad = d => d * Math.PI / 180;

function createFVertices() {
  const vertexData = new Float32Array([
    // left column
    0, 0,
    30, 0,
    0, 150,
    30, 150,

    // top rung
    30, 0,
    100, 0,
    30, 30,
    100, 30,

    // middle rung
    30, 60,
    70, 60,
    30, 90,
    70, 90,
  ]);

  const indexData = new Uint32Array([
    0,  1,  2,    2,  1,  3,  // left column
    4,  5,  6,    6,  5,  7,  // top run
    8,  9, 10,   10,  9, 11,  // middle run
  ]);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length,
  };
}

const clipSpaceCubePositions = [
  -1,  1, -1,
   1,  1, -1,
   1, -1, -1,
  -1, -1, -1,

  -1,  1,  1,
   1,  1,  1,
   1, -1,  1,
  -1, -1,  1,
];

function createWireFrameCubeVertices() {
  // add in colors
  const vData = [];
  for (let i = 0; i < clipSpaceCubePositions.length; i += 3) {
    vData.push(...vData.slice(i, i + 3), 1, 1, 1, 1);
  }
  const vertexData = new Float32Array(vData);
  const indexData = new Uint32Array([
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7,
  ]);
  return {
    vertexData,
    indexData,
    numVertices: indexData.length,
  };
}

function createColoredCubeVertices() {
  const k = 1
  const cornerVertices = [
    [-k, -k, -k],
    [+k, -k, -k],
    [-k, +k, -k],
    [+k, +k, -k],
    [-k, -k, +k],
    [+k, -k, +k],
    [-k, +k, +k],
    [+k, +k, +k],
  ];
  const CUBE_FACE_INDICES = [
    [3, 7, 5, 1],  // right
    [6, 2, 0, 4],  // left
    [6, 7, 3, 2],  // ??
    [0, 1, 5, 4],  // ??
    [7, 6, 4, 5],  // front
    [2, 3, 1, 0],  // back
  ];
  const faceColors = [
    [ 1, 0, 0, 1, ],
    [ 0, 1, 0, 1, ],
    [ 1, 1, 0, 1, ],
    [ 0, 0, 1, 1, ],
    [ 1, 0, 1, 1, ],
    [ 0, 1, 1, 1, ],
  ];
  const vData = [];
  const indices = [];

  for (let f = 0; f < 6; ++f) {
    const faceIndices = CUBE_FACE_INDICES[f];
    const color = faceColors[f];
    for (let v = 0; v < 4; ++v) {
      const position = cornerVertices[faceIndices[v]];
      vData.push(...position, ...color);
    }
    // Two triangles make a square face.
    const offset = 4 * f;
    indices.push(offset + 0, offset + 1, offset + 2);
    indices.push(offset + 0, offset + 2, offset + 3);
  }

  const vertexData = new Float32Array(vData);
  const indexData = new Uint32Array(indices);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length,
  }
}

function createCubeRaysVertices() {
  const vData = [];
  const white = [1, 1, 1, 1];
  for (let i = 0; i < clipSpaceCubePositions.length; i += 3) {
    vData.push(...vData.slice(i, i + 3), ...(i / 3 < 4 ? white : colors.lines));
  }
  const vertexData = new Float32Array(vData);
  const indexData = new Uint32Array([
    0, 4, 1, 5, 2, 6, 3, 7,
  ]);
  return {
    vertexData,
    indexData,
    numVertices: indexData.length
  };
}

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    return;
  }
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const module = device.createShaderModule({
    code: `
      struct Uniforms {
        vec4f: color,
        matrix: mat4x4f,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) color: vec4f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = uni.matrix * vert.position;
        vsOut.color = vert.color;
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return vsOut.color * uni.color;
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3 + 4) * 4, // (3 + 4) floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 0, format: 'float32x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  function createVertexBuffers({vertexData, indexData, numVertices}) {
    const vertexBuffer = device.createBuffer({
      label: 'vertex buffer vertices',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    const indexBuffer = device.createBuffer({
      label: 'index buffer',
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);
    return {
      vertexBuffer,
      indexBuffer,
      numVertices,
    };
  }

  const wireCubeVertBuffers = createVertexBuffers(createWireFrameCubeVertices());
  const cubeRaysVertBuffers = createVertexBuffers(createCubeRaysVertices());
  const colorCubeVertBuffers = createVertexBuffers(createColoredCubeVertices());


  function setupF(elem, matrixFn) {
    // Get a WebGPU context from the canvas and configure it
    const canvas = el('canvas', { className: 'canvas-pixel-grid fill-container' });
    const pre = el('pre', {
      className: 'align-bottom-left',
      style: {
        left: '1em',
        textAlign: 'left',
        backgroundColor: 'initial',
        fontSize: 'medium',
        lineHeight: '120%',
      },
    });
    elem.appendChild(el('div', {style: {width: '300px', height: '300px', position: 'relative'}}, [canvas, pre]));
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    // color, resolution, padding, matrix
    const uniformBufferSize = (4 + 2 + 2 + 12) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kColorOffset = 0;
    const kResolutionOffset = 4;
    const kMatrixOffset = 8;

    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
    const resolutionValue = uniformValues.subarray(kResolutionOffset, kResolutionOffset + 2);
    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 12);

    // The color will not change so let's set it once at init time
    colorValue.set([Math.random(), Math.random(), Math.random(), 1]);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
      ],
    });

    const renderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
        {
          // view: <- to be filled out when we render
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const settings = {
      translation: [150, 100],
      rotation: degToRad(45),
      scale: [0.5, 0.5],
    };

    function render(time) {
      time *= 0.001;
      settings.translation[0] = 200 + Math.sin(time) * 50;
      pre.textContent = `translation: ${settings.translation.map(v => v.toFixed(0)).join(', ')}
   rotation: 30°
      scale: ${settings.scale.map(v => v).join(', ')}`;

      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture().createView();

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');

      const matrix = matrixFn(settings);

      // Set the uniform values in our JavaScript side Float32Array
      resolutionValue.set([canvas.width, canvas.height]);
      matrixValue.set(matrix);

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);

      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
    createRequestAnimationFrameLoop(elem, render);

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const canvas = entry.target;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      }
    });
    observer.observe(canvas);
  }

}
  renderDiagrams({
    'clip-space': (elem) => {
      showClipSpace(elem);
    },
  });
}

main();
*/

