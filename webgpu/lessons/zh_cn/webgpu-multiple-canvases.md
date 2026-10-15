Title: WebGPU 多画布
Description: 多画布渲染
TOC: 多画布

在 WebGPU 中绘制到多个画布非常容易。在[基础概念文章](webgpu-fundamentals.html)中，我们查找画布，然后调用 `getContext` 并配置上下文。

```js
  // 从画布获取 WebGPU 上下文并配置它
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

要绘制到画布，我们使用该上下文获取画布的纹理，并将该纹理设置为渲染通道的第一个 `colorAttachment`。

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
*        // view: <- 在渲染时填充
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  function render() {
    // 从画布上下文获取当前纹理，并
    // 将其设置为要渲染的纹理。
*    renderPassDescriptor.colorAttachments[0].view =
*        context.getCurrentTexture();

    // 创建一个命令编码器来开始编码命令
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // 创建一个渲染通道编码器来编码渲染相关命令
    const pass = encoder.beginRenderPass(renderPassDescriptor);
```

要绘制到不同的画布，我们只需对该画布遵循相同的步骤。

1. 查找画布（或创建一个）
2. 获取"webgpu"上下文
3. 配置上下文
4. 当我们想渲染到该画布时，调用 `context.getCurrentTexture`，并将该纹理作为渲染通道中的 `colorAttachment` 使用

让我们以我们的第一个示例为基础，渲染到 3 个画布。

首先添加 2 个额外的画布。

```html
  <body>
    <canvas></canvas>
+    <canvas></canvas>
+    <canvas></canvas>
  </body>
```

接下来获取上下文并配置所有画布。

```js
  // 为每个画布获取 WebGPU 上下文并配置它
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const infos = [];
  for (const canvas of document.querySelectorAll('canvas')) {
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });
    infos.push({ context });
  }
```

最后，渲染到所有画布。

```js
  function render() {
*    // 创建一个命令编码器来开始编码命令
*    const encoder = device.createCommandEncoder({ label: 'our encoder' });

+    for (const {context} of infos) {
      // 从画布上下文获取当前纹理，并
      // 将其设置为要渲染的纹理。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();

      // 创建一个渲染通道编码器来编码渲染相关命令
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // 调用顶点着色器 3 次。
      pass.end();
+    }

*    const commandBuffer = encoder.finish();
*    device.queue.submit([commandBuffer]);
  }

  render();
```

我们所做的更改是：(1) 在创建命令编码器的地方，以便它可以共享来渲染所有 3 个画布。(2) 循环遍历上下文。

然后我们渲染到了 3 个画布。

{{{example url="../webgpu-multiple-canvases.html" }}}

注意：严格来说，不必要创建一个命令编码器，但这样稍微更高效一些。

那么还有什么？

## 优化大量画布

假设我们想展示旋转的产品。为简单起见，我们继续使用硬编码的三角形，但让它通过传入一个矩阵来旋转[就像我们在矩阵数学文章中介绍的那样](webgpu-matrix-math.html)。我们还要传入一个颜色，以便让每个看起来略有不同。

```wgsl
+  struct Uniforms {
+    matrix: mat4x4f,
+    color: vec4f,
+  };
+
+  @group(0) @binding(0) var<uniform> uni: Uniforms;

  @vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
  ) -> @builtin(position) vec4f {
    let pos = array(
      vec2f( 0.0,  0.5),  // 顶部中心
      vec2f(-0.5, -0.5),  // 左下
      vec2f( 0.5, -0.5)   // 右下
    );

-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+    return uni.matrix * vec4f(pos[vertexIndex], 0.0, 1.0);
  }

  @fragment fn fs() -> @location(0) vec4f {
-    return vec4f(1, 0, 0, 1);
+    return uni.color;
  }
```


我们还需要为每个画布准备一个 [uniform 缓冲区](webgpu-uniforms.html)以及绑定组和相关的东西。

让我们创建 200 个画布并为 WebGPU 配置它们。

```js
  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // 创建这个
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');

    const container = document.createElement('div');
    container.className = `product size${i % 4}`;

    const description = document.createElement('div');
    description.textContent = `product#: ${i + 1}`;

    container.appendChild(canvas);
    container.appendChild(description);
    document.body.appendChild(container);

    // 获取 WebGPU 上下文并配置它。
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });

    infos.push({
      context,
    });
  }
