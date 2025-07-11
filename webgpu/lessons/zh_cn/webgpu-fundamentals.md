Title: WebGPU 基础
Description: WebGPU 的基础知识
TOC: 基础知识

本文将向您介绍 WebGPU 的基础知识。

<div class="warn">
希望你在阅读本文之前已经了解 JavaScript。本文将大量使用
<a href="https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Global_Objects/Array/map">数组映射</a>,
<a href="https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment">解构赋值</a>,
<a href="https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Operators/Spread_syntax">展开语法</a>,
<a href="https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Statements/async_function">async/await 函数</a>,
<a href="https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Guide/Modules">es6 模块</a>,
等概念。
</div>

<div class="warn">如果您已经了解 WebGL, <a href="webgpu-from-webgl.html">请阅读此文</a>.</div>

WebGPU 是一个应用程序接口，可让您做两件基本的事情。

1. [绘制三角形/点/线到纹理上](#a-drawing-triangles-to-textures)

2. [在 GPU 上进行计算](#a-run-computations-on-the-gpu)

就是这样！
之后有关 WebGPU 的一切都取决于您。这就像学习 JavaScript、Rust 或 C++ 等计算机语言一样。首先要学习基础知识，然后才能创造性地使用这些基础知识来解决问题。

WebGPU 是一个极其低层次的 API. 虽然您可以制作一些小型示例，但对于许多应用程序来说，这可能需要大量代码和大量数据。 举例来说，支持 WebGPU 的 [three.js](https://threejs.org) 包含约 600k 的 JavaScript，这还只是它的基础库。这还不包括加载器、控件、后处理和许多其他功能。 同样的, [带有 WebGPU 后端的 TensorFlow](https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu)也需要大约 500K 的 JavaScript 压缩包。

重点是，如果你只想在屏幕上显示一些东西，那么选择一个能提供大量基础代码的库会好得多。

另一方面，也许你有一个自定义用例，也许你想修改一个现有库，也许你只是好奇它是如何工作的。在这种情况下，请继续阅读！

# 起步

很难决定从哪里开始。从某种程度上说，WebGPU 是一个非常简单的系统。它所做的就是在 GPU 上运行 3 种功能：顶点着色器、片段着色器和计算着色器。

顶点着色器负责计算顶点。着色器会返回顶点位置。对于每组 3 个顶点，它会返回在这 3 个位置之间绘制的三角形 [^primitives]

[^primitives]: 有以下 5 种模式：

    -   `'point-list'`: 对于每个顶点，绘制一个点
    -   `'line-list'`: 每 2 个点绘制一条线
    -   `'line-strip'`: 绘制最新点与前一点的连接线
    -   `'triangle-list'`: 每 3 个点绘制一个三角形 (**默认**)
    -   `'triangle-strip'`: 对于每个新位置，从它和最后 2 个位置中画出一个三角形

片段着色器负责计算颜色 [^fragment-output]。 在绘制三角形时，GPU 会为每个要绘制的像素调用片段着色器。片段着色器会返回一种颜色。

[^fragment-output]: 片段着色器间接将数据写入纹理。这些数据不一定是颜色。例如，输出像素所代表表面的方向向量是一种很常见的场景。

而计算着色器则更加的通用。它实际上只是一个函数，你调用它，然后说 "执行这个函数 N 次"。GPU 每次调用你的函数时都会传递迭代次数，因此你可以在每次迭代时使用该次数做一些独特的事情。

如果你仔细观察，就会发现这些函数类似于传递给
[`array.forEach`](https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
或
[`array.map`](https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Global_Objects/Array/map) 函数。
在 GPU 上运行的函数只是函数，就像 JavaScript 函数一样。不同之处在于它们是在 GPU 上运行的，因此要运行它们，您需要以缓冲区和纹理的形式将您希望它们访问的所有数据复制到 GPU 上，而且它们只能输出到这些缓冲区和纹理。您需要在函数中指定函数将在哪些绑定或位置查找数据。回到 JavaScript 中，你需要将保存数据的缓冲区和纹理绑定到这些绑定或位置。一旦完成这些后，您就可以告诉 GPU 执行函数了。

<a id="a-draw-diagram"></a>也许下面的图片会有所帮助。以下是使用顶点着色器和片段着色器绘制三角形的 WebGPU 设置简图

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram.svg" style="width: 960px;"></div>

上图的注意事项：

-   **管道(Pipeline)**. 它包含 GPU 将运行的顶点着色器和片段着色器。您也可以在管道(Pipeline)中加入计算着色器。

-   着色器通过**绑定组(Bind Groups)**间接引用资源（缓冲区(buffer)、纹理(texture)、采样器(sampler)）。

-   管道定义了通过内部状态间接引用缓冲区的属性

-   属性从缓冲区中提取数据，并将数据输入顶点着色器

-   顶点着色器可将数据输入片段着色器

-   片段着色器通过 render pass description 间接写入纹理

要在 GPU 上执行着色器，需要创建所有这些资源并设置状态。创建资源相对简单。有趣的是，大多数 WebGPU 资源在创建后都无法更改。您可以更改它们的内容，但是无法更改它们的大小、用途、格式等等。如果要更改这些内容，需要创建一个新资源并销毁旧资源。

有些状态是通过创建和执行命令缓冲区来设置的。命令缓冲区顾名思义。它们是一个命令缓冲区。你可以创建编码器。编码器将命令编码到命令缓冲区。编码器*完成*(_finish_)编码后，就会向你提供它创建的命令缓冲区。然后，您就可以*提交*(_submit_)该命令缓冲区，让 WebGPU 执行命令。

下面是一些对命令缓冲区进行编码的伪代码，以及所创建的命令缓冲区的表示方法。

<div class="webgpu_center side-by-side"><div style="min-width: 300px; max-width: 400px; flex: 1 1;"><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
encoder = device.createCommandEncoder()
// 绘制
{
  pass = encoder.beginRenderPass(...)
  pass.setPipeline(...)
  pass.setVertexBuffer(0, …)
  pass.setVertexBuffer(1, …)
  pass.setIndexBuffer(...)
  pass.setBindGroup(0, …)
  pass.setBindGroup(1, …)
  pass.draw(...)
  pass.end()
}
// 绘制一些其他东西
{
  pass = encoder.beginRenderPass(...)
  pass.setPipeline(...)
  pass.setVertexBuffer(0, …)
  pass.setBindGroup(0, …)
  pass.draw(...)
  pass.end()
}
// 计算
{
  pass = encoder.beginComputePass(...)
  pass.beginComputePass(...)
  pass.setBindGroup(0, …)
  pass.setPipeline(...)
  pass.dispatchWorkgroups(...)
  pass.end();
}
commandBuffer = encoder.finish();
{{/escapehtml}}</code></pre></div>
<div><img src="resources/webgpu-command-buffer.svg" style="width: 300px;"></div>
</div>

创建命令缓冲区后，就可以*提交*(_submit_)执行了

```js
device.queue.submit([commandBuffer]);
```

上图表示命令缓冲区中某个绘制命令时的状态。执行命令会设置*内部状态*(_internal state_)，然后*绘制*(_draw_)命令会告诉 GPU 执行顶点着色器（并间接执行片段着色器）。`dispatchWorkgroup` 命令将告诉 GPU 执行计算着色器。

我希望这能让你对需要设置的状态有一些心理上的印象。如上所述，WebGPU 有两个基本功能：

1. [绘制三角形/点/线到纹理上](#a-drawing-triangles-to-textures)

2. [在 GPU 上进行计算](#a-run-computations-on-the-gpu)

我们将以一个小例子逐一说明。其他文章将介绍向这些设备提供数据的各种方法。请注意，这将是非常基础的内容。我们需要为这些基础知识打下基础。稍后我们将展示如何使用它们来完成人们通常使用 GPU 完成的工作，如 2D 图形、3D 图形等。

# <a id="a-drawing-triangles-to-textures"></a>绘制三角形到纹理上

WebGPU 能够绘制三角形到 [纹理](webgpu-textures.html). 在本文中，纹理是指像素组成的 2D 矩形区域.[^textures] `<canvas>` 元素表示了网页上的纹理。在 WebGPU 中，我们可以向画布请求纹理并将结果渲染到纹理（画布）上。

[^textures]: 纹理也可以是 3d 矩形像素、立方体贴图（由 6 个正方形像素组成的立方体）和其他一些东西，但最常见的纹理是 2d 矩形像素。

要使用 WebGPU 绘制三角形，我们必须提供 2 个 "着色器"。再说一次，着色器就是在 GPU 上运行的函数。这两个着色器是

1. 顶点着色器

    顶点着色器是计算顶点位置的函数，用于绘制三角形/线/点

2. 片元着色器

    片段着色器是在绘制三角形/线/点时计算每个待绘制/光栅化像素的颜色（或其他数据）的函数

让我们从一个非常小的 WebGPU 程序开始，画一个三角形。

我们需要一块画布来显示我们的三角形

```html
<canvas></canvas>
```

然后，我们需要一个 `<script>` 标签来保存我们的 JavaScript。

```html
<canvas></canvas> +
<script type="module">

    ... javascript goes here ...

    +
</script>
```

下面所有的 JavaScript 都将放在该脚本标记中

WebGPU 是异步 API，因此在异步函数中使用最为方便。我们首先请求一个*适配器*(_adapter_)，然后从适配器中请求一个*设备*(_device_)。

```js
async function main() {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        fail('need a browser that supports WebGPU');
        return;
    }
}
main();
```

上面的代码不言自明。 首先，我们使用
[`?.` 可选链操作符](https://developer.mozilla.org/zh_CN/docs/Web/JavaScript/Reference/Operators/Optional_chaining)来请求一个*适配器*(_adapter_)。
如果 `navigator.gpu` 不存在的话，那么 `adapter` 将会是 `undefined`。
倘若它的确存在，那么我们将调用 `requestAdapter`。 它将以异步的方式返回结果，因此我们需要`await`。_适配器_(_adapter_)代表一个特定的 GPU，因为有些设备拥有多个 GPU。

从*适配器*(_adapter_)上请求*设备*(_device_)时，我们同样使用了`?`可选链操作符。因此如果*适配器*(_adapter_)为`undefined`，那么*设备*(_device_)也将为 `undefined`。

如果`device`为`undefined`，用户使用的很可能是旧版浏览器。

接下来，我们查找画布并为其创建 Webgpu 上下文。这样我们就可以获得一个纹理来进行渲染。该纹理将用于在网页中显示画布。

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

同样，上面的代码很容易理解。 我们从画布中获取一个 `"webgpu"` 上下文。
我们会询问系统首选的画布格式是什么。这将是 `rgba8unorm` 或 `bgra8unorm`。这其实并不重要，重要的是通过查询，可以让用户的系统以最快的速度运行。

我们通过调用 `configure` 将`format`传入 webgpu 画布上下文。我们还将`device`传入画布，从而将画布与我们刚刚创建的设备关联起来。

接下来，我们创建一个着色器模块。着色器模块包含一个或多个着色器函数。在本例中，我们将创建一个顶点着色器函数和一个片段着色器函数。

```js
const module = device.createShaderModule({
    label: 'our hardcoded red triangle shaders',
    code: `
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(pos[vertexIndex], 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }
    `,
});
```

着色器是用一种名为
[WebGPU Shading Language (WGSL)](https://gpuweb.github.io/gpuweb/wgsl/) 的语言编写的，它的发音通常是 wig-sil。WGSL 是一种强类型语言，我们将在[另一篇文章](webgpu-wgsl.html)中详细介绍。现在，我希望在稍作解释后，你能推断出一些基本知识。

上面我们看到一个名为 `vs` 的函数声明了 `@vertex` 属性。这表明它是一个顶点着色器函数。

```wgsl
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
         ...
```

它接受一个名为 `vertexIndex`的参数。 `vertexIndex` 是 `u32` 类型，即是*32 位无符号整数*。
它从名为 `vertex_index`的内置函数中获取值。 `vertex_index` 就像是一个迭代数, 类似于 JavaScript 中的
`Array.map(function(value, index) { ... })`中的 `index`。 如果我们通过调用 `draw` 告诉 GPU 执行此函数 10 次,那么第 1 次的`vertex_index` 将会是`0`，第 2 次会是`1`，第 3 次为`2`等等……[^indices]

[^indices]: 我们还可以使用索引缓冲区来指定顶点索引。[有关顶点缓冲区的文章](webgpu-vertex-buffers.html#a-index-buffers)对此进行了介绍。︎

我们的 `vs` 函数被声明为返回一个 `vec4f`的函数，它是由四个 32 位浮点数值组成的向量。把它想象成一个包含 4 个值的数组，或者一个包含 4 个属性的对象，如 {x: 0, y：0, z: 0, w: 0}。返回值将分配给位置内置程序。在 "triangle-list "模式下，顶点着色器每执行 3 次，就会在我们返回的 3 个位置之间绘制一个三角形。

WebGPU 中的位置需要在*裁剪空间*(_clip space_)中返回，其中 X 从左侧的 -1.0 到右侧的 +1.0，Y 从底部的 -1.0 到顶部的 +1.0。无论我们绘制的纹理大小如何，都是如此。

<div class="webgpu_center"><img src="resources/clipspace.svg" style="width: 500px"></div>

`vs` 函数声明了一个由 3 个 `vec2f` 组成的数组。每个 `vec2f` 由两个 32 位浮点数值组成。

```wgsl
        let pos = array(
          vec2f( 0.0,  0.5),  // 上方中间的位置
          vec2f(-0.5, -0.5),  // 下方靠左的位置
          vec2f( 0.5, -0.5)   // 下方靠右的位置
        );
```

最后，它使用 `vertexIndex` 从数组中返回 3 个值中的一个。由于函数的返回类型需要 4 个浮点数值，而 `pos` 是一个 `vec2f` 数组，因此代码为剩余的 2 个数值提供了 `0.0` 和 `1.0`。

```wgsl
        return vec4f(pos[vertexIndex], 0.0, 1.0);
```

着色器模块还声明了一个名为 `fs` 的函数，该函数带有 `@fragment` 属性，因此是一个片段着色器函数。

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
```

此函数不需要任何参数，并返回一个位于 `location(0)` 处的 `vec4f`。这意味着它会写入第一个渲染目标。稍后我们将把第一个渲染目标设为画布纹理。

```wgsl
        return vec4f(1, 0, 0, 1);
```

代码返回 `1, 0, 0, 1`，即红色。WebGPU 中的颜色通常指定为 `0.0` 至 `1.0` 的浮点数值，上述 4 个数值分别对应红色、绿色、蓝色和透明度。

当 GPU 对三角形进行光栅化（用像素绘制）时，它会调用片段着色器来确定每个像素的颜色。在我们的例子中，我们只返回红色。

还需要注意的一点是`label`。几乎所有使用 WebGPU 创建的对象都可以使用`label`。`label`完全是可选的，但*最佳做法*是给你创建的所有对象都加上标签。因为当出现错误时，大多数 WebGPU 实现都会打印一条错误信息，其中包括与错误相关的标签。

在普通应用程序中，您会有 100 或 1000 个缓冲区、纹理、着色器模块、管道等......如果您收到类似 `WGSL syntax error in shaderModule at line 10 `的错误，如果您有 100 个着色器模块，哪个模块出错了？如果给模块贴上标签，就会得到类似 `WGSL syntax error in shaderModule('our hardcoded red triangle shaders') at line 10 `的错误信息，这会一种非常有用的能够帮助你节约大量解决 Bug 的时间。

现在我们已经创建了着色器模块，接下来需要制作一个渲染管道

```js
const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
        module,
        entryPoint: 'vs',
    },
    fragment: {
        module,
        entryPoint: 'fs',
        targets: [{ format: presentationFormat }],
    },
});
```

在这种情况下，没有太多的东西可看。我们将`layout`设置为 `auto`，这意味着要求 WebGPU 从着色器中推断出数据布局。不过我们并没有使用任何数据。

然后，我们告诉渲染流水线在使用顶点着色器时使用着色器模块中的 `vs` 函数，在使用片段着色器时使用 `fs` 函数。除此之外，我们还要告诉它第一个渲染目标的格式。`render target`指的是我们要渲染的纹理。创建管道后，我们必须指定该管道最终渲染到的纹理的格式。

`targets`数组第 0 号元素与我们为片段着色器的返回值指定的位置 0 相对应。稍后，我们将该目标设置为画布的纹理。

接下来我们准备一个 `GPURenderPassDescriptor`，它描述了我们要绘制的纹理以及如何使用它们。

```js
const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
        {
            // view: <- 当我们渲染时再设置
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
        },
    ],
};
```

`GPURenderPassDescriptor` 有一个 `colorAttachments` 数组，其中列出了我们要渲染的纹理以及如何处理它们。我们将等待填入实际要渲染的纹理。目前，我们设置了一个半深灰色的清除值，以及一个`loadOp`和`storeOp`。`loadOp: clear` 指定在绘制前将纹理清除为`clearValue`。另一个选项是 `load`，意思是将纹理的现有内容加载到 GPU 中，这样我们就可以在已有内容上绘图了。`storeOp: 'store'`表示存储绘制结果。我们也可以通过 `discard`来丢弃绘制的结果。我们将在[另一篇文章](webgpu-multisampling.html)中介绍为什么要这样做。

现在是渲染的时候了。

```js
function render() {
    // 从当前画布上下文获取纹理并设置为目标纹理
    renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        ;

    // 创建命令编码器以开始编码命令
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // 创建一个 render pass 编码器来编码特定的命令
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3); // 3次调用我们的顶点着色器
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

render();
```

首先，我们调用 `context.getCurrentTexture()` 获取将出现在画布中的纹理。调用 `createView` 可获取纹理特定部分的视图，但如果没有参数，它将返回默认部分，而这正是我们在本例中想要的。目前，我们唯一的 `colorAttachment` 是画布中的纹理视图，我们通过开始时创建的上下文来获取该视图。同样，`colorAttachments` 数组第 0 号元素与我们为片段着色器的返回值指定的 `@location(0)` 相对应。

接下来，我们创建一个命令编码器。命令编码器用于创建命令缓冲区。我们用它对命令进行编码，然后 "提交 "它创建的命令缓冲区以执行命令。

然后，我们通过调用 `beginRenderPass`，使用命令编码器创建一个`render pass`编码器。`render pass`编码器是一种特定的编码器，用于创建与渲染相关的命令。我们将 `renderPassDescriptor` 传递给它，告诉它我们要渲染到哪个纹理。

我们对命令 `setPipeline` 进行编码，以设置我们的流水线，然后通过调用 `draw` 3 次 来告诉它执行顶点着色器 3 次。 默认情况下，顶点着色器每执行 3 次，就会通过连接刚从顶点着色器返回的 3 个值来绘制一个三角形。

我们结束`render pass`，然后完成编码器。这样我们就得到了一个命令缓冲区，它代表了我们刚刚指定的步骤。最后，我们将命令缓冲区提交执行。

执行`draw`命令时，这将是我们的状态：

<div class="webgpu_center"><img src="resources/webgpu-simple-triangle-diagram.svg" style="width: 723px;"></div>

我们没有`texture`，没有`buffer`，也没有 `bindGroups`，但我们有一个`pipeline`、一个顶点着色器和一个片段着色器，以及一个告诉着色器渲染画布纹理的`render pass descriptor`

结果如下：

{{{example url="../webgpu-simple-triangle.html"}}}

需要强调的是，我们调用的所有这些函数，如 `setPipeline` 和 `draw`，都只是将命令添加到命令缓冲区。它们实际上并不执行命令。当我们将命令缓冲区提交到设备队列时，命令才会被执行。

<a id="a-rasterization"></a>WebGPU 从顶点着色器中获取每 3 个顶点，并将其光栅化为一个三角形。为此，WebGPU 会确定三角形内的像素中心。然后，WebGPU 会调用片段着色器，询问每个像素的颜色。

想象一下，我们要渲染的纹理是 15x11 像素。这些像素将被绘制。

<div class="webgpu_center">
  <div data-diagram="clip-space-to-texels" style="display: inline-block; max-width: 500px; width: 100%"></div>
  <div>drag the vertices</div>
</div>

现在，我们已经看到了一个非常小的 WebGPU 工作示例。显而易见，在着色器中硬编码三角形并不灵活。我们需要一些提供数据的方法，我们将在接下来的文章中介绍这些方法。从上面的代码中可以看出以下几点：

-   WebGPU 只是运行着色器。你可以在其中填充代码，做一些有用的事情
-   着色器在着色器模块中指定，然后转化为流水线
-   WebGPU 可以绘制三角形
-   WebGPU 可绘制纹理（我们恰巧从画布上获取了纹理）
-   WebGPU 的工作方式是对命令进行编码，然后提交命令。

# <a id="a-run-computations-on-the-gpu"></a>在 GPU 上进行计算

让我们编写一个在 GPU 上进行计算的基本示例

我们首先使用相同的代码来获取 WebGPU 设备

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
```

当我们创建着色器模块时

```js
const module = device.createShaderModule({
    label: 'doubling compute module',
    code: `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;

      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        let i = id.x;
        data[i] = data[i] * 2.0;
      }
    `,
});
```

首先，我们声明一个名为 `data` 的变量，它的类型是`storage`，我们希望它既能被读取，也能被写入。

```wgsl
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
```

我们将其类型声明为 `array<f32>`，即 32 位浮点数值数组。我们告诉它，我们将在 bindGroup 0（`@group(0)`）中的绑定位置 0（`binding(0)`）上设置这个`data`数组。

然后，我们使用 `@compute` 属性声明一个名为 `computeSomething` 的函数，使其成为一个计算着色器。

```wgsl
      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        ...
```

计算着色器需要声明*工作组*大小，我们稍后会介绍。现在，我们只需使用属性 `@workgroup_size(1)` 将其设置为 1。我们声明它有一个使用 `vec3u` 的参数 `id`。`vec3u` 是三个无符号 32 位整数值。与上面的顶点着色器一样，它是一个迭代数。不同的是，计算着色器的迭代次数是三维的（有 3 个值）。我们声明 `id`以便从内置的 `global_invocation_id` 获取其值。

你可以把计算着色器*想象成*是下面这样运行的。虽然过于简化，但现在也可以这么做。

```js
// 伪代码
function dispatchWorkgroups(width, height, depth) {
    for (z = 0; z < depth; ++z) {
        for (y = 0; y < height; ++y) {
            for (x = 0; x < width; ++x) {
                const workgroup_id = { x, y, z };
                dispatchWorkgroup(workgroup_id);
            }
        }
    }
}

function dispatchWorkgroup(workgroup_id) {
    // from @workgroup_size in WGSL
    const workgroup_size = shaderCode.workgroup_size;
    const { x: width, y: height, z: depth } = workgroup_size;
    for (z = 0; z < depth; ++z) {
        for (y = 0; y < height; ++y) {
            for (x = 0; x < width; ++x) {
                const local_invocation_id = { x, y, z };
                const global_invocation_id =
                    workgroup_id * workgroup_size + local_invocation_id;
                computeShader(global_invocation_id);
            }
        }
    }
}
```

由于我们设置了 `@workgroup_size(1)`，上面的伪代码实际上就变成了

```js
// 伪代码
function dispatchWorkgroups(width, height, depth) {
    for (z = 0; z < depth; ++z) {
        for (y = 0; y < height; ++y) {
            for (x = 0; x < width; ++x) {
                const workgroup_id = { x, y, z };
                dispatchWorkgroup(workgroup_id);
            }
        }
    }
}

function dispatchWorkgroup(workgroup_id) {
    const global_invocation_id = workgroup_id;
    computeShader(global_invocation_id);
}
```

最后，我们使用 `id` 的 `x` 属性对数据进行索引，并将每个值乘以 2

```wgsl
        let i = id.x;
        data[i] = data[i] * 2.0;
```

上面，i 是 3 个迭代数中的第一个。

现在我们已经创建了着色器，需要创建一个流水线

```js
const pipeline = device.createComputePipeline({
    label: 'doubling compute pipeline',
    layout: 'auto',
    compute: {
        module,
        entryPoint: 'computeSomething',
    },
});
```

在这里，我们只需告诉它，我们正在使用我们创建的着色器模块中的`compute`阶段，并希望调用 `computeSomething` 函数。 layout 还是 "auto"，告诉 WebGPU 从着色器中找出布局。[^layout-auto]

[^layout-auto]: `layout: 'auto'`很方便，但使用 `layout: 'auto'` 布局无法在不同管道中共享绑定组。本网站上的大多数示例从未在多个管道中使用过绑定组。我们将在另一篇文章中介绍[显式布局](webgpu-bind-group-layouts.html)。︎

接下来我们需要一些数据

```js
const input = new Float32Array([1, 3, 5]);
```

这些数据只存在于 JavaScript 中。要使用 WebGPU，我们需要在 GPU 上创建一个缓冲区，并将数据复制到缓冲区中。

```js
// 在 GPU 上创建缓冲区来承载我们的计算
// input and output
const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
});
// 把数据复制到缓冲区
device.queue.writeBuffer(workBuffer, 0, input);
```

上面我们调用 `device.createBuffer` 来创建缓冲区。`size` 是以字节为单位的大小，在本例中为 12，因为包含 3 个值的 `Float32Array` 的字节大小为 12。如果您不熟悉 `Float32Array` 和类型数组，请[参阅本文](webgpu-memory-layout.html)。

我们创建的每个 WebGPU 缓冲区都必须指定`usage`。我们可以为用途传递一系列标志，但并非所有标志都能同时使用。在这里，我们通过传递 `GPUBufferUsage.STORAGE` 来表示我们希望将此缓冲区用作`storage`用途。这样就可以与着色器中的 `var<storage,...>` 兼容。此外，我们希望能将数据复制到此缓冲区，因此我们加入了 `GPUBufferUsage.COPY_DST` 标志。最后，我们希望能从该缓冲区复制数据，因此加入了 `GPUBufferUsage.COPY_SRC`。

请注意，您不能直接从 JavaScript 中读取 WebGPU 缓冲区的内容。相反，您必须 "映射 "它，这是从 WebGPU 请求访问缓冲区的另一种方式，因为缓冲区可能正在使用中，而且可能只存在于 GPU 上。

可以在 JavaScript 中映射的 WebGPU 缓冲区不能用于其他用途。换句话说，我们无法映射刚刚创建的缓冲区，如果我们尝试添加标记使其可以映射，就会得到一个与使用 `STORAGE` 不兼容的错误信息。

因此，为了查看计算结果，我们需要另一个缓冲区。运行计算后，我们将把上面的缓冲区复制到这个结果缓冲区，并设置其标志，以便进行映射。

```js
// 在 GPU 创建缓冲区来复制计算结果
const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});
```

`MAP_READ` 表示我们希望能够映射该缓冲区以读取数据。

为了告诉着色器我们希望它在哪个缓冲区上工作，我们需要创建一个 bindGroup

```js
// 创建一个 bindGroup 来告诉着色器我们将在哪一个缓冲区上计算
const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: workBuffer }],
});
```

我们从管道中获取 bindGroup 的布局。然后设置 bindGroup 的`entries`。`pipeline.getBindGroupLayout(0)` 中的 0 对应着着色器中的 `@group(0)`。`{binding：0 ...` `entry`对应着着色器中的 `@group(0) @binding(0)`。

现在我们可以开始对命令进行编码

```js
// 编码命令，执行计算
const encoder = device.createCommandEncoder({
    label: 'doubling encoder',
});
const pass = encoder.beginComputePass({
    label: 'doubling compute pass',
});
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(input.length);
pass.end();
```

我们创建一个命令编码器。启动`compute pass`。我们设置管道，然后设置 bindGroup。这里，`pass.setBindGroup(0, bindGroup)` 中的 0 对应着着色器中的 `@group(0)`。然后，我们调用 `dispatchWorkgroups`，在本例中，我们将 `input.length` 设为 `3`，告诉 WebGPU 运行计算着色器 3 次。然后结束`compute pass`。

下面是执行 `dispatchWorkgroups` 时的情况

<div class="webgpu_center"><img src="resources/webgpu-simple-compute-diagram.svg" style="width: 553px;"></div>

计算完成后，我们要求 WebGPU 从 `workBuffer` 复制到 `resultBuffer`

```js
// 编码命令以复制结果到一个可映射的缓冲区
encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);
```

现在，我们可以完成编码器以获取命令缓冲区，然后提交该命令缓冲区。

```js
// 结束编码，提交命令
const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
```

然后，我们映射结果缓冲区并获取数据副本

```js
// 读取结果
await resultBuffer.mapAsync(GPUMapMode.READ);
const result = new Float32Array(resultBuffer.getMappedRange());

console.log('input', input);
console.log('result', result);

resultBuffer.unmap();
```

要映射结果缓冲区，我们需要调用 `mapAsync` 并需要使用`await`等待其完成。映射完成后，我们可以调用 `resultBuffer.getMappedRange()`（无参数），它将返回整个缓冲区的 `ArrayBuffer`。我们将其放入 `Float32Array` 类型的数组视图中，然后就可以查看数值了。一个重要的细节是，getMappedRange 返回的 `ArrayBuffer` 仅在调用 `unmap` 之前有效。在`unmap`之后，其长度将被设置为 0，数据也不再可访问。

运行后，我们可以看到结果已经返回，所有数字都翻了一番。

{{{example url="../webgpu-simple-compute.html"}}}

我们将在其他文章中介绍如何真正使用计算着色器。现在，希望你已经对 WebGPU 的作用有了一些了解。其他一切都取决于你！WebGPU 与其他编程语言类似。它提供了一些基本功能，剩下的就看你的创造力了。

WebGPU 编程的特别之处在于这些功能（顶点着色器、片段着色器和计算着色器）都在 GPU 上运行。GPU 可以有超过 10000 个处理器，这意味着它们可以并行进行超过 10000 次计算，这可能比 CPU 的并行计算能力高出 3 个或更多数量级。

## 简要调整画布大小

在继续之前，让我们回到三角形绘制示例，并为调整画布大小添加一些基本支持。画布大小的调整实际上是一个有很多微妙之处的话题，因此[有一整篇文章](webgpu-resizing-the-canvas.html)来讨论这个问题。现在，我们只需添加一些基本支持。

首先，我们要添加一些 CSS，使画布填满页面。

```html
<style>
    html,
    body {
        margin: 0; /* 移除默认的外边距          */
        height: 100%; /* 使 html,body 元素填充页面  */
    }
    canvas {
        display: block; /* 把 canvas 元素变成块元素（block element） */
        width: 100%; /* 让 canvas 填充容器 */
        height: 100%;
    }
</style>
```

单凭 CSS 就能让画布显示覆盖整个页面，但它不会改变画布本身的分辨率，所以如果将下面的示例放大，比如点击全屏按钮，你可能会发现三角形的边缘是块状的。

{{{example url="../webgpu-simple-triangle-with-canvas-css.html"}}}

`<canvas>` 标签的默认分辨率为 300x150 像素。我们希望调整画布的分辨率，使其与显示的尺寸相匹配。一个很好的方法就是使用 `ResizeObserver`。您可以创建一个 `ResizeObserver`，并给它一个函数，每当您要求它观察的元素尺寸发生变化时，就调用该函数。然后告诉它要观察哪些元素。

```js
    ...
-    render();

+    const observer = new ResizeObserver(entries => {
+      for (const entry of entries) {
+        const canvas = entry.target;
+        const width = entry.contentBoxSize[0].inlineSize;
+        const height = entry.contentBoxSize[0].blockSize;
+        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
+        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
+        // 重新绘制
+        render();
+      }
+    });
+    observer.observe(canvas);
```

在上面的代码中，我们查看了所有条目，但应该只有一个，因为我们只观察画布。我们需要将画布的大小限制在设备支持的最大尺寸内，否则 WebGPU 将开始生成错误，提示我们试图制作过大的纹理。我们还需要确保它不会归零，否则同样会出错。详情请参见[另一篇更长的文章](webgpu-resizing-the-canvas.html)。

我们调用 `render` 以新的分辨率重新渲染三角形。我们删除了对 `render` 的旧调用，因为不需要它。`ResizeObserver` 总是会至少调用一次回调，以报告元素开始被观察时的大小。

当我们在 `render` 中调用 `context.getCurrentTexture()` 时，就会创建新大小的纹理，因此没有什么可做的了。

{{{example url="../webgpu-simple-triangle-with-canvas-resize.html"}}}

在以下文章中，我们将介绍向着色器传递数据的各种方法。

-   [inter-stage variables](webgpu-inter-stage-variables.html)
-   [uniforms](webgpu-uniforms.html)
-   [storage buffers](webgpu-storage-buffers.html)
-   [vertex buffers](webgpu-vertex-buffers.html)
-   [textures](webgpu-textures.html)
-   [constants](webgpu-constants.html)

我们接着介绍 [WGSL 的基础知识](webgpu-wgsl.html)。

这个顺序从最简单到最复杂。`inter-stage`不需要外部设置来解释。我们只需更改上面使用的 WGSL，就能知道如何使用它们。`uniform`实际上是全局变量，因此可用于所有三种着色器（顶点、片段和计算）。从`uniform`到`storage buffer`的转换非常简单，如文章顶部的`storage buffer`所示。`vertex buffer`仅用于顶点着色器。它们更为复杂，因为需要向 WebGPU 描述数据布局。`texture`最为复杂，因为它们有大量类型和选项。

我有点担心这些文章一开始会很无聊。如果你愿意，可以随意跳读。请记住，如果你有不明白的地方，你可能需要阅读或复习这些基础知识。一旦我们掌握了基础知识，我们就会开始讲解实际的技术。

还有一件事。所有示例程序都可以在网页中进行实时编辑。此外，它们都可以轻松导出到 [jsfiddle](https://jsfiddle.net) 和 [codepen](https://codepen.io)，甚至 [stackoverflow](https://stackoverflow.com)。只需点击 "导出 "即可。

<div class="webgpu_bottombar">
<p>

上面的代码以非常简洁的方式获取 WebGPU 设备。一种更啰嗦的方式是：

</p>
<pre class="prettyprint showmods">{{#escapehtml}}
async function start() {
  if (!navigator.gpu) {
    fail('this browser does not support WebGPU');
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    fail('this browser supports webgpu but it appears disabled');
    return;
  }
  
  const device = await adapter.requestDevice();
  device.lost.then((info) => {
    console.error(`WebGPU device was lost: ${info.message}`);

    // 'reason' will be 'destroyed' if we intentionally destroy the device.
    if (info.reason !== 'destroyed') {
      // try again
      start();
    }
  });

  main(device);
}
start();

function main(device) {
... do webgpu ...
}
{{/escapehtml}}</pre>

<p>
<code>device.lost</code> 是一个unresolved的Promise。如果设备丢失，它就会变为resolved。设备丢失的原因有很多。也许用户运行了一个非常密集的应用程序，导致 GPU 崩溃。也许用户更新了驱动程序。也许用户有一个外置 GPU，但拔掉了。也许另一个页面使用了大量 GPU，而你的标签页在后台，浏览器决定通过丢失后台标签页的设备来释放一些内存。需要注意的是，对于任何重要的应用程序，你可能都希望能处理丢失设备的问题。
</p>
<p>
请注意，<code>requestDevice</code> 始终会返回一个设备。只是开始时可能会丢失。WebGPU 的设计使设备在大多数情况下都能正常工作，至少从 API 层面来看是这样。创建和使用设备的调用看起来会成功，但实际上并不能运行。当<code>lost</code>promise变为resolved后，您就可以采取一些措施了。

</p>
</div>

<!-- keep this at the bottom of the article -->
<script type="module" src="webgpu-fundamentals.js"></script>
