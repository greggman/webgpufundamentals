Title: WebGPU desde WebGL
Description: Comparando el uso de WebGL frente a WebGPU
TOC: WebGPU desde WebGL

Este artículo está pensado para personas que ya conocen WebGL y quieren empezar a usar WebGPU.

Si vienes de WebGL a WebGPU, vale la pena notar que muchos de los conceptos son los mismos. Tanto WebGL como WebGPU te permiten ejecutar pequeñas funciones en la GPU. WebGL tiene vertex shaders (shaders de vértices) y fragment shaders (shaders de fragmentos). WebGPU tiene los mismos, además de compute shaders (shaders de cómputo). WebGL utiliza [GLSL](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) como lenguaje de sombreado. WebGPU utiliza [WGSL](webgpu-wgsl.html). Aunque son lenguajes diferentes, los conceptos son mayoritariamente los mismos.

Ambas APIs tienen atributos, una forma de especificar datos extraídos de buffers y suministrados a cada iteración de un vertex shader. Ambas APIs tienen uniforms, una forma de especificar valores compartidos por todas las iteraciones de una función de shader. Ambas APIs tienen varyings, una forma de pasar datos de un vertex shader a un fragment shader e interpolar entre valores calculados por el vertex shader al rasterizar mediante un fragment shader. Ambas APIs tienen texturas y samplers, formas de proporcionar datos 2D o 3D y muestrearlos (filtrar múltiples píxeles en un solo valor). Ambas APIs proporcionan formas de renderizar a texturas. Y ambas tienen un montón de ajustes para cómo se mezclan (blending) los píxeles, cómo funcionan el buffer de profundidad (depth buffer) y el buffer de stencil, etc.

La mayor diferencia es que WebGL es una API *stateful* (con estado) y WebGPU no. Con esto quiero decir que en WebGL hay un montón de estado global. Qué texturas están vinculadas actualmente, qué buffers están vinculados, cuál es el programa actual, cuáles son los ajustes de blending, profundidad y stencil. Estableces esos estados llamando a varias funciones de la API como `gl.bindBuffer`, `gl.enable`, `gl.blendFunc`, etc., y se mantienen tal como los configuraste *globalmente* hasta que los cambies por otra cosa.

Por el contrario, en WebGPU casi no hay estado *global*. En su lugar, existen los conceptos de una *pipeline* o *render pipeline* y un *render pass* que, juntos, contienen efectivamente la mayor parte del estado que era global en WebGL: qué texturas, qué atributos, qué buffers y todos los demás ajustes diversos. Cualquier ajuste que no establezcas tiene valores por defecto. No puedes modificar una pipeline. En su lugar, las creas y, después de eso, son inmutables. Si quieres ajustes diferentes, necesitas crear otra pipeline. Los *render passes* sí tienen algo de estado, pero ese estado es local al render pass.

La segunda gran diferencia es que WebGPU es **de más bajo nivel** que WebGL. En WebGL, muchas cosas se conectan por nombres. Por ejemplo, declaras un uniform en GLSL y buscas su ubicación (location):

```js
loc = gl.getUniformLocation(program, 'nombreDelUniform');
```

Otro ejemplo son los varyings: en un vertex shader usas `varying vec2 v_texcoord` o `out vec2 v_texcoord`, y en el fragment shader declaras el varying correspondiente llamándolo `v_texcoord`. Lo bueno de esto es que si escribes mal el nombre, obtendrás un error.

En WebGPU, por otro lado, todo se conecta enteramente por índice o por desplazamiento de bytes (byte offset). No creas uniforms individuales como en WebGL; en su lugar, declaras bloques de uniformes (una estructura que declara tus uniforms). Luego depende de ti asegurarte de organizar manualmente los datos que pasas al shader para que coincidan con esa estructura. Nota: WebGL2 tiene el mismo concepto, conocido como bloques de uniformes (Uniform Blocks), pero WebGL2 también tenía el concepto de uniforms por nombre. Y, aunque los campos individuales en un Uniform Block de WebGL2 debían establecerse mediante desplazamientos de bytes, (a) podías consultar a WebGL2 por esos desplazamientos y (b) aún podías buscar las ubicaciones de los bloques por nombre.

