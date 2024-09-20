Title: WebGPU Data Memory Layout
Description: How to layout and prepare data for WebGPU
TOC: Data Memory Layout

In WebGPU, nearly all of the data you provide to it needs to
be layed out in memory to match what you define in your shaders.
This is a big contrast to JavaScript and TypeScript where memory
layout issues rarely come up.

In WGSL when you write your shaders, it's common to define `struct`s.
Structs are kind of like JavaScript objects, you declare members of
a struct, similar to properties of a JavaScript object. But, on top
of giving each property a name, you also have to give it a type.
**AND**, when providing the data **it's up to you** to compute where
in a buffer that particular member of the struct will appear.

In [WGSL](webgpu-wgsl.html) v1, there are 4 base types

* `f32` (a 32bit floating point number)
* `i32` (a 32bit integer)
* `u32` (a 32bit unsigned integer)
* `f16` (a 16bit floating point number) [^f16-optional]

[^f16-optional]: `f16` support is an [optional feature](webgpu-limits-and-features.html)

A byte is 8 bits so a 32 bit value takes 4 bytes and a 16 bit value takes 2 bytes.

If we declare a struct like this

```wgsl
struct OurStruct {
  velocity: f32,
  acceleration: f32,
  frameCount: u32,
};
```

A visual representation of that structure might look something like this

<div class="webgpu_center" data-diagram="ourStructV1"></div>

Each square block is a byte. Above you can see our data takes 12 bytes.
`velocity` takes the first 4 bytes. `acceleration` takes the next 4,
and `frameCount` takes the last 4.

To pass data to the shader we need to prepare data to match the
memory layout `OurStruct`. To do that we need to make an `ArrayBuffer`
of 12 bytes, then setup `TypedArray` views of the correct type so we
can fill it out.

```js
const kOurStructSizeBytes =
  4 + // velocity
  4 + // acceleration
  4 ; // frameCount
const ourStructData = new ArrayBuffer(kOurStructSizeBytes);
const ourStructValuesAsF32 = new Float32Array(ourStructData);
const ourStructValuesAsU32 = new Uint32Array(ourStructData);
```

Above, `ourStructData` is an `ArrayBuffer` which is a chunk of memory.
To look at the contents of this memory we an create views of it.
`ourStructValuesAsF32` is a view of the memory as 32bit floating point
values. `ourStructValuesAsU32` is a view of **the same memory** as
32bit unsigned integer values.

Now that we have a buffer and 2 views we can set the data in the structure.

```js
const kVelocityOffset = 0;
const kAccelerationOffset = 1;
const kFrameCountOffset = 2;

ourStructValuesAsF32[kVelocityOffset] = 1.2;
ourStructValuesAsF32[kAccelerationOffset] = 3.4;
ourStructValuesAsU32[kFrameCountOffset] = 56;    // an integer value
```

## <a id="a-typed-arrays"></a> `TypedArrays`

Like many things in programming there are multiple ways we could
set the data for `OutStruct`. `TypedArray`s have a constructor that takes various forms. For example

* `new Float32Array(12)`

   This version makes a **new** `ArrayBuffer`, in this case of 12 * 4 bytes. It then creates the `Float32Array` to view it.

* `new Float32Array([4, 5, 6])`

   This version makes a **new** `ArrayBuffer`, in this case of 3 * 4 bytes. It then creates the `Float32Array` to view it. And it sets the initial values
   to 4, 5, 6.

   Note you can also pass another `TypedArray`. For example

   `new Float32Array(someUint8ArrayOf6Values)` will make a **new** `ArrayBuffer` of size 6 * 4, then create a `Float32Array` to view it,
   then copy the values from the existing view
   into the new `Float32Array`. The values are copied by number, not in binary.
   In other words, they are copied like this

   ```js
   srcArray.forEach((v, i) => dstArray[i] = v);
   ```

   What does "copied by value" mean? Take this example

   ```js
   const f32s = new Float32Array([0.8, 0.9, 1.0, 1.1, 1.2]);
   const u32s = new Uint32Array(f32s); 
   console.log(u32s);   // produces 0, 0, 1, 1, 1
   ```

   The reason is you can't put values like 0.8 and 1.2 into a `Uint32Array`. They get converted to unsigned integers

