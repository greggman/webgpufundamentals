Title: WebGLからWebGPUへ
Description: WebGLとWebGPUの使用の比較
TOC: WebGLからWebGPUへ

<div class="warn">この記事はGemini Code Assistによって自動翻訳されました。翻訳に問題がある場合は、お手数ですが<a href="https://github.com/webgpu/webgpufundamentals/pulls">こちら</a>からPull Requestを送信してください。</div>

この記事は、すでにWebGLを知っていて、WebGPUを使い始めたい人を対象としています。

WebGLからWebGPUに来た場合、多くの概念が同じであることに注意する価値があります。WebGLとWebGPUの両方で、GPUで小さな関数を実行できます。WebGLには頂点シェーダーとフラグメントシェーダーがあります。WebGPUには同じものに加えてコンピュートシェーダーがあります。WebGLはシェーディング言語として[GLSL](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)を使用します。WebGPUは[WGSL](webgpu-wgsl.html)を使用します。それらは異なる言語ですが、概念はほとんど同じです。

両方のAPIには、バッファからデータを取得して頂点シェーダーの各反復に供給する方法である属性があります。両方のAPIには、シェーダー関数のすべての反復で共有される値を指定する方法であるユニフォームがあります。両方のAPIには、頂点シェーダーからフラグメントシェーダーにデータを渡し、フラグメントシェーダーを介してラスタライズするときに頂点シェーダーによって計算された値の間を補間する方法であるバリアブルがあります。両方のAPIには、2Dまたは3Dデータを提供してサンプリングする方法（複数のピクセルを単一の値にフィルタリングする）であるテクスチャとサンプラーがあります。両方のAPIには、テクスチャにレンダリングする方法があります。そして、両方には、ピクセルがどのようにブレンドされるか、深度バッファとステンシルバッファがどのように機能するかなど、多数の設定があります。

最大の違いは、WebGLはステートフルAPIであり、WebGPUはそうではないことです。つまり、WebGLには多数のグローバル状態があります。現在バインドされているテクスチャ、現在バインドされているバッファ、現在のプログラム、ブレンド、深度、ステンシルの設定などです。これらの状態は、`gl.bindBuffer`、`gl.enable`、`gl.blendFunc`などのさまざまなAPI関数を呼び出すことによって設定され、他のものに変更するまで*グローバルに*設定されたままになります。

対照的に、WebGPUには*グローバル*な状態はほとんどありません。代わりに、*パイプライン*または*レンダーパイプライン*と*レンダーパス*の概念があり、これらは一緒になって、WebGLでグローバルだった状態のほとんどを効果的に含んでいます。どのテクスチャ、どの属性、どのバッファ、および他のさまざまな設定です。設定しない設定にはデフォルト値があります。パイプラインを変更することはできません。代わりに、それらを作成し、その後は不変です。異なる設定が必要な場合は、別のパイプラインを作成する必要があります。*レンダーパス*にはいくつかの状態がありますが、その状態はレンダーパスに対してローカルです。

2番目に大きな違いは、WebGPUがWebGLよりも**低レベル**であることです。WebGLでは、多くのものが名前で接続されます。たとえば、GLSLでユニフォームを宣言し、その場所を検索します。

```js
loc = gl.getUniformLocation(program, 'nameOfUniform');
```

別の例はバリアブルです。頂点シェーダーでは`varying vec2 v_texcoord`または`out vec2 v_texcoord`を使用し、フラグメントシェーダーでは対応するバリアブルを`v_texcoord`という名前で宣言します。これの良い点は、名前を間違えるとエラーが発生することです。

一方、WebGPUでは、すべてがインデックスまたはバイトオフセットによって完全に接続されます。WebGLのように個々のユニフォームを作成するのではなく、ユニフォームブロック（ユニフォームを宣言する構造体）を宣言します。次に、シェーダーに渡すデータを手動で整理して、その構造体に一致させるのはあなた次第です。注：WebGL2には、ユニフォームブロックとして知られる同じ概念がありますが、WebGL2には名前によるユニフォームの概念もありました。そして、WebGL2ユニフォームブロックの個々のフィールドはバイトオフセットを介して設定する必要がありましたが、（a）WebGL2にそれらのオフセットを問い合わせることができ、（b）ブロックの場所自体を名前で検索することができました。

一方、WebGPUでは、**すべて**がバイトオフセットまたはインデックス（しばしば*「場所」*と呼ばれる）によるものであり、それらを照会するためのAPIはありません。つまり、それらの場所を同期させ、バイトオフセットを手動で計算するのは完全にあなたの責任です。

JavaScriptの類推を次に示します。

```js
function likeWebGL(inputs) {
  const {position, texcoords, normal, color} = inputs;
  ...
}

function likeWebGPU(inputs) {
  const [position, texcoords, normal, color] = inputs;
  ...
}
```

上記の`likeWebGL`の例では、物事は名前で接続されています。次のように`likeWebGL`を呼び出すことができます。

```js
const inputs = {};
inputs.normal = normal;
inputs.color = color;
inputs.position = position;
likeWebGL(inputs);
```

またはこのように

```js
likeWebGL({color, position, normal});
```

名前で接続されているため、パラメータの順序は問題にならないことに注意してください。さらに、関数が`texcoords`なしで実行できると仮定して、パラメータをスキップできます（上記の例では`texcoords`）。

一方、`likeWebGPU`では

```js
const inputs = [];
inputs[0] = position;
inputs[2] = normal;
inputs[3] = color;
likeWebGPU(inputs);
```

