Title: WebGPU 速度与优化
Description: 如何让 WebGPU 运行得更快
TOC: 速度与优化

本文档中大多数示例的编写都以可理解性为首要目标。这意味着它们能够正常工作，并且是正确的，但它们并不一定是 WebGPU 中做某件事的最高效方式。此外，根据您的实际需求，有许多可能的优化方案。

本文将介绍一些最基本的优化方法，并讨论其他一些方案。需要明确的是，在我看来，**你通常不需要做到这种程度。网络上大多数使用 WebGPU 的示例只绘制几百个物体，因此这些优化实际上并不会带来明显收益**。不过，了解如何让事情运行得更快总是有好处的。

基本原则：**你做得的工作越少，要求 WebGPU 做的工作越少，速度就越快。**

在迄今为止几乎所有示例中，如果我们绘制多个形状，都会执行以下步骤：

* 初始化时：
   * 对于每个要绘制的物体
      * 创建一个 uniform 缓冲区
      * 创建一个引用该缓冲区的 bindGroup

* 渲染时：
   * 启动编码器和渲染通道
   * 对于每个要绘制的物体
      * 用该物体的 uniform 值更新类型化数组
      * 将类型化数组复制到该物体的 uniform 缓冲区
      * 根据需要设置管道、顶点和索引缓冲区
      * 编码命令以绑定该物体的 bindGroup(s)
      * 编码绘制命令
   * 结束渲染通道，完成编码器，提交命令缓冲区

让我们创建一个可以优化的示例，遵循上述步骤，然后再进行优化。

请注意，这是一个虚拟示例。我们只绘制一堆立方体，因此我们可以使用**实例化（instancing）**来优化，这在关于[存储缓冲区](webgpu-storage-buffers.html#a-instancing)和[顶点缓冲区](webgpu-vertex-buffers.html#a-instancing)的文章中有介绍。我不想用处理大量不同类型物体来扰乱代码。如果你的项目使用大量相同的模型，实例化肯定是一种很好的优化方式。植物、树木、岩石、垃圾等通常通过使用实例化来优化。对于其他模型来说，这种做法就不太常见了。

例如，一张桌子周围可能有 4、6 或 8 把椅子，使用实例化来绘制这些椅子可能是更快的做法，除非在 500+ 个要绘制的物体列表中，椅子是唯一的例外。在这种情况下，为了找出一种最优的数据组织方式来组织椅子使用实例化，但又找不到其他情况使用实例化，可能并不值得付出这样的努力。

上面这段话的重点是，在合适的时候使用实例化。如果你打算绘制数百个相同的东西，实例化可能是合适的。如果你只打算绘制少量相同的东西，那么专门为这些少量物体做特殊处理可能就不值得了。

无论如何，下面是我们的代码。我们使用了通用的初始化代码。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // 从画布获取 WebGPU 上下文并配置它
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

然后创建一个着色器模块。

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
      struct Uniforms {
        normalMatrix: mat3x3f,
        viewProjection: mat4x4f,
        world: mat4x4f,
        color: vec4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = uni.viewProjection * uni.world * vert.position;

        // 定向法线并传递给片段着色器
        vsOut.normal = uni.normalMatrix * vert.normal;

        // 计算表面的世界坐标
        let surfaceWorldPosition = (uni.world * vert.position).xyz;

        // 计算表面到光源的向量
        // 并传递给片段着色器
        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;

        // 计算表面到视点的向量
        // 并传递给片段着色器
        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;

        // 将纹理坐标传递给片段着色器
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // 因为 vsOut.normal 是一个阶段间变量
        // 它会被插值，所以不会是一个单位向量
        // 归一化后它会再次成为单位向量
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 通过取法线与到光源方向的点积来计算光照
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件为 false 时的值
            pow(specular, uni.shininess),  // 条件为 true 时的值
            specular > 0.0);               // 条件

        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 只将颜色部分（不包括 alpha）与光照相乘
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

这个着色器模块使用的光照类似于[其他文章中介绍的点光源与镜面高光](webgpu-lighting-point.html#a-specular)。它使用纹理是因为大多数 3D 模型都使用纹理，所以我觉得包含一个会更贴近实际。它将纹理乘以一个颜色，这样我们就可以调整每个立方体的颜色。它还包含了我们进行光照和[3D 投影立方体](webgpu-perspective-projection.html)所需的所有 uniform 值。

我们需要立方体的数据并将这些数据放入缓冲区。

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;
```

需要一个渲染管线。

```js
  const pipeline = device.createRenderPipeline({
    label: '带点光源和镜面高光的纹理模型',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // position
        {
          arrayStride: 3 * 4, // 3 个浮点数
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},
          ],
        },
        // normal
        {
          arrayStride: 3 * 4, // 3 个浮点数
          attributes: [
            {shaderLocation: 1, offset: 0, format: 'float32x3'},
          ],
        },
        // uvs
        {
          arrayStride: 2 * 4, // 2 个浮点数
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });
```

上述管线每个属性使用一个缓冲区。一个用于位置数据，一个用于法线数据，一个用于纹理坐标（UV）。它会剔除背面朝向的三角形，并需要一个深度纹理来进行深度测试。这些都是我们在其他文章中介绍过的内容。

让我们插入一些用于生成颜色和随机数的工具函数。

```js
/** 给定一个 CSS 颜色字符串，返回一个 0 到 255 之间的 4 值数组 */
const cssColorToRGBA8 = (() => {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  return cssColor => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  };
})();

