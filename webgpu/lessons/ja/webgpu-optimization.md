Title: WebGPUの速度と最適化
Description: WebGPUで高速化する方法
TOC: 速度と最適化

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

このサイトのほとんどの例は、できるだけ理解しやすいように書かれています。つまり、それらは機能し、正しいですが、WebGPUで何かを行う最も効率的な方法を必ずしも示しているわけではありません。さらに、何をする必要があるかに応じて、無数の最適化の可能性があります。

この記事では、最も基本的な最適化のいくつかについて説明し、他のいくつかについても説明します。明確にするために、IMO、**通常、ここまでやる必要はありません。WebGPUを使用するネット上のほとんどの例は、数百のものを描画するため、これらの最適化から本当に恩恵を受けることはありません**。それでも、物事を高速化する方法を知っておくことは常に良いことです。

基本：**行う作業が少なく、WebGPUに依頼する作業が少ないほど、物事は速くなります。**

これまでのほとんどすべての例で、複数の形状を描画する場合、次の手順を実行しました。

* 初期化時：
   * 描画したいものごとに
      * ユニフォームバッファを作成します
      * そのバッファを参照するバインドグループを作成します

* レンダリング時：
   * エンコーダーとレンダーパスを開始します
   * 描画したいものごとに
      * このオブジェクトのユニフォーム値で型付き配列を更新します
      * このオブジェクトのユニフォームバッファに型付き配列をコピーします
      * 必要に応じて、パイプライン、頂点、インデックスバッファを設定します
      * このオブジェクトのバインドグループをバインドするコマンドをエンコードします
      * 描画するコマンドをエンコードします
   * レンダーパスを終了し、エンコーダーを終了し、コマンドバッファを送信します

上記のステップに従って最適化できる例を作成し、それを最適化できるようにしましょう。

