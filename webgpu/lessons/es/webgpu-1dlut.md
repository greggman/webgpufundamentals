Title: Post-procesamiento en WebGPU - Tablas de búsqueda 1D (1D-LUT)
Description: Tablas de búsqueda 1D (1D-LUT)
TOC: Tablas de búsqueda 1D (1D-LUT)

Este artículo es el segundo de una breve serie sobre ajustes de imagen. Cada uno se basa en la lección anterior, por lo que puede que te resulte más fácil entenderlos leyéndolos en orden.

{{{toc-steps list="image-adjustments.hanson"}}}

Continuando donde lo dejamos, vamos a implementar un ajuste de imagen "duotono" (duotone). Aquí es donde usamos el brillo de una imagen para seleccionar entre 2 colores.

<div class="webgpu_center center"><div data-diagram="duotone" data-labels='{"type": "duotone"}'></div></div>

En la imagen de arriba, la oscuridad selecciona el primer color y el brillo el segundo. Cuanto más oscuro, más cerca del primer color; cuanto más brillante, más cerca del segundo.

Podríamos simplemente elegir el canal de color máximo como nuestro brillo y obtendríamos un efecto pero, los ojos humanos son más sensibles al verde así que, al menos en el monitor de una computadora o en la pantalla de un teléfono, el verde es más brillante que el rojo, el cual es más brillante que el azul.

La fórmula para convertir RGB a brillo, o "luminancia" (luminance), es

```
luminance = red * 0.2126 + green * 0.7152 + blue * 0.07222
```

Mirando esa fórmula, el verde es ~2.5 veces más brillante que el rojo y ~10 veces más brillante que el azul.

<div class="webgpu_center center">
  <img src="resources/images/rba-luminance.svg" class="noinvertdark" style="width: 600px;">
  <div>rojo, verde, azul y sus luminancias equivalentes</div>
</div>

Convirtiendo eso a WGSL, podemos escribirlo así:

```wgsl
fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}
```

donde `dot` multiplica cada elemento correspondiente de los 2 vectores y suma los resultados.

Usando eso, podemos crear un ajuste de duotono y añadirlo a nuestro shader (continuando desde el artículo anterior), así:

```wgsl
fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

+fn applyDuotone(color: vec3f, color1: vec3f, color2: vec3f) -> vec3f {
+  let l = luminance(color);
+  return mix(color1, color2, l);
+}

...

struct Uniforms {
  brightness: f32,
  contrast: f32,
  @align(16) hsl: HSL,
+  @align(16) duotone: f32,
+  @align(16) duotoneColor1: vec3f,
+  @align(16) duotoneColor2: vec3f,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
  rgb = adjustHSL(rgb, uni.hsl);
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
+  rgb = mix(rgb, applyDuotone(rgb, uni.duotoneColor1, uni.duotoneColor2), uni.duotone);
  return vec4f(rgb, color.a);
}
```

Añadimos una cantidad de mezcla llamada `duotone` solo para que podamos decidir qué tanto usar esta mezcla de duotono.

Eliminemos los ajustes de HSL ya que saturan el ejemplo:

```wgsl
struct Uniforms {
  brightness: f32,
  contrast: f32,
-  @align(16) hsl: HSL,
  @align(16) duotone: f32,
  @align(16) duotoneColor1: vec3f,
  @align(16) duotoneColor2: vec3f,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
-  rgb = adjustHSL(rgb, uni.hsl);
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
  rgb = mix(rgb, applyDuotone(rgb, uni.duotoneColor1, uni.duotoneColor2), uni.duotone);
  return vec4f(rgb, color.a);
}
```

Y necesitamos actualizar nuestro JavaScript para establecer los parámetros de duotono.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
        settings.contrast,
        0,
        0,
-        settings.hue,
-        settings.saturation,
-        settings.lightness,
-        0,
+        settings.duotone,
+        0,
+        0,
+        0,
+        ...settings.duotoneColor1, 0,
+        ...settings.duotoneColor2, 0,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
    contrast: 0,
-    hue: 0,
-    saturation: 0,
-    lightness: 0,
+    duotone: 1,
+    duotoneColor1: new Float32Array([0.1, 0, 0.5]),
+    duotoneColor2: new Float32Array([1, 0.69, 0.4]),
  };

  const gui = new GUI();
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
  gui.add(settings, 'contrast', -1, 10);
