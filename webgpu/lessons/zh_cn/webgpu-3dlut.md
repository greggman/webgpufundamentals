Title: WebGPU 后处理 - 三维查找表（3D-LUT）
Description: 三维查找表（3D-LUT）
TOC: 三维查找表（3D-LUT）

本文是关于图像调整的短系列文章的第三篇。每个章节都建立在前一篇的基础上，因此你可能会发现按顺序阅读更容易理解。

1. [图像调整](webgpu-image-adjustments.html)
2. [一维查找表](webgpu-1dlut.html)
3. [三维查找表](webgpu-3dlut.html) ⬅ 你在这里

在上一篇文章中，我们介绍了[渐变映射](webgpu-1dlut.html)，也可以称之为一维查找表或 1D-LUT。我们的 1D-LUT 是 n 像素宽、1 像素高。而 3D-LUT 就是同样的思路，但扩展到三维。

它的工作原理是：制作一个颜色的立方体，然后用原图像的颜色作为索引来查询这个立方体。对于原图像中的每个像素，我们根据该像素的红、绿、蓝颜色在立方体中查找一个位置。从 3D-LUT 中取出的值就是新的颜色。

在 JavaScript 中我们可以这样理解。假设颜色用 0 到 255 的整数表示，我们有一个很大的三维数组，大小为 256×256×256。那么要通过查找表转换颜色，我们只需要这样做：

```js
    const newColor = lut[origColor.red][origColor.green][origColor.blue];
```

当然，256×256×256 的数组会非常大，但正如我们在[纹理相关文章](webgpu-textures.html)中指出的，纹理的值引用范围是 0.0 到 1.0，与纹理的实际尺寸无关。

让我们想象一个 8×8×8 的立方体。

<div class="webgpu_center"><img src="resources/images/3dlut-rgb.svg" class="noinvertdark" style="width: 500px"></div>

首先我们用特定颜色填充各个角：0,0,0 角为纯黑色，对角的 1,1,1 角为纯白色。1,0,0 为纯<span style="color:red;">红色</span>。0,1,0 为纯<span style="color:green;">绿色</span>，0,0,1 为<span style="color:blue;">蓝色</span>。

<div class="webgpu_center"><img src="resources/images/3dlut-axis.svg" class="noinvertdark" style="width: 500px"></div>

然后我们在每条轴上填充颜色。

<div class="webgpu_center"><img src="resources/images/3dlut-edges.svg" class="noinvertdark" style="width: 500px"></div>

以及使用两个或更多通道的边上的颜色。

<div class="webgpu_center"><img src="resources/images/3dlut-standard.svg" class="noinvertdark" style="width: 500px"></div>

最后填充中间的所有颜色。这是一个"恒等"3D-LUT。它的输出与输入完全相同。如果你查询一种颜色，得到的是同一种颜色。

<div class="webgpu_center"><object type="image/svg+xml" data="resources/images/3dlut-standard-lookup.svg" class="noinvertdark" data-diagram="lookup" style="width: 600px"></object></div>

但如果我们把立方体改成琥珀色调，那么当我们查询颜色时，虽然在 3D 查找表中查询的位置相同，但会产生不同的输出。

<div class="webgpu_center"><object type="image/svg+xml" data="resources/images/3dlut-amber-lookup.svg" class="noinvertdark" data-diagram="lookup" style="width: 600px"></object></div>

使用这种技术，通过提供不同的查找表，我们可以应用各种效果。基本上，任何可以仅基于单一颜色输入计算的效果都可以实现。这些效果包括前几篇文章中我们做过的所有调整：色相、对比度、饱和度、色彩偏移、 tint、亮度、曝光、色阶、曲线、色阶分离、阴影、高光，以及更多。更好的是，它们都可以合并到单个查找表中。

以下是需要的 WGSL 代码。它与 `apply1DLUT` 函数非常相似：

```wgsl
fn apply1DLUT(
    color: vec3f,
    lut: texture_2d<f32>,
    smp: sampler) -> vec3f {
  let l = luminance(color);
  let width = f32(textureDimensions(lut, 0).x);
  let range = (width - 1) / width;
  let u = 0.5 / width + l * range;
  return textureSample(lut, smp, vec2f(u, 0.5)).rgb;
}

+fn apply3DLUT(
+    color: vec3f,
+    lut: texture_3d<f32>,
+    smp: sampler) -> vec3f {
+  let size = vec3f(textureDimensions(lut, 0));
+  let range = (size - 1) / size;
+  let uvw = 0.5 / size + color * range;
+  return textureSample(lut, smp, uvw).rgb;
+}
```