ここでは、パラメータを配列で渡します。各入力の場所（インデックス）を知る必要があることに注意してください。`position`がインデックス0、`normal`がインデックス2などであることを知る必要があります。内部（WGSL）と外部（JavaScript/WASM）のコードの場所をWebGPUで同期させるのは、完全にあなたの責任です。

### その他の注目すべき違い

* キャンバス

  WebGLはキャンバスを管理します。WebGLコンテキストを作成するときにアンチエイリアス、preserveDrawingBuffer、ステンシル、深度、アルファを選択し、その後WebGLはキャンバス自体を管理します。あなたがしなければならないのは、`canvas.width`と`canvas.height`を設定することだけです。

  WebGPUでは、その多くを自分で行う必要があります。深度バッファが必要な場合は、自分で作成します（ステンシルバッファの有無にかかわらず）。アンチエイリアシングが必要な場合は、独自のマルチサンプルテクスチャを作成し、それらをキャンバステクスチャに解決します。

  しかし、そのため、WebGLとは異なり、1つのWebGPUデバイスを使用して複数のキャンバスにレンダリングできます。🎉🤩

* WebGPUはミップマップを生成しません。

  WebGLでは、テクスチャのレベル0ミップを作成し、`gl.generateMipmap`を呼び出すと、WebGLが他のすべてのミップレベルを生成しました。WebGPUにはそのような関数はありません。テクスチャにミップが必要な場合は、自分で生成する必要があります。
  
  注：[この記事](webgpu-importing-textures.html#a-generating-mips-on-the-gpu)には、ミップを生成するコードがあります。

* WebGPUにはサンプラーが必要です。

  WebGL1では、サンプラーは存在しなかったか、別の言い方をすれば、サンプラーはWebGLによって内部的に処理されていました。WebGL2では、サンプラーの使用はオプションでした。WebGPUでは、サンプラーが必要です。

* バッファとテクスチャはサイズ変更できません。

  WebGLでは、バッファまたはテクスチャを作成し、いつでもそのサイズを変更できました。たとえば、`gl.bufferData`を呼び出すと、バッファが再割り当てされます。`gl.texImage2D`を呼び出すと、テクスチャが再割り当てされます。テクスチャの一般的なパターンは、すぐにレンダリングを開始できる1x1ピクセルのプレースホルダーを作成し、画像を非同期に読み込むことでした。画像の読み込みが完了すると、テクスチャをその場で更新します。

  WebGPUでは、テクスチャとバッファのサイズ、使用法、フォーマットは不変です。内容を変更することはできますが、それ以外のものは変更できません。つまり、上記で述べた例のように、それらを変更していたWebGLのパターンは、新しいリソースを作成するようにリファクタリングする必要があります。

  つまり、代わりに

  ```js
  // 擬似コード
  const tex = createTexture()
  fillTextureWith1x1PixelPlaceholder(tex)
  imageLoad(url).then(img => updateTextureWithImage(tex, image));
  ```

  コードを効果的に次のように変更する必要があります。

  ```js
  // 擬似コード
  let tex = createTexture(size: [1, 1]);
  fillTextureWith1x1PixelPlaceholder(tex)
  imageLoad(url).then(img => {
      tex.destroy();  // 古いテクスチャを削除します
      tex = createTexture(size: [img.width, img.height]);
      copyImageToTexture(tex, image));
  });
  ```

## WebGLとWebGPUを比較してみましょう

### シェーダー

これは、テクスチャ付きで照らされた三角形を描画するシェーダーです。1つはGLSL、もう1つはWGSLです。

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const vSrc = `
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
  gl_Position = u_worldViewProjection * a_position;
  v_texCoord = a_texcoord;
  v_normal = (u_worldInverseTranspose * vec4(a_normal, 0)).xyz;
}
`;

const fSrc = `
precision highp float;

varying vec2 v_texCoord;
varying vec3 v_normal;

uniform sampler2D u_diffuse;
uniform vec3 u_lightDirection;

void main() {
  vec4 diffuseColor = texture2D(u_diffuse, v_texCoord);
  vec3 a_normal = normalize(v_normal);
  float l = dot(a_normal, u_lightDirection) * 0.5 + 0.5;
  gl_FragColor = vec4(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const shaderSrc = `
struct VSUniforms {
  worldViewProjection: mat4x4f,
  worldInverseTranspose: mat4x4f,
};
@group(0) binding(0) var<uniform> vsUniforms: VSUniforms;

struct MyVSInput {
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) texcoord: vec2f,
};

struct MyVSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) texcoord: vec2f,
};

@vertex
fn myVSMain(v: MyVSInput) -> MyVSOutput {
  var vsOut: MyVSOutput;
  vsOut.position = vsUniforms.worldViewProjection * v.position;
  vsOut.normal = (vsUniforms.worldInverseTranspose * vec4f(v.normal, 0.0)).xyz;
  vsOut.texcoord = v.texcoord;
  return vsOut;
}

struct FSUniforms {
  lightDirection: vec3f,
};

@group(0) binding(1) var<uniform> fsUniforms: FSUniforms;
@group(0) binding(2) var diffuseSampler: sampler;
@group(0) binding(3) var diffuseTexture: texture_2d<f32>;

