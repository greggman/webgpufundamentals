import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createElem as el
} from './resources/js/elem.js';
import {
  hslToRgb,
  rgbToHsl,
} from './resources/js/utils.js';
import {createTextureFromImage} from '/3rdparty/webgpu-utils-1.x.module.js';
import {mat4} from '/3rdparty/wgpu-matrix.module.js';

import { importThreeJS } from './resources/js/import-three.js.js';
const threeP = importThreeJS('r182');

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const src = '/webgpu/resources/images/alvan-nee-RQFMEBJcolY-unsplash-sm.jpg';

let device;
let render;
const canvasToSettings = new Map();

/*
function makeCircle(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;
  const lerp = (a, b, l) => a + (b - a) * l;

  const half = size / 2;
  for (let y = 0; y < size; ++y) {
    for (let x = 0; x < size; ++x) {
      const dx = half - x;
      const dy = half - y;
      const a = Math.atan2(dy, dx) / Math.PI * 0.5 + 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < half) {
        ctx.fillStyle = hsl(a, 1, lerp(0, 0.9, Math.pow(r / half, 0.75)));
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}
*/

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

function makeLabeledRange(label, array, index, start, end, fn) {
  const range = makeRange(array[index], start, end, (v) => {
    array[index] = v;
    fn(index, array);
  });
  const elem = el('div', {className: 'labeled-range'}, [
    el('div', {textContent: label}),
    range.elem,
  ]);
  return {
    elem,
    set: range.set,
  };
}

function makeSliders(array, labels, start, end, fn) {
  const ranges = array.map((v, i) => makeLabeledRange(labels[i], array, i, start, end, fn));
  const update = () => array.forEach((v, i) => {
    ranges[i].set(v);
  });
  const elem = el('div', {className: 'sliders'}, [
    el('div', {}, ranges.map(r => r.elem)),
  ]);
  return {
    elem,
    update,
  };
}

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
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        rgb = adjustHSL(rgb, uni.hsl);
        rgb = applyDuotone(rgb, uni.duotoneColor1, uni.duotoneColor2, uni.duotone);
        rgb = adjustBrightness(rgb, uni.brightness);
        rgb = adjustContrast(rgb, uni.contrast);
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
    size: 80,
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
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

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
    Object.assign(settings, canvasToSettings.get(canvas));
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

const messageHandlers = {};
window.onmessage = (e) => {
  const {cmd, data} = e.data;
  const handler = messageHandlers[cmd];
  if (!handler) {
    throw new Error(`no handler for cmd: ${cmd}`);
  }
  handler(data);
};

function postMessage(cmd, data) {
  window.postMessage({
    cmd,
    data,
  });
}

async function main() {
  renderDiagrams({
    rgbDiagram: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      await threeP;
      const { rgbDiagram } = await import('./resources/js/rgb-diagram.js');
      const { elem: diagramElem, setRGB } = await rgbDiagram();

      const rgb = [0.8, 0.7, 0.6];
      setRGB(rgb);

      const sliders = makeSliders(rgb, [labels.r, labels.g, labels.b], 0, 1, () => {
        setRGB(rgb);
        postMessage('setHSL', rgbToHsl(rgb));
      });

      elem.append(el('div', {}, [
        diagramElem,
        sliders.elem,
      ]));

      messageHandlers.setRGB = (newRGB) => {
        rgb.length = 0;
        rgb.push(...newRGB);
        setRGB(rgb);
        sliders.update();
      };
    },
    hslDiagram: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      await threeP;
      const { hslDiagram } = await import('./resources/js/hsl-diagram.js');
      const { elem: diagramElem, setHSL } = await hslDiagram();

      const hsl = [0, 1, 0.5];
      setHSL(hsl);

      const sliders = makeSliders(hsl, [labels.h, labels.s, labels.l], 0, 1, () => {
        setHSL(hsl);
        postMessage('setRGB', hslToRgb(hsl));
      });

      elem.append(el('div', {}, [
        diagramElem,
        sliders.elem,
      ]));

      messageHandlers.setHSL = (newHSL) => {
        hsl.length = 0;
        hsl.push(...newHSL);
        setHSL(hsl);
        sliders.update();
      };
    },
    original: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      const settings = {};
      const canvas = el('canvas');
      canvasToSettings.set(canvas, settings);
      const label = el('label', {textContent: labels.type});
      elem.append(el('div', {className: 'adjustment'}, [
        el('div', {className: 'widget'}, [
          label,
        ]),
        canvas,
      ]));
      await waitForSetupAndStart(canvas);
    },
    brightness: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      const settings = {
        brightness: 0.3,
      };
      const canvas = el('canvas');
      canvasToSettings.set(canvas, settings);
      const label = el('label', {textContent: labels.type});
      elem.append(el('div', {className: 'adjustment'}, [
        //el('div', {className: 'image', style: { backgroundImage: `url(${src})` } }),
        el('div', {className: 'widget'}, [
          //el('div', {className: 'arrow'}),
          makeRange(settings.brightness, -1, 1, (v) => {
            settings.brightness = v;
            if (render) {
              render(canvas);
            }
          }).elem,
          label,
        ]),
        canvas,
      ]));

      await waitForSetupAndStart(canvas);
    },
    contrast: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      const settings = {
        contrast: 4,
      };
      const canvas = el('canvas');
      canvasToSettings.set(canvas, settings);
      const label = el('label', {textContent: labels.type});
      elem.append(el('div', {className: 'adjustment'}, [
        //el('div', {className: 'image', style: { backgroundImage: `url(${src})` } }),
        el('div', {className: 'widget'}, [
          //el('div', {className: 'arrow'}),
          makeRange(settings.contrast, -1, 10, (v) => {
            settings.contrast = v;
            if (render) {
              render(canvas);
            }
          }).elem,
          label,
        ]),
        canvas,
      ]));

      await waitForSetupAndStart(canvas);
    },
    hsl: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      const hsl = [0.5, 0.9, 0];
      const settings = {};

      const setSettings = () => {
        settings.hue = hsl[0];
        settings.saturation = hsl[1];
        settings.lightness = hsl[2];
      };
      setSettings(hsl);

      const canvas = el('canvas');
      canvasToSettings.set(canvas, settings);
      elem.append(el('div', {className: 'adjustment'}, [
        makeSliders(hsl, [labels.h, labels.s, labels.l], -1, 1, () => {
          setSettings();
          if (render) {
            render(canvas);
          }
        }).elem,
        canvas,
      ]));

      await waitForSetupAndStart(canvas);
    },
    duotone: async(elem) => {
      const labels = JSON.parse(elem.dataset.labels);
      const settings = {
        duotoneColor1: [0, 0, 0.5],
        duotoneColor2: [1, 0.7, 0],
        duotone: 1,
      };

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
    },
  });
}

main();
