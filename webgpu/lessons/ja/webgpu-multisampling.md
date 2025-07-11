Title: WebGPU マルチサンプリング
Description: マルチサンプリング / MSAA
TOC: マルチサンプリング / MSAA

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

MSAAは、マルチサンプリングアンチエイリアシングの略です。アンチエイリアシングとは、ベクトル形状を離散ピクセルとして描画しようとするときに発生するブロック状の問題であるエイリアシングの問題を防ごうとすることを意味します。

[基礎に関する記事](webgpu-fundamentals.html)で、WebGPUがどのようにものを描画するかを示しました。頂点シェーダーで`@builtin(position)`値として返すクリップ空間の頂点を取り、3つごとに三角形を計算し、その三角形の内側にある各ピクセルの中心に対してフラグメントシェーダーを呼び出して、ピクセルを何色にするかを尋ねます。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels"></div>
    <div>頂点をドラッグ</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-result"></div>
    <div>結果</div>
  </div>
</div>

上の三角形は非常にブロック状です。解像度を上げることはできますが、表示できる最高の解像度はディスプレイの解像度であり、ブロック状に見えないようにするには十分ではない場合があります。

1つの解決策は、より高い解像度でレンダリングすることです。たとえば、解像度を4倍（幅と高さの両方で2倍）に上げてから、結果をキャンバスに「バイリニアフィルタリング」するとします。[テクスチャに関する記事](webgpu-textures.html)で「バイリニアフィルタリング」について説明しました。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x"></div>
    <div>4倍の解像度</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-result"></div>
    <div>バイリニアフィルタリングされた結果</div>
  </div>
</div>

この解決策は機能しますが、無駄が多いです。左の画像の2x2ピクセルごとに、右の画像の1ピクセルに変換されますが、多くの場合、それらの4つのピクセルはすべて三角形の内側にあるため、アンチエイリアシングは必要ありません。4つのピクセルはすべて赤です。

<div class="webgpu_center side-by-side flex-gap">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-waste"></div>
    <div>4つの<span style="color: cyan;">シアン</span>ピクセルのうち3つは無駄になります</div>
  </div>
</div>

1ピクセルの代わりに4つの赤いピクセルを描画するのは時間の無駄です。GPUはフラグメントシェーダーを4回呼び出しました。フラグメントシェーダーはかなり大きく、多くの作業を行う可能性があるため、できるだけ少ない回数で呼び出したいです。三角形が3ピクセルを横切る場合でも、次のようになります。

<div class="webgpu_center">
  <img src="resources/antialias-4x.svg" width="600">
</div>

上記では、4倍のレンダリングで、三角形が3ピクセルの中心をカバーしているため、フラグメントシェーダーは3回呼び出されます。その後、結果をバイリニアフィルタリングします。

ここで、マルチサンプリングがより効率的になります。特別な「マルチサンプルテクスチャ」を作成します。マルチサンプルテクスチャに三角形を描画すると、4つの*サンプル*のいずれかが三角形の内側にある場合、GPUはフラグメントシェーダーを1回呼び出し、三角形の内側にある*サンプル*にのみ結果を書き込みます。

<div class="webgpu_center">
  <img src="resources/antialias-multisample-4.svg" width="600">
</div>

上記では、マルチサンプリングレンダリングで、三角形が3つの*サンプル*をカバーしているため、フラグメントシェーダーは1回しか呼び出されません。次に、結果を*解決*します。三角形が4つのサンプルポイントすべてをカバーしている場合も、プロセスは同様です。フラグメントシェーダーは1回しか呼び出されませんが、その結果は4つのサンプルすべてに書き込まれます。

4倍のレンダリングではCPUが4ピクセルの中心が三角形の内側にあるかどうかをチェックしたのに対し、マルチサンプリングレンダリングではGPUがグリッドにない「サンプル位置」をチェックすることに注意してください。同様に、サンプル値自体はグリッドを表さないため、それらを「解決」するプロセスはバイリニアフィルタリングではなく、GPU次第です。これらの中心から外れたサンプル位置は、ほとんどの状況でより良いアンチエイリアシングをもたらすようです。

## <a id="a-multisampling"></a>マルチサンプリングの使用方法

では、マルチサンプリングをどのように使用するのでしょうか？3つの基本的な手順で行います。

