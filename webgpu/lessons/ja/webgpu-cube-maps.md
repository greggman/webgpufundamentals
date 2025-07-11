Title: WebGPU キューブマップ
Description: WebGPUでキューブマップを使用する方法
TOC: キューブマップ

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

この記事は、[テクスチャに関する記事](webgpu-textures.html)と[テクスチャへの画像のインポートに関する記事](webgpu-importing-textures.html)を読んでいることを前提としています。この記事では、[指向性ライティングに関する記事](webgpu-lighting-directional.html)で説明されている概念も使用します。これらの記事をまだ読んでいない場合は、最初に読むことをお勧めします。

[前の記事](webgpu-textures.html)では、テクスチャの使用方法、テクスチャ全体で0から1までのテクスチャ座標で参照される方法、およびオプションでミップを使用してフィルタリングされる方法について説明しました。

別の種類のテクスチャは*キューブマップ*です。キューブマップは、キューブの6つの面を表す6つの面で構成されます。2次元の従来のテクスチャ座標の代わりに、キューブマップは法線、つまり3D方向を使用します。法線が指す方向に応じて、キューブの6つの面の1つが選択され、その面内のピクセルがサンプリングされて色が生成されます。

簡単な例を作成しましょう。2Dキャンバスを使用して、6つの各面で使用される画像を作成します。

これは、キャンバスを色と中央揃えのメッセージで塗りつぶすコードです。

```js
function generateFace(size, {faceColor, textColor, text}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = faceColor;
  ctx.fillRect(0, 0, size, size);
  ctx.font = `${size * 0.7}px sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const m = ctx.measureText(text);
  ctx.fillText(
    text,
    (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
    (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
  );
  return canvas;
}
```

そして、これを呼び出して6つの画像を生成するコードは次のとおりです。

```js
const faceSize = 128;
const faceCanvases = [
  { faceColor: '#F00', textColor: '#0FF', text: '+X' },
  { faceColor: '#FF0', textColor: '#00F', text: '-X' },
  { faceColor: '#0F0', textColor: '#F0F', text: '+Y' },
  { faceColor: '#0FF', textColor: '#F00', text: '-Y' },
  { faceColor: '#00F', textColor: '#FF0', text: '+Z' },
  { faceColor: '#F0F', textColor: '#0F0', text: '-Z' },
].map(faceInfo => generateFace(faceSize, faceInfo));

// 結果を表示します
for (const canvas of faceCanvases) {
  document.body.appendChild(canvas);
}
```

{{{example url="../webgpu-cube-faces.html" }}}

次に、キューブマップを使用してそれらをキューブに適用しましょう。[テクスチャへの画像のインポートに関する記事](webgpu-importing-textures.html#a-texture-atlases)のテクスチャアトラスの例のコードから始めます。

まず、キューブマップを使用するようにシェーダーを変更しましょう。

```wgsl
struct Uniforms {
  matrix: mat4x4f,
};

struct Vertex {
  @location(0) position: vec4f,
-  @location(1) texcoord: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
-  @location(0) texcoord: vec2f,
+  @location(0) normal: vec3f,
};

...

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = uni.matrix * vert.position;
-  vsOut.texcoord = vert.texcoord;
+  vsOut.normal = normalize(vert.position.xyz);
  return vsOut;
}
```

シェーダーからテクスチャ座標を削除し、ステージ間変数を変更して法線をフラグメントシェーダーに渡すようにしました。キューブの位置は原点を中心に完全に中央揃えされているため、法線として使用できます。

[ライティングに関する記事](webgpu-lighting-directional.html)から、法線は方向であり、通常、ある頂点のサーフェスの方向を指定するために使用されることを思い出してください。法線に正規化された位置を使用しているため、これを照らすと、キューブ全体で滑らかなライティングが得られます。

{{{diagram url="resources/cube-normals.html" caption="標準のキューブ法線とこのキューブの法線" width="700" height="400"}}}

テクスチャ座標を使用していないため、テクスチャ座標の設定に関連するすべてのコードを削除できます。

```js
  const vertexData = new Float32Array([
-     // 前面     左上の画像を選択
-    -1,  1,  1,        0   , 0  ,
-    -1, -1,  1,        0   , 0.5,
-     1,  1,  1,        0.25, 0  ,
-     1, -1,  1,        0.25, 0.5,
-     // 右面     中央上の画像を選択
-     1,  1, -1,        0.25, 0  ,
-     1,  1,  1,        0.5 , 0  ,
-     1, -1, -1,        0.25, 0.5,
-     1, -1,  1,        0.5 , 0.5,
-     // 背面      右上の画像を選択
-     1,  1, -1,        0.5 , 0  ,
-     1, -1, -1,        0.5 , 0.5,
-    -1,  1, -1,        0.75, 0  ,
-    -1, -1, -1,        0.75, 0.5,
-    // 左面       左下の画像を選択
-    -1,  1,  1,        0   , 0.5,
-    -1,  1, -1,        0.25, 0.5,
-    -1, -1,  1,        0   , 1  ,
-    -1, -1, -1,        0.25, 1  ,
-    // 底面     中央下の画像を選択
-     1, -1,  1,        0.25, 0.5,
-    -1, -1,  1,        0.5 , 0.5,
-     1, -1, -1,        0.25, 1  ,
-    -1, -1, -1,        0.5 , 1  ,
-    // 上面        右下の画像を選択
-    -1,  1,  1,        0.5 , 0.5,
-     1,  1,  1,        0.75, 0.5,
-    -1,  1, -1,        0.5 , 1  ,
-     1,  1, -1,        0.75, 1  ,
+     // 前面
+    -1,  1,  1,
+    -1, -1,  1,
+     1,  1,  1,
+     1, -1,  1,
+     // 右面
+     1,  1, -1,
+     1,  1,  1,
+     1, -1, -1,
+     1, -1,  1,
+     // 背面
+     1,  1, -1,
+     1, -1, -1,
+    -1,  1, -1,
+    -1, -1, -1,
+    // 左面
+    -1,  1,  1,
+    -1,  1, -1,
+    -1, -1,  1,
+    -1, -1, -1,
+    // 底面
+     1, -1,  1,
+    -1, -1,  1,
+     1, -1, -1,
+    -1, -1, -1,
+    // 上面
+    -1,  1,  1,
+     1,  1,  1,
+    -1,  1, -1,
+     1,  1, -1,
  ]);

  ...

  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (3 + 2) * 4, // (3+2) floats 4 bytes each
