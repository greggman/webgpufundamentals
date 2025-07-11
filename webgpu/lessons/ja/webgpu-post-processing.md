Title: WebGPU ポストプロセッシング - 基本的なCRTエフェクト
Description: ポストプロセッシング
TOC: 基本的なCRTエフェクト

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

ポストプロセッシングとは、「オリジナル」の画像を作成した後に何らかの処理を行うことを意味します。ポストプロセッシングは、写真、ビデオ、2Dシーン、3Dシーンに適用できます。一般的には、画像があり、その画像に何らかのエフェクトを適用することを意味します。たとえば、Instagramでフィルターを選択するなどです。

このサイトのほとんどすべての例では、キャンバステクスチャにレンダリングしています。ポストプロセッシングを行うには、代わりに別のテクスチャにレンダリングします。次に、何らかの画像処理エフェクトを適用しながら、そのテクスチャをキャンバスにレンダリングします。

簡単な例として、1980年代のテレビのように見えるように、スキャンラインとCRT RGB要素を使用して画像を後処理してみましょう。

<div class="webgpu_center"><img class="nobg" src="resources/gemini-generated-1980s-tv-1024.png" style="width: 700px"></div>

そのためには、[タイミングに関する記事](webgpu-timing.html)の冒頭のアニメーションの例を取り上げましょう。最初に行うことは、別のテクスチャにレンダリングし、そのテクスチャをキャンバスにレンダリングすることです。

これは、[大きなクリップ空間の三角形](webgpu-large-triangle-to-cover-clip-space.html)を描画し、クリップ空間に収まる三角形の部分をカバーするテクスチャを描画できるように正しいUV座標を渡すシェーダーです。

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

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        return vec4f(color);
      }
    `,
  })
```

これは非常に単純で、[テクスチャ付き画像の利用に関する記事](webgpu-importing-textures.html)でミップマップを生成するために使用したシェーダーと似ています。唯一の大きな違いは、元のシェーダーがクリップ空間をカバーするために2つの三角形を使用するのに対し、これは[1つの大きな三角形](webgpu-large-triangle-to-cover-clip-space.html)を使用することです。

次に、これらのシェーダーを使用するには、パイプラインが必要です。

```js
  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });
```

このパイプラインはキャンバスにレンダリングするため、ターゲット形式を以前に検索した`presentationFormat`として設定する必要があります。

サンプラーとrenderPassDescriptorが必要です。

```js
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
```

次に、元のrenderPassをキャンバスにレンダリングする代わりに、別のテクスチャにレンダリングする必要があります。

```js
+  let renderTarget;
+
+  function setupPostProcess(canvasTexture) {
+    if (renderTarget?.width === canvasTexture.width &&
+        renderTarget?.height === canvasTexture.height) {
+      return;
+    }
+
+    renderTarget?.destroy();
+    renderTarget = device.createTexture({
+      size: canvasTexture,
+      format: 'rgba8unorm',
+      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
+    });
++    renderPassDescriptor.colorAttachments[0].view = renderTarget;
+  }

  let then = 0;
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

-    // Get the current texture from the canvas context and
-    // set it as the texture to render to.
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();
+    const canvasTexture = context.getCurrentTexture();
+    setupPostProcess(canvasTexture);

    ...
```

上記では、現在の`canvasTexture`を`setupPostProcess`に渡します。これにより、「renderTarget」テクスチャのサイズがキャンバスのサイズと同じかどうかがチェックされます。そうでない場合は、同じサイズの新しいテクスチャが作成されます。

次に、元の`renderPassDescriptor`のカラーアタッチメントをこのrenderTargetテクスチャに設定します。

古いパイプラインはこのテクスチャにレンダリングするため、このテクスチャの形式に合わせて更新する必要があります。

```js
  const pipeline = device.createRenderPipeline({
    label: 'per vertex color',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        ...
      ],
    },
    fragment: {
      module,
-      targets: [{ format: presentationFormat }],
+      targets: [{ format: 'rgba8unorm' }],
    },
  });
```

