Title: WebGPU Vertex Buffers
Description: Passing Vertex Data to Shaders
TOC: Vertex Buffers

In [the previous article](webgpu-storage-buffers.html) we put vertex
data in a storage buffer and indexed it using the builtin `vertex_index`.
While that technique is growing in popularity, the traditional way to
provide vertex data to a vertex shader is via vertex buffers and
attributes.

Vertex buffers are just like any other WebGPU buffer; they hold data.
The difference is we don't access them directly from the vertex shader.
Instead, we tell WebGPU what kind of data is in the buffer and how it's
organized. It then pulls the data out of the buffer and provides it for us.

Let's take the last example from
[the previous article](webgpu-storage-buffers.html)
and change it from using a storage buffer to using a vertex buffer.

The first thing to do is change the shader to get its vertex data
from a vertex buffer. 

```wgsl
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

struct Vertex {
-  position: vec2f,
+  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
-  @builtin(vertex_index) vertexIndex : u32,
+  vert: Vertex,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
-      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+      vert.position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

...
```

As you can see, it's a small change. The important part is declaring the
position field with `@location(0)`. 

Next, we have to tell WebGPU how to supply data for `@location(0)` - 
for that, we use the render pipeline:

```js
  const pipeline = device.createRenderPipeline({
    label: 'vertex buffer pipeline',
    layout: 'auto',
    vertex: {
      module,
+      buffers: [
+        {
+          arrayStride: 2 * 4, // 2 floats, 4 bytes each
+          attributes: [
+            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
+          ],
+        },
+      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

To the [`vertex`](GPUVertexState) entry of the [`pipeline` descriptor](GPURenderPipelineDescriptor) 
we added a `buffers` array which is used to describe how to pull data out of 1 or more vertex buffers.
For our first and only buffer, we set an `arrayStride` in number of bytes. A *stride* in this case is
how many bytes to get from the data for one vertex in the buffer, to the next vertex in the buffer.

<div class="webgpu_center"><img src="resources/vertex-buffer-one.svg" style="width: 1024px;"></div>

Since our data is `vec2f`, which is two float32 numbers, we set the
`arrayStride` to 8.

Next we define an array of attributes. We only have one: `shaderLocation: 0`
corresponds to `location(0)` in our `Vertex` struct. `offset: 0` says the data
for this attribute starts at byte 0 in the vertex buffer. Finally `format:
'float32x2'` says we want WebGPU to pull the data out of the buffer as two 32bit
floating point numbers. (Note: the `attributes` property is shown in the 
[simplified draw diagram](webgpu-fundamentals.html#a-draw-diagram) 
from the first article).

We need to change the usages of the buffer holding vertex data from `STORAGE`
to `VERTEX` and remove it from the bind group.

```js
-  const vertexStorageBuffer = device.createBuffer({
-    label: 'storage buffer vertices',
-    size: vertexData.byteLength,
-    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
-  });
+  const vertexBuffer = device.createBuffer({
+    label: 'vertex buffer vertices',
+    size: vertexData.byteLength,
+    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
+  });
+  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer }},
      { binding: 1, resource: { buffer: changingStorageBuffer }},
-      { binding: 2, resource: { buffer: vertexStorageBuffer }},
    ],
  });
```

Then, at draw time we need to tell WebGPU which vertex buffer to use:

```js
    pass.setPipeline(pipeline);