注：これは偽の例です。多数のキューブを描画するだけであり、[ストレージバッファ](webgpu-storage-buffers.html#a-instancing)と[頂点バッファ](webgpu-vertex-buffers.html#a-instancing)に関する記事で説明した*インスタンス化*を使用して物事を確実に最適化できます。さまざまな種類のオブジェクトを大量に処理することでコードを乱雑にしたくありませんでした。インスタンス化は、プロジェクトが同じモデルを多数使用する場合に最適化するための優れた方法です。植物、木、岩、ゴミなどは、インスタンス化を使用して最適化されることがよくあります。他のモデルの場合、それは間違いなくあまり一般的ではありません。

たとえば、テーブルには4、6、または8つの椅子があり、それらの椅子を描画するためにインスタンス化を使用する方がおそらく高速ですが、描画する500以上のもののリストで、椅子が唯一の例外である場合、椅子をインスタンス化を使用するように整理するが、インスタンス化を使用する他の状況を見つけられない最適なデータ編成を考え出す努力は、おそらく価値がありません。

上記の段落の要点は、適切な場合にインスタンス化を使用することです。同じものを数百以上描画する場合は、インスタンス化がおそらく適切です。同じものを少数しか描画しない場合は、それらの少数のものを特別扱いする努力は、おそらく価値がありません。

いずれにせよ、これが私たちのコードです。一般的に使用してきた初期化コードがあります。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

次に、シェーダーモジュールを作成しましょう。

```js
  const module = device.createShaderModule({
    code: `
      struct Uniforms {
        normalMatrix: mat3x3f,
        viewProjection: mat4x4f,
        world: mat4x4f,
        color: vec4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = uni.viewProjection * uni.world * vert.position;

        // 法線を方向付け、フラグメントシェーダーに渡します
        vsOut.normal = uni.normalMatrix * vert.normal;

        // 表面のワールド位置を計算します
        let surfaceWorldPosition = (uni.world * vert.position).xyz;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;

        // テクスチャ座標をフラグメントシェーダーに渡します
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // vsOut.normalはステージ間変数であるため、
        // 補間されるため、単位ベクトルにはなりません。
        // 正規化すると、再び単位ベクトルになります。
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 法線と光への方向のドット積を
        // 取ることで光を計算します。
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件がfalseの場合の値
            pow(specular, uni.shininess),  // 条件がtrueの場合の値
            specular > 0.0);               // 条件

        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 色の部分（アルファではない）のみを
        // 光で乗算しましょう。
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

このシェーダーモジュールは、[他の場所で説明されているスペキュラハイライト付きの点光源](webgpu-lighting-point.html#a-specular)と同様のライティングを使用します。ほとんどの3Dモデルはテクスチャを使用するため、テクスチャを含めるのが最善だと思いました。テクスチャを色で乗算して、各キューブの色を調整できるようにします。そして、ライティングと[3Dでのキューブの投影](webgpu-perspective-projection.html)を行うために必要なすべてのユニフォーム値があります。

キューブのデータと、そのデータをバッファに入れる必要があります。

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;
```

レンダーパイプラインが必要です。

```js
  const pipeline = device.createRenderPipeline({
    label: 'textured model with point light w/specular highlight',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // position
        {
          arrayStride: 3 * 4, // 3 floats
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},
          ],
        },
        // normal
        {
          arrayStride: 3 * 4, // 3 floats
          attributes: [
            {shaderLocation: 1, offset: 0, format: 'float32x3'},
          ],
        },
        // uvs
        {
          arrayStride: 2 * 4, // 2 floats
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},
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

上記のパイプラインは、属性ごとに1つのバッファを使用します。1つは位置データ用、1つは法線データ用、1つはテクスチャ座標（UV）用です。裏向きの三角形をカリングし、深度テスト用の深度テクスチャを期待します。これらはすべて、他の記事で説明したものです。

色と乱数を作成するためのユーティリティをいくつか挿入しましょう。

```js
/** CSSカラー文字列が与えられた場合、0から255までの4つの値の配列を返します */
const cssColorToRGBA8 = (() => {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  return cssColor => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  };
})();

/** CSSカラー文字列が与えられた場合、0から1までの4つの値の配列を返します */
const cssColorToRGBA = cssColor => cssColorToRGBA8(cssColor).map(v => v / 255);

/**
 * 0から1の範囲の色相、彩度、輝度の値が与えられた場合、
 * 対応するCSS hsl文字列を返します
 */
const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;

/**
 * 0から1の範囲の色相、彩度、輝度の値が与えられた場合、
 * 0から1までの4つの値の配列を返します
 */
const hslToRGBA = (h, s, l) => cssColorToRGBA(hsl(h, s, l));

/**
 * minとmaxの間の乱数を返します。
 * minとmaxが指定されていない場合は、0から1を返します。
 * maxが指定されていない場合は、0からminを返します。
 */
function rand(min, max) {
  if (min === undefined) {
    max = 1;
    min = 0;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

/** ランダムな配列要素を選択します */
const randomArrayElement = arr => arr[Math.random() * arr.length | 0];
```

うまくいけば、それらはすべてかなり単純です。

次に、いくつかのテクスチャとサンプラーを作成しましょう。キャンバスを使用し、絵文字を描画し、[テクスチャのインポートに関する記事](webgpu-importing-textures.html)で記述した関数`createTextureFromSource`を使用して、そこからテクスチャを作成します。

```js
  const textures = [
    '😂', '👾', '👍', '👀', '🌞', '🛟',
  ].map(s => {
    const size = 128;
    const ctx = new OffscreenCanvas(size, size).getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${size * 0.9}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const m = ctx.measureText(s);
    ctx.fillText(
      s,
      (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
      (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
    );
    return createTextureFromSource(device, ctx.canvas, {mips: true});
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'nearest',
  });
```

マテリアル情報のセットを作成しましょう。他の場所ではこれを行っていませんが、一般的な設定です。Unity、Unreal、Blender、Three.js、Babylon.jsはすべて、*マテリアル*の概念を持っています。一般的に、マテリアルは、マテリアルの色、光沢、使用するテクスチャなどを保持します。

20個の「マテリアル」を作成し、各キューブにランダムにマテリアルを選択します。

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);
    materials.push({
      color,
      shininess,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

次に、描画したい各もの（キューブ）のデータを作成します。最大30000をサポートします。これまでと同様に、各オブジェクトにユニフォームバッファと、ユニフォーム値で更新できる型付き配列を作成します。また、各オブジェクトにバインドグループも作成します。そして、各オブジェクトを配置してアニメーション化するために使用できるランダムな値をいくつか選択します。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // float32インデックスでのさまざまなユニフォーム値へのオフセット
    const kNormalMatrixOffset = 0;
    const kViewProjectionOffset = 12;
    const kWorldOffset = 28;
    const kColorOffset = 44;
    const kLightWorldPositionOffset = 48;
    const kViewWorldPositionOffset = 52;
    const kShininessOffset = 55;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const viewProjectionValue = uniformValues.subarray(
        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
    const lightWorldPositionValue = uniformValues.subarray(
        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
    const viewWorldPositionValue = uniformValues.subarray(
        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
      viewProjectionValue,
      colorValue,
      lightWorldPositionValue,
      viewWorldPositionValue,
      shininessValue,

      axis,
      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

レンダリング時にレンダーパスを開始するために更新するレンダーパス記述子を事前に作成します。

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- レンダリング時に設定されます
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- レンダリング時に設定されます
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
```

描画するものの数を調整できるように、簡単なUIが必要です。

```js
  const settings = {
    numObjects: 1000,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
```

これで、レンダーループを記述できます。

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // 秒に変換します
    const deltaTime = time - then;
    then = time;


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

レンダーループ内で、レンダーパス記述子を更新します。また、深度テクスチャが存在しない場合、または持っているものがキャンバステクスチャとサイズが異なる場合は、深度テクスチャを作成します。これは、[3Dに関する記事](webgpu-orthographic-projection.html#a-depth-textures)で行いました。

```js
    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    // 深度テクスチャがない場合、またはそのサイズが
    // キャンバステクスチャと異なる場合は、新しい深度テクスチャを作成します。
    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      depthTexture?.destroy();
      depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;
```

コマンドバッファとレンダーパスを開始し、頂点バッファとインデックスバッファを設定します。

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setVertexBuffer(1, normalBuffer);
    pass.setVertexBuffer(2, texcoordBuffer);
    pass.setIndexBuffer(indicesBuffer, 'uint16');
```

次に、[遠近投影に関する記事](webgpu-perspective-projection.html)で説明したように、ビュー射影行列を計算します。

```js
+  const degToRad = d => d * Math.PI / 180;

  function render(time) {
    ...

+    const aspect = canvas.clientWidth / canvas.clientHeight;
+    const projection = mat4.perspective(
+        degToRad(60),
+        aspect,
+        1,      // zNear
+        2000,   // zFar
+    );
+
+    const eye = [100, 150, 200];
+    const target = [0, 0, 0];
+    const up = [0, 1, 0];
+
+    // ビュー行列を計算します
+    const viewMatrix = mat4.lookAt(eye, target, up);
+
+    // ビュー行列と射影行列を組み合わせます
+    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
```

これで、すべてのオブジェクトをループして描画できます。それぞれについて、すべてのユニフォーム値を更新し、ユニフォーム値をユニフォームバッファにコピーし、このオブジェクトのバインドグループをバインドし、描画する必要があります。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];

      // このオブジェクトのユニフォーム値にビュー射影行列をコピーします
      viewProjectionValue.set(viewProjectionMatrix);

      // ワールド行列を計算します
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 逆行列と転置行列をnormalMatrix値に変換します
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      // マテリアルの値をコピーします。
      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      // ユニフォーム値をユニフォームバッファにアップロードします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

> 「ワールド行列を計算する」というコードの部分は、あまり一般的ではありません。[シーングラフ](webgpu-scene-graphs.html)を持つ方が一般的ですが、それでは例がさらに乱雑になります。アニメーションを示す何かが必要だったので、何かをまとめました。

次に、パスを終了し、コマンドバッファを終了し、送信できます。

```js
+    pass.end();
+
+    const commandBuffer = encoder.finish();
+    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

あといくつかやることがあります。サイズ変更を追加しましょう。

```js
+  const canvasToSizeMap = new WeakMap();

  function render(time) {
    time *= 0.001;  // 秒に変換します
    const deltaTime = time - then;
    then = time;

+    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+
+    // キャンバスのサイズがすでにそのサイズである場合は、遅くなる可能性があるため、設定しないでください。
+    if (canvas.width !== width || canvas.height !== height) {
+      canvas.width = width;
+      canvas.height = height;
+    }

    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  +const observer = new ResizeObserver(entries => {
  +  entries.forEach(entry => {
  +    canvasToSizeMap.set(entry.target, {
  +      width: Math.max(1, Math.min(entry.contentBoxSize[0].inlineSize, device.limits.maxTextureDimension2D)),
  +      height: Math.max(1, Math.min(entry.contentBoxSize[0].blockSize, device.limits.maxTextureDimension2D)),
  +    });
  +  });
  +});
  +observer.observe(canvas);
```

タイミングも追加しましょう。[タイミングに関する記事](webgpu-timing.html)で作成した`NonNegativeRollingAverage`クラスと`TimingHelper`クラスを使用します。

```js
// https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html を参照してください
import TimingHelper from './resources/js/timing-helper.js';
// https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html を参照してください
import NonNegativeRollingAverage from './resources/js/non-negative-rolling-average.js';

const fpsAverage = new NonNegativeRollingAverage();
const jsAverage = new NonNegativeRollingAverage();
const gpuAverage = new NonNegativeRollingAverage();
const mathAverage = new NonNegativeRollingAverage();
```

次に、レンダリングコードの最初から最後までJavaScriptを計時します。

```js
  function render(time) {
    ...

+    const startTimeMs = performance.now();

    ...

+    const elapsedTimeMs = performance.now() - startTimeMs;
+    jsAverage.addSample(elapsedTimeMs);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

3D数学を行うJavaScriptの部分を計時します。

```js
  function render(time) {
    ...

+    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
+      const mathTimeStartMs = performance.now();

      // このオブジェクトのユニフォーム値にビュー射影行列をコピーします
      viewProjectionValue.set(viewProjectionMatrix);

      // ワールド行列を計算します
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 逆行列と転置行列をnormalMatrix値に変換します
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;
      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

+      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // ユニフォーム値をユニフォームバッファにアップロードします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
    jsAverage.addSample(elapsedTimeMs);
+    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

`requestAnimationFrame`コールバック間の時間を計時します。

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // 秒に変換します
    const deltaTime = time - then;
    then = time;

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
+    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

そして、レンダーパスを計時します。

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
-  const device = await adapter?.requestDevice();
+  const canTimestamp = adapter.features.has('timestamp-query');
+  const device = await adapter?.requestDevice({
+    requiredFeatures: [
+      ...(canTimestamp ? ['timestamp-query'] : []),
+     ],
+  });
  if (!device) {
    fail('could not init WebGPU');
  }

+  const timingHelper = new TimingHelper(device);

  ...

  function render(time) {
    ...

-    const pass = encoder.beginRenderPass(renderPassEncoder);
+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);

    ...

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

+    timingHelper.getResult().then(gpuTime => {
+      gpuAverage.addSample(gpuTime / 1000);
+    });

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

そして、タイミングを表示する必要があります。

```js
async function main() {
  ...

  const timingHelper = new TimingHelper(device);
+  const infoElem = document.querySelector('#info');

  ...

  function render(time) {
    ...

    timingHelper.getResult().then(gpuTime => {
      gpuAverage.addSample(gpuTime / 1000);
    });

    const elapsedTimeMs = performance.now() - startTimeMs;
    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);

+    infoElem.textContent = `\
+js  : ${jsAverage.get().toFixed(1)}ms
+math: ${mathAverage.get().toFixed(1)}ms
+fps : ${fpsAverage.get().toFixed(0)}
+gpu : ${canTimestamp ? `${(gpuAverage.get() / 1000).toFixed(1)}ms` : 'N/A'}
+`;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

もう1つ、より良い比較のために。現在抱えている問題は、表示されているすべてのキューブが、すべてのピクセルがレンダリングされるか、少なくともレンダリングする必要があるかどうかがチェックされることです。ピクセルのレンダリングを最適化するのではなく、WebGPU自体の使用を最適化しているため、1x1ピクセルのキャンバスに描画できると便利です。これにより、三角形のラスタライズに費やされる時間のほとんどが効果的に削除され、代わりに数学を行い、WebGPUと通信しているコードの部分のみが残ります。

したがって、それを行うオプションを追加しましょう。

```js
  const settings = {
    numObjects: 1000,
+    render: true,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
+  gui.add(settings, 'render');

  let depthTexture;
  let then = 0;
  let frameCount = 0;

  function render(time) {
    time *= 0.001;  // 秒に変換します
    const deltaTime = time - then;
    then = time;
    ++frameCount;

    const startTimeMs = performance.now();

-    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+    const {width, height} = settings.render
+       ? canvasToSizeMap.get(canvas) ?? canvas
+       : { width: 1, height: 1 };
```

これで、「レンダリング」のチェックを外すと、レンダリングのほとんどすべてが削除されます。

そして、これで、最初の「最適化されていない」例ができました。記事の冒頭近くにリストされている手順に従っており、機能します。

{{{example url="../webgpu-optimization-none.html"}}}

オブジェクトの数を増やして、フレームレートがいつ低下するかを確認してください。私の場合、M1 Macの75Hzモニターでは、フレームレートが低下する前に約8000個のキューブが得られました。

# <a id="a-mapped-on-creation"></a>最適化：作成時にマップ

上記の例と、このサイトのほとんどの例では、`writeBuffer`を使用してデータを頂点バッファまたはインデックスバッファにコピーしました。この特定のケースでは、非常にマイナーな最適化として、バッファを作成するときに`mappedAtCreation: true`を渡すことができます。これには2つの利点があります。

1. 新しいバッファにデータを入れるのがわずかに高速になります。

2. バッファの使用法に`GPUBufferUsage.COPY_DST`を追加する必要はありません。

   これは、後で`writeBuffer`またはバッファへのコピー関数のいずれかを使用してデータを変更しないことを前提としています。

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
-      usage: usage | GPUBufferUsage.COPY_DST,
+      usage: usage,
+      mappedAtCreation: true,
    });
-    device.queue.writeBuffer(buffer, 0, data);
+    const dst = new Uint8Array(buffer.getMappedRange());
+    dst.set(new Uint8Array(data.buffer));
+    buffer.unmap();
    return buffer;
  }
```

この最適化は作成時にのみ役立つため、レンダリング時のパフォーマンスには影響しないことに注意してください。

# <a id="a-pack-verts"></a>最適化：頂点をパックしてインターリーブする

上記の例では、位置、法線、テクスチャ座標の3つの属性があります。4〜6つの属性を持つのが一般的であり、[法線マッピング用の接線](webgpu-normal-mapping.html)と、[スキンモデル](webgpu-skinning.html)がある場合は、ウェイトとジョイントを追加します。

上記の例では、各属性は独自のバッファを使用しています。これは、CPUとGPUの両方で遅くなります。JavaScriptのCPUでは、描画したいモデルごとに各バッファに1回`setVertexBuffer`を呼び出す必要があるため、遅くなります。

キューブだけでなく、100個のモデルがあったと想像してください。描画するモデルを切り替えるたびに、最大6回`setVertexBuffer`を呼び出す必要があります。モデルごとに100 * 6回の呼び出し= 600回の呼び出しです。

「作業が少ないほど速くなる」というルールに従って、属性のデータを単一のバッファにマージした場合、モデルごとに1回`setVertexBuffer`を呼び出すだけで済みます。100回の呼び出しです。これは600％高速です！

GPUでは、メモリ内で一緒にあるものをロードする方が、メモリの異なる場所からロードするよりも通常高速です。したがって、単一のモデルの頂点データを単一のバッファに入れるだけでなく、データをインターリーブする方が良いです。

その変更を行いましょう。

```js
-  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
-  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
-  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
+  const vertexData = new Float32Array([
+  // 位置       法線        テクスチャ座標
+     1,  1, -1,     1,  0,  0,    1, 0,
+     1,  1,  1,     1,  0,  0,    0, 0,
+     1, -1,  1,     1,  0,  0,    0, 1,
+     1, -1, -1,     1,  0,  0,    1, 1,
+    -1,  1,  1,    -1,  0,  0,    1, 0,
+    -1,  1, -1,    -1,  0,  0,    0, 0,
+    -1, -1, -1,    -1,  0,  0,    0, 1,
+    -1, -1,  1,    -1,  0,  0,    1, 1,
+    -1,  1,  1,     0,  1,  0,    1, 0,
+     1,  1,  1,     0,  1,  0,    0, 0,
+     1,  1, -1,     0,  1,  0,    0, 1,
+    -1,  1, -1,     0,  1,  0,    1, 1,
+    -1, -1, -1,     0, -1,  0,    1, 0,
+     1, -1, -1,     0, -1,  0,    0, 0,
+     1, -1,  1,     0, -1,  0,    0, 1,
+    -1, -1,  1,     0, -1,  0,    1, 1,
+     1,  1,  1,     0,  0,  1,    1, 0,
+    -1,  1,  1,     0,  0,  1,    0, 0,
+    -1, -1,  1,     0,  0,  1,    0, 1,
+     1, -1,  1,     0,  0,  1,    1, 1,
+    -1,  1, -1,     0,  0, -1,    1, 0,
+     1,  1, -1,     0,  0, -1,    0, 0,
+     1, -1, -1,     0,  0, -1,    0, 1,
+    -1, -1, -1,     0,  0, -1,    1, 1,
+  ]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

-  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
-  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
-  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
+  const vertexBuffer = createBufferWithData(device, vertexData, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;

  const pipeline = device.createRenderPipeline({
    label: 'textured model with point light w/specular highlight',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
-        // position
-        {
-          arrayStride: 3 * 4, // 3 floats
-          attributes: [
-            {shaderLocation: 0, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // normal
-        {
-          arrayStride: 3 * 4, // 3 floats
-          attributes: [
-            {shaderLocation: 1, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // uvs
-        {
-          arrayStride: 2 * 4, // 2 floats
-          attributes: [
-            {shaderLocation: 2, offset: 0, format: 'float32x2'},
-          ],
-        },
+        {
+          arrayStride: (3 + 3 + 2) * 4, // 8 floats
+          attributes: [
+            {shaderLocation: 0, offset: 0 * 4, format: 'float32x3'}, // position
+            {shaderLocation: 1, offset: 3 * 4, format: 'float32x3'}, // normal
+            {shaderLocation: 2, offset: 6 * 4, format: 'float32x2'}, // texcoord
+          ],
+        },
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

  ...
-    pass.setVertexBuffer(0, positionBuffer);
-    pass.setVertexBuffer(1, normalBuffer);
-    pass.setVertexBuffer(2, texcoordBuffer);
+    pass.setVertexBuffer(0, vertexBuffer);
```

上記では、3つの属性すべてのデータを単一のバッファに入れ、レンダーパスを変更して、単一のバッファにインターリーブされたデータを期待するようにしました。

注：gLTFファイルを読み込んでいる場合は、頂点データが単一のバッファにインターリーブされるように事前に処理するか（最適）、読み込み時にデータをインターリーブするのが良いでしょう。

# 最適化：ユニフォームバッファを分割する（共有、マテリアル、モデルごと）

現在の例では、オブジェクトごとに1つのユニフォームバッファがあります。

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  viewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
};
```

`viewProjection`、`lightWorldPosition`、`viewWorldPosition`などのユニフォーム値の一部は共有できます。

これらをシェーダーで分割して、2つのユニフォームバッファを使用できます。1つは共有値用、もう1つは*オブジェクトごとの値*用です。

```wgsl
struct GlobalUniforms {
  viewProjection: mat4x4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
};
struct PerObjectUniforms {
  normalMatrix: mat3x3f,
  world: mat4x4f,
  color: vec4f,
  shininess: f32,
};
```

この変更により、`viewProjection`、`lightWorldPosition`、`viewWorldPosition`をすべてのユニフォームバッファにコピーする必要がなくなります。また、`device.queue.writeBuffer`でオブジェクトごとにコピーするデータも少なくなります。

新しいシェーダーは次のとおりです。

```js
  const module = device.createShaderModule({
    code: `
-      struct Uniforms {
-        normalMatrix: mat3x3f,
-        viewProjection: mat4x4f,
-        world: mat4x4f,
-        color: vec4f,
-        lightWorldPosition: vec3f,
-        viewWorldPosition: vec3f,
-        shininess: f32,
-      };

+      struct GlobalUniforms {
+        viewProjection: mat4x4f,
+        lightWorldPosition: vec3f,
+        viewWorldPosition: vec3f,
+      };
+      struct PerObjectUniforms {
+        normalMatrix: mat3x3f,
+        world: mat4x4f,
+        color: vec4f,
+        shininess: f32,
+      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
-      @group(0) @binding(2) var<uniform> uni: Uniforms;
+      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
+      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
-        vsOut.position = uni.viewProjection * uni.world * vert.position;
+        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // 法線を方向付け、フラグメントシェーダーに渡します
-        vsOut.normal = uni.normalMatrix * vert.normal;
+        vsOut.normal = obj.normalMatrix * vert.normal;

        // 表面のワールド位置を計算します
-        let surfaceWorldPosition = (uni.world * vert.position).xyz;
+        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
-        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
-        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // テクスチャ座標をフラグメントシェーダーに渡します
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // vsOut.normalはステージ間変数であるため、
        // 補間されるため、単位ベクトルにはなりません。
        // 正規化すると、再び単位ベクトルになります。
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 法線と光への方向のドット積を
        // 取ることで光を計算します。
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件がfalseの場合の値
-            pow(specular, uni.shininess),  // 条件がtrueの場合の値
+            pow(specular, obj.shininess),  // 条件がtrueの場合の値
            specular > 0.0);               // 条件

-        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 色の部分（アルファではない）のみを
        // 光で乗算しましょう。
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

グローバルユニフォーム用に1つのグローバルユニフォームバッファを作成する必要があります。

```js
  const globalUniformBufferSize = (16 + 4 + 4) * 4;
  const globalUniformBuffer = device.createBuffer({
    label: 'global uniforms',
    size: globalUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const globalUniformValues = new Float32Array(globalUniformBufferSize / 4);

  const kViewProjectionOffset = 0;
  const kLightWorldPositionOffset = 16;
  const kViewWorldPositionOffset = 20;

  const viewProjectionValue = globalUniformValues.subarray(
      kViewProjectionOffset, kViewProjectionOffset + 16);
  const lightWorldPositionValue = globalUniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = globalUniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
```

次に、これらのユニフォームをperObjectユニフォームバッファから削除し、グローバルユニフォームバッファを各オブジェクトのバインドグループに追加できます。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // float32インデックスでのさまざまなユニフォーム値へのオフセット
    const kNormalMatrixOffset = 0;
-    const kViewProjectionOffset = 12;
-    const kWorldOffset = 28;
-    const kColorOffset = 44;
-    const kLightWorldPositionOffset = 48;
-    const kViewWorldPositionOffset = 52;
-    const kShininessOffset = 55;
+    const kWorldOffset = 12;
+    const kColorOffset = 28;
+    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const viewProjectionValue = uniformValues.subarray(
-        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const lightWorldPositionValue = uniformValues.subarray(
-        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
-    const viewWorldPositionValue = uniformValues.subarray(
-        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
+        { binding: 3, resource: globalUniformBuffer },
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      viewProjectionValue,
      colorValue,
-      lightWorldPositionValue,
-      viewWorldPositionValue,
      shininessValue,
      material,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

次に、レンダリング時に、グローバルユニフォームバッファを一度だけ、オブジェクトのレンダリングループの外で更新します。

```js
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    // ビュー行列を計算します
    const viewMatrix = mat4.lookAt(eye, target, up);

    // ビュー行列と射影行列を組み合わせます
-    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
+    mat4.multiply(projection, viewMatrix, viewProjectionValue);
+
+    lightWorldPositionValue.set([-10, 30, 300]);
+    viewWorldPositionValue.set(eye);
+
+    device.queue.writeBuffer(globalUniformBuffer, 0, globalUniformValues);

    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        viewProjectionValue,
        colorValue,
-        lightWorldPositionValue,
-        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

-      // このオブジェクトのユニフォーム値にビュー射影行列をコピーします
-      viewProjectionValue.set(viewProjectionMatrix);

      // ワールド行列を計算します
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 逆行列と転置行列をnormalMatrix値に変換します
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;
      colorValue.set(color);
-      lightWorldPositionValue.set([-10, 30, 300]);
-      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // ユニフォーム値をユニフォームバッファにアップロードします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    pass.end();
```

これにより、WebGPUへの呼び出し回数は変更されませんでしたが、実際には1回追加されました。しかし、モデルごとに実行していた作業の多くが削減されました。

{{{example url="../webgpu-optimization-step3-global-vs-per-object-uniforms.html"}}}

私のマシンでは、その変更により、数学の部分が約16％減少しました。

# 最適化：さらに多くのユニフォームを分離する

3Dライブラリの一般的な構成は、「モデル」（頂点データ）、「マテリアル」（色、光沢、テクスチャ）、「ライト」（使用するライト）、「viewInfo」（ビューおよび射影行列）を持つことです。特に、この例では、`color`と`shininess`は決して変更されないため、フレームごとにユニフォームバッファにコピーし続けるのは無駄です。

マテリアルごとにユニフォームバッファを作成しましょう。初期化時にマテリアル設定をそれらにコピーし、バインドグループに追加します。

まず、別のユニフォームバッファを使用するようにシェーダーを変更しましょう。

```js
  const module = device.createShaderModule({
    code: `
      struct GlobalUniforms {
        viewProjection: mat4x4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
      };

+      struct MaterialUniforms {
+        color: vec4f,
+        shininess: f32,
+      };

      struct PerObjectUniforms {
        normalMatrix: mat3x3f,
        world: mat4x4f,
-        color: vec4f,
-        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;
+      @group(0) @binding(4) var<uniform> material: MaterialUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // 法線を方向付け、フラグメントシェーダーに渡します
        vsOut.normal = obj.normalMatrix * vert.normal;

        // 表面のワールド位置を計算します
        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // 表面から光へのベクトルを計算し、
        // フラグメントシェーダーに渡します
        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // テクスチャ座標をフラグメントシェーダーに渡します
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // vsOut.normalはステージ間変数であるため、
        // 補間されるため、単位ベクトルにはなりません。
        // 正規化すると、再び単位ベクトルになります。
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // 法線と光への方向のドット積を
        // 取ることで光を計算します。
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // 条件がfalseの場合の値
-            pow(specular, obj.shininess),  // 条件がtrueの場合の値
+            pow(specular, material.shininess),  // 条件がtrueの場合の値
            specular > 0.0);               // 条件

-        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = material.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // 色の部分（アルファではない）のみを
        // 光で乗算しましょう。
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

次に、マテリアルごとにユニフォームバッファを作成します。

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);

+    const materialValues = new Float32Array([
+      ...color,
+      shininess,
+      0, 0, 0,  // padding
+    ]);
+    const materialUniformBuffer = createBufferWithData(
+      device,
+      materialValues,
+      GPUBufferUsage.UNIFORM,
+    );

    materials.push({
-      color,
-      shininess,
+      materialUniformBuffer,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

オブジェクトごとの情報を設定するとき、マテリアル設定を渡す必要はもうありません。代わりに、マテリアルのユニフォームバッファをオブジェクトのバインドグループに追加するだけです。

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // float32インデックスでのさまざまなユニフォーム値へのオフセット
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;
-    const kColorOffset = 28;
-    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
-    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const shininessValue = uniformValues.subarray(
-        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer },
        { binding: 3, resource: globalUniformBuffer },
+        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      colorValue,
-      shininessValue,

      axis,
-      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

また、レンダリング時にこれらのものを処理する必要はもうありません。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        colorValue,
-        shininessValue,

        axis,
-        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // ワールド行列を計算します
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 逆行列と転置行列をnormalMatrix値に変換します
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

-      const {color, shininess} = material;
-      colorValue.set(color);
-      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // ユニフォーム値をユニフォームバッファにアップロードします
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

{{{example url="../webgpu-optimization-step4-material-uniforms.html"}}}

# 最適化：バッファオフセット付きの1つの大きなユニフォームバッファを使用する

現在、各オブジェクトには独自のユニフォームバッファがあります。レンダリング時に、各オブジェクトについて、そのオブジェクトのユニフォーム値で型付き配列を更新し、`device.queue.writeBuffer`を呼び出してその単一のユニフォームバッファの値を更新します。8000個のオブジェクトをレンダリングしている場合、`device.queue.writeBuffer`への呼び出しは8000回になります。

代わりに、1つの大きなユニフォームバッファを作成できます。次に、各オブジェクトのバインドグループを設定して、大きなバッファの独自の部分を使用するようにできます。レンダリング時に、1つの大きな型付き配列ですべてのオブジェクトのすべての値を更新し、`device.queue.writeBuffer`を1回だけ呼び出すことができます。これにより、高速になるはずです。

まず、大きなユニフォームバッファと大きな型付き配列を割り当てましょう。ユニフォームバッファのオフセットには、デフォルトで256バイトの最小アライメントがあるため、オブジェクトごとに必要なサイズを256バイトに切り上げます。

```js
+/** vをアライメントの倍数に切り上げます */
+const roundUp = (v, alignment) => Math.ceil(v / alignment) * alignment;

  ...

+  const uniformBufferSize = (12 + 16) * 4;
+  const uniformBufferSpace = roundUp(uniformBufferSize, device.limits.minUniformBufferOffsetAlignment);
+  const uniformBuffer = device.createBuffer({
+    label: 'uniforms',
+    size: uniformBufferSpace * maxObjects,
+    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+  });
+  const uniformValues = new Float32Array(uniformBuffer.size / 4);
```

これで、オブジェクトごとのビューを変更して、その大きな型付き配列にビューを作成できます。また、バインドグループを設定して、大きなユニフォームバッファの正しい部分を使用するようにすることもできます。

```js
  for (let i = 0; i < maxObjects; ++i) {
+    const uniformBufferOffset = i * uniformBufferSpace;
+    const f32Offset = uniformBufferOffset / 4;

    // float32インデックスでのさまざまなユニフォーム値へのオフセット
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;

-    const normalMatrixValue = uniformValues.subarray(
-        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        kWorldOffset, kWorldOffset + 16);
+    const normalMatrixValue = uniformValues.subarray(
+        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+    const worldValue = uniformValues.subarray(
+        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
-        { binding: 2, resource: uniformBuffer },
+        {
+          binding: 2,
+          resource: {
+            buffer: uniformBuffer,
+            offset: uniformBufferOffset,
+            size: uniformBufferSize,
+          },
+        },
        { binding: 3, resource: globalUniformBuffer },
        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      uniformBuffer,
-      uniformValues,

      normalMatrixValue,
      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

レンダリング時に、すべてのオブジェクトの値を更新し、`device.queue.writeBuffer`を1回だけ呼び出します。

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
-        uniformBuffer,
-        uniformValues,
        normalMatrixValue,
        worldValue,

        axis,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // ワールド行列を計算します
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // 逆行列と転置行列をnormalMatrix値に変換します
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

-      // ユニフォーム値をユニフォームバッファにアップロードします
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

+    // すべてのユニフォーム値をユニフォームバッファにアップロードします
+    if (settings.numObjects) {
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
+    }

    pass.end();
```

{{{example url="../webgpu-optimization-step5-use-buffer-offsets.html"}}}

私のマシンでは、JavaScriptの時間が40％短縮されました！

# 最適化：マップされたバッファを使用する

`device.queue.writeBuffer`を呼び出すと、WebGPUは型付き配列のデータのコピーを作成します。そのデータをGPUプロセス（セキュリティのためにGPUと通信する別のプロセス）にコピーします。GPUプロセスでは、そのデータがGPUバッファにコピーされます。

代わりにマップされたバッファを使用することで、これらのコピーの1つをスキップできます。バッファをマップし、ユニフォーム値をそのマップされたバッファに直接更新します。次に、バッファのマップを解除し、`copyBufferToBuffer`コマンドを発行してユニフォームバッファにコピーします。これにより、コピーが1つ節約されます。

WebGPUのマッピングは非同期に行われるため、バッファをマップして準備ができるのを待つのではなく、すでにマップされているバッファの配列を保持します。各フレームで、すでにマップされているバッファを取得するか、すでにマップされている新しいバッファを作成します。レンダリング後、利用可能になったときにバッファをマップし、すでにマップされているバッファのリストに戻すコールバックを設定します。こうすることで、マップされたバッファを待つ必要がなくなります。

まず、マップされたバッファの配列と、事前にマップされたバッファを取得するか、新しいバッファを作成する関数を作成します。

```js
  const mappedTransferBuffers = [];
  const getMappedTransferBuffer = () => {
    return mappedTransferBuffers.pop() || device.createBuffer({
      label: 'transfer buffer',
      size: uniformBufferSpace * maxObjects,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
  };
```

バッファをマッピングすると新しい`ArrayBuffer`が返されるため、型付き配列ビューを事前に作成することはできません。したがって、マッピング後に新しい型付き配列ビューを作成する必要があります。

```js
+  // float32インデックスでのさまざまなユニフォーム値へのオフセット
+  const kNormalMatrixOffset = 0;
+  const kWorldOffset = 12;

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferOffset = i * uniformBufferSpace;
-    const f32Offset = uniformBufferOffset / 4;
-
-    // float32インデックスでのさまざまなユニフォーム値へのオフセット
-    const kNormalMatrixOffset = 0;
-    const kWorldOffset = 12;
-
-    const normalMatrixValue = uniformValues.subarray(
-        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);
-    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: { buffer: uniformBuffer, offset: uniformBufferOffset, size: uniformBufferSize }},
        { binding: 3, resource: globalUniformBuffer },
        { binding: 4, resource: { buffer: material.materialUniformBuffer }},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      normalMatrixValue,
-      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

レンダリング時に、オブジェクトのループを開始する前に、転送バッファをユニフォームバッファにコピーするコマンドをエンコードします。これは、`copyBufferToBuffer`コマンドが`GPUCommandEncoder`のコマンドであるためです。オブジェクトがレンダリングされる前に実行する必要がありますが、オブジェクトをループ処理するときに、それらをレンダリングするためのレンダーパスコマンドをエンコードしています。以前は、型付き配列を更新した後に`device.queue.writeBuffer`を呼び出しました。もちろん、コマンドでまだ`submit`を呼び出していないため、これは最初に実行されます。ただし、この場合、コピーは実際にはコマンドであるため、描画コマンドの前にエンコードする必要があります。これは、コピーがまだ行われていないため、転送バッファをまだ更新できるため、問題ありません。


```js
    const encoder = device.createCommandEncoder();
-    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
-    pass.setPipeline(pipeline);
-    pass.setVertexBuffer(0, vertexBuffer);
-    pass.setIndexBuffer(indicesBuffer, 'uint16');

    ...

    let mathElapsedTimeMs = 0;

+    const transferBuffer = getMappedTransferBuffer();
+    const uniformValues = new Float32Array(transferBuffer.getMappedRange());

+    // 転送バッファからユニフォームバッファにユニフォーム値をコピーします
+    if (settings.numObjects) {
+      // これは、後で発生するコマンドをエンコードしているだけであることを忘れないでください。
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      encoder.copyBufferToBuffer(transferBuffer, 0, uniformBuffer, 0, size);
+    }

+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
+    pass.setPipeline(pipeline);
+    pass.setVertexBuffer(0, vertexBuffer);
```