これらの変更だけでも、元のシーンをこのレンダーターゲットテクスチャにレンダリングし始めますが、キャンバスに何かを描画しないと何も表示されないため、それを行いましょう。

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  ...


  let then = 0;
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);

    ...

    pass.draw(numVertices, settings.numObjects);

    pass.end();

+    postProcess(encoder, renderTarget, canvasTexture);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

もう1つだけ調整しましょう。オブジェクト数の設定はポストプロセッシングとは関係ないので、削除しましょう。

```js
  const settings = {
-    numObjects: 100,
+    numObjects: 200,
  };

  const gui = new GUI();
-  gui.add(settings, 'numObjects', 0, kNumObjects, 1);
```

`settings.numObjects`を完全に削除することもできましたが、いくつかの異なる場所で編集が必要になるため、今のところはそのままにしておきます。画像を埋めるために、数を200に設定します。

これを実行しても、元のものと目に見える違いはありません。

{{{example url="../webgpu-post-processing-step-01.html"}}}

違いは、レンダーターゲットテクスチャにレンダリングし、そのテクスチャをキャンバスにレンダリングしていることです。これで、いくつかのエフェクトを適用し始めることができます。

古いCRTの最も明白な効果は、古いCRTには目に見えるスキャンラインがあることです。これは、画像が磁石を使用して画面全体に水平線のパターンでビームを向けることによって投影されたためです。

正弦波を使用して明暗のパターンを生成し、絶対値を取るだけで、同様の効果を得ることができます。

<div class="webgpu_center">
  <div style="width: 100%;"><img class="ddnobg" src="resources/sinewave-40.svg"></div>
  <div lass="caption">sin(x)</div>
</div>
<div class="webgpu_center">
   <div style="width: 100%;"><img class="ddnobg" src="resources/abs-sinewave-40.svg"></div>
   <div class="caption">abs(sin(x))</div>
</div>
<div class="webgpu_center">
   <div style="width: 100%;"><div data-diagram="sine" style="aspect-ratio: 981 / 50; width: 100%;"></div></div>
   <div class="caption">abs(sin(x))をグレースケールカラーとして</div>
</div>


これをコードに追加しましょう。まず、この正弦波を適用するようにシェーダーを編集しましょう。

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

+      struct Uniforms {
+        effectAmount: f32,
+        bandMult: f32,
+      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
+      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
+        let banding = abs(sin(fsInput.position.y * uni.bandMult));
+        let effect = mix(1.0, banding, uni.effectAmount);

        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
-        return vec4f(color);
+        return vec4f(color.rgb * effect, color.a);
      }
    `,
  });
```

正弦波は、書き込まれるピクセルのy座標である`fsInput.position.y`に基づいています。つまり、0から始まる各スキャンラインに対して、0.5、1.5、2.5、3.5などになります。`bendMult`を使用すると、バンドのサイズを調整でき、`effectAmount`を使用すると、エフェクトをオン/オフにして、エフェクトとエフェクトなしを比較できます。

新しいシェーダーを使用するには、ユニフォームバッファを更新する必要があります。

```js
  const postProcessUniformBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

バインドグループに追加する必要があります。

```js
    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTarget },
        { binding: 1, resource: postProcessSampler },
+        { binding: 2, resource: postProcessUniformBuffer },
      ],
    });
```

そして、いくつかの設定を追加する必要があります。

```js
  const settings = {
    numObjects: 200,
+    affectAmount: 1,
+    bandMult: 1,
  };

  const gui = new GUI();