/** 给定一个 CSS 颜色字符串，返回一个 0 到 1 之间的 4 值数组 */
const cssColorToRGBA = cssColor => cssColorToRGBA8(cssColor).map(v => v / 255);

/**
 * 给定 0 到 1 范围内的色调、饱和度和亮度值
 * 返回对应的 CSS hsl 字符串
 */
const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;

/**
 * 给定 0 到 1 范围内的色调、饱和度和亮度值
 * 返回一个 0 到 1 之间的 4 值数组
 */
const hslToRGBA = (h, s, l) => cssColorToRGBA(hsl(h, s, l));

/**
 * 返回 min 和 max 之间的随机数。
 * 如果未指定 min 和 max，则返回 0 到 1
 * 如果未指定 max，则返回 0 到 min
 */
function rand(min, max) {
  if (min === undefined) {
    max = 1;
    min = 0;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

/** 随机选择一个数组元素 */
const randomArrayElement = arr => arr[Math.random() * arr.length | 0];
```

希望这些都很容易理解。

现在创建一些纹理和一个采样器。我们将使用画布，在上面画一个 emoji，然后用[导入纹理文章中](webgpu-importing-textures.html)编写的 `createTextureFromSource` 函数从中创建纹理。

```js
  const textures = [
    '😂', '👾', '👍', '👀', '🌞', '🛟',
  ].map(s => {
    const size = 128;
    const ctx = new OffscreenCanvas(size, size).getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${size * 0.9}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const m = ctx.measureText(s);
    ctx.fillText(
      s,
      (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
      (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
    );
    return createTextureFromSource(device, ctx.canvas, {mips: true});
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'nearest',
  });
```

现在创建一组材质数据。我们之前没有这样做过，但这是一种常见的设置。Unity、Unreal、Blender、Three.js、Babylon.js 都有**材质（material）**的概念。一般来说，材质保存诸如材质的颜色、光泽度，以及使用哪种纹理等信息。

我们创建 20 种"材质"，然后为每个立方体随机选择一种材质。

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);
    materials.push({
      color,
      shininess,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

现在为每个要绘制的物体（立方体）创建数据。我们最多支持 30000 个。像以前一样，为每个物体创建一个 uniform 缓冲区，以及一个可以更新 uniform 值的类型化数组。我们还为每个物体创建一个 bind group。然后选择一些随机值来定位和动画每个物体。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // 各 uniform 值在 float32 索引中的偏移量
    const kNormalMatrixOffset = 0;
    const kViewProjectionOffset = 12;
    const kWorldOffset = 28;
    const kColorOffset = 44;
    const kLightWorldPositionOffset = 48;
    const kViewWorldPositionOffset = 52;
    const kShininessOffset = 55;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const viewProjectionValue = uniformValues.subarray(
        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
    const lightWorldPositionValue = uniformValues.subarray(
        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
    const viewWorldPositionValue = uniformValues.subarray(
        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: '物体的 bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
      viewProjectionValue,
      colorValue,
      lightWorldPositionValue,
      viewWorldPositionValue,
      shininessValue,

      axis,
      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

我们预创建一个渲染通道描述符，在渲染时更新它以开始渲染通道。

```js
  const renderPassDescriptor = {
    label: '我们的基本画布渲染通道',
    colorAttachments: [
      {
        // view: <- 在渲染时填充
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- 在渲染时填充
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
```

需要一个简单的 UI 来调整我们绘制物体的数量。

```js
  const settings = {
    numObjects: 1000,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
```

现在编写渲染循环。

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // 转换为秒
    const deltaTime = time - then;
    then = time;


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

在渲染循环内部更新渲染通道描述符。如果深度纹理不存在或其大小与画布纹理不同，则创建一个。我们在[3D 文章](webgpu-orthographic-projection.html#a-depth-textures)中这样做过。

```js
    // 从画布上下文获取当前纹理
    // 并将其设置为要渲染到的纹理
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    // 如果没有深度纹理或其大小与 canvasTexture 不同
    // 则创建一个新的深度纹理
    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;
```

启动命令缓冲区和渲染通道，并设置顶点和索引缓冲区。

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setVertexBuffer(1, normalBuffer);
    pass.setVertexBuffer(2, texcoordBuffer);
    pass.setIndexBuffer(indicesBuffer, 'uint16');
```

然后计算 viewProjection 矩阵，像[透视投影文章](webgpu-perspective-projection.html)中介绍的那样。

```js
+  const degToRad = d => d * Math.PI / 180;

  function render(time) {
    ...

+    const aspect = canvas.clientWidth / canvas.clientHeight;
+    const projection = mat4.perspective(
+        degToRad(60),
+        aspect,
+        1,      // zNear
+        2000,   // zFar
+    );
+
+    const eye = [100, 150, 200];
+    const target = [0, 0, 0];
+    const up = [0, 1, 0];
+
+    // 计算视图矩阵
+    const viewMatrix = mat4.lookAt(eye, target, up);
+
+    // 组合视图和投影矩阵
+    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
```

现在遍历所有物体并绘制它们，对于每个物体，我们需要更新其所有 uniform 值，将 uniform 值复制到其 uniform 缓冲区，绑定该物体的 bind group，然后绘制。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];

      // 将 viewProjectionMatrix 复制到该物体的 uniform 值中
      viewProjectionValue.set(viewProjectionMatrix);

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      // 复制材质值
      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      // 将 uniform 值上传到 uniform 缓冲区
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

> 注意，标记为"计算世界矩阵"的部分并不常见。更常见的做法是使用[场景图](webgpu-scene-graphs.html)，但这会使示例更加复杂。我们需要一个展示动画效果的东西，所以我临时拼凑了这个实现。

然后结束渲染通道，完成命令缓冲区，并提交它。

```js
+    pass.end();
+
+    const commandBuffer = encoder.finish();
+    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

还需要添加一些处理。添加调整大小的代码。

```js
+  const canvasToSizeMap = new WeakMap();

  function render(time) {
    time *= 0.001;  // 转换为秒
    const deltaTime = time - then;
    then = time;

+    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+
+    // 如果画布大小已经是目标大小就不要设置，因为设置可能会很慢
+    if (canvas.width !== width || canvas.height !== height) {
+      canvas.width = width;
+      canvas.height = height;
+    }

    // 从画布上下文获取当前纹理
    // 并将其设置为要渲染到的纹理
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

+  const observer = new ResizeObserver(entries => {
+    entries.forEach(entry => {
+      canvasToSizeMap.set(entry.target, {
+        width: Math.max(1, Math.min(entry.contentBoxSize[0].inlineSize, device.limits.maxTextureDimension2D)),
+        height: Math.max(1, Math.min(entry.contentBoxSize[0].blockSize, device.limits.maxTextureDimension2D)),
+      });
+    });
+  });
+  observer.observe(canvas);
```

还需要添加一些计时功能。我们将使用[计时文章](webgpu-timing.html)中制作的 `NonNegativeRollingAverage` 和 `TimingHelper` 类。

```js
// 见 https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import TimingHelper from './resources/js/timing-helper.js';
// 见 https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import NonNegativeRollingAverage from './resources/js/non-negative-rolling-average.js';

const fpsAverage = new NonNegativeRollingAverage();
const jsAverage = new NonNegativeRollingAverage();
const gpuAverage = new NonNegativeRollingAverage();
const mathAverage = new NonNegativeRollingAverage();
```

然后从渲染代码开始到结束计时 JavaScript 部分。

```js
  function render(time) {
    ...

+    const startTimeMs = performance.now();

    ...

+    const elapsedTimeMs = performance.now() - startTimeMs;
+    jsAverage.addSample(elapsedTimeMs);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

对 JavaScript 中进行 3D 数学运算的部分计时。

```js
  function render(time) {
    ...

+    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
+      const mathTimeStartMs = performance.now();

      // 将 viewProjectionMatrix 复制到该物体的 uniform 值中
      viewProjectionValue.set(viewProjectionMatrix);

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

+      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // 将 uniform 值上传到 uniform 缓冲区
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
    jsAverage.addSample(elapsedTimeMs);
+    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

对 `requestAnimationFrame` 回调之间的时间计时。

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // 转换为秒
    const deltaTime = time - then;
    then = time;

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
+    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

对渲染通道计时。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
  const device = await adapter?.requestDevice();
-  const device = await adapter?.requestDevice({
+  const canTimestamp = adapter.features.has('timestamp-query');
+  const device = await adapter?.requestDevice({
+    requiredFeatures: [
+      ...(canTimestamp ? ['timestamp-query'] : []),
+     ],
+  });
  if (!device) {
    fail('could not init WebGPU');
  }

+  const timingHelper = new TimingHelper(device);

  ...

  function render(time) {
    ...

-    const pass = encoder.beginRenderPass(renderPassEncoder);
+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);

    ...

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

+    timingHelper.getResult().then(gpuTime => {
+      gpuAverage.addSample(gpuTime / 1000);
+    });

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

还需要显示计时数据。

```js
async function main() {
  ...

  const timingHelper = new TimingHelper(device);
+  const infoElem = document.querySelector('#info');

  ...

  function render(time) {
    ...

    timingHelper.getResult().then(gpuTime => {
      gpuAverage.addSample(gpuTime / 1000);
    });

    const elapsedTimeMs = performance.now() - startTimeMs;
    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);

+    infoElem.textContent = `\
+js  : ${jsAverage.get().toFixed(1)}ms
+math: ${mathAverage.get().toFixed(1)}ms
+fps : ${fpsAverage.get().toFixed(0)}
+gpu : ${canTimestamp ? `${(gpuAverage.get() / 1000).toFixed(1)}ms` : 'N/A'}
+`;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

还有一件事，为了更好地比较。我们现在有一个问题：每个可见的立方体的每个像素都会被渲染或至少被检查是否需要渲染。由于我们没有优化像素渲染本身，而是优化 WebGPU 本身的使用，能够绘制到 1x1 像素的画布上可能会有帮助。这有效地移除了几乎所有光栅化三角形所花费的时间，而只留下我们代码中做数学运算和与 WebGPU 通信的部分。

所以添加一个选项来做到这一点。

```js
  const settings = {
    numObjects: 1000,
+    render: true,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
+  gui.add(settings, 'render');

  let depthTexture;
  let then = 0;
  let frameCount = 0;

  function render(time) {
    time *= 0.001;  // 转换为秒
    const deltaTime = time - then;
    then = time;
    ++frameCount;

    const startTimeMs = performance.now();

-    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+    const {width, height} = settings.render
+       ? canvasToSizeMap.get(canvas) ?? canvas
+       : { width: 1, height: 1 };
```

现在，如果取消勾选 'render'，我们将移除几乎所有的，嗯，渲染工作。

就这样，我们有了第一个"未优化"的示例。它遵循了文章开头列出的步骤，并且可以正常工作。

{{{example url="../webgpu-optimization-none.html"}}}

增加物体数量，看看你的帧率什么时候开始下降。对于我来说，在 75Hz 显示器上使用 M1 Mac，在帧率下降之前大约可以渲染 8000 个立方体。

# <a id="a-mapped-on-creation"></a> 优化：创建时映射（Mapped On Creation）

在上面的示例中，以及本网站的大多数示例中，我们使用 `writeBuffer` 将数据复制到顶点或索引缓冲区。作为一个非常小的优化，对于这种特定情况，在创建缓冲区时可以传入 `mappedAtCreation: true`。这有两个好处。

1. 将数据放入新缓冲区会稍微快一些

2. 不必在缓冲区的 usage 中添加 `GPUBufferUsage.COPY_DST`

   这假设你之后不会通过 `writeBuffer` 或其他复制到缓冲区的函数来更改数据。

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
-      usage: usage | GPUBufferUsage.COPY_DST,
+      usage: usage,
+      mappedAtCreation: true,
    });
-    device.queue.writeBuffer(buffer, 0, data);
+    const dst = new Uint8Array(buffer.getMappedRange());
+    dst.set(new Uint8Array(data.buffer));
+    buffer.unmap();
    return buffer;
  }
```

请注意，这种优化只在创建时有效，因此不会影响渲染时的性能。

# <a id="a-pack-verts"></a> 优化：打包和交错顶点数据

在上面的示例中，我们有 3 个属性，一个用于位置，一个用于法线，一个用于纹理坐标。通常会有 4 到 6 个属性，包括[法线映射的切线](webgpu-normal-mapping.html)，如果有[带骨骼的模型](webgpu-skinning.html)，还会添加权重和关节。

在上面的示例中，每个属性都使用自己的缓冲区。这在 CPU 和 GPU 上都较慢。在 JavaScript 的 CPU 上，因为我们每切换一个要绘制的模型就需要调用一次 `setVertexBuffer`，当模型很多时调用次数会很多。

试想一下，不仅仅是一个立方体，我们有数百个模型。每次切换要绘制的模型时，我们最多需要调用 `setVertexBuffer` 6 次。100 * 6 次调用 = 600 次调用。

遵循"工作量越少 = 速度越快"的规则，如果我们把属性的数据合并到一个缓冲区中，那么每个模型只需要调用一次 `setVertexBuffer`。100 次调用。那就相当于快了 6 倍！

在 GPU 上，加载内存中相邻的数据通常比从不同的内存位置加载更快，所以不仅要将单个模型的顶点数据放入单个缓冲区，交错数据会更好。

让我们做出这个改变。

```js
-  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
-  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
-  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
+  const vertexData = new Float32Array([
+  // position       normal        texcoord
+     1,  1, -1,     1,  0,  0,    1, 0,
+     1,  1,  1,     1,  0,  0,    0, 0,
+     1, -1,  1,     1,  0,  0,    0, 1,
+     1, -1, -1,     1,  0,  0,    1, 1,
+    -1,  1,  1,    -1,  0,  0,    1, 0,
+    -1,  1, -1,    -1,  0,  0,    0, 0,
+    -1, -1, -1,    -1,  0,  0,    0, 1,
+    -1, -1,  1,    -1,  0,  0,    1, 1,
+    -1,  1,  1,     0,  1,  0,    1, 0,
+     1,  1,  1,     0,  1,  0,    0, 0,
+     1,  1, -1,     0,  1,  0,    0, 1,
+    -1,  1, -1,     0,  1,  0,    1, 1,
+    -1, -1, -1,     0, -1,  0,    1, 0,
+     1, -1, -1,     0, -1,  0,    0, 0,
+     1, -1,  1,     0, -1,  0,    0, 1,
+    -1, -1,  1,     0, -1,  0,    1, 1,
+     1,  1,  1,     0,  0,  1,    1, 0,
+    -1,  1,  1,     0,  0,  1,    0, 0,
+    -1, -1,  1,     0,  0,  1,    0, 1,
+     1, -1,  1,     0,  0,  1,    1, 1,
+    -1,  1, -1,     0,  0, -1,    1, 0,
+     1,  1, -1,     0,  0, -1,    0, 0,
+     1, -1, -1,     0,  0, -1,    0, 1,
+    -1, -1, -1,     0,  0, -1,    1, 1,
+  ]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

-  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
-  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
-  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
+  const vertexBuffer = createBufferWithData(device, vertexData, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;

  const pipeline = device.createRenderPipeline({
    label: '带点光源和镜面高光的纹理模型',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
-        // position
-        {
-          arrayStride: 3 * 4, // 3 个浮点数
-          attributes: [
-            {shaderLocation: 0, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // normal
-        {
-          arrayStride: 3 * 4, // 3 个浮点数
-          attributes: [
-            {shaderLocation: 1, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // uvs
-        {
-          arrayStride: 2 * 4, // 2 个浮点数
-          attributes: [
-            {shaderLocation: 2, offset: 0, format: 'float32x2'},
-          ],
-        },
+        {
+          arrayStride: (3 + 3 + 2) * 4, // 8 个浮点数
+          attributes: [
+            {shaderLocation: 0, offset: 0 * 4, format: 'float32x3'}, // position
+            {shaderLocation: 1, offset: 3 * 4, format: 'float32x3'}, // normal
+            {shaderLocation: 2, offset: 6 * 4, format: 'float32x2'}, // texcoord
+          ],
+        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  ...
-    pass.setVertexBuffer(0, positionBuffer);
-    pass.setVertexBuffer(1, normalBuffer);
-    pass.setVertexBuffer(2, texcoordBuffer);
+    pass.setVertexBuffer(0, vertexBuffer);
```

上面我们将所有 3 个属性的数据放入了一个缓冲区，然后修改了渲染通道，使其期望数据交错到一个缓冲区中。

注意：如果你要加载 glTF 文件，最好预先处理它们，使顶点数据交错到一个缓冲区中（最佳方案），或者在加载时交错数据。

# 优化：分离 uniform 缓冲区（共享、材质、每个模型）

我们的示例目前每个物体都有一个 uniform 缓冲区。

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  viewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
};
```

其中一些 uniform 值，如 `viewProjection`、`lightWorldPosition` 和 `viewWorldPosition` 是可以共享的。

我们可以在着色器中分离这些值，使用 2 个 uniform 缓冲区。一个用于共享值，一个用于**每个物体值**。

```wgsl
struct GlobalUniforms {
  viewProjection: mat4x4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
};
struct PerObjectUniforms {
  normalMatrix: mat3x3f,
  world: mat4x4f,
  color: vec4f,
  shininess: f32,
};
```

通过这一改变，我们将节省把 `viewProjection`、`lightWorldPosition` 和 `viewWorldPosition` 复制到每个 uniform 缓冲区的操作。每物体使用 `device.queue.writeBuffer` 复制的数据也会更少。

这是新的着色器。

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
-      struct Uniforms {
-        normalMatrix: mat3x3f,
-        viewProjection: mat4x4f,
-        world: mat4x4f,
-        color: vec4f,
-        lightWorldPosition: vec3f,
-        viewWorldPosition: vec3f,
-        shininess: f32,
-      };
-
+      struct GlobalUniforms {
+        viewProjection: mat4x4f,
+        lightWorldPosition: vec3f,
+        viewWorldPosition: vec3f,
+      };
+      struct PerObjectUniforms {
+        normalMatrix: mat3x3f,
+        world: mat4x4f,
+        color: vec4f,
+        shininess: f32,
+      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
-      @group(0) @binding(2) var<uniform> uni: Uniforms;
+      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
+      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
-        vsOut.position = uni.viewProjection * uni.world * vert.position;
+        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // 定向法线并传递给片段着色器
-        vsOut.normal = uni.normalMatrix * vert.normal;
+        vsOut.normal = obj.normalMatrix * vert.normal;

        // 计算表面的世界坐标
-        let surfaceWorldPosition = (uni.world * vert.position).xyz;
+        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // 计算表面到光源的向量
        // 并传递给片段着色器
-        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // 计算表面到视点的向量
        // 并传递给片段着色器
-        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // 将纹理坐标传递给片段着色器
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // 因为 vsOut.normal 是一个阶段间变量
        // 它会被插值，所以不会是一个单位向量
        // 归一化后它会再次成为单位向量
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 通过取法线与到光源方向的点积来计算光照
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件为 false 时的值
-            pow(specular, uni.shininess),  // 条件为 true 时的值
+            pow(specular, obj.shininess),  // 条件为 true 时的值
            specular > 0.0);               // 条件

-        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 只将颜色部分（不包括 alpha）与光照相乘
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

需要为全局 uniform 创建一个全局 uniform 缓冲区。

```js
  const globalUniformBufferSize = (16 + 4 + 4) * 4;
  const globalUniformBuffer = device.createBuffer({
    label: 'global uniforms',
    size: globalUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const globalUniformValues = new Float32Array(globalUniformBufferSize / 4);

  const kViewProjectionOffset = 0;
  const kLightWorldPositionOffset = 16;
  const kViewWorldPositionOffset = 20;

  const viewProjectionValue = globalUniformValues.subarray(
      kViewProjectionOffset, kViewProjectionOffset + 16);
  const lightWorldPositionValue = globalUniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = globalUniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
```

然后从每个物体的 uniform 缓冲区中删除这些 uniform，并添加全局 uniform 缓冲区到每个物体的 bind group。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // 各 uniform 值在 float32 索引中的偏移量
    const kNormalMatrixOffset = 0;
-    const kViewProjectionOffset = 12;
-    const kWorldOffset = 28;
-    const kColorOffset = 44;
-    const kLightWorldPositionOffset = 48;
-    const kViewWorldPositionOffset = 52;
-    const kShininessOffset = 55;
+    const kWorldOffset = 12;
+    const kColorOffset = 28;
+    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const viewProjectionValue = uniformValues.subarray(
-        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const lightWorldPositionValue = uniformValues.subarray(
-        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
-    const viewWorldPositionValue = uniformValues.subarray(
-        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: '物体的 bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
+        { binding: 3, resource: globalUniformBuffer },
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      viewProjectionValue,
      colorValue,
-      lightWorldPositionValue,
-      viewWorldPositionValue,
      shininessValue,
      material,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

然后在渲染时，只在渲染物体的循环外部更新一次全局 uniform 缓冲区。

```js
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    // 计算视图矩阵
    const viewMatrix = mat4.lookAt(eye, target, up);

    // 组合视图和投影矩阵
-    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
+    mat4.multiply(projection, viewMatrix, viewProjectionValue);
+
+    lightWorldPositionValue.set([-10, 30, 300]);
+    viewWorldPositionValue.set(eye);
+
+    device.queue.writeBuffer(globalUniformBuffer, 0, globalUniformValues);

    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        viewProjectionValue,
        colorValue,
-        lightWorldPositionValue,
-        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

-      // 将 viewProjectionMatrix 复制到该物体的 uniform 值中
-      viewProjectionValue.set(viewProjectionMatrix);

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;
      colorValue.set(color);
-      lightWorldPositionValue.set([-10, 30, 300]);
-      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // 将 uniform 值上传到 uniform 缓冲区
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    pass.end();
```

这并没有改变调用 WebGPU 的次数，实际上还增加了 1 次。但是，减少了我们每个模型要做的大量工作。

{{{example url="../webgpu-optimization-step3-global-vs-per-object-uniforms.html"}}}

在我的机器上，通过这一改变，数学计算部分下降了约 16%。

# 优化：进一步分离 uniform

3D 库中常见的组织方式是有"模型"（顶点数据）、"材质"（颜色、光泽度和纹理）、"灯光"（使用哪些灯光）、"视图信息"（视图和投影矩阵）。特别是，在我们的示例中，`color` 和 `shininess` 从不改变，所以每帧都将它们复制到 uniform 缓冲区是一种浪费。

让我们为每种材质创建一个 uniform 缓冲区。我们将在初始化时将材质设置复制到其中，然后将它们添加到 bind group 中。

首先修改着色器以使用另一个 uniform 缓冲区。

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
      struct GlobalUniforms {
        viewProjection: mat4x4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
      };

+      struct MaterialUniforms {
+        color: vec4f,
+        shininess: f32,
+      };

      struct PerObjectUniforms {
        normalMatrix: mat3x3f,
        world: mat4x4f,
-        color: vec4f,
-        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;
+      @group(0) @binding(4) var<uniform> material: MaterialUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // 定向法线并传递给片段着色器
        vsOut.normal = obj.normalMatrix * vert.normal;

        // 计算表面的世界坐标
        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // 计算表面到光源的向量
        // 并传递给片段着色器
        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // 计算表面到视点的向量
        // 并传递给片段着色器
        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // 将纹理坐标传递给片段着色器
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // 因为 vsOut.normal 是一个阶段间变量
        // 它会被插值，所以不会是一个单位向量
        // 归一化后它会再次成为单位向量
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 通过取法线与到光源方向的点积来计算光照
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件为 false 时的值
-            pow(specular, obj.shininess),  // 条件为 true 时的值
+            pow(specular, material.shininess),  // 条件为 true 时的值
            specular > 0.0);               // 条件

-        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = material.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 只将颜色部分（不包括 alpha）与光照相乘
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

然后为每种材质创建一个 uniform 缓冲区。

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);

+    const materialValues = new Float32Array([
+      ...color,
+      shininess,
+      0, 0, 0,  // padding
+    ]);
+    const materialUniformBuffer = createBufferWithData(
+      device,
+      materialValues,
+      GPUBufferUsage.UNIFORM,
+    );

    materials.push({
-      color,
-      shininess,
+      materialUniformBuffer,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

在设置每个物体的信息时，不再需要传递材质设置。只需要将材质的 uniform 缓冲区添加到物体的 bind group 中。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // 各 uniform 值在 float32 索引中的偏移量
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;
-    const kColorOffset = 28;
-    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
-    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const shininessValue = uniformValues.subarray(
-        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: '物体的 bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
        { binding: 3, resource: globalUniformBuffer },
+        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      colorValue,
-      shininessValue,

      axis,
-      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

在渲染时也不需要再处理这些东西了。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        colorValue,
-        shininessValue,

        axis,
-        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

-      const {color, shininess} = material;
-      colorValue.set(color);
-      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // 将 uniform 值上传到 uniform 缓冲区
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

{{{example url="../webgpu-optimization-step4-material-uniforms.html"}}}

# 优化：使用一个大 uniform 缓冲区配合缓冲区偏移

目前，每个物体都有自己的 uniform 缓冲区。在渲染时，对于每个物体，我们用该物体的 uniform 值更新一个类型化数组，然后调用 `device.queue.writeBuffer` 更新该单个 uniform 缓冲区的值。如果我们渲染 8000 个物体，那就是 8000 次对 `device.queue.writeBuffer` 的调用。

相反，我们可以创建一个更大的 uniform 缓冲区。然后为每个物体设置 bind group 使用该较大缓冲区的各自部分。在渲染时，我们可以在一个大的类型化数组中更新所有物体的所有值，然后只调用一次 `device.queue.writeBuffer`，这应该会更快。

首先分配一个大 uniform 缓冲区和大类型化数组。Uniform 缓冲区的偏移量有一个最小对齐要求，默认为 256 字节，所以我们将每个物体所需的大小向上取整到 256 字节。

```js
+/** 将 v 向上取整到 alignment 的倍数 */
+const roundUp = (v, alignment) => Math.ceil(v / alignment) * alignment;

  ...

+  const uniformBufferSize = (12 + 16) * 4;
+  const uniformBufferSpace = roundUp(uniformBufferSize, device.limits.minUniformBufferOffsetAlignment);
+  const uniformBuffer = device.createBuffer({
+    label: 'uniforms',
+    size: uniformBufferSpace * maxObjects,
+    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+  });
+  const uniformValues = new Float32Array(uniformBuffer.size / 4);
```

现在可以修改每个物体的视图以查看该大类型化数组。也可以设置 bind group 以使用大 uniform 缓冲区的正确部分。

```js
  for (let i = 0; i < maxObjects; ++i) {
+    const uniformBufferOffset = i * uniformBufferSpace;
+    const f32Offset = uniformBufferOffset / 4;

    // 各 uniform 值在 float32 索引中的偏移量
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;

-    const normalMatrixValue = uniformValues.subarray(
-        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        kWorldOffset, kWorldOffset + 16);
+    const normalMatrixValue = uniformValues.subarray(
+        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+    const worldValue = uniformValues.subarray(
+        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: '物体的 bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
-        { binding: 2, resource: uniformBuffer },
+        {
+          binding: 2,
+          resource: {
+            buffer: uniformBuffer,
+            offset: uniformBufferOffset,
+            size: uniformBufferSize,
+          },
+        },
        { binding: 3, resource: globalUniformBuffer },
        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      uniformBuffer,
-      uniformValues,

      normalMatrixValue,
      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

在渲染时更新所有物体的值，然后只调用一次 `device.queue.writeBuffer`。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
-        uniformBuffer,
-        uniformValues,
        normalMatrixValue,
        worldValue,

        axis,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

-      // 将 uniform 值上传到 uniform 缓冲区
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

+    // 将所有 uniform 值上传到 uniform 缓冲区
+    if (settings.numObjects) {
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
+    }

    pass.end();
```

{{{example url="../webgpu-optimization-step5-use-buffer-offsets.html"}}}

在我的机器上，这减少了 40% 的 JavaScript 时间！

# 优化：使用映射缓冲区

当我们调用 `device.queue.writeBuffer` 时，WebGPU 会将类型化数组中的数据复制一份。它将数据复制到 GPU 进程（一个与 GPU 通信的独立进程，用于安全隔离）。在 GPU 进程中，数据随后被复制到 GPU 缓冲区。

我们可以通过使用映射缓冲区来跳过其中一次复制。我们映射一个缓冲区，直接将 uniform 值更新到该映射缓冲区中。然后取消映射缓冲区，并发出 `copyBufferToBuffer` 命令复制到 uniform 缓冲区。这将节省一次复制操作。

WebGPU 的映射是异步的，所以不是映射一个缓冲区并等待它就绪，而是保留一个已映射缓冲区的数组。每一帧，我们获取一个已经映射的缓冲区或创建一个已经映射的新缓冲区。渲染后，我们将设置一个回调，在缓冲区可用时映射它，并将其放回已映射缓冲区列表中。这样我们就永远不需要等待映射缓冲区。

首先创建一个映射缓冲区数组，以及一个函数来获取预映射的缓冲区或创建一个新的。

```js
  const mappedTransferBuffers = [];
  const getMappedTransferBuffer = () => {
    return mappedTransferBuffers.pop() || device.createBuffer({
      label: 'transfer buffer',
      size: uniformBufferSpace * maxObjects,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
  };
```

无法再预先创建类型化数组视图，因为映射缓冲区会给我们一个新的 `ArrayBuffer`。所以映射后必须创建新的类型化数组视图。

```js
+  // 各 uniform 值在 float32 索引中的偏移量
+  const kNormalMatrixOffset = 0;
+  const kWorldOffset = 12;

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferOffset = i * uniformBufferSpace;
-    const f32Offset = uniformBufferOffset / 4;
-
-    // 各 uniform 值在 float32 索引中的偏移量
-    const kNormalMatrixOffset = 0;
-    const kWorldOffset = 12;
-
-    const normalMatrixValue = uniformValues.subarray(
-        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);
    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: '物体的 bind group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: { buffer: uniformBuffer, offset: uniformBufferOffset, size: uniformBufferSize }},
        { binding: 3, resource: globalUniformBuffer },
        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      normalMatrixValue,
-      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

在渲染时，在开始遍历物体之前，在命令编码器上编码一条将传输缓冲区复制到 uniform 缓冲区的命令。这是因为 `copyBufferToBuffer` 命令是 `GPUCommandEncoder` 上的一个命令。我们需要它在物体被渲染之前运行，但我们在循环遍历物体的同时正在编码渲染通道命令来渲染它们。以前，我们在更新类型化数组后调用 `device.queue.writeBuffer`，当然，由于我们还没有对命令调用 `submit`，它会先执行。不过在这种情况下，我们的复制实际上是一个命令，所以我们必须在绘制命令之前对其进行编码。这没关系，因为记住，它只是一个命令，在提交命令缓冲区之前不会执行，这意味着我们仍然可以更新传输缓冲区，因为复制还没有发生。


```js
    const encoder = device.createCommandEncoder();
-    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
-    pass.setPipeline(pipeline);
-    pass.setVertexBuffer(0, vertexBuffer);
-    pass.setIndexBuffer(indicesBuffer, 'uint16');

    ...

    let mathElapsedTimeMs = 0;

+    const transferBuffer = getMappedTransferBuffer();
+    const uniformValues = new Float32Array(transferBuffer.getMappedRange());

+    // 将 uniform 值从传输缓冲区复制到 uniform 缓冲区
+    if (settings.numObjects) {
+      // 记住，这只是编码一个稍后执行的命令
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      encoder.copyBufferToBuffer(transferBuffer, 0, uniformBuffer, 0, size);
+    }

+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
+    pass.setPipeline(pipeline);
+    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setIndexBuffer(indicesBuffer, 'uint16');

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
-        normalMatrixValue,
-        worldValue,
        axis,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

+      // 在映射缓冲区中创建视图
+      const uniformBufferOffset = i * uniformBufferSpace;
+      const f32Offset = uniformBufferOffset / 4;
+      const normalMatrixValue = uniformValues.subarray(
+          f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+      const worldValue = uniformValues.subarray(
+          f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

      // 计算世界矩阵
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 求逆并转置到 normalMatrix 值中
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
+    transferBuffer.unmap();

-    // 将所有 uniform 值上传到 uniform 缓冲区
-    if (settings.numObjects) {
-      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
-      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
-    }

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

最后，一旦提交了命令缓冲区，我们立即再次映射该缓冲区。映射是异步的，所以当它最终准备就绪时，我们会将其添加回已映射缓冲区列表中。

```js
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

+    transferBuffer.mapAsync(GPUMapMode.WRITE).then(() => {
+      mappedTransferBuffers.push(transferBuffer);
+    });
```

在我的机器上，这个版本在 75fps 下可以绘制大约 15000 个物体。比我们开始时多了约 87%。

{{{example url="../webgpu-optimization-step6-use-mapped-buffers.html"}}}

取消渲染选项后，差异更大。对于我来说，未优化的原始版本在 75fps 下是 9000 个，而这个最终版本是 18000 个。速度快了 2 倍！

其他可能有所帮助的事情

* **双缓冲大 uniform 缓冲区**

  这是一个可能的优化，因为 WebGPU 无法更新当前正在使用的缓冲区。

  所以，假设你开始渲染（你调用 `device.queue.submit`）。GPU 开始使用我们的大 uniform 缓冲区进行渲染。你立即尝试更新该缓冲区。在这种情况下，WebGPU 必须暂停并等待 GPU 完成使用该缓冲区进行渲染。

  在上面的示例中，这种情况不太可能发生。我们不直接更新 uniform 缓冲区。相反，我们更新一个传输缓冲区，然后稍后请求 GPU 将其复制到 uniform 缓冲区。

  如果我们使用计算着色器直接在 GPU 上更新缓冲区，这个问题更有可能出现。

* **使用偏移量计算矩阵数学**

  我们在[矩阵数学系列](webgpu-matrix-math.html)中制作的数学库生成 `Float32Array` 作为输出并接受 `Float32Array` 作为输入。它可以就地修改 `Float32Array`。但是，它无法在某个偏移量处更新 `Float32Array`。
  
  这就是为什么在更新每个物体 uniform 值的循环中，对于每个物体我们必须在大映射缓冲区中创建 2 个 `Float32Array` 视图。对于 20000 个物体，那就是创建 40000 个这些临时视图。
  
  为每个输入添加偏移量会使它们使用起来很麻烦，但作为一个测试，我编写了一个修改版的数学函数，它接受偏移量。换句话说：

  ```js
      mat4.multiply(a, b, dst);
  ```

  变成了

  ```js
     mat4.multiply(a, aOffset, b, bOffset, dst, dstOffset);
  ```

  [使用偏移量似乎快约 7%](../webgpu-optimization-step6-use-mapped-buffers-math-w-offsets.html)。

  这取决于你自己判断是否值得。对我来说，就像我在文章开头提到的那样，我个人倾向于保持简单易用。我很少需要绘制 10000 个物体。但是，如果我想挤出更多性能，这是可能找到一些优化的地方之一。更有可能的是，如果需要达到那个程度，我会研究 WebAssembly。

* **直接映射 uniform 缓冲区**

  在上面的示例中，我们映射了一个传输缓冲区，一个只有 `COPY_SRC` 和 `MAP_WRITE` 使用标志的缓冲区。然后我们必须调用 `encoder.copyBufferToBuffer` 将该缓冲区的内容复制到实际的 uniform 缓冲区。

  如果我们能够直接映射 uniform 缓冲区并避免复制，那会好得多。不幸的是，在 WebGPU 版本 1 中无法使用此功能，但正在考虑在将来的某个时候将其作为可选功能提供，特别是对于某些基于 ARM 设备的*统一内存架构*。

* **间接绘制**

  间接绘制是指从 GPU 缓冲区获取参数的绘制命令。

  ```js
  pass.draw(vertexCount, instanceCount, firstVertex, firstInstance);  // 直接
  pass.drawIndirect(someBuffer, offsetIntoSomeBuffer);                // 间接
  ```

  在上面的间接情况下，`someBuffer` 是 GPU 缓冲区的一个 16 字节部分，包含 `[vertexCount, instanceCount, firstVertex, firstInstance]`。

  间接绘制的优点是你可以让 GPU 本身填充值。你甚至可以让 GPU 将 `vertexCount` 和/或 `instanceCount` 设置为零，当你不想绘制该物体时。

  使用间接绘制，你可以做诸如将所有物体的包围盒或包围球传递给 GPU，然后让 GPU 进行视锥体剔除，如果物体在视锥体内，它会更新该物体的间接绘制参数以进行绘制，否则会更新它们以不进行绘制。"视锥体剔除"是一种花哨的说法，表示"检查物体是否可能位于相机视锥体内"。我们在[透视投影文章](webgpu-perspective-projection.html)中讨论过视锥体。

* **渲染束（Render Bundles）**

  渲染束允许你预先录制一堆命令缓冲区命令，然后请求稍后执行。这可能很有用，特别是如果你的场景相对静态，意味着你不需要稍后添加或删除物体。

  有一篇很好的文章[在这里](https://toji.dev/webgpu-best-practices/render-bundles)，它结合了渲染束、间接绘制、GPU 视锥体剔除，展示了一些在特殊情况下获得更高速度的想法。

* 即时模式（Immediates）

  [即时模式（Immediates）](webgpu-immediates.html)是 2026 年新增的功能。这是一种向着色器发送少量数据的快速方法。
  它们可能不会像本文中的一些技术那样快，但可能是优化的第一步。

