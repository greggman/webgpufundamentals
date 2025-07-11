Title: WebGPU ユニフォーム
Description: シェーダーへの定数データの受け渡し
TOC: ユニフォーム

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

前の記事は[ステージ間変数](webgpu-inter-stage-variables.html)に関するものでした。この記事はユニフォームに関するものです。

ユニフォームは、シェーダーのグローバル変数のようなものです。シェーダーを実行する前に値を設定でき、シェーダーの各反復でそれらの値を持ちます。次にGPUにシェーダーを実行するように依頼するときに、別の値に設定できます。

[最初の記事](webgpu-fundamentals.html)の三角形の例から始めて、いくつかのユニフォームを使用するように変更します。

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

  });
```

まず、3つのメンバーを持つ構造体を宣言しました。

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

次に、その構造体の型のユニフォーム変数を宣言しました。変数は`ourStruct`で、その型は`OurStruct`です。

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

次に、頂点シェーダーから返されるものを変更して、ユニフォームを使用するようにしました。

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

頂点位置にスケールを乗算し、オフセットを追加していることがわかります。これにより、三角形のサイズを設定し、配置できます。

また、フラグメントシェーダーを変更して、ユニフォームから色を返すようにしました。

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

シェーダーをユニフォームを使用するように設定したので、GPU上に値を保持するためのバッファを作成する必要があります。

これは、ネイティブデータとサイズを扱ったことがない場合、学ぶべきことがたくさんある領域です。これは大きなトピックなので、[このトピックに関する別の記事があります](webgpu-memory-layout.html)。メモリ内の構造体のレイアウト方法がわからない場合は、[記事を読んでください](webgpu-memory-layout.html)。その後、ここに戻ってきてください。この記事は、[すでに読んだ](webgpu-memory-layout.html)ことを前提としています。

[記事](webgpu-memory-layout.html)を読んだので、シェーダーの構造体に一致するデータでバッファを埋めることができます。

まず、バッファを作成し、ユニフォームで使用できるように、またデータをコピーして更新できるように、使用法フラグを割り当てます。

```js
  const uniformBufferSize =
    4 * 4 + // colorは4つの32ビット浮動小数点数（各4バイト）です
    2 * 4 + // scaleは2つの32ビット浮動小数点数（各4バイト）です
    2 * 4;  // offsetは2つの32ビット浮動小数点数（各4バイト）です
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

次に、JavaScriptで値を設定できるように`TypedArray`を作成します。

```js
  // JavaScript側でユニフォームの値を保持するための型付き配列を作成します
  const uniformValues = new Float32Array(uniformBufferSize / 4);
```

そして、後で変更しない構造体の値の2つを埋めます。オフセットは、[メモリレイアウトに関する記事](webgpu-memory-layout.html)で説明した内容を使用して計算されました。

```js
  // float32インデックスでのさまざまなユニフォーム値へのオフセット
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);        // 色を設定します
  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // オフセットを設定します
```

上記では、色を緑に設定しています。オフセットは、三角形をキャンバスの左1/4、下1/8に移動します。（クリップ空間は-1から1まで、つまり2単位の幅なので、0.25は2の1/8です）。

