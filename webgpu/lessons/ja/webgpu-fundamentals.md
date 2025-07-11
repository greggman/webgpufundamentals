記事Title: WebGPUの基本
Description: WebGPUの基本について学ぶ
TOC: 基本

この記事は、WebGPUのごくごく基本的なことについて説明します。

<div class="warn">
この記事は、JavaScriptについて知識を持っている読者を想定しています。
この記事で使用するのは、JavaScriptの、
<a href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map">mapping arrays</a>,
<a href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment">destructuring assignment</a>,
<a href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax">spreading values</a>,
<a href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/async_function">async/await</a>,
<a href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Modules">es6 modules</a>,
といった仕様です。説明する内容によってはこれ以外の知識が必要となる場合もあります。
JavaScript言語を基礎から新たに学習したい、という方には、
<a href="https://ja.javascript.info">JavaScript.info</a>、<a href="https://eloquentjavascript.net/">Eloquent JavaScript</a>、<a href="https://www.codecademy.com/learn/introduction-to-javascript">CodeCademy</a>といったサイトをおすすめしておきます。
</div>

<div class="warn">WebGLの知識を持っている読者は、「<a href="webgpu-from-webgl.html">WebGLからWebGPUへ</a>」の記事から読むのもよいでしょう。</div>

WebGPUは、２つのことをやるためのAPIです。