+  gui.add(settings, 'affectAmount', 0, 1);
+  gui.add(settings, 'bandMult', 0.01, 2.0);
```

そして、これらの設定をユニフォームバッファにアップロードする必要があります。

```js
  function postProcess(encoder, srcTexture, dstTexture) {
+    device.queue.writeBuffer(
+      postProcessUniformBuffer,
+      0,
+      new Float32Array([
+        settings.affectAmount,
+        settings.bandMult,
+      ]),
+    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

そして、CRTのようなスキャンライン効果が得られます。

{{{example url="../webgpu-post-processing-step-02.html"}}}

CRTは、LCDと同様に、画像を赤、緑、青の領域に分割します。CRTでは、これらの領域は今日のほとんどのLCDよりも一般的に大きかったため、これが目立つことがありました。その効果を近似するために何かを追加しましょう。

まず、シェーダーを変更しましょう。

```
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
        effectAmount: f32,
        bandMult: f32,
+        cellMult: f32,
+        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let banding = abs(sin(fsInput.position.y * uni.bandMult));

+        let cellNdx = u32(fsInput.position.x * uni.cellMult) % 3;
+        var cellColor = vec3f(0);
+        cellColor[cellNdx] = 1;
+        let cMult = cellColors[cellNdx] + uni.cellBright;

-        let effect = mix(1.0, banding, uni.effectAmount);
+        let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        return vec4f(color.rgb * effect, 1);
      }
    `,
  });
