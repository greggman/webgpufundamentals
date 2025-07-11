Title: WebGPU 互換モード
Description: 古いマシンでの実行
TOC: 互換モード

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

WebGPU互換モードは、いくつかの制限付きで、古いデバイスでも実行できるWebGPUのバージョンです。アイデアとしては、いくつかの追加の制限と制約内でアプリを実行できるようにすれば、WebGPU互換アダプターを要求して、より多くの場所でアプリを実行できるようになります。

> 注：互換モードはまだ正式に出荷されていません。お使いのブラウザでは実験的に利用できる場合があります。[Chrome Canary](https://www.google.com/chrome/canary/)では、バージョン136.0.7063.0（2025-03-11）以降、`chrome://flags/#enable-unsafe-webgpu`にアクセスして「enable-unsafe-webgpu」フラグを有効にすることで互換モードを許可できます。

互換モードで何ができるかについて少し説明すると、事実上*ほぼ*すべてのWebGL2プログラムを互換モードで実行するように変換できます。

方法は次のとおりです。

```js
const adapter = await navigator.gpu.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter.requestDevice();
```

簡単です！互換モードのすべての制限に従うすべてのアプリは、有効な「コア」WebGPUアプリであり、WebGPUがすでに実行されている場所ならどこでも実行されることに注意してください。

# 主な制限と制約

## 頂点シェーダーでストレージバッファが0になる可能性がある

WebGPUアプリに最も影響を与える可能性のある主な制限は、これらの古いデバイスの約45％が頂点シェーダーでストレージバッファをサポートしていないことです。

この機能は、このサイトの3番目の記事である[ストレージバッファに関する記事](webgpu-storage-buffers.html)で使用しました。その記事の後、[頂点バッファの使用に切り替えました](webgpu-vertex-buffers.html)。頂点バッファの使用は一般的であり、どこでも機能しますが、特定のソリューションはストレージバッファを使用する方が簡単です。一例として、[ワイヤーフレームを描画するこの例](https://webgpu.github.io/webgpu-samples/?sample=wireframe)があります。頂点データから三角形を生成するためにストレージバッファを使用します。

ストレージバッファに格納された頂点データを使用すると、頂点データにランダムにアクセスできます。頂点バッファ内の頂点データではできません。もちろん、常に他の解決策があります。

## 中程度の制限と制約

## テクスチャには単一のviewDimensionのみが許可されます。

通常のWebGPUでは、次のように2Dテクスチャを作成できます。

```js
const myTexture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
});
```

その後、3つの異なるビューディメンションで表示できます。

```js
// myTextureを6層の2D配列として表示
const as2DArray = myTexture;

// myTextureのレイヤー3を2Dテクスチャとして表示
const as2D = myTexture.createView({
  viewDimension: '2d',
  baseArrayLayer: 3,
  arrayLayerCount: 1,
});

// myTextureをキューブマップとして表示
const asCube = myTexture.createView({
  viewDimension: 'cube',
});
```

互換モードでは、1つのビューディメンションしか使用できず、テクスチャを作成するときにどのviewDimensionかを選択する必要があります。1層の2Dテクスチャは、デフォルトで`'2d'`ビューとしてのみ使用できます。1層を超える2Dテクスチャは、デフォルトで`'2d-array`'ビューとしてのみ使用できます。デフォルト以外のものが必要な場合は、WebGPUに指示する必要があります。たとえば、キューブマップが必要な場合は、テクスチャを作成するときにWebGPUに指示する必要があります。

```js
const cubeTexture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
  textureBindingViewDimension: 'cube', 
});
```

この追加パラメータは、`TEXTURE_BINDING`の使用法でテクスチャを使用することに関連しているため、`textureBindingViewDimension`と呼ばれていることに注意してください。キューブマップまたは2D配列の単一レイヤーを`RENDER_ATTACHMENT`として2Dテクスチャとして使用することはできます。

互換モードでは、別のタイプのビューでテクスチャを使用すると、検証エラーが生成されます。

```js
// cubeTextureを6層の2D配列として表示
const bindGroup = device.createBindGroup({
  ...
  entries: [
    {
      binding,
      // 互換モードでのエラー：テクスチャはキューブマップであり、2D配列ではありません
      resource: cubeTexture,
    },
  ],
})
```

```js
// cubeTextureのレイヤー3を2Dテクスチャとして表示
const bindGroup = device.createBindGroup({
  ...
  entries: [
    {
      binding,
      // 互換モードでのエラー：テクスチャはキューブマップであり、2Dではありません
      resource: cubeTexture.createView({
        viewDimension: '2d',
        baseArrayLayer: 3,
        arrayLayerCount: 1,
      }),
    },
  ]
});
```

```js
// cubeTextureをキューブマップとして表示
const bindGroup = device.createBindGroup({
  ...
  entries: [
    {
      binding,
      // OK!
      resource: cubeTexture.createView({
        viewDimension: 'cube',
      }),
    },
  ],
});
```

この制限はそれほど大きな問題ではありません。異なる種類のビューでテクスチャを使用したいプログラムはほとんどありません。

## `texture.createView`を呼び出すとき、bindGroupでレイヤーのサブセットを選択することはできません

コアWebGPUでは、いくつかのレイヤーを持つテクスチャを作成できます。

```js
const texture = device.createTexture({
  size: [64, 128, 8],   // 8レイヤー
  ...
});
```

その後、レイヤーのサブセットを選択できます。

```js
const bindGroup = device.createBindGroup({
  ...
  entries: [
    {
      binding,
      // 互換モードでのエラー - レイヤー3と4を選択
      resource: cubeTexture.createView({
        baseArrayLayer: 3,
        arrayLayerCount: 2,
      }),
    },
  ],
});
```

この制限もそれほど大きな問題ではありません。テクスチャからレイヤーのサブセットを選択したいプログラムはほとんどありません。

## <a id="a-generating-mipmaps"></a> 互換モードでのミップマップの生成

ただし、これら両方の制限が発生する場所が1つあり、それは一般的なユースケースであるミップマップの生成時です。

[テクスチャへの画像のインポートに関する記事](webgpu-importing-textures.html#a-generating-mips-on-the-gpu)で、GPUベースのミップマップジェネレーターを作成したことを思い出してください。[キューブマップに関する記事](webgpu-cube-maps.html#a-texture-helpers)で、2D配列とキューブマップのミップマップを生成するようにその関数を変更しました。そのバージョンでは、テクスチャの各レイヤーを常に`'2d'`ディメンションで表示して、テクスチャの1つのレイヤーのみを参照していました。これは、上記の理由により互換モードでは機能しません。`'2d-array'`または`'cube'`テクスチャの`'2d'`ビューを使用することはできません。また、読み取るレイヤーを選択するためにバインドグループで個々のレイヤーを選択することもできません。

コードを互換モードで動作させるには、作成されたのと同じビューディメンションのテクスチャを操作する必要があり、`createView`を介してレイヤーを選択するのではなく、すべてのレイヤーにアクセスできるテクスチャを渡し、シェーダー自体で目的のレイヤーを選択する必要があります。

では、やってみましょう！[キューブマップに関する記事](webgpu-cube-maps.html#a-texture-helpers)の`generateMips`のコードから始めます。

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

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
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
        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              {
                binding: 1,
                resource: texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel - 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
              },
            ],
          });

          const renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          };

          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);  // call our vertex shader 6 times
          pass.end();
        }
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();
```

テクスチャの種類（2D、2D配列、キューブなど）ごとに異なるフラグメントシェーダーを使用するようにWGSLを変更し、読み取るレイヤーを渡せるようにする必要があります。

```wgsl
+const faceMat = array(
+  mat3x3f( 0,  0,  -2,  0, -2,   0,  1,  1,   1),   // pos-x
+  mat3x3f( 0,  0,   2,  0, -2,   0, -1,  1,  -1),   // neg-x
+  mat3x3f( 2,  0,   0,  0,  0,   2, -1,  1,  -1),   // pos-y
+  mat3x3f( 2,  0,   0,  0,  0,  -2, -1, -1,   1),   // neg-y
+  mat3x3f( 2,  0,   0,  0, -2,   0, -1,  1,   1),   // pos-z
+  mat3x3f(-2,  0,   0,  0, -2,   0,  1,  1,  -1));  // neg-z

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
+  @location(1) @interpolate(flat, either) baseArrayLayer: u32,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) baseArrayLayer: u32,
) -> VSOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
+  vsOutput.baseArrayLayer = baseArrayLayer;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
-@group(0) @binding(1) var ourTexture: texture_2d<f32>;

