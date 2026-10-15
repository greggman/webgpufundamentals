Title: WebGPU 多重采样
Description: 多重采样 / MSAA
TOC: 多重采样 / MSAA

本文是着色器数据传递各种方法系列文章中的一篇。
每一篇都构建于前面的课程基础之上，因此按顺序阅读将有助于您更好地理解。

{{{toc-steps list="passing-data.hanson"}}}

MSAA 是多重采样抗锯齿（Multi-Sampling Anti-aliasing）的缩写。抗锯齿是指试图防止走样（aliasing）问题，而走样就是当我们尝试将矢量图形绘制为离散像素时产生的锯齿状问题。

在[基础文章](webgpu-fundamentals.html)中，我们介绍了 WebGPU 是如何绘图的。它取我们在顶点着色器中为 `@builtin(position)` 返回的裁剪空间顶点，对于每 3 个顶点计算出一个三角形，然后对三角形内每个像素的中心调用片段着色器，询问该像素应该是什么颜色。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels"></div>
    <div>拖动顶点</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-result"></div>
    <div>结果</div>
  </div>
</div>

上面的三角形非常锯齿状。我们可以提高分辨率，但能显示的最高分辨率就是显示器的分辨率，这可能不足以消除锯齿感。

一种解决方案是以更高的分辨率渲染。例如，将分辨率提高 4 倍（宽和高各 2 倍），然后将结果"双线性过滤"到画布上。
我们曾在[纹理文章](webgpu-textures.html)中介绍过"双线性过滤"。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x"></div>
    <div>4 倍分辨率</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-result"></div>
    <div>双线性过滤后的结果</div>
  </div>
</div>

这个解决方案有效，但很浪费。左边图像中每 2×2 个像素被转换为右边图像中的 1 个像素，但通常这 4 个像素都在三角形内部，因此不需要抗锯齿。这 4 个像素都是红色的。

<div class="webgpu_center side-by-side flex-gap">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-waste"></div>
    <div>每 4 个像素中有 3 个<span style="color: cyan;">青色</span>像素被浪费了</div>
  </div>
</div>

绘制 4 个红色像素而不是 1 个像素是浪费时间。GPU 调用了我们的片段着色器 4 次。片段着色器可能相当大且要做很多工作，所以我们希望尽可能少地调用它们。即使三角形只覆盖了 3 个像素的中心，情况也是这样：

<div class="webgpu_center">
  <img src="resources/antialias-4x.svg" width="600">
</div>

上图中，4 倍渲染且三角形覆盖了 3 个像素中心，片段着色器被调用了 3 次。随后我们再将结果双线性过滤到 1 倍纹理。

这就是多重采样更高效的地方。我们创建一个特殊的"多重采样纹理"。当我们将三角形绘制到多重采样纹理时，如果任意 4 个*采样点*在三角形内部，GPU 只需调用一次片段着色器，然后将结果写入那些在三角形内的*采样点*。

<div class="webgpu_center">
  <img src="resources/antialias-multisample-4.svg" width="600">
</div>

上图中，多重采样渲染且三角形覆盖了 3 个*采样点*，片段着色器只被调用了 1 次。然后我们*解析*结果。如果三角形覆盖了所有 4 个采样点，处理方式类似。片段着色器也只调用一次，但结果会被写入所有 4 个采样点。

注意，与 4 倍渲染时 CPU 检查 4 个像素中心是否在三角形内不同，多重采样渲染检查的是"采样位置"，这些位置并不在网格上。同样，采样值本身也不代表网格，因此"解析"过程不是双线性过滤，而是由 GPU 决定。在大多数情况下，这些不居中的采样位置显然会产生更好的抗锯齿效果。

## <a id="a-multisampling"></a> 如何使用多重采样。

那么如何使用多重采样呢？我们通过 3 个基本步骤：

1. 将渲染管线设置为渲染到多重采样纹理
2. 创建一个与最终纹理大小相同的多重采样纹理
3. 设置渲染通道渲染到多重采样纹理并*解析*到最终纹理（我们的画布）

