Title: WebGPU Immediates
Description: 即时变量
TOC: 即时变量

本文是系列文章之一，介绍了向着色器传递数据的各种方法。每一篇都建立在前一篇的基础之上，因此按顺序阅读将有助于您更好地理解。

{{{toc-steps list="passing-data.hanson"}}}

<div class="warn">
Immediates（即时变量）是 WebGPU 的一项新功能（2026年）。它被设计为一个**核心**特性，
意味着无论使用什么设备，它都应该可用。
希望到 2026 年底，所有浏览器都能支持它。
你可以通过检查是否存在设置即时变量的函数来判断浏览器是否支持：

```js
const canUseImmediates = !!GPURenderPassEncoder?.prototype.setImmediates;
```

理想情况下，到 2027 年，你将不再需要这个检查。
</div>

Immediates（即时变量）是一种便捷的方式，可以轻松地向着色器传递少量数据。
在[uniforms 文章](webgpu-uniforms.html)和[存储缓冲区文章](webgpu-storage-buffers.html)中，
我们介绍了如何通过缓冲区向着色器传递数据。我们在着色器中定义了 `var<uniform>` 或 `var<storage, ...>` 绑定，
并将缓冲区绑定到这些绑定点上。而使用即时变量时，我们使用 `var<immediate>`，无需绑定。

`var<immediate>` 与 `var<uniform>` 和 `var<storage>` 的区别：

* 每个着色器只能有一个 `var<immediate>`

  使用 `var<uniform>` 和 `var<storage, ...>` 可以声明多个绑定。
  使用 `var<immediate>` 只能有一个。

* 即时变量总共只能使用 64 字节 [^maxImmediateSize]

[^maxImmediateSize]: 限制 `maxImmediateSize` 可能允许你[申请](webgpu-limits-and-features.html)超过 64 字节的容量。

* 你必须初始化所有即时变量

  使用缓冲区时，缓冲区的内容会初始化为 0。而即时变量是未初始化的，
  你必须显式初始化它们。如果不这样做，会收到验证错误。

* 即时变量在以下情况下会重置为 undefined

  * 开始新的计算或渲染通道时
  * 执行渲染束时
  * 执行渲染束之后。

你可以把即时变量想象成一个迷你的 uniform 缓冲区。
它只有一个，而且很小。你通过 `passEncoder.setImmediates` 来设置它。

让我们以[基础文章底部](webgpu-fundamentals.html#a-resizing)中的简单三角形示例为例，
并更新它，使用即时变量来绘制三个不同颜色的三角形。

首先，让我们在着色器中添加偏移量和颜色

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

然后我们可以更新 JavaScript 来绘制三次，每次使用 `setImmediates` 设置即时变量，
以不同的颜色和不同的位置绘制。

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

与 `var<uniform>` 和 `var<storage, ...>` 一样，即时变量中的数据遵循相同的[内存布局规则](webgpu-memory-layout.html)。
`setImmediates` 的参数如下：

```js
passEncoder.setImmediates(
  byteOffset,  // 即时变量中的偏移量
  src,         // ArrayBufferView 或 ArrayBuffer
  srcOffset?,  // src 中元素的偏移量
  size?,       // 元素数量
);
```

在我们的例子中，每次调用 `setImmediates` 时都传入了整个 `Float32Array`，
所以不需要最后两个可选参数。`srcOffset` 默认为 0，
`size` 默认为 `src` 的大小。

{{{example url="../webgpu-immediates-triangles.html"}}}

你可能在想，限制在 64 字节内，即时变量的用途是什么呢？

最常见的用法可能是传递指向其他数据的索引。
想象一下，创建一个 per-model 存储缓冲区数组和一个 per-material
存储缓冲区数组：

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

然后你可以使用即时变量来选择 `PerModel` 和 `Material` 的值：

```wgsl
struct RenderIndices {
  modelNdx: u32,
  materialNdx: u32,
};
var<immediate> renderIndices: RenderIndices;

... 在顶点着色器中 ...

   let modelMatrix = models[renderIndices.modelNdx];

... 在片元着色器中 ...

   let material = materials[renderIndices.materialNdx];

```

现在在渲染时，你只需传入索引就可以选择 per-model 数据
和 material 数据：

```js
   pass.setImmediates(0, new Uint32Array([modelNdx, materialNdx]))
```

这是一种[优化方法](webgpu-optimization.html)，因为你不需要为每个模型和每个材质管理一个 uniform 缓冲区。

下面是一个完整的着色器示例：

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

上面的着色器使用即时变量来选择材质和 per-model 数据。它使用[矩阵数学](webgpu-matrix-math.html)来定位顶点。

它还有一个全局 uniform 缓冲区，用于所有模型共享的数据。在这种情况下，它使用共享的[视图投影矩阵](webgpu-orthographic-projection.html)。

我们创建一个使用此着色器的管线，并指定每个顶点使用 2 个浮点数的[顶点缓冲区](webgpu-vertex-buffers.html)。

```js
  const pipeline = device.createRenderPipeline({
    label: 'our select model and material via immediates pipeline',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // position
        {
          arrayStride: 2 * 4, // 2 个浮点数，每个 4 字节
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

我们为三种不同的形状创建顶点缓冲区：三角形、正方形和圆形。

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

然后我们创建一个包含 6 种材质的存储缓冲区。

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

我们定义了 200 个"模型"，其中每个模型由顶点缓冲区、材质和 per-model 数据组成。

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

上面我们使用[数学库](webgpu-matrix-math.html)来随机选择位置、缩放比例和朝向。这些数据存储在模型数据中。

然后我们需要将这些数据上传到一个存储缓冲区：

```js
  const perModelBuffer = device.createBuffer({
    label: 'our per model buffer',
    size: modelData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(perModelBuffer, 0, modelData);
```

我们还有一个所有模型都会使用的共享缓冲区。这将存储我们的[投影矩阵](webgpu-orthographic-projection.html)。

```js
  const sharedData = new Float32Array(16);
  const sharedBuffer = device.createBuffer({
    label: 'our shared data buffer',
    size: sharedData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

然后我们创建一个引用三个缓冲区的绑定组：

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

最后我们可以进行渲染了。首先我们计算一个[正交矩阵](webgpu-orthographic-projection.html)，
使渲染适应画布的宽高比，然后将其上传到共享缓冲区。

```js
  function render() {
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

+    const aspect = context.canvas.clientWidth / context.canvas.clientHeight;
+    mat4.ortho(-aspect, aspect, -1, 1, -1, 1, sharedData);
+    device.queue.writeBuffer(sharedBuffer, 0, sharedData);
```

然后我们可以渲染所有模型：

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

这样，我们就使用即时变量绘制了多个模型并选择了材质和 per-model 数据。

{{{example url="../webgpu-immediates-models.html"}}}

希望这能让你了解如何使用即时变量。由于它们只有 64 字节的限制，
通常需要发挥创意才能充分利用它们。
