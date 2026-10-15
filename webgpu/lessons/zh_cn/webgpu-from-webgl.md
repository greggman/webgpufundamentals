Title: WebGL 到 WebGPU
Description: WebGL 与 WebGPU 的用法对比
TOC: WebGL 到 WebGPU

本文面向已经熟悉 WebGL 并希望开始使用 WebGPU 的读者。

从 WebGL 迁移到 WebGPU 时，值得注意的一点是两者有许多概念是相同的。WebGL 和 WebGPU 都允许你在 GPU 上运行小型函数。WebGL 有顶点着色器和片段着色器。WebGPU 同样有这两种着色器，外加计算着色器。WebGL 使用 [GLSL](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) 作为其着色语言。WebGPU 使用 [WGSL](webgpu-wgsl.html)。虽然它们是不同的语言，但概念上大多相同。

两个 API 都有属性（attribute），这是一种从缓冲区中提取数据并将其传递给顶点着色器每次迭代的方式。两个 API 都有 uniform，用于指定所有着色器函数迭代共享的值。两个 API 都有 varying，用于将数据从顶点着色器传递到片段着色器，并在通过片段着色器光栅化时对顶点着色器计算的值进行插值。两个 API 都有纹理和采样器，用于提供二维或三维数据并进行采样（将多个像素过滤为单个值）。两个 API 都提供了渲染到纹理的方法。此外，两者都有一大堆关于像素如何混合、深度缓冲区和模板缓冲区如何工作等的设置。

最大的区别是 WebGL 是**有状态**（stateful）API，而 WebGPU 不是。我的意思是，在 WebGL 中存在一堆全局状态。当前绑定了哪些纹理、当前绑定了哪些缓冲区、当前程序是什么、混合/深度/模板设置是什么。你通过调用各种 API 函数（如 `gl.bindBuffer`、`gl.enable`、`gl.blendFunc` 等）来设置这些状态，这些状态会*全局*保持为你设置的值，直到你将它们更改为其他值。

相比之下，在 WebGPU 中几乎没有*全局*状态。相反，有**管线**（pipeline）或**渲染管线**（render pipeline）以及**渲染通道**（render pass）的概念，它们共同有效地包含了 WebGL 中曾是全局的大部分状态。包括哪些纹理、哪些属性、哪些缓冲区以及所有其他各种设置。任何你没有设置的设置都有默认值。你不能修改管线——而是创建它们，之后它们就是不可变的。如果你想使用不同的设置，你需要创建另一个管线。*渲染通道*确实有一些状态，但那些状态是局部的。

第二大区别是 WebGPU 比 WebGL **更低层**。在 WebGL 中，许多东西通过名称来连接。例如，你在 GLSL 中声明一个 uniform，然后通过以下方式查找它的位置：

```js
loc = gl.getUniformLocation(program, 'nameOfUniform');
```

另一个例子是 varying，在顶点着色器中使用 `varying vec2 v_texcoord` 或 `out vec2 v_texcoord`，然后在片段着色器中声明相应的 varying 并命名为 `v_texcoord`。这样做的好处是如果你拼错了名称，你会得到一个错误。

另一方面，WebGPU 中的一切都完全通过索引或字节偏移来连接。你不像 WebGL 那样创建单独的 uniform，而是声明 uniform 块（一个声明你的 uniform 的结构体）。然后由你来确保手动组织传递给着色器的数据以匹配该结构。注意：WebGL2 也有相同的概念，称为 Uniform 块，但 WebGL2 也有按名称查找 uniform 的概念。而且，即使 WebGL2 Uniform 块中的各个字段需要通过字节偏移来设置，(a) 你可以查询 WebGL2 获取这些偏移量，(b) 你仍然可以按名称查找块本身本身的位置。

而在 WebGPU 中，**一切**都是通过字节偏移或索引（通常称为"*位置*"）来进行的，并且没有 API 可以查询它们。这意味着完全由你自己来保持这些位置同步并手动计算字节偏移。

举一个 JavaScript 的类比：

```js
function likeWebGL(inputs) {
  const {position, texcoords, normal, color} = inputs;
  ...
}

function likeWebGPU(inputs) {
  const [position, texcoords, normal, color] = inputs;
  ...
}
```

在上面的 `likeWebGL` 示例中，事物通过名称连接。我们可以这样调用 `likeWebGL`：

```js
const inputs = {};
inputs.normal = normal;
inputs.color = color;
inputs.position = position;
likeWebGL(inputs);
```

或者这样：

```js
likeWebGL({color, position, normal});
```

注意，因为它们通过名称连接，参数的顺序无关紧要。此外，假设函数可以在没有 `texcoords` 的情况下运行，我们可以跳过某个参数（上面的例子中跳过了 `texcoords`）。

另一方面，使用 `likeWebGPU` 时：

```js
const inputs = [];
inputs[0] = position;
inputs[2] = normal;
inputs[3] = color;
likeWebGPU(inputs);
```

这里，我们将参数传入数组。注意，我们必须知道每个输入的位置（索引）。我们需要知道 `position` 是索引 0，`normal` 在索引 2，依此类推。在 WebGPU 中保持代码内部（WGSL）和外部（JavaScript/WASM）的位置同步完全是你自己的责任。

### 其他显著差异

