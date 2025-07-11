Title: WebGPU ストレージテクスチャ
Description: ストレージテクスチャの使用方法
TOC: ストレージテクスチャ

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

ストレージテクスチャは、直接書き込みまたは「保存」できる[テクスチャ](webgpu-textures.html)です。通常、頂点シェーダーで三角形を指定し、GPUが間接的にテクスチャを更新しますが、ストレージテクスチャを使用すると、好きな場所に直接テクスチャに書き込むことができます。

ストレージテクスチャは特別な種類のテクスチャではなく、`createTexture`で作成する他のテクスチャと同様のテクスチャです。`STORAGE_BINDING`使用法フラグを追加すると、必要な他の使用法フラグに加えて、テクスチャをストレージテクスチャとして使用でき、その後、テクスチャをストレージテクスチャとして使用することもできます。

ある意味で、ストレージテクスチャは、2D配列として使用するストレージバッファのようなものです。たとえば、ストレージバッファを作成し、次のようにコードで参照できます。

```wgsl
@group(0) @binding(0)
  var<storage> buf: array<f32>;

...
fn loadValueFromBuffer(pos: vec2u) -> f32 {
  return buffer[pos.y * width + pos.x];
}

fn storeValueToBuffer(pos: vec2u, v: f32) {
  buffer[pos.y * width + pos.x] = v;
}

...
  let pos = vec2u(2, 3);
  var v = loadValueFromBuffer(pos);
  storeValueToBuffer(pos, v * 2.0);

```

ストレージテクスチャに対して

```
@group(0) @binding(0)
  var tex: texture_storage_2d<r32float, read_write>;

...

   let pos = vec2u(2, 3);
   let mipLevel = 0;
   var v = textureLoad(tex, pos, mipLevel);
   textureStore(tex, pos, mipLevel, v * 2);

```

したがって、それらが同等であるように見える場合、手動でストレージバッファを使用する場合とストレージテクスチャを使用する場合の違いは何でしょうか？

* ストレージテクスチャは依然としてテクスチャです。

  1つのシェーダーでストレージテクスチャとして使用し、別のシェーダーで通常のテクスチャ（サンプラー、ミップマッピングなど）として使用できます。

* ストレージテクスチャにはフォーマット解釈がありますが、ストレージバッファにはありません。

  例：

  ```wsgl
  @group(0) @binding(0) var tex: texture_storage_2d<rgba8unorm, read>;
  @group(0) @binding(1) var buf: array<f32>;

     ...
      let t = textureLoad(tex, pos, 0);
      let b = buffer[pos.y * bufferWidth + pos.x];
  ```

  上記では、`textureLoad`を呼び出すと、テクスチャは`rgba8unorm`テクスチャであり、4バイトがロードされ、自動的に0から1の間の4つの浮動小数点値に変換され、`vec4f`として返されます。

  バッファの場合、4バイトが単一の`f32`値としてロードされます。バッファを`array<u32>`に変更し、値をロードし、手動で4バイト値に分割し、それらを自分で浮動小数点数に変換することもできますが、それが望むものであれば、ストレージテクスチャで無料で入手できます。

* ストレージテクスチャには次元があります。

  バッファの場合、唯一の次元はその長さ、またはむしろ、そのバインディングの長さです[^binding]。上記では、バッファを2D配列として使用した場合、2D座標から1Dバッファインデックスに変換するために`width`が必要でした。`width`の値をハードコーディングするか、何らかの方法で渡す必要があります[^how-to-pass-data]。テクスチャを使用すると、`textureDimensions`を呼び出してテクスチャの次元を取得できます。

  [^binding]: バインドグループを作成し、バッファを指定する場合、オプションでオフセットと長さを指定できます。シェーダーでは、配列の長さはバッファの長さではなく、バインディングの長さから計算されます。オフセットを指定しない場合、デフォルトは0になり、長さはバッファ全体のサイズになります。

  [^how-to-pass-data]: バッファの幅は、[ユニフォーム](webgpu-uniforms.html)、別の[ストレージバッファ](webgpu-storage-buffers.html)、または同じバッファの最初の値として渡すことができます。