让我们把它应用到着色器中。同时让我们移除其他所有调整功能：

```wgsl
struct Uniforms {
-  brightness: f32,
-  contrast: f32,
  lutAmount: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;
-@group(1) @binding(0) var lut: texture_2d<f32>;
+@group(1) @binding(0) var lut: texture_3d<f32>;
@group(1) @binding(1) var lutSampler: sampler;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
-  rgb = adjustBrightness(rgb, uni.brightness);
-  rgb = adjustContrast(rgb, uni.contrast);
-  rgb = mix(rgb, apply1DLUT(rgb, lut, lutSampler), uni.lutAmount);
+  rgb = mix(rgb, apply3DLUT(rgb, lut, lutSampler), uni.lutAmount);
  return vec4f(rgb, color.a);
}
```

要使用它，我们需要创建一个 3D 纹理。最简单的 3D-LUT 是一个 2×2×2 的恒等 LUT，*恒等*意味着什么都不发生。这类似于乘以 1 或什么都不做，尽管我们每次都在 LUT 中查找颜色，但每种颜色都会映射到相同的颜色输出。

<div class="webgpu_center"><img src="resources/images/3dlut-standard-2x2.svg" class="noinvertdark" style="width: 200px"></div>

以下是创建 2ˣ2ˣ2 3D 纹理并包含恒等 LUT 所需颜色的代码：

```js
function makeIdentityLutTexture(device) {
  const texture = device.createTexture({
    size: [2, 2, 2],
    dimension: '3d',
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const identityLUT = new Uint8Array([
      0,   0,   0, 255,  // 黑色
    255,   0,   0, 255,  // 红色
      0, 255,   0, 255,  // 绿色
    255, 255,   0, 255,  // 黄色
      0,   0, 255, 255,  // 蓝色
    255,   0, 255, 255,  // 品红色
      0, 255, 255, 255,  // 青色
    255, 255, 255, 255,  // 白色
  ]);

  device.queue.writeTexture(
    { texture },
    identityLUT,
    { bytesPerRow: 8, rowsPerImage: 2 },
    [2, 2, 2],
  );

  return texture;
}
```

我们还需要一些代码来使用它。让我们用两次，一次用线性过滤，一次不用：

```js
  const lutNearestSampler = device.createSampler();
  const lutLinearSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  function makeLutBindGroup(texture, sampler) {
    return device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: texture },
        { binding: 1, resource: sampler },
      ],
    });
  }

  const identityLutTexture = makeIdentityLutTexture(device);
  const lutBindGroups = [
    {
      name: 'identity',
      bindGroup: makeLutBindGroup(identityLutTexture, lutLinearSampler),
    },
    {
      name: 'identity (nearest)',
      bindGroup: makeLutBindGroup(identityLutTexture, lutNearestSampler),
    },
  ];

  ...

  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
-        settings.brightness,
-        settings.contrast,
        settings.lutAmount,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
-    pass.setBindGroup(1, lutBindGroups[settings.lut]);
+    pass.setBindGroup(1, lutBindGroups[settings.lut].bindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
-    brightness: 0,
-    contrast: 0,
    lutAmount: 1,
    lut: 0,
  };

  const gui = new GUI();
  gui.onChange(render);
-  gui.add(settings, 'brightness', -1, 1);
-  gui.add(settings, 'contrast', -1, 10);
  gui.add(settings, 'lutAmount', 0, 1);
+  const keyValues = Object.fromEntries(lutBindGroups.map(({name}, i) => [name, i]));
+  gui.add(settings, 'lut', { keyValues });

-  const uiElem = document.querySelector('#ui');
-  gradients.forEach((stops, i) => {
-    const div = document.createElement('div');
-    div.className = 'gradient';
-    div.style.background = `linear-gradient(to right,
-      ${stops.map(([r, g, b, stop]) => `rgb(${r}, ${g}, ${b}) ${stop * 100}%`).join(',')}
-    )`;
-    div.addEventListener('click', () => {
-      settings.lut = i;
-      render();
-    });
-    uiElem.append(div);
-  });
```

这样我们就得到了恒等 LUT，它没有任何效果 😂 但至少我们可以在没有过滤的情况下试试看，会看到明显的效果。

{{{example url="../webgpu-post-processing-image-adjustments-3d-lut.html" }}}

首先确定你想要的 LUT 分辨率，然后使用一个简单的脚本生成颜色立方体的切片：

