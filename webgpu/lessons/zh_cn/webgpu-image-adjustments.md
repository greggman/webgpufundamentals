Title: WebGPU 后处理 - 图像调整
Description: 图像调整
TOC: 图像调整

本文是关于图像调整的短系列文章的第一篇。每个章节都建立在前一篇的基础上，因此你可能会发现按顺序阅读更容易理解。

1. [图像调整](webgpu-image-adjustments.html) ⬅ 你在这里
2. [一维查找表](webgpu-1dlut.html)
3. [三维查找表](webgpu-3dlut.html)

在[上一篇文章](webgpu-post-processing.html)中，我们介绍了如何进行[后处理](webgpu-post-processing.html)。一些常见的需求通常被称为图像调整，就像在 Photoshop、GIMP、Affinity Photo 等图像编辑程序中看到的那样。

作为准备工作，我们先制作一个加载图像并带有后处理步骤的示例。这实际上是[上一篇文章](webgpu-post-processing.html)的第一部分与我们之前关于[将图像加载到纹理中](webgpu-importing-textures.html)的示例的结合。

请记住，在之前的后处理文章中，我们首先将内容绘制到一个纹理上。然后应用后处理通道将该纹理渲染到画布上。这里我们会有类似的设置，但第一部分不同之处在于：我们不是绘制一堆移动的圆形，而是绘制一张图像。[^one-pass]

[^one-pass]: 从技术上讲，对于图像调整，我们不需要两步。先将图像绘制到纹理，然后应用调整。我们可以在绘制图像时直接应用调整。这样做的好处是可以在任何情况下使用，例如游戏可能会使用基于后处理的图像调整来设定色调、淡入淡出，以及用于其他各种效果。

下面是对应的着色器代码：

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;

@vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
  let positions = array(
    vec2f( 0,  0),
    vec2f( 1,  0),
    vec2f( 0,  1),
    vec2f( 0,  1),
    vec2f( 1,  0),
    vec2f( 1,  1),
  );
  let pos = positions[vNdx];
  return VSOutput(
    uni.matrix * vec4f(pos, 0, 1),
    pos,
  );
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(tex, smp, fsInput.texcoord);
}
```

这个着色器被硬编码为在右上角绘制一个单位四边形，即一个 1x1 的单位矩形。这实际上就是[将图像加载到纹理](webgpu-importing-textures.html)的第一个示例中所做的。不同的是，这次我们将四边形的位置乘以通过 uniform 缓冲区传入的矩阵。这样我们就可以控制四边形的方向、位置和缩放。

以下是使用它的代码：

```js
import {mat4} from '../3rdparty/wgpu-matrix.module.js';

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      @group(0) @binding(2) var smp: sampler;

      @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
        let positions = array(
          vec2f( 0,  0),
          vec2f( 1,  0),
          vec2f( 0,  1),
          vec2f( 0,  1),
          vec2f( 1,  0),
          vec2f( 1,  1),
        );
        let pos = positions[vNdx];
        return VSOutput(
          uni.matrix * vec4f(pos, 0, 1),
          pos,
        );
      }

      @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
        return textureSample(tex, smp, fsInput.texcoord);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'textured unit quad',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: 'rgba8unorm' }],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const imageUniformBuffer = device.createBuffer({
    size: 4 * 16,  // mat4x4
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const imageTexture = await createTextureFromImage(
    device,
    'resources/images/david-clode-clown-fish.jpg',
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const imageBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: imageUniformBuffer  },
      { binding: 1, resource: imageTexture },
      { binding: 2, resource: imageSampler },
    ],
  });