-  gui.add(settings, 'hue', -0.5, 0.5);
-  gui.add(settings, 'saturation', -1, 1);
-  gui.add(settings, 'lightness', -1, 1);
+  gui.add(settings, 'duotone', 0, 1);
+  gui.addColor(settings, 'duotoneColor1');
+  gui.addColor(settings, 'duotoneColor2');
```

Y con eso obtenemos un efecto de duotono.

{{{example url="../webgpu-post-processing-image-adjustments-duotone.html"}}}

Ten en cuenta que muchos efectos comunes se pueden hacer de esta manera. Por ejemplo, "sepia" es básicamente cuestión de elegir tonos sepia.

<div class="webgpu_center center"><div data-diagram="sepia" data-labels='{"type": "sepia"}'></div></div>

# <a href="a-texture"></a> Usando una textura

En el código anterior estamos mezclando (`mix`) entre 2 colores.

```js
  let l = luminance(color);
  return mix(color1, color2, l);
```

Otra forma de mezclar entre colores es usar una textura de 2ˣ1 píxeles con filtrado lineal (linear filtering), como explicamos en [el artículo sobre texturas](webgpu-textures.html#a-linear-interpolation).

Hagámoslo. Aquí hay un poco de código WGSL para usar una textura para mezclar sus colores a lo largo de la misma.

```wgsl
fn apply1DLUT(
    color: vec3f,
    lut: texture_2d<f32>,
    smp: sampler) -> vec3f {
  let l = luminance(color);
  let width = f32(textureDimensions(lut, 0).x);
  let range = (width - 1) / width;
  let u = 0.5 / width + l * range;
  return textureSample(lut, smp, vec2f(u, 0.5)).rgb;
}
```

¿A qué viene toda esa matemática extra? ¿Por qué no es simplemente:

```wgsl
// Advertencia: ¡No funcionará!
fn apply1DLUT(
    color: vec3f,
    lut: texture_2d<f32>,
    smp: sampler) -> vec3f {
  let l = luminance(color);
  return textureSample(lut, smp, vec2f(l, 0.5)).rgb;
}
```

Recuerda cómo funciona el muestreo lineal de texturas.

<div class="webgpu_center center">
  <img src="resources/images/linear-texture-interpolation.svg" class="noinvertdark" style="width: 600px;">
  <div>Textura de 2x1 píxeles y el color de cada coordenada</div>
</div>

Si miramos una textura de 2ˣ1 píxeles, muestrear desde 0.0 hasta el centro del píxel más a la izquierda simplemente devuelve el color del primer píxel. Del mismo modo, desde el centro del de más a la derecha hasta 1.0 obtenemos solo el color del segundo píxel. Solo queremos la parte entre los 2 píxeles, así que tenemos que mapear el valor de luminancia al rango en el espacio de coordenadas entre los 2 píxeles y luego sumar 0.5 de un píxel.

Con eso, podemos usar nuestra nueva función:

```wgsl
struct Uniforms {
  brightness: f32,
  contrast: f32,
-  @align(16) duotone: f32,
-  @align(16) duotoneColor1: vec3f,
-  @align(16) duotoneColor2: vec3f,
+  gradient: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;
+@group(1) @binding(0) var lut: texture_2d<f32>;
+@group(1) @binding(1) var lutSampler: sampler;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
-  rgb = mix(rgb, applyDuotone(rgb, uni.duotoneColor1, uni.duotoneColor2), uni.duotone);
+  rgb = mix(rgb, apply1DLUT(rgb, lut, lutSampler), uni.gradient);

  return vec4f(rgb, color.a);
}
```

En el shader, ponemos la textura de gradiente y el sampler en su propio grupo.

Luego necesitamos crear una textura, un sampler y un bindGroup.

```js
  const lutSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const rgbToUnorm8 = (rgb) => [0, 0, 0, 1].map((v, i) => (rgb[i] ?? v) * 255 | 0);
  const gradientColors = new Uint8Array([
    ...rgbToUnorm8([0.1, 0, 0.5]),
    ...rgbToUnorm8([1, 0.69, 0.4]),
  ]);
  const lutTexture = device.createTexture({
    size: [2],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
  });
  device.queue.writeTexture(
    { texture: lutTexture },
    gradientColors,
    { },
    [2],
  );

  const lutBindGroup = device.createBindGroup({
    layout: postProcessPipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: lutTexture },
      { binding: 1, resource: lutSampler },
    ],
  });
