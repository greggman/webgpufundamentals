Title: WebGPU 正射影
Description: 正射影（遠近法なし）
TOC: 正射影

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

この記事は、3D数学について学ぶことを目的とした一連の記事の5番目です。各記事は前のレッスンを基にしているので、順番に読むと最も理解しやすいかもしれません。

1. [平行移動](webgpu-translation.html)
2. [回転](webgpu-rotation.html)
3. [スケーリング](webgpu-scale.html)
4. [行列演算](webgpu-matrix-math.html)
5. [正射影](webgpu-orthographic-projection.html) ⬅ ここです
6. [透視投影](webgpu-perspective-projection.html)
7. [カメラ](webgpu-cameras.html)
8. [行列スタック](webgpu-matrix-stacks.html)
9. [シーングラフ](webgpu-scene-graphs.html)

前回の投稿では、行列がどのように機能するかについて説明しました。平行移動、回転、スケーリング、さらにはピクセルからクリップ空間への射影まで、すべて1つの行列といくつかの魔法の行列演算で実行できることについて話しました。3Dを行うには、そこからほんの少しのステップです。

前の2Dの例では、3x3行列で乗算した2D点（x、y）がありました。3Dを行うには、3D点（x、y、z）と4x4行列が必要です。

最後の例を取り上げて、3Dに変更しましょう。もう一度Fを使用しますが、今回は3Dの「F」です。

最初に行う必要があるのは、頂点シェーダーを3Dを処理するように変更することです。これが古い頂点シェーダーです。

```wgsl
struct Uniforms {
  color: vec4f,
-  matrix: mat3x3f,
+  matrix: mat4x4f,
};

struct Vertex {
-  @location(0) position: vec2f,
+  @location(0) position: vec4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
-
-  let clipSpace = (uni.matrix * vec3f(vert.position, 1)).xy;
-  vsOut.position = vec4f(clipSpace, 0.0, 1.0);
  vsOut.position = uni.matrix * vert.position;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return uni.color;
}
```

さらに単純になりました！2Dで`x`と`y`を指定し、`z`を1に設定したように、3Dでは`x`、`y`、`z`を指定し、`w`が1である必要がありますが、属性の`w`がデフォルトで1であるという事実を利用できます。

次に、3Dデータを提供する必要があります。

```js
function createFVertices() {
  const vertexData = new Float32Array([
    // 左列
*    0, 0, 0,
*    30, 0, 0,
*    0, 150, 0,
*    30, 150, 0,

    // 上の横木
*    30, 0, 0,
*    100, 0, 0,
*    30, 30, 0,
*    100, 30, 0,

    // 中間の横木
*    30, 60, 0,
*    70, 60, 0,
*    30, 90, 0,
*    70, 90, 0,
  ]);

  const indexData = new Uint32Array([
    0,  1,  2,    2,  1,  3,  // 左列
    4,  5,  6,    6,  5,  7,  // 上の横木
    8,  9, 10,   10,  9, 11,  // 中間の横木
  ]);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length,
  };
}
```