```

这里加载的图像由 [David Clode](https://unsplash.com/@davidclode) 提供，原始图片链接在[这里](https://unsplash.com/photos/orange-and-white-clown-fish-x9yfTxHpj5w)。

后处理代码与第一个后处理示例基本相同。它实际上什么都不做，但我们保留了一个多余的 uniform 结构体，这样就不必删除 uniform 缓冲区设置代码，然后在下一步再加回去。

```js
  const postProcessModule = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
      ) -> VSOutput {
        var pos = array(
          vec2f(-1.0, -1.0),
          vec2f(-1.0,  3.0),
          vec2f( 3.0, -1.0),
        );

        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
        return vsOutput;
      }

      struct Uniforms {
        unused: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        _ = uni; // so it's included in the bind group
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        return vec4f(rgb, color.a);
      }
    `,
  });

  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      { loadOp: 'clear', storeOp: 'store' },
    ],
  };

  const postProcessUniformBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let renderTarget;
  let postProcessBindGroup;

  function setupPostProcess(canvasTexture) {
    if (renderTarget?.width === canvasTexture.width &&
        renderTarget?.height === canvasTexture.height) {
      return;
    }

    renderTarget?.destroy();
    renderTarget = device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const renderTargetView = renderTarget;
    renderPassDescriptor.colorAttachments[0].view = renderTargetView;

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTargetView },
        { binding: 1, resource: postProcessSampler },
        { binding: 2, resource: postProcessUniformBuffer  },
      ],
    });
  }

  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

渲染从 `requestAnimationFrame` 循环切换为按需渲染。

```js
    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

    // css 'cover'
    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
    const imageAspect = imageTexture.width / imageTexture.height;
    const aspect = canvasAspect / imageAspect;
    const aspectScale = aspect > 1 ? [1, aspect, 1] : [1 / aspect, 1, 1];

    const matrix = mat4.identity();
    mat4.scale(matrix, [2, 2, 1], matrix);
    mat4.scale(matrix, aspectScale, matrix);
    mat4.translate(matrix, [-0.5, -0.5, 1], matrix);

    // Copy our the uniform values to the GPU
    device.queue.writeBuffer(imageUniformBuffer, 0, matrix);

    // Draw the image to a texture.
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, imageBindGroup);
    pass.draw(6);
    pass.end();

    postProcess(encoder, renderTarget, canvasTexture);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
    render();
  });
  observer.observe(canvas);
```

上面的代码计算了一个矩阵，该矩阵为图像产生类似 CSS 中 `cover` 模式的效果。换句话说，它会缩放图像以覆盖整个画布。

让我们添加一些小的改进：

我们让它支持拖放图像功能。我们将使用一个辅助库。

```js
+import * as dragAndDrop from './resources/js/drag-and-drop.js';

...