+          arrayStride: (3) * 4, // (3) floats 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
-            {shaderLocation: 1, offset: 12, format: 'float32x2'},  // texcoord
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });
```

フラグメントシェーダーでは、`texture_2d`の代わりに`texture_cube`を使用する必要があり、`textureSample`は`texture_cube`で使用すると`vec3f`方向を取るため、法線を渡します。法線はステージ間変数であり、補間されるため、正規化する必要があります。

```wgsl
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var ourSampler: sampler;
-@group(0) @binding(2) var ourTexture: texture_2d<f32>;
+@group(0) @binding(2) var ourTexture: texture_cube<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return textureSample(ourTexture, ourSampler, vsOut.texcoord);
+  return textureSample(ourTexture, ourSampler, normalize(vsOut.normal));
}
```

実際にキューブマップを作成するには、6つのレイヤーを持つ2Dテクスチャを作成します。すべてのヘルパーを変更して、複数のソースを処理できるようにしましょう。

## <a id="a-texture-helpers"></a>テクスチャヘルパーを複数のレイヤーを処理するようにする

まず、`createTextureFromSource`を取得し、ソースの配列を受け取る`createTextureFromSources`に変更しましょう。

```js
-  function createTextureFromSource(device, source, options = {}) {
+  function createTextureFromSources(device, sources, options = {}) {
+    // すべてのソースが同じサイズであると仮定し、幅と高さには最初のソースのみを使用します
+    const source = sources[0];
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
-      size: [source.width, source.height],
+      size: [source.width, source.height, sources.length],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
-    copySourceToTexture(device, texture, source, options);
+    copySourcesToTexture(device, texture, sources, options);
    return texture;
  }
```

上記のコードは、各ソースに1つずつ、複数のレイヤーを持つテクスチャを作成します。また、すべてのソースが同じサイズであると想定しています。同じテクスチャのレイヤーに対してサイズが異なることは非常にまれであるため、これは良い賭けのようです。

次に、複数のソースを処理するように`copySourceToTexture`を更新する必要があります。

```js
-  function copySourceToTexture(device, texture, source, {flipY} = {}) {
+  function copySourcesToTexture(device, texture, sources, {flipY} = {}) {
+    sources.forEach((source, layer) => {
*      device.queue.copyExternalImageToTexture(
*        { source, flipY, },
-        { texture },
+        { texture, origin: [0, 0, layer] },
*        { width: source.width, height: source.height },
*      );
+  });

    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }
```

上記では、唯一の大きな違いは、ソースをループするループを追加し、各ソースをそれぞれのレイヤーにコピーするように、テクスチャ内のコピー先として`origin`を設定したことです。

次に、複数のソースを処理するように`generateMips`を更新する必要があります。

```js
  const generateMips = (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};

    return function generateMips(device, texture) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
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

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }

      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module,
          },
          fragment: {
            module,
            targets: [{ format: texture.format }],
          },
        });
      }
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      });

      for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
