/* eslint-disable no-sparse-arrays */

/*
This file was copied and modified from the WebGPU Conformance Test Suite
https://github.com/gpuweb/cts/blob/main/src/webgpu/capability_info.ts

Copyright 2019 WebGPU CTS Contributors

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.

   3. Neither the name of the copyright holder nor the names of its
      contributors may be used to endorse or promote products derived from this
      software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function makeTable(members, defaults, table) {
  const result = {};
  for (const [k, v] of Object.entries(table)) {
    const item = {};
    for (let i = 0; i < members.length; ++i) {
      item[members[i]] = v[i] ?? defaults[i];
    }
    result[k] = item;
  }
  return result;
}

function keysOf(o) {
  return [...Object.keys(o)];
}

const kRegularTextureFormatInfo = /* prettier-ignore */ makeTable(
                           ['renderable', 'multisample', 'resolve', 'color', 'depth', 'stencil', 'storage', 'copySrc', 'copyDst',         'sampleType', 'bytesPerBlock', 'blockWidth', 'blockHeight', 'renderTargetPixelByteCost', 'renderTargetComponentAlignment',                  'feature',       'baseFormat'],
                           [            ,              ,          ,    true,   false,     false,          ,      true,      true,                     ,                ,            1,             1,                   undefined,                        undefined,                           ,          undefined], {
  // 8-bit formats
  'r8unorm':               [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               1,             ,              ,                           1,                                1],
  'r8snorm':               [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               1],
  'r8uint':                [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               1,             ,              ,                           1,                                1],
  'r8sint':                [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               1,             ,              ,                           1,                                1],
  // 16-bit formats
  'r16uint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               2,             ,              ,                           2,                                2],
  'r16sint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               2,             ,              ,                           2,                                2],
  'r16float':              [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               2,             ,              ,                           2,                                2],
  'rg8unorm':              [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               2,             ,              ,                           2,                                1],
  'rg8snorm':              [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               2],
  'rg8uint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               2,             ,              ,                           2,                                1],
  'rg8sint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               2,             ,              ,                           2,                                1],
  // 32-bit formats
  'r32uint':               [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',               4,             ,              ,                           4,                                4],
  'r32sint':               [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',               4,             ,              ,                           4,                                4],
  'r32float':              [        true,          true,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',               4,             ,              ,                           4,                                4],
  'rg16uint':              [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               4,             ,              ,                           4,                                2],
  'rg16sint':              [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               4,             ,              ,                           4,                                2],
  'rg16float':             [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           4,                                2],
  'rgba8unorm':            [        true,          true,      true,        ,        ,          ,      true,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'rgba8unorm'],
  'rgba8unorm-srgb':       [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'rgba8unorm'],
  'rgba8snorm':            [       false,         false,     false,        ,        ,          ,      true,          ,          ,              'float',               4],
  'rgba8uint':             [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'uint',               4,             ,              ,                           4,                                1],
  'rgba8sint':             [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'sint',               4,             ,              ,                           4,                                1],
  'bgra8unorm':            [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'bgra8unorm'],
  'bgra8unorm-srgb':       [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'bgra8unorm'],
  // Packed 32-bit formats
  'rgb10a2unorm':          [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                4],
  'rg11b10ufloat':         [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                4],
  'rgb9e5ufloat':          [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               4],
  // 64-bit formats
  'rg32uint':              [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',               8,             ,              ,                           8,                                4],
  'rg32sint':              [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',               8,             ,              ,                           8,                                4],
  'rg32float':             [        true,         false,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',               8,             ,              ,                           8,                                4],
  'rgba16uint':            [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'uint',               8,             ,              ,                           8,                                2],
  'rgba16sint':            [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'sint',               8,             ,              ,                           8,                                2],
  'rgba16float':           [        true,          true,      true,        ,        ,          ,      true,          ,          ,              'float',               8,             ,              ,                           8,                                2],
  // 128-bit formats
  'rgba32uint':            [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',              16,             ,              ,                          16,                                4],
  'rgba32sint':            [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',              16,             ,              ,                          16,                                4],
  'rgba32float':           [        true,         false,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',              16,             ,              ,                          16,                                4],
});
/* prettier-ignore */
const kTexFmtInfoHeader =  ['renderable', 'multisample', 'resolve', 'color', 'depth', 'stencil', 'storage', 'copySrc', 'copyDst',         'sampleType', 'bytesPerBlock', 'blockWidth', 'blockHeight', 'renderTargetPixelByteCost', 'renderTargetComponentAlignment',                  'feature',       'baseFormat'];
const kSizedDepthStencilFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [        true,          true,     false,   false,        ,          ,     false,          ,          ,                     ,                ,            1,             1,                   undefined,                        undefined,                           ,          undefined], {
  'depth32float':          [            ,              ,          ,        ,    true,     false,          ,      true,     false,              'depth',               4],
  'depth16unorm':          [            ,              ,          ,        ,    true,     false,          ,      true,      true,              'depth',               2],
  'stencil8':              [            ,              ,          ,        ,   false,      true,          ,      true,      true,               'uint',               1],
});

// Multi aspect sample type are now set to their first aspect
const kUnsizedDepthStencilFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [        true,          true,     false,   false,        ,          ,     false,     false,     false,                     ,       undefined,            1,             1,                            ,                                 ,                           ,          undefined], {
  'depth24plus':           [            ,              ,          ,        ,    true,     false,          ,          ,          ,              'depth'],
  'depth24plus-stencil8':  [            ,              ,          ,        ,    true,      true,          ,          ,          ,              'depth'],
  // MAINTENANCE_TODO: These should really be sized formats; see below MAINTENANCE_TODO about multi-aspect formats.
  'depth32float-stencil8': [            ,              ,          ,        ,    true,      true,          ,          ,          ,              'depth',                ,             ,              ,                            ,                                 ,    'depth32float-stencil8'],
});

// Separated compressed formats by type
const kBCTextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,            4,             4,                            ,                                 ,                           ,          undefined], {
  // Block Compression (BC) formats
  'bc1-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc1-rgba-unorm'],
  'bc1-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc1-rgba-unorm'],
  'bc2-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc2-rgba-unorm'],
  'bc2-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc2-rgba-unorm'],
  'bc3-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc3-rgba-unorm'],
  'bc3-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc3-rgba-unorm'],
  'bc4-r-unorm':           [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc4-r-snorm':           [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc5-rg-unorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc5-rg-snorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc6h-rgb-ufloat':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc6h-rgb-float':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc7-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc7-rgba-unorm'],
  'bc7-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc7-rgba-unorm'],
});
const kETC2TextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,            4,             4,                            ,                                 ,                           ,          undefined], {
  // Ericsson Compression (ETC2) formats
  'etc2-rgb8unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2',   'etc2-rgb8unorm'],
  'etc2-rgb8unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2',   'etc2-rgb8unorm'],
  'etc2-rgb8a1unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2', 'etc2-rgb8a1unorm'],
  'etc2-rgb8a1unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2', 'etc2-rgb8a1unorm'],
  'etc2-rgba8unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2',  'etc2-rgba8unorm'],
  'etc2-rgba8unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2',  'etc2-rgba8unorm'],
  'eac-r11unorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-r11snorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-rg11unorm':         [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-rg11snorm':         [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2'],
});
const kASTCTextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,             ,              ,                            ,                                 ,                           ,          undefined], {
  // Adaptable Scalable Compression (ASTC) formats
  'astc-4x4-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-astc',   'astc-4x4-unorm'],
  'astc-4x4-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-astc',   'astc-4x4-unorm'],
  'astc-5x4-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             4,                            ,                                 , 'texture-compression-astc',   'astc-5x4-unorm'],
  'astc-5x4-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             4,                            ,                                 , 'texture-compression-astc',   'astc-5x4-unorm'],
  'astc-5x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             5,                            ,                                 , 'texture-compression-astc',   'astc-5x5-unorm'],
  'astc-5x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             5,                            ,                                 , 'texture-compression-astc',   'astc-5x5-unorm'],
  'astc-6x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             5,                            ,                                 , 'texture-compression-astc',   'astc-6x5-unorm'],
  'astc-6x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             5,                            ,                                 , 'texture-compression-astc',   'astc-6x5-unorm'],
  'astc-6x6-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             6,                            ,                                 , 'texture-compression-astc',   'astc-6x6-unorm'],
  'astc-6x6-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             6,                            ,                                 , 'texture-compression-astc',   'astc-6x6-unorm'],
  'astc-8x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             5,                            ,                                 , 'texture-compression-astc',   'astc-8x5-unorm'],
  'astc-8x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             5,                            ,                                 , 'texture-compression-astc',   'astc-8x5-unorm'],
  'astc-8x6-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             6,                            ,                                 , 'texture-compression-astc',   'astc-8x6-unorm'],
  'astc-8x6-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             6,                            ,                                 , 'texture-compression-astc',   'astc-8x6-unorm'],
  'astc-8x8-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             8,                            ,                                 , 'texture-compression-astc',   'astc-8x8-unorm'],
  'astc-8x8-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             8,                            ,                                 , 'texture-compression-astc',   'astc-8x8-unorm'],
  'astc-10x5-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             5,                            ,                                 , 'texture-compression-astc',  'astc-10x5-unorm'],
  'astc-10x5-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             5,                            ,                                 , 'texture-compression-astc',  'astc-10x5-unorm'],
  'astc-10x6-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             6,                            ,                                 , 'texture-compression-astc',  'astc-10x6-unorm'],
  'astc-10x6-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             6,                            ,                                 , 'texture-compression-astc',  'astc-10x6-unorm'],
  'astc-10x8-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             8,                            ,                                 , 'texture-compression-astc',  'astc-10x8-unorm'],
  'astc-10x8-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             8,                            ,                                 , 'texture-compression-astc',  'astc-10x8-unorm'],
  'astc-10x10-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,            10,                            ,                                 , 'texture-compression-astc', 'astc-10x10-unorm'],
  'astc-10x10-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,            10,                            ,                                 , 'texture-compression-astc', 'astc-10x10-unorm'],
  'astc-12x10-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            10,                            ,                                 , 'texture-compression-astc', 'astc-12x10-unorm'],
  'astc-12x10-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            10,                            ,                                 , 'texture-compression-astc', 'astc-12x10-unorm'],
  'astc-12x12-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            12,                            ,                                 , 'texture-compression-astc', 'astc-12x12-unorm'],
  'astc-12x12-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            12,                            ,                                 , 'texture-compression-astc', 'astc-12x12-unorm'],
});

