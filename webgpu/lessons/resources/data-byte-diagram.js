/* global globalThis */

import {
  getSizeAndAlignmentOfUnsizedArrayElement,
  makeBindGroupLayoutDescriptors,
  makeStructuredView,
} from '../../../3rdparty/webgpu-utils-1.x.module.js';
import typeInfo from './wgsl-data-types.js';
import {
  createElem as el,
} from './elem.js';
import {
  classNames,
} from './classnames.js';


function align(v, align) {
  return Math.ceil(v / align) * align;
}
const roundUpToMultipleOf = align;

function assert(cond, msg = '') {
  if (!cond) {
    throw new Error(msg);
  }
}

const lch = (l, c, h) => `lch(${l * 100} ${c * 250 - 125} ${h * 360})`;

class GridBuilder {
  currentHeading;
  currentRow;
  currentCol = 0;
  numAdditions = 0;
  colorNdx = 0;
  byteOffset = 0;

  constructor(numColumns) {
    this.numColumns = numColumns;
    this.tbodyElem = el('tbody');
    this.tableElem = el('table', {}, [this.tbodyElem]);
  }

  getColor() {
    return this.colorNdx;
  }

  addPadding(num) {
    assert(num >= 0);
    while (num) {
      this._prepRow();
      const paddingAvailableForRow = this.numColumns - this.currentCol;
      const paddingToAdd = Math.min(num, paddingAvailableForRow);
      this._addPaddingToRow(paddingToAdd);
      num -= paddingToAdd;
      assert(num >= 0);
    }
  }

  _addPaddingToRow(num) {
    if (num === 0) {
      return;
    }
    this.byteOffset += num;
    this.currentHeading.appendChild(el('td', {colSpan: num, textContent: '-pad-'}));
    for (let i = 0; i < num; ++i) {
      this.currentRow.appendChild(el('td', {
        style: {
          width: 'var(--byte-grid-size)',
          height: 'var(--byte-grid-size)',
        },
      }));
    }
    this.currentCol += num;
    assert(this.currentCol <= this.numColumns);
    if (this.currentCol === this.numColumns) {
      this.currentRow = undefined;
      this.currentHeading = undefined;
      this.currentCol = 0;
    }
  }

  addElements(name, type, color) {
    const info = typeInfo[type];
    const {
      size,
      align: alignment,
    } = info;
    let numElements = info.numElements;
    const elementSize = size / numElements;
    const [units, pad] = info.pad || [numElements, 0];

    const localColor = getColor(this, color);
    const hue = localColor  * 0.47 * 0.5 % 1;
    if (localColor === this.colorNdx) {
      this.colorNdx++;
    }

    const headBackgroundColor = lch(...colorScheme.headBgLC, hue);
    const memBackgroundColor = lch(...colorScheme.memBgLC, hue);

    const elementsPerUnit = units + pad;

    const aligned = align(this.currentCol, alignment);
    this.addPadding(aligned - this.currentCol);
    while (numElements > 0) {
      this._prepRow();
      const slotsAvailableInRow = this.numColumns - this.currentCol;
      assert(slotsAvailableInRow >= 0);

      const elementsAvailableInRow = Math.floor(slotsAvailableInRow / elementSize);
      assert(elementsAvailableInRow >= 0);
      const elementsInRow = Math.min(numElements, elementsAvailableInRow);
      assert(elementsInRow > 0);
      numElements -= elementsInRow;

      const bytesInRow = elementsInRow * elementSize;
      this.currentHeading.appendChild(el('td', {
          colSpan: bytesInRow,
          style: {
            backgroundColor: headBackgroundColor,
          },
        }, [
          el('div', {className: 'name', textContent: name, style: { width: `calc(${bytesInRow} * var(--byte-grid-size))`}}),
      ]));
      for (let e = 0; e < elementsInRow; ++e) {
        const u = e % elementsPerUnit;
        const backgroundColor = u < units ? memBackgroundColor : colorScheme.unusedCellBg;
        for (let i = 0; i < elementSize; ++i) {
          const innerClass = {};
          if (u < units) {
            innerClass[`${info.type}-${i}`] = true;
          }
          ++this.byteOffset;
          this.currentRow.appendChild(el('td', {
            className: classNames('byte', {
              'elem-start': i === 0,
              'elem-end': i === elementSize - 1,
              ...innerClass,
            }),
            style: {
              width: 'var(--byte-grid-size)',
              height: 'var(--byte-grid-size)',
              backgroundColor,
            },
          }));
        }
      }
      this.currentCol += elementsInRow * elementSize;
    }
  }

