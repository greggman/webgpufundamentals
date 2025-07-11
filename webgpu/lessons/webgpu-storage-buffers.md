Title: WebGPU Storage Buffers
Description: Passing Large Data to Shaders
TOC: Storage Buffers

This article is about storage buffers and continues where the
[previous article](webgpu-uniforms.html) left off.

Storage buffers are similar to uniform buffers in many ways.
If all we did was change `UNIFORM` to `STORAGE` in our JavaScript
and `var<uniform>` to `var<storage, read>` in our WGSL, the examples
on the previous page would just work.

In fact, here are the differences, without renaming variables to have more
appropriate names.

```js
    const staticUniformBuffer = device.createBuffer({
      label: `static uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });


...

    const uniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: uniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
```

and in our WSGL

```wsgl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
+@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

And with no other changes it works, just like before.

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## Differences between uniform buffers and storage buffers

The major differences between uniform buffers and storage buffers are:

1. Uniform buffers can be faster for their typical use-case

   It really depends on the use case. A typical app will need to draw
   lots of different things. Say it's a 3D game. The app might draw
   cars, buildings, rocks, bushes, people, etc... Each of those will
   require passing in orientations and material properties similar
   to what our example above passes in. In this case, using a uniform buffer
   is the recommended solution.

2. Storage buffers can be much larger than uniform buffers.

   * By default, the maximum size of a uniform buffer is 64 kiB (65536 bytes).
   * By default, the maximum size of a storage buffer is 128 MiB (134217728 bytes).

   All implementations are required to support at least these sizes. We'll cover how to check for and request larger limits in
   detail in [another article](webgpu-limits-and-features.html).

3. Storage buffers can be read/write, Uniform buffers are read-only.

   We saw an example of writing to a storage buffer in the compute shader
   example in [the first article](webgpu-fundamentals.html).

## <a id="a-instancing"></a>Instancing with Storage Buffers

Given the first 2 points above, let's take our last example and change it
to draw all 100 triangles in a single draw call. This is a use-case that
*might* fit storage buffers. I say might because again, WebGPU is similar
to other programming languages. There are many ways to achieve the same thing.
`array.forEach` vs `for (const elem of array)` vs `for (let i = 0; i < array.length; ++i)`. Each has its uses. The same is true of WebGPU. Each thing we try to do
has multiple ways we can achieve it. When it comes to drawing triangles,
all that WebGPU cares about is we return a value for `builtin(position)` from
the vertex shader and return a color/value for `location(0)` from the fragment shader.[^colorAttachments] 

[^colorAttachments]: We can have multiple color attachments and then we'll need to return more colors/values for `location(1)`, `location(2)`, etc...

The first thing we'll do is change our storage declarations to runtime-sized
arrays.

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

Then we'll change the shader to use these values.

```wgsl
@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32
) -> @builtin(position) {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

+  let otherStruct = otherStructs[instanceIndex];
+  let ourStruct = ourStructs[instanceIndex];

   return vec4f(
     pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
}
```

We added a new parameter to our vertex shader called
`instanceIndex` and gave it the `@builtin(instance_index)` attribute
which means it gets its value from WebGPU for each "instance" drawn.
When we call `draw`, we can pass a second argument for *number of instances*
and for each instance drawn, the number of the instance being processed
will be passed to our function.

Using `instanceIndex`, we can get specific struct elements from our arrays
of structs.

We also need to get the color from the correct array element and use
it in our fragment shader. The fragment shader doesn't have access to
`@builtin(instance_index)` because that would make no sense. We could pass
it as an [inter-stage variable](webgpu-inter-stage-variables.html) but it
would be more common to look up the color in the vertex shader and just pass
the color.

To do this we'll use another struct like we did in
[the article on inter-stage variables](webgpu-inter-stage-variables.html).

```wgsl
+struct VSOutput {
+  @builtin(position) position: vec4f,
+  @location(0) color: vec4f,
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
-) -> @builtin(position) vec4f {
+) -> VSOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

-  return vec4f(
-    pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  var vsOut: VSOutput;
+  vsOut.position = vec4f(
+      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  vsOut.color = ourStruct.color;
+  return vsOut;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return ourStruct.color;
+@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
+  return vsOut.color;
}

```

Now that we've modified our WGSL shaders, let's update the JavaScript.

Here's the setup.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // create 2 storage buffers
  const staticUnitSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // offset is 2 32bit floats (4bytes each)
    2 * 4;  // padding
  const changingUnitSize =
    2 * 4;  // scale is 2 32bit floats (4bytes each)
  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // These are only set once so set them now
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // set the color
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // set the offset

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // a typed array we can use to update the changingStorageBuffer
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer},
      { binding: 1, resource: changingStorageBuffer},
    ],
  });
```

Above we create 2 storage buffers. One for an array of `OurStruct`
and the other for an array of `OtherStruct`.

We then fill out the values for the array of `OurStruct` with offsets
and colors and then upload that data to the `staticStorageBuffer`.

We make just one bind group that references both buffers.

The new rendering code is

```js
  function render() {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;

-    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
-      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(3);  // call our vertex shader 3 times
-    }

+    // set the scales for each object
+    objectInfos.forEach(({scale}, ndx) => {
+      const offset = ndx * (changingUnitSize / 4);
+      storageValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
+    });
+    // upload all scales at once
+    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(3, kNumObjects);  // call our vertex shader 3 times for each instance


    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

The code above is going to draw `kNumObjects` instances. For each instance
WebGPU will call the vertex shader 3 times with `vertex_index` set to 0, 1, 2
and `instance_index` set to 0 ~ kNumObjects - 1

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

We managed to draw all 100 triangles, each with a different scale, color, and
offset, with a single draw call. For situations where you want to draw lots
of instances of the same object, this is one way to do it.

## Using storage buffers for vertex data

Until this point, we've used a hard-coded triangle directly in our shader.
One use case of storage buffers is to store vertex data. Just like we indexed
the current storage buffers by `instance_index` in our example above, we could
index another storage buffer with `vertex_index` to get vertex data.

Let's do it!

```wgsl
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

+struct Vertex {
+  position: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
+@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
-      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

Now we need to set up one more storage buffer with some vertex data.
First, let's make a function to generate some vertex data. Let's make a circle.
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

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
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c2 * innerRadius, s2 * innerRadius);
  }

  return {
    vertexData,
    numVertices,
  };
}
```

The code above makes a circle from triangles like this.

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

So we can use that to fill a storage buffer with the vertices for a circle.

```js
  // setup a storage buffer with vertex data
  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);
```

And then we need to add it to our bind group.

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer},
      { binding: 1, resource: changingStorageBuffer},
+      { binding: 2, resource: vertexStorageBuffer},
    ],
  });
```

and finally, at render time, we need to ask to render all the vertices in the circle.

```js
-    pass.draw(3, kNumObjects);  // call our vertex shader 3 times for several instances
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

Above we used 

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

we could have just as easily used no struct and just directly used a `vec2f`.

```wgsl
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
+@group(0) @binding(2) var<storage, read> pos: array<vec2f>;
...
-pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
```

But, by making it a struct, it would arguably be easier to add per-vertex
data later?

Passing in vertices via storage buffers is gaining popularity.
I'm told though that for some older devices, it's slower than the *classic* way
which we'll cover next in an article on [vertex buffers](webgpu-vertex-buffers.html).

<!-- keep this at the bottom of the article -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