* 画布（Canvas）

  WebGL 替你管理画布。你在创建 WebGL 上下文时选择抗锯齿（antialias）、保留绘图缓冲区（preserveDrawingBuffer）、模板（stencil）、深度（depth）和透明度（alpha），之后 WebGL 自己管理画布。你只需要设置 `canvas.width` 和 `canvas.height`。

  在 WebGPU 中，你需要自己做更多的事情。如果你想要深度缓冲区，你需要自己创建（有无模板缓冲区都可以）。如果你想要抗锯齿，你需要创建自己的多重采样纹理并将它们解析到画布纹理中。

  但是，正因为如此，与 WebGL 不同，你可以使用一个 WebGPU 设备渲染到多个画布。🎉🤩

* WebGPU 不会生成 mipmap。

  在 WebGL 中，你可以创建纹理的 0 级 mip，然后调用 `gl.generateMipmap`，WebGL 会生成所有其他 mip 级别。WebGPU 没有这样的函数。如果你想让纹理有 mip，你必须自己生成它们。

  注意：[这篇文章](webgpu-importing-textures.html#a-generating-mips-on-the-gpu)有生成 mip 的代码。

* WebGPU 需要采样器

  在 WebGL1 中，采样器不存在，或者换句话说，采样器由 WebGL 内部处理。在 WebGL2 中，使用采样器是可选的。在 WebGPU 中，采样器是必需的。

* 缓冲区和纹理不能调整大小

  在 WebGL 中，你可以创建缓冲区或纹理，然后在任何时候更改其大小。例如，如果你调用 `gl.bufferData`，缓冲区会被重新分配。如果你调用 `gl.texImage2D`，纹理会被重新分配。纹理的一种常见模式是创建一个 1x1 像素的占位符，让你立即开始渲染，然后异步加载图像。当图像加载完成后，你可以就地更新纹理。

  在 WebGPU 中，纹理和缓冲区的大小、用途、格式是不可变的。你可以更改它们的内容，但不能更改它们的其他任何属性。这意味着，在 WebGL 中你需要更改它们的模式，比如上面提到的例子，需要重构为创建新资源。

  换句话说，不要这样做：

  ```js
  // 伪代码
  const tex = createTexture()
  fillTextureWith1x1PixelPlaceholder(tex)
  imageLoad(url).then(img => updateTextureWithImage(tex, image));
  ```

  你需要将代码改为类似这样：

  ```js
  // 伪代码
  let tex = createTexture(size: [1, 1]);
  fillTextureWith1x1PixelPlaceholder(tex)
  imageLoad(url).then(img => {
      tex.destroy();  // 删除旧纹理
      tex = createTexture(size: [img.width, img.height]);
      copyImageToTexture(tex, image));
  });
  ```

## 让我们对比 WebGL 和 WebGPU

### 着色器

下面是一个绘制带纹理和光照的三角形的着色器。一个用 GLSL 编写，另一个用 WGSL 编写。

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const vSrc = `
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
  gl_Position = u_worldViewProjection * a_position;
  v_texCoord = a_texcoord;
  v_normal = (u_worldInverseTranspose * vec4(a_normal, 0)).xyz;
}
`;

const fSrc = `
precision highp float;

varying vec2 v_texCoord;
varying vec3 v_normal;

uniform sampler2D u_diffuse;
uniform vec3 u_lightDirection;

void main() {
  vec4 diffuseColor = texture2D(u_diffuse, v_texCoord);
  vec3 a_normal = normalize(v_normal);
  float l = dot(a_normal, u_lightDirection) * 0.5 + 0.5;
  gl_FragColor = vec4(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const shaderSrc = `
struct VSUniforms {
  worldViewProjection: mat4x4f,
  worldInverseTranspose: mat4x4f,
};
@group(0) binding(0) var<uniform> vsUniforms: VSUniforms;

struct MyVSInput {
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) texcoord: vec2f,
};

struct MyVSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) texcoord: vec2f,
};

@vertex
fn myVSMain(v: MyVSInput) -> MyVSOutput {
  var vsOut: MyVSOutput;
  vsOut.position = vsUniforms.worldViewProjection * v.position;
  vsOut.normal = (vsUniforms.worldInverseTranspose * vec4f(v.normal, 0.0)).xyz;
  vsOut.texcoord = v.texcoord;
  return vsOut;
}

struct FSUniforms {
  lightDirection: vec3f,
};

@group(0) binding(1) var<uniform> fsUniforms: FSUniforms;
@group(0) binding(2) var diffuseSampler: sampler;
@group(0) binding(3) var diffuseTexture: texture_2d<f32>;