@fragment
fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.texcoord);
  var a_normal = normalize(v.normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre></div></div>

多くの点で、それらはそれほど違いがないことに注意してください。各関数のコア部分は非常に似ています。GLSLの`vec4`はWGSLの`vec4f`になり、`mat4`は`mat4x4f`になります。他の例には、`int` -> `i32`、`uint` -> `u32`、`ivec2` -> `vec2i`、`uvec3` -> `vec3u`があります。

GLSLはC/C++に似ています。WGSLはRustに似ています。1つの違いは、GLSLでは型が左側に、WGSLでは右側にあることです。

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// vec4型の変数を宣言します
vec4 v;

// vec3パラメータを受け取るmat4型の関数を宣言します
mat4 someFunction(vec3 p) { ... }

// 構造体を宣言します
struct Foo { vec4 field; };
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// vec4f型の変数を宣言します
var v: vec4f;

// vec3fパラメータを受け取るmat4x4f型の関数を宣言します
fn someFunction(p: vec3f) -> mat4x4f { ... }

// 構造体を宣言します
struct Foo { field: vec4f, };
{{/escapehtml}}</code></pre></div></div>

WGSLには、変数の型を指定しない場合、右側の式の型から推測されるという概念がありますが、GLSLでは常に型を指定する必要がありました。つまり、GLSLでは

```glsl
vec4 color = texture(someTexture, someTextureCoord);
```

上記では、`color`を`vec4`として宣言する必要がありましたが、WGSLでは次のいずれかを実行できます。

```
var color: vec4f = textureSample(someTexture, someSampler, someTextureCoord);
```

または

```
var color = textureSample(someTexture, someSampler, someTextureCoord);
```

どちらの場合も、`color`は`vec4f`です。

一方、最大の違いは、すべての`@???`部分です。それぞれが、その特定のデータがどこから来ているかを正確に宣言しています。たとえば、頂点シェーダーのユニフォームとフラグメントシェーダーのユニフォームが`@group(?) binding(?)`を宣言し、それらが衝突しないようにするのはあなた次第であることに注意してください。上記の頂点シェーダーは`binding(0)`を使用し、フラグメントシェーダーは`binding(1)`、`binding(2)`、`binding(3)`を使用します。上記の例では、2つのユニフォームブロックがあります。1つを使用することもできましたが、頂点シェーダーをフラグメントシェーダーからより分離するために2つを使用することにしました。

WebGLとWebGPUのもう1つの違いは、WebGPUでは同じソースに複数のシェーダーを配置できることです。WebGLでは、シェーダーのエントリポイントは常に`main`と呼ばれていましたが、WebGPUでは、シェーダーを使用するときに呼び出す関数を指定します。

WebGPUでは、属性は頂点シェーダー関数のパラメータとして宣言されるのに対し、GLSLでは関数の外部でグローバルとして宣言され、GLSLでは場所を選択しないとコンパイラが割り当てますが、WGSLでは場所を指定する必要があることに注意してください。

バリアブルについては、GLSLではグローバル変数としても宣言されますが、WGSLでは各フィールドの場所を持つ構造体を宣言し、頂点シェーダーをその構造体を返すものとして宣言し、関数自体でその構造体のインスタンスを返します。フラグメントシェーダーでは、これらの入力を受け取るものとして関数を宣言します。

上記のコードでは、頂点シェーダーの出力とフラグメントシェーダーの入力の両方に同じ構造体を使用していますが、同じ構造体を使用する必要はありません。必要なのは、場所が一致することだけです。たとえば、これは機能します。

```wgsl
*struct MyFSInput {
*  @location(0) the_normal: vec3f,
*  @location(1) the_texcoord: vec2f,
*};

@fragment
*fn myFSMain(v: MyFSInput) -> @location(0) vec4f
{
*  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.the_texcoord);
*  var a_normal = normalize(v.the_normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
```

これも機能します。

```wgsl
@fragment
fn myFSMain(
*  @location(1) uv: vec2f,
*  @location(0) nrm: vec3f,
) -> @location(0) vec4f
{
*  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, uv);
*  var a_normal = normalize(nrm);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
```

繰り返しになりますが、重要なのは場所が一致することであり、名前ではありません。

もう1つの注意すべき違いは、GLSLの`gl_Position`には、WGSLのユーザー宣言構造体フィールドの特別な場所`@builtin(position)`があることです。同様に、フラグメントシェーダーの出力には場所が与えられます。この場合、`@location(0)`です。これは、WebGL1の`WEBGL_draw_buffers`拡張機能で`gl_FragData[0]`を使用するのと似ています。ここでも、複数のレンダーターゲットなど、単一の値以上を出力したい場合は、頂点シェーダーの出力で行ったように、構造体を宣言して場所を割り当てます。

### APIの取得

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function main() {
  const gl = document.querySelector('canvas').getContext('webgl');
  if (!gl) {
    fail('need webgl');
    return;
  }
}

main();
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

...
}

main();
{{/escapehtml}}</code></pre>
  </div>
</div>

ここで、`adapter`はGPU自体を表し、`device`はそのGPU上のAPIのインスタンスを表します。

おそらく、ここでの最大の違いは、WebGPUでAPIを取得するのが非同期であることです。

### バッファの作成

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createBuffer(gl, data, type = gl.ARRAY_BUFFER) {
  const buf = gl.createBuffer();
  gl.bindBuffer(type, buf);
  gl.bufferData(type, data, gl.STATIC_DRAW);
  return buf;
}

const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

const positionBuffer = createBuffer(gl, positions);
const normalBuffer = createBuffer(gl, normals);
const texcoordBuffer = createBuffer(gl, texcoords);
const indicesBuffer = createBuffer(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createBuffer(device, data, usage) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  const dst = new data.constructor(buffer.getMappedRange());
  dst.set(data);
  buffer.unmap();
  return buffer;
}

const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);
const normalBuffer = createBuffer(device, normals, GPUBufferUsage.VERTEX);
const texcoordBuffer = createBuffer(device, texcoords, GPUBufferUsage.VERTEX);
const indicesBuffer = createBuffer(device, indices, GPUBufferUsage.INDEX);
{{/escapehtml}}</code></pre>
  </div>
