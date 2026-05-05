import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  makeTable,
} from './resources/js/elem.js';
import { shortSize } from './resources/js/utils.js';

export const kMaxUnsignedLongValue = 4294967295;
export const kMaxUnsignedLongLongValue = Number.MAX_SAFE_INTEGER;

function valuesToObject(propertyNames, defaults, values) {
  return Object.fromEntries(propertyNames.map((propName, ndx) => [propName, values[ndx] || defaults[ndx]]));
}
function makeObjectFromTable(propertyNames, defaults, values) {
  return Object.fromEntries(Object.entries(values).map(([propName, values]) => [
    propName, valuesToObject(propertyNames, defaults, values),
  ]));
}

// TODO: Once Compat is in the spec, this should be updated to include Compat limits
/* eslint-disable no-sparse-arrays */
const kLimitInfo = makeObjectFromTable(
                                               [    'class', 'default',            'maximumValue'],
                                               [  'maximum',          ,     kMaxUnsignedLongValue], {
  'maxTextureDimension1D':                     [           ,      8192,                          ],
  'maxTextureDimension2D':                     [           ,      8192,                          ],
  'maxTextureDimension3D':                     [           ,      2048,                          ],
  'maxTextureArrayLayers':                     [           ,       256,                          ],

  'maxBindGroups':                             [           ,         4,                          ],
  'maxBindGroupsPlusVertexBuffers':            [           ,        24,                          ],
  'maxBindingsPerBindGroup':                   [           ,      1000,                          ],
  'maxDynamicUniformBuffersPerPipelineLayout': [           ,         8,                          ],
  'maxDynamicStorageBuffersPerPipelineLayout': [           ,         4,                          ],
  'maxSampledTexturesPerShaderStage':          [           ,        16,                          ],
  'maxSamplersPerShaderStage':                 [           ,        16,                          ],
  'maxStorageBuffersPerShaderStage':           [           ,         8,                          ],
  'maxStorageTexturesPerShaderStage':          [           ,         4,                          ],
  'maxUniformBuffersPerShaderStage':           [           ,        12,                          ],

  'maxUniformBufferBindingSize':               [           ,     65536, kMaxUnsignedLongLongValue],
  'maxStorageBufferBindingSize':               [           , 134217728, kMaxUnsignedLongLongValue],
  'minUniformBufferOffsetAlignment':           ['alignment',       256,                          ],
  'minStorageBufferOffsetAlignment':           ['alignment',       256,                          ],

  'maxVertexBuffers':                          [           ,         8,                          ],
  'maxBufferSize':                             [           , 268435456, kMaxUnsignedLongLongValue],
  'maxVertexAttributes':                       [           ,        16,                          ],
  'maxVertexBufferArrayStride':                [           ,      2048,                          ],
  'maxInterStageShaderVariables':              [           ,        16,                          ],

  'maxColorAttachments':                       [           ,         8,                          ],
  'maxColorAttachmentBytesPerSample':          [           ,        32,                          ],

  'maxComputeWorkgroupStorageSize':            [           ,     16384,                          ],
  'maxComputeInvocationsPerWorkgroup':         [           ,       256,                          ],
  'maxComputeWorkgroupSizeX':                  [           ,       256,                          ],
  'maxComputeWorkgroupSizeY':                  [           ,       256,                          ],
  'maxComputeWorkgroupSizeZ':                  [           ,        64,                          ],
  'maxComputeWorkgroupsPerDimension':          [           ,     65535,                          ],
});

const kFeatures = new Set([
  'core-features-and-limits',
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-bc',
  'texture-compression-bc-sliced-3d',
  'texture-compression-etc2',
  'texture-compression-astc',
  'texture-compression-astc-sliced-3d',
  'timestamp-query',
  'indirect-first-instance',
  'shader-f16',
  'rg11b10ufloat-renderable',
  'bgra8unorm-storage',
  'float32-filterable',
  'float32-blendable',
  'clip-distances',
  'dual-source-blending',
  'subgroups',
  'texture-formats-tier1',
  'texture-formats-tier2',
  'primitive-index',
  'texture-component-swizzle',
]);

// TODO: Once Compat is in the spec, this should be updated to request featureLevel: "compatibility"
const coreAdapter = await navigator.gpu?.requestAdapter();
const defaultDevice = await coreAdapter.requestDevice();

function withShortSize(v) {
  return v >= 1024 ? `${v} (${shortSize(v)})` : `${v}`;
}

const sortAlphabetically = (a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0;

function getObjLikeKeys(objLike) {
  const keys = [];
  for (const key in objLike) {
    keys.push(key);
  }
  return keys;
}

// Find all limit names known in the browser OR in the table above.
const limitNames = (() => {
  const names = Object.keys(kLimitInfo);
  if (coreAdapter) {
    names.push(...getObjLikeKeys(coreAdapter.limits));
  }
  return [...new Set(names)].sort(sortAlphabetically);
})();

function renderAdapterLimit(key) {
  let tagName = 'not-present';
  let text = coreAdapter ? 'limit not present' : 'webgpu not supported';
  if (coreAdapter && key in coreAdapter.limits) {
    const defaultLimit = defaultDevice?.limits[key] ?? kLimitInfo[key]?.default;
    const adapterLimit = coreAdapter.limits[key];
    tagName = '';
    const compare = key.startsWith('min')
      ? (a, b) => a < b
      : (a, b) => a > b;
    if (compare(adapterLimit, defaultLimit)) {
      tagName = 'exceeds-limit';
    }
    text = withShortSize(coreAdapter.limits[key]);
  }
  return [tagName, text];
}

function renderSpecLimit(key) {
  let tagName = 'not-present';
  let text = 'unknown';
  if (key in kLimitInfo) {
    tagName = '';
    text = withShortSize(kLimitInfo[key]?.default);
  }
  return [tagName, text];
}

renderDiagrams({
  limits(elem) {
    const addRow = makeTable(elem, ['limit name', 'your device', 'min']);
    for (const key of limitNames) {
      addRow([key, renderAdapterLimit(key), renderSpecLimit(key)]);
    }
  },

  features(elem) {
    const addRow = makeTable(elem, ['feature', 'your device']);
    if (coreAdapter) {
      const allKeys = new Set([...kFeatures, ...coreAdapter.features]);
      for (const key of [...allKeys.keys()].sort(sortAlphabetically)) {
        addRow([key, coreAdapter.features.has(key) ? '✅' : kFeatures.has(key) ? '🚫' : '🤷‍♂️']);
      }
    }
  },
});