@fragment
fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.texcoord);
  var a_normal = normalize(v.normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre></div></div>

注意，在很多方面它们并没有那么不同。每个函数的核心部分非常相似。`vec4` 在 GLSL 中变成 WGSL 中的 `vec4f`，`mat4` 变成 `mat4x4f`。其他例子包括 `int` -> `i32`、`uint` -> `u32`、`ivec2` 到 `vec2i`、`uvec3` 到 `vec3u`。

GLSL 类似于 C/C++。WGSL 类似于 Rust。一个区别是类型在 GLSL 中放在左边，在 WGSL 中放在右边。

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 声明一个 vec4 类型的变量
vec4 v;

// 声明一个返回 mat4 类型、接受 vec3 参数的函数
mat4 someFunction(vec3 p) { ... }

// 声明一个结构体
struct Foo { vec4 field; };
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 声明一个 vec4f 类型的变量
var v: vec4f;

// 声明一个返回 mat4x4f 类型、接受 vec3f 参数的函数
fn someFunction(p: vec3f) -> mat4x4f { ... }

// 声明一个结构体
struct Foo { field: vec4f, };
{{/escapehtml}}</code></pre>
</div></div>

WGSL 有一个概念：如果你不指定变量的类型，它将从右侧表达式的类型推导出来，而 GLSL 要求你始终指定类型。换句话说，在 GLSL 中：

```glsl
vec4 color = texture(someTexture, someTextureCoord);
```

上面你需要将 `color` 声明为 `vec4`，但在 WGSL 中你可以这样做：

```
var color: vec4f = textureSample(someTexture, someSampler, someTextureCoord);
```

或者这样：

```
var color = textureSample(someTexture, someSampler, someTextureCoord);
```

在这两种情况下，`color` 都是 `vec4f`。

另一方面，最大的区别是所有 `@???` 部分。每一个都在声明该特定数据片段来自哪里。例如，注意顶点着色器和片段着色器中的 uniform 都声明了它们的 `@group(?) binding(?)`，这需要由你来确保它们不会冲突。上面的例子中顶点着色器使用 `binding(0)`，片段着色器使用 `binding(1)`、`binding(2)`、`binding(3)`。在上面的例子中有 2 个 uniform 块。我们可以使用 1 个。我选择使用 2 个是为了更好地将顶点着色器和片段着色器分开。

WebGL 和 WebGPU 之间的另一个区别是，在 WebGPU 中你可以在同一个源中放入多个着色器。在 WebGL 中，着色器的入口点总是叫做 `main`，但在 WebGPU 中，当你使用着色器时，你要指定调用哪个函数。

注意，在 WebGPU 中，属性被声明为顶点着色器函数的参数，而在 GLSL 中它们是在函数外部声明的全局变量；与 GLSL 不同的是，如果你不选择位置，编译器会分配一个，而在 WGSL 中我们必须提供位置。

对于 varying，在 GLSL 中它们也被声明为全局变量，而在 WGSL 中你声明一个结构体并为每个字段分配位置，声明你的顶点着色器返回该结构体，并在函数本身中返回该结构体的实例。在片段着色器中，你声明你的函数接收这些输入。

上面的代码对顶点着色器的输出和片段着色器的输入使用相同的结构体，但没有要求必须使用相同的结构体。所有需要的是位置匹配。例如，这样做也可以：

```wgsl
*struct MyFSInput {
*  @location(0) the_normal: vec3f,
*  @location(1) the_texcoord: vec2f,
*};

@fragment
*fn myFSMain(v: MyFSInput) -> @location(0) vec4f
{
*  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.the_texcoord);
*  var a_normal = normalize(v.the_normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
```

这样做也可以：

```wgsl
@fragment
fn myFSMain(
*  @location(1) uv: vec2f,
*  @location(0) nrm: vec3f,
) -> @location(0) vec4f
{
*  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, uv);
*  var a_normal = normalize(nrm);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
```

同样，重要的是位置要匹配，而不是名称。

另一个值得注意的区别是 GLSL 中的 `gl_Position` 在 WGSL 中只是一个用户声明结构体字段的特殊位置 `@builtin(position)`。同样，片段着色器的输出被分配了一个位置。这里是 `@location(0)`。这类似于在 WebGL1 的 `WEBGL_draw_buffers` 扩展中使用 `gl_FragData[0]`。同样，如果你想输出多个值，例如输出到多个渲染目标，你需要声明一个结构体并像我们为顶点着色器输出所做的那样分配位置。

### 获取 API

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function main() {
  const gl = document.querySelector('canvas').getContext('webgl');
  if (!gl) {
    fail('need webgl');
    return;
  }
}

main();
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

...
}

main();
{{/escapehtml}}</code></pre>
  </div>
</div>

这里，`adapter` 代表 GPU 本身，而 `device` 代表该 GPU 上的一个 API 实例。

这里最大的区别可能是：在 WebGPU 中获取 API 是异步的。

### 创建缓冲区

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createBuffer(gl, data, type = gl.ARRAY_BUFFER) {
  const buf = gl.createBuffer();
  gl.bindBuffer(type, buf);
  gl.bufferData(type, data, gl.STATIC_DRAW);
  return buf;
}

const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

const positionBuffer = createBuffer(gl, positions);
const normalBuffer = createBuffer(gl, normals);
const texcoordBuffer = createBuffer(gl, texcoords);
const indicesBuffer = createBuffer(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createBuffer(device, data, usage) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  const dst = new data.constructor(buffer.getMappedRange());
  dst.set(data);
  buffer.unmap();
  return buffer;
}

const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);
const normalBuffer = createBuffer(device, normals, GPUBufferUsage.VERTEX);
const texcoordBuffer = createBuffer(device, texcoords, GPUBufferUsage.VERTEX);
const indicesBuffer = createBuffer(device, indices, GPUBufferUsage.INDEX);
{{/escapehtml}}</code></pre>
  </div>
</div>

一眼就能看出，这些并没有太大的不同。你调用不同的函数，但除此之外非常相似。

