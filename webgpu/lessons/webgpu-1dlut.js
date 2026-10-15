import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createElem as el
} from './resources/js/elem.js';
import {createTextureFromImage, createTextureFromSource } from '/3rdparty/webgpu-utils-1.x.module.js';
import {mat4} from '/3rdparty/wgpu-matrix.module.js';

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const src = '/webgpu/resources/images/alvan-nee-RQFMEBJcolY-unsplash-sm.jpg';

let device;
let render;
const canvasToSettings = new Map();

const gradients = [
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 0%,
    rgb(236, 23, 223) 37%,
    rgb(255, 144, 0) 48%,
    rgb(255, 255, 255) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 0%,
    rgb(236, 23, 23) 33%,
    rgb(230, 194, 108) 50%,
    rgb(249, 197, 241) 64%,
    rgb(255, 255, 255) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(10, 10, 10) 0%,
    rgb(90, 0, 255) 40%,
    rgb(255, 0, 0) 70%,
    rgb(132, 255, 0) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(20, 20, 20) 0%,
    rgb(0, 61, 201) 24%,
    rgb(76, 229, 155) 47%,
    rgb(246, 239, 45) 66%,
    rgb(255, 255, 255) 80%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(4, 4, 4) 0%,
    rgb(0, 184, 255) 50%,
    rgb(255, 133, 0) 60%,
    rgb(255, 255, 255) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(17, 37, 81) 0%,
    rgb(198, 229, 112) 43%,
    rgb(255, 215, 104) 51%,
    rgb(252, 235, 241) 59%,
    rgb(97, 159, 234) 85%,
    rgb(0, 65, 128) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 0%,
    rgb(10, 0, 178) 14%,
    rgb(255, 0, 0) 50%,
    rgb(50, 178, 0) 61%,
    rgb(255, 252, 0) 80%,
    rgb(255, 255, 255) 98%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 0%,
    rgb(204, 27, 236) 25%,
    rgb(54, 129, 221) 41%,
    rgb(71, 193, 223) 60%,
    rgb(231, 203, 47) 79%,
    rgb(255, 255, 255) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(27, 27, 27) 4%,
    rgb(114, 0, 255) 15%,
    rgb(0, 228, 255) 61%,
    rgb(236, 196, 196) 68%,
    rgb(255, 211, 211) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(26, 47, 71) 44%,
    rgb(207, 27, 38) 44%,
    rgb(207, 27, 38) 64%,
    rgb(103, 138, 146) 64%,
    rgb(103, 138, 146) 75%,
    rgb(231, 210, 155) 75%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 0%,
    rgb(51, 186, 236) 42%,
    rgb(248, 179, 13) 74%,
    rgb(255, 255, 255) 100%
  )
    `,
  },
  {
    css: `
  linear-gradient(to right,
    rgb(0, 0, 0) 27%,
    rgb(54, 167, 227) 27%,
    rgb(54, 167, 227) 38%,
    rgb(154, 148, 194) 38%,
    rgb(154, 148, 194) 49%,
    rgb(166, 204, 59) 49%,
    rgb(166, 204, 59) 60%,
    rgb(227, 141, 32) 60%,
    rgb(227, 141, 32) 73%,
    rgb(246, 231, 8) 73%,
    rgb(246, 231, 8) 82%,
    rgb(255, 255, 255) 82%
  )
    `,
  },
];

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

  const imageTexture = await createTextureFromImage(
    device, src,
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  let imageBindGroup;
  function updateBindGroup() {
    imageBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: imageUniformBuffer  },
        { binding: 1, resource: imageTexture },
        { binding: 2, resource: imageSampler },
      ],
    });
  }
  updateBindGroup();

  const postProcessModule = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct HSL {
        h: f32,
        s: f32,
        l: f32,
      };

      const Epsilon = 1e-10;

      fn rgbToHsl(rgb: vec3f) -> HSL {
        let cMin = min(min(rgb.r, rgb.b), rgb.g);
        let cMax = max(max(rgb.r, rgb.b), rgb.g);
        let delta = cMax - cMin;
        var h = 0.0;
        if (rgb.r == cMax) {
          h = (rgb.g - rgb.b) / delta;
        } else if (rgb.g == cMax) {
          h = 2.0 + (rgb.b - rgb.r) / delta;
        } else {
          h = 4.0 + (rgb.r - rgb.g) / delta;
        }
        h = h / 6.0;
        let l = (cMax + cMin) / 2.0;
        let s = delta / (1.0 - abs(2.0 * l - 1.0) + Epsilon);
        return HSL(h, s, l);
      }

      fn hslToRgb(hsl: HSL) -> vec3f {
        let c = vec3f(fract(hsl.h), clamp(vec2f(hsl.s, hsl.l), vec2f(0), vec2f(1)));
        let rgb = clamp(abs((c.x * 6.0 + vec3f(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3f(0), vec3f(1));
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
      }

      fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
        return color + brightness;
      }

      fn adjustContrast(color: vec3f, contrast: f32) -> vec3f {
        let c = contrast + 1.0;
        return clamp(0.5 + c * (color - 0.5), vec3f(0), vec3f(1));
      }

      fn adjustHSL(color: vec3f, adjust: HSL) -> vec3f {
        let hsl = rgbToHsl(color);
        let newHSL = HSL(hsl.h + adjust.h, hsl.s + adjust.s, hsl.l + adjust.l);
        return hslToRgb(newHSL);
      }

      fn luminance(color: vec3f) -> f32 {
        return dot(color, vec3f(0.2126, 0.7152, 0.0722));
      }

      fn applyDuotone(color: vec3f, color1: vec3f, color2: vec3f, amount: f32) -> vec3f {
        let l = luminance(color);
        let duotone = mix(color1, color2, l);
        return mix(color, duotone, amount);
      }

      fn apply1DLUT(
          color: vec3f,
          lut: texture_2d<f32>,
          smp: sampler) -> vec3f {
        let l = luminance(color);
        let width = f32(textureDimensions(lut, 0).x);
        let range = (width - 1) / width;
        let u = 0.5 / width + l * range;
        return textureSample(lut, smp, vec2f(u, 0.5)).rgb;
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

      struct Uniforms {
        brightness: f32,
        contrast: f32,
        @align(16) hsl: HSL,
        @align(16) duotone: f32,
        @align(16) duotoneColor1: vec3f,
        @align(16) duotoneColor2: vec3f,
        @align(16) lutAmount: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;
      @group(1) @binding(0) var lut: texture_2d<f32>;
      @group(1) @binding(1) var lutSampler: sampler;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        rgb = adjustHSL(rgb, uni.hsl);
        rgb = adjustBrightness(rgb, uni.brightness);
        rgb = adjustContrast(rgb, uni.contrast);
        rgb = applyDuotone(rgb, uni.duotoneColor1, uni.duotoneColor2, uni.duotone);
        rgb = mix(rgb, apply1DLUT(rgb, lut, lutSampler), uni.lutAmount);
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

  const postProcessUniformBuffer = device.createBuffer({
    size: 96,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let renderTarget;
  let postProcessBindGroup;

  function setupPostProcess(canvasTexture) {
    if (renderTarget?.width === canvasTexture.width &&
        renderTarget?.height === canvasTexture.height) {
      return;
    }

    renderTarget?.destroy();
    renderTarget = device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    renderPassDescriptor.colorAttachments[0].view = renderTarget;

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTarget },
        { binding: 1, resource: postProcessSampler },
        { binding: 2, resource: postProcessUniformBuffer  },
      ],
    });
  }

  function postProcess(settings, encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
        settings.contrast,
        0,
        0,
        settings.hue,
        settings.saturation,
        settings.lightness,
        0,
        settings.duotone,
        0,
        0,
        0,
        ...settings.duotoneColor1, 0,
        ...settings.duotoneColor2, 0,
        settings.lutAmount,
      ]),
    );

    const bindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: settings.lutTexture },
        { binding: 1, resource: settings.lutSampler },
      ],
    });

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.setBindGroup(1, bindGroup);
    pass.draw(3);
    pass.end();
  }

  const lutIdentityTexture = device.createTexture({
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    size: [2],
  });
  device.queue.writeTexture(
    { texture: lutIdentityTexture },
    new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]),
    {},
    [2],
  );

  const lutSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const baseSettings = {
    brightness: 0,
    contrast: 0,
    hue: 0,
    saturation: 0,
    lightness: 0,
    duotone: 0,
    duotoneColor1: [0, 0, 0],
    duotoneColor2: [1, 0.69, 0.4],
    splitTone: 0,
    stShadowStart: 0.4,
    stShadowEnd: 0.5,
    stShadowColor: [1, 0, 0],
    stHighlightStart: 0.50,
    stHighlightEnd: 0.6,
    stHighlightColor: [0.2, 0.4, 1],
    lutAmount: 0,
    lutTexture: lutIdentityTexture,
    lutSampler: lutSampler,
  };

  render = function render(canvas) {
    const context = canvas.getContext('webgpu');
    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

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

    const settings = JSON.parse(JSON.stringify(baseSettings));
    Object.assign(settings, baseSettings, canvasToSettings.get(canvas));
    postProcess(settings, encoder, renderTarget, canvasTexture);

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

function makeRange(initialValue, start, end, fn) {
  const range = end - start;
  const onInput = function() {
    const v = this.value / 100;
    fn(start + v * range);
  };
  const set = v => {
    input.value = (v - start) / range * 100;
  };
  const input = el('input', {type: 'range', min: 0, max: 100, onInput});
  set(initialValue);
  return {
    elem: input,
    set,
  };
}

async function luts(elem) {
  await readyP;
  const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  ctx.canvas.width = 256;
  ctx.canvas.height = 1;

  const re = /(rgb\(.*?\)) (\d+)%/g;


  elem.append(
    el('div', { className: 'img-grid' }, gradients.map(({ css }) => {
      const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
      const stops = [...css.matchAll(re)];
      for (const [, color, offset] of stops) {
        grad.addColorStop(offset / 100, color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ctx.canvas.width, 1);

      const lutTexture = createTextureFromSource(device, ctx.canvas);

      const settings = {
        lutAmount: 1,
        lutTexture,
      };
      const canvas = el('canvas');
      canvasToSettings.set(canvas, settings);

      waitForSetupAndStart(canvas);

      return el('div', { className: 'img-grid-item' }, [
        canvas,
        el('div', { className: 'gradient', style: { background: css } }),
      ]);
      })
    )
  );
}

async function makeDuotone(elem, settings) {
  const labels = JSON.parse(elem.dataset.labels);
  const canvas = el('canvas');
  canvasToSettings.set(canvas, settings);

  const re = /#(..)(..)(..)/;
  const makeColorRange = function(prop) {
    // You can't customize the color input 🤬
    const onInput = function() {
      const m = re.exec(this.value);
      color.style.backgroundColor = this.value;
      m.slice(1, 4).forEach((v, i) => {
        settings[prop][i] = parseInt(v, 16) / 0xFF;
      });
      render(canvas);
    };
    const value = `#${settings[prop].map(v => (v * 255 | 0).toString(16).padStart(2, '0')).join('')}`;
    const input = el('input', {type: 'color', value, onInput});
    const color = el('div', {className: 'colorRange', style: { backgroundColor: value }}, [
      input,
    ]);
    return color;
  };

  const label = el('label', {textContent: labels.type});
  elem.append(el('div', {className: 'adjustment'}, [
    //el('div', {className: 'image', style: { backgroundImage: `url(${src})` } }),
    el('div', {className: 'widget'}, [
      //el('div', {className: 'arrow'}),
      el('div', {style: {display: 'flex'}}, [
        el('div', {style: {display: 'flex', flexDirection: 'row'}}, [
          makeColorRange('duotoneColor1'),
          makeColorRange('duotoneColor2'),
        ]),
        makeRange(settings.duotone, 0, 1, (v) => {
          settings.duotone = v;
          if (render) {
            render(canvas);
          }
        }).elem,
      ]),
      label,
    ]),
    canvas,
  ]));

  await waitForSetupAndStart(canvas);
}

async function main() {
  renderDiagrams({
    luts,
    duotone: async(elem) => {
      const settings = {
        duotoneColor1: [0, 0, 0.5],
        duotoneColor2: [1, 0.7, 0],
        duotone: 1,
      };
      await makeDuotone(elem, settings);
    },
    sepia: async(elem) => {
      const settings = {
        duotoneColor1: [112 / 255, 66 / 255, 20 / 255],
        duotoneColor2: [250 / 255, 235 / 255, 215 / 255],
        duotone: 1,
      };
      await makeDuotone(elem, settings);
    },
  });
}

main();