+@group(0) @binding(1) var ourTexture2d: texture_2d<f32>;
@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
+  return textureSample(ourTexture2d, ourSampler, fsInput.texcoord);
}

+@group(0) @binding(1) var ourTexture2dArray: texture_2d_array<f32>;
+@fragment fn fs2darray(fsInput: VSOutput) -> @location(0) vec4f {
+  return textureSample(
+    ourTexture2dArray,
+    ourSampler,
+    fsInput.texcoord,
+    fsInput.baseArrayLayer);
+}
+
+@group(0) @binding(1) var ourTextureCube: texture_cube<f32>;
+@fragment fn fscube(fsInput: VSOutput) -> @location(0) vec4f {
+  return textureSample(
+    ourTextureCube,
+    ourSampler,
+    faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1));
+}
+
+@group(0) @binding(1) var ourTextureCubeArray: texture_cube_array<f32>;
+@fragment fn fscubearray(fsInput: VSOutput) -> @location(0) vec4f {
+  return textureSample(
+    ourTextureCubeArray,
+    ourSampler,
+    faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1), fsInput.baseArrayLayer);
+}
```

このコードには、`'2d'`、`'2d-array'`、`'cube'`、`'cube-array'`のそれぞれに対応する4つのフラグメントシェーダーがあります。[クリップ空間をカバーするための大きな三角形](webgpu-large-triangle-to-cover-clip-space.html)のテクニックを[他の場所でカバー](webgpu-large-triangle-to-cover-clip-space.html)して描画します。また、`@builtin(instance_index)`を使用してレイヤーを選択します。これは、ユニフォームバッファを使用せずに単一の整数値をシェーダーに渡すための興味深く迅速な方法です。`draw`を呼び出すとき、4番目のパラメータは最初のインスタンスであり、シェーダーに`@builtin(instance_index)`として渡されます。これを頂点シェーダーからフラグメントシェーダーに`VSOutput.baseArrayLayer`を介して渡し、フラグメントシェーダーで`fsInput.baseArrayLayer`として参照できます。

キューブマップコードは、2D配列レイヤーと正規化されたUV座標をキューブマップ3D座標に変換します。これは、互換モードではキューブマップはキューブマップとしてしか表示できないため、再び必要になります。

JavaScriptに戻り、ユーザーがテクスチャを作成したときに使用したviewDimensionを渡せるようにして、これらのシェーダーの1つを選択できるようにする必要があります。渡されない場合は、デフォルトから推測します。

```js
+  /**
+  * デフォルトのviewDimensionを取得します
+  * 注：これは単なる推測です。ユーザーはすべての場合で
+  * 正しくするために私たちに指示する必要があります。なぜなら、1層の2Dテクスチャと
+  * 2D配列テクスチャを区別できず、6層の2D配列テクスチャと
+  * キューブマップを区別することもできないからです。
+  */
+  function getDefaultViewDimensionForTexture(dimension, depthOrArrayLayers) {
+   switch (dimension) {
+      case '1d':
+        return '1d';
+      default:
+      case '2d':
+        return depthOrArrayLayers > 1 ? '2d-array' : '2d';
+      case '3d':
+        return '3d';
+    }
+  }

  const generateMips = (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};