### 创建纹理

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,    // level
    gl.RGBA,
    2,    // width
    2,    // height
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([
      255, 255, 128, 255,
      128, 255, 255, 255,
      255, 128, 255, 255,
      255, 128, 128, 255,
    ]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const tex = device.createTexture({
  size: [2, 2],
  format: 'rgba8unorm',
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST,
});
device.queue.writeTexture(
    { texture: tex },
    new Uint8Array([
      255, 255, 128, 255,
      128, 255, 255, 255,
      255, 128, 255, 255,
      255, 128, 128, 255,
    ]),
    { bytesPerRow: 8, rowsPerImage: 2 },
    { width: 2, height: 2 },
);

const sampler = device.createSampler({
  magFilter: 'nearest',
  minFilter: 'nearest',
});
{{/escapehtml}}</code></pre>
  </div>
</div>

同样，差别不大。一个区别是 WebGPU 中有使用标志（usage flags），你需要根据你计划对纹理做什么来设置它们。另一个区别是在 WebGPU 中我们需要创建采样器，这在 WebGL 中是可选的。

### 编译着色器

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh));
  }
  return sh;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vSrc);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fSrc);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const shaderModule = device.createShaderModule({code: shaderSrc});
{{/escapehtml}}</code></pre>
  </div>
</div>

一个细微的区别是，与 WebGL 不同，我们可以一次编译多个着色器。

在 WebGL 中，如果你的着色器没有编译，由你来检查 `COMPILE_STATUS` 并使用 `gl.getShaderParameter`，然后如果失败了，通过调用 `gl.getShaderInfoLog` 拉取错误信息。如果你没有这样做，就不会有错误显示。你很可能只是在稍后尝试使用着色器时才收到错误。

在 WebGPU 中，大多数实现会将错误打印到 JavaScript 控制台。当然，你仍然可以自己检查错误，但如果你什么都不做，仍然会得到一些有用的信息，这是非常好的。

### 链接程序 / 设置管线

管线，或者更具体地说"渲染管线"，代表以特定方式使用的一对着色器。在 WebGL 中发生的几件事在 WebGPU 中创建管线时被合并为一件。例如，链接着色器、设置属性参数、选择绘制模式（点、线、三角形）、设置深度缓冲区的使用方法等。

以下是代码。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createProgram(gl, vs, fs) {
  const prg = gl.createProgram();
  gl.attachShader(prg, vs);
  gl.attachShader(prg, fs);
  gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prg));
  }
  return prg;
}

const program = createProgram(gl, vs, fs);

...

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(normalLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(texcoordLoc);

....

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: shaderModule,
    buffers: [
      // position
      {
        arrayStride: 3 * 4, // 3 个 float，每个 4 字节
        attributes: [
          {shaderLocation: 0, offset: 0, format: 'float32x3'},
        ],
      },
      // normals
      {
        arrayStride: 3 * 4, // 3 个 float，每个 4 字节
        attributes: [
          {shaderLocation: 1, offset: 0, format: 'float32x3'},
        ],
      },
      // texcoords
      {
        arrayStride: 2 * 4, // 2 个 float，每个 4 字节
        attributes: [
          {shaderLocation: 2, offset: 0, format: 'float32x2',},
        ],
      },
    ],
  },
  fragment: {
    module: shaderModule,
    targets: [
      {format: presentationFormat},
    ],
  },
  primitive: {
    topology: 'triangle-list',
    cullMode: 'back',
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
  ...(canvasInfo.sampleCount > 1 && {
      multisample: {
        count: canvasInfo.sampleCount,
      },
  }),
});
{{/escapehtml}}</code></pre>
  </div>
</div>

需要注意的部分：

当你调用 `createRenderPipeline` 时会发生着色器链接，事实上 `createRenderPipeline` 是一个慢调用，因为根据设置，你的着色器可能会被内部调整。你可以看到，对于 `vertex` 和 `fragment`，我们指定了一个着色器 `module`，并通过 `entryPoint` 指定调用哪个函数。然后 WebGPU 需要确保这两个函数彼此兼容，就像在 WebGL 中将两个着色器链接成一个程序时会检查着色器是否彼此兼容一样。

在 WebGL 中，我们调用 `gl.vertexAttribPointer` 将当前的 `ARRAY_BUFFER` 缓冲区附加到属性*并*指定如何从该缓冲区中提取数据。在 WebGPU 中，我们只在创建管线时指定如何从缓冲区中提取数据。我们稍后指定使用哪些缓冲区。

在上面的例子中，你可以看到 `buffers` 是一个对象数组。这些对象叫做 `GPUVertexBufferLayout`。在每个对象中有一个属性数组。这里我们设置从 3 个不同的缓冲区获取数据。如果我们将数据交错到一个缓冲区中，我们就只需要一个 `GPUVertexBufferLayout`，但它的 `attribute` 数组将包含 3 个条目。

还要注意，这里是我们必须将 `shaderLocation` 与着色器中使用的内容匹配的地方。

在 WebGPU 中，我们在这里设置图元类型、背面剔除模式和深度设置。这意味着如果我们想要用任何不同的设置来绘制某些东西，例如，如果我们想用三角形绘制一些几何体，然后用线绘制，就需要创建多个管线。类似地，如果顶点布局不同。例如，如果一个模型的位置和纹理坐标分别在不同的缓冲区中，另一个在同一个缓冲区中但有偏移，而另一个是交错的，所有 3 个都需要自己的管线。