```

上記では、書き込まれるピクセルのx座標である`fsInput.position.x`を使用しています。`cellMult`で乗算することで、セルサイズを選択できます。整数に変換し、3で割った余りを求めます。これにより、0、1、または2の数値が得られ、これを使用して`cellColor`の赤、緑、または青のチャネルを1に設定します。

調整として`cellBright`を追加し、古いバンディングと新しいエフェクトの両方を乗算します。`effect`は`f32`から`vec3f`に変更されたため、各チャネルに独立して影響を与えることができます。

JavaScriptに戻り、ユニフォームバッファのサイズを調整する必要があります。

```js
  const postProcessUniformBuffer = device.createBuffer({
-    size: 8,
+    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

そして、GUIにいくつかの設定を追加します。

```js
  const settings = {
    numObjects: 200,
    affectAmount: 1,
    bandMult: 1,
+    cellMult: 0.5,
+    cellBright: 1,
  };

  const gui = new GUI();
  gui.add(settings, 'affectAmount', 0, 1);
  gui.add(settings, 'bandMult', 0.01, 2.0);
+  gui.add(settings, 'cellMult', 0, 1);
+  gui.add(settings, 'cellBright', 0, 2);
```

そして、新しい設定をアップロードします。

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.affectAmount,
        settings.bandMult,
+        settings.cellMult,
+        settings.cellBright,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

そして、CRTカラー要素のようなエフェクトが得られます。

{{{example url="../webgpu-post-processing-step-03.html"}}}

上記のエフェクトは、CRTがどのように機能するかを完全に表現することを意図したものではありません。むしろ、CRTのように見えることを示唆し、うまくいけば理解しやすいことを意図していました。Web上でより凝ったテクニックを見つけることができます。

## <a id="compute"></a>コンピュートシェーダーの使用

このためにコンピュートシェーダーを使用できるか、そして、おそらくもっと重要なことに、使用すべきかというトピックが浮上します。まず、「できるか」について説明しましょう。

[ストレージテクスチャに関する記事](webgpu-storage-textures.html)で、コンピュートシェーダーを使用してテクスチャにレンダリングすることについて説明しました。

コードをコンピュートシェーダーを使用するように変換するには、キャンバステクスチャに`STORAGE_BINDING`の使用法を追加する必要があります。これは、[前述の記事](webgpu-storage-textures.html)から、それをサポートするテクスチャ形式を確認して選択する必要があることを意味します。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
+  const hasBGRA8UnormStorage = adapter?.features.has('bgra8unorm-storage');
-  const device = await adapter?.requestDevice();
+  const device = await adapter?.requestDevice({
+    requiredFeatures: [
+      ...(hasBGRA8UnormStorage ? ['bgra8unorm-storage'] : []),
+    ],
+  });
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
-  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
+  const presentationFormat = hasBGRA8UnormStorage
+    ? navigator.gpu.getPreferredCanvasFormat()
+    : 'rgab8unorm';
  context.configure({
    device,
    format: presentationFormat,
+    usage: GPUTextureUsage.RENDER_ATTACHMENT |
+           GPUTextureUsage.TEXTURE_BINDING |
+           GPUTextureUsage.STORAGE_BINDING,
  });
```

シェーダーをストレージテクスチャに書き込むように切り替える必要があります。

```js
  const postProcessModule = device.createShaderModule({
    code: `
-      struct VSOutput {
-        @builtin(position) position: vec4f,
-        @location(0) texcoord: vec2f,
-      };
-
-      @vertex fn vs(
-        @builtin(vertex_index) vertexIndex : u32,
-      ) -> VSOutput {
-        var pos = array(
-          vec2f(-1.0, -1.0),
-          vec2f(-1.0,  3.0),
-          vec2f( 3.0, -1.0),
-        );
-
-        var vsOutput: VSOutput;
-        let xy = pos[vertexIndex];
-        vsOutput.position = vec4f(xy, 0.0, 1.0);
-        vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
-        return vsOutput;
-      }

      struct Uniforms {
        effectAmount: f32,
        bandMult: f32,
        cellMult: f32,
        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;
+      @group(1) @binding(0) var outTexture: texture_storage_2d<${presentationFormat}, write>;

-      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-        let banding = abs(sin(fsInput.position.y * uni.bandMult));
-
-        let cellNdx = u32(fsInput.position.x * uni.cellMult) % 3;
+      @compute @workgroup_size(1) fn cs(@builtin(global_invocation_id) gid: vec3u) {
+        let outSize = textureDimensions(outTexture);
+        let banding = abs(sin(f32(gid.y) * uni.bandMult));
+
+        let cellNdx = u32(f32(gid.x) * uni.cellMult) % 3;
        var cellColor = vec3f(0);
        cellColor[cellNdx] = 1.0;
        let cMult = cellColor + uni.cellBright;

        let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
-        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
-        return vec4f(color.rgb * effect, color.a);
+        let uv = (vec2f(gid.xy) + 0.5) / vec2f(outSize);
+        let color = textureSampleLevel(postTexture2d, postSampler, uv, 0);
+        textureStore(outTexture, gid.xy, vec4f(color.rgb * effect, color.a));
      }
    `,
  });
```

上記では、頂点シェーダーと関連部分を削除しました。また、書き込まれるピクセルの座標であった`fsInput.position`もなくなりました。代わりに、コンピュートシェーダーの個々の呼び出しの`global_invocation_id`である`gid`があります。これをテクスチャ座標として使用します。これは`vec3u`なので、あちこちでキャストする必要があります。また、`fsInput.texcoord`もなくなりましたが、`(vec2f(gid.xy) + 0.5) / vec2f(outSize)`で同等のものを取得できます。

レンダーパスの使用をやめ、代わりにポストプロセッシングにコンピュートパスを使用する必要があります。

```js
  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
-    vertex: { module: postProcessModule },
-    fragment: {
-      module: postProcessModule,
-      targets: [ { format: presentationFormat }],
-    },
+    compute: { module: postProcessModule },
  });

  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.affectAmount,
        settings.bandMult,
        settings.cellMult,
        settings.cellBright,
      ]),
    );

+    const outBindGroup = device.createBindGroup({
+      layout: postProcessPipeline.getBindGroupLayout(1),
+      entries: [
+        { binding: 0, resource: dstTexture },
+      ],
+    });

-    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
-    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
+    const pass = encoder.beginComputePass();
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
-    pass.draw(3);
+    pass.dispatchWorkgroups(dstTexture.width, dstTexture.height);
    pass.end();
  }