+        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
*          const bindGroup = device.createBindGroup({
*            layout: pipeline.getBindGroupLayout(0),
*            entries: [
*              { binding: 0, resource: sampler },
-              { binding: 1, resource: texture.createView({baseMipLevel, mipLevelCount: 1}) },
+              {
+                binding: 1,
+                resource: texture.createView({
+                  dimension: '2d',
+                  baseMipLevel: baseMipLevel - 1,
+                  mipLevelCount: 1,
+                  baseArrayLayer: layer,
+                  arrayLayerCount: 1,
+                }),
*              },
*            ],
*          });
*
*          const renderPassDescriptor = {
*            label: 'our basic canvas renderPass',
*            colorAttachments: [
*              {
-                view: texture.createView({baseMipLevel, mipLevelCount: 1}),
+                view: texture.createView({
+                  dimension: '2d',
+                  baseMipLevel: baseMipLevel,
+                  mipLevelCount: 1,
+                  baseArrayLayer: layer,
+                  arrayLayerCount: 1,
+                }),
*                loadOp: 'clear',
*                storeOp: 'store',
*              },
*            ],
*          };
*
*          const pass = encoder.beginRenderPass(renderPassDescriptor);
*          pass.setPipeline(pipeline);
*          pass.setBindGroup(0, bindGroup);
*          pass.draw(6);  // call our vertex shader 6 times
*          pass.end();
+        }
+      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();
```

テクスチャの各レイヤーを処理するループを追加しました。ビューを変更して、単一のレイヤーを選択するようにしました。また、ビューに`dimension: '2d'`を明示的に選択する必要がありました。なぜなら、デフォルトでは、1つ以上のレイヤーを持つ2Dテクスチャのビューは`dimension: '2d-array'`を取得し、ミップマップを生成する目的では、これは望ましくないからです。

> 注：[互換モードに関する記事](webgpu-compatibility-mode.html)では、互換モードで動作する`generateMips`のバージョンを提供しています。

ここでは使用しませんが、元の`createTextureFromSource`および`copySourceToTexture`関数は、次のように簡単に置き換えることができます。

```js
  function copySourceToTexture(device, texture, source, options = {}) {
    copySourcesToTexture(device, texture, [source], options);
  }

  function createTextureFromSource(device, source, options = {}) {
    return createTextureFromSources(device, [source], options);
  }
```

これらが準備できたので、記事の冒頭で作成した面を使用できます。

```js
  const texture = await createTextureFromSources(
      device, faceCanvases, {mips: true, flipY: false});
```

残っているのは、バインドグループでテクスチャのビューを変更することだけです。

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
      { binding: 1, resource: sampler },
-      { binding: 2, resource: texture },
+      { binding: 2, resource: texture.createView({dimension: 'cube'}) },
    ],
  });
```

そして、出来上がりです。

{{{example url="../webgpu-cube-map.html" }}}

テクスチャのレイヤーとしての面の順序に注意してください。

* レイヤー0 => 正のx
* レイヤー1 => 負のx
* レイヤー2 => 正のy
* レイヤー3 => 負のy
* レイヤー4 => 正のz
* レイヤー5 => 負のz

これを考える別の方法は、`textureSample`を呼び出して対応する方向を渡すと、テクスチャのそのレイヤーの中心ピクセルの色が返されるということです。

* `textureSample(tex, sampler, vec3f( 1, 0, 0))` => レイヤー0の中心
* `textureSample(tex, sampler, vec3f(-1, 0, 0))` => レイヤー1の中心
* `textureSample(tex, sampler, vec3f( 0, 1, 0))` => レイヤー2の中心
* `textureSample(tex, sampler, vec3f( 0,-1, 0))` => レイヤー3の中心
* `textureSample(tex, sampler, vec3f( 0, 0, 1))` => レイヤー4の中心
* `textureSample(tex, sampler, vec3f( 0, 0,-1))` => レイヤー5の中心

キューブをテクスチャリングするためにキューブマップを使用することは、通常、キューブマップが使用される目的では**ありません**。キューブをテクスチャリングする*正しい*、またはむしろ標準的な方法は、[前に述べた](webgpu-importing-textures.html#a-texture-atlases)ようにテクスチャアトラスを使用することです。この記事のポイントは、キューブマップの概念を紹介し、方向（法線）を渡すと、その方向のキューブの色が返されることを示すことでした。

キューブマップとは何か、そしてそれを設定する方法を学んだので、キューブマップは何に使用されるのでしょうか？おそらく、キューブマップが最も一般的に使用されるのは、[*環境マップ*](webgpu-environment-maps.html)としてです。