-    return function generateMips(device, texture) {
+    return function generateMips(device, texture, textureBindingViewDimension) {
+      // ユーザーがtextureBindingViewDimensionを渡さない場合は推測します
+      textureBindingViewDimension = textureBindingViewDimension ??
+        getDefaultViewDimensionForTexture(texture.dimension, texture.depthOrArrayLayers);
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            const faceMat = array(
              mat3x3f( 0,  0,  -2,  0, -2,   0,  1,  1,   1),   // pos-x
              mat3x3f( 0,  0,   2,  0, -2,   0, -1,  1,  -1),   // neg-x
              mat3x3f( 2,  0,   0,  0,  0,   2, -1,  1,  -1),   // pos-y
              mat3x3f( 2,  0,   0,  0,  0,  -2, -1, -1,   1),   // neg-y
              mat3x3f( 2,  0,   0,  0, -2,   0, -1,  1,   1),   // pos-z
              mat3x3f(-2,  0,   0,  0, -2,   0,  1,  1,  -1));  // neg-z

            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
              @location(1) @interpolate(flat, either) baseArrayLayer: u32,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32,
              @builtin(instance_index) baseArrayLayer: u32,
            ) -> VSOutput {
              var pos = array<vec2f, 3>(
                vec2f(-1.0, -1.0),
                vec2f(-1.0,  3.0),
                vec2f( 3.0, -1.0),
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy, 0.0, 1.0);
              vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
              vsOutput.baseArrayLayer = baseArrayLayer;
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;

            @group(0) @binding(1) var ourTexture2d: texture_2d<f32>;
            @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture2d, ourSampler, fsInput.texcoord);
            }

            @group(0) @binding(1) var ourTexture2dArray: texture_2d_array<f32>;
            @fragment fn fs2darray(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(
                ourTexture2dArray,
                ourSampler,
                fsInput.texcoord,
                fsInput.baseArrayLayer);
            }

            @group(0) @binding(1) var ourTextureCube: texture_cube<f32>;
            @fragment fn fscube(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(
                ourTextureCube,
                ourSampler,
                faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1));
            }

            @group(0) @binding(1) var ourTextureCubeArray: texture_cube_array<f32>;
            @fragment fn fscubearray(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(
                ourTextureCubeArray,
                ourSampler,
                faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1), fsInput.baseArrayLayer);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }

    ...
