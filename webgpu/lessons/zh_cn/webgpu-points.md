Title: WebGPU 点
Description: 在 WebGPU 中绘制点
TOC: 点

WebGPU 支持绘制点。我们通过在渲染管线中将图元拓扑设置为 `'point-list'` 来实现这一点。

让我们从一个简单的随机点示例开始，借鉴[顶点缓冲区文章](webgpu-vertex-buffers.html)中的思路。

首先，一个简单的顶点着色器和片段着色器。为简单起见，我们只使用裁剪空间坐标作为位置，并在片段着色器中硬编码颜色为黄色。

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
  return vec4f(1, 1, 0, 1); // 黄色
}
```

然后，在创建管线时，我们将拓扑设置为 `'point-list'`。

```js
  const pipeline = device.createRenderPipeline({
    label: '1 像素大小的点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4, // 2 个 float，每个 4 字节
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

让我们用一些随机裁剪空间点填充顶点缓冲区。

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
    label: '顶点缓冲区顶点',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

然后绘制。

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(kNumPoints);
    pass.end();
```

这样我们就得到了 100 个随机黄色点。

{{{example url="../webgpu-points.html"}}}

不幸的是，它们都只有 1 像素大小。1 像素大小的点是 WebGPU 所支持的唯一大小。如果我们想要更大的点，需要自己实现。幸运的是，这很容易做到。我们只需要创建一个四边形并使用[实例化](webgpu-vertex-buffers.html#a-instancing)。

让我们在顶点着色器中添加一个四边形和一个尺寸属性。我们还要添加一个 uniform 来传入我们要绘制到的纹理大小。

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
  return vec4f(1, 1, 0, 1); // 黄色
}
```

在 JavaScript 中，我们需要为每个点添加一个尺寸属性，通过设置 `stepMode: 'instance'` 来让属性每个实例前进一次，我们可以移除拓扑设置，因为我们需要的是默认的 `'triangle-list'`。

```js
  const pipeline = device.createRenderPipeline({
    label: '可变大小的点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 2 * 4, // 2 个 float，每个 4 字节
+          arrayStride: (2 + 1) * 4, // 3 个 float，每个 4 字节
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

让我们为顶点数据中的每个点添加一个随机大小。

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

我们需要创建一个 uniform 缓冲区，以便传入分辨率。

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

然后我们需要创建一个绑定组来绑定 uniform 缓冲区。

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

然后在渲染时，我们可以使用当前分辨率更新 uniform 缓冲区。

```js
    // 从画布上下文获取当前纹理，并
    // 将其设置为要渲染的纹理。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    // 在 uniform 缓冲区中更新分辨率
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

然后设置绑定组，并为每个点渲染一个实例。

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

现在我们有了可变大小的点。

{{{example url="../webgpu-points-w-size.html"}}}

如果我们想为点添加纹理呢？我们只需要将纹理坐标从顶点着色器传递到片段着色器。

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

当然，在片段着色器中使用纹理。

```wgsl
+@group(0) @binding(1) var s: sampler;
+@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return vec4f(1, 1, 0, 1); // 黄色
+  return textureSample(t, s, vsOut.texcoord);
}
```

我们将使用 Canvas 创建一个简单的纹理，就像在[导入纹理文章](webgpu-importing-textures.html)中介绍的那样。

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

我们需要一个采样器，并且需要将它们添加到绑定组中。

```js
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
+      { binding: 1, resource: sampler },
+      { binding: 2, resource: texture },
    ],
  });
```

我们还要开启混合，以便获得[透明度](webgpu-transparency.html)。

```js
  const pipeline = device.createRenderPipeline({
    label: '带纹理的可变大小点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (2 + 1) * 4, // 3 个 float，每个 4 字节
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

现在我们有了带纹理的点。

{{{example url="../webgpu-points-w-texture.html"}}}

我们可以继续扩展，比如每个点一个旋转？使用我们在[矩阵数学文章](webgpu-matrix-math.html)中介绍的数学。

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

我们需要在管线中添加旋转属性。

```js
  const pipeline = device.createRenderPipeline({
    label: '带纹理的可变大小可旋转点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (2 + 1) * 4, // 3 个 float，每个 4 字节
+          arrayStride: (2 + 1 + 1) * 4, // 4 个 float，每个 4 字节
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

我们需要在顶点数据中添加旋转。

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

我们还要把纹理从 🥑 换成 👉。

```js
-  ctx.fillText('🥑', 16, 16);
+  ctx.fillText('👉', 16, 16);
```

{{{example url="../webgpu-points-w-rotation.html"}}}

# 3D 中的点呢？

简单答案是，在完成[顶点的 3D 数学运算](webgpu-perspective-projection.html)之后，只需将四边形值加入即可。

例如，下面是一些为 [fibonacci 球体](https://www.google.com/search?q=fibonacci+sphere) 创建 3D 位置的代码。

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

我们可以通过像[3D 数学系列](webgpu-cameras.js)中那样对顶点应用 3D 数学来绘制这些顶点。

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
  return vec4f(1, 0.5, 0.2, 1);  // 橙色
}
```

这是我们的管线和顶点缓冲区。

```js
  const pipeline = device.createRenderPipeline({
    label: '固定大小的 3D 点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 个 float，每个 4 字节
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
    label: '顶点缓冲区顶点',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

还有，一个 uniform 缓冲区和用于矩阵的 uniform 值，以及一个绑定组来将 uniform 缓冲区传递给着色器。

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
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

以及使用投影矩阵、相机和其他 3D 数学进行绘制的代码。

```js
  function render(time) {
    time *= 0.001;

    // 从画布上下文获取当前纹理，并
    // 将其设置为要渲染的纹理。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

    // 在 uniform 缓冲区中设置矩阵
    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // 位置
      [0, 0, 0],    // 目标
      [0, 1, 0],    // 向上
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

    // 将 uniform 值复制到 GPU
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

我们还切换到了 `requestAnimationFrame` 循环。

{{{example url="../webgpu-points-3d-1px.html"}}}

这很难看到，所以，要应用上面的技术，我们只需要像之前那样添加四边形位置。

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

与之前的示例不同，我们不会为每个顶点使用不同的大小。相反，我们将为所有顶点传递一个单一的大小。

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

我们需要像上面那样设置分辨率，并且需要设置一个大小。

```js
  function render(time) {
    ...
+    // 在 uniform 缓冲区中设置大小
+    sizeValue[0] = 10;

    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // 位置
      [0, 0, 0],    // 目标
      [0, 1, 0],    // 向上
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

+    // 在 uniform 缓冲区中更新分辨率
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);

    // 将 uniform 值复制到 GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

而且，和之前一样，我们需要从绘制点切换到绘制实例化的四边形。

```js
  const pipeline = device.createRenderPipeline({
    label: '3D 点',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 个 float，每个 4 字节
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

这给了我们 3D 中的点。它们甚至会根据与相机的距离进行缩放。

{{{example url="../webgpu-points-3d.html"}}}

## <a id="a-fixed-size-3d-points"></a> 固定大小的 3D 点

如果我们想让点保持固定大小呢？

回顾[透视投影文章](webgpu-perspective-projection.html)，GPU 会将我们从顶点着色器返回的位置除以 W。这个除法通过使远处的东西看起来更小来产生透视效果。因此，对于我们不想改变大小的点，我们只需要将它们乘以那个 W，这样当它们被除以后，它们就是我们真正想要的值。

```wgsl
    var vsOut: VSOutput;
    let pos = points[vNdx];
    let clipPos = uni.matrix * vert.position;
-    let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
+    let pointPos = vec4f(pos * uni.size / uni.resolution * clipPos.w, 0, 0);
    vsOut.position = clipPos + pointPos;
    return vsOut;
```

现在它们保持相同的大小。

{{{example url="../webgpu-points-3d-fixed-size.html"}}}

<div class="webgpu_bottombar">
<h3>为什么 WebGPU 不支持大于 1x1 像素的点？</h3>
<p>WebGPU 基于原生 GPU API，如 Vulkan、Metal、DirectX 甚至 OpenGL。不幸的是，这些 API 在支持绘制点的含义上并不一致。一些 API 对点的大小有设备相关的限制。一些 API 如果点的中心在裁剪空间之外则不绘制点，而另一些则绘制。在一些 API 中，第二个问题取决于驱动程序。所有这些意味着 WebGPU 决定做可移植的事情，只支持 1x1 大小的像素。</p>
<p>好消息是，正如上面所示，自己支持更大的点很容易。上述解决方案在设备间是可移植的，它们对点的大小没有限制，并且在设备间一致地对点进行裁剪。它们绘制任何在裁剪空间内的点部分，无论点的中心是否在裁剪空间之外。</p>
<p>更好的是，这些解决方案更加灵活。例如，旋转点在原生 API 中不是一项受支持的功能。通过实现我们自己的解决方案，我们可以轻松添加更多功能，使事情变得更加灵活。</p>
</div>
