Title: WebGPU テクスチャ
Description: テクスチャの使用方法
TOC: テクスチャ

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

この記事では、テクスチャの基本について説明します。前の記事では、シェーダーにデータを渡す他の主要な方法について説明しました。それらは、[ステージ間変数](webgpu-inter-stage-variables.html)、[ユニフォーム](webgpu-uniforms.html)、[ストレージバッファ](webgpu-storage-buffers.html)、および[頂点バッファ](webgpu-vertex-buffers)でした。シェーダーにデータを渡す最後の主要な方法は、テクスチャです。

テクスチャは、ほとんどの場合、2D画像を表します。2D画像は、色の値の2D配列にすぎないので、なぜ2D配列にテクスチャが必要なのか疑問に思うかもしれません。ストレージバッファを2D配列として使用することもできます。テクスチャを特別なものにしているのは、*サンプラー*と呼ばれる特別なハードウェアでアクセスできることです。サンプラーは、テクスチャ内の最大16個の異なる値を読み取り、多くの一般的なユースケースで役立つ方法でそれらをブレンドできます。

一例として、元のサイズよりも大きい2D画像を描画したいとします。

<div class="webgpu_center">
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 128px; height: 128px; image-rendering: pixelated; image-rendering: crisp-edges;"></div>
    <div style="text-align: center;">オリジナル</div>
  </div>
</div>

元の画像から単一のピクセルを取得して、より大きな画像の各ピクセルを作成するだけの場合、以下の最初の例のようになります。代わりに、より大きな画像の特定のピクセルについて、元の画像から複数のピクセルを考慮すると、以下の2番目の画像のような結果が得られ、うまくいけばピクセル化が少なく表示されます。

<div class="webgpu_center compare">
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 512px; height: 512px; image-rendering: pixelated; image-rendering: crisp-edges;"></div>
    <div>フィルタリングなし</div>
  </div>
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 512px; height: 512px;"></div>
    <div>フィルタリングあり</div>
  </div>
</div>

テクスチャから個々のピクセルを取得するWGSL関数があり、そのためのユースケースがありますが、それらの関数は、ストレージバッファで同じことができるため、それほど興味深いものではありません。テクスチャの興味深いWGSL関数は、複数のピクセルをフィルタリングしてブレンドするものです。

これらのWGSL関数は、データを表すテクスチャ、テクスチャからデータを取得する方法を表すサンプラー、およびテクスチャから値を取得する場所を指定するテクスチャ座標を受け取ります。

サンプリングされたテクスチャのテクスチャ座標は、テクスチャの実際のサイズに関係なく、テクスチャ全体で0.0から1.0まで上下に移動します。[^up-or-down]

[^up-or-down]: テクスチャ座標が上（0 = 下、1 = 上）または下（0 = 上、1 = 下）に進むかどうかは、視点の問題です。重要なのは、テクスチャ座標0,0がテクスチャの最初のデータを参照することです。

<div class="webgpu_center"><img src="resources/texture-coordinates-diagram.svg" style="width: 500px;"></div>

[ステージ間変数に関する記事](webgpu-inter-stage-variables.html)のサンプルの1つを取り上げ、テクスチャ付きのクワッド（2つの三角形）を描画するように変更しましょう。

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
-  @location(0) color: vec4f,
+  @location(0) texcoord: vec2f,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );
-  var color = array<vec4f, 3>(
-    vec4f(1, 0, 0, 1), // red
-    vec4f(0, 1, 0, 1), // green
-    vec4f(0, 0, 1, 1), // blue
-  );
+  let pos = array(
+    // 1st triangle
+    vec2f( 0.0,  0.0),  // center
+    vec2f( 1.0,  0.0),  // right, center
+    vec2f( 0.0,  1.0),  // center, top
+
+    // 2nd triangle
+    vec2f( 0.0,  1.0),  // center, top
+    vec2f( 1.0,  0.0),  // right, center
+    vec2f( 1.0,  1.0),  // right, top
+  );

  var vsOutput: OurVertexShaderOutput;
-  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
-  vsOutput.color = color[vertexIndex];
+  let xy = pos[vertexIndex];
+  vsOutput.position = vec4f(xy, 0.0, 1.0);
+  vsOutput.texcoord = xy;
  return vsOutput;
}

+@group(0) @binding(0) var ourSampler: sampler;
+@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-  return fsInput.color;
+  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

上記では、中央揃えの三角形を描画する3つの頂点から、キャンバスの右上隅にクワッドを描画する6つの頂点に変更しました。

`OutVertexShaderOutput`を変更して、テクスチャ座標をフラグメントシェーダーに渡すことができるように`texcoord`（`vec2f`）を渡すようにしました。頂点シェーダーを変更して、ハードコードされた位置の配列から取得したクリップ空間の位置と同じように`vsOutput.texcoord`を設定するようにしました。`vsOutput.texcoord`は、フラグメントシェーダーに渡されるときに、各三角形の3つの頂点の間で補間されます。

次に、サンプラーとテクスチャを宣言し、それらをフラグメントシェーダーで参照しました。関数`textureSample`は、テクスチャを*サンプリング*します。最初のパラメータはサンプリングするテクスチャです。2番目のパラメータは、テクスチャをサンプリングする方法を指定するサンプラーです。3番目は、サンプリングする場所のテクスチャ座標です。

> 注：位置の値をテクスチャ座標として渡すことは一般的ではありませんが、この特定の単位クワッド（幅1単位、高さ1単位のクワッド）の場合、必要なテクスチャ座標が位置と一致することがたまたまあります。このようにすると、例が小さく、単純になります。[頂点バッファ](webgpu-vertex-buffers.html)を介してテクスチャ座標を提供するのがはるかに一般的です。

次に、テクスチャデータを作成する必要があります。5x7テクセルの`F`を作成します[^texel]。

[^texel]: テクセルは「テクスチャ要素」の略で、ピクセルは「ピクチャ要素」の略です。私にとって、テクセルとピクセルは基本的に同義ですが、テクスチャについて議論するときに*テクセル*という言葉を好む人もいます。

