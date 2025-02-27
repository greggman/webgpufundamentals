/* webgpu-utils@1.9.6, license MIT */
const roundUpToMultipleOf = (v, multiple) => (((v + multiple - 1) / multiple) | 0) * multiple;
function keysOf(obj) {
    return Object.keys(obj);
}
function range(count, fn) {
    return new Array(count).fill(0).map((_, i) => fn(i));
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
// TODO: fix better?
const isTypedArray = (arr) => arr && typeof arr.length === 'number' && arr.buffer instanceof ArrayBuffer && typeof arr.byteLength === 'number';

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
        const { View, align } = kWGSLTypeInfo[type];
        const isArray = numElements !== undefined;
        const sizeInBytes = isArray
            ? roundUpToMultipleOf(size, align)
            : size;
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

class e{constructor(e,t){this.name=e,this.attributes=t,this.size=0;}get isArray(){return  false}get isStruct(){return  false}get isTemplate(){return  false}}class t{constructor(e,t,n){this.name=e,this.type=t,this.attributes=n,this.offset=0,this.size=0;}get isArray(){return this.type.isArray}get isStruct(){return this.type.isStruct}get isTemplate(){return this.type.isTemplate}get align(){return this.type.isStruct?this.type.align:0}get members(){return this.type.isStruct?this.type.members:null}get format(){return this.type.isArray||this.type.isTemplate?this.type.format:null}get count(){return this.type.isArray?this.type.count:0}get stride(){return this.type.isArray?this.type.stride:this.size}}class n extends e{constructor(e,t){super(e,t),this.members=[],this.align=0,this.startLine=-1,this.endLine=-1,this.inUse=false;}get isStruct(){return  true}}class s extends e{constructor(e,t){super(e,t),this.count=0,this.stride=0;}get isArray(){return  true}}class r extends e{constructor(e,t,n,s){super(e,n),this.format=t,this.access=s;}get isTemplate(){return  true}}var a,i,o,u,l;(e=>{e[e.Uniform=0]='Uniform',e[e.Storage=1]='Storage',e[e.Texture=2]='Texture',e[e.Sampler=3]='Sampler',e[e.StorageTexture=4]='StorageTexture';})(a||(a={}));class c{constructor(e,t,n,s,r,a,i){this.name=e,this.type=t,this.group=n,this.binding=s,this.attributes=r,this.resourceType=a,this.access=i;}get isArray(){return this.type.isArray}get isStruct(){return this.type.isStruct}get isTemplate(){return this.type.isTemplate}get size(){return this.type.size}get align(){return this.type.isStruct?this.type.align:0}get members(){return this.type.isStruct?this.type.members:null}get format(){return this.type.isArray||this.type.isTemplate?this.type.format:null}get count(){return this.type.isArray?this.type.count:0}get stride(){return this.type.isArray?this.type.stride:this.size}}class h{constructor(e,t){this.name=e,this.type=t;}}class f{constructor(e,t,n,s){this.name=e,this.type=t,this.locationType=n,this.location=s,this.interpolation=null;}}class p{constructor(e,t,n,s){this.name=e,this.type=t,this.locationType=n,this.location=s;}}class m{constructor(e,t,n,s){this.name=e,this.type=t,this.attributes=n,this.id=s;}}class d{constructor(e,t,n){this.name=e,this.type=t,this.attributes=n;}}class _{constructor(e,t=null,n){this.stage=null,this.inputs=[],this.outputs=[],this.arguments=[],this.returnType=null,this.resources=[],this.overrides=[],this.startLine=-1,this.endLine=-1,this.inUse=false,this.calls=new Set,this.name=e,this.stage=t,this.attributes=n;}}class v{constructor(){this.vertex=[],this.fragment=[],this.compute=[];}}class x{constructor(){this.constants=new Map,this.aliases=new Map,this.structs=new Map;}}class g{constructor(){this.id=g._id++,this.line=0;}get isAstNode(){return  true}get astNodeType(){return ''}constEvaluate(e,t){throw new Error('Cannot evaluate node')}constEvaluateString(e){return this.constEvaluate(e).toString()}search(e){}searchBlock(e,t){if(e){t(y.instance);for(const n of e)n instanceof Array?this.searchBlock(n,t):n.search(t);t(w.instance);}}}g._id=0;class y extends g{}y.instance=new y;class w extends g{}w.instance=new w;class b extends g{constructor(){super();}}class k extends b{constructor(e,t,n,s,r,a){super(),this.calls=new Set,this.name=e,this.args=t,this.returnType=n,this.body=s,this.startLine=r,this.endLine=a;}get astNodeType(){return 'function'}search(e){this.searchBlock(this.body,e);}}class I extends b{constructor(e){super(),this.expression=e;}get astNodeType(){return 'staticAssert'}search(e){this.expression.search(e);}}class T extends b{constructor(e,t){super(),this.condition=e,this.body=t;}get astNodeType(){return 'while'}search(e){this.condition.search(e),this.searchBlock(this.body,e);}}class S extends b{constructor(e){super(),this.body=e;}get astNodeType(){return 'continuing'}search(e){this.searchBlock(this.body,e);}}class E extends b{constructor(e,t,n,s){super(),this.init=e,this.condition=t,this.increment=n,this.body=s;}get astNodeType(){return 'for'}search(e){var t,n,s;null===(t=this.init)||undefined===t||t.search(e),null===(n=this.condition)||undefined===n||n.search(e),null===(s=this.increment)||undefined===s||s.search(e),this.searchBlock(this.body,e);}}class A extends b{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'var'}search(e){var t;e(this),null===(t=this.value)||undefined===t||t.search(e);}}class $ extends b{constructor(e,t,n){super(),this.attributes=null,this.name=e,this.type=t,this.value=n;}get astNodeType(){return 'override'}search(e){var t;null===(t=this.value)||undefined===t||t.search(e);}}class V extends b{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'let'}search(e){var t;e(this),null===(t=this.value)||undefined===t||t.search(e);}}class N extends b{constructor(e,t,n,s,r){super(),this.attributes=null,this.name=e,this.type=t,this.storage=n,this.access=s,this.value=r;}get astNodeType(){return 'const'}constEvaluate(e,t){return this.value.constEvaluate(e,t)}search(e){var t;e(this),null===(t=this.value)||undefined===t||t.search(e);}}(e=>{e.increment='++',e.decrement='--';})(i||(i={})),(e=>{e.parse=function(t){const n=t;if('parse'==n)throw new Error('Invalid value for IncrementOperator');return e[n]};})(i||(i={}));class L extends b{constructor(e,t){super(),this.operator=e,this.variable=t;}get astNodeType(){return 'increment'}search(e){this.variable.search(e);}}(e=>{e.assign='=',e.addAssign='+=',e.subtractAssin='-=',e.multiplyAssign='*=',e.divideAssign='/=',e.moduloAssign='%=',e.andAssign='&=',e.orAssign='|=',e.xorAssign='^=',e.shiftLeftAssign='<<=',e.shiftRightAssign='>>=';})(o||(o={})),(e=>{e.parse=function(e){const t=e;if('parse'==t)throw new Error('Invalid value for AssignOperator');return t};})(o||(o={}));class O extends b{constructor(e,t,n){super(),this.operator=e,this.variable=t,this.value=n;}get astNodeType(){return 'assign'}search(e){this.variable.search(e),this.value.search(e);}}class D extends b{constructor(e,t){super(),this.name=e,this.args=t;}get astNodeType(){return 'call'}search(e){for(const t of this.args)t.search(e);e(this);}}class C extends b{constructor(e,t){super(),this.body=e,this.continuing=t;}get astNodeType(){return 'loop'}}class M extends b{constructor(e,t){super(),this.condition=e,this.cases=t;}get astNodeType(){return 'switch'}}class F extends b{constructor(e,t,n,s){super(),this.condition=e,this.body=t,this.elseif=n,this.else=s;}get astNodeType(){return 'if'}search(e){this.condition.search(e),this.searchBlock(this.body,e),this.searchBlock(this.elseif,e),this.searchBlock(this.else,e);}}class U extends b{constructor(e){super(),this.value=e;}get astNodeType(){return 'return'}search(e){var t;null===(t=this.value)||undefined===t||t.search(e);}}class q extends b{constructor(e){super(),this.name=e;}get astNodeType(){return 'enable'}}class B extends b{constructor(e){super(),this.extensions=e;}get astNodeType(){return 'requires'}}class z extends b{constructor(e,t){super(),this.severity=e,this.rule=t;}get astNodeType(){return 'diagnostic'}}class R extends b{constructor(e,t){super(),this.name=e,this.type=t;}get astNodeType(){return 'alias'}}class G extends b{constructor(){super();}get astNodeType(){return 'discard'}}class W extends b{constructor(){super(),this.condition=null,this.loopId=-1;}get astNodeType(){return 'break'}}class P extends b{constructor(){super(),this.loopId=-1;}get astNodeType(){return 'continue'}}class X extends b{constructor(e){super(),this.attributes=null,this.name=e;}get astNodeType(){return 'type'}get isStruct(){return  false}get isArray(){return  false}static maxFormatType(e){let t=e[0];if('f32'===t.name)return t;for(let n=1;n<e.length;++n){const s=X._priority.get(t.name);X._priority.get(e[n].name)<s&&(t=e[n]);}return 'x32'===t.name?X.i32:t}}X.x32=new X('x32'),X.f32=new X('f32'),X.i32=new X('i32'),X.u32=new X('u32'),X.f16=new X('f16'),X.bool=new X('bool'),X._priority=new Map([['f32',0],['f16',1],['u32',2],['i32',3],['x32',3]]);class Z extends X{constructor(e,t,n,s){super(e),this.members=t,this.startLine=n,this.endLine=s;}get astNodeType(){return 'struct'}get isStruct(){return  true}getMemberIndex(e){for(let t=0;t<this.members.length;t++)if(this.members[t].name==e)return t;return  -1}}class j extends X{constructor(e,t,n){super(e),this.format=t,this.access=n;}get astNodeType(){return 'template'}}j.vec2f=new j('vec2',X.f32,null),j.vec3f=new j('vec3',X.f32,null),j.vec4f=new j('vec4',X.f32,null),j.vec2i=new j('vec2',X.i32,null),j.vec3i=new j('vec3',X.i32,null),j.vec4i=new j('vec4',X.i32,null),j.vec2u=new j('vec2',X.u32,null),j.vec3u=new j('vec3',X.u32,null),j.vec4u=new j('vec4',X.u32,null),j.vec2h=new j('vec2',X.f16,null),j.vec3h=new j('vec3',X.f16,null),j.vec4h=new j('vec4',X.f16,null),j.vec2b=new j('vec2',X.bool,null),j.vec3b=new j('vec3',X.bool,null),j.vec4b=new j('vec4',X.bool,null),j.mat2x2f=new j('mat2x2',X.f32,null),j.mat2x3f=new j('mat2x3',X.f32,null),j.mat2x4f=new j('mat2x4',X.f32,null),j.mat3x2f=new j('mat3x2',X.f32,null),j.mat3x3f=new j('mat3x3',X.f32,null),j.mat3x4f=new j('mat3x4',X.f32,null),j.mat4x2f=new j('mat4x2',X.f32,null),j.mat4x3f=new j('mat4x3',X.f32,null),j.mat4x4f=new j('mat4x4',X.f32,null),j.mat2x2h=new j('mat2x2',X.f16,null),j.mat2x3h=new j('mat2x3',X.f16,null),j.mat2x4h=new j('mat2x4',X.f16,null),j.mat3x2h=new j('mat3x2',X.f16,null),j.mat3x3h=new j('mat3x3',X.f16,null),j.mat3x4h=new j('mat3x4',X.f16,null),j.mat4x2h=new j('mat4x2',X.f16,null),j.mat4x3h=new j('mat4x3',X.f16,null),j.mat4x4h=new j('mat4x4',X.f16,null);class Q extends X{constructor(e,t,n,s){super(e),this.storage=t,this.type=n,this.access=s;}get astNodeType(){return 'pointer'}}class Y extends X{constructor(e,t,n,s){super(e),this.attributes=t,this.format=n,this.count=s;}get astNodeType(){return 'array'}get isArray(){return  true}}class K extends X{constructor(e,t,n){super(e),this.format=t,this.access=n;}get astNodeType(){return 'sampler'}}class H extends g{constructor(){super(),this.postfix=null;}}class J extends H{constructor(e){super(),this.value=e;}get astNodeType(){return 'stringExpr'}toString(){return this.value}constEvaluateString(){return this.value}}class ee extends H{constructor(e,t){super(),this.type=e,this.args=t;}get astNodeType(){return 'createExpr'}search(e){if(e(this),this.args)for(const t of this.args)t.search(e);}constEvaluate(e,t){return t&&(t[0]=this.type),e.evalExpression(this,e.context)}}class te extends H{constructor(e,t){super(),this.cachedReturnValue=null,this.name=e,this.args=t;}get astNodeType(){return 'callExpr'}setCachedReturnValue(e){this.cachedReturnValue=e;}get isBuiltin(){return te.builtinFunctionNames.has(this.name)}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){for(const t of this.args)t.search(e);e(this);}}te.builtinFunctionNames=new Set(['all','all','any','select','arrayLength','abs','acos','acosh','asin','asinh','atan','atanh','atan2','ceil','clamp','cos','cosh','countLeadingZeros','countOneBits','countTrailingZeros','cross','degrees','determinant','distance','dot','dot4U8Packed','dot4I8Packed','exp','exp2','extractBits','faceForward','firstLeadingBit','firstTrailingBit','floor','fma','fract','frexp','insertBits','inverseSqrt','ldexp','length','log','log2','max','min','mix','modf','normalize','pow','quantizeToF16','radians','reflect','refract','reverseBits','round','saturate','sign','sin','sinh','smoothStep','sqrt','step','tan','tanh','transpose','trunc','dpdx','dpdxCoarse','dpdxFine','dpdy','dpdyCoarse','dpdyFine','fwidth','fwidthCoarse','fwidthFine','textureDimensions','textureGather','textureGatherCompare','textureLoad','textureNumLayers','textureNumLevels','textureNumSamples','textureSample','textureSampleBias','textureSampleCompare','textureSampleCompareLevel','textureSampleGrad','textureSampleLevel','textureSampleBaseClampToEdge','textureStore','atomicLoad','atomicStore','atomicAdd','atomicSub','atomicMax','atomicMin','atomicAnd','atomicOr','atomicXor','atomicExchange','atomicCompareExchangeWeak','pack4x8snorm','pack4x8unorm','pack4xI8','pack4xU8','pack4x8Clamp','pack4xU8Clamp','pack2x16snorm','pack2x16unorm','pack2x16float','unpack4x8snorm','unpack4x8unorm','unpack4xI8','unpack4xU8','unpack2x16snorm','unpack2x16unorm','unpack2x16float','storageBarrier','textureBarrier','workgroupBarrier','workgroupUniformLoad','subgroupAdd','subgroupExclusiveAdd','subgroupInclusiveAdd','subgroupAll','subgroupAnd','subgroupAny','subgroupBallot','subgroupBroadcast','subgroupBroadcastFirst','subgroupElect','subgroupMax','subgroupMin','subgroupMul','subgroupExclusiveMul','subgroupInclusiveMul','subgroupOr','subgroupShuffle','subgroupShuffleDown','subgroupShuffleUp','subgroupShuffleXor','subgroupXor','quadBroadcast','quadSwapDiagonal','quadSwapX','quadSwapY']);class ne extends H{constructor(e){super(),this.name=e;}get astNodeType(){return 'varExpr'}search(e){e(this),this.postfix&&this.postfix.search(e);}constEvaluate(e,t){return e.evalExpression(this,e.context)}}class se extends H{constructor(e,t){super(),this.name=e,this.initializer=t;}get astNodeType(){return 'constExpr'}constEvaluate(e,t){if(this.initializer){const t=e.evalExpression(this.initializer,e.context);return null!==t&&this.postfix?t.getDataValue(e,this.postfix,e.context):t}return null}search(e){this.initializer.search(e);}}class re extends H{constructor(e,t){super(),this.value=e,this.type=t;}get astNodeType(){return 'literalExpr'}constEvaluate(e,t){return undefined!==t&&(t[0]=this.type),this.value}get isScalar(){return this.value instanceof be}get isVector(){return this.value instanceof Ie||this.value instanceof Te}get scalarValue(){return this.value instanceof be?this.value.value:(console.error('Value is not scalar.'),0)}get vectorValue(){return this.value instanceof Ie||this.value instanceof Te?this.value.value:(console.error('Value is not a vector or matrix.'),[])}}class ae extends H{constructor(e,t){super(),this.type=e,this.value=t;}get astNodeType(){return 'bitcastExpr'}search(e){this.value.search(e);}}class oe extends H{constructor(e){super(),this.contents=e;}get astNodeType(){return 'groupExpr'}constEvaluate(e,t){return this.contents[0].constEvaluate(e,t)}search(e){this.searchBlock(this.contents,e);}}class ue extends H{constructor(e){super(),this.index=e;}search(e){this.index.search(e);}}class le extends H{constructor(){super();}}class ce extends le{constructor(e,t){super(),this.operator=e,this.right=t;}get astNodeType(){return 'unaryOp'}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){this.right.search(e);}}class he extends le{constructor(e,t,n){super(),this.operator=e,this.left=t,this.right=n;}get astNodeType(){return 'binaryOp'}_getPromotedType(e,t){return e.name===t.name?e:'f32'===e.name||'f32'===t.name?X.f32:'u32'===e.name||'u32'===t.name?X.u32:X.i32}constEvaluate(e,t){return e.evalExpression(this,e.context)}search(e){this.left.search(e),this.right.search(e);}}class fe extends g{constructor(e){super(),this.body=e;}}class pe extends H{constructor(){super();}get astNodeType(){return 'default'}}class me extends fe{constructor(e,t){super(t),this.selectors=e;}get astNodeType(){return 'case'}search(e){this.searchBlock(this.body,e);}}class de extends fe{constructor(e){super(e);}get astNodeType(){return 'default'}search(e){this.searchBlock(this.body,e);}}class _e extends g{constructor(e,t,n){super(),this.name=e,this.type=t,this.attributes=n;}get astNodeType(){return 'argument'}}class ve extends g{constructor(e,t){super(),this.condition=e,this.body=t;}get astNodeType(){return 'elseif'}search(e){this.condition.search(e),this.searchBlock(this.body,e);}}class xe extends g{constructor(e,t,n){super(),this.name=e,this.type=t,this.attributes=n;}get astNodeType(){return 'member'}}class ge extends g{constructor(e,t){super(),this.name=e,this.value=t;}get astNodeType(){return 'attribute'}}class ye{constructor(e){this.typeInfo=e;}setDataValue(e,t,n,s){console.error('SetDataValue: Not implemented',t,n);}getDataValue(e,t,n){return console.error('GetDataValue: Not implemented',t),null}toString(){return `<${this.typeInfo.name}>`}}class we extends ye{constructor(){super(new e('void',null));}toString(){return 'void'}}we.void=new we;class be extends ye{constructor(e,t){super(t),'i32'===this.typeInfo.name||'u32'===this.typeInfo.name?e=Math.floor(e):'bool'===this.typeInfo.name&&(e=e?1:0),this.value=e;}setDataValue(e,t,n,s){n?console.error('SetDataValue: Scalar data does not support postfix',n):t instanceof be?(t.value,'i32'===this.typeInfo.name||'u32'===this.typeInfo.name||this.typeInfo.name,this.value=t.value):console.error('SetDataValue: Invalid value',t);}getDataValue(e,t,n){return t?(console.error('GetDataValue: Scalar data does not support postfix',t),null):this}toString(){return `${this.value}`}}function ke(e,t,n){const s=t.length;return 2===s?'f32'===n?new Ie(t,e.getTypeInfo('vec2f')):'i32'===n?new Ie(t,e.getTypeInfo('vec2i')):'u32'===n?new Ie(t,e.getTypeInfo('vec2u')):'f16'===n?new Ie(t,e.getTypeInfo('vec2h')):(console.error(`GetDataValue: Unknown format ${n}`),null):3===s?'f32'===n?new Ie(t,e.getTypeInfo('vec3f')):'i32'===n?new Ie(t,e.getTypeInfo('vec3i')):'u32'===n?new Ie(t,e.getTypeInfo('vec3u')):'f16'===n?new Ie(t,e.getTypeInfo('vec3h')):(console.error(`GetDataValue: Unknown format ${n}`),null):4===s?'f32'===n?new Ie(t,e.getTypeInfo('vec4f')):'i32'===n?new Ie(t,e.getTypeInfo('vec4i')):'u32'===n?new Ie(t,e.getTypeInfo('vec4u')):'f16'===n?new Ie(t,e.getTypeInfo('vec4h')):(console.error(`GetDataValue: Unknown format ${n}`),null):(console.error(`GetDataValue: Invalid vector size ${t.length}`),null)}class Ie extends ye{constructor(e,t){super(t),Array.isArray(e)?this.value=e:this.value=Array.from(e);}setDataValue(e,t,n,s){n instanceof J?console.error('TODO: Set vector postfix'):t instanceof Ie?this.value=t.value:console.error('SetDataValue: Invalid value',t);}getDataValue(e,t,n){let s=e.getTypeInfo('f32');if(this.typeInfo instanceof r)s=this.typeInfo.format;else {const t=this.typeInfo.name;'vec2f'===t||'vec3f'===t||'vec4f'===t?s=e.getTypeInfo('f32'):'vec2i'===t||'vec3i'===t||'vec4i'===t?s=e.getTypeInfo('i32'):'vec2u'===t||'vec3u'===t||'vec4u'===t?s=e.getTypeInfo('u32'):'vec2h'===t||'vec3h'===t||'vec4h'===t?s=e.getTypeInfo('f16'):console.error(`GetDataValue: Unknown type ${t}`);}if(t instanceof ue){const r=t.index;let a=-1;if(r instanceof re){if(!(r.value instanceof be))return console.error(`GetValueData: Invalid array index ${r.value}`),null;a=r.value.value;}else {const t=e.evalExpression(r,n);if(!(t instanceof be))return console.error('GetDataValue: Unknown index type',r),null;a=t.value;}return a<0||a>=this.value.length?(console.error('GetDataValue: Index out of range',a),null):new be(this.value[a],s)}if(t instanceof J){const n=t.value,r=[];for(const e of n)'x'===e||'r'===e?r.push(this.value[0]):'y'===e||'g'===e?r.push(this.value[1]):'z'===e||'b'===e?r.push(this.value[2]):'w'===e||'a'===e?r.push(this.value[3]):console.error(`GetDataValue: Unknown member ${e}`);return 1===r.length?new be(r[0],s):ke(e,r,s.name)}return this}toString(){let e=`${this.value[0]}`;for(let t=1;t<this.value.length;++t)e+=`, ${this.value[t]}`;return e}}class Te extends ye{constructor(e,t){super(t),this.value=e;}setDataValue(e,t,n,s){n instanceof J?console.error('TODO: Set matrix postfix'):t instanceof Te?this.value=t.value:console.error('SetDataValue: Invalid value',t);}getDataValue(e,t,n){const s=this.typeInfo.name;let a=e.getTypeInfo('f32');if(this.typeInfo instanceof r)a=this.typeInfo.format;else if(s.endsWith('f'))a=e.getTypeInfo('f32');else if(s.endsWith('i'))a=e.getTypeInfo('i32');else if(s.endsWith('u'))a=e.getTypeInfo('u32');else {if(!s.endsWith('h'))return console.error(`GetDataValue: Unknown type ${s}`),null;a=e.getTypeInfo('f16');}if(t instanceof ue){const r=t.index;let i,o=-1;if(r instanceof re){if(!(r.value instanceof be))return console.error(`GetDataValue: Invalid array index ${r.value}`),null;o=r.value.value;}else {const t=e.evalExpression(r,n);if(!(t instanceof be))return console.error('GetDataValue: Unknown index type',r),null;o=t.value;}if(o<0||o>=this.value.length)return console.error('GetDataValue: Index out of range',o),null;if('mat2x2'===s||'mat2x2f'===s||'mat2x2h'===s)i=this.value.slice(2*o,2*o+2);else if('mat2x3'===s||'mat2x3f'===s||'mat2x3h'===s)i=this.value.slice(3*o,3*o+3);else if('mat2x4'===s||'mat2x4f'===s||'mat2x4h'===s)i=this.value.slice(4*o,4*o+4);else if('mat3x2'===s||'mat3x2f'===s||'mat3x2h'===s)i=this.value.slice(2*o,2*o+2);else if('mat3x3'===s||'mat3x3f'===s||'mat3x3h'===s)i=this.value.slice(3*o,3*o+3);else if('mat3x4'===s||'mat3x4f'===s||'mat3x4h'===s)i=this.value.slice(4*o,4*o+4);else if('mat4x2'===s||'mat4x2f'===s||'mat4x2h'===s)i=this.value.slice(2*o,2*o+2);else if('mat4x3'===s||'mat4x3f'===s||'mat4x3h'===s)i=this.value.slice(3*o,3*o+3);else {if('mat4x4'!==s&&'mat4x4f'!==s&&'mat4x4h'!==s)return console.error(`GetDataValue: Unknown type ${s}`),null;i=this.value.slice(4*o,4*o+4);}const u=ke(e,i,a.name);if(t.postfix)return u.getDataValue(e,t.postfix,n)}return this}toString(){let e=`${this.value[0]}`;for(let t=1;t<this.value.length;++t)e+=`, ${this.value[t]}`;return e}}class Se extends ye{constructor(e,t,n=0,s){super(t),this.textureSize=[0,0,0],this.buffer=e instanceof ArrayBuffer?e:e.buffer,this.offset=n,undefined!==s&&(this.textureSize=s);}setDataValue(t,r,a,i){if(null===r)return void console.log('setDataValue: NULL data.');let o=this.offset,u=this.typeInfo;for(;a;){if(a instanceof ue)if(u instanceof s){const e=a.index;if(e instanceof re){if(!(e.value instanceof be))return void console.error(`SetDataValue: Invalid index type ${e.value}`);o+=e.value.value*u.stride;}else {const n=t.evalExpression(e,i);if(!(n instanceof be))return void console.error('SetDataValue: Unknown index type',e);o+=n.value*u.stride;}u=u.format;}else console.error(`SetDataValue: Type ${t.getTypeName(u)} is not an array`);else {if(!(a instanceof J))return void console.error('SetDataValue: Unknown postfix type',a);{const s=a.value;if(u instanceof n){let e=false;for(const t of u.members)if(t.name===s){o+=t.offset,u=t.type,e=true;break}if(!e)return void console.error(`SetDataValue: Member ${s} not found`)}else if(u instanceof e){const e=t.getTypeName(u);let n=0;if('x'===s||'r'===s)n=0;else if('y'===s||'g'===s)n=1;else if('z'===s||'b'===s)n=2;else {if('w'!==s&&'a'!==s)return void console.error(`SetDataValue: Unknown member ${s}`);n=3;}if(!(r instanceof be))return void console.error('SetDataValue: Invalid value',r);const a=r.value;return 'vec2f'===e?void(new Float32Array(this.buffer,o,2)[n]=a):'vec3f'===e?void(new Float32Array(this.buffer,o,3)[n]=a):'vec4f'===e?void(new Float32Array(this.buffer,o,4)[n]=a):'vec2i'===e?void(new Int32Array(this.buffer,o,2)[n]=a):'vec3i'===e?void(new Int32Array(this.buffer,o,3)[n]=a):'vec4i'===e?void(new Int32Array(this.buffer,o,4)[n]=a):'vec2u'===e?void(new Uint32Array(this.buffer,o,2)[n]=a):'vec3u'===e?void(new Uint32Array(this.buffer,o,3)[n]=a):'vec4u'===e?void(new Uint32Array(this.buffer,o,4)[n]=a):void console.error(`SetDataValue: Type ${e} is not a struct`)}}}a=a.postfix;}this.setData(t,r,u,o,i);}setData(e,t,n,s,r){const a=e.getTypeName(n);if('f32'!==a&&'f16'!==a)if('i32'!==a&&'atomic<i32>'!==a&&'x32'!==a)if('u32'!==a&&'atomic<u32>'!==a)if('bool'!==a)if('vec2f'!==a&&'vec2h'!==a)if('vec3f'!==a&&'vec3h'!==a)if('vec4f'!==a&&'vec4h'!==a)if('vec2i'!==a)if('vec3i'!==a)if('vec4i'!==a)if('vec2u'!==a)if('vec3u'!==a)if('vec4u'!==a)if('vec2b'!==a)if('vec3b'!==a)if('vec4b'!==a)if('mat2x2f'!==a&&'mat2x2h'!==a)if('mat2x3f'!==a&&'mat2x3h'!==a)if('mat2x4f'!==a&&'mat2x4h'!==a)if('mat3x2f'!==a&&'mat3x2h'!==a)if('mat3x3f'!==a&&'mat3x3h'!==a)if('mat3x4f'!==a&&'mat3x4h'!==a)if('mat4x2f'!==a&&'mat4x2h'!==a)if('mat4x3f'!==a&&'mat4x3h'!==a)if('mat4x4f'!==a&&'mat4x4h'!==a)if(t instanceof Se){if(n===t.typeInfo){return void new Uint8Array(this.buffer,s,t.buffer.byteLength).set(new Uint8Array(t.buffer))}console.error('SetDataValue: Type mismatch',a,e.getTypeName(t.typeInfo));}else console.error(`SetData: Unknown type ${a}`);else {const e=new Float32Array(this.buffer,s,16);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7],e[8]=t.value[8],e[9]=t.value[9],e[10]=t.value[10],e[11]=t.value[11],e[12]=t.value[12],e[13]=t.value[13],e[14]=t.value[14],e[15]=t.value[15]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]);}else {const e=new Float32Array(this.buffer,s,12);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7],e[8]=t.value[8],e[9]=t.value[9],e[10]=t.value[10],e[11]=t.value[11]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11]);}else {const e=new Float32Array(this.buffer,s,8);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7]);}else {const e=new Float32Array(this.buffer,s,12);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7],e[8]=t.value[8],e[9]=t.value[9],e[10]=t.value[10],e[11]=t.value[11]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11]);}else {const e=new Float32Array(this.buffer,s,9);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7],e[8]=t.value[8]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8]);}else {const e=new Float32Array(this.buffer,s,6);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5]);}else {const e=new Float32Array(this.buffer,s,8);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5],e[6]=t.value[6],e[7]=t.value[7]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7]);}else {const e=new Float32Array(this.buffer,s,6);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3],e[4]=t.value[4],e[5]=t.value[5]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5]);}else {const e=new Float32Array(this.buffer,s,4);t instanceof Te?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]);}else {const e=new Uint32Array(this.buffer,s,4);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]);}else {const e=new Uint32Array(this.buffer,s,3);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]);}else {const e=new Uint32Array(this.buffer,s,2);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1]):(e[0]=t[0],e[1]=t[1]);}else {const e=new Uint32Array(this.buffer,s,4);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]);}else {const e=new Uint32Array(this.buffer,s,3);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]);}else {const e=new Uint32Array(this.buffer,s,2);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1]):(e[0]=t[0],e[1]=t[1]);}else {const e=new Int32Array(this.buffer,s,4);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]);}else {const e=new Int32Array(this.buffer,s,3);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]);}else {const e=new Int32Array(this.buffer,s,2);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1]):(e[0]=t[0],e[1]=t[1]);}else {const e=new Float32Array(this.buffer,s,4);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2],e[3]=t.value[3]):(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3]);}else {const e=new Float32Array(this.buffer,s,3);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1],e[2]=t.value[2]):(e[0]=t[0],e[1]=t[1],e[2]=t[2]);}else {const e=new Float32Array(this.buffer,s,2);t instanceof Ie?(e[0]=t.value[0],e[1]=t.value[1]):(e[0]=t[0],e[1]=t[1]);}else t instanceof be&&(new Int32Array(this.buffer,s,1)[0]=t.value);else t instanceof be&&(new Uint32Array(this.buffer,s,1)[0]=t.value);else t instanceof be&&(new Int32Array(this.buffer,s,1)[0]=t.value);else t instanceof be&&(new Float32Array(this.buffer,s,1)[0]=t.value);}getDataValue(t,a,i){let o=this.offset,u=this.typeInfo;for(;a;){if(a instanceof ue){const e=a.index,n=t.evalExpression(e,i);let r=0;if(n instanceof be?r=n.value:console.error('GetDataValue: Invalid index type',e),u instanceof s)o+=r*u.stride,u=u.format;else {const e=t.getTypeName(u);'mat4x4'===e||'mat4x4f'===e||'mat4x4h'===e?(o+=16*r,u=t.getTypeInfo('vec4f')):console.error(`getDataValue: Type ${t.getTypeName(u)} is not an array`);}}else {if(!(a instanceof J))return console.error('GetDataValue: Unknown postfix type',a),null;{const s=a.value;if(u instanceof n){let e=false;for(const t of u.members)if(t.name===s){o+=t.offset,u=t.type,e=true;break}if(!e)return console.error(`GetDataValue: Member ${s} not found`),null}else if(u instanceof e){const e=t.getTypeName(u);if('vec2f'===e||'vec3f'===e||'vec4f'===e||'vec2i'===e||'vec3i'===e||'vec4i'===e||'vec2u'===e||'vec3u'===e||'vec4u'===e||'vec2b'===e||'vec3b'===e||'vec4b'===e||'vec2h'===e||'vec3h'===e||'vec4h'===e||'vec2'===e||'vec3'===e||'vec4'===e){if(s.length>0&&s.length<5){let n='f32',r='f';const a=[];for(let t=0;t<s.length;++t){const i=s[t].toLocaleLowerCase();let u=0;if('x'===i||'r'===i)u=0;else if('y'===i||'g'===i)u=1;else if('z'===i||'b'===i)u=2;else {if('w'!==i&&'a'!==i)return console.error(`Unknown member ${s}`),null;u=3;}if('vec2f'===e)a.push(new Float32Array(this.buffer,o,2)[u]);else if('vec3f'===e){if(o+12>=this.buffer.byteLength)return console.log('Insufficient buffer data'),null;const e=new Float32Array(this.buffer,o,3);a.push(e[u]);}else if('vec4f'===e)a.push(new Float32Array(this.buffer,o,4)[u]);else if('vec2i'===e)n='i32',r='i',a.push(new Int32Array(this.buffer,o,2)[u]);else if('vec3i'===e)n='i32',r='i',a.push(new Int32Array(this.buffer,o,3)[u]);else if('vec4i'===e)n='i32',r='i',a.push(new Int32Array(this.buffer,o,4)[u]);else if('vec2u'===e){n='u32',r='u';const e=new Uint32Array(this.buffer,o,2);a.push(e[u]);}else 'vec3u'===e?(n='u32',r='u',a.push(new Uint32Array(this.buffer,o,3)[u])):'vec4u'===e&&(n='u32',r='u',a.push(new Uint32Array(this.buffer,o,4)[u]));}return 1===a.length?new be(a[0],t.getTypeInfo(n)):(2===a.length?u=t.getTypeInfo(`vec2${r}`):3===a.length?u=t.getTypeInfo(`vec3${r}`):4===a.length?u=t.getTypeInfo(`vec4${r}`):console.error(`GetDataValue: Invalid vector length ${a.length}`),new Ie(a,u))}return console.error(`GetDataValue: Unknown member ${s}`),null}return console.error(`GetDataValue: Type ${e} is not a struct`),null}}}a=a.postfix;}const l=t.getTypeName(u);return 'f32'===l?new be(new Float32Array(this.buffer,o,1)[0],u):'i32'===l?new be(new Int32Array(this.buffer,o,1)[0],u):'u32'===l?new be(new Uint32Array(this.buffer,o,1)[0],u):'vec2f'===l?new Ie(new Float32Array(this.buffer,o,2),u):'vec3f'===l?new Ie(new Float32Array(this.buffer,o,3),u):'vec4f'===l?new Ie(new Float32Array(this.buffer,o,4),u):'vec2i'===l?new Ie(new Int32Array(this.buffer,o,2),u):'vec3i'===l?new Ie(new Int32Array(this.buffer,o,3),u):'vec4i'===l?new Ie(new Int32Array(this.buffer,o,4),u):'vec2u'===l?new Ie(new Uint32Array(this.buffer,o,2),u):'vec3u'===l?new Ie(new Uint32Array(this.buffer,o,3),u):'vec4u'===l?new Ie(new Uint32Array(this.buffer,o,4),u):u instanceof r&&'atomic'===u.name?'u32'===u.format.name?new be(new Uint32Array(this.buffer,o,1)[0],u.format):'i32'===u.format.name?new be(new Int32Array(this.buffer,o,1)[0],u.format):(console.error(`GetDataValue: Invalid atomic format ${u.format.name}`),null):new Se(this.buffer,u,o)}toString(){let e='';if(this.typeInfo instanceof s)if('f32'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('i32'===this.typeInfo.format.name){const t=new Int32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('u32'===this.typeInfo.format.name){const t=new Uint32Array(this.buffer,this.offset);e=`[${t[0]}`;for(let n=1;n<t.length;++n)e+=`, ${t[n]}`;}else if('vec2f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}]`;for(let n=1;n<t.length/2;++n)e+=`, [${t[2*n]}, ${t[2*n+1]}]`;}else if('vec3f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}, ${t[2]}]`;for(let n=4;n<t.length;n+=4)e+=`, [${t[n]}, ${t[n+1]}, ${t[n+2]}]`;}else if('vec4f'===this.typeInfo.format.name){const t=new Float32Array(this.buffer,this.offset);e=`[${t[0]}, ${t[1]}, ${t[2]}, ${t[3]}]`;for(let n=4;n<t.length;n+=4)e+=`, [${t[n]}, ${t[n+1]}, ${t[n+2]}, ${t[n+3]}]`;}else e='[...]';else this.typeInfo instanceof n?e+='{...}':e='[...]';return e}}(e=>{e[e.token=0]='token',e[e.keyword=1]='keyword',e[e.reserved=2]='reserved';})(l||(l={}));class Ee{constructor(e,t,n){this.name=e,this.type=t,this.rule=n;}toString(){return this.name}}class Ae{}u=Ae,Ae.none=new Ee('',l.reserved,''),Ae.eof=new Ee('EOF',l.token,''),Ae.reserved={asm:new Ee('asm',l.reserved,'asm'),bf16:new Ee('bf16',l.reserved,'bf16'),do:new Ee('do',l.reserved,'do'),enum:new Ee('enum',l.reserved,'enum'),f16:new Ee('f16',l.reserved,'f16'),f64:new Ee('f64',l.reserved,'f64'),handle:new Ee('handle',l.reserved,'handle'),i8:new Ee('i8',l.reserved,'i8'),i16:new Ee('i16',l.reserved,'i16'),i64:new Ee('i64',l.reserved,'i64'),mat:new Ee('mat',l.reserved,'mat'),premerge:new Ee('premerge',l.reserved,'premerge'),regardless:new Ee('regardless',l.reserved,'regardless'),typedef:new Ee('typedef',l.reserved,'typedef'),u8:new Ee('u8',l.reserved,'u8'),u16:new Ee('u16',l.reserved,'u16'),u64:new Ee('u64',l.reserved,'u64'),unless:new Ee('unless',l.reserved,'unless'),using:new Ee('using',l.reserved,'using'),vec:new Ee('vec',l.reserved,'vec'),void:new Ee('void',l.reserved,'void')},Ae.keywords={array:new Ee('array',l.keyword,'array'),atomic:new Ee('atomic',l.keyword,'atomic'),bool:new Ee('bool',l.keyword,'bool'),f32:new Ee('f32',l.keyword,'f32'),i32:new Ee('i32',l.keyword,'i32'),mat2x2:new Ee('mat2x2',l.keyword,'mat2x2'),mat2x3:new Ee('mat2x3',l.keyword,'mat2x3'),mat2x4:new Ee('mat2x4',l.keyword,'mat2x4'),mat3x2:new Ee('mat3x2',l.keyword,'mat3x2'),mat3x3:new Ee('mat3x3',l.keyword,'mat3x3'),mat3x4:new Ee('mat3x4',l.keyword,'mat3x4'),mat4x2:new Ee('mat4x2',l.keyword,'mat4x2'),mat4x3:new Ee('mat4x3',l.keyword,'mat4x3'),mat4x4:new Ee('mat4x4',l.keyword,'mat4x4'),ptr:new Ee('ptr',l.keyword,'ptr'),sampler:new Ee('sampler',l.keyword,'sampler'),sampler_comparison:new Ee('sampler_comparison',l.keyword,'sampler_comparison'),struct:new Ee('struct',l.keyword,'struct'),texture_1d:new Ee('texture_1d',l.keyword,'texture_1d'),texture_2d:new Ee('texture_2d',l.keyword,'texture_2d'),texture_2d_array:new Ee('texture_2d_array',l.keyword,'texture_2d_array'),texture_3d:new Ee('texture_3d',l.keyword,'texture_3d'),texture_cube:new Ee('texture_cube',l.keyword,'texture_cube'),texture_cube_array:new Ee('texture_cube_array',l.keyword,'texture_cube_array'),texture_multisampled_2d:new Ee('texture_multisampled_2d',l.keyword,'texture_multisampled_2d'),texture_storage_1d:new Ee('texture_storage_1d',l.keyword,'texture_storage_1d'),texture_storage_2d:new Ee('texture_storage_2d',l.keyword,'texture_storage_2d'),texture_storage_2d_array:new Ee('texture_storage_2d_array',l.keyword,'texture_storage_2d_array'),texture_storage_3d:new Ee('texture_storage_3d',l.keyword,'texture_storage_3d'),texture_depth_2d:new Ee('texture_depth_2d',l.keyword,'texture_depth_2d'),texture_depth_2d_array:new Ee('texture_depth_2d_array',l.keyword,'texture_depth_2d_array'),texture_depth_cube:new Ee('texture_depth_cube',l.keyword,'texture_depth_cube'),texture_depth_cube_array:new Ee('texture_depth_cube_array',l.keyword,'texture_depth_cube_array'),texture_depth_multisampled_2d:new Ee('texture_depth_multisampled_2d',l.keyword,'texture_depth_multisampled_2d'),texture_external:new Ee('texture_external',l.keyword,'texture_external'),u32:new Ee('u32',l.keyword,'u32'),vec2:new Ee('vec2',l.keyword,'vec2'),vec3:new Ee('vec3',l.keyword,'vec3'),vec4:new Ee('vec4',l.keyword,'vec4'),bitcast:new Ee('bitcast',l.keyword,'bitcast'),block:new Ee('block',l.keyword,'block'),break:new Ee('break',l.keyword,'break'),case:new Ee('case',l.keyword,'case'),continue:new Ee('continue',l.keyword,'continue'),continuing:new Ee('continuing',l.keyword,'continuing'),default:new Ee('default',l.keyword,'default'),diagnostic:new Ee('diagnostic',l.keyword,'diagnostic'),discard:new Ee('discard',l.keyword,'discard'),else:new Ee('else',l.keyword,'else'),enable:new Ee('enable',l.keyword,'enable'),fallthrough:new Ee('fallthrough',l.keyword,'fallthrough'),false:new Ee('false',l.keyword,'false'),fn:new Ee('fn',l.keyword,'fn'),for:new Ee('for',l.keyword,'for'),function:new Ee('function',l.keyword,'function'),if:new Ee('if',l.keyword,'if'),let:new Ee('let',l.keyword,'let'),const:new Ee('const',l.keyword,'const'),loop:new Ee('loop',l.keyword,'loop'),while:new Ee('while',l.keyword,'while'),private:new Ee('private',l.keyword,'private'),read:new Ee('read',l.keyword,'read'),read_write:new Ee('read_write',l.keyword,'read_write'),return:new Ee('return',l.keyword,'return'),requires:new Ee('requires',l.keyword,'requires'),storage:new Ee('storage',l.keyword,'storage'),switch:new Ee('switch',l.keyword,'switch'),true:new Ee('true',l.keyword,'true'),alias:new Ee('alias',l.keyword,'alias'),type:new Ee('type',l.keyword,'type'),uniform:new Ee('uniform',l.keyword,'uniform'),var:new Ee('var',l.keyword,'var'),override:new Ee('override',l.keyword,'override'),workgroup:new Ee('workgroup',l.keyword,'workgroup'),write:new Ee('write',l.keyword,'write'),r8unorm:new Ee('r8unorm',l.keyword,'r8unorm'),r8snorm:new Ee('r8snorm',l.keyword,'r8snorm'),r8uint:new Ee('r8uint',l.keyword,'r8uint'),r8sint:new Ee('r8sint',l.keyword,'r8sint'),r16uint:new Ee('r16uint',l.keyword,'r16uint'),r16sint:new Ee('r16sint',l.keyword,'r16sint'),r16float:new Ee('r16float',l.keyword,'r16float'),rg8unorm:new Ee('rg8unorm',l.keyword,'rg8unorm'),rg8snorm:new Ee('rg8snorm',l.keyword,'rg8snorm'),rg8uint:new Ee('rg8uint',l.keyword,'rg8uint'),rg8sint:new Ee('rg8sint',l.keyword,'rg8sint'),r32uint:new Ee('r32uint',l.keyword,'r32uint'),r32sint:new Ee('r32sint',l.keyword,'r32sint'),r32float:new Ee('r32float',l.keyword,'r32float'),rg16uint:new Ee('rg16uint',l.keyword,'rg16uint'),rg16sint:new Ee('rg16sint',l.keyword,'rg16sint'),rg16float:new Ee('rg16float',l.keyword,'rg16float'),rgba8unorm:new Ee('rgba8unorm',l.keyword,'rgba8unorm'),rgba8unorm_srgb:new Ee('rgba8unorm_srgb',l.keyword,'rgba8unorm_srgb'),rgba8snorm:new Ee('rgba8snorm',l.keyword,'rgba8snorm'),rgba8uint:new Ee('rgba8uint',l.keyword,'rgba8uint'),rgba8sint:new Ee('rgba8sint',l.keyword,'rgba8sint'),bgra8unorm:new Ee('bgra8unorm',l.keyword,'bgra8unorm'),bgra8unorm_srgb:new Ee('bgra8unorm_srgb',l.keyword,'bgra8unorm_srgb'),rgb10a2unorm:new Ee('rgb10a2unorm',l.keyword,'rgb10a2unorm'),rg11b10float:new Ee('rg11b10float',l.keyword,'rg11b10float'),rg32uint:new Ee('rg32uint',l.keyword,'rg32uint'),rg32sint:new Ee('rg32sint',l.keyword,'rg32sint'),rg32float:new Ee('rg32float',l.keyword,'rg32float'),rgba16uint:new Ee('rgba16uint',l.keyword,'rgba16uint'),rgba16sint:new Ee('rgba16sint',l.keyword,'rgba16sint'),rgba16float:new Ee('rgba16float',l.keyword,'rgba16float'),rgba32uint:new Ee('rgba32uint',l.keyword,'rgba32uint'),rgba32sint:new Ee('rgba32sint',l.keyword,'rgba32sint'),rgba32float:new Ee('rgba32float',l.keyword,'rgba32float'),static_assert:new Ee('static_assert',l.keyword,'static_assert')},Ae.tokens={decimal_float_literal:new Ee('decimal_float_literal',l.token,/((-?[0-9]*\.[0-9]+|-?[0-9]+\.[0-9]*)((e|E)(\+|-)?[0-9]+)?[fh]?)|(-?[0-9]+(e|E)(\+|-)?[0-9]+[fh]?)|(-?[0-9]+[fh])/),hex_float_literal:new Ee('hex_float_literal',l.token,/-?0x((([0-9a-fA-F]*\.[0-9a-fA-F]+|[0-9a-fA-F]+\.[0-9a-fA-F]*)((p|P)(\+|-)?[0-9]+[fh]?)?)|([0-9a-fA-F]+(p|P)(\+|-)?[0-9]+[fh]?))/),int_literal:new Ee('int_literal',l.token,/-?0x[0-9a-fA-F]+|0i?|-?[1-9][0-9]*i?/),uint_literal:new Ee('uint_literal',l.token,/0x[0-9a-fA-F]+u|0u|[1-9][0-9]*u/),name:new Ee('name',l.token,/[_a-zA-Z][0-9a-zA-Z_]*/),ident:new Ee('ident',l.token,/[_a-zA-Z][0-9a-zA-Z_]*/),and:new Ee('and',l.token,'&'),and_and:new Ee('and_and',l.token,'&&'),arrow:new Ee('arrow ',l.token,'->'),attr:new Ee('attr',l.token,'@'),forward_slash:new Ee('forward_slash',l.token,'/'),bang:new Ee('bang',l.token,'!'),bracket_left:new Ee('bracket_left',l.token,'['),bracket_right:new Ee('bracket_right',l.token,']'),brace_left:new Ee('brace_left',l.token,'{'),brace_right:new Ee('brace_right',l.token,'}'),colon:new Ee('colon',l.token,':'),comma:new Ee('comma',l.token,','),equal:new Ee('equal',l.token,'='),equal_equal:new Ee('equal_equal',l.token,'=='),not_equal:new Ee('not_equal',l.token,'!='),greater_than:new Ee('greater_than',l.token,'>'),greater_than_equal:new Ee('greater_than_equal',l.token,'>='),shift_right:new Ee('shift_right',l.token,'>>'),less_than:new Ee('less_than',l.token,'<'),less_than_equal:new Ee('less_than_equal',l.token,'<='),shift_left:new Ee('shift_left',l.token,'<<'),modulo:new Ee('modulo',l.token,'%'),minus:new Ee('minus',l.token,'-'),minus_minus:new Ee('minus_minus',l.token,'--'),period:new Ee('period',l.token,'.'),plus:new Ee('plus',l.token,'+'),plus_plus:new Ee('plus_plus',l.token,'++'),or:new Ee('or',l.token,'|'),or_or:new Ee('or_or',l.token,'||'),paren_left:new Ee('paren_left',l.token,'('),paren_right:new Ee('paren_right',l.token,')'),semicolon:new Ee('semicolon',l.token,';'),star:new Ee('star',l.token,'*'),tilde:new Ee('tilde',l.token,'~'),underscore:new Ee('underscore',l.token,'_'),xor:new Ee('xor',l.token,'^'),plus_equal:new Ee('plus_equal',l.token,'+='),minus_equal:new Ee('minus_equal',l.token,'-='),times_equal:new Ee('times_equal',l.token,'*='),division_equal:new Ee('division_equal',l.token,'/='),modulo_equal:new Ee('modulo_equal',l.token,'%='),and_equal:new Ee('and_equal',l.token,'&='),or_equal:new Ee('or_equal',l.token,'|='),xor_equal:new Ee('xor_equal',l.token,'^='),shift_right_equal:new Ee('shift_right_equal',l.token,'>>='),shift_left_equal:new Ee('shift_left_equal',l.token,'<<=')},Ae.simpleTokens={'@':u.tokens.attr,'{':u.tokens.brace_left,'}':u.tokens.brace_right,':':u.tokens.colon,',':u.tokens.comma,'(':u.tokens.paren_left,')':u.tokens.paren_right,';':u.tokens.semicolon},Ae.literalTokens={'&':u.tokens.and,'&&':u.tokens.and_and,'->':u.tokens.arrow,'/':u.tokens.forward_slash,'!':u.tokens.bang,'[':u.tokens.bracket_left,']':u.tokens.bracket_right,'=':u.tokens.equal,'==':u.tokens.equal_equal,'!=':u.tokens.not_equal,'>':u.tokens.greater_than,'>=':u.tokens.greater_than_equal,'>>':u.tokens.shift_right,'<':u.tokens.less_than,'<=':u.tokens.less_than_equal,'<<':u.tokens.shift_left,'%':u.tokens.modulo,'-':u.tokens.minus,'--':u.tokens.minus_minus,'.':u.tokens.period,'+':u.tokens.plus,'++':u.tokens.plus_plus,'|':u.tokens.or,'||':u.tokens.or_or,'*':u.tokens.star,'~':u.tokens.tilde,_:u.tokens.underscore,'^':u.tokens.xor,'+=':u.tokens.plus_equal,'-=':u.tokens.minus_equal,'*=':u.tokens.times_equal,'/=':u.tokens.division_equal,'%=':u.tokens.modulo_equal,'&=':u.tokens.and_equal,'|=':u.tokens.or_equal,'^=':u.tokens.xor_equal,'>>=':u.tokens.shift_right_equal,'<<=':u.tokens.shift_left_equal},Ae.regexTokens={decimal_float_literal:u.tokens.decimal_float_literal,hex_float_literal:u.tokens.hex_float_literal,int_literal:u.tokens.int_literal,uint_literal:u.tokens.uint_literal,ident:u.tokens.ident},Ae.storage_class=[u.keywords.function,u.keywords.private,u.keywords.workgroup,u.keywords.uniform,u.keywords.storage],Ae.access_mode=[u.keywords.read,u.keywords.write,u.keywords.read_write],Ae.sampler_type=[u.keywords.sampler,u.keywords.sampler_comparison],Ae.sampled_texture_type=[u.keywords.texture_1d,u.keywords.texture_2d,u.keywords.texture_2d_array,u.keywords.texture_3d,u.keywords.texture_cube,u.keywords.texture_cube_array],Ae.multisampled_texture_type=[u.keywords.texture_multisampled_2d],Ae.storage_texture_type=[u.keywords.texture_storage_1d,u.keywords.texture_storage_2d,u.keywords.texture_storage_2d_array,u.keywords.texture_storage_3d],Ae.depth_texture_type=[u.keywords.texture_depth_2d,u.keywords.texture_depth_2d_array,u.keywords.texture_depth_cube,u.keywords.texture_depth_cube_array,u.keywords.texture_depth_multisampled_2d],Ae.texture_external_type=[u.keywords.texture_external],Ae.any_texture_type=[...u.sampled_texture_type,...u.multisampled_texture_type,...u.storage_texture_type,...u.depth_texture_type,...u.texture_external_type],Ae.texel_format=[u.keywords.r8unorm,u.keywords.r8snorm,u.keywords.r8uint,u.keywords.r8sint,u.keywords.r16uint,u.keywords.r16sint,u.keywords.r16float,u.keywords.rg8unorm,u.keywords.rg8snorm,u.keywords.rg8uint,u.keywords.rg8sint,u.keywords.r32uint,u.keywords.r32sint,u.keywords.r32float,u.keywords.rg16uint,u.keywords.rg16sint,u.keywords.rg16float,u.keywords.rgba8unorm,u.keywords.rgba8unorm_srgb,u.keywords.rgba8snorm,u.keywords.rgba8uint,u.keywords.rgba8sint,u.keywords.bgra8unorm,u.keywords.bgra8unorm_srgb,u.keywords.rgb10a2unorm,u.keywords.rg11b10float,u.keywords.rg32uint,u.keywords.rg32sint,u.keywords.rg32float,u.keywords.rgba16uint,u.keywords.rgba16sint,u.keywords.rgba16float,u.keywords.rgba32uint,u.keywords.rgba32sint,u.keywords.rgba32float],Ae.const_literal=[u.tokens.int_literal,u.tokens.uint_literal,u.tokens.decimal_float_literal,u.tokens.hex_float_literal,u.keywords.true,u.keywords.false],Ae.literal_or_ident=[u.tokens.ident,u.tokens.int_literal,u.tokens.uint_literal,u.tokens.decimal_float_literal,u.tokens.hex_float_literal,u.tokens.name],Ae.element_count_expression=[u.tokens.int_literal,u.tokens.uint_literal,u.tokens.ident],Ae.template_types=[u.keywords.vec2,u.keywords.vec3,u.keywords.vec4,u.keywords.mat2x2,u.keywords.mat2x3,u.keywords.mat2x4,u.keywords.mat3x2,u.keywords.mat3x3,u.keywords.mat3x4,u.keywords.mat4x2,u.keywords.mat4x3,u.keywords.mat4x4,u.keywords.atomic,u.keywords.bitcast,...u.any_texture_type],Ae.attribute_name=[u.tokens.ident,u.keywords.block,u.keywords.diagnostic],Ae.assignment_operators=[u.tokens.equal,u.tokens.plus_equal,u.tokens.minus_equal,u.tokens.times_equal,u.tokens.division_equal,u.tokens.modulo_equal,u.tokens.and_equal,u.tokens.or_equal,u.tokens.xor_equal,u.tokens.shift_right_equal,u.tokens.shift_left_equal],Ae.increment_operators=[u.tokens.plus_plus,u.tokens.minus_minus];class $e{constructor(e,t,n){this.type=e,this.lexeme=t,this.line=n;}toString(){return this.lexeme}isTemplateType(){return  -1!=Ae.template_types.indexOf(this.type)}isArrayType(){return this.type==Ae.keywords.array}isArrayOrTemplateType(){return this.isArrayType()||this.isTemplateType()}}class Ve{constructor(e){this._tokens=[],this._start=0,this._current=0,this._line=1,this._source=null!=e?e:'';}scanTokens(){for(;!this._isAtEnd();)if(this._start=this._current,!this.scanToken())throw `Invalid syntax at line ${this._line}`;return this._tokens.push(new $e(Ae.eof,'',this._line)),this._tokens}scanToken(){let e=this._advance();if('\n'==e)return this._line++,true;if(this._isWhitespace(e))return  true;if('/'==e){if('/'==this._peekAhead()){for(;'\n'!=e;){if(this._isAtEnd())return  true;e=this._advance();}return this._line++,true}if('*'==this._peekAhead()){this._advance();let t=1;for(;t>0;){if(this._isAtEnd())return  true;if(e=this._advance(),'\n'==e)this._line++;else if('*'==e){if('/'==this._peekAhead()&&(this._advance(),t--,0==t))return  true}else '/'==e&&'*'==this._peekAhead()&&(this._advance(),t++);}return  true}}const t=Ae.simpleTokens[e];if(t)return this._addToken(t),true;let n=Ae.none;const s=this._isAlpha(e),r='_'===e;if(this._isAlphaNumeric(e)){let t=this._peekAhead();for(;this._isAlphaNumeric(t);)e+=this._advance(),t=this._peekAhead();}if(s){const t=Ae.keywords[e];if(t)return this._addToken(t),true}if(s||r)return this._addToken(Ae.tokens.ident),true;for(;;){let t=this._findType(e);const s=this._peekAhead();if('-'==e&&this._tokens.length>0){if('='==s)return this._current++,e+=s,this._addToken(Ae.tokens.minus_equal),true;if('-'==s)return this._current++,e+=s,this._addToken(Ae.tokens.minus_minus),true;const n=this._tokens.length-1;if((-1!=Ae.literal_or_ident.indexOf(this._tokens[n].type)||this._tokens[n].type==Ae.tokens.paren_right)&&'>'!=s)return this._addToken(t),true}if('>'==e&&('>'==s||'='==s)){let e=false,n=this._tokens.length-1;for(let t=0;t<5&&n>=0&&-1===Ae.assignment_operators.indexOf(this._tokens[n].type);++t,--n)if(this._tokens[n].type===Ae.tokens.less_than){n>0&&this._tokens[n-1].isArrayOrTemplateType()&&(e=true);break}if(e)return this._addToken(t),true}if(t===Ae.none){let s=e,r=0;const a=2;for(let e=0;e<a;++e)if(s+=this._peekAhead(e),t=this._findType(s),t!==Ae.none){r=e;break}if(t===Ae.none)return n!==Ae.none&&(this._current--,this._addToken(n),true);e=s,this._current+=r+1;}if(n=t,this._isAtEnd())break;e+=this._advance();}return n!==Ae.none&&(this._addToken(n),true)}_findType(e){for(const t in Ae.regexTokens){const n=Ae.regexTokens[t];if(this._match(e,n.rule))return n}const t=Ae.literalTokens[e];return t||Ae.none}_match(e,t){const n=t.exec(e);return n&&0==n.index&&n[0]==e}_isAtEnd(){return this._current>=this._source.length}_isAlpha(e){return e>='a'&&e<='z'||e>='A'&&e<='Z'}_isAlphaNumeric(e){return e>='a'&&e<='z'||e>='A'&&e<='Z'||'_'==e||e>='0'&&e<='9'}_isWhitespace(e){return ' '==e||'\t'==e||'\r'==e}_advance(e=0){let t=this._source[this._current];return e=e||0,e++,this._current+=e,t}_peekAhead(e=0){return e=e||0,this._current+e>=this._source.length?'\0':this._source[this._current+e]}_addToken(e){const t=this._source.substring(this._start,this._current);this._tokens.push(new $e(e,t,this._line));}}class Ne{constructor(e){this.resources=null,this.inUse=false,this.info=null,this.node=e;}}class Le{constructor(e,t){this.align=e,this.size=t;}}class Oe{constructor(){this.uniforms=[],this.storage=[],this.textures=[],this.samplers=[],this.aliases=[],this.overrides=[],this.structs=[],this.entry=new v,this.functions=[],this._types=new Map,this._functions=new Map;}_isStorageTexture(e){return 'texture_storage_1d'==e.name||'texture_storage_2d'==e.name||'texture_storage_2d_array'==e.name||'texture_storage_3d'==e.name}updateAST(e){for(const t of e)t instanceof k&&this._functions.set(t.name,new Ne(t));for(const t of e)if(t instanceof Z){const e=this.getTypeInfo(t,null);e instanceof n&&this.structs.push(e);}for(const t of e)if(t instanceof R)this.aliases.push(this._getAliasInfo(t));else if(t instanceof $){const e=t,n=this._getAttributeNum(e.attributes,'id',0),s=null!=e.type?this.getTypeInfo(e.type,e.attributes):null;this.overrides.push(new m(e.name,s,e.attributes,n));}else if(this._isUniformVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),i=new c(e.name,r,n,s,e.attributes,a.Uniform,e.access);this.uniforms.push(i);}else if(this._isStorageVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),i=this._isStorageTexture(r),o=new c(e.name,r,n,s,e.attributes,i?a.StorageTexture:a.Storage,e.access);this.storage.push(o);}else if(this._isTextureVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),i=this._isStorageTexture(r),o=new c(e.name,r,n,s,e.attributes,i?a.StorageTexture:a.Texture,e.access);i?this.storage.push(o):this.textures.push(o);}else if(this._isSamplerVar(t)){const e=t,n=this._getAttributeNum(e.attributes,'group',0),s=this._getAttributeNum(e.attributes,'binding',0),r=this.getTypeInfo(e.type,e.attributes),i=new c(e.name,r,n,s,e.attributes,a.Sampler,e.access);this.samplers.push(i);}else if(t instanceof k){const e=this._getAttribute(t,'vertex'),n=this._getAttribute(t,'fragment'),s=this._getAttribute(t,'compute'),r=e||n||s,a=new _(t.name,null==r?undefined:r.name,t.attributes);a.attributes=t.attributes,a.startLine=t.startLine,a.endLine=t.endLine,this.functions.push(a),this._functions.get(t.name).info=a,r&&(this._functions.get(t.name).inUse=true,a.inUse=true,a.resources=this._findResources(t,!!r),a.inputs=this._getInputs(t.args),a.outputs=this._getOutputs(t.returnType),this.entry[r.name].push(a)),a.arguments=t.args.map((e=>new d(e.name,this.getTypeInfo(e.type,e.attributes),e.attributes))),a.returnType=t.returnType?this.getTypeInfo(t.returnType,t.attributes):null;}else;for(const e of this._functions.values())e.info&&(e.info.inUse=e.inUse,this._addCalls(e.node,e.info.calls));for(const e of this._functions.values())e.node.search((t=>{var n;if('varExpr'===t.astNodeType){const s=t;for(const t of this.overrides)s.name==t.name&&(null===(n=e.info)||undefined===n||n.overrides.push(t));}}));for(const e of this.uniforms)this._markStructsInUse(e.type);for(const e of this.storage)this._markStructsInUse(e.type);}getStructInfo(e){for(const t of this.structs)if(t.name==e)return t;return null}getOverrideInfo(e){for(const t of this.overrides)if(t.name==e)return t;return null}_markStructsInUse(e){if(e)if(e.isStruct){if(e.inUse=true,e.members)for(const t of e.members)this._markStructsInUse(t.type);}else if(e.isArray)this._markStructsInUse(e.format);else if(e.isTemplate)e.format&&this._markStructsInUse(e.format);else {const t=this._getAlias(e.name);t&&this._markStructsInUse(t);}}_addCalls(e,t){var n;for(const s of e.calls){const e=null===(n=this._functions.get(s.name))||undefined===n?undefined:n.info;e&&t.add(e);}}findResource(e,t){for(const n of this.uniforms)if(n.group==e&&n.binding==t)return n;for(const n of this.storage)if(n.group==e&&n.binding==t)return n;for(const n of this.textures)if(n.group==e&&n.binding==t)return n;for(const n of this.samplers)if(n.group==e&&n.binding==t)return n;return null}_findResource(e){for(const t of this.uniforms)if(t.name==e)return t;for(const t of this.storage)if(t.name==e)return t;for(const t of this.textures)if(t.name==e)return t;for(const t of this.samplers)if(t.name==e)return t;return null}_markStructsFromAST(e){const t=this.getTypeInfo(e,null);this._markStructsInUse(t);}_findResources(e,t){const n=[],s=this,r=[];return e.search((a=>{if(a instanceof y)r.push({});else if(a instanceof w)r.pop();else if(a instanceof A){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type),r.length>0&&(r[r.length-1][e.name]=e);}else if(a instanceof ee){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type);}else if(a instanceof V){const e=a;t&&null!==e.type&&this._markStructsFromAST(e.type),r.length>0&&(r[r.length-1][e.name]=e);}else if(a instanceof ne){const e=a;if(r.length>0){if(r[r.length-1][e.name])return}const t=s._findResource(e.name);t&&n.push(t);}else if(a instanceof te){const r=a,i=s._functions.get(r.name);i&&(t&&(i.inUse=true),e.calls.add(i.node),null===i.resources&&(i.resources=s._findResources(i.node,t)),n.push(...i.resources));}else if(a instanceof D){const r=a,i=s._functions.get(r.name);i&&(t&&(i.inUse=true),e.calls.add(i.node),null===i.resources&&(i.resources=s._findResources(i.node,t)),n.push(...i.resources));}})),[...new Map(n.map((e=>[e.name,e]))).values()]}getBindGroups(){const e=[];function t(t,n){t>=e.length&&(e.length=t+1),undefined===e[t]&&(e[t]=[]),n>=e[t].length&&(e[t].length=n+1);}for(const n of this.uniforms){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.storage){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.textures){t(n.group,n.binding);e[n.group][n.binding]=n;}for(const n of this.samplers){t(n.group,n.binding);e[n.group][n.binding]=n;}return e}_getOutputs(e,t=undefined){if(undefined===t&&(t=[]),e instanceof Z)this._getStructOutputs(e,t);else {const n=this._getOutputInfo(e);null!==n&&t.push(n);}return t}_getStructOutputs(e,t){for(const n of e.members)if(n.type instanceof Z)this._getStructOutputs(n.type,t);else {const e=this._getAttribute(n,'location')||this._getAttribute(n,'builtin');if(null!==e){const s=this.getTypeInfo(n.type,n.type.attributes),r=this._parseInt(e.value),a=new p(n.name,s,e.name,r);t.push(a);}}}_getOutputInfo(e){const t=this._getAttribute(e,'location')||this._getAttribute(e,'builtin');if(null!==t){const n=this.getTypeInfo(e,e.attributes),s=this._parseInt(t.value);return new p('',n,t.name,s)}return null}_getInputs(e,t=undefined){ undefined===t&&(t=[]);for(const n of e)if(n.type instanceof Z)this._getStructInputs(n.type,t);else {const e=this._getInputInfo(n);null!==e&&t.push(e);}return t}_getStructInputs(e,t){for(const n of e.members)if(n.type instanceof Z)this._getStructInputs(n.type,t);else {const e=this._getInputInfo(n);null!==e&&t.push(e);}}_getInputInfo(e){const t=this._getAttribute(e,'location')||this._getAttribute(e,'builtin');if(null!==t){const n=this._getAttribute(e,'interpolation'),s=this.getTypeInfo(e.type,e.attributes),r=this._parseInt(t.value),a=new f(e.name,s,t.name,r);return null!==n&&(a.interpolation=this._parseString(n.value)),a}return null}_parseString(e){return e instanceof Array&&(e=e[0]),e}_parseInt(e){e instanceof Array&&(e=e[0]);const t=parseInt(e);return isNaN(t)?e:t}_getAlias(e){for(const t of this.aliases)if(t.name==e)return t.type;return null}_getAliasInfo(e){return new h(e.name,this.getTypeInfo(e.type,null))}getTypeInfo(a,i=null){if(this._types.has(a))return this._types.get(a);if(a instanceof Y){const e=a,t=e.format?this.getTypeInfo(e.format,e.attributes):null,n=new s(e.name,i);return n.format=t,n.count=e.count,this._types.set(a,n),this._updateTypeInfo(n),n}if(a instanceof Z){const e=a,s=new n(e.name,i);s.startLine=e.startLine,s.endLine=e.endLine;for(const n of e.members){const e=this.getTypeInfo(n.type,n.attributes);s.members.push(new t(n.name,e,n.attributes));}return this._types.set(a,s),this._updateTypeInfo(s),s}if(a instanceof K){const t=a,n=t.format instanceof X,s=t.format?n?this.getTypeInfo(t.format,null):new e(t.format,null):null,o=new r(t.name,s,i,t.access);return this._types.set(a,o),this._updateTypeInfo(o),o}if(a instanceof j){const e=a,t=e.format?this.getTypeInfo(e.format,null):null,n=new r(e.name,t,i,e.access);return this._types.set(a,n),this._updateTypeInfo(n),n}const o=new e(a.name,i);return this._types.set(a,o),this._updateTypeInfo(o),o}_updateTypeInfo(e){var t,r,a;const i=this._getTypeSize(e);if(e.size=null!==(t=null==i?undefined:i.size)&&undefined!==t?t:0,e instanceof s&&e.format){const t=this._getTypeSize(e.format);e.stride=Math.max(null!==(r=null==t?undefined:t.size)&&undefined!==r?r:0,null!==(a=null==t?undefined:t.align)&&undefined!==a?a:0),this._updateTypeInfo(e.format);}e instanceof n&&this._updateStructInfo(e);}_updateStructInfo(e){var t;let n=0,s=0,r=0,a=0;for(let i=0,o=e.members.length;i<o;++i){const o=e.members[i],u=this._getTypeSize(o);if(!u)continue;null!==(t=this._getAlias(o.type.name))&&undefined!==t||o.type;const l=u.align,c=u.size;n=this._roundUp(l,n+s),s=c,r=n,a=Math.max(a,l),o.offset=n,o.size=c,this._updateTypeInfo(o.type);}e.size=this._roundUp(a,r+s),e.align=a;}_getTypeSize(r){var a,i;if(null==r)return null;const o=this._getAttributeNum(r.attributes,'size',0),u=this._getAttributeNum(r.attributes,'align',0);if(r instanceof t&&(r=r.type),r instanceof e){const e=this._getAlias(r.name);null!==e&&(r=e);}{const e=Oe._typeInfo[r.name];if(undefined!==e){const t='f16'===(null===(a=r.format)||undefined===a?undefined:a.name)?2:1;return new Le(Math.max(u,e.align/t),Math.max(o,e.size/t))}}{const e=Oe._typeInfo[r.name.substring(0,r.name.length-1)];if(e){const t='h'===r.name[r.name.length-1]?2:1;return new Le(Math.max(u,e.align/t),Math.max(o,e.size/t))}}if(r instanceof s){let e=r,t=8,n=8;const s=this._getTypeSize(e.format);null!==s&&(n=s.size,t=s.align);return n=e.count*this._getAttributeNum(null!==(i=null==r?undefined:r.attributes)&&undefined!==i?i:null,'stride',this._roundUp(t,n)),o&&(n=o),new Le(Math.max(u,t),Math.max(o,n))}if(r instanceof n){let e=0,t=0,n=0,s=0,a=0;for(const t of r.members){const r=this._getTypeSize(t.type);null!==r&&(e=Math.max(r.align,e),n=this._roundUp(r.align,n+s),s=r.size,a=n);}return t=this._roundUp(e,a+s),new Le(Math.max(u,e),Math.max(o,t))}return null}_isUniformVar(e){return e instanceof A&&'uniform'==e.storage}_isStorageVar(e){return e instanceof A&&'storage'==e.storage}_isTextureVar(e){return e instanceof A&&null!==e.type&&-1!=Oe._textureTypes.indexOf(e.type.name)}_isSamplerVar(e){return e instanceof A&&null!==e.type&&-1!=Oe._samplerTypes.indexOf(e.type.name)}_getAttribute(e,t){const n=e;if(!n||!n.attributes)return null;const s=n.attributes;for(let e of s)if(e.name==t)return e;return null}_getAttributeNum(e,t,n){if(null===e)return n;for(let s of e)if(s.name==t){let e=null!==s&&null!==s.value?s.value:n;return e instanceof Array&&(e=e[0]),'number'==typeof e?e:'string'==typeof e?parseInt(e):n}return n}_roundUp(e,t){return Math.ceil(t/e)*e}}Oe._typeInfo={f16:{align:2,size:2},i32:{align:4,size:4},u32:{align:4,size:4},f32:{align:4,size:4},atomic:{align:4,size:4},vec2:{align:8,size:8},vec3:{align:16,size:12},vec4:{align:16,size:16},mat2x2:{align:8,size:16},mat3x2:{align:8,size:24},mat4x2:{align:8,size:32},mat2x3:{align:16,size:32},mat3x3:{align:16,size:48},mat4x3:{align:16,size:64},mat2x4:{align:16,size:32},mat3x4:{align:16,size:48},mat4x4:{align:16,size:64}},Oe._textureTypes=Ae.any_texture_type.map((e=>e.name)),Oe._samplerTypes=Ae.sampler_type.map((e=>e.name));class De{constructor(e,t,n){this.name=e,this.value=t,this.node=n;}clone(){return new De(this.name,this.value,this.node)}}class Ce{constructor(e){this.name=e.name,this.node=e;}clone(){return new Ce(this.node)}}class Me{constructor(e){this.parent=null,this.variables=new Map,this.functions=new Map,this.currentFunctionName='',e&&(this.parent=e,this.currentFunctionName=e.currentFunctionName);}getVariable(e){var t;return this.variables.has(e)?null!==(t=this.variables.get(e))&&undefined!==t?t:null:this.parent?this.parent.getVariable(e):null}getFunction(e){var t;return this.functions.has(e)?null!==(t=this.functions.get(e))&&undefined!==t?t:null:this.parent?this.parent.getFunction(e):null}createVariable(e,t,n){this.variables.set(e,new De(e,t,null!=n?n:null));}setVariable(e,t,n){const s=this.getVariable(e);null!==s?s.value=t:this.createVariable(e,t,n);}getVariableValue(e){var t;const n=this.getVariable(e);return null!==(t=null==n?undefined:n.value)&&undefined!==t?t:null}clone(){return new Me(this)}}class Fe{evalExpression(e,t){return null}getTypeName(e){return ''}getTypeInfo(e){return null}getVariableName(e,t){return ''}}class Ue{constructor(e){this.exec=e;}getTypeInfo(e){return this.exec.getTypeInfo(e)}All(e,t){const n=this.exec.evalExpression(e.args[0],t);let s=true;if(n instanceof Ie)return n.value.forEach((e=>{e||(s=false);})),new be(s?1:0,this.getTypeInfo('bool'));throw new Error(`All() expects a vector argument. Line ${e.line}`)}Any(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie){const e=n.value.some((e=>e));return new be(e?1:0,this.getTypeInfo('bool'))}throw new Error(`Any() expects a vector argument. Line ${e.line}`)}Select(e,t){const n=this.exec.evalExpression(e.args[2],t);if(!(n instanceof be))throw new Error(`Select() expects a bool condition. Line ${e.line}`);return n.value?this.exec.evalExpression(e.args[1],t):this.exec.evalExpression(e.args[0],t)}ArrayLength(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.evalExpression(n,t);if(s instanceof Se&&0===s.typeInfo.size){const e=s.typeInfo,t=s.buffer.byteLength/e.stride;return new be(t,this.getTypeInfo('u32'))}return new be(s.typeInfo.size,this.getTypeInfo('u32'))}Abs(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.abs(e))),n.typeInfo);const s=n;return new be(Math.abs(s.value),s.typeInfo)}Acos(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.acos(e))),n.typeInfo);const s=n;return new be(Math.acos(s.value),n.typeInfo)}Acosh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.acosh(e))),n.typeInfo);const s=n;return new be(Math.acosh(s.value),n.typeInfo)}Asin(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.asin(e))),n.typeInfo);const s=n;return new be(Math.asin(s.value),n.typeInfo)}Asinh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.asinh(e))),n.typeInfo);const s=n;return new be(Math.asinh(s.value),n.typeInfo)}Atan(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.atan(e))),n.typeInfo);const s=n;return new be(Math.atan(s.value),n.typeInfo)}Atanh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.atanh(e))),n.typeInfo);const s=n;return new be(Math.atanh(s.value),n.typeInfo)}Atan2(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>Math.atan2(e,s.value[t]))),n.typeInfo);const r=n,a=s;return new be(Math.atan2(r.value,a.value),n.typeInfo)}Ceil(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.ceil(e))),n.typeInfo);const s=n;return new be(Math.ceil(s.value),n.typeInfo)}_clamp(e,t,n){return Math.min(Math.max(e,t),n)}Clamp(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ie&&s instanceof Ie&&r instanceof Ie)return new Ie(n.value.map(((e,t)=>this._clamp(e,s.value[t],r.value[t]))),n.typeInfo);const a=n,i=s,o=r;return new be(this._clamp(a.value,i.value,o.value),n.typeInfo)}Cos(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.cos(e))),n.typeInfo);const s=n;return new be(Math.cos(s.value),n.typeInfo)}Cosh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.cosh(e))),n.typeInfo);const s=n;return new be(Math.cos(s.value),n.typeInfo)}CountLeadingZeros(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.clz32(e))),n.typeInfo);const s=n;return new be(Math.clz32(s.value),n.typeInfo)}_countOneBits(e){let t=0;for(;0!==e;)1&e&&t++,e>>=1;return t}CountOneBits(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>this._countOneBits(e))),n.typeInfo);const s=n;return new be(this._countOneBits(s.value),n.typeInfo)}_countTrailingZeros(e){if(0===e)return 32;let t=0;for(;!(1&e);)e>>=1,t++;return t}CountTrailingZeros(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>this._countTrailingZeros(e))),n.typeInfo);const s=n;return new be(this._countTrailingZeros(s.value),n.typeInfo)}Cross(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie){if(3!==n.value.length||3!==s.value.length)return console.error(`Cross() expects 3D vectors. Line ${e.line}`),null;const t=n.value,r=s.value;return new Ie([t[1]*r[2]-r[1]*t[2],t[2]*r[0]-r[2]*t[0],t[0]*r[1]-r[0]*t[1]],n.typeInfo)}return console.error(`Cross() expects vector arguments. Line ${e.line}`),null}Degrees(e,t){const n=this.exec.evalExpression(e.args[0],t),s=180/Math.PI;if(n instanceof Ie)return new Ie(n.value.map((e=>e*s)),n.typeInfo);return new be(n.value*s,n.typeInfo)}Determinant(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Te){const e=n.value,t=this.exec.getTypeName(n.typeInfo),s=t.endsWith('h')?this.getTypeInfo('f16'):this.getTypeInfo('f32');if('mat2x2'===t||'mat2x2f'===t||'mat2x2h'===t)return new be(e[0]*e[3]-e[1]*e[2],s);if('mat2x3'===t||'mat2x3f'===t||'mat2x3h'===t)return new be(e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]),s);if('mat2x4'===t||'mat2x4f'===t||'mat2x4h'===t)console.error(`TODO: Determinant for ${t}`);else if('mat3x2'===t||'mat3x2f'===t||'mat3x2h'===t)console.error(`TODO: Determinant for ${t}`);else {if('mat3x3'===t||'mat3x3f'===t||'mat3x3h'===t)return new be(e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]),s);'mat3x4'===t||'mat3x4f'===t||'mat3x4h'===t||'mat4x2'===t||'mat4x2f'===t||'mat4x2h'===t||'mat4x3'===t||'mat4x3f'===t||'mat4x3h'===t?console.error(`TODO: Determinant for ${t}`):'mat4x4'!==t&&'mat4x4f'!==t&&'mat4x4h'!==t||console.error(`TODO: Determinant for ${t}`);}}return console.error(`Determinant expects a matrix argument. Line ${e.line}`),null}Distance(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie){let e=0;for(let t=0;t<n.value.length;++t)e+=(n.value[t]-s.value[t])*(n.value[t]-s.value[t]);return new be(Math.sqrt(e),this.getTypeInfo('f32'))}const r=n,a=s;return new be(Math.abs(r.value-a.value),n.typeInfo)}_dot(e,t){let n=0;for(let s=0;s<e.length;++s)n+=t[s]*e[s];return n}Dot(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);return n instanceof Ie&&s instanceof Ie?new be(this._dot(n.value,s.value),this.getTypeInfo('f32')):(console.error(`Dot() expects vector arguments. Line ${e.line}`),null)}Dot4U8Packed(e,t){return console.error(`TODO: dot4U8Packed. Line ${e.line}`),null}Dot4I8Packed(e,t){return console.error(`TODO: dot4I8Packed. Line ${e.line}`),null}Exp(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.exp(e))),n.typeInfo);const s=n;return new be(Math.exp(s.value),n.typeInfo)}Exp2(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.pow(2,e))),n.typeInfo);const s=n;return new be(Math.pow(2,s.value),n.typeInfo)}ExtractBits(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if('u32'!==s.typeInfo.name&&'x32'!==s.typeInfo.name)return console.error(`ExtractBits() expects an i32 offset argument. Line ${e.line}`),null;if('u32'!==r.typeInfo.name&&'x32'!==r.typeInfo.name)return console.error(`ExtractBits() expects an i32 count argument. Line ${e.line}`),null;const a=s.value,i=r.value;if(n instanceof Ie)return new Ie(n.value.map((e=>e>>a&(1<<i)-1)),n.typeInfo);if('i32'!==n.typeInfo.name&&'x32'!==n.typeInfo.name)return console.error(`ExtractBits() expects an i32 argument. Line ${e.line}`),null;const o=n.value;return new be(o>>a&(1<<i)-1,this.getTypeInfo('i32'))}FaceForward(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ie&&s instanceof Ie&&r instanceof Ie){const e=this._dot(s.value,r.value);return new Ie(e<0?n.value:n.value.map((e=>-e)),n.typeInfo)}return console.error(`FaceForward() expects vector arguments. Line ${e.line}`),null}_firstLeadingBit(e){return 0===e?-1:31-Math.clz32(e)}FirstLeadingBit(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>this._firstLeadingBit(e))),n.typeInfo);const s=n;return new be(this._firstLeadingBit(s.value),n.typeInfo)}_firstTrailingBit(e){return 0===e?-1:Math.log2(e&-e)}FirstTrailingBit(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>this._firstTrailingBit(e))),n.typeInfo);const s=n;return new be(this._firstTrailingBit(s.value),n.typeInfo)}Floor(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.floor(e))),n.typeInfo);const s=n;return new be(Math.floor(s.value),n.typeInfo)}Fma(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ie&&s instanceof Ie&&r instanceof Ie)return n.value.length!==s.value.length||n.value.length!==r.value.length?(console.error(`Fma() expects vectors of the same length. Line ${e.line}`),null):new Ie(n.value.map(((e,t)=>e*s.value[t]+r.value[t])),n.typeInfo);const a=n,i=s,o=r;return new be(a.value*i.value+o.value,a.typeInfo)}Fract(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>e-Math.floor(e))),n.typeInfo);const s=n;return new be(s.value-Math.floor(s.value),n.typeInfo)}Frexp(e,t){return console.error(`TODO: frexp. Line ${e.line}`),null}InsertBits(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t),a=this.exec.evalExpression(e.args[3],t);if('u32'!==r.typeInfo.name&&'x32'!==r.typeInfo.name)return console.error(`InsertBits() expects an i32 offset argument. Line ${e.line}`),null;const i=r.value,o=(1<<a.value)-1<<i,u=~o;if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>e&u|s.value[t]<<i&o)),n.typeInfo);const l=n.value,c=s.value;return new be(l&u|c<<i&o,n.typeInfo)}InverseSqrt(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>1/Math.sqrt(e))),n.typeInfo);const s=n;return new be(1/Math.sqrt(s.value),n.typeInfo)}Ldexp(e,t){return console.error(`TODO: ldexp. Line ${e.line}`),null}Length(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie){let e=0;return n.value.forEach((t=>{e+=t*t;})),new be(Math.sqrt(e),this.getTypeInfo('f32'))}const s=n;return new be(Math.abs(s.value),n.typeInfo)}Log(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.log(e))),n.typeInfo);const s=n;return new be(Math.log(s.value),n.typeInfo)}Log2(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.log2(e))),n.typeInfo);const s=n;return new be(Math.log2(s.value),n.typeInfo)}Max(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>Math.max(e,s.value[t]))),n.typeInfo);const r=n,a=s;return new be(Math.max(r.value,a.value),n.typeInfo)}Min(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>Math.min(e,s.value[t]))),n.typeInfo);const r=n,a=s;return new be(Math.min(r.value,a.value),n.typeInfo)}Mix(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ie&&s instanceof Ie&&r instanceof Ie)return new Ie(n.value.map(((e,t)=>n.value[t]*(1-r.value[t])+s.value[t]*r.value[t])),n.typeInfo);const a=s,i=r;return new be(n.value*(1-i.value)+a.value*i.value,n.typeInfo)}Modf(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>e%s.value[t])),n.typeInfo);const r=s;return new be(n.value%r.value,n.typeInfo)}Normalize(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie){const s=this.Length(e,t).value;return new Ie(n.value.map((e=>e/s)),n.typeInfo)}return console.error(`Normalize() expects a vector argument. Line ${e.line}`),null}Pow(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie)return new Ie(n.value.map(((e,t)=>Math.pow(e,s.value[t]))),n.typeInfo);const r=n,a=s;return new be(Math.pow(r.value,a.value),n.typeInfo)}QuantizeToF16(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>e)),n.typeInfo);return new be(n.value,n.typeInfo)}Radians(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>e*Math.PI/180)),n.typeInfo);return new be(n.value*Math.PI/180,n.typeInfo)}Reflect(e,t){let n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(n instanceof Ie&&s instanceof Ie){const e=this._dot(n.value,s.value);return new Ie(n.value.map(((t,n)=>t-2*e*s.value[n])),n.typeInfo)}return console.error(`Reflect() expects vector arguments. Line ${e.line}`),null}Refract(e,t){let n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(n instanceof Ie&&s instanceof Ie&&r instanceof be){const e=this._dot(s.value,n.value);return new Ie(n.value.map(((t,n)=>{const a=1-r.value*r.value*(1-e*e);if(a<0)return 0;const i=Math.sqrt(a);return r.value*t-(r.value*e+i)*s.value[n]})),n.typeInfo)}return console.error(`Refract() expects vector arguments and a scalar argument. Line ${e.line}`),null}ReverseBits(e,t){return console.error(`TODO: reverseBits. Line ${e.line}`),null}Round(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.round(e))),n.typeInfo);const s=n;return new be(Math.round(s.value),n.typeInfo)}Saturate(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.min(Math.max(e,0),1))),n.typeInfo);const s=n;return new be(Math.min(Math.max(s.value,0),1),n.typeInfo)}Sign(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.sign(e))),n.typeInfo);const s=n;return new be(Math.sign(s.value),n.typeInfo)}Sin(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.sin(e))),n.typeInfo);const s=n;return new be(Math.sin(s.value),n.typeInfo)}Sinh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.sinh(e))),n.typeInfo);const s=n;return new be(Math.sinh(s.value),n.typeInfo)}_smoothstep(e,t,n){const s=Math.min(Math.max((n-e)/(t-e),0),1);return s*s*(3-2*s)}SmoothStep(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t);if(r instanceof Ie&&n instanceof Ie&&s instanceof Ie)return new Ie(r.value.map(((e,t)=>this._smoothstep(n.value[t],s.value[t],e))),r.typeInfo);const a=n,i=s,o=r;return new be(this._smoothstep(a.value,i.value,o.value),r.typeInfo)}Sqrt(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.sqrt(e))),n.typeInfo);const s=n;return new be(Math.sqrt(s.value),n.typeInfo)}Step(e,t){const n=this.exec.evalExpression(e.args[0],t),s=this.exec.evalExpression(e.args[1],t);if(s instanceof Ie&&n instanceof Ie)return new Ie(s.value.map(((e,t)=>e<n.value[t]?0:1)),s.typeInfo);const r=n;return new be(s.value<r.value?0:1,r.typeInfo)}Tan(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.tan(e))),n.typeInfo);const s=n;return new be(Math.tan(s.value),n.typeInfo)}Tanh(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.tanh(e))),n.typeInfo);const s=n;return new be(Math.tanh(s.value),n.typeInfo)}_getTransposeType(e){const t=this.exec.getTypeName(e);return 'mat2x2f'===t||'mat2x2h'===t?e:'mat2x3f'===t?this.getTypeInfo('mat3x2f'):'mat2x3h'===t?this.getTypeInfo('mat3x2h'):'mat2x4f'===t?this.getTypeInfo('mat4x2f'):'mat2x4h'===t?this.getTypeInfo('mat4x2h'):'mat3x2f'===t?this.getTypeInfo('mat2x3f'):'mat3x2h'===t?this.getTypeInfo('mat2x3h'):'mat3x3f'===t||'mat3x3h'===t?e:'mat3x4f'===t?this.getTypeInfo('mat4x3f'):'mat3x4h'===t?this.getTypeInfo('mat4x3h'):'mat4x2f'===t?this.getTypeInfo('mat2x4f'):'mat4x2h'===t?this.getTypeInfo('mat2x4h'):'mat4x3f'===t?this.getTypeInfo('mat3x4f'):'mat4x3h'===t?this.getTypeInfo('mat3x4h'):('mat4x4f'===t||'mat4x4h'===t||console.error(`Invalid matrix type ${t}`),e)}Transpose(e,t){const n=this.exec.evalExpression(e.args[0],t);if(!(n instanceof Te))return console.error(`Transpose() expects a matrix argument. Line ${e.line}`),null;const s=this._getTransposeType(n.typeInfo);if('mat2x2'===n.typeInfo.name||'mat2x2f'===n.typeInfo.name||'mat2x2h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[2],e[1],e[3]],s)}if('mat2x3'===n.typeInfo.name||'mat2x3f'===n.typeInfo.name||'mat2x3h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[3],e[6],e[1],e[4],e[7]],s)}if('mat2x4'===n.typeInfo.name||'mat2x4f'===n.typeInfo.name||'mat2x4h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13]],s)}if('mat3x2'===n.typeInfo.name||'mat3x2f'===n.typeInfo.name||'mat3x2h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[3],e[1],e[4],e[2],e[5]],s)}if('mat3x3'===n.typeInfo.name||'mat3x3f'===n.typeInfo.name||'mat3x3h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[3],e[6],e[1],e[4],e[7],e[2],e[5],e[8]],s)}if('mat3x4'===n.typeInfo.name||'mat3x4f'===n.typeInfo.name||'mat3x4h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14]],s)}if('mat4x2'===n.typeInfo.name||'mat4x2f'===n.typeInfo.name||'mat4x2h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[4],e[1],e[5],e[2],e[6]],s)}if('mat4x3'===n.typeInfo.name||'mat4x3f'===n.typeInfo.name||'mat4x3h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]],s)}if('mat4x4'===n.typeInfo.name||'mat4x4f'===n.typeInfo.name||'mat4x4h'===n.typeInfo.name){const e=n.value;return new Te([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14],e[3],e[7],e[11],e[15]],s)}return console.error(`Invalid matrix type ${n.typeInfo.name}`),null}Trunc(e,t){const n=this.exec.evalExpression(e.args[0],t);if(n instanceof Ie)return new Ie(n.value.map((e=>Math.trunc(e))),n.typeInfo);const s=n;return new be(Math.trunc(s.value),n.typeInfo)}Dpdx(e,t){return console.error(`TODO: dpdx. Line ${e.line}`),null}DpdxCoarse(e,t){return console.error(`TODO: dpdxCoarse. Line ${e.line}`),null}DpdxFine(e,t){return console.error('TODO: dpdxFine'),null}Dpdy(e,t){return console.error('TODO: dpdy'),null}DpdyCoarse(e,t){return console.error('TODO: dpdyCoarse'),null}DpdyFine(e,t){return console.error('TODO: dpdyFine'),null}Fwidth(e,t){return console.error('TODO: fwidth'),null}FwidthCoarse(e,t){return console.error('TODO: fwidthCoarse'),null}FwidthFine(e,t){return console.error('TODO: fwidthFine'),null}TextureDimensions(e,t){const n=e.args[0];if((e.args.length>1?this.exec.evalExpression(e.args[1],t).value:0)>0)return console.error(`TODO: Mip levels. Line ${e.line}`),null;if(n instanceof ne){const s=n.name,r=t.getVariableValue(s);return r instanceof Se?new Ie(r.textureSize,this.getTypeInfo('vec2u')):(console.error(`Texture ${s} not found. Line ${e.line}`),null)}return console.error(`Invalid texture argument for textureDimensions. Line ${e.line}`),null}TextureGather(e,t){return console.error('TODO: textureGather'),null}TextureGatherCompare(e,t){return console.error('TODO: textureGatherCompare'),null}TextureLoad(e,t){const n=e.args[0],s=this.exec.evalExpression(e.args[1],t);if((e.args.length>2?this.exec.evalExpression(e.args[2],t).value:0)>0)return console.error(`TODO: Mip levels. Line ${e.line}`),null;if(!(s instanceof Ie)||2!==s.value.length)return console.error(`Invalid UV argument for textureLoad. Line ${e.line}`),null;if(n instanceof ne){const r=n.name,a=t.getVariableValue(r);if(a instanceof Se){const t=a.textureSize,n=Math.floor(s.value[0]),i=Math.floor(s.value[1]);if(n<0||n>=t[0]||i<0||i>=t[1])return console.error(`Texture ${r} out of bounds. Line ${e.line}`),null;const o=4*(i*t[0]+n),u=new Uint8Array(a.buffer,o,4);return new Ie([u[0]/255,u[1]/255,u[2]/255,u[3]/255],this.getTypeInfo('vec4f'))}return console.error(`Texture ${r} not found. Line ${e.line}`),null}return console.error(`Invalid texture argument for textureLoad. Line ${e.line}`),null}TextureNumLayers(e,t){return console.error('TODO: textureNumLayers'),null}TextureNumLevels(e,t){return console.error('TODO: textureNumLevels'),null}TextureNumSamples(e,t){return console.error('TODO: textureNumSamples'),null}TextureSample(e,t){return console.error('TODO: textureSample'),null}TextureSampleBias(e,t){return console.error('TODO: textureSampleBias'),null}TextureSampleCompare(e,t){return console.error('TODO: textureSampleCompare'),null}TextureSampleCompareLevel(e,t){return console.error('TODO: textureSampleCompareLevel'),null}TextureSampleGrad(e,t){return console.error('TODO: textureSampleGrad'),null}TextureSampleLevel(e,t){return console.error('TODO: textureSampleLevel'),null}TextureSampleBaseClampToEdge(e,t){return console.error('TODO: textureSampleBaseClampToEdge'),null}TextureStore(e,t){const n=e.args[0],s=this.exec.evalExpression(e.args[1],t),r=this.exec.evalExpression(e.args[2],t).value;if(4!==r.length)return console.error(`Invalid value argument for textureStore. Line ${e.line}`),null;if(!(s instanceof Ie)||2!==s.value.length)return console.error(`Invalid UV argument for textureStore. Line ${e.line}`),null;if(n instanceof ne){const a=n.name,i=t.getVariableValue(a);if(i instanceof Se){const t=i.textureSize,n=Math.floor(s.value[0]),o=Math.floor(s.value[1]);if(n<0||n>=t[0]||o<0||o>=t[1])return console.error(`Texture ${a} out of bounds. Line ${e.line}`),null;const u=4*(o*t[0]+n),l=new Uint8Array(i.buffer,u,4);return l[0]=255*r[0],l[1]=255*r[1],l[2]=255*r[2],l[3]=255*r[3],null}return console.error(`Texture ${a} not found. Line ${e.line}`),null}return console.error(`Invalid texture argument for textureStore. Line ${e.line}`),null}AtomicLoad(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t);return t.getVariable(s).value.getDataValue(this.exec,n.postfix,t)}AtomicStore(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t);return o instanceof be&&i instanceof be&&(o.value=i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),null}AtomicAdd(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t);return o instanceof be&&i instanceof be&&(o.value+=i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),null}AtomicSub(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t);return o instanceof be&&i instanceof be&&(o.value-=i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),null}AtomicMax(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=Math.max(o.value,i.value)),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicMin(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=Math.min(o.value,i.value)),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicAnd(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=o.value&i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicOr(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=o.value|i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicXor(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=o.value^i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicExchange(e,t){let n=e.args[0];n instanceof ce&&(n=n.right);const s=this.exec.getVariableName(n,t),r=t.getVariable(s);let a=e.args[1];const i=this.exec.evalExpression(a,t),o=r.value.getDataValue(this.exec,n.postfix,t),u=new be(o.value,o.typeInfo);return o instanceof be&&i instanceof be&&(o.value=i.value),r.value instanceof Se&&r.value.setDataValue(this.exec,o,n.postfix,t),u}AtomicCompareExchangeWeak(e,t){return console.error('TODO: atomicCompareExchangeWeak'),null}Pack4x8snorm(e,t){return console.error('TODO: pack4x8snorm'),null}Pack4x8unorm(e,t){return console.error('TODO: pack4x8unorm'),null}Pack4xI8(e,t){return console.error('TODO: pack4xI8'),null}Pack4xU8(e,t){return console.error('TODO: pack4xU8'),null}Pack4x8Clamp(e,t){return console.error('TODO: pack4x8Clamp'),null}Pack4xU8Clamp(e,t){return console.error('TODO: pack4xU8Clamp'),null}Pack2x16snorm(e,t){return console.error('TODO: pack2x16snorm'),null}Pack2x16unorm(e,t){return console.error('TODO: pack2x16unorm'),null}Pack2x16float(e,t){return console.error('TODO: pack2x16float'),null}Unpack4x8snorm(e,t){return console.error('TODO: unpack4x8snorm'),null}Unpack4x8unorm(e,t){return console.error('TODO: unpack4x8unorm'),null}Unpack4xI8(e,t){return console.error('TODO: unpack4xI8'),null}Unpack4xU8(e,t){return console.error('TODO: unpack4xU8'),null}Unpack2x16snorm(e,t){return console.error('TODO: unpack2x16snorm'),null}Unpack2x16unorm(e,t){return console.error('TODO: unpack2x16unorm'),null}Unpack2x16float(e,t){return console.error('TODO: unpack2x16float'),null}StorageBarrier(e,t){return null}TextureBarrier(e,t){return null}WorkgroupBarrier(e,t){return null}WorkgroupUniformLoad(e,t){return null}SubgroupAdd(e,t){return console.error('TODO: subgroupAdd'),null}SubgroupExclusiveAdd(e,t){return console.error('TODO: subgroupExclusiveAdd'),null}SubgroupInclusiveAdd(e,t){return console.error('TODO: subgroupInclusiveAdd'),null}SubgroupAll(e,t){return console.error('TODO: subgroupAll'),null}SubgroupAnd(e,t){return console.error('TODO: subgroupAnd'),null}SubgroupAny(e,t){return console.error('TODO: subgroupAny'),null}SubgroupBallot(e,t){return console.error('TODO: subgroupBallot'),null}SubgroupBroadcast(e,t){return console.error('TODO: subgroupBroadcast'),null}SubgroupBroadcastFirst(e,t){return console.error('TODO: subgroupBroadcastFirst'),null}SubgroupElect(e,t){return console.error('TODO: subgroupElect'),null}SubgroupMax(e,t){return console.error('TODO: subgroupMax'),null}SubgroupMin(e,t){return console.error('TODO: subgroupMin'),null}SubgroupMul(e,t){return console.error('TODO: subgroupMul'),null}SubgroupExclusiveMul(e,t){return console.error('TODO: subgroupExclusiveMul'),null}SubgroupInclusiveMul(e,t){return console.error('TODO: subgroupInclusiveMul'),null}SubgroupOr(e,t){return console.error('TODO: subgroupOr'),null}SubgroupShuffle(e,t){return console.error('TODO: subgroupShuffle'),null}SubgroupShuffleDown(e,t){return console.error('TODO: subgroupShuffleDown'),null}SubgroupShuffleUp(e,t){return console.error('TODO: subgroupShuffleUp'),null}SubgroupShuffleXor(e,t){return console.error('TODO: subgroupShuffleXor'),null}SubgroupXor(e,t){return console.error('TODO: subgroupXor'),null}QuadBroadcast(e,t){return console.error('TODO: quadBroadcast'),null}QuadSwapDiagonal(e,t){return console.error('TODO: quadSwapDiagonal'),null}QuadSwapX(e,t){return console.error('TODO: quadSwapX'),null}QuadSwapY(e,t){return console.error('TODO: quadSwapY'),null}}function qe(e){return Array.isArray(e)||(null==e?undefined:e.buffer)instanceof ArrayBuffer}const Be=new Float32Array(1),ze=new Uint32Array(Be.buffer),Re=new Uint32Array(Be.buffer),Ge=new Int32Array(1),We=new Float32Array(Ge.buffer),Pe=new Uint32Array(Ge.buffer),Xe=new Uint32Array(1),Ze=new Float32Array(Xe.buffer),je=new Int32Array(Xe.buffer);function Qe(e,t,n){if(t===n)return e;if('f32'===t){if('i32'===n||'x32'===n)return Be[0]=e,ze[0];if('u32'===n)return Be[0]=e,Re[0]}else if('i32'===t||'x32'===t){if('f32'===n)return Ge[0]=e,We[0];if('u32'===n)return Ge[0]=e,Pe[0]}else if('u32'===t){if('f32'===n)return Xe[0]=e,Ze[0];if('i32'===n||'x32'===n)return Xe[0]=e,je[0]}return console.error(`Unsupported cast from ${t} to ${n}`),e}class Ye extends Fe{constructor(e,t){var n;super(),this.ast=null!=e?e:[],this.reflection=new Oe,this.reflection.updateAST(this.ast),this.context=null!==(n=null==t?undefined:t.clone())&&undefined!==n?n:new Me,this.builtins=new Ue(this),this.typeInfo={bool:this.getTypeInfo(X.bool),i32:this.getTypeInfo(X.i32),u32:this.getTypeInfo(X.u32),f32:this.getTypeInfo(X.f32),f16:this.getTypeInfo(X.f16),vec2f:this.getTypeInfo(j.vec2f),vec2u:this.getTypeInfo(j.vec2u),vec2i:this.getTypeInfo(j.vec2i),vec2h:this.getTypeInfo(j.vec2h),vec3f:this.getTypeInfo(j.vec3f),vec3u:this.getTypeInfo(j.vec3u),vec3i:this.getTypeInfo(j.vec3i),vec3h:this.getTypeInfo(j.vec3h),vec4f:this.getTypeInfo(j.vec4f),vec4u:this.getTypeInfo(j.vec4u),vec4i:this.getTypeInfo(j.vec4i),vec4h:this.getTypeInfo(j.vec4h),mat2x2f:this.getTypeInfo(j.mat2x2f),mat2x3f:this.getTypeInfo(j.mat2x3f),mat2x4f:this.getTypeInfo(j.mat2x4f),mat3x2f:this.getTypeInfo(j.mat3x2f),mat3x3f:this.getTypeInfo(j.mat3x3f),mat3x4f:this.getTypeInfo(j.mat3x4f),mat4x2f:this.getTypeInfo(j.mat4x2f),mat4x3f:this.getTypeInfo(j.mat4x3f),mat4x4f:this.getTypeInfo(j.mat4x4f)};}getVariableValue(e){var t,n;const s=null!==(n=null===(t=this.context.getVariable(e))||undefined===t?undefined:t.value)&&undefined!==n?n:null;return null===s?null:s instanceof be||s instanceof Ie||s instanceof Te?s.value:(console.error(`Unsupported return variable type ${s.typeInfo.name}`),null)}execute(e){(e=null!=e?e:{}).constants&&this._setOverrides(e.constants,this.context),this._execStatements(this.ast,this.context);}dispatchWorkgroups(e,t,n,s){const r=this.context.clone();(s=null!=s?s:{}).constants&&this._setOverrides(s.constants,r),this._execStatements(this.ast,r);const a=r.getFunction(e);if(!a)return void console.error(`Function ${e} not found`);if('number'==typeof t)t=[t,1,1];else {if(0===t.length)return void console.error('Invalid dispatch count');1===t.length?t=[t[0],1,1]:2===t.length?t=[t[0],t[1],1]:t.length>3&&(t=[t[0],t[1],t[2]]);}const i=t[0],o=t[1],u=t[2],l=this.getTypeInfo('vec3u');r.setVariable('@num_workgroups',new Ie(t,l));for(const e in n)for(const t in n[e]){const s=n[e][t];r.variables.forEach((n=>{const r=n.node;if(null==r?undefined:r.attributes){let a=null,i=null;for(const e of r.attributes)'binding'===e.name?a=e.value:'group'===e.name&&(i=e.value);t==a&&e==i&&(undefined!==s.texture&&undefined!==s.size?n.value=new Se(s.texture,this.getTypeInfo(r.type),0,s.size):undefined!==s.uniform?n.value=new Se(s.uniform,this.getTypeInfo(r.type)):n.value=new Se(s,this.getTypeInfo(r.type)));}}));}for(let e=0;e<u;++e)for(let t=0;t<o;++t)for(let n=0;n<i;++n)r.setVariable('@workgroup_id',new Ie([n,t,e],this.getTypeInfo('vec3u'))),this._dispatchWorkgroup(a,[n,t,e],r);}execStatement(e,t){if(e instanceof U)return this.evalExpression(e.value,t);if(e instanceof W){if(e.condition){const n=this.evalExpression(e.condition,t);if(!(n instanceof be))throw new Error('Invalid break-if condition');if(!n.value)return null}return Ye._breakObj}if(e instanceof P)return Ye._continueObj;if(e instanceof V)this._let(e,t);else if(e instanceof A)this._var(e,t);else if(e instanceof N)this._const(e,t);else if(e instanceof k)this._function(e,t);else {if(e instanceof F)return this._if(e,t);if(e instanceof M)return this._switch(e,t);if(e instanceof E)return this._for(e,t);if(e instanceof T)return this._while(e,t);if(e instanceof C)return this._loop(e,t);if(e instanceof S){const n=t.clone();return n.currentFunctionName=t.currentFunctionName,this._execStatements(e.body,n)}if(e instanceof O)this._assign(e,t);else if(e instanceof L)this._increment(e,t);else {if(e instanceof Z)return null;if(e instanceof $){const n=e.name;null===t.getVariable(n)&&t.setVariable(n,new be(0,this.getTypeInfo('u32')));}else if(e instanceof D)this._call(e,t);else {if(e instanceof z)return null;if(e instanceof R)return null;console.error('Invalid statement type.',e,`Line ${e.line}`);}}}return null}evalExpression(e,t){for(;e instanceof oe;)e=e.contents[0];return e instanceof he?this._evalBinaryOp(e,t):e instanceof re?this._evalLiteral(e,t):e instanceof ne?this._evalVariable(e,t):e instanceof te?this._evalCall(e,t):e instanceof ee?this._evalCreate(e,t):e instanceof se?this._evalConst(e,t):e instanceof ae?this._evalBitcast(e,t):e instanceof ce?this._evalUnaryOp(e,t):(console.error('Invalid expression type',e,`Line ${e.line}`),null)}getTypeInfo(e){var t;if(e instanceof X){const t=this.reflection.getTypeInfo(e);if(null!==t)return t}const n=null!==(t=this.typeInfo[e])&&undefined!==t?t:null;return null!==n?n:null}getTypeName(e){if(null===e)return console.error('Type is null.'),'unknown';let t=e.name;if(e instanceof r||e instanceof j)if(null!==e.format){if('vec2'===t||'vec3'===t||'vec4'===t||'mat2x2'===t||'mat2x3'===t||'mat2x4'===t||'mat3x2'===t||'mat3x3'===t||'mat3x4'===t||'mat4x2'===t||'mat4x3'===t||'mat4x4'===t){if('f32'===e.format.name)return t+='f',t;if('i32'===e.format.name)return t+='i',t;if('u32'===e.format.name)return t+='u',t;if('bool'===e.format.name)return t+='b',t;if('f16'===e.format.name)return t+='h',t}t+=`<${e.format.name}>`;}else if('vec2'===t||'vec3'===t||'vec4'===t)return t;return t}_setOverrides(e,t){for(const n in e){const s=e[n],r=this.reflection.getOverrideInfo(n);null!==r?'u32'===r.type.name||'i32'===r.type.name||'f32'===r.type.name||'f16'===r.type.name?t.setVariable(n,new be(s,r.type)):'bool'===r.type.name?t.setVariable(n,new be(s?1:0,r.type)):'vec2'===r.type.name||'vec3'===r.type.name||'vec4'===r.type.name||'vec2f'===r.type.name||'vec3f'===r.type.name||'vec4f'===r.type.name||'vec2i'===r.type.name||'vec3i'===r.type.name||'vec4i'===r.type.name||'vec2u'===r.type.name||'vec3u'===r.type.name||'vec4u'===r.type.name||'vec2h'===r.type.name||'vec3h'===r.type.name||'vec4h'===r.type.name?t.setVariable(n,new Ie(s,r.type)):console.error(`Invalid constant type for ${n}`):console.error(`Override ${n} does not exist in the shader.`);}}_dispatchWorkgroup(e,t,n){const s=[1,1,1];for(const t of e.node.attributes)if('workgroup_size'===t.name){if(t.value.length>0){const e=n.getVariableValue(t.value[0]);s[0]=e instanceof be?e.value:parseInt(t.value[0]);}if(t.value.length>1){const e=n.getVariableValue(t.value[1]);s[1]=e instanceof be?e.value:parseInt(t.value[1]);}if(t.value.length>2){const e=n.getVariableValue(t.value[2]);s[2]=e instanceof be?e.value:parseInt(t.value[2]);}}const r=this.getTypeInfo('vec3u'),a=this.getTypeInfo('u32');n.setVariable('@workgroup_size',new Ie(s,r));const i=s[0],o=s[1],u=s[2];for(let l=0,c=0;l<u;++l)for(let u=0;u<o;++u)for(let o=0;o<i;++o,++c){const i=[o,u,l],h=[o+t[0]*s[0],u+t[1]*s[1],l+t[2]*s[2]];n.setVariable('@local_invocation_id',new Ie(i,r)),n.setVariable('@global_invocation_id',new Ie(h,r)),n.setVariable('@local_invocation_index',new be(c,a)),this._dispatchExec(e,n);}}_dispatchExec(e,t){for(const n of e.node.args)for(const e of n.attributes)if('builtin'===e.name){const s=`@${e.value}`,r=t.getVariable(s);undefined!==r&&t.variables.set(n.name,r);}this._execStatements(e.node.body,t);}getVariableName(e,t){return e instanceof ne?e.name:(console.error('Unknown variable type',e,'Line',e.line),null)}_execStatements(e,t){for(const n of e){if(n instanceof Array){const e=t.clone(),s=this._execStatements(n,e);if(s)return s;continue}const e=this.execStatement(n,t);if(e)return e}return null}_call(e,t){const n=t.clone();n.currentFunctionName=e.name;const s=t.getFunction(e.name);if(s){for(let t=0;t<s.node.args.length;++t){const r=s.node.args[t],a=this.evalExpression(e.args[t],n);n.setVariable(r.name,a,r);}this._execStatements(s.node.body,n);}else this._callBuiltinFunction(e,n);}_increment(e,t){const n=this.getVariableName(e.variable,t),s=t.getVariable(n);s?'++'===e.operator?s.value instanceof be?s.value.value++:console.error(`Variable ${n} is not a scalar. Line ${e.line}`):'--'===e.operator?s.value instanceof be?s.value.value--:console.error(`Variable ${n} is not a scalar. Line ${e.line}`):console.error(`Unknown increment operator ${e.operator}. Line ${e.line}`):console.error(`Variable ${n} not found. Line ${e.line}`);}_assign(e,t){const n=this.getVariableName(e.variable,t),s=t.getVariable(n);if(null===s)return void console.error(`Variable ${n} not found. Line ${e.line}`);const r=this.evalExpression(e.value,t),a=e.operator;if('='===a)if(s.value instanceof Se)s.value.setDataValue(this,r,e.variable.postfix,t);else if(e.variable.postfix){if(!(s.value instanceof Ie||s.value instanceof Te))return void console.error(`Variable ${s.name} is not a vector or matrix. Line ${e.line}`);if(e.variable.postfix instanceof ue){const n=this.evalExpression(e.variable.postfix.index,t).value;if(s.value instanceof Ie){if(!(r instanceof be))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[n]=r.value;}else {if(!(s.value instanceof Te))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);{const n=this.evalExpression(e.variable.postfix.index,t).value;if(n<0)return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);if(!(r instanceof Ie))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);{const t=this.getTypeName(s.value.typeInfo);if('mat2x2'===t||'mat2x2f'===t||'mat2x2h'===t){if(!(n<2&&2===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[2*n]=r.value[0],s.value.value[2*n+1]=r.value[1];}else if('mat2x3'===t||'mat2x3f'===t||'mat2x3h'===t){if(!(n<2&&3===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[3*n]=r.value[0],s.value.value[3*n+1]=r.value[1],s.value.value[3*n+2]=r.value[2];}else if('mat2x4'===t||'mat2x4f'===t||'mat2x4h'===t){if(!(n<2&&4===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[4*n]=r.value[0],s.value.value[4*n+1]=r.value[1],s.value.value[4*n+2]=r.value[2],s.value.value[4*n+3]=r.value[3];}else if('mat3x2'===t||'mat3x2f'===t||'mat3x2h'===t){if(!(n<3&&2===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[2*n]=r.value[0],s.value.value[2*n+1]=r.value[1];}else if('mat3x3'===t||'mat3x3f'===t||'mat3x3h'===t){if(!(n<3&&3===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[3*n]=r.value[0],s.value.value[3*n+1]=r.value[1],s.value.value[3*n+2]=r.value[2];}else if('mat3x4'===t||'mat3x4f'===t||'mat3x4h'===t){if(!(n<3&&4===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[4*n]=r.value[0],s.value.value[4*n+1]=r.value[1],s.value.value[4*n+2]=r.value[2],s.value.value[4*n+3]=r.value[3];}else if('mat4x2'===t||'mat4x2f'===t||'mat4x2h'===t){if(!(n<4&&2===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[2*n]=r.value[0],s.value.value[2*n+1]=r.value[1];}else if('mat4x3'===t||'mat4x3f'===t||'mat4x3h'===t){if(!(n<4&&3===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[3*n]=r.value[0],s.value.value[3*n+1]=r.value[1],s.value.value[3*n+2]=r.value[2];}else {if('mat4x4'!==t&&'mat4x4f'!==t&&'mat4x4h'!==t)return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);if(!(n<4&&4===r.value.length))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);s.value.value[4*n]=r.value[0],s.value.value[4*n+1]=r.value[1],s.value.value[4*n+2]=r.value[2],s.value.value[4*n+3]=r.value[3];}}}}}else if(e.variable.postfix instanceof J){const t=e.variable.postfix.value;if(!(s.value instanceof Ie))return void console.error(`Invalid assignment to ${t}. Variable ${s.name} is not a vector. Line ${e.line}`);if(r instanceof be){if(t.length>1)return void console.error(`Invalid assignment to ${t} for variable ${s.name}. Line ${e.line}`);if('x'===t)s.value.value[0]=r.value;else if('y'===t){if(s.value.value.length<2)return void console.error(`Invalid assignment to ${t} for variable ${s.name}. Line ${e.line}`);s.value.value[1]=r.value;}else if('z'===t){if(s.value.value.length<3)return void console.error(`Invalid assignment to ${t} for variable ${s.name}. Line ${e.line}`);s.value.value[2]=r.value;}else if('w'===t){if(s.value.value.length<4)return void console.error(`Invalid assignment to ${t} for variable ${s.name}. Line ${e.line}`);s.value.value[3]=r.value;}}else {if(!(r instanceof Ie))return void console.error(`Invalid assignment to ${s.name}. Line ${e.line}`);if(t.length!==r.value.length)return void console.error(`Invalid assignment to ${t} for variable ${s.name}. Line ${e.line}`);for(let n=0;n<t.length;++n){const a=t[n];if('x'===a||'r'===a)s.value.value[0]=r.value[n];else if('y'===a||'g'===a){if(r.value.length<2)return void console.error(`Invalid assignment to ${a} for variable ${s.name}. Line ${e.line}`);s.value.value[1]=r.value[n];}else if('z'===a||'b'===a){if(r.value.length<3)return void console.error(`Invalid assignment to ${a} for variable ${s.name}. Line ${e.line}`);s.value.value[2]=r.value[n];}else {if('w'!==a&&'a'!==a)return void console.error(`Invalid assignment to ${a} for variable ${s.name}. Line ${e.line}`);if(r.value.length<4)return void console.error(`Invalid assignment to ${a} for variable ${s.name}. Line ${e.line}`);s.value.value[3]=r.value[n];}}}}}else s.value=r;else {const n=s.value.getDataValue(this,e.variable.postfix,t);if(n instanceof Ie&&r instanceof be){const t=n.value,s=r.value;if('+='===a)for(let e=0;e<t.length;++e)t[e]+=s;else if('-='===a)for(let e=0;e<t.length;++e)t[e]-=s;else if('*='===a)for(let e=0;e<t.length;++e)t[e]*=s;else if('/='===a)for(let e=0;e<t.length;++e)t[e]/=s;else if('%='===a)for(let e=0;e<t.length;++e)t[e]%=s;else if('&='===a)for(let e=0;e<t.length;++e)t[e]&=s;else if('|='===a)for(let e=0;e<t.length;++e)t[e]|=s;else if('^='===a)for(let e=0;e<t.length;++e)t[e]^=s;else if('<<='===a)for(let e=0;e<t.length;++e)t[e]<<=s;else if('>>='===a)for(let e=0;e<t.length;++e)t[e]>>=s;else console.error(`Invalid operator ${a}. Line ${e.line}`);}else if(n instanceof Ie&&r instanceof Ie){const t=n.value,s=r.value;if(t.length!==s.length)return void console.error(`Vector length mismatch. Line ${e.line}`);if('+='===a)for(let e=0;e<t.length;++e)t[e]+=s[e];else if('-='===a)for(let e=0;e<t.length;++e)t[e]-=s[e];else if('*='===a)for(let e=0;e<t.length;++e)t[e]*=s[e];else if('/='===a)for(let e=0;e<t.length;++e)t[e]/=s[e];else if('%='===a)for(let e=0;e<t.length;++e)t[e]%=s[e];else if('&='===a)for(let e=0;e<t.length;++e)t[e]&=s[e];else if('|='===a)for(let e=0;e<t.length;++e)t[e]|=s[e];else if('^='===a)for(let e=0;e<t.length;++e)t[e]^=s[e];else if('<<='===a)for(let e=0;e<t.length;++e)t[e]<<=s[e];else if('>>='===a)for(let e=0;e<t.length;++e)t[e]>>=s[e];else console.error(`Invalid operator ${a}. Line ${e.line}`);}else {if(!(n instanceof be&&r instanceof be))return void console.error(`Invalid type for ${e.operator} operator. Line ${e.line}`);'+='===a?n.value+=r.value:'-='===a?n.value-=r.value:'*='===a?n.value*=r.value:'/='===a?n.value/=r.value:'%='===a?n.value%=r.value:'&='===a?n.value&=r.value:'|='===a?n.value|=r.value:'^='===a?n.value^=r.value:'<<='===a?n.value<<=r.value:'>>='===a?n.value>>=r.value:console.error(`Invalid operator ${a}. Line ${e.line}`);}s.value instanceof Se&&s.value.setDataValue(this,n,e.variable.postfix,t);}}_function(e,t){const n=new Ce(e);t.functions.set(e.name,n);}_const(e,t){let n=null;null!=e.value&&(n=this.evalExpression(e.value,t)),t.createVariable(e.name,n,e);}_let(e,t){let n=null;null!=e.value&&(n=this.evalExpression(e.value,t)),t.createVariable(e.name,n,e);}_var(e,t){let n=null;if(null!==e.value)n=this.evalExpression(e.value,t);else {if(null===e.type)return void console.error(`Variable ${e.name} has no type. Line ${e.line}`);if('f32'===e.type.name||'i32'===e.type.name||'u32'===e.type.name||'bool'===e.type.name||'f16'===e.type.name||'vec2'===e.type.name||'vec3'===e.type.name||'vec4'===e.type.name||'vec2f'===e.type.name||'vec3f'===e.type.name||'vec4f'===e.type.name||'vec2i'===e.type.name||'vec3i'===e.type.name||'vec4i'===e.type.name||'vec2u'===e.type.name||'vec3u'===e.type.name||'vec4u'===e.type.name||'vec2h'===e.type.name||'vec3h'===e.type.name||'vec4h'===e.type.name||'mat2x2'===e.type.name||'mat2x3'===e.type.name||'mat2x4'===e.type.name||'mat3x2'===e.type.name||'mat3x3'===e.type.name||'mat3x4'===e.type.name||'mat4x2'===e.type.name||'mat4x3'===e.type.name||'mat4x4'===e.type.name||'mat2x2f'===e.type.name||'mat2x3f'===e.type.name||'mat2x4f'===e.type.name||'mat3x2f'===e.type.name||'mat3x3f'===e.type.name||'mat3x4f'===e.type.name||'mat4x2f'===e.type.name||'mat4x3f'===e.type.name||'mat4x4f'===e.type.name||'mat2x2h'===e.type.name||'mat2x3h'===e.type.name||'mat2x4h'===e.type.name||'mat3x2h'===e.type.name||'mat3x3h'===e.type.name||'mat3x4h'===e.type.name||'mat4x2h'===e.type.name||'mat4x3h'===e.type.name||'mat4x4h'===e.type.name){const s=new ee(e.type,[]);n=this._evalCreate(s,t);}if('array'===e.type.name){const s=new ee(e.type,[]);n=this._evalCreate(s,t);}}t.createVariable(e.name,n,e);}_switch(e,t){t=t.clone();const n=this.evalExpression(e.condition,t);if(!(n instanceof be))return console.error(`Invalid if condition. Line ${e.line}`),null;let s=null;for(const r of e.cases)if(r instanceof me)for(const a of r.selectors){if(a instanceof pe){s=r;continue}const i=this.evalExpression(a,t);if(!(i instanceof be))return console.error(`Invalid case selector. Line ${e.line}`),null;if(i.value===n.value)return this._execStatements(r.body,t)}else r instanceof de&&(s=r);return s?this._execStatements(s.body,t):null}_if(e,t){t=t.clone();const n=this.evalExpression(e.condition,t);if(!(n instanceof be))return console.error(`Invalid if condition. Line ${e.line}`),null;if(n.value)return this._execStatements(e.body,t);for(const n of e.elseif){const s=this.evalExpression(n.condition,t);if(!(s instanceof be))return console.error(`Invalid if condition. Line ${e.line}`),null;if(s.value)return this._execStatements(n.body,t)}return e.else?this._execStatements(e.else,t):null}_getScalarValue(e){return e instanceof be?e.value:(console.error('Expected scalar value.',e),0)}_for(e,t){for(t=t.clone(),this.execStatement(e.init,t);this._getScalarValue(this.evalExpression(e.condition,t));){const n=this._execStatements(e.body,t);if(n===Ye._breakObj)break;if(null!==n&&n!==Ye._continueObj)return n;this.execStatement(e.increment,t);}return null}_loop(e,t){for(t=t.clone();;){const n=this._execStatements(e.body,t);if(n===Ye._breakObj)break;if(n===Ye._continueObj){if(e.continuing){if(this._execStatements(e.continuing.body,t)===Ye._breakObj)break}}else if(null!==n)return n}return null}_while(e,t){for(t=t.clone();this._getScalarValue(this.evalExpression(e.condition,t));){const n=this._execStatements(e.body,t);if(n===Ye._breakObj)break;if(n!==Ye._continueObj&&null!==n)return n}return null}_evalBitcast(e,t){const n=this.evalExpression(e.value,t),s=e.type;if(n instanceof be){const e=Qe(n.value,n.typeInfo.name,s.name);return new be(e,this.getTypeInfo(s))}if(n instanceof Ie){const t=this.getTypeName(n.typeInfo);let r='';if(t.endsWith('f'))r='f32';else if(t.endsWith('i'))r='i32';else if(t.endsWith('u'))r='u32';else if(t.endsWith('b'))r='bool';else {if(!t.endsWith('h'))return console.error(`Unknown vector type ${t}. Line ${e.line}`),null;r='f16';}const a=this.getTypeName(s);let i='';if(a.endsWith('f'))i='f32';else if(a.endsWith('i'))i='i32';else if(a.endsWith('u'))i='u32';else if(a.endsWith('b'))i='bool';else {if(!a.endsWith('h'))return console.error(`Unknown vector type ${i}. Line ${e.line}`),null;i='f16';}const o=function(e,t,n){if(t===n)return e;const s=new Array(e.length);for(let r=0;r<e.length;r++)s[r]=Qe(e[r],t,n);return s}(n.value,r,i);return new Ie(o,this.getTypeInfo(s))}return console.error(`TODO: bitcast for ${n.typeInfo.name}. Line ${e.line}`),null}_evalConst(e,t){const n=t.getVariableValue(e.name);return e.postfix?n.getDataValue(this,e.postfix,t):n}_evalCreate(e,t){var r;if(null===e.type)return we.void;const a=this.getTypeName(e.type);switch(a){case 'bool':case 'i32':case 'u32':case 'f32':case 'f16':return this._callConstructorValue(e,t);case 'vec2':case 'vec3':case 'vec4':case 'vec2f':case 'vec3f':case 'vec4f':case 'vec2h':case 'vec3h':case 'vec4h':case 'vec2i':case 'vec3i':case 'vec4i':case 'vec2u':case 'vec3u':case 'vec4u':case 'vec2b':case 'vec3b':case 'vec4b':return this._callConstructorVec(e,t);case 'mat2x2':case 'mat2x2f':case 'mat2x2h':case 'mat2x3':case 'mat2x3f':case 'mat2x3h':case 'mat2x4':case 'mat2x4f':case 'mat2x4h':case 'mat3x2':case 'mat3x2f':case 'mat3x2h':case 'mat3x3':case 'mat3x3f':case 'mat3x3h':case 'mat3x4':case 'mat3x4f':case 'mat3x4h':case 'mat4x2':case 'mat4x2f':case 'mat4x2h':case 'mat4x3':case 'mat4x3f':case 'mat4x3h':case 'mat4x4':case 'mat4x4f':case 'mat4x4h':return this._callConstructorMatrix(e,t)}const i=this.getTypeInfo(e.type);if(null===i)return console.error(`Unknown type ${a}. Line ${e.line}`),null;if(0===i.size)return null;const o=new Se(new ArrayBuffer(i.size),i,0);if(i instanceof n){if(e.args)for(let n=0;n<e.args.length;++n){const s=i.members[n],r=e.args[n],a=this.evalExpression(r,t);o.setData(this,a,s.type,s.offset,t);}}else if(i instanceof s){let n=0;if(e.args)for(let s=0;s<e.args.length;++s){const a=e.args[s],u=this.evalExpression(a,t);null===i.format&&('x32'===(null===(r=u.typeInfo)||undefined===r?undefined:r.name)?i.format=this.getTypeInfo('i32'):i.format=u.typeInfo),o.setData(this,u,i.format,n,t),n+=i.stride;}}else console.error(`Unknown type "${a}". Line ${e.line}`);return o}_evalLiteral(e,t){const n=this.getTypeInfo(e.type),s=n.name;if('x32'===s||'u32'===s||'f32'===s||'f16'===s||'i32'===s||'bool'===s){return new be(e.scalarValue,n)}return 'vec2'===s||'vec3'===s||'vec4'===s||'vec2f'===s||'vec3f'===s||'vec4f'===s||'vec2h'===s||'vec3h'===s||'vec4h'===s||'vec2i'===s||'vec3i'===s||'vec4i'===s||'vec2u'===s||'vec3u'===s||'vec4u'===s?this._callConstructorVec(e,t):'mat2x2'===s||'mat2x3'===s||'mat2x4'===s||'mat3x2'===s||'mat3x3'===s||'mat3x4'===s||'mat4x2'===s||'mat4x3'===s||'mat4x4'===s||'mat2x2f'===s||'mat2x3f'===s||'mat2x4f'===s||'mat3x2f'===s||'mat3x3f'===s||'mat3x4f'===s||'mat4x2f'===s||'mat4x3f'===s||'mat4x4f'===s||'mat2x2h'===s||'mat2x3h'===s||'mat2x4h'===s||'mat3x2h'===s||'mat3x3h'===s||'mat3x4h'===s||'mat4x2h'===s||'mat4x3h'===s||'mat4x4h'===s?this._callConstructorMatrix(e,t):e.value}_evalVariable(e,t){const n=t.getVariableValue(e.name);return null===n?n:(null==e?undefined:e.postfix)?n.getDataValue(this,e.postfix,t):n}_maxFormatTypeInfo(e){let t=e[0];if('f32'===t.name)return t;for(let n=1;n<e.length;++n){const s=Ye._priority.get(t.name);Ye._priority.get(e[n].name)<s&&(t=e[n]);}return 'x32'===t.name?this.getTypeInfo('i32'):t}_evalUnaryOp(e,t){const n=this.evalExpression(e.right,t),s=n instanceof be||n instanceof Ie?n.value:null;switch(e.operator){case '+':{if(qe(s)){const e=s.map(((e,t)=>+e));return new Ie(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new be(+e,t)}case '-':{if(qe(s)){const e=s.map(((e,t)=>-e));return new Ie(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new be(-e,t)}case '!':{if(qe(s)){const e=s.map(((e,t)=>e?0:1));return new Ie(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new be(e?0:1,t)}case '~':{if(qe(s)){const e=s.map(((e,t)=>~e));return new Ie(e,n.typeInfo)}const e=s,t=this._maxFormatTypeInfo([n.typeInfo,n.typeInfo]);return new be(~e,t)}}return console.error(`Invalid unary operator ${e.operator}. Line ${e.line}`),null}_evalBinaryOp(e,t){const n=this.evalExpression(e.left,t),s=this.evalExpression(e.right,t),r=n instanceof be||n instanceof Ie||n instanceof Te?n.value:null,a=s instanceof be||s instanceof Ie||s instanceof Te?s.value:null;switch(e.operator){case '+':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e+s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t+e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e+t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t+i,o)}case '-':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e-s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t-e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e-t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t-i,o)}case '*':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e*s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t*e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e*t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t*i,o)}case '%':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e%s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t%e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e%t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t%i,o)}case '/':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e/s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t/e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e/t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t/i,o)}case '&':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e&s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t&e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e&t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t&i,o)}case '|':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e|s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t|e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e|t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t|i,o)}case '^':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e^s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t^e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e^t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t^i,o)}case '<<':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e<<s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t<<e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e<<t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t<<i,o)}case '>>':{if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e>>s[t]));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t>>e));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e>>t));return new Ie(t,s.typeInfo)}const t=r,i=a,o=this._maxFormatTypeInfo([n.typeInfo,s.typeInfo]);return new be(t>>i,o)}case '>':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e>s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t>e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e>t?1:0));return new Ie(t,s.typeInfo)}return new be(r>a?1:0,this.getTypeInfo('bool'));case '<':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e<s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t<e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e<t?1:0));return new Ie(t,s.typeInfo)}return new be(r<a?1:0,this.getTypeInfo('bool'));case '==':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e===s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t==e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e==t?1:0));return new Ie(t,s.typeInfo)}return new be(r===a?1:0,this.getTypeInfo('bool'));case '!=':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e!==s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t!==e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e!==t?1:0));return new Ie(t,s.typeInfo)}return new be(r!==a?1:0,this.getTypeInfo('bool'));case '>=':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e>=s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t>=e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e>=t?1:0));return new Ie(t,s.typeInfo)}return new be(r>=a?1:0,this.getTypeInfo('bool'));case '<=':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e<=s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t<=e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e<=t?1:0));return new Ie(t,s.typeInfo)}return new be(r<=a?1:0,this.getTypeInfo('bool'));case '&&':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e&&s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t&&e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e&&t?1:0));return new Ie(t,s.typeInfo)}return new be(r&&a?1:0,this.getTypeInfo('bool'));case '||':if(qe(r)&&qe(a)){const t=r,s=a;if(t.length!==s.length)return console.error(`Vector length mismatch. Line ${e.line}.`),null;const i=t.map(((e,t)=>e||s[t]?1:0));return new Ie(i,n.typeInfo)}if(qe(r)){const e=a,t=r.map(((t,n)=>t||e?1:0));return new Ie(t,n.typeInfo)}if(qe(a)){const e=r,t=a.map(((t,n)=>e||t?1:0));return new Ie(t,s.typeInfo)}return new be(r||a?1:0,this.getTypeInfo('bool'))}return console.error(`Unknown operator ${e.operator}. Line ${e.line}`),null}_evalCall(e,t){if(null!==e.cachedReturnValue)return e.cachedReturnValue;const n=t.clone();n.currentFunctionName=e.name;const s=t.getFunction(e.name);if(!s)return this._callBuiltinFunction(e,n);for(let t=0;t<s.node.args.length;++t){const r=s.node.args[t],a=this.evalExpression(e.args[t],n);n.createVariable(r.name,a,r);}return this._execStatements(s.node.body,n)}_callBuiltinFunction(e,t){switch(e.name){case 'all':return this.builtins.All(e,t);case 'any':return this.builtins.Any(e,t);case 'select':return this.builtins.Select(e,t);case 'arrayLength':return this.builtins.ArrayLength(e,t);case 'abs':return this.builtins.Abs(e,t);case 'acos':return this.builtins.Acos(e,t);case 'acosh':return this.builtins.Acosh(e,t);case 'asin':return this.builtins.Asin(e,t);case 'asinh':return this.builtins.Asinh(e,t);case 'atan':return this.builtins.Atan(e,t);case 'atanh':return this.builtins.Atanh(e,t);case 'atan2':return this.builtins.Atan2(e,t);case 'ceil':return this.builtins.Ceil(e,t);case 'clamp':return this.builtins.Clamp(e,t);case 'cos':return this.builtins.Cos(e,t);case 'cosh':return this.builtins.Cosh(e,t);case 'countLeadingZeros':return this.builtins.CountLeadingZeros(e,t);case 'countOneBits':return this.builtins.CountOneBits(e,t);case 'countTrailingZeros':return this.builtins.CountTrailingZeros(e,t);case 'cross':return this.builtins.Cross(e,t);case 'degrees':return this.builtins.Degrees(e,t);case 'determinant':return this.builtins.Determinant(e,t);case 'distance':return this.builtins.Distance(e,t);case 'dot':return this.builtins.Dot(e,t);case 'dot4U8Packed':return this.builtins.Dot4U8Packed(e,t);case 'dot4I8Packed':return this.builtins.Dot4I8Packed(e,t);case 'exp':return this.builtins.Exp(e,t);case 'exp2':return this.builtins.Exp2(e,t);case 'extractBits':return this.builtins.ExtractBits(e,t);case 'faceForward':return this.builtins.FaceForward(e,t);case 'firstLeadingBit':return this.builtins.FirstLeadingBit(e,t);case 'firstTrailingBit':return this.builtins.FirstTrailingBit(e,t);case 'floor':return this.builtins.Floor(e,t);case 'fma':return this.builtins.Fma(e,t);case 'fract':return this.builtins.Fract(e,t);case 'frexp':return this.builtins.Frexp(e,t);case 'insertBits':return this.builtins.InsertBits(e,t);case 'inverseSqrt':return this.builtins.InverseSqrt(e,t);case 'ldexp':return this.builtins.Ldexp(e,t);case 'length':return this.builtins.Length(e,t);case 'log':return this.builtins.Log(e,t);case 'log2':return this.builtins.Log2(e,t);case 'max':return this.builtins.Max(e,t);case 'min':return this.builtins.Min(e,t);case 'mix':return this.builtins.Mix(e,t);case 'modf':return this.builtins.Modf(e,t);case 'normalize':return this.builtins.Normalize(e,t);case 'pow':return this.builtins.Pow(e,t);case 'quantizeToF16':return this.builtins.QuantizeToF16(e,t);case 'radians':return this.builtins.Radians(e,t);case 'reflect':return this.builtins.Reflect(e,t);case 'refract':return this.builtins.Refract(e,t);case 'reverseBits':return this.builtins.ReverseBits(e,t);case 'round':return this.builtins.Round(e,t);case 'saturate':return this.builtins.Saturate(e,t);case 'sign':return this.builtins.Sign(e,t);case 'sin':return this.builtins.Sin(e,t);case 'sinh':return this.builtins.Sinh(e,t);case 'smoothStep':return this.builtins.SmoothStep(e,t);case 'sqrt':return this.builtins.Sqrt(e,t);case 'step':return this.builtins.Step(e,t);case 'tan':return this.builtins.Tan(e,t);case 'tanh':return this.builtins.Tanh(e,t);case 'transpose':return this.builtins.Transpose(e,t);case 'trunc':return this.builtins.Trunc(e,t);case 'dpdx':return this.builtins.Dpdx(e,t);case 'dpdxCoarse':return this.builtins.DpdxCoarse(e,t);case 'dpdxFine':return this.builtins.DpdxFine(e,t);case 'dpdy':return this.builtins.Dpdy(e,t);case 'dpdyCoarse':return this.builtins.DpdyCoarse(e,t);case 'dpdyFine':return this.builtins.DpdyFine(e,t);case 'fwidth':return this.builtins.Fwidth(e,t);case 'fwidthCoarse':return this.builtins.FwidthCoarse(e,t);case 'fwidthFine':return this.builtins.FwidthFine(e,t);case 'textureDimensions':return this.builtins.TextureDimensions(e,t);case 'textureGather':return this.builtins.TextureGather(e,t);case 'textureGatherCompare':return this.builtins.TextureGatherCompare(e,t);case 'textureLoad':return this.builtins.TextureLoad(e,t);case 'textureNumLayers':return this.builtins.TextureNumLayers(e,t);case 'textureNumLevels':return this.builtins.TextureNumLevels(e,t);case 'textureNumSamples':return this.builtins.TextureNumSamples(e,t);case 'textureSample':return this.builtins.TextureSample(e,t);case 'textureSampleBias':return this.builtins.TextureSampleBias(e,t);case 'textureSampleCompare':return this.builtins.TextureSampleCompare(e,t);case 'textureSampleCompareLevel':return this.builtins.TextureSampleCompareLevel(e,t);case 'textureSampleGrad':return this.builtins.TextureSampleGrad(e,t);case 'textureSampleLevel':return this.builtins.TextureSampleLevel(e,t);case 'textureSampleBaseClampToEdge':return this.builtins.TextureSampleBaseClampToEdge(e,t);case 'textureStore':return this.builtins.TextureStore(e,t);case 'atomicLoad':return this.builtins.AtomicLoad(e,t);case 'atomicStore':return this.builtins.AtomicStore(e,t);case 'atomicAdd':return this.builtins.AtomicAdd(e,t);case 'atomicSub':return this.builtins.AtomicSub(e,t);case 'atomicMax':return this.builtins.AtomicMax(e,t);case 'atomicMin':return this.builtins.AtomicMin(e,t);case 'atomicAnd':return this.builtins.AtomicAnd(e,t);case 'atomicOr':return this.builtins.AtomicOr(e,t);case 'atomicXor':return this.builtins.AtomicXor(e,t);case 'atomicExchange':return this.builtins.AtomicExchange(e,t);case 'atomicCompareExchangeWeak':return this.builtins.AtomicCompareExchangeWeak(e,t);case 'pack4x8snorm':return this.builtins.Pack4x8snorm(e,t);case 'pack4x8unorm':return this.builtins.Pack4x8unorm(e,t);case 'pack4xI8':return this.builtins.Pack4xI8(e,t);case 'pack4xU8':return this.builtins.Pack4xU8(e,t);case 'pack4x8Clamp':return this.builtins.Pack4x8Clamp(e,t);case 'pack4xU8Clamp':return this.builtins.Pack4xU8Clamp(e,t);case 'pack2x16snorm':return this.builtins.Pack2x16snorm(e,t);case 'pack2x16unorm':return this.builtins.Pack2x16unorm(e,t);case 'pack2x16float':return this.builtins.Pack2x16float(e,t);case 'unpack4x8snorm':return this.builtins.Unpack4x8snorm(e,t);case 'unpack4x8unorm':return this.builtins.Unpack4x8unorm(e,t);case 'unpack4xI8':return this.builtins.Unpack4xI8(e,t);case 'unpack4xU8':return this.builtins.Unpack4xU8(e,t);case 'unpack2x16snorm':return this.builtins.Unpack2x16snorm(e,t);case 'unpack2x16unorm':return this.builtins.Unpack2x16unorm(e,t);case 'unpack2x16float':return this.builtins.Unpack2x16float(e,t);case 'storageBarrier':return this.builtins.StorageBarrier(e,t);case 'textureBarrier':return this.builtins.TextureBarrier(e,t);case 'workgroupBarrier':return this.builtins.WorkgroupBarrier(e,t);case 'workgroupUniformLoad':return this.builtins.WorkgroupUniformLoad(e,t);case 'subgroupAdd':return this.builtins.SubgroupAdd(e,t);case 'subgroupExclusiveAdd':return this.builtins.SubgroupExclusiveAdd(e,t);case 'subgroupInclusiveAdd':return this.builtins.SubgroupInclusiveAdd(e,t);case 'subgroupAll':return this.builtins.SubgroupAll(e,t);case 'subgroupAnd':return this.builtins.SubgroupAnd(e,t);case 'subgroupAny':return this.builtins.SubgroupAny(e,t);case 'subgroupBallot':return this.builtins.SubgroupBallot(e,t);case 'subgroupBroadcast':return this.builtins.SubgroupBroadcast(e,t);case 'subgroupBroadcastFirst':return this.builtins.SubgroupBroadcastFirst(e,t);case 'subgroupElect':return this.builtins.SubgroupElect(e,t);case 'subgroupMax':return this.builtins.SubgroupMax(e,t);case 'subgroupMin':return this.builtins.SubgroupMin(e,t);case 'subgroupMul':return this.builtins.SubgroupMul(e,t);case 'subgroupExclusiveMul':return this.builtins.SubgroupExclusiveMul(e,t);case 'subgroupInclusiveMul':return this.builtins.SubgroupInclusiveMul(e,t);case 'subgroupOr':return this.builtins.SubgroupOr(e,t);case 'subgroupShuffle':return this.builtins.SubgroupShuffle(e,t);case 'subgroupShuffleDown':return this.builtins.SubgroupShuffleDown(e,t);case 'subgroupShuffleUp':return this.builtins.SubgroupShuffleUp(e,t);case 'subgroupShuffleXor':return this.builtins.SubgroupShuffleXor(e,t);case 'subgroupXor':return this.builtins.SubgroupXor(e,t);case 'quadBroadcast':return this.builtins.QuadBroadcast(e,t);case 'quadSwapDiagonal':return this.builtins.QuadSwapDiagonal(e,t);case 'quadSwapX':return this.builtins.QuadSwapX(e,t);case 'quadSwapY':return this.builtins.QuadSwapY(e,t)}const n=t.getFunction(e.name);if(n){const s=t.clone();for(let t=0;t<n.node.args.length;++t){const r=n.node.args[t],a=this.evalExpression(e.args[t],s);s.setVariable(r.name,a,r);}return this._execStatements(n.node.body,s)}return null}_callConstructorValue(e,t){if(!e.args||0===e.args.length)return new be(0,this.getTypeInfo(e.type));const n=this.evalExpression(e.args[0],t);return n.typeInfo=this.getTypeInfo(e.type),n}_callConstructorVec(e,t){const n=this.getTypeInfo(e.type),s=this.getTypeName(e.type),r={vec2:2,vec2f:2,vec2i:2,vec2u:2,vec2b:2,vec2h:2,vec3:3,vec3f:3,vec3i:3,vec3u:3,vec3b:3,vec3h:3,vec4:4,vec4f:4,vec4i:4,vec4u:4,vec4b:4,vec4h:4}[s];if(undefined===r)return console.error(`Invalid vec constructor ${s}. Line ${e.line}`),null;const a=s.endsWith('i')||s.endsWith('u'),i=[];if(e instanceof re)if(e.isVector){const t=e.vectorValue;for(const e of t)i.push(e);}else i.push(e.scalarValue);else if(e.args)for(const n of e.args){const e=this.evalExpression(n,t);if(e instanceof Ie){const t=e.value;for(let e=0;e<t.length;++e){let n=t[e];a&&(n=Math.floor(n)),i.push(n);}}else if(e instanceof be){let t=e.value;a&&(t=Math.floor(t)),i.push(t);}}if(e.type instanceof j&&null===e.type.format&&(e.type.format=j.f32),0===i.length){const e=new Array(r).fill(0);return new Ie(e,n)}if(1===i.length)for(;i.length<r;)i.push(i[0]);return i.length<r?(console.error(`Invalid vec constructor. Line ${e.line}`),null):new Ie(i.length>r?i.slice(0,r):i,n)}_callConstructorMatrix(e,t){const n=this.getTypeInfo(e.type),s=this.getTypeName(e.type),a={mat2x2:4,mat2x2f:4,mat2x2h:4,mat2x3:6,mat2x3f:6,mat2x3h:6,mat2x4:8,mat2x4f:8,mat2x4h:8,mat3x2:6,mat3x2f:6,mat3x2h:6,mat3x3:9,mat3x3f:9,mat3x3h:9,mat3x4:12,mat3x4f:12,mat3x4h:12,mat4x2:8,mat4x2f:8,mat4x2h:8,mat4x3:12,mat4x3f:12,mat4x3h:12,mat4x4:16,mat4x4f:16,mat4x4h:16}[s];if(undefined===a)return console.error(`Invalid matrix constructor ${s}. Line ${e.line}`),null;const i=[];if(e instanceof re)if(e.isVector){const t=e.vectorValue;for(const e of t)i.push(e);}else i.push(e.scalarValue);else if(e.args)for(const n of e.args){const e=this.evalExpression(n,t);if(e instanceof Ie){const t=e.value;for(let e=0;e<t.length;++e)i.push(t[e]);}else e instanceof be?i.push(e.value):e instanceof Te&&i.push(...e.value);}if(n instanceof r&&null===n.format&&(n.format=this.getTypeInfo('f32')),0===i.length){const e=new Array(a).fill(0);return new Te(e,n)}return i.length!==a?(console.error(`Invalid matrix constructor. Line ${e.line}`),null):new Te(i,n)}}Ye._breakObj=new ye(new e('BREAK',null)),Ye._continueObj=new ye(new e('CONTINUE',null)),Ye._priority=new Map([['f32',0],['f16',1],['u32',2],['i32',3],['x32',3]]);class Ke{constructor(){this._tokens=[],this._current=0,this._currentLine=0,this._deferArrayCountEval=[],this._currentLoop=[],this._context=new x,this._exec=new Ye;}parse(e){this._initialize(e),this._deferArrayCountEval.length=0;const t=[];for(;!this._isAtEnd();){const e=this._global_decl_or_directive();if(!e)break;t.push(e);}if(this._deferArrayCountEval.length>0){for(const e of this._deferArrayCountEval){const t=e.arrayType,n=e.countNode;if(n instanceof ne){const e=n.name,s=this._context.constants.get(e);if(s)try{const e=s.constEvaluate(this._exec);t.count=e;}catch(e){}}}this._deferArrayCountEval.length=0;}return t}_initialize(e){if(e)if('string'==typeof e){const t=new Ve(e);this._tokens=t.scanTokens();}else this._tokens=e;else this._tokens=[];this._current=0;}_updateNode(e,t){return e.line=null!=t?t:this._currentLine,e}_error(e,t){return {token:e,message:t,toString:()=>`${t}`}}_isAtEnd(){return this._current>=this._tokens.length||this._peek().type==Ae.eof}_match(e){if(e instanceof Ee)return !!this._check(e)&&(this._advance(),true);for(let t=0,n=e.length;t<n;++t){const n=e[t];if(this._check(n))return this._advance(),true}return  false}_consume(e,t){if(this._check(e))return this._advance();throw this._error(this._peek(),`${t}. Line:${this._currentLine}`)}_check(e){if(this._isAtEnd())return  false;const t=this._peek();if(e instanceof Array){const n=t.type;let s=false;for(const t of e){if(n===t)return  true;t===Ae.tokens.name&&(s=true);}if(s){const e=Ae.tokens.name.rule.exec(t.lexeme);if(e&&0==e.index&&e[0]==t.lexeme)return  true}return  false}if(t.type===e)return  true;if(e===Ae.tokens.name){const e=Ae.tokens.name.rule.exec(t.lexeme);return e&&0==e.index&&e[0]==t.lexeme}return  false}_advance(){var e,t;return this._currentLine=null!==(t=null===(e=this._peek())||undefined===e?undefined:e.line)&&undefined!==t?t:-1,this._isAtEnd()||this._current++,this._previous()}_peek(){return this._tokens[this._current]}_previous(){return this._tokens[this._current-1]}_global_decl_or_directive(){for(;this._match(Ae.tokens.semicolon)&&!this._isAtEnd(););if(this._match(Ae.keywords.alias)){const e=this._type_alias();return this._consume(Ae.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(Ae.keywords.diagnostic)){const e=this._diagnostic();return this._consume(Ae.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(Ae.keywords.requires)){const e=this._requires_directive();return this._consume(Ae.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}if(this._match(Ae.keywords.enable)){const e=this._enable_directive();return this._consume(Ae.tokens.semicolon,'Expected \';\''),this._exec.reflection.updateAST([e]),e}const e=this._attribute();if(this._check(Ae.keywords.var)){const t=this._global_variable_decl();return null!=t&&(t.attributes=e),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(Ae.keywords.override)){const t=this._override_variable_decl();return null!=t&&(t.attributes=e),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(Ae.keywords.let)){const t=this._global_let_decl();return null!=t&&(t.attributes=e),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(Ae.keywords.const)){const t=this._global_const_decl();return null!=t&&(t.attributes=e),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),this._exec.reflection.updateAST([t]),t}if(this._check(Ae.keywords.struct)){const t=this._struct_decl();return null!=t&&(t.attributes=e),this._exec.reflection.updateAST([t]),t}if(this._check(Ae.keywords.fn)){const t=this._function_decl();return null!=t&&(t.attributes=e),this._exec.reflection.updateAST([t]),t}return null}_function_decl(){if(!this._match(Ae.keywords.fn))return null;const e=this._currentLine,t=this._consume(Ae.tokens.ident,'Expected function name.').toString();this._consume(Ae.tokens.paren_left,'Expected \'(\' for function arguments.');const n=[];if(!this._check(Ae.tokens.paren_right))do{if(this._check(Ae.tokens.paren_right))break;const e=this._attribute(),t=this._consume(Ae.tokens.name,'Expected argument name.').toString();this._consume(Ae.tokens.colon,'Expected \':\' for argument type.');const s=this._attribute(),r=this._type_decl();null!=r&&(r.attributes=s,n.push(this._updateNode(new _e(t,r,e))));}while(this._match(Ae.tokens.comma));this._consume(Ae.tokens.paren_right,'Expected \')\' after function arguments.');let s=null;if(this._match(Ae.tokens.arrow)){const e=this._attribute();s=this._type_decl(),null!=s&&(s.attributes=e);}const r=this._compound_statement(),a=this._currentLine;return this._updateNode(new k(t,n,s,r,e,a),e)}_compound_statement(){const e=[];for(this._consume(Ae.tokens.brace_left,'Expected \'{\' for block.');!this._check(Ae.tokens.brace_right);){const t=this._statement();null!==t&&e.push(t);}return this._consume(Ae.tokens.brace_right,'Expected \'}\' for block.'),e}_statement(){for(;this._match(Ae.tokens.semicolon)&&!this._isAtEnd(););if(this._check(Ae.tokens.attr)&&this._attribute(),this._check(Ae.keywords.if))return this._if_statement();if(this._check(Ae.keywords.switch))return this._switch_statement();if(this._check(Ae.keywords.loop))return this._loop_statement();if(this._check(Ae.keywords.for))return this._for_statement();if(this._check(Ae.keywords.while))return this._while_statement();if(this._check(Ae.keywords.continuing))return this._continuing_statement();if(this._check(Ae.keywords.static_assert))return this._static_assert_statement();if(this._check(Ae.tokens.brace_left))return this._compound_statement();let e=null;if(this._check(Ae.keywords.return))e=this._return_statement();else if(this._check([Ae.keywords.var,Ae.keywords.let,Ae.keywords.const]))e=this._variable_statement();else if(this._match(Ae.keywords.discard))e=this._updateNode(new G);else if(this._match(Ae.keywords.break)){const t=this._updateNode(new W);if(this._currentLoop.length>0){const e=this._currentLoop[this._currentLoop.length-1];t.loopId=e.id;}e=t,this._check(Ae.keywords.if)&&(this._advance(),t.condition=this._optional_paren_expression(),t.condition instanceof oe&&1===t.condition.contents.length&&(t.condition=t.condition.contents[0]));}else if(this._match(Ae.keywords.continue)){const t=this._updateNode(new P);if(!(this._currentLoop.length>0))throw this._error(this._peek(),`Continue statement must be inside a loop. Line: ${t.line}`);{const e=this._currentLoop[this._currentLoop.length-1];t.loopId=e.id;}e=t;}else e=this._increment_decrement_statement()||this._func_call_statement()||this._assignment_statement();return null!=e&&this._consume(Ae.tokens.semicolon,'Expected \';\' after statement.'),e}_static_assert_statement(){if(!this._match(Ae.keywords.static_assert))return null;const e=this._optional_paren_expression();return this._updateNode(new I(e))}_while_statement(){if(!this._match(Ae.keywords.while))return null;const e=this._updateNode(new T(null,null));return this._currentLoop.push(e),e.condition=this._optional_paren_expression(),this._check(Ae.tokens.attr)&&this._attribute(),e.body=this._compound_statement(),this._currentLoop.pop(),e}_continuing_statement(){if(!this._match(Ae.keywords.continuing))return null;const e=this._compound_statement();return this._updateNode(new S(e))}_for_statement(){if(!this._match(Ae.keywords.for))return null;this._consume(Ae.tokens.paren_left,'Expected \'(\'.');const e=this._updateNode(new E(null,null,null,null));return this._currentLoop.push(e),e.init=this._check(Ae.tokens.semicolon)?null:this._for_init(),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),e.condition=this._check(Ae.tokens.semicolon)?null:this._short_circuit_or_expression(),this._consume(Ae.tokens.semicolon,'Expected \';\'.'),e.increment=this._check(Ae.tokens.paren_right)?null:this._for_increment(),this._consume(Ae.tokens.paren_right,'Expected \')\'.'),this._check(Ae.tokens.attr)&&this._attribute(),e.body=this._compound_statement(),this._currentLoop.pop(),e}_for_init(){return this._variable_statement()||this._func_call_statement()||this._assignment_statement()}_for_increment(){return this._func_call_statement()||this._increment_decrement_statement()||this._assignment_statement()}_variable_statement(){if(this._check(Ae.keywords.var)){const e=this._variable_decl();if(null===e)throw this._error(this._peek(),'Variable declaration expected.');let t=null;return this._match(Ae.tokens.equal)&&(t=this._short_circuit_or_expression()),this._updateNode(new A(e.name,e.type,e.storage,e.access,t))}if(this._match(Ae.keywords.let)){const e=this._consume(Ae.tokens.name,'Expected name for let.').toString();let t=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();t=this._type_decl(),null!=t&&(t.attributes=e);}this._consume(Ae.tokens.equal,'Expected \'=\' for let.');const n=this._short_circuit_or_expression();return this._updateNode(new V(e,t,null,null,n))}if(this._match(Ae.keywords.const)){const e=this._consume(Ae.tokens.name,'Expected name for const.').toString();let t=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();t=this._type_decl(),null!=t&&(t.attributes=e);}this._consume(Ae.tokens.equal,'Expected \'=\' for const.');const n=this._short_circuit_or_expression();return null===t&&n instanceof re&&(t=n.type),this._updateNode(new N(e,t,null,null,n))}return null}_increment_decrement_statement(){const e=this._current,t=this._unary_expression();if(null==t)return null;if(!this._check(Ae.increment_operators))return this._current=e,null;const n=this._consume(Ae.increment_operators,'Expected increment operator');return this._updateNode(new L(n.type===Ae.tokens.plus_plus?i.increment:i.decrement,t))}_assignment_statement(){let e=null;if(this._check(Ae.tokens.brace_right))return null;let t=this._match(Ae.tokens.underscore);if(t||(e=this._unary_expression()),!t&&null==e)return null;const n=this._consume(Ae.assignment_operators,'Expected assignment operator.'),s=this._short_circuit_or_expression();return this._updateNode(new O(o.parse(n.lexeme),e,s))}_func_call_statement(){if(!this._check(Ae.tokens.ident))return null;const e=this._current,t=this._consume(Ae.tokens.ident,'Expected function name.'),n=this._argument_expression_list();return null===n?(this._current=e,null):this._updateNode(new D(t.lexeme,n))}_loop_statement(){if(!this._match(Ae.keywords.loop))return null;this._check(Ae.tokens.attr)&&this._attribute(),this._consume(Ae.tokens.brace_left,'Expected \'{\' for loop.');const e=this._updateNode(new C([],null));this._currentLoop.push(e);let t=this._statement();for(;null!==t;){if(Array.isArray(t))for(let n of t)e.body.push(n);else e.body.push(t);if(t instanceof S){e.continuing=t;break}t=this._statement();}return this._currentLoop.pop(),this._consume(Ae.tokens.brace_right,'Expected \'}\' for loop.'),e}_switch_statement(){if(!this._match(Ae.keywords.switch))return null;const e=this._updateNode(new M(null,[]));if(this._currentLoop.push(e),e.condition=this._optional_paren_expression(),this._check(Ae.tokens.attr)&&this._attribute(),this._consume(Ae.tokens.brace_left,'Expected \'{\' for switch.'),e.cases=this._switch_body(),null==e.cases||0==e.cases.length)throw this._error(this._previous(),'Expected \'case\' or \'default\'.');return this._consume(Ae.tokens.brace_right,'Expected \'}\' for switch.'),this._currentLoop.pop(),e}_switch_body(){const e=[];let t=false;for(;this._check([Ae.keywords.default,Ae.keywords.case]);){if(this._match(Ae.keywords.case)){const n=this._case_selectors();for(const e of n)if(e instanceof pe){if(t)throw this._error(this._previous(),'Multiple default cases in switch statement.');t=true;break}this._match(Ae.tokens.colon),this._check(Ae.tokens.attr)&&this._attribute(),this._consume(Ae.tokens.brace_left,'Exected \'{\' for switch case.');const s=this._case_body();this._consume(Ae.tokens.brace_right,'Exected \'}\' for switch case.'),e.push(this._updateNode(new me(n,s)));}if(this._match(Ae.keywords.default)){if(t)throw this._error(this._previous(),'Multiple default cases in switch statement.');this._match(Ae.tokens.colon),this._check(Ae.tokens.attr)&&this._attribute(),this._consume(Ae.tokens.brace_left,'Exected \'{\' for switch default.');const n=this._case_body();this._consume(Ae.tokens.brace_right,'Exected \'}\' for switch default.'),e.push(this._updateNode(new de(n)));}}return e}_case_selectors(){const e=[];for(this._match(Ae.keywords.default)?e.push(this._updateNode(new pe)):e.push(this._shift_expression());this._match(Ae.tokens.comma);)this._match(Ae.keywords.default)?e.push(this._updateNode(new pe)):e.push(this._shift_expression());return e}_case_body(){if(this._match(Ae.keywords.fallthrough))return this._consume(Ae.tokens.semicolon,'Expected \';\''),[];let e=this._statement();if(null==e)return [];e instanceof Array||(e=[e]);const t=this._case_body();return 0==t.length?e:[...e,t[0]]}_if_statement(){if(!this._match(Ae.keywords.if))return null;const e=this._currentLine,t=this._optional_paren_expression();this._check(Ae.tokens.attr)&&this._attribute();const n=this._compound_statement();let s=[];this._match_elseif()&&(this._check(Ae.tokens.attr)&&this._attribute(),s=this._elseif_statement(s));let r=null;return this._match(Ae.keywords.else)&&(this._check(Ae.tokens.attr)&&this._attribute(),r=this._compound_statement()),this._updateNode(new F(t,n,s,r),e)}_match_elseif(){return this._tokens[this._current].type===Ae.keywords.else&&this._tokens[this._current+1].type===Ae.keywords.if&&(this._advance(),this._advance(),true)}_elseif_statement(e=[]){const t=this._optional_paren_expression(),n=this._compound_statement();return e.push(this._updateNode(new ve(t,n))),this._match_elseif()&&(this._check(Ae.tokens.attr)&&this._attribute(),this._elseif_statement(e)),e}_return_statement(){if(!this._match(Ae.keywords.return))return null;const e=this._short_circuit_or_expression();return this._updateNode(new U(e))}_short_circuit_or_expression(){let e=this._short_circuit_and_expr();for(;this._match(Ae.tokens.or_or);)e=this._updateNode(new he(this._previous().toString(),e,this._short_circuit_and_expr()));return e}_short_circuit_and_expr(){let e=this._inclusive_or_expression();for(;this._match(Ae.tokens.and_and);)e=this._updateNode(new he(this._previous().toString(),e,this._inclusive_or_expression()));return e}_inclusive_or_expression(){let e=this._exclusive_or_expression();for(;this._match(Ae.tokens.or);)e=this._updateNode(new he(this._previous().toString(),e,this._exclusive_or_expression()));return e}_exclusive_or_expression(){let e=this._and_expression();for(;this._match(Ae.tokens.xor);)e=this._updateNode(new he(this._previous().toString(),e,this._and_expression()));return e}_and_expression(){let e=this._equality_expression();for(;this._match(Ae.tokens.and);)e=this._updateNode(new he(this._previous().toString(),e,this._equality_expression()));return e}_equality_expression(){const e=this._relational_expression();return this._match([Ae.tokens.equal_equal,Ae.tokens.not_equal])?this._updateNode(new he(this._previous().toString(),e,this._relational_expression())):e}_relational_expression(){let e=this._shift_expression();for(;this._match([Ae.tokens.less_than,Ae.tokens.greater_than,Ae.tokens.less_than_equal,Ae.tokens.greater_than_equal]);)e=this._updateNode(new he(this._previous().toString(),e,this._shift_expression()));return e}_shift_expression(){let e=this._additive_expression();for(;this._match([Ae.tokens.shift_left,Ae.tokens.shift_right]);)e=this._updateNode(new he(this._previous().toString(),e,this._additive_expression()));return e}_additive_expression(){let e=this._multiplicative_expression();for(;this._match([Ae.tokens.plus,Ae.tokens.minus]);)e=this._updateNode(new he(this._previous().toString(),e,this._multiplicative_expression()));return e}_multiplicative_expression(){let e=this._unary_expression();for(;this._match([Ae.tokens.star,Ae.tokens.forward_slash,Ae.tokens.modulo]);)e=this._updateNode(new he(this._previous().toString(),e,this._unary_expression()));return e}_unary_expression(){return this._match([Ae.tokens.minus,Ae.tokens.bang,Ae.tokens.tilde,Ae.tokens.star,Ae.tokens.and])?this._updateNode(new ce(this._previous().toString(),this._unary_expression())):this._singular_expression()}_singular_expression(){const e=this._primary_expression(),t=this._postfix_expression();return t&&(e.postfix=t),e}_postfix_expression(){if(this._match(Ae.tokens.bracket_left)){const e=this._short_circuit_or_expression();this._consume(Ae.tokens.bracket_right,'Expected \']\'.');const t=this._updateNode(new ue(e)),n=this._postfix_expression();return n&&(t.postfix=n),t}if(this._match(Ae.tokens.period)){const e=this._consume(Ae.tokens.name,'Expected member name.'),t=this._postfix_expression(),n=this._updateNode(new J(e.lexeme));return t&&(n.postfix=t),n}return null}_getStruct(e){if(this._context.aliases.has(e)){return this._context.aliases.get(e).type}if(this._context.structs.has(e)){return this._context.structs.get(e)}return null}_getType(e){const t=this._getStruct(e);if(null!==t)return t;switch(e){case 'bool':return X.bool;case 'i32':return X.i32;case 'u32':return X.u32;case 'f32':return X.f32;case 'f16':return X.f16;case 'vec2f':return j.vec2f;case 'vec3f':return j.vec3f;case 'vec4f':return j.vec4f;case 'vec2i':return j.vec2i;case 'vec3i':return j.vec3i;case 'vec4i':return j.vec4i;case 'vec2u':return j.vec2u;case 'vec3u':return j.vec3u;case 'vec4u':return j.vec4u;case 'vec2h':return j.vec2h;case 'vec3h':return j.vec3h;case 'vec4h':return j.vec4h;case 'mat2x2f':return j.mat2x2f;case 'mat2x3f':return j.mat2x3f;case 'mat2x4f':return j.mat2x4f;case 'mat3x2f':return j.mat3x2f;case 'mat3x3f':return j.mat3x3f;case 'mat3x4f':return j.mat3x4f;case 'mat4x2f':return j.mat4x2f;case 'mat4x3f':return j.mat4x3f;case 'mat4x4f':return j.mat4x4f;case 'mat2x2h':return j.mat2x2h;case 'mat2x3h':return j.mat2x3h;case 'mat2x4h':return j.mat2x4h;case 'mat3x2h':return j.mat3x2h;case 'mat3x3h':return j.mat3x3h;case 'mat3x4h':return j.mat3x4h;case 'mat4x2h':return j.mat4x2h;case 'mat4x3h':return j.mat4x3h;case 'mat4x4h':return j.mat4x4h}return null}_validateTypeRange(e,t){if('i32'===t.name){if(e<-2147483648||e>2147483647)throw this._error(this._previous(),`Value out of range for i32: ${e}. Line: ${this._currentLine}.`)}else if('u32'===t.name&&(e<0||e>4294967295))throw this._error(this._previous(),`Value out of range for u32: ${e}. Line: ${this._currentLine}.`)}_primary_expression(){if(this._match(Ae.tokens.ident)){const e=this._previous().toString();if(this._check(Ae.tokens.paren_left)){const t=this._argument_expression_list(),n=this._getType(e);return null!==n?this._updateNode(new ee(n,t)):this._updateNode(new te(e,t))}if(this._context.constants.has(e)){const t=this._context.constants.get(e);return this._updateNode(new se(e,t.value))}return this._updateNode(new ne(e))}if(this._match(Ae.tokens.int_literal)){const e=this._previous().toString();let t=e.endsWith('i')||e.endsWith('i')?X.i32:e.endsWith('u')||e.endsWith('U')?X.u32:X.x32;const n=parseInt(e);return this._validateTypeRange(n,t),this._updateNode(new re(new be(n,this._exec.getTypeInfo(t)),t))}if(this._match(Ae.tokens.uint_literal)){const e=parseInt(this._previous().toString());return this._validateTypeRange(e,X.u32),this._updateNode(new re(new be(e,this._exec.getTypeInfo(X.u32)),X.u32))}if(this._match([Ae.tokens.decimal_float_literal,Ae.tokens.hex_float_literal])){let e=this._previous().toString(),t=e.endsWith('h');t&&(e=e.substring(0,e.length-1));const n=parseFloat(e);this._validateTypeRange(n,t?X.f16:X.f32);const s=t?X.f16:X.f32;return this._updateNode(new re(new be(n,this._exec.getTypeInfo(s)),s))}if(this._match([Ae.keywords.true,Ae.keywords.false])){let e=this._previous().toString()===Ae.keywords.true.rule;return this._updateNode(new re(new be(e?1:0,this._exec.getTypeInfo(X.bool)),X.bool))}if(this._check(Ae.tokens.paren_left))return this._paren_expression();if(this._match(Ae.keywords.bitcast)){this._consume(Ae.tokens.less_than,'Expected \'<\'.');const e=this._type_decl();this._consume(Ae.tokens.greater_than,'Expected \'>\'.');const t=this._paren_expression();return this._updateNode(new ae(e,t))}const e=this._type_decl(),t=this._argument_expression_list();return this._updateNode(new ee(e,t))}_argument_expression_list(){if(!this._match(Ae.tokens.paren_left))return null;const e=[];do{if(this._check(Ae.tokens.paren_right))break;const t=this._short_circuit_or_expression();e.push(t);}while(this._match(Ae.tokens.comma));return this._consume(Ae.tokens.paren_right,'Expected \')\' for agument list'),e}_optional_paren_expression(){this._match(Ae.tokens.paren_left);const e=this._short_circuit_or_expression();return this._match(Ae.tokens.paren_right),this._updateNode(new oe([e]))}_paren_expression(){this._consume(Ae.tokens.paren_left,'Expected \'(\'.');const e=this._short_circuit_or_expression();return this._consume(Ae.tokens.paren_right,'Expected \')\'.'),this._updateNode(new oe([e]))}_struct_decl(){if(!this._match(Ae.keywords.struct))return null;const e=this._currentLine,t=this._consume(Ae.tokens.ident,'Expected name for struct.').toString();this._consume(Ae.tokens.brace_left,'Expected \'{\' for struct body.');const n=[];for(;!this._check(Ae.tokens.brace_right);){const e=this._attribute(),t=this._consume(Ae.tokens.name,'Expected variable name.').toString();this._consume(Ae.tokens.colon,'Expected \':\' for struct member type.');const s=this._attribute(),r=this._type_decl();null!=r&&(r.attributes=s),this._check(Ae.tokens.brace_right)?this._match(Ae.tokens.comma):this._consume(Ae.tokens.comma,'Expected \',\' for struct member.'),n.push(this._updateNode(new xe(t,r,e)));}this._consume(Ae.tokens.brace_right,'Expected \'}\' after struct body.');const s=this._currentLine,r=this._updateNode(new Z(t,n,e,s),e);return this._context.structs.set(t,r),r}_global_variable_decl(){const e=this._variable_decl();if(!e)return null;if(this._match(Ae.tokens.equal)){const t=this._const_expression(),n=[X.f32];try{const s=t.constEvaluate(this._exec,n);e.value=new re(s,n[0]),this._exec.context.setVariable(e.name,s);}catch(n){e.value=t;}}else {const t=new ee(e.type,null),n=this._exec.evalExpression(t,this._exec.context);null!==n&&(e.value=new re(n,e.type),this._exec.context.setVariable(e.name,n));}if(null!==e.type&&e.value instanceof re){if('x32'!==e.value.type.name){if(this._exec.getTypeName(e.type)!==this._exec.getTypeName(e.value.type))throw this._error(this._peek(),`Invalid cast from ${e.value.type.name} to ${e.type.name}. Line:${this._currentLine}`)}e.value.isScalar&&this._validateTypeRange(e.value.scalarValue,e.type),e.value.type=e.type;}else null===e.type&&e.value instanceof re&&(e.type='x32'===e.value.type.name?X.i32:e.value.type,e.value.isScalar&&this._validateTypeRange(e.value.scalarValue,e.type));return e}_override_variable_decl(){const e=this._override_decl();return e&&this._match(Ae.tokens.equal)&&(e.value=this._const_expression()),e}_global_const_decl(){var e;if(!this._match(Ae.keywords.const))return null;const t=this._consume(Ae.tokens.name,'Expected variable name');let n=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();n=this._type_decl(),null!=n&&(n.attributes=e);}let s=null;this._consume(Ae.tokens.equal,'const declarations require an assignment');const a=this._short_circuit_or_expression();try{let e=[X.f32];const n=a.constEvaluate(this._exec,e);n instanceof be&&this._validateTypeRange(n.value,e[0]),e[0]instanceof j&&null===e[0].format&&n.typeInfo instanceof r&&null!==n.typeInfo.format&&('f16'===n.typeInfo.format.name?e[0].format=X.f16:'f32'===n.typeInfo.format.name?e[0].format=X.f32:'i32'===n.typeInfo.format.name?e[0].format=X.i32:'u32'===n.typeInfo.format.name?e[0].format=X.u32:'bool'===n.typeInfo.format.name?e[0].format=X.bool:console.error(`TODO: impelement template format type ${n.typeInfo.format.name}`)),s=this._updateNode(new re(n,e[0])),this._exec.context.setVariable(t.toString(),n);}catch(e){s=a;}if(null!==n&&s instanceof re){if('x32'!==s.type.name){if(this._exec.getTypeName(n)!==this._exec.getTypeName(s.type))throw this._error(this._peek(),`Invalid cast from ${s.type.name} to ${n.name}. Line:${this._currentLine}`)}s.type=n,s.isScalar&&this._validateTypeRange(s.scalarValue,s.type);}else null===n&&s instanceof re&&(n=null!==(e=null==s?undefined:s.type)&&undefined!==e?e:X.f32,n===X.x32&&(n=X.i32));const i=this._updateNode(new N(t.toString(),n,'','',s));return this._context.constants.set(i.name,i),i}_global_let_decl(){if(!this._match(Ae.keywords.let))return null;const e=this._consume(Ae.tokens.name,'Expected variable name');let t=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();t=this._type_decl(),null!=t&&(t.attributes=e);}let n=null;if(this._match(Ae.tokens.equal)){n=this._const_expression();const e=[X.f32];try{const t=n.constEvaluate(this._exec,e);null!==t&&(n=new re(t,e[0]));}catch(e){}}if(null!==t&&n instanceof re){if('x32'!==n.type.name){if(this._exec.getTypeName(t)!==this._exec.getTypeName(n.type))throw this._error(this._peek(),`Invalid cast from ${n.type.name} to ${t.name}. Line:${this._currentLine}`)}n.type=t;}else null===t&&n instanceof re&&(t='x32'===n.type.name?X.i32:n.type);return n instanceof re&&n.isScalar&&this._validateTypeRange(n.scalarValue,t),this._updateNode(new V(e.toString(),t,'','',n))}_const_expression(){return this._short_circuit_or_expression()}_variable_decl(){if(!this._match(Ae.keywords.var))return null;let e='',t='';this._match(Ae.tokens.less_than)&&(e=this._consume(Ae.storage_class,'Expected storage_class.').toString(),this._match(Ae.tokens.comma)&&(t=this._consume(Ae.access_mode,'Expected access_mode.').toString()),this._consume(Ae.tokens.greater_than,'Expected \'>\'.'));const n=this._consume(Ae.tokens.name,'Expected variable name');let s=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();s=this._type_decl(),null!=s&&(s.attributes=e);}return this._updateNode(new A(n.toString(),s,e,t,null))}_override_decl(){if(!this._match(Ae.keywords.override))return null;const e=this._consume(Ae.tokens.name,'Expected variable name');let t=null;if(this._match(Ae.tokens.colon)){const e=this._attribute();t=this._type_decl(),null!=t&&(t.attributes=e);}return this._updateNode(new $(e.toString(),t,null))}_diagnostic(){this._consume(Ae.tokens.paren_left,'Expected \'(\'');const e=this._consume(Ae.tokens.ident,'Expected severity control name.');this._consume(Ae.tokens.comma,'Expected \',\'');let t=this._consume(Ae.tokens.ident,'Expected diagnostic rule name.').toString();if(this._match(Ae.tokens.period)){t+=`.${this._consume(Ae.tokens.ident,'Expected diagnostic message.').toString()}`;}return this._consume(Ae.tokens.paren_right,'Expected \')\''),this._updateNode(new z(e.toString(),t))}_enable_directive(){const e=this._consume(Ae.tokens.ident,'identity expected.');return this._updateNode(new q(e.toString()))}_requires_directive(){const e=[this._consume(Ae.tokens.ident,'identity expected.').toString()];for(;this._match(Ae.tokens.comma);){const t=this._consume(Ae.tokens.ident,'identity expected.');e.push(t.toString());}return this._updateNode(new B(e))}_type_alias(){const e=this._consume(Ae.tokens.ident,'identity expected.');this._consume(Ae.tokens.equal,'Expected \'=\' for type alias.');let t=this._type_decl();if(null===t)throw this._error(this._peek(),'Expected Type for Alias.');this._context.aliases.has(t.name)&&(t=this._context.aliases.get(t.name).type);const n=this._updateNode(new R(e.toString(),t));return this._context.aliases.set(n.name,n),n}_type_decl(){if(this._check([Ae.tokens.ident,...Ae.texel_format,Ae.keywords.bool,Ae.keywords.f32,Ae.keywords.i32,Ae.keywords.u32])){const e=this._advance(),t=e.toString();return this._context.structs.has(t)?this._context.structs.get(t):this._context.aliases.has(t)?this._context.aliases.get(t).type:this._updateNode(new X(e.toString()))}let e=this._texture_sampler_types();if(e)return e;if(this._check(Ae.template_types)){let e=this._advance().toString(),t=null,n=null;return this._match(Ae.tokens.less_than)&&(t=this._type_decl(),n=null,this._match(Ae.tokens.comma)&&(n=this._consume(Ae.access_mode,'Expected access_mode for pointer').toString()),this._consume(Ae.tokens.greater_than,'Expected \'>\' for type.')),this._updateNode(new j(e,t,n))}if(this._match(Ae.keywords.ptr)){let e=this._previous().toString();this._consume(Ae.tokens.less_than,'Expected \'<\' for pointer.');const t=this._consume(Ae.storage_class,'Expected storage_class for pointer');this._consume(Ae.tokens.comma,'Expected \',\' for pointer.');const n=this._type_decl();let s=null;return this._match(Ae.tokens.comma)&&(s=this._consume(Ae.access_mode,'Expected access_mode for pointer').toString()),this._consume(Ae.tokens.greater_than,'Expected \'>\' for pointer.'),this._updateNode(new Q(e,t.toString(),n,s))}const t=this._attribute();if(this._match(Ae.keywords.array)){let e=null,n=-1;const s=this._previous();let r=null;if(this._match(Ae.tokens.less_than)){e=this._type_decl(),this._context.aliases.has(e.name)&&(e=this._context.aliases.get(e.name).type);let t='';if(this._match(Ae.tokens.comma)){r=this._shift_expression();try{t=r.constEvaluate(this._exec).toString(),r=null;}catch(e){t='1';}}this._consume(Ae.tokens.greater_than,'Expected \'>\' for array.'),n=t?parseInt(t):0;}const a=this._updateNode(new Y(s.toString(),t,e,n));return r&&this._deferArrayCountEval.push({arrayType:a,countNode:r}),a}return null}_texture_sampler_types(){if(this._match(Ae.sampler_type))return this._updateNode(new K(this._previous().toString(),null,null));if(this._match(Ae.depth_texture_type))return this._updateNode(new K(this._previous().toString(),null,null));if(this._match(Ae.sampled_texture_type)||this._match(Ae.multisampled_texture_type)){const e=this._previous();this._consume(Ae.tokens.less_than,'Expected \'<\' for sampler type.');const t=this._type_decl();return this._consume(Ae.tokens.greater_than,'Expected \'>\' for sampler type.'),this._updateNode(new K(e.toString(),t,null))}if(this._match(Ae.storage_texture_type)){const e=this._previous();this._consume(Ae.tokens.less_than,'Expected \'<\' for sampler type.');const t=this._consume(Ae.texel_format,'Invalid texel format.').toString();this._consume(Ae.tokens.comma,'Expected \',\' after texel format.');const n=this._consume(Ae.access_mode,'Expected access mode for storage texture type.').toString();return this._consume(Ae.tokens.greater_than,'Expected \'>\' for sampler type.'),this._updateNode(new K(e.toString(),t,n))}return null}_attribute(){let e=[];for(;this._match(Ae.tokens.attr);){const t=this._consume(Ae.attribute_name,'Expected attribute name'),n=this._updateNode(new ge(t.toString(),null));if(this._match(Ae.tokens.paren_left)){if(n.value=this._consume(Ae.literal_or_ident,'Expected attribute value').toString(),this._check(Ae.tokens.comma)){this._advance();do{const e=this._consume(Ae.literal_or_ident,'Expected attribute value').toString();n.value instanceof Array||(n.value=[n.value]),n.value.push(e);}while(this._match(Ae.tokens.comma))}this._consume(Ae.tokens.paren_right,'Expected \')\'');}e.push(n);}return 0==e.length?null:e}}class He extends Oe{constructor(e){super(),e&&this.update(e);}update(e){const t=(new Ke).parse(e);this.updateAST(t);}}

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
 * Important: Assumes you pipeline is valid (it doesn't check for errors).
 *
 * Note: In WebGPU some layouts must be specified manually. For example an unfiltered-float
 *    sampler can not be derived since it is unknown at compile time pipeline creation time
 *    which texture you'll use.
 *
 * MAINTENANCE_TODO: Add example
 *
 * @param defs ShaderDataDefinitions or an array of ShaderDataDefinitions as
 *    returned from {@link makeShaderDataDefinitions}. If an array more than 1
 *    definition it's assumed the vertex shader is in the first and the fragment
 *    shader in the second.
 * @param desc A PipelineDescriptor. You should be able to pass in the same object you passed
 *    to `createRenderPipeline` or `createComputePipeline`.
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
    for (let i = 0; i < descriptors.length; ++i) {
        if (!descriptors[i]) {
            descriptors[i] = { entries: [] };
        }
    }
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
        case a.Uniform:
            return {
                binding,
                visibility,
                buffer: {
                    ...(resource.size && { minBindingSize: resource.size }),
                },
            };
        case a.Storage:
            return {
                binding,
                visibility,
                buffer: {
                    type: (access === '' || access === 'read') ? 'read-only-storage' : 'storage',
                    ...(resource.size && { minBindingSize: resource.size }),
                },
            };
        case a.Texture: {
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
        case a.Sampler:
            return {
                binding,
                visibility,
                sampler: {
                    type: getSamplerType(type),
                },
            };
        case a.StorageTexture:
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
    const reflect = new He(code);
    const structs = Object.fromEntries(reflect.structs.map(structInfo => {
        return [structInfo.name, makeStructDefinition(reflect, structInfo, 0)];
    }));
    const uniforms = getNamedVariables(reflect, reflect.uniforms);
    const storages = getNamedVariables(reflect, reflect.storage.filter(v => v.resourceType === a.Storage));
    const storageTextures = getNamedVariables(reflect, reflect.storage.filter(v => v.resourceType === a.StorageTexture));
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
        case a.Uniform:
        case a.Storage:
        case a.StorageTexture:
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

function guessTextureBindingViewDimensionForTexture(texture) {
    switch (texture.dimension) {
        case '1d':
            return '1d';
        case '3d':
            return '3d';
        default: // to shut up TS
        case '2d':
            return texture.depthOrArrayLayers > 1 ? '2d-array' : '2d';
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
function getMipmapGenerationWGSL(textureBindingViewDimension) {
    let textureSnippet;
    let sampleSnippet;
    switch (textureBindingViewDimension) {
        case '2d':
            textureSnippet = 'texture_2d<f32>';
            sampleSnippet = 'textureSample(ourTexture, ourSampler, fsInput.texcoord)';
            break;
        case '2d-array':
            textureSnippet = 'texture_2d_array<f32>';
            sampleSnippet = `
          textureSample(
              ourTexture,
              ourSampler,
              fsInput.texcoord,
              uni.layer)`;
            break;
        case 'cube':
            textureSnippet = 'texture_cube<f32>';
            sampleSnippet = `
          textureSample(
              ourTexture,
              ourSampler,
              faceMat[uni.layer] * vec3f(fract(fsInput.texcoord), 1))`;
            break;
        case 'cube-array':
            textureSnippet = 'texture_cube_array<f32>';
            sampleSnippet = `
          textureSample(
              ourTexture,
              ourSampler,
              faceMat[uni.layer] * vec3f(fract(fsInput.texcoord), 1), uni.layer)`;
            break;
        default:
            throw new Error(`unsupported view: ${textureBindingViewDimension}`);
    }
    return `
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
        };

