Title: Transparencia y blending en WebGPU
Description: Mezcla de píxeles en WebGPU
TOC: Transparencia y blending

Es difícil cubrir la transparencia y el blending (mezcla) porque, a menudo, lo que necesitas
hacer para una situación es diferente de lo que necesitas para otra. Por lo tanto, este artículo
será principalmente un recorrido por las características de WebGPU para que podamos consultarlo más adelante cuando
cubramos técnicas específicas.

## <a href="a-alphamode"></a> `alphaMode` del canvas

Lo primero que debemos tener en cuenta es que existe la transparencia y el blending dentro de WebGPU,
pero también existe la transparencia y el blending entre un canvas de WebGPU y la página HTML.

Por defecto, un canvas de WebGPU es opaco. Su canal alfa se ignora. Para que no sea
ignorado, tenemos que establecer su `alphaMode` en `'premultiplied'` cuando llamamos a `configure`.
El valor por defecto es `'opaque'`.

```js
  context.configure({
    device,
    format: presentationFormat,
+    alphaMode: 'premultiplied',
  });
```

Es importante entender qué significa `alphaMode: 'premultiplied'`. Significa que
los colores que pongas en el canvas deben tener sus valores de color ya multiplicados
por el valor alfa.

Hagamos el ejemplo más pequeño que podamos. Simplemente crearemos un render pass y estableceremos
el color de limpieza (clear color).

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('necesitas un navegador que soporte WebGPU');
    return;
  }

  // Obtener un contexto de WebGPU del canvas y configurarlo
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
+    alphaMode: 'premultiplied',
  });

  const clearValue = [1, 0, 0, 0.01];
  const renderPassDescriptor = {
    label: 'nuestro renderPass básico de canvas',
    colorAttachments: [
      {
        // view: <- se completará cuando rendericemos
        clearValue,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  function render() {
    const encoder = device.createCommandEncoder({ label: 'encoder de limpieza' });
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      render();
    }
  });
  observer.observe(canvas);
}
```

También estableceremos el fondo CSS del canvas como un tablero de ajedrez gris:

```css
canvas {
  background-color: #404040;
  background-image:
     linear-gradient(45deg, #808080 25%, transparent 25%),
     linear-gradient(-45deg, #808080 25%, transparent 25%),
     linear-gradient(45deg, transparent 75%, #808080 75%),
     linear-gradient(-45deg, transparent 75%, #808080 75%);
  background-size: 32px 32px;
  background-position: 0 0, 0 16px, 16px -16px, -16px 0px;
}
```

A eso añadiremos una UI para que podamos establecer el alfa y el color del
valor de limpieza, así como si está premultiplicado o no:

```js
+import GUI from '../3rdparty/muigui-0.x.module.js';

...

+  const color = [1, 0, 0];
+  const settings = {
+    premultiply: false,
+    color,
+    alpha: 0.01,
+  };
+
+  const gui = new GUI().onChange(render);
+  gui.add(settings, 'premultiply');
+  gui.add(settings, 'alpha', 0, 1);
+  gui.addColor(settings, 'color');

  function render() {
    const encoder = device.createCommandEncoder({ label: 'encoder de limpieza' });
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    const { alpha } = settings;
+    clearValue[3] = alpha;
+    if (settings.premultiply) {
+      // premultiplicar los colores por el alfa
+      clearValue[0] = color[0] * alpha;
+      clearValue[1] = color[1] * alpha;
+      clearValue[2] = color[2] * alpha;
+    } else {
+      // usar colores no premultiplicados
+      clearValue[0] = color[0];
+      clearValue[1] = color[1];
+      clearValue[2] = color[2];
+    }

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Si ejecutamos eso, espero que veas un problema:

{{{example url="../webgpu-canvas-alphamode-premultiplied.html"}}}

¡¡¡Qué colores aparecen aquí está **INDEFINIDO**!!!

En mi máquina obtuve estos colores:

<img src="resources/canvas-invalid-color.png" class="center" style="width: 440px">

¿Ves qué está mal? Tenemos el alfa establecido en 0.01. Se supone que los colores de fondo
son gris medio y gris oscuro. El color está establecido en rojo (1, 0, 0).
Poner una cantidad de 0.01 de rojo encima de un tablero de ajedrez gris medio/oscuro debería ser
casi imperceptible, ¿entonces por qué son 2 tonos brillantes de rosa?

La razón es que **¡ESTE ES UN COLOR ILEGAL!**. El color de
nuestro canvas es `1, 0, 0, 0.01`, pero ese no es un color premultiplicado.
"premultiplied" significa que los colores que ponemos en el canvas
ya deben estar multiplicados por el valor alfa. Dado un valor alfa
de 0.01, ningún otro valor debería ser mayor que 0.01.

Si marcas la casilla 'premultiplied', el código premultiplicará el color. El valor puesto en el canvas será
`0.01, 0, 0, 0.01` y se verá correcto, casi imperceptible.

Con 'premultiplied' marcado, ajusta el alfa y
verás cómo se desvanece a rojo a medida que el alfa se acerca a 1.

> Nota: Debido a que el ejemplo `1, 0, 0, 0.01` es un color ilegal,
> cómo se muestra es indefinido. Depende del navegador lo que
> ocurra con los colores ilegales, así que no uses colores ilegales y
> esperes los mismos resultados en diferentes dispositivos.

Digamos que nuestro color es 1, 0.5, 0.25, que es naranja, y queremos que sea 33%
transparente, por lo que nuestro alfa es 0.33. Entonces, nuestro "color premultiplicado" sería:

```
                      premultiplicado
    ---------------------------------
    r = 1    * 0.33   = 0.33
    g = 0.5  * 0.33   = 0.165
    b = 0.25 * 0.33   = 0.0825
    a = 0.33          = 0.33
```

Cómo obtengas un color premultiplicado depende de ti. Si tienes colores
no premultiplicados, en el shader podrías premultiplicarlos con un código como este:

```wgsl
   return vec4f(color.rgb * color.a, color.a);
```

La función `copyExternalImageToTexture`, que cubrimos en
[el artículo sobre importación de texturas](webgpu-importing-textures.html),
acepta una opción `premultipliedAlpha: true`. ([ver más abajo](#copyExternalImageToTexture))
Esto significa que cuando cargues la imagen en la textura llamando a
`copyExternalImageToTexture`, puedes decirle a WebGPU que premultiplique los colores por
ti mientras los copia a la textura. De esa manera, cuando llames a `textureSample`, el valor
que obtengas ya estará premultiplicado.

El objetivo de esta sección era:

1. Explicar la opción de configuración `alphaMode: 'premultiplied'` del canvas de WebGPU.

   Esto permite que un canvas de WebGPU tenga transparencia.

2. Introducir el concepto de colores con alfa premultiplicado (premultiplied alpha colors).

   Cómo obtengas colores premultiplicados depende de ti. En el
   ejemplo anterior, creamos un `clearValue` premultiplicado
   en JavaScript.

   También podemos devolver colores desde fragment shaders (y/u)
   otros shaders. Podríamos proporcionar colores premultiplicados
   a esos shaders. Podríamos hacer la multiplicación en
   el propio shader. Podríamos ejecutar un pase de post-procesamiento
   para premultiplicar los colores. Lo importante es que
   los colores en el canvas, de una forma u otra, terminen
   premultiplicados si estamos usando `alphaMode: 'premultiplied'`.

   Una buena referencia para otros colores premultiplicados frente a no premultiplicados
   es este artículo:
   [GPUs prefer premultiplication](https://www.realtimerendering.com/blog/gpus-prefer-premultiplication/).

## <a href="a-discard"></a> Discard

`discard` es una sentencia de WGSL que puedes usar en un fragment
shader (shader de fragmentos) para descartar el fragmento (fragment) actual o, en otras palabras, para
no dibujar un píxel.

Tomemos nuestro ejemplo que dibuja un tablero de ajedrez en el fragment
shader usando el `@builtin(position)` del [artículo sobre variables de inter-etapa](webgpu-inter-stage-variables.html#a-builtin-position).

En lugar de dibujar un tablero de ajedrez de 2 colores, descartaremos
para uno de los dos casos.

```wgsl
@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-  let red = vec4f(1, 0, 0, 1);
  let cyan = vec4f(0, 1, 1, 1);

  let grid = vec2u(fsInput.position.xy) / 8;
  let checker = (grid.x + grid.y) % 2 == 1;

+        if (checker) {
+          discard;
+        }
+
+        return cyan;

-  return select(red, cyan, checker);
}
```

Algunos otros cambios: añadiremos el CSS de arriba para que el
canvas tenga un fondo de tablero de ajedrez de CSS. También estableceremos
`alphaMode: 'premultiplied'`. And we'll set the `clearValue`
to `[0, 0, 0, 0]`.

```js
  context.configure({
    device,
    format: presentationFormat,
+    alphaMode: 'premultiplied',
  });

  ...

  const renderPassDescriptor = {
    label: 'nuestro renderPass básico de canvas',
    colorAttachments: [
      {
        // view: <- se completará cuando rendericemos
-        clearValue: [0.3, 0.3, 0.3, 1],
+        clearValue: [0, 0, 0, 0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };
...

```

{{{example url="../webgpu-transparency-fragment-shader-discard.html"}}}

Deberías ver que cada dos cuadrados es "transparente" en el sentido de que
ni siquiera se dibujó.

Es común en un shader utilizado para la transparencia descartar basándose
en el valor alfa. Algo como:

```wgsl
@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
    let color = ... calcular un color ....

    if (color.a < threshold) {
      discard;
    }

    return color;
}
```

Donde `threshold` podría ser un valor de un uniform o una constante
o lo que sea apropiado.

Esto es probablemente lo más utilizado para sprites y para follaje como hierba y
hojas porque, si estamos dibujando y estamos usando una textura de profundidad (depth texture), como la que
presentamos en [el artículo sobre proyección ortográfica](webgpu-orthograpic-projection.html#a-depth-textures),
entonces cuando dibujamos un sprite, una hoja o una brizna de hierba, nada de los sprites,
hojas o hierba detrás de lo que estamos dibujando actualmente se dibujará, incluso si
el valor alfa es 0 porque todavía estaremos actualizando la textura de profundidad. Por lo tanto,
en lugar de dibujar, descartamos. Veremos esto más a fondo en otro artículo.

## <a href="a-blending"></a> Ajustes de blending

Finalmente llegamos a los ajustes de blending (mezcla). Cuando creas un render pipeline, para cada
`target` en el fragment shader, puedes establecer el estado del blending. En otras palabras,
aquí tienes un pipeline típico de nuestros otros ejemplos hasta ahora:

```js
    const pipeline = device.createRenderPipeline({
      label: 'pipeline de quad texturizado hardcodeado',
      layout: pipelineLayout,
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
    });
```

Y aquí está con el blending añadido a `target[0]`.

```js
    const pipeline = device.createRenderPipeline({
      label: 'pipeline de quad texturizado hardcodeado',
      layout: pipelineLayout,
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [
          {
            format: presentationFormat,
+            blend: {
+              color: {
+                srcFactor: 'one',
+                dstFactor: 'one-minus-src-alpha'
+              },
+              alpha: {
+                srcFactor: 'one',
+                dstFactor: 'one-minus-src-alpha'
+              },
+            },
          },
        ],
      },
    });
```

La lista completa de ajustes por defecto es:

```js
blend: {
  color: {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'zero',
  },
  alpha: {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'zero',
  },
}
```

Donde `color` es lo que sucede con la porción `rgb` de un color y `alpha` es
lo que sucede con la porción `a` (alfa).

`operation` puede ser uno de:

  * 'add'
  * 'subtract'
  * 'reverse-subtract'
  * 'min'
  * 'max'

`srcFactor` y `dstFactor` pueden ser cada uno uno de:

  * 'zero'
  * 'one'
  * 'src'
  * 'one-minus-src'
  * 'src-alpha'
  * 'one-minus-src-alpha'
  * 'dst'
  * 'one-minus-dst'
  * 'dst-alpha'
  * 'one-minus-dst-alpha'
  * 'src-alpha-saturated'
  * 'constant'
  * 'one-minus-constant'

La mayoría de ellos son relativamente sencillos de entender. Piensa en ello como:

```
    resultado = operacion((src * srcFactor),  (dst * dstFactor))
```

Donde `src` es el valor devuelto por tu fragment shader y `dst` es el valor
que ya está en la textura en la que estás dibujando.

Considera el valor por defecto donde `operation` es `'add'`, `srcFactor` es `'one'` y
`dstFactor` es `'zero'`. Esto nos da:

```
    resultado = add((src * 1), (dst * 0))
    resultado = add(src * 1, dst * 0)
    resultado = add(src, 0)
    resultado = src;
```

Como puedes ver, el resultado por defecto termina siendo simplemente `src`.

De los factores de mezcla (blend factors) anteriores, 2 mencionan una constante, `'constant'` y
`'one-minus-constant'`. La constante a la que se hace referencia aquí se establece en un render pass
con el comando `setBlendConstant` y su valor por defecto es `[0, 0, 0, 0]`. Esto te permite
cambiarla entre dibujos.

Probablemente el ajuste más común para el blending es:

```js
{
  operation: 'add',
  srcFactor: 'one',
  dstFactor: 'one-minus-src-alpha'
}
```

Este modo se usa con más frecuencia con "alfa premultiplicado" (premultiplied alpha), lo que significa que espera que
el "src" ya haya tenido sus colores RGB "premultiplicados" por el valor alfa como
cubrimos anteriormente.

Hagamos un ejemplo que muestre estas opciones.

Primero, hagamos un poco de JavaScript que cree dos imágenes de canvas 2D
con algo de alfa. Cargaremos estos 2 canvas en texturas de WebGPU.

Primero, algo de código para crear una imagen que usaremos para nuestra textura de destino (dst texture).

```js
const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;

function createDestinationImage(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  for (let i = 0; i <= 6; ++i) {
    gradient.addColorStop(i / 6, hsl(i / -6, 1, 0.5));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(0, 0, 0, 255)';
  ctx.globalCompositeOperation = 'destination-out';
  ctx.rotate(Math.PI / -4);
  for (let i = 0; i < size * 2; i += 32) {
    ctx.fillRect(-size, i, size * 2, 16);
  }

  return canvas;
}
```

Y aquí está funcionando:

{{{example url="../webgpu-blend-dest-canvas.html"}}}

Aquí tienes un poco de código para crear una imagen que usaremos para nuestra
textura de origen (src texture).

```js
const hsla = (h, s, l, a) => `hsla(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%, ${a})`;

function createSourceImage(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);

  ctx.globalCompositeOperation = 'screen';
  const numCircles = 3;
  for (let i = 0; i < numCircles; ++i) {
    ctx.rotate(Math.PI * 2 / numCircles);
    ctx.save();
    ctx.translate(size / 6, 0);
    ctx.beginPath();

    const radius = size / 3;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(0, 0, radius / 2, 0, 0, radius);
    const h = i / numCircles;
    gradient.addColorStop(0.5, hsla(h, 1, 0.5, 1));
    gradient.addColorStop(1, hsla(h, 1, 0.5, 0));

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }
  return canvas;
}
```

Y aquí está funcionando:

{{{example url="../webgpu-blend-src-canvas.html"}}}

Ahora que tenemos ambas, podemos modificar el ejemplo de importación de canvas de
[el artículo sobre importación de texturas](webgpu-import-textures.html#a-loading-canvas).

Primero, creemos las 2 imágenes de canvas:

```js
const size = 300;
const srcCanvas = createSourceImage(size);
const dstCanvas = createDestinationImage(size);
```

Modifiquemos el shader para que no multiplique
las coordenadas de textura por 50, ya que no intentaremos
dibujar un plano largo en la distancia.

```wgsl
@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  let pos = array(
    // 1er triángulo
    vec2f( 0.0,  0.0),  // centro
    vec2f( 1.0,  0.0),  // derecha, centro
    vec2f( 0.0,  1.0),  // centro, arriba

    // 2do triángulo
    vec2f( 0.0,  1.0),  // centro, arriba
    vec2f( 1.0,  0.0),  // derecha, centro
    vec2f( 1.0,  1.0),  // derecha, arriba
  );

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
-  vsOutput.texcoord = xy * vec2f(1, 50);
+  vsOutput.texcoord = xy;
  return vsOutput;
}
```

Actualicemos la función `createTextureFromSource` para que podamos pasarle `premultipliedAlpha: true/false`
y esta se lo pase a `copyExternalImageToTexture`.

```js
-  function copySourceToTexture(device, texture, source, {flipY} = {}) {
+  function copySourceToTexture(device, texture, source, {flipY, premultipliedAlpha} = {}) {
    device.queue.copyExternalImageToTexture(
      { source, flipY, },
-      { texture },
+      { texture, premultipliedAlpha },
      { width: source.width, height: source.height },
    );

    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }
```

Luego, usemos eso para crear dos versiones de cada textura, una premultiplicada y otra "no premultiplicada" o "sin premultiplicar".

```js
  const srcTextureUnpremultipliedAlpha =
      createTextureFromSource(
          device, srcCanvas,
          {mips: true});
  const dstTextureUnpremultipliedAlpha =
      createTextureFromSource(
          device, dstCanvas,
          {mips: true});

  const srcTexturePremultipliedAlpha =
      createTextureFromSource(
          device, srcCanvas,
          {mips: true, premultipliedAlpha: true});
  const dstTexturePremultipliedAlpha =
      createTextureFromSource(
          device, dstCanvas,
          {mips: true, premultipliedAlpha: true});
```

Nota: Podríamos añadir una opción para premultiplicar en el shader, pero se podría
decir que no es común. Más bien, es más común
decidir, basándose en tus necesidades, si todas las texturas que contienen color están premultiplicadas
o no. Así que nos quedaremos con texturas diferentes y añadiremos opciones de UI para
seleccionar las premultiplicadas o las no premultiplicadas.

Necesitamos un uniform buffer para cada uno de nuestros 2 dibujos, por si acaso queremos dibujar
en 2 lugares diferentes o si las texturas tienen 2 tamaños distintos.

```js
  function makeUniformBufferAndValues(device) {
    // offsets a los diversos valores de uniform en índices float32
    const kMatrixOffset = 0;

    // crear un buffer para los valores de uniform
    const uniformBufferSize =
      16 * 4; // la matriz es de 16 floats de 32 bits (4 bytes cada uno)
    const buffer = device.createBuffer({
      label: 'uniforms para quad',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // crear un typedarray para mantener los valores de los uniforms en JavaScript
    const values = new Float32Array(uniformBufferSize / 4);
    const matrix = values.subarray(kMatrixOffset, 16);
    return { buffer, values, matrix };
  }
  const srcUniform = makeUniformBufferAndValues(device);
  const dstUniform = makeUniformBufferAndValues(device);
```

Necesitamos un sampler y necesitamos un bindGroup para cada textura. Esto plantea un problema.
Un bindGroup necesita un bindGroup layout. La mayoría de los ejemplos en este sitio
obtienen su layout de un pipeline llamando a `somePipeline.getBindGroupLayout(groupNumber)`.
En nuestro caso, sin embargo, vamos a crear un pipeline basado en los ajustes de estado de mezcla (blend state)
que elijamos. Por lo tanto, no tendremos el pipeline para obtener un bindGroupLayout hasta el momento
del renderizado.

Podríamos crear los bindGroups en el momento del renderizado. O, podríamos crear nuestro propio
bindGroupLayout y decirle a los pipelines que lo usen. De esta manera, podemos crear los bindGroups
en el momento de la inicialización y serán compatibles con cualquier pipeline que use el mismo bindGroupLayout.

Los detalles de la creación de un [bindGroupLayout](GPUBindGroupLayout) y un [pipelineLayout](GPUPipelineLayout)
se cubren [en otro artículo](webgpu-bind-group-layouts.html). Por ahora, aquí está el código para crearlos
que coincida con nuestro módulo de shader:

```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { }, },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { } },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [
      bindGroupLayout,
    ],
  });
```

Con el bindGroupLayout creado, podemos usarlo para crear bindGroups.

```js
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });


  const srcBindGroupUnpremultipliedAlpha = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: srcTextureUnpremultipliedAlpha },
      { binding: 2, resource: { buffer: srcUniform.buffer }},
    ],
  });

  const dstBindGroupUnpremultipliedAlpha = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: dstTextureUnpremultipliedAlpha },
      { binding: 2, resource: { buffer: dstUniform.buffer }},
    ],
  });

  const srcBindGroupPremultipliedAlpha = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: srcTexturePremultipliedAlpha },
      { binding: 2, resource: { buffer: srcUniform.buffer }},
    ],
  });

  const dstBindGroupPremultipliedAlpha = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: dstTexturePremultipliedAlpha },
      { binding: 2, resource: { buffer: dstUniform.buffer }},
    ],
  });
```

Ahora que tenemos bindGroups y texturas, hagamos un array de
las texturas premultiplicadas frente a las no premultiplicadas para que podamos
seleccionar fácilmente un conjunto u otro:

```js
  const textureSets = [
    {
      srcTexture: srcTexturePremultipliedAlpha,
      dstTexture: dstTexturePremultipliedAlpha,
      srcBindGroup: srcBindGroupPremultipliedAlpha,
      dstBindGroup: dstBindGroupPremultipliedAlpha,
    },
    {
      srcTexture: srcTextureUnpremultipliedAlpha,
      dstTexture: dstTextureUnpremultipliedAlpha,
      srcBindGroup: srcBindGroupUnpremultipliedAlpha,
      dstBindGroup: dstBindGroupUnpremultipliedAlpha,
    },
  ];
```

En nuestro descriptor de render pass extraeremos el `clearValue` para que podamos
acceder a él más fácilmente:

```js
+  const clearValue = [0, 0, 0, 0];
  const renderPassDescriptor = {
    label: 'nuestro renderPass básico de canvas',
    colorAttachments: [
      {
        // view: <- se completará cuando rendericemos
-        clearValue: [0.3, 0.3, 0.3, 1],
+        clearValue,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };
```

Necesitaremos 2 render pipelines. Uno para dibujar la textura de destino (dest texture); este
no usará blending. Fíjate en que estamos pasando el pipelineLayout en lugar de usar
`auto` como hemos hecho en la mayoría de los ejemplos hasta ahora.

```js
  const dstPipeline = device.createRenderPipeline({
    label: 'pipeline de quad texturizado hardcodeado',
    layout: pipelineLayout,
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [ { format: presentationFormat } ],
    },
  });
```

El otro pipeline se creará en el momento del renderizado con las opciones de blending que elijamos.

```js
  const color = {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'one-minus-src',
  };

  const alpha = {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'one-minus-src',
  };

  function render() {
    ...

    const srcPipeline = device.createRenderPipeline({
      label: 'pipeline de quad texturizado hardcodeado',
      layout: pipelineLayout,
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [
          {
            format: presentationFormat,
            blend: {
              color,
              alpha,
            },
          },
        ],
      },
    });

```

Para renderizar, elegimos un conjunto de texturas y luego renderizamos la textura de destino (dst)
con el `dstPipeline` (sin blending), y luego, encima de eso, renderizamos
la textura de origen (src) con el `srcPipeline` (con blending).

```js
+  const settings = {
+    textureSet: 0,
+  };

  function render() {
    const srcPipeline = device.createRenderPipeline({
      label: 'pipeline de quad texturizado hardcodeado',
      layout: pipelineLayout,
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [
          {
            format: presentationFormat,
            blend: {
              color,
              alpha,
            },
          },
        ],
      },
    });

+    const {
+      srcTexture,
+      dstTexture,
+      srcBindGroup,
+      dstBindGroup,
+    } = textureSets[settings.textureSet];

    const canvasTexture = context.getCurrentTexture();
    // Obtener la textura actual del contexto del canvas y
    // establecerla como la textura en la que renderizar.
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    function updateUniforms(uniform, canvasTexture, texture) {
+      const projectionMatrix = mat4.ortho(0, canvasTexture.width, canvasTexture.height, 0, -1, 1);
+
+      mat4.scale(projectionMatrix, [texture.width, texture.height, 1], uniform.matrix);
+
+      // copiar los valores de JavaScript a la GPU
+      device.queue.writeBuffer(uniform.buffer, 0, uniform.values);
+    }
+    updateUniforms(srcUniform, canvasTexture, srcTexture);
+    updateUniforms(dstUniform, canvasTexture, dstTexture);

    const encoder = device.createCommandEncoder({ label: 'renderizar con blending' });
    const pass = encoder.beginRenderPass(renderPassDescriptor);

+    // dibujar dst
+    pass.setPipeline(dstPipeline);
+    pass.setBindGroup(0, dstBindGroup);
+    pass.draw(6);  // llamar a nuestro vertex shader 6 veces
+
+    // dibujar src
+    pass.setPipeline(srcPipeline);
+    pass.setBindGroup(0, srcBindGroup);
+    pass.draw(6);  // llamar a nuestro vertex shader 6 veces

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Ahora hagamos algo de UI para establecer estos valores:

```js
+  const operations = [
+    'add',
+    'subtract',
+    'reverse-subtract',
+    'min',
+    'max',
+  ];
+
+  const factors = [
+    'zero',
+    'one',
+    'src',
+    'one-minus-src',
+    'src-alpha',
+    'one-minus-src-alpha',
+    'dst',
+    'one-minus-dst',
+    'dst-alpha',
+    'one-minus-dst-alpha',
+    'src-alpha-saturated',
+    'constant',
+    'one-minus-constant',
+  ];

  const color = {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'one-minus-src',
  };

  const alpha = {
    operation: 'add',
    srcFactor: 'one',
    dstFactor: 'one-minus-src',
  };

  const settings = {
    textureSet: 0,
  };

+  const gui = new GUI().onChange(render);
+  gui.add(settings, 'textureSet', ['alfa premultiplicado', 'alfa no premultiplicado']);
+  const colorFolder = gui.addFolder('color');
+  colorFolder.add(color, 'operation', operations);
+  colorFolder.add(color, 'srcFactor', factors);
+  colorFolder.add(color, 'dstFactor', factors);
+  const alphaFolder = gui.addFolder('alpha');
+  alphaFolder.add(alpha, 'operation', operations);
+  alphaFolder.add(alpha, 'srcFactor', factors);
+  alphaFolder.add(alpha, 'dstFactor', factors);
```

Si la operación es `'min'` o `'max'`, debemos establecer `srcFactor` y `dstFactor` en
`'one'`, de lo contrario obtendremos un error.

```js
+  function makeBlendComponentValid(blend) {
+    const { operation } = blend;
+    if (operation === 'min' || operation === 'max') {
+      blend.srcFactor = 'one';
+      blend.dstFactor = 'one';
+    }
+  }

  function render() {
+    makeBlendComponentValid(color);
+    makeBlendComponentValid(alpha);
+    gui.updateDisplay();

    ...
```

También hagamos posible establecer la constante de mezcla (blend constant) para cuando elijamos
`'constant'` o `'one-minus-constant'` como factor.

```js
+  const constant = {
+    color: [1, 0.5, 0.25],
+    alpha: 1,
+  };

  const settings = {
    textureSet: 0,
  };

  const gui = new GUI().onChange(render);
  gui.add(settings, 'textureSet', ['alfa premultiplicado', 'alfa no premultiplicado']);
  ...
+  const constantFolder = gui.addFolder('constant');
+  constantFolder.addColor(constant, 'color');
+  constantFolder.add(constant, 'alpha', 0, 1);

  ...

  function render() {
    ...

    const pass = encoder.beginRenderPass(renderPassDescriptor);

    // dibujar dst
    pass.setPipeline(dstPipeline);
    pass.setBindGroup(0, dstBindGroup);
    pass.draw(6);  // llamar a nuestro vertex shader 6 veces

    // dibujar src
    pass.setPipeline(srcPipeline);
    pass.setBindGroup(0, srcBindGroup);
+    pass.setBlendConstant([...constant.color, constant.alpha]);
    pass.draw(6);  // llamar a nuestro vertex shader 6 veces

    pass.end();
  }
```

Como hay 13 * 13 * 5 * 13 * 13 * 5 configuraciones posibles, hay
demasiadas para explorar, así que proporcionemos una lista de preajustes (presets). Si
no hay un ajuste de `alpha`, simplemente repetiremos el ajuste de `color`.

```js
+  const presets = {
+    'por defecto (copy)': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one',
+        dstFactor: 'zero',
+      },
+    },
+    'mezcla premultiplicada (source-over)': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one',
+        dstFactor: 'one-minus-src-alpha',
+      },
+    },
+    'mezcla no premultiplicada': {
+      color: {
+        operation: 'add',
+        srcFactor: 'src-alpha',
+        dstFactor: 'one-minus-src-alpha',
+      },
+    },
+    'destination-over': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one-minus-dst-alpha',
+        dstFactor: 'one',
+      },
+    },
+    'source-in': {
+      color: {
+        operation: 'add',
+        srcFactor: 'dst-alpha',
+        dstFactor: 'zero',
+      },
+    },
+    'destination-in': {
+      color: {
+        operation: 'add',
+        srcFactor: 'zero',
+        dstFactor: 'src-alpha',
+      },
+    },
+    'source-out': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one-minus-dst-alpha',
+        dstFactor: 'zero',
+      },
+    },
+    'destination-out': {
+      color: {
+        operation: 'add',
+        srcFactor: 'zero',
+        dstFactor: 'one-minus-src-alpha',
+      },
+    },
+    'source-atop': {
+      color: {
+        operation: 'add',
+        srcFactor: 'dst-alpha',
+        dstFactor: 'one-minus-src-alpha',
+      },
+    },
+    'destination-atop': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one-minus-dst-alpha',
+        dstFactor: 'src-alpha',
+      },
+    },
+    'aditivo (lighten)': {
+      color: {
+        operation: 'add',
+        srcFactor: 'one',
+        dstFactor: 'one',
+      },
+    },
+  };

  ...

  const settings = {
    textureSet: 0,
+    preset: 'por defecto (copy)',
  };

  const gui = new GUI().onChange(render);
  gui.add(settings, 'textureSet', ['alfa premultiplicado', 'alfa no premultiplicado']);
+  gui.add(settings, 'preset', Object.keys(presets))
+    .name('preset de blending')
+    .onChange(presetName => {
+      const preset = presets[presetName];
+      Object.assign(color, preset.color);
+      Object.assign(alpha, preset.alpha || preset.color);
+      gui.updateDisplay();
+    });

  ...
```

También permitamos elegir la configuración del canvas para `alphaMode`.

```js
  const settings = {
+    alphaMode: 'premultiplied',
    textureSet: 0,
    preset: 'por defecto (copy)',
  };

  const gui = new GUI().onChange(render);
+  gui.add(settings, 'alphaMode', ['opaque', 'premultiplied']).name('alphaMode del canvas');
  gui.add(settings, 'textureSet', ['alfa premultiplicado', 'alfa no premultiplicado']);

  ...

  function render() {
    ...

+    context.configure({
+      device,
+      format: presentationFormat,
+      alphaMode: settings.alphaMode,
+    });

    const canvasTexture = context.getCurrentTexture();
    // Obtener la textura actual del contexto del canvas y
    // establecerla como la textura en la que renderizar.
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

```

Y finalmente, permitamos elegir el `clearValue` para el render pass.

```js
+  const clear = {
+    color: [0, 0, 0],
+    alpha: 0,
+    premultiply: true,
+  };

  const settings = {
    alphaMode: 'premultiplied',
    textureSet: 0,
    preset: 'por defecto (copy)',
  };

  const gui = new GUI().onChange(render);

  ...

+  const clearFolder = gui.addFolder('color de limpieza');
+  clearFolder.add(clear, 'premultiply');
+  clearFolder.add(clear, 'alpha', 0, 1);
+  clearFolder.addColor(clear, 'color');

  function render() {
    ...

    const canvasTexture = context.getCurrentTexture();
    // Obtener la textura actual del contexto del canvas y
    // establecerla como la textura en la que renderizar.
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    {
+      const { alpha, color, premultiply } = clear;
+      const mult = premultiply ? alpha : 1;
+      clearValue[0] = color[0] * mult;
+      clearValue[1] = color[1] * mult;
+      clearValue[2] = color[2] * mult;
+      clearValue[3] = alpha;
+    }
```

Eran muchas opciones. Quizás demasiadas 😅. En cualquier caso, ahora tenemos un
ejemplo donde podemos jugar con los ajustes de mezcla (blend settings).

{{{example url="../webgpu-blend.html"}}}

Dadas nuestras imágenes de origen:

<div class="webgpu_center">
  <div data-diagram="original"></div>
</div>

Aquí hay algunos ajustes de mezcla conocidos y útiles:

<div class="webgpu_center">
  <div data-diagram="blend-premultiplied blend (source-over)"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-destination-over"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-additive (lighten)"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-source-in"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-destination-in"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-source-out"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-destination-out"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-source-atop"></div>
</div>

<div class="webgpu_center">
  <div data-diagram="blend-destination-atop"></div>
</div>

<hr>

Estos nombres de ajustes de mezcla provienen de las opciones de
[`globalCompositeOperation`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
de Canvas 2D. Hay más opciones enumeradas en esa especificación, pero la mayoría del resto requieren
más matemáticas de las que se pueden hacer solo con estos ajustes de mezcla base y, por lo tanto, requieren
soluciones diferentes.

Ahora que tenemos estos fundamentos del blending en WebGPU, podemos referirnos a ellos a medida que
cubramos diversas técnicas.

<!-- keep this at the bottom of the article -->
<link href="webgpu-transparency.css" rel="stylesheet">
<script type="module" src="webgpu-transparency.js"></script>