```js
  const kTextureWidth = 5;
  const kTextureHeight = 7;
  const _ = [255,   0,   0, 255];  // 赤
  const y = [255, 255,   0, 255];  // 黄
  const b = [  0,   0, 255, 255];  // 青
  const textureData = new Uint8Array([
    b, _, _, _, _,
    _, y, y, y, _,
    _, y, _, _, _,
    _, y, y, _, _,
    _, y, _, _, _,
    _, y, _, _, _,
    _, _, _, _, _,
  ].flat());
```

うまくいけば、そこに`F`と、左上隅（最初の値）に青いテクセルが表示されるはずです。

`rgba8unorm`テクスチャを作成します。`rgba8unorm`は、テクスチャに赤、緑、青、アルファの値があることを意味します。各値は8ビットの符号なしで、テクスチャで使用されるときに正規化されます。`unorm`は`unsigned normalized`の略で、値が（0から255）の符号なしバイトから（0.0から1.0）の浮動小数点値に変換されることを意味する派手な言い方です。

つまり、テクスチャに入力した値が`[64, 128, 192, 255]`の場合、シェーダーの値は`[64 / 255, 128 / 255, 192 / 255, 255 / 255]`、つまり`[0.25, 0.50, 0.75, 1.00]`になります。

データができたので、テクスチャを作成する必要があります。

```js
  const texture = device.createTexture({
    size: [kTextureWidth, kTextureHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
```

`device.createTexture`の場合、`size`パラメータはかなり明白なはずです。形式は上記のように`rgba8unorm`です。`usage`については、`GPUTextureUsage.TEXTURE_BINDING`は、このテクスチャをバインドグループにバインドできるようにしたいことを意味し[^texture-binding]、`COPY_DST`は、それにデータをコピーできるようにしたいことを意味します。

[^texture-binding]: テクスチャのもう1つの一般的な用途は、レンダリングしたいテクスチャに使用される`GPUTextureUsage.RENDER_ATTACHMENT`です。例として、`context.getCurrentTexture()`から取得するキャンバステクスチャは、デフォルトでその使用法が`GPUTextureUsage.RENDER_ATTACHMENT`に設定されています。

次に、まさにそれを行い、データをそれにコピーする必要があります。

```js
  device.queue.writeTexture(
      { texture },
      textureData,
      { bytesPerRow: kTextureWidth * 4 },
      { width: kTextureWidth, height: kTextureHeight },
  );
```

`device.queue.writeTexture`の場合、最初のパラメータは更新したいテクスチャです。2番目はそれにコピーしたいデータです。3番目は、テクスチャにコピーするときにそのデータを読み取る方法を定義します。`bytesPerRow`は、ソースデータの1行から次の行に進むために取得するバイト数を指定します。最後に、最後のパラメータはコピーのサイズを指定します。

サンプラーも作成する必要があります。

```js
  const sampler = device.createSampler();
```

テクスチャとサンプラーの両方を、シェーダーに入力した`@binding(?)`と一致するバインディングを持つバインドグループに追加する必要があります。

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture },
    ],
  });
```

レンダリングを更新するには、バインドグループを指定し、2つの三角形で構成されるクワッドをレンダリングするために6つの頂点をレンダリングする必要があります。

```js
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
-    pass.draw(3);  // 頂点シェーダーを3回呼び出します
+    pass.draw(6);  // 頂点シェーダーを6回呼び出します
    pass.end();
```

そして、それを実行すると、次のようになります。

{{{example url="../webgpu-simple-textured-quad.html"}}}

**なぜFは逆さまなのですか？**

もう一度テクスチャ座標の図を参照すると、テクスチャ座標0,0がテクスチャの最初のテクセルを参照していることがわかります。クワッドのキャンバスの中心の位置は0,0であり、その値をテクスチャ座標として使用するため、図が示すように、0,0のテクスチャ座標は最初の青いテクセルを参照しています。

これを修正するには、2つの一般的な解決策があります。

1. テクスチャ座標を反転させる

   この例では、頂点シェーダーでテクスチャ座標を変更できます。
   
   ```wgsl
   -  vsOutput.texcoord = xy;
   +  vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
   ```
   
   またはフラグメントシェーダー

   ```wgsl
   -  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
   +  let texcoord = vec2f(fsInput.texcoord.x, 1.0 - fsInput.texcoord.y);
   +  return textureSample(ourTexture, ourSampler, texcoord);
   ```

   もちろん、[頂点バッファ](webgpu-vertex-buffers.html)または[ストレージバッファ](webgpu-storage-buffers.html)を介してテクスチャ座標を提供している場合は、理想的にはソースでそれらを反転させます。

2. テクスチャデータを反転させる

   ```js
    const textureData = new Uint8Array([
   -   b, _, _, _, _,
   -   _, y, y, y, _,
   -   _, y, _, _, _,
   -   _, y, y, _, _,
   -   _, y, _, _, _,
   -   _, y, _, _, _,
   -   _, _, _, _, _,
   +   _, _, _, _, _,
   +   _, y, _, _, _,
   +   _, y, _, _, _,
   +   _, y, y, _, _,
   +   _, y, _, _, _,
   +   _, y, y, y, _,
   +   b, _, _, _, _,
    ].flat());
   ```

   データを反転させると、以前は上部にあったものが下部になり、元の画像の左下のピクセルがテクスチャの最初のデータになり、テクスチャ座標0,0が参照するものになります。これが、テクスチャ座標が下部の0から上部の1に進むと見なされることが多い理由です。

   <div class="webgpu_center"><img src="resources/texture-coordinates-y-flipped.svg" style="width: 500px;"></div>

   データの反転は非常に一般的であるため、画像、ビデオ、キャンバスからテクスチャを読み込むときに、データを反転させるオプションさえあります。

## <a id="a-mag-filter"></a>magFilter

上記の例では、デフォルト設定のサンプラーを使用しています。5x7テクスチャを元の5x7テクセルよりも大きく描画しているため、サンプラーは`magFilter`と呼ばれるもの、つまりテクスチャを拡大するときに使用されるフィルターを使用します。これを`nearest`から`linear`に変更すると、4つのピクセル間で線形補間されます。

<a id="a-linear-interpolation"></a>
<div class="webgpu_center center diagram"><div data-diagram="linear-interpolation" style="display: inline-block; width: 600px;"></div></div>

テクスチャ座標はしばしば「UV」（ユーブイと発音）と呼ばれるため、上の図では`uv`はテクスチャ座標です。特定のuvに対して、最も近い4つのピクセルが選択されます。`t1`は、選択された左上のピクセルの中心と、その右側のピクセルの中心との間の水平距離であり、0は水平方向に左のピクセルの中心にあり、1は水平方向に右の選択されたピクセルの中心にあることを意味します。`t2`も同様ですが、垂直方向です。

`t1`は、上の2つのピクセルを*「混合」*して中間色を生成するために使用されます。*mix*は2つの値を線形補間するため、`t1`が0の場合、最初の色のみが得られます。`t1` = 1の場合、2番目の色のみが得られます。0と1の間の値は、比例した混合を生成します。たとえば、0.3は、最初の色の70％と2番目の色の30％になります。同様に、下の2つのピクセルに対して2番目の中間色が計算されます。最後に、`t2`を使用して、2つの中間色を最終的な色に混合します。

もう1つ注意すべき点は、図の下部にさらに2つのサンプラー設定、`addressModeU`と`addressModeV`があることです。これらを`repeat`または`clamp-to-edge`に設定できます[^mirror-repeat]。`repeat`に設定すると、テクスチャ座標がテクスチャの端から半テクセル以内にある場合、テクスチャの反対側のピクセルとブレンドされます。`clamp-to-edge`に設定すると、返す色を計算する目的で、テクスチャ座標がクランプされ、各端の最後の半テクセルに入ることができなくなります。これにより、その範囲外のテクスチャ座標に対してエッジの色が表示される効果があります。

[^mirror-repeat]: もう1つのアドレスモード、「ミラーリピート」もあります。テクスチャが「🟥🟩🟦」の場合、リピートは「🟥🟩🟦🟥🟩🟦🟥🟩🟦🟥🟩🟦」になり、ミラーリピートは「🟥🟩🟦🟦🟩🟥🟥🟩🟦🟦🟩🟥」になります。

これらのすべてのオプションでクワッドを描画するように例を更新しましょう。

まず、設定の組み合わせごとにサンプラーを作成します。また、そのサンプラーを使用するバインドグループも作成します。

```js
+  const bindGroups = [];
+  for (let i = 0; i < 8; ++i) {
-   const sampler = device.createSampler();
+   const sampler = device.createSampler({
+      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
+      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
+      magFilter: (i & 4) ? 'linear' : 'nearest',
+    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture },
      ],
    });