```

以前は、同じフォーマットのテクスチャにパイプラインを再利用できるように、フォーマットごとにパイプラインを追跡していました。これを、ビューディメンションごとにフォーマットごとにパイプラインになるように更新する必要があります。

```js
  const generateMips = (() => {
    let sampler;
    let module;
-    const pipelineByFormat = {};
+    const pipelineByFormatAndView = {};

    return function generateMips(device, texture, textureBindingViewDimension) {
      // ユーザーがtextureBindingViewDimensionを渡さない場合は推測します
      textureBindingViewDimension = textureBindingViewDimension ??
        getDefaultViewDimensionForTexture(texture);
      let module = moduleByViewDimension[textureBindingViewDimension];
      if (!module) {
        ...
      }

+      const id = `${texture.format}.${textureBindingViewDimension}`;

-      if (!pipelineByFormat[texture.format]) {
-        pipelineByFormat[texture.format] = device.createRenderPipeline({
-          label: 'mip level generator pipeline',
+      if (!pipelineByFormatAndView[id]) {
+        // viewDimensionに基づいてフラグメントシェーダーを選択します（2d-arrayとcube-arrayから'-'を削除します）
+        const entryPoint = `fs${textureBindingViewDimension.replace(/[\W]/, '')}`;
+        pipelineByFormatAndView[id] = device.createRenderPipeline({
+          label: `mip level generator pipeline for ${textureBindingViewDimension}, format: ${texture.format}`,
          layout: 'auto',
          vertex: {
            module,
          },
          fragment: {
            module,
            entryPoint,
            targets: [{ format: texture.format }],
          },
        });
      }
-      const pipeline = pipelineByFormat[texture.format];
+      const pipeline = pipelineByFormatAndView[id];

      ...
}
```

次に、ミップマップを生成するループを変更して、完全なレイヤーを使用するようにする必要があります。互換モードではレイヤーのサブ範囲が許可されていないためです。また、描画を介してインスタンスインデックスを渡す機能を使用して、読み取りたいレイヤーを選択する必要もあります。

```js
  const generateMips = (() => {

      ...

      const pipeline = pipelineByFormatAndView[id];

      for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              {
                binding: 1,
                resource: texture.createView({
-                  dimension: '2d',
+                  dimension: textureBindingViewDimension,
                  baseMipLevel: baseMipLevel - 1,
                  mipLevelCount: 1,
-                  baseArrayLayer: layer,
-                  arrayLayerCount: 1,
                }),
              },
            ],
          });

          const renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: '2d',
                  baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          };

          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
-          pass.draw(6);
+          // 3つの頂点、1つのインスタンス、最初のインスタンス（instance_index）= レイヤーを描画します
+          pass.draw(3, 1, 0, layer);
          pass.end();
        }
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();
```

これで、ミップマップ生成コードは互換モードで動作し、コアWebGPUでも引き続き動作します。

ただし、この例を機能させるには、他にもいくつか更新する必要があります。

ソースを渡してテクスチャを作成する`createTextureFromSources`という関数があります。コアでは6層の`'2d'`テクスチャをキューブマップとして表示できるため、常に`'2d'`テクスチャを作成していました。代わりに、viewDimensionやdimensionを渡せるようにして、テクスチャを作成するときに互換モードにどのように表示するかを伝えられるようにする必要があります。

```js
+  function textureViewDimensionToDimension(viewDimension) {
+   switch (viewDimension) {
+      case '1d': return '1d';
+      case '3d': return '3d';
+      default: return '2d';
+    }
+  }

  function createTextureFromSources(device, sources, options = {}) {
+    const viewDimension = options.viewDimension ??
+      getDefaultViewDimensionForTexture(options.dimension, sources.length);
+    const dimension = options.dimension ?? textureViewDimensionToDimension(viewDimension);
    // すべてのソースが同じサイズであると仮定し、幅と高さには最初のソースのみを使用します
    const source = sources[0];
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
      size: [source.width, source.height, sources.length],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
+      dimension,
+      textureBindingViewDimension: viewDimension,
    });
    copySourcesToTexture(device, texture, sources, options);
    return texture;
  }
