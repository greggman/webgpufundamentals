Title: 着色器杂项输入
Description: 向着色器传递数据的替代方法。
TOC: 着色器杂项输入

本文是系列文章之一，介绍了向着色器传递数据的各种方法。每一篇都建立在前一篇的基础之上，因此按顺序阅读将有助于您更好地理解。

{{{toc-steps list="passing-data.hanson"}}}

在前面的文章中，我们介绍了向着色器传入和传出数据的标准方法。阶段间变量、Uniform 缓冲区、存储缓冲区、顶点缓冲区以及纹理。

还有一些不太常见的方法，但它们在某些场景下仍然非常有用。

一种方法是，在调用 `draw` 或 `drawIndexed` 命令时，我们可以传入一个 `firstInstance` 值。

```js
pass.draw(numVertices,
          numInstances = 1,
          firstVertex = 0,
          firstInstance = 0); // <== 这里
pass.drawIndexed(indexCount,
                 instanceCount = 1,
                 firstIndex = 0,
                 baseVertex = 0,
                 firstInstance = 0); // <== 这里
```

这个值会作为 `@builtin(instance_index)` 出现在着色器中。这意味着如果我们没有像前面的文章那样真正使用它来进行实例化，就可以用它来选择数据。

例如，我们可以修改[第一篇文章](webgpu-fundamentals.html)中的简单三角形示例。

```wgsl
+struct VertexOut {
+  @builtin(position) pos: vec4f,
+  @location(0) @interpolate(flat, either) colorNdx: u32,
+};

@vertex fn vs(
*  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // 顶部中心
    vec2f(-0.5, -0.5),  // 左下
    vec2f( 0.5, -0.5)   // 右下
  );
+  let offsets = array(
+    vec2f( 0.0,  0.5),  // 顶部中间
+    vec2f(-0.5, -0.5),  // 左下
+    vec2f( 0.5, -0.5),  // 右下
+  );

-  return vec4f(pos[vertexIndex], 0.0, 1.0);
+  return VertexOut(
+    vec4f(pos[vertexIndex] + offsets[instanceIndex], 0.0, 1.0),
+    instanceIndex,
+  );
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
-}
+@fragment fn fs(in: VertexOut) -> @location(0) vec4f {
+  let colors = array(
+    vec4f(1, 1, 0, 1),  // 黄色
+    vec4f(0, 1, 1, 1),  // 青色
+    vec4f(1, 0, 1, 1),  // 洋红色
+  );
+  return colors[in.colorNdx];
+}
```

上面的代码使用 `instanceIndex` 来选择一个偏移量。然后将其作为阶段间变量 `@interpolate(flat, either)` 传递给片段着色器。`@interpolate(flat, either)` 中的 `flat` 表示"不进行插值"。`either` 表示取每个三角形的第一个或最后一个顶点的值。由于我们为所有顶点传递相同的值，取第一个还是最后一个并不重要，但选择 `either` 在兼容性模式下可以正常工作，所以它是更好的选择。

最后，我们只需要更新 `draw` 调用，绘制 3 次。

```js
    function render() {
      // 从画布上下文获取当前纹理，并
      // 将其设置为要渲染的纹理。
      renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

      const encoder = device.createCommandEncoder({ label: 'our encoder' });
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // 调用顶点着色器 3 次
+      pass.draw(3, 1, 0, 1); // 传入 1 作为 instance_index
+      pass.draw(3, 1, 0, 2); // 传入 2 作为 instance_index
      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

运行后得到如下结果。

{{{example url="../webgpu-misc-instance-index.html"}}}

我们在着色器中硬编码了一些数组，但同样可以用它来从存储缓冲区数组中选择数据。

```wgsl
struct VertexOut {
  @builtin(position) pos: vec4f,
  @location(0) @interpolate(flat, either) instanceIndex: u32,
};

struct PerInstanceInfo {
  matrix: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<storage, read> perInst: array<PerInstanceInfo>;

@vertex fn vs(
  @location(0) position: vec4f,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let info = perInst[instanceIndex];

  return VertexOut(
    info.matrix * position,
    instanceIndex,
  );
}

@fragment fn fs(in: VertexOut) -> @location(0) vec4f {
  let info = perInst[in.instanceIndex];
  return info.color;
}
```

何时使用这种方法取决于你自己。你也可以使用[即时变量](webgpu-immediates.html)来在不同的 draw 之间传递少量数据。使用 `firstInstance` 的优势是减少了对 WebGPU 的调用次数，而且我们不需要为了传递一个数字而专门创建一个 `ArrayBufferView`。

在[让我们的 mipmap 生成代码兼容兼容性模式](webgpu-compatibility-mode.html#a-generating-mipmaps)时，我们将使用这种方法，因为它可以轻松地从二维数组或立方体贴图的切片中进行选择，而无需设置 uniform 缓冲区。

注意，你也可以用同样的方式控制 `vertex_index`。它也是 `draw` 调用中的一个参数。但是，用它来传递数据的情况比较少见，因为你通常需要用它来选择顶点。