+    bindGroups.push(bindGroup);
+  }
```

いくつかの設定を作成します。

```js
  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
  };
```

そして、レンダリング時に、設定を見て、使用するバインドグループを決定します。

```js
  function render() {
+    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
+                (settings.addressModeV === 'repeat' ? 2 : 0) +
+                (settings.magFilter === 'linear' ? 4 : 0);
+    const bindGroup = bindGroups[ndx];
   ...
```

次に、設定を変更できるUIを提供し、設定が変更されたときに再レンダリングする必要があります。「muigui」というライブラリを使用していますが、現時点では[dat.GUI](https://github.com/dataarts/dat.gui)と同様のAPIを持っています。

```js
import GUI from '../3rdparty/muigui-0.x.module.js';

...

  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
  };

  const addressOptions = ['repeat', 'clamp-to-edge'];
  const filterOptions = ['nearest', 'linear'];

  const gui = new GUI();
  gui.onChange(render);
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  gui.add(settings, 'addressModeU', addressOptions);
  gui.add(settings, 'addressModeV', addressOptions);
  gui.add(settings, 'magFilter', filterOptions);
```

上記のコードは`settings`を宣言し、それらを設定するためのUIを作成し、変更されたときに`render`を呼び出します。

{{{example url="../webgpu-simple-textured-quad-linear.html"}}}

フラグメントシェーダーは補間されたテクスチャ座標を受け取るため、シェーダーがそれらの座標で`textureSample`を呼び出すと、レンダリングされる各ピクセルに色を提供するように求められるため、異なるブレンドされた色が得られます。アドレスモードを「repeat」に設定すると、WebGPUがテクスチャの反対側のテクセルから「サンプリング」していることがわかります。

## <a id="a-min-filter"></a>minFilter

また、`minFilter`という設定もあり、テクスチャがそのサイズよりも小さく描画されるときに`magFilter`と同様の計算を行います。`linear`に設定すると、4つのピクセルを選択し、上記と同様の数学に従ってそれらをブレンドします。

問題は、より大きなテクスチャから4つのブレンドされたピクセルを選択して、たとえば1ピクセルをレンダリングすると、色が変化し、ちらつきが発生することです。

問題を確認できるように、やってみましょう。

まず、キャンバスを低解像度にしましょう。これを行うには、ブラウザがキャンバス自体に同じ`magFilter: 'linear'`効果を適用しないようにCSSを更新する必要があります。次のようにCSSを設定することでこれを行うことができます。

```css
canvas {
  display: block;  /* canvasをブロックのように動作させる */
  width: 100%;     /* canvasがコンテナを埋めるようにする */
  height: 100%;
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
}
```

次に、`ResizeObserver`コールバックでキャンバスの解像度を下げましょう。

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // 再レンダリング
      render();
    }
  });
  observer.observe(canvas);
```

クワッドを移動およびスケーリングするので、[ユニフォームに関する記事](webgpu-uniforms.html)の最初の例で行ったように、ユニフォームバッファを追加します。

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

+struct Uniforms {
+  scale: vec2f,
+  offset: vec2f,
+};
+
+@group(0) @binding(2) var<uniform> uni: Uniforms;

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

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
-  vsOutput.position = vec4f(xy, 0.0, 1.0);
+  vsOutput.position = vec4f(xy * uni.scale + uni.offset, 0.0, 1.0);
  vsOutput.texcoord = xy;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

ユニフォームができたので、ユニフォームバッファを作成し、バインドグループに追加する必要があります。