```

我们还需要一些 CSS 来配合。

```js
  .product {
    display: inline-block;
    padding: 1em;
    background: #888;
    margin: 1em;
  }
  .size0>canvas {
    width: 200px;
    height: 200px;
  }
  .size1>canvas {
    width: 250px;
    height: 200px;
  }
  .size2>canvas {
    width: 300px;
    height: 200px;
  }
  .size3>canvas {
    width: 100px;
    height: 200px;
  }
```

4 种尺寸只是为了确保我们正确地处理事情。如果我们都设置为相同的大小，可能会隐藏一个错误。

我们需要为每个画布准备一个 uniform 缓冲区和绑定组。我们不会稍后更改颜色，所以现在选择一个。现在也选一个随机的 clearValue 吧（为什么不呢？ 🤷‍♂️）

```js
+  function randomColor() {
+    return [Math.random(), Math.random(), Math.random(), 1];
+  }

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    ...

+    // 创建一个 uniform 缓冲区和类型数组视图
+    // 用于我们的 uniform。
+    const uniformValues = new Float32Array(16 + 4);
+    const uniformBuffer = device.createBuffer({
+      size: uniformValues.byteLength,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+    const kMatrixOffset = 0;
+    const kColorOffset = 16;
+    const matrixValue = uniformValues.subarray(
+        kMatrixOffset, kMatrixOffset + 16);
+    const colorValue = uniformValues.subarray(
+        kColorOffset, kColorOffset + 4);
+    colorValue.set(randomColor());
+
+    // 为这个 uniform 创建一个绑定组
+    const bindGroup = device.createBindGroup({
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer },
+      ],
+    });

    infos.push({
      context,
+      clearValue: randomColor(),
+      matrixValue,
+      uniformValues,
+      uniformBuffer,
+      bindGroup,
    });
```

我们还需要添加一个 `ResizeObserver` 来[调整每个画布的大小](webgpu-fundamentals.html#a-resizing)。

```js
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
  });

  ...

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // 创建这个
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);

    ...
```

在渲染时，我们将使用 requestAnimationFrame (rAF) 循环来制作动画。

```js
+  function render(time) {
+    time *= 0.001; // 转换为秒

    ...

+    requestAnimationFrame(render);
  }

