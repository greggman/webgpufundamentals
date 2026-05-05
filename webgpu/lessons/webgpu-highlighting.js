import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createElem as el
} from './resources/js/elem.js';
import {mat4} from '/3rdparty/wgpu-matrix.module.js';
import GUI from '../../3rdparty/muigui-0.x.module.js';

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

let device;
let render;
const canvasToSettings = new Map();

function createCubeVertices() {
  const positions = [
    // left
    0, 0,  0,
    0, 0, -1,
    0, 1,  0,
    0, 1, -1,

    // right
    1, 0,  0,
    1, 0, -1,
    1, 1,  0,
    1, 1, -1,
  ];

  const indices = [
     0,  2,  1,    2,  3,  1,   // left
     4,  5,  6,    6,  5,  7,   // right
     0,  4,  2,    2,  4,  6,   // front
     1,  3,  5,    5,  3,  7,   // back
     0,  1,  4,    4,  1,  5,   // bottom
     2,  6,  3,    3,  6,  7,   // top
  ];

  const quadColors = [
      200,  70, 120,  // left column front
       80,  70, 200,  // left column back
       70, 200, 210,  // top
      160, 160, 220,  // top rung right
       90, 130, 110,  // top rung bottom
      200, 200,  70,  // between top and middle rung
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

const degToRad = d => d * Math.PI / 180;

class SceneGraphNode {
  constructor(name, source) {
    this.name = name;
    this.children = [];
    this.localMatrix = mat4.identity();
    this.worldMatrix = mat4.identity();
    this.source = source;
  }

  addChild(child) {
    child.setParent(this);
  }

  removeChild(child) {
    child.setParent(null);
  }

  setParent(parent) {
    // remove us from our parent
    if (this.parent) {
      const ndx = this.parent.children.indexOf(this);
      if (ndx >= 0) {
        this.parent.children.splice(ndx, 1);
      }
    }

    // Add us to our new parent
    if (parent) {
      parent.children.push(this);
    }
    this.parent = parent;
  }

  updateWorldMatrix() {
    // update the local matrix from its source if it has one.
    this.source?.getMatrix(this.localMatrix);

    if (this.parent) {
      // we have a parent do the math
      mat4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    } else {
      // we have no parent so just copy local to world
      mat4.copy(this.localMatrix, this.worldMatrix);
    }

    // now process all the children
      this.children.forEach(function(child) {
      child.updateWorldMatrix();
    });
  }
}

class TRS {
  constructor({
    translation = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  } = {}) {
     this.translation = new Float32Array(translation);
     this.rotation = new Float32Array(rotation);
     this.scale = new Float32Array(scale);
  }

  getMatrix(dst) {
   mat4.translation(this.translation, dst);
   mat4.rotateX(dst, this.rotation[0], dst);
   mat4.rotateY(dst, this.rotation[1], dst);
   mat4.rotateZ(dst, this.rotation[2], dst);
   mat4.scale(dst, this.scale, dst);
   return dst;
 }
}

async function setup() {
  const adapter = await navigator.gpu?.requestAdapter();
  device = await adapter?.requestDevice();
  if (!device) {
    return;
  }

  const module = device.createShaderModule({
    code: /* wgsl */ `
      struct Uniforms {
        matrix: mat4x4f,
        color: vec4f,
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
    label: '2 attributes with color',
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
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
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
        vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
        return vsOutput;
      }

      @group(0) @binding(0) var mask: texture_2d<f32>;

      fn isOnEdge(pos: vec2i) -> bool {
        // Note: we need to make sure we don't use out of bounds
        // texel coordinates with textureLoad as that returns
        // different results on different GPUs
        let size = vec2i(textureDimensions(mask, 0));
        let start = max(pos - 2, vec2i(0));
        let end = min(pos + 2, size);

        for (var y = start.y; y <= end.y; y++) {
          for (var x = start.x; x <= end.x; x++) {
            let s = textureLoad(mask, vec2i(x, y), 0).a;
            if (s > 0) {
              return true;
            }
          }
        }
        return false;
      };

      @fragment fn fs2dOutline(fsInput: VSOutput) -> @location(0) vec4f {
        let pos = vec2i(fsInput.position.xy);

        // Get the current texel.
        // If it's not 0 we're inside the selected objects
        let s = textureLoad(mask, pos, 0).a;
        if (s > 0) {
          discard;
        }

        let hit = isOnEdge(pos);
        if (!hit) {
          discard;
        }
        return vec4f(1, 0.5, 0, 1);
      }

      @fragment fn fs2dSolid(fsInput: VSOutput) -> @location(0) vec4f {
        let pos = vec2i(fsInput.position.xy);

        // get the current. If it's not 0 we're inside the selected objects
        let s = textureLoad(mask, pos, 0).a;
        if (s > 0) {
          return vec4f(1);
        } else {
          return vec4f(0);
        }
      }
    `,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const postProcessPipelineOutline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      entryPoint: 'fs2dOutline',
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessPipelineSolid = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      entryPoint: 'fs2dSolid',
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      { loadOp: 'clear', storeOp: 'store' },
    ],
  };

  let postProcessBindGroup;
  let lastPostProcessTexture;

  function setupPostProcess(texture) {
    if (!postProcessBindGroup || texture !== lastPostProcessTexture) {
      lastPostProcessTexture = texture;
      postProcessBindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: texture },
        ],
      });
    }
  }

  function postProcess(encoder, srcTexture, dstTexture, postProcessPipeline) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture.createView();
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  function addTRSSceneGraphNode(
    name,
    parent,
    trs,
  ) {
    const node = new SceneGraphNode(name, new TRS(trs));
    if (parent) {
      node.setParent(parent);
    }
    return node;
  }

  function addCubeNode(name, parent, trs, color) {
    const node = addTRSSceneGraphNode(name, parent, trs);
    return addMesh(node, cubeVertices, color);
  }

  const objectInfos = [];
  function createObjectInfo() {
    // matrix and color
    const uniformBufferSize = (16 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;
    const kColorOffset = 16;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: uniformBuffer },
      ],
    });

    return {
      uniformBuffer,
      uniformValues,
      colorValue,
      matrixValue,
      bindGroup,
    };
  }

  const meshes = [];
  function addMesh(node, vertices, color) {
    const mesh = {
      node,
      vertices,
      color,
    };
    meshes.push(mesh);
    return mesh;
  }

  function createVertices({vertexData, numVertices}, name) {
    const vertexBuffer = device.createBuffer({
      label: `${name}: vertex buffer vertices`,
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    return {
      vertexBuffer,
      numVertices,
    };
  }
  const cubeVertices = createVertices(createCubeVertices(), 'cube');
  const kHandleColor = [0.5, 0.5, 0.5, 1];
  const kDrawerColor = [1, 1, 1, 1];
  const kCabinetColor = [0.75, 0.75, 0.75, 0.75];
  const kNumDrawersPerCabinet = 4;
  const kNumCabinets = 5;

  const kDrawerSize = [40, 30, 50];
  const kHandleSize = [10, 2, 2];

  const [kWidth, kHeight, kDepth] = [0, 1, 2];

  const kHandlePosition = [
    (kDrawerSize[kWidth] - kHandleSize[kWidth]) / 2,
    kDrawerSize[kHeight] * 2 / 3,
    kHandleSize[kDepth],
  ];

  const kDrawerSpacing = kDrawerSize[kHeight] + 3;
  const kCabinetSpacing = kDrawerSize[kWidth] + 10;

  function addDrawer(parent, drawerNdx) {
    const drawerName = `drawer${drawerNdx}`;

    // add a node for the entire drawer
    const drawer = addTRSSceneGraphNode(
      drawerName, parent, {
        translation: [3, drawerNdx * kDrawerSpacing + 5, 1],
      });

    // add a node with a cube for the drawer cube.
    addCubeNode(`${drawerName}-drawer-mesh`, drawer, {
      scale: kDrawerSize,
    }, kDrawerColor);

    // add a node with a cube for the handle
    addCubeNode(`${drawerName}-handle-mesh`, drawer, {
      translation: kHandlePosition,
      scale: kHandleSize,
    }, kHandleColor);
  }

  function addCabinet(parent, cabinetNdx) {
    const cabinetName = `cabinet${cabinetNdx}`;

    // add a node for the entire cabinet
    const cabinet = addTRSSceneGraphNode(
      cabinetName, parent, {
         translation: [cabinetNdx * kCabinetSpacing, 0, 0],
       });

    // add a node with a cube for the cabinet
    const kCabinetSize = [
      kDrawerSize[kWidth] + 6,
      kDrawerSpacing * kNumDrawersPerCabinet + 6,
      kDrawerSize[kDepth] + 4,
    ];
    addCubeNode(
      `${cabinetName}-mesh`, cabinet, {
        scale: kCabinetSize,
      }, kCabinetColor);

    // Add the drawers
    for (let drawerNdx = 0; drawerNdx < kNumDrawersPerCabinet; ++drawerNdx) {
      addDrawer(cabinet, drawerNdx);
    }
  }

  const root = new SceneGraphNode('root');
  // Add cabinets
  for (let cabinetNdx = 0; cabinetNdx < kNumCabinets; ++cabinetNdx) {
    addCabinet(root, cabinetNdx);
  }

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

  let selectedMeshes = [];

  let depthTexture;
  let postTexture;
  let objectNdx = 0;


  function meshUsesNode(mesh, node) {
    if (!node) {
      return false;
    }
    if (mesh.node === node) {
      return true;
    }
    for (const child of node.children) {
      if (meshUsesNode(mesh, child)) {
        return true;
      }
    }
    return false;
  }

  {
    const node = root.children[1];
    selectedMeshes = meshes.filter(mesh => meshUsesNode(mesh, node));
  }


  function drawObject(ctx, vertices, matrix, color) {
    const { pass, viewProjectionMatrix } = ctx;
    const { vertexBuffer, numVertices } = vertices;
    if (objectNdx === objectInfos.length) {
      objectInfos.push(createObjectInfo());
    }
    const {
      matrixValue,
      colorValue,
      uniformBuffer,
      uniformValues,
      bindGroup,
    } = objectInfos[objectNdx++];

    mat4.multiply(viewProjectionMatrix, matrix, matrixValue);
    colorValue.set(color);

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices);
  }

  function makeNewTextureIfSizeDifferent(texture, size, format, usage) {
    if (!texture ||
        texture.width !== size.width ||
        texture.height !== size.height) {
      texture?.destroy();
      texture = device.createTexture({
        format,
        size,
        usage,
      });
    }
    return texture;
  }

  function drawMesh(ctx, mesh) {
    const { node, vertices, color } = mesh;
    drawObject(ctx, vertices, node.worldMatrix, color);
  }

  render = function render(canvas) {
    objectNdx = 0;

    const settings = canvasToSettings.get(canvas);

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const context = canvas.getContext('webgpu');
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

    // If we don't have a depth texture OR if its size is different
    // from the canvasTexture when make a new depth texture
    depthTexture = makeNewTextureIfSizeDifferent(
      depthTexture,
      canvasTexture, // for size
      'depth24plus',
      GPUTextureUsage.RENDER_ATTACHMENT,
    );
    renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(45), // fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    // Get the camera's position from the matrix we computed
    const cameraMatrix = mat4.identity();
    mat4.translate(cameraMatrix, [120, 0, 0], cameraMatrix);
    mat4.rotateY(cameraMatrix, settings.camera.cameraRotation, cameraMatrix);
    mat4.translate(cameraMatrix, [0, 70, 250], cameraMatrix);

    // Compute a view matrix
    const viewMatrix = mat4.inverse(cameraMatrix);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    const encoder = device.createCommandEncoder();

    const { mode } = settings;
    {
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);

      const ctx = { pass, viewProjectionMatrix };
      root.updateWorldMatrix();
      for (const mesh of meshes) {
        drawMesh(ctx, mesh);
      }

      pass.end();
    }

    if (mode === 'selected' || mode === 'alpha' || mode === 'outline') {
      postTexture = makeNewTextureIfSizeDifferent(
        postTexture,
        canvasTexture, // for size
        canvasTexture.format,
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
      );
      setupPostProcess(postTexture);

      switch (mode) {
        case 'selected':
          renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
          break;
        default:
          renderPassDescriptor.colorAttachments[0].view = postTexture.createView();
          break;
      }
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);

      const ctx = { pass, viewProjectionMatrix };
      for (const mesh of selectedMeshes) {
        drawMesh(ctx, mesh);
      }

      pass.end();

      switch (mode) {
        case 'alpha':
          postProcess(encoder, undefined, canvasTexture, postProcessPipelineSolid);
          break;
        case 'outline':
          postProcess(encoder, undefined, canvasTexture, postProcessPipelineOutline);
          break;
      }
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };
}