* `new Float32Array(someArrayBuffer)`

   This is the case we used before. A new `Float32Array` view is made on an
   **existing buffer**.

* `new Float32Array(someArrayBuffer, byteOffset)`

   This makes a new `Float32Array` on an **existing buffer** but starts
   the view at `byteOffset`

* `new Float32Array(someArrayBuffer, byteOffset, length)`

   This makes a new `Float32Array` on an **existing buffer**. The view
   starts at `byteOffset` and is `length` units long. So if we passed 3
   for length the view would be 3 float32 values long (12 bytes) of
   `someArrayBuffer`

Using this last form we could change the code above to this

```js
const kOurStructSizeBytes =
  4 + // velocity
  4 + // acceleration
  4 ; // frameCount
const ourStructData = new ArrayBuffer(kOurStructSizeBytes);
const velocityView = new Float32Array(ourStructData, 0, 1);
const accelerationView = new Float32Array(ourStructData, 4, 1);
const frameCountView = new Uint32Array(ourStructData, 8, 1);

velocityView[0] = 1.2;
accelerationView[0] = 3.4;
frameCountView[0] = 56;
```

Further, every `TypedArray` has the following properties

* `length`: number of units
* `byteLength`: size in bytes
* `byteOffset`: offset in the `TypedArray`'s `ArrayBuffer`
* `buffer`: the `ArrayBuffer` this `TypedArray` is viewing 

And `TypedArray`s have various methods, many are similar to `Array` but
one that is not is `subarray`. It creates a new `TypedArray` view
of the same type. Its parameters are `subarray(begin, end)` where
`end` is not included. So `someTypedArray.subarray(5, 10)` makes
a new `TypedArray` of **the same `ArrayBuffer`** of elements 5 to 9
of `someTypedArray`.

So we could change the code above to this

```js
const kOurStructSizeFloat32Units =
  1 + // velocity
  1 + // acceleration
  1 ; // frameCount
const ourStructDataAsF32 = new Float32Array(kOurStructSizeFloat32Units);
const ourStructDataAsU32 = new Uint32Array(ourStructDataAsF32.buffer);
const velocityView = ourStructDataAsF32.subarray(0, 1);
const accelerationView = ourStructDataAsF32.subarray(1, 2);
const frameCountView = ourStructDataAsU32.subarray(2, 3);

velocityView[0] = 1.2;
accelerationView[0] = 3.4;
frameCountView[0] = 56;
```

## Multiple views of the same `ArrayBuffer`

Having a view of **the same arrayBuffer** means exactly that. For example

```js
const v1 = new Float32Array(5);
const v2 = v1.subarray(3, 5);  // view the last 2 floats of v1
v2[0] = 123;
v2[1] = 456;
console.log(v1);  // shows 0, 0, 0, 123, 456
```

Similarly if we have different typed views 

```js
const f32 = new Float32Array([1, 1000, -1000])
const u32 = new Uint32Array(f32.buffer);

console.log(Array.from(u32).map(v => v.toString(16).padStart(8, '0')));
// shows '3f800000', '447a0000', 'c47a0000' 
```

The values above are the 32bit hex representations of the floating point values for 1, 1000, -1000

For example: Let's create a 16 byte `ArrayBuffer`. Then we'll create different
`TypedArray` views of the same memory.