+    pass.setVertexBuffer(0, vertexBuffer);
```

The `0` here corresponds to first element of the render pipeline `buffers`
array we specified above.

With that, we've switched from using a storage buffer for vertices to a
vertex buffer.

{{{example url="../webgpu-vertex-buffers.html"}}}

The state when the draw command is executed would look something like this:

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-vertex-buffer.svg" style="width: 960px;"></div>

The attribute `format` field can be one of these types:

<div class="webgpu_center data-table">
  <style>
    .vertex-type {
      text-align: center;
    }
  </style>
  <div>
  <table class="vertex-type">
    <thead>
     <tr>
      <th>Vertex format</th>
      <th>Data type</th>
      <th>Components</th>
      <th>Byte size</th>
      <th>Example WGSL type</th>
     </tr>
    </thead>
    <tbody>
      <tr><td><code>"uint8x2"</code></td><td>unsigned int </td><td>2 </td><td>2 </td><td><code>vec2&lt;u32&gt;</code>, <code>vec2u</code></td></tr>
      <tr><td><code>"uint8x4"</code></td><td>unsigned int </td><td>4 </td><td>4 </td><td><code>vec4&lt;u32&gt;</code>, <code>vec4u</code></td></tr>
      <tr><td><code>"sint8x2"</code></td><td>signed int </td><td>2 </td><td>2 </td><td><code>vec2&lt;i32&gt;</code>, <code>vec2i</code></td></tr>
      <tr><td><code>"sint8x4"</code></td><td>signed int </td><td>4 </td><td>4 </td><td><code>vec4&lt;i32&gt;</code>, <code>vec4i</code></td></tr>
      <tr><td><code>"unorm8x2"</code></td><td>unsigned normalized </td><td>2 </td><td>2 </td><td><code>vec2&lt;f32&gt;</code>, <code>vec2f</code></td></tr>
      <tr><td><code>"unorm8x4"</code></td><td>unsigned normalized </td><td>4 </td><td>4 </td><td><code>vec4&lt;f32&gt;</code>, <code>vec4f</code></td></tr>
      <tr><td><code>"snorm8x2"</code></td><td>signed normalized </td><td>2 </td><td>2 </td><td><code>vec2&lt;f32&gt;</code>, <code>vec2f</code></td></tr>
      <tr><td><code>"snorm8x4"</code></td><td>signed normalized </td><td>4 </td><td>4 </td><td><code>vec4&lt;f32&gt;</code>, <code>vec4f</code></td></tr>
      <tr><td><code>"uint16x2"</code></td><td>unsigned int </td><td>2 </td><td>4 </td><td><code>vec2&lt;u32&gt;</code>, <code>vec2u</code></td></tr>
      <tr><td><code>"uint16x4"</code></td><td>unsigned int </td><td>4 </td><td>8 </td><td><code>vec4&lt;u32&gt;</code>, <code>vec4u</code></td></tr>
      <tr><td><code>"sint16x2"</code></td><td>signed int </td><td>2 </td><td>4 </td><td><code>vec2&lt;i32&gt;</code>, <code>vec2i</code></td></tr>
      <tr><td><code>"sint16x4"</code></td><td>signed int </td><td>4 </td><td>8 </td><td><code>vec4&lt;i32&gt;</code>, <code>vec4i</code></td></tr>
      <tr><td><code>"unorm16x2"</code></td><td>unsigned normalized </td><td>2 </td><td>4 </td><td><code>vec2&lt;f32&gt;</code>, <code>vec2f</code></td></tr>
      <tr><td><code>"unorm16x4"</code></td><td>unsigned normalized </td><td>4 </td><td>8 </td><td><code>vec4&lt;f32&gt;</code>, <code>vec4f</code></td></tr>
      <tr><td><code>"snorm16x2"</code></td><td>signed normalized </td><td>2 </td><td>4 </td><td><code>vec2&lt;f32&gt;</code>, <code>vec2f</code></td></tr>
      <tr><td><code>"snorm16x4"</code></td><td>signed normalized </td><td>4 </td><td>8 </td><td><code>vec4&lt;f32&gt;</code>, <code>vec4f</code></td></tr>
      <tr><td><code>"float16x2"</code></td><td>float </td><td>2 </td><td>4 </td><td><code>vec2&lt;f16&gt;</code>, <code>vec2h</code></td></tr>
      <tr><td><code>"float16x4"</code></td><td>float </td><td>4 </td><td>8 </td><td><code>vec4&lt;f16&gt;</code>, <code>vec4h</code></td></tr>
      <tr><td><code>"float32"</code></td><td>float </td><td>1 </td><td>4 </td><td><code>f32</code></td></tr>
      <tr><td><code>"float32x2"</code></td><td>float </td><td>2 </td><td>8 </td><td><code>vec2&lt;f32&gt;</code>, <code>vec2f</code></td></tr>
      <tr><td><code>"float32x3"</code></td><td>float </td><td>3 </td><td>12 </td><td><code>vec3&lt;f32&gt;</code>, <code>vec3f</code></td></tr>
      <tr><td><code>"float32x4"</code></td><td>float </td><td>4 </td><td>16 </td><td><code>vec4&lt;f32&gt;</code>, <code>vec4f</code></td></tr>
      <tr><td><code>"uint32"</code></td><td>unsigned int </td><td>1 </td><td>4 </td><td><code>u32</code></td></tr>
      <tr><td><code>"uint32x2"</code></td><td>unsigned int </td><td>2 </td><td>8 </td><td><code>vec2&lt;u32&gt;</code>, <code>vec2u</code></td></tr>
      <tr><td><code>"uint32x3"</code></td><td>unsigned int </td><td>3 </td><td>12 </td><td><code>vec3&lt;u32&gt;</code>, <code>vec3u</code></td></tr>
      <tr><td><code>"uint32x4"</code></td><td>unsigned int </td><td>4 </td><td>16 </td><td><code>vec4&lt;u32&gt;</code>, <code>vec4u</code></td></tr>
      <tr><td><code>"sint32"</code></td><td>signed int </td><td>1 </td><td>4 </td><td><code>i32</code></td></tr>
      <tr><td><code>"sint32x2"</code></td><td>signed int </td><td>2 </td><td>8 </td><td><code>vec2&lt;i32&gt;</code>, <code>vec2i</code></td></tr>
      <tr><td><code>"sint32x3"</code></td><td>signed int </td><td>3 </td><td>12 </td><td><code>vec3&lt;i32&gt;</code>, <code>vec3i</code></td></tr>
      <tr><td><code>"sint32x4"</code></td><td>signed int </td><td>4 </td><td>16 </td><td><code>vec4&lt;i32&gt;</code>, <code>vec4i</code></td></tr>
    </tbody>
  </table>
  </div>
</div>

## <a id="a-instancing"></a>Instancing with Vertex Buffers

Attributes can advance per vertex or per instance. Advancing them per instance is effectively
the same thing we're doing when we index `otherStructs[instanceIndex]` and `ourStructs[instanceIndex]`
where `instanceIndex` got its value from `@builtin(instance_index)`.

Let's get rid of the storage buffers and use vertex buffers to accomplish the same thing.
First lets change the shader to use vertex attributes instead of storage buffers.

```wgsl
-struct OurStruct {
-  color: vec4f,
-  offset: vec2f,
-};
-
-struct OtherStruct {
-  scale: vec2f,
-};