1. パイプラインをマルチサンプルテクスチャにレンダリングするように設定します。
2. 最終的なテクスチャと同じサイズのマルチサンプルテクスチャを作成します。
3. レンダーパスをマルチサンプルテクスチャにレンダリングし、最終的なテクスチャ（キャンバス）に*解決*するように設定します。

簡単にするために、[基礎に関する記事](webgpu-fundamentals.html#a-resizing)の最後にあるレスポンシブな三角形の例を取り上げ、マルチサンプリングを追加しましょう。

### パイプラインをマルチサンプルテクスチャにレンダリングするように設定する

```js
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    multisample: {
+      count: 4,
+    },
  });
```

上記の`multisample`設定を追加すると、このパイプラインはマルチサンプルテクスチャにレンダリングできるようになります。

### 最終的なテクスチャと同じサイズのマルチサンプルテクスチャを作成する

最終的なテクスチャはキャンバスのテクスチャです。ユーザーがウィンドウのサイズを変更するなど、キャンバスのサイズが変更される可能性があるため、レンダリング時にこのテクスチャを作成します。

```js
+  let multisampleTexture;

  function render() {
+    // キャンバスコンテキストから現在のテクスチャを取得します
+    const canvasTexture = context.getCurrentTexture();
+
+    // マルチサンプルテクスチャが存在しないか、
+    // サイズが間違っている場合は、新しいものを作成します。
+    if (!multisampleTexture ||
+        multisampleTexture.width !== canvasTexture.width ||
+        multisampleTexture.height !== canvasTexture.height) {
+
+      // 既存のマルチサンプルテクスチャがある場合は破棄します。
+      if (multisampleTexture) {
+        multisampleTexture.destroy();
+      }
+
+      // キャンバスのサイズに一致する新しいマルチサンプルテクスチャを作成します
+      multisampleTexture = device.createTexture({
+        format: canvasTexture.format,
+        usage: GPUTextureUsage.RENDER_ATTACHMENT,
+        size: [canvasTexture.width, canvasTexture.height],
*        sampleCount: 4,
+      });
+    }

  ...
```

上記のコードは、（a）マルチサンプルテクスチャがない場合、または（b）持っているものがキャンバスのサイズと一致しない場合にマルチサンプルテクスチャを作成します。キャンバスと同じサイズのテクスチャを作成しますが、`sampleCount: 4`を追加してマルチサンプルテクスチャにします。

### レンダーパスをマルチサンプルテクスチャにレンダリングし、最終的なテクスチャ（キャンバス）に*解決*するように設定する

```js
-    // キャンバスコンテキストから現在のテクスチャを取得し、
-    // レンダリングするテクスチャとして設定します。
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();

+    // マルチサンプルテクスチャをレンダリングするテクスチャとして設定します
+    renderPassDescriptor.colorAttachments[0].view =
+        multisampleTexture;
+    // キャンバステクスチャを、マルチサンプルテクスチャを「解決」する
+    // テクスチャとして設定します。
+    renderPassDescriptor.colorAttachments[0].resolveTarget =
+        canvasTexture;
```

*解決*とは、マルチサンプルテクスチャを取得し、本当に欲しかったテクスチャのサイズに変換するプロセスです。この場合、キャンバスです。上記では、4倍のバージョンで、4倍のテクスチャを1倍のテクスチャにバイリニアフィルタリングすることで、この手順を手動で行いました。これは同様のプロセスですが、実際にはマルチサンプルテクスチャを使用したバイリニアフィルタリングではありません。[下記参照](#a-not-a-grid)

そして、これが

{{{example url="../webgpu-multisample-simple.html"}}}

見るべきものはあまりありませんが、低解像度で並べて比較すると、左側のマルチサンプリングなしのオリジナルと右側のマルチサンプリングありのものでは、右側のものがアンチエイリアシングされていることがわかります。

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="simple-triangle"></div>
    <div>オリジナル</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="simple-triangle-multisample"></div>
    <div>マルチサンプリングあり</div>
  </div>
</div>

注意すべき点：

## `count`は`4`でなければなりません

WebGPUバージョン1では、レンダーパイプラインの`multisample: { count }`を4または1にしか設定できません。同様に、テクスチャの`sampleCount`を4または1にしか設定できません。1はデフォルトであり、テクスチャがマルチサンプリングされていないことを意味します。

## <a id="a-not-a-grid"></a>マルチサンプリングはグリッドを使用しません

上記で指摘したように、マルチサンプリングはグリッド上では行われません。sampleCount = 4の場合、サンプル位置は次のようになります。

<div class="webgpu_center">
  <img src="resources/multisample-4x.svg" width="256">
  <div class="center">count: 4</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-2x.svg" width="256">
  <div class="center">count: 2</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-8x.svg" width="256">
  <div class="center">count: 8</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-16x.svg" width="256">
  <div class="center">count: 16</div>
</div>

**WebGPUは現在、4のカウントのみをサポートしています**

## すべてのレンダーパスで解決ターゲットを設定する必要はありません

`colorAttachment[0].resolveTarget`を設定すると、WebGPUに「このレンダーパスのすべての描画が終了したら、マルチサンプルテクスチャを`resolveTarget`に設定されたテクスチャにダウンスケールする」と指示します。複数のレンダーパスがある場合は、おそらく最後のパスまで解決したくないでしょう。最後のパスで解決するのが最も高速ですが、解決するためだけに空の最後のレンダーパスを作成することも完全に許容されます。最初のパス以外のすべてのパスで`loadOp`を`'clear'`ではなく`'load'`に設定するようにしてください。そうしないと、クリアされます。

## オプションで、各サンプルポイントでフラグメントシェーダーを実行できます。

上記では、フラグメントシェーダーはマルチサンプルテクスチャの4つのサンプルごとに1回しか実行されないと述べました。1回実行し、三角形の内側にあるサンプルに結果を格納します。これが、解像度を4倍にしてレンダリングするよりも高速な理由です。

[ステージ間変数に関する記事](webgpu-inter-stage-variables.html#a-interpolate)では、`@interpolate(...)`属性を使用してステージ間変数を補間する方法を説明しました。1つのオプションは`sample`で、この場合、フラグメントシェーダーはサンプルごとに1回実行されます。また、`@builtin(sample_index)`のような組み込みもあり、現在作業しているサンプルを教えてくれます。また、`@builtin(sample_mask)`は、入力として、三角形の内側にあるサンプルを教えてくれ、出力として、サンプルポイントが更新されるのを防ぐことができます。

## `center`と`centroid`

3つの*サンプリング*補間モードがあります。上記では、フラグメントシェーダーがサンプルごとに1回呼び出される`'sample'`モードについて説明しました。他の2つのモードは、デフォルトの`'center'`と`'centroid'`です。

* `'center'`は、ピクセルの中心を基準に値を補間します。

<div class="webgpu_center">
  <img src="resources/multisample-centroid-issue.svg" width="400">
</div>

上記では、サンプルポイント`s1`と`s3`が三角形の内側にある単一のピクセル/テクセルを見ることができます。フラグメントシェーダーは1回呼び出され、ピクセルの中心（`c`）を基準に補間された値を持つステージ間変数が渡されます。問題は、**`c`が三角形の外側にある**ことです。

これは問題にならないかもしれませんが、値が三角形の内側にあると仮定する数学がある可能性があります。良い例はわかりませんが、各点に重心座標を追加すると想像してください。重心座標は、基本的に0から1までの3つの座標であり、各値は三角形の頂点の1つから特定の位置までの距離を表します。これを行うには、次のように重心点を追加するだけです。

```wgsl
+struct VOut {
+  @builtin(position) position: vec4f,
+  @location(0) baryCoord: vec3f,
+};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
-) -> @builtin(position) vec4f {
+) -> VOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );
+  let bary = array(
+    vec3f(1, 0, 0),
+    vec3f(0, 1, 0),
+    vec3f(0, 0, 1),
+  );
-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+  var vout: VOut;
+  vout.position = vec4f(pos[vertexIndex], 0.0, 1.0);
+  vout.baryCoord = bary[vertexIndex];
+  return vout;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
+@fragment fn fs(vin: VOut) -> @location(0) vec4f {
+  let allAbove0 = all(vin.baryCoord >= vec3f(0));
+  let allBelow1 = all(vin.baryCoord <= vec3f(1));
+  let inside = allAbove0 && allBelow1;
+  let red = vec4f(1, 0, 0, 1);
+  let yellow = vec4f(1, 1, 0, 1);
+  return select(yellow, red, inside);
}
```

上記では、最初の点に`1, 0, 0`、2番目の点に`0, 1, 0`、3番目の点に`0, 0, 1`を関連付けています。それらの間を補間すると、どの値も0未満または1を超えることはありません。

フラグメントシェーダーでは、`all(vin.baryCoord >= vec3f(0))`でそれらの補間された値の3つすべて（x、y、z）が`>= 0`であるかどうかをテストします。また、`all(vin.baryCoord <= vec3f(1))`でそれらがすべて`<= 1`であるかどうかもテストします。最後に、2つを`&`で結合します。これにより、三角形の内側か外側かがわかります。最後に、内側の場合は赤、内側でない場合は黄色を選択します。頂点*間*を補間しているため、常に内側にあると予想されます。

試してみるために、結果が見やすくなるように、例を低解像度にしましょう。

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 16 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 16 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // 再レンダリング
      render();
    }
  });
  observer.observe(canvas);
