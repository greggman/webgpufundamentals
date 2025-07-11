Title: WebGPU 複数のキャンバス
Description: 複数のキャンバス
TOC: 複数のキャンバス

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

WebGPUで複数のキャンバスに描画するのは非常に簡単です。[基礎に関する記事](webgpu-fundamentals.html)では、キャンバスを検索し、`getContext`を呼び出してコンテキストを構成しました。

```js
  // キャンバスからWebGPUコンテキストを取得し、構成します
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

キャンバスに描画するために、そのコンテキストを使用してキャンバスのテクスチャを取得し、そのテクスチャをレンダーパスの最初の`colorAttachment`として設定しました。

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
*        // view: <- レンダリング時に設定されます
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  

  function render() {
    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
*    renderPassDescriptor.colorAttachments[0].view =
*        context.getCurrentTexture();

    // コマンドをエンコードし始めるためのコマンドエンコーダーを作成します
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // レンダリング固有のコマンドをエンコードするためのレンダーパスエンコーダーを作成します
    const pass = encoder.beginRenderPass(renderPassDescriptor);

```

別のキャンバスに描画するには、そのキャンバスに対して同じ手順に従うだけです。

1. キャンバスを検索します（または作成します）。
2. 「webgpu」コンテキストを取得します。
3. コンテキストを構成します。
4. そのキャンバスにレンダリングしたい場合は、`context.getCurrentTexture`を呼び出し、そのテクスチャをレンダーパスの`colorAttachment`として使用します。

最初の例を取り上げ、3つのキャンバスにレンダリングしましょう。

まず、さらに2つのキャンバスを追加しましょう。

```html
  <body>
    <canvas></canvas>
+    <canvas></canvas>
+    <canvas></canvas>
  </body>
```

次に、コンテキストを取得し、すべてのキャンバスを構成しましょう。

```js
  // 各キャンバスのWebGPUコンテキストを取得し、構成します
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

そして最後に、それらすべてにレンダリングしましょう。

```js
  function render() {
*    // コマンドをエンコードし始めるためのコマンドエンコーダーを作成します
*    const encoder = device.createCommandEncoder({ label: 'our encoder' });

+    for (const {context} of infos) {
      // キャンバスコンテキストから現在のテクスチャを取得し、
      // レンダリングするテクスチャとして設定します。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();

      // レンダリング固有のコマンドをエンコードするためのレンダーパスエンコーダーを作成します
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // 頂点シェーダーを3回呼び出します。
      pass.end();
+    }

*    const commandBuffer = encoder.finish();
*    device.queue.submit([commandBuffer]);
  }

  render();
```

変更点は、（1）コマンドエンコーダーを作成する場所で、3つのキャンバスすべてをレンダリングするために共有できるようにしたこと、（2）コンテキストをループ処理したことです。

そして、3つのキャンバスにレンダリングしました。

{{{example url="../webgpu-multiple-canvases.html" }}}

注：単一のコマンドエンコーダーを作成することは厳密には必要ありませんが、わずかに効率的です。

では、他に何が残っているでしょうか？

## 多数のキャンバスの最適化

回転する製品を表示したいとしましょう。これを簡単にするために、ハードコードされた三角形に固執しますが、[行列演算に関する記事で説明したように](webgpu-matrix-math.html)行列を渡すことで回転するようにしましょう。また、それぞれがわずかに異なるように見えるように色を渡しましょう。

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
      vec2f( 0.0,  0.5),  // top center
      vec2f(-0.5, -0.5),  // bottom left
      vec2f( 0.5, -0.5)   // bottom right
    );

-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+    return uni.matrix * vec4f(pos[vertexIndex], 0.0, 1.0);
  }

  @fragment fn fs() -> @location(0) vec4f {
-    return vec4f(1, 0, 0, 1);
+    return uni.color;
  }
```


それぞれに[ユニフォームバッファ](webgpu-uniforms.html)と、バインドグループと関連するものが必要です。

200個のキャンバスを作成し、WebGPU用に構成しましょう。

```js
  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // これを作成します
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

    // WebGPUコンテキストを取得して構成します。
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

これに伴うCSSが必要です。

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

4つのサイズは、物事を正しく行っていることを確認するためだけです。すべて同じサイズにした場合、間違いを隠してしまう可能性があります。

それぞれにユニフォームバッファとバインドグループが必要です。後で色を変更しないので、今すぐ1つ選択します。ランダムなclearValueも選択しましょう（なぜですか？🤷‍♂️）。

```js
+  function randomColor() {
+    return [Math.random(), Math.random(), Math.random(), 1];
+  }

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    ...

+    // ユニフォーム用のユニフォームバッファと型配列ビューを作成します。
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
+    // このユニフォームのバインドグループを作成します
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

[各キャンバスのサイズを変更する](webgpu-fundamentals.html#a-resizing)ために`ResizeObserver`も追加しましょう。

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
    // これを作成します
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);

    ...
```

レンダリング時に、`requestAnimationFrame`（rAF）ループを使用してアニメーション化します。

```js
+  function render(time) {
+    time *= 0.001; // 秒に変換します

    ...

+    requestAnimationFrame(render);
  }

