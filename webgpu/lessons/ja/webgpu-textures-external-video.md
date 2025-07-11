Title: WebGPU ビデオの効率的な使用
Description: WebGPUでビデオを使用する方法
TOC: ビデオの使用

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

[前の記事](webgpu-importing-textures.html)では、画像、キャンバス、ビデオをテクスチャに読み込む方法について説明しました。この記事では、WebGPUでビデオをより効率的に使用する方法について説明します。

前の記事では、`copyExternalImageToTexture`を呼び出すことによって、ビデオデータをWebGPUテクスチャに読み込みました。この関数は、ビデオ自体の現在のフレームを、作成した既存のテクスチャにコピーします。

WebGPUには、ビデオを使用するための別の方法があります。それは`importExternalTexture`と呼ばれ、名前が示すように、`GPUExternalTexture`を提供します。この外部テクスチャは、ビデオ内のデータを直接表します。コピーは作成されません。[^no-copy] `importExternalTexture`にビデオを渡すと、すぐに使用できるテクスチャが返されます。

[^no-copy]: 実際に何が起こるかは、ブラウザの実装次第です。WebGPU仕様は、ブラウザがコピーを作成する必要がないことを期待して設計されました。

`importExternalTexture`からテクスチャを使用するには、いくつかの大きな注意点があります。

* ## テクスチャは、現在のJavaScriptタスクを終了するまでのみ有効です。

  ほとんどのWebGPUアプリでは、テクスチャは`requestAnimationCallback`関数が終了するまでしか存在しないことを意味します。または、レンダリングしているイベント（`requestVideoFrameCallback`、`setTimeout`、`mouseMove`など）です。関数が終了すると、テクスチャは期限切れになります。ビデオを再度使用するには、`importExternalTexture`を再度呼び出す必要があります。

  このことの意味は、`importExternalTexture`を呼び出すたびに新しいバインドグループを作成する必要があるということです[^bindgroup-exception]。これにより、新しいテクスチャをシェーダーに渡すことができます。

  [^bindgroup-exception]: 仕様では、実装が同じテクスチャを返すことができると実際に記載されていますが、必須ではありません。同じテクスチャを取得したかどうかを確認したい場合は、<pre><code>const newTexture = device.importExternalTexture(...);<br>const same = oldTexture === newTexture;</code></pre>のように、前のテクスチャと比較します。同じテクスチャである場合は、既存のバインドグループを再利用し、参照されている`oldTexture`を再利用できます。

* ## シェーダーで`texture_external`を使用する必要があります。

  これまでのすべてのテクスチャの例では`texture_2d<f32>`を使用してきましたが、`importExternalTexture`からのテクスチャは、`texture_external`を使用するバインディングポイントにのみバインドできます。

* ## シェーダーで`textureSampleBaseClampToEdge`を使用する必要があります。

  これまでのすべてのテクスチャの例では`textureSample`を使用してきましたが、`importExternalTexture`からのテクスチャは`textureSampleBaseClampToEdge`しか使用できません。[^textureLoad] 名前が示すように、`textureSampleBaseClampToEdge`はベーステクスチャのミップレベル（レベル0）のみをサンプリングします。つまり、外部テクスチャはミップマップを持つことができません。さらに、この関数はエッジにクランプするため、サンプラーを`addressModeU: 'repeat'`に設定しても無視されます。

  次のように`fract`を使用して、独自の繰り返しを行うことができることに注意してください。

  ```wgsl
  let color = textureSAmpleBaseClampToEdge(
     someExternalTexture,
     someSampler,
     fract(texcoord)
  );
  ```

  [^textureLoad]: 外部テクスチャで`textureLoad`を使用することもできます。

これらの制限がニーズに合わない場合は、[前の記事](webgpu-importing-textures.html)で説明したように`copyExternalImageToTexture`を使用する必要があります。

`importExternalTexture`を使用した実用的な例を作成しましょう。これがビデオです。

<div class="webgpu_center">
  <div>
     <video muted controls src="../resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4" style="width: 320px";></video>
     <div class="copyright"><a href="https://www.pexels.com/video/dog-walking-outside-the-house-5534310/">by Anna Bondarenko</a></div>
  </div>
</div>

前の例から必要な変更は次のとおりです。

まず、シェーダーを更新する必要があります。

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(2) var<uniform> uni: Uniforms;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  let pos = array(
    // 1番目の三角形
    vec2f( 0.0,  0.0),  // 中央
    vec2f( 1.0,  0.0),  // 右、中央
    vec2f( 0.0,  1.0),  // 中央、上

    // 2番目の三角形
    vec2f( 0.0,  1.0),  // 中央、上
    vec2f( 1.0,  0.0),  // 右、中央
    vec2f( 1.0,  1.0),  // 右、上
  );

  var vsOut: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
  vsOut.position = uni.matrix * vec4f(xy, 0.0, 1.0);
-  vsOut.texcoord = xy * vec2f(1, 50);
+  vsOut.texcoord = xy;
  return vsOut;
}

