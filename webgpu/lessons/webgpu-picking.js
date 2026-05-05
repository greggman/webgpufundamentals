/* eslint-disable brace-style */
import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/js/good-raf.js';
import {
  createElem as el
} from './resources/js/elem.js';
import * as twgl from '../../3rdparty/twgl-full.module.js';
import * as wgh from '../../3rdparty/webgpu-utils-2.x.module.js';
import { mat4, vec3 } from '../../3rdparty/wgpu-matrix.module.js';

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

async function idRender(elem) {
  const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: 'compatibility',
  });
  const device = await adapter?.requestDevice();
  if (!device) {
    return;
  }

  const canvas = el('canvas', {className: 'id-render'});

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
    color: vec4f,
    id: u32,
  };

  struct SharedUniforms {
    viewProjection: mat4x4f,
    lightDirection: vec3f,
  };

  @group(0) @binding(0) var<uniform> uni: Uniforms;
  @group(0) @binding(1) var<uniform> sharedUni: SharedUniforms;

  struct MyVSInput {
      @location(0) position: vec4f,
      @location(1) normal: vec3f,
      @location(2) texcoord: vec2f,
  };

  struct MyVSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) texcoord: vec2f,
  };

  @vertex
  fn myVSMain(v: MyVSInput) -> MyVSOutput {
    var vsOut: MyVSOutput;
    vsOut.position = sharedUni.viewProjection * uni.world * v.position;
    vsOut.normal = (uni.world * vec4f(v.normal, 0.0)).xyz;
    vsOut.texcoord = v.texcoord;
    return vsOut;
  }

  struct FOut {
    @location(0) color: vec4f,
    @location(1) id: vec4u,
  };

  @fragment
  fn myFSMain(v: MyVSOutput) -> FOut {
    let diffuseColor = uni.color;
    let a_normal = normalize(v.normal);
    let l = dot(a_normal, sharedUni.lightDirection) * 0.5 + 0.5;
    return FOut(
      vec4f(diffuseColor.rgb * l, diffuseColor.a),
      vec4u(uni.id),
    );
  }
  `;

  function facet(arrays) {
    const newArrays = wgh.primitives.deindex(arrays);
    newArrays.normal = wgh.primitives.generateTriangleNormals(wgh.makeTypedArrayFromArrayUnion(newArrays.position, 'position'));
    return newArrays;
  }

  const numInstances = 3;
  const geometries = [
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createCubeVertices({
      size: 2,
    })),
    wgh.createBuffersAndAttributesFromArrays(device, wgh.primitives.createSphereVertices({radius: 1.2})),
    wgh.createBuffersAndAttributesFromArrays(device, facet(wgh.primitives.createTruncatedConeVertices({
      topRadius: 0,
      bottomRadius: 2,
      height: 2,
      radialSubdivisions: 3,
    }))),
  ];

  const module = device.createShaderModule({code});

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'myVSMain',
      buffers: [
        ...geometries[0].bufferLayouts,
      ],
    },
    fragment: {
      module,
      entryPoint: 'myFSMain',
      targets: [
        {format: presentationFormat},
        {format: 'r32uint'},
      ],
    },
    primitive: {
      topology: 'triangle-list',
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

      @group(0) @binding(0) var idTexture: texture_2d<u32>;
      @group(0) @binding(1) var atlasTexture: texture_2d<f32>;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let pos = vec2i(fsInput.position.xy) / 16 * 16;
        let id = textureLoad(idTexture, pos + 8, 0).x;

        if (id == 0) {
          discard;
        }

        let px = vec2u(fsInput.position.xy) % 16 / 2;
        let tx = vec2u((id + 16) * 8, 0u);

        let c = textureLoad(atlasTexture, tx + px, 0);
        if (c.r < 0.01) {
          discard;
        }

        return c;
      }
    `,
  });

  const defs = wgh.makeShaderDataDefinitions(code);
  const sharedUniformValues = wgh.makeStructuredView(defs.uniforms.sharedUni);

  const atlasUrl = '/webgpu/lessons/resources/images/8bit-font.png';
  const atlasTexture = await wgh.createTextureFromImage(device, atlasUrl);

  const sharedUniformBuffer = device.createBuffer({
    size: sharedUniformValues.arrayBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const objectInfos = [];
  for (let i = 0; i < numInstances; ++i) {
    const uniformView = wgh.makeStructuredView(defs.uniforms.uni);
    const uniformBuffer = device.createBuffer({
      size: uniformView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    uniformView.views.color.set([i === 0 ? 1 : 0, i === 1 ? 0.5 : 0, i === 2 ? 1 : 0, 1]);
    uniformView.views.id.set([i + 1]);

    device.queue.writeBuffer(uniformBuffer, 0, uniformView.arrayBuffer);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: uniformBuffer  },
        { binding: 1, resource: sharedUniformBuffer  },
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
      {
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


  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: { module: postProcessModule, targets: [{ format: presentationFormat }]},
  });

  const postProcessRenderPassDescriptor = {
    colorAttachments: [
      {
        loadOp: 'load',
        storeOp: 'store',
      },
    ],
  };

  let postProcessBindGroup;
  let oldIdTexture;
  function setupPostProcess(idTexture) {
    if (!postProcessBindGroup || idTexture !== oldIdTexture) {
      oldIdTexture = idTexture;
      postProcessBindGroup = device.createBindGroup({
        layout: postProcessPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: idTexture },
          { binding: 1, resource: atlasTexture },
        ],
      });
    }
  }

  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture.createView();
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  class OrbitCamera {
    #target = vec3.create();
    #pan = 0;
    #tilt = 0;
    #radius = 0;

    constructor() {}

    getCameraMatrix(parentMatrix) {
      const mat = mat4.copy(parentMatrix ?? mat4.identity());
      mat4.translate(mat, this.#target, mat);
      mat4.rotateY(mat, this.#pan, mat);
      mat4.rotateX(mat, this.#tilt, mat);
      mat4.translate(mat, [0, 0, this.#radius], mat);
      return mat;
    }

    getUpdateHelper() {
      const startTilt = this.tilt;
      const startPan = this.pan;
      const startRadius = this.radius;
      const startCameraMatrix = mat4.copy(this.getCameraMatrix());
      const startTarget = vec3.copy(this.target);

      return {
        panAndTilt: (deltaPan, deltaTilt) => {
          this.tilt = startTilt - deltaTilt;
          this.pan = startPan - deltaPan;
        },
        track: (deltaX, deltaY, parentMatrix) => {
          const worldDirection = vec3.transformMat3([deltaX, deltaY, 0], startCameraMatrix);
          const inv = mat4.inverse(parentMatrix ?? mat4.identity());
          const cameraDirection = vec3.transformMat3(worldDirection, inv);
          this.target = vec3.add(startTarget, cameraDirection);
        },
        dolly: (delta) => {
          this.radius = startRadius + delta;
        },
      };
    }

    get pan() { return this.#pan; }
    set pan(v) { this.#pan = v; }
    get tilt() { return this.#tilt; }
    set tilt(v) { this.#tilt = v; }
    get radius() { return this.#radius; }
    set radius(v) { this.#radius = v; }
    get target() { return vec3.copy(this.#target); }
    setTarget(worldPosition, parentMatrix) {
      const inv = mat4.inverse(parentMatrix ?? mat4.identity());
      vec3.transformMat4(worldPosition, inv, this.#target);
    }
  }

  const orbitCamera = new OrbitCamera();
  orbitCamera.setTarget([0, 0, 0]);
  orbitCamera.tilt = 0;
  orbitCamera.radius = 7;

  function addOrbitCameraEventListeners(cam, elem) {
    let startX;
    let startY;
    let lastMode;
    let camHelper;
    let doubleTapMode;
    let lastSingleTapTime;
    let startPinchDistance;
    const pointerToLastPosition = new Map();

    const computePinchDistance = () => {
      const pos = [...pointerToLastPosition.values()];
      const dx = pos[0].x - pos[1].x;
      const dy = pos[0].y - pos[1].y;
      return Math.hypot(dx, dy);
    };

    const updateStartPosition = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      if (pointerToLastPosition.size === 2) {
        startPinchDistance = computePinchDistance();
      }
      camHelper = cam.getUpdateHelper();
    };

    const onMove = (e) => {
      if (!pointerToLastPosition.has(e.pointerId) ||
          !canvas.hasPointerCapture(e.pointerId)) {
        return;
      }
      pointerToLastPosition.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const mode = pointerToLastPosition.size === 2
        ? 'pinch'
        : pointerToLastPosition.size > 2
        ? 'undefined'
        : doubleTapMode
        ? 'doubleTapZoom'
        : e.shiftKey || (e.buttons & 4) !== 0
        ? 'track'
        : 'panAndTilt';

      if (mode !== lastMode) {
        lastMode = mode;
        updateStartPosition(e);
      }

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      switch (mode) {
        case 'pinch': {
          const pinchDistance = computePinchDistance();
          const delta = pinchDistance - startPinchDistance;
          camHelper.dolly(cam.radius * 0.002 * -delta);
          break;
        }
        case 'track': {
          const s = cam.radius * 0.001;
          camHelper.track(-deltaX * s, deltaY * s);
          break;
        }
        case 'panAndTilt':
          camHelper.panAndTilt(deltaX * 0.01, deltaY * 0.01);
          break;
        case 'doubleTapZoom':
          camHelper.dolly(cam.radius * 0.002 * deltaY);
          break;
      }

      render();
    };

    const onUp = (e) => {
      pointerToLastPosition.delete(e.pointerId);
      canvas.releasePointerCapture(e.pointerId);
      if (pointerToLastPosition.size === 0) {
        doubleTapMode = false;
      }
    };

    const kDoubleClickTimeMS = 300;
    const onDown = (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointerToLastPosition.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerToLastPosition.size === 1) {
        if (!doubleTapMode) {
          const now = performance.now();
          const deltaTime = now - lastSingleTapTime;
          if (deltaTime < kDoubleClickTimeMS) {
            doubleTapMode = true;
          }
          lastSingleTapTime = now;
        }
      } else {
        doubleTapMode = false;
      }
      updateStartPosition(e);
    };

    // Dolly when the user uses the wheel
    //const onWheel = (e) => {
    //  e.preventDefault();
    //  const helper = cam.getUpdateHelper();
    //  helper.dolly(cam.radius * 0.001 * e.deltaY);
    //  render();
    //};

    elem.addEventListener('pointerup', onUp);
    elem.addEventListener('pointercancel', onUp);
    elem.addEventListener('lostpointercapture', onUp);
    elem.addEventListener('pointerdown', onDown);
    elem.addEventListener('pointermove', onMove);
    //elem.addEventListener('wheel', onWheel);

    return () => {
      elem.removeEventListener('pointerup', onUp);
      elem.removeEventListener('pointercancel', onUp);
      elem.removeEventListener('lostpointercapture', onUp);
      elem.removeEventListener('pointerdown', onDown);
      elem.removeEventListener('pointermove', onMove);
      //elem.removeEventListener('wheel', onWheel);
    };
  }

  addOrbitCameraEventListeners(orbitCamera, canvas);

  const settings = {
    showIds: true,
  };

  const uiElem = el('div', {style: {position: 'absolute', right: '0px', top: '0px'}});
  const gui = new GUI(uiElem);
  GUI.setTheme('float');
  gui.onChange(render);
  gui.add(settings, 'showIds');

  const rootElem = el('div', { className: 'fill-container', style: { position: 'relative' }}, [
    canvas,
    uiElem,
  ]);
  elem.append(rootElem);

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

  let depthTexture;
  let idTexture;

  function render() {
    const projection = mat4.perspective(45 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.5, 100);
    const view = mat4.inverse(orbitCamera.getCameraMatrix());
    mat4.multiply(projection, view, sharedUniformValues.views.viewProjection);

    sharedUniformValues.set({
      lightDirection: vec3.normalize([1, 8, 10]),
    });

    device.queue.writeBuffer(sharedUniformBuffer, 0, sharedUniformValues.arrayBuffer);

    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

    // If we don't have a depth texture OR if its size is different
    // from the canvasTexture when make a new depth texture
    depthTexture = makeNewTextureIfSizeDifferent(
      depthTexture,
      canvasTexture, // for size
      'depth24plus',
      GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    );
    idTexture = makeNewTextureIfSizeDifferent(
      idTexture,
      canvasTexture, // for size
      'r32uint',
      GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    );
    renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();
    renderPassDescriptor.colorAttachments[1].view = idTexture.createView();

    setupPostProcess(idTexture);

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
      mat4.translate(world, [(i / (objectInfos.length - 1) * 2 - 1) * 2, 0, 0], world);

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

    if (settings.showIds) {
      postProcess(commandEncoder, undefined, canvasTexture);
    }

    device.queue.submit([commandEncoder.finish()]);
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
    'pointer-to-world-space': (elem) => {
      frustumDiagram(elem, false);
    },
    'id-render': idRender,
  });
}

main();
