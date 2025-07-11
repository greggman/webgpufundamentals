Title: WebGPU Uniforms
Description: 传递常量数据到 Shader
TOC: Uniforms

上一篇文章介绍了[Inter-stage 变量](webgpu-inter-stage-variables.html)。本文将介绍 uniforms。

uniforms 就像是着色器的全局变量。你可以在执行着色器之前设置它们的值，然后在着色器的每次迭代中都使用这些值。在下次 GPU 执行着色器时，你可以将其设置为其他值。

我们从[第一篇文章](webgpu-fundamentals.html)中的三角形示例开始，对其进行修改以使用 uniforms 值。

```js
const module = device.createShaderModule({
    label: 'triangle shaders with uniforms',
    code: `
+      struct OurStruct {
+        color: vec4f,
+        scale: vec2f,
+        offset: vec2f,
+      };
+
+      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

-        return vec4f(pos[vertexIndex], 0.0, 1.0);
+        return vec4f(
+          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
-        return vec4f(1, 0, 0, 1);
+        return ourStruct.color;
      }
    `,
});
```

首先，我们声明了一个包含 3 个成员的结构体

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

然后，我们声明了一个类型为该结构体的 uniform 变量。变量名为 `ourStruct`，类型为 `OurStruct`。

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

接下来，我们更改顶点着色器返回的内容，以使用 uniforms。

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

可以看到，我们将顶点位置乘以 scale，然后加上 offset。这样我们就可以设置三角形的大小并对其进行定位。

我们还修改了片段着色器，以返回 uniforms 的颜色

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

既然我们已经设置了着色器来使用 uniforms 值，就需要在 GPU 上创建一个缓冲区来保存 uniform 的值。

在继续这个话题之前，如果你从未处理过内存数据和大小，那么你有很多东西需要学习。这是一个很大的话题，因此这里有一篇关于这个话题的独立文章。如果你不知道如何在内存中布局结构体，请先[阅读这篇文章](webgpu-memory-layout.html)。然后再回到这里。本文将假定你已经[阅读过这篇文章](webgpu-memory-layout.html)。

[阅读完这篇文章](webgpu-memory-layout.html)后，我们就可以在缓冲区中填入与着色器中的结构体相匹配的数据了。

首先，我们创建一个缓冲区，并为其分配使用标志，这样它就可以与 uniforms 一起使用，我们也可以通过向其复制数据来进行更新。

```js
const uniformBufferSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // scale is 2 32bit floats (4bytes each)
    2 * 4; // offset is 2 32bit floats (4bytes each)
const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
```

然后，我们创建一个`TypedArray`，这样就可以在 JavaScript 中设置值了

```js
// create a typedarray to hold the values for the uniforms in JavaScript
const uniformValues = new Float32Array(uniformBufferSize / 4);
```

并填写结构体中 2 个以后不会改变的值。偏移量的计算方法我们在[有关内存布局的文章](webgpu-memory-layout.html)中已经介绍过。

```js
// offsets to the various uniform values in float32 indices
const kColorOffset = 0;
const kScaleOffset = 4;
const kOffsetOffset = 6;

uniformValues.set([0, 1, 0, 1], kColorOffset); // set the color
uniformValues.set([-0.5, -0.25], kOffsetOffset); // set the offset
```

上面我们将颜色设置为绿色。偏移量将使三角形向画布左侧移动 1/4，向下移动 1/8（请记住，剪辑空间从 -1 到 1 的宽度为 2 个单位，因此 0.25 是 2 的 1/8）。