@group(0) @binding(0) var ourSampler: sampler;
-@group(0) @binding(1) var ourTexture: texture_2d<f32>;
+@group(0) @binding(1) var ourTexture: texture_external;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
+  return textureSampleBaseClampToEdge(
+      ourTexture,
+      ourSampler,
+      fsInput.texcoord,
+  );
}
```

上記では、繰り返しを示すためだけに存在し、外部テクスチャは繰り返されないため、テクスチャ座標を50で乗算するのをやめました。

また、上記のように必要な変更も加えました。`texture_2d<f32>`は`texture_external`になり、`textureSample`は`textureSampleBaseClampToEdge`になります。

テクスチャの作成とミップの生成に関連するすべてのコードを削除しました。

もちろん、ビデオを指すようにする必要があります。

```js
-  video.src = 'resources/videos/Golden_retriever_swimming_the_doggy_paddle-360-no-audio.webm';
+  video.src = 'resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4';
```

ミップレベルを持つことができないため、それらを使用するサンプラーを作成する必要はありません。

```js
  const objectInfos = [];
-  for (let i = 0; i < 8; ++i) {
+  for (let i = 0; i < 4; ++i) {
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: (i & 1) ? 'linear' : 'nearest',
      minFilter: (i & 2) ? 'linear' : 'nearest',
-      mipmapFilter: (i & 4) ? 'linear' : 'nearest',
    });

  ...
