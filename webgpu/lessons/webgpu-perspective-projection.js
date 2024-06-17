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
} from '../../3rdparty/wgpu-matrix.module.js';
import * as twgl from '../../3rdparty/twgl-full.module.js';
import GUI from '../../3rdparty/muigui-0.x.module.js';

const darkColors = {
  lines: [1, 1, 1, 1],
};
const lightColors = {
  lines: [0, 0, 0, 1],
};
const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
const isDarkMode = darkMatcher.matches;
const colors = isDarkMode ? darkColors : lightColors;

function createFVertices() {
  const positions = [
    // left column
    0, 0, 0,
    30, 0, 0,
    0, 150, 0,
    30, 150, 0,

    // top rung
    30, 0, 0,
    100, 0, 0,
    30, 30, 0,
    100, 30, 0,

    // middle rung
    30, 60, 0,
    70, 60, 0,
    30, 90, 0,
    70, 90, 0,

    // left column back
    0, 0, 30,
    30, 0, 30,
    0, 150, 30,
    30, 150, 30,

    // top rung back
    30, 0, 30,
    100, 0, 30,
    30, 30, 30,
    100, 30, 30,

    // middle rung back
    30, 60, 30,
    70, 60, 30,
    30, 90, 30,
    70, 90, 30,
  ];

  const indices = [
    // front
    0,  1,  2,    2,  1,  3,  // left column
    4,  5,  6,    6,  5,  7,  // top run
    8,  9, 10,   10,  9, 11,  // middle run

    // back
    12,  14,  13,   14, 15, 13,  // left column back
    16,  18,  17,   18, 19, 17,  // top run back
    20,  22,  21,   22, 23, 21,  // middle run back

    0, 12, 5,   12, 17, 5,   // top
    5, 17, 7,   17, 19, 7,   // top rung right
    6, 7, 18,   18, 7, 19,   // top rung bottom
    6, 18, 8,   18, 20, 8,   // between top and middle rung
    8, 20, 9,   20, 21, 9,   // middle rung top
    9, 21, 11,  21, 23, 11,  // middle rung right
    10, 11, 22, 22, 11, 23,  // middle rung bottom
    10, 22, 3,  22, 15, 3,   // stem right
    2, 3, 14,   14, 3, 15,   // bottom
    0, 2, 12,   12, 2, 14,   // left
  ];

  const quadColors = [
      200,  70, 120,  // left column front
      200,  70, 120,  // top rung front
      200,  70, 120,  // middle rung front

       80,  70, 200,  // left column back
       80,  70, 200,  // top rung back
       80,  70, 200,  // middle rung back

       70, 200, 210,  // top
      160, 160, 220,  // top rung right
       90, 130, 110,  // top rung bottom
      200, 200,  70,  // between top and middle rung
      210, 100,  70,  // middle rung top
      210, 160,  70,  // middle rung right
       70, 180, 210,  // middle rung bottom
      100,  70, 210,  // stem right
       76, 210, 100,  // bottom
      140, 210,  80,  // left
  ];

  const numVertices = indices.length;
  const vertexData = new Float32Array(numVertices * 4); // xyz + color
  const colorData = new Uint8Array(vertexData.buffer);

  for (let i = 0; i < indices.length; ++i) {
    const positionNdx = indices[i] * 3;
    const position = positions.slice(positionNdx, positionNdx + 3);
    vertexData.set(position, i * 4);

    const quadNdx = (i / 6 | 0) * 3;
    const color = quadColors.slice(quadNdx, quadNdx + 3);
    colorData.set(color, i * 16 + 12);
    colorData[i * 16 + 15] = 255;
  }

  return {
    vertexData,
    numVertices,
  };
}