```js
+  // ユニフォーム値用のバッファを作成します
+  const uniformBufferSize =
+    2 * 4 + // scaleは2つの32ビット浮動小数点数（各4バイト）です
+    2 * 4;  // offsetは2つの32ビット浮動小数点数（各4バイト）です
+  const uniformBuffer = device.createBuffer({
+    label: 'uniforms for quad',
+    size: uniformBufferSize,
+    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+  });
+
+  // JavaScript側でユニフォームの値を保持するための型付き配列を作成します
+  const uniformValues = new Float32Array(uniformBufferSize / 4);
+
+  // float32インデックスでのさまざまなユニフォーム値へのオフセット
+  const kScaleOffset = 0;
+  const kOffsetOffset = 2;

  const bindGroups = [];
  for (let i = 0; i < 8; ++i) {
    const sampler = device.createSampler({
      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
      magFilter: (i & 4) ? 'linear' : 'nearest',
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture },
+        { binding: 2, resource: uniformBuffer },
      ],
    });
    bindGroups.push(bindGroup);
  }
```

そして、ユニフォームの値を設定し、GPUにアップロードするコードが必要です。これをアニメーション化するので、`requestAnimationFrame`を使用して継続的にレンダリングするようにコードを変更します。

```js
  function render(time) {
    time *= 0.001;
    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
                (settings.addressModeV === 'repeat' ? 2 : 0) +
                (settings.magFilter === 'linear' ? 4 : 0);
    const bindGroup = bindGroups[ndx];

+    // 0から1のクリップ空間クワッドを描画するスケールを計算します
+    // キャンバスの2x2ピクセル。
+    const scaleX = 4 / canvas.width;
+    const scaleY = 4 / canvas.height;
+
+    uniformValues.set([scaleX, scaleY], kScaleOffset); // スケールを設定します
+    uniformValues.set([Math.sin(time * 0.25) * 0.8, -0.8], kOffsetOffset); // オフセットを設定します
+
+    // JavaScriptからGPUに値をコピーします
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    ...

+    requestAnimationFrame(render);
  }
+  requestAnimationFrame(render);

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
-      // 再レンダリング
-      render();
    }
  });
  observer.observe(canvas);
}
```

上記のコードは、キャンバスの2x2ピクセルのサイズのクワッドを描画するようにスケールを設定します。また、`Math.sin`を使用してオフセットを-0.8から+0.8に設定し、クワッドがキャンバスをゆっくりと往復するようにします。

最後に、設定と組み合わせに`minFilter`を追加しましょう。

```js
  const bindGroups = [];
  for (let i = 0; i < 16; ++i) {
    const sampler = device.createSampler({
      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
      magFilter: (i & 4) ? 'linear' : 'nearest',
+      minFilter: (i & 8) ? 'linear' : 'nearest',
    });

...

  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
+    minFilter: 'linear',
  };

  const addressOptions = ['repeat', 'clamp-to-edge'];
  const filterOptions = ['nearest', 'linear'];

  const gui = new GUI();
-  gui.onChange(render);
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  gui.add(settings, 'addressModeU', addressOptions);
  gui.add(settings, 'addressModeV', addressOptions);
  gui.add(settings, 'magFilter', filterOptions);
+  gui.add(settings, 'minFilter', filterOptions);

  function render(time) {
    time *= 0.001;
    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
                (settings.addressModeV === 'repeat' ? 2 : 0) +
-                (settings.magFilter === 'linear' ? 4 : 0);
+                (settings.magFilter === 'linear' ? 4 : 0) +
+                (settings.minFilter === 'linear' ? 8 : 0);
```

`requestAnimationFrame`（しばしば「rAF」と呼ばれ、このスタイルのレンダリングループはしばしば「rAFループ」と呼ばれます）を使用して常にレンダリングしているため、設定が変更されたときに`render`を呼び出す必要はもうありません。

{{{example url="../webgpu-simple-textured-quad-minfilter.html"}}}

クワッドがちらつき、色が変化していることがわかります。`minFilter`が`nearest`に設定されている場合、クワッドの2x2ピクセルごとに、テクスチャから1ピクセルを選択します。`linear`に設定すると、上記で説明したバイリニアフィルタリングを行いますが、それでもちらつきます。

1つの理由は、クワッドは実数で配置されますが、ピクセルは整数であるためです。テクスチャ座標は実数から補間されるか、むしろ実数から計算されます。

<a id="a-pixel-to-texcoords"></a>
<div class="webgpu_center center diagram">
  <div class="fit-container">
    <div class="text-align: center">ドラッグして移動</div>
    <div class="fit-container" data-diagram="pixel-to-texcoords" style="display: inline-block; width: 600px;"></div>
  </div>
</div>

上の図では、<span style="color: red;">赤</span>の長方形は、頂点シェーダーから返す値に基づいてGPUに描画するように依頼したクワッドを表します。GPUが描画するとき、どのピクセルの中心がクワッド（2つの三角形）の内側にあるかを計算します。次に、描画されるピクセルの中心が元の点のどこにあるかに基づいて、フラグメントシェーダーに渡す補間されたステージ間変数の値を計算します。フラグメントシェーダーでは、そのテクスチャ座標をWGSL `textureSample`関数に渡し、前の図が示したようにサンプリングされた色を取得します。うまくいけば、色がちらつく理由がわかるでしょう。描画されるピクセルに対して計算されるUV座標に応じて、異なる色にブレンドされることがわかります。

テクスチャは、この問題に対する解決策を提供します。それはミップマッピングと呼ばれます。「ミップマップ」は「マルチイメージピラミッドマップ」の略だと思います（間違っているかもしれませんが）。

テクスチャを取得し、各次元で半分のサイズの小さなテクスチャを作成し、切り捨てます。次に、最初の元のテクスチャからブレンドされた色で小さなテクスチャを埋めます。1x1テクスチャになるまでこれを繰り返します。この例では、5x7テクセルのテクスチャがあります。各次元で2で除算し、切り捨てると、2x3テクセルのテクスチャが得られます。それを取得して繰り返し、1x1テクセルのテクスチャになります。