次に、[最初の記事の図が示すように](webgpu-fundamentals.html#a-draw-diagram)、シェーダーにバッファについて伝えるには、バインドグループを作成してバッファをバインドする必要があります。シェーダーで設定したのと同じ`@group(?)`と`@binding(?)`を渡す必要があります。

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

コマンドバッファを送信する前に、`uniformValues`の残りの値を設定し、それらの値をGPU上のバッファにコピーする必要がある場合があります。`render`関数の冒頭でそれを行います。

```js
  function render() {
    // JavaScript側のFloat32Arrayでユニフォーム値を設定します
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // スケールを設定します

    // JavaScriptからGPUに値をコピーします
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> 注：`writeBuffer`は、バッファにデータをコピーする1つの方法です。[この記事](webgpu-copying-data.html)で説明されている他のいくつかの方法があります。

スケールを半分のサイズに設定し、キャンバスのアスペクトを考慮して、三角形がキャンバスのサイズに関係なく同じ幅と高さの比率を維持するようにしています。

最後に、描画する前にバインドグループを設定する必要があります。

```js
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
    pass.draw(3);  // 頂点シェーダーを3回呼び出します
    pass.end();
```

そして、それで、説明どおりの緑色の三角形が得られます。

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

この単一の三角形の場合、描画コマンドが実行されるときの状態は次のようになります。

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

これまで、シェーダーで使用したすべてのデータは、ハードコードされていました（頂点シェーダーの三角形の頂点位置、およびフラグメントシェーダーの色）。シェーダーに値を渡すことができるようになったので、異なるデータで`draw`を複数回呼び出すことができます。

単一のバッファを更新することで、異なるオフセット、スケール、色で異なる場所に描画できます。ただし、コマンドはコマンドバッファに入れられ、送信するまで実際には実行されないことを覚えておくことが重要です。したがって、これを**行うことはできません**。

```js
    // BAD!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, x], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.draw(3);
    }
    pass.end();

    // エンコードを終了し、コマンドを送信します
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

なぜなら、上記のように、`device.queue.xxx`関数は「キュー」で発生しますが、`pass.xxx`関数はコマンドバッファにコマンドをエンコードするだけだからです。コマンドバッファで`submit`を実際に呼び出すと、バッファ内の唯一のものは、書き込んだ最後の値になります。

これを次のように変更できます。

```js
    // BAD! 遅い！
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, 0], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      // エンコードを終了し、コマンドを送信します
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

上記のコードは、1つのバッファを更新し、1つのコマンドバッファを作成し、1つのものを描画するコマンドを追加し、コマンドバッファを終了して送信します。これは機能しますが、複数の理由で遅くなります。最大の理由は、単一のコマンドバッファでより多くの作業を行うのがベストプラクティスであるためです。

したがって、代わりに、描画したいものごとに1つのユニフォームバッファを作成できます。そして、バッファはバインドグループを介して間接的に使用されるため、描画したいものごとに1つのバインドグループも必要になります。次に、描画したいすべてのものを単一のコマンドバッファに入れることができます。

やってみましょう。

まず、ランダム関数を作成しましょう。

```js
// [minとmax)の間の乱数
// 1つの引数がある場合は[0からmin)になります
// 引数がない場合は[0から1)になります
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

そして、多数の個々のものを描画できる多数の色とオフセットを持つバッファを設定しましょう。

```js
  // float32インデックスでのさまざまなユニフォーム値へのオフセット
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
+    // JavaScript側でユニフォームの値を保持するための型付き配列を作成します
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-  uniformValues.set([0, 1, 0, 1], kColorOffset);        // 色を設定します
-  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // オフセットを設定します
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // 色を設定します
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // オフセットを設定します
+
+    const bindGroup = device.createBindGroup({
+      label: `bind group for obj: ${i}`,
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer },
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

キャンバスのアスペクトを考慮に入れたいので、まだバッファに値を設定していません。レンダリング時までキャンバスのアスペクトがわからないためです。

レンダリング時に、すべてのアスペクト調整されたスケールでバッファを更新します。

```js
  function render() {
-    // JavaScript側のFloat32Arrayでユニフォーム値を設定します
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // スケールを設定します
-
-    // JavaScriptからGPUに値をコピーします
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // JavaScript側のFloat32Arrayでユニフォーム値を設定します
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset); // スケールを設定します
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // 頂点シェーダーを3回呼び出します
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

繰り返しになりますが、`encoder`と`pass`オブジェクトはコマンドバッファにコマンドをエンコードしているだけであることを忘れないでください。したがって、`render`関数が終了すると、事実上、この順序でこれらの*コマンド*を発行したことになります。