```

また、`copySourcesToTexture`を更新して`viewDimension`を取得し、`generateMips`に渡す必要があります。

```js
  function copySourcesToTexture(device, texture, sources, {flipY, viewDimension} = {}) {
    sources.forEach((source, layer) => {
      device.queue.copyExternalImageToTexture(
        { source, flipY, },
        { texture, origin: [0, 0, layer] },
        { width: source.width, height: source.height },
      );
    });
    if (texture.mipLevelCount > 1) {
+      viewDimension = viewDimension ??
+        getDefaultViewDimensionForTexture(texture.dimension, sources.length);
+      generateMips(device, texture, viewDimension);
-      generateMips(device, texture);
    }
  }
```

そして、`createTextureFromSources`の呼び出しを更新して、事前にキューブマップが必要であることを伝える必要があります。

```js
  const texture = await createTextureFromSources(
-      device, faceCanvases, {mips: true, flipY: false});
+      device, faceCanvases, {mips: true, flipY: false, viewDimension: 'cube'});
```

この例を互換モードで実行するには、この記事の冒頭で説明したように要求する必要があります。

```js
async function main() {
-  const adapter = await navigator.gpu?.requestAdapter()
+  const adapter = await navigator.gpu?.requestAdapter({
+    featureLevel: 'compatibility',
+  });
  const device = await adapter?.requestDevice();

  ...
```

これで、キューブマップのサンプルは互換モードで動作します。

{{{example url="../webgpu-compatibility-mode-generatemips.html"}}}

これで、互換モードに対応した`generateMips`ができました。このサイトのどの例でも使用できます。コアモードと互換モードの両方で動作します。互換モードでは、キューブマップが必要な場合や、1層の2D配列が必要な場合は`viewDimension`を渡す必要があります。コアWebGPUでは、渡しても渡さなくてもかまいません。問題ありません。


# マイナーな制限と制約

以下は、*ほとんど*のプログラムが遭遇する可能性の低い制限と制約です。

*   ## カラーブレンディングは、すべてのカラーターゲットで一致する必要があります。

    コアでは、レンダーパイプラインを作成するときに、各カラーターゲットでブレンディング設定を指定できます。[ブレンディングと透明度に関する記事](webgpu-transparency.html)でブレンディング設定を使用しました。互換モードでは、単一のパイプライン内のすべてのカラーターゲットにわたるすべての設定が同じでなければなりません。

*   ## `copyTextureToBuffer`と`copyTextureToTexture`は、圧縮テクスチャでは機能しません。

*   ## `copyTextureToTexture`は、マルチサンプルテクスチャでは機能しません。

*   ## `cube-array`はサポートされていません。

*   ## テクスチャのビューは、単一の描画/ディスパッチ呼び出しでアスペクトまたはミップレベルが異なってはなりません。

    コアWebGPUでは、テクスチャの複数のテクスチャビューを異なるミップレベルに作成し、同じ描画呼び出しで使用できます。これは一般的ではありません。この制限は`TEXTURE_BINDING`の使用法、つまりバインドグループを介したテクスチャの使用に関するものであることに注意してください。上記のミップマップ生成コードで行ったように、`RENDER_ATTACHMENT`として別のビューを使用することはできます。

*   ## `@builtin(sample_mask)`と`@builtin(sample_index)`はサポートされていません。

*   ## `rg32uint`、`rg32sint`、`rg32float`テクスチャフォーマットは、ストレージテクスチャとして使用できません。

*   ## `depthClampBias`は0でなければなりません。

    これは、レンダーパイプラインを作成するときの設定です。

*   ## `@interpolation(linear)`と`@interpolation(..., sample)`はサポートされていません。

    これらは、[ステージ間変数に関する記事](webgpu-inter-stage-variables.html#a-interpolate)で簡単に触れました。

*   ## `@interpolate(flat)`と`@interpolate(flat, first)`はサポートされていません。

    互換モードでは、フラット補間が必要な場合は`@interpolate(flat, either)`を使用する必要があります。`either`は、フラグメントシェーダーに渡される値が、描画される三角形または線の最初または最後の頂点のいずれかの値になる可能性があることを意味します。

    これが問題にならないことは一般的です。頂点シェーダーからフラグメントシェーダーにフラット補間で何かを渡す最も一般的なユースケースは、通常、モデルごと、マテリアルごと、またはインスタンスごとのタイプの値です。たとえば、上記のミップマップ生成コードでは、`instance_index`をフラグメントシェーダーに渡すために上記のフラット補間を使用しました。これは三角形のすべての頂点で同じになるため、`@interpolate(flat, either)`で問題なく機能します。

*   ## テクスチャフォーマットは再解釈できません。

    コアWebGPUでは、`'rgba8unorm'`テクスチャを作成し、`'rgba8unorm-srgb'`テクスチャとして表示したり、その逆を行ったり、他の`'-srgb'`フォーマットとそれに対応する非`'-srgb'`フォーマットを表示したりできます。互換モードではこれは許可されていません。テクスチャを作成したフォーマットが、使用できる唯一のフォーマットです。

*   ## `bgra8unorm-srgb`はサポートされていません。

*   ## `rgba16float`および`r32float`テクスチャはマルチサンプリングできません。

*   ## すべての整数テクスチャフォーマットはマルチサンプリングできません。

*   ## `depthOrArrayLayers`は`textureBindingViewDimension`と互換性がなければなりません。

    これは、`textureBindingViewDimension: '2d'`とマークされたテクスチャは`depthOrArrayLayers: 1`（デフォルト）でなければならないことを意味します。`textureBindingViewDimension: 'cube'`とマークされたテクスチャは`depthOrArrayLayers: 6`でなければなりません。

*   ## `textureLoad`は深度テクスチャでは機能しません。

    「深度テクスチャ」とは、WGSLで`texture_depth`、`texture_depth_2d_array`、または`texture_depth_cube`で参照されるテクスチャです。これらは互換モードでは`textureLoad`で使用できません。ß

    一方、`textureLoad`は`texture_2d<f32>`、`texture_2d_array<f32>`、`texture_cube<f32>`で使用でき、深度フォーマットを持つテクスチャはこれらのバインディングにバインドできます。

*   ## 深度テクスチャは、非比較サンプラーでは使用できません。

    繰り返しになりますが、「深度テクスチャ」とは、WGSLで`texture_depth`、`texture_depth_2d_array`、または`texture_depth_cube`で参照されるテクスチャです。これらは互換モードでは非比較サンプラーでは使用できません。

    これは、事実上、`texture_depth`、`texture_depth_2d_array`、および`texture_depth_cube`は、互換モードでは`textureSampleCompare`、`textureSampleCompareLevel`、および`textureGatherCompare`でのみ使用できることを意味します。

    一方、深度フォーマットを使用するテクスチャを`texture_2d<f32>`、`texture_2d_array<f32>`、および`texture_cube<f32>`バインディングにバインドできます。ただし、非フィルタリングサンプラーを使用する必要があるという通常の制限に従います。

*   ## テクスチャとサンプラーの組み合わせはより制限されています。

    コアでは、16以上のテクスチャと16以上のサンプラーをバインドし、シェーダーで256以上のすべての組み合わせを使用できます。

    互換モードでは、単一のステージで合計16の組み合わせしか使用できません。

    実際のルールはもう少し複雑です。疑似コードで詳しく説明します。

    ```
    maxCombinationsPerStage =
       min(device.limits.maxSampledTexturesPerShaderStage, device.limits.maxSamplersPerShaderStage)
    for each stage of the pipeline:
      sum = 0
      for each texture binding in the pipeline layout which is visible to that stage:
        sum += max(1, number of texture sampler combos for that texture binding)
      for each external texture binding in the pipeline layout which is visible to that stage:
        sum += 1 // for LUT texture + LUT sampler
        sum += 3 * max(1, number of external_texture sampler combos) // for Y+U+V
      if sum > maxCombinationsPerStage
        generate a validation error.
    ```

*   ## 互換モードでは、一部のデフォルトの制限が低くなっています。

    | 制限                                | 互換  | コア      |
    | :---------------------------------- | ------: | --------: |
    | `maxColorAttachments`               |       4 |         8 |
    | `maxComputeInvocationsPerWorkgroup` |     128 |       256 |
    | `maxComputeWorkgroupSizeX`          |     128 |       256 |
    | `maxComputeWorkgroupSizeY`          |     128 |       256 |
    | `maxInterStageShaderVariables`      |      15 |        16 |
    | `maxTextureDimension1D`             |    4096 |      8192 |
    | `maxTextureDimension2D`             |    4096 |      8192 |
    | `maxUniformBufferBindingSize`       |   16384 |     65536 |
    | `maxVertexAttributes`        | 16<sup>a</sup> |        16 |

    (a) 互換モードでは、`@builtin(vertex_index)`および/または`@builtin(instance_index)`を使用すると、それぞれが属性としてカウントされます。

    もちろん、アダプターはこれらのいずれかに対してより高い制限をサポートしている場合があります。

*   ## 4つの新しい制限があります。

    *   `maxStorageBuffersInVertexStage`（デフォルト0）
    *   `maxStorageTexturesInVertexStage`（デフォルト0）
    *   `maxStorageBuffersInFragmentStage`（デフォルト4）
    *   `maxStorageTexturesInFragmentStage`（デフォルト4）

    他の制限と同様に、アダプターを要求するときにアダプターがサポートするものを確認し、必要に応じてデフォルトよりも高い値を要求できます。

    上記のように、約45％のデバイスは、頂点シェーダーで`0`のストレージバッファとストレージテクスチャをサポートしています。

# 互換モードからコアへのアップグレード

互換モードは、オプトインするように設計されています。上記の制限でアプリケーションを設計できる場合は、互換モードを要求します。そうでない場合は、デフォルトのコアを要求します。デバイスがコアを処理できない場合は、アダプターを返しません。

一方、アプリを互換モードで機能するように設計し、ユーザーがコアWebGPUをサポートするデバイスを持っている場合は、すべてのコア機能を利用することもできます。

これを行うには、互換モードアダプターを要求し、`core-features-and-limits`機能を確認して有効にします。アダプターに存在し、デバイスで要求した場合、デバイスはコアデバイスになり、上記の制限は適用されません。

例：

```js
const adapter = await navigator.gpu.requestAdapter({
  featureLevel: 'compatibility',
});
const hasCore = adapter.features.has('core-features-and-limits');
const device = await adapter.requestDevice({
  requiredFeatures: [
    ...(hasCore ? ['core-features-and-limits'] : []),
  ],
});
```

`hasCore`がtrueの場合、上記の制限と制約は適用されません。

デバイスがコアか互換かを確認したい他のコードは、デバイスの機能を確認する必要があることに注意してください。

```js
const isCore = device.features.has('core-features-and-limits');
```

これは、コアデバイスでは常にtrueになります。

> 注：2025年3月11日の時点で、一部のブラウザはまだWebGPUを完全にリリースしておらず、実装に`'core'features-and'limits'`を追加していません。まもなく更新されるはずです。

# 互換モードのテスト

互換モードをサポートするブラウザでは、（冒頭で行ったように）`'core-features-and-limits'`を要求せずに、アプリケーションが制限に従っていることをテストできます。制限と制約が適用されていることを確認できるように、実際に互換デバイスがあることを確認することをお勧めします。

```js
const adapter = await navigator.gpu.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter.requestDevice();

const isCompatibilityMode = !device.features.has('core-features-and-limits');
```

これは、アプリがこれらの古いデバイスで実行されるかどうかをテストする良い方法です。

> 注：2025年3月11日の時点で、一部のブラウザはまだWebGPUを完全にリリースしておらず、実装に`'core'features-and'limits'`を追加していません。まもなく更新されるはずです。
