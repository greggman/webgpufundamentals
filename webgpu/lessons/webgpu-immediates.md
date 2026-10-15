Title: WebGPU Immediates
Description: Immediates
TOC: Immediates

This article is one in a series of the various ways to provide data
to a shader. Each one builds on the previous lesson so you may find
them easiest to understand by reading them in order.

{{{toc-steps list="passing-data.hanson"}}}

<div class="warn">
Immediates are a new (2026) feature of WebGPU. They are supposed to be a **core** feature,
meaning, they are suppose to be available everywhere, regardless of device.
They will hopefully be shipping in all browsers by the end of 2026.
You can check if they are supported by checking if <code>wgslLanguageFeatures</code>
has <code>'immediate_address_space'</code>.
<pre class="prettyprint lang-javascript"><code>
const canUseImmediates = navigator.gpu.wgslLanguageFeatures.has('immediate_address_space');
</code></pre>
Ideally, by 2027, you should no longer need this check.
</div>

Immediates are a convenient way to easily pass a small amount of data to a shader.
In [the article uniforms](webgpu-uniforms.html) and [the article on storage buffers](webgpu-storage-buffers.html),
we covered how to pass data to a shader, via a buffer. We defined a `var<uniform>` or `var<storage, ...>` bindings
in our shaders and the bound buffers to those bindings. With immediates we use `var<immediate>` and no binding. 

The differences between `var<immediate>` vs `var<uniform>` and `var<storage>`:

* You can only have one `var<immediate>` per shader

  With `var<uniform>` and `var<storage, ...>` you can declare multiple bindings.
  With `var<immediate>` there can be only one

* Your immediates can only use 64bytes total [^maxImmediateSize]

[^maxImmediateSize]: The limit `maxImmediateSize` might let you [request](webgpu-limits-and-features.html) more than 64.

* You must initializes all immediates

  With buffers, the buffer's contents are initialized to 0. With immediates, they are uninitialized
  and you must explicitly initialize them. If you don't you'll get a validation error.

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
        context.getCurrentTexture();

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
  srcOffset?,  // an offset in elements of src into the src
  size?,       // the number of elements
);
```

In our case, we passed the entire `Float32Array` in each call to `setImmediates`
so we didn't need the last 2 optional arguments. The `srcOffset` defaults to 0
and the `size` defaults the size of `src`.

{{{example url="../webgpu-immediates-triangles.html"}}}

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
and material data just by passing in the indices

```js
   pass.setImmediates(0, new Uint32Array([modelNdx, materialNdx]))
```

This could be [an optimization](webgpu-optimization.html) as you won't
have to manage a uniform buffer per model and per material.

Here's a full shader as an example

```wgsl
struct Material {
  color: vec4f,
};

struct PerModel {
  matrix: mat4x4f,
};

struct Globals {
  viewProjection: mat4x4f,
};

struct Vertex {
  @location(0) position: vec4f,
};

struct MyImmediates {
  modelNdx: u32,
  materialNdx: u32,
};

@group(0) @binding(0) var<storage, read> materials: array<Material>;
@group(0) @binding(1) var<storage, read> perModel: array<PerModel>;
@group(0) @binding(2) var<uniform> glb: Globals;

var<immediate> imm: MyImmediates;

@vertex fn vs(v: Vertex) -> @builtin(position) vec4f {
  let model = perModel[imm.modelNdx];
  return glb.viewProjection * model.matrix * v.position;
}