// Definitions for use locally. To access the table entries, use `kTextureFormatInfo`.

// MAINTENANCE_TODO: Consider generating the exports below programmatically by filtering the big list, instead
// of using these local constants? Requires some type magic though.
/* prettier-ignore */ const   kCompressedTextureFormatInfo = { ...kBCTextureFormatInfo, ...kETC2TextureFormatInfo, ...kASTCTextureFormatInfo };
/* prettier-ignore */ const        kColorTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kCompressedTextureFormatInfo };
/* prettier-ignore */ const    kEncodableTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo };
/* prettier-ignore */ const        kSizedTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo, ...kCompressedTextureFormatInfo };
/* prettier-ignore */ const        kDepthStencilFormatInfo = { ...kSizedDepthStencilFormatInfo, ...kUnsizedDepthStencilFormatInfo };
/* prettier-ignore */ const kUncompressedTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo, ...kUnsizedDepthStencilFormatInfo };
/* prettier-ignore */ const          kAllTextureFormatInfo = { ...kUncompressedTextureFormatInfo, ...kCompressedTextureFormatInfo };

/* prettier-ignore */ export const      kRegularTextureFormats = keysOf(     kRegularTextureFormatInfo);
/* prettier-ignore */ export const   kSizedDepthStencilFormats = keysOf(  kSizedDepthStencilFormatInfo);
/* prettier-ignore */ export const kUnsizedDepthStencilFormats = keysOf(kUnsizedDepthStencilFormatInfo);
/* prettier-ignore */ export const   kCompressedTextureFormats = keysOf(  kCompressedTextureFormatInfo);

/* prettier-ignore */ export const        kColorTextureFormats = keysOf(       kColorTextureFormatInfo);
/* prettier-ignore */ export const    kEncodableTextureFormats = keysOf(   kEncodableTextureFormatInfo);
/* prettier-ignore */ export const        kSizedTextureFormats = keysOf(       kSizedTextureFormatInfo);
/* prettier-ignore */ export const        kDepthStencilFormats = keysOf(       kDepthStencilFormatInfo);
/* prettier-ignore */ export const kUncompressedTextureFormats = keysOf(kUncompressedTextureFormatInfo);
/* prettier-ignore */ export const          kAllTextureFormats = keysOf(         kAllTextureFormatInfo);

// CompressedTextureFormat are unrenderable so filter from RegularTextureFormats for color targets is enough
export const kRenderableColorTextureFormats = kRegularTextureFormats.filter(
  v => kColorTextureFormatInfo[v].renderable
);

// The formats of GPUTextureFormat for canvas context.
export const kCanvasTextureFormats = ['bgra8unorm', 'rgba8unorm', 'rgba16float'];

export const kTextureFormatInfo = kAllTextureFormatInfo;