<div class="webgpu_center center diagram"><div data-diagram="mips" style="display: inline-block;"></div></div>

ミップマップが与えられると、元のテクスチャサイズよりも小さいものを描画するときに、GPUに小さなミップレベルを選択するように依頼できます。これは、「事前にブレンド」されており、スケーリングされたときにテクスチャの色がどうなるかをよりよく表しているため、見栄えが良くなります。

あるミップから次のミップにピクセルをブレンドするための最良のアルゴリズムは、研究のトピックであり、意見の問題でもあります。最初のアイデアとして、バイリニアフィルタリング（上記で実証）によって前のミップから各ミップを生成するコードを次に示します。

```js
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const bilinearFilter = (tl, tr, bl, br, t1, t2) => {
  const t = mix(tl, tr, t1);
  const b = mix(bl, br, t1);
  return mix(t, b, t2);
};

const createNextMipLevelRgba8Unorm = ({data: src, width: srcWidth, height: srcHeight}) => {
  // 次のミップのサイズを計算します
  const dstWidth = Math.max(1, srcWidth / 2 | 0);
  const dstHeight = Math.max(1, srcHeight / 2 | 0);
  const dst = new Uint8Array(dstWidth * dstHeight * 4);

  const getSrcPixel = (x, y) => {
    const offset = (y * srcWidth + x) * 4;
    return src.subarray(offset, offset + 4);
  };

  for (let y = 0; y < dstHeight; ++y) {
    for (let x = 0; x < dstWidth; ++x) {
      // 宛先テクセルの中心のテクスチャ座標を計算します
      const u = (x + 0.5) / dstWidth;
      const v = (y + 0.5) / dstHeight;

      // ソースで同じテクスチャ座標を計算します - 0.5ピクセル
      const au = (u * srcWidth - 0.5);
      const av = (v * srcHeight - 0.5);

      // ソースの左上のテクセル座標（テクスチャ座標ではない）を計算します
      const tx = au | 0;
      const ty = av | 0;

      // ピクセル間の混合量を計算します
      const t1 = au % 1;
      const t2 = av % 1;

      // 4つのピクセルを取得します
      const tl = getSrcPixel(tx, ty);
      const tr = getSrcPixel(tx + 1, ty);
      const bl = getSrcPixel(tx, ty + 1);
      const br = getSrcPixel(tx + 1, ty + 1);

      // 「サンプリングされた」結果を宛先にコピーします。
      const dstOffset = (y * dstWidth + x) * 4;
      dst.set(bilinearFilter(tl, tr, bl, br, t1, t2), dstOffset);
    }
  }
  return { data: dst, width: dstWidth, height: dstHeight };
};

const generateMips = (src, srcWidth) => {
  const srcHeight = src.length / 4 / srcWidth;

  // 最初のミップレベル（ベースレベル）を設定します
  let mip = { data: src, width: srcWidth, height: srcHeight, };
  const mips = [mip];

  while (mip.width > 1 || mip.height > 1) {
    mip = createNextMipLevelRgba8Unorm(mip);
    mips.push(mip);
  }
  return mips;
};
```

[別の記事](webgpu-importing-textures.html)で、GPUでこれを行う方法について説明します。今のところ、上記のコードを使用してミップマップを生成できます。

上記の関数にテクスチャデータを渡し、ミップレベルデータの配列を返します。次に、すべてのミップレベルを持つテクスチャを作成できます。

```js
  const mips = generateMips(textureData, kTextureWidth);

  const texture = device.createTexture({
    label: 'yellow F on red',
+    size: [mips[0].width, mips[0].height],
+    mipLevelCount: mips.length,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
  });
  mips.forEach(({data, width, height}, mipLevel) => {
    device.queue.writeTexture(
-      { texture },
-      textureData,
-      { bytesPerRow: kTextureWidth * 4 },
-      { width: kTextureWidth, height: kTextureHeight },
+      { texture, mipLevel },
+      data,
+      { bytesPerRow: width * 4 },
+      { width, height },
    );
  });
```

`mipLevelCount`をミップレベルの数に渡すことに注意してください。WebGPUは、各レベルで正しいサイズのミップレベルを作成します。次に、`mipLevel`を指定して、各レベルにデータをコピーします。

クワッドをさまざまなサイズで描画できるように、スケール設定も追加しましょう。

```js
  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
+    scale: 1,
  };

  ...

  const gui = new GUI();
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  gui.add(settings, 'addressModeU', addressOptions);
  gui.add(settings, 'addressModeV', addressOptions);
  gui.add(settings, 'magFilter', filterOptions);
  gui.add(settings, 'minFilter', filterOptions);
+  gui.add(settings, 'scale', 0.5, 6);

  function render(time) {

    ...

-    const scaleX = 4 / canvas.width;
-    const scaleY = 4 / canvas.height;
+    const scaleX = 4 / canvas.width * settings.scale;
+    const scaleY = 4 / canvas.height * settings.scale;

```

そして、GPUが描画する最小のミップを選択し、ちらつきがなくなりました。

{{{example url="../webgpu-simple-textured-quad-mipmap.html"}}}

スケールを調整すると、大きくなるにつれて、使用されるミップレベルが変化することがわかります。スケール2.4とスケール2.5の間にはかなり厳しい遷移があり、GPUはミップレベル0（最大のミップレベル）とミップレベル1（中間のサイズ）を切り替えます。それについてどうすればよいでしょうか？

## <a id="a-mipmap-filter"></a>mipmapFilter

`magFilter`と`minFilter`があり、どちらも`nearest`または`linear`に設定できるのと同様に、`mipmapFilter`設定もあり、これも`nearest`または`linear`に設定できます。

これにより、ミップレベル間でブレンドするかどうかを選択します。`mipmapFilter: 'linear'`では、2つのミップレベルから色がサンプリングされ、前の設定に基づいて最近傍または線形フィルタリングのいずれかを使用して、それらの2つの色が再び同様の方法で`mix`されます。