-  const imageTexture = await createTextureFromImage(
+  let imageTexture = await createTextureFromImage(
    device,
    'resources/images/david-clode-clown-fish.jpg',
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

-  const imageBindGroup = device.createBindGroup({
+  let imageBindGroup;
+  function updateBindGroup() {
+    imageBindGroup = device.createBindGroup({
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: imageUniformBuffer  },
+        { binding: 1, resource: imageTexture },
+        { binding: 2, resource: imageSampler },
+      ],
+    });
+  }
+  updateBindGroup();

...

+  const gui = new GUI();
+  gui.name('Drag-n-Drop Image');
+  gui.onChange(render);

...

+  async function readImageFile(file) {
+    const newImageTexture = await createTextureFromImage(device, URL.createObjectURL(file));
+    imageTexture.destroy();
+    imageTexture = newImageTexture;
+    updateBindGroup();
+    render();
+  }
+
+  dragAndDrop.setup({msg: 'Drop Image File here'});
+  dragAndDrop.onDropFile(readImageFile);

```

`GUI` 部分不是必需的，但它会告诉用户可以拖放图像。

然后，由于大多数手机不支持拖放，我们再让它支持粘贴图像。同样使用辅助库。

```js
+import onPasteImage from './resources/js/on-paste-image.js';

...

  dragAndDrop.setup({msg: 'Drop Image File here'});
  dragAndDrop.onDropFile(readImageFile);

+  onPasteImage(readImageFile);
```

现在你应该能够在手机上选择一张图像并将其粘贴到示例中。请注意，这只有在页面获得焦点时或在自己的页面中运行时才有效。

这些细节可能并不重要，但它们都很小，能让你尝试自己的图像。

这就是运行效果：

{{{example url="../webgpu-post-processing-image-adjustments-noop.html"}}}

## <a id="a-brightness"></a> 亮度

最简单的图像调整可能是"亮度"。这是另一张图片：

<div class="webgpu_center center"><div data-diagram="original" data-labels='{"type": "original"}'></div></div>
<div class="webgpu_center center"><div>
  <a href="https://unsplash.com/photos/a-happy-corgi-dog-rests-outdoors-with-tongue-out-RQFMEBJcolY">照片</a>由 <a href="https://unsplash.com/@alvannee">Alvan Nee</a> 提供
</div></div>

这是应用了亮度调整后的效果：

<div class="webgpu_center center"><div data-diagram="brightness" data-labels='{"type": "brightness"}'></div></div>

亮度调整的范围是 -1 到 1，其中：

* &nbsp;0 = 不调整。
* -1 = 移除 100% 的亮度。
* +1 = 使其尽可能明亮 [^hdr]

[^hdr]: HDR 可以超过 1。

要实现这一点，我们只需要在后处理片段着色器中将亮度值加到颜色上即可。

以下是对着色器的修改：

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

+fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
+  return color + brightness;
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
-  unused: f32,
+  brightness: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-  _ = uni; // so it's included in the bind group
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustBrightness(rgb, uni.brightness);
  return vec4f(rgb, color.a);
}
```

然后我们需要设置亮度值。

```js
  function postProcess(encoder, srcTexture, dstTexture) {
+    device.queue.writeBuffer(
+      postProcessUniformBuffer,
+      0,
+      new Float32Array([
+        settings.brightness,
+      ]),
+    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

+  const settings = {
+    brightness: 0,
+  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
+  gui.add(settings, 'brightness', -1, 1);
```

这样我们就可以调整亮度了：

{{{example url="../webgpu-post-processing-image-adjustments-brightness.html"}}}

# <a id="a-contrast"></a> 对比度

另一个相对简单的调整是"对比度"：

<div class="webgpu_center center"><div data-diagram="contrast" data-labels='{"type": "contrast"}'></div></div>

对于对比度，值的范围是 -1 到 10。对于每个颜色通道，如果值小于 0.5，就将其推向 0；如果大于 0.5，就推向 1。这样就把颜色拉开了。

以下是对着色器的修改：

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
  return color + brightness;
}

+fn adjustContrast(color: vec3f, contrast: f32) -> vec3f {
+  let c = contrast + 1.0;
+  return clamp(0.5 + c * (color - 0.5), vec3f(0), vec3f(1));
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
  brightness: f32,
+  contrast: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
  rgb = adjustBrightness(rgb, uni.brightness);
+  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

从上面的代码可以看到，我们取颜色减去 0.5。这使得小于 0.5 的颜色变成负数，大于 0.5 的变成正数。然后我们用对比度设置值加 1 来乘以它。所以设置为 0 将乘以 1（无变化）。然后再加回 0.5。当对比度设置低于 0.5 时，这会将颜色推向 0.5；当对比度设置为 -1 时，它们都会变成 0.5（灰色）。对于大于 0 的对比度设置，颜色将被推离 0.5。

同样，我们需要一种方式来设置新的调整参数。

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
+        settings.contrast,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
+    contrast: 0,
  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
+  gui.add(settings, 'contrast', -1, 10);
```

请注意，我们将最大值设置为 10 有点任意。由于我们是通过乘以对比度值将值从 0.5 推开，如果颜色是 0.51 且对比度是 10，那么我们将得到 0.60（0.5 + 10 * 0.01）。这还没有到 1。但在实践中，如果你试着在下面调整，你会发现即使超过 6 也没什么变化。也许你需要选择一张对比度很低的图像才能需要更高的对比度值。

{{{example url="../webgpu-post-processing-image-adjustments-contrast.html"}}}

需要注意的是，这些操作是顺序相关的。我们先应用亮度，然后应用对比度。由于对比度将颜色从 0.5 推开，而亮度是加到整体颜色上的，因此对于给定的亮度设置，我们实际上是在选择对比度应用之前图像中 0.5 级别的位置。

# <a id="a-hue-saturation-lightness"></a> 色相、饱和度、亮度（HSL）

允许色相、饱和度和亮度调整是很常见的。

<div class="webgpu_center center"><div data-diagram="hsl" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div></div>

这些调整通常一起使用，当我们了解它们的工作原理时就会明白为什么。

回想一下，我们的颜色由红、绿、蓝三个通道表示，每个通道的值从 0 到 1。这可以表示为一个立方体，其中红色是一个维度，绿色是另一个维度，蓝色是第三个维度。

HSL 把所有这些颜色映射到一个圆柱体，其中 H 是绕圆柱体的角度，S 是到中心的距离，0 在中心（无饱和度），1 在边缘（最大饱和度）。L 是沿圆柱体长度的位置，0 是没有亮度（黑色），1 是最大亮度（白色）。

RGB 空间中的每种颜色都有一个对应的 HSL 值。

<div class="webgpu_center center">
  <div class="rgb-hsl" style="max-width: 1100px;">
    <div data-diagram="rgbDiagram" data-labels='{"r": "r", "g": "g", "b": "b"}'></div>
    <div data-diagram="hslDiagram" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div>
  </div>
</div>

从一种空间转换到另一种空间并不太难。解释这种转换实际上更困难。无论如何，这里是一个从 RGB 转换到 HSL 的着色器函数：

```wgsl
struct HSL {
  h: f32,
  s: f32,
  l: f32,
};

fn rgbToHsl(rgb: vec3f) -> HSL {
  let cMin = min(min(rgb.r, rgb.b), rgb.g);
  let cMax = max(max(rgb.r, rgb.b), rgb.g);
  let delta = cMax - cMin;

  let l = (cMax + cMin) / 2.0;
  if (delta == 0.0) {
    return HSL(0, 0, l);
  }

  var h = 0.0;
  if (rgb.r == cMax) {
    h = (rgb.g - rgb.b) / delta;
  } else if (rgb.g == cMax) {
    h = 2.0 + (rgb.b - rgb.r) / delta;
  } else {
    h = 4.0 + (rgb.r - rgb.g) / delta;
  }
  h = h / 6.0;
  let s = delta / (1.0 - abs(2.0 * l - 1.0));
  return HSL(h, s, l);
}
```

这个函数返回 0 到 1 范围内的 3 个值。我们本来可以传出一个 `vec3f` 作为结果，但声明一个 `HSL` 结构体似乎更好，这样成员可以被称为 `h`、`s` 和 `l`，而不是 `x`、`y` 和 `z`。

下面是相反的函数，即从 HSL 转换到 RGB：

```wgsl
fn hslToRgb(hsl: HSL) -> vec3f {
  let c = vec3f(fract(hsl.h), clamp(vec2f(hsl.s, hsl.l), vec2f(0), vec2f(1)));
  let rgb = clamp(abs((c.x * 6.0 + vec3f(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3f(0), vec3f(1));
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}
```

此函数将饱和度和亮度限制在 0 到 1 之间。它还使用 `fract(hsl.h)`，这意味着传入任何值都是安全的 [~precision]。例如，你可以将饱和度设为 50，它会被限制到 1。你可以将色相设为 75.3，效果与 0.3 相同。

有了这两个函数，我们就可以修改着色器来包含 HSL 调整功能：

```wgsl
...

+fn adjustHSL(color: vec3f, adjust: HSL) -> vec3f {
+  let hsl = rgbToHsl(color);
+  let newHSL = HSL(hsl.h + adjust.h, hsl.s + adjust.s, hsl.l + adjust.l);
+  return hslToRgb(newHSL);
+}

...

struct Uniforms {
  brightness: f32,
  contrast: f32,
+  @align(16) hsl: HSL,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustHSL(rgb, uni.hsl);
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

这里可能需要注意的一点是，在将 `HSL` 添加到 `Uniforms` 结构体时，我们需要使用 `@align(16)`。原因在于[用于 uniform 的结构体默认必须对齐到 16 字节边界](webgpu-memory-layout.html#a-struct-array-size-alignment)。此外，这意味着该结构可以同时用于 uniform 和存储缓冲区。WGSL 不会自动添加这个对齐方式，以便将来可以取消对齐限制，结构只需要一种布局。如果现在不需要 `@align(16)` 而是自动对齐，那么后来取消限制时，大量代码就会出问题。[^alignment]

[^alignment]: 取消此限制的工作[已经在进行中](https://github.com/gpuweb/gpuweb/issues/4973)，至少对于较新的设备是这样。

要使用它，我们仍然需要更新 JavaScript 来设置新的 uniform 值。

```js
  const postProcessUniformBuffer = device.createBuffer({
-    size: 16,
+    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

...

  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
        settings.contrast,
+        0,
+        0,
+        settings.hue,
+        settings.saturation,
+        settings.lightness,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
    contrast: 0,
+    hue: 0,
+    saturation: 0,
+    lightness: 0,
  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
  gui.add(settings, 'contrast', -1, 10);
+  gui.add(settings, 'hue', -0.5, 0.5);
+  gui.add(settings, 'saturation', -1, 1);
+  gui.add(settings, 'lightness', -1, 1);
```

现在你应该可以调整色相、饱和度和亮度了：

{{{example url="../webgpu-post-processing-image-adjustments-hsl.html"}}}

希望这能给你一些关于图像调整和后处理的想法。在[下一篇文章](webgpu-1dlut.html)中，我们将使用一维纹理来获得更大的灵活性。

<!-- keep this at the bottom of the article -->
<link href="webgpu-image-adjustments.css" rel="stylesheet">
<script type="module" src="webgpu-image-adjustments.js"></script>