```

`importExternalTexture`を呼び出すまでテクスチャを取得できないため、事前にバインドグループを作成することはできません。したがって、後で作成するために必要な情報を保存します。[^bindgroups-in-advance]

[^bindgroups-in-advance]: バインドグループを分割して、サンプラーとユニフォームバッファを保持するものを事前に作成し、レンダリング時に外部テクスチャのみを参照する別のものを作成することもできます。それが価値があるかどうかは、特定のニーズ次第です。

```js
  const objectInfos = [];
  for (let i = 0; i < 4; ++i) {

    ...

-    const bindGroups = textures.map(texture =>
-      device.createBindGroup({
-        layout: pipeline.getBindGroupLayout(0),
-        entries: [
-          { binding: 0, resource: sampler },
-          { binding: 1, resource: texture },
-          { binding: 2, resource: uniformBuffer },
-        ],
-      }));

    // このオブジェクトをレンダリングするために必要なデータを保存します。
    objectInfos.push({
-      bindGroups,
+     sampler,
      matrix,
      uniformValues,
      uniformBuffer,
    });
```

レンダリング時に、`importExternalTexture`を呼び出し、バインドグループを作成します。

```js
  function render() {
-    copySourceToTexture(device, texture, video);
    ...

    const encoder = device.createCommandEncoder({
      label: 'render quad encoder',
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    const texture = device.importExternalTexture({source: video});

    objectInfos.forEach(({sampler, matrix, uniformBuffer, uniformValues}, i) => {
+      const bindGroup = device.createBindGroup({
+        layout: pipeline.getBindGroupLayout(0),
+        entries: [
+          { binding: 0, resource: sampler },
+          { binding: 1, resource: texture },
+          { binding: 2, resource: uniformBuffer },
+        ],
+      });

      ...

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // 頂点シェーダーを6回呼び出します
    });
```

また、テクスチャを繰り返すことができないことを考えると、描画しているクワッドをより見やすくし、以前のように50対1に引き伸ばさないように、行列演算を調整しましょう。

```js
  function render() {
    ...
    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup = bindGroups[texNdx];

      const xSpacing = 1.2;
-      const ySpacing = 0.7;
-      const zDepth = 50;
+      const ySpacing = 0.5;
+      const zDepth = 1;

-      const x = i % 4 - 1.5;
-      const y = i < 4 ? 1 : -1;
+      const x = i % 2 - .5;
+      const y = i < 2 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
-      mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
-      mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
+      mat4.rotateX(matrix, 0.25 * Math.PI * Math.sign(y), matrix);
+      mat4.scale(matrix, [1, -1, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      // JavaScriptからGPUに値をコピーします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // 頂点シェーダーを6回呼び出します
    });

```

そして、WebGPUでゼロコピーのビデオテクスチャが得られます。

{{{example url="../webgpu-simple-textured-quad-external-video.html"}}}

## なぜ`texture_external`なのですか？

ビデオを使用するこの方法が、`texture_2d<f32>`のようなより一般的なものではなく`texture_external`を使用し、`textureSample`ではなく`textureSampleBaseClampToEdge`を使用することに気づく人もいるかもしれません。つまり、この方法でテクスチャを使用し、レンダリングの他の部分と組み合わせたい場合は、異なるシェーダーが必要になります。静的テクスチャを使用する場合は`texture_2d<f32>`を使用するシェーダーと、ビデオを使用したい場合は`texture_external`を使用する異なるシェーダーです。

ここで何が起こっているのかを理解することが重要だと思います。

ビデオは、多くの場合、ビデオの輝度部分（各ピクセルの明るさ）と、ビデオの彩度部分（各ピクセルの色）を別々に配信されます。多くの場合、色の解像度は輝度部分よりも低くなります。これを分離してエンコードする一般的な方法は、データを輝度（Y）と（UV）色情報に分離する[YUV](https://en.wikipedia.org/wiki/Y%E2%80%B2UV)です。この表現は、一般的に圧縮も優れています。

外部テクスチャに対するWebGPUの目標は、提供された形式でビデオを直接使用することです。これを行うには、ビデオテクスチャがあるかのように*見せかけ*ますが、実際の実装では、複数のテクスチャが存在する場合があります。たとえば、輝度値（Y）を持つ1つのテクスチャと、UV値を持つ別のテクスチャです。そして、それらのUV値は特別に分離されている場合があります。ピクセルごとに2つの値がインターリーブされたテクスチャのようなものではなく、

    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv

次のように配置されている場合があります。

    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv

テクスチャの1つの領域にピクセルごとに1つの（u）値、別の領域に1つの（v）値です。繰り返しになりますが、このようにデータを配置すると、多くの場合、圧縮が向上するためです。

シェーダーに`texture_external`と`textureSampleBaseClampToEdge`を追加すると、WebGPUは舞台裏で、このビデオデータを取得してRGBA値を返すコードをシェーダーに挿入します。複数のテクスチャからサンプリングしたり、2、3、またはそれ以上の場所から正しいデータを取得してRGBに変換するためにテクスチャ座標の計算を行う必要がある場合があります。

上記のビデオのY、U、Vチャネルは次のとおりです。

<div class="webgpu_center">
  <div class="side-by-side">
    <div class="separate">
      <img src="../resources/videos/pexels-anna-bordarenko-5534310-y-channel.png" style="width: 300px;">
      <div>Yチャネル（輝度）</div>
    </div>
    <div class="separate">
      <div class="side-by-side">
        <div class="separate">
          <img src="../resources/videos/pexels-anna-bordarenko-5534310-u-channel.png" style="width: 150px;">
          <div>Uチャネル<br>（赤↔黄）</div>
        </div>
        <div class="separate">
          <img src="../resources/videos/pexels-anna-bordarenko-5534310-v-channel.png" style="width: 150px;">
          <div>Vチャネル<br>（青↔黄）</div>
        </div>
      </div>
    </div>
  </div>
</div>

WebGPUは、ここで効果的に最適化を提供しています。従来のグラフィックスライブラリでは、これはあなたに任されていました。YUVからRGBに変換するコードを自分で記述するか、OSに依頼します。データをRGBAテクスチャにコピーし、そのRGBAテクスチャを`texture_2d<f32>`として使用します。この方法はより柔軟です。ビデオと静止画像で異なるシェーダーを作成する必要はありません。しかし、YUVテクスチャからRGBAテクスチャへの変換が必要なため、遅くなります。

この遅くて柔軟な方法は、WebGPUでも利用可能であり、[前の記事](webgpu-importing-textures.html#a-loading-video)で説明しました。柔軟性が必要な場合、ビデオと静止画像で異なるシェーダーを必要とせずにどこでもビデオを使用したい場合は、その方法を使用してください。

WebGPUが`texture_external`にこの最適化を提供する理由の1つは、これがWebであるためです。ブラウザでサポートされているビデオの形式は時間とともに変化します。WebGPUはこれを処理しますが、YUVからRGBに変換するシェーダーを自分で記述する必要がある場合、ビデオの形式が変更されないことを知る必要があり、これはWebが保証できるものではありません。

この記事で説明した`texture_external`メソッドを使用する最も明白な場所は、顔認識で視覚化や背景分離を追加する場合など、meet、zoom、FBメッセンジャー関連の機能などのビデオ関連機能です。もう1つは、WebGPUがWebXRでサポートされるようになった場合のVRビデオです。

## <a id="a-web-camera"></a>カメラの使用

実際、カメラを使用しましょう。ごくわずかな変更です。

まず、再生するビデオを指定しません。

```js
  const video = document.createElement('video');
-  video.muted = true;
-  video.loop = true;
-  video.preload = 'auto';
-  video.src = 'resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4'; /* webgpufundamentals: url */
  await waitForClick();
  await startPlayingAndWaitForVideo(video);
```

次に、ユーザーが再生をクリックすると、`getUserMedia`を呼び出してカメラを要求します。結果のストリームはビデオに適用されます。コードのWebGPU部分に変更はありません。

```js
  function waitForClick() {
    return new Promise(resolve => {
      window.addEventListener(
        'click',
-        () => {
+        async() => {
          document.querySelector('#start').style.display = 'none';
-          resolve();
+          try {
+            const stream = await navigator.mediaDevices.getUserMedia({
+              video: true,
+            });
+            video.srcObject = stream;
+            resolve();
+          } catch (e) {
+            fail(`could not access camera: ${e.message ?? ''}`);
+          }
        },
        { once: true });
    });
  }
```

完了！

{{{example url="../webgpu-simple-textured-quad-external-video-camera.html"}}}

より効率的な`texture_external`タイプのテクスチャではなく、より柔軟な`texture<f32>`タイプのテクスチャとしてカメラ画像が必要な場合は、[前の記事のビデオの例](webgpu-importing-textures.html#a-loading-video)に同様の変更を加えることができます。