```js
const ctx = document.querySelector('canvas').getContext('2d');

function drawColorCubeImage(ctx, size) {
  const canvas = ctx.canvas;
  canvas.width = size * size;
  canvas.height = size;

  for (let zz = 0; zz < size; ++zz) {
    for (let yy = 0; yy < size; ++yy) {
      for (let xx = 0; xx < size; ++xx) {
        const r = Math.floor(xx / (size - 1) * 255);
        const g = Math.floor(yy / (size - 1) * 255);
        const b = Math.floor(zz / (size - 1) * 255);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(zz * size + xx, yy, 1, 1);
      }
    }
  }
}

drawColorCubeImage(ctx, 8);
```

然后我们还需要一些 HTML：

```html
<h1>颜色立方体图像生成器</h1>
<div>尺寸：<input id="size" type="number" value="8" min="2" max="64"/></div>
<p><button type="button">保存...</button></p>
<div id="cube"><canvas></canvas></div>
<div>（注意：实际图像尺寸为
<span id="width"></span>×<span id="height"></span>）</div>
```

以及用于创建 UI 的 JS 代码：

```js
function update(size) {
  drawColorCubeImage(ctx, size);
  document.querySelector('#width').textContent = ctx.canvas.width;
  document.querySelector('#height').textContent = ctx.canvas.height;
}
update(8);

function handleSizeChange(event) {
  const elem = event.target;
  elem.style.background = '';
  try {
    const size = parseInt(elem.value);
    if (size >= 2 && size <= 64) {
      update(size);
    }
  } catch (e) {
    elem.style.background = 'red';
  }
}

const sizeElem = document.querySelector('#size');
sizeElem.addEventListener('change', handleSizeChange, true);

const saveData = (function() {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  return function saveData(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
  };
}());

document.querySelector('button').addEventListener('click', () => {
  ctx.canvas.toBlob((blob) => {
    saveData(blob, `identity-lut-s${ctx.canvas.height}.png`);
  });
});
```

现在我们可以为任意尺寸生成恒等 3D 查找表了。[^size]

[^size]: Adobe 的 .cube 文件通常是 33ˣ33ˣ33

{{{example url="../3dlut-base-cube-maker.html" }}}

分辨率越大，我们可以做的精细调整就越多，但作为数据立方体，所需的存储空间增长很快。尺寸为 8 的立方体只需要 2KB，但尺寸为 64 的立方体需要 1MB。所以使用能够重现你想要效果的最小尺寸。

让我们把尺寸设为 16，然后点击保存文件，会得到这样一个文件：

<div class="webgpu_center"><img src="resources/images/identity-lut-s16.png" style="image-rendering: pixelated; width: 256px;"></div>

然后我们用图像编辑器打开它，我用的是 Photoshop，加载一张示例图像，把 3D-LUT 粘贴到左上角：

> 注意：我最初尝试把立方体文件直接拖放到 Photoshop 的图像上，但没起作用。Photoshop 把图像变成了两倍大。
> 我猜它是在尝试匹配 DPI 之类的设置。后来先单独加载立方体文件，然后把屏幕截图复制粘贴进去才成功了。

<div class="webgpu_center"><img class="nobg" src="resources/images/3d-lut-photoshop-before.png" style="width: 1100px"></div>

然后我们使用任何基于颜色的全图像调整功能来调整图像。对于 Photoshop，大多数可用的调整功能都在"调整"标签页中。

<div class="webgpu_center"><img class="nobg" src="resources/images/3d-lut-photoshop-after.png" style="width: 1100px"></div>

调整完图像后，你可以看到放在左上角的立方体切片也应用了同样的调整。

好，但我们怎么使用它呢？

首先我把它保存为 `3d-lut-orange-to-green-s16.png`。为了节省内存，我们可以把 LUT 表的左上角 256ˣ16 部分裁剪出来，但为了好玩，我们选择在加载后再裁剪。这种方法的好处是，我们可以通过查看 .png 文件大致了解 LUT 的效果。坏处当然就是浪费了带宽。

以下是加载它的代码。代码加载图像，从画布中只复制出 3D-LUT 部分，获取画布中的数据，然后逐切片上传到纹理中：