1. [三角形/点/直線を、テクスチャに描く](#a-drawing-triangles-to-textures)

2. [GPU上で、計算を実行する](#a-run-computations-on-the-gpu)

以上が、WebGPU APIでできること、です。

それ以外のことは、「WebGPU APIがやること」ではありません。あなたがやることです。
「WebGPUを学ぶ」というのは、「フレームワークの使い方を学ぶ」ようなことではなく、むしろJavaScriptやRust、C++のような「コンピュータ言語を学ぶ」ことに似ています。
基本を学んだその先の、基本を使って何を作るかは、全てあなたの創造力にゆだねられます。

WebGPUは極端に「低レベルなAPI」です。小さなサンプルプログラムを作る場合であっても、とてもたくさんのコードや、シビアなデータ構造の実装が必要となります。
たとえば、[three.js](https://threejs.org)はWebGPUをサポートしていますが、そのサイズは600Kbytesにもなります。MinifyしたJavaSciprtコードの状態、もっと言えば、ローダや入力コントロール、ポストプロセスなどの機能を除いた、コア部分だけで、です。
[TensorFlow.jsのWebGPUバックエンド](https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu)でも同様です。こちらはMinifyした状態で500k程度となっています。

「画面に何か表示したい」といった観点で言えば、WebGPUを直接使うのではなく、ライブラリを使う方が、遥かに、良いです。

別の観点で、たとえば、「特定のユースケース向けのプログラムを作りたい」、「既存のライブラリに不満があって、改造したい」、「どういう仕組みか知りたい！全部知りたい！」、という場合は、WebGPUを直接扱うのが適している、と言えるでしょう。この記事はそんなあなたのためのものです。読み進めてください！


# 初めの一歩

「WebGPUの学習をどこから始めるか」は、案外難しい問題です。
WebGPUはある意味では、非常に単純な仕組みである、と言えます。
WebGPUは、「GPU上で３種類の関数を実行する」ことしかしません。「頂点シェーダ、フラグメントシェーダ、コンピュートシェーダ」の３種類です。

頂点シェーダ(Vertex Shader)は、頂点の計算をします。この関数は、頂点の位置を返します。得られた頂点の位置を３つ分使って、三角形が描画されます[^primitives]。

[^primitives]: 記事中「三角形が描画される」というのは、以下の５つの描画モードの１例である。

    * `'point-list'`: 各位置に、点が描画される
    * `'line-list'`: ２点を結ぶ線が描画される
    * `'line-strip'`: 複数の点を次々に繋ぐ線として描画される。
    * `'triangle-list'`: ３点で囲まれた三角形が描画される(**default**)
    * `'triangle-strip'`: 新しい点と、その前２つの点で囲まれた三角形が、次々に描画される

フラグメントシェーダ(Fragment Shader)は、色[^fragment-output]を計算します。GPUは、描画されるピクセル１個について１回、フラグメントシェーダを実行します。各フラグメントシェーダは、その１個のピクセルの色を返します。

[^fragment-output]: フラグメントシェーダは、テクスチャに対してデータを書きだす（間接的ではあるが）。このデータは、必ずしも色の情報である必要はない。たとえば、「そのピクセルで描かれる面が向いている方向（法線）」のような情報の計算に、フラグメントシェーダはよく利用される。

コンピュートシェーダ(Compute Shader)は、もっと一般的な用途で利用されます。コンピュートシェーダは実質上、単なる関数であると考えてよいです。「これを何回実行します」という宣言を付けて実行されます。GPUはコンピュートシェーダを何度も呼び出すに際して、「何回目の呼び出しであるか」の情報をコンピュートシェーダに渡すので、その値を使って各呼び出しで挙動が変化するような書き方をする事ができます。

注意深い人は、これがJavaScriptの
[`array.forEach`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
や、
[`array.map`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
といった仕組みに似ていることに気付くかもしれません。

GPU上で実行される関数は、あくまで関数にすぎません。JavaScriptの関数と同じように考えてもよいです。

違うのは、「GPU上で実行される」という部分です。このため、その関数から利用するデータは、あらかじめGPU上に、バッファやテクスチャの形にして置いておく必要があります。また、その関数が出力するデータも同様です。データは、あらかじめGPU上に確保したバッファやテクスチャに対して、書き出されます。

関数が使う「入出力データのありか」は、「バインディング」や「ロケーション」という形で、関数のコード中に記述します。
JavaScript側では、「バッファ」や「テクスチャ」といった「実際のデータ」と、「バインディング」や「ロケーション」といった「ありかの情報」を関連付けします。
これらの設定が終わったら、GPUに対して関数を実行する命令を発行します。

<a id="a-draw-diagram"></a>この話は、図にしてみると分かりやすいかも知れません。以下の図は、頂点シェーダとフラグメントシェーダを使って三角形を描くWebGPUアプリケーション、の実行に必要な設定を、*単純化して表現した*ものです。

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram.svg" style="width: 960px;"></div>

この図からは、次のようなことが読み取れます。

* **Pipeline**(パイプライン)：パイプラインは、頂点シェーダとフラグメントシェーダを持ちます。コンピュートシェーダを使う場合も、ここに設定します。

* 各シェーダが参照するリソース(buffers, textures, samplers)は、**Bind Groups**(バインドグループ)を介して、間接的に指定されます。 

* パイプラインは、バッファを参照するアトリビュートを関連付けします。この関連付けは間接的なもので、実際には内部ステータスによって確定します。

* アトリビュートは、バッファからデータを引き出して、データは頂点シェーダで利用されます。

* 頂点シェーダは、フラグメントシェーダに対してデータを与える事ができます。

* フラグメントシェーダは、テクスチャに対して結果を書き出します。この書き出しは、render pass descriptionを通じて、間接的に行われます。

GPU上でシェーダを動かすためには、以上のような各種リソースを生成し、それぞれのステートを適切に設定する必要があります。「生成」は簡単な話です。注意すべき点があるとすれば、WebGPUでは一度生成したリソースは、ほとんどの場合、更新できない、というところでしょうか。リソースの中身を変更することはできますが、サイズ、用途、フォーマットといった項目については、変更ができません。これらの項目を変更したい場合は、リソースを新たに生成して、古い物を破棄(destroy)します。

コマンドバッファを生成します。いくつかのステートは、コマンドバッファ生成時に設定され、コマンドバッファが実行されます。コマンドバッファは、名前通り、コマンドのバッファです。

エンコーダを生成します。エンコーダは、コマンドを、コマンドバッファへエンコードします。以上を実行したら、エンコーダを*finish*します。これによって、生成されたコマンドバッファが得られます。

コマンドバッファを*submit*します。これによって、WebGPUがコマンドを実行できます。

以下は疑似コードです。コマンドバッファをエンコードしてコマンドバッファが生成される様子を示しています。

<div class="webgpu_center side-by-side"><div style="min-width: 300px; max-width: 400px; flex: 1 1;"><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
encoder = device.createCommandEncoder()
// 何かを描画する
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
// 何か別なものを描画する
{
  pass = encoder.beginRenderPass(...)
  pass.setPipeline(...)
  pass.setVertexBuffer(0, …)
  pass.setBindGroup(0, …)
  pass.draw(...)
  pass.end()
}
// 何やら計算する
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

コマンドバッファの生成が済んだら、*submit*(送信)して実行できます。

```js
device.queue.submit([commandBuffer]);
```

上の例のコマンドバッファでは、いくつかの`draw`コマンドが登場しています。
各コマンドが実行されると*internal state*(内部ステート)が設定されていきます。
*draw*コマンドは、GPUに頂点シェーダを実行させます(間接的にフラグメントシェーダも実行されます)。`dispatchWorkgroup`コマンドは、GPUにコンピュートシェーダを実行させます。

このように、WebGPUでは「GPUにステートを設定、それを元にイメージを描く」という手順を踏みます。
ここまでの説明で、GPUでの描画に必要となるステートのイメージは、心に描けたでしょうか。

最初の方でも書きましたが、WebGPUは２つの基本的なことをやるAPIです。

1. [三角形/点/直線を、テクスチャに描く](#a-drawing-triangles-to-textures)

2. [GPU上で、計算を実行する](#a-run-computations-on-the-gpu)

ここからは、この２つのことを実際にやる、小さなサンプルプログラムを作っていきます。別の記事では、プログラムにデータを与える様々な方法を紹介していくことになりますが、データを与える相手は結局のところ「この２つ」です。

改めて注意しますが、これからやるのは、ごくごく基本的なことです。
ここから上へ上へと積み上げていくために必要な、だいじな基礎部分です。
基礎部分が積み上がったら、GPUを使う典型的なアプリケーション、2Dグラフィクスや3Dグラフィクスのようなプログラムでその基礎がどう活用されるのか、紹介していきます。

# <a id="a-drawing-triangles-to-textures"></a>三角形を、テクスチャに描く

WebGPUは、[テクスチャ](webgpu-textures.html)に三角形を描くことができます。
この記事では、テクスチャは「二次元の長方形に並んだピクセル[^textures]」としておきます。
HTMLの`<canvas>`要素ははWebページ中にテクスチャを提供するためのものです。WebGPUでは、canvasにテクスチャを要求して、そのテクスチャにレンダリングすることができます。

[^textures]: テクスチャは「二次元の長方形に並んだピクセル」以外に、「三次元の直方体に並んだピクセル」、「キューブマップ(立方体の６面に並んだピクセル)」のほか、いくつかの形がある。ともあれ、一番一般的なテクスチャは「二次元の長方形に並んだピクセル」である。

WebGPUで三角形を描くためには、２つの「シェーダ」を用意する必要があります。
既に説明したように、シェーダはGPU上で実行される関数です。シェーダは以下の二種類です。

1. 頂点シェーダ(Vertex Shader)

   頂点シェーダは、頂点の位置を計算する関数です。得られた頂点の位置は、三角形、線、点を描画するために使用されます。

2. フラグメントシェーダ(Fragment Shader)

   フラグメントシェーダは、色を計算する関数です。得られた色は、三角形、線、点を構成するピクセルの色として使用されます。色以外のデータを得るためにも使用されます。

ではWebGPUで三角形を描く、小さなプログラムを作っていきましょう。

まず、三角形が表示される、HTMLのcanvas要素が必要です。

```html
<canvas></canvas>
```

JavaScriptを書くための`<script>`要素も必要です。

```html
<canvas></canvas>
+<script type="module">

... javascriptのコードはここに書く ...

+</script>
```

以降のJavaScriptコードはすべて、上で書いたscriptタグの内側に書きます。

WebGPUは非同期APIです。非同期APIは、async functionを使って記述するのが簡単です。
まずアダプタを要求して、得られたアダプタからデバイスを取得します。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('WebGPU対応ブラウザが必要です');
    return;
  }
}
main();
```

上のコードは、見た通りで説明は不要かも知れません。
まず、[`?.` オプショナルチェーン演算子](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Optional_chaining)を使ってアダプタをリクエストしています。
このため、`navigator.gpu`が存在しない場合、`adapter`はundefinedになります。
`navigator.gpu`が存在する場合は、`requestAdapter`を呼びます。`requestAdapter`の結果は非同期に返されるので、`await`で待つ必要があります。アダプタは、特定の１つのGPUを表すものです。デバイスによっては、複数のGPUを持っている場合もあります。

得られたアダプタから、デバイスを取得します。ここでも`?.`を使います。従って、アダプタがundefinedである場合は、デバイスもundefinedとなります。
この時点で`device`が設定されていない場合は、古いブラウザを使っている、ということです。

次はcanvasを参照して`webgpu`コンテキストを生成します。このコンテキストからは、シェーダの描画対象となるテクスチャが得られます。ブラウザはこのテクスチャを使って、Webページ上のcanvasに描画結果を表示します。

```js
  // canvasからWebGPUコンテキストを取得して、configureする
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```
このコードも、見た通りで説明は不要かも知れません。
まず、canvasから`"webgpu"`コンテキストを取得しています。
推奨のcanvasフォーマット(preferred canvas format)をシステムに問い合わせして、取得しています。
これは`"rgba8unorm"`、`"bgra8unorm"`のいずれかです。これが何かはひとまず置くとして、
この問い合わせをすることで、そのシステムにおいて最速な処理方法が選択できます。
WebGPUコンテキストに対して、`configure`を使ってこの`format`を渡しています。
同時に`device`を渡しています。これでさっき取得したデバイスとWebGPUコンテキストが関連付けられます。

次は、シェーダモジュールを生成します。
シェーダモジュールは、１つ以上のシェーダを持つコンテナです。
今回は、頂点シェーダを１つ、フラグメントシェーダを１つ、都合２つのシェーダをシェーダモジュールに持たせることにします。

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
シェーダは[WGSL (WebGPU Shading Language)](https://gpuweb.github.io/gpuweb/wgsl/)と呼ばれる言語で記述されます。WGSLは、しばしば「ウィグシル」と発音されているようです。
WGSLは「強い型付け言語」の一種です。詳細については別途「[WGSLについて](webgpu-wgsl.html)」で説明することとして、ここでは、大ざっぱに見通せる程度のそれなりな説明に留めたいと思います。

上のソースコードでは、`vs`と名付けた関数を、`@vertex`属性を付けて宣言しています。
`@vertex`属性は、この関数が頂点シェーダであることを示します。

```wgsl
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
         ...
```

この関数`vs`では、`vertexIndex`と名付けた引数を１つ、受け付けています。
`vertexIndex`は`u32`、つまり*32ビット符号なし整数*型の変数です。
`vertexIndex`の値は、ビルトインである`vertex_index`から取得されます。
`vertex_index`ビルトインは、繰り返しのループカウンタ(iteration number)のようなものです。
JavaScriptで言えば`Array.map(function(value, index) { ... })`の`index`に相当します。
GPUにdrawコマンドを渡す際に「10回繰り返す」ように指定した場合、
シェーダ実行１回目では、`vertex_index`の値は`0`、
シェーダ実行２回目では、`vertex_index`の値は`1`
……などとなります[^indices]。

[^indices]: `vertex_index`の値について、記事中の例では0から増分1でカウントしているが、そうではなく、index bufferを使って任意の数列でカウントするやり方もある。詳しくは「[頂点バッファについて](webgpu-vertex-buffers.html#a-index-buffers)」で説明する。

関数`vs`は、`vec4f`型の値を返り値として持つように宣言されています。
`vec4f`型は、32ビット浮動小数点数の値を4つ持つベクトルです。これは、「４つの値を持つ配列」とか、{x: 0, y: 0, z: 0, w: 0}のような「４つのプロパティを持つオブジェクト」のようなものです。
この返り値は、`position`ビルトインに代入されます。
今回使用する"triangle-list"モードの場合、頂点シェーダが３回呼ばれて３回分の`position`
が得られるたびに、三角形が描画されます。

WebGPUでは、`position`は*clip space*(クリップ空間)の座標として扱われます。クリップ空間は、
Xの左端が-1.0、右端が+1.0、Yの下端が-1.0、上端が+1.0です。
これは描画対象のテクスチャのサイズと無関係で、常に-1.0から1.0の範囲です。

<div class="webgpu_center"><img src="resources/clipspace.svg" style="width: 500px"></div>

関数`vs`の中では、「`vec2f`型の値３つを持つ配列(array)」が宣言されています。
`vec2f`は、32ビット浮動小数点数の値２つを持ちます。

```wgsl
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
```

関数`vs`の最後の部分では、`vertexIndex`を使って、配列中の３つの値を、呼び出し元に返しています。
関数`vs`の返り値の型は`vec4f`としたので、返すべき情報は浮動小数点数４つ、です。
一方で、先ほど宣言した`pos`は`vec2f`の配列、その配列要素である`pos[vertexIndex]`は`vec2f`、
つまり浮動小数点数２つ、です。このため、コードでは`0.0`と`1.0`を付け足して、浮動小数点数４つ、
として数を合わせています。

```wgsl
        return vec4f(pos[vertexIndex], 0.0, 1.0);
```

シェーダモジュールでは、関数`vs`のほかに、`fs`と名付けた関数の宣言も行なっています。
関数`fs`は、`@fragment`属性が付けられて宣言されているため、フラグメントシェーダとして扱われます。

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
```

関数`fs`は、引数なし、返り値は`vec4f`型で`location(0)`に返されます。
`location(0)`というのは、「一つめのレンダーターゲット」という意味で、結果はそこに書き込まれます。
今回は「一つめのレンダーターゲット」を、「用意しておいたcanvasのテクスチャ」としたいのですが、その設定の仕方については後ほど説明します。

```wgsl
        return vec4f(1, 0, 0, 1);
```

このコードでは`1, 0, 0, 1`を返しています。これは「赤」です。
WebGPUでの色指定は、一般には`0.0`から`1.0`の範囲値を４つ使います。
４つの値はそれぞれ「赤、緑、青、アルファ(透明度)」に対応します。

フラグメントシェーダは、GPUが三角形をラスタライズ(ピクセルの集まりとして描画)する際に呼ばれます。
１つのピクセルに対してフラグメントシェーダが１回呼ばれて、そのピクセルの色が決まります。
今回の例では、三角形を構成する全てのピクセルで「赤」が返されます。

WebGPUのコードを書く上で、私が重要と考えることについて触れておきます。
「`label`(ラベル)」についてです。
WebGPUで生成するオブジェクトは、ほぼすべてについて`label`を付けることができます。
ラベルを付けることはまったく必須ではない、のですが、
生成するもの全てにラベルを付けることは*best practice*(ベストプラクティス。よい習慣)であると言えます。
エラーが発生した場合、WebGPU実装はエラーメッセージを出力します。
この時、エラーメッセージにはエラー箇所に関連したラベルが記述されます。

標準的なWebGPUアプリケーションでは、バッファ、テクスチャ、シェーダモジュール、パイプラインといったオブジェクトが100個、1000個と登場します。
もし、プログラミングをしていて発生したエラーメッセージが
`"WGSL syntax error in shaderModule at line 10"`
といったものだったらどうでしょう？
シェーダモジュールが100個あったら、どのシェーダモジュールか特定できるでしょうか？
一方で、これが、
`"WGSL syntax error in shaderModule('our hardcoded red triangle shaders') at line 10`
といったものだったらどうでしょう？
問題判別に費やす膨大な時間が、節約できるのではないでしょうか？

さて。ここまででシェーダモジュールが生成できました。
次にすべきことは、レンダーパイプラインを作ることです。

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

この部分については、今回のサンプルプログラムでは見るべきところはないかも知れません。
`layout`を`'auto'`に設定しています。これはデータのレイアウトを、シェーダのコードの内容からWebGPUが自動で設定する、という意味です。ただ、今回はレイアウトすべきデータ自体がありません。

次の部分では、シェーダモジュールに記述された関数`vs`を頂点シェーダとして使う、関数`fs`をフラグメントシェーダとして使う、ということをレンダーパイプラインに教えています。
同時に、１つめのレンダーターゲットにフォーマットを指定しています。
「レンダーターゲット」というのは、書き込み先とするテクスチャのことです。
パイプラインを生成し、このパイプラインの書き出し先となるテクスチャのフォーマットを指定する必要があります。

配列`targets`の最初の(0番目の)要素は、先にフラグメントシェーダの返り値の設定で記述した「location(0)」に当たるものです。canvasとの関連付けはもう少し後で行ないます。

次は`GPURenderPassDescriptor`を設定します。
これは、描画先とするテクスチャの指定と、そのテクスチャをどう扱うかの設定です。

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- viewプロパティの設定はレンダリングするタイミングで行なう。
		clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  
```

`GPURenderPassDescriptor`のプロパティ`colorAttachments`は配列です。
この配列は、「描画対象となるテクスチャ」です。
また、「各テクスチャをどう扱うか」という情報も記述されます。
このタイミングでは「描画対象となるテクスチャ」の指定は保留して、「各テクスチャをどう扱うか」の設定を行っています。
`clearValue`は、背景色、つまり全体を一色で塗りつぶす際の指定色です。暗めの灰色`[0.3, 0.3, 0.3, 1]`を指定しています。
`loadOp: 'clear'`は、「描画開始前にテクスチャ全体を背景色でクリアする」という設定です。`loadOp: 'load'`とした場合は、「その時点のテクスチャの内容をGPUにロードして、そこに上書きで描画していく」という意味になります。
`storeOp: 'store'`は、描画内容をテクスチャに保存する、という意味です。`storeOp: 'discard'`とすると、描画内容を破棄します。`'discard'`がどういう場面で役に立つのか、については別の記事、「[マルチサンプリング](webgpu-multisampling.html)」で説明します.

さて。レンダリングする(描画する)時が来ました。

```js
  function render() {
    // canvasのコンテキストから、カレントテクスチャを得る。
	// それをレンダーパスに設定して、描画対象として指定する。
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    // コマンドエンコーダを生成する。コマンドのエンコードができる状態にする。
	const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // レンダーパスのエンコーダを生成する。そこへコマンドを並べて、描画手順をエンコードする。
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);  // 頂点シェーダを３回呼び出す
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  render();
```
最初に`context.getCurrentTexture()`を呼んで、canvasが持っているテクスチャを取得しています。`createView`では、テクスチャの一部の範囲だけを切り出す指定ができますが、ここでは引数なし＝デフォルトの範囲、としています。
今回は、配列`colorAttachments`の要素はひとつだけとしていました。この`colorAttachments[0]`に、先ほど取得したcanvasのテクスチャ(texture view)を設定します。
先だって述べたように、この`colorAttachments[0]`は、フラグメントシェーダの返り値の設定で記述した`location(0)`に対応するものです。

次の部分では、コマンドエンコーダを用意しています。コマンドエンコーダは、コマンドバッファを生成するために使われます。コマンドエンコーダを使って、各種コマンドをコマンドバッファに並べて行きます。"submit"でコマンドバッファを送信すると、コマンドが実行されます。

次は、コマンドエンコーダの`beginRenderPass`を使って、レンダーパスエンコーダを生成しています。レンダーパスエンコーダは、レンダリング関連のコマンドを生成することに特化したエンコーダです。
レンダーパスエンコーダに`renderPassDescriptor`を渡すことで、描画対象とするテクスチャを指定しています。

`setPipeline`コマンドでパイプラインをセット、次の`draw(3)`コマンドで、頂点シェーダを３回実行します。デフォルトでは、頂点シェーダが３回実行されるたびに、３つの頂点シェーダが返した３つの点を結ぶ三角形が描画されます。

レンダーパスを終了し、エンコーダをfinishしています。finishを実行することで、先ほどコマンドを並べて定義した手順が入ったコマンドバッファが得られます。最後に、このコマンドバッファをsubmit(送信)し、レンダリングを実行しています。

`draw`が実行される段階での各種ステートは以下のようになっています。

<div class="webgpu_center"><img src="resources/webgpu-simple-triangle-diagram.svg" style="width: 723px;"></div>

今回の例では、入力としては、テクスチャ、バッファ、バインドグループは一切ありません。使っているのは、パイプライン、頂点シェーダ、フラグメントシェーダ、出力先のcanvasテクスチャを指定しているレンダーパスディスクリプタ、です。

ここまで書いてきたコードの実行結果は以下のようになります。

{{{example url="../webgpu-simple-triangle.html"}}}

今回使った`setPipeline`や`draw`といったAPIは「コマンドバッファにコマンドを追記するだけのもの」である、という点は、重要です。これらのAPIを実行した時点では、コマンドの実行は起きません。コマンドの実行は、デバイスキューにコマンドバッファをsubmit(送信)して初めて行なわれます。

<a id="a-rasterization"></a>WebGPUは、頂点シェーダを３回呼び出して得た頂点を３つを集めて、三角形をラスタライズします。
WebGPUはこの際、「各ピクセルの中心点が三角形の内側にあるかどうか」を見ることで、どのピクセルを描画するか判断しています。
描画することになったピクセルには、フラグメントシェーダを呼んで得られた色が塗られることになります。

例えば、15x11ピクセルのテクスチャに三角形を描画する場合、ラスタライズは以下図のような仕組みで行われます。

<div class="webgpu_center">
  <div data-diagram="clip-space-to-texels" style="display: inline-block; max-width: 500px; width: 100%"></div>
  <div>頂点をドラッグで動かしてみよう</div>
</div>

ここまで、WebGPUのごく小さなサンプルプログラムを作ってきました。お気づきと思いますが、シェーダコード中に三角形がハードコードされた今回のコードは、柔軟性が全くありません。一般にはシェーダの外からデータを与えることになるわけですが、それについては今後の記事で紹介することとします。

今回のサンプルプログラムで示したかったことをまとめます。

* WebGPUはシェーダを実行するのが仕事。それ以外は、全てあなたの仕事
* シェーダはシェーダモジュールで指定する。シェーダモジュールはパイプラインの中に置く
* WebGPUは三角形を描くことができる
* WebGPUはテクスチャを描画できる(今回はテクスチャをcanvasから取得した)
* WebGPUは、エンコードしたコマンドをsubmitすると動く

# <a id="a-run-computations-on-the-gpu"></a>GPU上で、計算を実行する

GPU上で計算を実行する、簡単なサンプルプログラムを作っていきます。

WebGPUデバイスの取得の手順は先ほどと同じです。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
```

違ってくるのはシェーダモジュールの部分からです。

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

最初の部分で、`storage`タイプの変数`data`を宣言しています。読み出し可能、書き込み可能としています。

```wgsl
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
```

変数の型は`array<f32>`としています。これは、32ビット浮動小数点数の配列です。
また、この変数を`binding(0)`、`@group(0)`と関連付けています。それぞれ、バインドロケーションの0番、バインドグループの0番です。

次に、関数`computeSomething`を宣言しています。宣言では`@compute`属性を付けることで、この関数をコンピュートシェーダとしています。

```wgsl
      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        ...
```

コンピュートシェーダでは、「ワークグループサイズ」を宣言する必要があります。「ワークグループサイズ」については後述します。ここではとりあえず属性として`@workgroup_size(1)`を設定、つまりワークグループサイズを1としています。

関数`computeSomething`の宣言では、`vec3u`型の引数`id`を設定しています。
`vec3u`は、符号なし32ビット整数値を３持つベクトルです。
この`id`は、頂点シェーダの宣言の引数と同様、繰り返し番号です。違っているのは、このコンピュートシェーダの引数は`vec3u`なので三次元である(つまり、値を３つ持つ)、ということです。`id`の値は、`global_invocation_id`ビルトインから取得するように宣言しています。

コンピュートシェーダの引数の扱いについては、かなり大雑把ですが、以下*のような感じ*の仕組みだと考えてみると良いと思います。

```js
// 疑似コード！
function dispatchWorkgroups(width, height, depth) {
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const workgroup_id = {x, y, z};
        dispatchWorkgroup(workgroup_id)
      }
    }
  }
}

function dispatchWorkgroup(workgroup_id) {
  // from @workgroup_size in WGSL
  const workgroup_size = shaderCode.workgroup_size;
  const {x: width, y: height, z: depth} = workgroup_size;
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const local_invocation_id = {x, y, z};
        const global_invocation_id =
            workgroup_id * workgroup_size + local_invocation_id;
        computeShader(global_invocation_id)
      }
    }
  }
}
```

今回は`@workgroup_size(1)`としたので、実質的には以下のように考えても同じです。

```js
// 疑似コード！
function dispatchWorkgroups(width, height, depth) {
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const workgroup_id = {x, y, z};
        dispatchWorkgroup(workgroup_id)
      }
    }
  }
}

function dispatchWorkgroup(workgroup_id) {
  const global_invocation_id = workgroup_id;
  computeShader(global_invocation_id)
}
```

最後に、`id`のプロパティ`x`を配列`data`の添え字として、その値(つまりdata[id.x])を２倍しています。

```wgsl
        let i = id.x;
        data[i] = data[i] * 2.0;
```

この例では`i`は、繰り返し番号の３つの値の最初の１つだけ使っています。

以上で、パイプラインに必要となるシェーダが作成できました。

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

このパイプラインでは、`compute`ステージについて先ほど作ったシェーダモジュール`module`を使う、起動時には`computeSomething`関数を呼ぶ、といったことを言っています。
`layout`は今回も`'auto'`としておきます。データのレイアウトをシェーダのコードからWebGPUが自動で判別して設定します。[^layout-auto]

[^layout-auto]: `layout: 'auto'`は強力で便利な仕組みだが、複数のパイプラインでバインドグループを共有することができない。このサイトでは、複数のパイプラインでバインドグループを共有するサンプルはほとんど扱っていない。autoではない、明示的なレイアウトについては、別途「[複数のものを描画する](webgpu-bind-group-layouts.html)」で説明する。

次は、データを用意します。

```js
  const input = new Float32Array([1, 3, 5]);
```
今回は、データはJavaScript側にのみ記述しています。
WebGPUでこのデータを利用するには、GPU上にバッファを用意して、そのバッファにデータをコピーする、必要があります。


```js
  // 計算の入出力に使うバッファを、GPU上に用意する。
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  // JavaScript側で用意した入力データを、GPU上のバッファへコピーする。
  device.queue.writeBuffer(workBuffer, 0, input);
```

上のコードでは、まず`device.createBuffer`でバッファを生成しています。
`size`はバッファのサイズで、単位はバイトです。
今回の例では`Float32Array`の値を３つ扱うので12バイトになります。
`Float32Array`については「[メモリレイアウト](webgpu-memory-layout.html)」で説明しているので、`Float32Array`なじみがないという人は読んでみると良いでしょう。

WebGPUで利用するバッファでは、必ず`usage`を指定する必要があります。
`usage`に指定できるフラグは多数あり、同時に指定できないフラグなどもあります。
今回のケースでは、
* `GPUBufferUsage.STORAGE`を指定して、`storage`として利用できるようにしています。この設定は、シェーダの方で`var<storage,...>`と設定したものと対応しています。
* `GPUBufferUsage.COPY_DST`を指定して、このバッファをデータのコピー先とできるようにしています。
* `GPUBufferUsage.COPY_SRC`を指定して、このバッファをデータのコピー元とできるようにしています。

ここでひとつ注意なのですが、WebGPUのバッファの中身は、JavaScript側から直接見ることができません。
直接見るのではなく、WebGPUのバッファ上のデータを、JavaScript側へマップする必要があります。というのも、そうしないと、読みだしている最中にバッファの内容が更新中であった場合に問題が起きるからです。また、そもそもバッファのデータはCPU側のメモリには存在せず、GPU側のメモリにあるから、というのも理由の一つです。

WebGPUのバッファをJavaScript側にマップすることはできますが、マップできるようにしたバッファはそれ以外の操作はできません。
たとえば、今回作ったバッファはマップすることができません。usageを`STORAGE`としたためです。この設定のバッファをマップしようとするとエラーになります。

従って、JavaScript側から計算結果を見るためには、usageが`STORAGE`ではない別のバッファが必要になります。計算が完了した後に、「計算結果を書き込むためのバッファ」から、「JavaScript側へマップ可能なバッファ」へコピーします。

```js
  // GPUの外から見えるように、計算結果をコピーする新たなバッファを、GPU上に用意する
  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
```

`MAP_READ`は、データをGPUの外へマップできるようにする、という意味です。

これらのバッファの情報をシェーダに伝えるため、バインドグループ(bindGroup)を作ります。

```js
  // 計算をする際にどのバッファを使えばよいかシェーダに指示するため、
  // bindGroupを設定する。
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: workBuffer },
    ],
  });
```
`pipeline.getBindGroupLayout`で、パイプラインからbindGroupを取得しています。
bindGroupのエントリを設定します。
`pipeline.getBindGroupLayout(0)`の`0`は、シェーダで記述した`@group(0)`
に相当します。
`entries`の`{binding: 0 ...`は、シェーダで記述した`@group(0) @binding(0)`
に相当します。

次はコマンドのエンコードです。

```js
  // 計算用のコマンドをエンコードする
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
`createCommandEncoder`でコマンドエンコーダを生成、
`beginComputePass`でコンピュートパスを開始、
`setPipeline(pipeline)`でパイプラインをセット、
`setBindGroup(0, bindGroup)`でbindGroupをセットしています。この`0`は、シェーダで記述した`@group(0)`に対応するものです。
`dispatchWorkgroups`を呼んでいます。`input.length`の値は`3`なので、これはWebGPUに対して「コンピュートシェーダを３回呼べ」という命令になります。
`end`でコンピュートパスを終了しています。

これは`dispatchWorkgroups`の実行時点の、各種ステートです。

<div class="webgpu_center"><img src="resources/webgpu-simple-compute-diagram.svg" style="width: 553px;"></div>

計算が終わったら、`workBuffer`に書き込まれたデータをGPUの外へ持ち出すために`resultBuffer`へコピーします。

```js
  // 「得られた結果をマップ可能なバッファへコピーするコマンド」をエンコードする。
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);
```

エンコーダを`finish`して、コマンドバッファを取得します。
得られたコマンドバッファを、GPUに対して`submit`します。

```js
  // コマンドのエンコードを完了。コマンドバッファをGPUへsubmitする。
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
```

`resultBuffer`をマップして、データのコピーを取得します。

```js
  // 計算結果を読み出す。
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange());

  console.log('input', input);
  console.log('result', result);

  resultBuffer.unmap();
```

バッファをマップするために`mapAsync`を使用します。この関数を利用する際は、処理の完了を`await`で待つ必要があります。
マップの処理が完了したら`resultBuffer.getMappedRange()`で`ArrayBuffer`を取得しています。引数なしで読んだ場合、`ArrayBuffer`全体が返されます。
得られたバイト列である`ArrayBuffer`を、型付き配列である`Float32Array`のビューとすることで、シェーダの計算結果を数値として見ることができます。
一つ重要な注意点なのですが、`getMappedRange`が返した`ArrayBuffer`が有効なのは、`unmap`を呼ぶまでの間だけ、となっています。`unmap`を実行すると、`ArrayBuffer`のlengthは0となり、データにアクセスすることはできなくなります。

これが実行結果です。３つの数値をGPUに渡して、GPU上のシェーダで計算して、二倍になった値をJavaScript側へ取得して、表示しています。

{{{example url="../webgpu-simple-compute.html"}}}

コンピュートシェーダの本格的な使い方は別の記事で紹介しますが、ここまでで、WebGPUが何をするものであるか、一通りのことが伝わったのではないかと思います。*この先は、全てあなた次第です*。
WebGPUの学習はプログラム言語の学習のようなものです。WebGPUはいくつかの基本機能を提供するもので、それ以上の部分はあなたの創造性にゆだねられています。

WebGPUのプログラミングを特別なものにしているのは、頂点シェーダ、フラグメントシェーダ、コンピュートシェーダで、これらのシェーダがGPU上で動く、というところです。
GPUは、ものによっては１つのGPUで10000個にも及ぶプロセッサを内包しています。
これは、ポテンシャルとしては10000回の計算を並列で実行できるということです。並列性の規模は、CPUとは実に三桁もの違いがあります。

## 簡単なcanvasリサイズ

別の話題に移る前に、三角形を描くサンプルを利用して「canvasをリサイズする仕組み」を紹介しておきます。canvasサイズの変更については「[canvasのリサイズ](webgpu-resizing-the-canvas.html)」で記事一本丸ごと使って詳しく説明しています。
ここで紹介するのは簡易版です。

最初に、CSSを追加してcanvasがページ全体を覆うようにします。

```html
<style>
html, body {
  margin: 0;       /* デフォルトのmarginをなくす          */
  height: 100%;    /* html,bodyをページ全体に合わせる     */
}
canvas {
  display: block;  /* canvasの挙動をブロック要素扱いにする */
  width: 100%;     /* canvasを自身のコンテナに合わせる     */
  height: 100%;
}
</style>
```

このCSSは、canvasをページ全体に表示するものです。表示サイズを設定するもので、canvas自体の解像度は変化しません。
このため、別ウィンドウで表示して最大化すると、三角形が何やらギザギザになるのが分かると思います。

{{{example url="../webgpu-simple-triangle-with-canvas-css.html"}}}

`<canvas>`タグの解像度は、デフォルトでは300x150ということになっています。
これを、表示サイズに合わせてcanvasの解像度が変化するようにします。

これにはいくつかやり方がありますが、ここでは`ResizeObserver`を使ってみます。
まず、`ResizeObserver`クラスのオブジェクトを生成。監視対象がリサイズされるたびに処理を行うメソッドを追加。監視対象のHTML要素を指定、しています。

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
+        // re-render
+        render();
+      }
+    });
+    observer.observe(canvas);
```
上のコードでは`entries`の全ての要素をforで走査していますが、実際に操作対象となるのは`observe`で指定したcanvas一つだけです。canvasのサイズには、デバイスによる上限の制限があるので、それに配慮しています。この上限を超えてしまうと、WebGPUは、大きすぎるテクスチャを生成しようとしてエラーを出力することになります。また、サイズが0の場合も同様にエラーとなります。
これについては、「[canvasのリサイズ](webgpu-resizing-the-canvas.html)」の記事で説明します。

canvasの解像度が適切に更新できたところで`render`を呼んで再描画しています。元のコードでは無条件で`render`を呼んでいましたが、その部分は不要なのでコードから削除しています。`ResizeObserver`は、observeを開始した時点でのcanvas要素のサイズを報告するため、コールバックを必ず１回は実行するためです。

リサイズ後のサイズの新たなテクスチャの生成は、`render`の中に書いた`context.getCurrentTexture()`が行なうので、observerは関与しません。

{{{example url="../webgpu-simple-triangle-with-canvas-resize.html"}}}

以下の記事では、シェーダにデータを渡す様々な方法、について説明しています。

* [inter-stage variables](webgpu-inter-stage-variables.html)
* [uniforms](webgpu-uniforms.html)
* [storage buffers](webgpu-storage-buffers.html)
* [vertex buffers](webgpu-vertex-buffers.html)
* [textures](webgpu-textures.html)
* [constants](webgpu-constants.html)

また「[WGSLの基礎](webgpu-wgsl.html)」では、WGSLについて説明します。

上に記事順は、簡単なものから複雑なもの、の順です。

`inter-stage variable`(ステージ間変数)の利用は、WGSLのコードの中で完結できるので、
外部での設定の説明は必要がありません。WGSLのコードの変更だけで利用できます。
`uniform`(uniform変数)は実質上、グローバル変数です。三種類あるシェーダ(頂点シェーダ、フラグメントシェーダ、コンピュートシェーダ)の、いずれでも利用されます。
`strage buffer`(ストレージバッファ)の利用は、`uniform buffer`から`strage buffer`への移行であればとても簡単です。`strage buffer`記事冒頭で説明しています。
`vertex buffer`(頂点バッファ)は、頂点シェーダでのみ利用されます。これはそれなりに複雑です。利用するためにはWebGPUのデータレイアウトの記述が必要になります。
`texture`(テクスチャ)はさらに複雑です。利用するために設定が必要なオプションが山のようにあります。

これらの話題は退屈なので、読み飛ばしてしまうのも良いかも知れません。
WebGPUの学習の入口で飽きてしまうよりは良いです。
これらの基礎知識が必要である、と実感する場面まで進んでから、改めて読み直すなり、初めて読むなりするのが良いと思います。
基本的なことを押さえることができたら、実用的なテクニックに触れていきます。

もう一つ付け加えておきます。このWebサイトのプログラム例は全て、その場で編集、実行することができるようにしてあります。また、[jsfiddle](https://jsfiddle.net)、[codepen](https://codepen.io)、あと[stackoverflow](https://stackoverflow.com)へ持っていくことも"Export"ワンタッチでできます。

<div class="webgpu_bottombar">
<p>
上のコードでは「WebGPUデバイスの取得」の手順はかなり簡略的な、ゆるい書き方になっている。丁寧に書くなら、こんな感じになるだろう。
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
<code>device.lost</code>は初期段階でunresolvedの、Promiseオブジェクトである。
デバイスがロストした段階でresolveとなる。
デバイスがロストする原因は、様々だ。
ユーザーがとても重いアプリを実行してGPU負荷が上がってクラッシュした。
ユーザーがOSのドライバを更新した。
外部GPUデバイスを使っていたが、そのケーブルを抜いた。
ブラウザの別のタブでGPU負荷が上がっていて、実行中のタブをバックグラウンドに移行した時点で、メモリを開放するためにブラウザがデバイスをロストさせた。
等が考えられる。

重要なのは、「デバイスはロストする可能性がある」ということと、「シリアスなアプリケーション」では、「デバイスロストした状態からでも復帰できるようにしておく必要がある」、かも知れない、ということだ。
</p>
<p>
「<code>requestDevice</code>は、常にデバイスを返す仕様である」、という点には注意が必要だ。状況によっては、「デバイスは返されたが最初からロストしている」、ということも起きうる。
WebGPUはそういうデザインになっている。多くの場合、デバイスは「APIレベルでは動いているように見える」。デバイスがロストしている状態では、各種リソースをcreateしたり使用したりする段階で各種メソッドは「正常終了はする」が「機能はしていない」といったことが起きる。<code>device.lost</code>プロミスがresolveされる可能性を意識して、どう対処するか(しないか)は、あなた次第である。
</p>
</div>
<!-- keep this at the bottom of the article -->
<script type="module" src="webgpu-fundamentals.js"></script>