</div>

一見すると、これらはそれほど違いがないことがわかります。異なる関数を呼び出しますが、それ以外は非常に似ています。

### テクスチャの作成

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,    // level
    gl.RGBA,
    2,    // width
    2,    // height
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([
      255, 255, 128, 255,
      128, 255, 255, 255,
      255, 128, 255, 255,
      255, 128, 128, 255,
    ]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const tex = device.createTexture({
  size: [2, 2],
  format: 'rgba8unorm',
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST,
});
device.queue.writeTexture(
    { texture: tex },
    new Uint8Array([
      255, 255, 128, 255,
      128, 255, 255, 255,
      255, 128, 255, 255,
      255, 128, 128, 255,
    ]),
    { bytesPerRow: 8, rowsPerImage: 2 },
    { width: 2, height: 2 },
);

const sampler = device.createSampler({
  magFilter: 'nearest',
  minFilter: 'nearest',
});
{{/escapehtml}}</code></pre>
  </div>
</div>

繰り返しになりますが、それほど違いはありません。1つの違いは、WebGPUには、テクスチャで何をするかによって設定する必要がある使用法フラグがあることです。もう1つは、WebGPUではサンプラーを作成する必要があることです。これはWebGLではオプションです。

### シェーダーのコンパイル

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh));
  }
  return sh;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vSrc);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fSrc);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const shaderModule = device.createShaderModule({code: shaderSrc});
{{/escapehtml}}</code></pre>
  </div>
</div>

マイナーな違いですが、WebGLとは異なり、一度に複数のシェーダーをコンパイルできます。

WebGLでは、シェーダーがコンパイルされなかった場合、`gl.getShaderParameter`で`COMPILE_STATUS`を確認し、失敗した場合は`gl.getShaderInfoLog`を呼び出してエラーメッセージを取得するのはあなた次第です。これをしないと、エラーは表示されません。シェーダープログラムを使用しようとすると、後でエラーが発生する可能性があります。

WebGPUでは、ほとんどの実装はJavaScriptコンソールにエラーを出力します。もちろん、自分でエラーを確認することもできますが、何もしなくても役立つ情報が得られるのは本当に素晴らしいことです。

### プログラムのリンク/パイプラインの設定

パイプライン、より具体的には「レンダーパイプライン」は、特定の方法で使用される一対のシェーダーを表します。WebGLで発生するいくつかのことは、パイプラインを作成するときにWebGPUで1つのものに結合されます。たとえば、シェーダーのリンク、属性パラメータの設定、描画モード（点、線、三角形）の選択、深度バッファの使用方法の設定などです。

これがコードです。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function createProgram(gl, vs, fs) {
  const prg = gl.createProgram();
  gl.attachShader(prg, vs);
  gl.attachShader(prg, fs);
  gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prg));
  }
  return prg;
}

const program = createProgram(gl, vs, fs);

...

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(normalLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(texcoordLoc);

....

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: shaderModule,
    buffers: [
      // position
      {
        arrayStride: 3 * 4, // 3 floats, 4 bytes each
        attributes: [
          {shaderLocation: 0, offset: 0, format: 'float32x3'},
        ],
      },
      // normals
      {
        arrayStride: 3 * 4, // 3 floats, 4 bytes each
        attributes: [
          {shaderLocation: 1, offset: 0, format: 'float32x3'},
        ],
      },
      // texcoords
      {
        arrayStride: 2 * 4, // 2 floats, 4 bytes each
        attributes: [
          {shaderLocation: 2, offset: 0, format: 'float32x2',},
        ],
      },
    ],
  },
  fragment: {
    module: shaderModule,
    targets: [
      {format: presentationFormat},
    ],
  },
  primitive: {
    topology: 'triangle-list',
    cullMode: 'back',
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
  ...(canvasInfo.sampleCount > 1 && {
      multisample: {
        count: canvasInfo.sampleCount,
      },
  }),
});
{{/escapehtml}}</code></pre>
  </div>
</div>

注意すべき点：

シェーダーのリンクは`createRenderPipeline`を呼び出すときに発生し、実際、`createRenderPipeline`は、設定によってはシェーダーが内部的に調整される可能性があるため、遅い呼び出しです。`vertex`と`fragment`について、シェーダー`module`を指定し、`entryPoint`を介して呼び出す関数を指定することがわかります。次に、WebGPUは、WebGLで2つのシェーダーをプログラムにリンクするとシェーダーが互換性があるかどうかをチェックするのと同じ方法で、それら2つの関数が互いに互換性があることを確認する必要があります。

WebGLでは、`gl.vertexAttribPointer`を呼び出して、現在の`ARRAY_BUFFER`バッファを属性にアタッチし、そのバッファからデータを取得する方法を指定します。WebGPUでは、パイプラインを作成するときにバッファからデータを取得する方法のみを指定します。後で使用するバッファを指定します。

上記の例では、`buffers`がオブジェクトの配列であることがわかります。これらのオブジェクトは`GPUVertexBufferLayout`と呼ばれます。各オブジェクト内には属性の配列があります。ここでは、3つの異なるバッファからデータを取得するように設定しています。データを1つのバッファにインターリーブした場合、必要な`GPUVertexBufferLayout`は1つだけですが、その`attribute`配列には3つのエントリがあります。

また、ここでは、シェーダーで使用したものと`shaderLocation`を一致させる必要があることに注意してください。