上記では、各行の末尾に` 0,`を追加しただけです。

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (2) * 4, // (2) floats, 4 bytes each
+          arrayStride: (3) * 4, // (3) floats, 4 bytes each
          attributes: [
-            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
+            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

次に、すべての行列演算を2Dから3Dに変更する必要があります。

<div class="webgpu_center compare" style="align-items: end;">
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">1</td>
          <td class="m12">0</td>
          <td class="m13">tx</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">1</td>
          <td class="m23">ty</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">1</td>
        </tr>
      </table>
    </div>
    <div>2D平行移動行列</div>
  </div>
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">1</td>
          <td class="m12">0</td>
          <td class="m13">0</td>
          <td class="m14">tx</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">1</td>
          <td class="m23">0</td>
          <td class="m24">ty</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">1</td>
          <td class="m34">tz</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </table>
    </div>
    <div>3D平行移動行列</div>
  </div>
</div>

<div class="webgpu_center compare" style="align-items: end;">
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">c</td>
          <td class="m12">-s</td>
          <td class="m13">0</td>
        </tr>
        <tr>
          <td class="m21">s</td>
          <td class="m22">c</td>
          <td class="m23">0</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">1</td>
        </tr>
      </table>
    </div>
    <div>2D回転行列</div>
  </div>
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">c</td>
          <td class="m12">-s</td>
          <td class="m13">0</td>
          <td class="m14">0</td>
        </tr>
        <tr>
          <td class="m21">s</td>
          <td class="m22">c</td>
          <td class="m23">0</td>
          <td class="m24">0</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">1</td>
          <td class="m34">0</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </table>
    </div>
    <div>3D回転Z行列</div>
  </div>
</div>

<div class="webgpu_center compare" style="align-items: end;">
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">sx</td>
          <td class="m12">0</td>
          <td class="m13">0</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">sy</td>
          <td class="m23">0</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">1</td>
        </tr>
      </table>
    </div>
    <div>2Dスケーリング行列</div>
  </div>
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">sx</td>
          <td class="m12">0</td>
          <td class="m13">0</td>
          <td class="m14">0</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">sy</td>
          <td class="m23">0</td>
          <td class="m24">0</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">0</td>
          <td class="m33">sz</td>
          <td class="m34">0</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </table>
    </div>
    <div>3Dスケーリング行列</div>
  </div>
</div>

XおよびY回転行列も作成できます。

<div class="webgpu_center compare" style="align-items: end;">
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">1</td>
          <td class="m12">0</td>
          <td class="m13">0</td>
          <td class="m14">0</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">c</td>
          <td class="m23">-s</td>
          <td class="m24">0</td>
        </tr>
        <tr>
          <td class="m31">0</td>
          <td class="m32">s</td>
          <td class="m33">c</td>
          <td class="m34">0</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </table>
    </div>
    <div>3D回転X行列</div>
  </div>
  <div>
    <div class="glocal-center">
      <table class="glocal-center-content glocal-mat">
        <tr>
          <td class="m11">c</td>
          <td class="m12">0</td>
          <td class="m13">s</td>
          <td class="m14">0</td>
        </tr>
        <tr>
          <td class="m21">0</td>
          <td class="m22">1</td>
          <td class="m23">0</td>
          <td class="m24">0</td>
        </tr>
        <tr>
          <td class="m31">-s</td>
          <td class="m32">0</td>
          <td class="m33">c</td>
          <td class="m34">0</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </table>
    </div>
    <div>3D回転Y行列</div>
  </div>
</div>

これで3つの回転行列ができました。2Dでは、事実上Z軸を中心にしか回転していなかったので、1つしか必要ありませんでした。しかし、3Dを行うには、X軸とY軸を中心に回転できる必要もあります。それらを見ると、すべて非常によく似ていることがわかります。それらを計算すると、以前と同じように単純化されることがわかります。

Z回転

<div class="webgpu_center"><pre class="webgpu_math">
newX = x * c + y * -s;
newY = x * s + y *  c;
</pre></div>

Y回転

<div class="webgpu_center"><pre class="webgpu_math">
newX = x *  c + z * s;
newZ = x * -s + z * c;
</pre></div>

X回転

<div class="webgpu_center"><pre class="webgpu_math">
newY = y * c + z * -s;
newZ = y * s + z *  c;
</pre></div>

これにより、これらの回転が得られます。

<iframe class="external_diagram" src="resources/axis-diagram.html" style="width: 540px; height: 280px;"></iframe>

これは、`mat3.translation`、`mat3.rotation`、`mat3.scaling`の2D（以前の）バージョンです。

```js
const mat3 = {
  ...
  translation([tx, ty], dst) {
    dst = dst || new Float32Array(12);
    dst[0] = 1;   dst[1] = 0;   dst[2] = 0;
    dst[4] = 0;   dst[5] = 1;   dst[6] = 0;
    dst[8] = tx;  dst[9] = ty;  dst[10] = 1;
    return dst;
  },

  rotation(angleInRadians, dst) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    dst = dst || new Float32Array(12);
    dst[0] = c;   dst[1] = s;  dst[2] = 0;
    dst[4] = -s;  dst[5] = c;  dst[6] = 0;
    dst[8] = 0;   dst[9] = 0;  dst[10] = 1;
    return dst;

  },

  scaling([sx, sy], dst) {
    dst = dst || new Float32Array(12);
    dst[0] = sx;  dst[1] = 0;   dst[2] = 0;
    dst[4] = 0;   dst[5] = sy;  dst[6] = 0;
    dst[8] = 0;   dst[9] = 0;   dst[10] = 1;
    return dst;
  },
  ...
```

そして、更新された3Dバージョンは次のとおりです。

```js
const mat4 = {
  ...
  translation([tx, ty, tz], dst) {
    dst = dst || new Float32Array(16);
    dst[ 0] = 1;   dst[ 1] = 0;   dst[ 2] = 0;   dst[ 3] = 0;
    dst[ 4] = 0;   dst[ 5] = 1;   dst[ 6] = 0;   dst[ 7] = 0;
    dst[ 8] = 0;   dst[ 9] = 0;   dst[10] = 1;   dst[11] = 0;
    dst[12] = tx;  dst[13] = ty;  dst[14] = tz;  dst[15] = 1;
    return dst;
  },

  rotationX(angleInRadians, dst) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    dst = dst || new Float32Array(16);
    dst[ 0] = 1;  dst[ 1] = 0;   dst[ 2] = 0;  dst[ 3] = 0;
    dst[ 4] = 0;  dst[ 5] = c;   dst[ 6] = s;  dst[ 7] = 0;
    dst[ 8] = 0;  dst[ 9] = -s;  dst[10] = c;  dst[11] = 0;
    dst[12] = 0;  dst[13] = 0;   dst[14] = 0;  dst[15] = 1;
    return dst;
  },

  rotationY(angleInRadians, dst) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    dst = dst || new Float32Array(16);
    dst[ 0] = c;  dst[ 1] = 0;  dst[ 2] = -s;  dst[ 3] = 0;
    dst[ 4] = 0;  dst[ 5] = 1;  dst[ 6] = 0;   dst[ 7] = 0;
    dst[ 8] = s;  dst[ 9] = 0;  dst[10] = c;   dst[11] = 0;
    dst[12] = 0;  dst[13] = 0;  dst[14] = 0;   dst[15] = 1;
    return dst;
  },

  rotationZ(angleInRadians, dst) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    dst = dst || new Float32Array(16);
    dst[ 0] = c;   dst[ 1] = s;  dst[ 2] = 0;  dst[ 3] = 0;
    dst[ 4] = -s;  dst[ 5] = c;  dst[ 6] = 0;  dst[ 7] = 0;
    dst[ 8] = 0;   dst[ 9] = 0;  dst[10] = 1;  dst[11] = 0;
    dst[12] = 0;   dst[13] = 0;  dst[14] = 0;   dst[15] = 1;
    return dst;
  },

  scaling([sx, sy, sz], dst) {
    dst = dst || new Float32Array(16);
    dst[ 0] = sx;  dst[ 1] = 0;   dst[ 2] = 0;    dst[ 3] = 0;
    dst[ 4] = 0;   dst[ 5] = sy;  dst[ 6] = 0;    dst[ 7] = 0;
    dst[ 8] = 0;   dst[ 9] = 0;   dst[10] = sz;   dst[11] = 0;
    dst[12] = 0;   dst[13] = 0;   dst[14] = 0;    dst[15] = 1;
    return dst;
  },
  ...
```

同様に、単純化された関数を作成します。これは2Dのものです。

```js
  translate(m, translation, dst) {
    return mat3.multiply(m, mat3.translation(translation), dst);
  },

  rotate(m, angleInRadians, dst) {
    return mat3.multiply(m, mat3.rotation(angleInRadians), dst);
  },

  scale(m, scale, dst) {
    return mat3.multiply(m, mat3.scaling(scale), dst);
  },
```

そして、3Dのものです。`mat4`と名付け、さらに2つの回転関数を追加した以外は、あまり変更はありません。

```js
  translate(m, translation, dst) {
    return mat4.multiply(m, mat4.translation(translation), dst);
  },

  rotateX(m, angleInRadians, dst) {
    return mat4.multiply(m, mat4.rotationX(angleInRadians), dst);
  },

  rotateY(m, angleInRadians, dst) {
    return mat4.multiply(m, mat4.rotationY(angleInRadians), dst);
  },

  rotateZ(m, angleInRadians, dst) {
    return mat4.multiply(m, mat4.rotationZ(angleInRadians), dst);
  },

  scale(m, scale, dst) {
    return mat4.scaling(m, mat4.scaling(scale), dst);
  },
  ...
```

そして、4x4行列の乗算関数が必要です。

```js
  multiply(a, b, dst) {
    dst = dst || new Float32Array(16);
    const b00 = b[0 * 4 + 0];
    const b01 = b[0 * 4 + 1];
    const b02 = b[0 * 4 + 2];
    const b03 = b[0 * 4 + 3];
    const b10 = b[1 * 4 + 0];
    const b11 = b[1 * 4 + 1];
    const b12 = b[1 * 4 + 2];
    const b13 = b[1 * 4 + 3];
    const b20 = b[2 * 4 + 0];
    const b21 = b[2 * 4 + 1];
    const b22 = b[2 * 4 + 2];
    const b23 = b[2 * 4 + 3];
    const b30 = b[3 * 4 + 0];
    const b31 = b[3 * 4 + 1];
    const b32 = b[3 * 4 + 2];
    const b33 = b[3 * 4 + 3];
    const a00 = a[0 * 4 + 0];
    const a01 = a[0 * 4 + 1];
    const a02 = a[0 * 4 + 2];
    const a03 = a[0 * 4 + 3];
    const a10 = a[1 * 4 + 0];
    const a11 = a[1 * 4 + 1];
    const a12 = a[1 * 4 + 2];
    const a13 = a[1 * 4 + 3];
    const a20 = a[2 * 4 + 0];
    const a21 = a[2 * 4 + 1];
    const a22 = a[2 * 4 + 2];
    const a23 = a[2 * 4 + 3];
    const a30 = a[3 * 4 + 0];
    const a31 = a[3 * 4 + 1];
    const a32 = a[3 * 4 + 2];
    const a33 = a[3 * 4 + 3];

    dst[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    dst[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    dst[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    dst[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

    dst[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    dst[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    dst[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    dst[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;

    dst[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    dst[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

    dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

    return dst;
  },
```

また、射影関数を更新する必要があります。これが古いものです。

```js
  projection(width, height, dst) {
    // 注：この行列はY軸を反転させるため、0が上になります。
    dst = dst || new Float32Array(12);
    dst[0] = 2 / width;  dst[1] = 0;             dst[2] = 0;
    dst[4] = 0;          dst[5] = -2 / height;   dst[6] = 0;
    dst[8] = -1;         dst[9] = 1;             dst[10] = 1;
    return dst;
  },
```

これは、ピクセルからクリップ空間に変換しました。3Dに拡張する最初の試みとして、次のように試してみましょう。


```js
  projection(width, height, depth, dst) {
    // 注：この行列はY軸を反転させるため、0が上になります。
    dst = dst || new Float32Array(16);
    dst[ 0] = 2 / width;  dst[ 1] = 0;            dst[ 2] = 0;          dst[ 3] = 0;
    dst[ 4] = 0;          dst[ 5] = -2 / height;  dst[ 6] = 0;          dst[ 7] = 0;
    dst[ 8] = 0;          dst[ 9] = 0;            dst[10] = 0.5 / depth;  dst[11] = 0;
    dst[12] = -1;         dst[13] = 1;            dst[14] = 0.5;          dst[15] = 1;
    return dst;
  },
```

XとYでピクセルからクリップ空間に変換する必要があったように、Zでも同じことを行う必要があります。この場合、Z軸も「ピクセル単位」にしていますか？`depth`に`width`と同様の値を渡すので、空間は幅0から`width`ピクセル、高さ0から`height`ピクセルになりますが、`depth`の場合は`-depth / 2`から`+depth / 2`になります。

ユニフォームに4x4行列を提供する必要があります。

```js
  // 色、行列
-  const uniformBufferSize = (4 + 12) * 4;
+  const uniformBufferSize = (4 + 16) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // float32インデックスでのさまざまなユニフォーム値へのオフセット
  const kColorOffset = 0;
  const kMatrixOffset = 4;

  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-  const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 12);
+  const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
```

そして、行列を計算するコードを更新する必要があります。

```js
 const settings = {
-    translation: [150, 100],
-    rotation: degToRad(30),
-    scale: [1, 1],
+    translation: [45, 100, 0],
+    rotation: [degToRad(40), degToRad(25), degToRad(325)],
+    scale: [1, 1, 1],
  };

  ...

  function render() {
    ...

-    mat3.projection(canvas.clientWidth, canvas.clientHeight, matrixValue);
-    mat3.translate(matrixValue, settings.translation, matrixValue);
-    mat3.rotate(matrixValue, settings.rotation, matrixValue);
-    mat3.scale(matrixValue, settings.scale, matrixValue);
+    mat4.projection(canvas.clientWidth, canvas.clientHeight, 400, matrixValue);
+    mat4.translate(matrixValue, settings.translation, matrixValue);
+    mat4.rotateX(matrixValue, settings.rotation[0], matrixValue);
+    mat4.rotateY(matrixValue, settings.rotation[1], matrixValue);
+    mat4.rotateZ(matrixValue, settings.rotation[2], matrixValue);
+    mat4.scale(matrixValue, settings.scale, matrixValue);
```

{{{example url="../webgpu-orthographic-projection-step-1-flat-f.html"}}}

最初の問題は、データが平らなFであるため、3Dであることがわかりにくいことです。これを修正するには、データを3Dに拡張しましょう。現在のFは、それぞれ2つの三角形の3つの長方形で構成されています。3Dにするには、合計16個の長方形が必要です。前面に3つ、背面に3つ、左側に1つ、右側に4つ、上面に2つ、下面に3つです。

<img class="webgpu_center noinvertdark" style="width: 400px;" src="resources/3df.svg" />

現在のすべての頂点位置を取得して複製し、Z方向に移動してから、それらをすべてインデックスで接続するだけです。

```js
function createFVertices() {
  const vertexData = new Float32Array([
    // 左列
    0, 0, 0,
    30, 0, 0,
    0, 150, 0,
    30, 150, 0,

    // 上の横木
    30, 0, 0,
    100, 0, 0,
    30, 30, 0,
    100, 30, 0,

    // 中間の横木
    30, 60, 0,
    70, 60, 0,
    30, 90, 0,
    70, 90, 0,

+    // 左列の裏
+    0, 0, 30,
+    30, 0, 30,
+    0, 150, 30,
+    30, 150, 30,
+
+    // 上の横木の裏
+    30, 0, 30,
+    100, 0, 30,
+    30, 30, 30,
+    100, 30, 30,
+
+    // 中間の横木の裏
+    30, 60, 30,
+    70, 60, 30,
+    30, 90, 30,
+    70, 90, 30,
-  ]);
+  ];

-  const indexData = new Uint32Array([
+  const indices = [
    // 前面
    0,  1,  2,    2,  1,  3,  // 左列
    4,  5,  6,    6,  5,  7,  // 上の横木
    8,  9, 10,   10,  9, 11,  // 中間の横木

    // 背面
+    12,  13,  14,   14, 13, 15,  // 左列の裏
+    16,  17,  18,   18, 17, 19,  // 上の横木の裏
+    20,  21,  22,   22, 21, 23,  // 中間の横木の裏
+
+    0, 5, 12,   12, 5, 17,   // 上
+    5, 7, 17,   17, 7, 19,   // 上の横木の右
+    6, 7, 18,   18, 7, 19,   // 上の横木の下
+    6, 8, 18,   18, 8, 20,   // 上と中間の横木の間
+    8, 9, 20,   20, 9, 21,   // 中間の横木の上
+    9, 11, 21,  21, 11, 23,  // 中間の横木の右
+    10, 11, 22, 22, 11, 23,  // 中間の横木の下
+    10, 3, 22,  22, 3, 15,   // 幹の右
+    2, 3, 14,   14, 3, 15,   // 下
+    0, 2, 12,   12, 2, 14,   // 左
-  ]);
+  ];

+  const quadColors = [
+      200,  70, 120,  // 左列前面
+      200,  70, 120,  // 上の横木前面
+      200,  70, 120,  // 中間の横木前面
+
+       80,  70, 200,  // 左列背面
+       80,  70, 200,  // 上の横木背面
+       80,  70, 200,  // 中間の横木背面
+
+       70, 200, 210,  // 上
+      160, 160, 220,  // 上の横木右
+       90, 130, 110,  // 上の横木下
+      200, 200,  70,  // 上と中間の横木の間
+      210, 100,  70,  // 中間の横木の上
+      210, 160,  70,  // 中間の横木の右
+       70, 180, 210,  // 中間の横木の下
+      100,  70, 210,  // 幹の右
+       76, 210, 100,  // 下
+      140, 210,  80,  // 左
+  ];
+
+  const numVertices = indices.length;
+  const vertexData = new Float32Array(numVertices * 4); // xyz + color
+  const colorData = new Uint8Array(vertexData.buffer);
+
+  for (let i = 0; i < indices.length; ++i) {
+    const positionNdx = indices[i] * 3;
+    const position = positions.slice(positionNdx, positionNdx + 3);
+    vertexData.set(position, i * 4);
+
+    const quadNdx = (i / 6 | 0) * 3;
+    const color = quadColors.slice(quadNdx, quadNdx + 3);
+    colorData.set(color, i * 16 + 12);  // RGBを設定します
+    colorData[i * 16 + 15] = 255;       // Aを設定します
+  }

  return {
    vertexData,
-    indexData,
-    numVertices: indexData.length,
+    numVertices,
  };
}
```

各インデックスをウォークし、そのインデックスの位置を取得し、位置の値を`vertexData`に入れます。`colorData`として*同じデータ*に別のビューがあり、クワッドインデックス（6頂点ごとに1つのクワッド）で色を取得し、そのクワッドの各頂点に同じ色を挿入します。データは次のようになります。

<img class="webgpu_center" style="background-color: transparent; width: 1024px;" src="resources/vertex-buffer-f32x3-u8x4.svg" />

追加した色は、[CSS `rgb()`色](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb)と同様に、0から255までの値を持つ符号なしバイトです。パイプラインの属性タイプを`unorm8x4`（符号なし正規化8ビット値x 4）に設定することにより、GPUはバッファから値を取得し、シェーダーに供給するときにそれらを*正規化*します。これは、それらを0から1にする、この場合は255で割ることを意味します。

データができたので、それを使用するようにパイプラインを変更する必要があります。

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (3) * 4, // (3) floats, 4 bytes each
+          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
+            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

インデックスバッファを作成する必要はもうありません。

```js
-  const { vertexData, indexData, numVertices } = createFVertices();
+  const { vertexData, numVertices } = createFVertices();
  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
-  const indexBuffer = device.createBuffer({
-    label: 'index buffer',
-    size: indexData.byteLength,
-    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
-  });
-  device.queue.writeBuffer(indexBuffer, 0, indexData);
```

そして、インデックスなしで描画する必要があります。

```js
 function render() {
    ...
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
-    pass.setIndexBuffer(indexBuffer, 'uint32');

    ...

    pass.setBindGroup(0, bindGroup);
-    pass.drawIndexed(numVertices);
+    pass.draw(numVertices);

    ...
  }
```

これで、次のようになります。

{{{example url="../webgpu-orthographic-projection-step-3-colored-3d-f.html"}}}

おっと、それは何ですか？まあ、3D「F」のさまざまな部分、前面、背面、側面などが、ジオメトリデータに表示される順序で描画されることがわかります。これにより、前面にあるものが最初に描画され、その後ろにあるものが後で描画されてそれを覆い隠すことがあるため、望ましい結果が得られません。

<img class="webgpu_center" style="background-color: transparent; width: 163px;" src="resources/polygon-drawing-order.gif" />

<span style="background: rgb(200, 70, 120); color: white; padding: 0.25em">赤みがかった部分</span>は「F」の**前面**ですが、データの最初の部分であるため、最初に描画され、その後ろにある他の三角形が後で描画されてそれを覆い隠します。たとえば、<span style="background: rgb(80, 70, 200); color: white; padding: 0.25em">紫の部分</span>は実際には「F」の背面です。データで2番目に来るため、2番目に描画されます。

WebGPUの三角形には、前面と背面の概念があります。デフォルトでは、前面の三角形の頂点はクリップ空間で反時計回りの方向に進みます。背面の三角形の頂点はクリップ空間で時計回りの方向に進みます。

<img src="resources/triangle-winding.svg" class="webgpu_center" style="width: 400px;" />

GPUには、前面のみまたは背面のみの三角形を描画する機能があります。パイプラインを変更することで、その機能をオンにできます。

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    primitive: {
+      cullMode: 'back',
+    },
  });
