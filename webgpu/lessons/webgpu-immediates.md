Title: WebGPU Immediates
Description: Immediates
TOC: Immediates

<div class="warn">
Immediates are a new (2026) feature of WebGPU. They are supposed to be a **core** feature,
meaning, they are suppose to be available everywhere, regardless of device.
They should be shipping in all browsers by the end of 2026.
You can check for support by checking for the existence of the function to set the,
<pre><code>
const canUseImmediates = !!GPURenderPassEncoder?.prototype.setImmediates;
</code></pre>
</div>

Immediates are a convenient way to easily pass a small amount of data to a shader.
In [the article uniforms](webgpu-uniforms.html) and [the article on storage buffers](webgpu-storage-buffers.html),
we covered how to pass data, via a buffer. We defined a `var<uniform>` or `var<storage, ...>` binding
in our shader and the bound a buffer to that binding. With immediates we use `var<immediate>`. 

The differences:

* You can only have one `var<immediate>` per shader

  With `var<uniform>` and `var<storage, ...>` you can declare multiple bindings.
  With `var<immediate>` there can be only one

* Your immediates can only use 64bytes total [^maxImmediateSize]

[^maxImmediateSize]: The limit `maxImmediateSize` might let you [request](webgpu-limits-and-features.html) more than 64.

* You must initializes all immediates

  With buffers, the buffer's contents are initialized to 0. With immediates, they are uninitialized
  and you must explicitly initialize them.

* Immediates are reset to undefined when

  * you begin a new compute or render pass
  * you execute a render bundle
  * after executing a render bundle.

You can kind of think of immediates as a mini uniform buffer.
There is only one. It's small. You set it with `passEncoder.setImmediates`

Let's take the simple triangle example from
[the bottom of the article on fundamentals](webgpu-fundamentals.html#a-resizing)
and updated it to draw 3 triangles in different colors
using immediates.

First let's add an offset and color to the shaders

```wgsl
+struct MyImmediates {
+  color: vec4f,
+  offset: vec2f,
+};
+
+var<immediate> myImmediates: MyImmediates;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

-  return vec4f(pos[vertexIndex], 0.0, 1.0);
+  return vec4f(pos[vertexIndex] + myImmediates.offset, 0.0, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
+  return myImmediates.color;
}
```

Then we can update the JavaScript to draw 3 times, setting the immediates
using `setImmediates` each time to draw in a different color in a different
location.

```js
  function render() {
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
+    pass.setImmediates(0, new Float32Array([
+      1, 0, 0, 1,  // color
+      -0.4, -0.2,  // offset
+    ]));
    pass.draw(3);

+    pass.setImmediates(0, new Float32Array([
+      0, 1, 0, 1,  // color
+      0.4, -0.2,   // offset
+    ]));
+    pass.draw(3);
+
+    pass.setImmediates(0, new Float32Array([
+      0, 0, 1, 1,  // color
+      0.0, 0.2,    // offset
+    ]));
+    pass.draw(3);

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Just like `var<uniform>` and `var<storage, ...>` the data
in immediates follows the same [memory layout rules](webgpu-memory-layout.html).
The arguments to `setImmediates` are 

```js
passEncoder.setImmediates(
  byteOffset,  // offset in the immediates
  src,         // An ArrayBufferView or ArrayBuffer
  srcOffset?,  // an offset in elements into the src
  size?,       // the number of elements
);
```

In our case, passed the entire `Float32Array` in each call to `setImmediates`
so we didn't need the last 2 optional arguments. The `srcOffset` defaults to 0
and the `size` defaults the size of `src`.

{{{example url="../webgpu-simple-triangle-with-immediates.html"}}}

You might be wondering, with a limit of 64 bytes, what's the use case
for immediates.

The most common usage is probably just to pass indices into other data.
Imagine making a per model storage buffer array and a per material
storage buffer array

```wgsl
struct PerModel {
  matrix: mat4x4f,
};

struct Material {
  color: vec4f,
  shininess: f32,
};

@group(0) @binding(0) var<storage, read> models: array<PerModel>;
@group(0) @binding(1) var<storage, read> materials: array<Material>;
...
```

Then you could use immediates to select the `PerModel` and `Material`
values

```wgsl
struct RenderIndices {
  modelNdx: u32,
  materialNdx: u32,
};
var<immediate> renderIndices: RenderIndices;

... in vertex shader ...

   let modelMatrix = models[renderIndices.modelNdx];

... in fragment shader ...

   let material = materials[renderIndices.materialNdx];

```

Now at render time you can select a per model data
and material data just be passing in the indices

```js
   pass.setImmediates(0, new Uint32Array([modelNdx, materialNdx]))
```

If you "pull vertices" (when you put vertex data in a storage buffer instead
of a vertex buffer), you could also easily pass the starting index
of the vertex data for a particular model. In other words.
Imagine you have a storage buffer where the first 36 vertices of data
are a cube. The next 12 vertices are a tetrahedron. And the next 600
are a sphere. Now you can add offset to the immediates

```wgsl
struct RenderIndices {
  modelNdx: u32,
  materialNdx: u32,
  vertexOffset: u32,
};
var<immediate> renderIndices: RenderIndices;
```

Use that when looking up vertex data

```wgsl
struct Vertex {
  position: vec3f;
  normal: vec3f,
};
@group(0) @binding(2) var<storage, read> vertices: array<Vertex>;

@vertex fn vs(@builtin(vertex_index): vNdx) -> ... {
   let vertexData = vertices[renderIndices.vertexOffset + vNdx];
   ...
```

Now you can draw there cube, the sphere, and the tetrahedron
just by changing immediates

```js
const kCubeNumVertices = 36;
const kTetrahedronNumVertices = 12;
const kSphereNumVertices = 600;

const kCubeVertexOffset = 0;
const kTetrahedronVertexOffset = kCubeVertexOffset + kCubeNumVertices;
const kSphereVertexOffset = kTetrahedronVertexOffset + kTetrahedronNumVertices;

...
// draw the cube with some model matrix and material
pass.setImmediates(0, new Uint32Array([
  someModelNdx,
  someMaterialNex,
  kCubeVertexOffset,
]));
pass.draw(kCubeNumVertices);

// draw the sphere with some model matrix and material
pass.setImmediates(0, new Uint32Array([
  someOtherModelNdx,
  someOtherMaterialNex,
  kSphereVertexOffset,
]));
pass.draw(kSphereNumVertices);

// draw the tetrahedron with some model matrix and material
pass.setImmediates(0, new Uint32Array([
  anotherModelNdx,
  anotherMaterialNex,
  kTetrahedronVertexOffset,
]));
pass.draw(kTetrahedronNumVertices);
```