WebGPUでは、ここでプリミティブタイプ、カリングモード、深度設定を設定します。つまり、これらの設定のいずれかが異なるもので何かを描画したい場合、たとえば、三角形でいくつかのジオメトリを描画し、後で線で描画したい場合は、複数のパイプラインを作成する必要があります。同様に、頂点レイアウトが異なる場合も同様です。たとえば、あるモデルでは位置とテクスチャ座標が別々のバッファに分離されており、別のモデルでは同じバッファにあるがオフセットされており、さらに別のモデルではインターリーブされている場合、3つすべてに独自のパイプラインが必要になります。

最後の部分である`multisample`は、マルチサンプリングされた宛先テクスチャに描画する場合に必要です。WebGLではデフォルトでキャンバスにマルチサンプリングされたテクスチャを使用するため、これをここに入れました。それをエミュレートするには、`multisample`プロパティを追加する必要があります。`presentationFormat`と`canvasInfo.sampleCount`については、以下で説明します。

### ユニフォームの準備

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const u_lightDirectionLoc = gl.getUniformLocation(program, 'u_lightDirection');
const u_diffuseLoc = gl.getUniformLocation(program, 'u_diffuse');
const u_worldInverseTransposeLoc = gl.getUniformLocation(program, 'u_worldInverseTranspose');
const u_worldViewProjectionLoc = gl.getUniformLocation(program, 'u_worldViewProjection');
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const vUniformBufferSize = 2 * 16 * 4; // 2 mat4s * 16 floats per mat * 4 bytes per float
const fUniformBufferSize = 3 * 4;      // 1 vec3 * 3 floats per vec3 * 4 bytes per float

const vsUniformBuffer = device.createBuffer({
  size: vUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const fsUniformBuffer = device.createBuffer({
  size: fUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const vsUniformValues = new Float32Array(2 * 16); // 2 mat4s
const worldViewProjection = vsUniformValues.subarray(0, 16);
const worldInverseTranspose = vsUniformValues.subarray(16, 32);
const fsUniformValues = new Float32Array(3);  // 1 vec3
const lightDirection = fsUniformValues.subarray(0, 3);
{{/escapehtml}}</code></pre>
  </div>
</div>

WebGLでは、ユニフォームの場所を検索します。WebGPUでは、ユニフォームの値を保持するバッファを作成します。上記のコードは、ユニフォームの値を保持するより大きなCPU側のTypedArrayにTypedArrayビューを作成します。`vUniformBufferSize`と`fUniformBufferSize`が手動で計算されていることに注意してください。同様に、型付き配列にビューを作成する場合、オフセットとサイズは手動で計算されます。これらの計算を行うのは完全にあなた次第です。WebGLとは異なり、WebGPUはこれらのオフセットとサイズを照会するためのAPIを提供しません。

注：WebGL2でユニフォームブロックを使用している場合、このプロセスはほぼ同じですが、型付き配列の内容をアップロードするために`gl.bufferSubData`を呼び出す点が異なります。

### 描画の準備

WebGLでは、この時点で直接描画に進みますが、WebGPUではまだ作業が残っています。

バインドグループを作成する必要があります。これにより、シェーダーが使用するリソースを指定できます。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// レンダリング時に発生します
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 初期化時に発生する可能性があります
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: vsUniformBuffer },
    { binding: 1, resource: fsUniformBuffer },
    { binding: 2, resource: sampler },
    { binding: 3, resource: tex },
  ],
});
{{/escapehtml}}</code></pre>
  </div>
</div>

繰り返しになりますが、`binding`と`group`はシェーダーで指定したものと一致する必要があることに注意してください。