-  render();
+  requestAnimationFrame(render);
```

而且，我们需要为每个画布更新矩阵，将新值上传到 uniform 缓冲区，并设置绑定组。

```js
  function render(time) {
    time *= 0.001; // 转换为秒

    // 创建一个命令编码器来开始编码命令
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    for (const {
      context,
      uniformBuffer,
      uniformValues,
      matrixValue,
      bindGroup,
      clearValue,
    } of infos) {
      // 从画布上下文获取当前纹理，并
      // 将其设置为要渲染的纹理。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
+      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;
+
+      const { canvas } = context;
+      const aspect = canvas.clientWidth / canvas.clientHeight;
+      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
+      mat4.rotateZ(matrixValue, time * 0.1, matrixValue);
+
+      // 上传我们的 uniform 值。
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // 创建一个渲染通道编码器来编码渲染相关命令
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
+      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // 调用顶点着色器 3 次。
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
```

让我们再添加一些东西。我们会在下面解释为什么。

首先添加一个按钮来停止和启动整个动画。

```js
  <body>
+    <button type="button" id="stop">停止/开始</button>
  </body>
```

以及一些 CSS。

```css
  #stop {
    position: fixed;
    right: 0;
    top: 0;
    margin: 0.5em;
    z-index: 1;
  }
```

然后修改代码来启动和停止动画。

```js
+  let requestId;
  function render(time) {
    ...

-    requestAnimationFrame(render);
+    requestId = requestAnimationFrame(render);
  }

-  requestAnimationFrame(render);

+  function toggleAnimation() {
+    if (requestId) {
+      cancelAnimationFrame(requestId);
+      requestId = undefined;
+    } else {
+      requestId = requestAnimationFrame(render);
+    }
+  }
+
+  toggleAnimation();
+  document.querySelector('#stop')
+      .addEventListener('click', toggleAnimation);
```

这可以工作，但在我们暂停然后稍后取消暂停后，所有物体会跳跃。这是因为，尽管我们停止了渲染，`time` 值是自页面加载以来的时间，而该时间用于计算我们的旋转。

所以，让我们通过保留我们自己的时间来修复这个问题，只有在动画运行时时间才会推进。

```js
+  let time = 0;
+  let then = 0;
  let requestId;
-  function render(time) {
-    time *= 0.001
+  function render(now) {
+    now *= 0.001; // 转换为秒；
+    const deltaTime = now - then;
+    time += deltaTime;
+    then = now;

  ...

    requestId = requestAnimationFrame(render);
  }

  function toggleAnimation() {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = undefined;
    } else {
      requestId = requestAnimationFrame(render);
+      then = performance.now() * 0.001;
    }
  }
```

现在我们有了 200 个画布。

{{{example url="../webgpu-multiple-canvases-x200.html"}}}

你可能会注意到这个示例非常"重"！问题是，即使只有少数画布可见，我们仍在渲染所有 200 个画布。如果我们绘制的是详细的产品模型而不是每个画布只有一个三角形，情况会糟糕得多。这就是为什么我们添加了停止/开始按钮。如果这个示例运行起来太重，你可能想在继续之前现在就停止它。

> 注意：这个网站会尽量只在示例本身可见时才渲染和播放动画。

我们可以解决这个问题的一种方法是使用 `IntersectionObserver`。

## <a id="a-intersection-observer"></a> 使用 `IntersectionObserver`

`IntersectionObserver` 就是为这种情况设计的。`IntersectionObserver` 做它所说的——观察交叉。默认情况下，它观察元素与浏览器窗口的交叉。利用这一点，我们可以跟踪哪些画布实际上是可见的，只渲染那些画布。

这是代码。

首先我们创建一个 `IntersectionObserver`。与 `ResizeObserver` 一样，它接受一个函数，当被观察的元素开始或停止与窗口交叉时会调用该函数。

```js
  const visibleCanvasSet = new Set();
  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visibleCanvasSet.add(target);
      } else {
        visibleCanvasSet.delete(target);
      }
    }
  });
```

你可以看到，它用一组条目调用我们的回调。每个条目说明它是否正在交叉。我们用它来维护一个哪些画布可见的 `Set`。

我们需要告诉它观察每个画布。我们还需要一种从画布获取该画布信息的方法。在这种情况下，那是上下文、uniform 缓冲区、绑定组等。我们将使用 `Map` 从画布获取该信息。

```js
-  const infos = [];
+  const canvasToInfoMap = new Map();
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // 创建这个
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);
+    intersectionObserver.observe(canvas);

    ...

-    infos.push({
+    canvasToInfoMap.set(canvas, {
      context,
      clearValue: randomColor(),
      matrixValue,
      uniformValues,
      uniformBuffer,
      bindGroup,
      rotation: Math.random() * Math.PI * 2,
    });
  }
```

在我们的渲染函数中，我们只需渲染可见的画布。

```js
  function render(now) {
    ...

    // 创建一个命令编码器来开始编码命令
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

-    for (const {
+    visibleCanvasSet.forEach(canvas => {
*      const {
*       context,
*       uniformBuffer,
*       uniformValues,
*       matrixValue,
*       bindGroup,
*       clearValue,
*       rotation,
-    } of infos) {
+      } = canvasToInfoMap.get(canvas);

      // 从画布上下文获取当前纹理，并
      // 将其设置为要渲染的纹理。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;

-      const { canvas } = context;
      const aspect = canvas.clientWidth / canvas.clientHeight;
      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
      mat4.rotateZ(matrixValue, time * 0.1 + rotation, matrixValue);

      // 上传我们的 uniform 值。
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // 创建一个渲染通道编码器来编码渲染相关命令
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // 调用顶点着色器 3 次。
      pass.end();
-    }
+    };

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestId = requestAnimationFrame(render);
  }
```

这样一来，我们就只绘制实际可见的画布，这应该会轻量得多。

{{{example url="../webgpu-multiple-canvases-x200-optimized.html"}}}

`IntersectionObserver` 可能不会覆盖所有情况。如果你正在每个画布中绘制非常重的东西，那么你可能只想让用户选择的画布动起来。无论如何，希望你的工具箱里又多了一个工具。
