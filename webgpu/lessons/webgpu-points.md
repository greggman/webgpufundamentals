Title: WebGPU Points
Description: Drawing Points in WebGPU
TOC: Points

WebGPU supports drawing to points. We do this by setting the
primitive topology to `'point-list'` in a render pipeline.

Let's create a simple example with random points
starting with ideas presented in [the article on vertex buffers](webgpu-vertex-buffers.html).

First, a simple vertex shader and fragment shader. To keep it simple we'll
just use clip space coordinates for positions and hard code the color
yellow in our fragment shader.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vert.position;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // yellow
}
```

Then, when we create a pipeline, we set the topology to `'point-list'`

```js
  const pipeline = device.createRenderPipeline({
    label: '1 pixel points',
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
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    primitive: {
+      topology: 'point-list',
+    },
  });
```

Let's fill a vertex buffer with some random clips space points

```js
  const rand = (min, max) => min + Math.random() * (max - min);

  const kNumPoints = 100;
  const vertexData = new Float32Array(kNumPoints * 2);
  for (let i = 0; i < kNumPoints; ++i) {
    const offset = i * 2;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
  }

  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

And then draw 

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(kNumPoints);
    pass.end();
```

And with that we get 100 random yellow points

{{{example url="../webgpu-points.html"}}}

Unfortunately they are all only 1 pixel in size. 1 pixel size points is all WebGPU
supports. If we want something larger we need to do it ourselves. Fortunately it's
easy to do. We'll just make a quad and use [instancing](webgpu-vertex-buffers.html#a-instancing);

Let's add a quad to our vertex shader and a size attribute. Let's also add a uniform
to pass in the size of the texture we are drawing to.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
+  @location(1) size: f32,
};

+struct Uniforms {
+  resolution: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
};

+@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
  var vsOut: VSOutput;
+  let pos = points[vNdx];
-  vsOut.position = vec4f(vert.position, 0, 1);
+  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // yellow
}
```

In JavaScript we need to add an attribute for a size per point, we need to set
the attributes to advance per instance by setting `stepMode: 'instance'`, and we
can remove the topology setting since we want the default `'triangle-list'`

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable points',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 2 * 4, // 2 floats, 4 bytes each
+          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
+          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
+            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });
```

Let's add a random size per point to our vertex data

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 2);
+  const vertexData = new Float32Array(kNumPoints * 3);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 2;
+    const offset = i * 3;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
+    vertexData[offset + 2] = rand(1, 32);
  }
```

We need a uniform buffer so we can pass in the resolution

```js
  const uniformValues = new Float32Array(2);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kResolutionOffset = 0;
  const resolutionValue = uniformValues.subarray(
      kResolutionOffset, kResolutionOffset + 2);
```

And we need a bind group to bind the uniform buffer

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

Then at render time we can update the uniform buffer with the current
resolution.

```js
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    // Update the resolution in the uniform buffer
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

then set our bind group and render an instance per point

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setBindGroup(0, bindGroup);
-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);
    pass.end();
```

And now we have sizable points

{{{example url="../webgpu-points-w-size.html"}}}

What if we wanted to texture our points? We just need to pass in
texture coordinates from the vertex shader to the fragment shader.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
+  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
```

And of course use a texture in the fragment shader

```wgsl
+@group(0) @binding(1) var s: sampler;
+@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return vec4f(1, 1, 0, 1); // yellow
+  return textureSample(t, s, vsOut.texcoord);
}
```

We'll create a simple texture using a canvas like we covered in
[the article on importing textures](webgpu-importing-textures.html).

```js
  const ctx = new OffscreenCanvas(32, 32).getContext('2d');
  ctx.font = '27px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥑', 16, 16);

  const texture = device.createTexture({
    size: [32, 32],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING |
           GPUTextureUsage.COPY_DST |
           GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: ctx.canvas, flipY: true },
    { texture, premultipliedAlpha: true },
    [32, 32],
  );
```

And we need a sampler and we need to add them to our bind group

```js
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
+      { binding: 1, resource: sampler },
+      { binding: 2, resource: texture },
    ],
  });
```

Let's also turn on blending so we get [transparency](webgpu-transparency.html)

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable points with texture',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
          ],
        },
      ],
    },
    fragment: {
      module,
-      targets: [{ format: presentationFormat }],
+      targets: [
+        {
+         format: presentationFormat,
+          blend: {
+            color: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+            alpha: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+          },
+        },
+      ],
    },
  });
```

And now we have textured points

{{{example url="../webgpu-points-w-texture.html"}}}

And we could keep going, how about a rotation per point? Using the math we covered
in [the article on matrix math](webgpu-matrix-math.html).

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
+  @location(2) rotation: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
+  let c = cos(vert.rotation);
+  let s = sin(vert.rotation);
+  let rot = mat2x2f(
+     c, s,
+    -s, c,
+  );
-  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.position = vec4f(vert.position + rot * pos * vert.size / uni.resolution, 0, 1);
  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
      }
```

We need to add the rotation attribute to our pipeline

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable rotatable points with texture',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
+          arrayStride: (2 + 1 + 1) * 4, // 4 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
+            {shaderLocation: 2, offset: 12, format: 'float32'},  // rotation
          ],
        },
      ],
    },
    ...
```

We need to add rotation to our vertex data

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 3);
+  const vertexData = new Float32Array(kNumPoints * 4);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 3;
+    const offset = i * 4;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
*    vertexData[offset + 2] = rand(10, 64);
+    vertexData[offset + 3] = rand(0, Math.PI * 2);
  }

