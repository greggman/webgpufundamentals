Title: WebGPU ストレージバッファ
Description: シェーダーへの大きなデータの受け渡し
TOC: ストレージバッファ

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

この記事はストレージバッファに関するもので、[前の記事](webgpu-uniforms.html)の続きです。

ストレージバッファは、多くの点でユニフォームバッファに似ています。JavaScriptで`UNIFORM`を`STORAGE`に変更し、WGSLで`var<uniform>`を`var<storage, read>`に変更するだけで、前のページの例はそのまま機能します。

実際、変数をより適切な名前に変更せずに、違いは次のとおりです。

```js
    const staticUniformBuffer = device.createBuffer({
      label: `static uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });


...

    const uniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: uniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
```

そして、WSGLでは

```wsgl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
+@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

そして、他の変更なしで、以前と同じように機能します。

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## ユニフォームバッファとストレージバッファの違い

ユニフォームバッファとストレージバッファの主な違いは次のとおりです。

1. ユニフォームバッファは、一般的なユースケースでは高速になる可能性があります。

   これは、ユースケースに大きく依存します。一般的なアプリでは、さまざまなものをたくさん描画する必要があります。たとえば、3Dゲームだとします。アプリは、車、建物、岩、茂み、人々などを描画する場合があります。それぞれに、上記の例で渡したものと同様の向きとマテリアルのプロパティを渡す必要があります。この場合、ユニフォームバッファを使用することをお勧めします。

2. ストレージバッファは、ユニフォームバッファよりもはるかに大きくなる可能性があります。

   * デフォルトでは、ユニフォームバッファの最大サイズは64 KiB（65536バイト）です。
   * デフォルトでは、ストレージバッファの最大サイズは128 MiB（134217728バイト）です。

   すべての実装は、少なくともこれらのサイズをサポートする必要があります。[別の記事](webgpu-limits-and-features.html)で、より大きな制限を確認して要求する方法について詳しく説明します。

3. ストレージバッファは読み書き可能ですが、ユニフォームバッファは読み取り専用です。

   [最初の記事](webgpu-fundamentals.html)のコンピュートシェーダーの例で、ストレージバッファへの書き込みの例を見ました。

## <a id="a-instancing"></a>ストレージバッファを使用したインスタンス化

上記の最初の2つの点を考慮して、最後の例を取り上げ、1回の描画呼び出しですべての100個の三角形を描画するように変更しましょう。これは、ストレージバッファに*適合する可能性のある*ユースケースです。適合する可能性があると言うのは、繰り返しになりますが、WebGPUは他のプログラミング言語に似ているためです。同じことを達成するには多くの方法があります。`array.forEach`と`for (const elem of array)`と`for (let i = 0; i < array.length; ++i)`です。それぞれに用途があります。WebGPUでも同じことが言えます。やろうとすることには、それを達成するための複数の方法があります。三角形を描画する場合、WebGPUが気にするのは、頂点シェーダーから`builtin(position)`の値を返し、フラグメントシェーダーから`location(0)`の色/値を返すことだけです。[^colorAttachments]

[^colorAttachments]: 複数のカラーアタッチメントを持つことができ、その場合は`location(1)`、`location(2)`などに対してより多くの色/値を返す必要があります。

最初に行うことは、ストレージ宣言をランタイムサイズの配列に変更することです。

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

次に、これらの値を使用するようにシェーダーを変更します。

```wgsl
@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32
) -> @builtin(position) {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

+  let otherStruct = otherStructs[instanceIndex];
+  let ourStruct = ourStructs[instanceIndex];

   return vec4f(
     pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
}
```

頂点シェーダーに`instanceIndex`という新しいパラメータを追加し、`@builtin(instance_index)`属性を付けました。これは、描画される各「インスタンス」に対してWebGPUから値を取得することを意味します。`draw`を呼び出すとき、*インスタンス数*の2番目の引数を渡すことができ、描画される各インスタンスについて、処理されるインスタンスの番号が関数に渡されます。

`instanceIndex`を使用して、構造体の配列から特定の構造体要素を取得できます。

また、正しい配列要素から色を取得し、フラグメントシェーダーで使用する必要があります。フラグメントシェーダーは`@builtin(instance_index)`にアクセスできません。それは意味がないからです。[ステージ間変数](webgpu-inter-stage-variables.html)として渡すこともできますが、頂点シェーダーで色を検索し、色だけを渡す方が一般的です。

これを行うには、[ステージ間変数に関する記事](webgpu-inter-stage-variables.html)で行ったように、別の構造体を使用します。

```wgsl
+struct VSOutput {
+  @builtin(position) position: vec4f,
+  @location(0) color: vec4f,
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
-) -> @builtin(position) vec4f {
+) -> VSOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

-  return vec4f(
-    pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  var vsOut: VSOutput;
+  vsOut.position = vec4f(
+      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  vsOut.color = ourStruct.color;
+  return vsOut;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return ourStruct.color;
+@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
+  return vsOut.color;
}

```