最后一部分 `multisample`，我们需要在绘制到多重采样目标纹理时使用。我把它放在这里是因为默认情况下 WebGL 会为画布使用多重采样纹理。要模拟这一点需要添加一个 `multisample` 属性。`presentationFormat` 和 `canvasInfo.sampleCount` 是我们将在下面介绍的内容。

### 准备 Uniform

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const u_lightDirectionLoc = gl.getUniformLocation(program, 'u_lightDirection');
const u_diffuseLoc = gl.getUniformLocation(program, 'u_diffuse');
const u_worldInverseTransposeLoc = gl.getUniformLocation(program, 'u_worldInverseTranspose');
const u_worldViewProjectionLoc = gl.getUniformLocation(program, 'u_worldViewProjection');
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const vUniformBufferSize = 2 * 16 * 4; // 2 个 mat4 * 每个 mat 16 个 float * 每个 float 4 字节
const fUniformBufferSize = 3 * 4;      // 1 个 vec3 * 每个 vec3 3 个 float * 每个 float 4 字节

const vsUniformBuffer = device.createBuffer({
  size: vUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const fsUniformBuffer = device.createBuffer({
  size: fUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const vsUniformValues = new Float32Array(2 * 16); // 2 个 mat4
const worldViewProjection = vsUniformValues.subarray(0, 16);
const worldInverseTranspose = vsUniformValues.subarray(16, 32);
const fsUniformValues = new Float32Array(3);  // 1 个 vec3
const lightDirection = fsUniformValues.subarray(0, 3);
{{/escapehtml}}</code></pre>
  </div>
</div>

在 WebGL 中，我们查找 uniform 的位置。在 WebGPU 中，我们创建缓冲区来保存 uniform 的值。上面的代码然后在更大的 CPU 端 TypedArray 中创建 TypedArray 视图，这些 TypedArray 保存 uniform 的值。注意，`vUniformBufferSize` 和 `fUniformBufferSize` 是手动计算的。同样，在 TypedArray 中创建视图时，偏移量和大小也是手动计算的。完全由你来做这些计算。与 WebGL 不同，WebGPU 不提供查询这些偏移量和大小的 API。

注意，WebGL2 也存在类似的过程，如果你使用 Uniform 块，但如果你从未使用过 Uniform 块，这将是一个新概念。

### 准备绘制

在 WebGL 中我们此时可以直接开始绘制，但在 WebGPU 中我们还有一些工作要做。

我们需要创建一个绑定组（bind group）。这让我们可以指定着色器将使用哪些资源。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 在渲染时发生
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 可以在初始化时发生
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: vsUniformBuffer  },
    { binding: 1, resource: fsUniformBuffer  },
    { binding: 2, resource: sampler },
    { binding: 3, resource: tex },
  ],
});
{{/escapehtml}}</code></pre>
  </div>
</div>

再次注意，`binding` 和 `group` 必须与我们着色器中指定的内容匹配。