```

`cullMode`を`back`に設定すると、「裏向き」の三角形がカリングされます。この場合の「カリング」は、「描画しない」という派手な言葉です。したがって、`cullMode`を`'back'`に設定すると、次のようになります。

{{{example url="../webgpu-orthographic-projection-step-4-cullmode-back.html"}}}

おい！三角形はどこに行ったのですか？まあ、それらの多くは間違った方向を向いていることがわかります。回転させると、反対側を見ると表示されます。幸いなことに、修正は簡単です。どちらが逆かを調べて、2つの頂点を交換するだけです。たとえば、1つの逆三角形にインデックスがある場合、

<div class="webgpu_center"><pre class="webgpu_math">
6, 7, 8,
</pre></div>

2つを交換して、逆方向に進むようにするだけです。

<div class="webgpu_center"><pre class="webgpu_math">
6, 8, 7,
</pre></div>

重要なのは、WebGPUに関する限り、三角形が時計回りまたは反時計回りと見なされるかどうかは、クリップ空間内のその三角形の頂点に依存するということです。つまり、WebGPUは、頂点シェーダーで頂点に数学を適用した後に、三角形が前面か背面かを判断します。つまり、たとえば、Xで-1でスケーリングされた時計回りの三角形は反時計回りの三角形になるか、180度回転した時計回りの三角形は反時計回りの三角形になります。以前は`cullMode`を設定していなかったため、時計回り（前面）と反時計回り（背面）の両方の三角形を見ることができました。`cullMode`を`back`に設定したので、スケーリングや回転などの理由で前面の三角形が反転すると、WebGPUはそれを描画しません。これは良いことです。3Dで何かを回転させると、通常、あなたの方を向いている三角形が前面と見なされるようにしたいからです。

しかし！クリップ空間では+Yが上ですが、ピクセル空間では+Yが下であることを忘れないでください。つまり、行列はすべての三角形を垂直に反転させています。つまり、+Yを下にしてものを描画するには、`cullMode`を`'front'`に設定するか、すべての三角形の頂点を反転させる必要があります。`cullMode`を`'front'`に設定し、すべての三角形が同じ方向を向くように頂点データを修正しましょう。

```js
  const indices = [
    // 前面
    0,  1,  2,    2,  1,  3,  // 左列
    4,  5,  6,    6,  5,  7,  // 上の横木
    8,  9, 10,   10,  9, 11,  // 中間の横木

    // 背面
-    12,  13,  14,   14, 13, 15,  // 左列の裏
+    12,  14,  13,   14, 15, 13,  // 左列の裏
-    16,  17,  18,   18, 17, 19,  // 上の横木の裏
+    16,  18,  17,   18, 19, 17,  // 上の横木の裏
-    20,  21,  22,   22, 21, 23,  // 中間の横木の裏
+    20,  22,  21,   22, 23, 21,  // 中間の横木の裏

-    0, 5, 12,   12, 5, 17,   // 上
+    0, 12, 5,   12, 17, 5,   // 上
-    5, 7, 17,   17, 7, 19,   // 上の横木の右
+    5, 17, 7,   17, 19, 7,   // 上の横木の右
    6, 7, 18,   18, 7, 19,   // 上の横木の下
-    6, 8, 18,   18, 8, 20,   // 上と中間の横木の間
+    6, 18, 8,   18, 20, 8,   // 上と中間の横木の間
-    8, 9, 20,   20, 9, 21,   // 中間の横木の上
+    8, 20, 9,   20, 21, 9,   // 中間の横木の上
-    9, 11, 21,  21, 11, 23,  // 中間の横木の右
+    9, 21, 11,  21, 23, 11,  // 中間の横木の右
    10, 11, 22, 22, 11, 23,  // 中間の横木の下
-    10, 3, 22,  22, 3, 15,   // 幹の右
+    10, 22, 3,  22, 15, 3,   // 幹の右
    2, 3, 14,   14, 3, 15,   // 下
    0, 2, 12,   12, 2, 14,   // 左
  ];