WebGPUでは、レンダーパス記述子も作成しますが、WebGLではこれらの設定はステートフルAPI呼び出しを介して設定されるか、自動的に処理されます。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.clearColor(0.5, 0.5, 0.5, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const renderPassDescriptor = {
  colorAttachments: [
    {
      // view: undefined, // 後で割り当てられます
      // resolveTarget: undefined, // 後で割り当てられます
      clearValue: [0.5, 0.5, 0.5, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    // view: undefined,  // 後で割り当てられます
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};
{{/escapehtml}}</code></pre>
  </div>
</div>

WebGPUの多くの設定は、レンダリングする場所に関連していることに注意してください。WebGLでは、キャンバスにレンダリングする場合、これらすべてが処理されていました。WebGLでフレームバッファにレンダリングする場合、これらの設定は`gl.framebufferTexture2D`や`gl.framebufferRenderbuffer`の呼び出しに相当します。

### ユニフォームの設定

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.uniform3fv(u_lightDirectionLoc, v3.normalize([1, 8, -10]));
gl.uniform1i(u_diffuseLoc, 0);
gl.uniformMatrix4fv(u_worldInverseTransposeLoc, false, m4.transpose(m4.inverse(world)));
gl.uniformMatrix4fv(u_worldViewProjectionLoc, false, m4.multiply(viewProjection, world));
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
m4.transpose(m4.inverse(world), worldInverseTranspose);
m4.multiply(viewProjection, world, worldViewProjection);

v3.normalize([1, 8, -10], lightDirection);

device.queue.writeBuffer(vsUniformBuffer, 0, vsUniformValues);
device.queue.writeBuffer(fsUniformBuffer, 0, fsUniformValues);
{{/escapehtml}}</code></pre>
  </div>
</div>

WebGLの場合、値を計算し、適切な場所で`gl.uniform???`に渡します。

WebGPUの場合、値を型付き配列に書き込み、それらの型付き配列の内容を対応するGPUバッファにコピーします。

注：WebGL2でユニフォームブロックを使用している場合、このプロセスはほぼ同じですが、型付き配列の内容をアップロードするために`gl.bufferSubData`を呼び出す点が異なります。

### 描画バッファのサイズ変更

記事の冒頭で述べたように、これはWebGLが処理してくれた場所の1つですが、WebGPUでは自分で行う必要があります。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function resizeCanvasToDisplaySize(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = width !== canvas.width || height !== canvas.height;
  if (needResize) {
    canvas.width = width;
    canvas.height = height;
  }
  return needResize;
}
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// 初期化時に
const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');

const presentationFormat = navigator.gpu.getPreferredFormat(adapter);
context.configure({
  device,
  format: presentationFormat,
});

const canvasInfo = {
  canvas,
  presentationFormat,
  // これらはresizeToDisplaySizeで入力されます
  renderTarget: undefined,
  renderTargetView: undefined,
  depthTexture: undefined,
  depthTextureView: undefined,
  sampleCount: 4,  // 1または4にすることができます
};

// --- レンダリング時に ---

function resizeToDisplaySize(device, canvasInfo) {
  const {
    canvas,
    context,
    renderTarget,
    presentationFormat,
    depthTexture,
    sampleCount,
  } = canvasInfo;
  const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
  const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));

  const needResize = !canvasInfo.renderTarget ||
                     width !== canvas.width ||
                     height !== canvas.height;
  if (needResize) {
    if (renderTarget) {
      renderTarget.destroy();
    }
    if (depthTexture) {
      depthTexture.destroy();
    }

    canvas.width = width;
    canvas.height = height;

    if (sampleCount > 1) {
      const newRenderTarget = device.createTexture({
        size: [canvas.width, canvas.height],
        format: presentationFormat,
        sampleCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      canvasInfo.renderTarget = newRenderTarget;
      canvasInfo.renderTargetView = newRenderTarget;
    }

    const newDepthTexture = device.createTexture({
      size: [canvas.width, canvas.height,
      format: 'depth24plus',
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    canvasInfo.depthTexture = newDepthTexture;
    canvasInfo.depthTextureView = newDepthTexture;
  }
  return needResize;
}
{{/escapehtml}}</code></pre>
  </div>
</div>

上記のように、やるべきことがたくさんあることがわかります。サイズ変更が必要な場合は、古いテクスチャ（色と深度）を手動で破棄し、新しいものを作成する必要があります。また、WebGLが少なくともキャンバスに対して処理してくれた制限を超えないようにチェックする必要もあります。

上記では、`sampleCount`プロパティは、事実上、WebGLコンテキストの作成属性の`antialias`プロパティのアナログです。`sampleCount: 4`は、WebGLの`antialias: true`（デフォルト）に相当し、`sampleCount: 1`は、WebGLコンテキストを作成するときの`antialias: false`に相当します。

上記に示されていないもう1つのこととして、WebGLはメモリ不足にならないように試みます。つまり、16000x16000のキャンバスを要求した場合、WebGLは4096x4096のキャンバスを返す可能性があります。実際に何が返されたかは、`gl.drawingBufferWidth`と`gl.drawingBufferHeight`を見ることで確認できます。

WebGLがこれを行った理由は、（1）キャンバスを複数のモニターにまたがって引き伸ばすと、サイズがGPUが処理できるよりも大きくなる可能性があるため、（2）システムがメモリ不足で、クラッシュする代わりに、WebGLがより小さな描画バッファを返すためです。

WebGPUでは、これら2つの状況を確認するのはあなた次第です。上記の状況（1）を確認しています。状況（2）については、メモリ不足を自分で確認する必要があり、WebGPUの他のすべてと同様に、そうすることは非同期です。

```js
device.pushErrorScope('out-of-memory');
context.configure({...});
if (sampleCount > 1) {
  const newRenderTarget = device.createTexture({...});
  ...
}

const newDepthTexture = device.createTexture({...});
...
device.popErrorScope().then(error => {
  if (error) {
    // メモリ不足です。より小さいサイズを試しますか？
  }
});
```

### 描画

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

...
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(normalLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(texcoordLoc);

...

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

gl.drawElements(gl.TRIANGLES, 6 * 6, gl.UNSIGNED_SHORT, 0);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
if (canvasInfo.sampleCount === 1) {
    const colorTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = colorTexture;
} else {
  renderPassDescriptor.colorAttachments[0].view = canvasInfo.renderTargetView;
  renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture();
}
renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTextureView;

const commandEncoder = device.createCommandEncoder();
const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, bindGroup);
passEncoder.setVertexBuffer(0, positionBuffer);
passEncoder.setVertexBuffer(1, normalBuffer);
passEncoder.setVertexBuffer(2, texcoordBuffer);
passEncoder.setIndexBuffer(indicesBuffer, 'uint16');
passEncoder.drawIndexed(indices.length);
passEncoder.end();
device.queue.submit([commandEncoder.finish()]);
{{/escapehtml}}</code></pre>
  </div>
</div>

WebGL属性設定コードをここで繰り返したことに注意してください。WebGLでは、これは初期化時またはレンダリング時に発生する可能性があります。WebGPUでは、初期化時にバッファからデータを取得する方法を設定しますが、レンダリング時に使用する実際のバッファを設定します。

WebGPUでは、`resizeToDisplaySize`で更新したばかりのテクスチャを使用するようにレンダーパス記述子を更新する必要があります。次に、コマンドエンコーダーを作成し、レンダーパスを開始する必要があります。

レンダーパス内で、`gl.useProgram`に相当するパイプラインを設定します。次に、サンプラー、テクスチャ、およびユニフォーム用の2つのバッファを提供するバインドグループを設定します。以前に宣言したものと一致するように頂点バッファを設定します。最後に、インデックスバッファを設定し、`gl.drawElements`の呼び出しに相当する`drawIndexed`を呼び出します。

WebGLに戻ると、`gl.viewport`を呼び出す必要がありました。WebGPUでは、パスエンコーダーはアタッチメントのサイズに一致するビューポートにデフォルト設定されるため、一致しないビューポートが必要でない限り、ビューポートを個別に設定する必要はありません。

WebGLでは、キャンバスをクリアするために`gl.clear`を呼び出しました。一方、WebGPUでは、レンダーパス記述子を作成するときに以前に設定しました。

## 動作例：

WebGL

{{{example url="../webgl-cube.html"}}}

WebGPU

{{{example url="../webgpu-cube.html"}}}

もう1つ注意すべき重要な点は、`device.queue`と呼ばれるものに命令を発行していることです。ユニフォームの値をアップロードするときに`device.queue.writeBuffer`を呼び出し、コマンドエンコーダーを作成して`device.queue.submit`で送信したことに注意してください。これにより、同じコマンドエンコーダー内の描画呼び出し間でバッファを更新できないことがかなり明確になります。複数のものを描画したい場合は、複数のバッファまたは単一のバッファ内の複数の値のセットが必要になります。

# 複数のものを描画する

複数のものを描画する例を見てみましょう。

上記のように、複数のものを描画するには、少なくとも最も一般的な方法では、異なるマトリックスのセットを提供できるように、ものごとに異なるユニフォームバッファが必要になります。ユニフォームバッファはバインドグループを介して渡されるため、オブジェクトごとに異なるバインドグループも必要です。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
+  const numObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < numObjects; ++i) {
+    const across = Math.sqrt(numObjects) | 0;
+    const x = (i % across - (across - 1) / 2) * 3;
+    const y = ((i / across | 0) - (across - 1) / 2) * 3;
+
+    objectInfos.push({
+      translation: [x, y, 0],
+    });
+  }
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  const vUniformBufferSize = 2 * 16 * 4; // 2 mat4s * 16 floats per mat * 4 bytes per float
  const fUniformBufferSize = 3 * 4;      // 1 vec3 * 3 floats per vec3 * 4 bytes per float

  const fsUniformBuffer = device.createBuffer({
    size: Math.max(16, fUniformBufferSize),
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const fsUniformValues = new Float32Array(3);  // 1 vec3
  const lightDirection = fsUniformValues.subarray(0, 3);

+  const numObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < numObjects; ++i) {
    const vsUniformBuffer = device.createBuffer({
      size: Math.max(16, vUniformBufferSize),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const vsUniformValues = new Float32Array(2 * 16); // 2 mat4s
    const worldViewProjection = vsUniformValues.subarray(0, 16);
    const worldInverseTranspose = vsUniformValues.subarray(16, 32);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: vsUniformBuffer },
        { binding: 1, resource: fsUniformBuffer },
        { binding: 2, resource: sampler },
        { binding: 3, resource: tex },
      ],
    });

+    const across = Math.sqrt(numObjects) | 0;
+    const x = (i % across - (across - 1) / 2) * 3;
+    const y = ((i / across | 0) - (across - 1) / 2) * 3;
+
+    objectInfos.push({
+      vsUniformBuffer,  // needed to update the buffer
+      vsUniformValues,  // needed to update the buffer
+      worldViewProjection,  // needed so we can update this object's worldViewProject
+      worldInverseTranspose,  // needed so we can update this object's worldInverseTranspose
+      bindGroup, // needed to render this object
+      translation: [x, y, 0],
+    });
+  }
{{/escapehtml}}</code></pre>
  </div>
</div>

この例では、`fsUniforms`、そのバッファ、および値を共有していることに注意してください。これには、バインドグループに`fsUniformBuffer`を含めたライティング情報が含まれていますが、1つしかないため、ループの外で定義されています。

レンダリングでは、共有部分を設定し、各オブジェクトについて、そのユニフォーム値を更新し、それらを対応するユニフォームバッファにコピーし、それを描画するコマンドをエンコードします。

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  function render(time) {
    time *= 0.001;
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

*    const projection = mat4.perspective(30 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 100);
*    const eye = [1, 4, -46];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const view = mat4.lookAt(eye, target, up);
    const viewProjection = mat4.multiply(projection, view);

    gl.uniform3fv(u_lightDirectionLoc, vec3.normalize([1, 8, -10]));
    gl.uniform1i(u_diffuseLoc, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texcoordLoc);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

*    objectInfos.forEach(({translation}, ndx) => {
*      const world = mat4.translation(translation);
*      mat4.rotateX(world, time * 0.9 + ndx, world);
*      mat4.rotateY(world, time + ndx, world);

      gl.uniformMatrix4fv(u_worldInverseTransposeLoc, false, mat4.transpose(mat4.inverse(world)));
      gl.uniformMatrix4fv(u_worldViewProjectionLoc, false, mat4.multiply(viewProjection, world));

      gl.drawElements(gl.TRIANGLES, 6 * 6, gl.UNSIGNED_SHORT, 0);
*    });

    requestAnimationFrame(render);
  }{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  function render(time) {
    time *= 0.001;
    resizeToDisplaySize(device, canvasInfo);

    if (canvasInfo.sampleCount === 1) {
        const colorTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = colorTexture;
    } else {
      renderPassDescriptor.colorAttachments[0].view = canvasInfo.renderTarget;
      renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture();
    }
    renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTexture;

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // もちろん、これらはオブジェクトごとにすることもできますが、同じオブジェクトを
    // 何度も描画しているので、一度だけ設定します。
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, normalBuffer);
    passEncoder.setVertexBuffer(2, texcoordBuffer);
    passEncoder.setIndexBuffer(indicesBuffer, 'uint16');

*    const projection = mat4.perspective(30 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.5, 100);
*    const eye = [1, 4, -46];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const view = mat4.lookAt(eye, target, up);
    const viewProjection = mat4.multiply(projection, view);

    // ライティング情報は共有されているので、これらのユニフォームを一度設定します
    vec3.normalize([1, 8, -10], lightDirection);
    device.queue.writeBuffer(fsUniformBuffer, 0, fsUniformValues);

+    objectInfos.forEach(({
+      vsUniformBuffer,
+      vsUniformValues,
+      worldViewProjection,
+      worldInverseTranspose,
+      bindGroup,
+      translation,
+    }, ndx) => {
      passEncoder.setBindGroup(0, bindGroup);

*      const world = mat4.translation(translation);
*      mat4.rotateX(world, time * 0.9 + ndx, world);
*      mat4.rotateY(world, time + ndx, world);
      mat4.transpose(mat4.inverse(world), worldInverseTranspose);
      mat4.multiply(viewProjection, world, worldViewProjection);

      device.queue.writeBuffer(vsUniformBuffer, 0, vsUniformValues);
      passEncoder.drawIndexed(indices.length);
+    });
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
{{/escapehtml}}</code></pre>
  </div>
</div>

単一のキューブと大差ありませんが、共有のものをオブジェクトループの外に置くようにコードがわずかに再配置されています。この特定のケースでは、同じキューブを100回描画しているため、頂点バッファやインデックスバッファを更新する必要はありませんが、もちろん、必要に応じてオブジェクトごとに変更することもできます。

WebGL

{{{example url="../webgl-cube-multiple.html"}}}

WebGPU

{{{example url="../webgpu-cube-multiple.html"}}}

重要な点は、WebGLとは異なり、オブジェクト固有のユニフォーム（ワールドマトリックスなど）にはユニフォームバッファが必要であり、そのため、オブジェクトごとに一意のバインドグループも必要になる可能性があるということです。

## その他のランダムな違い

### Zクリップ空間は0から1です

WebGLでは、Zクリップ空間は-1から+1でした。WebGPUでは、0から1です（ちなみに、これははるかに理にかなっています！）。

### Y軸はフレームバッファ、ビューポート座標で下向きです

これはWebGLとは逆ですが、クリップ空間ではY軸は上向きです（WebGLと同じ）。

つまり、頂点シェーダーから(-1, -1)を返すと、WebGLとWebGPUの両方で左下隅が参照されます。一方、ビューポートまたはシザーを`0, 0, 1, 1`に設定すると、WebGLでは左下隅が参照されますが、WebGPUでは左上隅が参照されます。

### WGSLは、GLSLの`gl_XXX`変数に`@builtin(???)`を使用します。

`gl_FragCoord`は`@builtin(position) myVarOrField: vec4f`であり、WebGLとは異なり、画面の下ではなく上に向かって進むため、0,0は左上隅ですが、WebGLでは0,0は左下隅です。

`gl_VertexID`は`@builtin(vertex_index) myVarOrField: u32`です。

`gl_InstanceID`は`@builtin(instance_index) myVarOrField: u32`です。

`gl_Position`は`@builtin(position) vec4f`であり、頂点シェーダーの戻り値または頂点シェーダーによって返される構造体のフィールドである可能性があります。

WebGPUでは点が1ピクセルしかないため、`gl_PointSize`と`gl_PointCoord`に相当するものはありません。幸いなことに、[自分で点を描画する](webgpu-points.html)のは簡単です。

他の組み込み変数は[ここ](https://www.w3.org/TR/WGSL/#builtin-variables)で確認できます。

### WGSLは、幅1ピクセルの線と点のみをサポートします。

仕様によると、WebGL2は1ピクセルより大きい線をサポートできましたが、実際にはどの実装もサポートしていませんでした。WebGL2は一般的に1ピクセルより大きい点をサポートしていましたが、（a）多くのGPUは最大サイズ64ピクセルしかサポートしておらず、（b）異なるGPUは点の中心に基づいてクリップしたりしなかったりしました。したがって、WebGPUが1以外のサイズの点をサポートしていないのは、間違いなく良いことです。これにより、ポータブルな点ソリューションを実装せざるを得なくなります。

### WebGPUの最適化はWebGLとは異なります。

WebGLアプリを直接WebGPUに変換すると、実行速度が遅くなる可能性があります。WebGPUの利点を得るには、データの整理方法と描画の最適化方法を変更する必要があります。[WebGPUの最適化に関するこの記事](webgpu-optimization.html)でアイデアを参照してください。

注：[最適化に関する記事](webgpu-optimization.html)でWebGLとWebGPUを比較している場合は、比較に使用できる2つのWebGLサンプルを次に示します。

* [標準のWebGLユニフォームを使用してWebGLで最大30000個のオブジェクトを描画する](../webgl-optimization-none.html)
* [ユニフォームブロックを使用してWebGLで最大30000個のオブジェクトを描画する](../webgl-optimization-none-uniform-buffers.html)
* [グローバル/マテリアル/オブジェクトごとのユニフォームブロックを使用してWebGLで最大30000個のオブジェクトを描画する](../webgl-optimization-global-material-per-object-uniform-buffers.html)
* [1つの大きなユニフォームバッファを使用してWebGLで最大30000個のオブジェクトを描画する](../webgl-optimization-uniform-buffers-one-large.html)

WebGLとWebGPUのパフォーマンスを比較している場合は、[この記事](https://toji.dev/webgpu-best-practices/webgl-performance-comparison)を参照してください。

---

すでにWebGLに精通している場合は、この記事が役立つことを願っています。