```js
const arrayBuffer = new ArrayBuffer(16);
const asInt8      = new Int8Array(arrayBuffer);
const asUint8     = new Uint8Array(arrayBuffer);
const asInt16     = new Int16Array(arrayBuffer);
const asUint16    = new Uint16Array(arrayBuffer);
const asInt32     = new Int32Array(arrayBuffer);
const asUint32    = new Uint32Array(arrayBuffer);
const asFloat32   = new Float32Array(arrayBuffer);
const asFloat64   = new Float64Array(arrayBuffer);
const asBigInt64  = new BigInt64Array(arrayBuffer);
const asBigUint64 = new BigInt64Array(arrayBuffer);

// Set some values to start.
asFloat32.set([123, -456, 7.8, -0.123]);
```

Here's a representation of all of those views, all viewing the same
memory. Below, edit any one number and the corresponding values that are
using the same memory will change.

<div data-diagram="typedArrays" data-caption="show integers as hex"></div>

## `map` issues

Be aware, the `map` function of a `TypedArray` makes a new typed array of the same type!

```js
const f32a = new Float32Array([1, 2, 3]);
const f32b = f32a.map(v => v * 2);                // Ok
const f32c = f32a.map(v => `${v} x2 = ${v * 2}`); // BAD!
                    //  you can't put a string in a Float32Array

console.log(f32b);  // Float32Array(3) [2, 4, 6, ...
console.log(f32c);  // Float32Array(3) [NaN, NaN, NaN, ...
```

If you need to map a typedarray into some other type you'll either need to loop over the array yourself
or else convert it to a JavaScript array which you can do with `Array.from` or the `...` spread operator.
Taking the example above

```js
const f32d1 = Array.from(f32a).map(v => `${v} x2 = ${v * 2}`); // Ok
const f32d2 = [...f32a].map(v => `${v} x2 = ${v * 2}`);        // Ok
```

## vec and mat types

[WGSL](webgpu-wgsl.html) has types made from the 4 base types.
They are:

<div class="webgpu_center data-table">
  <div>
  <style>
    .wgsl-types tr:nth-child(5n) { height: 1em };
  </style>
  <table class="wgsl-types">
    <thead>
      <tr><th>type</th><th>description</th><th>short name</th><tr>
    </thead>
    <tbody>
      <tr><td><code>vec2&lt;f32&gt;</code></td><td>a type with 2  <code>f32</code>s</td><td><code>vec2f</code></td></tr>
      <tr><td><code>vec2&lt;u32&gt;</code></td><td>a type with 2  <code>u32</code>s</td><td><code>vec2u</code></td></tr>
      <tr><td><code>vec2&lt;i32&gt;</code></td><td>a type with 2  <code>i32</code>s</td><td><code>vec2i</code></td></tr>
      <tr><td><code>vec2&lt;f16&gt;</code></td><td>a type with 2  <code>f16</code>s</td><td><code>vec2h</code></td></tr>
      <tr></tr>
      <tr><td><code>vec3&lt;f32&gt;</code></td><td>a type with 3  <code>f32</code>s</td><td><code>vec3f</code></td></tr>
      <tr><td><code>vec3&lt;u32&gt;</code></td><td>a type with 3  <code>u32</code>s</td><td><code>vec3u</code></td></tr>
      <tr><td><code>vec3&lt;i32&gt;</code></td><td>a type with 3  <code>i32</code>s</td><td><code>vec3i</code></td></tr>
      <tr><td><code>vec3&lt;f16&gt;</code></td><td>a type with 3  <code>f16</code>s</td><td><code>vec3h</code></td></tr>
      <tr></tr>
      <tr><td><code>vec4&lt;f32&gt;</code></td><td>a type with 4  <code>f32</code>s</td><td><code>vec4f</code></td></tr>
      <tr><td><code>vec4&lt;u32&gt;</code></td><td>a type with 4  <code>u32</code>s</td><td><code>vec4u</code></td></tr>
      <tr><td><code>vec4&lt;i32&gt;</code></td><td>a type with 4  <code>i32</code>s</td><td><code>vec4i</code></td></tr>
      <tr><td><code>vec4&lt;f16&gt;</code></td><td>a type with 4  <code>f16</code>s</td><td><code>vec4h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat2x2&lt;f32&gt;</code></td><td>a matrix of 2 <code>vec2&lt;f32&gt;</code>s</td><td><code>mat2x2f</code></td></tr>
      <tr><td><code>mat2x2&lt;u32&gt;</code></td><td>a matrix of 2 <code>vec2&lt;u32&gt;</code>s</td><td><code>mat2x2u</code></td></tr>
      <tr><td><code>mat2x2&lt;i32&gt;</code></td><td>a matrix of 2 <code>vec2&lt;i32&gt;</code>s</td><td><code>mat2x2i</code></td></tr>
      <tr><td><code>mat2x2&lt;f16&gt;</code></td><td>a matrix of 2 <code>vec2&lt;f16&gt;</code>s</td><td><code>mat2x2h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat2x3&lt;f32&gt;</code></td><td>a matrix of 2 <code>vec3&lt;f32&gt;</code>s</td><td><code>mat2x3f</code></td></tr>
      <tr><td><code>mat2x3&lt;u32&gt;</code></td><td>a matrix of 2 <code>vec3&lt;u32&gt;</code>s</td><td><code>mat2x3u</code></td></tr>
      <tr><td><code>mat2x3&lt;i32&gt;</code></td><td>a matrix of 2 <code>vec3&lt;i32&gt;</code>s</td><td><code>mat2x3i</code></td></tr>
      <tr><td><code>mat2x3&lt;f16&gt;</code></td><td>a matrix of 2 <code>vec3&lt;f16&gt;</code>s</td><td><code>mat2x3h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat2x4&lt;f32&gt;</code></td><td>a matrix of 2 <code>vec4&lt;f32&gt;</code>s</td><td><code>mat2x4f</code></td></tr>
      <tr><td><code>mat2x4&lt;u32&gt;</code></td><td>a matrix of 2 <code>vec4&lt;u32&gt;</code>s</td><td><code>mat2x4u</code></td></tr>
      <tr><td><code>mat2x4&lt;i32&gt;</code></td><td>a matrix of 2 <code>vec4&lt;i32&gt;</code>s</td><td><code>mat2x4i</code></td></tr>
      <tr><td><code>mat2x4&lt;f16&gt;</code></td><td>a matrix of 2 <code>vec4&lt;f16&gt;</code>s</td><td><code>mat2x4h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat3x2&lt;f32&gt;</code></td><td>a matrix of 3 <code>vec2&lt;f32&gt;</code>s</td><td><code>mat3x2f</code></td></tr>
      <tr><td><code>mat3x2&lt;u32&gt;</code></td><td>a matrix of 3 <code>vec2&lt;u32&gt;</code>s</td><td><code>mat3x2u</code></td></tr>
      <tr><td><code>mat3x2&lt;i32&gt;</code></td><td>a matrix of 3 <code>vec2&lt;i32&gt;</code>s</td><td><code>mat3x2i</code></td></tr>
      <tr><td><code>mat3x2&lt;f16&gt;</code></td><td>a matrix of 3 <code>vec2&lt;f16&gt;</code>s</td><td><code>mat3x2h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat3x3&lt;f32&gt;</code></td><td>a matrix of 3 <code>vec3&lt;f32&gt;</code>s</td><td><code>mat3x3f</code></td></tr>
      <tr><td><code>mat3x3&lt;u32&gt;</code></td><td>a matrix of 3 <code>vec3&lt;u32&gt;</code>s</td><td><code>mat3x3u</code></td></tr>
      <tr><td><code>mat3x3&lt;i32&gt;</code></td><td>a matrix of 3 <code>vec3&lt;i32&gt;</code>s</td><td><code>mat3x3i</code></td></tr>
      <tr><td><code>mat3x3&lt;f16&gt;</code></td><td>a matrix of 3 <code>vec3&lt;f16&gt;</code>s</td><td><code>mat3x3h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat3x4&lt;f32&gt;</code></td><td>a matrix of 3 <code>vec4&lt;f32&gt;</code>s</td><td><code>mat3x4f</code></td></tr>
      <tr><td><code>mat3x4&lt;u32&gt;</code></td><td>a matrix of 3 <code>vec4&lt;u32&gt;</code>s</td><td><code>mat3x4u</code></td></tr>
      <tr><td><code>mat3x4&lt;i32&gt;</code></td><td>a matrix of 3 <code>vec4&lt;i32&gt;</code>s</td><td><code>mat3x4i</code></td></tr>
      <tr><td><code>mat3x4&lt;f16&gt;</code></td><td>a matrix of 3 <code>vec4&lt;f16&gt;</code>s</td><td><code>mat3x4h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat4x2&lt;f32&gt;</code></td><td>a matrix of 4 <code>vec2&lt;f32&gt;</code>s</td><td><code>mat4x2f</code></td></tr>
      <tr><td><code>mat4x2&lt;u32&gt;</code></td><td>a matrix of 4 <code>vec2&lt;u32&gt;</code>s</td><td><code>mat4x2u</code></td></tr>
      <tr><td><code>mat4x2&lt;i32&gt;</code></td><td>a matrix of 4 <code>vec2&lt;i32&gt;</code>s</td><td><code>mat4x2i</code></td></tr>
      <tr><td><code>mat4x2&lt;f16&gt;</code></td><td>a matrix of 4 <code>vec2&lt;f16&gt;</code>s</td><td><code>mat4x2h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat4x3&lt;f32&gt;</code></td><td>a matrix of 4 <code>vec3&lt;f32&gt;</code>s</td><td><code>mat4x3f</code></td></tr>
      <tr><td><code>mat4x3&lt;u32&gt;</code></td><td>a matrix of 4 <code>vec3&lt;u32&gt;</code>s</td><td><code>mat4x3u</code></td></tr>
      <tr><td><code>mat4x3&lt;i32&gt;</code></td><td>a matrix of 4 <code>vec3&lt;i32&gt;</code>s</td><td><code>mat4x3i</code></td></tr>
      <tr><td><code>mat4x3&lt;f16&gt;</code></td><td>a matrix of 4 <code>vec3&lt;f16&gt;</code>s</td><td><code>mat4x3h</code></td></tr>
      <tr></tr>
      <tr><td><code>mat4x4&lt;f32&gt;</code></td><td>a matrix of 4 <code>vec4&lt;f32&gt;</code>s</td><td><code>mat4x4f</code></td></tr>
      <tr><td><code>mat4x4&lt;u32&gt;</code></td><td>a matrix of 4 <code>vec4&lt;u32&gt;</code>s</td><td><code>mat4x4u</code></td></tr>
      <tr><td><code>mat4x4&lt;i32&gt;</code></td><td>a matrix of 4 <code>vec4&lt;i32&gt;</code>s</td><td><code>mat4x4i</code></td></tr>
      <tr><td><code>mat4x4&lt;f16&gt;</code></td><td>a matrix of 4 <code>vec4&lt;f16&gt;</code>s</td><td><code>mat4x4h</code></td></tr>
    </tbody>
  </table>
  </div>