为简单起见，我们以[基础文章末尾](webgpu-fundamentals.html#a-resizing)的响应式三角形为例，添加多重采样支持。

### 将渲染管线设置为渲染到多重采样纹理

```js
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    multisample: {
+      count: 4,
+    },
  });
```

添加上面的 `multisample` 配置使该管线能够渲染到多重采样纹理。

### 创建一个与画布大小相同的多重采样纹理

我们的最终纹理是画布的纹理。由于画布大小可能会变化（例如用户调整窗口大小），我们将在渲染时创建此纹理。

```js
+  let multisampleTexture;

  function render() {
+    // 从画布上下文获取当前纹理
+    const canvasTexture = context.getCurrentTexture();
+
+    // 如果多重采样纹理不存在或大小不对，则创建一个新的
+    if (!multisampleTexture ||
+        multisampleTexture.width !== canvasTexture.width ||
+        multisampleTexture.height !== canvasTexture.height) {
+
+      // 如果已有现成的多重采样纹理，销毁它
+      if (multisampleTexture) {
+        multisampleTexture.destroy();
+      }
+
+      // 创建一个与画布大小相同的新多重采样纹理
+      multisampleTexture = device.createTexture({
+        format: canvasTexture.format,
+        usage: GPUTextureUsage.RENDER_ATTACHMENT,
+        size: [canvasTexture.width, canvasTexture.height],
+        sampleCount: 4,
+      });
+    }

  ...
```

上述代码在以下情况下创建多重采样纹理：(a) 我们没有现成的，或 (b) 现有的与画布大小不匹配。我们创建一个与画布大小相同的纹理，但添加了 `sampleCount: 4` 使其成为多重采样纹理。

### 设置渲染通道渲染到多重采样纹理并*解析*到最终纹理（画布）

```js
-    // 从画布上下文获取当前纹理，并
-    // 将其设置为渲染目标
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();

+    // 将多重采样纹理设置为渲染目标
+    renderPassDescriptor.colorAttachments[0].view =
+        multisampleTexture;
+    // 将画布纹理设置为"解析"多重采样纹理的目标
+    renderPassDescriptor.colorAttachments[0].resolveTarget =
+        canvasTexture;
```

*解析*是将多重采样纹理转换为我们真正想要的纹理大小的过程。在这种情况下，就是我们的画布。在上面的 4 倍版本中，我们手动执行了这个步骤：将 4 倍纹理双线性过滤到 1 倍纹理。这是一个类似的过程，但多重采样纹理的解析实际上不是双线性过滤。[参见下文](#a-not-a-grid)

完整示例如下：

{{{example url="../webgpu-multisample-simple.html"}}}

没什么特别可看的，但如果我们在低分辨率下并排比较，左边原始的没有多重采样，右边有，可以看到右边的已经被抗锯齿处理了。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="simple-triangle"></div>
    <div>原始</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="simple-triangle-multisample"></div>
    <div>启用多重采样</div>
  </div>
</div>

需要注意的几点：

## `count` 必须是 `4`

在 WebGPU 1 版中，你只能在渲染管线的 `multisample: { count }` 上设置为 4 或 1。同样，纹理上的 `sampleCount` 也只能设置为 4 或 1。1 是默认值，表示纹理不是多重采样的。

## <a id="a-not-a-grid"></a> 多重采样不使用网格

如上所述，多重采样不是在网格上进行的。对于 sampleCount = 4，采样位置如下所示。

<div class="webgpu_center">
  <img src="resources/multisample-4x.svg" width="256">
  <div class="center">count: 4</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-2x.svg" width="256">
  <div class="center">count: 2</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-8x.svg" width="256">
  <div class="center">count: 8</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-16x.svg" width="256">
  <div class="center">count: 16</div>
</div>

**WebGPU 当前仅支持 count 为 4**

## 不必在每个渲染通道上设置解析目标

设置 `colorAttachment[0].resolveTarget` 是告诉 WebGPU："当此渲染通道中的所有绘制完成后，将多重采样纹理缩小到 `resolveTarget` 设置的纹理"。如果你有多个渲染通道，你可能不想在最后一个通道之前就解析。虽然在最后一个通道解析最快，但也可以使用一个空的后置渲染通道专门来解析。不过请确保将 `loadOp` 设置为 `'load'`，而不是 `'clear'`，否则之前的通道会被清除。

## 可以选择在每个采样点运行片段着色器

上文提到，多重采样纹理中，对于每 4 个采样点，片段着色器只运行一次。它运行一次，然后将结果存储在实际位于三角形内的采样点中。这就是为什么它比 4 倍分辨率渲染更快。

在[阶段间变量文章](webgpu-inter-stage-variables.html#a-interpolate)中，我们提到可以用 `@interpolate(...)` 属性标记如何插值阶段间变量。其中一个选项是 `sample`，在这种情况下片段着色器将为每个采样点运行一次。还有一些内置变量，如 `@builtin(sample_index)`，它会告诉你当前正在处理哪个采样点，以及 `@builtin(sample_mask)`，作为输入它会告诉你哪些采样点在三角形内，作为输出它可以阻止某些采样点被更新。

## `center` 与 `centroid`

有 3 种*采样*插值模式。上文我们提到了 `'sample'` 模式，即片段着色器为每个采样点运行一次。另外两种模式是 `'center'`（默认）和 `'centroid'`。

* `'center'` 根据像素中心进行插值。

<div class="webgpu_center">
  <img src="resources/multisample-centroid-issue.svg" width="400">
</div>

上面我们看到的是一个像素/纹素，其中采样点 `s1` 和 `s3` 在三角形内部。我们的片段着色器将被调用一次，并将收到相对于像素中心 (`c`) 插值的阶段间变量值。问题是 **`c` 在三角形之外**。

这可能无关紧要，但你的某些数学计算可能假设值在三角形内部。我不知道有什么很好的例子，但想象一下我们添加重心坐标，每个点一个。重心坐标基本上是 3 个坐标，从零到一，每个值代表当前位置距离三角形某个顶点的距离。要做到这一点，我们只需添加重心点，如下所示。

```wgsl
+struct VOut {
+  @builtin(position) position: vec4f,
+  @location(0) baryCoord: vec3f,
+};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
-) -> @builtin(position) vec4f {
+) -> VOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // 顶部中心
    vec2f(-0.5, -0.5),  // 左下
    vec2f( 0.5, -0.5)   // 右下
  );
+  let bary = array(
+    vec3f(1, 0, 0),
+    vec3f(0, 1, 0),
+    vec3f(0, 0, 1),
+  );
-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+  var vout: VOut;
+  vout.position = vec4f(pos[vertexIndex], 0.0, 1.0);
+  vout.baryCoord = bary[vertexIndex];
+  return vout;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
+@fragment fn fs(vin: VOut) -> @location(0) vec4f {
+  let allAbove0 = all(vin.baryCoord >= vec3f(0));
+  let allBelow1 = all(vin.baryCoord <= vec3f(1));
+  let inside = allAbove0 && allBelow1;
+  let red = vec4f(1, 0, 0, 1);
+  let yellow = vec4f(1, 1, 0, 1);
+  return select(yellow, red, inside);
}
```

上面我们将 `1, 0, 0` 关联到第一个点，`0, 1, 0` 关联到第二个，`0, 0, 1` 关联到第三个。在它们之间进行插值，不应该有值低于 0 或高于 1。

在片段着色器中，我们用 `all(vin.baryCoord >= vec3f(0))` 测试所有三个值（x、y、z）是否都 `>= 0`。我们还用 `all(vin.baryCoord <= vec3f(1))` 测试它们是否都 `<= 1`。最后用 `&` 将两者合并。这告诉我们是否在三角形内部。最终根据是否在内部选择红色，否则选择黄色。由于我们在顶点之间*插值*，理论上它们应该总是在内部。

为了更好地观察效果，我们把示例的分辨率调低一些：

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 16 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 16 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // 重新渲染
      render();
    }
  });
  observer.observe(canvas);
