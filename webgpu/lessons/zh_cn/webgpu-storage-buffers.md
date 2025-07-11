Title: WebGPU 存储缓冲区(Storage Buffer)
Description: 向着色器中传递大量数据
TOC: 存储缓冲区（Storage Buffer）

这篇文章是关于存储缓冲区(Storage buffer)的，是[上一篇文章](webgpu-uniforms.html)的延续。

存储缓冲区在很多方面与 uniform 缓冲区相似。如果我们只需将 JavaScript 中的 `UNIFORM` 改为 `STORAGE`，将 WGSL 中的 `var<uniform>` 改为 `var<storage,read>`，上一篇文章中的示例就可以正常工作了。

事实上，在不对变量重新命名的情况下，它们的区别如下。

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

在 WSGL 中修改如下：

```wsgl
      @group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
      @group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

没有任何其他改动，它就能正常工作，就和之前一样

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## uniform 缓冲区与存储缓冲区的区别

uniform 缓冲区和存储缓冲区的主要区别在于：

1. uniform 缓冲区在典型的使用情况下速度更快
   这确实取决于用例。一个典型的应用程序需要绘制大量不同的内容。比方说，这是一款 3D 游戏。应用程序可能会绘制汽车、建筑物、岩石、灌木丛、人物等......每一种都需要传递方向和材质属性，与我们上面的示例所传递的类似。在这种情况下，建议使用统一缓冲区。

2. 存储缓冲区的大小可以比 uniform 缓冲区大得多。

    - uniform 缓冲区的最小最大值为 64KiB(65536 bytes)
    - 存储缓冲区的最小最大值为 128MiB(134217728 bytes)

    所谓的最小最大值，是指某类缓冲区的最大容量。对于 uniform 缓冲区，最大大小至少为 64KiB。对于存储缓冲区，则至少为 128 MiB。我们将在[另一篇文章](webgpu-limits-and-features.html)中介绍这类限制。

3. 存储缓冲区可读写，uniform 缓冲区只能读

    在[第一篇文章](webgpu-fundamentals.html)的计算着色器示例中，我们看到了向存储缓冲区写入数据的示例。

## <a id="a-instancing"></a>使用存储缓冲区进行多实例绘制

鉴于上述前两点，让我们以最后一个示例为例，将其改为在一次绘制调用中绘制所有 100 个三角形。这是一个可能适合存储缓冲区的例子。我之所以说 "可能"，是因为 WebGPU 与其他编程语言类似。有许多方法可以实现相同的目标：`array.forEach` vs `for (const elem of array)` vs `for (let i = 0; i < array.length; ++i)`。每种方法都有其用途。WebGPU 也是如此。我们要做的每一件事都有多种方法可以实现。在绘制三角形时，WebGPU 只需从顶点着色器返回`builtin(position)`，并从片段着色器返回`location(0)`的颜色/值即可。[^colorAttachments]

[^colorAttachments]: 我们可以有多个颜色附件，然后我们需要为 `location(1)`、`location(2)` 等返回更多颜色/值... ︎

我们要做的第一件事就是将结构体声明更改为运行时确定大小的数组。

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

然后，我们将更改着色器以使用这些值

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

我们为顶点着色器添加了一个名为 `instanceIndex` 的新参数，并赋予其 `@builtin(instance_index)` 属性，这意味着每绘制一个 "实例"，它就会从 WebGPU 获取一个值。当我们调用`draw`时，我们可以传递第二个参数 "实例数"，每绘制一个实例，正在被处理的实例数就会传递给我们的函数。

使用`instanceIndex`，我们就能够从数组中获取到特定的结构体元素。

我们还需要从正确的数组元素中获取颜色，并将其用于片段着色器。片段着色器无法访问 `@builtin(instance_index)`，因为这样做毫无意义。但更常见的做法是在顶点着色器中查找颜色，将其作为[inter-stage 变量](webgpu-inter-stage-variables.html)传递颜色到片段着色器。

为此，我们将使用另一个结构体，就像在关于[inter-stage 变量](webgpu-inter-stage-variables.html)的文章中所做的那样。

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

现在我们已经修改了 WGSL 着色器，让我们更新 JavaScript 代码。

设置如下

```js
const kNumObjects = 100;
const objectInfos = [];