-  render();
+  requestAnimationFrame(render);
```

そして、各キャンバスの行列を更新し、新しい値をユニフォームバッファにアップロードし、バインドグループを設定する必要があります。

```js
  function render(time) {
    time *= 0.001; // 秒に変換します

    // コマンドをエンコードし始めるためのコマンドエンコーダーを作成します
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    for (const {
      context,
      uniformBuffer,
      uniformValues,
      matrixValue,
      bindGroup,
      clearValue,
    } of infos) {
      // キャンバスコンテキストから現在のテクスチャを取得し、
      // レンダリングするテクスチャとして設定します。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
+      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;
+
+      const { canvas } = context;
+      const aspect = canvas.clientWidth / canvas.clientHeight;
+      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
+      mat4.rotateZ(matrixValue, time * 0.1, matrixValue);
+
+      // ユニフォーム値をアップロードします。
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // レンダリング固有のコマンドをエンコードするためのレンダーパスエンコーダーを作成します
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
+      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // 頂点シェーダーを3回呼び出します。
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
```

さらにいくつか追加しましょう。その理由は後で説明します。

全体を停止および開始する方法を追加しましょう。まず、ボタンを追加します。

```html
  <body>
+    <button type="button" id="stop">停止/開始</button>
  </body>
```

そして、そのためのCSSです。

```css
  #stop {
    position: fixed;
    right: 0;
    top: 0;
    margin: 0.5em;
    z-index: 1;
  }
```

次に、アニメーションを開始および停止するようにコードを変更しましょう。

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

これは機能しますが、一時停止してから後で再開すると、すべてのオブジェクトがジャンプします。これは、レンダリングを停止しても、`time`値はページが読み込まれてからの時間であり、回転の計算に使用されるためです。

したがって、アニメーション化しているときにのみ進む独自の時間を保持することで、これを修正しましょう。

```js
+  let time = 0;
+  let then = 0;
  let requestId;
-  function render(time) {
-    time *= 0.001
+  function render(now) {
+    now *= 0.001; // 秒に変換します
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

そして、200個のキャンバスができました。

{{{example url="../webgpu-multiple-canvases-x200.html"}}}

この例は重いことに気づくかもしれません！問題は、表示されているのはごくわずかであるにもかかわらず、200個のキャンバスすべてをレンダリングしていることです。キャンバスごとに1つの三角形だけでなく、詳細な製品モデルを描画していたら、はるかに悪化していたでしょう。これが、停止/開始ボタンを追加した理由です。例が実行されている場合、このページは重すぎる可能性があるため、続行する前に停止することをお勧めします。

> 注：このサイトでは、例自体が表示されている場合にのみ、例をレンダリングおよびアニメーション化しようとします。

この問題を解決する1つの方法は、`IntersectionObserver`を使用することです。

## <a id="a-intersection-observer"></a> `IntersectionObserver`の使用

`IntersectionObserver`は、この種の状況のために特別に設計されました。`IntersectionObserver`は、その名のとおり、交差を監視します。デフォルトでは、要素とブラウザウィンドウの交差を監視します。これを使用して、実際に表示されているキャンバスのセットを保持し、それらのキャンバスのみをレンダリングできます。

コードは次のとおりです。

まず、`IntersectionObserver`を作成します。`ResizeObserver`と同様に、監視対象の要素がウィンドウと交差し始めたり停止したりしたときに呼び出される関数を受け取ります。

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

上記のように、エントリの配列でコールバックを呼び出します。各エントリは、交差しているかどうかを示します。これを使用して、表示されているキャンバスの`Set`を保持します。

各キャンバスを監視するように指示する必要があります。また、キャンバスからそのキャンバスの情報にアクセスする方法も必要です。この場合、それはコンテキスト、ユニフォームバッファ、バインドグループなどです。キャンバスからその情報にアクセスするには、`Map`を使用します。

```js
-  const infos = [];
+  const canvasToInfoMap = new Map();
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // これを作成します
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

レンダー関数では、表示されているキャンバスのみをレンダリングできます。

```js
  function render(now) {
    ...

    // コマンドをエンコードし始めるためのコマンドエンコーダーを作成します
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

      // キャンバスコンテキストから現在のテクスチャを取得し、
      // レンダリングするテクスチャとして設定します。
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;

-      const { canvas } = context;
      const aspect = canvas.clientWidth / canvas.clientHeight;
      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
      mat4.rotateZ(matrixValue, time * 0.1 + rotation, matrixValue);

      // ユニフォーム値をアップロードします。
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // レンダリング固有のコマンドをエンコードするためのレンダーパスエンコーダーを作成します
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // 頂点シェーダーを3回呼び出します。
      pass.end();
-    }
+    };

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestId = requestAnimationFrame(render);
  }
```

そして、これで、実際に表示されているキャンバスのみを描画しています。これにより、うまくいけばはるかに軽くなるはずです。

{{{example url="../webgpu-multiple-canvases-x200-optimized.html"}}}

`IntersectionObserver`は、すべてのケースをカバーするわけではないでしょう。各キャンバスに非常に重いものを描画している場合は、ユーザーが選択したキャンバスのみをアニメーション化したい場合があります。いずれにせよ、うまくいけば、ツールボックスにさらに1つのツールが追加されました。