```

```js
  const pipeline = device.createRenderPipeline({
    ...
    primitive: {
-      cullMode: 'back',
+      cullMode: 'front',
    },
  });
```

これらの変更により、すべての三角形を1つの方向に向けることで、次のようになります。

{{{example url="../webgpu-orthographic-projection-step-5-order-fixed.html"}}}

それは近いですが、まだ1つ問題があります。すべての三角形が正しい方向を向いていて、私たちから離れているものがカリングされていても、背面にあるはずの三角形が前面にあるはずの三角形の上に描画される場所がまだあります。

## <a id="a-depth-textures"></a>「深度テクスチャ」の入力

深度テクスチャは、深度バッファまたはZバッファとも呼ばれ、描画しているテクスチャの各カラーテクセルに対応する*深度*テクセルの長方形です。深度テクスチャを作成してバインドすると、WebGPUが各ピクセルを描画するときに、深度ピクセルも描画できます。これは、頂点シェーダーからZに対して返す値に基づいて行われます。XとYでクリップ空間に変換する必要があったように、Zもクリップ空間にあります。Zの場合、クリップ空間は0から+1です。

WebGPUがカラーピクセルを描画する前に、対応する深度ピクセルをチェックします。描画しようとしているピクセルの深度（Z）値が、対応する深度ピクセルの値に対して何らかの条件と一致しない場合、WebGPUは新しいカラーピクセルを描画しません。それ以外の場合は、フラグメントシェーダーからの色で新しいカラーピクセルと、新しい深度値で深度ピクセルの両方を描画します。つまり、他のピクセルの後ろにあるピクセルは描画されません。

深度テクスチャを設定して使用するには、パイプラインを更新する必要があります。

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'front',
    },
+    depthStencil: {
+      depthWriteEnabled: true,
+      depthCompare: 'less',
+      format: 'depth24plus',
+    },
  });
```