En WebGPU, por otro lado, **TODO** es por desplazamiento de bytes o índice (a menudo llamado '*location*') y no hay ninguna API para consultarlos. Eso significa que depende enteramente de ti mantener esas ubicaciones sincronizadas y calcular manualmente los desplazamientos de bytes.

Para dar una analogía en JavaScript:

```js
function comoWebGL(inputs) {
  const {position, texcoords, normal, color} = inputs;
  ...
}

function comoWebGPU(inputs) {
  const [position, texcoords, normal, color] = inputs;
  ...
}
```

En el ejemplo `comoWebGL` de arriba, las cosas se conectan por nombre. Podemos llamar a `comoWebGL` así:

```js
const inputs = {};
inputs.normal = normal;
inputs.color = color;
inputs.position = position;
comoWebGL(inputs);
```

o así:

```js
comoWebGL({color, position, normal});
```

Observa que, como se conectan por nombres, el orden de nuestros parámetros no importa. Además, podemos omitir un parámetro (`texcoords` en el ejemplo anterior) asumiendo que la función puede ejecutarse sin `texcoords`.

Por otro lado, con `comoWebGPU`:

```js
const inputs = [];
inputs[0] = position;
inputs[2] = normal;
inputs[3] = color;
comoWebGPU(inputs);
```

Aquí, pasamos nuestros parámetros en un array. Observa que tenemos que conocer las ubicaciones (índices) para cada entrada. Necesitamos saber que `position` es el índice 0, `normal` está en el índice 2, etc. Mantener sincronizadas las ubicaciones para el código interior (WGSL) y el exterior (JavaScript/WASM) en WebGPU es enteramente responsabilidad tuya.

### Otras diferencias notables

* **El Canvas**

  WebGL gestiona el canvas por ti. Eliges antialias, `preserveDrawingBuffer`, stencil, profundidad y alfa cuando creas el contexto de WebGL y, después de eso, WebGL gestiona el canvas por sí mismo. Todo lo que tienes que hacer es establecer `canvas.width` y `canvas.height`.

  En WebGPU tienes que hacer gran parte de eso tú mismo. Si quieres un buffer de profundidad, lo creas tú mismo (con o sin buffer de stencil). Si quieres anti-aliasing, creas tus propias texturas multisample (de muestreo múltiple) y las resuelves (resolve) en la textura del canvas.

  Pero, debido a eso, a diferencia de WebGL, puedes usar un único dispositivo WebGPU para renderizar en múltiples canvas. 🎉🤩