@fragment fn fs() -> @location(0) vec4f {
  let material = materials[imm.materialNdx];
  return material.color;
}
```

The shader above uses immediates to select a material and per model
data. It uses [matrix math](webgpu-matrix-math.html) to position the
vertices.

It also has a global uniform buffer for things that are shared
by all models. In this case it uses a shared [viewProjection matrix](webgpu-orthographic-projection.html).

We make a pipeline that uses this shader and specifies [vertex buffers](webgpu-vertex-buffers.html) that use 2 floats per vertex.

```js
  const pipeline = device.createRenderPipeline({
    label: 'our select model and material via immediates pipeline',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // position
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

We create vertex buffers for 3 different shapes, a triangle, a square,
and a circle.

```js
  const squareVertices = [
    -0.5, -0.5,
     0.5, -0.5,
    -0.5,  0.5,
    -0.5,  0.5,
     0.5, -0.5,
     0.5,  0.5,
  ];
  const triangleVertices = [
     0,    0.5,
    -0.5, -0.5,
     0.5, -0.5,
  ];
  const circleVertices = [];
  const numCircleTriangles = 100;
  for (let i = 0; i < numCircleTriangles; ++i) {
    const angle0 = (i + 0) / numCircleTriangles * 2 * Math.PI;
    const angle1 = (i + 1) / numCircleTriangles * 2 * Math.PI;
    circleVertices.push(Math.cos(angle0) * 0.5, Math.sin(angle0) * 0.5);
    circleVertices.push(Math.cos(angle1) * 0.5, Math.sin(angle1) * 0.5);
    circleVertices.push(0, 0);
  }

  function createVertexBuffer(device, data) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return { buffer, numVertices: data.length / 2 };
  }

  const vertices = [
    createVertexBuffer(
      device, new Float32Array(triangleVertices)),
    createVertexBuffer(
      device, new Float32Array(circleVertices)),
    createVertexBuffer(
      device, new Float32Array(squareVertices)),
  ];
```

Then we'll make a storage buffer with 6 materials.

```js
  const materialData = new Float32Array([
    1.0, 0.5, 0.5, 1.0,  // red
    0.5, 1.0, 0.5, 1.0,  // green
    0.5, 0.5, 1.0, 1.0,  // blue
    1.0, 1.0, 0.5, 1.0,  // yellow
    1.0, 0.5, 1.0, 1.0,  // magenta
    0.5, 1.0, 1.0, 1.0,  // cyan
  ]);
  const numMaterials = materialData.length / 4;
  const materialBuffer = device.createBuffer({
    label: 'our material buffer',
    size: materialData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(materialBuffer, 0, materialData);
```

And we'll defined 200 "models" where a model is the combination of
a vertex buffer, a material, a per model data.

```js
  const models = [];
  const numModels = 200;
  const modelData = new Float32Array(numModels * 16);
  for (let i = 0; i < numModels; ++i) {
    const modelNdx = i;
    const materialNdx = randInt(numMaterials);
    const geometryNdx = randInt(vertices.length);
    const {buffer, numVertices} = vertices[geometryNdx];

    const mat = mat4.translation([(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0]);
    mat4.rotateZ(mat, Math.random() * Math.PI  * 2, mat);
    mat4.scale(mat, [Math.random() * 0.1 + 0.1, Math.random() * 0.1 + 0.1, 1], mat);

    modelData.set(mat, i * 16);

    models.push({
      numVertices,
      vertexBuffer: buffer,
      immediates: new Uint32Array([
        modelNdx,
        materialNdx,
      ]),
    });
  }
```

Above we used [our math](webgpu-matrix-math.html) to choose a random position, scale
and orientation. This is stored in the model data.

We then need to upload that data into a storage buffer

```js
  const perModelBuffer = device.createBuffer({
    label: 'our per model buffer',
    size: modelData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(perModelBuffer, 0, modelData);
```

We also have a shared buffer that all models will use. This will store
our [projection matrix](webgpu-orthograpic-projection.html).

```js
  const sharedData = new Float32Array(16);
  const sharedBuffer = device.createBuffer({
    label: 'our shared data buffer',
    size: sharedData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

We then make a bind group that references our 3 buffers

```js
  const bindGroup = device.createBindGroup({
    label: 'our bind group',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: materialBuffer },
      { binding: 1, resource: perModelBuffer },
      { binding: 2, resource: sharedBuffer },
    ],
  });
```

Finally we can render. First we compute [an orthographic matrix](webgpu-orthographic-projection.html)
that will make our rendering fit the aspect of our canvas and upload
it to the shared buffer.

```js
  function render() {
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

+    const aspect = context.canvas.clientWidth / context.canvas.clientHeight;
+    mat4.ortho(-aspect, aspect, -1, 1, -1, 1, sharedData);
+    device.queue.writeBuffer(sharedBuffer, 0, sharedData);
```

Then we can render all of our models

```js
  function render() {
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const aspect = context.canvas.clientWidth / context.canvas.clientHeight;
    mat4.ortho(-aspect, aspect, -1, 1, -1, 1, sharedData);
    device.queue.writeBuffer(sharedBuffer, 0, sharedData);

    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
*    pass.setBindGroup(0, bindGroup);
*    for (let i = 0; i < numModels; ++i) {
*      const { immediates, vertexBuffer, numVertices } = models[i];
*      pass.setImmediates(0, immediates);
*      pass.setVertexBuffer(0, vertexBuffer);
*      pass.draw(numVertices);
*    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

And with that we're drawing multiple models and selecting materials
and per model data using immediates.

{{{example url="../webgpu-immediates-models.html"}}}

Hopefully this gives you some idea of how to use immediates. The fact that
they have a small 64 byte limit generally means you need to be creative in
how to take advantage of them.