とはいえ、ストレージテクスチャには制限があります。

* 特定のフォーマットのみが`read_write`可能です。

  これらは`r32float`、`r32sint`、`r32uint`です。

  他のサポートされているフォーマットは、単一のシェーダー内で`read`または`write`のみ可能です。

* 特定のフォーマットのみがストレージテクスチャとして使用できます。

  多数のテクスチャフォーマットがありますが、ストレージテクスチャとして使用できるのは特定のフォーマットのみです。

  * `rgba8(unorm/snorm/sint/uint)`
  * `rgba16(float/sint/uint)`
  * `rg32(float/sint/uint)`
  * `rgba32(float/sint/uint)`

  欠落していることに気づく1つのフォーマットは`bgra8unorm`です。これについては以下で説明します。

* ストレージテクスチャはサンプラーを使用できません。

  テクスチャを通常の`TEXTURE_BINDING`として使用する場合、`textureSample`のような関数を呼び出すことができます。これは、ミップレベル全体で最大16個のテクセルをロードし、それらをブレンドします。テクスチャを`STORAGE_BINDING`として使用する場合、一度に1つのテクセルをロードおよび保存する`textureLoad`および/または`textureStore`のみを呼び出すことができます。

## ストレージテクスチャとしてのキャンバス

キャンバステクスチャをストレージテクスチャとして使用できます。そのためには、ストレージテクスチャとして使用できるテクスチャを提供するようにコンテキストを構成します。

```js
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device,
    format: presentationFormat,
+    usage: GPUTextureUsage.TEXTURE_BINDING |
+           GPUTextureUsage.STORAGE_BINDING,
  });
```

`TEXTURE_BINDING`は、ブラウザ自体がテクスチャをページにレンダリングできるようにするために必要です。`STORAGE_BINDING`を使用すると、キャンバスのテクスチャをストレージテクスチャとして使用できます。このサイトのほとんどの例のように、レンダーパスを介してテクスチャにレンダリングしたい場合は、`RENDER_ATTACHMENT`の使用法も追加します。

ただし、ここには複雑な問題があります。[最初の記事](webgpu-fundamentals.html)で説明したように、通常、`navigator.gpu.getPreferredCanvasFormat`を呼び出して、優先キャンバス形式を取得します。`getPreferredCanvasFormat`は、ユーザーのシステムでよりパフォーマンスの高い形式に応じて、`rgba8unorm`または`bgra8unorm`のいずれかを返します。

しかし、上記のように、デフォルトでは、`bgra8unorm`テクスチャをストレージテクスチャとして使用することはできません。

幸いなことに、`'bgra8unorm-storage'`という[機能](webgpu-limits-and-features.html)があります。その機能を有効にすると、`bgra8unorm`テクスチャをストレージテクスチャとして使用できるようになります。一般的に、優先キャンバス形式として`bgra8unorm`を報告するプラットフォームでは利用可能である*はず*ですが、利用できない可能性も多少あります。したがって、`'bgra8unorm-storage'`*機能*が存在するかどうかを確認する必要があります。存在する場合は、デバイスにそれを要求し、優先キャンバス形式を使用します。そうでない場合は、キャンバス形式として`rgba8unorm`を選択します。

```js
  const adapter = await navigator.gpu?.requestAdapter();
-  const device = await adapter?.requestDevice();
+  const hasBGRA8UnormStorage = adapter.features.has('bgra8unorm-storage');
+  const device = await adapter?.requestDevice({
+    requiredFeatures: hasBGRA8UnormStorage
+      ? ['bgra8unorm-storage']
+      : [],
+  });
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
-  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
+  const presentationFormat = hasBGRA8UnormStorage
+     ? navigator.gpu.getPreferredCanvasFormat()
+     : 'rgba8unorm';
  context.configure({
    device,
    format: presentationFormat,
    usage: GPUTextureUsage.TEXTURE_BINDING |
           GPUTextureUsage.STORAGE_BINDING,
  });
```