```js
/**
 * 从图像 URL 创建 LUT 纹理。你必须传入 LUT 的尺寸。
 * 假设图像左上角就是 LUT 数据。
 *
 * +---------+---------+---------+---------+---------+---------+--->
 * |         |         |         |         |         |         |
 * |  层 0   |  层 1   |  层 2   |  层 3   |   ...   |  层 n   |
 * |         |         |         |         |         |         |
 * +---------+---------+---------+---------+---------+---------+--------+
 * |
 * ↓
 */
const createLUTTextureFromImage = (function() {
  const ctx = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });

  return async function createLUTTextureFromImage(device, url, lutSize) {
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.canvas.width = lutSize * lutSize;
    ctx.canvas.height = lutSize;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, lutSize * lutSize, lutSize);

    const texture = device.createTexture({
      size: [lutSize, lutSize, lutSize],
      dimension: '3d',
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    for (let z = 0; z < lutSize; ++z) {
      device.queue.writeTexture(
        { texture, origin: [0, 0, z] },
        imgData.data,
        { offset: z * lutSize * 4, bytesPerRow: imgData.width * 4 },
        [lutSize, lutSize],
      );
    }
    return texture;
  };
})();
```

让我们把自定义的 LUT 添加到现有的 LUT 列表中：

```js
+  const lutTextures = [
+    { name: 'custom',          url: 'resources/images/lut/3d-lut-orange-to-green-s16.png'},
+  ];
+  lutBindGroups.push(...await Promise.all(lutTextures.map(async({name, url}) => {
+    // 假设文件名以 '-s<数字>[n]' 结尾
+    // <数字> 是 3DLUT 立方体的尺寸
+    // [n] 表示'不过滤'或'nearest'
+    //
+    // 示例：
+    //    'foo-s16.png' = 尺寸:16, 过滤: true
+    //    'bar-s8n.png' = 尺寸:8, 过滤: false
+    const m = /-s(\d+)(n*)\.[^.]+$/.exec(url);
+    const size = parseInt(m[1]);
+    const filter = m[2] === '';
+
+    const texture = await createLUTTextureFromImage(device, url, size);
+    const sampler = filter
+      ? lutLinearSampler
+      : lutNearestSampler;
+    return {name, bindGroup: makeLutBindGroup(texture, sampler)};
+  })));
```

如上所示，我们在文件名末尾编码了 LUT 的尺寸。这样更容易把 LUT 作为 png 文件传递。

同时，让我们加载更多的基于图像的 3D-LUT：

```js
  const lutTextures = [
    { name: 'custom',          url: 'resources/images/lut/3d-lut-orange-to-green-s16.png'},
+    { name: 'monochrome',      url: 'resources/images/lut/monochrome-s8.png' },
+    { name: 'sepia',           url: 'resources/images/lut/sepia-s8.png' },
+    { name: 'saturated',       url: 'resources/images/lut/saturated-s8.png', },
+    { name: 'posterize',       url: 'resources/images/lut/posterize-s8n.png', },
+    { name: 'posterize-3-rgb', url: 'resources/images/lut/posterize-3-rgb-s8n.png', },
+    { name: 'posterize-3-lab', url: 'resources/images/lut/posterize-3-lab-s8n.png', },
+    { name: 'posterize-4-lab', url: 'resources/images/lut/posterize-4-lab-s8n.png', },
+    { name: 'posterize-more',  url: 'resources/images/lut/posterize-more-s8n.png', },
+    { name: 'inverse',         url: 'resources/images/lut/inverse-s8.png', },
+    { name: 'color negative',  url: 'resources/images/lut/color-negative-s8.png', },
+    { name: 'funky contrast',  url: 'resources/images/lut/funky-contrast-s8.png', },
+    { name: 'nightvision',     url: 'resources/images/lut/nightvision-s8.png', },
+    { name: 'thermal',         url: 'resources/images/lut/thermal-s8.png', },
+    { name: 'b/w',             url: 'resources/images/lut/black-white-s8n.png', },
+    { name: 'hue +60',         url: 'resources/images/lut/hue-plus-60-s8.png', },
+    { name: 'hue +180',        url: 'resources/images/lut/hue-plus-180-s8.png', },
+    { name: 'hue -60',         url: 'resources/images/lut/hue-minus-60-s8.png', },
+    { name: 'red to cyan',     url: 'resources/images/lut/red-to-cyan-s8.png' },
+    { name: 'blues',           url: 'resources/images/lut/blues-s8.png' },
+    { name: 'infrared',        url: 'resources/images/lut/infrared-s8.png' },
+    { name: 'radioactive',     url: 'resources/images/lut/radioactive-s8.png' },
+    { name: 'goolgey',         url: 'resources/images/lut/googley-s8.png' },
+    { name: 'bgy',             url: 'resources/images/lut/bgy-s8.png' },
  ];
```

这里有一堆 LUT 可以尝试：