* **WebGPU no genera mipmaps.**

  En WebGL podías crear el nivel de mip 0 de una textura y luego llamar a `gl.generateMipmap`, y WebGL generaría todos los demás niveles de mip. WebGPU no tiene tal función. Si quieres mips para tus texturas, tienes que generarlos tú mismo.
  
  Nota: [este artículo](webgpu-importing-textures.html#a-generating-mips-on-the-gpu) tiene código para generar mips.

* **WebGPU requiere samplers.**

  En WebGL1, los samplers no existían o, dicho de otra forma, eran manejados internamente por WebGL. En WebGL2, usar samplers era opcional. En WebGPU, los samplers son obligatorios.

* **Los Buffers y las Texturas no pueden redimensionarse.**

  En WebGL podías crear un buffer o una textura y luego, en cualquier momento, cambiar su tamaño. Por ejemplo, si llamabas a `gl.bufferData`, el buffer se reasignaba. Si llamabas a `gl.texImage2D`, la textura se reasignaba. Un patrón común con las texturas era crear un marcador de posición (placeholder) de 1x1 píxel que te permitiera empezar a renderizar inmediatamente y luego cargar una imagen de forma asíncrona. Cuando la imagen terminaba de cargarse, actualizabas la textura en el mismo lugar.

  En WebGPU, los tamaños, usos y formatos de texturas y buffers son inmutables. Puedes cambiar su contenido, pero no puedes cambiar nada más sobre ellos. Esto significa que los patrones en WebGL donde los cambiabas, como el ejemplo mencionado arriba, necesitan ser refactorizados para crear un nuevo recurso.

  En otras palabras, en lugar de:

  ```js
  // pseudo-código
  const tex = createTexture()
  llenarTexturaConMarcadorDe1x1Píxel(tex)
  cargarImagen(url).then(img => actualizarTexturaConImagen(tex, imagen));
  ```

  Necesitas cambiar tu código a algo parecido a esto:

  ```js
  // pseudo-código
  let tex = createTexture(size: [1, 1]);
  llenarTexturaConMarcadorDe1x1Píxel(tex)
  cargarImagen(url).then(img => {
      tex.destroy();  // borrar textura antigua
      tex = createTexture(size: [img.width, img.height]);
      copiarImagenATextura(tex, imagen));
  });
  ```

## Comparemos WebGL con WebGPU

### Shaders

Aquí tienes un shader que dibuja triángulos con textura e iluminación. Uno en GLSL y el otro en WGSL.

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
@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

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

@group(0) @binding(1) var<uniform> fsUniforms: FSUniforms;
@group(0) @binding(2) var diffuseSampler: sampler;
@group(0) @binding(3) var diffuseTexture: texture_2d<f32>;

@fragment
fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.texcoord);
  var a_normal = normalize(v.normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre></div></div>

Observa que, en muchos sentidos, no son tan diferentes. Las partes centrales de cada función son muy similares. `vec4` en GLSL se convierte en `vec4f` en WGSL, `mat4` se convierte en `mat4x4f`. Otros ejemplos incluyen `int` -> `i32`, `uint` -> `u32`, `ivec2` a `vec2i`, `uvec3` a `vec3u`.

GLSL es similar a C/C++. WGSL es similar a Rust. Una diferencia es que los tipos van a la izquierda en GLSL y a la derecha en WGSL.

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// declara una variable de tipo vec4
vec4 v;

// declara una función de tipo mat4 que toma un parámetro vec3
mat4 someFunction(vec3 p) { ... }

// declara una estructura
struct Foo { vec4 campo; };
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// declara una variable de tipo vec4f
var v: vec4f;

// declara una función de tipo mat4x4f que toma un parámetro vec3f
fn someFunction(p: vec3f) -> mat4x4f { ... }

// declara una estructura
struct Foo { campo: vec4f, };
{{/escapehtml}}</code></pre></div></div>

WGSL tiene el concepto de que si no especificas el tipo de variable, este se deducirá del tipo de la expresión a la derecha, mientras que GLSL requería que siempre especificaras el tipo. En otras palabras, en GLSL:

```glsl
vec4 color = texture(someTexture, someTextureCoord);
```

Arriba necesitabas declarar `color` como un `vec4`, pero en WGSL puedes hacer cualquiera de estas dos cosas:

```wgsl
var color: vec4f = textureSample(someTexture, someSampler, someTextureCoord);
```

o

```wgsl
var color = textureSample(someTexture, someSampler, someTextureCoord);
```

En ambos casos, `color` es un `vec4f`.

Por otro lado, la diferencia más grande son todas las partes `@???`. Cada una declara exactamente de dónde proviene esa pieza particular de datos. Por ejemplo, observa que los uniforms en el vertex shader y los uniforms en el fragment shader declaran su `@group(?) @binding(?)` y que depende de ti asegurarte de que no colisionen. Arriba, el vertex shader usa `@binding(0)` y el fragment shader `@binding(1)`, `@binding(2)`, `@binding(3)`. En el ejemplo anterior hay 2 bloques de uniformes. Podríamos haber usado 1. Elegí usar 2 para separar más el vertex shader del fragment shader.

Otra diferencia entre WebGL y WebGPU es que en WebGPU puedes poner múltiples shaders en la misma fuente. En WebGL, el punto de entrada de un shader siempre se llamaba `main`, pero en WebGPU, cuando usas un shader, especificas qué función llamar.

Observa que en WebGPU los atributos se declaran como parámetros de la función del vertex shader, frente a GLSL donde se declaran como globales fuera de la función y, a diferencia de GLSL donde si no eliges una ubicación el compilador asignará una, en WGSL debemos suministrar las ubicaciones.

Para los varyings, en GLSL también se declaran como variables globales, mientras que en WGSL declaras una estructura con ubicaciones para cada campo, declaras que tu vertex shader devuelve esa estructura y devuelves una instancia de esa estructura en la propia función. En el fragment shader declaras que tu función recibe estas entradas.

El código de arriba usa la misma estructura tanto para la salida del vertex shader como para la entrada del fragment shader, pero no hay obligación de usar la misma estructura. Todo lo que se requiere es que las ubicaciones coincidan. Por ejemplo, esto funcionaría:

```wgsl
*struct MyFSInput {
*  @location(0) el_normal: vec3f,
*  @location(1) el_texcoord: vec2f,
*};

@fragment
*fn myFSMain(v: MyFSInput) -> @location(0) vec4f
{
*  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.el_texcoord);
*  var a_normal = normalize(v.el_normal);
   var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
   return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}
```

Esto también funcionaría:

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

Nuevamente, lo que importa es que las ubicaciones coincidan, no los nombres.

Otra diferencia a notar es que `gl_Position` en GLSL simplemente tiene una ubicación especial `@builtin(position)` para un campo de estructura declarado por el usuario en WGSL. De manera similar, la salida del fragment shader recibe una ubicación. En este caso, `@location(0)`. Esto es similar a usar `gl_FragData[0]` en la extensión `WEBGL_draw_buffers` de WebGL1. Aquí también, si quisieras generar más de un solo valor, por ejemplo a múltiples render targets (objetivos de renderizado), declararías una estructura y asignarías ubicaciones tal como hicimos para la salida del vertex shader.

### Obteniendo la API

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function main() {
  const gl = document.querySelector('canvas').getContext('webgl');
  if (!gl) {
    fail('necesito webgl');
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
    fail('necesito un navegador que soporte WebGPU');
    return;
  }

...
}

main();
{{/escapehtml}}</code></pre>
  </div>
</div>

Aquí, `adapter` representa la propia GPU, mientras que `device` representa una instancia de la API en esa GPU.

Probablemente la mayor diferencia aquí es que obtener la API en WebGPU es asíncrono.

### Creando Buffers

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

Como puedes ver a simple vista, no son muy diferentes. Llamas a diferentes funciones, pero por lo demás es bastante similar.

### Creando una Textura

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
    2,    // ancho
    2,    // alto
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

Nuevamente, no es tan diferente. Una diferencia es que en WebGPU hay flags de uso (*usage flags*) que debes establecer dependiendo de lo que planees hacer con la textura. Otra es que en WebGPU necesitamos crear un sampler, el cual es opcional en WebGL.

### Compilando shaders

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

Una pequeña diferencia: a diferencia de WebGL, podemos compilar múltiples shaders a la vez.

En WebGL, si tu shader no compilaba, dependía de ti comprobar el `COMPILE_STATUS` con `gl.getShaderParameter` y luego, si fallaba, extraer los mensajes de error con una llamada a `gl.getShaderInfoLog`. Si no hacías esto, no se mostraban errores. Probablemente obtendrías un error más tarde al intentar usar el programa de shader.

En WebGPU, la mayoría de las implementaciones imprimirán un error en la consola de JavaScript. Por supuesto, aún puedes comprobar los errores tú mismo, pero es muy agradable que si no haces nada, sigas obteniendo información útil.

### Vinculando un Programa / Configurando una Pipeline

Una pipeline, o más específicamente una "render pipeline", representa un par de shaders utilizados de una manera particular. Varias cosas que suceden en WebGL se combinan en una sola en WebGPU al crear una pipeline. Por ejemplo, vincular los shaders, configurar los parámetros de los atributos, elegir el modo de dibujo (puntos, líneas, triángulos), configurar cómo se usa el buffer de profundidad.

Aquí está el código:

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
      // posición
      {
        arrayStride: 3 * 4, // 3 floats, 4 bytes cada uno
        attributes: [
          {shaderLocation: 0, offset: 0, format: 'float32x3'},
        ],
      },
      // normales
      {
        arrayStride: 3 * 4, // 3 floats, 4 bytes cada uno
        attributes: [
          {shaderLocation: 1, offset: 0, format: 'float32x3'},
        ],
      },
      // coordenadas de textura
      {
        arrayStride: 2 * 4, // 2 floats, 4 bytes cada uno
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

Puntos a tener en cuenta:

La vinculación de shaders ocurre cuando llamas a `createRenderPipeline` y, de hecho, `createRenderPipeline` es una llamada lenta, ya que tus shaders podrían ajustarse internamente dependiendo de la configuración. Puedes ver que para `vertex` y `fragment` especificamos un `module` de shader y qué función llamar mediante el `entryPoint` (por defecto suele ser `main`, pero aquí se especifica explícitamente). WebGPU necesita asegurarse de que esas 2 funciones sean compatibles entre sí, de la misma manera que vincular dos shaders en un programa en WebGL comprueba que los shaders sean compatibles.

En WebGL llamamos a `gl.vertexAttribPointer` para vincular el buffer `ARRAY_BUFFER` actual a un atributo *y* para especificar cómo extraer datos de ese buffer. En WebGPU, solo especificamos cómo extraer datos de los buffers al crear la pipeline. Especificamos qué buffers usar más tarde.

En el ejemplo anterior, puedes ver que `buffers` es un array de objetos. Esos objetos se llaman `GPUVertexBufferLayout`. Dentro de cada uno hay un array de atributos. Aquí estamos configurando la obtención de nuestros datos de 3 buffers diferentes. Si intercaláramos los datos en un solo buffer, solo necesitaríamos un `GPUVertexBufferLayout`, pero su array `attributes` tendría 3 entradas.

También ten en cuenta que aquí es donde debemos hacer coincidir el `shaderLocation` con lo que usamos en el shader.

En WebGPU, configuramos el tipo primitivo, el modo de descarte (*cull mode*) y los ajustes de profundidad aquí. Eso significa que si queremos dibujar algo con cualquiera de esos ajustes diferentes (por ejemplo, si queremos dibujar una geometría con triángulos y luego con líneas), tenemos que crear múltiples pipelines. De manera similar si los layouts de los vértices son diferentes. Por ejemplo, si un modelo tiene posiciones y coordenadas de textura separadas en buffers distintos, otro los tiene en el mismo buffer pero desplazados, y otro los tiene intercalados, los 3 requerirían su propia pipeline.

La última parte, `multisample`, la necesitamos si estamos dibujando a una textura de destino con muestreo múltiple (*multi-sampled*). Lo puse aquí porque, por defecto, WebGL usará una textura multi-sampled para el canvas. Emular eso requiere añadir una propiedad `multisample`. `presentationFormat` y `canvasInfo.sampleCount` son cosas que cubriremos más adelante.

### Preparándose para los uniforms

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
const vUniformBufferSize = 2 * 16 * 4; // 2 mat4s * 16 floats por mat * 4 bytes por float
const fUniformBufferSize = 3 * 4;      // 1 vec3 * 3 floats por vec3 * 4 bytes por float

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

En WebGL buscamos las ubicaciones de los uniforms. En WebGPU creamos buffers para contener los valores de los uniforms. El código de arriba crea entonces vistas de TypedArray en TypedArrays de CPU más grandes que contienen los valores para los uniforms. Observa que `vUniformBufferSize` y `fUniformBufferSize` se calculan a mano. De manera similar, al crear vistas en los typed arrays, los desplazamientos (*offsets*) y tamaños se calculan a mano. Depende enteramente de ti hacer esos cálculos. A diferencia de WebGL, WebGPU no proporciona ninguna API para consultar estos desplazamientos y tamaños.

Nota: existe un proceso similar para WebGL2 usando bloques de uniformes (Uniform Blocks), pero si nunca has usado Uniform Blocks, esto será nuevo para ti.

### Preparándose para dibujar

En WebGL iríamos directamente a dibujar en este punto, pero en WebGPU todavía nos queda algo de trabajo.

Necesitamos crear un bind group. Esto nos permite especificar qué recursos usarán nuestros shaders.

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// sucede en el momento del renderizado
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// puede suceder en el momento de la inicialización
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: vsUniformBuffer  },
    { binding: 1, resource: fsUniformBuffer  },
    { binding: 2, resource: sampler },
    { binding: 3, resource: tex },
  ],
});
{{/escapehtml}}</code></pre>
  </div>