これで、キャンバステクスチャをストレージテクスチャとして使用できます。テクスチャに同心円を描画する簡単なコンピュートシェーダーを作成しましょう。

```js
  const module = device.createShaderModule({
    label: 'circles in storage texture',
    code: `
      @group(0) @binding(0)
      var tex: texture_storage_2d<${presentationFormat}, write>;

      @compute @workgroup_size(1) fn cs(
        @builtin(global_invocation_id) id : vec3u
      )  {
        let size = textureDimensions(tex);
        let center = vec2f(size) / 2.0;

        // the pixel we're going to write to
        let pos = id.xy;

        // The distance from the center of the texture
        let dist = distance(vec2f(pos), center);

        // Compute stripes based on the distance
        let stripe = dist / 32.0 % 2.0;
        let red = vec4f(1, 0, 0, 1);
        let cyan = vec4f(0, 1, 1, 1);
        let color = select(red, cyan, stripe < 1.0);

        // Write the color to the texture
        textureStore(tex, pos, color);
      }
    `,
  });
```

ストレージテクスチャを`write`としてマークし、シェーダー自体で特定のテクスチャ形式を指定する必要があったことに注意してください。`TEXTURE_BINDING`とは異なり、`STORAGE_BINDING`はテクスチャの正確な形式を知る必要があります。

設定は、[最初の記事で記述したコンピュートシェーダー](webgpu-fundamentals.html#a-run-computations-on-the-gpu)に似ています。シェーダーモジュールを作成した後、それを使用するコンピュートパイプラインを設定します。

```js
  const pipeline = device.createComputePipeline({
    label: 'circles in storage texture',
    layout: 'auto',
    compute: {
      module,
    },
  });
```

レンダリングするには、キャンバスの現在のテクスチャを取得し、テクスチャをシェーダーに渡すことができるようにバインドグループを作成し、パイプラインの設定、バインドグループのバインド、ワークグループのディスパッチという通常のことを行います。

```js
  function render() {
    const texture = context.getCurrentTexture();

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture },
      ],
    });

    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(texture.width, texture.height);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

そして、これがそれです。

{{{example url="../webgpu-storage-texture-canvas.html"}}}

通常のテクスチャを使用しても何も変わりませんが、テクスチャを作成するために`getCurrentTexture`の代わりに`createTexture`を呼び出し、必要な他の使用法フラグとともに`STORAGE_BINDING`を渡します。

## 速度とデータ競合

上記では、ピクセルごとに1つのワークグループをディスパッチしました。これは無駄であり、GPUははるかに高速に実行できます。最適な作業量のためにシェーダーを最適化すると、例が複雑になります。ポイントは、ストレージテクスチャの使用を実証することであり、可能な限り高速なシェーダーではありません。[画像ヒストグラムの計算に関する記事](webgpu-compute-shaders-histogram.html)で、コンピュートシェーダーを最適化するいくつかの方法について読むことができます。

同様に、ストレージテクスチャのどこにでも書き込むことができるため、[コンピュートシェーダーに関する他の記事](webgpu-compute-shaders.html)で説明したような競合状態に注意する必要があります。呼び出しが実行される順序は保証されていません。競合を回避したり、`textureBarriers`やその他のものを挿入して、2つ以上の呼び出しが互いの邪魔をしないようにするのはあなた次第です。

## 例

[compute.toys](https://compute.toys)は、ストレージテクスチャに直接書き込む例がたくさんあるウェブサイトです。**警告**：[compute.toys](https://compute.toys)の例から学ぶべきことはたくさんありますが、必ずしもベストプラクティスではありません。Compute toysは、コンピュートシェーダーのみで興味深いものを作成することに関するものです。コンピュートシェーダーのみで創造的な何かを行う方法を見つけ出すのは楽しいパズルですが、他の方法が10倍、100倍、または1000倍高速になる可能性があることに注意してください。