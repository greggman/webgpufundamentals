Title: WebGPU ポイント
Description: WebGPUでのポイントの描画
TOC: ポイント

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

WebGPUはポイントへの描画をサポートしています。これを行うには、レンダーパイプラインでプリミティブトポロジを`'point-list'`に設定します。

[頂点バッファに関する記事](webgpu-vertex-buffers.html)で紹介したアイデアから始めて、ランダムなポイントを持つ簡単な例を作成しましょう。

まず、単純な頂点シェーダーとフラグメントシェーダーです。簡単にするために、位置にはクリップ空間座標を使用し、フラグメントシェーダーでは色を黄色にハードコーディングします。

```wgsl
struct Vertex {
  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vert.position;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // yellow
}
```

次に、パイプラインを作成するときに、トポロジを`'point-list'`に設定します。

```js
  const pipeline = device.createRenderPipeline({
    label: '1 pixel points',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    primitive: {
+      topology: 'point-list',
+    },
  });
```

頂点バッファにランダムなクリップ空間ポイントをいくつか入力しましょう。

```js
  const rand = (min, max) => min + Math.random() * (max - min);

  const kNumPoints = 100;
  const vertexData = new Float32Array(kNumPoints * 2);
  for (let i = 0; i < kNumPoints; ++i) {
    const offset = i * 2;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
  }

  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

そして、描画します。

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(kNumPoints);
    pass.end();
```

そして、100個のランダムな黄色の点が得られます。

{{{example url="../webgpu-points.html"}}}

残念ながら、それらはすべて1ピクセルのサイズしかありません。1ピクセルサイズのポイントは、WebGPUがサポートするすべてです。もっと大きなものが必要な場合は、自分で行う必要があります。幸いなことに、それは簡単です。クワッドを作成し、[インスタンス化](webgpu-vertex-buffers.html#a-instancing)を使用するだけです。

頂点シェーダーにクワッドとサイズ属性を追加しましょう。また、描画しているテクスチャのサイズを渡すためのユニフォームも追加しましょう。

```wgsl
struct Vertex {
  @location(0) position: vec2f,
+  @location(1) size: f32,
};

+struct Uniforms {
+  resolution: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
};

+@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
  var vsOut: VSOutput;
+  let pos = points[vNdx];
-  vsOut.position = vec4f(vert.position, 0, 1);
+  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // yellow
}
```

JavaScriptでは、ポイントごとにサイズ属性を追加し、`stepMode: 'instance'`を設定してインスタンスごとに属性を進めるように設定し、デフォルトの`'triangle-list'`が必要なのでトポロジ設定を削除できます。

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable points',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 2 * 4, // 2 floats, 4 bytes each
+          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
+          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
+            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });
```

頂点データにポイントごとにランダムなサイズを追加しましょう。

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 2);
+  const vertexData = new Float32Array(kNumPoints * 3);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 2;
+    const offset = i * 3;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
+    vertexData[offset + 2] = rand(1, 32);
  }
```

解像度を渡すことができるように、ユニフォームバッファが必要です。

```js
  const uniformValues = new Float32Array(2);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kResolutionOffset = 0;
  const resolutionValue = uniformValues.subarray(
      kResolutionOffset, kResolutionOffset + 2);
```

そして、ユニフォームバッファをバインドするためのバインドグループが必要です。

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

次に、レンダリング時に、現在の解像度でユニフォームバッファを更新できます。

```js
    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    // ユニフォームバッファの解像度を更新します
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

次に、バインドグループを設定し、ポイントごとにインスタンスをレンダリングします。

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setBindGroup(0, bindGroup);
-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);
    pass.end();
```

そして、サイズ変更可能なポイントができました。

{{{example url="../webgpu-points-w-size.html"}}}

ポイントにテクスチャを付けたい場合はどうすればよいでしょうか？頂点シェーダーからフラグメントシェーダーにテクスチャ座標を渡すだけです。

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
+  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
```

そしてもちろん、フラグメントシェーダーでテクスチャを使用します。

```wgsl
+@group(0) @binding(1) var s: sampler;
+@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return vec4f(1, 1, 0, 1); // yellow
+  return textureSample(t, s, vsOut.texcoord);
}
```

[テクスチャのインポートに関する記事](webgpu-importing-textures.html)で説明したように、キャンバスを使用して単純なテクスチャを作成します。

```js
  const ctx = new OffscreenCanvas(32, 32).getContext('2d');
  ctx.font = '27px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥑', 16, 16);

  const texture = device.createTexture({
    size: [32, 32],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING |
           GPUTextureUsage.COPY_DST |
           GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: ctx.canvas, flipY: true },
    { texture, premultipliedAlpha: true },
    [32, 32],
  );
