import { describe, it } from '../mocha-support.js';
import {
    makeShaderDataDefinitions,
} from '../../3rdparty/webgpu-utils-1.x.module.js';
import { assertEqual } from '../assert.js';
import {
    createByteDiagramForType,
    getCodeForUniform,
    makeBindGroupLayoutDescriptorsJS,
} from '../../webgpu/lessons/resources/data-byte-diagram.js';

// normalize whitespace. Keep lines except for first and last so it's easier to read
function trimCode(s) {
  return s.trim().replace(/ +/g, ' ').replace(/\n +/g, '\n');
}

// Compare 2 strings as code, white space insignificant.
function assertCodeEqual(a, b) {
  const _a = trimCode(a);
  const _b = trimCode(b);
  assertEqual(_a, _b);
}

describe('data-byte-diagram-tests', () => {

    describe('struct views', () => {
      it('generates struct views', () => {
          const shader = `
            struct Uniforms {
                foo: u32,
                bar: f32,
                moo: array<i32, 6>,
            };
            @group(4) @binding(1) var<uniform> uni1: Uniforms;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition);
          assertCodeEqual(code, `
            const fooValues = new ArrayBuffer(32);
            const fooViews = {
              foo: new Uint32Array(fooValues, 0, 1),
              bar: new Float32Array(fooValues, 4, 1),
              moo: new Int32Array(fooValues, 8, 6),
            };
          `);
      });

      it('generates struct offsets', () => {
          const shader = `
            struct Uniforms {
                foo: u32,
                bar: f32,
                moo: array<i32, 6>,
            };
            @group(4) @binding(1) var<uniform> uni1: Uniforms;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition, {mode: 'offsets'});
          assertCodeEqual(code, `
            const fooSize = 32;
            const fooInfo = {
                foo: { type: Uint32Array, byteOffset: 0, length: 1 },
                bar: { type: Float32Array, byteOffset: 4, length: 1 },
                moo: { type: Int32Array, byteOffset: 8, length: 6 },
            };
          `);
      });

      it('generates intrinsic views', () => {
          const shader = `
            @group(4) @binding(1) var<uniform> uni1: vec3f;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition);
          assertCodeEqual(code, `
            const fooValues = new ArrayBuffer(12);
            const fooView = new Float32Array(fooValues);
          `);
      });

      it('generates intrinsic view array', () => {
          const shader = `
            @group(4) @binding(1) var<uniform> uni1: array<vec3f, 3>;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition);
          assertCodeEqual(code, `
            const fooValues = new ArrayBuffer(48);
            const fooView = new Float32Array(fooValues);
          `);
      });

      it('generates intrinsic view array of array', () => {
          const shader = `
            @group(4) @binding(1) var<uniform> uni1: array<array<vec3f, 3>, 3>;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition);
          assertCodeEqual(code, `
            const fooValues = new ArrayBuffer(144);
            const fooViews = [
              new Float32Array(fooValues, 0, 12),
              new Float32Array(fooValues, 48, 12),
              new Float32Array(fooValues, 96, 12),
            ];
          `);
      });

      it('generates correct types', () => {
          const shader = `
            struct Uni {
                uni1: vec2i,
                uni2: vec2u,
                uni3: vec2f,
                uni4: vec2h,
                uni5: vec2<i32>,
                uni6: vec2<u32>,
                uni7: vec2<f32>,
                uni8: vec2<f16>,
            };
            @group(0) @binding(0) var<uniform> uni1: Uni;
          `;
          const d = makeShaderDataDefinitions(shader);
          const code = getCodeForUniform('foo', d.uniforms.uni1.typeDefinition);
          assertCodeEqual(code, `
            const fooValues = new ArrayBuffer(64);
            const fooViews = {
              uni1: new Int32Array(fooValues, 0, 2),
              uni2: new Uint32Array(fooValues, 8, 2),
              uni3: new Float32Array(fooValues, 16, 2),
              uni4: new Uint16Array(fooValues, 24, 2),
              uni5: new Int32Array(fooValues, 32, 2),
              uni6: new Uint32Array(fooValues, 40, 2),
              uni7: new Float32Array(fooValues, 48, 2),
              uni8: new Uint16Array(fooValues, 56, 2),
            };
          `);

      });

    });

    describe('html offset views', () => {
        it('does not pad too much', () => {
            const shader = `
            struct FSInput {
              lights: array<f32, 2>,
            };
            `;
            const defs = makeShaderDataDefinitions(shader);

            const elem = createByteDiagramForType('foo', defs.structs.FSInput, {
              numElementsForUnsizedArrays: 5,
            });
            assertEqual(elem.querySelectorAll('tr').length, 2);
        });
    });

    describe('bind group layouts', () => {

      it('handles various types (no defaults)', () => {
        const shader = `
        @group(0) @binding(2) var tex2d: texture_2d<f32>;
        @group(0) @binding(1) var texMS2d: texture_multisampled_2d<f32>;
        @group(0) @binding(0) var texDepth: texture_depth_2d;
        @group(0) @binding(3) var samp: sampler;
        @group(0) @binding(4) var sampC: sampler_comparison;
        @group(0) @binding(5) var texExt: texture_external;
        @group(1) @binding(0) var<uniform> u: mat4x4f;
        @group(1) @binding(1) var<storage> s: mat4x4f;
        @group(1) @binding(2) var<storage, read> sr: array<vec4f, 10>;
        @group(1) @binding(3) var<storage, read_write> srw: array<vec4f>;
        @group(3) @binding(0) var tsR: texture_storage_2d<rgba8unorm, read>;
        @group(3) @binding(1) var tsW: texture_storage_2d<rgba32float, write>;
        @group(3) @binding(2) var tsRW: texture_storage_2d<rgba16uint, read_write>;
        @compute @workgroup_size(1) fn cs() {
          _ = tex2d;
          _ = texMS2d;
          _ = texDepth;
          _ = samp;
          _ = sampC;
          _ = texExt;
          _ = u;
          _ = s;
          _ = sr;
          _ = srw;
          _ = tsR;
          _ = tsW;
          _ = tsRW;
        }
        `;

        const defs = makeShaderDataDefinitions(shader);
        const js = makeBindGroupLayoutDescriptorsJS(defs, {
          compute: { entryPoint: 'cs' },
        }, {
          keepDefaults: false,
        });
        const expected = `[
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: "depth",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          multisampled: true,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        texture: {},
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        sampler: {},
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        sampler: {
          type: "comparison",
        },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        externalTexture: {},
      },
    ],
  },
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          minBindingSize: 64,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
          minBindingSize: 64,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
          minBindingSize: 160,
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  },
  {
    entries: [],
  },
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "read-only",
          format: "rgba8unorm",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          format: "rgba32float",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "read-write",
          format: "rgba16uint",
        },
      },
    ],
  },
]`;
        assertEqual(js, expected);
      });

      it('handles various types (with defaults)', () => {
        const shader = `
        @group(0) @binding(2) var tex2d: texture_2d<f32>;
        @group(0) @binding(1) var texMS2d: texture_multisampled_2d<f32>;
        @group(0) @binding(0) var texDepth: texture_depth_2d;
        @group(0) @binding(3) var samp: sampler;
        @group(0) @binding(4) var sampC: sampler_comparison;
        @group(0) @binding(5) var texExt: texture_external;
        @group(1) @binding(0) var<uniform> u: mat4x4f;
        @group(1) @binding(1) var<storage> s: mat4x4f;
        @group(1) @binding(2) var<storage, read> sr: array<vec4f, 10>;
        @group(1) @binding(3) var<storage, read_write> srw: array<vec4f>;
        @group(3) @binding(0) var tsR: texture_storage_2d<rgba8unorm, read>;
        @group(3) @binding(1) var tsW: texture_storage_2d<rgba32float, write>;
        @group(3) @binding(2) var tsRW: texture_storage_2d<rgba16uint, read_write>;
        @compute @workgroup_size(1) fn cs() {
          _ = tex2d;
          _ = texMS2d;
          _ = texDepth;
          _ = samp;
          _ = sampC;
          _ = texExt;
          _ = u;
          _ = s;
          _ = sr;
          _ = srw;
          _ = tsR;
          _ = tsW;
          _ = tsRW;
        }
        `;

        const defs = makeShaderDataDefinitions(shader);
        const js = makeBindGroupLayoutDescriptorsJS(defs, {
          compute: { entryPoint: 'cs' },
        }, { keepDefaults: true });
        const expected = `[
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: "depth",
          viewDimension: "2d",
          multisampled: false,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: true,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: false,
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        sampler: {
          type: "filtering",
        },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        sampler: {
          type: "comparison",
        },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        externalTexture: {},
      },
    ],
  },
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "uniform",
          hasDynamicOffset: false,
          minBindingSize: 64,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
          hasDynamicOffset: false,
          minBindingSize: 64,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
          hasDynamicOffset: false,
          minBindingSize: 160,
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
          hasDynamicOffset: false,
          minBindingSize: 0,
        },
      },
    ],
  },
  {
    entries: [],
  },
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "read-only",
          viewDimension: "2d",
          format: "rgba8unorm",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          viewDimension: "2d",
          format: "rgba32float",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "read-write",
          viewDimension: "2d",
          format: "rgba16uint",
        },
      },
    ],
  },
]`;
        assertEqual(js, expected);
      });

    });

});

