import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  makeTable,
} from './resources/elem.js';
import { shortSize } from './resources/utils.js';

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
  'maxInterStageShaderComponents':             [           ,        60,                          ],
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
  'bgra8unorm-storage',
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-bc',
  'texture-compression-etc2',
  'texture-compression-astc',
  'timestamp-query',
  'indirect-first-instance',
  'shader-f16',
  'rg11b10ufloat-renderable',
  'float32-filterable',
]);
window.k = kFeatures;

const adapter = await navigator.gpu?.requestAdapter();

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

renderDiagrams({
  limits(elem) {
    const addRow = makeTable(elem, ['limit name', 'your device', 'min']);
    for (const key of getObjLikeKeys(adapter.limits).sort(sortAlphabetically)) {
      addRow([key, [adapter.limits[key] > kLimitInfo[key]?.default ? 'exceeds-limit' : '', withShortSize(adapter.limits[key])], withShortSize(kLimitInfo[key]?.default)]);
    }
  },

  features(elem) {
    const addRow = makeTable(elem, ['feature', 'your device']);
    const allKeys = new Set([...kFeatures, ...adapter.features]);
    for (const key of [...allKeys.keys()].sort(sortAlphabetically)) {
      addRow([key, adapter.features.has(key) ? '✅' : kFeatures.has(key) ? '🚫' : '🤷‍♂️']);
    }
  },
});

