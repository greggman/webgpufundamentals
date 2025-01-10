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
import {
  makeElem
} from './resources/jsonml.js';
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

  typedArrays(elem) {
    const viewCtors = [
      Int8Array,
      Uint8Array,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      BigInt64Array,
      BigUint64Array,
    ];

    const numBytes = 16;

    const range = (num, fn) => new Array(num).fill(0).map((_, i) => fn(i));

    const arrayBuffer = new ArrayBuffer(numBytes);
    const views = viewCtors.map(Ctor => new Ctor(arrayBuffer));
    const f32 = new Float32Array(arrayBuffer);
    f32.set([123, -456, 7.89, -0.123]);

    const updateFns = [];
    function updateAll() {
      for (const fn of updateFns) {
        fn();
      }
    }

    let showAsHex = false;

    function format(view, v) {
      if (showAsHex && view.constructor.name.includes('nt')) {
        return v.toString(16);//.padStart(view.BYTES_PER_ELEMENT * 2, '0');
      } else {
        return v.toString();
      }
    }

    function parseBigInt16(v) {
      v = v.trim();
      const [start, sign] = v[0] === '-'
        ? [1, -1]
        : [0,  1];
      let result = BigInt(0);
      for (let i = start; i < v.length; ++i) {
        const c = v[i].toLowerCase().charCodeAt(0);
        let digit;
        if (c >= 0x30 && c <= 0x39) {
          digit = c - 0x30;
        } else if (c >= 0x61 && c <= 0x66) {
          digit = c - 0x61 + 10;
        } else {
          throw new Error('not hex');
        }
        result = result * BigInt(0x10) + BigInt(digit);
      }
      return result * BigInt(sign);
    }

    function parseBigInt(v) {
      return showAsHex ? parseBigInt16(v) : BigInt(v);
    }

    const intRE = /^-?\d+$/;
    const hexRE = /^-?[0-9a-f]+$/i;
    function parseIntNumber(v) {
      if (showAsHex) {
        if (!hexRE.test(v)) {
          throw new Error('not hex');
        }
      } else {
        if (!intRE.test(v)) {
          throw new Error('not int');
        }
      }
      return parseInt(v, showAsHex ? 16 : 10);
    }

    function parseFloatNumber(v) {
      v = Number(v);
      if (isNaN(v)) {
        throw Error('NaN');
      }
      return v;
    }

    elem.appendChild(makeElem([
      'table',
      [
        'thead',
        ['th', 'arrayBuffer'],
        ...range(numBytes, i =>  ['th', `${i}`]),
      ],
      [
        'tbody',
        ...views.map((view) => {
          const numCellsPerElem = view.BYTES_PER_ELEMENT;
          const numElems = numBytes / numCellsPerElem;
          const parse = view instanceof BigInt64Array
            ? parseBigInt
            : view instanceof BigUint64Array
            ? parseBigInt
            : view.constructor.name.includes('Float')
            ? parseFloatNumber
            : parseIntNumber;
          return [
            'tr',
            ['td', `as${view.constructor.name.substring(0, view.constructor.name.length - 5)}` ],
            ...range(numElems, i => {
              const input = makeElem([
                'input', {type: 'text', value: 123, onInput: function() {
                  let err = false;
                  try {
                    view[i] = parse(this.value);
                  } catch (error) {
                    //console.log('here', error.message);
                    err = true;
                  }
                  input.classList.toggle('error', err);
                  updateAll();
                },
                },
              ]);

              updateFns.push(() => {
                if (document.activeElement !== input) {
                  input.value = format(view, view[i]);
                  input.classList.remove('error');
                }
              });

              return ['td', {colSpan: numCellsPerElem},
                input,
              ];
            }),
          ];
        }),
      ],
    ]));

    updateAll();

    elem.appendChild(makeElem(['label',
      elem.dataset.caption,
      [
        'input', { type: 'checkbox', onChange: function() {
          showAsHex = this.checked;
          updateAll();
        },
        },
      ],
    ]));

  },
});