{{{example url="../webgpu-post-processing-image-adjustments-3d-luts.html" }}}

以下是所有 LUT 应用到我们图像上的效果：

<div class="webgpu_center">
   <div data-diagram="imageLuts" class="fill-container"></div>
</div>

最后一件事，纯粹为了好玩，原来 Adobe 定义了一个标准的 LUT 格式。如果你[在网上搜索可以找到很多这类 LUT 文件](https://www.google.com/search?q=lut+files)。例如[这个网站](https://freshluts.com/)有很多 LUT。

我写了一个快速加载器。不幸的是这个格式有 4 种变体，但我只找到了 1 种变体的示例，所以无法轻松测试所有变体是否都能正常工作。

让我们实现拖放 LUT 文件的功能，这样文件就会被应用：

首先我们需要这个库：

```js
import * as lutParser from './resources/lut-reader.js';
```

然后我们可以这样使用它们：

```js
-  dragAndDrop.setup({msg: 'Drop Image File here'});
-  dragAndDrop.onDropFile(readImageFile);
+  dragAndDrop.setup({msg: 'Drop LUT or Img File here'});
+  dragAndDrop.onDropFile(readLUTOrImgFile);

+  function ext(s) {
+    return s.substr(s.lastIndexOf('.') + 1);
+  }
+
+  function readLUTOrImgFile(file) {
+    const type = ext(file.name);
+    switch (type.toLowerCase()) {
+      case 'jpg':
+      case 'jpeg':
+      case 'png':
+      case 'webp':
+        readImageFile(file);
+        break;
+      default:
+        readLUTFile(file);
+        break;
+    }
+  }

  async function readImageFile(file) {
    const newImageTexture = await createTextureFromImage(device, URL.createObjectURL(file));
    imageTexture.destroy();
    imageTexture = newImageTexture;
    updateBindGroup();
    render();
  }

+  function readLUTFile(file) {
+    const reader = new FileReader();
+    reader.onload = (e) => {
+      const type = ext(file.name);
+      const name = file.name.substring(file.name.lastIndexOf('/'));
+      const {size, data} = lutParser.lutTo2D3Drgba8(lutParser.parse(e.target.result, type));
+      const texture = device.createTexture({
+        size: [size, size, size],
+        dimension: '3d',
+        format: 'rgba8unorm',
+        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
+      });
+      device.queue.writeTexture(
+        { texture },
+        data,
+        { bytesPerRow: size * 4, rowsPerImage: size },
+        [size, size, size],
+      );
+      lutBindGroups.push({
+        name: (name && name.toLowerCase().trim() !== 'untitled')
+          ? name
+          : file.name,
+        bindGroup: makeLutBindGroup(texture, lutLinearSampler),
+      });
+      settings.lut = lutBindGroups.length - 1;
+      updateGUI();
+      render();
+    };
+
+    reader.readAsText(file);
+  }
```

然后我们需要让 GUI 在有新文件时更新：

```js
  const gui = new GUI();
  gui.name('Choose LUT or Drag&Drop LUT File(s)');
  gui.onChange(render);
  gui.add(settings, 'amount', 0, 1);
-  const keyValues = Object.fromEntries(lutBindGroups.map(({name}, i) => [name, i]));
-  gui.add(settings, 'lut', { keyValues });

+  let lutGUI;
+  function updateGUI() {
+    if (lutGUI) {
+      gui.remove(lutGUI);
+    }
+    const keyValues = Object.fromEntries(lutBindGroups.map(({name}, i) => [name, i]));
+    lutGUI = gui.add(settings, 'lut', { keyValues });
+  }
+  updateGUI();
```

这样你应该能够[下载一个 Adobe LUT](https://www.google.com/search?q=lut+files)，然后把它拖放到下面的示例中。

{{{example url="../webgpu-post-processing-image-adjustments-3d-luts-w-loader.html"}}}

以下是一些我从网上找到的 LUT 并应用到图像上的效果：

<div class="webgpu_center">
   <div data-diagram="cubeLuts" class="fill-container" style="max-width: 1200px"></div>
</div>

注意，Adobe LUT 不是为在线使用设计的。它们是大型文件。（约 1MB）。你可以通过拖放到下面的示例中并点击"保存..."来将它们转换为更小的 PNG 格式。PNG 文件通常小约 20 倍，约 50KB。

{{{example url="../adobe-lut-to-png-converter.html" }}}

<!-- keep this at the bottom of the article -->
<link href="webgpu-3dlut.css" rel="stylesheet">
<script type="module" src="webgpu-3dlut.js"></script>