在 WebGPU 中，我们还创建一个渲染通道描述符（render pass descriptor），而在 WebGL 中这些设置是通过有状态 API 调用来设置的，或者是自动处理的。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.clearColor(0.5, 0.5, 0.5, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const renderPassDescriptor = {
  colorAttachments: [
    {
      // view: undefined, // 稍后分配
      // resolveTarget: undefined, // 稍后分配
      clearValue: [0.5, 0.5, 0.5, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    // view: undefined,  // 稍后分配
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};
{{/escapehtml}}</code></pre>
  </div>
</div>

注意，WebGPU 中的许多设置与我们想要渲染的位置有关。在 WebGL 中，当渲染到画布时，所有这些都为我们处理了。当在 WebGL 中渲染到帧缓冲区时，这些设置相当于调用 `gl.framebufferTexture2D` 和/或 `gl.framebufferRenderbuffer`。

### 设置 Uniform

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.uniform3fv(u_lightDirectionLoc, v3.normalize([1, 8, -10]));
gl.uniform1i(u_diffuseLoc, 0);
gl.uniformMatrix4fv(u_worldInverseTransposeLoc, false, m4.transpose(m4.inverse(world)));
gl.uniformMatrix4fv(u_worldViewProjectionLoc, false, m4.multiply(viewProjection, world));
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
m4.transpose(m4.inverse(world), worldInverseTranspose);
m4.multiply(viewProjection, world, worldViewProjection);

v3.normalize([1, 8, -10], lightDirection);

device.queue.writeBuffer(vsUniformBuffer, 0, vsUniformValues);
device.queue.writeBuffer(fsUniformBuffer, 0, fsUniformValues);
{{/escapehtml}}</code></pre>
  </div>
</div>

在 WebGL 案例中，我们计算一个值，然后通过适当的 location 传递给 `gl.uniform???`。

在 WebGPU 案例中，我们将值写入 TypedArray，然后将那些 TypedArray 的内容复制到相应的 GPU 缓冲区。

注意：在 WebGL2 中，如果我们使用 Uniform 块，这个过程几乎完全相同，只是我们会调用 `gl.bufferSubData` 上传 TypedArray 内容。

### 调整绘图缓冲区的大小

正如文章开头提到的，这是 WebGL 为我们处理而 WebGPU 需要我们自己处理的地方之一。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function resizeCanvasToDisplaySize(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = width !== canvas.width || height !== canvas.height;
  if (needResize) {
    canvas.width = width;
    canvas.height = height;
  }
  return needResize;
}
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 在初始化时
const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');

const presentationFormat = navigator.gpu.getPreferredFormat(adapter);
context.configure({
  device,
  format: presentationFormat,
});

const canvasInfo = {
  canvas,
  presentationFormat,
  // 这些在 resizeToDisplaySize 中填充
  renderTarget: undefined,
  renderTargetView: undefined,
  depthTexture: undefined,
  depthTextureView: undefined,
  sampleCount: 4,  // 可以是 1 或 4
};

// --- 在渲染时 ---

function resizeToDisplaySize(device, canvasInfo) {
  const {
    canvas,
    context,
    renderTarget,
    presentationFormat,
    depthTexture,
    sampleCount,
  } = canvasInfo;
  const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
  const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));

  const needResize = !canvasInfo.renderTarget ||
                     width !== canvas.width ||
                     height !== canvas.height;
  if (needResize) {
    if (renderTarget) {
      renderTarget.destroy();
    }
    if (depthTexture) {
      depthTexture.destroy();
    }

    canvas.width = width;
    canvas.height = height;

    if (sampleCount > 1) {
      const newRenderTarget = device.createTexture({
        size: [canvas.width, canvas.height],
        format: presentationFormat,
        sampleCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      canvasInfo.renderTarget = newRenderTarget;
      canvasInfo.renderTargetView = newRenderTarget;
    }

    const newDepthTexture = device.createTexture({
      size: [canvas.width, canvas.height,
      format: 'depth24plus',
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    canvasInfo.depthTexture = newDepthTexture;
    canvasInfo.depthTextureView = newDepthTexture;
  }
  return needResize;
}
{{/escapehtml}}</code></pre>
  </div>
</div>

你可以看到上面有很多工作要做。如果我们需要调整大小，我们需要手动销毁旧纹理（颜色和深度）并创建新的。我们还需要检查不要超过限制，这是 WebGL 为我们处理的，至少对于画布来说是这样。

上面，`sampleCount` 属性实际上等价于 WebGL 上下文创建属性的 `antialias` 属性。`sampleCount: 4` 等价于 WebGL 的 `antialias: true`（默认值），而 `sampleCount: 1` 等价于创建 WebGL 上下文时的 `antialias: false`。

上面没有显示的另一件事是，WebGL 会尽量不耗尽内存，这意味着如果你请求一个 16000x16000 的画布，WebGL 可能会返回给你一个 4096x4096 的画布。你可以通过查看 `gl.drawingBufferWidth` 和 `gl.drawingBufferHeight` 来找出你实际得到了什么。

WebGL 这么做的原因是 (1) 将画布拉伸到多个显示器可能会使尺寸大于 GPU 能处理的大小 (2) 系统可能内存不足，而不是崩溃，WebGL 会返回一个更小的绘图缓冲区。

在 WebGPU 中，检查这两种情况由你自己负责。我们在上面检查了情况 (1)。对于情况 (2)，我们需要自己检查内存不足，与 WebGPU 中的其他一切一样，这样做是异步的。

```js
device.pushErrorScope('out-of-memory');
context.configure({...});
if (sampleCount > 1) {
  const newRenderTarget = device.createTexture({...});
  ...
}

const newDepthTexture = device.createTexture({...});
...
device.popErrorScope().then(error => {
  if (error) {
    // 内存不足，尝试更小的尺寸？
  }
});
```

### 绘制

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

...
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(normalLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(texcoordLoc);

...

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

gl.drawElements(gl.TRIANGLES, 6 * 6, gl.UNSIGNED_SHORT, 0);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
if (canvasInfo.sampleCount === 1) {
    const colorTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = colorTexture;
} else {
  renderPassDescriptor.colorAttachments[0].view = canvasInfo.renderTargetView;
  renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture();
}
renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTextureView;

const commandEncoder = device.createCommandEncoder();
const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, bindGroup);
passEncoder.setVertexBuffer(0, positionBuffer);
passEncoder.setVertexBuffer(1, normalBuffer);
passEncoder.setVertexBuffer(2, texcoordBuffer);
passEncoder.setIndexBuffer(indicesBuffer, 'uint16');
passEncoder.drawIndexed(indices.length);
passEncoder.end();
device.queue.submit([commandEncoder.finish()]);
{{/escapehtml}}</code></pre>
  </div>
</div>

注意，我在这里重复了 WebGL 的属性设置代码。在 WebGL 中，这可以在初始化时或渲染时发生。在 WebGPU 中，我们在初始化时设置如何从缓冲区中提取数据，但在渲染时设置要使用的实际缓冲区。

在 WebGPU 中，我们需要更新渲染通道描述符以使用我们可能刚刚在 `resizeToDisplaySize` 中更新的纹理。然后我们需要创建一个命令编码器并开始一个渲染通道。

在渲染通道内部，我们设置管线，这有点像 `gl.useProgram` 的等价物。然后我们设置绑定组，它提供采样器、纹理和 2 个 uniform 缓冲区。我们设置顶点缓冲区以匹配之前声明的内容。最后，我们设置索引缓冲区并调用 `drawIndexed`，这相当于调用 `gl.drawElements`。

回到 WebGL，我们需要调用 `gl.viewport`。在 WebGPU 中，通道编码器默认为与附件大小匹配的视口，所以除非我们想要不匹配的视口，否则我们不必单独设置视口。

在 WebGL 中，我们调用 `gl.clear` 来清除画布。而在 WebGPU 中，我们之前在创建渲染通道描述符时已经设置好了。

## 示例：

WebGL

{{{example url="../webgl-cube.html"}}}

WebGPU

{{{example url="../webgpu-cube.html"}}}

另一个需要注意的是，我们向一个叫做 `device.queue` 的东西发出指令。注意，当我们上传 uniform 的值时，我们调用了 `device.queue.writeBuffer`，然后当我们创建命令编码器并用 `device.queue.submit` 提交时。这应该很清楚地表明，我们不能在同一个命令编码器中的 draw 调用之间更新缓冲区。如果我们想绘制多个东西，我们需要多个缓冲区或单个缓冲区中的多组值。

# 绘制多个物体

让我们看一个绘制多个物体的例子。

如上所述，至少在最常见的方式中，绘制多个物体需要为每个物体准备一个不同的 uniform 缓冲区，这样我们就可以提供一组不同的矩阵。Uniform 缓冲区通过绑定组传入，所以我们也需要为每个物体准备一个不同的绑定组。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
+  const numObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < numObjects; ++i) {
+    const across = Math.sqrt(numObjects) | 0;
+    const x = (i % across - (across - 1) / 2) * 3;
+    const y = ((i / across | 0) - (across - 1) / 2) * 3;
+
+    objectInfos.push({
+      translation: [x, y, 0],
+    });
+  }
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  const vUniformBufferSize = 2 * 16 * 4; // 2 个 mat4 * 每个 mat 16 个 float * 每个 float 4 字节
  const fUniformBufferSize = 3 * 4;      // 1 个 vec3 * 每个 vec3 3 个 float * 每个 float 4 字节

  const fsUniformBuffer = device.createBuffer({
    size: Math.max(16, fUniformBufferSize),
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const fsUniformValues = new Float32Array(3); // 1 个 vec3
  const lightDirection = fsUniformValues.subarray(0, 3);

+  const numObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < numObjects; ++i) {
    const vsUniformBuffer = device.createBuffer({
      size: Math.max(16, vUniformBufferSize),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const vsUniformValues = new Float32Array(2 * 16); // 2 个 mat4
    const worldViewProjection = vsUniformValues.subarray(0, 16);
    const worldInverseTranspose = vsUniformValues.subarray(16, 32);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: vsUniformBuffer  },
        { binding: 1, resource: fsUniformBuffer  },
        { binding: 2, resource: sampler },
        { binding: 3, resource: tex },
      ],
    });

+    const across = Math.sqrt(numObjects) | 0;
+    const x = (i % across - (across - 1) / 2) * 3;
+    const y = ((i / across | 0) - (across - 1) / 2) * 3;
+
+    objectInfos.push({
+      vsUniformBuffer,  // 需要更新缓冲区
+      vsUniformValues,  // 需要更新缓冲区
+      worldViewProjection,  // 需要更新这个物体的 worldViewProjection
+      worldInverseTranspose,  // 需要更新这个物体的 worldInverseTranspose
+      bindGroup, // 需要渲染这个物体
+      translation: [x, y, 0],
+    });
+  }
{{/escapehtml}}</code></pre>
  </div>
</div>

注意，在这个例子中，我们共享 `fsUniforms`、它的缓冲区和值（其中包含我们包含在绑定组中的光照方向），它定义在循环外部，因为只有一个。

对于渲染，我们将设置共享部分，然后对于每个物体，更新其 uniform 值，将它们复制到相应的 uniform 缓冲区，并编码绘制它的命令。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  function render(time) {
    time *= 0.001;
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

*    const projection = mat4.perspective(30 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 100);
*    const eye = [1, 4, -46];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const view = mat4.lookAt(eye, target, up);
    const viewProjection = mat4.multiply(projection, view);

    gl.uniform3fv(u_lightDirectionLoc, vec3.normalize([1, 8, -10]));
    gl.uniform1i(u_diffuseLoc, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texcoordLoc);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

*    objectInfos.forEach(({translation}, ndx) => {
*      const world = mat4.translation(translation);
*      mat4.rotateX(world, time * 0.9 + ndx, world);
*      mat4.rotateY(world, time + ndx, world);

      gl.uniformMatrix4fv(u_worldInverseTransposeLoc, false, mat4.transpose(mat4.inverse(world)));
      gl.uniformMatrix4fv(u_worldViewProjectionLoc, false, mat4.multiply(viewProjection, world));

      gl.drawElements(gl.TRIANGLES, 6 * 6, gl.UNSIGNED_SHORT, 0);
*    });

    requestAnimationFrame(render);
  }{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  function render(time) {
    time *= 0.001;
    resizeToDisplaySize(device, canvasInfo);

    if (canvasInfo.sampleCount === 1) {
        const colorTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = colorTexture;
    } else {
      renderPassDescriptor.colorAttachments[0].view = canvasInfo.renderTargetView;
      renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture();
    }
    renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTextureView;

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // 当然这些可以是每个对象独立的，但由于我们多次绘制同一个对象，
    // 只需设置一次。
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, normalBuffer);
    passEncoder.setVertexBuffer(2, texcoordBuffer);
    passEncoder.setIndexBuffer(indicesBuffer, 'uint16');

*    const projection = mat4.perspective(30 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.5, 100);
*    const eye = [1, 4, -46];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const view = mat4.lookAt(eye, target, up);
    const viewProjection = mat4.multiply(projection, view);

    // 光照信息是共享的，所以只需设置一次这些 uniform
    vec3.normalize([1, 8, -10], lightDirection);
    device.queue.writeBuffer(fsUniformBuffer, 0, fsUniformValues);

+    objectInfos.forEach(({
+      vsUniformBuffer,
+      vsUniformValues,
+      worldViewProjection,
+      worldInverseTranspose,
+      bindGroup,
+      translation,
+    }, ndx) => {
      passEncoder.setBindGroup(0, bindGroup);

*      const world = mat4.translation(translation);
*      mat4.rotateX(world, time * 0.9 + ndx, world);
*      mat4.rotateY(world, time + ndx, world);
      mat4.transpose(mat4.inverse(world), worldInverseTranspose);
      mat4.multiply(viewProjection, world, worldViewProjection);

      device.queue.writeBuffer(vsUniformBuffer, 0, vsUniformValues);
      passEncoder.drawIndexed(indices.length);
+    });
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
{{/escapehtml}}</code></pre>
  </div>
</div>

与我们单个立方体相比没有太大区别，但代码被轻微重新排列，将共享的东西放在对象循环外面。在这个特定的案例中，由于我们绘制同一个立方体 100 次，不需要更新顶点缓冲区或索引缓冲区，但当然如果需要，我们可以为每个对象更改它们。

WebGL

{{{example url="../webgl-cube-multiple.html"}}}

WebGPU

{{{example url="../webgpu-cube-multiple.html"}}}

重要的一点是，与 WebGL 不同，对于任何特定于物体的 uniform（如世界矩阵），你将需要 uniform 缓冲区，并且，正因为如此，你也可能需要为每个物体准备一个唯一的绑定组。

## 其他随机差异

### Z 裁剪空间是 0 到 1

在 WebGL 中 Z 裁剪空间是 -1 到 +1。在 WebGPU 中是 0 到 1（顺便说一句，这样做更有意义！）

### 帧缓冲区、视口坐标中的 Y 轴向下

这与 WebGL 相反，但在裁剪空间中 Y 轴向上（与 WebGL 相同）。

换句话说，从顶点着色器返回 (-1, -1) 在 WebGL 和 WebGPU 中都会引用左下角。另一方面，将视口或裁剪矩形设置为 `0, 0, 1, 1` 在 WebGL 中引用左下角，但在 WebGPU 中引用左上角。

### WGSL 使用 `@builtin(???)` 来表示 GLSL 的 `gl_XXX` 变量。

`gl_FragCoord` 是 `@builtin(position) myVarOrField: vec4f`，与 WebGL 不同，它在屏幕上向下，所以 0,0 是左上角，而 WebGL 中 0,0 是左下角。

`gl_VertexID` 是 `@builtin(vertex_index) myVarOrField: u32`

`gl_InstanceID` 是 `@builtin(instance_index) myVarOrField: u32`

`gl_Position` 是 `@builtin(position) vec4f`，可以是顶点着色器的返回值或顶点着色器返回的结构体中的一个字段。

没有 `gl_PointSize` 和 `gl_PointCoord` 的等价物，因为点在 WebGPU 中只有 1 像素。幸运的是很容易[自己绘制点](webgpu-points.html)。

你可以在[这里](https://www.w3.org/TR/WGSL/#builtin-variables)看到其他内置变量。

### WGSL 只支持 1 像素宽的线和点

根据规范，WebGL2 可以支持大于 1 像素的线，但实际上没有任何实现这样做。WebGL2 通常确实支持大于 1 像素的点，但是 (a) 许多 GPU 只支持最大 64 像素的大小，(b) 不同的 GPU 会根据点的中心进行裁剪或不裁剪。因此，WebGPU 不支持 1 像素以外大小的点可以说是件好事。这迫使你实现一个可移植的点解决方案。

### WebGPU 优化与 WebGL 不同

如果你把一个 WebGL 应用直接转换成 WebGPU，你可能会发现它运行得更慢。要获得 WebGPU 的优势，你需要改变你组织数据和优化绘制的方式。
有关想法，请参见[这篇关于 WebGPU 优化的文章](webgpu-optimization.html)。

注意：如果你在[优化文章](webgpu-optimization.html)中比较 WebGL 和 WebGPU，这里有 2 个 WebGL 示例可以用来比较：

* [使用标准 WebGL uniform 在 WebGL 中绘制多达 30000 个物体](../webgl-optimization-none.html)
* [使用 uniform 块在 WebGL 中绘制多达 30000 个物体](../webgl-optimization-none-uniform-buffers.html)
* [使用全局/材质/每物体 uniform 块在 WebGL 中绘制多达 30000 个物体](../webgl-optimization-global-material-per-object-uniform-buffers.html)
* [使用一个大 uniform 缓冲区在 WebGL 中绘制多达 30000 个物体](../webgl-optimization-uniform-buffers-one-large.html)

另一篇文章，如果你想比较 WebGL 与 WebGPU 的性能，请参见[这篇文章](https://toji.dev/webgpu-best-practices/webgl-performance-comparison)。

---

如果你已经熟悉 WebGL，希望这篇文章对你有用。
