import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el
} from './resources/elem.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import * as wgh from '../../3rdparty/webgpu-utils-1.x.module.js';
import { mat4 } from '../../3rdparty/wgpu-matrix.module.js';

async function visualizeTextureCoords(elem, bad) {
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
  struct Uniforms {
    world: mat4x4f,
  };

  struct SharedUniforms {
    viewProjection: mat4x4f,
  };

  @group(0) @binding(0) var<uniform> uni: Uniforms;
  @group(0) @binding(1) var<uniform> sharedUni: SharedUniforms;

  struct MyVSInput {
      @location(0) position: vec4f,
      @location(2) texcoord: vec2f,
  };

  struct MyVSOutput {
    @builtin(position) position: vec4f,
    @location(1) texcoord: vec2f,
  };

  @vertex
  fn myVSMain(v: MyVSInput) -> MyVSOutput {
    var vsOut: MyVSOutput;
    vsOut.position = sharedUni.viewProjection * uni.world * v.position;
    vsOut.texcoord = v.texcoord;
    return vsOut;
  }

  @fragment
  fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
    return vec4f(fract(v.texcoord), 0, 1);
  }
  `;

  const geometries = [
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createSphereVertices()),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createTorusVertices()),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createCubeVertices({size: 1.5})),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createCylinderVertices()),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createPlaneVertices({width: 1.5, depth: 1.5})),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createDiscVertices()),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createTruncatedConeVertices()),
  ];

  const module = device.createShaderModule({code});

  const bufferLayouts =  geometries[0].bufferLayouts;
  if (bad) {
    bufferLayouts[0].attributes[2].format = 'float16x2';
  }

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'myVSMain',
      buffers: bufferLayouts,
    },
    fragment: {
      module,
      entryPoint: 'myFSMain',
      targets: [
        {format: presentationFormat},
      ],
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  const defs = wgh.makeShaderDataDefinitions(code);
  const sharedUniformValues = wgh.makeStructuredView(defs.uniforms.sharedUni);

  const sharedUniformBuffer = device.createBuffer({
    size: sharedUniformValues.arrayBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const objectInfos = [];
  for (let i = 0; i < geometries.length; ++i) {
    const uniformView = wgh.makeStructuredView(defs.uniforms.uni);
    const uniformBuffer = device.createBuffer({
      size: uniformView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(uniformBuffer, 0, uniformView.arrayBuffer);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: sharedUniformBuffer } },
      ],
    });

    objectInfos.push({
      uniformView,
      uniformBuffer,
      bindGroup,
      geometry: geometries[i],
    });
  }

  const renderPassDescriptor = {
    colorAttachments: [
      {
        // view: undefined, // Assigned later
        clearValue: [ 0.2, 0.2, 0.2, 1.0 ],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: undefined,  // Assigned later
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  let depthTexture;

  function render(time) {
    time *= 0.001;

    const s = objectInfos.length;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.ortho(-s, s, -s / aspect, s / aspect, -5, 5);
    const eye = [0, 0, 1];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const view = mat4.lookAt(eye, target, up);
    mat4.multiply(projection, view, sharedUniformValues.views.viewProjection);

    device.queue.writeBuffer(sharedUniformBuffer, 0, sharedUniformValues.arrayBuffer);

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

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    objectInfos.forEach(({
      bindGroup,
      geometry,
      uniformBuffer,
      uniformView,
    }, i) => {
      const world = uniformView.views.world;
      mat4.identity(world);
      const across = Math.ceil(objectInfos.length / 2);
      const down = Math.ceil(objectInfos.length / across);
      const u = (i % across) / (across - 1);
      const v = Math.floor((i / across)) / (down - 1);
      const x = (u * 2 - 1) * across * 1.2;
      const y = (v * 2 - 1) * -1.5;
      mat4.translate(world, [x, y, 0], world);
      mat4.rotateX(world, time * 0.1367 + i, world);
      mat4.rotateY(world, time * 0.1267 + i, world);

      device.queue.writeBuffer(uniformBuffer, 0, uniformView.arrayBuffer);

      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.setVertexBuffer(0, geometry.buffers[0]);
      if (geometry.indexBuffer) {
        passEncoder.setIndexBuffer(geometry.indexBuffer, geometry.indexFormat);
        passEncoder.drawIndexed(geometry.numElements);
      } else {
        passEncoder.draw(geometry.numElements);
      }
    });
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
  createRequestAnimationFrameLoop(canvas, render);

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


async function main() {
  renderDiagrams({
    'texcoords': elem => visualizeTextureCoords(elem),
    'texcoords-bad': elem => visualizeTextureCoords(elem, true),
  });
}

main();