struct Vertex {
  @location(0) position: vec2f,
+  @location(1) color: vec4f,
+  @location(2) offset: vec2f,
+  @location(3) scale: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

-@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
-@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;

@vertex fn vs(
  vert: Vertex,
-  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
-  let otherStruct = otherStructs[instanceIndex];
-  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
-  vsOut.position = vec4f(
-      vert.position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
-  vsOut.color = ourStruct.color;
+  vsOut.position = vec4f(
+      vert.position * vert.scale + vert.offset, 0.0, 1.0);
+  vsOut.color = vert.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

Now we need to update our render pipeline to tell it how we want
to supply data to those attributes. To keep the changes to a minimum
we'll use the data we created for the storage buffers almost as is.
We'll use two buffers, one buffer will hold the `color` and `offset`
per instance, the other will hold the `scale`.

```js
  const pipeline = device.createRenderPipeline({
    label: 'flat colors',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
          ],
        },
+        {
+          arrayStride: 6 * 4, // 6 floats, 4 bytes each
+          stepMode: 'instance',
+          attributes: [
+            {shaderLocation: 1, offset:  0, format: 'float32x4'},  // color
+            {shaderLocation: 2, offset: 16, format: 'float32x2'},  // offset
+          ],
+        },
+        {
+          arrayStride: 2 * 4, // 2 floats, 4 bytes each
+          stepMode: 'instance',
+          attributes: [
+            {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
+          ],
+        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

Above we added 2 entries to the `buffers` array on our pipeline description so now there are 3 buffer entries, meaning
we're telling WebGPU we'll supply the data in 3 buffers.

For our 2 new entries we set the `stepMode` to `instance`. This means this attribute
will only advance to next value once per instance. The default is `stepMode: 'vertex'`
which advances once per vertex (and starts over for each instance).

We have 2 buffers. The one that holds just `scale` is simple. Just like our
first buffer that holds `position` it's 2 32 floats per vertex.

Our other buffer holds `color` and `offset` and they're going to be interleaved in the data like this

<div class="webgpu_center"><img src="resources/vertex-buffer-f32x4-f32x2.svg" style="width: 1024px;"></div>

So above we say the `arrayStride` to get from one set of data to the next is `6 * 4`, 6 32bit floats
each 4 bytes (24 bytes total). The `color` starts at offset 0 but the `offset` starts 16 bytes in.

Next we can change the code that sets up the buffers.

```js
  // create 2 storage buffers
  const staticUnitSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
-    2 * 4 + // offset is 2 32bit floats (4bytes each)
-    2 * 4;  // padding
+    2 * 4;  // offset is 2 32bit floats (4bytes each)

  const changingUnitSize =
    2 * 4;  // scale is 2 32bit floats (4bytes each)
*  const staticVertexBufferSize = staticUnitSize * kNumObjects;
*  const changingVertexBufferSize = changingUnitSize * kNumObjects;

*  const staticVertexBuffer = device.createBuffer({
*    label: 'static vertex for objects',
*    size: staticVertexBufferSize,
-    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
+    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

*  const changingVertexBuffer = device.createBuffer({
*    label: 'changing vertex for objects',
*    size: changingVertexBufferSize,
-    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
+    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

```

Vertex attributes do not have the same padding restrictions as structures
in storage buffers so we no longer need the padding. Otherwise all we
did was change the usage from `STORAGE` to `VERTEX` (and we renamed all the
variables from "storage" to "vertex").

Since we're no longer using the storage buffers we no longer need
the bind group:

```js
-  const bindGroup = device.createBindGroup({
-    label: 'bind group for objects',
-    layout: pipeline.getBindGroupLayout(0),
-    entries: [
-      { binding: 0, resource: { buffer: staticStorageBuffer }},
-      { binding: 1, resource: { buffer: changingStorageBuffer }},
-    ],
-  });
```

Finally, we don't need to set the bind group but, we do need
to set the vertex buffers:

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setVertexBuffer(1, staticVertexBuffer);
+    pass.setVertexBuffer(2, changingVertexBuffer);

    ...
-    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices, kNumObjects);

    pass.end();
```

Here the first parameter to `setVertexBuffer` corresponds to the elements of
the `buffers` array in the pipeline we created above.

With that we have the same thing we had before, but we're using all vertex buffers
and no storage buffers.

{{{example url="../webgpu-vertex-buffers-instanced-colors"}}}

Just for fun, let's add another attribute for a per vertex color. First let's change the shader:

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) color: vec4f,
  @location(2) offset: vec2f,
  @location(3) scale: vec2f,
+  @location(4) perVertexColor: vec3f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex fn vs(
  vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vec4f(
      vert.position * vert.scale + vert.offset, 0.0, 1.0);
-  vsOut.color = vert.color;
+  vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

Then we need to update the pipeline to describe how we'll supply the data.
We're going to interleave the `perVertexColor` data with the `position` like this:

<div class="webgpu_center"><img src="resources/vertex-buffer-mixed.svg" style="width: 1024px;"></div>

So, the `arrayStride` needs to be changed to cover our new data and we need
to add the new attribute. It starts after two 32bit floating point numbers
so its `offset` into the buffer is 8 bytes.

```js
  const pipeline = device.createRenderPipeline({
    label: 'per vertex color',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 2 * 4, // 2 floats, 4 bytes each
+          arrayStride: 5 * 4, // 5 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
+            {shaderLocation: 4, offset: 8, format: 'float32x3'},  // perVertexColor
          ],
        },
        {
          arrayStride: 6 * 4, // 6 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 1, offset:  0, format: 'float32x4'},  // color
            {shaderLocation: 2, offset: 16, format: 'float32x2'},  // offset
          ],
        },
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
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

We'll update the circle vertex generation code to provide a dark color
for vertices on the outer edge of the circle and a light color for
the inner vertices.

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 5 values (xyrgb) each.
  const numVertices = numSubdivisions * 3 * 2;
-  const vertexData = new Float32Array(numVertices * 2);
+  const vertexData = new Float32Array(numVertices * (2 + 3));

  let offset = 0;
-  const addVertex = (x, y, r, g, b) => {
+  const addVertex = (x, y, r, g, b) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
+    vertexData[offset++] = r;
+    vertexData[offset++] = g;
+    vertexData[offset++] = b;
  };

+  const innerColor = [1, 1, 1];
+  const outerColor = [0.1, 0.1, 0.1];

  // 2 triangles per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // first triangle
-    addVertex(c1 * radius, s1 * radius);
-    addVertex(c2 * radius, s2 * radius);
-    addVertex(c1 * innerRadius, s1 * innerRadius);
+    addVertex(c1 * radius, s1 * radius, ...outerColor);
+    addVertex(c2 * radius, s2 * radius, ...outerColor);
+    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);

    // second triangle
-    addVertex(c1 * innerRadius, s1 * innerRadius);
-    addVertex(c2 * radius, s2 * radius);
-    addVertex(c2 * innerRadius, s2 * innerRadius);
+    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
+    addVertex(c2 * radius, s2 * radius, ...outerColor);
+    addVertex(c2 * innerRadius, s2 * innerRadius, ...innerColor);
  }

  return {
    vertexData,
    numVertices,
  };
}
```

And with that we get shaded circles:

{{{example url="../webgpu-vertex-buffers-per-vertex-colors.html"}}}

## <a id="a-default-values"></a>Attributes in WGSL do not have to match attributes in JavaScript

Above in WGSL we declared the `perVertexColor` attribute as a `vec3f` like this:

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) color: vec4f,
  @location(2) offset: vec2f,
  @location(3) scale: vec2f,
*  @location(4) perVertexColor: vec3f,
};
```

And used it like this:

```wgsl
@vertex fn vs(
  vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vec4f(
      vert.position * vert.scale + vert.offset, 0.0, 1.0);
*  vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
  return vsOut;
}
```

We could also declare it as a `vec4f` and use it like this:

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) color: vec4f,
  @location(2) offset: vec2f,
  @location(3) scale: vec2f,
-  @location(4) perVertexColor: vec3f,
+  @location(4) perVertexColor: vec4f,
};

...

@vertex fn vs(
  vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vec4f(
      vert.position * vert.scale + vert.offset, 0.0, 1.0);
-  vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
+  vsOut.color = vert.color * vert.perVertexColor;
  return vsOut;
}
```

And change nothing else. In JavaScript we're still only supplying the data as
3 floats per vertex.

```js
    {
      arrayStride: 5 * 4, // 5 floats, 4 bytes each
      attributes: [
        {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
*        {shaderLocation: 4, offset: 8, format: 'float32x3'},  // perVertexColor
      ],
    },
```

This works because attributes always have 4 values available in the shader. They default
to `0, 0, 0, 1` so any values we don't supply get these defaults.

{{{example url="../webgpu-vertex-buffers-per-vertex-colors-3-in-4-out.html"}}}

## <a id="a-normalized-attributes"></a>Using normalized values to save space

We're using 32bit floating point values for colors. Each `perVertexColor` has 3 values for a total of 
12 bytes per color per vertex. Each `color` has 4 values for a total of 16 bytes per color per instance.

We could optimize that by using 8bit values and telling WebGPU they should be normalized from 0 ↔ 255 to 0.0 ↔ 1.0.

Looking at the list of valid attribute formats there is no 3 value 8bit format but there is `'unorm8x4'` so let's
use that.

First let's change the code that generates the vertices to store colors as 8bit values that
will be normalized:

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
-  // 2 triangles per subdivision, 3 verts per tri, 5 values (xyrgb) each.
+  // 2 triangles per subdivision, 3 verts per tri
  const numVertices = numSubdivisions * 3 * 2;
-  const vertexData = new Float32Array(numVertices * (2 + 3));
+  // 2 32-bit values for position (xy) and 1 32-bit value for color (rgb_)
+  // The 32-bit color value will be written/read as 4 8-bit values
+  const vertexData = new Float32Array(numVertices * (2 + 1));
+  const colorData = new Uint8Array(vertexData.buffer);

  let offset = 0;
+  let colorOffset = 8;
  const addVertex = (x, y, r, g, b) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
-    vertexData[offset++] = r;
-    vertexData[offset++] = g;
-    vertexData[offset++] = b;
+    offset += 1;  // skip the color
+    colorData[colorOffset++] = r * 255;
+    colorData[colorOffset++] = g * 255;
+    colorData[colorOffset++] = b * 255;
+    colorOffset += 9;  // skip extra byte and the position
  };
```

Above we make `colorData`, which is a `Uint8Array` view of the same
data as `vertexData`. Review the [data memory layout article](webgpu-memory-layout.html#multiple-views-of-the-same-arraybuffer) if this is unclear.

We then use `colorData` to insert the colors, expanding them from 0 ↔ 1
to 0 ↔ 255.

The memory layout of this (per vertex) data is like this:

<div class="webgpu_center"><img src="resources/vertex-buffer-f32x2-u8x4.svg" style="width: 1024px;"></div>

We also need to update the per instance data.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // create 2 vertex buffers
  const staticUnitSize =
-    4 * 4 + // color is 4 32bit floats (4bytes each)
+    4 +     // color is 4 bytes
    2 * 4;  // offset is 2 32bit floats (4bytes each)
  const changingUnitSize =
    2 * 4;  // scale is 2 32bit floats (4bytes each)
  const staticVertexBufferSize = staticUnitSize * kNumObjects;
  const changingVertexBufferSize = changingUnitSize * kNumObjects;

  const staticVertexBuffer = device.createBuffer({
    label: 'static vertex for objects',
    size: staticVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const changingVertexBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kOffsetOffset = 1;

  const kScaleOffset = 0;

  {
-    const staticVertexValues = new Float32Array(staticVertexBufferSize / 4);
+    const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
+    const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);
    for (let i = 0; i < kNumObjects; ++i) {
-      const staticOffset = i * (staticUnitSize / 4);
+      const staticOffsetU8 = i * staticUnitSize;
+      const staticOffsetF32 = staticOffsetU8 / 4;

      // These are only set once so set them now
-      staticVertexValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // set the color
-      staticVertexValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // set the offset
+      staticVertexValuesU8.set(        // set the color
+          [rand() * 255, rand() * 255, rand() * 255, 255],
+          staticOffsetU8 + kColorOffset);
+
+      staticVertexValuesF32.set(      // set the offset
+          [rand(-0.9, 0.9), rand(-0.9, 0.9)],
+          staticOffsetF32 + kOffsetOffset);

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
  }
```

The layout for the per instance data is like this:

<div class="webgpu_center"><img src="resources/vertex-buffer-u8x4-f32x2.svg" style="width: 1024px;"></div>

We then need to change the pipeline to tell then GPU to pull out the data as 8bit unsigned
values and to normalize them back to 0 ↔ 1. We do this by marking the attribute as `'unorm8x4`.
We also need to update the offsets and the stride to the new size.

```js
  const pipeline = device.createRenderPipeline({
    label: 'per vertex color',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 5 * 4, // 5 floats, 4 bytes each
+          arrayStride: 2 * 4 + 4, // 2 floats, 4 bytes each + 4 bytes
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
-            {shaderLocation: 4, offset: 8, format: 'float32x3'},  // perVertexColor
+            {shaderLocation: 4, offset: 8, format: 'unorm8x4'},   // perVertexColor
          ],
        },
        {
-          arrayStride: 6 * 4, // 6 floats, 4 bytes each
+          arrayStride: 4 + 2 * 4, // 4 bytes + 2 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
-            {shaderLocation: 1, offset:  0, format: 'float32x4'},  // color
-            {shaderLocation: 2, offset: 16, format: 'float32x2'},  // offset
+            {shaderLocation: 1, offset: 0, format: 'unorm8x4'},   // color
+            {shaderLocation: 2, offset: 4, format: 'float32x2'},  // offset
          ],
        },
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
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

And with that we've save a little space. We were using 20 bytes per vertex,
now we're using 12 bytes per vertex, a 40% savings. And we were using 24 bytes
per instance, now we're using 12, a 50% savings.

{{{example url="../webgpu-vertex-buffers-8bit-colors.html"}}}

Note that we don't have to use a struct. This would work just as well:

```WGSL
@vertex fn vs(
-  vert: Vertex,
+  @location(0) position: vec2f,
+  @location(1) color: vec4f,
+  @location(2) offset: vec2f,
+  @location(3) scale: vec2f,
+  @location(4) perVertexColor: vec3f,
) -> VSOutput {
  var vsOut: VSOutput;
-  vsOut.position = vec4f(
-      vert.position * vert.scale + vert.offset, 0.0, 1.0);
-  vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
+  vsOut.position = vec4f(
+      position * scale + offset, 0.0, 1.0);
+  vsOut.color = color * vec4f(perVertexColor, 1);
  return vsOut;
}
```

As again, all WebGPU cares about that we define `locations` in the shader
and supply data to those locations via the API.

## <a id="a-index-buffers"></a>Index Buffers

One last thing to cover here are index buffers. Index buffers describe
the order to process and use the vertices.

You can think of `draw` as going through the vertices in order:

```
0, 1, 2, 3, 4, 5, .....
```

With an index buffer we can change that order.

We were creating 6 vertices per subdivision of the circle even though 2
of them were identical.

<div class="webgpu_center"><img src="resources/vertices-non-indexed.svg" style="width: 400px"></div>  

Now instead, we'll only create 4 but then use indices to
use those 4 vertices 6 times by telling WebGPU to draw indices in this order:

```
0, 1, 2, 2, 1, 3, ...
```

<div class="webgpu_center"><img src="resources/vertices-indexed.svg" style="width: 400px"></div>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
-  // 2 triangles per subdivision, 3 verts per tri
-  const numVertices = numSubdivisions * 3 * 2;
+  // 2 vertices at each subdivision, + 1 to wrap around the circle.
+  const numVertices = (numSubdivisions + 1) * 2;
  // 2 32-bit values for position (xy) and 1 32-bit value for color (rgb)
  // The 32-bit color value will be written/read as 4 8-bit values
  const vertexData = new Float32Array(numVertices * (2 + 1));
  const colorData = new Uint8Array(vertexData.buffer);

  let offset = 0;
  let colorOffset = 8;
  const addVertex = (x, y, r, g, b) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
    offset += 1;  // skip the color
    colorData[colorOffset++] = r * 255;
    colorData[colorOffset++] = g * 255;
    colorData[colorOffset++] = b * 255;
    colorOffset += 9;  // skip extra byte and the position
  };
  const innerColor = [1, 1, 1];
  const outerColor = [0.1, 0.1, 0.1];

-  // 2 triangles per subdivision
-  //
-  // 0--1 4
-  // | / /|
-  // |/ / |
-  // 2 3--5
-  for (let i = 0; i < numSubdivisions; ++i) {
-    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
-    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;
-
-    const c1 = Math.cos(angle1);
-    const s1 = Math.sin(angle1);
-    const c2 = Math.cos(angle2);
-    const s2 = Math.sin(angle2);
-
-    // first triangle
-    addVertex(c1 * radius, s1 * radius, ...outerColor);
-    addVertex(c2 * radius, s2 * radius, ...outerColor);
-    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
-
-    // second triangle
-    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
-    addVertex(c2 * radius, s2 * radius, ...outerColor);
-    addVertex(c2 * innerRadius, s2 * innerRadius, ...innerColor);
-  }
+  // 2 triangles per subdivision
+  //
+  // 0  2  4  6  8 ...
+  //
+  // 1  3  5  7  9 ...
+  for (let i = 0; i <= numSubdivisions; ++i) {
+    const angle = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
+
+    const c1 = Math.cos(angle);
+    const s1 = Math.sin(angle);
+
+    addVertex(c1 * radius, s1 * radius, ...outerColor);
+    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
+  }

+  const indexData = new Uint32Array(numSubdivisions * 6);
+  let ndx = 0;
+
+  // 1st tri  2nd tri  3rd tri  4th tri
+  // 0 1 2    2 1 3    2 3 4    4 3 5
+  //
+  // 0--2        2     2--4        4  .....
+  // | /        /|     | /        /|
+  // |/        / |     |/        / |
+  // 1        1--3     3        3--5  .....
+  for (let i = 0; i < numSubdivisions; ++i) {
+    const ndxOffset = i * 2;
+
+    // first triangle
+    indexData[ndx++] = ndxOffset;
+    indexData[ndx++] = ndxOffset + 1;
+    indexData[ndx++] = ndxOffset + 2;
+
+    // second triangle
+    indexData[ndx++] = ndxOffset + 2;
+    indexData[ndx++] = ndxOffset + 1;
+    indexData[ndx++] = ndxOffset + 3;
+  }

  return {
    vertexData,
+    indexData,
-    numVertices,
+    numVertices: indexData.length,
  };
}
```

Then we need to create an index buffer:

```js
-  const { vertexData, numVertices } = createCircleVertices({
+  const { vertexData, indexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
+  const indexBuffer = device.createBuffer({
+    label: 'index buffer',
+    size: indexData.byteLength,
+    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
+  });
+  device.queue.writeBuffer(indexBuffer, 0, indexData);
```

Notice we set the usage to `INDEX`.

Then finally at draw time we need to specify the index buffer:

```js
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, changingVertexBuffer);
+    pass.setIndexBuffer(indexBuffer, 'uint32');
```

Because our buffer contains 32bit unsigned integer indices
we need to pass `'uint32'` here. We could also use 16 bit
unsigned indices in which case we'd pass in `'uint16'`.

And we need to call `drawIndexed` instead of `draw`:

```js
-    pass.draw(numVertices, kNumObjects);
+    pass.drawIndexed(numVertices, kNumObjects);
```

With that we saved some space (33%) and, potentially
a similar amount of processing when computing vertices
in the vertex shader as it's possible the GPU can reuse
vertices it has already calculated.

{{{example url="../webgpu-vertex-buffers-index-buffer.html"}}}

Note that we could have also used an index buffer with the
storage buffer example from [the previous article](webgpu-storage-buffers.html).
In that case the value from `@builtin(vertex_index)` that's passed in matches the index
from the index buffer.

Next up we'll cover [textures](webgpu-textures.html).