これは、3Dで物を描画するときに最もよく発生します。3Dで描画する方法は[他の記事](webgpu-perspective.html)で説明されているので、ここでは説明しませんが、`mipmapFilter`がどのように機能するかをよりよく確認できるように、前の例を3Dを表示するように変更します。

まず、いくつかのテクスチャを作成しましょう。16x16のテクスチャを1つ作成します。これにより、`mipmapFilter`の効果がよりよくわかると思います。

```js
  const createBlendedMipmap = () => {
    const w = [255, 255, 255, 255];
    const r = [255,   0,   0, 255];
    const b = [  0,  28, 116, 255];
    const y = [255, 231,   0, 255];
    const g = [ 58, 181,  75, 255];
    const a = [ 38, 123, 167, 255];
    const data = new Uint8Array([
      w, r, r, r, r, r, r, a, a, r, r, r, r, r, r, w,
      w, w, r, r, r, r, r, a, a, r, r, r, r, r, w, w,
      w, w, w, r, r, r, r, a, a, r, r, r, r, w, w, w,
      w, w, w, w, r, r, r, a, a, r, r, r, w, w, w, w,
      w, w, w, w, w, r, r, a, a, r, r, w, w, w, w, w,
      w, w, w, w, w, w, r, a, a, r, w, w, w, w, w, w,
      w, w, w, w, w, w, w, a, a, w, w, w, w, w, w, w,
      b, b, b, b, b, b, b, b, a, y, y, y, y, y, y, y,
      b, b, b, b, b, b, b, g, y, y, y, y, y, y, y, y,
      w, w, w, w, w, w, w, g, g, w, w, w, w, w, w, w,
      w, w, w, w, w, w, r, g, g, r, w, w, w, w, w, w,
      w, w, w, w, w, r, r, g, g, r, r, w, w, w, w, w,
      w, w, w, w, r, r, r, g, g, r, r, r, w, w, w, w,
      w, w, w, r, r, r, r, g, g, r, r, r, r, w, w, w,
      w, w, r, r, r, r, r, g, g, r, r, r, r, r, w, w,
      w, r, r, r, r, r, r, g, g, r, r, r, r, r, r, w,
    ].flat());
    return generateMips(data, 16);
  };
```

これにより、これらのミップレベルが生成されます。

<div class="webgpu_center center diagram"><div data-diagram="blended-mips" style="display: inline-block;"></div></div>

各ミップレベルに任意のデータを入れることができるので、何が起こっているかを確認するもう1つの良い方法は、各ミップレベルを異なる色にすることです。キャンバス2D APIを使用してミップレベルを作成しましょう。

```js
  const createCheckedMipmap = () => {
    const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    const levels = [
      { size: 64, color: 'rgb(128,0,255)', },
      { size: 32, color: 'rgb(0,255,0)', },
      { size: 16, color: 'rgb(255,0,0)', },
      { size:  8, color: 'rgb(255,255,0)', },
      { size:  4, color: 'rgb(0,0,255)', },
      { size:  2, color: 'rgb(0,255,255)', },
      { size:  1, color: 'rgb(255,0,255)', },
    ];
    return levels.map(({size, color}, i) => {
      ctx.canvas.width = size;
      ctx.canvas.height = size;
      ctx.fillStyle = i & 1 ? '#000' : '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
      return ctx.getImageData(0, 0, size, size);
    });
  };
```

このコードは、これらのミップレベルを生成します。

<div class="webgpu_center center diagram"><div data-diagram="checkered-mips" style="display: inline-block;"></div></div>

データを作成したので、テクスチャを作成しましょう。

```js
+  const createTextureWithMips = (mips, label) => {
    const texture = device.createTexture({
-      label: 'yellow F on red',
+      label,
      size: [mips[0].width, mips[0].height],
      mipLevelCount: mips.length,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST,
    });
    mips.forEach(({data, width, height}, mipLevel) => {
      device.queue.writeTexture(
          { texture, mipLevel },
          data,
          { bytesPerRow: width * 4 },
          { width, height },
      );
    });
    return texture;
+  };

+  const textures = [
+    createTextureWithMips(createBlendedMipmap(), 'blended'),
+    createTextureWithMips(createCheckedMipmap(), 'checker'),
+  ];
```

8つの場所に遠くに伸びるクワッドを描画します。[3Dに関する一連の記事](webgpu-cameras.html)で説明したように、行列演算を使用します。

```wsgl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
-  scale: vec2f,
-  offset: vec2f,
+  matrix: mat4x4f,
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

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
-  vsOutput.position = vec4f(xy * uni.scale + uni.offset, 0.0, 1.0);
+  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(1, 50);
  return vsOut;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

8つの平面のそれぞれは、`minFilter`、`magFilter`、`mipmapFilter`の異なる組み合わせを使用します。つまり、それぞれに、その特定のフィルターの組み合わせを持つサンプラーを含む異なるバインドグループが必要です。さらに、2つのテクスチャがあります。テクスチャもバインドグループの一部であるため、オブジェクトごとに2つのバインドグループが必要になります。1つは各テクスチャ用です。次に、レンダリング時にどちらを使用するかを選択できます。8つの場所に平面を描画するには、[ユニフォームに関する記事](webgpu-uniforms.html)で説明したように、場所ごとに1つのユニフォームバッファも必要です。

```js
  // float32インデックスでのさまざまなユニフォーム値へのオフセット
  const kMatrixOffset = 0;

  const objectInfos = [];
  for (let i = 0; i < 8; ++i) {
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: (i & 1) ? 'linear' : 'nearest',
      minFilter: (i & 2) ? 'linear' : 'nearest',
      mipmapFilter: (i & 4) ? 'linear' : 'nearest',
    });

    // ユニフォーム値用のバッファを作成します
    const uniformBufferSize =
      16 * 4; // 行列は16個の32ビット浮動小数点数（各4バイト）です
    const uniformBuffer = device.createBuffer({
      label: 'uniforms for quad',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // JavaScript側でユニフォームの値を保持するための型付き配列を作成します
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    const matrix = uniformValues.subarray(kMatrixOffset, 16);

    const bindGroups = textures.map(texture =>
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture },
          { binding: 2, resource: uniformBuffer },
        ],
      }));

    // このオブジェクトをレンダリングするために必要なデータを保存します。
    objectInfos.push({
      bindGroups,
      matrix,
      uniformValues,
      uniformBuffer,
    });
  }
