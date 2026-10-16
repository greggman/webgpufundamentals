import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createElem as el
} from './resources/js/elem.js';
import {createTextureFromImage } from '/3rdparty/webgpu-utils-1.x.module.js';
import {mat4} from '/3rdparty/wgpu-matrix.module.js';
import * as lutParser from '/webgpu/resources/js/lut-reader.js';

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

let device;
let render;
let images;
const canvasToSettings = new Map();

function makeIdentityLutTexture(device) {
  const texture = device.createTexture({
    size: [2, 2, 2],
    dimension: '3d',
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const identityLUT = new Uint8Array([
      0,   0,   0, 255,  // black
    255,   0,   0, 255,  // red
      0, 255,   0, 255,  // green
    255, 255,   0, 255,  // yellow
      0,   0, 255, 255,  // blue
    255,   0, 255, 255,  // magenta
      0, 255, 255, 255,  // cyan
    255, 255, 255, 255,  // white
  ]);

  device.queue.writeTexture(
    { texture },
    identityLUT,
    { bytesPerRow: 8, rowsPerImage: 2},
    [2, 2, 2],
  );

  return texture;
}

/**
 * create a LUT texture from an image URL. You must pass in the size of the LUT
 * It's assumed to be in the top left corner of the image.
 *
 * +---------+---------+---------+---------+---------+---------+---→
 * |         |         |         |         |         |         |
 * | layer 0 | layer 1 | layer 2 | layer 3 |   ...   | layer n |
 * |         |         |         |         |         |         |
 * +---------+---------+---------+---------+---------+---------+
 * |
 * ↓
 */
const createLUTTextureFromImage = (function() {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  return async function createLUTTextureFromImage(device, url, lutSize) {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (e) {
      console.error('could not load:', url);
      console.error(e);
    }
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, lutSize * lutSize, lutSize);

    const texture = device.createTexture({
      size: [lutSize, lutSize, lutSize],
      dimension: '3d',
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    for (let z = 0; z < lutSize; ++z) {
      device.queue.writeTexture(
        { texture, origin: [0, 0, z] },
        imgData.data,
        { offset: z * lutSize * 4, bytesPerRow: imgData.width * 4 },
        [lutSize, lutSize],
      );
    }
    return texture;
  };
})();

async function setup() {
  const adapter = await navigator.gpu?.requestAdapter();
  device = await adapter?.requestDevice();
  if (!device) {
    return;
  }

  const module = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      @group(0) @binding(2) var smp: sampler;

      @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
        let positions = array(
          vec2f( 0,  0),
          vec2f( 1,  0),
          vec2f( 0,  1),
          vec2f( 0,  1),
          vec2f( 1,  0),
          vec2f( 1,  1),
        );
        let pos = positions[vNdx];
        return VSOutput(
          uni.matrix * vec4f(pos, 0, 1),
          pos,
        );
      }

      @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
        return textureSample(tex, smp, fsInput.texcoord);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'textured unit quad',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: 'rgba8unorm' }],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const imageUniformBuffer = device.createBuffer({
    size: 4 * 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  images = await Promise.all([
    '/webgpu/resources/images/alvan-nee-RQFMEBJcolY-unsplash-sm.jpg',
    '/webgpu/resources/images/david-clode-clown-fish.jpg',
  ].map(async src => {
    const texture = await createTextureFromImage(device, src);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: imageUniformBuffer  },
        { binding: 1, resource: texture },
        { binding: 2, resource: imageSampler },
      ],
    });

    return { texture, bindGroup };
  }));

  const postProcessModule = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      fn applyLUT(lut: texture_3d<f32>, lutSampler: sampler, color: vec3f) -> vec3f {
        let size = vec3f(textureDimensions(lut));
        return textureSampleLevel(lut, lutSampler, (0.5 + color * (size - 1)) / size, 0).rgb;
      }

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

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var lutTexture: texture_3d<f32>;
      @group(0) @binding(3) var lutSampler: sampler;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        rgb = applyLUT(lutTexture, lutSampler, rgb);
        return vec4f(rgb, color.a);
      }
    `,
  });

  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      { loadOp: 'clear', storeOp: 'store' },
    ],
  };

  const lutSamplerNearest = device.createSampler({
    minFilter: 'nearest',
    magFilter: 'nearest',
  });
  const lutSamplerLinear = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  let renderTarget;
  let postProcessBindGroup;

  function setupPostProcess(canvasTexture, lutTexture, lutSampler) {
    if (renderTarget?.width !== canvasTexture.width ||
        renderTarget?.height !== canvasTexture.height) {
      renderTarget?.destroy();
      renderTarget = device.createTexture({
        size: canvasTexture,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      renderPassDescriptor.colorAttachments[0].view = renderTarget;
    }

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTarget },
        { binding: 1, resource: postProcessSampler },
        { binding: 2, resource: lutTexture },
        { binding: 3, resource: lutSampler },
      ],
    });
  }

  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  render = function render(canvas) {
    const context = canvas.getContext('webgpu');
    const canvasTexture = context.getCurrentTexture();
    const settings = canvasToSettings.get(canvas);
    const { lutTexture, lutFilter, imageTexture, imageBindGroup } = settings;
    setupPostProcess(canvasTexture, lutTexture, lutFilter ? lutSamplerLinear : lutSamplerNearest);

    // css 'cover'
    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
    const imageAspect = imageTexture.width / imageTexture.height;
    const aspect = canvasAspect / imageAspect;
    const aspectScale = aspect > 1 ? [1, aspect, 1] : [1 / aspect, 1, 1];

    const matrix = mat4.identity();
    mat4.scale(matrix, aspectScale, matrix);
    mat4.scale(matrix, [2, 2, 1], matrix);
    mat4.translate(matrix, [-0.5, -0.5, 1], matrix);

    // Set the uniform values in our JavaScript side Float32Array
    device.queue.writeBuffer(imageUniformBuffer, 0, matrix);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, imageBindGroup);
    pass.draw(6);
    pass.end();

    postProcess(encoder, renderTarget, canvasTexture);

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
  });

  observer.observe(canvas);
}

async function loadCubeLut(url) {
  const text = await (await fetch(url)).text();

  const type = 'cube';
  const {size, data/*, name*/} = lutParser.lutTo2D3Drgba8(lutParser.parse(text, type));
  const texture = device.createTexture({
    size: [size, size, size],
    dimension: '3d',
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: size * 4, rowsPerImage: size },
    [size, size, size],
  );
  return texture;
}

async function setupCubeLut(canvas, nameElem, url) {
  await readyP;
  const { texture, name } = url === 'identity'
    ? { texture: makeIdentityLutTexture(device), name: 'identity' }
    : { texture: await loadCubeLut(url), name: url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.')) };
  nameElem.textContent = name;

  const settings = {
    imageTexture: images[0].texture,
    imageBindGroup: images[0].bindGroup,
    lutTexture: texture,
    lutFilter: true,
  };
  canvasToSettings.set(canvas, settings);
  await waitForSetupAndStart(canvas);
}

const sizeRE = /-s(\d+)(n*)\.[^.]+$/;
async function setupImageLut(canvas, url) {
  await readyP;

  const m = sizeRE.exec(url);
  const size = parseInt(m[1]);
  const texture = await createLUTTextureFromImage(device, url, size);

  const settings = {
    imageTexture: images[1].texture,
    imageBindGroup: images[1].bindGroup,
    lutTexture: texture,
    lutFilter: true,
  };
  canvasToSettings.set(canvas, settings);
  await waitForSetupAndStart(canvas);
}

async function cubeLuts(elem) {
  const cubeLutFiles = [
    'identity',
    '/webgpu/resources/luts/CELLULOID_01_FU_LOW.cube',
    '/webgpu/resources/luts/CineStill-800-T-V1.0--N125.cube',
    '/webgpu/resources/luts/Cine_Teal.cube',
    '/webgpu/resources/luts/Colorist_Factory_Severn_LUT.cube',
    '/webgpu/resources/luts/DAY_FOR_NIGHT.cube',
    '/webgpu/resources/luts/Hypnosis.cube',
    '/webgpu/resources/luts/LateAfternoonWanderlust.cube',
    '/webgpu/resources/luts/TURKIEST__42.DJI_0001.cube',
    '/webgpu/resources/luts/Vintage_Warmth_1.C0427.cube',
    '/webgpu/resources/luts/lut_1.mountaineer-2080138_1920.cube',
    '/webgpu/resources/luts/warm-natural_6.C0008.cube',
    // '/webgpu/resources/luts/Cinematic_canon.cube',
    // '/webgpu/resources/luts/justyndigitalphotography.cube',
    // '/webgpu/resources/luts/taşdemirrr_1.A006_04280540_S.cube',
    // '/webgpu/resources/luts/TL_R709_V2.cube',
    // '/webgpu/resources/luts/Beauty_8.319_3670.cube',
  ];
  elem.append(
    el('div', { className: 'img-grid-holder'}, [
      el('div', { className: 'img-grid'}, cubeLutFiles.map((url) => {
        const canvas = el('canvas');
        const nameElem = el('div', { textContent: 'loading...' });
        setupCubeLut(canvas, nameElem, url);
        return el('div', { className: 'img-grid-item' }, [
          canvas,
          nameElem,
        ]);
      })),
    ]),
  );
}

const imageLutsInfo = [
  { name: 'custom',          url: '/webgpu/resources/images/lut/3d-lut-orange-to-green-s16.png' },
  { name: 'monochrome',      url: '/webgpu/resources/images/lut/monochrome-s8.png' },
  { name: 'sepia',           url: '/webgpu/resources/images/lut/sepia-s8.png' },
  { name: 'saturated',       url: '/webgpu/resources/images/lut/saturated-s8.png', },
  { name: 'posterize',       url: '/webgpu/resources/images/lut/posterize-s8n.png', },
  { name: 'posterize-3-rgb', url: '/webgpu/resources/images/lut/posterize-3-rgb-s8n.png', },
  { name: 'posterize-3-lab', url: '/webgpu/resources/images/lut/posterize-3-lab-s8n.png', },
  { name: 'posterize-4-lab', url: '/webgpu/resources/images/lut/posterize-4-lab-s8n.png', },
  { name: 'posterize-more',  url: '/webgpu/resources/images/lut/posterize-more-s8n.png', },
  { name: 'inverse',         url: '/webgpu/resources/images/lut/inverse-s8.png', },
  { name: 'color negative',  url: '/webgpu/resources/images/lut/color-negative-s8.png', },
  { name: 'high contrast',   url: '/webgpu/resources/images/lut/high-contrast-bw-s8.png', },
  { name: 'funky contrast',  url: '/webgpu/resources/images/lut/funky-contrast-s8.png', },
  { name: 'nightvision',     url: '/webgpu/resources/images/lut/nightvision-s8.png', },
  { name: 'thermal',         url: '/webgpu/resources/images/lut/thermal-s8.png', },
  { name: 'b/w',             url: '/webgpu/resources/images/lut/black-white-s8n.png', },
  { name: 'hue +60',         url: '/webgpu/resources/images/lut/hue-plus-60-s8.png', },
  { name: 'hue +180',        url: '/webgpu/resources/images/lut/hue-plus-180-s8.png', },
  { name: 'hue -60',         url: '/webgpu/resources/images/lut/hue-minus-60-s8.png', },
  { name: 'red to cyan',     url: '/webgpu/resources/images/lut/red-to-cyan-s8.png' },
  { name: 'blues',           url: '/webgpu/resources/images/lut/blues-s8.png' },
  { name: 'infrared',        url: '/webgpu/resources/images/lut/infrared-s8.png' },
  { name: 'radioactive',     url: '/webgpu/resources/images/lut/radioactive-s8.png' },
  { name: 'goolgey',         url: '/webgpu/resources/images/lut/googley-s8.png' },
  { name: 'bgy',             url: '/webgpu/resources/images/lut/bgy-s8.png' },
];

async function imageLuts(elem) {
  elem.append(
    el('div', { className: 'img-grid-holder'}, [
      el('div', { className: 'img-grid'}, imageLutsInfo.map(({name, url}) => {
        const canvas = el('canvas');
        setupImageLut(canvas, url);
        return el('div', { className: 'img-grid-item' }, [
          canvas,
          el('div', { textContent: name }),
        ]);
      })),
    ]),
  );
}

async function luts(elem) {
  elem.append(
    el('div', { className: 'img-grid-holder'}, [
      el('div', { className: 'img-grid'}, imageLutsInfo.map(({ name, url}) =>
        el('div', { className: 'img-grid-item' }, [
          el('img', { src: url, alt: name }),
          el('div', { textContent: name }),
        ]))
      ),
    ]),
  );
}

class Waiter {
  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}

async function getSVGDocument(elem) {
  const data = elem.data;
  elem.data = '';
  elem.data = data;
  const waiter = new Waiter();
  elem.addEventListener('load', waiter.resolve);
  await waiter.promise;
  return elem.getSVGDocument();
}

async function lookup(elem) {
  const svg = await getSVGDocument(elem);
  const partsByName = {};
  [
    '[id$=-Input]',
    '[id$=-Output]',
    '[id$=-Result]',
  ].map((selector) => {
    [...svg.querySelectorAll('[id^=Effect]')].forEach((elem) => {
      // because affinity designer doesn't export blend modes (T_T)
      // and because I'd prefer not to have to manually fix things as I edit.
      // I suppose I could add a build process.
      elem.style.mixBlendMode = elem.id.split('-')[1];
    });
    [...svg.querySelectorAll(selector)].forEach((elem) => {
      const [name, type] = elem.id.split('-');
      partsByName[name] = partsByName[name] || {};
      partsByName[name][type] = elem;
      elem.style.visibility = 'hidden';
    });
  });
  const parts = Object.keys(partsByName).sort().map(k => partsByName[k]);
  let ndx = 0;
  let step = 0;
  let delay = 0;
  setInterval(() => {
    const part = parts[ndx];
    switch (step) {
      case 0:
        part.Input.style.visibility = '';
        ++step;
        break;
      case 1:
        part.Output.style.visibility = '';
        ++step;
        break;
      case 2:
        part.Result.style.visibility = '';
        ++step;
        break;
      case 3:
        part.Input.style.visibility = 'hidden';
        part.Output.style.visibility = 'hidden';
        ndx = (ndx + 1) % parts.length;
        if (ndx === 0) {
          step = 4;
          delay = 4;
        } else {
          step = 0;
        }
        break;
      case 4:
        --delay;
        if (delay <= 0) {
          for (const part of parts) {
            for (const elem of Object.values(part)) {
              elem.style.visibility = 'hidden';
            }
          }
          step = 0;
        }
        break;
    }
  }, 500);
}
async function main() {
  renderDiagrams({
    luts,
    imageLuts,
    cubeLuts,
    lookup,
  });
}

main();