// create 2 storage buffers
const staticUnitSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // offset is 2 32bit floats (4bytes each)
    2 * 4; // padding
const changingUnitSize = 2 * 4; // scale is 2 32bit floats (4bytes each)
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
        staticStorageValues.set(
            [rand(), rand(), rand(), 1],
            staticOffset + kColorOffset
        ); // set the color
        staticStorageValues.set(
            [rand(-0.9, 0.9), rand(-0.9, 0.9)],
            staticOffset + kOffsetOffset
        ); // set the offset

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
        { binding: 0, resource: staticStorageBuffer },
        { binding: 1, resource: changingStorageBuffer },
    ],
});
```

上面我们创建了 2 个存储缓冲区。一个用于保存 `OurStruct` 数组数据，另一个用于 `OtherStruct` 数组。

然后，我们用偏移和颜色填充 `OurStruct` 数组的值，然后将数据上传到 `staticStorageBuffer`。

我们只需创建一个绑定组来引用两个缓冲区。

新的渲染代码如下

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

上面的代码将绘制 `kNumObjects` 个实例。对于每个实例，WebGPU 将调用顶点着色器 3 次，`vertex_index` 设置为 0、1、2，`instance_index` 设置为 0、kNumObjects - 1。

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

我们只需一次绘制调用，就能绘制出所有 100 个三角形，每个三角形都有不同的比例、颜色和偏移量。在需要绘制同一对象的大量实例时，这也是一种方法。

## 为顶点数据使用存储缓冲区

在此之前，我们一直在着色器中直接使用硬编码的三角形。存储缓冲区的一个用例是存储顶点数据。就像我们在上面的示例中用 `instance_index` 对当前存储缓冲区进行索引一样，我们也可以用 `vertex_index` 对另一个存储缓冲区进行索引，以获取顶点数据。

让我们开始吧！

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

现在，我们需要为顶点数据再设置一个存储缓冲区。首先，让我们创建一个函数来生成顶点数据。让我们制作一个圆。

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

    // 2 vertices per subdivision
    //
    // 0--1 4
    // | / /|
    // |/ / |
    // 2 3--5
    for (let i = 0; i < numSubdivisions; ++i) {
        const angle1 =
            startAngle + ((i + 0) * (endAngle - startAngle)) / numSubdivisions;
        const angle2 =
            startAngle + ((i + 1) * (endAngle - startAngle)) / numSubdivisions;

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

上面的代码是这样用三角形画圆的

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

因此，我们可以用它来将圆的顶点填充到存储缓冲区中

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

然后，我们需要将其添加到绑定组中。

```js
const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: staticStorageBuffer },
        { binding: 1, resource: changingStorageBuffer },
        +{ binding: 2, resource: vertexStorageBuffer },
    ],
});
```

最后在渲染时，我们需要要求渲染圆中的所有顶点。

```js
-pass.draw(3, kNumObjects); // call our vertex shader 3 times for several instances
+pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

上面我们使用了

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

我们完全可以不使用结构体，直接使用 `vec2f`。

```wgsl
@group(0) @binding(2) var<storage, read> pos: vec2f;
```

但是，如果把它变成一个结构体，以后添加每个顶点的数据会不会更容易呢？

通过存储缓冲区传递顶点的方法越来越受欢迎。不过我听说在一些较老的设备上，这种方式比传统方式要慢，我们将在下一篇关于[顶点缓冲区](webgpu-vertex-buffers.html)的文章中介绍这种方式。

<!-- keep this at the bottom of the article -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