```

レンダリング時に、[ビュー射影行列を計算します](webgpu-cameras.html)。

```js
  function render() {
    const fov = 60 * Math.PI / 180;  // 60度（ラジアン）
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear  = 1;
    const zFar   = 2000;
    const projectionMatrix = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition = [0, 0, 2];
    const up = [0, 1, 0];
    const target = [0, 0, 0];
    const cameraMatrix = mat4.lookAt(cameraPosition, target, up);
    const viewMatrix = mat4.inverse(cameraMatrix);
    const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);

    ...
```

次に、各平面について、表示したいテクスチャに基づいてバインドグループを選択し、その平面を配置するための一意の行列を計算します。

```js
  let texNdx = 0;

  function render() {
    ...

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup = bindGroups[texNdx];

      const xSpacing = 1.2;
      const ySpacing = 0.7;
      const zDepth = 50;

      const x = i % 4 - 1.5;
      const y = i < 4 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
      mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
      mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      // JavaScriptからGPUに値をコピーします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // 頂点シェーダーを6回呼び出します
    });

    pass.end();
```

既存のUIコードを削除し、rAFループから`ResizeObserver`コールバックでのレンダリングに切り替え、解像度を低くするのをやめました。

```js
-  function render(time) {
-    time *= 0.001;
+  function render() {

    ...

-    requestAnimationFrame(render);
  }
-  requestAnimationFrame(render);

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
-      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
+      const width = entry.contentBoxSize[0].inlineSize;
+      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
+      render();
    }
  });
  observer.observe(canvas);
```

低解像度ではなくなったので、ブラウザがキャンバス自体をフィルタリングするのを防いでいたCSSを削除できます。

```css
canvas {
  display: block;  /* canvasをブロックのように動作させる */
  width: 100%;     /* canvasがコンテナを埋めるようにする */
  height: 100%;
-  image-rendering: pixelated;
-  image-rendering: crisp-edges;
}
```

そして、キャンバスをクリックすると、描画するテクスチャが切り替わり、再レンダリングされるようにできます。

```js
  canvas.addEventListener('click', () => {
    texNdx = (texNdx + 1) % textures.length;
    render();
  });