  _prepRow() {
    if (!this.currentRow || this.currentCol === this.numColumns) {
      this.currentHeading = el('tr', { className: 'field-names'}, [el('td', {textContent: this.tbodyElem.children.length ? '' : 'offset'})]);
      this.currentRow = el('tr', {}, [el('td', {class: 'offset', textContent: this.tbodyElem.children.length / 2 * 16})]);
      this.tbodyElem.appendChild(this.currentHeading);
      this.tbodyElem.appendChild(this.currentRow);
      this.currentCol = 0;
    }
  }
}

const darkColors = {
  headBgLC: [0.2, 0.8],
  memBgLC: [0.4, 0.7],
  unusedCellBg: '#333',
};
const lightColors = {
  headBgLC: [1, 0.8],
  memBgLC: [0.7, 0.7],
  unusedCellBg: '#CCC',
};
const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
const isDarkMode = darkMatcher.matches;
const colorScheme = isDarkMode ? darkColors : lightColors;

function getColor(grid, color) {
  return color === undefined ? grid.getColor() : color;
}

function isIntrinsic(typeDef/*: TypeDefinition*/) {
    return !(typeDef/* as StructDefinition*/).fields &&
           !(typeDef/* as ArrayDefinition*/).elementType;
}

function getSizeOfTypeDef(typeDef/*: TypeDefinition*/, options)/*: number*/ {
  const {
    numElementsForUnsizedArrays = 0,
  } = options;
  const asArrayDef = typeDef/* as ArrayDefinition*/;
  const elementType = asArrayDef.elementType;
  if (elementType) {
    const numElements = asArrayDef.numElements
        ? asArrayDef.numElements
        : numElementsForUnsizedArrays;
    if (isIntrinsic(elementType)) {
        const asIntrinsicDef = elementType/* as IntrinsicDefinition*/;
        const { align } = typeInfo[asIntrinsicDef.type];
        return roundUpToMultipleOf(elementType.size, align) * numElements;
    } else {
        return numElements * getSizeOfTypeDef(elementType, options);
    }
  } else {
    const asStructDef = typeDef/* as StructDefinition*/;
    if (asStructDef.fields) {
        const lastField = Object.values(asStructDef.fields).pop();
        // Is the last field an array?
        const extra = lastField.type.size > 0
           ? 0
           : getSizeAndAlignmentOfUnsizedArrayElement(lastField.type).size * numElementsForUnsizedArrays;
        return typeDef.size + extra;
    } else {
        const asIntrinsicDef = typeDef/* as IntrinsicDefinition*/;
        const numElements = asIntrinsicDef.numElements;
        const { align } = typeInfo[asIntrinsicDef.type];
        return numElements > 1
           ? roundUpToMultipleOf(typeDef.size, align) * numElements
           : typeDef.size;
    }
  }
}


function addGridType(grid, typeDef, baseOffset, name, color, options) {
  const {
    numElementsForUnsizedArrays = 0,
  } = options;

  if (!(typeDef.size !== undefined && typeDef.size === 0)) {
    grid.addPadding(baseOffset - grid.byteOffset);
  }

  if (typeDef.fields) {
    for (const [fieldName, fieldDef] of Object.entries(typeDef.fields)) {
      addGridType(grid, fieldDef.type, baseOffset + fieldDef.offset, `${name}.${fieldName}`, color, options);
    }
  } else if (typeDef.elementType) {
    const numElements = typeDef.numElements
        ? typeDef.numElements
        : numElementsForUnsizedArrays;
    const size = typeDef.size
        ? typeDef.size
        : getSizeAndAlignmentOfUnsizedArrayElement(typeDef).size * numElements;

    const { elementType } = typeDef;
    const elemColor = getColor(grid, color);
    const elementSize = size / numElements;
    for (let i = 0; i < numElements; ++i) {
      addGridType(grid, elementType, baseOffset + i * elementSize, `${name}[${i}]`, elemColor, options);
    }
  } else {
    // name, numElements, elementSize, alignment
    grid.addElements(name, typeDef.type, color);
  }
}

const kNumBytesPerRow = 16;

function addTypeToGrid(name, typeDef, options) {
  const grid = new GridBuilder(kNumBytesPerRow);
  addGridType(grid, typeDef, 0, '', undefined, options);
  const size = getSizeOfTypeDef(typeDef, options);
  grid.addPadding(size - grid.byteOffset);
  return grid.tableElem;
}

// ----