WGSLシェーダーを変更したので、JavaScriptを更新しましょう。

設定は次のとおりです。

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // 2つのストレージバッファを作成します
  const staticUnitSize =
    4 * 4 + // colorは4つの32ビット浮動小数点数（各4バイト）です
    2 * 4 + // offsetは2つの32ビット浮動小数点数（各4バイト）です
    2 * 4;  // パディング
  const changingUnitSize =
    2 * 4;  // scaleは2つの32ビット浮動小数点数（各4バイト）です
  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // float32インデックスでのさまざまなユニフォーム値へのオフセット
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // これらは一度だけ設定されるので、今すぐ設定します
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // 色を設定します
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // オフセットを設定します

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // changingStorageBufferを更新するために使用できる型付き配列
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer },
      { binding: 1, resource: changingStorageBuffer },
    ],
  });
```

上記では、2つのストレージバッファを作成します。1つは`OurStruct`の配列用、もう1つは`OtherStruct`の配列用です。

次に、`OurStruct`の配列の値をオフセットと色で埋め、そのデータを`staticStorageBuffer`にアップロードします。

両方のバッファを参照する1つのバインドグループを作成します。

新しいレンダリングコードは次のとおりです。

```js
  function render() {
    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // JavaScript側のFloat32Arrayでユニフォーム値を設定します
    const aspect = canvas.width / canvas.height;

-    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
-      uniformValues.set([scale / aspect, scale], kScaleOffset); // スケールを設定します
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(3);  // 頂点シェーダーを3回呼び出します
-    }

+    // 各オブジェクトのスケールを設定します
+    objectInfos.forEach(({scale}, ndx) => {
+      const offset = ndx * (changingUnitSize / 4);
+      storageValues.set([scale / aspect, scale], offset + kScaleOffset); // スケールを設定します
+    });
+    // すべてのスケールを一度にアップロードします
+    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(3, kNumObjects);  // 各インスタンスに対して頂点シェーダーを3回呼び出します


    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

上記のコードは、`kNumObjects`個のインスタンスを描画します。各インスタンスについて、WebGPUは頂点シェーダーを3回呼び出し、`vertex_index`を0、1、2に設定し、`instance_index`を0〜kNumObjects - 1に設定します。

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

1回の描画呼び出しで、それぞれ異なるスケール、色、オフセットを持つ100個の三角形すべてを描画できました。同じオブジェクトの多数のインスタンスを描画したい状況では、これが1つの方法です。

## 頂点データにストレージバッファを使用する

これまで、シェーダーで直接ハードコードされた三角形を使用してきました。ストレージバッファの1つのユースケースは、頂点データを格納することです。上記の例で`instance_index`で現在のストレージバッファをインデックス付けしたように、`vertex_index`で別のストレージバッファをインデックス付けして頂点データを取得できます。

やってみましょう！

```wgsl
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

+struct Vertex {
+  position: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
+@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
-      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

次に、いくつかの頂点データを持つ別のストレージバッファを設定する必要があります。まず、いくつかの頂点データを生成する関数を作成しましょう。円を作成しましょう。
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 1つのサブディビジョンあたり2つの三角形、1つの三角形あたり3つの頂点、それぞれ2つの値（xy）。
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // 1つのサブディビジョンあたり2つの三角形
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // 最初の三角形
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // 2番目の三角形
    addVertex(c1 * innerRadius, s1 * innerRadius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c2 * innerRadius, s2 * innerRadius);
  }

  return {
    vertexData,
    numVertices,
  };
}
```

上記のコードは、次のような三角形から円を作成します。

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

したがって、それを使用して、円の頂点でストレージバッファを埋めることができます。

```js
  // 頂点データを持つストレージバッファを設定します
  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);
```

そして、それをバインドグループに追加する必要があります。

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer },
      { binding: 1, resource: changingStorageBuffer },
+      { binding: 2, resource: vertexStorageBuffer },
    ],
  });
```

そして最後に、レンダリング時に、円のすべての頂点をレンダリングするように要求する必要があります。

```js
-    pass.draw(3, kNumObjects);  // 複数のインスタンスに対して頂点シェーダーを3回呼び出します
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

上記では、

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

構造体なしで、直接`vec2f`を使用することもできました。

```wgsl
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
+@group(0) @binding(2) var<storage, read> pos: array<vec2f>;
...
-pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
```

しかし、構造体にすることで、後で頂点ごとのデータを追加するのが間違いなく簡単になりますか？

ストレージバッファを介して頂点を渡すことは、人気が高まっています。ただし、一部の古いデバイスでは、[頂点バッファに関する記事](webgpu-vertex-buffers.html)で次に説明する*古典的な*方法よりも遅いと言われています。