```

{{{example url="../webgpu-simple-textured-quad-mipmapfilter.html"}}}

うまくいけば、左上のすべてのフィルタリングが`nearest`に設定されているものから、右下のすべてのフィルタリングが`linear`に設定されているものへの進行を見ることができます。特に、この例では`mipmapFilter`を追加したため、画像をクリックして、すべてのミップレベルが異なる色であるチェックされたテクスチャを表示すると、上部のすべての平面で`mipmapFilter`が`nearest`に設定されているため、あるミップレベルから次のミップレベルに切り替わる点が急であることがわかります。下部では、各平面で`mipmapFilter`が`linear`に設定されているため、ミップレベル間でブレンドが行われます。

なぜ常にすべてのフィルタリングを`linear`に設定しないのか疑問に思うかもしれません。明白な理由はスタイルです。ピクセル化された画像を作成しようとしている場合は、もちろんフィルタリングはしたくないでしょう。もう1つの理由は速度です。すべてのフィルタリングがnearestに設定されている場合、テクスチャから1ピクセルを読み取る方が、すべてのフィルタリングがlinearに設定されている場合にテクスチャから8ピクセルを読み取るよりも高速です。

TBD: 繰り返し

TBD: 異方性フィルタリング

## テクスチャタイプとテクスチャビュー

これまで、2Dテクスチャのみを使用してきました。テクスチャには3つのタイプがあります。

* 「1d」
* 「2d」
* 「3d」

ある意味では、「2d」テクスチャは深さが1の「3d」テクスチャと見なすことができ、「1d」テクスチャは高さが1の「2d」テクスチャと見なすことができます。2つの実際の違いは、テクスチャの最大許容寸法が制限されていることです。制限は、テクスチャのタイプ「1d」、「2d」、「3d」ごとに異なります。キャンバスのサイズを設定するときに、「2d」の制限を使用しました。

```js
canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
```

もう1つは速度です。少なくとも3Dテクスチャと2Dテクスチャの場合、すべてのサンプラーフィルターが`linear`に設定されている場合、3Dテクスチャをサンプリングするには16個のテクセルを調べてそれらをすべてブレンドする必要があります。2Dテクスチャをサンプリングするには8個のテクセルしか必要ありません。1Dテクスチャは4個しか必要ない可能性がありますが、GPUが実際に1Dテクスチャを最適化しているかどうかはわかりません。

### テクスチャビュー

テクスチャビューには6つのタイプがあります。

* 「1d」
* 「2d」
* 「2d-array」
* 「3d」
* 「cube」
* 「cube-array」

「1d」テクスチャは「1d」ビューしか持てません。「3d」テクスチャは「3d」ビューしか持てません。「2d」テクスチャは「2d-array」ビューを持つことができます。「2d」テクスチャに6つのレイヤーがある場合、「cube」ビューを持つことができます。6の倍数のレイヤーがある場合、「cube-array」ビューを持つことができます。`someTexture.createView`を呼び出すときに、テクスチャをどのように表示するかを選択できます。テクスチャビューはデフォルトでその次元と同じですが、`someTexture.createView`に異なる次元を渡すことができます。

[トーンマッピング/3dLUTに関する記事](webgpu-3dluts.html)で「3d」テクスチャについて説明します。

「キューブ」テクスチャは、キューブの6つの面を表すテクスチャです。キューブテクスチャは、スカイボックスを描画したり、反射や環境マップに使用されたりすることがよくあります。[キューブマップに関する記事](webgpu-cube-maps.html)で説明します。

「2d-array」は、2Dテクスチャの配列です。シェーダーで配列のどのテクスチャにアクセスするかを選択できます。これらは、地形レンダリングなどで一般的に使用されます。

「cube-array」は、キューブテクスチャの配列です。

各タイプのテクスチャには、WGSLに対応する独自のタイプがあります。

<div class="webgpu_center data-table" style="max-width: 500px;">
  <style>
    .texture-type {
      text-align: left;
      font-size: large;
      line-height: 1.5em;
    }
    .texture-type td:nth-child(1) {
      white-space: nowrap;
    }
  </style>
  <table class="texture-type">
   <thead>
    <tr>
     <th>タイプ</th>
     <th>WGSLタイプ</th>
    </tr>
   </thead>
   <tbody>
    <tr><td>"1d"</td><td><code>texture_1d</code>または<code>texture_storage_1d</code></td></tr>
    <tr><td>"2d"</td><td><code>texture_2d</code>または<code>texture_storage_2d</code>または<code>texture_multisampled_2d</code>、および特定の状況での特別なケースとして<code>texture_depth_2d</code>と<code>texture_depth_multisampled_2d</code></td></tr>
    <tr><td>"2d-array"</td><td><code>texture_2d_array</code>または<code>texture_storage_2d_array</code>、および場合によっては<code>texture_depth_2d_array</code></td></tr>
    <tr><td>"3d"</td><td><code>texture_3d</code>または<code>texture_storage_3d</code></td></tr>
    <tr><td>"cube"</td><td><code>texture_cube</code>、および場合によっては<code>texture_depth_cube</code></td></tr>
    <tr><td>"cube-array"</td><td><code>texture_cube_array</code>、および場合によっては<code>texture_depth_cube_array</code></td></tr>
   </tbody>
  </table>
</div>

これらの一部については実際の使用で説明しますが、テクスチャを作成するとき（`device.createTexture`を呼び出すとき）、「1d」、「2d」、「3d」のオプションしかなく、デフォルトは「2d」なので、まだ次元を指定する必要がないことは少し混乱する可能性があります。

## テクスチャ形式

今のところ、これがテクスチャの基本です。テクスチャは大きなトピックであり、他にもたくさん説明することがあります。

この記事では`rgba8unorm`テクスチャを使用してきましたが、さまざまなテクスチャ形式がたくさんあります。

これは「色」の形式ですが、もちろん、それらに色を保存する必要はありません。

<div class="webgpu_center data-table"><div data-diagram="color-texture-formats"></div></div>

「rg16float」のような形式を読むには、最初の文字はテクスチャでサポートされているチャネルなので、「rg16float」は「rg」または赤と緑（2チャネル）をサポートします。数値16は、それらのチャネルがそれぞれ16ビットであることを意味します。末尾の単語は、チャネル内のデータの種類です。「float」は浮動小数点データです。

「unorm」は符号なし正規化データ（0から1）であり、テクスチャ内のデータが0からNまでであることを意味します。Nはそのビット数の最大整数値です。その整数範囲は、（0から1）の浮動小数点範囲として解釈されます。つまり、8unormテクスチャの場合、8ビット（したがって0から255までの値）が（0から1）の値として解釈されます。

「snorm」は符号付き正規化データ（-1から+1）なので、データの範囲は、ビット数で表される最も負の整数から最も正の整数までです。たとえば、8snormは8ビットです。符号付き整数として、最小数は-128、最大数は+127になります。その範囲は（-1から+1）に変換されます。

「sint」は符号付き整数です。「uint」は符号なし整数です。複数の文字と数字の組み合わせがある場合は、各チャネルのビット数を指定しています。たとえば、「rg11b10ufloat」は「rg11」なので、赤と緑がそれぞれ11ビットです。「b10」なので、青が10ビットで、すべて符号なし浮動小数点数です。

* **レンダリング可能**

  Trueは、それにレンダリングできることを意味します（その使用法を`GPUTextureUsage.RENDER_ATTACHMENT`に設定します）。

* **マルチサンプル**

  [マルチサンプリング](webgpu-multisampling.html)できます。

* **ストレージ**

  [ストレージテクスチャ](webgpu-storage-textures.html)として書き込むことができます。

* **サンプラータイプ**

  これは、WGSLで宣言する必要があるテクスチャのタイプと、サンプラーをバインドグループにバインドする方法に影響します。上記では`texture_2d<f32>`を使用しましたが、たとえば、`sint`はWGSLで`texture_2d<i32>`を必要とし、`uint`は`texture_2d<u32>`を必要とします。

  サンプラータイプの列で、`unfilterable-float`は、サンプラーがその形式に対して`nearest`しか使用できないことを意味し、`'auto'`レイアウトを使用してきたため、これまでに行ったことのないバインドグループレイアウトを手動で作成する必要がある場合があることを意味します。これは主に、デスクトップGPUは通常32ビット浮動小数点テクスチャをフィルタリングできますが、少なくとも2023年の時点では、ほとんどのモバイルデバイスはできないためです。アダプターが`float32-filterable`[機能](webgpu-limits-and-features.html)をサポートし、デバイスを要求するときに有効にすると、`r32float`、`rg32float`、`rgba32float`の形式が`unfilterable-float`から`float`に切り替わり、これらのテクスチャ形式は他の変更なしで機能します。

<a id="a-depth-stencil-formats"></a>そして、深度とステンシルの形式は次のとおりです。

<div class="webgpu_center data-table"><div data-diagram="depth-stencil-texture-formats"></div></div>

* **機能**

  この[*オプション*機能](webgpu-limits-and-features.html)がこの形式を使用するために必要であることを意味します。

* **コピー元**

  `GPUTextureUsage.COPY_SRC`を指定できるかどうか

* **コピー先**

  `GPUTextureUsage.COPY_DST`を指定できるかどうか

[3Dに関するシリーズの記事](webgpu-orthographic-projection.html)と[シャドウマップに関する記事](webgpu-shadow-maps.html)で深度テクスチャを使用します。

圧縮されたテクスチャ形式もたくさんありますが、これについては別の記事で説明します。

次に、[外部テクスチャのインポート](webgpu-importing-textures.html)について説明します。

<!-- この記事の最後にこれを保持してください -->
<script type="module" src="/3rdparty/pixel-perfect.js"></script>
<script type="module" src="webgpu-textures.js"></script>