function showTypes(view, arrayBufferName, template, indent = '') {
  if (Array.isArray(view)) {
    const lines = view.map(elem => addPrefixSuffix(showTypes(elem, arrayBufferName, template, indent + '  '), indent + '  ', ',')).flat();
    return [
      '[',
      ...lines.map(v => `${v}`),
      `${indent}]`,
    ];
  } else if (view.buffer instanceof ArrayBuffer) {
    const isWholeBuffer = view.byteOffset === 0 && view.byteLength === view.buffer.byteLength;
    return [
      isWholeBuffer
         ? template.wholeBuffer(view)
         : template.buffer(view),
    ];
  } else {
    return [
      '{',
      ...showViews(view, arrayBufferName, template, indent),
      `${indent}}`,
    ];
  }
}

function showViews(views, arrayBufferName, template, indent = '') {
  indent += '  ';
  return Object.entries(views).map(([name, view]) => {
    const lines = showTypes(view, arrayBufferName, template, indent);
    return addPrefixSuffix(lines, `${indent}${name}: `, ',');
  }).flat();
}

function addPrefixSuffix(lines, prefix, suffix) {
  lines[0] = `${prefix}${lines[0]}`;
  lines[lines.length - 1] = `${lines[lines.length - 1]}${suffix}`;
  return lines;
}

function showView(values, name, arrayBufferName, template) {
  const lines = showTypes(values.views, arrayBufferName, template);
  const [prefix, suffix] = values.views.buffer instanceof ArrayBuffer
     ? template.typedArray(name, lines)
     : template.nonTypedArray(name, lines);
  return addPrefixSuffix(lines, prefix, suffix);
}

export function getCodeForUniform(name, uniform, options = {}) {
  const {
    mode = 'views',
    numElementsForUnsizedArrays = 0,
  } = options;
  const args = [uniform];
  const {size} = getSizeAndAlignmentOfUnsizedArrayElement(uniform);
  if (size !== 0) {
    const arrayBuffer = new ArrayBuffer(uniform.size + size * numElementsForUnsizedArrays);
    args.push(arrayBuffer);
  }
  const values = makeStructuredView(...args);
  const arrayBufferName = mode === 'views' ? `${name}Values` : `${name}`;

  const template = mode === 'views'
    ? {
      decl: (name, size) => `const ${name} = new ArrayBuffer(${size});`,
      typedArray: (name) => [`const ${name}View = `, ';'],
      nonTypedArray: (name) => [`const ${name}Views = `, ';'],
      wholeBuffer: (view) => `new ${Object.getPrototypeOf(view).constructor.name}(${arrayBufferName})`,
      buffer: (view) => `new ${Object.getPrototypeOf(view).constructor.name}(${arrayBufferName}, ${view.byteOffset}, ${view.length})`,
    }
    : {
      decl: (name, size) => `const ${name}Size = ${size};`,
      typedArray: (name) => [`const ${name}view = `, ';'],
      nonTypedArray: (name) => [`const ${name}Info = `, ';'],
      wholeBuffer: (view) => `{ type: ${Object.getPrototypeOf(view).constructor.name} }`,
      buffer: (view) => `{ type: ${Object.getPrototypeOf(view).constructor.name}, byteOffset: ${view.byteOffset}, length: ${view.length} }`,
    };

  const lines = [
    template.decl(arrayBufferName, values.arrayBuffer.byteLength),
    ...showView(values, name, arrayBufferName, template),
  ];

  return lines.join('\n');
}

export function createByteDiagramForType(name, typeDef, options = {}) {
  return el('div', {className: 'byte-diagram'}, [addTypeToGrid(name, typeDef, options)]);
}

function getUsage(name, id) {
  const obj = globalThis[name];
  return Object.entries(obj)
       .filter(([,b]) => id & b)
       .map(([k]) => `${name}.${k}`)
       .join(' | ');
}

function stringifyBindGroupLayoutDescriptor(key, value) {
return (key === 'visibility')
    ? getUsage('GPUShaderStage', value)
    : value;
}

function bindGroupLayoutDescriptorsToString(bindGroupLayoutDescriptors) {
return JSON.stringify(bindGroupLayoutDescriptors, stringifyBindGroupLayoutDescriptor, 2)
    .replace(/"(\w+)":/g, '$1:')                  // "key": value -> key: value
    .replace(/(}|\]|"|\d|\w)\n/g, '$1,\n')        // add trailing commas
    .replace(/"(GPUS.*?)"/g, '$1')                // remove quotes from GPUShaderStage
    .replace(' null,\n', ' , // empty group\n');  // empty group elements
}

export function makeBindGroupLayoutDescriptorsJS(
    defs/*: ShaderDataDefinitions | ShaderDataDefinitions[]*/,
    desc/*: PipelineDescriptor*/,
) {
  return bindGroupLayoutDescriptorsToString(makeBindGroupLayoutDescriptors(defs, desc));
}