```

そして、サンプラーが必要であり、それらをバインドグループに追加する必要があります。

```js
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
+      { binding: 1, resource: sampler },
+      { binding: 2, resource: texture },
    ],
  });
```

[透明度](webgpu-transparency.html)を得るために、ブレンドもオンにしましょう。

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable points with texture',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
          ],
        },
      ],
    },
    fragment: {
      module,
-      targets: [{ format: presentationFormat }],
+      targets: [
+        {
+         format: presentationFormat,
+          blend: {
+            color: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+            alpha: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+          },
+        },
+      ],
    },
  });
```

そして、テクスチャ付きのポイントができました。

{{{example url="../webgpu-points-w-texture.html"}}}

そして、続けていくことができます。ポイントごとに回転はどうでしょうか？[行列演算に関する記事](webgpu-matrix-math.html)で説明した数学を使用します。

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
+  @location(2) rotation: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
+  let c = cos(vert.rotation);
+  let s = sin(vert.rotation);
+  let rot = mat2x2f(
+     c, s,
+    -s, c,
+  );
-  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.position = vec4f(vert.position + rot * pos * vert.size / uni.resolution, 0, 1);
  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
      }
```

パイプラインに回転属性を追加する必要があります。

```js
  const pipeline = device.createRenderPipeline({
    label: 'sizeable rotatable points with texture',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes each
+          arrayStride: (2 + 1 + 1) * 4, // 4 floats, 4 bytes each
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
            {shaderLocation: 1, offset: 8, format: 'float32'},  // size
+            {shaderLocation: 2, offset: 12, format: 'float32'},  // rotation
          ],
        },
      ],
    },
    ...
```

頂点データに回転を追加する必要があります。

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 3);
+  const vertexData = new Float32Array(kNumPoints * 4);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 3;
+    const offset = i * 4;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
*    vertexData[offset + 2] = rand(10, 64);
+    vertexData[offset + 3] = rand(0, Math.PI * 2);
  }

```

テクスチャを🥑から👉に変更しましょう。

```js
-  ctx.fillText('🥑', 16, 16);
+  ctx.fillText('👉', 16, 16);
```

{{{example url="../webgpu-points-w-rotation.html" }}}

# 3Dのポイントはどうですか？

簡単な答えは、[頂点の3D数学](webgpu-perspective-projection.html)を行った後、クワッド値を追加するだけです。

たとえば、[フィボナッチ球](https://www.google.com/search?q=fibonacci+sphere)の3D位置を作成するコードは次のとおりです。

```js
function createFibonacciSphereVertices({
  numSamples,
  radius,
}) {
  const vertices = [];
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < numSamples; ++i) {
    const offset = 2 / numSamples;
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - Math.pow(y, 2));
    const phi = (i % numSamples) * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    vertices.push(x * radius, y * radius, z * radius);
  }
  return new Float32Array(vertices);
}
```

[3D数学に関するシリーズで説明したように](webgpu-cameras.js)、頂点に3D数学を適用してポイントで頂点を描画できます。

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
*  matrix: mat4x4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
*  let clipPos = uni.matrix * vert.position;
  vsOut.position = clipPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);  // orange
}
```

パイプラインと頂点バッファは次のとおりです。

```js
  const pipeline = device.createRenderPipeline({
    label: '3d points with fixed size',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'point-list',
    },
  });

  const vertexData = createFibonacciSphereVertices({
    radius: 1,
    numSamples: 1000,
  });
  const kNumPoints = vertexData.length / 3;

  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

そして、行列用のユニフォームバッファとユニフォーム値、およびユニフォームバッファをシェーダーに渡すためのバインドグループです。