```

Let's also change the texture from 🥑 to 👉

```js
-  ctx.fillText('🥑', 16, 16);
+  ctx.fillText('👉', 16, 16);
```

{{{example url="../webgpu-points-w-rotation.html" }}}

# What about points in 3D?

The simple answer is just add in the quad values after doing
[the 3d math for the vertices](webgpu-perspective-projection.html).

For example, here's some code to make 3d positions for a
[fibonacci sphere](https://www.google.com/search?q=fibonacci+sphere).

```js
function createFibonacciSphereVertices({
  numSamples,
  radius,
}) {
  const vertices = [];
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < numSamples; ++i) {
    const offset = 2 / numSamples;
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - Math.pow(y, 2));
    const phi = (i % numSamples) * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    vertices.push(x * radius, y * radius, z * radius);
  }
  return new Float32Array(vertices);
}
```

We can draw the vertices with points by applying 3D math to the vertices
like [we covered in the series on 3d math](webgpu-cameras.js).

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
*  matrix: mat4x4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
*  let clipPos = uni.matrix * vert.position;
  vsOut.position = clipPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);  // orange
}
```

Here's our pipeline and vertex buffer

```js
  const pipeline = device.createRenderPipeline({
    label: '3d points with fixed size',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'point-list',
    },
  });

  const vertexData = createFibonacciSphereVertices({
    radius: 1,
    numSamples: 1000,
  });
  const kNumPoints = vertexData.length / 3;

  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

And, a uniform buffer and uniform values for our matrix as well
as a bindGroup to pass the uniform buffer our shader.

```js
  const uniformValues = new Float32Array(16);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kMatrixOffset = 0;
  const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

And the code to draw using a projection matrix, camera, and other
3d math.

```js
  function render(time) {
    time *= 0.001;

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

    // Set the matrix in the uniform buffer
    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // position
      [0, 0, 0],    // target
      [0, 1, 0],    // up
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

    // Copy the uniform values to the GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(kNumPoints);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
```

We also switched to a `requestAnimationFrame` loop.

{{{example url="../webgpu-points-3d-1px.html"}}}

That's hard to see, so, to apply the techniques above, we just
add the in quad position just like we did previously.

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
  matrix: mat4x4f,
+  resolution: vec2f,
+  size: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
  var vsOut: VSOutput;
+  let pos = points[vNdx];
  let clipPos = uni.matrix * vert.position;
+  let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
-  vsOut.position = clipPos;
+  vsOut.position = clipPos + pointPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);
}
```

Unlike the previous example we won't use a different size for each vertex.
Instead we'll pass a single size for all vertices.

```js
-  const uniformValues = new Float32Array(16);
+  const uniformValues = new Float32Array(16 + 2 + 1 + 1);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kMatrixOffset = 0;
+  const kResolutionOffset = 16;
+  const kSizeOffset = 18;
  const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);
+  const resolutionValue = uniformValues.subarray(
+      kResolutionOffset, kResolutionOffset + 2);
+  const sizeValue = uniformValues.subarray(
+      kSizeOffset, kSizeOffset + 1);
```

We need to set the resolution as we did above, and we need to set a size

```js
  function render(time) {
    ...
+    // Set the size in the uniform buffer
+    sizeValue[0] = 10;

    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // position
      [0, 0, 0],    // target
      [0, 1, 0],    // up
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

+    // Update the resolution in the uniform buffer
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);

    // Copy the uniform values to the GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

And, like we did before, we need to switch from drawing points to drawing
instanced quads

```js
  const pipeline = device.createRenderPipeline({
    label: '3d points',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes each
+          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });

  ...

  function render(time) {

    ...

-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);

    ...
```

This gives us points in 3D. They even scale based on their distance from the camera.

{{{example url="../webgpu-points-3d.html"}}}

## <a id="a-fixed-size-3d-points"></a> Fixed size 3d points

What if we want the points to stay a fixed size?

Recall from [the article on perspective projection](webgpu-perspective-projection.html) that the GPU divides the position
we return from the vertex shader by W. This divide gives us perspective by making
things further way appear smaller. So, for points we don't want to change size we
just need to multiply them by that W so after they're divided they'll be the
value we really wanted.

```wgsl
    var vsOut: VSOutput;
    let pos = points[vNdx];
    let clipPos = uni.matrix * vert.position;
-    let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
+    let pointPos = vec4f(pos * uni.size / uni.resolution * clipPos.w, 0, 0);
    vsOut.position = clipPos + pointPos;
    return vsOut;
```

And now they stay the same size

{{{example url="../webgpu-points-3d-fixed-size.html"}}}

<div class="webgpu_bottombar">
<h3>Why doesn't WebGPU support points larger than 1x1 pixel?</h3>
<p>WebGPU is based on native GPU APIs like Vulkan, Metal, DirectX, and even OpenGL.
Unfortunately, those APIs do not agree with each other on what it means to support
rendering points. Some APIs have device dependent limits on the size of points.
Some APIs don't render a point if its center is outside of clip space while others
do. In some APIs, this second issue is up to the driver. All of that means WebGPU decided to do the portable thing and only support 1x1
sized pixels.</p>
<p>The good thing is it's easy to support larger points yourself as shown above. The solutions
above are portable across devices, they have no limit on the size of a point and
they consistently clip points across devices. They draw the portion of any point
that is inside clip space regardless of if the point's center is outside of clip space.</p>
<p>Even better, these solutions are more flexible. For example rotating points
is not a thing supported by native APIs. By implementing our own solutions
we can easily add more features making things even more flexible.</p>
</div>