const readyP = setup();

const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const canvas = entry.target;
    const width = entry.contentBoxSize[0].inlineSize;
    const height = entry.contentBoxSize[0].blockSize;
    canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
    canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    render(canvas);
  }
});

async function waitForSetupAndStart(canvas) {
  await readyP;

  const context = canvas.getContext('webgpu');
  context.configure({
    format: presentationFormat,
    device,
    alphaMode: 'premultiplied',
  });

  observer.observe(canvas);
}

const radToDegOptions = { min: -180, max: 180, step: 1, converters: GUI.converters.radToDeg };

const camera = {
  cameraRotation: degToRad(-35),
};

async function setupHighlightDiagram(elem, settings) {
  const canvas = el('canvas');
  canvasToSettings.set(canvas, settings);

  const uiElem = el('div', { className: 'ui' });
  const gui = new GUI(uiElem);
  GUI.setTheme('float');
  gui.listen();
  gui.add(camera, 'cameraRotation', radToDegOptions);

  elem.append(el('div', { className: 'highlight'}, [
    canvas,
    uiElem,
  ]));
  await waitForSetupAndStart(canvas);
  gui.onChange(() => {
    for (const canvas of canvasToSettings.keys()) {
      render(canvas);
    }
  });
}

async function main() {
  renderDiagrams({
    standardPass: async(elem) => {
      await setupHighlightDiagram(elem, { mode: 'standard', camera });
    },
    selectedPass: async(elem) => {
      await setupHighlightDiagram(elem, { mode: 'selected', camera });
    },
    alpha: async(elem) => {
      await setupHighlightDiagram(elem, { mode: 'alpha', camera });
    },
    outline: async(elem) => {
      await setupHighlightDiagram(elem, { mode: 'outline', camera });
    },
  });
}

main();