```js
  const uniformValues = new Float32Array(16);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kMatrixOffset = 0;
  const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

そして、射影行列、カメラ、その他の3D数学を使用して描画するコードです。

```js
  function render(time) {
    time *= 0.001;

    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

    // ユニフォームバッファに行列を設定します
    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // position
      [0, 0, 0],    // target
      [0, 1, 0],    // up
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

    // ユニフォーム値をGPUにコピーします
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(kNumPoints);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
```

`requestAnimationFrame`ループにも切り替えました。

{{{example url="../webgpu-points-3d-1px.html"}}}

見にくいので、上記の手法を適用するには、以前に行ったようにクワッド位置を追加するだけです。

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
  matrix: mat4x4f,
+  resolution: vec2f,
+  size: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
  var vsOut: VSOutput;
+  let pos = points[vNdx];
  let clipPos = uni.matrix * vert.position;
+  let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
-  vsOut.position = clipPos;
+  vsOut.position = clipPos + pointPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);
}
```

前の例とは異なり、各頂点に異なるサイズは使用しません。代わりに、すべての頂点に単一のサイズを渡します。

```js
-  const uniformValues = new Float32Array(16);
+  const uniformValues = new Float32Array(16 + 2 + 1 + 1);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kMatrixOffset = 0;
+  const kResolutionOffset = 16;
+  const kSizeOffset = 18;
  const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);
+  const resolutionValue = uniformValues.subarray(
+      kResolutionOffset, kResolutionOffset + 2);
+  const sizeValue = uniformValues.subarray(
+      kSizeOffset, kSizeOffset + 1);
```

上記のように解像度を設定し、サイズを設定する必要があります。

```js
  function render(time) {
    ...
+    // ユニフォームバッファにサイズを設定します
+    sizeValue[0] = 10;

    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // position
      [0, 0, 0],    // target
      [0, 1, 0],    // up
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

+    // ユニフォームバッファの解像度を更新します
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);

    // ユニフォーム値をGPUにコピーします
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

そして、以前に行ったように、ポイントの描画からインスタンス化されたクワッドの描画に切り替える必要があります。

```js
  const pipeline = device.createRenderPipeline({
    label: '3d points',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes each
+          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });

  ...

  function render(time) {

    ...

-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);

    ...
```

これにより、3Dのポイントが得られます。カメラからの距離に基づいてスケーリングもされます。

{{{example url="../webgpu-points-3d.html"}}}

## <a id="a-fixed-size-3d-points"></a>固定サイズの3Dポイント

ポイントのサイズを固定したい場合はどうすればよいでしょうか？

[遠近投影に関する記事](webgpu-perspective-projection.html)から、GPUは頂点シェーダーから返す位置をWで除算することを思い出してください。この除算により、遠くのものが小さく見える遠近感が得られます。したがって、サイズを変更したくないポイントについては、それらをそのWで乗算するだけで、除算された後に本当に欲しかった値になります。

```wgsl
    var vsOut: VSOutput;
    let pos = points[vNdx];
    let clipPos = uni.matrix * vert.position;
-    let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
+    let pointPos = vec4f(pos * uni.size / uni.resolution * clipPos.w, 0, 0);
    vsOut.position = clipPos + pointPos;
    return vsOut;
```

そして、今では同じサイズを維持します。

{{{example url="../webgpu-points-3d-fixed-size.html"}}}

<div class="webgpu_bottombar">
<h3>なぜWebGPUは1x1ピクセルより大きいポイントをサポートしないのですか？</h3>
<p>WebGPUは、Vulkan、Metal、DirectX、さらにはOpenGLなどのネイティブGPU APIに基づいています。残念ながら、これらのAPIは、ポイントのレンダリングをサポートすることの意味について互いに同意していません。一部のAPIには、ポイントのサイズにデバイス依存の制限があります。一部のAPIは、中心がクリップスペースの外側にある場合、ポイントをレンダリングしませんが、他のAPIはレンダリングします。一部のAPIでは、この2番目の問題はドライバー次第です。これらすべてが、WebGPUがポータブルなことを行い、1x1サイズのピクセルのみをサポートすることを決定したことを意味します。</p>
<p>良い点は、上記のように、より大きなポイントを自分で簡単にサポートできることです。上記の解決策は、デバイス間でポータブルであり、ポイントのサイズに制限がなく、デバイス間で一貫してポイントをクリップします。ポイントの中心がクリップスペースの外側にあるかどうかに関係なく、クリップスペースの内側にあるポイントの部分を描画します。</p>
<p>さらに良いことに、これらの解決策はより柔軟です。たとえば、ポイントの回転は、ネイティブAPIでサポートされているものではありません。独自の解決策を実装することで、より多くの機能を追加して、物事をさらに柔軟にすることができます。</p>
</div>