        @vertex fn vs(
          @builtin(vertex_index) vertexIndex : u32
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
          return vsOutput;
        }

        struct Uniforms {
          layer: u32,
        };

        @group(0) @binding(0) var ourSampler: sampler;
        @group(0) @binding(1) var ourTexture: ${textureSnippet};
        @group(0) @binding(2) var<uniform> uni: Uniforms;

        @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
          _ = uni.layer; // make sure this is used so all pipelines have the same bindings
          return ${sampleSnippet};
        }
      `;
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
 * @param textureBindingViewDimension This is only needed in compatibility mode
 *   and it is only needed when the texture is going to be used as a cube map.
 */
function generateMipmap(device, texture, textureBindingViewDimension) {
    let perDeviceInfo = byDevice.get(device);
    if (!perDeviceInfo) {
        perDeviceInfo = {
            pipelineByFormatAndView: {},
            moduleByViewType: {},
        };
        byDevice.set(device, perDeviceInfo);
    }
    let { sampler, uniformBuffer, uniformValues, } = perDeviceInfo;
    const { pipelineByFormatAndView, moduleByViewType, } = perDeviceInfo;
    textureBindingViewDimension = textureBindingViewDimension || guessTextureBindingViewDimensionForTexture(texture);
    let module = moduleByViewType[textureBindingViewDimension];
    if (!module) {
        const code = getMipmapGenerationWGSL(textureBindingViewDimension);
        module = device.createShaderModule({
            label: `mip level generation for ${textureBindingViewDimension}`,
            code,
        });
        moduleByViewType[textureBindingViewDimension] = module;
    }
    if (!sampler) {
        sampler = device.createSampler({
            minFilter: 'linear',
            magFilter: 'linear',
        });
        uniformBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformValues = new Uint32Array(1);
        Object.assign(perDeviceInfo, { sampler, uniformBuffer, uniformValues });
    }
    const id = `${texture.format}.${textureBindingViewDimension}`;
    if (!pipelineByFormatAndView[id]) {
        pipelineByFormatAndView[id] = device.createRenderPipeline({
            label: `mip level generator pipeline for ${textureBindingViewDimension}`,
            layout: 'auto',
            vertex: {
                module,
                entryPoint: 'vs',
            },
            fragment: {
                module,
                entryPoint: 'fs',
                targets: [{ format: texture.format }],
            },
        });
    }
    const pipeline = pipelineByFormatAndView[id];
    for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
        for (let baseArrayLayer = 0; baseArrayLayer < texture.depthOrArrayLayers; ++baseArrayLayer) {
            uniformValues[0] = baseArrayLayer;
            device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
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
                    { binding: 2, resource: { buffer: uniformBuffer } },
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
            const encoder = device.createCommandEncoder({
                label: 'mip gen encoder',
            });
            const pass = encoder.beginRenderPass(renderPassDescriptor);
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
            const commandBuffer = encoder.finish();
            device.queue.submit([commandBuffer]);
        }
    }
}

const kTypedArrayToAttribFormat = new Map([
    [Int8Array, { formats: ['sint8', 'snorm8'], defaultForType: 1 }],
    [Uint8Array, { formats: ['uint8', 'unorm8'], defaultForType: 1 }],
    [Int16Array, { formats: ['sint16', 'snorm16'], defaultForType: 1 }],
    [Uint16Array, { formats: ['uint16', 'unorm16'], defaultForType: 1 }],
    [Int32Array, { formats: ['sint32', 'snorm32'], defaultForType: 0 }],
    [Uint32Array, { formats: ['uint32', 'unorm32'], defaultForType: 0 }],
    [Float32Array, { formats: ['float32', 'float32'], defaultForType: 0 }],
    // TODO: Add Float16Array
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
    '16float': Uint16Array, // TODO: change to Float16Array
    '32float': Float32Array,
};
const kTextureFormatRE = /([a-z]+)(\d+)([a-z]+)/;
function getTextureFormatInfo(format) {
    // this is a hack! It will only work for common formats
    const [, channels, bits, typeName] = kTextureFormatRE.exec(format);
    // TODO: if the regex fails, use table for other formats?
    const numChannels = channels.length;
    const bytesPerChannel = parseInt(bits) / 8;
    const bytesPerElement = numChannels * bytesPerChannel;
    const Type = kFormatToTypedArray[`${bits}${typeName}`];
    return {
        channels,
        numChannels,
        bytesPerChannel,
        bytesPerElement,
        Type,
    };
}
/**
 * Gets the size of a mipLevel. Returns an array of 3 numbers [width, height, depthOrArrayLayers]
 */
function getSizeForMipFromTexture(texture, mipLevel) {
    return [
        texture.width,
        texture.height,
        texture.depthOrArrayLayers,
    ].map(v => Math.max(1, Math.floor(v / 2 ** mipLevel)));
}
/**
 * Uploads Data to a texture
 */
function uploadDataToTexture(device, texture, source, options) {
    const data = toTypedArray(source.data || source, texture.format);
    const mipLevel = 0;
    const size = getSizeForMipFromTexture(texture, mipLevel);
    const { bytesPerElement } = getTextureFormatInfo(texture.format);
    const origin = options.origin || [0, 0, 0];
    device.queue.writeTexture({ texture, origin }, data, { bytesPerRow: bytesPerElement * size[0], rowsPerImage: size[1] }, size);
}
/**
 * Copies a an array of "sources" (Video, Canvas, OffscreenCanvas, ImageBitmap)
 * to a texture and then optionally generates mip levels
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
            device.queue.copyExternalImageToTexture({ source: s, flipY, }, { texture: dstTexture, premultipliedAlpha, colorSpace, origin: copyOrigin }, getSizeFromSource(s, options));
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
    if (texture.mipLevelCount > 1) {
        generateMipmap(device, texture);
    }
}
/**
 * Copies a "source" (Video, Canvas, OffscreenCanvas, ImageBitmap)
 * to a texture and then optionally generates mip levels
 */
function copySourceToTexture(device, texture, source, options = {}) {
    copySourcesToTexture(device, texture, [source], options);
}
/**
 * Gets the size from a source. This is to smooth out the fact that different
 * sources have a different way to get their size.
 */
function getSizeFromSource(source, options) {
    if (source instanceof HTMLVideoElement) {
        return [source.videoWidth, source.videoHeight, 1];
    }
    else {
        const maybeHasWidthAndHeight = source;
        const { width, height } = maybeHasWidthAndHeight;
        if (width > 0 && height > 0 && !isTextureRawDataSource(source)) {
            // this should cover Canvas, Image, ImageData, ImageBitmap, TextureCreationData
            return [width, height, 1];
        }
        const format = options.format || 'rgba8unorm';
        const { bytesPerElement, bytesPerChannel } = getTextureFormatInfo(format);
        const data = isTypedArray(source) || Array.isArray(source)
            ? source
            : source.data;
        const numBytes = isTypedArray(data)
            ? data.byteLength
            : (data.length * bytesPerChannel);
        const numElements = numBytes / bytesPerElement;
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
 */
function createTextureFromSources(device, sources, options = {}) {
    // NOTE: We assume all the sizes are the same. If they are not you'll get
    // an error.
    const size = getSizeFromSource(sources[0], options);
    size[2] = size[2] > 1 ? size[2] : sources.length;
    const texture = device.createTexture({
        dimension: textureViewDimensionToDimension(options.dimension),
        format: options.format || 'rgba8unorm',
        mipLevelCount: options.mipLevelCount
            ? options.mipLevelCount
            : options.mips ? numMipLevels(size) : 1,
        size,
        usage: (options.usage ?? 0) |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
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
function createXYQuadVertices({ size: inSize = 2, xOffset = 0, yOffset = 0 } = {}) {
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
    for (let z = 0; z < subdivisionsDepth; z++) { // eslint-disable-line
        for (let x = 0; x < subdivisionsWidth; x++) { // eslint-disable-line
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
    for (let x = 0; x < subdivisionsAxis; x++) { // eslint-disable-line
        for (let y = 0; y < subdivisionsHeight; y++) { // eslint-disable-line
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
    for (let yy = 0; yy < verticalSubdivisions + extra; ++yy) { // eslint-disable-line
        if (yy === 1 && topCap || yy === verticalSubdivisions + extra - 2 && bottomCap) {
            continue;
        }
        for (let ii = 0; ii < radialSubdivisions; ++ii) { // eslint-disable-line
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
    for (let slice = 0; slice < bodySubdivisions; ++slice) { // eslint-disable-line
        for (let ring = 0; ring < radialSubdivisions; ++ring) { // eslint-disable-line
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

export { TypedArrayViewGenerator, copySourceToTexture, copySourcesToTexture, createBufferLayoutsFromArrays, createBuffersAndAttributesFromArrays, createTextureFromImage, createTextureFromImages, createTextureFromSource, createTextureFromSources, drawArrays, generateMipmap, getNumComponents, getSizeAndAlignmentOfUnsizedArrayElement, getSizeForMipFromTexture, getSizeFromSource, interleaveVertexData, isTypedArray, loadImageBitmap, makeBindGroupLayoutDescriptors, makeShaderDataDefinitions, makeStructuredView, makeTypedArrayFromArrayUnion, makeTypedArrayViews, normalizeGPUExtent3D, numMipLevels, primitives, setIntrinsicsToView, setStructuredValues, setStructuredView, setTypedValues, setVertexAndIndexBuffers, subarray };
//# sourceMappingURL=webgpu-utils.module.js.map