```

Aquí estamos creando 2 valores `rgba8unorm` a partir de nuestros colores de duotono anteriores y subiéndolos a una textura de 2ˣ1.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
        settings.contrast,
-        0,
-        0,
-        settings.duotone,
-        0,
-        0,
-        0,
-        ...settings.duotoneColor1, 0,
-        ...settings.duotoneColor2, 0,
+        settings.lutAmount,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
+    pass.setBindGroup(0, lutBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
    contrast: 0,
-    duotone: 1,
-    duotoneColor1: new Float32Array([0.1, 0, 0.5]),
-    duotoneColor2: new Float32Array([1, 0.69, 0.4]),
+    lutAmount: 1,
  };

  const gui = new GUI();
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
  gui.add(settings, 'contrast', -1, 10);
-  gui.add(settings, 'duotone', 0, 1);
-  gui.addColor(settings, 'duotoneColor1');
-  gui.addColor(settings, 'duotoneColor2');
+  gui.add(settings, 'lutAmount', 0, 1);
```

Y con eso hemos pasado a usar una textura.

{{{example url="../webgpu-post-processing-image-adjustments-1d-lut.html"}}}

Con todo ese esfuerzo, los resultados se ven exactamente iguales al ejemplo anterior, ¿cuál era el punto entonces? Además, para cambiar los colores tendríamos que actualizar la textura con nuevos colores.

El punto es que ahora puedes proporcionar cualquier número de colores. Simplemente crea texturas más grandes. No tienes que actualizar el shader.

Aquí tienes 12 ejemplos; debajo de cada imagen está la textura de 256x1 que se pasa al mismo código de arriba. Esto a menudo se llama un [mapa de gradiente](https://google.com/search?q=gradient%20map) (gradient map), ya que mapea la luminancia de la imagen a través de un "gradiente". Sin embargo, la textura no tiene por qué ser gradientes. Puedes ver un par de ejemplos donde la textura tiene colores sólidos, no gradientes.

<div class="webgpu_center center"><div data-diagram="luts" class="fill-container" style="max-width: 1200px"></div></div>

Hagamos algo de código para crear estas texturas de gradiente. Dado un conjunto de colores y puntos de parada (stops) entre 0 y 1, podríamos escribir código para interpolar entre ellos y crear las texturas. Pero el navegador ya tiene código para crear gradientes en su biblioteca 2D, así que usémoslo.

Aquí hay algunos datos de gradiente donde cada entrada es r, g, b en formato `unorm8` (0-255) y el último número es un valor de 0.0 a 1.0 que indica en qué parte del gradiente se encuentra ese color:

```js
  const gradients = [
    [
      [  0,   0,   0, 0.0],
      [236,  23, 223, 0.37],
      [255, 144,   0, 0.48],
      [255, 255, 255, 1],
    ],
    [
      [  0,   0,   0, 0.0],
      [236,  23,  23, 0.33],
      [230, 194, 108, 0.50],
      [249, 197, 241, 0.64],
      [255, 255, 255, 1],
    ],
    [
      [ 10,  10,  10, 0.0],
      [ 90,   0, 255, 0.40],
      [255,   0,   0, 0.70],
      [132, 255,   0, 1],
    ],
    [
      [ 20,  20,  20, 0.0],
      [  0,  61, 201, 0.24],
      [ 76, 229, 155, 0.47],
      [246, 239,  45, 0.66],
      [255, 255, 255, 0.80],
    ],
    [
      [  4,   4,   4, 0.0],
      [  0, 184, 255, 0.50],
      [255, 133,   0, 0.60],
      [255, 255, 255, 1],
    ],
    [
      [ 17,  37,  81, 0.0],
      [198, 229, 112, 0.43],
      [255, 215, 104, 0.51],
      [252, 235, 241, 0.59],
      [ 97, 159, 234, 0.85],
      [  0,  65, 128, 1],
    ],
    [
      [  0,   0,   0, 0.0],
      [ 10,   0, 178, 0.14],
      [255,   0,   0, 0.50],
      [ 50, 178,   0, 0.61],
      [255, 252,   0, 0.80],
      [255, 255, 255, 0.98],
    ],
    [
      [  0,   0,   0, 0.0],
      [204,  27, 236, 0.25],
      [ 54, 129, 221, 0.41],
      [ 71, 193, 223, 0.60],
      [231, 203,  47, 0.79],
      [255, 255, 255, 1],
    ],
    [
      [ 27,  27,  27, 0.4],
      [114,   0, 255, 0.15],
      [  0, 228, 255, 0.61],
      [236, 196, 196, 0.68],
      [255, 211, 211, 1],
    ],
    [
      [ 26,  47,  71, 0.44],
      [207,  27,  38, 0.44],
      [207,  27,  38, 0.64],
      [103, 138, 146, 0.64],
      [103, 138, 146, 0.75],
      [231, 210, 155, 0.75],
    ],
    [
      [  0,   0,   0, 0.0],
      [ 51, 186, 236, 0.42],
      [248, 179,  13, 0.74],
      [255, 255, 255, 1],
    ],
    [
      [  0,   0,   0, 0.27],
      [ 54, 167, 227, 0.27],
      [ 54, 167, 227, 0.38],
      [154, 148, 194, 0.38],
      [154, 148, 194, 0.49],
      [166, 204,  59, 0.49],
      [166, 204,  59, 0.60],
      [227, 141,  32, 0.60],
      [227, 141,  32, 0.73],
      [246, 231,   8, 0.73],
      [246, 231,   8, 0.82],
      [255, 255, 255, 0.82],
    ],
    [
      [  0,   0,   0, 0],
      [255, 255, 255, 1],
    ],
    [
      [  0,   0,   0, 0.25],
      [255, 255, 255, 0.75],
    ],
    [
      [112,  66,  20, 0],
      [250, 235, 215, 1],
    ],
  ];
```

Podemos crear texturas de gradiente a partir de ellos usando un [gradiente lineal](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient) de 2D.

```js
  const lutSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

-  const rgbToUnorm8 = (rgb) => [0, 0, 0, 1].map((v, i) => (rgb[i] ?? v) * 255 | 0);
-  const gradientColors = new Uint8Array([
-    ...rgbToUnorm8([0.1, 0, 0.5]),
-    ...rgbToUnorm8([1, 0.69, 0.4]),
-  ]);
-  const lutTexture = device.createTexture({
-    size: [2],
-    format: 'rgba8unorm',
-    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
-  });
-  device.queue.writeTexture(
-    { texture: lutTexture },
-    gradientColors,
-    { },
-    [2],
-  );
+  const ctx = new OffscreenCanvas(256, 1).getContext('2d');
+  const lutBindGroups = gradients.map(stops => {
+    const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
+    for (const [r, g, b, stop] of stops) {
+      grad.addColorStop(stop, `rgb(${r}, ${g}, ${b})`);
+    }
+    ctx.fillStyle = grad;
+    ctx.fillRect(0, 0, ctx.canvas.width, 1);
+    const texture = createTextureFromSource(device, ctx.canvas);
+
+    return device.createBindGroup({
+      layout: postProcessPipeline.getBindGroupLayout(1),
+      entries: [
+        { binding: 0, resource: texture },
+        { binding: 1, resource: lutSampler },
+      ],
+    });
+  });
```

Creamos un bindGroup para cada gradiente. Ahora necesitamos usarlos.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    ...

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
-    pass.setBindGroup(1, lutBindGroup);
+    pass.setBindGroup(1, lutBindGroups[settings.lut]);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
    contrast: 0,
    lutAmount: 1,
+    lut: 0,
  };

  const gui = new GUI();
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
  gui.add(settings, 'contrast', -1, 10);
  gui.add(settings, 'lutAmount', 0, 1);