</div>

Nuevamente, observa que el `binding` y el `group` deben coincidir con lo que especificamos en nuestros shaders.

En WebGPU también creamos un descriptor de render pass (*render pass descriptor*), frente a WebGL donde estos ajustes se establecen mediante llamadas a la API con estado o se manejan automáticamente.

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
      // view: undefined, // Asignado después
      // resolveTarget: undefined, // Asignado después
      clearValue: [0.5, 0.5, 0.5, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    // view: undefined,  // Asignado después
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};
{{/escapehtml}}</code></pre>
  </div>
</div>

Ten en cuenta que muchos de los ajustes en WebGPU están relacionados con dónde queremos renderizar. En WebGL, al renderizar al canvas, todo esto se manejaba por nosotros. Al renderizar a un framebuffer en WebGL, estos ajustes son el equivalente a las llamadas a `gl.framebufferTexture2D` y/o `gl.framebufferRenderbuffer`.

### Estableciendo Uniforms

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

En el caso de WebGL, calculamos un valor y lo pasamos a `gl.uniform???` con la ubicación adecuada.

En el caso de WebGPU, escribimos los valores en nuestros typed arrays y luego copiamos el contenido de esos typed arrays a los buffers correspondientes de la GPU.

Nota: En WebGL2, si estuviéramos usando Uniform Blocks, este proceso es casi exactamente el mismo, excepto que llamaríamos a `gl.bufferSubData` para subir el contenido del typed array.

