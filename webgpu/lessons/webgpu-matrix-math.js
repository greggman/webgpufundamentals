import {
  makeShaderDataDefinitions,
} from '../../3rdparty/webgpu-utils-1.x.module.js';
import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createByteDiagramForType,
} from './resources/data-byte-diagram.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import {
  createElem as el
} from './resources/elem.js';
import {
  mat3,
  vec2,
} from '../../3rdparty/wgpu-matrix.module.js';
import {
  hsla,
} from './resources/utils.js';

const degToRad = d => d * Math.PI / 180;

function mat3Projection(width, height) {
  // Note: This matrix flips the Y axis so that 0 is at the top.
  return [
    2 / width, 0, 0, 0,
    0, -2 / height, 0, 0,
    -1, 1, 1, 0,
  ];
}

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
        color: vec4f,
        resolution: vec2f,
        matrix: mat3x3f,
      };

      struct Vertex {
        @location(0) position: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;

        // Multiply by a matrix
        let position = (uni.matrix * vec3f(vert.position, 1)).xy;

        // convert the position from pixels to a 0.0 to 1.0 value
        let zeroToOne = position / uni.resolution;

        // convert from 0 <-> 1 to 0 <-> 2
        let zeroToTwo = zeroToOne * 2.0;

        // covert from 0 <-> 2 to -1 <-> +1 (clip space)
        let flippedClipSpace = zeroToTwo - 1.0;

        // flip Y
        let clipSpace = flippedClipSpace * vec2f(1, -1);

        vsOut.position = vec4f(clipSpace, 0.0, 1.0);
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return uni.color;
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'just 2d position',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (2) * 4, // (2) floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  const { vertexData, indexData, numVertices } = createFVertices();
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

  function spaceChangeDiagram(elem, stage) {
    const ctx = el('canvas', {
      className: 'fill-container',
      style: {
        height: '400px',
        backgroundColor: 'white',
      },
    }).getContext('2d');
    elem.appendChild(ctx.canvas);

    const fPoints = [
      // left column
      [ 0, 0, ],
      [ 30, 0, ],
      [ 0, 150, ],
      [ 0, 150, ],
      [ 30, 0, ],
      [ 30, 150, ],

      // top rung
      [ 30, 0, ],
      [ 100, 0, ],
      [ 30, 30, ],
      [ 30, 30, ],
      [ 100, 0, ],
      [ 100, 30, ],

      // middle rung
      [ 30, 60, ],
      [ 67, 60, ],
      [ 30, 90, ],
      [ 30, 90, ],
      [ 67, 60, ],
      [ 67, 90, ],
    ];

    function render(time) {
      time *= 0.001; // seconds

      ctx.canvas.width = ctx.canvas.clientWidth * devicePixelRatio;
      ctx.canvas.height = ctx.canvas.clientHeight * devicePixelRatio;
      //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const width = ctx.canvas.clientWidth;
      const height = ctx.canvas.clientHeight;

      ctx.font = '8pt monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = hsla(.66, 1, .5, .25);
      ctx.fillRect(0, 0, width, height * .25);
      ctx.fillRect(0, height * .25, width * .25, height * .5);
      ctx.fillRect(0, height * .75, width, height * .25);
      ctx.fillRect(width * .75, height * .25, width * .25, height * .5);


      let matrix = [
        width * .25, 0, 0, 0,
        0, height * -.25, 0, 0,
        width * .5, height * .5, 1, 0,
      ];

      const tx = 150;
      const ty = 100;
      const angle = 33 * Math.PI / 180;
      const sx = 2;
      const sy = 1.5;

      const t2 = time % 16 / 16;
      const t = easeInOutSine(1 - Math.pow(1 - t2, 4));
      const projection = mat3Projection(width, height);
      const translation = mat3.translation([tx, ty]);
      const rotation = mat3.rotation(angle);
      const scale = mat3.scaling([sx, sy]);

      matrix = mat3.multiply(matrix, lerpMatrix(mat3.identity(), projection, stageAmount(1, stage, t)));
      matrix = mat3.multiply(matrix, lerpMatrix(mat3.identity(), translation, stageAmount(2, stage, t)));
      matrix = mat3.multiply(matrix, lerpMatrix(mat3.identity(), rotation, stageAmount(3, stage, t)));
      matrix = mat3.multiply(matrix, lerpMatrix(mat3.identity(), scale, stageAmount(4, stage, t)));

      // draw f
      ctx.fillStyle = hsla(.33, 1, .5, .3);
      ctx.strokeStyle = hsla(.33, 1, .3, 1);

      for (let i = 0; i < fPoints.length; i += 3) {
        const p0 = vec2.transformMat3(fPoints[i + 0], matrix);
        const p1 = vec2.transformMat3(fPoints[i + 1], matrix);
        const p2 = vec2.transformMat3(fPoints[i + 2], matrix);

        ctx.beginPath();
        ctx.moveTo(...p0);
        ctx.lineTo(...p1);
        ctx.lineTo(...p2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      function stageAmount(stage, actualStage, t) {
        if (actualStage < stage) {
          return 0;
        }
        if (actualStage > stage) {
          return 1;
        }
        return t;
      }

      // const minDimension = Math.min(width, height);
      // const maxDimension = Math.max(width, height);
      const dimension = [width, height];

      {
        ctx.lineWidth = 1;
        for (let axis = 0; axis < 2; ++axis) {
          const p0 = vec2.transformMat3([0, 0], matrix);
          const p1 = vec2.transformMat3(makeAxisPoint(.02, 0, axis), matrix);
          const d = vec2.distance(p0, p1);
          const step = Math.pow(10, -Math.trunc(Math.log10(d)));
          const p2 = vec2.transformMat3(makeAxisPoint(step, 0, axis), matrix);
          const gridDist = vec2.distance(p0, p2);
          const alpha = rangeLerp(0, 4, 10, dimension[axis], gridDist);
          ctx.strokeStyle = hsla(0, 0, 0, alpha);
          drawGridLines(ctx, matrix, step * -1000, step * 1000, step, axis);
          if (alpha < 1) {
            ctx.strokeStyle = hsla(0, 0, 0, 1);
            drawGridLines(ctx, matrix, step * -10000, step * 10000, step * 10, axis);
          }
        }
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = hsla(1, 1, 0.5, 1);
      drawAxis(ctx, matrix, -1000, 1000);

      {
        ctx.fillStyle = hsla(0, 0, 0, 1);
        ctx.lineWidth = 4;
        ctx.strokeStyle = hsla(0, 1, .5, 1);

        for (let axis = 0; axis < 2; ++axis) {
          const p0 = vec2.transformMat3([0, 0], matrix);
          const p1 = vec2.transformMat3(makeAxisPoint(.002, 0, axis), matrix);
          const d = vec2.distance(p0, p1);
          const step = Math.pow(10, -Math.trunc(getBaseLog(10, d)));
          const p2 = vec2.transformMat3(makeAxisPoint(step, 0, axis), matrix);
          const gridDist = vec2.distance(p0, p2);
          const div = Math.pow(2, Math.floor(Math.log2(gridDist / 50)));
          const alpha = rangeLerp(0, 1, 50, 70, gridDist);
          drawCoordsAxis(ctx, matrix, step * -1000, step * 1000, step / div, axis, alpha);
        }
      }

      ctx.restore();
    }
    createRequestAnimationFrameLoop(ctx.canvas, render);
}

function easeInOutSine(pos) {
  return (-0.5 * (Math.cos(Math.PI * pos) - 1));
}


function lerp(a, b, l) {
  return a + (b - a) * l;
}

function lerpMatrix(a, b, l) {
  return a.map((v, ndx) => {
    return lerp(v, b[ndx], l);
  });
}

function rangeLerp(a, b, min, max, l) {
  const range = max - min;
  return clamp(a, b, lerp(a, b, (l - min) / range));
}

function drawAxis(ctx, matrix, min, max) {
  ctx.beginPath();

  ctx.moveTo(...transformPoint(matrix, [min, 0]));
  ctx.lineTo(...transformPoint(matrix, [max, 0]));
  ctx.moveTo(...transformPoint(matrix, [0, min]));
  ctx.lineTo(...transformPoint(matrix, [0, max]));

  ctx.stroke();
}

function drawGridLines(ctx, matrix, min, max, step, axis) {
  ctx.beginPath();
  for (let y = min; y <= max; y += step) {
    const p = [];
    p[axis] = y;
    p[1 - axis] = min;
    ctx.moveTo(...transformPoint(matrix, p));
    p[1 - axis] = max;
    ctx.lineTo(...transformPoint(matrix, p));
  }
  ctx.stroke();
}

function drawCoordsAxis(ctx, matrix, min, max, step, axis, alpha) {
  let count = 0;
  for (let y = min; y <= max; y += step) {
    const i = makeAxisPoint(y, 0, axis);
    const p = vec2.transformMat3(i, matrix);
    const a = count % 2 ? alpha : 1;
    if (a > 0 &&
        p[0] > -50 && p[0] < ctx.canvas.width  + 50 &&
        p[1] > -50 && p[1] < ctx.canvas.height + 50) {
      ctx.save();
      ctx.translate(...p);
      ctx.fillStyle = hsla(0, 0, 0, a);
      ctx.strokeStyle = hsla(0, 1, 1, a * .5);
      ctx.rotate(Math.atan2(matrix[1], matrix[0]));
      drawOutlineText(ctx, `${i[0]},${i[1]}`, 0, 0);
      ctx.restore();
    }
    ++count;
  }
}

function drawOutlineText(ctx, s, x, y) {
  const m = ctx.measureText(s);
  const w = m.width / 2 / window.devicePixelRatio + 10;
  const offx = x + w;   // x + (x > ctx.canvas.width  / 2 / window.devicePixelRatio ? -w : w);
  const offy = y + 12;  // y + (y > ctx.canvas.height / 2 / window.devicePixelRatio ? -12 : 12);
  ctx.strokeText(s, offx, offy);
  ctx.fillText(s, offx, offy);
}

function getBaseLog(x, y) {
  return Math.log(y) / Math.log(x);
}

function makeAxisPoint(x, y, axis) {
  const p = [];
  p[axis] = x;
  p[1 - axis] = y;
  return p;
}

function clamp(min, max, v) {
  return Math.min(max, Math.max(min, v));
}

function transformPoint(matrix, p) {
  p = vec2.transformMat3(p, matrix);
  const result = [
    p[0] | 0,
    p[1] | 0,
  ];
  return result;
}


  renderDiagrams({
    mat3x3f(elem) {
      const wgsl = `
        @group(0) @binding(0) var<uniform> foo: mat3x3f;
      `;
      const defs = makeShaderDataDefinitions(wgsl);
      elem.appendChild(createByteDiagramForType('mat3x3f', defs.uniforms.foo.typeDefinition));
    },
    trs(elem) {
      setupF(elem, (settings) => {
        const translationMatrix = mat3.translation(settings.translation);
        const rotationMatrix = mat3.rotation(settings.rotation);
        const scaleMatrix = mat3.scaling(settings.scale);

        let matrix = mat3.multiply(translationMatrix, rotationMatrix);
        matrix = mat3.multiply(matrix, scaleMatrix);
        return matrix;
      });
    },
    srt(elem) {
      setupF(elem, (settings) => {
        const translationMatrix = mat3.translation(settings.translation);
        const rotationMatrix = mat3.rotation(settings.rotation);
        const scaleMatrix = mat3.scaling(settings.scale);

        let matrix = mat3.multiply(scaleMatrix, rotationMatrix);
        matrix = mat3.multiply(matrix, translationMatrix);
        return matrix;
      });
    },
    'space-change-0': (elem) => {
      spaceChangeDiagram(elem, 0);
    },
    'space-change-1': (elem) => {
      spaceChangeDiagram(elem, 1);
    },
    'space-change-2': (elem) => {
      spaceChangeDiagram(elem, 2);
    },
    'space-change-3': (elem) => {
      spaceChangeDiagram(elem, 3);
    },
    'space-change-4': (elem) => {
      spaceChangeDiagram(elem, 4);
    },
  });
}

main();