上記では、`depthCompare: 'less'`を設定しています。これは、新しいピクセルのZ値が深度テクスチャの対応するピクセルよりも「小さい」場合にのみ、新しいピクセルを描画することを意味します。他のオプションには、`never`、`equal`、`less-equal`、`greater`、`not-equal`、`greater-equal`、`always`があります。

`depthWriteEnabled: true`は、`depthCompare`テストに合格した場合、新しいピクセルのZ値を深度テクスチャに書き込むことを意味します。この場合、描画しているピクセルが深度テクスチャにすでにあるものよりも小さいZ値を持つたびに、そのピクセルを描画し、深度テクスチャを更新します。このようにして、後でさらに後ろにある（より高いZ値を持つ）ピクセルを描画しようとすると、描画されません。

`format`は`fragment.targets[?].format`に似ています。これは、使用する深度テクスチャの形式です。利用可能な深度テクスチャ形式は、[テクスチャに関する記事](webgpu-textures.html#a-depth-stencil-formats)にリストされていました。`depth24plus`は、選択するのに適したデフォルトの形式です。

また、レンダーパス記述子を更新して、深度ステンシルアタッチメントを持つようにする必要があります。

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- レンダリング時に設定されます
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
+    depthStencilAttachment: {
+      // view: <- レンダリング時に設定されます
+      depthClearValue: 1.0,
+      depthLoadOp: 'clear',
+      depthStoreOp: 'store',
+    },
  };