```js
device.queue.writeBuffer(...) // オブジェクト0のデータでユニフォームバッファ0を更新します
device.queue.writeBuffer(...) // オブジェクト1のデータでユニフォームバッファ1を更新します
device.queue.writeBuffer(...) // オブジェクト2のデータでユニフォームバッファ2を更新します
device.queue.writeBuffer(...) // オブジェクト3のデータでユニフォームバッファ3を更新します
...
// それぞれ独自のユニフォームバッファを持つ100個のものを描画するコマンドを実行します。
device.queue.submit([commandBuffer]);
```

これがそれです。

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

ここで、もう1つ説明します。シェーダーで複数のユニフォームバッファを参照できます。上記の例では、描画するたびにスケールを更新し、`writeBuffer`を呼び出してそのオブジェクトの`uniformValues`を対応するユニフォームバッファにアップロードします。しかし、スケールのみが更新され、色とオフセットは更新されないため、色とオフセットをアップロードする時間を無駄にしています。

ユニフォームを、一度設定する必要があるユニフォームと、描画するたびに更新されるユニフォームに分割できます。

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

描画したいものごとに2つのユニフォームバッファが必要です。

```js
-  // ユニフォーム値用のバッファを作成します
-  const uniformBufferSize =
-    4 * 4 + // colorは4つの32ビット浮動小数点数（各4バイト）です
-    2 * 4 + // scaleは2つの32ビット浮動小数点数（各4バイト）です
-    2 * 4;  // offsetは2つの32ビット浮動小数点数（各4バイト）です
-  // float32インデックスでのさまざまなユニフォーム値へのオフセット
-  const kColorOffset = 0;
-  const kScaleOffset = 4;
-  const kOffsetOffset = 6;
+  // ユニフォーム値用の2つのバッファを作成します
+  const staticUniformBufferSize =
+    4 * 4 + // colorは4つの32ビット浮動小数点数（各4バイト）です
+    2 * 4 + // offsetは2つの32ビット浮動小数点数（各4バイト）です
+    2 * 4;  // パディング
+  const uniformBufferSize =
+    2 * 4;  // scaleは2つの32ビット浮動小数点数（各4バイト）です
+
+  // float32インデックスでのさまざまなユニフォーム値へのオフセット
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
+    // これらは一度だけ設定されるので、今すぐ設定します
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // 色を設定します
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // オフセットを設定します

      // これらの値をGPUにコピーします
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // JavaScript側でユニフォームの値を保持するための型付き配列を作成します
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
        { binding: 0, resource: staticUniformBuffer },
+        { binding: 1, resource: uniformBuffer },
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

レンダーコードには何も変更はありません。各オブジェクトのバインドグループには、各オブジェクトの両方のユニフォームバッファへの参照が含まれています。以前と同様に、スケールを更新しています。しかし、今では、スケール値を保持するユニフォームバッファを更新するときに`device.queue.writeBuffer`を呼び出すときにスケールのみをアップロードしていますが、以前は各オブジェクトの色+オフセット+スケールをアップロードしていました。

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

この単純な例では、複数のユニフォームバッファに分割するのはおそらくやり過ぎでしたが、何がいつ変更されるかに基づいて分割するのが一般的です。例としては、共有される行列用の1つのユニフォームバッファがあります。たとえば、[射影行列、ビュー行列、カメラ行列](webgpu-cameras.html)です。これらは、描画したいすべてのものに対して同じであることが多いため、1つのバッファを作成し、すべてのオブジェクトが同じユニフォームバッファを使用するようにできます。

個別に、シェーダーは、[ワールド/モデル行列](webgpu-cameras.html)や[法線行列](webgpu-lighting-directional.html)など、このオブジェクトに固有のもののみを含む別のユニフォームバッファを参照する場合があります。

別のユニフォームバッファには、マテリアル設定が含まれている場合があります。これらの設定は、複数のオブジェクトで共有される場合があります。

3Dの描画について説明するときに、これの多くを行います。

次は、[ストレージバッファ](webgpu-storage-buffers.html)です。