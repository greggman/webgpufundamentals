/* webgpu-utils@2.1.0, license MIT */
const roundUpToMultipleOf = (v, multiple) => (((v + multiple - 1) / multiple) | 0) * multiple;
function keysOf(obj) {
    return Object.keys(obj);
}
function range(count, fn) {
    return new Array(count).fill(0).map((_, i) => fn(i));
}
const isIterable = (v) => v !== null && typeof v[Symbol.iterator] === 'function';
function normalizeExtent3D(extent) {
    if (!extent) {
        return [1, 1, 1];
    }
    if (isIterable(extent)) {
        const [w, h = 1, d = 1] = [...extent];
        return [w, h, d];
    }
    const { width = 1, height = 1, depthOrArrayLayers = 1 } = extent;
    return [width, height, depthOrArrayLayers];
}
function normalizeOrigin3D(origin) {
    if (!origin) {
        return [0, 0, 0];
    }
    if (isIterable(origin)) {
        const [x, y = 0, z = 0] = [...origin];
        return [x, y, z];
    }
    const { x = 0, y = 0, z = 0 } = origin;
    return [x, y, z];
}
function addOrigin3D(a, b) {
    const an = normalizeOrigin3D(a);
    const bn = normalizeOrigin3D(b);
    return an.map((v, i) => v + bn[i]);
}

class TypedArrayViewGenerator {
    arrayBuffer;
    byteOffset;
    constructor(sizeInBytes) {
        this.arrayBuffer = new ArrayBuffer(sizeInBytes);
        this.byteOffset = 0;
    }
    align(alignment) {
        this.byteOffset = roundUpToMultipleOf(this.byteOffset, alignment);
    }
    pad(numBytes) {
        this.byteOffset += numBytes;
    }
    getView(Ctor, numElements) {
        const view = new Ctor(this.arrayBuffer, this.byteOffset, numElements);
        this.byteOffset += view.byteLength;
        return view;
    }
}
function subarray(arr, offset, length) {
    return arr.subarray(offset, offset + length);
}
const isTypedArray = (arr) => ArrayBuffer.isView(arr) && !(arr instanceof DataView);

const createTypeDefs = (defs) => defs;
const b$1 = createTypeDefs({
    i32: { numElements: 1, align: 4, size: 4, type: 'i32', View: Int32Array },
    u32: { numElements: 1, align: 4, size: 4, type: 'u32', View: Uint32Array },
    f32: { numElements: 1, align: 4, size: 4, type: 'f32', View: Float32Array },
    f16: { numElements: 1, align: 2, size: 2, type: 'u16', View: Uint16Array },
    vec2f: { numElements: 2, align: 8, size: 8, type: 'f32', View: Float32Array },
    vec2i: { numElements: 2, align: 8, size: 8, type: 'i32', View: Int32Array },
    vec2u: { numElements: 2, align: 8, size: 8, type: 'u32', View: Uint32Array },
    vec2h: { numElements: 2, align: 4, size: 4, type: 'u16', View: Uint16Array },
    vec3i: { numElements: 3, align: 16, size: 12, type: 'i32', View: Int32Array },
    vec3u: { numElements: 3, align: 16, size: 12, type: 'u32', View: Uint32Array },
    vec3f: { numElements: 3, align: 16, size: 12, type: 'f32', View: Float32Array },
    vec3h: { numElements: 3, align: 8, size: 6, type: 'u16', View: Uint16Array },
    vec4i: { numElements: 4, align: 16, size: 16, type: 'i32', View: Int32Array },
    vec4u: { numElements: 4, align: 16, size: 16, type: 'u32', View: Uint32Array },
    vec4f: { numElements: 4, align: 16, size: 16, type: 'f32', View: Float32Array },
    vec4h: { numElements: 4, align: 8, size: 8, type: 'u16', View: Uint16Array },
    // AlignOf(vecR)	SizeOf(array<vecR, C>)
    mat2x2f: { numElements: 4, align: 8, size: 16, type: 'f32', View: Float32Array },
    mat2x2h: { numElements: 4, align: 4, size: 8, type: 'u16', View: Uint16Array },
    mat3x2f: { numElements: 6, align: 8, size: 24, type: 'f32', View: Float32Array },
    mat3x2h: { numElements: 6, align: 4, size: 12, type: 'u16', View: Uint16Array },
    mat4x2f: { numElements: 8, align: 8, size: 32, type: 'f32', View: Float32Array },
    mat4x2h: { numElements: 8, align: 4, size: 16, type: 'u16', View: Uint16Array },
    mat2x3f: { numElements: 8, align: 16, size: 32, pad: [3, 1], type: 'f32', View: Float32Array },
    mat2x3h: { numElements: 8, align: 8, size: 16, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat3x3f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: 'f32', View: Float32Array },
    mat3x3h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat4x3f: { numElements: 16, align: 16, size: 64, pad: [3, 1], type: 'f32', View: Float32Array },
    mat4x3h: { numElements: 16, align: 8, size: 32, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat2x4f: { numElements: 8, align: 16, size: 32, type: 'f32', View: Float32Array },
    mat2x4h: { numElements: 8, align: 8, size: 16, type: 'u16', View: Uint16Array },
    mat3x4f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: 'f32', View: Float32Array },
    mat3x4h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat4x4f: { numElements: 16, align: 16, size: 64, type: 'f32', View: Float32Array },
    mat4x4h: { numElements: 16, align: 8, size: 32, type: 'u16', View: Uint16Array },
    // Note: At least as of WGSL V1 you can not create a bool for uniform or storage.
    // You can only create one in an internal struct. But, this code generates
    // views of structs and it needs to not fail if the struct has a bool
    bool: { numElements: 0, align: 1, size: 0, type: 'bool', View: Uint32Array },
});
const kWGSLTypeInfo = createTypeDefs({
    ...b$1,
    'atomic<i32>': b$1.i32,
    'atomic<u32>': b$1.u32,
    'vec2<i32>': b$1.vec2i,
    'vec2<u32>': b$1.vec2u,
    'vec2<f32>': b$1.vec2f,
    'vec2<f16>': b$1.vec2h,
    'vec3<i32>': b$1.vec3i,
    'vec3<u32>': b$1.vec3u,
    'vec3<f32>': b$1.vec3f,
    'vec3<f16>': b$1.vec3h,
    'vec4<i32>': b$1.vec4i,
    'vec4<u32>': b$1.vec4u,
    'vec4<f32>': b$1.vec4f,
    'vec4<f16>': b$1.vec4h,
    'mat2x2<f32>': b$1.mat2x2f,
    'mat2x2<f16>': b$1.mat2x2h,
    'mat3x2<f32>': b$1.mat3x2f,
    'mat3x2<f16>': b$1.mat3x2h,
    'mat4x2<f32>': b$1.mat4x2f,
    'mat4x2<f16>': b$1.mat4x2h,
    'mat2x3<f32>': b$1.mat2x3f,
    'mat2x3<f16>': b$1.mat2x3h,
    'mat3x3<f32>': b$1.mat3x3f,
    'mat3x3<f16>': b$1.mat3x3h,
    'mat4x3<f32>': b$1.mat4x3f,
    'mat4x3<f16>': b$1.mat4x3h,
    'mat2x4<f32>': b$1.mat2x4f,
    'mat2x4<f16>': b$1.mat2x4h,
    'mat3x4<f32>': b$1.mat3x4f,
    'mat3x4<f16>': b$1.mat3x4h,
    'mat4x4<f32>': b$1.mat4x4f,
    'mat4x4<f16>': b$1.mat4x4h,
});
const kWGSLTypes = keysOf(kWGSLTypeInfo);

/**
 * Set which intrinsic types to make views for.
 *
 * Example:
 *
 * Given a an array of intrinsics like this
 * `array<vec3, 200>`
 *
 * The default is to create a single `Float32Array(4 * 200)`
 * because creating 200 `Float32Array` views is not usually
 * what you want.
 *
 * If you do want individual views then you'd call
 * `setIntrinsicsToView(['vec3f'])` and now you get
 * an array of 200 `Float32Array`s.
 *
 * Note: `setIntrinsicsToView` always sets ALL types. The list you
 * pass it is the types you want views created for, all other types
 * will be reset to do the default. In other words
 *
 * ```js
 * setIntrinsicsToView(['vec3f'])
 * setIntrinsicsToView(['vec2f'])
 * ```
 *
 * Only `vec2f` will have views created. `vec3f` has been reset to the default by
 * the second call
 *
 * You can pass in `true` as the 2nd parameter to make it set which types
 * to flatten and all others will be set to have views created. For example
 * to expand all types would be `setIntrinsicsToView([], true)`. To expand
 * all except `f32` would be `setIntrinsicsToView(['f32'], true)`.
 *
 * To reset all types to the default call it with no arguments
 *
 * @param types array of types to make views for
 * @param flatten whether to flatten or expand the specified types.
 */
function setIntrinsicsToView(types = [], flatten) {
    // we need to track what we've viewed because for example `vec3f` references
    // the same info as `vec3<f32>` so we'd set one and reset the other.
    const visited = new Set();
    for (const type of kWGSLTypes) {
        const info = kWGSLTypeInfo[type];
        if (!visited.has(info)) {
            visited.add(info);
            info.flatten = types.includes(type) ? flatten : !flatten;
        }
    }
}
setIntrinsicsToView();
// This needs to be fixed! 😱
function getSizeOfTypeDef(typeDef) {
    const asArrayDef = typeDef;
    const elementType = asArrayDef.elementType;
    if (elementType) {
        return asArrayDef.size;
        /*
        if (isIntrinsic(elementType)) {
            const asIntrinsicDef = elementType as IntrinsicDefinition;
            const { align } = typeInfo[asIntrinsicDef.type];
            return roundUpToMultipleOf(typeDef.size, align) * asArrayDef.numElements;
        } else {
            return asArrayDef.numElements * getSizeOfTypeDef(elementType);
        }
        */
    }
    else {
        const asStructDef = typeDef;
        const numElements = asArrayDef.numElements || 1;
        if (asStructDef.fields) {
            return typeDef.size * numElements;
        }
        else {
            const asIntrinsicDef = typeDef;
            const { align } = kWGSLTypeInfo[asIntrinsicDef.type];
            return numElements > 1
                ? roundUpToMultipleOf(typeDef.size, align) * numElements
                : typeDef.size;
        }
    }
}
// If numElements is undefined this is NOT an array. If it is defined then it IS an array
// Sizes for arrays are different than sizes for non-arrays. Example
// a vec3f non array is Float32Array(3)
// a vec3f array of 2 is Float32Array(4 * 2)
// a vec3f array of 1 is Float32Array(4 * 1)
function makeIntrinsicTypedArrayView(typeDef, buffer, baseOffset, numElements) {
    const { size, type } = typeDef;
    try {
        const { View, align, size: intrinsicSize } = kWGSLTypeInfo[type];
        const isArray = numElements !== undefined;
        const sizeInBytes = isArray
            ? roundUpToMultipleOf(size, align)
            : intrinsicSize;
        const baseNumElements = sizeInBytes / View.BYTES_PER_ELEMENT;
        const effectiveNumElements = isArray
            ? (numElements === 0
                ? (buffer.byteLength - baseOffset) / sizeInBytes
                : numElements)
            : 1;
        return new View(buffer, baseOffset, baseNumElements * effectiveNumElements);
    }
    catch {
        throw new Error(`unknown type: ${type}`);
    }
}
function isIntrinsic(typeDef) {
    return !typeDef.fields &&
        !typeDef.elementType;
}
/**
 * Creates a set of named TypedArray views on an ArrayBuffer. If you don't
 * pass in an ArrayBuffer, one will be created. If you're using an unsized
 * array then you must pass in your own arraybuffer
 *
 * Example:
 *
 * ```js
 * const code = `
 * struct Stuff {
 *    direction: vec3f,
 *    strength: f32,
 *    matrix: mat4x4f,
 * };
 * @group(0) @binding(0) var<uniform> uni: Stuff;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const views = makeTypedArrayViews(devs.uniforms.uni.typeDefinition);
 * ```
 *
 * views would effectively be
 *
 * ```js
 * views = {
 *   direction: Float32Array(arrayBuffer, 0, 3),
 *   strength: Float32Array(arrayBuffer, 3, 4),
 *   matrix: Float32Array(arraybuffer, 4, 20),
 * };
 * ```
 *
 * You can use the views directly or you can use {@link setStructuredView}
 *
 * @param typeDef Definition of the various types of views.
 * @param arrayBuffer Optional ArrayBuffer to use (if one provided one will be created)
 * @param offset Optional offset in existing ArrayBuffer to start the views.
 * @returns A bunch of named TypedArray views and the ArrayBuffer
 */
function makeTypedArrayViews(typeDef, arrayBuffer, offset) {
    const baseOffset = offset || 0;
    const buffer = arrayBuffer || new ArrayBuffer(getSizeOfTypeDef(typeDef));
    const makeViews = (typeDef, baseOffset) => {
        const asArrayDef = typeDef;
        const elementType = asArrayDef.elementType;
        if (elementType) {
            // TODO: Should be optional? Per Type? Depth set? Per field?
            // The issue is, if we have `array<vec4, 1000>` we don't likely
            // want 1000 `Float32Array(4)` views. We want 1 `Float32Array(1000 * 4)` view.
            // On the other hand, if we have `array<mat4x4, 10>` the maybe we do want
            // 10 `Float32Array(16)` views since you might want to do
            // `mat4.perspective(fov, aspect, near, far, foo.bar.arrayOf10Mat4s[3])`;
            if (isIntrinsic(elementType) && kWGSLTypeInfo[elementType.type].flatten) {
                return makeIntrinsicTypedArrayView(elementType, buffer, baseOffset, asArrayDef.numElements);
            }
            else {
                const { size } = getSizeAndAlignmentOfUnsizedArrayElementOfTypeDef(typeDef);
                const effectiveNumElements = asArrayDef.numElements === 0
                    ? (buffer.byteLength - baseOffset) / size
                    : asArrayDef.numElements;
                return range(effectiveNumElements, i => makeViews(elementType, baseOffset + size * i));
            }
        }
        else if (typeof typeDef === 'string') {
            throw Error('unreachable');
        }
        else {
            const fields = typeDef.fields;
            if (fields) {
                const views = {};
                for (const [name, { type, offset }] of Object.entries(fields)) {
                    views[name] = makeViews(type, baseOffset + offset);
                }
                return views;
            }
            else {
                return makeIntrinsicTypedArrayView(typeDef, buffer, baseOffset);
            }
        }
    };
    return { views: makeViews(typeDef, baseOffset), arrayBuffer: buffer };
}
/**
 * Given a set of TypeArrayViews and matching JavaScript data
 * sets the content of the views.
 *
 * Example:
 *
 * ```js
 * const code = `
 * struct Stuff {
 *    direction: vec3f,
 *    strength: f32,
 *    matrix: mat4x4f,
 * };
 * @group(0) @binding(0) var<uniform> uni: Stuff;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const views = makeTypedArrayViews(devs.uniforms.uni.typeDefinition);
 *
 * setStructuredViews({
 *   direction: [1, 2, 3],
 *   strength: 45,
 *   matrix: [
 *     1, 0, 0, 0,
 *     0, 1, 0, 0,
 *     0, 0, 1, 0,
 *     0, 0, 0, 1,
 *   ],
 * });
 * ```
 *
 * The code above will set the various views, which all point to different
 * locations within the same array buffer.
 *
 * See {@link makeTypedArrayViews}.
 *
 * @param data The new values
 * @param views TypedArray views as returned from {@link makeTypedArrayViews}
 */
function setStructuredView(data, views) {
    if (data === undefined) {
        return;
    }
    else if (isTypedArray(views)) {
        const view = views;
        if (view.length === 1 && typeof data === 'number') {
            view[0] = data;
        }
        else {
            if (Array.isArray(data[0]) || isTypedArray(data[0])) {
                // complete hack!
                // there's no type data here so let's guess based on the user's data
                const dataLen = data[0].length;
                const stride = dataLen === 3 ? 4 : dataLen;
                for (let i = 0; i < data.length; ++i) {
                    const offset = i * stride;
                    view.set(data[i], offset);
                }
            }
            else {
                view.set(data);
            }
        }
    }
    else if (Array.isArray(views)) {
        const asArray = views;
        data.forEach((newValue, ndx) => {
            setStructuredView(newValue, asArray[ndx]);
        });
    }
    else {
        const asViews = views;
        for (const [key, newValue] of Object.entries(data)) {
            const view = asViews[key];
            if (view) {
                setStructuredView(newValue, view);
            }
        }
    }
}
/**
 * Given a VariableDefinition, create matching TypedArray views
 *
 * @param varDef A VariableDefinition as returned from {@link makeShaderDataDefinitions}
 * @param arrayBuffer Optional ArrayBuffer for the views
 * @param offset Optional offset into the ArrayBuffer for the views
 * @returns TypedArray views for the various named fields of the structure as well
 *    as a `set` function to make them easy to set, and the arrayBuffer
 *
 * ```js
 * const code = `
 * struct HSL {
 *   hue: f32,
 *   sat: f32,
 *   lum: f32,
 * };
 * struct MyStorage {
 *    colors: array<HSL, 4>,
 *    brightness: f32,
 *    kernel: array<f32, 9>,
 * };
 * @group(0) @binding(0) var<storage> myStorage: MyStorage;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const myUniformValues = makeStructuredView(defs.storages.myStorage);
 *
 * myUniformValues.set({
 *   colors: [
 *     ,
 *     ,
 *     { hue: 0.5, sat: 1.0, lum: 0.5 },  // only set the 3rd color
 *   ],
 *   brightness: 0.8,
 *   kernel: [
 *      1, 0, -1,
 *      2, 0, -2,
 *      1, 0, -1,
 *   ],
 * });
 * ```
 *
 * data definition can come from `defs.uniforms.<nameOfUniform>`, `defs.storages.<nameOfStorage>`
 * and `defs.structs.<nameOfStruct>`.
 *
 * What this function does:
 *
 * 1. It creates an `ArrayBuffer` of the size equal to the definition passed in (unless you pass in an existing ArrayBuffer)
 *
 * 2. It makes `TypedArray` views of to match the definition.
 *
 * 3. It returns an object with the the `ArrayBuffer`, the TypedArray views, and a `set` function which is just a wrapper
 *    for `setStructView` that passes in the views.
 *
 * For example: Given a data definition created by makeShaderDataDefinitions for this WGSL
 *
 * ```wgsl
 * struct Light {
 *   lightWorldPosition: vec3f,
 *   shininess: f32,
 *   lightDirection: vec3f,
 *   innerLimit: f32,
 *   outerLimit: f32,
 * };
 * struct Uniforms {
 *   normalMatrix: mat3x3f,
 *   worldViewProjection: mat4x4f,
 *   world: mat4x4f,
 *   color: vec4f,
 *   viewWorldPosition: vec3f,
 *   lights: array<Light, 3>,
 * };
 * @group(0) @binding(0) var<uniform> myUniforms: Uniforms;
 * ```
 *
 * `makeStructuredView(defs.uniforms.myUniforms)` would return this
 *
 * ```js
 * const arrayBuffer = new ArrayBuffer(368)
 * const views = {
 *   normalMatrix: new Float32Array(arrayBuffer, 0, 12),
 *   worldViewProjection: new Float32Array(arrayBuffer, 48, 16),
 *   world: new Float32Array(arrayBuffer, 112, 16),
 *   color: new Float32Array(arrayBuffer, 176, 4),
 *   viewWorldPosition: new Float32Array(arrayBuffer, 192, 3),
 *   lights: [
 *     {
 *       lightWorldPosition: new Float32Array(arrayBuffer, 208, 3),
 *       shininess: new Float32Array(arrayBuffer, 220, 1),
 *       lightDirection: new Float32Array(arrayBuffer, 224, 3),
 *       innerLimit: new Float32Array(arrayBuffer, 236, 1),
 *       outerLimit: new Float32Array(arrayBuffer, 240, 1),
 *     },
 *     {
 *       lightWorldPosition: new Float32Array(arrayBuffer, 256, 3),
 *       shininess: new Float32Array(arrayBuffer, 268, 1),
 *       lightDirection: new Float32Array(arrayBuffer, 272, 3),
 *       innerLimit: new Float32Array(arrayBuffer, 284, 1),
 *       outerLimit: new Float32Array(arrayBuffer, 288, 1),
 *     },
 *     {
 *       lightWorldPosition: new Float32Array(arrayBuffer, 304, 3),
 *       shininess: new Float32Array(arrayBuffer, 316, 1),
 *       lightDirection: new Float32Array(arrayBuffer, 320, 3),
 *       innerLimit: new Float32Array(arrayBuffer, 332, 1),
 *       outerLimit: new Float32Array(arrayBuffer, 336, 1),
 *     },
 *   ],
 *   mode: new Uint32Array(UniformsValues, 352, 1),
 * };
 * result = {
 *   arrayBuffer,
 *   views,
 *   set(data: any) {
 *     setStructuredView(data, views.views);
 *   },
 * }
 * ```
 *
 * From this, you can see you can set the value in the array buffer for any field/member/property
 * directly. Example
 *
 * ```js
 * result.views.lights[2].lightDirection.set([7, 8, 9]);
 * result.views.lights[2].innerLimit[0] = 4;
 * ```
 *
 * `set` just takes a JS object and matches property names to the view names.
 *
 * ```js
 * result.set({
 *   color: [1, 1, 0, 1],
 *   viewWorldPosition: [12, 34, 56],
 *   mode: 8,
 * });
 * ```
 *
 * Is equivalent to
 *
 * ```js
 * result.views.color.set([1, 1, 0, 1]);
 * result.views.worldViewPosition.set([12, 34, 56]);
 * result.views.mode[0] = 8;
 * ```
 *
 * Further, `set` is just a short cut for `setStructuredView` passing in the root
 * `result'views`.
 *
 * So, for example, if you want to set the light at index 2, this would work.
 *
 * ```js
 * setStructuredView({
 *   lightWorldPosition: [1, 2, 3],
 *   shininess: 4,
 *   lightDirection: [5, 6, 7],
 *   innerLimit: 8,
 *   outerLimit: 9,
 * }, result.views.lights[2]);
 * ```
 */
function makeStructuredView(varDef, arrayBuffer, offset = 0) {
    const asVarDef = varDef;
    const typeDef = asVarDef.group === undefined ? varDef : asVarDef.typeDefinition;
    const views = makeTypedArrayViews(typeDef, arrayBuffer, offset);
    return {
        ...views,
        set(data) {
            setStructuredView(data, views.views);
        },
    };
}
const s_views = new WeakMap();
function getViewsByCtor(arrayBuffer) {
    let viewsByCtor = s_views.get(arrayBuffer);
    if (!viewsByCtor) {
        viewsByCtor = new Map();
        s_views.set(arrayBuffer, viewsByCtor);
    }
    return viewsByCtor;
}
function getView(arrayBuffer, Ctor) {
    const viewsByCtor = getViewsByCtor(arrayBuffer);
    let view = viewsByCtor.get(Ctor);
    if (!view) {
        view = new Ctor(arrayBuffer);
        viewsByCtor.set(Ctor, view);
    }
    return view;
}
// Is this something like [1,2,3]?
function isArrayLikeOfNumber(data) {
    return isTypedArray(data) || Array.isArray(data) && typeof data[0] === 'number';
}
function setIntrinsicFromArrayLikeOfNumber(typeDef, data, arrayBuffer, offset) {
    const asIntrinsicDefinition = typeDef;
    const type = kWGSLTypeInfo[asIntrinsicDefinition.type];
    const view = getView(arrayBuffer, type.View);
    const index = offset / view.BYTES_PER_ELEMENT;
    if (typeof data === 'number') {
        view[index] = data;
    }
    else {
        view.set(data, index);
    }
}
/**
 * Sets values on an existing array buffer from a TypeDefinition
 * @param typeDef A type definition provided by {@link makeShaderDataDefinitions}
 * @param data The source data
 * @param arrayBuffer The arrayBuffer who's data to set.
 * @param offset An offset in the arrayBuffer to start at.
 */
function setTypedValues(typeDef, data, arrayBuffer, offset = 0) {
    const asArrayDef = typeDef;
    const elementType = asArrayDef.elementType;
    if (elementType) {
        // It's ArrayDefinition
        if (isIntrinsic(elementType)) {
            const asIntrinsicDef = elementType;
            if (isArrayLikeOfNumber(data)) {
                setIntrinsicFromArrayLikeOfNumber(asIntrinsicDef, data, arrayBuffer, offset);
                return;
            }
        }
        data.forEach((newValue, ndx) => {
            setTypedValues(elementType, newValue, arrayBuffer, offset + elementType.size * ndx);
        });
        return;
    }
    const asStructDef = typeDef;
    const fields = asStructDef.fields;
    if (fields) {
        // It's StructDefinition
        for (const [key, newValue] of Object.entries(data)) {
            const fieldDef = fields[key];
            if (fieldDef) {
                setTypedValues(fieldDef.type, newValue, arrayBuffer, offset + fieldDef.offset);
            }
        }
    }
    else {
        // It's IntrinsicDefinition
        setIntrinsicFromArrayLikeOfNumber(typeDef, data, arrayBuffer, offset);
    }
}
/**
 * Same as {@link setTypedValues} except it takes a {@link VariableDefinition}.
 * @param varDef A variable definition provided by {@link makeShaderDataDefinitions}
 * @param data The source data
 * @param arrayBuffer The arrayBuffer who's data to set.
 * @param offset An offset in the arrayBuffer to start at.
 */
function setStructuredValues(varDef, data, arrayBuffer, offset = 0) {
    setTypedValues(varDef.typeDefinition, data, arrayBuffer, offset);
}
function getAlignmentOfTypeDef(typeDef) {
    const asArrayDef = typeDef;
    const elementType = asArrayDef.elementType;
    if (elementType) {
        return getAlignmentOfTypeDef(elementType);
    }
    const asStructDef = typeDef;
    const fields = asStructDef.fields;
    if (fields) {
        return Object.values(fields).reduce((max, { type }) => Math.max(max, getAlignmentOfTypeDef(type)), 0);
    }
    const { type } = typeDef;
    const { align } = kWGSLTypeInfo[type];
    return align;
}
function getSizeAndAlignmentOfUnsizedArrayElementOfTypeDef(typeDef) {
    const asArrayDef = typeDef;
    const elementType = asArrayDef.elementType;
    if (elementType) {
        const unalignedSize = elementType.size;
        const align = getAlignmentOfTypeDef(elementType);
        return {
            unalignedSize,
            align,
            size: roundUpToMultipleOf(unalignedSize, align),
        };
    }
    const asStructDef = typeDef;
    const fields = asStructDef.fields;
    if (fields) {
        const lastField = Object.values(fields).pop();
        if (lastField.type.size === 0) {
            return getSizeAndAlignmentOfUnsizedArrayElementOfTypeDef(lastField.type);
        }
    }
    return {
        size: 0,
        unalignedSize: 0,
        align: 1,
    };
}
/**
 * Returns the size, align, and unalignedSize of "the" unsized array element. Unsized arrays are only
 * allowed at the outer most level or the last member of a top level struct.
 *
 * Example:
 *
 * ```js
 * const code = `
 * struct Foo {
 *   a: u32,
 *   b: array<vec3f>,
 * };
 * @group(0) @binding(0) var<storage> f: Foo;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const { size, align, unalignedSize } = getSizeAndAlignmentOfUnsizedArrayElement(
 *    defs.storages.f);
 * // size = 16   (since you need to allocate 16 bytes per element)
 * // align = 16  (since vec3f needs to be aligned to 16 bytes)
 * // unalignedSize = 12 (since only 12 bytes are used for a vec3f)
 * ```
 *
 * Generally you only need size. Example:
 *
 * ```js
 * const code = `
 * struct Foo {
 *   a: u32,
 *   b: array<vec3f>,
 * };
 * @group(0) @binding(0) var<storage> f: Foo;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const { size } = getSizeAndAlignmentOfUnsizedArrayElement(defs.storages.f);
 * const numElements = 10;
 * const views = makeStructuredViews(
 *    defs.storages.f,
 *    new ArrayBuffer(defs.storages.f.size + size * numElements));
 * ```
 *
 * @param varDef A variable definition provided by {@link makeShaderDataDefinitions}
 * @returns the size, align, and unalignedSize in bytes of the unsized array element in this type definition.
 *   If there is no unsized array, size = 0.
 */
function getSizeAndAlignmentOfUnsizedArrayElement(varDef) {
    const asVarDef = varDef;
    const typeDef = asVarDef.group === undefined ? varDef : asVarDef.typeDefinition;
    return getSizeAndAlignmentOfUnsizedArrayElementOfTypeDef(typeDef);
}

class e{constructor(e,t){this.name=e,this.attributes=t,this.size=0;}get isArray(){return  false}get isStruct(){return  false}get isTemplate(){return  false}get isPointer(){return  false}getTypeName(){return this.name}}class t{constructor(e,t,n){this.name=e,this.type=t,this.attributes=n,this.offset=0,this.size=0;}get isArray(){return this.type.isArray}get isStruct(){return this.type.isStruct}get isTemplate(){return this.type.isTemplate}get align(){return this.type.isStruct?this.type.align:0}get members(){return this.type.isStruct?this.type.members:null}get format(){return this.type.isArray||this.type.isTemplate?this.type.format:null}get count(){return this.type.isArray?this.type.count:0}get stride(){return this.type.isArray?this.type.stride:this.size}}class n extends e{constructor(e,t){super(e,t),this.members=[],this.align=0,this.startLine=-1,this.endLine=-1,this.inUse=false;}get isStruct(){return  true}}class s extends e{constructor(e,t){super(e,t),this.count=0,this.stride=0;}get isArray(){return  true}getTypeName(){return `array<${this.format.getTypeName()}, ${this.count}>`}}class r extends e{constructor(e,t,n){super(e,n),this.format=t;}get isPointer(){return  true}getTypeName(){return `&${this.format.getTypeName()}`}}class a extends e{constructor(e,t,n,s){super(e,n),this.format=t,this.access=s;}get isTemplate(){return  true}getTypeName(){let e=this.name;if(null!==this.format){if('vec2'===e||'vec3'===e||'vec4'===e||'mat2x2'===e||'mat2x3'===e||'mat2x4'===e||'mat3x2'===e||'mat3x3'===e||'mat3x4'===e||'mat4x2'===e||'mat4x3'===e||'mat4x4'===e){if('f32'===this.format.name)return e+='f',e;if('i32'===this.format.name)return e+='i',e;if('u32'===this.format.name)return e+='u',e;if('bool'===this.format.name)return e+='b',e;if('f16'===this.format.name)return e+='h',e}e+=`<${this.format.name}>`;}else if('vec2'===e||'vec3'===e||'vec4'===e)return e;return e}}var i;(e=>{e[e.Uniform=0]='Uniform',e[e.Storage=1]='Storage',e[e.Immediate=2]='Immediate',e[e.Texture=3]='Texture',e[e.Sampler=4]='Sampler',e[e.StorageTexture=5]='StorageTexture';})(i||(i={}));class o{constructor(e,t,n,s,r,a,i){this.relations=null,this.name=e,this.type=t,this.group=n,this.binding=s,this.attributes=r,this.resourceType=a,this.access=i;}get isArray(){return this.type.isArray}get isStruct(){return this.type.isStruct}get isTemplate(){return this.type.isTemplate}get size(){return this.type.size}get align(){return this.type.isStruct?this.type.align:0}get members(){return this.type.isStruct?this.type.members:null}get format(){return this.type.isArray||this.type.isTemplate?this.type.format:null}get count(){return this.type.isArray?this.type.count:0}get stride(){return this.type.isArray?this.type.stride:this.size}}class l{constructor(e,t){this.name=e,this.type=t;}}class c{constructor(e,t,n,s){this.name=e,this.type=t,this.locationType=n,this.location=s,this.interpolation=null;}}class u{constructor(e,t,n,s){this.name=e,this.type=t,this.locationType=n,this.location=s;}}class h{constructor(e,t,n,s){this.name=e,this.type=t,this.attributes=n,this.id=s;}}class f{constructor(e,t,n){this.name=e,this.type=t,this.attributes=n;}}class p{constructor(e,t=null,n){this.stage=null,this.inputs=[],this.outputs=[],this.arguments=[],this.returnType=null,this.resources=[],this.overrides=[],this.startLine=-1,this.endLine=-1,this.inUse=false,this.calls=new Set,this.name=e,this.stage=t,this.attributes=n;}}class d{constructor(){this.vertex=[],this.fragment=[],this.compute=[];}}function m(e){var t=(32768&e)>>15,n=(31744&e)>>10,s=1023&e;return 0==n?(t?-1:1)*Math.pow(2,-14)*(s/Math.pow(2,10)):31==n?s?NaN:1/0*(t?-1:1):(t?-1:1)*Math.pow(2,n-15)*(1+s/Math.pow(2,10))}const _=new Float32Array(1),g=new Int32Array(_.buffer),x=new Uint16Array(1);function y(e){_[0]=e;const t=g[0],n=t>>31&1;let s=t>>23&255,r=8388607&t;if(255===s)return x[0]=n<<15|31744|(0!==r?512:0),x[0];if(0===s){if(0===r)return x[0]=n<<15,x[0];r|=8388608;let e=113;for(;!(8388608&r);)r<<=1,e--;return s=127-e,r&=8388607,s>0?(r=(r>>126-s)+(r>>127-s&1),x[0]=n<<15|s<<10|r>>13,x[0]):(x[0]=n<<15,x[0])}return s=s-127+15,s>=31?(x[0]=n<<15|31744,x[0]):s<=0?s<-10?(x[0]=n<<15,x[0]):(r=(8388608|r)>>1-s,x[0]=n<<15|r>>13,x[0]):(r>>=13,x[0]=n<<15|s<<10|r,x[0])}const b=new Uint32Array(1),v=new Float32Array(b.buffer,0,1);function w(e){const t=112+(e>>6&31)<<23|(63&e)<<17;return b[0]=t,v[0]}function k(e,t,n,s,r,a,i,o,l){const c=s*(i>>=r)*(a>>=r)+n*i+t*o;switch(l){case 'r8unorm':return [I(e,c,'8unorm',1)[0]];case 'r8snorm':return [I(e,c,'8snorm',1)[0]];case 'r8uint':return [I(e,c,'8uint',1)[0]];case 'r8sint':return [I(e,c,'8sint',1)[0]];case 'rg8unorm':{const t=I(e,c,'8unorm',2);return [t[0],t[1]]}case 'rg8snorm':{const t=I(e,c,'8snorm',2);return [t[0],t[1]]}case 'rg8uint':{const t=I(e,c,'8uint',2);return [t[0],t[1]]}case 'rg8sint':{const t=I(e,c,'8sint',2);return [t[0],t[1]]}case 'rgba8unorm-srgb':case 'rgba8unorm':{const t=I(e,c,'8unorm',4);return [t[0],t[1],t[2],t[3]]}case 'rgba8snorm':{const t=I(e,c,'8snorm',4);return [t[0],t[1],t[2],t[3]]}case 'rgba8uint':{const t=I(e,c,'8uint',4);return [t[0],t[1],t[2],t[3]]}case 'rgba8sint':{const t=I(e,c,'8sint',4);return [t[0],t[1],t[2],t[3]]}case 'bgra8unorm-srgb':case 'bgra8unorm':{const t=I(e,c,'8unorm',4);return [t[2],t[1],t[0],t[3]]}case 'r16uint':return [I(e,c,'16uint',1)[0]];case 'r16sint':return [I(e,c,'16sint',1)[0]];case 'r16float':return [I(e,c,'16float',1)[0]];case 'rg16uint':{const t=I(e,c,'16uint',2);return [t[0],t[1]]}case 'rg16sint':{const t=I(e,c,'16sint',2);return [t[0],t[1]]}case 'rg16float':{const t=I(e,c,'16float',2);return [t[0],t[1]]}case 'rgba16uint':{const t=I(e,c,'16uint',4);return [t[0],t[1],t[2],t[3]]}case 'rgba16sint':{const t=I(e,c,'16sint',4);return [t[0],t[1],t[2],t[3]]}case 'rgba16float':{const t=I(e,c,'16float',4);return [t[0],t[1],t[2],t[3]]}case 'r32uint':return [I(e,c,'32uint',1)[0]];case 'r32sint':return [I(e,c,'32sint',1)[0]];case 'depth16unorm':case 'depth24plus':case 'depth24plus-stencil8':case 'depth32float':case 'depth32float-stencil8':case 'r32float':return [I(e,c,'32float',1)[0]];case 'rg32uint':{const t=I(e,c,'32uint',2);return [t[0],t[1]]}case 'rg32sint':{const t=I(e,c,'32sint',2);return [t[0],t[1]]}case 'rg32float':{const t=I(e,c,'32float',2);return [t[0],t[1]]}case 'rgba32uint':{const t=I(e,c,'32uint',4);return [t[0],t[1],t[2],t[3]]}case 'rgba32sint':{const t=I(e,c,'32sint',4);return [t[0],t[1],t[2],t[3]]}case 'rgba32float':{const t=I(e,c,'32float',4);return [t[0],t[1],t[2],t[3]]}case 'rg11b10ufloat':{const t=new Uint32Array(e.buffer,c,1)[0],n=(4192256&t)>>11,s=(4290772992&t)>>22;return [w(2047&t),w(n),function(e){const t=112+(e>>5&31)<<23|(31&e)<<18;return b[0]=t,v[0]}(s),1]}}return null}function I(e,t,n,s){const r=[0,0,0,0];for(let a=0;a<s;++a)switch(n){case '8unorm':r[a]=e[t]/255,t++;break;case '8snorm':r[a]=e[t]/255*2-1,t++;break;case '8uint':r[a]=e[t],t++;break;case '8sint':r[a]=e[t]-127,t++;break;case '16uint':r[a]=e[t]|e[t+1]<<8,t+=2;break;case '16sint':r[a]=(e[t]|e[t+1]<<8)-32768,t+=2;break;case '16float':r[a]=m(e[t]|e[t+1]<<8),t+=2;break;case '32uint':case '32sint':r[a]=e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24,t+=4;break;case '32float':r[a]=new Float32Array(e.buffer,t,1)[0],t+=4;}return r}function T(e,t,n,s,r){for(let a=0;a<s;++a)switch(n){case '8unorm':e[t]=255*r[a],t++;break;case '8snorm':e[t]=.5*(r[a]+1)*255,t++;break;case '8uint':e[t]=r[a],t++;break;case '8sint':e[t]=r[a]+127,t++;break;case '16uint':new Uint16Array(e.buffer,t,1)[0]=r[a],t+=2;break;case '16sint':new Int16Array(e.buffer,t,1)[0]=r[a],t+=2;break;case '16float':{const n=y(r[a]);new Uint16Array(e.buffer,t,1)[0]=n,t+=2;break}case '32uint':new Uint32Array(e.buffer,t,1)[0]=r[a],t+=4;break;case '32sint':new Int32Array(e.buffer,t,1)[0]=r[a],t+=4;break;case '32float':new Float32Array(e.buffer,t,1)[0]=r[a],t+=4;}return r}const S={r8unorm:{bytesPerBlock:1,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r8snorm:{bytesPerBlock:1,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r8uint:{bytesPerBlock:1,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r8sint:{bytesPerBlock:1,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},rg8unorm:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg8snorm:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg8uint:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg8sint:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rgba8unorm:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},'rgba8unorm-srgb':{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba8snorm:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba8uint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba8sint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},bgra8unorm:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},'bgra8unorm-srgb':{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},r16uint:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r16sint:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r16float:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},rg16uint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg16sint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg16float:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rgba16uint:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba16sint:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba16float:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},r32uint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r32sint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},r32float:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:1},rg32uint:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg32sint:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rg32float:{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,channels:2},rgba32uint:{bytesPerBlock:16,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba32sint:{bytesPerBlock:16,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgba32float:{bytesPerBlock:16,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgb10a2uint:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rgb10a2unorm:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},rg11b10ufloat:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},stencil8:{bytesPerBlock:1,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:false,hasStencil:true,channels:1},depth16unorm:{bytesPerBlock:2,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:true,hasStencil:false,channels:1},depth24plus:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:true,hasStencil:false,depthOnlyFormat:'depth32float',channels:1},'depth24plus-stencil8':{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:true,hasStencil:true,depthOnlyFormat:'depth32float',channels:1},depth32float:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:true,hasStencil:false,channels:1},'depth32float-stencil8':{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:false,isDepthStencil:true,hasDepth:true,hasStencil:true,stencilOnlyFormat:'depth32float',channels:1},rgb9e5ufloat:{bytesPerBlock:4,blockWidth:1,blockHeight:1,isCompressed:false,channels:4},'bc1-rgba-unorm':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc1-rgba-unorm-srgb':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc2-rgba-unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc2-rgba-unorm-srgb':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc3-rgba-unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc3-rgba-unorm-srgb':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc4-r-unorm':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:1},'bc4-r-snorm':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:1},'bc5-rg-unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:2},'bc5-rg-snorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:2},'bc6h-rgb-ufloat':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc6h-rgb-float':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc7-rgba-unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'bc7-rgba-unorm-srgb':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgb8unorm':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgb8unorm-srgb':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgb8a1unorm':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgb8a1unorm-srgb':{bytesPerBlock:8,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgba8unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'etc2-rgba8unorm-srgb':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'eac-r11unorm':{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:true,channels:1},'eac-r11snorm':{bytesPerBlock:8,blockWidth:1,blockHeight:1,isCompressed:true,channels:1},'eac-rg11unorm':{bytesPerBlock:16,blockWidth:1,blockHeight:1,isCompressed:true,channels:2},'eac-rg11snorm':{bytesPerBlock:16,blockWidth:1,blockHeight:1,isCompressed:true,channels:2},'astc-4x4-unorm':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'astc-4x4-unorm-srgb':{bytesPerBlock:16,blockWidth:4,blockHeight:4,isCompressed:true,channels:4},'astc-5x4-unorm':{bytesPerBlock:16,blockWidth:5,blockHeight:4,isCompressed:true,channels:4},'astc-5x4-unorm-srgb':{bytesPerBlock:16,blockWidth:5,blockHeight:4,isCompressed:true,channels:4},'astc-5x5-unorm':{bytesPerBlock:16,blockWidth:5,blockHeight:5,isCompressed:true,channels:4},'astc-5x5-unorm-srgb':{bytesPerBlock:16,blockWidth:5,blockHeight:5,isCompressed:true,channels:4},'astc-6x5-unorm':{bytesPerBlock:16,blockWidth:6,blockHeight:5,isCompressed:true,channels:4},'astc-6x5-unorm-srgb':{bytesPerBlock:16,blockWidth:6,blockHeight:5,isCompressed:true,channels:4},'astc-6x6-unorm':{bytesPerBlock:16,blockWidth:6,blockHeight:6,isCompressed:true,channels:4},'astc-6x6-unorm-srgb':{bytesPerBlock:16,blockWidth:6,blockHeight:6,isCompressed:true,channels:4},'astc-8x5-unorm':{bytesPerBlock:16,blockWidth:8,blockHeight:5,isCompressed:true,channels:4},'astc-8x5-unorm-srgb':{bytesPerBlock:16,blockWidth:8,blockHeight:5,isCompressed:true,channels:4},'astc-8x6-unorm':{bytesPerBlock:16,blockWidth:8,blockHeight:6,isCompressed:true,channels:4},'astc-8x6-unorm-srgb':{bytesPerBlock:16,blockWidth:8,blockHeight:6,isCompressed:true,channels:4},'astc-8x8-unorm':{bytesPerBlock:16,blockWidth:8,blockHeight:8,isCompressed:true,channels:4},'astc-8x8-unorm-srgb':{bytesPerBlock:16,blockWidth:8,blockHeight:8,isCompressed:true,channels:4},'astc-10x5-unorm':{bytesPerBlock:16,blockWidth:10,blockHeight:5,isCompressed:true,channels:4},'astc-10x5-unorm-srgb':{bytesPerBlock:16,blockWidth:10,blockHeight:5,isCompressed:true,channels:4},'astc-10x6-unorm':{bytesPerBlock:16,blockWidth:10,blockHeight:6,isCompressed:true,channels:4},'astc-10x6-unorm-srgb':{bytesPerBlock:16,blockWidth:10,blockHeight:6,isCompressed:true,channels:4},'astc-10x8-unorm':{bytesPerBlock:16,blockWidth:10,blockHeight:8,isCompressed:true,channels:4},'astc-10x8-unorm-srgb':{bytesPerBlock:16,blockWidth:10,blockHeight:8,isCompressed:true,channels:4},'astc-10x10-unorm':{bytesPerBlock:16,blockWidth:10,blockHeight:10,isCompressed:true,channels:4},'astc-10x10-unorm-srgb':{bytesPerBlock:16,blockWidth:10,blockHeight:10,isCompressed:true,channels:4},'astc-12x10-unorm':{bytesPerBlock:16,blockWidth:12,blockHeight:10,isCompressed:true,channels:4},'astc-12x10-unorm-srgb':{bytesPerBlock:16,blockWidth:12,blockHeight:10,isCompressed:true,channels:4},'astc-12x12-unorm':{bytesPerBlock:16,blockWidth:12,blockHeight:12,isCompressed:true,channels:4},'astc-12x12-unorm-srgb':{bytesPerBlock:16,blockWidth:12,blockHeight:12,isCompressed:true,channels:4}};class A{constructor(){this.id=A._id++,this.line=0;}get isAstNode(){return  true}get astNodeType(){return ''}search(e){e(this);}searchBlock(e,t){if(e){t(E.instance);for(const n of e)n instanceof Array?this.searchBlock(n,t):n.search(t);t($.instance);}}constEvaluate(e,t){throw new Error('Cannot evaluate node')}constEvaluateString(e){var t,n;return null!==(n=null===(t=this.constEvaluate(e))||void 0===t?void 0:t.toString())&&void 0!==n?n:''}}A._id=0;class E extends A{}E.instance=new E;class $ extends A{}$.instance=new $;const L=new Set(['all','any','select','arrayLength','abs','acos','acosh','asin','asinh','atan','atanh','atan2','ceil','clamp','cos','cosh','countLeadingZeros','countOneBits','countTrailingZeros','cross','degrees','determinant','distance','dot','dot4U8Packed','dot4I8Packed','exp','exp2','extractBits','faceForward','firstLeadingBit','firstTrailingBit','floor','fma','fract','frexp','insertBits','inverseSqrt','ldexp','length','log','log2','max','min','mix','modf','normalize','pow','quantizeToF16','radians','reflect','refract','reverseBits','round','saturate','sign','sin','sinh','smoothstep','sqrt','step','tan','tanh','transpose','trunc','dpdx','dpdxCoarse','dpdxFine','dpdy','dpdyCoarse','dpdyFine','fwidth','fwidthCoarse','fwidthFine','textureDimensions','textureGather','textureGatherCompare','textureLoad','textureNumLayers','textureNumLevels','textureNumSamples','textureSample','textureSampleBias','textureSampleCompare','textureSampleCompareLevel','textureSampleGrad','textureSampleLevel','textureSampleBaseClampToEdge','textureStore','atomicLoad','atomicStore','atomicAdd','atomicSub','atomicMax','atomicMin','atomicAnd','atomicOr','atomicXor','atomicExchange','atomicCompareExchangeWeak','pack4x8snorm','pack4x8unorm','pack4xI8','pack4xU8','pack4x8Clamp','pack4xU8Clamp','pack2x16snorm','pack2x16unorm','pack2x16float','unpack4x8snorm','unpack4x8unorm','unpack4xI8','unpack4xU8','unpack2x16snorm','unpack2x16unorm','unpack2x16float','storageBarrier','textureBarrier','workgroupBarrier','workgroupUniformLoad','subgroupAdd','subgroupExclusiveAdd','subgroupInclusiveAdd','subgroupAll','subgroupAnd','subgroupAny','subgroupBallot','subgroupBroadcast','subgroupBroadcastFirst','subgroupElect','subgroupMax','subgroupMin','subgroupMul','subgroupExclusiveMul','subgroupInclusiveMul','subgroupOr','subgroupShuffle','subgroupShuffleDown','subgroupShuffleUp','subgroupShuffleXor','subgroupXor','quadBroadcast','quadSwapDiagonal','quadSwapX','quadSwapY']);class C extends A{}class D extends C{constructor(e,t,n,s,r,a){super(),this.calls=new Set,this.name=e,this.args=t,this.returnType=n,this.body=s,this.startLine=r,this.endLine=a;}get astNodeType(){return 'function'}search(e){if(this.attributes)for(const t of this.attributes)e(t);e(this);for(const t of this.args)e(t);this.searchBlock(this.body,e);}}class N extends C{constructor(e){super(),this.expression=e;}get astNodeType(){return 'staticAssert'}search(e){this.expression.search(e);}}class V extends C{constructor(e,t){super(),this.condition=e,this.body=t;}get astNodeType(){return 'while'}search(e){this.condition.search(e),this.searchBlock(this.body,e);}}class O extends C{constructor(e,t){super(),this.body=e,this.loopId=t;}get astNodeType(){return 'continuing'}search(e){this.searchBlock(this.body,e);}}class B extends C{constructor(e,t,n,s){super(),this.init=e,this.condition=t,this.increment=n,this.body=s;}get astNodeType(){return 'for'}search(e){var t,n,s;null===(t=this.init)||void 0===t||t.search(e),null===(n=this.condition)||void 0===n||n.search(e),null===(s=this.increment)||void 0===s||s.search(e),this.searchBlock(this.body,e);}}class F extends C{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'var'}search(e){var t;e(this),null===(t=this.value)||void 0===t||t.search(e);}}class M extends C{constructor(e,t,n){super(),this.attributes=null,this.name=e,this.type=t,this.value=n;}get astNodeType(){return 'override'}search(e){var t;null===(t=this.value)||void 0===t||t.search(e);}}class U extends C{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'let'}search(e){var t;e(this),null===(t=this.value)||void 0===t||t.search(e);}}class P extends C{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'const'}constEvaluate(e,t){return this.value.constEvaluate(e,t)}search(e){var t;e(this),null===(t=this.value)||void 0===t||t.search(e);}}var W,q,H,z;(e=>{e.increment='++',e.decrement='--';})(W||(W={})),(e=>{e.parse=function(t){const n=t;if('parse'===n)throw new Error('Invalid value for IncrementOperator');return e[n]};})(W||(W={}));class R extends C{constructor(e,t){super(),this.operator=e,this.variable=t;}get astNodeType(){return 'increment'}search(e){this.variable.search(e);}}(e=>{e.assign='=',e.addAssign='+=',e.subtractAssign='-=',e.multiplyAssign='*=',e.divideAssign='/=',e.moduloAssign='%=',e.andAssign='&=',e.orAssign='|=',e.xorAssign='^=',e.shiftLeftAssign='<<=',e.shiftRightAssign='>>=';})(q||(q={})),(e=>{e.parse=function(e){const t=e;if('parse'===t)throw new Error('Invalid value for AssignOperator');return t};})(q||(q={}));class G extends C{constructor(e,t,n){super(),this.operator=e,this.variable=t,this.value=n;}get astNodeType(){return 'assign'}search(e){this.variable.search(e),this.value.search(e);}}class X extends C{constructor(e,t){super(),this.name=e,this.args=t;}get astNodeType(){return 'call'}isBuiltin(){return L.has(this.name)}search(e){for(const t of this.args)t.search(e);e(this);}}class j extends C{constructor(e,t){super(),this.body=e,this.continuing=t;}get astNodeType(){return 'loop'}search(e){var t;this.searchBlock(this.body,e),null===(t=this.continuing)||void 0===t||t.search(e);}}class Z extends C{constructor(e,t){super(),this.condition=e,this.cases=t;}get astNodeType(){return 'switch'}search(e){e(this);for(const t of this.cases)t.search(e);}}class Q extends C{constructor(e,t,n,s){super(),this.condition=e,this.body=t,this.elseif=n,this.else=s;}get astNodeType(){return 'if'}search(e){this.condition.search(e),this.searchBlock(this.body,e),this.searchBlock(this.elseif,e),this.searchBlock(this.else,e);}}class Y extends C{constructor(e){super(),this.value=e;}get astNodeType(){return 'return'}search(e){var t;null===(t=this.value)||void 0===t||t.search(e);}}class K extends C{constructor(e){super(),this.name=e;}get astNodeType(){return 'enable'}}class J extends C{constructor(e){super(),this.extensions=e;}get astNodeType(){return 'requires'}}class ee extends C{constructor(e,t){super(),this.severity=e,this.rule=t;}get astNodeType(){return 'diagnostic'}}class te extends C{constructor(e,t){super(),this.name=e,this.type=t;}get astNodeType(){return 'alias'}}class ne extends C{get astNodeType(){return 'discard'}}class se extends C{constructor(){super(...arguments),this.condition=null,this.loopId=-1;}get astNodeType(){return 'break'}}class re extends C{constructor(){super(...arguments),this.loopId=-1;}get astNodeType(){return 'continue'}}class ae extends C{constructor(e){super(),this.attributes=null,this.name=e;}get astNodeType(){return 'type'}get isStruct(){return  false}get isArray(){return  false}static maxFormatType(e){let t=e[0];if('f32'===t.name)return t;for(let n=1;n<e.length;++n){const s=ae._priority.get(t.name);ae._priority.get(e[n].name)<s&&(t=e[n]);}return 'x32'===t.name?ae.i32:t}getTypeName(){return this.name}}ae.x32=new ae('x32'),ae.f32=new ae('f32'),ae.i32=new ae('i32'),ae.u32=new ae('u32'),ae.f16=new ae('f16'),ae.bool=new ae('bool'),ae.void=new ae('void'),ae._priority=new Map([['f32',0],['f16',1],['u32',2],['i32',3],['x32',3]]);class ie extends ae{constructor(e){super(e);}}class oe extends ae{constructor(e,t,n,s){super(e),this.members=t,this.startLine=n,this.endLine=s;}get astNodeType(){return 'struct'}get isStruct(){return  true}getMemberIndex(e){for(let t=0;t<this.members.length;t++)if(this.members[t].name===e)return t;return  -1}search(e){for(const t of this.members)e(t);}}class le extends ae{constructor(e,t,n){super(e),this.format=t,this.access=n;}get astNodeType(){return 'template'}getTypeName(){let e=this.name;if(null!==this.format){if('vec2'===e||'vec3'===e||'vec4'===e||'mat2x2'===e||'mat2x3'===e||'mat2x4'===e||'mat3x2'===e||'mat3x3'===e||'mat3x4'===e||'mat4x2'===e||'mat4x3'===e||'mat4x4'===e){if('f32'===this.format.name)return e+='f',e;if('i32'===this.format.name)return e+='i',e;if('u32'===this.format.name)return e+='u',e;if('bool'===this.format.name)return e+='b',e;if('f16'===this.format.name)return e+='h',e}e+=`<${this.format.name}>`;}else if('vec2'===e||'vec3'===e||'vec4'===e)return e;return e}}le.vec2f=new le('vec2',ae.f32,null),le.vec3f=new le('vec3',ae.f32,null),le.vec4f=new le('vec4',ae.f32,null),le.vec2i=new le('vec2',ae.i32,null),le.vec3i=new le('vec3',ae.i32,null),le.vec4i=new le('vec4',ae.i32,null),le.vec2u=new le('vec2',ae.u32,null),le.vec3u=new le('vec3',ae.u32,null),le.vec4u=new le('vec4',ae.u32,null),le.vec2h=new le('vec2',ae.f16,null),le.vec3h=new le('vec3',ae.f16,null),le.vec4h=new le('vec4',ae.f16,null),le.vec2b=new le('vec2',ae.bool,null),le.vec3b=new le('vec3',ae.bool,null),le.vec4b=new le('vec4',ae.bool,null),le.mat2x2f=new le('mat2x2',ae.f32,null),le.mat2x3f=new le('mat2x3',ae.f32,null),le.mat2x4f=new le('mat2x4',ae.f32,null),le.mat3x2f=new le('mat3x2',ae.f32,null),le.mat3x3f=new le('mat3x3',ae.f32,null),le.mat3x4f=new le('mat3x4',ae.f32,null),le.mat4x2f=new le('mat4x2',ae.f32,null),le.mat4x3f=new le('mat4x3',ae.f32,null),le.mat4x4f=new le('mat4x4',ae.f32,null),le.mat2x2h=new le('mat2x2',ae.f16,null),le.mat2x3h=new le('mat2x3',ae.f16,null),le.mat2x4h=new le('mat2x4',ae.f16,null),le.mat3x2h=new le('mat3x2',ae.f16,null),le.mat3x3h=new le('mat3x3',ae.f16,null),le.mat3x4h=new le('mat3x4',ae.f16,null),le.mat4x2h=new le('mat4x2',ae.f16,null),le.mat4x3h=new le('mat4x3',ae.f16,null),le.mat4x4h=new le('mat4x4',ae.f16,null),le.mat2x2i=new le('mat2x2',ae.i32,null),le.mat2x3i=new le('mat2x3',ae.i32,null),le.mat2x4i=new le('mat2x4',ae.i32,null),le.mat3x2i=new le('mat3x2',ae.i32,null),le.mat3x3i=new le('mat3x3',ae.i32,null),le.mat3x4i=new le('mat3x4',ae.i32,null),le.mat4x2i=new le('mat4x2',ae.i32,null),le.mat4x3i=new le('mat4x3',ae.i32,null),le.mat4x4i=new le('mat4x4',ae.i32,null),le.mat2x2u=new le('mat2x2',ae.u32,null),le.mat2x3u=new le('mat2x3',ae.u32,null),le.mat2x4u=new le('mat2x4',ae.u32,null),le.mat3x2u=new le('mat3x2',ae.u32,null),le.mat3x3u=new le('mat3x3',ae.u32,null),le.mat3x4u=new le('mat3x4',ae.u32,null),le.mat4x2u=new le('mat4x2',ae.u32,null),le.mat4x3u=new le('mat4x3',ae.u32,null),le.mat4x4u=new le('mat4x4',ae.u32,null);class ce extends ae{constructor(e,t,n,s){super(e),this.storage=t,this.type=n,this.access=s;}get astNodeType(){return 'pointer'}}class ue extends ae{constructor(e,t,n,s){super(e),this.attributes=t,this.format=n,this.count=s;}get astNodeType(){return 'array'}get isArray(){return  true}}class he extends ae{constructor(e,t,n){super(e),this.format=t,this.access=n;}get astNodeType(){return 'sampler'}}class fe extends A{constructor(){super(),this.postfix=null,this.hasParen=false;}}class pe extends fe{constructor(e){super(),this.value=e;}get astNodeType(){return 'stringExpr'}toString(){return this.value}constEvaluateString(){return this.value}}class de extends fe{constructor(e,t){super(),this.type=e,this.args=t;}get astNodeType(){return 'createExpr'}search(e){if(e(this),this.args)for(const t of this.args)t.search(e);}constEvaluate(e,t){return t&&(t[0]=this.type),e.evalExpression(this,e.context)}}class me extends fe{constructor(e,t){super(),this.cachedReturnValue=null,this.name=e,this.args=t;}get astNodeType(){return 'callExpr'}setCachedReturnValue(e){this.cachedReturnValue=e;}get isBuiltin(){return L.has(this.name)}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){for(const t of this.args)t.search(e);e(this);}}class _e extends fe{constructor(e){super(),this.name=e;}get astNodeType(){return 'varExpr'}search(e){e(this),this.postfix&&this.postfix.search(e);}constEvaluate(e,t){return e.evalExpression(this,e.context)}}class ge extends fe{constructor(e,t){super(),this.name=e,this.initializer=t;}get astNodeType(){return 'constExpr'}constEvaluate(e,t){const n=e.evalExpression(this.initializer,e.context);return null!==n&&this.postfix?n.getSubData(e,this.postfix,e.context):n}search(e){this.initializer.search(e);}}class xe extends fe{constructor(e,t){super(),this.value=e,this.type=t;}get astNodeType(){return 'literalExpr'}constEvaluate(e,t){return void 0!==t&&(t[0]=this.type),this.value}get isScalar(){return this.value instanceof Fe}get isVector(){return this.value instanceof Ue||this.value instanceof Pe}get scalarValue(){return this.value instanceof Fe?this.value.value:(console.error('Value is not scalar.'),0)}get vectorValue(){return this.value instanceof Ue||this.value instanceof Pe?this.value.data:(console.error('Value is not a vector or matrix.'),new Float32Array(0))}}class ye extends fe{constructor(e,t){super(),this.type=e,this.value=t;}get astNodeType(){return 'bitcastExpr'}search(e){this.value.search(e);}}class ve extends fe{constructor(e){super(),this.index=e;}search(e){this.index.search(e);}}class we extends fe{constructor(){super();}}class ke extends we{constructor(e,t){super(),this.operator=e,this.right=t;}get astNodeType(){return 'unaryOp'}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){this.right.search(e);}}class Ie extends we{constructor(e,t,n){super(),this.operator=e,this.left=t,this.right=n;}get astNodeType(){return 'binaryOp'}_getPromotedType(e,t){return e.name===t.name?e:'f32'===e.name||'f32'===t.name?ae.f32:'u32'===e.name||'u32'===t.name?ae.u32:ae.i32}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){this.left.search(e),this.right.search(e);}}class Te extends A{constructor(e){super(),this.body=e;}search(e){e(this),this.searchBlock(this.body,e);}}class Se extends fe{get astNodeType(){return 'default'}}class Ae extends Te{constructor(e,t){super(t),this.selectors=e;}get astNodeType(){return 'case'}search(e){this.searchBlock(this.body,e);}}class Ee extends Te{constructor(e){super(e);}get astNodeType(){return 'default'}search(e){this.searchBlock(this.body,e);}}class $e extends A{constructor(e,t,n){super(),this.name=e,this.type=t,this.attributes=n;}get astNodeType(){return 'argument'}}class Le extends A{constructor(e,t){super(),this.condition=e,this.body=t;}get astNodeType(){return 'elseif'}search(e){this.condition.search(e),this.searchBlock(this.body,e);}}class Ce extends A{constructor(e,t,n){super(),this.name=e,this.type=t,this.attributes=n;}get astNodeType(){return 'member'}}class De extends A{constructor(e,t){super(),this.name=e,this.value=t;}get astNodeType(){return 'attribute'}}class Ne{constructor(e,t){this.parent=null,this.typeInfo=e,this.parent=t,this.id=Ne._id++;}setDataValue(e,t,n,s){console.error(`SetDataValue: Not implemented for ${this.constructor.name}`);}getSubData(e,t,n){return console.error(`GetDataValue: Not implemented for ${this.constructor.name}`),null}toString(){return `<${this.typeInfo.getTypeName()}>`}}Ne._id=0;class Ve extends Ne{constructor(e,t){super(e,t);}clone(){return this}toString(){return this.typeInfo.name}}class Oe extends Ne{constructor(){super(new e('void',null),null);}clone(){return this}toString(){return 'void'}}Oe.void=new Oe;class Be extends Ne{constructor(e){super(new r('pointer',e.typeInfo,null),null),this.reference=e;}clone(){return this}setDataValue(e,t,n,s){this.reference.setDataValue(e,t,n,s);}getSubData(e,t,n){return t?this.reference.getSubData(e,t,n):this}toString(){return `&${this.reference.toString()}`}}class Fe extends Ne{constructor(e,t,n=null){super(t,n),e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array?this.data=e:'x32'===this.typeInfo.name?e-Math.floor(e)!==0?this.data=new Float32Array([e]):this.data=e>=0?new Uint32Array([e]):new Int32Array([e]):'i32'===this.typeInfo.name||'bool'===this.typeInfo.name?this.data=new Int32Array([e]):'u32'===this.typeInfo.name?this.data=new Uint32Array([e]):'f32'===this.typeInfo.name||'f16'===this.typeInfo.name?this.data=new Float32Array([e]):console.error('ScalarData2: Invalid type',t);}clone(){if(this.data instanceof Float32Array)return new Fe(new Float32Array(this.data),this.typeInfo,null);if(this.data instanceof Int32Array)return new Fe(new Int32Array(this.data),this.typeInfo,null);if(this.data instanceof Uint32Array)return new Fe(new Uint32Array(this.data),this.typeInfo,null);throw new Error('ScalarData: Invalid data type')}get value(){return this.data[0]}set value(e){this.data[0]=e;}setDataValue(e,t,n,s){if(n)return void console.error('SetDataValue: Scalar data does not support postfix',n);if(!(t instanceof Fe))return void console.error('SetDataValue: Invalid value',t);let r=t.data[0];'i32'===this.typeInfo.name||'u32'===this.typeInfo.name?r=Math.floor(r):'bool'===this.typeInfo.name&&(r=r?1:0),this.data[0]=r;}getSubData(e,t,n){return t?(console.error('getSubData: Scalar data does not support postfix',t),null):this}toString(){return `${this.value}`}}function Me(e,t,n){const s=t.length;return 2===s?'f32'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec2f')):'i32'===n||'bool'===n?new Ue(new Int32Array(t),e.getTypeInfo('vec2i')):'u32'===n?new Ue(new Uint32Array(t),e.getTypeInfo('vec2u')):'f16'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec2h')):(console.error(`getSubData: Unknown format ${n}`),null):3===s?'f32'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec3f')):'i32'===n||'bool'===n?new Ue(new Int32Array(t),e.getTypeInfo('vec3i')):'u32'===n?new Ue(new Uint32Array(t),e.getTypeInfo('vec3u')):'f16'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec3h')):(console.error(`getSubData: Unknown format ${n}`),null):4===s?'f32'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec4f')):'i32'===n||'bool'===n?new Ue(new Int32Array(t),e.getTypeInfo('vec4i')):'u32'===n?new Ue(new Uint32Array(t),e.getTypeInfo('vec4u')):'f16'===n?new Ue(new Float32Array(t),e.getTypeInfo('vec4h')):(console.error(`getSubData: Unknown format ${n}`),null):(console.error(`getSubData: Invalid vector size ${t.length}`),null)}class Ue extends Ne{constructor(e,t,n=null){if(super(t,n),e instanceof Float32Array||e instanceof Uint32Array||e instanceof Int32Array)this.data=e;else {const t=this.typeInfo.name;'vec2f'===t||'vec3f'===t||'vec4f'===t?this.data=new Float32Array(e):'vec2i'===t||'vec3i'===t||'vec4i'===t?this.data=new Int32Array(e):'vec2u'===t||'vec3u'===t||'vec4u'===t?this.data=new Uint32Array(e):'vec2h'===t||'vec3h'===t||'vec4h'===t?this.data=new Float32Array(e):'vec2b'===t||'vec3b'===t||'vec4b'===t?this.data=new Int32Array(e):'vec2'===t||'vec3'===t||'vec4'===t?this.data=new Float32Array(e):console.error(`VectorData: Invalid type ${t}`);}}clone(){if(this.data instanceof Float32Array)return new Ue(new Float32Array(this.data),this.typeInfo,null);if(this.data instanceof Int32Array)return new Ue(new Int32Array(this.data),this.typeInfo,null);if(this.data instanceof Uint32Array)return new Ue(new Uint32Array(this.data),this.typeInfo,null);throw new Error('VectorData: Invalid data type')}setDataValue(e,t,n,s){n instanceof pe?console.error('TODO: Set vector postfix'):t instanceof Ue?this.data=t.data:console.error('SetDataValue: Invalid value',t);}getSubData(e,t,n){if(null===t)return this;let s=e.getTypeInfo('f32');if(this.typeInfo instanceof a)s=this.typeInfo.format||s;else {const t=this.typeInfo.name;'vec2f'===t||'vec3f'===t||'vec4f'===t?s=e.getTypeInfo('f32'):'vec2i'===t||'vec3i'===t||'vec4i'===t?s=e.getTypeInfo('i32'):'vec2b'===t||'vec3b'===t||'vec4b'===t?s=e.getTypeInfo('bool'):'vec2u'===t||'vec3u'===t||'vec4u'===t?s=e.getTypeInfo('u32'):'vec2h'===t||'vec3h'===t||'vec4h'===t?s=e.getTypeInfo('f16'):console.error(`GetSubData: Unknown type ${t}`);}let r=this;for(;null!==t&&null!==r;){if(t instanceof ve){const a=t.index;let i=-1;if(a instanceof xe){if(!(a.value instanceof Fe))return console.error(`GetSubData: Invalid array index ${a.value}`),null;i=a.value.value;}else {const t=e.evalExpression(a,n);if(!(t instanceof Fe))return console.error('GetSubData: Unknown index type',a),null;i=t.value;}if(i<0||i>=r.data.length)return console.error('GetSubData: Index out of range',i),null;if(r.data instanceof Float32Array){const e=new Float32Array(r.data.buffer,r.data.byteOffset+4*i,1);return new Fe(e,s)}if(r.data instanceof Int32Array){const e=new Int32Array(r.data.buffer,r.data.byteOffset+4*i,1);return new Fe(e,s)}if(r.data instanceof Uint32Array){const e=new Uint32Array(r.data.buffer,r.data.byteOffset+4*i,1);return new Fe(e,s)}throw new Error('GetSubData: Invalid data type')}if(!(t instanceof pe))return console.error('GetSubData: Unknown postfix',t),null;{const n=t.value.toLowerCase();if(1===n.length){let e=0;if('x'===n||'r'===n)e=0;else if('y'===n||'g'===n)e=1;else if('z'===n||'b'===n)e=2;else {if('w'!==n&&'a'!==n)return console.error(`GetSubData: Unknown member ${n}`),null;e=3;}if(this.data instanceof Float32Array){let t=new Float32Array(this.data.buffer,this.data.byteOffset+4*e,1);return new Fe(t,s,this)}if(this.data instanceof Int32Array){let t=new Int32Array(this.data.buffer,this.data.byteOffset+4*e,1);return new Fe(t,s,this)}if(this.data instanceof Uint32Array){let t=new Uint32Array(this.data.buffer,this.data.byteOffset+4*e,1);return new Fe(t,s,this)}}const a=[];for(const e of n)'x'===e||'r'===e?a.push(this.data[0]):'y'===e||'g'===e?a.push(this.data[1]):'z'===e||'b'===e?a.push(this.data[2]):'w'===e||'a'===e?a.push(this.data[3]):console.error(`GetDataValue: Unknown member ${e}`);r=Me(e,a,s.name);}t=t.postfix;}return r}toString(){let e=`${this.data[0]}`;for(let t=1;t<this.data.length;++t)e+=`, ${this.data[t]}`;return e}}class Pe extends Ne{constructor(e,t,n=null){super(t,n),e instanceof Float32Array?this.data=e:this.data=new Float32Array(e);}clone(){return new Pe(new Float32Array(this.data),this.typeInfo,null)}setDataValue(e,t,n,s){n instanceof pe?console.error('TODO: Set matrix postfix'):t instanceof Pe?this.data=t.data:console.error('SetDataValue: Invalid value',t);}getSubData(e,t,n){if(null===t)return this;const s=this.typeInfo.name;if(e.getTypeInfo('f32'),this.typeInfo instanceof a)this.typeInfo.format;else if(s.endsWith('f'))e.getTypeInfo('f32');else if(s.endsWith('i'))e.getTypeInfo('i32');else if(s.endsWith('u'))e.getTypeInfo('u32');else {if(!s.endsWith('h'))return console.error(`GetDataValue: Unknown type ${s}`),null;e.getTypeInfo('f16');}if(t instanceof ve){const r=t.index;let a=-1;if(r instanceof xe){if(!(r.value instanceof Fe))return console.error(`GetDataValue: Invalid array index ${r.value}`),null;a=r.value.value;}else {const t=e.evalExpression(r,n);if(!(t instanceof Fe))return console.error('GetDataValue: Unknown index type',r),null;a=t.value;}if(a<0||a>=this.data.length)return console.error('GetDataValue: Index out of range',a),null;const i=s.endsWith('h')?'h':'f';let o;if('mat2x2'===s||'mat2x2f'===s||'mat2x2h'===s||'mat3x2'===s||'mat3x2f'===s||'mat3x2h'===s||'mat4x2'===s||'mat4x2f'===s||'mat4x2h'===s)o=new Ue(new Float32Array(this.data.buffer,this.data.byteOffset+2*a*4,2),e.getTypeInfo(`vec2${i}`));else if('mat2x3'===s||'mat2x3f'===s||'mat2x3h'===s||'mat3x3'===s||'mat3x3f'===s||'mat3x3h'===s||'mat4x3'===s||'mat4x3f'===s||'mat4x3h'===s)o=new Ue(new Float32Array(this.data.buffer,this.data.byteOffset+3*a*4,3),e.getTypeInfo(`vec3${i}`));else {if('mat2x4'!==s&&'mat2x4f'!==s&&'mat2x4h'!==s&&'mat3x4'!==s&&'mat3x4f'!==s&&'mat3x4h'!==s&&'mat4x4'!==s&&'mat4x4f'!==s&&'mat4x4h'!==s)return console.error(`GetDataValue: Unknown type ${s}`),null;o=new Ue(new Float32Array(this.data.buffer,this.data.byteOffset+4*a*4,4),e.getTypeInfo(`vec4${i}`));}return t.postfix?o.getSubData(e,t.postfix,n):o}return console.error('GetDataValue: Invalid postfix',t),null}toString(){let e=`${this.data[0]}`;for(let t=1;t<this.data.length;++t)e+=`, ${this.data[t]}`;return e}}class We extends Ne{constructor(e,t,n=0,s=null){super(t,s),this.buffer=e instanceof ArrayBuffer?e:e.buffer,this.offset=n;}clone(){const e=new Uint8Array(new Uint8Array(this.buffer,this.offset,this.typeInfo.size));return new We(e.buffer,this.typeInfo,0,null)}setDataValue(t,r,a,i){if(null===r)return void console.log('setDataValue: NULL data.');let o=this.offset,l=this.typeInfo;for(;a;){if(a instanceof ve)if(l instanceof s){const e=a.index;if(e instanceof xe){if(!(e.value instanceof Fe))return void console.error(`SetDataValue: Invalid index type ${e.value}`);o+=e.value.value*l.stride;}else {const n=t.evalExpression(e,i);if(!(n instanceof Fe))return void console.error('SetDataValue: Unknown index type',e);o+=n.value*l.stride;}l=l.format;}else console.error(`SetDataValue: Type ${l.getTypeName()} is not an array`);else {if(!(a instanceof pe))return void console.error('SetDataValue: Unknown postfix type',a);{const t=a.value;if(l instanceof n){let e=false;for(const n of l.members)if(n.name===t){o+=n.offset,l=n.type,e=true;break}if(!e)return void console.error(`SetDataValue: Member ${t} not found`)}else if(l instanceof e){const e=l.getTypeName();let n=0;if('x'===t||'r'===t)n=0;else if('y'===t||'g'===t)n=1;else if('z'===t||'b'===t)n=2;else {if('w'!==t&&'a'!==t)return void console.error(`SetDataValue: Unknown member ${t}`);n=3;}if(!(r instanceof Fe))return void console.error('SetDataValue: Invalid value',r);const s=r.value;return 'vec2f'===e?void(new Float32Array(this.buffer,o,2)[n]=s):'vec3f'===e?void(new Float32Array(this.buffer,o,3)[n]=s):'vec4f'===e?void(new Float32Array(this.buffer,o,4)[n]=s):'vec2i'===e?void(new Int32Array(this.buffer,o,2)[n]=s):'vec3i'===e?void(new Int32Array(this.buffer,o,3)[n]=s):'vec4i'===e?void(new Int32Array(this.buffer,o,4)[n]=s):'vec2u'===e?void(new Uint32Array(this.buffer,o,2)[n]=s):'vec3u'===e?void(new Uint32Array(this.buffer,o,3)[n]=s):'vec4u'===e?void(new Uint32Array(this.buffer,o,4)[n]=s):void console.error(`SetDataValue: Type ${e} is not a struct`)}}}a=a.postfix;}this.setData(t,r,l,o,i);}setData(e,t,n,s,r){const a=n.getTypeName();if('f32'!==a&&'f16'!==a)if('i32'!==a&&'atomic<i32>'!==a&&'x32'!==a)if('u32'!==a&&'atomic<u32>'!==a)if('bool'!==a){if('vec2f'===a||'vec2h'===a){const e=new Float32Array(this.buffer,s,2);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1]):(e[0]=t[0],e[1]=t[1]))}if('vec3f'===a||'vec3h'===a){const e=new Float32Array(this.buffer,s,3);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]))}if('vec4f'===a||'vec4h'===a){const e=new Float32Array(this.buffer,s,4);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]))}if('vec2i'===a){const e=new Int32Array(this.buffer,s,2);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1]):(e[0]=t[0],e[1]=t[1]))}if('vec3i'===a){const e=new Int32Array(this.buffer,s,3);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]))}if('vec4i'===a){const e=new Int32Array(this.buffer,s,4);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]))}if('vec2u'===a){const e=new Uint32Array(this.buffer,s,2);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1]):(e[0]=t[0],e[1]=t[1]))}if('vec3u'===a){const e=new Uint32Array(this.buffer,s,3);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]))}if('vec4u'===a){const e=new Uint32Array(this.buffer,s,4);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]))}if('vec2b'===a){const e=new Uint32Array(this.buffer,s,2);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1]):(e[0]=t[0],e[1]=t[1]))}if('vec3b'===a){const e=new Uint32Array(this.buffer,s,3);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]))}if('vec4b'===a){const e=new Uint32Array(this.buffer,s,4);return void(t instanceof Ue?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]))}if('mat2x2f'===a||'mat2x2h'===a){const e=new Float32Array(this.buffer,s,4);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]))}if('mat2x3f'===a||'mat2x3h'===a){const e=new Float32Array(this.buffer,s,6);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5]))}if('mat2x4f'===a||'mat2x4h'===a){const e=new Float32Array(this.buffer,s,8);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7]))}if('mat3x2f'===a||'mat3x2h'===a){const e=new Float32Array(this.buffer,s,6);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5]))}if('mat3x3f'===a||'mat3x3h'===a){const e=new Float32Array(this.buffer,s,9);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7],e[8]=t.data[8]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8]))}if('mat3x4f'===a||'mat3x4h'===a){const e=new Float32Array(this.buffer,s,12);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7],e[8]=t.data[8],e[9]=t.data[9],e[10]=t.data[10],e[11]=t.data[11]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11]))}if('mat4x2f'===a||'mat4x2h'===a){const e=new Float32Array(this.buffer,s,8);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7]))}if('mat4x3f'===a||'mat4x3h'===a){const e=new Float32Array(this.buffer,s,12);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7],e[8]=t.data[8],e[9]=t.data[9],e[10]=t.data[10],e[11]=t.data[11]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11]))}if('mat4x4f'===a||'mat4x4h'===a){const e=new Float32Array(this.buffer,s,16);return void(t instanceof Pe?(e[0]=t.data[0],e[1]=t.data[1],e[2]=t.data[2],e[3]=t.data[3],e[4]=t.data[4],e[5]=t.data[5],e[6]=t.data[6],e[7]=t.data[7],e[8]=t.data[8],e[9]=t.data[9],e[10]=t.data[10],e[11]=t.data[11],e[12]=t.data[12],e[13]=t.data[13],e[14]=t.data[14],e[15]=t.data[15]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]))}if(t instanceof We){if(n===t.typeInfo){return void new Uint8Array(this.buffer,s,t.buffer.byteLength).set(new Uint8Array(t.buffer))}console.error('SetDataValue: Type mismatch',a,t.typeInfo.getTypeName());}else console.error(`SetData: Unknown type ${a}`);}else t instanceof Fe&&(new Int32Array(this.buffer,s,1)[0]=t.value);else t instanceof Fe&&(new Uint32Array(this.buffer,s,1)[0]=t.value);else t instanceof Fe&&(new Int32Array(this.buffer,s,1)[0]=t.value);else t instanceof Fe&&(new Float32Array(this.buffer,s,1)[0]=t.value);}getSubData(t,r,i){var o,l,c;if(null===r)return this;let u=this.offset,h=this.typeInfo;for(;r;){if(r instanceof ve){const e=r.index,n=e instanceof fe?t.evalExpression(e,i):e;let a=0;if(n instanceof Fe?a=n.value:'number'==typeof n?a=n:console.error('GetDataValue: Invalid index type',e),h instanceof s)u+=a*h.stride,h=h.format;else {const e=h.getTypeName();'mat4x4'===e||'mat4x4f'===e||'mat4x4h'===e?(u+=16*a,h=t.getTypeInfo('vec4f')):'mat4x3'===e||'mat4x3f'===e||'mat4x3h'===e?(u+=12*a,h=t.getTypeInfo('vec3f')):'mat4x2'===e||'mat4x2f'===e||'mat4x2h'===e?(u+=8*a,h=t.getTypeInfo('vec2f')):'mat3x4'===e||'mat3x4f'===e||'mat3x4h'===e?(u+=12*a,h=t.getTypeInfo('vec4f')):'mat3x3'===e||'mat3x3f'===e||'mat3x3h'===e?(u+=9*a,h=t.getTypeInfo('vec3f')):'mat3x2'===e||'mat3x2f'===e||'mat3x2h'===e?(u+=6*a,h=t.getTypeInfo('vec2f')):'mat2x4'===e||'mat2x4f'===e||'mat2x4h'===e?(u+=8*a,h=t.getTypeInfo('vec4f')):'mat2x3'===e||'mat2x3f'===e||'mat2x3h'===e?(u+=6*a,h=t.getTypeInfo('vec3f')):'mat2x2'===e||'mat2x2f'===e||'mat2x2h'===e?(u+=4*a,h=t.getTypeInfo('vec2f')):'vec2f'===e||'vec3f'===e||'vec4f'===e?(u+=4*a,h=t.getTypeInfo('f32')):'vec2h'===e||'vec3h'===e||'vec4h'===e?(u+=2*a,h=t.getTypeInfo('f16')):'vec2b'===e||'vec3b'===e||'vec4b'===e?(u+=1*a,h=t.getTypeInfo('bool')):'vec2i'===e||'vec3i'===e||'vec4i'===e?(u+=4*a,h=t.getTypeInfo('i32')):'vec2u'===e||'vec3u'===e||'vec4u'===e?(u+=4*a,h=t.getTypeInfo('u32')):console.error(`getDataValue: Type ${h.getTypeName()} is not an array`);}}else {if(!(r instanceof pe))return console.error('GetDataValue: Unknown postfix type',r),null;{const s=r.value;if(h instanceof n){let e=false;for(const t of h.members)if(t.name===s){u+=t.offset,h=t.type,e=true;break}if(!e)return console.error(`GetDataValue: Member ${s} not found`),null}else if(h instanceof e){const e=h.getTypeName();if('vec2f'===e||'vec3f'===e||'vec4f'===e||'vec2i'===e||'vec3i'===e||'vec4i'===e||'vec2u'===e||'vec3u'===e||'vec4u'===e||'vec2b'===e||'vec3b'===e||'vec4b'===e||'vec2h'===e||'vec3h'===e||'vec4h'===e||'vec2'===e||'vec3'===e||'vec4'===e){if(s.length>0&&s.length<5){let n='f';const r=[];for(let a=0;a<s.length;++a){const i=s[a].toLowerCase();let o=0;if('x'===i||'r'===i)o=0;else if('y'===i||'g'===i)o=1;else if('z'===i||'b'===i)o=2;else {if('w'!==i&&'a'!==i)return console.error(`Unknown member ${s}`),null;o=3;}if(1===s.length){if(e.endsWith('f'))return this.buffer.byteLength<u+4*o+4?(console.log('Insufficient buffer data'),null):new Fe(new Float32Array(this.buffer,u+4*o,1),t.getTypeInfo('f32'),this);if(e.endsWith('h'))return new Fe(new Float32Array(this.buffer,u+4*o,1),t.getTypeInfo('f16'),this);if(e.endsWith('i'))return new Fe(new Int32Array(this.buffer,u+4*o,1),t.getTypeInfo('i32'),this);if(e.endsWith('b'))return new Fe(new Int32Array(this.buffer,u+4*o,1),t.getTypeInfo('bool'),this);if(e.endsWith('u'))return new Fe(new Uint32Array(this.buffer,u+4*o,1),t.getTypeInfo('i32'),this)}if('vec2f'===e)r.push(new Float32Array(this.buffer,u,2)[o]);else if('vec3f'===e){if(u+12>=this.buffer.byteLength)return console.log('Insufficient buffer data'),null;const e=new Float32Array(this.buffer,u,3);r.push(e[o]);}else if('vec4f'===e)r.push(new Float32Array(this.buffer,u,4)[o]);else if('vec2i'===e)n='i',r.push(new Int32Array(this.buffer,u,2)[o]);else if('vec3i'===e)n='i',r.push(new Int32Array(this.buffer,u,3)[o]);else if('vec4i'===e)n='i',r.push(new Int32Array(this.buffer,u,4)[o]);else if('vec2u'===e){n='u';const e=new Uint32Array(this.buffer,u,2);r.push(e[o]);}else 'vec3u'===e?(n='u',r.push(new Uint32Array(this.buffer,u,3)[o])):'vec4u'===e&&(n='u',r.push(new Uint32Array(this.buffer,u,4)[o]));}return 2===r.length?h=t.getTypeInfo(`vec2${n}`):3===r.length?h=t.getTypeInfo(`vec3${n}`):4===r.length?h=t.getTypeInfo(`vec4${n}`):console.error(`GetDataValue: Invalid vector length ${r.length}`),new Ue(r,h,null)}return console.error(`GetDataValue: Unknown member ${s}`),null}return console.error(`GetDataValue: Type ${e} is not a struct`),null}}}r=r.postfix;}const f=h.getTypeName();return 'f32'===f?new Fe(new Float32Array(this.buffer,u,1),h,this):'i32'===f?new Fe(new Int32Array(this.buffer,u,1),h,this):'u32'===f?new Fe(new Uint32Array(this.buffer,u,1),h,this):'vec2f'===f?new Ue(new Float32Array(this.buffer,u,2),h,this):'vec3f'===f?new Ue(new Float32Array(this.buffer,u,3),h,this):'vec4f'===f?new Ue(new Float32Array(this.buffer,u,4),h,this):'vec2i'===f?new Ue(new Int32Array(this.buffer,u,2),h,this):'vec3i'===f?new Ue(new Int32Array(this.buffer,u,3),h,this):'vec4i'===f?new Ue(new Int32Array(this.buffer,u,4),h,this):'vec2u'===f?new Ue(new Uint32Array(this.buffer,u,2),h,this):'vec3u'===f?new Ue(new Uint32Array(this.buffer,u,3),h,this):'vec4u'===f?new Ue(new Uint32Array(this.buffer,u,4),h,this):h instanceof a&&'atomic'===h.name?'u32'===(null===(o=h.format)||void 0===o?void 0:o.name)?new Fe(new Uint32Array(this.buffer,u,1)[0],h.format,this):'i32'===(null===(l=h.format)||void 0===l?void 0:l.name)?new Fe(new Int32Array(this.buffer,u,1)[0],h.format,this):(console.error(`GetDataValue: Invalid atomic format ${null===(c=h.format)||void 0===c?void 0:c.name}`),null):new We(this.buffer,h,u,this)}toArray(){const e=this.typeInfo.getTypeName();return 'f32'===e||'f16'===e?new Float32Array(this.buffer,this.offset,1):'i32'===e||'atomic<i32>'===e||'x32'===e?new Int32Array(this.buffer,this.offset,1):'u32'===e||'atomic<u32>'===e?new Uint32Array(this.buffer,this.offset,1):'bool'===e?new Int32Array(this.buffer,this.offset,1):'vec2f'===e||'vec2h'===e?new Float32Array(this.buffer,this.offset,2):'vec3f'===e||'vec3h'===e?new Float32Array(this.buffer,this.offset,3):'vec4f'===e||'vec4h'===e?new Float32Array(this.buffer,this.offset,4):'vec2i'===e?new Int32Array(this.buffer,this.offset,2):'vec3i'===e?new Int32Array(this.buffer,this.offset,3):'vec4i'===e?new Int32Array(this.buffer,this.offset,4):'vec2u'===e?new Uint32Array(this.buffer,this.offset,2):'vec3u'===e?new Uint32Array(this.buffer,this.offset,3):'vec4u'===e?new Uint32Array(this.buffer,this.offset,4):'vec2b'===e?new Uint32Array(this.buffer,this.offset,2):'vec3b'===e?new Uint32Array(this.buffer,this.offset,3):'vec4b'===e?new Uint32Array(this.buffer,this.offset,4):'mat2x2f'===e||'mat2x2h'===e?new Float32Array(this.buffer,this.offset,4):'mat2x3f'===e||'mat2x3h'===e?new Float32Array(this.buffer,this.offset,6):'mat2x4f'===e||'mat2x4h'===e?new Float32Array(this.buffer,this.offset,8):'mat3x2f'===e||'mat3x2h'===e?new Float32Array(this.buffer,this.offset,6):'mat3x3f'===e||'mat3x3h'===e?new Float32Array(this.buffer,this.offset,9):'mat3x4f'===e||'mat3x4h'===e?new Float32Array(this.buffer,this.offset,12):'mat4x2f'===e||'mat4x2h'===e?new Float32Array(this.buffer,this.offset,8):'mat4x3f'===e||'mat4x3h'===e?new Float32Array(this.buffer,this.offset,12):'mat4x4f'===e||'mat4x4h'===e?new Float32Array(this.buffer,this.offset,16):null}toString(){let e='';if(this.typeInfo instanceof s)if('f32'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('i32'===this.typeInfo.format.name){const t=new Int32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('u32'===this.typeInfo.format.name){const t=new Uint32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('vec2f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}]`;for(let n=1;n<t.length/2;++n)e+=`, [${t[2*n]}, ${t[2*n+1]}]`;}else if('vec3f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}, ${t[2]}]`;for(let n=4;n<t.length;n+=4)e+=`, [${t[n]}, ${t[n+1]}, ${t[n+2]}]`;}else if('vec4f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}, ${t[2]}, ${t[3]}]`;for(let n=4;n<t.length;n+=4)e+=`, [${t[n]}, ${t[n+1]}, ${t[n+2]}, ${t[n+3]}]`;}else e='[...]';else this.typeInfo instanceof n?e+='{...}':e='[...]';return e}}class qe extends Ne{constructor(e,t,n,s){super(t,null),this.data=e,this.descriptor=n,this.view=s;}clone(){return new qe(this.data,this.typeInfo,this.descriptor,this.view)}get width(){var e,t;const n=this.descriptor.size;return n instanceof Array&&n.length>0?null!==(e=n[0])&&void 0!==e?e:0:n instanceof Object&&null!==(t=n.width)&&void 0!==t?t:0}get height(){var e,t;const n=this.descriptor.size;return n instanceof Array&&n.length>1?null!==(e=n[1])&&void 0!==e?e:0:n instanceof Object&&null!==(t=n.height)&&void 0!==t?t:0}get depthOrArrayLayers(){var e,t;const n=this.descriptor.size;return n instanceof Array&&n.length>2?null!==(e=n[2])&&void 0!==e?e:0:n instanceof Object&&null!==(t=n.depthOrArrayLayers)&&void 0!==t?t:0}get format(){var e;return this.descriptor&&null!==(e=this.descriptor.format)&&void 0!==e?e:'rgba8unorm'}get sampleCount(){var e;return this.descriptor&&null!==(e=this.descriptor.sampleCount)&&void 0!==e?e:1}get mipLevelCount(){var e;return this.descriptor&&null!==(e=this.descriptor.mipLevelCount)&&void 0!==e?e:1}get dimension(){var e;return this.descriptor&&null!==(e=this.descriptor.dimension)&&void 0!==e?e:'2d'}getMipLevelSize(e){if(e>=this.mipLevelCount)return [0,0,0];const t=[this.width,this.height,this.depthOrArrayLayers];for(let n=0;n<t.length;++n)t[n]=Math.max(1,t[n]>>e);return t}get texelByteSize(){const e=this.format,t=S[e];return t?t.isDepthStencil?4:t.bytesPerBlock:0}get bytesPerRow(){return this.width*this.texelByteSize}get isDepthStencil(){const e=this.format,t=S[e];return !!t&&t.isDepthStencil}getGpuSize(){const e=this.format,t=S[e],n=this.width;if(!e||n<=0||!t)return  -1;const s=this.height,r=this.depthOrArrayLayers,a=this.dimension;return n/t.blockWidth*('1d'===a?1:s/t.blockHeight)*t.bytesPerBlock*r}getPixel(e,t,n=0,s=0){const r=this.texelByteSize,a=this.bytesPerRow,i=this.height,o=this.data[s];return k(new Uint8Array(o),e,t,n,s,i,a,r,this.format)}setPixel(e,t,n,s,r){const a=this.texelByteSize,i=this.bytesPerRow,o=this.height,l=this.data[s];!function(e,t,n,s,r,a,i,o,l,c){const u=s*(i>>=r)*(a>>=r)+n*i+t*o;switch(l){case 'r8unorm':return void T(e,u,'8unorm',1,c);case 'r8snorm':return void T(e,u,'8snorm',1,c);case 'r8uint':return void T(e,u,'8uint',1,c);case 'r8sint':return void T(e,u,'8sint',1,c);case 'rg8unorm':return void T(e,u,'8unorm',2,c);case 'rg8snorm':return void T(e,u,'8snorm',2,c);case 'rg8uint':return void T(e,u,'8uint',2,c);case 'rg8sint':return void T(e,u,'8sint',2,c);case 'rgba8unorm-srgb':case 'rgba8unorm':case 'bgra8unorm-srgb':case 'bgra8unorm':return void T(e,u,'8unorm',4,c);case 'rgba8snorm':return void T(e,u,'8snorm',4,c);case 'rgba8uint':return void T(e,u,'8uint',4,c);case 'rgba8sint':return void T(e,u,'8sint',4,c);case 'r16uint':return void T(e,u,'16uint',1,c);case 'r16sint':return void T(e,u,'16sint',1,c);case 'r16float':return void T(e,u,'16float',1,c);case 'rg16uint':return void T(e,u,'16uint',2,c);case 'rg16sint':return void T(e,u,'16sint',2,c);case 'rg16float':return void T(e,u,'16float',2,c);case 'rgba16uint':return void T(e,u,'16uint',4,c);case 'rgba16sint':return void T(e,u,'16sint',4,c);case 'rgba16float':return void T(e,u,'16float',4,c);case 'r32uint':return void T(e,u,'32uint',1,c);case 'r32sint':return void T(e,u,'32sint',1,c);case 'depth16unorm':case 'depth24plus':case 'depth24plus-stencil8':case 'depth32float':case 'depth32float-stencil8':case 'r32float':return void T(e,u,'32float',1,c);case 'rg32uint':return void T(e,u,'32uint',2,c);case 'rg32sint':return void T(e,u,'32sint',2,c);case 'rg32float':return void T(e,u,'32float',2,c);case 'rgba32uint':return void T(e,u,'32uint',4,c);case 'rgba32sint':return void T(e,u,'32sint',4,c);case 'rgba32float':return void T(e,u,'32float',4,c);case 'rg11b10ufloat':console.error('TODO: rg11b10ufloat not supported for writing');}}(new Uint8Array(l),e,t,n,s,o,i,a,this.format,r);}}(e=>{e[e.token=0]='token',e[e.keyword=1]='keyword',e[e.reserved=2]='reserved';})(z||(z={}));class He{constructor(e,t,n){this.name=e,this.type=t,this.rule=n;}toString(){return this.name}}class ze{}H=ze,ze.none=new He('',z.reserved,''),ze.eof=new He('EOF',z.token,''),ze.reserved={asm:new He('asm',z.reserved,'asm'),bf16:new He('bf16',z.reserved,'bf16'),do:new He('do',z.reserved,'do'),enum:new He('enum',z.reserved,'enum'),f16:new He('f16',z.reserved,'f16'),f64:new He('f64',z.reserved,'f64'),handle:new He('handle',z.reserved,'handle'),i8:new He('i8',z.reserved,'i8'),i16:new He('i16',z.reserved,'i16'),i64:new He('i64',z.reserved,'i64'),mat:new He('mat',z.reserved,'mat'),premerge:new He('premerge',z.reserved,'premerge'),regardless:new He('regardless',z.reserved,'regardless'),typedef:new He('typedef',z.reserved,'typedef'),u8:new He('u8',z.reserved,'u8'),u16:new He('u16',z.reserved,'u16'),u64:new He('u64',z.reserved,'u64'),unless:new He('unless',z.reserved,'unless'),using:new He('using',z.reserved,'using'),vec:new He('vec',z.reserved,'vec'),void:new He('void',z.reserved,'void')},ze.keywords={array:new He('array',z.keyword,'array'),atomic:new He('atomic',z.keyword,'atomic'),bool:new He('bool',z.keyword,'bool'),f32:new He('f32',z.keyword,'f32'),i32:new He('i32',z.keyword,'i32'),mat2x2:new He('mat2x2',z.keyword,'mat2x2'),mat2x3:new He('mat2x3',z.keyword,'mat2x3'),mat2x4:new He('mat2x4',z.keyword,'mat2x4'),mat3x2:new He('mat3x2',z.keyword,'mat3x2'),mat3x3:new He('mat3x3',z.keyword,'mat3x3'),mat3x4:new He('mat3x4',z.keyword,'mat3x4'),mat4x2:new He('mat4x2',z.keyword,'mat4x2'),mat4x3:new He('mat4x3',z.keyword,'mat4x3'),mat4x4:new He('mat4x4',z.keyword,'mat4x4'),ptr:new He('ptr',z.keyword,'ptr'),sampler:new He('sampler',z.keyword,'sampler'),sampler_comparison:new He('sampler_comparison',z.keyword,'sampler_comparison'),struct:new He('struct',z.keyword,'struct'),texture_1d:new He('texture_1d',z.keyword,'texture_1d'),texture_2d:new He('texture_2d',z.keyword,'texture_2d'),texture_2d_array:new He('texture_2d_array',z.keyword,'texture_2d_array'),texture_3d:new He('texture_3d',z.keyword,'texture_3d'),texture_cube:new He('texture_cube',z.keyword,'texture_cube'),texture_cube_array:new He('texture_cube_array',z.keyword,'texture_cube_array'),texture_multisampled_2d:new He('texture_multisampled_2d',z.keyword,'texture_multisampled_2d'),texture_storage_1d:new He('texture_storage_1d',z.keyword,'texture_storage_1d'),texture_storage_2d:new He('texture_storage_2d',z.keyword,'texture_storage_2d'),texture_storage_2d_array:new He('texture_storage_2d_array',z.keyword,'texture_storage_2d_array'),texture_storage_3d:new He('texture_storage_3d',z.keyword,'texture_storage_3d'),texture_depth_2d:new He('texture_depth_2d',z.keyword,'texture_depth_2d'),texture_depth_2d_array:new He('texture_depth_2d_array',z.keyword,'texture_depth_2d_array'),texture_depth_cube:new He('texture_depth_cube',z.keyword,'texture_depth_cube'),texture_depth_cube_array:new He('texture_depth_cube_array',z.keyword,'texture_depth_cube_array'),texture_depth_multisampled_2d:new He('texture_depth_multisampled_2d',z.keyword,'texture_depth_multisampled_2d'),texture_external:new He('texture_external',z.keyword,'texture_external'),u32:new He('u32',z.keyword,'u32'),vec2:new He('vec2',z.keyword,'vec2'),vec3:new He('vec3',z.keyword,'vec3'),vec4:new He('vec4',z.keyword,'vec4'),bitcast:new He('bitcast',z.keyword,'bitcast'),block:new He('block',z.keyword,'block'),break:new He('break',z.keyword,'break'),case:new He('case',z.keyword,'case'),continue:new He('continue',z.keyword,'continue'),continuing:new He('continuing',z.keyword,'continuing'),default:new He('default',z.keyword,'default'),diagnostic:new He('diagnostic',z.keyword,'diagnostic'),discard:new He('discard',z.keyword,'discard'),else:new He('else',z.keyword,'else'),enable:new He('enable',z.keyword,'enable'),fallthrough:new He('fallthrough',z.keyword,'fallthrough'),false:new He('false',z.keyword,'false'),fn:new He('fn',z.keyword,'fn'),for:new He('for',z.keyword,'for'),function:new He('function',z.keyword,'function'),if:new He('if',z.keyword,'if'),let:new He('let',z.keyword,'let'),const:new He('const',z.keyword,'const'),loop:new He('loop',z.keyword,'loop'),while:new He('while',z.keyword,'while'),private:new He('private',z.keyword,'private'),read:new He('read',z.keyword,'read'),read_write:new He('read_write',z.keyword,'read_write'),return:new He('return',z.keyword,'return'),requires:new He('requires',z.keyword,'requires'),storage:new He('storage',z.keyword,'storage'),immediate:new He('immediate',z.keyword,'immediate'),switch:new He('switch',z.keyword,'switch'),true:new He('true',z.keyword,'true'),alias:new He('alias',z.keyword,'alias'),type:new He('type',z.keyword,'type'),uniform:new He('uniform',z.keyword,'uniform'),var:new He('var',z.keyword,'var'),override:new He('override',z.keyword,'override'),workgroup:new He('workgroup',z.keyword,'workgroup'),write:new He('write',z.keyword,'write'),r8unorm:new He('r8unorm',z.keyword,'r8unorm'),r8snorm:new He('r8snorm',z.keyword,'r8snorm'),r8uint:new He('r8uint',z.keyword,'r8uint'),r8sint:new He('r8sint',z.keyword,'r8sint'),r16uint:new He('r16uint',z.keyword,'r16uint'),r16sint:new He('r16sint',z.keyword,'r16sint'),r16float:new He('r16float',z.keyword,'r16float'),rg8unorm:new He('rg8unorm',z.keyword,'rg8unorm'),rg8snorm:new He('rg8snorm',z.keyword,'rg8snorm'),rg8uint:new He('rg8uint',z.keyword,'rg8uint'),rg8sint:new He('rg8sint',z.keyword,'rg8sint'),r32uint:new He('r32uint',z.keyword,'r32uint'),r32sint:new He('r32sint',z.keyword,'r32sint'),r32float:new He('r32float',z.keyword,'r32float'),rg16uint:new He('rg16uint',z.keyword,'rg16uint'),rg16sint:new He('rg16sint',z.keyword,'rg16sint'),rg16float:new He('rg16float',z.keyword,'rg16float'),rgba8unorm:new He('rgba8unorm',z.keyword,'rgba8unorm'),rgba8unorm_srgb:new He('rgba8unorm_srgb',z.keyword,'rgba8unorm_srgb'),rgba8snorm:new He('rgba8snorm',z.keyword,'rgba8snorm'),rgba8uint:new He('rgba8uint',z.keyword,'rgba8uint'),rgba8sint:new He('rgba8sint',z.keyword,'rgba8sint'),bgra8unorm:new He('bgra8unorm',z.keyword,'bgra8unorm'),bgra8unorm_srgb:new He('bgra8unorm_srgb',z.keyword,'bgra8unorm_srgb'),rgb10a2unorm:new He('rgb10a2unorm',z.keyword,'rgb10a2unorm'),rg11b10float:new He('rg11b10float',z.keyword,'rg11b10float'),rg32uint:new He('rg32uint',z.keyword,'rg32uint'),rg32sint:new He('rg32sint',z.keyword,'rg32sint'),rg32float:new He('rg32float',z.keyword,'rg32float'),rgba16uint:new He('rgba16uint',z.keyword,'rgba16uint'),rgba16sint:new He('rgba16sint',z.keyword,'rgba16sint'),rgba16float:new He('rgba16float',z.keyword,'rgba16float'),rgba32uint:new He('rgba32uint',z.keyword,'rgba32uint'),rgba32sint:new He('rgba32sint',z.keyword,'rgba32sint'),rgba32float:new He('rgba32float',z.keyword,'rgba32float'),static_assert:new He('static_assert',z.keyword,'static_assert'),const_assert:new He('const_assert',z.keyword,'const_assert')},ze.tokens={decimal_float_literal:new He('decimal_float_literal',z.token,/((-?[0-9]*\.[0-9]+|-?[0-9]+\.[0-9]*)((e|E)(\+|-)?[0-9]+)?[fh]?)|(-?[0-9]+(e|E)(\+|-)?[0-9]+[fh]?)|(-?[0-9]+[fh])/),hex_float_literal:new He('hex_float_literal',z.token,/-?0x((([0-9a-fA-F]*\.[0-9a-fA-F]+|[0-9a-fA-F]+\.[0-9a-fA-F]*)((p|P)(\+|-)?[0-9]+[fh]?)?)|([0-9a-fA-F]+(p|P)(\+|-)?[0-9]+[fh]?))/),int_literal:new He('int_literal',z.token,/-?0x[0-9a-fA-F]+|0i?|-?[1-9][0-9]*i?/),uint_literal:new He('uint_literal',z.token,/0x[0-9a-fA-F]+u|0u|[1-9][0-9]*u/),name:new He('name',z.token,/([_\p{XID_Start}][\p{XID_Continue}]+)|([\p{XID_Start}])/u),ident:new He('ident',z.token,/[_a-zA-Z][0-9a-zA-Z_]*/),and:new He('and',z.token,'&'),and_and:new He('and_and',z.token,'&&'),arrow:new He('arrow ',z.token,'->'),attr:new He('attr',z.token,'@'),forward_slash:new He('forward_slash',z.token,'/'),bang:new He('bang',z.token,'!'),bracket_left:new He('bracket_left',z.token,'['),bracket_right:new He('bracket_right',z.token,']'),brace_left:new He('brace_left',z.token,'{'),brace_right:new He('brace_right',z.token,'}'),colon:new He('colon',z.token,':'),comma:new He('comma',z.token,','),equal:new He('equal',z.token,'='),equal_equal:new He('equal_equal',z.token,'=='),not_equal:new He('not_equal',z.token,'!='),greater_than:new He('greater_than',z.token,'>'),greater_than_equal:new He('greater_than_equal',z.token,'>='),shift_right:new He('shift_right',z.token,'>>'),less_than:new He('less_than',z.token,'<'),less_than_equal:new He('less_than_equal',z.token,'<='),shift_left:new He('shift_left',z.token,'<<'),modulo:new He('modulo',z.token,'%'),minus:new He('minus',z.token,'-'),minus_minus:new He('minus_minus',z.token,'--'),period:new He('period',z.token,'.'),plus:new He('plus',z.token,'+'),plus_plus:new He('plus_plus',z.token,'++'),or:new He('or',z.token,'|'),or_or:new He('or_or',z.token,'||'),paren_left:new He('paren_left',z.token,'('),paren_right:new He('paren_right',z.token,')'),semicolon:new He('semicolon',z.token,';'),star:new He('star',z.token,'*'),tilde:new He('tilde',z.token,'~'),underscore:new He('underscore',z.token,'_'),xor:new He('xor',z.token,'^'),plus_equal:new He('plus_equal',z.token,'+='),minus_equal:new He('minus_equal',z.token,'-='),times_equal:new He('times_equal',z.token,'*='),division_equal:new He('division_equal',z.token,'/='),modulo_equal:new He('modulo_equal',z.token,'%='),and_equal:new He('and_equal',z.token,'&='),or_equal:new He('or_equal',z.token,'|='),xor_equal:new He('xor_equal',z.token,'^='),shift_right_equal:new He('shift_right_equal',z.token,'>>='),shift_left_equal:new He('shift_left_equal',z.token,'<<=')},ze.simpleTokens={'@':H.tokens.attr,'{':H.tokens.brace_left,'}':H.tokens.brace_right,':':H.tokens.colon,',':H.tokens.comma,'(':H.tokens.paren_left,')':H.tokens.paren_right,';':H.tokens.semicolon},ze.literalTokens={'&':H.tokens.and,'&&':H.tokens.and_and,'->':H.tokens.arrow,'/':H.tokens.forward_slash,'!':H.tokens.bang,'[':H.tokens.bracket_left,']':H.tokens.bracket_right,'=':H.tokens.equal,'==':H.tokens.equal_equal,'!=':H.tokens.not_equal,'>':H.tokens.greater_than,'>=':H.tokens.greater_than_equal,'>>':H.tokens.shift_right,'<':H.tokens.less_than,'<=':H.tokens.less_than_equal,'<<':H.tokens.shift_left,'%':H.tokens.modulo,'-':H.tokens.minus,'--':H.tokens.minus_minus,'.':H.tokens.period,'+':H.tokens.plus,'++':H.tokens.plus_plus,'|':H.tokens.or,'||':H.tokens.or_or,'*':H.tokens.star,'~':H.tokens.tilde,_:H.tokens.underscore,'^':H.tokens.xor,'+=':H.tokens.plus_equal,'-=':H.tokens.minus_equal,'*=':H.tokens.times_equal,'/=':H.tokens.division_equal,'%=':H.tokens.modulo_equal,'&=':H.tokens.and_equal,'|=':H.tokens.or_equal,'^=':H.tokens.xor_equal,'>>=':H.tokens.shift_right_equal,'<<=':H.tokens.shift_left_equal},ze.regexTokens={decimal_float_literal:H.tokens.decimal_float_literal,hex_float_literal:H.tokens.hex_float_literal,int_literal:H.tokens.int_literal,uint_literal:H.tokens.uint_literal,ident:H.tokens.ident},ze.storage_class=[H.keywords.function,H.keywords.private,H.keywords.workgroup,H.keywords.uniform,H.keywords.storage,H.keywords.immediate],ze.access_mode=[H.keywords.read,H.keywords.write,H.keywords.read_write],ze.sampler_type=[H.keywords.sampler,H.keywords.sampler_comparison],ze.sampled_texture_type=[H.keywords.texture_1d,H.keywords.texture_2d,H.keywords.texture_2d_array,H.keywords.texture_3d,H.keywords.texture_cube,H.keywords.texture_cube_array],ze.multisampled_texture_type=[H.keywords.texture_multisampled_2d],ze.storage_texture_type=[H.keywords.texture_storage_1d,H.keywords.texture_storage_2d,H.keywords.texture_storage_2d_array,H.keywords.texture_storage_3d],ze.depth_texture_type=[H.keywords.texture_depth_2d,H.keywords.texture_depth_2d_array,H.keywords.texture_depth_cube,H.keywords.texture_depth_cube_array,H.keywords.texture_depth_multisampled_2d],ze.texture_external_type=[H.keywords.texture_external],ze.any_texture_type=[...H.sampled_texture_type,...H.multisampled_texture_type,...H.storage_texture_type,...H.depth_texture_type,...H.texture_external_type],ze.texel_format=[H.keywords.r8unorm,H.keywords.r8snorm,H.keywords.r8uint,H.keywords.r8sint,H.keywords.r16uint,H.keywords.r16sint,H.keywords.r16float,H.keywords.rg8unorm,H.keywords.rg8snorm,H.keywords.rg8uint,H.keywords.rg8sint,H.keywords.r32uint,H.keywords.r32sint,H.keywords.r32float,H.keywords.rg16uint,H.keywords.rg16sint,H.keywords.rg16float,H.keywords.rgba8unorm,H.keywords.rgba8unorm_srgb,H.keywords.rgba8snorm,H.keywords.rgba8uint,H.keywords.rgba8sint,H.keywords.bgra8unorm,H.keywords.bgra8unorm_srgb,H.keywords.rgb10a2unorm,H.keywords.rg11b10float,H.keywords.rg32uint,H.keywords.rg32sint,H.keywords.rg32float,H.keywords.rgba16uint,H.keywords.rgba16sint,H.keywords.rgba16float,H.keywords.rgba32uint,H.keywords.rgba32sint,H.keywords.rgba32float],ze.const_literal=[H.tokens.int_literal,H.tokens.uint_literal,H.tokens.decimal_float_literal,H.tokens.hex_float_literal,H.keywords.true,H.keywords.false],ze.literal_or_ident=[H.tokens.ident,H.tokens.int_literal,H.tokens.uint_literal,H.tokens.decimal_float_literal,H.tokens.hex_float_literal,H.tokens.name],ze.element_count_expression=[H.tokens.int_literal,H.tokens.uint_literal,H.tokens.ident],ze.template_types=[H.keywords.vec2,H.keywords.vec3,H.keywords.vec4,H.keywords.mat2x2,H.keywords.mat2x3,H.keywords.mat2x4,H.keywords.mat3x2,H.keywords.mat3x3,H.keywords.mat3x4,H.keywords.mat4x2,H.keywords.mat4x3,H.keywords.mat4x4,H.keywords.atomic,H.keywords.bitcast,...H.any_texture_type],ze.attribute_name=[H.tokens.ident,H.keywords.block,H.keywords.diagnostic],ze.assignment_operators=[H.tokens.equal,H.tokens.plus_equal,H.tokens.minus_equal,H.tokens.times_equal,H.tokens.division_equal,H.tokens.modulo_equal,H.tokens.and_equal,H.tokens.or_equal,H.tokens.xor_equal,H.tokens.shift_right_equal,H.tokens.shift_left_equal],ze.increment_operators=[H.tokens.plus_plus,H.tokens.minus_minus];class Re{constructor(e,t,n,s,r){this.type=e,this.lexeme=t,this.line=n,this.start=s,this.end=r;}toString(){return this.lexeme}isTemplateType(){return ze.template_types.includes(this.type)}isArrayType(){return this.type===ze.keywords.array}isArrayOrTemplateType(){return this.isArrayType()||this.isTemplateType()}}class Ge{constructor(e){this._tokens=[],this._start=0,this._current=0,this._line=1,this._source=null!=e?e:'';}scanTokens(){for(;!this._isAtEnd();)if(this._start=this._current,!this.scanToken())throw `Invalid syntax at line ${this._line}`;return this._tokens.push(new Re(ze.eof,'',this._line,this._current,this._current)),this._tokens}scanToken(){let e=this._advance();if('\n'==e)return this._line++,true;if(this._isWhitespace(e))return  true;if('/'==e){if('/'==this._peekAhead()){for(;'\n'!=e;){if(this._isAtEnd())return  true;e=this._advance();}return this._line++,true}if('*'==this._peekAhead()){this._advance();let t=1;for(;t>0;){if(this._isAtEnd())return  true;if(e=this._advance(),'\n'==e)this._line++;else if('*'==e){if('/'==this._peekAhead()&&(this._advance(),t--,0==t))return  true}else '/'==e&&'*'==this._peekAhead()&&(this._advance(),t++);}return  true}}const t=ze.simpleTokens[e];if(t)return this._addToken(t),true;let n=ze.none;const s=this._isAlpha(e),r='_'===e;if(this._isAlphaNumeric(e)){let t=this._peekAhead();for(;this._isAlphaNumeric(t);)e+=this._advance(),t=this._peekAhead();}if(s){const t=ze.keywords[e];if(t)return this._addToken(t),true}if(s||r)return this._addToken(ze.tokens.ident),true;for(;;){let t=this._findType(e);const s=this._peekAhead();if('-'==e&&this._tokens.length>0){if('='==s)return this._current++,e+=s,this._addToken(ze.tokens.minus_equal),true;if('-'==s)return this._current++,e+=s,this._addToken(ze.tokens.minus_minus),true;const n=this._tokens.length-1;if((ze.literal_or_ident.includes(this._tokens[n].type)||this._tokens[n].type==ze.tokens.paren_right)&&'>'!=s)return this._addToken(t),true}if('>'==e&&('>'==s||'='==s)){let e=false,n=this._tokens.length-1;for(let t=0;t<5&&n>=0&&!ze.assignment_operators.includes(this._tokens[n].type);++t,--n)if(this._tokens[n].type===ze.tokens.less_than){n>0&&this._tokens[n-1].isArrayOrTemplateType()&&(e=true);break}if(e)return this._addToken(t),true}if(t===ze.none){let s=e,r=0;const a=2;for(let e=0;e<a;++e)if(s+=this._peekAhead(e),t=this._findType(s),t!==ze.none){r=e;break}if(t===ze.none)return n!==ze.none&&(this._current--,this._addToken(n),true);e=s,this._current+=r+1;}if(n=t,this._isAtEnd())break;e+=this._advance();}return n!==ze.none&&(this._addToken(n),true)}_findType(e){for(const t in ze.regexTokens){const n=ze.regexTokens[t];if(this._match(e,n.rule))return n}const t=ze.literalTokens[e];return t||ze.none}_match(e,t){const n=t.exec(e);return n&&0==n.index&&n[0]==e}_isAtEnd(){return this._current>=this._source.length}_isAlpha(e){return !this._isNumeric(e)&&!this._isWhitespace(e)&&'_'!==e&&!Ge._operators.has(e)}_isNumeric(e){return e>='0'&&e<='9'}_isAlphaNumeric(e){return this._isAlpha(e)||this._isNumeric(e)||'_'===e}_isWhitespace(e){return ' '==e||'\t'==e||'\r'==e}_advance(e=0){const t=this._source[this._current];return this._current+=e+1,null!=t?t:'\0'}_peekAhead(e=0){return this._current+e>=this._source.length?'\0':this._source[this._current+e]}_addToken(e){const t=this._source.substring(this._start,this._current);this._tokens.push(new Re(e,t,this._line,this._start,this._current));}}function Xe(e){return Array.isArray(e)||(null==e?void 0:e.buffer)instanceof ArrayBuffer}Ge._operators=new Set(['.','(',')','[',']','{','}',',',';',':','=','!','<','>','+','-','*','/','%','&','|','^','~','@','#','?','\'','`','"','\\','\n','\r','\t','\0']);const je=new Float32Array(1),Ze=new Uint32Array(je.buffer),Qe=new Uint32Array(je.buffer),Ye=new Int32Array(1),Ke=new Float32Array(Ye.buffer),Je=new Uint32Array(Ye.buffer),et=new Uint32Array(1),tt=new Float32Array(et.buffer),nt=new Int32Array(et.buffer);function st(e,t,n){if(t===n)return e;if('f32'===t){if('i32'===n||'x32'===n)return je[0]=e,Ze[0];if('u32'===n)return je[0]=e,Qe[0]}else if('i32'===t||'x32'===t){if('f32'===n)return Ye[0]=e,Ke[0];if('u32'===n)return Ye[0]=e,Je[0]}else if('u32'===t){if('f32'===n)return et[0]=e,tt[0];if('i32'===n||'x32'===n)return et[0]=e,nt[0]}return console.error(`Unsupported cast from ${t} to ${n}`),e}class rt{constructor(e){this.resources=null,this.inUse=false,this.info=null,this.node=e;}}class at{constructor(e,t){this.align=e,this.size=t;}}class it{constructor(){this.uniforms=[],this.storage=[],this.immediates=[],this.textures=[],this.samplers=[],this.aliases=[],this.overrides=[],this.structs=[],this.entry=new d,this.functions=[],this._types=new Map,this._functions=new Map;}_isStorageTexture(e){return 'texture_storage_1d'==e.name||'texture_storage_2d'==e.name||'texture_storage_2d_array'==e.name||'texture_storage_3d'==e.name}updateAST(e){for(const t of e)t instanceof D&&this._functions.set(t.name,new rt(t));for(const t of e)if(t instanceof oe){const e=this.getTypeInfo(t,null);e instanceof n&&this.structs.push(e);}for(const t of e)if(t instanceof te)this.aliases.push(this._getAliasInfo(t));else {if(t instanceof M){const e=t,n=this._getAttributeNum(e.attributes,'id',0),s=null!=e.type?this.getTypeInfo(e.type,e.attributes):null;this.overrides.push(new h(e.name,s,e.attributes,n));continue}if(this._isUniformVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),a=new o(e.name,r,n,s,e.attributes,i.Uniform,e.access);a.access||(a.access='read'),this.uniforms.push(a);continue}if(this._isImmediateVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),a=new o(e.name,r,n,s,e.attributes,i.Immediate,e.access);a.access||(a.access='read'),this.immediates.push(a);continue}if(this._isStorageVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),a=this._isStorageTexture(r),l=new o(e.name,r,n,s,e.attributes,a?i.StorageTexture:i.Storage,e.access);l.access||(l.access='read'),this.storage.push(l);continue}if(this._isTextureVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),a=this._isStorageTexture(r),l=a?r.access:e.access,c=new o(e.name,r,n,s,e.attributes,a?i.StorageTexture:i.Texture,l||e.access);c.access||(c.access='read'),a?this.storage.push(c):this.textures.push(c);continue}if(this._isSamplerVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),a=new o(e.name,r,n,s,e.attributes,i.Sampler,e.access);this.samplers.push(a);continue}}for(const t of e)if(t instanceof D){const e=this._getAttribute(t,'vertex'),n=this._getAttribute(t,'fragment'),s=this._getAttribute(t,'compute'),r=e||n||s,a=new p(t.name,null==r?void 0:r.name,t.attributes);a.attributes=t.attributes,a.startLine=t.startLine,a.endLine=t.endLine,this.functions.push(a),this._functions.get(t.name).info=a,r&&(this._functions.get(t.name).inUse=true,a.inUse=true,a.inputs=this._getInputs(t.args),a.outputs=this._getOutputs(t.returnType),this.entry[r.name].push(a)),a.resources=this._findResources(t,!!r),a.arguments=t.args.map(e=>new f(e.name,this.getTypeInfo(e.type,e.attributes),e.attributes)),a.returnType=t.returnType?this.getTypeInfo(t.returnType,t.attributes):null;continue}for(const e of this._functions.values())e.info&&(e.info.inUse=e.inUse,this._addCalls(e.node,e.info.calls));for(const e of this._functions.values())e.node.search(t=>{var n,s,r;if(t instanceof De){if(t.value)if(Xe(t.value))for(const s of t.value)for(const t of this.overrides)s===t.name&&(null===(n=e.info)||void 0===n||n.overrides.push(t));else for(const n of this.overrides)t.value===n.name&&(null===(s=e.info)||void 0===s||s.overrides.push(n));}else if(t instanceof _e)for(const n of this.overrides)t.name===n.name&&(null===(r=e.info)||void 0===r||r.overrides.push(n));});for(const e of this.uniforms)this._markStructsInUse(e.type);for(const e of this.storage)this._markStructsInUse(e.type);}getFunctionInfo(e){for(const t of this.functions)if(t.name==e)return t;return null}getStructInfo(e){for(const t of this.structs)if(t.name==e)return t;return null}getOverrideInfo(e){for(const t of this.overrides)if(t.name==e)return t;return null}_markStructsInUse(e){if(e)if(e.isStruct){if(e.inUse=true,e.members)for(const t of e.members)this._markStructsInUse(t.type);}else if(e.isArray)this._markStructsInUse(e.format);else if(e.isTemplate)e.format&&this._markStructsInUse(e.format);else {const t=this._getAlias(e.name);t&&this._markStructsInUse(t);}}_addCalls(e,t){var n;for(const s of e.calls){const e=null===(n=this._functions.get(s.name))||void 0===n?void 0:n.info;e&&t.add(e);}}findResource(e,t,n){if(n){for(const s of this.entry.compute)if(s.name===n)for(const n of s.resources)if(n.group==e&&n.binding==t)return n;for(const s of this.entry.vertex)if(s.name===n)for(const n of s.resources)if(n.group==e&&n.binding==t)return n;for(const s of this.entry.fragment)if(s.name===n)for(const n of s.resources)if(n.group==e&&n.binding==t)return n}for(const n of this.uniforms)if(n.group==e&&n.binding==t)return n;for(const n of this.storage)if(n.group==e&&n.binding==t)return n;for(const n of this.textures)if(n.group==e&&n.binding==t)return n;for(const n of this.samplers)if(n.group==e&&n.binding==t)return n;return null}_findResource(e){for(const t of this.uniforms)if(t.name==e)return t;for(const t of this.storage)if(t.name==e)return t;for(const t of this.textures)if(t.name==e)return t;for(const t of this.samplers)if(t.name==e)return t;return null}_markStructsFromAST(e){const t=this.getTypeInfo(e,null);this._markStructsInUse(t);}_findResources(e,t){const n=[],s=this,r=[];return e.search(a=>{if(a instanceof E)r.push({});else if(a instanceof $)r.pop();else if(a instanceof F){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type),r.length>0&&(r[r.length-1][e.name]=e);}else if(a instanceof de){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type);}else if(a instanceof U){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type),r.length>0&&(r[r.length-1][e.name]=e);}else if(a instanceof _e){const e=a;if(r.length>0){if(r[r.length-1][e.name])return}const t=s._findResource(e.name);t&&n.push(t);}else if(a instanceof me){const r=a,o=s._functions.get(r.name);if(o&&(t&&(o.inUse=true),e.calls.add(o.node),o.resources=s._findResources(o.node,t),n.push(...o.resources)),'textureSample'===r.name&&r.args.length>=2){const e=r.args[0];let t=null;if(e instanceof _e){const n=s._findResource(e.name);n&&n.resourceType===i.Texture&&(t=n);}const n=r.args[1];let a=null;if(n instanceof _e){const e=s._findResource(n.name);e&&e.resourceType===i.Sampler&&(a=e);}t&&a&&(null===t.relations&&(t.relations=[]),t.relations.push(a),null===a.relations&&(a.relations=[]),a.relations.push(t));}}else if(a instanceof X){const r=a,i=s._functions.get(r.name);i&&(t&&(i.inUse=true),e.calls.add(i.node),i.resources=s._findResources(i.node,t),n.push(...i.resources));}}),[...new Map(n.map(e=>[e.name,e])).values()]}getBindGroups(){const e=[];function t(t,n){t>=e.length&&(e.length=t+1),void 0===e[t]&&(e[t]=[]),n>=e[t].length&&(e[t].length=n+1);}for(const n of this.uniforms){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.storage){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.textures){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.samplers){t(n.group,n.binding);e[n.group][n.binding]=n;}return e}_getOutputs(e,t=void 0){if(void 0===t&&(t=[]),e instanceof oe)this._getStructOutputs(e,t);else {const n=this._getOutputInfo(e);null!==n&&t.push(n);}return t}_getStructOutputs(e,t){for(const n of e.members)if(n.type instanceof oe)this._getStructOutputs(n.type,t);else {const e=this._getAttribute(n,'location')||this._getAttribute(n,'builtin');if(null!==e){const s=this.getTypeInfo(n.type,n.type.attributes),r=this._parseInt(e.value),a=new u(n.name,s,e.name,r);t.push(a);}}}_getOutputInfo(e){const t=this._getAttribute(e,'location')||this._getAttribute(e,'builtin');if(null!==t){const n=this.getTypeInfo(e,e.attributes),s=this._parseInt(t.value);return new u('',n,t.name,s)}return null}_getInputs(e,t=void 0){ void 0===t&&(t=[]);for(const n of e)if(n.type instanceof oe)this._getStructInputs(n.type,t);else {const e=this._getInputInfo(n);null!==e&&t.push(e);}return t}_getStructInputs(e,t){for(const n of e.members)if(n.type instanceof oe)this._getStructInputs(n.type,t);else {const e=this._getInputInfo(n);null!==e&&t.push(e);}}_getInputInfo(e){const t=this._getAttribute(e,'location')||this._getAttribute(e,'builtin');if(null!==t){const n=this._getAttribute(e,'interpolation'),s=this.getTypeInfo(e.type,e.attributes),r=this._parseInt(t.value),a=new c(e.name,s,t.name,r);return null!==n&&(a.interpolation=this._parseString(n.value)),a}return null}_parseString(e){return e instanceof Array&&(e=e[0]),e}_parseInt(e){e instanceof Array&&(e=e[0]);const t=parseInt(e);return isNaN(t)?e:t}_getAlias(e){for(const t of this.aliases)if(t.name==e)return t.type;return null}_getAliasInfo(e){return new l(e.name,this.getTypeInfo(e.type,null))}getTypeInfoByName(e){for(const t of this.structs)if(t.name==e)return t;for(const t of this.aliases)if(t.name==e)return t.type;return null}getTypeInfo(i,o=null){if(this._types.has(i))return this._types.get(i);if(i instanceof ce){const e=i.type?this.getTypeInfo(i.type,i.attributes):null,t=new r(i.name,e,o);return this._types.set(i,t),this._updateTypeInfo(t),t}if(i instanceof ue){const e=i,t=e.format?this.getTypeInfo(e.format,e.attributes):null,n=new s(e.name,o);return n.format=t,n.count=e.count,this._types.set(i,n),this._updateTypeInfo(n),n}if(i instanceof oe){const e=i,s=new n(e.name,o);s.startLine=e.startLine,s.endLine=e.endLine;for(const n of e.members){const e=this.getTypeInfo(n.type,n.attributes);s.members.push(new t(n.name,e,n.attributes));}return this._types.set(i,s),this._updateTypeInfo(s),s}if(i instanceof he){const t=i,n=t.format instanceof ae,s=t.format?n?this.getTypeInfo(t.format,null):new e(t.format,null):null,r=new a(t.name,s,o,t.access);return this._types.set(i,r),this._updateTypeInfo(r),r}if(i instanceof le){const e=i,t=e.format?this.getTypeInfo(e.format,null):null,n=new a(e.name,t,o,e.access);return this._types.set(i,n),this._updateTypeInfo(n),n}const l=new e(i.name,o);return this._types.set(i,l),this._updateTypeInfo(l),l}_updateTypeInfo(e){var t,a,i;const o=this._getTypeSize(e);if(e.size=null!==(t=null==o?void 0:o.size)&&void 0!==t?t:0,e instanceof s&&e.format){const t=this._getTypeSize(e.format);e.stride=Math.max(null!==(a=null==t?void 0:t.size)&&void 0!==a?a:0,null!==(i=null==t?void 0:t.align)&&void 0!==i?i:0),this._updateTypeInfo(e.format);}e instanceof r&&this._updateTypeInfo(e.format),e instanceof n&&this._updateStructInfo(e);}_updateStructInfo(e){var t;let n=0,s=0,r=0,a=0;for(let i=0,o=e.members.length;i<o;++i){const o=e.members[i],l=this._getTypeSize(o);if(!l)continue;null!==(t=this._getAlias(o.type.name))&&void 0!==t||o.type;const c=l.align,u=l.size;n=this._roundUp(c,n+s),s=u,r=n,a=Math.max(a,c),o.offset=n,o.size=u,this._updateTypeInfo(o.type);}e.size=this._roundUp(a,r+s),e.align=a;}_getTypeSize(r){var a,i;if(null==r)return null;const o=this._getAttributeNum(r.attributes,'size',0),l=this._getAttributeNum(r.attributes,'align',0);if(r instanceof t&&(r=r.type),r instanceof e){const e=this._getAlias(r.name);null!==e&&(r=e);}{const e=it._typeInfo[r.name];if(void 0!==e){const t='f16'===(null===(a=r.format)||void 0===a?void 0:a.name)?2:1;return new at(Math.max(l,e.align/t),Math.max(o,e.size/t))}}{const e=it._typeInfo[r.name.substring(0,r.name.length-1)];if(e){const t='h'===r.name[r.name.length-1]?2:1;return new at(Math.max(l,e.align/t),Math.max(o,e.size/t))}}if(r instanceof s){let e=r,t=8,n=8;const s=this._getTypeSize(e.format);null!==s&&(n=s.size,t=s.align);return n=e.count*this._getAttributeNum(null!==(i=null==r?void 0:r.attributes)&&void 0!==i?i:null,'stride',this._roundUp(t,n)),o&&(n=o),new at(Math.max(l,t),Math.max(o,n))}if(r instanceof n){let e=0,t=0,n=0,s=0,a=0;for(const t of r.members){const r=this._getTypeSize(t.type);null!==r&&(e=Math.max(r.align,e),n=this._roundUp(r.align,n+s),s=r.size,a=n);}return t=this._roundUp(e,a+s),new at(Math.max(l,e),Math.max(o,t))}return null}_isUniformVar(e){return e instanceof F&&'uniform'==e.storage}_isImmediateVar(e){return e instanceof F&&'immediate'==e.storage}_isStorageVar(e){return e instanceof F&&'storage'==e.storage}_isTextureVar(e){return e instanceof F&&null!==e.type&&-1!=it._textureTypes.indexOf(e.type.name)}_isSamplerVar(e){return e instanceof F&&null!==e.type&&-1!=it._samplerTypes.indexOf(e.type.name)}_getAttribute(e,t){const n=e;if(!n||!n.attributes)return null;const s=n.attributes;for(let e of s)if(e.name==t)return e;return null}_getAttributeNum(e,t,n){if(null===e)return n;for(let s of e)if(s.name==t){let e=null!==s&&null!==s.value?s.value:n;return e instanceof Array&&(e=e[0]),'number'==typeof e?e:'string'==typeof e?parseInt(e):n}return n}_roundUp(e,t){return Math.ceil(t/e)*e}}it._typeInfo={f16:{align:2,size:2},i32:{align:4,size:4},u32:{align:4,size:4},f32:{align:4,size:4},atomic:{align:4,size:4},vec2:{align:8,size:8},vec3:{align:16,size:12},vec4:{align:16,size:16},mat2x2:{align:8,size:16},mat3x2:{align:8,size:24},mat4x2:{align:8,size:32},mat2x3:{align:16,size:32},mat3x3:{align:16,size:48},mat4x3:{align:16,size:64},mat2x4:{align:16,size:32},mat3x4:{align:16,size:48},mat4x4:{align:16,size:64}},it._textureTypes=ze.any_texture_type.map(e=>e.name),it._samplerTypes=ze.sampler_type.map(e=>e.name);let ot=0;class lt{constructor(e,t,n){this.id=ot++,this.name=e,this.value=t,this.node=n;}clone(){return new lt(this.name,this.value,this.node)}}class ct{constructor(e){this.id=ot++,this.name=e.name,this.node=e;}clone(){return new ct(this.node)}}class ut{constructor(e){this.parent=null,this.variables=new Map,this.functions=new Map,this.currentFunctionName='',this.id=ot++,e&&(this.parent=e,this.currentFunctionName=e.currentFunctionName);}getVariable(e){var t;return this.variables.has(e)?null!==(t=this.variables.get(e))&&void 0!==t?t:null:this.parent?this.parent.getVariable(e):null}getFunction(e){var t;return this.functions.has(e)?null!==(t=this.functions.get(e))&&void 0!==t?t:null:this.parent?this.parent.getFunction(e):null}createVariable(e,t,n){this.variables.set(e,new lt(e,t,null!=n?n:null));}setVariable(e,t,n){const s=this.getVariable(e);null!==s?s.value=t:this.createVariable(e,t,n);}getVariableValue(e){var t;const n=this.getVariable(e);return null!==(t=null==n?void 0:n.value)&&void 0!==t?t:null}clone(){return new ut(this)}}class ht{evalExpression(e,t){return null}getTypeInfo(e){return null}getVariableName(e,t){return ''}}class ft{constructor(e){this.exec=e;}getTypeInfo(e){return this.exec.getTypeInfo(e)}All(e,t){const n=this.exec.evalExpression(e.args[0],t);let s=true;if(n instanceof Ue)return n.data.forEach(e=>{e||(s=false);}),new Fe(s?1:0,this.getTypeInfo('bool'));throw new Error(`All() expects a vector argument. Line ${e.line}`)}Any(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue){const e=n.data.some(e=>e);return new Fe(e?1:0,this.getTypeInfo('bool'))}throw new Error(`Any() expects a vector argument. Line ${e.line}`)}Select(e,t){const n=this.exec.evalExpression(e.args[2],t);if(!(n instanceof Fe))throw new Error(`Select() expects a bool condition. Line ${e.line}`);return n.value?this.exec.evalExpression(e.args[1],t):this.exec.evalExpression(e.args[0],t)}ArrayLength(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.evalExpression(n,t);if(s instanceof We&&0===s.typeInfo.size){const e=s.typeInfo,t=s.buffer.byteLength/e.stride;return new Fe(t,this.getTypeInfo('u32'))}return new Fe(s.typeInfo.size,this.getTypeInfo('u32'))}Abs(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.abs(e)),n.typeInfo);const s=n;return new Fe(Math.abs(s.value),s.typeInfo)}Acos(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.acos(e)),n.typeInfo);const s=n;return new Fe(Math.acos(s.value),n.typeInfo)}Acosh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.acosh(e)),n.typeInfo);const s=n;return new Fe(Math.acosh(s.value),n.typeInfo)}Asin(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.asin(e)),n.typeInfo);const s=n;return new Fe(Math.asin(s.value),n.typeInfo)}Asinh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.asinh(e)),n.typeInfo);const s=n;return new Fe(Math.asinh(s.value),n.typeInfo)}Atan(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.atan(e)),n.typeInfo);const s=n;return new Fe(Math.atan(s.value),n.typeInfo)}Atanh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.atanh(e)),n.typeInfo);const s=n;return new Fe(Math.atanh(s.value),n.typeInfo)}Atan2(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>Math.atan2(e,s.data[t])),n.typeInfo);const r=n,a=s;return new Fe(Math.atan2(r.value,a.value),n.typeInfo)}Ceil(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.ceil(e)),n.typeInfo);const s=n;return new Fe(Math.ceil(s.value),n.typeInfo)}_clamp(e,t,n){return Math.min(Math.max(e,t),n)}Clamp(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ue&&s instanceof Ue&&r instanceof Ue)return new Ue(n.data.map((e,t)=>this._clamp(e,s.data[t],r.data[t])),n.typeInfo);const a=n,i=s,o=r;return new Fe(this._clamp(a.value,i.value,o.value),n.typeInfo)}Cos(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.cos(e)),n.typeInfo);const s=n;return new Fe(Math.cos(s.value),n.typeInfo)}Cosh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.cosh(e)),n.typeInfo);const s=n;return new Fe(Math.cos(s.value),n.typeInfo)}CountLeadingZeros(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.clz32(e)),n.typeInfo);const s=n;return new Fe(Math.clz32(s.value),n.typeInfo)}_countOneBits(e){let t=0;for(;0!==e;)1&e&&t++,e>>=1;return t}CountOneBits(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>this._countOneBits(e)),n.typeInfo);const s=n;return new Fe(this._countOneBits(s.value),n.typeInfo)}_countTrailingZeros(e){if(0===e)return 32;let t=0;for(;!(1&e);)e>>=1,t++;return t}CountTrailingZeros(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>this._countTrailingZeros(e)),n.typeInfo);const s=n;return new Fe(this._countTrailingZeros(s.value),n.typeInfo)}Cross(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue){if(3!==n.data.length||3!==s.data.length)return console.error(`Cross() expects 3D vectors. Line ${e.line}`),null;const t=n.data,r=s.data;return new Ue([t[1]*r[2]-r[1]*t[2],t[2]*r[0]-r[2]*t[0],t[0]*r[1]-r[0]*t[1]],n.typeInfo)}return console.error(`Cross() expects vector arguments. Line ${e.line}`),null}Degrees(e,t){const n=this.exec.evalExpression(e.args[0],t),s=180/Math.PI;if(n instanceof Ue)return new Ue(n.data.map(e=>e*s),n.typeInfo);return new Fe(n.value*s,this.getTypeInfo('f32'))}Determinant(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Pe){const e=n.data,t=n.typeInfo.getTypeName(),s=t.endsWith('h')?this.getTypeInfo('f16'):this.getTypeInfo('f32');if('mat2x2'===t||'mat2x2f'===t||'mat2x2h'===t)return new Fe(e[0]*e[3]-e[1]*e[2],s);if('mat2x3'===t||'mat2x3f'===t||'mat2x3h'===t)return new Fe(e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]),s);if('mat2x4'===t||'mat2x4f'===t||'mat2x4h'===t)console.error(`TODO: Determinant for ${t}`);else if('mat3x2'===t||'mat3x2f'===t||'mat3x2h'===t)console.error(`TODO: Determinant for ${t}`);else {if('mat3x3'===t||'mat3x3f'===t||'mat3x3h'===t)return new Fe(e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]),s);'mat3x4'===t||'mat3x4f'===t||'mat3x4h'===t||'mat4x2'===t||'mat4x2f'===t||'mat4x2h'===t||'mat4x3'===t||'mat4x3f'===t||'mat4x3h'===t?console.error(`TODO: Determinant for ${t}`):'mat4x4'!==t&&'mat4x4f'!==t&&'mat4x4h'!==t||console.error(`TODO: Determinant for ${t}`);}}return console.error(`Determinant expects a matrix argument. Line ${e.line}`),null}Distance(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue){let e=0;for(let t=0;t<n.data.length;++t)e+=(n.data[t]-s.data[t])*(n.data[t]-s.data[t]);return new Fe(Math.sqrt(e),this.getTypeInfo('f32'))}const r=n,a=s;return new Fe(Math.abs(r.value-a.value),n.typeInfo)}_dot(e,t){let n=0;for(let s=0;s<e.length;++s)n+=t[s]*e[s];return n}Dot(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);return n instanceof Ue&&s instanceof Ue?new Fe(this._dot(n.data,s.data),this.getTypeInfo('f32')):(console.error(`Dot() expects vector arguments. Line ${e.line}`),null)}Dot4U8Packed(e,t){return console.error(`TODO: dot4U8Packed. Line ${e.line}`),null}Dot4I8Packed(e,t){return console.error(`TODO: dot4I8Packed. Line ${e.line}`),null}Exp(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.exp(e)),n.typeInfo);const s=n;return new Fe(Math.exp(s.value),n.typeInfo)}Exp2(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.pow(2,e)),n.typeInfo);const s=n;return new Fe(Math.pow(2,s.value),n.typeInfo)}ExtractBits(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if('u32'!==s.typeInfo.name&&'x32'!==s.typeInfo.name)return console.error(`ExtractBits() expects an i32 offset argument. Line ${e.line}`),null;if('u32'!==r.typeInfo.name&&'x32'!==r.typeInfo.name)return console.error(`ExtractBits() expects an i32 count argument. Line ${e.line}`),null;const a=s.value,i=r.value;if(n instanceof Ue)return new Ue(n.data.map(e=>e>>a&(1<<i)-1),n.typeInfo);if('i32'!==n.typeInfo.name&&'x32'!==n.typeInfo.name)return console.error(`ExtractBits() expects an i32 argument. Line ${e.line}`),null;const o=n.value;return new Fe(o>>a&(1<<i)-1,this.getTypeInfo('i32'))}FaceForward(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ue&&s instanceof Ue&&r instanceof Ue){const e=this._dot(s.data,r.data);return new Ue(e<0?Array.from(n.data):n.data.map(e=>-e),n.typeInfo)}return console.error(`FaceForward() expects vector arguments. Line ${e.line}`),null}_firstLeadingBit(e){return 0===e?-1:31-Math.clz32(e)}FirstLeadingBit(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>this._firstLeadingBit(e)),n.typeInfo);const s=n;return new Fe(this._firstLeadingBit(s.value),n.typeInfo)}_firstTrailingBit(e){return 0===e?-1:Math.log2(e&-e)}FirstTrailingBit(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>this._firstTrailingBit(e)),n.typeInfo);const s=n;return new Fe(this._firstTrailingBit(s.value),n.typeInfo)}Floor(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.floor(e)),n.typeInfo);const s=n;return new Fe(Math.floor(s.value),n.typeInfo)}Fma(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ue&&s instanceof Ue&&r instanceof Ue)return n.data.length!==s.data.length||n.data.length!==r.data.length?(console.error(`Fma() expects vectors of the same length. Line ${e.line}`),null):new Ue(n.data.map((e,t)=>e*s.data[t]+r.data[t]),n.typeInfo);const a=n,i=s,o=r;return new Fe(a.value*i.value+o.value,a.typeInfo)}Fract(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>e-Math.floor(e)),n.typeInfo);const s=n;return new Fe(s.value-Math.floor(s.value),n.typeInfo)}Frexp(e,t){return console.error(`TODO: frexp. Line ${e.line}`),null}InsertBits(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t),a=this.exec.evalExpression(e.args[3],t);if('u32'!==r.typeInfo.name&&'x32'!==r.typeInfo.name)return console.error(`InsertBits() expects an i32 offset argument. Line ${e.line}`),null;const i=r.value,o=(1<<a.value)-1<<i,l=~o;if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>e&l|s.data[t]<<i&o),n.typeInfo);const c=n.value,u=s.value;return new Fe(c&l|u<<i&o,n.typeInfo)}InverseSqrt(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>1/Math.sqrt(e)),n.typeInfo);const s=n;return new Fe(1/Math.sqrt(s.value),n.typeInfo)}Ldexp(e,t){return console.error(`TODO: ldexp. Line ${e.line}`),null}Length(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue){let e=0;return n.data.forEach(t=>{e+=t*t;}),new Fe(Math.sqrt(e),this.getTypeInfo('f32'))}const s=n;return new Fe(Math.abs(s.value),n.typeInfo)}Log(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.log(e)),n.typeInfo);const s=n;return new Fe(Math.log(s.value),n.typeInfo)}Log2(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.log2(e)),n.typeInfo);const s=n;return new Fe(Math.log2(s.value),n.typeInfo)}Max(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>Math.max(e,s.data[t])),n.typeInfo);const r=n,a=s;return new Fe(Math.max(r.value,a.value),n.typeInfo)}Min(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>Math.min(e,s.data[t])),n.typeInfo);const r=n,a=s;return new Fe(Math.min(r.value,a.value),n.typeInfo)}Mix(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ue&&s instanceof Ue&&r instanceof Ue)return new Ue(n.data.map((e,t)=>n.data[t]*(1-r.data[t])+s.data[t]*r.data[t]),n.typeInfo);const a=s,i=r;return new Fe(n.value*(1-i.value)+a.value*i.value,n.typeInfo)}Modf(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>e%s.data[t]),n.typeInfo);const r=s;return new Fe(n.value%r.value,n.typeInfo)}Normalize(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue){const s=this.Length(e,t).value;return new Ue(n.data.map(e=>e/s),n.typeInfo)}return console.error(`Normalize() expects a vector argument. Line ${e.line}`),null}Pow(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue)return new Ue(n.data.map((e,t)=>Math.pow(e,s.data[t])),n.typeInfo);const r=n,a=s;return new Fe(Math.pow(r.value,a.value),n.typeInfo)}QuantizeToF16(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>e),n.typeInfo);return new Fe(n.value,n.typeInfo)}Radians(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>e*Math.PI/180),n.typeInfo);return new Fe(n.value*Math.PI/180,this.getTypeInfo('f32'))}Reflect(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ue&&s instanceof Ue){const e=this._dot(n.data,s.data);return new Ue(n.data.map((t,n)=>t-2*e*s.data[n]),n.typeInfo)}return console.error(`Reflect() expects vector arguments. Line ${e.line}`),null}Refract(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ue&&s instanceof Ue&&r instanceof Fe){const e=this._dot(s.data,n.data);return new Ue(n.data.map((t,n)=>{const a=1-r.value*r.value*(1-e*e);if(a<0)return 0;const i=Math.sqrt(a);return r.value*t-(r.value*e+i)*s.data[n]}),n.typeInfo)}return console.error(`Refract() expects vector arguments and a scalar argument. Line ${e.line}`),null}ReverseBits(e,t){return console.error(`TODO: reverseBits. Line ${e.line}`),null}Round(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.round(e)),n.typeInfo);const s=n;return new Fe(Math.round(s.value),n.typeInfo)}Saturate(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.min(Math.max(e,0),1)),n.typeInfo);const s=n;return new Fe(Math.min(Math.max(s.value,0),1),n.typeInfo)}Sign(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.sign(e)),n.typeInfo);const s=n;return new Fe(Math.sign(s.value),n.typeInfo)}Sin(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.sin(e)),n.typeInfo);const s=n;return new Fe(Math.sin(s.value),n.typeInfo)}Sinh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.sinh(e)),n.typeInfo);const s=n;return new Fe(Math.sinh(s.value),n.typeInfo)}_smoothstep(e,t,n){const s=Math.min(Math.max((n-e)/(t-e),0),1);return s*s*(3-2*s)}SmoothStep(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(r instanceof Ue&&n instanceof Ue&&s instanceof Ue)return new Ue(r.data.map((e,t)=>this._smoothstep(n.data[t],s.data[t],e)),r.typeInfo);const a=n,i=s,o=r;return new Fe(this._smoothstep(a.value,i.value,o.value),r.typeInfo)}Sqrt(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.sqrt(e)),n.typeInfo);const s=n;return new Fe(Math.sqrt(s.value),n.typeInfo)}Step(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(s instanceof Ue&&n instanceof Ue)return new Ue(s.data.map((e,t)=>e<n.data[t]?0:1),s.typeInfo);const r=n;return new Fe(s.value<r.value?0:1,r.typeInfo)}Tan(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.tan(e)),n.typeInfo);const s=n;return new Fe(Math.tan(s.value),n.typeInfo)}Tanh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.tanh(e)),n.typeInfo);const s=n;return new Fe(Math.tanh(s.value),n.typeInfo)}_getTransposeType(e){const t=e.getTypeName();return 'mat2x2f'===t||'mat2x2h'===t?e:'mat2x3f'===t?this.getTypeInfo('mat3x2f'):'mat2x3h'===t?this.getTypeInfo('mat3x2h'):'mat2x4f'===t?this.getTypeInfo('mat4x2f'):'mat2x4h'===t?this.getTypeInfo('mat4x2h'):'mat3x2f'===t?this.getTypeInfo('mat2x3f'):'mat3x2h'===t?this.getTypeInfo('mat2x3h'):'mat3x3f'===t||'mat3x3h'===t?e:'mat3x4f'===t?this.getTypeInfo('mat4x3f'):'mat3x4h'===t?this.getTypeInfo('mat4x3h'):'mat4x2f'===t?this.getTypeInfo('mat2x4f'):'mat4x2h'===t?this.getTypeInfo('mat2x4h'):'mat4x3f'===t?this.getTypeInfo('mat3x4f'):'mat4x3h'===t?this.getTypeInfo('mat3x4h'):('mat4x4f'===t||'mat4x4h'===t||console.error(`Invalid matrix type ${t}`),e)}Transpose(e,t){const n=this.exec.evalExpression(e.args[0],t);if(!(n instanceof Pe))return console.error(`Transpose() expects a matrix argument. Line ${e.line}`),null;const s=this._getTransposeType(n.typeInfo);if('mat2x2'===n.typeInfo.name||'mat2x2f'===n.typeInfo.name||'mat2x2h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[2],e[1],e[3]],s)}if('mat2x3'===n.typeInfo.name||'mat2x3f'===n.typeInfo.name||'mat2x3h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[3],e[6],e[1],e[4],e[7]],s)}if('mat2x4'===n.typeInfo.name||'mat2x4f'===n.typeInfo.name||'mat2x4h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13]],s)}if('mat3x2'===n.typeInfo.name||'mat3x2f'===n.typeInfo.name||'mat3x2h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[3],e[1],e[4],e[2],e[5]],s)}if('mat3x3'===n.typeInfo.name||'mat3x3f'===n.typeInfo.name||'mat3x3h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[3],e[6],e[1],e[4],e[7],e[2],e[5],e[8]],s)}if('mat3x4'===n.typeInfo.name||'mat3x4f'===n.typeInfo.name||'mat3x4h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14]],s)}if('mat4x2'===n.typeInfo.name||'mat4x2f'===n.typeInfo.name||'mat4x2h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[4],e[1],e[5],e[2],e[6]],s)}if('mat4x3'===n.typeInfo.name||'mat4x3f'===n.typeInfo.name||'mat4x3h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]],s)}if('mat4x4'===n.typeInfo.name||'mat4x4f'===n.typeInfo.name||'mat4x4h'===n.typeInfo.name){const e=n.data;return new Pe([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14],e[3],e[7],e[11],e[15]],s)}return console.error(`Invalid matrix type ${n.typeInfo.name}`),null}Trunc(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ue)return new Ue(n.data.map(e=>Math.trunc(e)),n.typeInfo);const s=n;return new Fe(Math.trunc(s.value),n.typeInfo)}Dpdx(e,t){return console.error(`TODO: dpdx. Line ${e.line}`),null}DpdxCoarse(e,t){return console.error(`TODO: dpdxCoarse. Line ${e.line}`),null}DpdxFine(e,t){return console.error('TODO: dpdxFine'),null}Dpdy(e,t){return console.error('TODO: dpdy'),null}DpdyCoarse(e,t){return console.error('TODO: dpdyCoarse'),null}DpdyFine(e,t){return console.error('TODO: dpdyFine'),null}Fwidth(e,t){return console.error('TODO: fwidth'),null}FwidthCoarse(e,t){return console.error('TODO: fwidthCoarse'),null}FwidthFine(e,t){return console.error('TODO: fwidthFine'),null}TextureDimensions(e,t){const n=e.args[0],s=e.args.length>1?this.exec.evalExpression(e.args[1],t).value:0;if(n instanceof _e){const r=n.name,a=t.getVariableValue(r);if(a instanceof qe){if(s<0||s>=a.mipLevelCount)return console.error(`Invalid mip level for textureDimensions. Line ${e.line}`),null;const t=a.getMipLevelSize(s),n=a.dimension;return '1d'===n?new Fe(t[0],this.getTypeInfo('u32')):'3d'===n?new Ue(t,this.getTypeInfo('vec3u')):'2d'===n?new Ue(t.slice(0,2),this.getTypeInfo('vec2u')):(console.error(`Invalid texture dimension ${n} not found. Line ${e.line}`),null)}return console.error(`Texture ${r} not found. Line ${e.line}`),null}return console.error(`Invalid texture argument for textureDimensions. Line ${e.line}`),null}TextureGather(e,t){return console.error('TODO: textureGather'),null}TextureGatherCompare(e,t){return console.error('TODO: textureGatherCompare'),null}TextureLoad(e,t){const n=e.args[0],s=this.exec.evalExpression(e.args[1],t);if(!(s instanceof Ue)||2!==s.data.length)return console.error(`Invalid UV argument for textureLoad. Line ${e.line}`),null;if(n instanceof _e){const r=n.name,a=t.getVariableValue(r);if(a instanceof qe){let n=0,i=0;['texture_storage_2d_array','texture_2d_array','texture_depth_2d_array'].indexOf(a.typeInfo.name)>-1&&(n=this.exec.evalExpression(e.args[2],t).value),['texture_1d','texture_2d','texture_depth_2d','texture_3d'].indexOf(a.typeInfo.name)>-1&&(i=this.exec.evalExpression(e.args[2],t).value),['texture_2d_array','texture_depth_2d_array'].indexOf(a.typeInfo.name)>-1&&(i=this.exec.evalExpression(e.args[3],t).value);const o=Math.floor(s.data[0]),l=Math.floor(s.data[1]),c=Math.floor(n),u=Math.floor(i);if(o<0||o>=a.width||l<0||l>=a.height)return console.error(`Texture ${r} out of bounds. Line ${e.line}`),null;const h=a.getPixel(o,l,c,u);return null===h?(console.error(`Invalid texture format for textureLoad. Line ${e.line}`),null):new Ue(h,this.getTypeInfo('vec4f'))}return console.error(`Texture ${r} not found. Line ${e.line}`),null}return console.error(`Invalid texture argument for textureLoad. Line ${e.line}`),null}TextureNumLayers(e,t){const n=e.args[0];if(n instanceof _e){const s=n.name,r=t.getVariableValue(s);return r instanceof qe?new Fe(r.depthOrArrayLayers,this.getTypeInfo('u32')):(console.error(`Texture ${s} not found. Line ${e.line}`),null)}return console.error(`Invalid texture argument for textureNumLayers. Line ${e.line}`),null}TextureNumLevels(e,t){const n=e.args[0];if(n instanceof _e){const s=n.name,r=t.getVariableValue(s);return r instanceof qe?new Fe(r.mipLevelCount,this.getTypeInfo('u32')):(console.error(`Texture ${s} not found. Line ${e.line}`),null)}return console.error(`Invalid texture argument for textureNumLevels. Line ${e.line}`),null}TextureNumSamples(e,t){const n=e.args[0];if(n instanceof _e){const s=n.name,r=t.getVariableValue(s);return r instanceof qe?new Fe(r.sampleCount,this.getTypeInfo('u32')):(console.error(`Texture ${s} not found. Line ${e.line}`),null)}return console.error(`Invalid texture argument for textureNumSamples. Line ${e.line}`),null}TextureSample(e,t){return console.error('TODO: textureSample'),null}TextureSampleBias(e,t){return console.error('TODO: textureSampleBias'),null}TextureSampleCompare(e,t){return console.error('TODO: textureSampleCompare'),null}TextureSampleCompareLevel(e,t){return console.error('TODO: textureSampleCompareLevel'),null}TextureSampleGrad(e,t){return console.error('TODO: textureSampleGrad'),null}TextureSampleLevel(e,t){return console.error('TODO: textureSampleLevel'),null}TextureSampleBaseClampToEdge(e,t){return console.error('TODO: textureSampleBaseClampToEdge'),null}TextureStore(e,t){const n=e.args[0],s=this.exec.evalExpression(e.args[1],t),r=4===e.args.length?this.exec.evalExpression(e.args[2],t).value:0,a=4===e.args.length?this.exec.evalExpression(e.args[3],t).data:this.exec.evalExpression(e.args[2],t).data;if(4!==a.length)return console.error(`Invalid value argument for textureStore. Line ${e.line}`),null;if(!(s instanceof Ue)||2!==s.data.length)return console.error(`Invalid UV argument for textureStore. Line ${e.line}`),null;if(n instanceof _e){const i=n.name,o=t.getVariableValue(i);if(o instanceof qe){const t=o.getMipLevelSize(0),n=Math.floor(s.data[0]),l=Math.floor(s.data[1]);return n<0||n>=t[0]||l<0||l>=t[1]?(console.error(`Texture ${i} out of bounds. Line ${e.line}`),null):(o.setPixel(n,l,0,r,Array.from(a)),null)}return console.error(`Texture ${i} not found. Line ${e.line}`),null}return console.error(`Invalid texture argument for textureStore. Line ${e.line}`),null}AtomicLoad(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t);return t.getVariable(s).value.getSubData(this.exec,n.postfix,t)}AtomicStore(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t);return o instanceof Fe&&i instanceof Fe&&(o.value=i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),null}AtomicAdd(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value+=i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicSub(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value-=i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicMax(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=Math.max(o.value,i.value)),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicMin(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=Math.min(o.value,i.value)),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicAnd(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=o.value&i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicOr(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=o.value|i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicXor(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=o.value^i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicExchange(e,t){let n=e.args[0];n instanceof ke&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getSubData(this.exec,n.postfix,t),l=new Fe(o.value,o.typeInfo);return o instanceof Fe&&i instanceof Fe&&(o.value=i.value),r.value instanceof We&&r.value.setDataValue(this.exec,o,n.postfix,t),l}AtomicCompareExchangeWeak(e,t){return console.error('TODO: atomicCompareExchangeWeak'),null}Pack4x8snorm(e,t){return console.error('TODO: pack4x8snorm'),null}Pack4x8unorm(e,t){return console.error('TODO: pack4x8unorm'),null}Pack4xI8(e,t){return console.error('TODO: pack4xI8'),null}Pack4xU8(e,t){return console.error('TODO: pack4xU8'),null}Pack4x8Clamp(e,t){return console.error('TODO: pack4x8Clamp'),null}Pack4xU8Clamp(e,t){return console.error('TODO: pack4xU8Clamp'),null}Pack2x16snorm(e,t){return console.error('TODO: pack2x16snorm'),null}Pack2x16unorm(e,t){return console.error('TODO: pack2x16unorm'),null}Pack2x16float(e,t){return console.error('TODO: pack2x16float'),null}Unpack4x8snorm(e,t){return console.error('TODO: unpack4x8snorm'),null}Unpack4x8unorm(e,t){return console.error('TODO: unpack4x8unorm'),null}Unpack4xI8(e,t){return console.error('TODO: unpack4xI8'),null}Unpack4xU8(e,t){return console.error('TODO: unpack4xU8'),null}Unpack2x16snorm(e,t){return console.error('TODO: unpack2x16snorm'),null}Unpack2x16unorm(e,t){return console.error('TODO: unpack2x16unorm'),null}Unpack2x16float(e,t){return console.error('TODO: unpack2x16float'),null}StorageBarrier(e,t){return null}TextureBarrier(e,t){return null}WorkgroupBarrier(e,t){return null}WorkgroupUniformLoad(e,t){return null}SubgroupAdd(e,t){return console.error('TODO: subgroupAdd'),null}SubgroupExclusiveAdd(e,t){return console.error('TODO: subgroupExclusiveAdd'),null}SubgroupInclusiveAdd(e,t){return console.error('TODO: subgroupInclusiveAdd'),null}SubgroupAll(e,t){return console.error('TODO: subgroupAll'),null}SubgroupAnd(e,t){return console.error('TODO: subgroupAnd'),null}SubgroupAny(e,t){return console.error('TODO: subgroupAny'),null}SubgroupBallot(e,t){return console.error('TODO: subgroupBallot'),null}SubgroupBroadcast(e,t){return console.error('TODO: subgroupBroadcast'),null}SubgroupBroadcastFirst(e,t){return console.error('TODO: subgroupBroadcastFirst'),null}SubgroupElect(e,t){return console.error('TODO: subgroupElect'),null}SubgroupMax(e,t){return console.error('TODO: subgroupMax'),null}SubgroupMin(e,t){return console.error('TODO: subgroupMin'),null}SubgroupMul(e,t){return console.error('TODO: subgroupMul'),null}SubgroupExclusiveMul(e,t){return console.error('TODO: subgroupExclusiveMul'),null}SubgroupInclusiveMul(e,t){return console.error('TODO: subgroupInclusiveMul'),null}SubgroupOr(e,t){return console.error('TODO: subgroupOr'),null}SubgroupShuffle(e,t){return console.error('TODO: subgroupShuffle'),null}SubgroupShuffleDown(e,t){return console.error('TODO: subgroupShuffleDown'),null}SubgroupShuffleUp(e,t){return console.error('TODO: subgroupShuffleUp'),null}SubgroupShuffleXor(e,t){return console.error('TODO: subgroupShuffleXor'),null}SubgroupXor(e,t){return console.error('TODO: subgroupXor'),null}QuadBroadcast(e,t){return console.error('TODO: quadBroadcast'),null}QuadSwapDiagonal(e,t){return console.error('TODO: quadSwapDiagonal'),null}QuadSwapX(e,t){return console.error('TODO: quadSwapX'),null}QuadSwapY(e,t){return console.error('TODO: quadSwapY'),null}}const pt={vec2:2,vec2f:2,vec2i:2,vec2u:2,vec2b:2,vec2h:2,vec3:3,vec3f:3,vec3i:3,vec3u:3,vec3b:3,vec3h:3,vec4:4,vec4f:4,vec4i:4,vec4u:4,vec4b:4,vec4h:4},dt={mat2x2:[2,2,4],mat2x2f:[2,2,4],mat2x2h:[2,2,4],mat2x3:[2,3,6],mat2x3f:[2,3,6],mat2x3h:[2,3,6],mat2x4:[2,4,8],mat2x4f:[2,4,8],mat2x4h:[2,4,8],mat3x2:[3,2,6],mat3x2f:[3,2,6],mat3x2h:[3,2,6],mat3x3:[3,3,9],mat3x3f:[3,3,9],mat3x3h:[3,3,9],mat3x4:[3,4,12],mat3x4f:[3,4,12],mat3x4h:[3,4,12],mat4x2:[4,2,8],mat4x2f:[4,2,8],mat4x2h:[4,2,8],mat4x3:[4,3,12],mat4x3f:[4,3,12],mat4x3h:[4,3,12],mat4x4:[4,4,16],mat4x4f:[4,4,16],mat4x4h:[4,4,16]};class mt extends ht{constructor(e,t){var n;super(),this.ast=null!=e?e:[],this.reflection=new it,this.reflection.updateAST(this.ast),this.context=null!==(n=null==t?void 0:t.clone())&&void 0!==n?n:new ut,this.builtins=new ft(this),this.typeInfo={bool:this.getTypeInfo(ae.bool),i32:this.getTypeInfo(ae.i32),u32:this.getTypeInfo(ae.u32),f32:this.getTypeInfo(ae.f32),f16:this.getTypeInfo(ae.f16),vec2f:this.getTypeInfo(le.vec2f),vec2u:this.getTypeInfo(le.vec2u),vec2i:this.getTypeInfo(le.vec2i),vec2h:this.getTypeInfo(le.vec2h),vec3f:this.getTypeInfo(le.vec3f),vec3u:this.getTypeInfo(le.vec3u),vec3i:this.getTypeInfo(le.vec3i),vec3h:this.getTypeInfo(le.vec3h),vec4f:this.getTypeInfo(le.vec4f),vec4u:this.getTypeInfo(le.vec4u),vec4i:this.getTypeInfo(le.vec4i),vec4h:this.getTypeInfo(le.vec4h),mat2x2f:this.getTypeInfo(le.mat2x2f),mat2x3f:this.getTypeInfo(le.mat2x3f),mat2x4f:this.getTypeInfo(le.mat2x4f),mat3x2f:this.getTypeInfo(le.mat3x2f),mat3x3f:this.getTypeInfo(le.mat3x3f),mat3x4f:this.getTypeInfo(le.mat3x4f),mat4x2f:this.getTypeInfo(le.mat4x2f),mat4x3f:this.getTypeInfo(le.mat4x3f),mat4x4f:this.getTypeInfo(le.mat4x4f)};}getVariableValue(e){var t,n;const r=null!==(n=null===(t=this.context.getVariable(e))||void 0===t?void 0:t.value)&&void 0!==n?n:null;if(null===r)return null;if(r instanceof Fe)return r.value;if(r instanceof Ue)return Array.from(r.data);if(r instanceof Pe)return Array.from(r.data);if(r instanceof We&&r.typeInfo instanceof s){if('u32'===r.typeInfo.format.name)return Array.from(new Uint32Array(r.buffer,r.offset,r.typeInfo.count));if('i32'===r.typeInfo.format.name)return Array.from(new Int32Array(r.buffer,r.offset,r.typeInfo.count));if('f32'===r.typeInfo.format.name)return Array.from(new Float32Array(r.buffer,r.offset,r.typeInfo.count))}return console.error(`Unsupported return variable type ${r.typeInfo.name}`),null}execute(e){(e=null!=e?e:{}).constants&&this._setOverrides(e.constants,this.context),this._execStatements(this.ast,this.context);}dispatchWorkgroups(e,t,n,s){const r=this.context.clone();(s=null!=s?s:{}).constants&&this._setOverrides(s.constants,r),this._execStatements(this.ast,r);const a=r.getFunction(e);if(!a)return void console.error(`Function ${e} not found`);if('number'==typeof t)t=[t,1,1];else {if(0===t.length)return void console.error('Invalid dispatch count');1===t.length?t=[t[0],1,1]:2===t.length?t=[t[0],t[1],1]:t.length>3&&(t=[t[0],t[1],t[2]]);}const i=t[0],o=t[1],l=t[2],c=this.getTypeInfo('vec3u');r.setVariable('@num_workgroups',new Ue(t,c));const u=this.reflection.getFunctionInfo(e);null===u&&console.error(`Function ${e} not found in reflection data`);for(const e in n)for(const t in n[e]){const s=n[e][t];r.variables.forEach(n=>{var r;const a=n.node;if(null==a?void 0:a.attributes){let i=null,o=null;for(const e of a.attributes)'binding'===e.name?i=e.value:'group'===e.name&&(o=e.value);if(t===i&&e===o){let i=false;for(const s of u.resources)if(s.name===n.name&&s.group===parseInt(e)&&s.binding===parseInt(t)){i=true;break}if(i)if(void 0!==s.texture&&void 0!==s.descriptor){const e=new qe(s.texture,this.getTypeInfo(a.type),s.descriptor,null!==(r=s.texture.view)&&void 0!==r?r:null);n.value=e;}else void 0!==s.uniform?n.value=new We(s.uniform,this.getTypeInfo(a.type)):n.value=new We(s,this.getTypeInfo(a.type));}}});}for(let e=0;e<l;++e)for(let t=0;t<o;++t)for(let n=0;n<i;++n)r.setVariable('@workgroup_id',new Ue([n,t,e],this.getTypeInfo('vec3u'))),this._dispatchWorkgroup(a,[n,t,e],r);}execStatement(e,t){if(e instanceof Y)return this.evalExpression(e.value,t);if(e instanceof se){if(e.condition){const n=this.evalExpression(e.condition,t);if(!(n instanceof Fe))throw new Error('Invalid break-if condition');if(!n.value)return null}return mt._breakObj}if(e instanceof re)return mt._continueObj;if(e instanceof U)this._let(e,t);else if(e instanceof F)this._var(e,t);else if(e instanceof P)this._const(e,t);else if(e instanceof M)this._override(e,t);else if(e instanceof D)this._function(e,t);else {if(e instanceof Q)return this._if(e,t);if(e instanceof Z)return this._switch(e,t);if(e instanceof B)return this._for(e,t);if(e instanceof V)return this._while(e,t);if(e instanceof j)return this._loop(e,t);if(e instanceof O){const n=t.clone();return n.currentFunctionName=t.currentFunctionName,this._execStatements(e.body,n)}if(e instanceof G)this._assign(e,t);else if(e instanceof R)this._increment(e,t);else {if(e instanceof oe)return null;if(e instanceof X)this._call(e,t);else {if(e instanceof ee)return null;if(e instanceof te)return null;console.error('Invalid statement type.',e,`Line ${e.line}`);}}}return null}evalExpression(e,t){return e instanceof Ie?this._evalBinaryOp(e,t):e instanceof xe?this._evalLiteral(e,t):e instanceof _e?this._evalVariable(e,t):e instanceof me?this._evalCall(e,t):e instanceof de?this._evalCreate(e,t):e instanceof ge?this._evalConst(e,t):e instanceof ye?this._evalBitcast(e,t):e instanceof ke?this._evalUnaryOp(e,t):(console.error('Invalid expression type',e,`Line ${e.line}`),null)}getTypeInfo(e){var t;if(e instanceof ae){const t=this.reflection.getTypeInfo(e);if(null!==t)return t}let n=null!==(t=this.typeInfo[e])&&void 0!==t?t:null;return null!==n||(n=this.reflection.getTypeInfoByName(e)),n}_setOverrides(e,t){for(const n in e){const s=e[n],r=this.reflection.getOverrideInfo(n);null!==r?(null===r.type&&(r.type=this.getTypeInfo('u32')),mt._numericScalarTypes.has(r.type.name)?t.setVariable(n,new Fe(s,r.type)):mt._vectorTypes.has(r.type.name)?t.setVariable(n,new Ue(s,r.type)):console.error(`Invalid constant type for ${n}`)):console.error(`Override ${n} does not exist in the shader.`);}}_dispatchWorkgroup(e,t,n){const s=[1,1,1];for(const t of e.node.attributes)if('workgroup_size'===t.name){if(t.value.length>0){const e=n.getVariableValue(t.value[0]);s[0]=e instanceof Fe?e.value:parseInt(t.value[0]);}if(t.value.length>1){const e=n.getVariableValue(t.value[1]);s[1]=e instanceof Fe?e.value:parseInt(t.value[1]);}if(t.value.length>2){const e=n.getVariableValue(t.value[2]);s[2]=e instanceof Fe?e.value:parseInt(t.value[2]);}}const r=this.getTypeInfo('vec3u'),a=this.getTypeInfo('u32');n.setVariable('@workgroup_size',new Ue(s,r));const i=s[0],o=s[1],l=s[2];for(let c=0,u=0;c<l;++c)for(let l=0;l<o;++l)for(let o=0;o<i;++o,++u){const i=[o,l,c],h=[o+t[0]*s[0],l+t[1]*s[1],c+t[2]*s[2]];n.setVariable('@local_invocation_id',new Ue(i,r)),n.setVariable('@global_invocation_id',new Ue(h,r)),n.setVariable('@local_invocation_index',new Fe(u,a)),this._dispatchExec(e,n);}}_dispatchExec(e,t){for(const n of e.node.args)for(const e of n.attributes)if('builtin'===e.name){const s=`@${e.value}`,r=t.getVariable(s);void 0!==r&&t.variables.set(n.name,r);}this._execStatements(e.node.body,t);}getVariableName(e,t){for(;e instanceof ke;)e=e.right;return e instanceof _e?e.name:(console.error('Unknown variable type',e,'Line',e.line),null)}_execStatements(e,t){for(const n of e){if(Array.isArray(n)){const e=t.clone(),s=this._execStatements(n,e);if(s)return s;continue}const e=this.execStatement(n,t);if(e)return e}return null}_call(e,t){const n=t.clone();n.currentFunctionName=e.name;const s=t.getFunction(e.name);if(s){for(let t=0;t<s.node.args.length;++t){const r=s.node.args[t],a=this.evalExpression(e.args[t],n);n.setVariable(r.name,a,r);}this._execStatements(s.node.body,n);}else if(e.isBuiltin)this._callBuiltinFunction(e,n);else {this.getTypeInfo(e.name)&&this._evalCreate(e,t);}}_increment(e,t){const n=this.getVariableName(e.variable,t),s=t.getVariable(n);s?'++'===e.operator?s.value instanceof Fe?s.value.value++:console.error(`Variable ${n} is not a scalar. Line ${e.line}`):'--'===e.operator?s.value instanceof Fe?s.value.value--:console.error(`Variable ${n} is not a scalar. Line ${e.line}`):console.error(`Unknown increment operator ${e.operator}. Line ${e.line}`):console.error(`Variable ${n} not found. Line ${e.line}`);}_getVariableData(e,t){if(e instanceof _e){const n=this.getVariableName(e,t),s=t.getVariable(n);return null===s?(console.error(`Variable ${n} not found. Line ${e.line}`),null):s.value.getSubData(this,e.postfix,t)}if(e instanceof ke){if('*'===e.operator){const n=this._getVariableData(e.right,t);return n instanceof Be?n.reference.getSubData(this,e.postfix,t):(console.error(`Variable ${e.right} is not a pointer. Line ${e.line}`),null)}if('&'===e.operator){const n=this._getVariableData(e.right,t);return new Be(n)}}return null}_assign(e,t){let n=null,s='<var>',r=null;if(e.variable instanceof ke){const n=this._getVariableData(e.variable,t),s=this.evalExpression(e.value,t),r=e.operator;if('='===r){if(n instanceof Fe||n instanceof Ue||n instanceof Pe){if(s instanceof Fe||s instanceof Ue||s instanceof Pe&&n.data.length===s.data.length)return void n.data.set(s.data);console.error(`Invalid assignment. Line ${e.line}`);}else if(n instanceof We&&s instanceof We&&n.buffer.byteLength-n.offset>=s.buffer.byteLength-s.offset)return void(n.buffer.byteLength%4==0?new Uint32Array(n.buffer,n.offset,n.typeInfo.size/4).set(new Uint32Array(s.buffer,s.offset,s.typeInfo.size/4)):new Uint8Array(n.buffer,n.offset,n.typeInfo.size).set(new Uint8Array(s.buffer,s.offset,s.typeInfo.size)));return console.error(`Invalid assignment. Line ${e.line}`),null}if('+='===r)return n instanceof Fe||n instanceof Ue||n instanceof Pe?s instanceof Fe||s instanceof Ue||s instanceof Pe?void n.data.set(s.data.map((e,t)=>n.data[t]+e)):void console.error(`Invalid assignment . Line ${e.line}`):void console.error(`Invalid assignment. Line ${e.line}`);if('-='===r)return (n instanceof Fe||n instanceof Ue||n instanceof Pe)&&(s instanceof Fe||s instanceof Ue||s instanceof Pe)?void n.data.set(s.data.map((e,t)=>n.data[t]-e)):void console.error(`Invalid assignment. Line ${e.line}`)}if(e.variable instanceof ke){if('*'===e.variable.operator){s=this.getVariableName(e.variable.right,t);const r=t.getVariable(s);if(!(r&&r.value instanceof Be))return void console.error(`Variable ${s} is not a pointer. Line ${e.line}`);n=r.value.reference;let a=e.variable.postfix;if(!a){let t=e.variable.right;for(;t instanceof ke;){if(t.postfix){a=t.postfix;break}t=t.right;}}a&&(n=n.getSubData(this,a,t));}}else {r=e.variable.postfix,s=this.getVariableName(e.variable,t);const a=t.getVariable(s);if(null===a)return void console.error(`Variable ${s} not found. Line ${e.line}`);n=a.value;}if(n instanceof Be&&(n=n.reference),null===n)return void console.error(`Variable ${s} not found. Line ${e.line}`);const a=this.evalExpression(e.value,t),i=e.operator;if('='!==i){const s=n.getSubData(this,r,t);if(s instanceof Ue&&a instanceof Fe){const t=s.data,n=a.value;if('+='===i)for(let e=0;e<t.length;++e)t[e]+=n;else if('-='===i)for(let e=0;e<t.length;++e)t[e]-=n;else if('*='===i)for(let e=0;e<t.length;++e)t[e]*=n;else if('/='===i)for(let e=0;e<t.length;++e)t[e]/=n;else if('%='===i)for(let e=0;e<t.length;++e)t[e]%=n;else if('&='===i)for(let e=0;e<t.length;++e)t[e]&=n;else if('|='===i)for(let e=0;e<t.length;++e)t[e]|=n;else if('^='===i)for(let e=0;e<t.length;++e)t[e]^=n;else if('<<='===i)for(let e=0;e<t.length;++e)t[e]<<=n;else if('>>='===i)for(let e=0;e<t.length;++e)t[e]>>=n;else console.error(`Invalid operator ${i}. Line ${e.line}`);}else if(s instanceof Ue&&a instanceof Ue){const t=s.data,n=a.data;if(t.length!==n.length)return void console.error(`Vector length mismatch. Line ${e.line}`);if('+='===i)for(let e=0;e<t.length;++e)t[e]+=n[e];else if('-='===i)for(let e=0;e<t.length;++e)t[e]-=n[e];else if('*='===i)for(let e=0;e<t.length;++e)t[e]*=n[e];else if('/='===i)for(let e=0;e<t.length;++e)t[e]/=n[e];else if('%='===i)for(let e=0;e<t.length;++e)t[e]%=n[e];else if('&='===i)for(let e=0;e<t.length;++e)t[e]&=n[e];else if('|='===i)for(let e=0;e<t.length;++e)t[e]|=n[e];else if('^='===i)for(let e=0;e<t.length;++e)t[e]^=n[e];else if('<<='===i)for(let e=0;e<t.length;++e)t[e]<<=n[e];else if('>>='===i)for(let e=0;e<t.length;++e)t[e]>>=n[e];else console.error(`Invalid operator ${i}. Line ${e.line}`);}else {if(!(s instanceof Fe&&a instanceof Fe))return void console.error(`Invalid type for ${e.operator} operator. Line ${e.line}`);'+='===i?s.value+=a.value:'-='===i?s.value-=a.value:'*='===i?s.value*=a.value:'/='===i?s.value/=a.value:'%='===i?s.value%=a.value:'&='===i?s.value&=a.value:'|='===i?s.value|=a.value:'^='===i?s.value^=a.value:'<<='===i?s.value<<=a.value:'>>='===i?s.value>>=a.value:console.error(`Invalid operator ${i}. Line ${e.line}`);}return void(n instanceof We&&n.setDataValue(this,s,r,t))}if(n instanceof We)n.setDataValue(this,a,r,t);else if(r){if(!(n instanceof Ue||n instanceof Pe))return void console.error(`Variable ${s} is not a vector or matrix. Line ${e.line}`);if(r instanceof ve){const i=this.evalExpression(r.index,t).value;if(n instanceof Ue){if(!(a instanceof Fe))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[i]=a.value;}else {if(!(n instanceof Pe))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);{const i=this.evalExpression(r.index,t).value;if(i<0)return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);if(!(a instanceof Ue))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);{const t=n.typeInfo.getTypeName();if('mat2x2'===t||'mat2x2f'===t||'mat2x2h'===t){if(!(i<2&&2===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[2*i]=a.data[0],n.data[2*i+1]=a.data[1];}else if('mat2x3'===t||'mat2x3f'===t||'mat2x3h'===t){if(!(i<2&&3===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[3*i]=a.data[0],n.data[3*i+1]=a.data[1],n.data[3*i+2]=a.data[2];}else if('mat2x4'===t||'mat2x4f'===t||'mat2x4h'===t){if(!(i<2&&4===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[4*i]=a.data[0],n.data[4*i+1]=a.data[1],n.data[4*i+2]=a.data[2],n.data[4*i+3]=a.data[3];}else if('mat3x2'===t||'mat3x2f'===t||'mat3x2h'===t){if(!(i<3&&2===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[2*i]=a.data[0],n.data[2*i+1]=a.data[1];}else if('mat3x3'===t||'mat3x3f'===t||'mat3x3h'===t){if(!(i<3&&3===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[3*i]=a.data[0],n.data[3*i+1]=a.data[1],n.data[3*i+2]=a.data[2];}else if('mat3x4'===t||'mat3x4f'===t||'mat3x4h'===t){if(!(i<3&&4===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[4*i]=a.data[0],n.data[4*i+1]=a.data[1],n.data[4*i+2]=a.data[2],n.data[4*i+3]=a.data[3];}else if('mat4x2'===t||'mat4x2f'===t||'mat4x2h'===t){if(!(i<4&&2===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[2*i]=a.data[0],n.data[2*i+1]=a.data[1];}else if('mat4x3'===t||'mat4x3f'===t||'mat4x3h'===t){if(!(i<4&&3===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[3*i]=a.data[0],n.data[3*i+1]=a.data[1],n.data[3*i+2]=a.data[2];}else {if('mat4x4'!==t&&'mat4x4f'!==t&&'mat4x4h'!==t)return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);if(!(i<4&&4===a.data.length))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);n.data[4*i]=a.data[0],n.data[4*i+1]=a.data[1],n.data[4*i+2]=a.data[2],n.data[4*i+3]=a.data[3];}}}}}else if(r instanceof pe){const t=r.value;if(!(n instanceof Ue))return void console.error(`Invalid assignment to ${t}. Variable ${s} is not a vector. Line ${e.line}`);if(a instanceof Fe){if(t.length>1)return void console.error(`Invalid assignment to ${t} for variable ${s}. Line ${e.line}`);if('x'===t)n.data[0]=a.value;else if('y'===t){if(n.data.length<2)return void console.error(`Invalid assignment to ${t} for variable ${s}. Line ${e.line}`);n.data[1]=a.value;}else if('z'===t){if(n.data.length<3)return void console.error(`Invalid assignment to ${t} for variable ${s}. Line ${e.line}`);n.data[2]=a.value;}else if('w'===t){if(n.data.length<4)return void console.error(`Invalid assignment to ${t} for variable ${s}. Line ${e.line}`);n.data[3]=a.value;}}else {if(!(a instanceof Ue))return void console.error(`Invalid assignment to ${s}. Line ${e.line}`);if(t.length!==a.data.length)return void console.error(`Invalid assignment to ${t} for variable ${s}. Line ${e.line}`);for(let r=0;r<t.length;++r){const i=t[r];if('x'===i||'r'===i)n.data[0]=a.data[r];else if('y'===i||'g'===i){if(a.data.length<2)return void console.error(`Invalid assignment to ${i} for variable ${s}. Line ${e.line}`);n.data[1]=a.data[r];}else if('z'===i||'b'===i){if(a.data.length<3)return void console.error(`Invalid assignment to ${i} for variable ${s}. Line ${e.line}`);n.data[2]=a.data[r];}else {if('w'!==i&&'a'!==i)return void console.error(`Invalid assignment to ${i} for variable ${s}. Line ${e.line}`);if(a.data.length<4)return void console.error(`Invalid assignment to ${i} for variable ${s}. Line ${e.line}`);n.data[3]=a.data[r];}}}}}else n instanceof Fe&&a instanceof Fe?n.value=a.value:n instanceof Ue&&a instanceof Ue||n instanceof Pe&&a instanceof Pe?n.data.set(a.data):console.error(`Invalid assignment to ${s}. Line ${e.line}`);}_function(e,t){const n=new ct(e);t.functions.set(e.name,n);}_const(e,t){let n=null;null!==e.value&&(n=this.evalExpression(e.value,t)),t.createVariable(e.name,n,e);}_override(e,t){const n=t.getVariable(e.name);if(null===n||null===n.value){let n=null;null!==e.value&&(n=this.evalExpression(e.value,t)),t.createVariable(e.name,n,e);}}_let(e,t){let n=null;if(null!==e.value){if(n=this.evalExpression(e.value,t),null===n)return void console.error(`Invalid value for variable ${e.name}. Line ${e.line}`);e.value instanceof ke||(n=n.clone());}else {const s=e.type.name;if(mt._defaultableTypes.has(s)){const s=new de(e.type,[]);n=this._evalCreate(s,t);}}t.createVariable(e.name,n,e);}_var(e,t){let n=null;if(null!==e.value){if(n=this.evalExpression(e.value,t),null===n)return void console.error(`Invalid value for variable ${e.name}. Line ${e.line}`);e.value instanceof ke||(n=n.clone());}else {if(null===e.type)return void console.error(`Variable ${e.name} has no type. Line ${e.line}`);const s=e.type.name;if(mt._defaultableTypes.has(s)||e.type instanceof ue||e.type instanceof oe||e.type instanceof le){const s=new de(e.type,[]);n=this._evalCreate(s,t);}}t.createVariable(e.name,n,e);}_switch(e,t){t=t.clone();const n=this.evalExpression(e.condition,t);if(!(n instanceof Fe))return console.error(`Invalid if condition. Line ${e.line}`),null;let s=null;for(const r of e.cases)if(r instanceof Ae)for(const a of r.selectors){if(a instanceof Se){s=r;continue}const i=this.evalExpression(a,t);if(!(i instanceof Fe))return console.error(`Invalid case selector. Line ${e.line}`),null;if(i.value===n.value)return this._execStatements(r.body,t)}else r instanceof Ee&&(s=r);return s?this._execStatements(s.body,t):null}_if(e,t){t=t.clone();const n=this.evalExpression(e.condition,t);if(!(n instanceof Fe))return console.error(`Invalid if condition. Line ${e.line}`),null;if(n.value)return this._execStatements(e.body,t);for(const n of e.elseif){const s=this.evalExpression(n.condition,t);if(!(s instanceof Fe))return console.error(`Invalid if condition. Line ${e.line}`),null;if(s.value)return this._execStatements(n.body,t)}return e.else?this._execStatements(e.else,t):null}_getScalarValue(e){return e instanceof Fe?e.value:(console.error('Expected scalar value.',e),0)}_for(e,t){for(t=t.clone(),this.execStatement(e.init,t);this._getScalarValue(this.evalExpression(e.condition,t));){const n=this._execStatements(e.body,t);if(n===mt._breakObj)break;if(null!==n&&n!==mt._continueObj)return n;this.execStatement(e.increment,t);}return null}_loop(e,t){for(t=t.clone();;){const n=this._execStatements(e.body,t);if(n===mt._breakObj)break;if(n===mt._continueObj){if(e.continuing){if(this._execStatements(e.continuing.body,t)===mt._breakObj)break}}else if(null!==n)return n}return null}_while(e,t){for(t=t.clone();this._getScalarValue(this.evalExpression(e.condition,t));){const n=this._execStatements(e.body,t);if(n===mt._breakObj)break;if(n!==mt._continueObj&&null!==n)return n}return null}_evalBitcast(e,t){const n=this.evalExpression(e.value,t),s=e.type;if(n instanceof Fe){const e=st(n.value,n.typeInfo.name,s.name);return new Fe(e,this.getTypeInfo(s))}if(n instanceof Ue){const t=n.typeInfo.getTypeName();let r='';if(t.endsWith('f'))r='f32';else if(t.endsWith('i'))r='i32';else if(t.endsWith('u'))r='u32';else if(t.endsWith('b'))r='bool';else {if(!t.endsWith('h'))return console.error(`Unknown vector type ${t}. Line ${e.line}`),null;r='f16';}const a=s.getTypeName();let i='';if(a.endsWith('f'))i='f32';else if(a.endsWith('i'))i='i32';else if(a.endsWith('u'))i='u32';else if(a.endsWith('b'))i='bool';else {if(!a.endsWith('h'))return console.error(`Unknown vector type ${i}. Line ${e.line}`),null;i='f16';}const o=function(e,t,n){if(t===n)return e;const s=new Array(e.length);for(let r=0;r<e.length;r++)s[r]=st(e[r],t,n);return s}(Array.from(n.data),r,i);return new Ue(o,this.getTypeInfo(s))}return console.error(`TODO: bitcast for ${n.typeInfo.name}. Line ${e.line}`),null}_evalConst(e,t){return t.getVariableValue(e.name).clone().getSubData(this,e.postfix,t)}_evalCreate(e,t){var r;if(e instanceof de){if(null===e.type)return Oe.void;switch(e.type.getTypeName()){case 'bool':case 'i32':case 'u32':case 'f32':case 'f16':return this._callConstructorValue(e,t);case 'vec2':case 'vec3':case 'vec4':case 'vec2f':case 'vec3f':case 'vec4f':case 'vec2h':case 'vec3h':case 'vec4h':case 'vec2i':case 'vec3i':case 'vec4i':case 'vec2u':case 'vec3u':case 'vec4u':case 'vec2b':case 'vec3b':case 'vec4b':return this._callConstructorVec(e,t);case 'mat2x2':case 'mat2x2f':case 'mat2x2h':case 'mat2x3':case 'mat2x3f':case 'mat2x3h':case 'mat2x4':case 'mat2x4f':case 'mat2x4h':case 'mat3x2':case 'mat3x2f':case 'mat3x2h':case 'mat3x3':case 'mat3x3f':case 'mat3x3h':case 'mat3x4':case 'mat3x4f':case 'mat3x4h':case 'mat4x2':case 'mat4x2f':case 'mat4x2h':case 'mat4x3':case 'mat4x3f':case 'mat4x3h':case 'mat4x4':case 'mat4x4f':case 'mat4x4h':return this._callConstructorMatrix(e,t)}}const a=e instanceof de?e.type.name:e.name,i=e instanceof de?this.getTypeInfo(e.type):this.getTypeInfo(e.name);if(null===i)return console.error(`Unknown type ${a}. Line ${e.line}`),null;if(0===i.size)return null;const o=new We(new ArrayBuffer(i.size),i,0);if(i instanceof n){if(e.args)for(let n=0;n<e.args.length;++n){const s=i.members[n],r=e.args[n],a=this.evalExpression(r,t);o.setData(this,a,s.type,s.offset,t);}}else if(i instanceof s){let n=0;if(e.args)for(let s=0;s<e.args.length;++s){const a=e.args[s],l=this.evalExpression(a,t);null===i.format&&('x32'===(null===(r=l.typeInfo)||void 0===r?void 0:r.name)?i.format=this.getTypeInfo('i32'):i.format=l.typeInfo),o.setData(this,l,i.format,n,t),n+=i.stride;}}else console.error(`Unknown type "${a}". Line ${e.line}`);return e instanceof de?o.getSubData(this,e.postfix,t):o}_evalLiteral(e,t){const n=this.getTypeInfo(e.type),s=n.name;if('x32'===s||'u32'===s||'f32'===s||'f16'===s||'i32'===s||'bool'===s){return new Fe(e.scalarValue,n)}return 'vec2'===s||'vec3'===s||'vec4'===s||'vec2f'===s||'vec3f'===s||'vec4f'===s||'vec2h'===s||'vec3h'===s||'vec4h'===s||'vec2i'===s||'vec3i'===s||'vec4i'===s||'vec2u'===s||'vec3u'===s||'vec4u'===s?this._callConstructorVec(e,t):'mat2x2'===s||'mat2x3'===s||'mat2x4'===s||'mat3x2'===s||'mat3x3'===s||'mat3x4'===s||'mat4x2'===s||'mat4x3'===s||'mat4x4'===s||'mat2x2f'===s||'mat2x3f'===s||'mat2x4f'===s||'mat3x2f'===s||'mat3x3f'===s||'mat3x4f'===s||'mat4x2f'===s||'mat4x3f'===s||'mat4x4f'===s||'mat2x2h'===s||'mat2x3h'===s||'mat2x4h'===s||'mat3x2h'===s||'mat3x3h'===s||'mat3x4h'===s||'mat4x2h'===s||'mat4x3h'===s||'mat4x4h'===s?this._callConstructorMatrix(e,t):e.value}_evalVariable(e,t){const n=t.getVariableValue(e.name);return null===n?n:n.getSubData(this,e.postfix,t)}_maxFormatTypeInfo(e){let t=e[0];if('f32'===t.name)return t;for(let n=1;n<e.length;++n){const s=mt._priority.get(t.name);mt._priority.get(e[n].name)<s&&(t=e[n]);}return 'x32'===t.name?this.getTypeInfo('i32'):t}_evalUnaryOp(e,t){const n=this.evalExpression(e.right,t);if('&'===e.operator)return new Be(n);if('*'===e.operator)return n instanceof Be?n.reference.getSubData(this,e.postfix,t):(console.error(`Invalid dereference. Line ${e.line}`),null);const s=n instanceof Fe?n.value:n instanceof Ue?Array.from(n.data):null;switch(e.operator){case '+':{if(Xe(s)){const e=s.map((e,t)=>+e);return new Ue(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new Fe(+e,t)}case '-':{if(Xe(s)){const e=s.map((e,t)=>-e);return new Ue(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new Fe(-e,t)}case '!':{if(Xe(s)){const e=s.map((e,t)=>e?0:1);return new Ue(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new Fe(e?0:1,t)}case '~':{if(Xe(s)){const e=s.map((e,t)=>~e);return new Ue(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new Fe(~e,t)}}return console.error(`Invalid unary operator ${e.operator}. Line ${e.line}`),null}_isMatrixType(e){return e.typeInfo.getTypeName().startsWith('mat')}_isVectorType(e){return e.typeInfo.getTypeName().startsWith('vec')}_evalBinaryOp(e,t){const n=this.evalExpression(e.left,t),s=this.evalExpression(e.right,t),r=n instanceof Fe?n.value:n instanceof Ue||n instanceof Pe?Array.from(n.data):n instanceof We?n.toArray():null,a=s instanceof Fe?s.value:s instanceof Ue||s instanceof Pe?Array.from(s.data):s instanceof We?s.toArray():null;switch(e.operator){case '+':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e+s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t+e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e+t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t+i,o)}case '-':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e-s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t-e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e-t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t-i,o)}case '*':{if(Xe(r)&&Xe(a)){const t=r,i=a;if(this._isMatrixType(n)&&this._isMatrixType(s)){const r=function(e,t,n,s){if(void 0===dt[t.name]||void 0===dt[s.name])return null;const r=dt[t.name][0],a=dt[t.name][1],i=dt[s.name][0];if(r!==dt[s.name][1])return null;const o=new Array(i*a);for(let t=0;t<a;t++)for(let s=0;s<i;s++){let l=0;for(let i=0;i<r;i++)l+=e[i*a+t]*n[s*r+i];o[t*i+s]=l;}return o}(t,n.typeInfo,i,s.typeInfo);if(null===r)return console.error(`Matrix multiplication failed. Line ${e.line}.`),null;const a=dt[s.typeInfo.name][0],o=dt[n.typeInfo.name][1],l=this.getTypeInfo(`mat${a}x${o}f`);return new Pe(r,l)}if(this._isMatrixType(n)&&this._isVectorType(s)){const r=function(e,t,n,s){if(void 0===dt[t.name]||void 0===pt[s.name])return null;const r=dt[t.name][0],a=dt[t.name][1];if(r!==n.length)return null;const i=new Array(a);for(let t=0;t<a;t++){let s=0;for(let i=0;i<r;i++)s+=e[i*a+t]*n[i];i[t]=s;}return i}(t,n.typeInfo,i,s.typeInfo);return null===r?(console.error(`Matrix vector multiplication failed. Line ${e.line}.`),null):new Ue(r,s.typeInfo)}if(this._isVectorType(n)&&this._isMatrixType(s)){const r=function(e,t,n,s){if(void 0===pt[t.name]||void 0===dt[s.name])return null;const r=dt[s.name][0],a=dt[s.name][1];if(a!==e.length)return null;const i=[];for(let t=0;t<r;t++){let s=0;for(let i=0;i<a;i++)s+=e[i]*n[i*r+t];i[t]=s;}return i}(t,n.typeInfo,i,s.typeInfo);return null===r?(console.error(`Matrix vector multiplication failed. Line ${e.line}.`),null):new Ue(r,n.typeInfo)}{if(t.length!==i.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const s=t.map((e,t)=>e*i[t]);return new Ue(s,n.typeInfo)}}if(Xe(r)){const e=a,t=r.map((t,n)=>t*e);return this._isMatrixType(n)?new Pe(t,n.typeInfo):new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e*t);return s instanceof Pe?new Pe(t,s.typeInfo):new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t*i,o)}case '%':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e%s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t%e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e%t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t%i,o)}case '/':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e/s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t/e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e/t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t/i,o)}case '&':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e&s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t&e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e&t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t&i,o)}case '|':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e|s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t|e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e|t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t|i,o)}case '^':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e^s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t^e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e^t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t^i,o)}case '<<':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e<<s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t<<e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e<<t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t<<i,o)}case '>>':{if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e>>s[t]);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t>>e);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e>>t);return new Ue(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new Fe(t>>i,o)}case '>':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e>s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t>e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e>t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r>a?1:0,this.getTypeInfo('bool'));case '<':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e<s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t<e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e<t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r<a?1:0,this.getTypeInfo('bool'));case '==':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e===s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t===e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e===t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r===a?1:0,this.getTypeInfo('bool'));case '!=':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e!==s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t!==e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e!==t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r!==a?1:0,this.getTypeInfo('bool'));case '>=':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e>=s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t>=e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e>=t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r>=a?1:0,this.getTypeInfo('bool'));case '<=':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e<=s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t<=e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e<=t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r<=a?1:0,this.getTypeInfo('bool'));case '&&':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e&&s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t&&e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e&&t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r&&a?1:0,this.getTypeInfo('bool'));case '||':if(Xe(r)&&Xe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map((e,t)=>e||s[t]?1:0);return new Ue(i,n.typeInfo)}if(Xe(r)){const e=a,t=r.map((t,n)=>t||e?1:0);return new Ue(t,n.typeInfo)}if(Xe(a)){const e=r,t=a.map((t,n)=>e||t?1:0);return new Ue(t,s.typeInfo)}return new Fe(r||a?1:0,this.getTypeInfo('bool'))}return console.error(`Unknown operator ${e.operator}. Line ${e.line}`),null}_evalCall(e,t){if(null!==e.cachedReturnValue)return e.cachedReturnValue;const n=t.clone();n.currentFunctionName=e.name;const s=t.getFunction(e.name);if(!s){if(e.isBuiltin)return this._callBuiltinFunction(e,n);return this.getTypeInfo(e.name)?this._evalCreate(e,t):(console.error(`Unknown function "${e.name}". Line ${e.line}`),null)}for(let t=0;t<s.node.args.length;++t){const r=s.node.args[t],a=this.evalExpression(e.args[t],n);n.createVariable(r.name,a,r);}return this._execStatements(s.node.body,n)}_callBuiltinFunction(e,t){switch(e.name){case 'all':return this.builtins.All(e,t);case 'any':return this.builtins.Any(e,t);case 'select':return this.builtins.Select(e,t);case 'arrayLength':return this.builtins.ArrayLength(e,t);case 'abs':return this.builtins.Abs(e,t);case 'acos':return this.builtins.Acos(e,t);case 'acosh':return this.builtins.Acosh(e,t);case 'asin':return this.builtins.Asin(e,t);case 'asinh':return this.builtins.Asinh(e,t);case 'atan':return this.builtins.Atan(e,t);case 'atanh':return this.builtins.Atanh(e,t);case 'atan2':return this.builtins.Atan2(e,t);case 'ceil':return this.builtins.Ceil(e,t);case 'clamp':return this.builtins.Clamp(e,t);case 'cos':return this.builtins.Cos(e,t);case 'cosh':return this.builtins.Cosh(e,t);case 'countLeadingZeros':return this.builtins.CountLeadingZeros(e,t);case 'countOneBits':return this.builtins.CountOneBits(e,t);case 'countTrailingZeros':return this.builtins.CountTrailingZeros(e,t);case 'cross':return this.builtins.Cross(e,t);case 'degrees':return this.builtins.Degrees(e,t);case 'determinant':return this.builtins.Determinant(e,t);case 'distance':return this.builtins.Distance(e,t);case 'dot':return this.builtins.Dot(e,t);case 'dot4U8Packed':return this.builtins.Dot4U8Packed(e,t);case 'dot4I8Packed':return this.builtins.Dot4I8Packed(e,t);case 'exp':return this.builtins.Exp(e,t);case 'exp2':return this.builtins.Exp2(e,t);case 'extractBits':return this.builtins.ExtractBits(e,t);case 'faceForward':return this.builtins.FaceForward(e,t);case 'firstLeadingBit':return this.builtins.FirstLeadingBit(e,t);case 'firstTrailingBit':return this.builtins.FirstTrailingBit(e,t);case 'floor':return this.builtins.Floor(e,t);case 'fma':return this.builtins.Fma(e,t);case 'fract':return this.builtins.Fract(e,t);case 'frexp':return this.builtins.Frexp(e,t);case 'insertBits':return this.builtins.InsertBits(e,t);case 'inverseSqrt':return this.builtins.InverseSqrt(e,t);case 'ldexp':return this.builtins.Ldexp(e,t);case 'length':return this.builtins.Length(e,t);case 'log':return this.builtins.Log(e,t);case 'log2':return this.builtins.Log2(e,t);case 'max':return this.builtins.Max(e,t);case 'min':return this.builtins.Min(e,t);case 'mix':return this.builtins.Mix(e,t);case 'modf':return this.builtins.Modf(e,t);case 'normalize':return this.builtins.Normalize(e,t);case 'pow':return this.builtins.Pow(e,t);case 'quantizeToF16':return this.builtins.QuantizeToF16(e,t);case 'radians':return this.builtins.Radians(e,t);case 'reflect':return this.builtins.Reflect(e,t);case 'refract':return this.builtins.Refract(e,t);case 'reverseBits':return this.builtins.ReverseBits(e,t);case 'round':return this.builtins.Round(e,t);case 'saturate':return this.builtins.Saturate(e,t);case 'sign':return this.builtins.Sign(e,t);case 'sin':return this.builtins.Sin(e,t);case 'sinh':return this.builtins.Sinh(e,t);case 'smoothstep':return this.builtins.SmoothStep(e,t);case 'sqrt':return this.builtins.Sqrt(e,t);case 'step':return this.builtins.Step(e,t);case 'tan':return this.builtins.Tan(e,t);case 'tanh':return this.builtins.Tanh(e,t);case 'transpose':return this.builtins.Transpose(e,t);case 'trunc':return this.builtins.Trunc(e,t);case 'dpdx':return this.builtins.Dpdx(e,t);case 'dpdxCoarse':return this.builtins.DpdxCoarse(e,t);case 'dpdxFine':return this.builtins.DpdxFine(e,t);case 'dpdy':return this.builtins.Dpdy(e,t);case 'dpdyCoarse':return this.builtins.DpdyCoarse(e,t);case 'dpdyFine':return this.builtins.DpdyFine(e,t);case 'fwidth':return this.builtins.Fwidth(e,t);case 'fwidthCoarse':return this.builtins.FwidthCoarse(e,t);case 'fwidthFine':return this.builtins.FwidthFine(e,t);case 'textureDimensions':return this.builtins.TextureDimensions(e,t);case 'textureGather':return this.builtins.TextureGather(e,t);case 'textureGatherCompare':return this.builtins.TextureGatherCompare(e,t);case 'textureLoad':return this.builtins.TextureLoad(e,t);case 'textureNumLayers':return this.builtins.TextureNumLayers(e,t);case 'textureNumLevels':return this.builtins.TextureNumLevels(e,t);case 'textureNumSamples':return this.builtins.TextureNumSamples(e,t);case 'textureSample':return this.builtins.TextureSample(e,t);case 'textureSampleBias':return this.builtins.TextureSampleBias(e,t);case 'textureSampleCompare':return this.builtins.TextureSampleCompare(e,t);case 'textureSampleCompareLevel':return this.builtins.TextureSampleCompareLevel(e,t);case 'textureSampleGrad':return this.builtins.TextureSampleGrad(e,t);case 'textureSampleLevel':return this.builtins.TextureSampleLevel(e,t);case 'textureSampleBaseClampToEdge':return this.builtins.TextureSampleBaseClampToEdge(e,t);case 'textureStore':return this.builtins.TextureStore(e,t);case 'atomicLoad':return this.builtins.AtomicLoad(e,t);case 'atomicStore':return this.builtins.AtomicStore(e,t);case 'atomicAdd':return this.builtins.AtomicAdd(e,t);case 'atomicSub':return this.builtins.AtomicSub(e,t);case 'atomicMax':return this.builtins.AtomicMax(e,t);case 'atomicMin':return this.builtins.AtomicMin(e,t);case 'atomicAnd':return this.builtins.AtomicAnd(e,t);case 'atomicOr':return this.builtins.AtomicOr(e,t);case 'atomicXor':return this.builtins.AtomicXor(e,t);case 'atomicExchange':return this.builtins.AtomicExchange(e,t);case 'atomicCompareExchangeWeak':return this.builtins.AtomicCompareExchangeWeak(e,t);case 'pack4x8snorm':return this.builtins.Pack4x8snorm(e,t);case 'pack4x8unorm':return this.builtins.Pack4x8unorm(e,t);case 'pack4xI8':return this.builtins.Pack4xI8(e,t);case 'pack4xU8':return this.builtins.Pack4xU8(e,t);case 'pack4x8Clamp':return this.builtins.Pack4x8Clamp(e,t);case 'pack4xU8Clamp':return this.builtins.Pack4xU8Clamp(e,t);case 'pack2x16snorm':return this.builtins.Pack2x16snorm(e,t);case 'pack2x16unorm':return this.builtins.Pack2x16unorm(e,t);case 'pack2x16float':return this.builtins.Pack2x16float(e,t);case 'unpack4x8snorm':return this.builtins.Unpack4x8snorm(e,t);case 'unpack4x8unorm':return this.builtins.Unpack4x8unorm(e,t);case 'unpack4xI8':return this.builtins.Unpack4xI8(e,t);case 'unpack4xU8':return this.builtins.Unpack4xU8(e,t);case 'unpack2x16snorm':return this.builtins.Unpack2x16snorm(e,t);case 'unpack2x16unorm':return this.builtins.Unpack2x16unorm(e,t);case 'unpack2x16float':return this.builtins.Unpack2x16float(e,t);case 'storageBarrier':return this.builtins.StorageBarrier(e,t);case 'textureBarrier':return this.builtins.TextureBarrier(e,t);case 'workgroupBarrier':return this.builtins.WorkgroupBarrier(e,t);case 'workgroupUniformLoad':return this.builtins.WorkgroupUniformLoad(e,t);case 'subgroupAdd':return this.builtins.SubgroupAdd(e,t);case 'subgroupExclusiveAdd':return this.builtins.SubgroupExclusiveAdd(e,t);case 'subgroupInclusiveAdd':return this.builtins.SubgroupInclusiveAdd(e,t);case 'subgroupAll':return this.builtins.SubgroupAll(e,t);case 'subgroupAnd':return this.builtins.SubgroupAnd(e,t);case 'subgroupAny':return this.builtins.SubgroupAny(e,t);case 'subgroupBallot':return this.builtins.SubgroupBallot(e,t);case 'subgroupBroadcast':return this.builtins.SubgroupBroadcast(e,t);case 'subgroupBroadcastFirst':return this.builtins.SubgroupBroadcastFirst(e,t);case 'subgroupElect':return this.builtins.SubgroupElect(e,t);case 'subgroupMax':return this.builtins.SubgroupMax(e,t);case 'subgroupMin':return this.builtins.SubgroupMin(e,t);case 'subgroupMul':return this.builtins.SubgroupMul(e,t);case 'subgroupExclusiveMul':return this.builtins.SubgroupExclusiveMul(e,t);case 'subgroupInclusiveMul':return this.builtins.SubgroupInclusiveMul(e,t);case 'subgroupOr':return this.builtins.SubgroupOr(e,t);case 'subgroupShuffle':return this.builtins.SubgroupShuffle(e,t);case 'subgroupShuffleDown':return this.builtins.SubgroupShuffleDown(e,t);case 'subgroupShuffleUp':return this.builtins.SubgroupShuffleUp(e,t);case 'subgroupShuffleXor':return this.builtins.SubgroupShuffleXor(e,t);case 'subgroupXor':return this.builtins.SubgroupXor(e,t);case 'quadBroadcast':return this.builtins.QuadBroadcast(e,t);case 'quadSwapDiagonal':return this.builtins.QuadSwapDiagonal(e,t);case 'quadSwapX':return this.builtins.QuadSwapX(e,t);case 'quadSwapY':return this.builtins.QuadSwapY(e,t)}const n=t.getFunction(e.name);if(n){const s=t.clone();for(let t=0;t<n.node.args.length;++t){const r=n.node.args[t],a=this.evalExpression(e.args[t],s);s.setVariable(r.name,a,r);}return this._execStatements(n.node.body,s)}return null}_callConstructorValue(e,t){if(!e.args||0===e.args.length)return new Fe(0,this.getTypeInfo(e.type));const n=this.evalExpression(e.args[0],t);return n.typeInfo=this.getTypeInfo(e.type),n.getSubData(this,e.postfix,t).clone()}_callConstructorVec(e,t){const n=this.getTypeInfo(e.type),s=e.type.getTypeName(),r=pt[s];if(void 0===r)return console.error(`Invalid vec constructor ${s}. Line ${e.line}`),null;const a=[];if(e instanceof xe)if(e.isVector){const t=e.vectorValue;for(const e of t)a.push(e);}else a.push(e.scalarValue);else if(e.args)for(const n of e.args){const e=this.evalExpression(n,t);if(e instanceof Ue){const t=e.data;for(let e=0;e<t.length;++e){let n=t[e];a.push(n);}}else if(e instanceof Fe){let t=e.value;a.push(t);}}if(e.type instanceof le&&null===e.type.format&&(e.type.format=le.f32),0===a.length){const s=new Array(r).fill(0);return new Ue(s,n).getSubData(this,e.postfix,t)}if(1===a.length)for(;a.length<r;)a.push(a[0]);if(a.length<r)return console.error(`Invalid vec constructor. Line ${e.line}`),null;return new Ue(a.length>r?a.slice(0,r):a,n).getSubData(this,e.postfix,t)}_callConstructorMatrix(e,t){const n=this.getTypeInfo(e.type),s=e.type.getTypeName(),r=dt[s];if(void 0===r)return console.error(`Invalid matrix constructor ${s}. Line ${e.line}`),null;const i=[];if(e instanceof xe)if(e.isVector){const t=e.vectorValue;for(const e of t)i.push(e);}else i.push(e.scalarValue);else if(e.args)for(const n of e.args){const e=this.evalExpression(n,t);e instanceof Ue?i.push(...e.data):e instanceof Fe?i.push(e.value):e instanceof Pe&&i.push(...e.data);}if(n instanceof a&&null===n.format&&(n.format=this.getTypeInfo('f32')),0===i.length){const s=new Array(r[2]).fill(0);return new Pe(s,n).getSubData(this,e.postfix,t)}return i.length!==r[2]?(console.error(`Invalid matrix constructor. Line ${e.line}`),null):new Pe(i,n).getSubData(this,e.postfix,t)}}mt._numericScalarTypes=new Set(['f32','i32','u32','bool','f16']),mt._vectorTypes=new Set(['vec2','vec3','vec4','vec2f','vec3f','vec4f','vec2i','vec3i','vec4i','vec2u','vec3u','vec4u','vec2h','vec3h','vec4h','vec2b','vec3b','vec4b']),mt._matrixTypes=new Set(['mat2x2','mat2x3','mat2x4','mat3x2','mat3x3','mat3x4','mat4x2','mat4x3','mat4x4','mat2x2f','mat2x3f','mat2x4f','mat3x2f','mat3x3f','mat3x4f','mat4x2f','mat4x3f','mat4x4f','mat2x2h','mat2x3h','mat2x4h','mat3x2h','mat3x3h','mat3x4h','mat4x2h','mat4x3h','mat4x4h']),mt._defaultableTypes=new Set([...mt._numericScalarTypes,...mt._vectorTypes,...mt._matrixTypes,'array']),mt._breakObj=new Ve(new e('BREAK',null),null),mt._continueObj=new Ve(new e('CONTINUE',null),null),mt._priority=new Map([['f32',0],['f16',1],['u32',2],['i32',3],['x32',3]]);class _t{constructor(){this.constants=new Map,this.aliases=new Map,this.structs=new Map;}}class gt{constructor(){this._tokens=[],this._current=0,this._currentLine=1,this._deferArrayCountEval=[],this._currentLoop=[],this._context=new _t,this._exec=new mt,this._forwardTypeCount=0;}parse(e){this._initialize(e),this._deferArrayCountEval.length=0;const t=[];for(;!this._isAtEnd();){const e=this._global_decl_or_directive();if(!e)break;t.push(e);}if(this._deferArrayCountEval.length>0){for(const e of this._deferArrayCountEval){const t=e.arrayType,n=e.countNode;if(n instanceof _e){const e=n.name,s=this._context.constants.get(e);if(s)try{const e=s.constEvaluate(this._exec);t.count=e;}catch(e){}}}this._deferArrayCountEval.length=0;}if(this._forwardTypeCount>0)for(const e of t)e.search(e=>{e instanceof Ce||e instanceof ce?e.type=this._forwardType(e.type):e instanceof ue?e.format=this._forwardType(e.format):e instanceof F||e instanceof U||e instanceof P?e.type=this._forwardType(e.type):e instanceof D?e.returnType=this._forwardType(e.returnType):e instanceof $e&&(e.type=this._forwardType(e.type));});return t}_forwardType(e){if(e instanceof ie){const t=this._getType(e.name);if(t)return t}else e instanceof ce?e.type=this._forwardType(e.type):e instanceof ue&&(e.format=this._forwardType(e.format));return e}_initialize(e){if(e)if('string'==typeof e){const t=new Ge(e);this._tokens=t.scanTokens();}else this._tokens=e;else this._tokens=[];this._current=0;}_updateNode(e,t){return e.line=null!=t?t:this._currentLine,e}_error(e,t){return new Error(`${t}. Line: ${e.line}`)}_isAtEnd(){return this._current>=this._tokens.length||this._peek().type===ze.eof}_match(e){if(e instanceof He)return !!this._check(e)&&(this._advance(),true);for(let t=0,n=e.length;t<n;++t){const n=e[t];if(this._check(n))return this._advance(),true}return  false}_consume(e,t){if(this._check(e))return this._advance();throw this._error(this._peek(),t)}_check(e){if(this._isAtEnd())return  false;const t=this._peek();if(Array.isArray(e)){const n=t.type;let s=false;for(const t of e){if(n===t)return  true;t===ze.tokens.name&&(s=true);}if(s){const e=ze.tokens.name.rule.exec(t.lexeme);if(e&&0===e.index&&e[0]===t.lexeme)return  true}return  false}if(t.type===e)return  true;if(e===ze.tokens.name){const e=ze.tokens.name.rule.exec(t.lexeme);return e&&0===e.index&&e[0]===t.lexeme}return  false}_advance(){var e,t;return this._currentLine=null!==(t=null===(e=this._peek())||void 0===e?void 0:e.line)&&void 0!==t?t:-1,this._isAtEnd()||this._current++,this._previous()}_peek(){return this._tokens[this._current]}_previous(){return this._tokens[this._current-1]}_global_decl_or_directive(){for(;this._match(ze.tokens.semicolon)&&!this._isAtEnd(););if(this._match(ze.keywords.const_assert)){const e=this._global_assert();return this._consume(ze.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(ze.keywords.alias)){const e=this._type_alias();return this._consume(ze.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(ze.keywords.diagnostic)){const e=this._diagnostic();return this._consume(ze.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(ze.keywords.requires)){const e=this._requires_directive();return this._consume(ze.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(ze.keywords.enable)){const e=this._enable_directive();return this._consume(ze.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}const e=this._attribute();if(this._check(ze.keywords.var)){const t=this._global_variable_decl();return null!=t&&(t.attributes=e),this._consume(ze.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(ze.keywords.override)){const t=this._override_variable_decl();return null!=t&&(t.attributes=e),this._consume(ze.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(ze.keywords.let)){const t=this._global_let_decl();return null!=t&&(t.attributes=e),this._consume(ze.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(ze.keywords.const)){const t=this._global_const_decl();return null!=t&&(t.attributes=e),this._consume(ze.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(ze.keywords.struct)){const t=this._struct_decl();return null!=t&&(t.attributes=e),this._exec.reflection.updateAST([t]),t}if(this._check(ze.keywords.fn)){const t=this._function_decl();return null!=t&&(t.attributes=e),this._exec.reflection.updateAST([t]),t}return null}_function_decl(){if(!this._match(ze.keywords.fn))return null;const e=this._currentLine,t=this._consume(ze.tokens.ident,'Expected function name.').toString();this._consume(ze.tokens.paren_left,'Expected \'(\' for function arguments.');const n=[];if(!this._check(ze.tokens.paren_right))do{if(this._check(ze.tokens.paren_right))break;const e=this._attribute(),t=this._consume(ze.tokens.name,'Expected argument name.').toString();this._consume(ze.tokens.colon,'Expected \':\' for argument type.');const s=this._attribute(),r=this._type_decl();null!=r&&(r.attributes=s,n.push(this._updateNode(new $e(t,r,e))));}while(this._match(ze.tokens.comma));this._consume(ze.tokens.paren_right,'Expected \')\' after function arguments.');let s=null;if(this._match(ze.tokens.arrow)){const e=this._attribute();s=this._type_decl(),null!=s&&(s.attributes=e);}const r=this._compound_statement(),a=this._currentLine;return this._updateNode(new D(t,n,s,r,e,a),e)}_compound_statement(){const e=[];for(this._consume(ze.tokens.brace_left,'Expected \'{\' for block.');!this._check(ze.tokens.brace_right);){const t=this._statement();null!==t&&e.push(t);}return this._consume(ze.tokens.brace_right,'Expected \'}\' for block.'),e}_statement(){for(;this._match(ze.tokens.semicolon)&&!this._isAtEnd(););if(this._check(ze.tokens.attr)&&this._attribute(),this._check(ze.keywords.if))return this._if_statement();if(this._check(ze.keywords.switch))return this._switch_statement();if(this._check(ze.keywords.loop))return this._loop_statement();if(this._check(ze.keywords.for))return this._for_statement();if(this._check(ze.keywords.while))return this._while_statement();if(this._check(ze.keywords.continuing))return this._continuing_statement();if(this._check(ze.keywords.static_assert))return this._static_assert_statement();if(this._check(ze.tokens.brace_left))return this._compound_statement();let e=null;if(this._check(ze.keywords.return))e=this._return_statement();else if(this._check([ze.keywords.var,ze.keywords.let,ze.keywords.const]))e=this._variable_statement();else if(this._match(ze.keywords.discard))e=this._updateNode(new ne);else if(this._match(ze.keywords.break)){const t=this._updateNode(new se);if(this._currentLoop.length>0){const e=this._currentLoop[this._currentLoop.length-1];t.loopId=e.id;}e=t,this._check(ze.keywords.if)&&(this._advance(),t.condition=this._optional_paren_expression());}else if(this._match(ze.keywords.continue)){const t=this._updateNode(new re);if(!(this._currentLoop.length>0))throw this._error(this._peek(),'Continue statement must be inside a loop');{const e=this._currentLoop[this._currentLoop.length-1];t.loopId=e.id;}e=t;}else e=this._increment_decrement_statement()||this._func_call_statement()||this._assignment_statement();return null!=e&&this._consume(ze.tokens.semicolon,'Expected \';\' after statement.'),e}_static_assert_statement(){if(!this._match(ze.keywords.static_assert))return null;const e=this._currentLine,t=this._optional_paren_expression();return this._updateNode(new N(t),e)}_global_assert(){const e=this._currentLine,t=this._short_circuit_or_expression();return this._updateNode(new N(t),e)}_while_statement(){if(!this._match(ze.keywords.while))return null;const e=this._updateNode(new V(null,null));return this._currentLoop.push(e),e.condition=this._optional_paren_expression(),this._check(ze.tokens.attr)&&this._attribute(),e.body=this._compound_statement(),this._currentLoop.pop(),e}_continuing_statement(){const e=this._currentLoop.length>0?this._currentLoop[this._currentLoop.length-1].id:-1;if(!this._match(ze.keywords.continuing))return null;const t=this._currentLine,n=this._compound_statement();return this._updateNode(new O(n,e),t)}_for_statement(){if(!this._match(ze.keywords.for))return null;this._consume(ze.tokens.paren_left,'Expected \'(\'.');const e=this._updateNode(new B(null,null,null,null));return this._currentLoop.push(e),e.init=this._check(ze.tokens.semicolon)?null:this._for_init(),this._consume(ze.tokens.semicolon,'Expected \';\'.'),e.condition=this._check(ze.tokens.semicolon)?null:this._short_circuit_or_expression(),this._consume(ze.tokens.semicolon,'Expected \';\'.'),e.increment=this._check(ze.tokens.paren_right)?null:this._for_increment(),this._consume(ze.tokens.paren_right,'Expected \')\'.'),this._check(ze.tokens.attr)&&this._attribute(),e.body=this._compound_statement(),this._currentLoop.pop(),e}_for_init(){return this._variable_statement()||this._func_call_statement()||this._assignment_statement()}_for_increment(){return this._func_call_statement()||this._increment_decrement_statement()||this._assignment_statement()}_variable_statement(){if(this._check(ze.keywords.var)){const e=this._variable_decl();if(null===e)throw this._error(this._peek(),'Variable declaration expected.');let t=null;return this._match(ze.tokens.equal)&&(t=this._short_circuit_or_expression()),this._updateNode(new F(e.name,e.type,e.storage,e.access,t),e.line)}if(this._match(ze.keywords.let)){const e=this._currentLine,t=this._consume(ze.tokens.name,'Expected name for let.').toString();let n=null;if(this._match(ze.tokens.colon)){const e=this._attribute();n=this._type_decl(),null!=n&&(n.attributes=e);}this._consume(ze.tokens.equal,'Expected \'=\' for let.');const s=this._short_circuit_or_expression();return this._updateNode(new U(t,n,null,null,s),e)}if(this._match(ze.keywords.const)){const e=this._currentLine,t=this._consume(ze.tokens.name,'Expected name for const.').toString();let n=null;if(this._match(ze.tokens.colon)){const e=this._attribute();n=this._type_decl(),null!=n&&(n.attributes=e);}this._consume(ze.tokens.equal,'Expected \'=\' for const.');const s=this._short_circuit_or_expression();return null===n&&s instanceof xe&&(n=s.type),this._updateNode(new P(t,n,null,null,s),e)}return null}_increment_decrement_statement(){const e=this._current,t=this._unary_expression();if(null===t)return null;if(!this._check(ze.increment_operators))return this._current=e,null;const n=this._consume(ze.increment_operators,'Expected increment operator');return this._updateNode(new R(n.type===ze.tokens.plus_plus?W.increment:W.decrement,t))}_assignment_statement(){let e=null;const t=this._currentLine;if(this._check(ze.tokens.brace_right))return null;let n=this._match(ze.tokens.underscore);if(n||(e=this._unary_expression()),!n&&null===e)return null;const s=this._consume(ze.assignment_operators,'Expected assignment operator.'),r=this._short_circuit_or_expression();return this._updateNode(new G(q.parse(s.lexeme),e,r),t)}_func_call_statement(){if(!this._check(ze.tokens.ident))return null;const e=this._currentLine,t=this._current,n=this._consume(ze.tokens.ident,'Expected function name.'),s=this._argument_expression_list();return null===s?(this._current=t,null):this._updateNode(new X(n.lexeme,s),e)}_loop_statement(){if(!this._match(ze.keywords.loop))return null;this._check(ze.tokens.attr)&&this._attribute(),this._consume(ze.tokens.brace_left,'Expected \'{\' for loop.');const e=this._updateNode(new j([],null));this._currentLoop.push(e);let t=this._statement();for(;null!==t;){if(Array.isArray(t))for(let n of t)e.body.push(n);else e.body.push(t);if(t instanceof O){e.continuing=t;break}t=this._statement();}return this._currentLoop.pop(),this._consume(ze.tokens.brace_right,'Expected \'}\' for loop.'),e}_switch_statement(){if(!this._match(ze.keywords.switch))return null;const e=this._updateNode(new Z(null,[]));if(this._currentLoop.push(e),e.condition=this._optional_paren_expression(),this._check(ze.tokens.attr)&&this._attribute(),this._consume(ze.tokens.brace_left,'Expected \'{\' for switch.'),e.cases=this._switch_body(),null===e.cases||0===e.cases.length)throw this._error(this._previous(),'Expected \'case\' or \'default\'.');return this._consume(ze.tokens.brace_right,'Expected \'}\' for switch.'),this._currentLoop.pop(),e}_switch_body(){const e=[];let t=false;for(;this._check([ze.keywords.default,ze.keywords.case]);){if(this._match(ze.keywords.case)){const n=this._case_selectors();for(const e of n)if(e instanceof Se){if(t)throw this._error(this._previous(),'Multiple default cases in switch statement.');t=true;break}this._match(ze.tokens.colon),this._check(ze.tokens.attr)&&this._attribute(),this._consume(ze.tokens.brace_left,'Exected \'{\' for switch case.');const s=this._case_body();this._consume(ze.tokens.brace_right,'Exected \'}\' for switch case.'),e.push(this._updateNode(new Ae(n,s)));}if(this._match(ze.keywords.default)){if(t)throw this._error(this._previous(),'Multiple default cases in switch statement.');this._match(ze.tokens.colon),this._check(ze.tokens.attr)&&this._attribute(),this._consume(ze.tokens.brace_left,'Exected \'{\' for switch default.');const n=this._case_body();this._consume(ze.tokens.brace_right,'Exected \'}\' for switch default.'),e.push(this._updateNode(new Ee(n)));}}return e}_case_selectors(){const e=[];for(this._match(ze.keywords.default)?e.push(this._updateNode(new Se)):e.push(this._shift_expression());this._match(ze.tokens.comma);)this._match(ze.keywords.default)?e.push(this._updateNode(new Se)):e.push(this._shift_expression());return e}_case_body(){if(this._match(ze.keywords.fallthrough))return this._consume(ze.tokens.semicolon,'Expected \';\''),[];let e=this._statement();if(null===e)return [];Array.isArray(e)||(e=[e]);const t=this._case_body();return 0===t.length?e:[...e,t[0]]}_if_statement(){if(!this._match(ze.keywords.if))return null;const e=this._currentLine,t=this._optional_paren_expression();this._check(ze.tokens.attr)&&this._attribute();const n=this._compound_statement();let s=[];this._match_elseif()&&(this._check(ze.tokens.attr)&&this._attribute(),s=this._elseif_statement(s));let r=null;return this._match(ze.keywords.else)&&(this._check(ze.tokens.attr)&&this._attribute(),r=this._compound_statement()),this._updateNode(new Q(t,n,s,r),e)}_match_elseif(){return this._tokens[this._current].type===ze.keywords.else&&this._tokens[this._current+1].type===ze.keywords.if&&(this._advance(),this._advance(),true)}_elseif_statement(e=[]){const t=this._optional_paren_expression(),n=this._compound_statement();return e.push(this._updateNode(new Le(t,n))),this._match_elseif()&&(this._check(ze.tokens.attr)&&this._attribute(),this._elseif_statement(e)),e}_return_statement(){if(!this._match(ze.keywords.return))return null;const e=this._short_circuit_or_expression();return this._updateNode(new Y(e))}_short_circuit_or_expression(){let e=this._short_circuit_and_expr();for(;this._match(ze.tokens.or_or);)e=this._updateNode(new Ie(this._previous().toString(),e,this._short_circuit_and_expr()));return e}_short_circuit_and_expr(){let e=this._inclusive_or_expression();for(;this._match(ze.tokens.and_and);)e=this._updateNode(new Ie(this._previous().toString(),e,this._inclusive_or_expression()));return e}_inclusive_or_expression(){let e=this._exclusive_or_expression();for(;this._match(ze.tokens.or);)e=this._updateNode(new Ie(this._previous().toString(),e,this._exclusive_or_expression()));return e}_exclusive_or_expression(){let e=this._and_expression();for(;this._match(ze.tokens.xor);)e=this._updateNode(new Ie(this._previous().toString(),e,this._and_expression()));return e}_and_expression(){let e=this._equality_expression();for(;this._match(ze.tokens.and);)e=this._updateNode(new Ie(this._previous().toString(),e,this._equality_expression()));return e}_equality_expression(){const e=this._relational_expression();return this._match([ze.tokens.equal_equal,ze.tokens.not_equal])?this._updateNode(new Ie(this._previous().toString(),e,this._relational_expression())):e}_relational_expression(){let e=this._shift_expression();for(;this._match([ze.tokens.less_than,ze.tokens.greater_than,ze.tokens.less_than_equal,ze.tokens.greater_than_equal]);)e=this._updateNode(new Ie(this._previous().toString(),e,this._shift_expression()));return e}_shift_expression(){let e=this._additive_expression();for(;this._match([ze.tokens.shift_left,ze.tokens.shift_right]);)e=this._updateNode(new Ie(this._previous().toString(),e,this._additive_expression()));return e}_additive_expression(){let e=this._multiplicative_expression();for(;this._match([ze.tokens.plus,ze.tokens.minus]);)e=this._updateNode(new Ie(this._previous().toString(),e,this._multiplicative_expression()));return e}_multiplicative_expression(){let e=this._unary_expression();for(;this._match([ze.tokens.star,ze.tokens.forward_slash,ze.tokens.modulo]);)e=this._updateNode(new Ie(this._previous().toString(),e,this._unary_expression()));return e}_unary_expression(){return this._match([ze.tokens.minus,ze.tokens.bang,ze.tokens.tilde,ze.tokens.star,ze.tokens.and])?this._updateNode(new ke(this._previous().toString(),this._unary_expression())):this._singular_expression()}_singular_expression(){const e=this._primary_expression(),t=this._postfix_expression();return t&&(e.postfix=t),e}_postfix_expression(){if(this._match(ze.tokens.bracket_left)){const e=this._short_circuit_or_expression();this._consume(ze.tokens.bracket_right,'Expected \']\'.');const t=this._updateNode(new ve(e)),n=this._postfix_expression();return n&&(t.postfix=n),t}if(this._match(ze.tokens.period)){const e=this._consume(ze.tokens.name,'Expected member name.'),t=this._postfix_expression(),n=this._updateNode(new pe(e.lexeme));return t&&(n.postfix=t),n}return null}_getStruct(e){var t;if(this._context.aliases.has(e)){const n=null===(t=this._context.aliases.get(e))||void 0===t?void 0:t.type;return null!=n?n:null}if(this._context.structs.has(e)){const t=this._context.structs.get(e);return null!=t?t:null}return null}_getType(e){const t=this._getStruct(e);if(null!==t)return t;switch(e){case 'void':return ae.void;case 'bool':return ae.bool;case 'i32':return ae.i32;case 'u32':return ae.u32;case 'f32':return ae.f32;case 'f16':return ae.f16;case 'vec2f':return le.vec2f;case 'vec3f':return le.vec3f;case 'vec4f':return le.vec4f;case 'vec2i':return le.vec2i;case 'vec3i':return le.vec3i;case 'vec4i':return le.vec4i;case 'vec2u':return le.vec2u;case 'vec3u':return le.vec3u;case 'vec4u':return le.vec4u;case 'vec2h':return le.vec2h;case 'vec3h':return le.vec3h;case 'vec4h':return le.vec4h;case 'mat2x2f':return le.mat2x2f;case 'mat2x3f':return le.mat2x3f;case 'mat2x4f':return le.mat2x4f;case 'mat3x2f':return le.mat3x2f;case 'mat3x3f':return le.mat3x3f;case 'mat3x4f':return le.mat3x4f;case 'mat4x2f':return le.mat4x2f;case 'mat4x3f':return le.mat4x3f;case 'mat4x4f':return le.mat4x4f;case 'mat2x2h':return le.mat2x2h;case 'mat2x3h':return le.mat2x3h;case 'mat2x4h':return le.mat2x4h;case 'mat3x2h':return le.mat3x2h;case 'mat3x3h':return le.mat3x3h;case 'mat3x4h':return le.mat3x4h;case 'mat4x2h':return le.mat4x2h;case 'mat4x3h':return le.mat4x3h;case 'mat4x4h':return le.mat4x4h;case 'mat2x2i':return le.mat2x2i;case 'mat2x3i':return le.mat2x3i;case 'mat2x4i':return le.mat2x4i;case 'mat3x2i':return le.mat3x2i;case 'mat3x3i':return le.mat3x3i;case 'mat3x4i':return le.mat3x4i;case 'mat4x2i':return le.mat4x2i;case 'mat4x3i':return le.mat4x3i;case 'mat4x4i':return le.mat4x4i;case 'mat2x2u':return le.mat2x2u;case 'mat2x3u':return le.mat2x3u;case 'mat2x4u':return le.mat2x4u;case 'mat3x2u':return le.mat3x2u;case 'mat3x3u':return le.mat3x3u;case 'mat3x4u':return le.mat3x4u;case 'mat4x2u':return le.mat4x2u;case 'mat4x3u':return le.mat4x3u;case 'mat4x4u':return le.mat4x4u}return null}_validateTypeRange(e,t){if('i32'===t.name){if(e<-2147483648||e>2147483647)throw this._error(this._previous(),`Value out of range for i32: ${e}`)}else if('u32'===t.name&&(e<0||e>4294967295))throw this._error(this._previous(),`Value out of range for u32: ${e}`)}_primary_expression(){if(this._match(ze.tokens.ident)){const e=this._previous().toString();if(this._check(ze.tokens.paren_left)){const t=this._argument_expression_list(),n=this._getType(e);return null!==n?this._updateNode(new de(n,t)):this._updateNode(new me(e,t))}if(this._context.constants.has(e)){const t=this._context.constants.get(e);if(t)return this._updateNode(new ge(e,t.value))}return this._updateNode(new _e(e))}if(this._match(ze.tokens.int_literal)){const e=this._previous().toString();let t=e.endsWith('i')||e.endsWith('i')?ae.i32:e.endsWith('u')||e.endsWith('U')?ae.u32:ae.x32;const n=parseInt(e);return this._validateTypeRange(n,t),this._updateNode(new xe(new Fe(n,this._exec.getTypeInfo(t)),t))}if(this._match(ze.tokens.uint_literal)){const e=parseInt(this._previous().toString());return this._validateTypeRange(e,ae.u32),this._updateNode(new xe(new Fe(e,this._exec.getTypeInfo(ae.u32)),ae.u32))}if(this._match([ze.tokens.decimal_float_literal,ze.tokens.hex_float_literal])){let e=this._previous().toString(),t=e.endsWith('h');t&&(e=e.substring(0,e.length-1));const n=parseFloat(e);this._validateTypeRange(n,t?ae.f16:ae.f32);const s=t?ae.f16:ae.f32;return this._updateNode(new xe(new Fe(n,this._exec.getTypeInfo(s)),s))}if(this._match([ze.keywords.true,ze.keywords.false])){let e=this._previous().toString()===ze.keywords.true.rule;return this._updateNode(new xe(new Fe(e?1:0,this._exec.getTypeInfo(ae.bool)),ae.bool))}if(this._check(ze.tokens.paren_left))return this._paren_expression();if(this._match(ze.keywords.bitcast)){this._consume(ze.tokens.less_than,'Expected \'<\'.');const e=this._type_decl();this._consume(ze.tokens.greater_than,'Expected \'>\'.');const t=this._paren_expression();return this._updateNode(new ye(e,t))}const e=this._type_decl(),t=this._argument_expression_list();return this._updateNode(new de(e,t))}_argument_expression_list(){if(!this._match(ze.tokens.paren_left))return null;const e=[];do{if(this._check(ze.tokens.paren_right))break;const t=this._short_circuit_or_expression();e.push(t);}while(this._match(ze.tokens.comma));return this._consume(ze.tokens.paren_right,'Expected \')\' for argument list'),e}_optional_paren_expression(){let e=this._match(ze.tokens.paren_left);const t=this._short_circuit_or_expression();return t.hasParen=e,e&&this._consume(ze.tokens.paren_right,'Expected \')\'.'),t}_paren_expression(){this._consume(ze.tokens.paren_left,'Expected \'(\'.');const e=this._short_circuit_or_expression();return this._consume(ze.tokens.paren_right,'Expected \')\'.'),e.hasParen=true,e}_struct_decl(){if(!this._match(ze.keywords.struct))return null;const e=this._currentLine,t=this._consume(ze.tokens.ident,'Expected name for struct.').toString();this._consume(ze.tokens.brace_left,'Expected \'{\' for struct body.');const n=[];for(;!this._check(ze.tokens.brace_right);){const e=this._attribute(),t=this._consume(ze.tokens.name,'Expected variable name.').toString();this._consume(ze.tokens.colon,'Expected \':\' for struct member type.');const s=this._attribute(),r=this._type_decl();null!=r&&(r.attributes=s),this._check(ze.tokens.brace_right)?this._match(ze.tokens.comma):this._consume(ze.tokens.comma,'Expected \',\' for struct member.'),n.push(this._updateNode(new Ce(t,r,e)));}this._consume(ze.tokens.brace_right,'Expected \'}\' after struct body.');const s=this._currentLine,r=this._updateNode(new oe(t,n,e,s),e);return this._context.structs.set(t,r),r}_global_variable_decl(){const e=this._variable_decl();if(!e)return null;if(this._match(ze.tokens.equal)){const t=this._const_expression();e.value=t;}if(null!==e.type&&e.value instanceof xe){if('x32'!==e.value.type.name){if(e.type.getTypeName()!==e.value.type.getTypeName())throw this._error(this._peek(),`Invalid cast from ${e.value.type.name} to ${e.type.name}`)}e.value.isScalar&&this._validateTypeRange(e.value.scalarValue,e.type),e.value.type=e.type;}else null===e.type&&e.value instanceof xe&&(e.type='x32'===e.value.type.name?ae.i32:e.value.type,e.value.isScalar&&this._validateTypeRange(e.value.scalarValue,e.type));return e}_override_variable_decl(){const e=this._override_decl();return e&&this._match(ze.tokens.equal)&&(e.value=this._const_expression()),e}_global_const_decl(){var e;if(!this._match(ze.keywords.const))return null;const t=this._consume(ze.tokens.name,'Expected variable name'),n=this._currentLine;let s=null;if(this._match(ze.tokens.colon)){const e=this._attribute();s=this._type_decl(),null!=s&&(s.attributes=e);}let r=null;this._consume(ze.tokens.equal,'const declarations require an assignment');const i=this._short_circuit_or_expression();try{let e=[ae.f32],n=i.constEvaluate(this._exec,e);n instanceof Fe&&this._validateTypeRange(n.value,e[0]),e[0]instanceof le&&null===e[0].format&&n.typeInfo instanceof a&&null!==n.typeInfo.format&&('f16'===n.typeInfo.format.name?e[0].format=ae.f16:'f32'===n.typeInfo.format.name?e[0].format=ae.f32:'i32'===n.typeInfo.format.name?e[0].format=ae.i32:'u32'===n.typeInfo.format.name?e[0].format=ae.u32:'bool'===n.typeInfo.format.name?e[0].format=ae.bool:console.error(`TODO: implement template format type ${n.typeInfo.format.name}`)),r=this._updateNode(new xe(n,e[0])),this._exec.context.setVariable(t.toString(),n);}catch(e){r=i;}if(null!==s&&r instanceof xe){if('x32'!==r.type.name){if(s.getTypeName()!==r.type.getTypeName())throw this._error(this._peek(),`Invalid cast from ${r.type.name} to ${s.name}`)}r.type=s,r.isScalar&&this._validateTypeRange(r.scalarValue,r.type);}else null===s&&r instanceof xe&&(s=null!==(e=null==r?void 0:r.type)&&void 0!==e?e:ae.f32,s===ae.x32&&(s=ae.i32));const o=this._updateNode(new P(t.toString(),s,'','',r),n);return this._context.constants.set(o.name,o),o}_global_let_decl(){if(!this._match(ze.keywords.let))return null;const e=this._currentLine,t=this._consume(ze.tokens.name,'Expected variable name');let n=null;if(this._match(ze.tokens.colon)){const e=this._attribute();n=this._type_decl(),null!=n&&(n.attributes=e);}let s=null;if(this._match(ze.tokens.equal)&&(s=this._const_expression()),null!==n&&s instanceof xe){if('x32'!==s.type.name){if(n.getTypeName()!==s.type.getTypeName())throw this._error(this._peek(),`Invalid cast from ${s.type.name} to ${n.name}`)}s.type=n;}else null===n&&s instanceof xe&&(n='x32'===s.type.name?ae.i32:s.type);return s instanceof xe&&s.isScalar&&this._validateTypeRange(s.scalarValue,n),this._updateNode(new U(t.toString(),n,'','',s),e)}_const_expression(){return this._short_circuit_or_expression()}_variable_decl(){if(!this._match(ze.keywords.var))return null;const e=this._currentLine;let t='',n='';this._match(ze.tokens.less_than)&&(t=this._consume(ze.storage_class,'Expected storage_class.').toString(),this._match(ze.tokens.comma)&&(n=this._consume(ze.access_mode,'Expected access_mode.').toString()),this._consume(ze.tokens.greater_than,'Expected \'>\'.'));const s=this._consume(ze.tokens.name,'Expected variable name');let r=null;if(this._match(ze.tokens.colon)){const e=this._attribute();r=this._type_decl(),null!=r&&(r.attributes=e);}return this._updateNode(new F(s.toString(),r,t,n,null),e)}_override_decl(){if(!this._match(ze.keywords.override))return null;const e=this._consume(ze.tokens.name,'Expected variable name');let t=null;if(this._match(ze.tokens.colon)){const e=this._attribute();t=this._type_decl(),null!=t&&(t.attributes=e);}return this._updateNode(new M(e.toString(),t,null))}_diagnostic(){this._consume(ze.tokens.paren_left,'Expected \'(\'');const e=this._consume(ze.tokens.ident,'Expected severity control name.');this._consume(ze.tokens.comma,'Expected \',\'');let t=this._consume(ze.tokens.ident,'Expected diagnostic rule name.').toString();if(this._match(ze.tokens.period)){t+=`.${this._consume(ze.tokens.ident,'Expected diagnostic message.').toString()}`;}return this._consume(ze.tokens.paren_right,'Expected \')\''),this._updateNode(new ee(e.toString(),t))}_enable_directive(){const e=this._consume(ze.tokens.ident,'identity expected.');return this._updateNode(new K(e.toString()))}_requires_directive(){const e=[this._consume(ze.tokens.ident,'identity expected.').toString()];for(;this._match(ze.tokens.comma);){const t=this._consume(ze.tokens.ident,'identity expected.');e.push(t.toString());}return this._updateNode(new J(e))}_type_alias(){const e=this._consume(ze.tokens.ident,'identity expected.');this._consume(ze.tokens.equal,'Expected \'=\' for type alias.');let t=this._type_decl();if(null===t)throw this._error(this._peek(),'Expected Type for Alias.');this._context.aliases.has(t.name)&&(t=this._context.aliases.get(t.name).type);const n=this._updateNode(new te(e.toString(),t));return this._context.aliases.set(n.name,n),n}_type_decl(){var e,t,n;if(this._check([ze.tokens.ident,...ze.texel_format,ze.keywords.bool,ze.keywords.f32,ze.keywords.i32,ze.keywords.u32])){const s=this._advance().toString();if(this._context.structs.has(s))return null!==(e=this._context.structs.get(s))&&void 0!==e?e:null;if(this._context.aliases.has(s))return null!==(n=null===(t=this._context.aliases.get(s))||void 0===t?void 0:t.type)&&void 0!==n?n:null;if(!this._getType(s)){const e=this._updateNode(new ie(s));return this._forwardTypeCount++,e}return this._updateNode(new ae(s))}let s=this._texture_sampler_types();if(s)return s;if(this._check(ze.template_types)){let e=this._advance().toString(),t=null,n=null;this._match(ze.tokens.less_than)&&(t=this._type_decl(),n=null,this._match(ze.tokens.comma)&&(n=this._consume(ze.access_mode,'Expected access_mode for pointer').toString()),this._consume(ze.tokens.greater_than,'Expected \'>\' for type.'));return this._updateNode(new le(e,t,n))}if(this._match(ze.keywords.ptr)){let e=this._previous().toString();this._consume(ze.tokens.less_than,'Expected \'<\' for pointer.');const t=this._consume(ze.storage_class,'Expected storage_class for pointer');this._consume(ze.tokens.comma,'Expected \',\' for pointer.');const n=this._type_decl();let s=null;this._match(ze.tokens.comma)&&(s=this._consume(ze.access_mode,'Expected access_mode for pointer').toString()),this._consume(ze.tokens.greater_than,'Expected \'>\' for pointer.');return this._updateNode(new ce(e,t.toString(),n,s))}const r=this._attribute();if(this._match(ze.keywords.array)){let e=null,t=-1;const n=this._previous();let s=null;if(this._match(ze.tokens.less_than)){e=this._type_decl(),this._context.aliases.has(e.name)&&(e=this._context.aliases.get(e.name).type);let n='';if(this._match(ze.tokens.comma)){s=this._shift_expression();try{n=s.constEvaluate(this._exec).toString(),s=null;}catch(e){n='1';}}this._consume(ze.tokens.greater_than,'Expected \'>\' for array.'),t=n?parseInt(n):0;}const a=this._updateNode(new ue(n.toString(),r,e,t));return s&&this._deferArrayCountEval.push({arrayType:a,countNode:s}),a}return null}_texture_sampler_types(){if(this._match(ze.sampler_type))return this._updateNode(new he(this._previous().toString(),null,null));if(this._match(ze.depth_texture_type))return this._updateNode(new he(this._previous().toString(),null,null));if(this._match(ze.sampled_texture_type)||this._match(ze.multisampled_texture_type)){const e=this._previous();this._consume(ze.tokens.less_than,'Expected \'<\' for sampler type.');const t=this._type_decl();return this._consume(ze.tokens.greater_than,'Expected \'>\' for sampler type.'),this._updateNode(new he(e.toString(),t,null))}if(this._match(ze.storage_texture_type)){const e=this._previous();this._consume(ze.tokens.less_than,'Expected \'<\' for sampler type.');const t=this._consume(ze.texel_format,'Invalid texel format.').toString();this._consume(ze.tokens.comma,'Expected \',\' after texel format.');const n=this._consume(ze.access_mode,'Expected access mode for storage texture type.').toString();return this._consume(ze.tokens.greater_than,'Expected \'>\' for sampler type.'),this._updateNode(new he(e.toString(),t,n))}return null}_attribute(){let e=[];for(;this._match(ze.tokens.attr);){const t=this._consume(ze.attribute_name,'Expected attribute name'),n=this._updateNode(new De(t.toString(),null));if(this._match(ze.tokens.paren_left)){if(n.value=this._consume(ze.literal_or_ident,'Expected attribute value').toString(),this._check(ze.tokens.comma)){this._advance();do{const e=this._consume(ze.literal_or_ident,'Expected attribute value').toString();Array.isArray(n.value)||(n.value=[n.value]),n.value.push(e);}while(this._match(ze.tokens.comma))}this._consume(ze.tokens.paren_right,'Expected \')\'');}e.push(n);}return 0===e.length?null:e}}class xt extends it{constructor(e){super(),void 0!==e&&this.update(e);}update(e){const t=(new gt).parse(e);this.updateAST(t);}}

function getEntryPointForStage(defs, stage, stageFlags) {
    const { entryPoint: entryPointName } = stage;
    if (entryPointName) {
        const ep = defs.entryPoints[entryPointName];
        return (ep && ep.stage === stageFlags) ? ep : undefined;
    }
    return Object.values(defs.entryPoints).filter(ep => ep.stage === stageFlags)[0];
}
function getStageResources(defs, stage, stageFlags) {
    if (!stage) {
        return [];
    }
    const entryPoint = getEntryPointForStage(defs, stage, stageFlags);
    return entryPoint?.resources || [];
}
const byBinding = (a, b) => Math.sign(a.binding - b.binding);
/**
 * Gets GPUBindGroupLayoutDescriptors for the given pipeline.
 *
 * Important: Assumes your pipeline is valid (it doesn't check for errors).
 *
 * Note: In WebGPU some layouts must be specified manually. For example an unfiltered-float
 *    sampler can not be derived since it is unknown at compile time pipeline creation time
 *    which texture you'll use.
 *
 * ```js
 * import {
 *   makeShaderDataDefinitions,
 *   makeBindGroupLayoutDescriptors,
 * } from 'webgpu-utils';
 *
 * const code = `
 * @group(0) @binding(0) var<uniform> mat: mat4x4f;
 *
 * struct MyVSOutput {
 *   @builtin(position) position: vec4f,
 *   @location(1) texcoord: vec2f,
 * };
 *
 * @vertex
 * fn myVSMain(v: MyVSInput) -> MyVSOutput {
 *   var vsOut: MyVSOutput;
 *   vsOut.position = mat * v.position;
 *   vsOut.texcoord = v.texcoord;
 *   return vsOut;
 * }
 *
 * @group(0) @binding(2) var diffuseSampler: sampler;
 * @group(0) @binding(3) var diffuseTexture: texture_2d<f32>;
 *
 * @fragment
 * fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
 *   return textureSample(diffuseTexture, diffuseSampler, v.texcoord);
 * }
 * `;
 *
 * const module = device.createShaderModule({code});
 * const defs = wgh.makeShaderDataDefinitions(code);
 *
 * const pipelineDesc = {
 *   vertex: {
 *     module,
 *     entryPoint: 'myVSMain',
 *     buffers: bufferLayouts,
 *   },
 *   fragment: {
 *     module,
 *     entryPoint: 'myFSMain',
 *     targets: [
 *       {format: 'rgba8unorm'},
 *     ],
 *   },
 * };
 *
 * const descriptors = wgh.makeBindGroupLayoutDescriptors(defs, pipelineDesc);
 * const bindGroupLayouts = descriptors.map(desc => device.createBindGroupLayout(desc));
 * const layout = device.createPipelineLayout({ bindGroupLayouts });
 * const pipeline = device.createRenderPipeline({
 *   layout,
 *   ...pipelineDesc,
 * });
 * ```
 *
 * @param defs ShaderDataDefinitions or an array of ShaderDataDefinitions as
 *    returned from {@link makeShaderDataDefinitions}. If an array of  more than 1
 *    definition it's assumed the vertex shader is in the first and the fragment
 *    shader in the second.
 * @param desc A PipelineDescriptor. You should be able to pass in the same object you would pass
 *    to `createRenderPipeline` or `createComputePipeline`. In particular, you need
 *    the `vertex` / `fragment` or `compute` properties with or without entryPoints.
 *    The existence of the property means this shader type exists in the pipeline. If
 *    no entry point is specified the default entry point will be used, which, like
 *    WebGPU, defaults to the only entry point of that type. If there is more than one
 *    it's an error and you must specify an entry point.
 * @returns An array of GPUBindGroupLayoutDescriptors which you can pass, one at a time, to
 *    `createBindGroupLayout`. Note: the array will be sparse if there are gaps in group
 *    numbers. Note: Each GPUBindGroupLayoutDescriptor.entries will be sorted by binding.
 */
function makeBindGroupLayoutDescriptors(defs, desc) {
    defs = Array.isArray(defs) ? defs : [defs];
    const resources = [
        ...getStageResources(defs[0], desc.vertex, GPUShaderStage.VERTEX),
        ...getStageResources(defs[defs.length - 1], desc.fragment, GPUShaderStage.FRAGMENT),
        ...getStageResources(defs[0], desc.compute, GPUShaderStage.COMPUTE),
    ];
    const bindGroupLayoutDescriptorsByGroupByBinding = [];
    for (const resource of resources) {
        const bindingsToBindGroupEntry = bindGroupLayoutDescriptorsByGroupByBinding[resource.group] || new Map();
        bindGroupLayoutDescriptorsByGroupByBinding[resource.group] = bindingsToBindGroupEntry;
        // Should we error here if the 2 don't match?
        const entry = bindingsToBindGroupEntry.get(resource.entry.binding);
        bindingsToBindGroupEntry.set(resource.entry.binding, {
            ...resource.entry,
            visibility: resource.entry.visibility | (entry?.visibility || 0),
        });
    }
    const descriptors = bindGroupLayoutDescriptorsByGroupByBinding.map(v => ({ entries: [...v.values()].sort(byBinding) }));
    return descriptors;
}
function getNamedVariables(reflect, variables) {
    return Object.fromEntries(variables.map(v => {
        const typeDefinition = addVariableType(reflect, v, 0);
        return [
            v.name,
            {
                typeDefinition,
                group: v.group,
                binding: v.binding,
                size: typeDefinition.size,
            },
        ];
    }));
}
function makeStructDefinition(reflect, structInfo, offset) {
    // StructDefinition
    const fields = Object.fromEntries(structInfo.members.map(m => {
        return [
            m.name,
            {
                offset: m.offset,
                type: addType(reflect, m.type, 0),
            },
        ];
    }));
    return {
        fields,
        size: structInfo.size,
        offset,
    };
}
function getTextureSampleType(type) {
    if (type.name.includes('depth')) {
        return 'depth';
    }
    // unfiltered-float
    switch (type.format?.name) {
        case 'f32': return 'float';
        case 'i32': return 'sint';
        case 'u32': return 'uint';
        default:
            throw new Error('unknown texture sample type');
    }
}
function getViewDimension(type) {
    if (type.name.includes('2d_array')) {
        return '2d-array';
    }
    if (type.name.includes('cube_array')) {
        return 'cube-array';
    }
    if (type.name.includes('3d')) {
        return '3d';
    }
    if (type.name.includes('1d')) {
        return '1d';
    }
    if (type.name.includes('cube')) {
        return 'cube';
    }
    return '2d';
}
function getStorageTextureAccess(type) {
    switch (type.access) {
        case 'read': return 'read-only';
        case 'write': return 'write-only';
        case 'read_write': return 'read-write';
        default:
            throw new Error('unknonw storage texture access');
    }
}
function getSamplerType(type) {
    // "non-filtering" can only be specified manually.
    return type.name.endsWith('_comparison')
        ? 'comparison'
        : 'filtering';
}
function getBindGroupLayoutEntry(resource, visibility) {
    const { binding, access, type } = resource;
    switch (resource.resourceType) {
        case i.Uniform:
            return {
                binding,
                visibility,
                buffer: {
                    ...(resource.size && { minBindingSize: resource.size }),
                },
            };
        case i.Storage:
            return {
                binding,
                visibility,
                buffer: {
                    type: (access === '' || access === 'read') ? 'read-only-storage' : 'storage',
                    ...(resource.size && { minBindingSize: resource.size }),
                },
            };
        case i.Texture: {
            if (type.name === 'texture_external') {
                return {
                    binding,
                    visibility,
                    externalTexture: {},
                };
            }
            const multisampled = type.name.includes('multisampled');
            return {
                binding,
                visibility,
                texture: {
                    sampleType: getTextureSampleType(type),
                    viewDimension: getViewDimension(type),
                    multisampled,
                },
            };
        }
        case i.Sampler:
            return {
                binding,
                visibility,
                sampler: {
                    type: getSamplerType(type),
                },
            };
        case i.StorageTexture:
            return {
                binding,
                visibility,
                storageTexture: {
                    access: getStorageTextureAccess(type),
                    format: type.format.name,
                    viewDimension: getViewDimension(type),
                },
            };
        default:
            throw new Error('unknown resource type');
    }
}
function addEntryPoints(funcInfos, stage) {
    const entryPoints = {};
    for (const info of funcInfos) {
        entryPoints[info.name] = {
            stage,
            resources: info.resources.map(resource => {
                const { name, group } = resource;
                return {
                    name,
                    group,
                    entry: getBindGroupLayoutEntry(resource, stage),
                };
            }),
        };
    }
    return entryPoints;
}
/**
 * Given a WGSL shader, returns data definitions for structures,
 * uniforms, and storage buffers
 *
 * Example:
 *
 * ```js
 * const code = `
 * struct MyStruct {
 *    color: vec4f,
 *    brightness: f32,
 *    kernel: array<f32, 9>,
 * };
 * @group(0) @binding(0) var<uniform> myUniforms: MyUniforms;
 * `;
 * const defs = makeShaderDataDefinitions(code);
 * const myUniformValues = makeStructuredView(defs.uniforms.myUniforms);
 *
 * myUniformValues.set({
 *   color: [1, 0, 1, 1],
 *   brightness: 0.8,
 *   kernel: [
 *      1, 0, -1,
 *      2, 0, -2,
 *      1, 0, -1,
 *   ],
 * });
 * device.queue.writeBuffer(uniformBuffer, 0, myUniformValues.arrayBuffer);
 * ```
 *
 * @param code WGSL shader. Note: it is not required for this to be a complete shader
 * @returns definitions of the structures by name. Useful for passing to {@link makeStructuredView}
 */
function makeShaderDataDefinitions(code) {
    const reflect = new xt(code);
    const structs = Object.fromEntries(reflect.structs.map(structInfo => {
        return [structInfo.name, makeStructDefinition(reflect, structInfo, 0)];
    }));
    const uniforms = getNamedVariables(reflect, reflect.uniforms);
    const immediates = getNamedVariables(reflect, reflect.immediates);
    const storages = getNamedVariables(reflect, reflect.storage.filter(v => v.resourceType === i.Storage));
    const storageTextures = getNamedVariables(reflect, reflect.storage.filter(v => v.resourceType === i.StorageTexture));
    const textures = getNamedVariables(reflect, reflect.textures.filter(v => v.type.name !== 'texture_external'));
    const externalTextures = getNamedVariables(reflect, reflect.textures.filter(v => v.type.name === 'texture_external'));
    const samplers = getNamedVariables(reflect, reflect.samplers);
    const entryPoints = {
        ...addEntryPoints(reflect.entry.vertex, GPUShaderStage.VERTEX),
        ...addEntryPoints(reflect.entry.fragment, GPUShaderStage.FRAGMENT),
        ...addEntryPoints(reflect.entry.compute, GPUShaderStage.COMPUTE),
    };
    return {
        externalTextures,
        immediates,
        samplers,
        structs,
        storages,
        storageTextures,
        textures,
        uniforms,
        entryPoints,
    };
}
function assert(cond, msg = '') {
    if (!cond) {
        throw new Error(msg);
    }
}
/*
 write down what I want for a given type

    struct VSUniforms {
        foo: u32,
    };
    @group(4) @binding(1) var<uniform> uni1: f32;
    @group(3) @binding(2) var<uniform> uni2: array<f32, 5>;
    @group(2) @binding(3) var<uniform> uni3: VSUniforms;
    @group(1) @binding(4) var<uniform> uni4: array<VSUniforms, 6>;

    uni1: {
        type: 'f32',
        numElements: undefined
    },
    uni2: {
        type: 'array',
        elementType: 'f32'
        numElements: 5,
    },
    uni3: {
        type: 'struct',
        fields: {
            foo: {
                type: 'f32',
                numElements: undefined
            }
        },
    },
    uni4: {
        type: 'array',
        elementType:
        fields: {
            foo: {
                type: 'f32',
                numElements: undefined
            }
        },
        fields: {
            foo: {
                type: 'f32',
                numElements: undefined
            }
        },
        ...
    ]

    */
function addVariableType(reflect, v, offset) {
    switch (v.resourceType) {
        case i.Immediate:
        case i.Uniform:
        case i.Storage:
        case i.StorageTexture:
            return addType(reflect, v.type, offset);
        default:
            return {
                size: 0,
                type: v.type.name,
            };
    }
}
function addType(reflect, typeInfo, offset) {
    if (typeInfo.isArray) {
        assert(!typeInfo.isStruct, 'struct array is invalid');
        assert(!typeInfo.isStruct, 'template array is invalid');
        const arrayInfo = typeInfo;
        // ArrayDefinition
        return {
            size: arrayInfo.size,
            elementType: addType(reflect, arrayInfo.format, offset),
            numElements: arrayInfo.count,
        };
    }
    else if (typeInfo.isStruct) {
        assert(!typeInfo.isTemplate, 'template struct is invalid');
        const structInfo = typeInfo;
        return makeStructDefinition(reflect, structInfo, offset);
    }
    else {
        // template is like vec4<f32> or mat4x4<f16>
        const asTemplateInfo = typeInfo;
        const type = typeInfo.isTemplate
            ? `${asTemplateInfo.name}<${asTemplateInfo.format.name}>`
            : typeInfo.name;
        // IntrinsicDefinition
        return {
            size: typeInfo.size,
            type: type,
        };
    }
}

function guessTextureBindingViewDimensionForTexture(dimension, depthOrArrayLayers) {
    switch (dimension) {
        case '1d': return '1d';
        case '3d': return '3d';
        default: return depthOrArrayLayers > 1 ? '2d-array' : '2d';
    }
}
function normalizeGPUExtent3Dict(size) {
    return [size.width, size.height || 1, size.depthOrArrayLayers || 1];
}
/**
 * Converts a `GPUExtent3D` into an array of numbers
 *
 * `GPUExtent3D` has two forms `[width, height?, depth?]` or
 * `{width: number, height?: number, depthOrArrayLayers?: number}`
 *
 * You pass one of those in here and it returns an array of 3 numbers
 * so that your code doesn't have to deal with multiple forms.
 *
 * @param size
 * @returns an array of 3 numbers, [width, height, depthOrArrayLayers]
 */
function normalizeGPUExtent3D(size) {
    return (Array.isArray(size) || isTypedArray(size))
        ? [...size, 1, 1].slice(0, 3)
        : normalizeGPUExtent3Dict(size);
}
/**
 * Given a GPUExtent3D returns the number of mip levels needed
 *
 * @param size
 * @returns number of mip levels needed for the given size
 */
function numMipLevels(size, dimension) {
    const sizes = normalizeGPUExtent3D(size);
    const maxSize = Math.max(...sizes.slice(0, dimension === '3d' ? 3 : 2));
    return 1 + Math.log2(maxSize) | 0;
}
// Use a WeakMap so the device can be destroyed and/or lost
const byDevice = new WeakMap();
/**
 * Generates mip levels from level 0 to the last mip for an existing texture
 *
 * The texture must have been created with TEXTURE_BINDING and RENDER_ATTACHMENT
 * and been created with mip levels
 *
 * @param device A GPUDevice
 * @param texture The texture to create mips for
 */
function generateMipmap(device, texture) {
    let perDeviceInfo = byDevice.get(device);
    if (!perDeviceInfo) {
        perDeviceInfo = {
            pipelineByFormatAndViewDimension: {},
            moduleByViewDimension: {},
        };
        byDevice.set(device, perDeviceInfo);
    }
    let { sampler, module, } = perDeviceInfo;
    const { pipelineByFormatAndViewDimension, } = perDeviceInfo;
    const textureBindingViewDimension = texture.textureBindingViewDimension ?? '2d-array';
    if (!module) {
        module = device.createShaderModule({
            label: `mip level generation for ${textureBindingViewDimension}`,
            code: `
        const faceMat = array(
          mat3x3f( 0,  0,  -2,  0, -2,   0,  1,  1,   1),   // pos-x
          mat3x3f( 0,  0,   2,  0, -2,   0, -1,  1,  -1),   // neg-x
          mat3x3f( 2,  0,   0,  0,  0,   2, -1,  1,  -1),   // pos-y
          mat3x3f( 2,  0,   0,  0,  0,  -2, -1, -1,   1),   // neg-y
          mat3x3f( 2,  0,   0,  0, -2,   0, -1,  1,   1),   // pos-z
          mat3x3f(-2,  0,   0,  0, -2,   0,  1,  1,  -1));  // neg-z

        struct VSOutput {
          @builtin(position) position: vec4f,
          @location(0) texcoord: vec2f,
          @location(1) @interpolate(flat, either) baseArrayLayer: u32,
        };

        @vertex fn vs(
          @builtin(vertex_index) vertexIndex : u32,
          @builtin(instance_index) baseArrayLayer: u32,
        ) -> VSOutput {
          var pos = array<vec2f, 3>(
            vec2f(-1.0, -1.0),
            vec2f(-1.0,  3.0),
            vec2f( 3.0, -1.0),
          );

          var vsOutput: VSOutput;
          let xy = pos[vertexIndex];
          vsOutput.position = vec4f(xy, 0.0, 1.0);
          vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
          vsOutput.baseArrayLayer = baseArrayLayer;
          return vsOutput;
        }

        @group(0) @binding(0) var ourSampler: sampler;

        @group(0) @binding(1) var ourTexture2d: texture_2d<f32>;
        @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
          return textureSample(ourTexture2d, ourSampler, fsInput.texcoord);
        }

        @group(0) @binding(1) var ourTexture2dArray: texture_2d_array<f32>;
        @fragment fn fs2darray(fsInput: VSOutput) -> @location(0) vec4f {
          return textureSample(
            ourTexture2dArray,
            ourSampler,
            fsInput.texcoord,
            fsInput.baseArrayLayer);
        }

        @group(0) @binding(1) var ourTextureCube: texture_cube<f32>;
        @fragment fn fscube(fsInput: VSOutput) -> @location(0) vec4f {
          return textureSample(
            ourTextureCube,
            ourSampler,
            faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1));
        }
      `,
        });
        sampler = device.createSampler({
            minFilter: 'linear',
            magFilter: 'linear',
        });
        Object.assign(perDeviceInfo, { sampler, module });
    }
    const id = `${texture.format}.${textureBindingViewDimension}`;
    if (!pipelineByFormatAndViewDimension[id]) {
        const entryPoint = `fs${textureBindingViewDimension.replace(/[\W]/, '')}`;
        pipelineByFormatAndViewDimension[id] = device.createRenderPipeline({
            label: `mip level generator pipeline for ${textureBindingViewDimension}`,
            layout: 'auto',
            vertex: {
                module,
            },
            fragment: {
                module,
                entryPoint,
                targets: [{ format: texture.format }],
            },
        });
    }
    const pipeline = pipelineByFormatAndViewDimension[id];
    const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
    });
    for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
        for (let baseArrayLayer = 0; baseArrayLayer < texture.depthOrArrayLayers; ++baseArrayLayer) {
            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: sampler },
                    {
                        binding: 1,
                        resource: texture.createView({
                            dimension: textureBindingViewDimension,
                            baseMipLevel: baseMipLevel - 1,
                            mipLevelCount: 1,
                        }),
                    },
                ],
            });
            const renderPassDescriptor = {
                label: 'mip gen renderPass',
                colorAttachments: [
                    {
                        view: texture.createView({
                            dimension: '2d',
                            baseMipLevel,
                            mipLevelCount: 1,
                            baseArrayLayer,
                            arrayLayerCount: 1,
                        }),
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            };
            const pass = encoder.beginRenderPass(renderPassDescriptor);
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3, 1, 0, baseArrayLayer);
            pass.end();
        }
    }
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

const kTypedArrayToAttribFormat = new Map([
    [Int8Array, { formats: ['sint8', 'snorm8'], defaultForType: 1 }],
    [Uint8Array, { formats: ['uint8', 'unorm8'], defaultForType: 1 }],
    [Int16Array, { formats: ['sint16', 'snorm16'], defaultForType: 1 }],
    [Uint16Array, { formats: ['uint16', 'unorm16'], defaultForType: 1 }],
    [Int32Array, { formats: ['sint32', 'snorm32'], defaultForType: 0 }],
    [Uint32Array, { formats: ['uint32', 'unorm32'], defaultForType: 0 }],
    [Float16Array, { formats: ['float16', 'float16'], defaultForType: 0 }],
    [Float32Array, { formats: ['float32', 'float32'], defaultForType: 0 }],
]);
const kVertexFormatPrefixToType = new Map([...kTypedArrayToAttribFormat.entries()].map(([Type, { formats: [s1, s2] }]) => [[s1, Type], [s2, Type]]).flat());
function isIndices(name) {
    return name === "indices";
}
function makeTypedArrayFromArrayUnion(array, name) {
    if (isTypedArray(array)) {
        return array;
    }
    let asFullSpec = array;
    if (isTypedArray(asFullSpec.data)) {
        return asFullSpec.data;
    }
    if (Array.isArray(array) || typeof array === 'number') {
        asFullSpec = {
            data: array,
        };
    }
    let Type = asFullSpec.type;
    if (!Type) {
        if (isIndices(name)) {
            Type = Uint32Array;
        }
        else {
            Type = Float32Array;
        }
    }
    return new Type(asFullSpec.data); // ugh!
}
function getArray(array) {
    const arr = array.length ? array : array.data;
    return arr;
}
const kNameToNumComponents = [
    { re: /coord|texture|uv/i, numComponents: 2 },
    { re: /color|colour/i, numComponents: 4 },
];
function guessNumComponentsFromNameImpl(name) {
    for (const { re, numComponents } of kNameToNumComponents) {
        if (re.test(name)) {
            return numComponents;
        }
    }
    return 3;
}
function guessNumComponentsFromName(name, length) {
    const numComponents = guessNumComponentsFromNameImpl(name);
    if (length % numComponents > 0) {
        throw new Error(`Can not guess numComponents for attribute '${name}'. Tried ${numComponents} but ${length} values is not evenly divisible by ${numComponents}. You should specify it.`);
    }
    return numComponents;
}
function getNumComponents(array, arrayName) {
    return array.numComponents || guessNumComponentsFromName(arrayName, getArray(array).length);
}
const kVertexFormatRE = /(\w+)(?:x(\d))$/;
function numComponentsAndTypeFromVertexFormat(format) {
    const m = kVertexFormatRE.exec(format);
    const [prefix, numComponents] = m ? [m[1], parseInt(m[2])] : [format, 1];
    return {
        Type: kVertexFormatPrefixToType.get(prefix),
        numComponents,
    };
}
function createTypedArrayOfSameType(typedArray, arrayBuffer) {
    const Ctor = Object.getPrototypeOf(typedArray).constructor;
    return new Ctor(arrayBuffer);
}
/**
 * Given a set of named arrays, generates an array `GPUBufferLayout`s
 *
 * Examples:
 *
 * ```js
 *   const arrays = {
 *     position: [1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1],
 *     normal: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
 *     texcoord: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
 *   };
 *
 *   const { bufferLayouts, typedArrays } = createBufferLayoutsFromArrays(arrays);
 * ```
 *
 * results in `bufferLayouts` being
 *
 * ```js
 * [
 *   {
 *     stepMode: 'vertex',
 *     arrayStride: 32,
 *     attributes: [
 *       { shaderLocation: 0, offset:  0, format: 'float32x3' },
 *       { shaderLocation: 1, offset: 12, format: 'float32x3' },
 *       { shaderLocation: 2, offset: 24, format: 'float32x2' },
 *     ],
 *   },
 * ]
 * ```
 *
 * and `typedArrays` being
 *
 * ```
 * [
 *   someFloat32Array0,
 *   someFloat32Array1,
 *   someFloat32Array2,
 * ]
 * ```
 *
 * See {@link Arrays} for details on the various types of arrays.
 *
 * Note: If typed arrays are passed in the same typed arrays will come out (copies will not be made)
 */
function createBufferLayoutsFromArrays(arrays, options = {}) {
    const interleave = options.interleave === undefined ? true : options.interleave;
    const stepMode = options.stepMode || 'vertex';
    const shaderLocations = options.shaderLocation
        ? (Array.isArray(options.shaderLocation) ? options.shaderLocation : [options.shaderLocation])
        : [0];
    let currentOffset = 0;
    const bufferLayouts = [];
    const attributes = [];
    const typedArrays = [];
    Object.keys(arrays)
        .filter(arrayName => !isIndices(arrayName))
        .forEach(arrayName => {
        const array = arrays[arrayName];
        const data = makeTypedArrayFromArrayUnion(array, arrayName);
        const totalNumComponents = getNumComponents(array, arrayName);
        // if totalNumComponents > 4 then we clearly need to split this into multiple
        // attributes
        // (a) <= 4 doesn't mean don't split and
        // (b) how to split? We could divide by 4 and if it's not even then divide by 3
        //     as a guess?
        //     5 is error? or 1x4 + 1x1?
        //     6 is 2x3
        //     7 is error? or 1x4 + 1x3?
        //     8 is 2x4
        //     9 is 3x3
        //    10 is error? or 2x4 + 1x2?
        //    11 is error? or 2x4 + 1x3?
        //    12 is 3x4 or 4x3?
        //    13 is error? or 3x4 + 1x1 or 4x3 + 1x1?
        //    14 is error? or 3x4 + 1x2 or 4x3 + 1x2?
        //    15 is error? or 3x4 + 1x3 or 4x3 + 1x3?
        //    16 is 4x4
        const by4 = totalNumComponents / 4;
        const by3 = totalNumComponents / 3;
        const step = by4 % 1 === 0 ? 4 : (by3 % 1 === 0 ? 3 : 4);
        for (let component = 0; component < totalNumComponents; component += step) {
            const numComponents = Math.min(step, totalNumComponents - component);
            const offset = currentOffset;
            currentOffset += numComponents * data.BYTES_PER_ELEMENT;
            const { defaultForType, formats } = kTypedArrayToAttribFormat.get(Object.getPrototypeOf(data).constructor);
            const normalize = array.normalize;
            const formatNdx = typeof normalize === 'undefined' ? defaultForType : (normalize ? 1 : 0);
            const format = `${formats[formatNdx]}${numComponents > 1 ? `x${numComponents}` : ''}`;
            // TODO: cleanup with generator?
            const shaderLocation = shaderLocations.shift();
            if (shaderLocations.length === 0) {
                shaderLocations.push(shaderLocation + 1);
            }
            attributes.push({
                offset,
                format,
                shaderLocation,
            });
            typedArrays.push({
                data,
                offset: component,
                stride: totalNumComponents,
            });
        }
        if (!interleave) {
            bufferLayouts.push({
                stepMode,
                arrayStride: currentOffset,
                attributes: attributes.slice(),
            });
            currentOffset = 0;
            attributes.length = 0;
        }
    });
    if (attributes.length) {
        bufferLayouts.push({
            stepMode,
            arrayStride: currentOffset,
            attributes: attributes,
        });
    }
    return {
        bufferLayouts,
        typedArrays,
    };
}
function getTypedArrayWithOffsetAndStride(ta, numComponents) {
    return (isTypedArray(ta)
        ? { data: ta, offset: 0, stride: numComponents }
        : ta);
}
/**
 * Given an array of `GPUVertexAttribute`s and a corresponding array
 * of TypedArrays, interleaves the contents of the typed arrays
 * into the given ArrayBuffer
 *
 * example:
 *
 * ```js
 * const attributes: GPUVertexAttribute[] = [
 *   { shaderLocation: 0, offset:  0, format: 'float32x3' },
 *   { shaderLocation: 1, offset: 12, format: 'float32x3' },
 *   { shaderLocation: 2, offset: 24, format: 'float32x2' },
 * ];
 * const typedArrays = [
 *   new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]),
 *   new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]),
 *   new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]),
 * ];
 * const arrayStride = (3 + 3 + 2) * 4;  // pos + nrm + uv
 * const arrayBuffer = new ArrayBuffer(arrayStride * 24)
 * interleaveVertexData(attributes, typedArrays, arrayStride, arrayBuffer)
 * ```
 *
 * results in the contents of `arrayBuffer` to be the 3 TypedArrays interleaved
 *
 * See {@link Arrays} for details on the various types of arrays.
 *
 * Note: You can generate `attributes` and `typedArrays` above by calling
 * {@link createBufferLayoutsFromArrays}
 */
function interleaveVertexData(attributes, typedArrays, arrayStride, arrayBuffer) {
    const views = new Map();
    const getView = (typedArray) => {
        const Ctor = Object.getPrototypeOf(typedArray).constructor;
        const view = views.get(Ctor);
        if (view) {
            return view;
        }
        const newView = new Ctor(arrayBuffer);
        views.set(Ctor, newView);
        return newView;
    };
    attributes.forEach((attribute, ndx) => {
        const { offset, format } = attribute;
        const { numComponents } = numComponentsAndTypeFromVertexFormat(format);
        const { data, offset: srcOffset, stride, } = getTypedArrayWithOffsetAndStride(typedArrays[ndx], numComponents);
        const view = getView(data);
        for (let i = 0; i < data.length; i += stride) {
            const ndx = i / stride;
            const dstOffset = (offset + ndx * arrayStride) / view.BYTES_PER_ELEMENT;
            const srcOff = i + srcOffset;
            const s = data.subarray(srcOff, srcOff + numComponents);
            view.set(s, dstOffset);
        }
    });
}
/**
 * Given arrays, create buffers, fills the buffers with data if provided, optionally
 * interleaves the data (the default).
 *
 * Example:
 *
 * ```js
 *  const {
 *    buffers,
 *    bufferLayouts,
 *    indexBuffer,
 *    indexFormat,
 *    numElements,
 *  } = createBuffersAndAttributesFromArrays(device, {
 *    position: [1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1],
 *    normal: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
 *    texcoord: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
 *    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23],
 *  });
 * ```
 *
 * Where `bufferLayouts` will be
 *
 * ```js
 * [
 *   {
 *     stepMode: 'vertex',
 *     arrayStride: 32,
 *     attributes: [
 *       { shaderLocation: 0, offset:  0, format: 'float32x3' },
 *       { shaderLocation: 1, offset: 12, format: 'float32x3' },
 *       { shaderLocation: 2, offset: 24, format: 'float32x2' },
 *     ],
 *   },
 * ]
 * ```
 *
 * * `buffers` will have one `GPUBuffer` of usage `GPUBufferUsage.VERTEX`
 * * `indexBuffer` will be `GPUBuffer` of usage `GPUBufferUsage.INDEX`
 * * `indexFormat` will be `uint32` (use a full spec or a typedarray of `Uint16Array` if you want 16bit indices)
 * * `numElements` will be 36 (this is either the number entries in the array named `indices` or if no
 *    indices are provided then it's the length of the first array divided by numComponents. See {@link Arrays})
 *
 * See {@link Arrays} for details on the various types of arrays.
 * Also see the cube and instancing examples.
 */
function createBuffersAndAttributesFromArrays(device, arrays, options = {}) {
    const usage = (options.usage || 0);
    const { bufferLayouts, typedArrays, } = createBufferLayoutsFromArrays(arrays, options);
    const buffers = [];
    let numElements = -1;
    let bufferNdx = 0;
    for (const { attributes, arrayStride } of bufferLayouts) {
        const attribs = attributes;
        const attrib0 = attribs[0];
        const { numComponents } = numComponentsAndTypeFromVertexFormat(attrib0.format);
        const { data: data0, stride, } = getTypedArrayWithOffsetAndStride(typedArrays[bufferNdx], numComponents);
        if (numElements < 0) {
            numElements = data0.length / stride;
        }
        const size = arrayStride * numElements;
        const buffer = device.createBuffer({
            usage: usage | GPUBufferUsage.VERTEX,
            size,
            mappedAtCreation: true,
        });
        const arrayBuffer = buffer.getMappedRange();
        if (attribs.length === 1 && arrayStride === data0.BYTES_PER_ELEMENT * numComponents) {
            const view = createTypedArrayOfSameType(data0, arrayBuffer);
            view.set(data0);
        }
        else {
            interleaveVertexData(attribs, typedArrays.slice(bufferNdx), arrayStride, arrayBuffer);
        }
        buffer.unmap();
        buffers.push(buffer);
        bufferNdx += attribs.length;
    }
    const buffersAndAttributes = {
        numElements,
        bufferLayouts,
        buffers,
    };
    const indicesEntry = Object.entries(arrays).find(([arrayName]) => isIndices(arrayName));
    if (indicesEntry) {
        const indices = makeTypedArrayFromArrayUnion(indicesEntry[1], 'indices');
        const indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | usage,
            mappedAtCreation: true,
        });
        const dst = createTypedArrayOfSameType(indices, indexBuffer.getMappedRange());
        dst.set(indices);
        indexBuffer.unmap();
        buffersAndAttributes.indexBuffer = indexBuffer;
        buffersAndAttributes.indexFormat = indices instanceof Uint16Array ? 'uint16' : 'uint32';
        buffersAndAttributes.numElements = indices.length;
    }
    return buffersAndAttributes;
}
/**
 * Calls `passEncoder.setVertexBuffer` and optionally `passEncoder.setIndexBuffer`
 * for the buffers specified in `buffersAndAttributes`.
 *
 * This is extremely simple function. It is equivalent to
 *
 * ```js
 * buffersAndAttributes.buffers.forEach((buffer, i) => {
 *   passEncoder.setVertexBuffer(firstVertexBufferIndex + i, buffer);
 * });
*
 * if (buffersAndAttributes.indexBuffer) {
 *   passEncoder.setIndexBuffer(buffersAndAttributes.indexBuffer, buffersAndAttributes.indexFormat!);
 * }
 * ```
 *
 * It exists solely for simple cases. If you have a complex case, call the passEncoder
 * yourself as appropriate.
 *
 * @param passEncoder a render pass encoder
 * @param buffersAndAttributes As returned from {@link createBuffersAndAttributesFromArrays}
 * @param firstVertexBufferIndex The first vertex buffer index. default = 0.
 */
function setVertexAndIndexBuffers(passEncoder, buffersAndAttributes, firstVertexBufferIndex = 0) {
    buffersAndAttributes.buffers.forEach((buffer, i) => {
        passEncoder.setVertexBuffer(firstVertexBufferIndex + i, buffer);
    });
    if (buffersAndAttributes.indexBuffer) {
        passEncoder.setIndexBuffer(buffersAndAttributes.indexBuffer, buffersAndAttributes.indexFormat);
    }
}
/**
 * Calls {@link setVertexAndIndexBuffers} and then calls either `draw` or `drawIndexed`
 *
 * This is an extremely simple function. See  {@link setVertexAndIndexBuffers}.
 * If you need something more complex, call pass encoder functions yourself as appropriate.
 *
 * @param passEncoder a render pass encoder
 * @param buffersAndAttributes As returned from {@link createBuffersAndAttributesFromArrays}
 */
function drawArrays(passEncoder, buffersAndAttributes) {
    setVertexAndIndexBuffers(passEncoder, buffersAndAttributes);
    if (buffersAndAttributes.indexBuffer) {
        passEncoder.drawIndexed(buffersAndAttributes.numElements);
    }
    else {
        passEncoder.draw(buffersAndAttributes.numElements);
    }
}

// [blockWidth, blockHeight, bytesPerBlock, units per TypedArray element, TypedArrayConstructor]
const kFormatInfo = {
    'rgba8unorm-srgb': [1, 1, 4, 4, Uint8Array],
    'bgra8unorm-srgb': [1, 1, 4, 4, Uint8Array],
    'rgb10a2uint': [1, 1, 4, 1, Uint32Array],
    'rgb10a2unorm': [1, 1, 4, 1, Uint32Array],
    'rg11b10ufloat': [1, 1, 4, 1, Uint32Array],
    'rgb9e5ufloat': [1, 1, 4, 1, Uint32Array],
    'stencil8': [1, 1, 1, 1, Uint8Array],
    'depth16unorm': [1, 1, 2, 1, Uint16Array],
    'depth32float': [1, 1, 4, 1, Float32Array],
    'depth24plus-stencil8': [],
    'depth32float-stencil8': [],
    'bc1-rgba-unorm': [4, 4, 8],
    'bc1-rgba-unorm-srgb': [4, 4, 8],
    'bc2-rgba-unorm': [4, 4, 16],
    'bc2-rgba-unorm-srgb': [4, 4, 16],
    'bc3-rgba-unorm': [4, 4, 16],
    'bc3-rgba-unorm-srgb': [4, 4, 16],
    'bc4-r-unorm': [4, 4, 8],
    'bc4-r-snorm': [4, 4, 8],
    'bc5-rg-unorm': [4, 4, 16],
    'bc5-rg-snorm': [4, 4, 16],
    'bc6h-rgb-ufloat': [4, 4, 16],
    'bc6h-rgb-float': [4, 4, 16],
    'bc7-rgba-unorm': [4, 4, 16],
    'bc7-rgba-unorm-srgb': [4, 4, 16],
    'etc2-rgb8unorm': [4, 4, 8],
    'etc2-rgb8unorm-srgb': [4, 4, 8],
    'etc2-rgb8a1unorm': [4, 4, 8],
    'etc2-rgb8a1unorm-srgb': [4, 4, 8],
    'etc2-rgba8unorm': [4, 4, 16],
    'etc2-rgba8unorm-srgb': [4, 4, 16],
    'eac-r11unorm': [4, 4, 8],
    'eac-r11snorm': [4, 4, 8],
    'eac-rg11unorm': [4, 4, 16],
    'eac-rg11snorm': [4, 4, 16],
    'astc-4x4-unorm': [4, 4, 16],
    'astc-4x4-unorm-srgb': [4, 4, 16],
    'astc-5x4-unorm': [5, 4, 16],
    'astc-5x4-unorm-srgb': [5, 4, 16],
    'astc-5x5-unorm': [5, 5, 16],
    'astc-5x5-unorm-srgb': [5, 5, 16],
    'astc-6x5-unorm': [6, 5, 16],
    'astc-6x5-unorm-srgb': [6, 5, 16],
    'astc-6x6-unorm': [6, 6, 16],
    'astc-6x6-unorm-srgb': [6, 6, 16],
    'astc-8x5-unorm': [8, 5, 16],
    'astc-8x5-unorm-srgb': [8, 5, 16],
    'astc-8x6-unorm': [8, 6, 16],
    'astc-8x6-unorm-srgb': [8, 6, 16],
    'astc-8x8-unorm': [8, 8, 16],
    'astc-8x8-unorm-srgb': [8, 8, 16],
    'astc-10x5-unorm': [10, 5, 16],
    'astc-10x5-unorm-srgb': [10, 5, 16],
    'astc-10x6-unorm': [10, 6, 16],
    'astc-10x6-unorm-srgb': [10, 6, 16],
    'astc-10x8-unorm': [10, 8, 16],
    'astc-10x8-unorm-srgb': [10, 8, 16],
    'astc-10x10-unorm': [10, 10, 16],
    'astc-10x10-unorm-srgb': [10, 10, 16],
    'astc-12x10-unorm': [12, 10, 16],
    'astc-12x10-unorm-srgb': [12, 10, 16],
    'astc-12x12-unorm': [12, 12, 16],
    'astc-12x12-unorm-srgb': [12, 12, 16],
};
const kFormatToTypedArray = {
    '8snorm': Int8Array,
    '8unorm': Uint8Array,
    '8sint': Int8Array,
    '8uint': Uint8Array,
    '16snorm': Int16Array,
    '16unorm': Uint16Array,
    '16sint': Int16Array,
    '16uint': Uint16Array,
    '32snorm': Int32Array,
    '32unorm': Uint32Array,
    '32sint': Int32Array,
    '32uint': Uint32Array,
    '16float': Float16Array,
    '32float': Float32Array,
};
const kTextureFormatRE = /([a-z]+)(\d+)([a-z]+)/;
function getTextureFormatInfo(format) {
    const info = kFormatInfo[format];
    if (info) {
        const [blockWidth, blockHeight, bytesPerBlock, unitsPerElement = 1, Type = Uint8Array] = info;
        if (bytesPerBlock === undefined) {
            throw new Error(`Format ${format} is not supported`);
        }
        return {
            blockWidth,
            blockHeight,
            bytesPerBlock,
            unitsPerElement,
            Type,
        };
    }
    // this is a hack! It will only work for common formats
    const [, channels, bits, typeName] = kTextureFormatRE.exec(format);
    // TODO: if the regex fails, use table for other formats?
    const numChannels = channels.length;
    const bytesPerChannel = parseInt(bits) / 8;
    const bytesPerBlock = numChannels * bytesPerChannel;
    const Type = kFormatToTypedArray[`${bits}${typeName}`] ?? Uint8Array;
    return {
        blockWidth: 1,
        blockHeight: 1,
        bytesPerBlock,
        unitsPerElement: 1,
        Type,
    };
}

function isTextureData(source) {
    const src = source;
    return isTypedArray(src.data) || Array.isArray(src.data);
}
function isTextureRawDataSource(source) {
    return isTypedArray(source) || Array.isArray(source) || isTextureData(source);
}
function toTypedArray(v, format) {
    if (isTypedArray(v)) {
        return v;
    }
    const { Type } = getTextureFormatInfo(format);
    return new Type(v);
}
function guessDimensions(width, height, numElements, dimension = '2d') {
    if (numElements % 1 !== 0) {
        throw new Error("can't guess dimensions");
    }
    if (!width && !height) {
        const size = Math.sqrt(numElements / (dimension === 'cube' ? 6 : 1));
        if (size % 1 === 0) {
            width = size;
            height = size;
        }
        else {
            width = numElements;
            height = 1;
        }
    }
    else if (!height) {
        height = numElements / width;
        if (height % 1) {
            throw new Error("can't guess dimensions");
        }
    }
    else if (!width) {
        width = numElements / height;
        if (width % 1) {
            throw new Error("can't guess dimensions");
        }
    }
    const depth = numElements / width / height;
    if (depth % 1) {
        throw new Error("can't guess dimensions");
    }
    return [width, height, depth];
}
function textureViewDimensionToDimension(viewDimension) {
    switch (viewDimension) {
        case '1d': return '1d';
        case '3d': return '3d';
        default: return '2d';
    }
}
/**
 * Gets the size of a mipLevel. Returns an array of 3 numbers [width, height, depthOrArrayLayers]
 */
function getSizeForMipFromTexture(texture, mipLevel) {
    return [
        texture.width,
        texture.height,
        texture.depthOrArrayLayers,
    ].map((v, i) => i < 3 || texture.dimension !== '3d' ? Math.max(1, Math.floor(v / 2 ** mipLevel)) : texture.depthOrArrayLayers);
}
/**
 * Uploads Data to a texture
 */
function uploadDataToTexture(device, texture, source, options) {
    const data = toTypedArray(source.data || source, texture.format);
    let dataOffset = 0;
    let localLayer = 0;
    let mipLevel = options.mipLevel ?? 0;
    while (dataOffset < data.byteLength) {
        const size = getSizeForMipFromTexture(texture, mipLevel);
        const { blockWidth, blockHeight, bytesPerBlock } = getTextureFormatInfo(texture.format);
        const blocksAcross = Math.ceil(size[0] / blockWidth);
        const blocksDown = Math.ceil(size[1] / blockHeight);
        const bytesPerRow = blocksAcross * bytesPerBlock;
        const bytesPerLayer = bytesPerRow * blocksDown;
        const numLayers = texture.dimension === '3d'
            ? size[2]
            : 1;
        size[0] = blocksAcross * blockWidth;
        size[1] = blocksDown * blockHeight;
        size[2] = numLayers;
        const origin = addOrigin3D(options.origin ?? [0, 0, 0], [0, 0, localLayer]);
        device.queue.writeTexture({ texture, origin, mipLevel }, data, {
            bytesPerRow: bytesPerBlock * blocksAcross,
            rowsPerImage: blocksDown,
            offset: dataOffset,
        }, size);
        const bytesUsed = size[2] * bytesPerLayer;
        dataOffset += bytesUsed;
        ++mipLevel;
        if (mipLevel === texture.mipLevelCount) {
            mipLevel = options.mipLevel ?? 0;
            ++localLayer;
        }
    }
}
/**
 * Copies a an array of "sources" (Video, Canvas, OffscreenCanvas, ImageBitmap, Array, TypedArray)
 * to a texture and then optionally generates mip levels
 *
 * Note that if the source is a `TypeArray`, then it will try to upload mips levels, then layers.
 * So, imagine you have a 4x4x3 2d-array r8unorm texture. If you pass in 16 bytes (4x4) it will
 * set mip level 0 layer 0 (4x4). If you pass in 24 bytes it will set mip level 0 layer 0(4x4)
 * and mip level 1 layer 0 (2x2). If you pass in 25 bytes it will set mip level 0, 1, 2, layer 0
 * If you pass in 75 bytes it would do all layers, all mip levels.
 *
 * Note that for 3d textures there are no "layers" from the POV of this function. There is mip level 0 (which is a cube)
 * and mip level 1 (which is a cube). So a '3d' 4x4x3 r8unorm texture, you're expected to provide 48 bytes for mip level 0
 * where as for '2d' 4x4x3 you're expected to provide 16 bytes for mip level 0 layer 0. If you want to provide data
 * to each layer separately then pass them in as an array
 *
 * ```js
 * // fill layer 0, mips 0
 * copySourcesToTexture(device, tex_4x4x3_r8_2d, [data16Bytes]);
 *
 * // fill layer 0, mips 0, 1, 2
 * copySourcesToTexture(device, tex_4x4x3_r8_2d, [data25Bytes]);
 *
 * // fill layer 0, mips 0, 1, 2, then layer 1, mips 0, 1, 2, then layer 2, mips 0, 1, 2
 * copySourcesToTexture(device, tex_4x4x3_r8_2d, [data75Bytes]);
 *
 * // (same as previous) fill layer 0, mips 0, 1, 2, then layer 1, mips 0, 1, 2, then layer 2, mips 0, 1, 2
 * copySourcesToTexture(device, tex_4x4x3_r8_2d, [data25Bytes, data25bytes, data25Bytes]);
 *
 * // fills layer 0, mips 0, layer 1, mips 0, layer 2, mips 0
 * copySourcesToTexture(device, tex_4x4x3_r8_2d, [data16Bytes, data16bytes, data16Bytes]);
 * ```
 *
 * This also works for compressed textures, so you can load an entire compressed texture, all mips, all layers in one call.
 * See texture-utils-tests.js for examples.
 *
 * If the source is an `Array` is it converted to a typed array that matches the format.
 *
 * * ????8snorm ????8sint -> `Int8Array`
 * * ????8unorm ????8uint -> `Uint8Array`
 * * ????16snorm ???16sint -> `Int16Array`
 * * ????16unorm ???16uint -> `Uint16Array`
 * * ????32snorm ???32sint -> `Int32Array`
 * * ????32unorm ???32uint -> `Uint32Array`
 * * ????16Float -> `Float16Array`
 * * ????32Float -> `Float32Array`
 * * rgb10a2uint, rgb10a2unorm, rg11b10ufloat, rgb8e5ufloat -> `UInt32Array`
 */
function copySourcesToTexture(device, texture, sources, options = {}) {
    let tempTexture;
    sources.forEach((source, layer) => {
        const origin = [0, 0, layer + (options.baseArrayLayer || 0)];
        if (isTextureRawDataSource(source)) {
            uploadDataToTexture(device, texture, source, { origin });
        }
        else {
            const s = source;
            // work around limit that you can't call copyExternalImageToTexture for 3d texture.
            // sse https://github.com/gpuweb/gpuweb/issues/4697 for if we can remove this
            let dstTexture = texture;
            let copyOrigin = origin;
            if (texture.dimension === '3d') {
                tempTexture = tempTexture ?? device.createTexture({
                    format: texture.format,
                    usage: texture.usage | GPUTextureUsage.COPY_SRC,
                    size: [texture.width, texture.height, 1],
                });
                dstTexture = tempTexture;
                copyOrigin = [0, 0, 0];
            }
            const { flipY, premultipliedAlpha, colorSpace } = options;
            device.queue.copyExternalImageToTexture({ source: s, flipY }, { texture: dstTexture, premultipliedAlpha, colorSpace, origin: copyOrigin }, getSizeFromSource(s, options));
            if (tempTexture) {
                const encoder = device.createCommandEncoder();
                encoder.copyTextureToTexture({ texture: tempTexture }, { texture, origin }, tempTexture);
                device.queue.submit([encoder.finish()]);
            }
        }
    });
    if (tempTexture) {
        tempTexture.destroy();
    }
    if (options.mips) {
        generateMipmap(device, texture);
    }
}
/**
 * Copies a "source" (Video, Canvas, OffscreenCanvas, ImageBitmap, Array, TypedArray)
 * to a texture and then optionally generates mip levels
 * See {@link copySourcesToTexture}
 */
function copySourceToTexture(device, texture, source, options = {}) {
    copySourcesToTexture(device, texture, [source], options);
}
/**
 * Gets the size from a source. This is to smooth out the fact that different
 * sources have a different way to get their size.
 */
function getSizeFromSource(source, options) {
    if ('videoWidth' in source && 'videoHeight' in source) {
        return [source.videoWidth, source.videoHeight, 1];
    }
    else {
        const maybeHasWidthAndHeight = source;
        let { width, height } = maybeHasWidthAndHeight;
        if (width > 0 && height > 0 && !isTextureRawDataSource(source)) {
            // this should cover Canvas, Image, ImageData, ImageBitmap, TextureCreationData
            return [width, height, 1];
        }
        if (options.size) {
            let depthOrArrayLayers;
            if (Array.isArray(options.size)) {
                [width, height, depthOrArrayLayers] = options.size;
            }
            else {
                width = options.size.width;
                height = options.size.height;
                depthOrArrayLayers = options.size.depthOrArrayLayers;
            }
            if (width > 0 && height > 0) {
                return normalizeExtent3D([width, height, depthOrArrayLayers]);
            }
        }
        const format = options.format || 'rgba8unorm';
        const { bytesPerBlock, Type } = getTextureFormatInfo(format);
        const data = isTypedArray(source) || Array.isArray(source)
            ? source
            : source.data;
        const numBytes = isTypedArray(data)
            ? data.byteLength
            : (data.length * Type.BYTES_PER_ELEMENT);
        const numElements = numBytes / bytesPerBlock;
        return guessDimensions(width, height, numElements);
    }
}
/**
 * Create a texture from an array of sources (Video, Canvas, OffscreenCanvas, ImageBitmap)
 * and optionally create mip levels. If you set `mips: true` and don't set a mipLevelCount
 * then it will automatically make the correct number of mip levels.
 *
 * Example:
 *
 * ```js
 * const texture = createTextureFromSource(
 *     device,
 *     [
 *        someCanvasOrVideoOrImageImageBitmap0,
 *        someCanvasOrVideoOrImageImageBitmap1,
 *     ],
 *     {
 *       usage: GPUTextureUsage.TEXTURE_BINDING |
 *              GPUTextureUsage.RENDER_ATTACHMENT |
 *              GPUTextureUsage.COPY_DST,
 *       mips: true,
 *     }
 * );
 * ```
 *
 * Note: If you are supporting compatibility mode you will need to pass in your
 * intended view dimension for cubemaps. Example:
 *
 * ```js
 * const texture = createTextureFromSource(
 *     device,
 *     [
 *        someCanvasOrVideoOrImageImageBitmapPosX,
 *        someCanvasOrVideoOrImageImageBitmapNegY,
 *        someCanvasOrVideoOrImageImageBitmapPosY,
 *        someCanvasOrVideoOrImageImageBitmapNegY,
 *        someCanvasOrVideoOrImageImageBitmapPosZ,
 *        someCanvasOrVideoOrImageImageBitmapNegZ,
 *     ],
 *     {
 *       usage: GPUTextureUsage.TEXTURE_BINDING |
 *              GPUTextureUsage.RENDER_ATTACHMENT |
 *              GPUTextureUsage.COPY_DST,
 *       mips: true,
 *       textureBindingViewDimension: 'cube', // <=- Required for compatibility mode
 *     }
 * );
 * ```
 */
function createTextureFromSources(device, sources, options = {}) {
    // NOTE: We assume all the sizes are the same. If they are not you'll get
    // an error.
    const size = getSizeFromSource(sources[0], options);
    size[2] = size[2] > 1 ? size[2] : sources.length;
    const textureBindingViewDimension = options.textureBindingViewDimension ?? options.viewDimension;
    const dimension = options.dimension ?? textureViewDimensionToDimension(textureBindingViewDimension);
    const format = options.format ?? 'rgba8unorm';
    const { blockWidth, blockHeight } = getTextureFormatInfo(format);
    const compressed = blockWidth > 1 || blockHeight > 1;
    const texture = device.createTexture({
        dimension,
        textureBindingViewDimension,
        format,
        mipLevelCount: options.mipLevelCount
            ? options.mipLevelCount
            : options.mips ? numMipLevels(size) : 1,
        size,
        usage: (options.usage ?? 0) |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            (compressed ? 0 : GPUTextureUsage.RENDER_ATTACHMENT),
    });
    copySourcesToTexture(device, texture, sources, options);
    return texture;
}
/**
 * Create a texture from a source (Video, Canvas, OffscreenCanvas, ImageBitmap)
 * and optionally create mip levels. If you set `mips: true` and don't set a mipLevelCount
 * then it will automatically make the correct number of mip levels.
 *
 * Example:
 *
 * ```js
 * const texture = createTextureFromSource(
 *     device,
 *     someCanvasOrVideoOrImageImageBitmap,
 *     {
 *       usage: GPUTextureUsage.TEXTURE_BINDING |
 *              GPUTextureUsage.RENDER_ATTACHMENT |
 *              GPUTextureUsage.COPY_DST,
 *       mips: true,
 *     }
 * );
 * ```
 */
function createTextureFromSource(device, source, options = {}) {
    return createTextureFromSources(device, [source], options);
}
/**
 * Load an ImageBitmap
 * @param url
 * @param options
 * @returns the loaded ImageBitmap
 */
async function loadImageBitmap(url, options = {}) {
    const res = await fetch(url);
    const blob = await res.blob();
    const opt = {
        ...options,
        ...(options.colorSpaceConversion !== undefined && { colorSpaceConversion: 'none' }),
    };
    return await createImageBitmap(blob, opt);
}
/**
 * Load images and create a texture from them, optionally generating mip levels
 *
 * Assumes all the urls reference images of the same size.
 *
 * Example:
 *
 * ```js
 * const texture = await createTextureFromImage(
 *   device,
 *   [
 *     'https://someimage1.url',
 *     'https://someimage2.url',
 *   ],
 *   {
 *     mips: true,
 *     flipY: true,
 *   },
 * );
 * ```
 */
async function createTextureFromImages(device, urls, options = {}) {
    // TODO: start once we've loaded one?
    // We need at least 1 to know the size of the texture to create
    const imgBitmaps = await Promise.all(urls.map(url => loadImageBitmap(url)));
    return createTextureFromSources(device, imgBitmaps, options);
}
/**
 * Load an image and create a texture from it, optionally generating mip levels
 *
 * Example:
 *
 * ```js
 * const texture = await createTextureFromImage(device, 'https://someimage.url', {
 *   mips: true,
 *   flipY: true,
 * });
 * ```
 */
async function createTextureFromImage(device, url, options = {}) {
    return createTextureFromImages(device, [url], options);
}

/*
 * Copyright 2023 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * A class to provide `push` on a typed array.
 *
 * example:
 *
 * ```js
 * const positions = new TypedArrayWrapper(new Float32Array(300), 3);
 * positions.push(1, 2, 3); // add a position
 * positions.push([4, 5, 6]);  // add a position
 * positions.push(new Float32Array(6)); // add 2 positions
 * const data = positions.typedArray;
 * ```
 */
class TypedArrayWrapper {
    typedArray;
    cursor = 0;
    numComponents;
    constructor(arr, numComponents) {
        this.typedArray = arr;
        this.numComponents = numComponents;
    }
    get numElements() {
        return this.typedArray.length / this.numComponents;
    }
    push(...data) {
        for (const value of data) {
            if (Array.isArray(value) || isTypedArray(value)) {
                const asArray = data;
                this.typedArray.set(asArray, this.cursor);
                this.cursor += asArray.length;
            }
            else {
                this.typedArray[this.cursor++] = value;
            }
        }
    }
    reset(index = 0) {
        this.cursor = index;
    }
}
/**
 * creates a typed array with a `push` function attached
 * so that you can easily *push* values.
 *
 * `push` can take multiple arguments. If an argument is an array each element
 * of the array will be added to the typed array.
 *
 * Example:
 *
 *     const array = createAugmentedTypedArray(3, 2, Float32Array);
 *     array.push(1, 2, 3);
 *     array.push([4, 5, 6]);
 *     // array now contains [1, 2, 3, 4, 5, 6]
 *
 * Also has `numComponents` and `numElements` properties.
 *
 * @param numComponents number of components
 * @param numElements number of elements. The total size of the array will be `numComponents * numElements`.
 * @param Type A constructor for the type. Default = `Float32Array`.
 */
function createAugmentedTypedArray(numComponents, numElements, Type) {
    return new TypedArrayWrapper(new Type(numComponents * numElements), numComponents);
}
// I couldn't figure out how to make this because TypedArrayWrapper wants a type
// but this is explicity kind of type-less.
function createAugmentedTypedArrayFromExisting(numComponents, numElements, existingArray) {
    const Ctor = existingArray.constructor;
    const array = new Ctor(numComponents * numElements);
    return new TypedArrayWrapper(array, numComponents);
}
/**
 * Creates XY quad vertices
 *
 * The default with no parameters will return a 2x2 quad with values from -1 to +1.
 * If you want a unit quad with that goes from 0 to 1 you'd call it with
 *
 *     createXYQuadVertices(1, 0.5, 0.5);
 *
 * If you want a unit quad centered above 0,0 you'd call it with
 *
 *     primitives.createXYQuadVertices(1, 0, 0.5);
 *
 * @param params
 * @param params.size the size across the quad. Defaults to 2 which means vertices will go from -1 to +1
 * @param params.xOffset the amount to offset the quad in X. Default = 0
 * @param params.yOffset the amount to offset the quad in Y. Default = 0
 * @return the created XY Quad vertices
 */
function createXYQuadVertices({ size: inSize = 2, xOffset = 0, yOffset = 0, } = {}) {
    const size = inSize * 0.5;
    return {
        position: {
            numComponents: 2,
            data: [
                xOffset + -1 * size, yOffset + -1 * size,
                xOffset + 1 * size, yOffset + -1 * size,
                xOffset + -1 * size, yOffset + 1 * size,
                xOffset + 1 * size, yOffset + 1 * size,
            ],
        },
        normal: [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ],
        texcoord: [
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ],
        indices: [0, 1, 2, 2, 1, 3],
    };
}
/**
 * Creates XZ plane vertices.
 *
 * The created plane has position, normal, and texcoord data
 *
 * @param params
 * @param params.width Width of the plane. Default = 1
 * @param params.depth Depth of the plane. Default = 1
 * @param params.subdivisionsWidth Number of steps across the plane. Default = 1
 * @param params.subdivisionsDepth Number of steps down the plane. Default = 1
 * @return The created plane vertices.
 */
function createPlaneVertices({ width = 1, depth = 1, subdivisionsWidth = 1, subdivisionsDepth = 1, } = {}) {
    const numVertices = (subdivisionsWidth + 1) * (subdivisionsDepth + 1);
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    for (let z = 0; z <= subdivisionsDepth; z++) {
        for (let x = 0; x <= subdivisionsWidth; x++) {
            const u = x / subdivisionsWidth;
            const v = z / subdivisionsDepth;
            positions.push(width * u - width * 0.5, 0, depth * v - depth * 0.5);
            normals.push(0, 1, 0);
            texcoords.push(u, v);
        }
    }
    const numVertsAcross = subdivisionsWidth + 1;
    const indices = createAugmentedTypedArray(3, subdivisionsWidth * subdivisionsDepth * 2, Uint16Array);
    for (let z = 0; z < subdivisionsDepth; z++) {
        for (let x = 0; x < subdivisionsWidth; x++) {
            // Make triangle 1 of quad.
            indices.push((z + 0) * numVertsAcross + x, (z + 1) * numVertsAcross + x, (z + 0) * numVertsAcross + x + 1);
            // Make triangle 2 of quad.
            indices.push((z + 1) * numVertsAcross + x, (z + 1) * numVertsAcross + x + 1, (z + 0) * numVertsAcross + x + 1);
        }
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
/**
 * Creates sphere vertices.
 *
 * The created sphere has position, normal, and texcoord data
 *
 * @param params
 * @param params.radius radius of the sphere. Default = 1
 * @param params.subdivisionsAxis number of steps around the sphere. Default = 24
 * @param params.subdivisionsHeight number of vertically on the sphere. Default = 12
 * @param params.startLatitudeInRadians where to start the
 *     top of the sphere. Default = 0
 * @param params.endLatitudeInRadians Where to end the
 *     bottom of the sphere. Default = π
 * @param params.startLongitudeInRadians where to start
 *     wrapping the sphere. Default = 0
 * @param params.endLongitudeInRadians where to end
 *     wrapping the sphere. Default = 2π
 * @return The created sphere vertices.
 */
function createSphereVertices({ radius = 1, subdivisionsAxis = 24, subdivisionsHeight = 12, startLatitudeInRadians = 0, endLatitudeInRadians = Math.PI, startLongitudeInRadians = 0, endLongitudeInRadians = Math.PI * 2, } = {}) {
    if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
        throw new Error('subdivisionAxis and subdivisionHeight must be > 0');
    }
    const latRange = endLatitudeInRadians - startLatitudeInRadians;
    const longRange = endLongitudeInRadians - startLongitudeInRadians;
    // We are going to generate our sphere by iterating through its
    // spherical coordinates and generating 2 triangles for each quad on a
    // ring of the sphere.
    const numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1);
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    // Generate the individual vertices in our vertex buffer.
    for (let y = 0; y <= subdivisionsHeight; y++) {
        for (let x = 0; x <= subdivisionsAxis; x++) {
            // Generate a vertex based on its spherical coordinates
            const u = x / subdivisionsAxis;
            const v = y / subdivisionsHeight;
            const theta = longRange * u + startLongitudeInRadians;
            const phi = latRange * v + startLatitudeInRadians;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            const ux = cosTheta * sinPhi;
            const uy = cosPhi;
            const uz = sinTheta * sinPhi;
            positions.push(radius * ux, radius * uy, radius * uz);
            normals.push(ux, uy, uz);
            texcoords.push(1 - u, v);
        }
    }
    const numVertsAround = subdivisionsAxis + 1;
    const indices = createAugmentedTypedArray(3, subdivisionsAxis * subdivisionsHeight * 2, Uint16Array);
    for (let x = 0; x < subdivisionsAxis; x++) {
        for (let y = 0; y < subdivisionsHeight; y++) {
            // Make triangle 1 of quad.
            indices.push((y + 0) * numVertsAround + x, (y + 0) * numVertsAround + x + 1, (y + 1) * numVertsAround + x);
            // Make triangle 2 of quad.
            indices.push((y + 1) * numVertsAround + x, (y + 0) * numVertsAround + x + 1, (y + 1) * numVertsAround + x + 1);
        }
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
/**
 * Array of the indices of corners of each face of a cube.
 */
const CUBE_FACE_INDICES = [
    [3, 7, 5, 1], // right
    [6, 2, 0, 4], // left
    [6, 7, 3, 2], // ??
    [0, 1, 5, 4], // ??
    [7, 6, 4, 5], // front
    [2, 3, 1, 0], // back
];
/**
 * Creates the vertices and indices for a cube.
 *
 * The cube is created around the origin. (-size / 2, size / 2).
 *
 * @param params
 * @param params.size width, height and depth of the cube. Default = 1
 * @return The created vertices.
 */
function createCubeVertices({ size = 1 } = {}) {
    const k = size / 2;
    const cornerVertices = [
        [-k, -k, -k],
        [+k, -k, -k],
        [-k, +k, -k],
        [+k, +k, -k],
        [-k, -k, +k],
        [+k, -k, +k],
        [-k, +k, +k],
        [+k, +k, +k],
    ];
    const faceNormals = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];
    const uvCoords = [
        [1, 0],
        [0, 0],
        [0, 1],
        [1, 1],
    ];
    const numVertices = 6 * 4;
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    const indices = createAugmentedTypedArray(3, 6 * 2, Uint16Array);
    for (let f = 0; f < 6; ++f) {
        const faceIndices = CUBE_FACE_INDICES[f];
        for (let v = 0; v < 4; ++v) {
            const position = cornerVertices[faceIndices[v]];
            const normal = faceNormals[f];
            const uv = uvCoords[v];
            // Each face needs all four vertices because the normals and texture
            // coordinates are not all the same.
            positions.push(...position);
            normals.push(...normal);
            texcoords.push(...uv);
        }
        // Two triangles make a square face.
        const offset = 4 * f;
        indices.push(offset + 0, offset + 1, offset + 2);
        indices.push(offset + 0, offset + 2, offset + 3);
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
/**
 * Creates vertices for a truncated cone, which is like a cylinder
 * except that it has different top and bottom radii. A truncated cone
 * can also be used to create cylinders and regular cones. The
 * truncated cone will be created centered about the origin, with the
 * y axis as its vertical axis. .
 *
 * @param params
 * @param params.bottomRadius Bottom radius of truncated cone. Default = 1
 * @param params.topRadius Top radius of truncated cone. Default = 0
 * @param params.height Height of truncated cone. Default = 1
 * @param params.radialSubdivisions The number of subdivisions around the
 *     truncated cone. Default = 24
 * @param params.verticalSubdivisions The number of subdivisions down the
 *     truncated cone. Default = 1
 * @param params.topCap Create top cap. Default = true.
 * @param params.bottomCap Create bottom cap. Default = true.
 * @return The created cone vertices.
 */
function createTruncatedConeVertices({ bottomRadius = 1, topRadius = 0, height = 1, radialSubdivisions = 24, verticalSubdivisions = 1, topCap = true, bottomCap = true, } = {}) {
    if (radialSubdivisions < 3) {
        throw new Error('radialSubdivisions must be 3 or greater');
    }
    if (verticalSubdivisions < 1) {
        throw new Error('verticalSubdivisions must be 1 or greater');
    }
    const extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);
    const numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    const indices = createAugmentedTypedArray(3, radialSubdivisions * (verticalSubdivisions + extra / 2) * 2, Uint16Array);
    const vertsAroundEdge = radialSubdivisions + 1;
    // The slant of the cone is constant across its surface
    const slant = Math.atan2(bottomRadius - topRadius, height);
    const cosSlant = Math.cos(slant);
    const sinSlant = Math.sin(slant);
    const start = topCap ? -2 : 0;
    const end = verticalSubdivisions + (bottomCap ? 2 : 0);
    for (let yy = start; yy <= end; ++yy) {
        let v = yy / verticalSubdivisions;
        let y = height * v;
        let ringRadius;
        if (yy < 0) {
            y = 0;
            v = 1;
            ringRadius = bottomRadius;
        }
        else if (yy > verticalSubdivisions) {
            y = height;
            v = 1;
            ringRadius = topRadius;
        }
        else {
            ringRadius = bottomRadius +
                (topRadius - bottomRadius) * (yy / verticalSubdivisions);
        }
        if (yy === -2 || yy === verticalSubdivisions + 2) {
            ringRadius = 0;
            v = 0;
        }
        y -= height / 2;
        for (let ii = 0; ii < vertsAroundEdge; ++ii) {
            const sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
            const cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
            positions.push(sin * ringRadius, y, cos * ringRadius);
            if (yy < 0) {
                normals.push(0, -1, 0);
            }
            else if (yy > verticalSubdivisions) {
                normals.push(0, 1, 0);
            }
            else if (ringRadius === 0.0) {
                normals.push(0, 0, 0);
            }
            else {
                normals.push(sin * cosSlant, sinSlant, cos * cosSlant);
            }
            texcoords.push((ii / radialSubdivisions), 1 - v);
        }
    }
    for (let yy = 0; yy < verticalSubdivisions + extra; ++yy) {
        if (yy === 1 && topCap || yy === verticalSubdivisions + extra - 2 && bottomCap) {
            continue;
        }
        for (let ii = 0; ii < radialSubdivisions; ++ii) {
            indices.push(vertsAroundEdge * (yy + 0) + 0 + ii, vertsAroundEdge * (yy + 0) + 1 + ii, vertsAroundEdge * (yy + 1) + 1 + ii);
            indices.push(vertsAroundEdge * (yy + 0) + 0 + ii, vertsAroundEdge * (yy + 1) + 1 + ii, vertsAroundEdge * (yy + 1) + 0 + ii);
        }
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
/**
 * Expands RLE data
 * @param rleData data in format of run-length, x, y, z, run-length, x, y, z
 * @param padding value to add each entry with.
 * @return the expanded rleData
 */
function expandRLEData(rleData, padding = []) {
    padding = padding || [];
    const data = [];
    for (let ii = 0; ii < rleData.length; ii += 4) {
        const runLength = rleData[ii];
        const element = rleData.slice(ii + 1, ii + 4);
        element.push(...padding);
        for (let jj = 0; jj < runLength; ++jj) {
            data.push(...element);
        }
    }
    return data;
}
/**
 * Creates 3D 'F' vertices.
 * An 'F' is useful because you can easily tell which way it is oriented.
 * The created 'F' has position, normal, texcoord, and color arrays.
 *
 * @return The created vertices.
 */
function create3DFVertices() {
    const positions = [
        // left column front
        0, 0, 0,
        0, 150, 0,
        30, 0, 0,
        0, 150, 0,
        30, 150, 0,
        30, 0, 0,
        // top rung front
        30, 0, 0,
        30, 30, 0,
        100, 0, 0,
        30, 30, 0,
        100, 30, 0,
        100, 0, 0,
        // middle rung front
        30, 60, 0,
        30, 90, 0,
        67, 60, 0,
        30, 90, 0,
        67, 90, 0,
        67, 60, 0,
        // left column back
        0, 0, 30,
        30, 0, 30,
        0, 150, 30,
        0, 150, 30,
        30, 0, 30,
        30, 150, 30,
        // top rung back
        30, 0, 30,
        100, 0, 30,
        30, 30, 30,
        30, 30, 30,
        100, 0, 30,
        100, 30, 30,
        // middle rung back
        30, 60, 30,
        67, 60, 30,
        30, 90, 30,
        30, 90, 30,
        67, 60, 30,
        67, 90, 30,
        // top
        0, 0, 0,
        100, 0, 0,
        100, 0, 30,
        0, 0, 0,
        100, 0, 30,
        0, 0, 30,
        // top rung front
        100, 0, 0,
        100, 30, 0,
        100, 30, 30,
        100, 0, 0,
        100, 30, 30,
        100, 0, 30,
        // under top rung
        30, 30, 0,
        30, 30, 30,
        100, 30, 30,
        30, 30, 0,
        100, 30, 30,
        100, 30, 0,
        // between top rung and middle
        30, 30, 0,
        30, 60, 30,
        30, 30, 30,
        30, 30, 0,
        30, 60, 0,
        30, 60, 30,
        // top of middle rung
        30, 60, 0,
        67, 60, 30,
        30, 60, 30,
        30, 60, 0,
        67, 60, 0,
        67, 60, 30,
        // front of middle rung
        67, 60, 0,
        67, 90, 30,
        67, 60, 30,
        67, 60, 0,
        67, 90, 0,
        67, 90, 30,
        // bottom of middle rung.
        30, 90, 0,
        30, 90, 30,
        67, 90, 30,
        30, 90, 0,
        67, 90, 30,
        67, 90, 0,
        // front of bottom
        30, 90, 0,
        30, 150, 30,
        30, 90, 30,
        30, 90, 0,
        30, 150, 0,
        30, 150, 30,
        // bottom
        0, 150, 0,
        0, 150, 30,
        30, 150, 30,
        0, 150, 0,
        30, 150, 30,
        30, 150, 0,
        // left side
        0, 0, 0,
        0, 0, 30,
        0, 150, 30,
        0, 0, 0,
        0, 150, 30,
        0, 150, 0,
    ];
    const texcoords = [
        // left column front
        0.22, 0.19,
        0.22, 0.79,
        0.34, 0.19,
        0.22, 0.79,
        0.34, 0.79,
        0.34, 0.19,
        // top rung front
        0.34, 0.19,
        0.34, 0.31,
        0.62, 0.19,
        0.34, 0.31,
        0.62, 0.31,
        0.62, 0.19,
        // middle rung front
        0.34, 0.43,
        0.34, 0.55,
        0.49, 0.43,
        0.34, 0.55,
        0.49, 0.55,
        0.49, 0.43,
        // left column back
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
        // top rung back
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
        // middle rung back
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
        // top
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1,
        // top rung front
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1,
        // under top rung
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0,
        // between top rung and middle
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,
        // top of middle rung
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,
        // front of middle rung
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,
        // bottom of middle rung.
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0,
        // front of bottom
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,
        // bottom
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0,
        // left side
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0,
    ];
    const normals = expandRLEData([
        // left column front
        // top rung front
        // middle rung front
        18, 0, 0, 1,
        // left column back
        // top rung back
        // middle rung back
        18, 0, 0, -1,
        // top
        6, 0, 1, 0,
        // top rung front
        6, 1, 0, 0,
        // under top rung
        6, 0, -1, 0,
        // between top rung and middle
        6, 1, 0, 0,
        // top of middle rung
        6, 0, 1, 0,
        // front of middle rung
        6, 1, 0, 0,
        // bottom of middle rung.
        6, 0, -1, 0,
        // front of bottom
        6, 1, 0, 0,
        // bottom
        6, 0, -1, 0,
        // left side
        6, -1, 0, 0,
    ]);
    const colors = expandRLEData([
        // left column front
        // top rung front
        // middle rung front
        18, 200, 70, 120,
        // left column back
        // top rung back
        // middle rung back
        18, 80, 70, 200,
        // top
        6, 70, 200, 210,
        // top rung front
        6, 200, 200, 70,
        // under top rung
        6, 210, 100, 70,
        // between top rung and middle
        6, 210, 160, 70,
        // top of middle rung
        6, 70, 180, 210,
        // front of middle rung
        6, 100, 70, 210,
        // bottom of middle rung.
        6, 76, 210, 100,
        // front of bottom
        6, 140, 210, 80,
        // bottom
        6, 90, 130, 110,
        // left side
        6, 160, 160, 220,
    ], [255]);
    const numVerts = positions.length / 3;
    const arrays = {
        position: createAugmentedTypedArray(3, numVerts, Float32Array),
        texcoord: createAugmentedTypedArray(2, numVerts, Float32Array),
        normal: createAugmentedTypedArray(3, numVerts, Float32Array),
        color: createAugmentedTypedArray(4, numVerts, Uint8Array),
        indices: createAugmentedTypedArray(3, numVerts / 3, Uint16Array),
    };
    arrays.position.push(positions);
    arrays.texcoord.push(texcoords);
    arrays.normal.push(normals);
    arrays.color.push(colors);
    for (let ii = 0; ii < numVerts; ++ii) {
        arrays.indices.push(ii);
    }
    return Object.fromEntries(Object.entries(arrays).map(([k, v]) => [k, v.typedArray]));
}
/**
 * Creates cylinder vertices. The cylinder will be created around the origin
 * along the y-axis.
 *
 * @param params
 * @param params.radius Radius of cylinder. Default = 1
 * @param params.height Height of cylinder. Default = 1
 * @param params.radialSubdivisions The number of subdivisions around the cylinder. Default = 24
 * @param params.verticalSubdivisions The number of subdivisions down the cylinder. Default = 1
 * @param params.topCap Create top cap. Default = true.
 * @param params.bottomCap Create bottom cap. Default = true.
 * @return The created vertices.
 */
function createCylinderVertices({ radius = 1, height = 1, radialSubdivisions = 24, verticalSubdivisions = 1, topCap = true, bottomCap = true, } = {}) {
    return createTruncatedConeVertices({
        bottomRadius: radius,
        topRadius: radius,
        height,
        radialSubdivisions,
        verticalSubdivisions,
        topCap,
        bottomCap,
    });
}
/**
 * Creates vertices for a torus
 *
 * @param params
 * @param params.radius radius of center of torus circle. Default = 1
 * @param params.thickness radius of torus ring. Default = 0.24
 * @param params.radialSubdivisions The number of subdivisions around the torus. Default = 24
 * @param params.bodySubdivisions The number of subdivisions around the body torus. Default = 12
 * @param params.startAngle start angle in radians. Default = 0.
 * @param params.endAngle end angle in radians. Default = Math.PI * 2.
 * @return The created vertices.
 */
function createTorusVertices({ radius = 1, thickness = 0.24, radialSubdivisions = 24, bodySubdivisions = 12, startAngle = 0, endAngle = Math.PI * 2, } = {}) {
    if (radialSubdivisions < 3) {
        throw new Error('radialSubdivisions must be 3 or greater');
    }
    if (bodySubdivisions < 3) {
        throw new Error('verticalSubdivisions must be 3 or greater');
    }
    const range = endAngle - startAngle;
    const radialParts = radialSubdivisions + 1;
    const bodyParts = bodySubdivisions + 1;
    const numVertices = radialParts * bodyParts;
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    const indices = createAugmentedTypedArray(3, (radialSubdivisions) * (bodySubdivisions) * 2, Uint16Array);
    for (let slice = 0; slice < bodyParts; ++slice) {
        const v = slice / bodySubdivisions;
        const sliceAngle = v * Math.PI * 2;
        const sliceSin = Math.sin(sliceAngle);
        const ringRadius = radius + sliceSin * thickness;
        const ny = Math.cos(sliceAngle);
        const y = ny * thickness;
        for (let ring = 0; ring < radialParts; ++ring) {
            const u = ring / radialSubdivisions;
            const ringAngle = startAngle + u * range;
            const xSin = Math.sin(ringAngle);
            const zCos = Math.cos(ringAngle);
            const x = xSin * ringRadius;
            const z = zCos * ringRadius;
            const nx = xSin * sliceSin;
            const nz = zCos * sliceSin;
            positions.push(x, y, z);
            normals.push(nx, ny, nz);
            texcoords.push(u, 1 - v);
        }
    }
    for (let slice = 0; slice < bodySubdivisions; ++slice) {
        for (let ring = 0; ring < radialSubdivisions; ++ring) {
            const nextRingIndex = 1 + ring;
            const nextSliceIndex = 1 + slice;
            indices.push(radialParts * slice + ring, radialParts * nextSliceIndex + ring, radialParts * slice + nextRingIndex);
            indices.push(radialParts * nextSliceIndex + ring, radialParts * nextSliceIndex + nextRingIndex, radialParts * slice + nextRingIndex);
        }
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
/**
 * Creates disc vertices. The disc will be in the xz plane, centered at
 * the origin. When creating, at least 3 divisions, or pie
 * pieces, need to be specified, otherwise the triangles making
 * up the disc will be degenerate. You can also specify the
 * number of radial pieces `stacks`. A value of 1 for
 * stacks will give you a simple disc of pie pieces.  If you
 * want to create an annulus you can set `innerRadius` to a
 * value > 0. Finally, `stackPower` allows you to have the widths
 * increase or decrease as you move away from the center. This
 * is particularly useful when using the disc as a ground plane
 * with a fixed camera such that you don't need the resolution
 * of small triangles near the perimeter. For example, a value
 * of 2 will produce stacks whose outside radius increases with
 * the square of the stack index. A value of 1 will give uniform
 * stacks.
 *
 * @param params
 * @param params.radius Radius of the ground plane. Default = 1
 * @param params.divisions Number of triangles in the ground plane (at least 3). Default = 24
 * @param params.stacks Number of radial divisions. Default = 1
 * @param params.innerRadius Default = 0
 * @param params.stackPower Power to raise stack size to for decreasing width. Default = 1
 * @return The created vertices.
 */
function createDiscVertices({ radius = 1, divisions = 24, stacks = 1, innerRadius = 0, stackPower = 1, } = {}) {
    if (divisions < 3) {
        throw new Error('divisions must be at least 3');
    }
    // Note: We don't share the center vertex because that would
    // mess up texture coordinates.
    const numVertices = (divisions + 1) * (stacks + 1);
    const positions = createAugmentedTypedArray(3, numVertices, Float32Array);
    const normals = createAugmentedTypedArray(3, numVertices, Float32Array);
    const texcoords = createAugmentedTypedArray(2, numVertices, Float32Array);
    const indices = createAugmentedTypedArray(3, stacks * divisions * 2, Uint16Array);
    let firstIndex = 0;
    const radiusSpan = radius - innerRadius;
    const pointsPerStack = divisions + 1;
    // Build the disk one stack at a time.
    for (let stack = 0; stack <= stacks; ++stack) {
        const stackRadius = innerRadius + radiusSpan * Math.pow(stack / stacks, stackPower);
        for (let i = 0; i <= divisions; ++i) {
            const theta = 2.0 * Math.PI * i / divisions;
            const x = stackRadius * Math.cos(theta);
            const z = stackRadius * Math.sin(theta);
            positions.push(x, 0, z);
            normals.push(0, 1, 0);
            texcoords.push(1 - (i / divisions), stack / stacks);
            if (stack > 0 && i !== divisions) {
                // a, b, c and d are the indices of the vertices of a quad.  unless
                // the current stack is the one closest to the center, in which case
                // the vertices a and b connect to the center vertex.
                const a = firstIndex + (i + 1);
                const b = firstIndex + i;
                const c = firstIndex + i - pointsPerStack;
                const d = firstIndex + (i + 1) - pointsPerStack;
                // Make a quad of the vertices a, b, c, d.
                indices.push(a, b, c);
                indices.push(a, c, d);
            }
        }
        firstIndex += divisions + 1;
    }
    return {
        position: positions.typedArray,
        normal: normals.typedArray,
        texcoord: texcoords.typedArray,
        indices: indices.typedArray,
    };
}
function allButIndices(name) {
    return name !== "indices";
}
/**
 * Given indexed vertices creates a new set of vertices un-indexed by expanding the vertices by index.
 */
function deindex(arrays) {
    const indicesP = arrays.indices;
    const newVertices = {};
    const indices = makeTypedArrayFromArrayUnion(indicesP, 'indices');
    const numElements = indices.length;
    function expandToUnindexed(channel) {
        const srcBuffer = makeTypedArrayFromArrayUnion(arrays[channel], channel);
        const numComponents = getNumComponents(srcBuffer, channel);
        const dstBuffer = createAugmentedTypedArrayFromExisting(numComponents, numElements, srcBuffer);
        for (let ii = 0; ii < numElements; ++ii) {
            const ndx = indices[ii];
            const offset = ndx * numComponents;
            for (let jj = 0; jj < numComponents; ++jj) {
                dstBuffer.push(srcBuffer[offset + jj]);
            }
        }
        newVertices[channel] = dstBuffer.typedArray;
    }
    Object.keys(arrays).filter(allButIndices).forEach(expandToUnindexed);
    return newVertices;
}
// I don't want to pull in a whole math library
const normalize = ([x, y, z]) => {
    const len = x * x + y * y + z * z;
    return new Float32Array([x / len, y / len, z / len]);
};
const subtract = (a, b) => {
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; ++i) {
        r[i] = a[i] - b[i];
    }
    return r;
};
const cross = (a, b) => {
    const r = new Float32Array(a.length);
    r[0] = a[1] * b[2] - a[2] * b[1];
    r[1] = a[2] * b[0] - a[0] * b[2];
    r[2] = a[0] * b[1] - a[1] * b[0];
    return r;
};
/**
 * Generate triangle normals from positions.
 * Assumes every 3 values is a position and every 3 positions come from the same triangle
 */
function generateTriangleNormals(positions) {
    const normals = new Float32Array(positions.length);
    for (let ii = 0; ii < positions.length; ii += 9) {
        // pull out the 3 positions for this triangle
        const p0 = positions.subarray(ii, ii + 3);
        const p1 = positions.subarray(ii + 3, ii + 6);
        const p2 = positions.subarray(ii + 6, ii + 9);
        const n0 = normalize(subtract(p0, p1));
        const n1 = normalize(subtract(p0, p2));
        const n = cross(n0, n1);
        // copy them back in
        normals.set(n, ii);
        normals.set(n, ii + 3);
        normals.set(n, ii + 6);
    }
    return normals;
}

var primitives = {
    __proto__: null,
    TypedArrayWrapper: TypedArrayWrapper,
    create3DFVertices: create3DFVertices,
    createCubeVertices: createCubeVertices,
    createCylinderVertices: createCylinderVertices,
    createDiscVertices: createDiscVertices,
    createPlaneVertices: createPlaneVertices,
    createSphereVertices: createSphereVertices,
    createTorusVertices: createTorusVertices,
    createTruncatedConeVertices: createTruncatedConeVertices,
    createXYQuadVertices: createXYQuadVertices,
    deindex: deindex,
    generateTriangleNormals: generateTriangleNormals
};

export { TypedArrayViewGenerator, copySourceToTexture, copySourcesToTexture, createBufferLayoutsFromArrays, createBuffersAndAttributesFromArrays, createTextureFromImage, createTextureFromImages, createTextureFromSource, createTextureFromSources, drawArrays, generateMipmap, getNumComponents, getSizeAndAlignmentOfUnsizedArrayElement, getSizeForMipFromTexture, getSizeFromSource, guessTextureBindingViewDimensionForTexture, interleaveVertexData, isTypedArray, loadImageBitmap, makeBindGroupLayoutDescriptors, makeShaderDataDefinitions, makeStructuredView, makeTypedArrayFromArrayUnion, makeTypedArrayViews, normalizeGPUExtent3D, numMipLevels, primitives, setIntrinsicsToView, setStructuredValues, setStructuredView, setTypedValues, setVertexAndIndexBuffers, subarray };
//# sourceMappingURL=webgpu-utils.module.js.map
