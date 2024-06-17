import {
  makeShaderDataDefinitions,
} from '../../3rdparty/webgpu-utils-1.x.module.js';
import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createByteDiagramForType,
  getCodeForUniform,
} from './resources/data-byte-diagram.js';
import {
  makeTable,
} from './resources/elem.js';
import typeInfo from './resources/wgsl-data-types.js';

renderDiagrams({
  ourStructV1(elem) {
    const wgsl = `
      struct OurStruct {
        velocity: f32,
        acceleration: f32,
        frameCount: u32,
      };
      @group(0) @binding(0) var<uniform> foo: OurStruct;
    `;
    const defs = makeShaderDataDefinitions(wgsl);
    elem.appendChild(createByteDiagramForType('OurStruct', defs.uniforms.foo.typeDefinition));
  },

  ourStructEx2(elem) {
    const wgsl = `
      struct Ex2 {
        scale: f32,
        offset: vec3f,
        projection: mat4x4f,
      };
      @group(0) @binding(0) var<uniform> foo: Ex2;
    `;
    const defs = makeShaderDataDefinitions(wgsl);
    elem.appendChild(createByteDiagramForType('Ex2', defs.uniforms.foo.typeDefinition));
  },

  ourStructEx3(elem) {
    const wgsl = `
      struct Ex3 {
        transform: mat3x3f,
        directions: array<vec3f, 4>,
      };
      @group(0) @binding(0) var<uniform> foo: Ex3;
    `;
    const defs = makeShaderDataDefinitions(wgsl);
    elem.appendChild(createByteDiagramForType('Ex3', defs.uniforms.foo.typeDefinition));
  },

  ourStructEx4(elem) {
    const wgsl = `
      struct Ex4a {
        velocity: vec3f,
      };

      struct Ex4 {
        orientation: vec3f,
        size: f32,
        direction: array<vec3f, 1>,
        scale: f32,
        info: Ex4a,
        friction: f32,
      };
      @group(0) @binding(0) var<uniform> foo: Ex4;
    `;
    const defs = makeShaderDataDefinitions(wgsl);
    elem.appendChild(createByteDiagramForType('Ex4', defs.uniforms.foo.typeDefinition));
  },


  ourStructCodeV1(elem) {
    const wgsl = `
      struct OurStruct {
        velocity: f32,
        acceleration: f32,
        frameCount: u32,
      };
      @group(0) @binding(0) var<uniform> OurStruct: OurStruct;
    `;
    const defs = makeShaderDataDefinitions(wgsl);
    elem.textContent = getCodeForUniform('ourStruct', defs.uniforms.OurStruct);
  },

  wgslTypeTable(elem) {
    const addRow = makeTable(elem, ['type', 'size', 'align']);
    for (const [name, {size, align}] of Object.entries(typeInfo)
        .filter(([name]) => name.length === 3 || name.includes('<'))) {
      addRow([name, size, align]);
    }
  },
});