### Redimensionando el drawing buffer

Como se mencionó al principio del artículo, este es uno de los lugares que WebGL simplemente manejaba por nosotros, pero en WebGPU necesitamos hacerlo nosotros mismos.

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
// En el momento de la inicialización
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
  // estos se rellenan en resizeToDisplaySize
  renderTarget: undefined,
  renderTargetView: undefined,
  depthTexture: undefined,
  depthTextureView: undefined,
  sampleCount: 4,  // puede ser 1 o 4
};

// --- En el momento del renderizado ---

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

Como puedes ver arriba, hay bastante trabajo por hacer. Si necesitamos redimensionar, debemos destruir manualmente las texturas antiguas (color y profundidad) y crear unas nuevas. También debemos comprobar que no superemos los límites, algo que WebGL manejaba por nosotros, al menos para el canvas.

Arriba, la propiedad `sampleCount` es efectivamente el análogo de la propiedad `antialias` de los atributos de creación del contexto de WebGL. `sampleCount: 4` sería el equivalente a `antialias: true` en WebGL (el valor por defecto), mientras que `sampleCount: 1` sería el equivalente a `antialias: false`.

Otra cosa que no se muestra arriba es que WebGL intentaba no quedarse sin memoria, lo que significa que si pedías un canvas de 16000x16000, WebGL podría devolverte uno de 4096x4096. Podías averiguar qué habías obtenido realmente consultando `gl.drawingBufferWidth` y `gl.drawingBufferHeight`.