</div>

Given that a `vec3f` is a type with 3 `f32`s and
`mat4x4f` is an 4x4 matrix of `f32`s, so it's 16 `f32`s,
what do think the following struct looks like in memory?

```wgsl
struct Ex2 {
  scale: f32,
  offset: vec3f,
  projection: mat4x4f,
};
```

Ready?

<div class="webgpu_center" data-diagram="ourStructEx2"></div>

What's up with that? It turns out every type has alignment requirements.
For a given type it must be aligned to a multiple of a certain number
of bytes.

Here are the sizes and alignments of the various types.

<div class="webgpu_center data-table" data-diagram="wgslTypeTable" style="width: 95%; columns: 14em;"></div>

But wait, there's MORE!

What do you think the layout of this struct will be?

```wgsl
struct Ex3 {
  transform: mat3x3f,
  directions: array<vec3f, 4>,
};
```

The `array<type, count>` syntax defines an array of `type` with `count` elements.

Here's you go...

<div class="webgpu_center" data-diagram="ourStructEx3"></div>

If you look in the alignment table you'll see `vec3<f32>` has
an alignment of 16 bytes. That means each `vec3<f32>`, whether
it's in a matrix or an array ends up having an extra space.

Here's another one

```wgsl
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
```

<div class="webgpu_center" data-diagram="ourStructEx4"></div>