```

Y necesitamos una forma de seleccionar un gradiente. Usemos CSS para mostrar los gradientes de modo que podamos hacer clic en ellos.

Primero, un elemento contenedor.

```html
  <body>
    <canvas></canvas>
+    <div id="ui"></div>
  </body>
```

y algo de CSS:

```css
#ui {
  position: absolute;
  left: 0px;
  top: 0px;
  overflow: auto;
  height: 100%;
}
.gradient {
  margin: 1px;
  width: 100px;
  height: 20px;
}
```

Y luego creemos elementos con gradientes usando [linear-gradient](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient) de CSS.

```js
  const uiElem = document.querySelector('#ui');
  gradients.forEach((stops, i) => {
    const div = document.createElement('div');
    div.className = 'gradient';
    div.style.background = `linear-gradient(to right,
      ${stops.map(([r, g, b, stop]) => `rgb(${r}, ${g}, ${b}) ${stop * 100}%`).join(',')}
    )`;
    div.addEventListener('click', () => {
      settings.lut = i;
      render();
    });
    uiElem.append(div);
  });
```

Y el resultado:

{{{example url="../webgpu-post-processing-image-adjustments-1d-luts.html"}}}

En el [próximo artículo](webgpu-3dlut.html) expandiremos estas texturas lineales a texturas 3D.

<!-- manten esto en la parte inferior del artículo -->
<link href="webgpu-1dlut.css" rel="stylesheet">
<script type="module" src="webgpu-1dlut.js"></script>