接下来，正如[第一篇文章](webgpu-fundamentals.html#a-draw-diagram)中的图表所示，要让着色器了解我们的缓冲区，我们需要创建一个绑定组，并将缓冲区绑定到我们在着色器中设置的` @binding(?)` 上。

```js
const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: uniformBuffer }],
});
```

现在，在提交命令缓冲区之前，我们需要设置 `uniformValues` 的剩余值，然后将这些值复制到 GPU 上的缓冲区。我们将
在`render`函数的顶层完成这项工作。

```js
  function render() {
    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale

    // copy the values from JavaScript to the GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> 注：`writeBuffer` 是将数据复制到缓冲区的一种方法。
> [这篇文章](webgpu-copying-data.html)还介绍了其他几种方法。

我们将缩放比例设置为一半大小，同时考虑画布的纵横比，这样无论画布大小如何，三角形都能保持相同的宽高比例。

最后，我们需要在绘制前设置绑定组

```js
pass.setPipeline(pipeline);
+pass.setBindGroup(0, bindGroup);
pass.draw(3); // call our vertex shader 3 times
pass.end();
```

这样，我们就得到了一个绿色三角形，如图所示

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

对于这个三角形，我们在执行绘制命令时的状态是这样的

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

到目前为止，我们在着色器中使用的所有数据都是硬编码（顶点着色器中的三角形顶点位置和片段着色器中的颜色）。现在我们可以在着色器中传递数值，从而使用不同的数据多次调用`draw`。

我们可以通过更新单个缓冲区，在不同的地方以不同的偏移、比例和颜色进行绘制。但需要注意的是，我们的命令会被放入命令缓冲区，直到我们提交命令后才会真正执行。因此，我们**不能这样做**

```js
// BAD!
for (let x = -1; x < 1; x += 0.1) {
    uniformValues.set([x, x], kOffsetOffset);
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
    pass.draw(3);
}
pass.end();

// Finish encoding and submit the commands
const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
```

因为，如上图所示，`device.queue.xxx` 函数发生在 `queue` 中，而 `pass.xxx` 函数只是对命令缓冲区中的命令进行编码。当我们使用命令缓冲区实际调用`submit`时，缓冲区中唯一的内容就是我们最后写入的值。

我们可以将其改为

```js
// BAD! Slow!
for (let x = -1; x < 1; x += 0.1) {
    uniformValues.set([x, 0], kOffsetOffset);
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();

    // Finish encoding and submit the commands
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}
```

上面的代码更新了一个缓冲区，创建了一个命令缓冲区，添加了绘制一样东西的命令，然后完成命令缓冲区并提交。这样做是可行的，但速度很慢，原因是多方面的。最佳实践是在一个命令缓冲区中完成更多工作。

因此，我们可以为每个要绘制的对象创建一个统一的缓冲区。而且，由于缓冲区是通过绑定组间接使用的，因此我们也需要为每个要绘制的对象创建一个绑定组。然后，我们就可以把所有要绘制的内容都放到一个命令缓冲区中。

让我们开始吧

首先编写一个随机函数

```js
// A random number between [min and max)
// With 1 argument it will be [0 to min)
// With no arguments it will be [0 to 1)
const rand = (min, max) => {
    if (min === undefined) {
        min = 0;
        max = 1;
    } else if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
};
```

现在，让我们用各种颜色和偏移量设置缓冲区，然后就可以绘制各种单独的东西了。

```js
  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

+  const kNumObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < kNumObjects; ++i) {
+    const uniformBuffer = device.createBuffer({
+      label: `uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // create a typedarray to hold the values for the uniforms in JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-    uniformValues.set([0, 1, 0, 1], kColorOffset);        // set the color
-    uniformValues.set([-0.5, -0.25], kOffsetOffset);      // set the offset
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset
+
+    const bindGroup = device.createBindGroup({
+      label: `bind group for obj: ${i}`,
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer},
+      ],
+    });
+
+    objectInfos.push({
+      scale: rand(0.2, 0.5),
+      uniformBuffer,
+      uniformValues,
+      bindGroup,
+    });
+  }
```

我们还没有在缓冲区中设置值，因为我们希望缓冲区考虑到画布的长宽比，而在渲染之前我们不会知道画布的长宽比。

在渲染时，我们会用调整后的正确比例更新所有缓冲区。

```js
  function render() {
-    // Set the uniform values in our JavaScript side Float32Array
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale
-
-    // copy the values from JavaScript to the GPU
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // Set the uniform values in our JavaScript side Float32Array
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // call our vertex shader 3 times
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

请再次记住，`encoder`和`pass`对象只是将命令编码到命令缓冲区中。因此，当`render`函数退出时，我们实际上已经按照这个顺序发出了这些*命令*。

```js
device.queue.writeBuffer(...) // update uniform buffer 0 with data for object 0
device.queue.writeBuffer(...) // update uniform buffer 1 with data for object 1
device.queue.writeBuffer(...) // update uniform buffer 2 with data for object 2
device.queue.writeBuffer(...) // update uniform buffer 3 with data for object 3
...
// execute commands that draw 100 things, each with their own uniform buffer.
device.queue.submit([commandBuffer]);
```

这是结果

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

说到这里，还有一件事需要说明。你可以在着色器中自由引用多个 uniform 缓冲区。在上面的示例中，每次绘制时我们都会更新`scale`，然后通过 `writeBuffer` 将对象的 `uniformValues` 上传到相应的 uniform 缓冲区。但是，只有`scale`在更新，颜色和偏移量没有更新，因此我们在上传颜色和偏移量上浪费了时间。

我们可以将`uniforms`分为需要设置一次的`uniforms`和每次绘制时都要更新的`uniforms`。

```js
const module = device.createShaderModule({
    code: `
      struct OurStruct {
        color: vec4f,
-        scale: vec2f,
        offset: vec2f,
      };

+      struct OtherStruct {
+        scale: vec2f,
+      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
+      @group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(
-          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
+          pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
});
```

当我们需要为每个要绘制的对象设置 2 个`uniform`缓冲区时

```js
-  // create a buffer for the uniform values
-  const uniformBufferSize =
-    4 * 4 + // color is 4 32bit floats (4bytes each)
-    2 * 4 + // scale is 2 32bit floats (4bytes each)
-    2 * 4;  // offset is 2 32bit floats (4bytes each)
-  // offsets to the various uniform values in float32 indices
-  const kColorOffset = 0;
-  const kScaleOffset = 4;
-  const kOffsetOffset = 6;
+  // create 2 buffers for the uniform values
+  const staticUniformBufferSize =
+    4 * 4 + // color is 4 32bit floats (4bytes each)
+    2 * 4 + // offset is 2 32bit floats (4bytes each)
+    2 * 4;  // padding
+  const uniformBufferSize =
+    2 * 4;  // scale is 2 32bit floats (4bytes each)
+
+  // offsets to the various uniform values in float32 indices
+  const kColorOffset = 0;
+  const kOffsetOffset = 4;
+
+  const kScaleOffset = 0;

  const kNumObjects = 100;
  const objectInfos = [];

  for (let i = 0; i < kNumObjects; ++i) {
+    const staticUniformBuffer = device.createBuffer({
+      label: `static uniforms for obj: ${i}`,
+      size: staticUniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // These are only set once so set them now
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset

+      // copy these values to the GPU
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // create a typedarray to hold the values for the uniforms in JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
+    const uniformBuffer = device.createBuffer({
+      label: `changing uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: staticUniformBuffer},
+        { binding: 1, resource: uniformBuffer},
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }
```

我们的渲染代码没有任何变化。每个对象的绑定组都包含对每个对象的两个`uniform`缓冲区的引用。就像之前一样，我们正在更新`scale`。但现在我们只在调用 `device.queue.writeBuffer` 时更新 scale 的值，而之前我们更新的是每个对象的`color` + `offset` + `scale`。

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

在这个简单的例子中，分割成多个`uniform`缓冲区可能是矫枉过正，但根据什么变化和何时变化进行分割是很常见的。例子中可能包括共享矩阵的`uniform`缓冲区。例如透视矩阵、视图矩阵、摄像机矩阵。由于我们要绘制的所有对象通常都使用相同的矩阵，因此我们只需制作一个缓冲区，让所有对象使用相同的统一缓冲区即可。

另外，我们的着色器可能会引用另一个`uniform`缓冲区，该缓冲区只包含该对象特有的内容，如其世界/模型矩阵和法线矩阵。

另一个统一缓冲区可能包含材质设置。这些设置可能由多个对象共享。

我们将在讲解绘制 3D 时详细介绍这些内容。

接下来是[存储缓冲区(storage buffers)](webgpu-storage-buffers.html)