```

そして、いくつかのCSSです。

```css
canvas {
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
  display: block;  /* canvasをブロックのように動作させる */
  width: 100%;     /* canvasがコンテナを埋めるようにする */
  height: 100%;
}
```

これを実行すると、次のようになります。

{{{example url="../webgpu-multisample-center-issue.html"}}}

一部のエッジピクセルに黄色が含まれていることがわかります。これは、上記で指摘したように、フラグメントシェーダーに渡される補間されたステージ間変数の値がピクセルの中心を基準にしているためです。その中心は、黄色が表示されている場合に三角形の外側にあります。

補間サンプルモードを`'centroid'`に切り替えると、この問題が解決されます。`'centroid'`モードでは、GPUはピクセル内の三角形の領域の重心を使用します。

<div class="webgpu_center">
  <img src="resources/multisample-centroid-fix.svg" width="400">
</div>


サンプルを取得して補間モードを`'centroid'`に変更すると、

```wgsl
struct VOut {
  @builtin(position) position: vec4f,
-  @location(0) baryCoord: vec3f,
+  @location(0) @interpolate(perspective, centroid) baryCoord: vec3f,
};
```

GPUは、重心を基準に補間されたステージ間変数を渡し、黄色のピクセルの問題は解決します。

{{{example url="../webgpu-multisample-centroid.html"}}}

> 注：GPUは、ピクセル内の三角形の領域の重心を実際に計算する場合としない場合があります。保証されているのは、ステージ間変数が、ピクセルと交差する三角形の部分の内側のいくつかの領域を基準に補間されることだけです。

## 三角形内のアンチエイリアシングはどうですか？

マルチサンプリングは、通常、三角形のエッジにのみ役立ちます。フラグメントシェーダーを1回しか呼び出していないため、すべてのサンプル位置が三角形の内側にある場合、フラグメントシェーダーの同じ結果がすべてのサンプルに書き込まれるだけです。つまり、結果はマルチサンプリングしていない場合と変わりません。

上記の例では、単色の赤を描画していたため、明らかに問題はありませんでした。テクスチャからサンプリングしている場合はどうでしょうか。三角形の内側にコントラストの強い色が隣接している可能性があります。各サンプルの色がテクスチャの異なる場所から取得されるようにしたいのではないでしょうか？

三角形の内側では、[ミップマップとフィルタリング](webgpu-textures.html)を使用して適切な色を選択するため、三角形の内側のアンチエイリアシングはそれほど重要ではない場合があります。一方、これは特定のレンダリング手法で問題になる可能性もあり、そのため、アンチエイリアシングには他の解決策があり、サンプルごとの処理を行いたい場合は`@interpolate(..., sample)`を使用できる理由でもあります。

## マルチサンプリングはアンチエイリアシングの唯一の解決策ではありません。

このページでは2つの解決策について説明しました。（1）より高い解像度のテクスチャに描画し、そのテクスチャをより低い解像度で描画する。（2）マルチサンプリングを使用する。ただし、他にもたくさんあります。[それらのいくつかについて説明している記事はこちらです](https://vr.arvilab.com/blog/anti-aliasing)。

その他のリソース：

* [MSAAの簡単な概要](https://therealmjp.github.io/posts/msaa-overview/)
* [マルチサンプリング入門](https://www.rastergrid.com/blog/gpu-tech/2021/10/multisampling-primer/)

<!-- この記事の最後にこれを保持してください -->
<link href="webgpu-multisampling.css" rel="stylesheet">
<script type="module" src="webgpu-multisampling.js"></script>