```

それは機能します。

{{{example url="../webgpu-post-processing-step-03-compute.html"}}}

残念ながら、GPUによっては遅いです！[コンピュートシェーダーの最適化に関する記事](webgpu-compute-shaders-historgram.html)で、その理由の一部について説明しました。ワークグループサイズ1を使用すると簡単になりますが、遅くなります。

より大きなワークグループサイズを使用するように更新できます。これには、範囲外の場合はテクスチャへの書き込みをスキップする必要があります。

```js
+  const workgroupSize = [16, 16];
  const postProcessModule = device.createShaderModule({
    code: `
      struct Uniforms {
        effectAmount: f32,
        bandMult: f32,
        cellMult: f32,
        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;
      @group(1) @binding(0) var outTexture: texture_storage_2d<${presentationFormat}, write>;

-      @compute @workgroup_size(1) fn cs(@builtin(global_invocation_id) gid: vec3u) {
+      @compute @workgroup_size(${workgroupSize}) fn cs(@builtin(global_invocation_id) gid: vec3u) {
        let outSize = textureDimensions(outTexture);
+        if (gid.x >= outSize.x || gid.y >= outSize.y) {
+          return;
+        }
        let banding = abs(sin(f32(gid.y) * uni.bandMult));

        let cellNdx = u32(f32(gid.x) * uni.cellMult) % 3;
        var cellColor = vec3f(0);
        cellColor[cellNdx] = 1.0;
        let cMult = cellColor + uni.cellBright;

        let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
        let uv = (vec2f(gid.xy) + 0.5) / vec2f(outSize);
        let color = textureSampleLevel(postTexture2d, postSampler, uv, 0);
        textureStore(outTexture, gid.xy, vec4f(color.rgb * effect, color.a));
      }
    `,
  });
```

そして、より少ないワークグループをディスパッチする必要があります。

```js
    const pass = encoder.beginComputePass();
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.setBindGroup(1, outBindGroup);
-    pass.dispatchWorkgroups(dstTexture.width, dstTexture.height);
+    pass.dispatchWorkgroups(
+      Math.ceil(dstTexture.width / workgroupSize[0]),
+      Math.ceil(dstTexture.height / workgroupSize[1]),
+    );
    pass.end();
```

これは機能します。

{{{example url="../webgpu-post-processing-step-03-compute-workgroups.html"}}}

これははるかに高速です！しかし、残念ながら、一部のGPUでは、レンダーパスを使用するよりもまだ遅いです。


<div class="webgpu_center data-table">
  <table>
    <thead>
      <tr><th>GPU</th><th>コンピュートパス時間と<br>レンダーパス時間<br>（高いほど悪い）</th></tr>
    </thead>
    <tbody>
      <tr><td>M1 Mac                 </td><td>1x</td></tr>
      <tr><td>AMD Radeon Pro 5300M   </td><td>1x</td></tr>
      <tr><td>AMD Radeon Pro WX 32000</td><td>1.3x</td></tr>
      <tr><td>Intel UHD Graphics 630 </td><td>1.7x</td></tr>
      <tr><td>NVidia 2070 Super      </td><td>2x</td></tr>
    </tbody>
  </table>
</div>

それを高速化する方法については、この記事では大きすぎるトピックです。[コンピュートシェーダーの最適化に関する記事](webgpu-compute-shaders-historgram.html)を参照すると、同じルールが適用されます。残念ながら、この例にはどれもあまり関係ありません。実行しようとしているポストプロセッシングが共有ワークグループメモリから恩恵を受ける可能性がある場合は、コンピュートシェーダーを使用することが有益かもしれません。アクセスパターンも、GPUが多くのキャッシュミスを取得しないようにするために重要かもしれません。さらに別の方法は、[サブグループ](webgpu-subgroups.html)を利用することです。

今のところ、さまざまな手法を試して、そのタイミングを確認することをお勧めします。または、実装しているアルゴリズムがワークグループやサブグループの共有データから本当に恩恵を受けることができる場合を除き、レンダーパスに固執します。GPUは、コンピュートシェーダーを実行するよりもはるかに長くテクスチャにレンダリングしてきたため、そのプロセスの多くのことが高度に最適化されています。