Why did `size` end up at byte offset 12, just after orientation but `scale` and
`friction` got bumped offsets 32 and 64

That's because arrays and structs have their own own special alignment rules so
even though the array is a single `vec3f` and the `Ex4a` struct is also a single
`vec3f` they get aligned according to different rules.

<div class="webgpu_center data-table">
  <div>
  <style>
    .wgsl-types tr:nth-child(5n) { height: 1em };
  </style>
  <table class="wgsl-types">
    <thead>
      <tr><th>type</th><th>align</th><th>size</th><tr>
    </thead>
    <tbody>
      <tr><td><code>struct</code> S with members M<sub>1</sub>...M<sub>N</sub></td><td>max(AlignOfMember(S,1), ... , AlignOfMember(S,N))</td><td>roundUp(AlignOf(S), justPastLastMember)

where justPastLastMember = OffsetOfMember(S,N) + SizeOfMember(S,N)</td></tr>
      <tr><td><code>array&lt;E, N&gt;</code></td><td>AlignOf(E)</td><td>N × roundUp(AlignOf(E), SizeOf(E))</td></tr>
    </tbody>
  </table>
  </div>
</div>

You can read the rules in more detail [here in the WGSL spec](https://www.w3.org/TR/WGSL/#alignment-and-size).

# Computing Offset and Sizes is a PITA!

Computing sizes and offsets of data in WGSL is probably the largest pain point
of WebGPU. You are required to compute these offsets yourself and keep them up
to date. If you add a member somewhere in the middle of a struct in your shaders
you need to go back to your JavaScript and update all the offsets. Get a single
byte or length wrong and the data you pass to the shader will be wrong. You
won't get an error, but your shader will likely do the wrong thing because it's
looking at bad data. Your model won't draw or your computation will produce
bad results.

Fortunately there are libraries to help with this.

Here's one: [webgpu-utils](https://github.com/greggman/webgpu-utils)

You give it your WGSL code and it gives an API do all of this for you.
This way you can change your structs and, more often than not, things
will just work.

For example, using that last example we can pass it to `webgpu-utils`
like this

```
import {
  makeShaderDataDefinitions,
  makeStructuredView,
} from 'https://greggman.github.io/webgpu-utils/dist/0.x/webgpu-utils-1.x.module.js';

const code = `
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
@group(0) @binding(0) var<uniform> myUniforms: Ex4;

...
`;

const defs = makeShaderDataDefinitions(code);
const myUniformValues = makeStructuredView(defs.uniforms.myUniforms);

// Set some values via set
myUniformValues.set({
  orientation: [1, 0, -1],
  size: 2,
  direction: [0, 1, 0],
  scale: 1.5,
  info: {
    velocity: [2, 3, 4],
  },
  friction: 0.1,
});

// now pass myUniformValues.arrayBuffer to WebGPU when needed.
```

Whether you use this particular library or a different one or
none at all is up to you. For me, I would often spent 20-30-60 minutes
trying to figure out why something was not working only to find
that I manually computed an offset or size wrong so for my own work
I'd rather use a library and avoid that pain.

If you do want to do it manually though, 
[here's a page that will compute the offsets for you](resources/wgsl-offset-computer.html)

<!-- keep this at the bottom of the article -->
<link rel="stylesheet" href="webgpu-memory-layout.css">
<script type="module" src="webgpu-memory-layout.js"></script>