```

还有一些 CSS：

```js
canvas {
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
  display: block;  /* 让画布表现得像块级元素   */
  width: 100%;     /* 让画布填充其容器 */
  height: 100%;
}
```

运行后我们可以看到：

{{{example url="../webgpu-multisample-center-issue.html"}}}

我们可以看到，一些边缘像素带有黄色。这是因为如上所述，传递给片段着色器的插值阶段间变量值是相对于像素中心的。而这个中心在我们看到黄色的那些情况下，位于三角形之外。

将插值采样模式切换到 `'centroid'` 可以解决这个问题。在 `'centroid'` 模式下，GPU 使用三角形在像素内区域的质心。

<div class="webgpu_center">
  <img src="resources/multisample-centroid-fix.svg" width="400">
</div>


如果我们将示例中的插值模式改为 `'centroid'`：

```wgsl
struct VOut {
  @builtin(position) position: vec4f,
-  @location(0) baryCoord: vec3f,
+  @location(0) @interpolate(perspective, centroid) baryCoord: vec3f,
};
```

现在 GPU 会传递相对于质心插值的阶段间变量值，黄色像素的问题就消失了。

{{{example url="../webgpu-multisample-centroid.html"}}}

> 注意：GPU 可能实际上不会计算三角形在像素内的区域的质心。所有可以保证的是，阶段间变量将相对于三角形与像素相交部分内的某个区域进行插值。

## 三角形内部的抗锯齿呢？

多重采样通常只对三角形的边缘有帮助。因为当所有采样位置都在三角形内部时，片段着色器只被调用一次，我们只需将相同的结果写入所有采样，这意味着结果与未进行多重采样时没有什么不同。

在上面的例子中，因为我们绘制的是纯红色，显然没问题。但如果我们在纹理中采样，三角形内部可能有对比度很强的颜色相邻。我们不希望每个采样点的颜色来自纹理中的不同位置吗？

在三角形内部，我们使用[纹理过滤和 mipmap](webgpu-textures.html)来选择合适的颜色，因此抗锯齿可能不太重要。另一方面，某些渲染技术这也可能成为问题，这也是为什么存在其他抗锯齿解决方案，以及为什么你可能想使用 `@interpolate(..., sample)` 来进行逐采样处理。

## 多重采样不是唯一的抗锯齿解决方案。

我们在本文中提到了 2 种解决方案：
(1) 绘制到更高分辨率的纹理，然后将纹理以较低分辨率绘制。
(2) 使用多重采样。不过还有许多其他方案。
[这里有一篇文章介绍其中几种](https://vr.arvilab.com/blog/anti-aliasing)。

其他资源：

* [MSAA 快速概述](https://therealmjp.github.io/posts/msaa-overview/)
* [多重采样入门](https://www.rastergrid.com/blog/gpu-tech/2021/10/multisampling-primer/)

<!-- keep this at the bottom of the article -->
<link href="webgpu-multisampling.css" rel="stylesheet">
<script type="module" src="webgpu-multisampling.js"></script>