function makeZToWMatrix(fudgeFactor) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, fudgeFactor,
    0, 0, 0, 1,
  ];
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
        return vsOut.color;
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
          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'front',  // note: uncommon setting. See article
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  function createVertexBuffers({vertexData, numVertices}) {
    const vertexBuffer = device.createBuffer({
      label: 'vertex buffer vertices',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    return {
      vertexBuffer,
      numVertices,
    };
  }

  const fVertBuffers = createVertexBuffers(createFVertices());

  function setupF(elem, {vertexBuffer, numVertices}) {
    // Get a WebGPU context from the canvas and configure it
    const canvas = el('canvas', { className: 'fill-container' });
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
    elem.appendChild(el('div', {
      className: 'fill-container',
      style: {
        position: 'relative', // so the pre will be aligned relative to this
        border: '1px solid #000',
      },
    }, [canvas, pre]));
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    // matrix
    const uniformBufferSize = (16) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;
    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

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
      depthStencilAttachment: {
        // view: <- to be filled out when we render
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    const settings = {
      translation: [canvas.clientWidth / 2 - 200, canvas.clientHeight / 2 - 75, -1000],
      rotation: [degToRad(40), degToRad(25), degToRad(325)],
      scale: [3, 3, 3],
      fudgeFactor: 10,
    };

    let depthTexture;

    function render(time) {
      time *= 0.001;
      settings.translation[2] = -1150 + Math.sin(time * 0.5) * 150;
      pre.textContent = `z: ${settings.translation[2].toFixed(0)}`;

      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      const canvasTexture = context.getCurrentTexture();
      renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

      // If we don't have a depth texture OR if its size is different
      // from the canvasTexture when make a new depth texture
      if (!depthTexture ||
          depthTexture.width !== canvasTexture.width ||
          depthTexture.height !== canvasTexture.height) {
        if (depthTexture) {
          depthTexture.destroy();
        }
        depthTexture = device.createTexture({
          size: [canvasTexture.width, canvasTexture.height],
          format: 'depth24plus',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
      }
      renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);

      const projection = mat4.ortho(
          0,                   // left
          canvas.clientWidth,  // right
          canvas.clientHeight, // bottom
          0,                   // top
          1200,                // near
          -1000,               // far
      );
      mat4.multiply(makeZToWMatrix(settings.fudgeFactor), projection, matrixValue);
      mat4.translate(matrixValue, settings.translation, matrixValue);
      mat4.rotateX(matrixValue, settings.rotation[0], matrixValue);
      mat4.rotateY(matrixValue, settings.rotation[1], matrixValue);
      mat4.rotateZ(matrixValue, settings.rotation[2], matrixValue);
      mat4.scale(matrixValue, settings.scale, matrixValue);

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(numVertices);

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

  // yes, I know, shame! This should be converted to WebGPU 😅
  function frustumDiagram(elem, showCubes) {
    const m4 = twgl.m4;
    const v3 = twgl.v3;
    const canvas = el('canvas', {className: 'fill-container'});
    const eyeElem = el('div', {
      textContent: '👁️',
      style: {
        fontSize: 'larger',
        position: 'absolute',
      },
    });
    const uiElem = el('div', {style: {position: 'absolute', right: '0', top: '0'}});
    const div = el('div', {
      className: 'fill-container',
      style: { position: 'relative'},  // so the eye can be positioned
    }, [canvas, eyeElem, uiElem]);
    const gl = canvas.getContext('webgl');
    elem.appendChild(div);

    const vertexColorVertexShader = `
    attribute vec4 position;
    attribute vec4 color;
    uniform mat4 u_worldViewProjection;
    varying vec4 v_color;
    void main() {
      gl_Position = u_worldViewProjection * position;
      v_color = color;
    }
    `;

    const vertexColorFragmentShader = `
    precision mediump float;
    uniform vec4 u_color;
    varying vec4 v_color;
    void main() {
      gl_FragColor = u_color * v_color;
    }
    `;

    const baseVertexShader = `
    attribute vec4 position;
    attribute vec4 color;
    uniform mat4 u_worldViewProjection;
    uniform mat4 u_exampleWorldViewProjection;
    varying vec4 v_color;
    varying vec4 v_position;
    void main() {
      gl_Position = u_worldViewProjection * position;
      v_position = u_exampleWorldViewProjection * position;
      v_position = v_position;
      v_color = color;
    }
    `;

    const colorFragmentShader = `
    precision mediump float;
    varying vec4 v_color;
    varying vec4 v_position;
    uniform vec4 u_color;
    void main() {
      vec4 pos = v_position / v_position.w * sign(v_position);
      bool blend = (pos.x < -1.0 || pos.x > 1.0 ||
                    pos.y < -1.0 || pos.y > 1.0 ||
                    pos.z < -1.0 || pos.z > 1.0);
      vec4 blendColor = blend ? vec4(0.35, 0.35, 0.35, 1.0) : vec4(1, 1, 1, 1);
      gl_FragColor = v_color * u_color * blendColor;
    }
    `;

    const scale = 1;

    // Create Geometry.
    const wireCubeArrays = {
      position: [
          -1,  1, -1,
           1,  1, -1,
           1, -1, -1,
          -1, -1, -1,

          -1,  1,  1,
           1,  1,  1,
           1, -1,  1,
          -1, -1,  1,
      ],
      color: [
          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,

          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,
      ],
      indices: [
          0, 1, 1, 2, 2, 3, 3, 0,
          4, 5, 5, 6, 6, 7, 7, 4,
          0, 4, 1, 5, 2, 6, 3, 7,
      ],
    };

    const vertexColorProgramInfo = twgl.createProgramInfo(gl, [
        vertexColorVertexShader,
        vertexColorFragmentShader,
    ]);
    const wireCubeBufferInfo = twgl.createBufferInfoFromArrays(gl, wireCubeArrays);

    const cubeRaysArrays = {
      position: wireCubeArrays.position,
      color: [
          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,
          1, 1, 1, 1,

          ...colors.lines,
          ...colors.lines,
          ...colors.lines,
          ...colors.lines,
      ],
      indices: [
          0, 4, 1, 5, 2, 6, 3, 7,
      ],
    };
    const cubeRaysBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeRaysArrays);

    const colorProgramInfo = twgl.createProgramInfo(gl, [
        baseVertexShader,
        colorFragmentShader,
    ]);
    const cubeArrays = twgl.primitives.createCubeVertices(2);
    delete cubeArrays.normal;
    delete cubeArrays.texcoord;
    const faceColors = [
      [ 1, 0, 0, 1, ],
      [ 0, 1, 0, 1, ],
      [ 1, 1, 0, 1, ],
      [ 0, 0, 1, 1, ],
      [ 1, 0, 1, 1, ],
      [ 0, 1, 1, 1, ],
    ];
    const colorVerts = [];
    for (let f = 0; f < 6; ++f) {
      for (let v = 0; v < 4; ++v) {
        colorVerts.push(...faceColors[f]);
      }
    }
    cubeArrays.color = colorVerts;
    const cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeArrays);

    const fBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: [
            // left column front
            0,   0,  0,
            0, 150,  0,
            30,   0,  0,
            0, 150,  0,
            30, 150,  0,
            30,   0,  0,

            // top rung front
            30,   0,  0,
            30,  30,  0,
            100,   0,  0,
            30,  30,  0,
            100,  30,  0,
            100,   0,  0,

            // middle rung front
            30,  60,  0,
            30,  90,  0,
            67,  60,  0,
            30,  90,  0,
            67,  90,  0,
            67,  60,  0,

            // left column back
              0,   0,  30,
             30,   0,  30,
              0, 150,  30,
              0, 150,  30,
             30,   0,  30,
             30, 150,  30,

            // top rung back
             30,   0,  30,
            100,   0,  30,
             30,  30,  30,
             30,  30,  30,
            100,   0,  30,
            100,  30,  30,

            // middle rung back
             30,  60,  30,
             67,  60,  30,
             30,  90,  30,
             30,  90,  30,
             67,  60,  30,
             67,  90,  30,

            // top
              0,   0,   0,
            100,   0,   0,
            100,   0,  30,
              0,   0,   0,
            100,   0,  30,
              0,   0,  30,

            // top rung right
            100,   0,   0,
            100,  30,   0,
            100,  30,  30,
            100,   0,   0,
            100,  30,  30,
            100,   0,  30,

            // under top rung
            30,   30,   0,
            30,   30,  30,
            100,  30,  30,
            30,   30,   0,
            100,  30,  30,
            100,  30,   0,

            // between top rung and middle
            30,   30,   0,
            30,   60,  30,
            30,   30,  30,
            30,   30,   0,
            30,   60,   0,
            30,   60,  30,

            // top of middle rung
            30,   60,   0,
            67,   60,  30,
            30,   60,  30,
            30,   60,   0,
            67,   60,   0,
            67,   60,  30,

            // right of middle rung
            67,   60,   0,
            67,   90,  30,
            67,   60,  30,
            67,   60,   0,
            67,   90,   0,
            67,   90,  30,

            // bottom of middle rung.
            30,   90,   0,
            30,   90,  30,
            67,   90,  30,
            30,   90,   0,
            67,   90,  30,
            67,   90,   0,

            // right of bottom
            30,   90,   0,
            30,  150,  30,
            30,   90,  30,
            30,   90,   0,
            30,  150,   0,
            30,  150,  30,

            // bottom
            0,   150,   0,
            0,   150,  30,
            30,  150,  30,
            0,   150,   0,
            30,  150,  30,
            30,  150,   0,

            // left side
            0,   0,   0,
            0,   0,  30,
            0, 150,  30,
            0,   0,   0,
            0, 150,  30,
            0, 150,   0,
      ],
      color: {
        numComponents: 3,
        data: new Uint8Array([
              // left column front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

              // top rung front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

              // middle rung front
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,
            200,  70, 120,

              // left column back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

              // top rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

              // middle rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

              // top
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,

              // top rung right
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,

              // under top rung
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,

              // between top rung and middle
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,

              // top of middle rung
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,

              // right of middle rung
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,

              // bottom of middle rung.
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,

              // right of bottom
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,

              // bottom
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,

              // left side
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
        ]),
      },
    });


    // pre-allocate a bunch of arrays
    const projection = new Float32Array(16);
    const exampleProjection = new Float32Array(16);
    const exampleInverseProjection = new Float32Array(16);
    const view = new Float32Array(16);
    const world = new Float32Array(16);
    const viewProjection = new Float32Array(16);
    const eyePosition = new Float32Array([31, 17, 15]);
    const worldViewProjection = new Float32Array(16);
    const exampleWorldViewProjection = new Float32Array(16);
    const target = new Float32Array([23, 16, 0]);
    const up = new Float32Array([0, 1, 0]);
    const v3t0 = new Float32Array(3);
    const zeroMat = new Float32Array(16);

    const targetToEye = new Float32Array(3);
    v3.subtract(eyePosition, target, targetToEye);

    // uniforms.
    const sharedUniforms = {
    };

    const sceneCubeUniforms = {
      u_color: [1, 1, 1, 1],
      u_worldViewProjection: worldViewProjection,
      u_exampleWorldViewProjection: exampleWorldViewProjection,
    };

    const frustumCubeUniforms = {
      u_color: [1, 1, 1, 0.4],
      u_worldViewProjection: worldViewProjection,
      u_exampleWorldViewProjection: zeroMat,
    };

    const cubeRaysUniforms = {
      u_color: colors.lines,
      u_worldViewProjection: worldViewProjection,
    };

    const wireFrustumUniforms = {
      u_color: colors.lines,
      u_worldViewProjection: worldViewProjection,
    };

    const settings = {
      zNear: showCubes ? 10 : 17,
      zFar: showCubes ? 50 : 75,
      fieldOfView: showCubes ? 30 : 45,
      translation: [-5.2, 0, -25],
      rotation: [degToRad(225), degToRad(0), degToRad(320)],
    };
    //const converters = {
    //  to: radToDeg,
    //  from: v => [true, degToRad(v)],
    //};

    if (showCubes) {
      const gui = new GUI(uiElem);
      GUI.setTheme('float');
      gui.add(settings, 'fieldOfView', {min: 1, max: 179, step: 1 });
      gui.add(settings, 'zNear', {min: 1, max: 50});
      gui.add(settings, 'zFar', {min: 1, max: 50});
      gui.add(settings.translation, '2', {min: -60, max: 0}).name('zPosition');
    } else {
      //const gui = new GUI(uiElem);
      //const mapRange = (v, inMin, inMax, outMin, outMax) => (v - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
      //const posConverter = {
      //  to: v => mapRange(v, -11, -75, -1400, 1000),
      //  from: v => [true, mapRange(v, -1400, 1000, -11, -75)],
      //};

      //gui.add(settings, 'fieldOfView', {min: 1, max: 179, step: 1 });
      //gui.add(settings, 'zNear', {min: 1, max: 50});
      //gui.add(settings, 'zFar', {min: 1, max: 150});
      //gui.add(settings.translation, '0', {min: -13, max: 13});
      //gui.add(settings.translation, '1', {min: -13, max: 13});
      //gui.add(settings.translation, '2', {min: -1400, max: 1000, converters: posConverter})
      //    .name('translationZ')
      //    .onChange(() => console.log(settings.translation[2]));
      // gui.add(settings.rotation, '0', {min: 0, max: 360, converters});
      // gui.add(settings.rotation, '1', {min: 0, max: 360, converters});
      // gui.add(settings.rotation, '2', {min: 0, max: 360, converters});
    }

    function render(time) {
      time *= 0.001;
      const { zNear, zFar, fieldOfView, translation } = settings;

      twgl.resizeCanvasToDisplaySize(canvas, devicePixelRatio);
      const height = gl.canvas.height;
      const halfHeight = height / 2;
      const width = gl.canvas.width;

      // clear the screen.
      gl.disable(gl.SCISSOR_TEST);
      gl.colorMask(true, true, true, true);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      if (showCubes) {
        gl.viewport(0, halfHeight, width, halfHeight);
      } else {
        gl.viewport(0, 0, width, height);
      }

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const aspect = showCubes
          ? gl.canvas.clientWidth / (gl.canvas.clientHeight / 2)
          : gl.canvas.clientWidth / gl.canvas.clientHeight;

      m4.perspective(
          degToRad(60),
          aspect,
          1,
          5000,
          projection);

      let f = Math.max(30, fieldOfView) - 30;
      f = f / (179 - 30);
      f = f * f * f * f;
      f = lerp(1, 179 * 0.9, f);
      f = 1;
      v3.mulScalar(targetToEye, f, v3t0);
      v3.add(v3t0, target, v3t0);
      m4.lookAt(
          v3t0, //eyePosition,
          target,
          up,
          view);
      m4.inverse(view, view);
      m4.multiply(projection, view, viewProjection);

      // Draw scene
      function drawScene(viewProjection, exampleProjection) {
        gl.useProgram(colorProgramInfo.program);

        if (showCubes) {
          twgl.setBuffersAndAttributes(gl, colorProgramInfo, cubeBufferInfo);
          const cubeScale = scale * 3;
          for (let ii = -1; ii <= 1; ++ii) {
            m4.translation([ii * 10, 0, translation[2]], world);
            m4.rotateY(world, time + ii * Math.PI / 6, world);
            m4.rotateX(world, Math.PI / 4, world);
            m4.rotateZ(world, Math.PI / 4, world);
            m4.scale(world, [cubeScale, cubeScale, cubeScale], world);
            m4.multiply(viewProjection, world, worldViewProjection);

            m4.multiply(exampleProjection, world, exampleWorldViewProjection);

            twgl.setUniforms(colorProgramInfo, sceneCubeUniforms);
            twgl.drawBufferInfo(gl, cubeBufferInfo);
          }
        } else {
          const rotation = settings.rotation; //[degToRad(40), degToRad(25), degToRad(325)];
          const fScale = 12 / 150;
          const t = translation.slice();
          t[2] += Math.sin(time * 0.5) * 6 + 8;
          m4.translation(t, world);
          m4.rotateX(world, rotation[0], world);
          m4.rotateY(world, rotation[1], world);
          m4.rotateZ(world, rotation[2], world);
          m4.scale(world, [fScale, fScale, fScale], world);
          m4.multiply(viewProjection, world, worldViewProjection);
          m4.multiply(exampleProjection, world, exampleWorldViewProjection);
          twgl.setBuffersAndAttributes(gl, colorProgramInfo, fBufferInfo);
          twgl.setUniforms(colorProgramInfo, sceneCubeUniforms);
          twgl.drawBufferInfo(gl, fBufferInfo);
        }
      }
      drawScene(viewProjection, exampleProjection);

      // Draw Frustum Cube behind
      function drawFrustumCube() {
        gl.useProgram(colorProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, colorProgramInfo, cubeBufferInfo);
        m4.perspective(
            degToRad(fieldOfView),
            aspect,
            zNear,
            zFar * scale,
            exampleProjection);
        m4.inverse(exampleProjection, exampleInverseProjection);

        m4.translation([0, 0, 0], world);
        m4.multiply(exampleInverseProjection, world, world);
        m4.scale(world, [scale, scale, scale], world);
        m4.multiply(viewProjection, world, worldViewProjection);

        twgl.setUniforms(colorProgramInfo, sharedUniforms);
        twgl.setUniforms(colorProgramInfo, frustumCubeUniforms);
        twgl.drawBufferInfo(gl, cubeBufferInfo);
      }
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      drawFrustumCube();
      gl.disable(gl.CULL_FACE);

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);
      gl.disable(gl.CULL_FACE);

      // Draw view cone.
      m4.perspective(
          degToRad(fieldOfView),
          aspect,
          1,
          5000,
          exampleProjection);
      m4.inverse(exampleProjection, exampleInverseProjection);

      m4.translation([0, 0, 0], world);
      m4.multiply(world, exampleInverseProjection, world);
      m4.scale(world, [scale, scale, scale], world);
      m4.multiply(viewProjection, world, worldViewProjection);

      gl.useProgram(vertexColorProgramInfo.program);
      twgl.setBuffersAndAttributes(gl, vertexColorProgramInfo, cubeRaysBufferInfo);
      twgl.setUniforms(vertexColorProgramInfo, sharedUniforms);
      twgl.setUniforms(vertexColorProgramInfo, cubeRaysUniforms);
      twgl.drawBufferInfo(gl, cubeRaysBufferInfo, gl.LINES);

      {
        const eyePosition = m4.transformPoint(worldViewProjection, [0, 0, 0]);
        const ex = (eyePosition[0] *  .5 + .5) * width / devicePixelRatio;
        const ey = (eyePosition[1] * -.5 + .5) * (showCubes ? halfHeight : height) / devicePixelRatio;
        const rect = eyeElem.getBoundingClientRect();
        eyeElem.style.left = px(ex - rect.width - 6);
        eyeElem.style.top = px(ey - rect.height / 4 + 4);
      }

      // Draw Frustum Wire
      m4.perspective(
          degToRad(fieldOfView),
          aspect,
          zNear,
          zFar * scale,
          exampleProjection);
      m4.inverse(exampleProjection, exampleInverseProjection);

      m4.translation([0, 0, 0], world);
      m4.multiply(world, exampleInverseProjection, world);
      m4.scale(world, [scale, scale, scale], world);
      m4.multiply(viewProjection, world, worldViewProjection);

      twgl.setBuffersAndAttributes(gl, vertexColorProgramInfo, wireCubeBufferInfo);
      twgl.setUniforms(vertexColorProgramInfo, sharedUniforms);
      twgl.setUniforms(vertexColorProgramInfo, wireFrustumUniforms);
      twgl.drawBufferInfo(gl, wireCubeBufferInfo, gl.LINES);

      if (showCubes) {
        // Draw 3D view
        gl.enable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, width, halfHeight);
        gl.scissor(0, 0, width, halfHeight);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        m4.perspective(
            degToRad(fieldOfView),
            aspect,
            zNear,
            zFar * scale,
            projection);
        drawScene(exampleProjection, zeroMat);
      }
    }

    createRequestAnimationFrameLoop(gl.canvas, render);
  }

  function px(v) {
    return `${v | 0}px`;
  }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  //function radToDeg(rad) {
  //  return rad * 180 / Math.PI;
  //}

  function lerp(a, b, l) {
     return a + (b - a) * l;
  }

  renderDiagrams({
    'z-clipping': (elem) => {
      setupF(elem, fVertBuffers);
    },
    'f-frustum-diagram': (elem) => {
      frustumDiagram(elem, false);
    },
    'frustum-diagram': (elem) => {
      frustumDiagram(elem, true);
    },
  });
}

main();