Las razones por las que WebGL hacía esto son: (1) estirar un canvas a través de múltiples monitores podría hacer que el tamaño fuera mayor de lo que la GPU puede manejar; (2) el sistema podría tener poca memoria y, en lugar de simplemente bloquearse, WebGL devolvería un drawing buffer más pequeño.

En WebGPU, comprobar esas dos situaciones depende de ti. Estamos comprobando la situación (1) arriba. Para la situación (2), tendríamos que comprobar si hay falta de memoria nosotros mismos y, como todo lo demás en WebGPU, hacerlo es asíncrono.

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
    // nos hemos quedado sin memoria, ¿intentar un tamaño más pequeño?
  }
});
```

### Dibujando

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

Ten en cuenta que repetí el código de configuración de atributos de WebGL aquí. En WebGL, esto puede suceder en el momento de la inicialización o del renderizado. En WebGPU, configuramos cómo extraer los datos de los buffers en la inicialización, pero establecemos los buffers reales a usar en el momento del renderizado.

En WebGPU, necesitamos actualizar nuestro descriptor de render pass para usar las texturas que acabamos de actualizar en `resizeToDisplaySize`. Luego necesitamos crear un encoder de comandos e iniciar un render pass.

Dentro del render pass establecemos la pipeline, que es el equivalente a `gl.useProgram`. Luego establecemos nuestro bind group, que suministra nuestro sampler, textura y los 2 buffers para nuestros uniforms. Establecemos los buffers de vértices para que coincidan con lo que declaramos anteriormente. Finalmente, establecemos un buffer de índices y llamamos a `drawIndexed`, que es el equivalente a llamar a `gl.drawElements`.

En WebGL necesitábamos llamar a `gl.viewport`. En WebGPU, el encoder del pass utiliza por defecto un viewport que coincide con el tamaño de los attachments, así que, a menos que queramos un viewport que no coincida, no tenemos que establecerlo por separado.

En WebGL llamamos a `gl.clear` para limpiar el canvas, mientras que en WebGPU ya lo habíamos configurado previamente al crear nuestro descriptor de render pass.

## Ejemplos en funcionamiento:

WebGL

{{{example url="../webgl-cube.html"}}}

WebGPU

{{{example url="../webgpu-cube.html"}}}

Otra cosa importante a notar: estamos enviando instrucciones a algo llamado `device.queue`. Observa que cuando subimos los valores de los uniforms llamamos a `device.queue.writeBuffer`, y cuando creamos un encoder de comandos lo enviamos con `device.queue.submit`. Eso deja bastante claro que no podemos actualizar los buffers entre llamadas de dibujo dentro del mismo encoder de comandos. Si queremos dibujar múltiples cosas, necesitaremos múltiples buffers o múltiples conjuntos de valores en un solo buffer.

# Dibujando múltiples cosas

Repasemos un ejemplo de dibujo de múltiples cosas.

Como se mencionó anteriormente, para dibujar múltiples cosas (al menos de la forma más común), necesitaríamos un uniform buffer diferente para cada cosa, de modo que podamos proporcionar un conjunto diferente de matrices. Los uniform buffers se pasan a través de bind groups, por lo que también necesitamos un bind group diferente por objeto.

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
  const vUniformBufferSize = 2 * 16 * 4; // 2 mat4s * 16 floats por mat * 4 bytes por float
  const fUniformBufferSize = 3 * 4;      // 1 vec3 * 3 floats per vec3 * 4 bytes por float

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
        { binding: 0, resource: vsUniformBuffer  },
        { binding: 1, resource: fsUniformBuffer  },
        { binding: 2, resource: sampler },
        { binding: 3, resource: tex },
      ],
    });

+    const across = Math.sqrt(numObjects) | 0;
+    const x = (i % across - (across - 1) / 2) * 3;
+    const y = ((i / across | 0) - (across - 1) / 2) * 3;
+
+    objectInfos.push({
+      vsUniformBuffer,  // necesario para actualizar el buffer
+      vsUniformValues,  // necesario para actualizar el buffer
+      worldViewProjection,  // necesario para actualizar el worldViewProjection de este objeto
+      worldInverseTranspose,  // necesario para actualizar el worldInverseTranspose de este objeto
+      bindGroup, // necesario para renderizar este objeto
+      translation: [x, y, 0],
+    });
+  }
{{/escapehtml}}</code></pre>
  </div>
</div>

Ten en cuenta que en este ejemplo estamos compartiendo los `fsUniforms`, su buffer y valores (que contienen la dirección de la luz). Incluimos `fsUniformBuffer` en el bind group, pero se define fuera del bucle ya que solo hay uno.

Para renderizar, configuraremos las partes compartidas; luego, para cada objeto, actualizaremos sus valores uniform, los copiaremos al buffer de uniformes correspondiente y codificaremos el comando para dibujarlo.

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
      renderPassDescriptor.colorAttachments[0].view = canvasInfo.renderTargetView;
      renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture();
    }
    renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTextureView;

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // Por supuesto, estos podrían ser por objeto, pero como estamos dibujando el mismo objeto
    // múltiples veces, simplemente establécelos una vez.
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

    // la información de iluminación es compartida, así que establece estos uniforms una vez
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

No hay mucha diferencia con respecto a nuestro cubo único, pero el código se ha reorganizado ligeramente para colocar las partes compartidas fuera del bucle de objetos. En este caso particular, como estamos dibujando el mismo cubo 100 veces, no necesitamos actualizar los buffers de vértices o de índices pero, por supuesto, podríamos cambiarlos por objeto si fuera necesario.

WebGL

{{{example url="../webgl-cube-multiple.html"}}}

WebGPU

{{{example url="../webgpu-cube-multiple.html"}}}

La parte importante a recordar es que, a diferencia de WebGL, necesitarás buffers de uniformes para cualquier uniform que sea específico de un objeto (como una matriz de mundo) y, por ello, también podrías necesitar un bind group único por objeto.

## Otras diferencias aleatorias

### El espacio de recorte Z es de 0 a 1

En WebGL, el espacio de recorte Z era de -1 a +1. En WebGPU es de 0 a 1 (lo que, por cierto, ¡tiene mucho más sentido!).

### El eje Y es hacia abajo en el framebuffer y en las coordenadas del viewport

Esto es lo opuesto a WebGL, aunque en el espacio de recorte el eje Y es hacia arriba (igual que en WebGL).

En otras palabras, devolver (-1, -1) desde un vertex shader hará referencia a la esquina inferior izquierda tanto en WebGL como en WebGPU. Por otro lado, establecer el viewport o el scissor a `0, 0, 1, 1` hace referencia a la esquina inferior izquierda en WebGL, pero a la esquina superior izquierda en WebGPU.

### WGSL usa `@builtin(???)` para las variables `gl_XXX` de GLSL.

`gl_FragCoord` es `@builtin(position) miVarOCampo: vec4f` y, a diferencia de WebGL, baja por la pantalla en lugar de subir, por lo que 0,0 es la esquina superior izquierda, frente a WebGL donde 0,0 es la esquina inferior izquierda.

`gl_VertexID` es `@builtin(vertex_index) miVarOCampo: u32`

`gl_InstanceID` es `@builtin(instance_index) miVarOCampo: u32`

`gl_Position` es `@builtin(position) vec4f`, que puede ser el valor de retorno de un vertex shader o un campo en una estructura devuelta por el mismo.

No existe equivalente a `gl_PointSize` ni `gl_PointCoord` porque los puntos son de solo 1 píxel en WebGPU. Afortunadamente, es fácil [dibujar puntos tú mismo](webgpu-points.html).

Puedes ver otras variables integradas (*built-in*) [aquí](https://www.w3.org/TR/WGSL/#builtin-variables).

### WGSL solo soporta líneas y puntos de 1 píxel de ancho

Según la especificación, WebGL2 podría soportar líneas de más de 1 píxel, pero en la práctica ninguna implementación lo hizo. WebGL2 generalmente soportaba puntos de más de 1 píxel pero, (a) muchas GPUs solo soportaban un tamaño máximo de 64 píxeles y (b) diferentes GPUs recortarían o no basándose en el centro del punto. Por lo tanto, es posiblemente algo bueno que WebGPU no soporte puntos de tamaños distintos a 1. Esto te obliga a implementar una solución de puntos portátil.

### Las optimizaciones de WebGPU son diferentes a las de WebGL

Si tomas una aplicación WebGL y la conviertes directamente a WebGPU, podrías encontrar que funciona más lenta. Para obtener los beneficios de WebGPU, necesitarás cambiar la forma en que organizas los datos y optimizar cómo dibujas. Consulta [este artículo sobre optimización en WebGPU](webgpu-optimization.html) para obtener ideas.

Nota: Si estás comparando WebGL con WebGPU en [el artículo sobre optimización](webgpu-optimization.html), aquí tienes 2 muestras de WebGL que puedes usar para comparar:

* [Dibujando hasta 30000 objetos en WebGL usando uniforms estándar](../webgl-optimization-none.html)
* [Dibujando hasta 30000 objetos en WebGL usando bloques de uniformes](../webgl-optimization-none-uniform-buffers.html)
* [Dibujando hasta 30000 objetos en WebGL usando bloques de uniformes globales/de material/por objeto](../webgl-optimization-global-material-per-object-uniform-buffers.html)
* [Dibujando hasta 30000 objetos en WebGL usando un único uniform buffer grande](../webgl-optimization-uniform-buffers-one-large.html)

Otro artículo, si estás comparando el rendimiento de WebGL frente a WebGPU, consulta [este artículo](https://toji.dev/webgpu-best-practices/webgl-performance-comparison).

---

Si ya estabas familiarizado con WebGL, espero que este artículo te haya sido útil.