```

深度値は通常0.0から1.0までです。`depthClearValue`を1に設定します。`depthCompare`を`less`に設定したので、これは理にかなっています。

最後に、深度テクスチャを作成する必要があります。問題は、カラーアタッチメントのサイズと一致する必要があることです。この場合、キャンバスから取得するテクスチャです。キャンバステクスチャは、`ResizeObserver`コールバックでキャンバスのサイズを変更するとサイズが変わります。または、より明確に言うと、`context.getCurrentTexture`を呼び出すときに取得するテクスチャは、キャンバスに設定した任意のサイズになります。それを念頭に置いて、レンダリング時に正しいサイズのテクスチャを作成しましょう。

```js
+  let depthTexture;

  function render() {
    // キャンバスコンテキストから現在のテクスチャを取得し、
    // レンダリングするテクスチャとして設定します。
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();
+    const canvasTexture = context.getCurrentTexture();
+    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

+    // 深度テクスチャがない場合、またはそのサイズが
+    // キャンバステクスチャと異なる場合は、新しい深度テクスチャを作成します。
+    if (!depthTexture ||
+        depthTexture.width !== canvasTexture.width ||
+        depthTexture.height !== canvasTexture.height) {
+      if (depthTexture) {
+        depthTexture.destroy();
+      }
+      depthTexture = device.createTexture({
+        size: [canvasTexture.width, canvasTexture.height],
+        format: 'depth24plus',
+        usage: GPUTextureUsage.RENDER_ATTACHMENT,
+      });
+    }
+    renderPassDescriptor.depthStencilAttachment.view = depthTexture;

  ...
```

深度テクスチャを追加すると、次のようになります。

{{{example url="../webgpu-orthographic-projection-step-6-depth-texture.html"}}}

3Dです！

## Ortho / Orthographic

マイナーなことですが、ほとんどの3D数学ライブラリには、クリップ空間からピクセル空間への変換を行う`projection`関数はありません。むしろ、通常、次のような`ortho`または`orthographic`という関数があります。

```js
const mat4 = {
  ...
  ortho(left, right, bottom, top, near, far, dst) {
    dst = dst || new Float32Array(16);

    dst[0] = 2 / (right - left);
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;

    dst[4] = 0;
    dst[5] = 2 / (top - bottom);
    dst[6] = 0;
    dst[7] = 0;

    dst[8] = 0;
    dst[9] = 0;
    dst[10] = 1 / (near - far);
    dst[11] = 0;

    dst[12] = (right + left) / (left - right);
    dst[13] = (top + bottom) / (bottom - top);
    dst[14] = near / (near - far);
    dst[15] = 1;

    return dst;
  },
  ...
```

幅、高さ、深度のパラメータしか持たなかった単純化された`projection`関数とは異なり、このより一般的な正射影関数では、左、右、下、上、近、遠を渡すことができ、より柔軟性があります。元の射影関数と同じように使用するには、次のように呼び出します。

```js
-    mat4.projection(canvas.clientWidth, canvas.clientHeight, 400, matrixValue);
+    mat4.ortho(
+        0,                   // left
+        canvas.clientWidth,  // right
+        canvas.clientHeight, // bottom
+        0,                   // top
+        200,                 // near
+        -200,                // far
+        matrixValue,         // dst
+    );   
```

{{{example url="../webgpu-orthographic-projection-step-7-ortho.html"}}}

次に、[遠近法を持たせる方法](webgpu-perspective-projection.html)について説明します。

<div class="webgpu_bottombar">
<h3>なぜ正射影と呼ばれるのですか？</h3>
<p>
この場合の正射影は、<i>直交</i>という言葉に由来します。
</p>
<blockquote>
<h2>直交</h2>
<p><i>形容詞</i>:</p>
<ol><li>直角の、または直角を含む</li></ol>
</blockquote>
</div>

<!-- この記事の最後にこれを保持してください -->
<link href="webgpu-orthographic-projection.css" rel="stylesheet">
<script type="module" src="webgpu-orthographic-projection.js"></script>

