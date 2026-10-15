Title: Post Processing en WebGPU - Ajustes de imagen
Description: Ajustes de imagen
TOC: Ajustes de imagen

Este artículo es el primero de una breve serie sobre ajustes de imagen. Cada uno se basa en la lección anterior, por lo que puede resultarte más fácil entenderlos leyéndolos en orden.

{{{toc-steps list="image-adjustments.hanson"}}}

En [un artículo anterior](webgpu-post-processing.html) cubrimos cómo hacer [post-procesamiento (post processing)](webgpu-post-processing.html). Algunas operaciones comunes que a menudo se desean realizar se llaman ajustes de imagen, como se ve en programas de edición de imágenes como Photoshop, GIMP, Affinity Photo, etc...

Como preparación, hagamos un ejemplo que cargue una imagen y tenga un paso de post-procesamiento. Esto será efectivamente la primera parte de [el artículo anterior](webgpu-post-processing.html) fusionada con nuestro ejemplo de cargar una imagen de [el artículo sobre la carga de imágenes en texturas](webgpu-importing-textures.html).

Recuerda que, en el artículo anterior sobre post-procesamiento, primero dibujamos algo en una textura. Luego aplicamos un pase de post-procesamiento para llevar esa textura al canvas. Aquí tendremos una configuración similar pero para la primera parte, en lugar de dibujar un montón de círculos en movimiento, simplemente dibujaremos una imagen. [^one-pass]

[^one-pass]: Técnicamente, para los ajustes de imagen, no necesitamos 2 pasos. Primero dibujar las imágenes en una textura y luego aplicar los ajustes. Podríamos simplemente aplicar los ajustes mientras dibujamos la imagen. La ventaja de hacerlo como un proceso separado es que podemos usarlo en cualquier situación; por ejemplo, un juego podría usar ajustes de imagen basados en post-procesamiento para establecer un tono, para hacer fundidos de entrada y salida (fade in/out), y para varios otros efectos.

Aquí están los shaders:

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;

@vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
  let positions = array(
    vec2f( 0,  0),
    vec2f( 1,  0),
    vec2f( 0,  1),
    vec2f( 0,  1),
    vec2f( 1,  0),
    vec2f( 1,  1),
  );
  let pos = positions[vNdx];
  return VSOutput(
    uni.matrix * vec4f(pos, 0, 1),
    pos,
  );
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(tex, smp, fsInput.texcoord);
}
```

Este shader está configurado de forma fija (hardcoded) para dibujar un quad unitario, un rectángulo de 1x1 unidades, en la esquina superior derecha. Esto es efectivamente lo que teníamos en el primer ejemplo de [cargar una imagen en una textura](webgpu-importing-textures.html). La diferencia esta vez es que multiplicamos las posiciones del quad por una matriz que pasamos en un buffer de uniformes (uniform buffer). Esto nos permitirá orientar, posicionar y escalar el quad.

Aquí está el código para usarlo:

```js
import {mat4} from '../3rdparty/wgpu-matrix.module.js';

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
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

  const module = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      @group(0) @binding(2) var smp: sampler;

      @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
        let positions = array(
          vec2f( 0,  0),
          vec2f( 1,  0),
          vec2f( 0,  1),
          vec2f( 0,  1),
          vec2f( 1,  0),
          vec2f( 1,  1),
        );
        let pos = positions[vNdx];
        return VSOutput(
          uni.matrix * vec4f(pos, 0, 1),
          pos,
        );
      }

      @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
        return textureSample(tex, smp, fsInput.texcoord);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'textured unit quad',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: 'rgba8unorm' }],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const imageUniformBuffer = device.createBuffer({
    size: 4 * 16,  // mat4x4
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const imageTexture = await createTextureFromImage(
    device,
    'resources/images/david-clode-clown-fish.jpg',
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const imageBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: imageUniformBuffer  },
      { binding: 1, resource: imageTexture },
      { binding: 2, resource: imageSampler },
    ],
  });

```

La imagen que se carga es de [David Clode](https://unsplash.com/@davidclode) de [aquí](https://unsplash.com/photos/orange-and-white-clown-fish-x9yfTxHpj5w).

El código de post-procesamiento es prácticamente el mismo que en el primer ejemplo de post-procesamiento. No hace nada, pero mantenemos una estructura de uniformes superflua para no tener que eliminar el código de configuración del buffer de uniformes y volver a añadirlo en el siguiente paso.

```js
  const postProcessModule = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
      ) -> VSOutput {
        var pos = array(
          vec2f(-1.0, -1.0),
          vec2f(-1.0,  3.0),
          vec2f( 3.0, -1.0),
        );

        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
        return vsOutput;
      }

      struct Uniforms {
*        unused: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
*        _ = uni; // so it's included in the bind group
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        return vec4f(rgb, color.a);
      }
    `,
  });

  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      { loadOp: 'clear', storeOp: 'store' },
    ],
  };

  const postProcessUniformBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let renderTarget;
  let postProcessBindGroup;

  function setupPostProcess(canvasTexture) {
    if (renderTarget?.width === canvasTexture.width &&
        renderTarget?.height === canvasTexture.height) {
      return;
    }

    renderTarget?.destroy();
    renderTarget = device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const renderTargetView = renderTarget;
    renderPassDescriptor.colorAttachments[0].view = renderTargetView;

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTargetView },
        { binding: 1, resource: postProcessSampler },
        { binding: 2, resource: postProcessUniformBuffer  },
      ],
    });
  }

  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

El renderizado cambia de un bucle `requestAnimationFrame` a renderizado bajo demanda.

```js
    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

*    // css 'cover'
*    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
*    const imageAspect = imageTexture.width / imageTexture.height;
*    const aspect = canvasAspect / imageAspect;
*    const aspectScale = aspect > 1 ? [1, aspect, 1] : [1 / aspect, 1, 1];
*
*    const matrix = mat4.identity();
*    mat4.scale(matrix, [2, 2, 1], matrix);
*    mat4.scale(matrix, aspectScale, matrix);
*    mat4.translate(matrix, [-0.5, -0.5, 1], matrix);
*
*    // Copy our the uniform values to the GPU
*    device.queue.writeBuffer(imageUniformBuffer, 0, matrix);

    // Draw the image to a texture.
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, imageBindGroup);
    pass.draw(6);
    pass.end();

    postProcess(encoder, renderTarget, canvasTexture);

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
    }
    render();
  });
  observer.observe(canvas);
```

El código anterior calcula una matriz que produce un modo `cover` estilo CSS para nuestra imagen. En otras palabras, escala la imagen para que todo el canvas quede cubierto.

Añadamos unos pequeños retoques:

Hagamos que se pueda arrastrar y soltar (drag and drop) una imagen. Utilizaremos una librería de ayuda.

```js
+import * as dragAndDrop from './resources/js/drag-and-drop.js';

...

-  const imageTexture = await createTextureFromImage(
+  let imageTexture = await createTextureFromImage(
     device,
     'resources/images/david-clode-clown-fish.jpg',
   );

   const imageSampler = device.createSampler({
     minFilter: 'linear',
     magFilter: 'linear',
   });

-  const imageBindGroup = device.createBindGroup({
+  let imageBindGroup;
+  function updateBindGroup() {
+    imageBindGroup = device.createBindGroup({
*      layout: pipeline.getBindGroupLayout(0),
*      entries: [
*        { binding: 0, resource: imageUniformBuffer  },
*        { binding: 1, resource: imageTexture },
*        { binding: 2, resource: imageSampler },
*      ],
*    });
+  }
+  updateBindGroup();

...

+  const gui = new GUI();
+  gui.name('Drag-n-Drop Image');
+  gui.onChange(render);

...

+  async function readImageFile(file) {
+    const newImageTexture = await createTextureFromImage(device, URL.createObjectURL(file));
+    imageTexture.destroy();
+    imageTexture = newImageTexture;
+    updateBindGroup();
+    render();
+  }
+
+  dragAndDrop.setup({msg: 'Drop Image File here'});
+  dragAndDrop.onDropFile(readImageFile);

```

La parte de la `GUI` no es necesaria, pero le indicará al usuario que puede arrastrar y soltar una imagen.

Luego, dado que la mayoría de los teléfonos no admiten el arrastrar y soltar, hagamos que sea posible pegar una imagen. De nuevo, usaremos un ayudante.

```js
+import onPasteImage from './resources/js/on-paste-image.js';

...

  dragAndDrop.setup({msg: 'Drop Image File here'});
  dragAndDrop.onDropFile(readImageFile);

+  onPasteImage(readImageFile);
```

Ahora deberías poder seleccionar una imagen en tu teléfono y pegarla en el ejemplo. Ten en cuenta que esto solo funcionará si el ejemplo tiene el foco o si lo ejecutas en su propia página.

Esos detalles tal vez no eran importantes, pero eran pequeños y te permitirán probar tus propias imágenes.

Aquí lo tienes funcionando:

{{{example url="../webgpu-post-processing-image-adjustments-noop.html"}}}

## <a id="a-brightness"></a> Brillo (Brightness)

Probablemente el ajuste de imagen más fácil sea el "brillo" (brightness). Aquí tienes otra imagen:

<div class="webgpu_center center"><div data-diagram="original" data-labels='{"type": "original"}'></div></div>
<div class="webgpu_center center"><div>
  <a href="https://unsplash.com/photos/a-happy-corgi-dog-rests-outdoors-with-tongue-out-RQFMEBJcolY">Foto</a> de <a href="https://unsplash.com/@alvannee">Alvan Nee</a>
</div></div>

Y aquí está con un ajuste de brillo:

<div class="webgpu_center center"><div data-diagram="brightness" data-labels='{"type": "brightness"}'></div></div>

El ajuste de brillo va de -1 a 1 donde:

* &nbsp;0 = no ajustarlo.
* -1 = eliminar el 100% del brillo.
* +1 = hacerlo lo más brillante posible [^hdr]

[^hdr]: El HDR puede ir por encima de 1.

Para hacer esto, todo lo que necesitamos es añadir el ajuste de brillo al color en nuestro fragment shader (shader de fragmentos) de post-procesamiento.

Aquí está el cambio en nuestro shader:

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

+fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
+  return color + brightness;
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
-  unused: f32,
+  brightness: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-  _ = uni; // so it's included in the bind group
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustBrightness(rgb, uni.brightness);
  return vec4f(rgb, color.a);
}
```

Luego necesitamos establecer el brillo.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
+    device.queue.writeBuffer(
+      postProcessUniformBuffer,
+      0,
+      new Float32Array([
+        settings.brightness,
+      ]),
+    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

+  const settings = {
+    brightness: 0,
+  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
+  gui.add(settings, 'brightness', -1, 1);
```

Y con eso podemos ajustar el brillo:

{{{example url="../webgpu-post-processing-image-adjustments-brightness.html"}}}

# <a id="a-contrast"></a> Contraste (Contrast)

Otro relativamente fácil es el "contraste" (contrast).

<div class="webgpu_center center"><div data-diagram="contrast" data-labels='{"type": "contrast"}'></div></div>

Para el contraste, tenemos un valor de -1 a 10 y para cada canal de color, si el valor es < 0.5 lo empujamos hacia 0. Si es > 0.5 lo empujamos hacia 1. Esto separa los colores.

Aquí están los cambios en el shader:

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
  return color + brightness;
}

+fn adjustContrast(color: vec3f, contrast: f32) -> vec3f {
+  let c = contrast + 1.0;
+  return clamp(0.5 + c * (color - 0.5), vec3f(0), vec3f(1));
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
  brightness: f32,
+  contrast: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
  rgb = adjustBrightness(rgb, uni.brightness);
+  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

Puedes ver arriba que tomamos el color y restamos 0.5. Esto hace que los colores que estaban por debajo de 0.5 sean negativos y los colores que estaban por encima de 0.5 sean positivos. Luego multiplicamos por nuestro ajuste de contraste +1. Así que un ajuste de 0 multiplicará por 1 (sin cambios). Luego volvemos a sumar 0.5. Cuando el ajuste de contraste es inferior a 0, esto empujará los colores hacia 0.5 y con un ajuste de contraste de -1 todos se volverán 0.5 (gris). Para ajustes de contraste superiores a 0, los colores se alejarán de 0.5.

Nuevamente, necesitamos crear una forma de establecer el nuevo ajuste.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
+        settings.contrast,
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
+    contrast: 0,
  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
+  gui.add(settings, 'contrast', -1, 10);
```

Ten en cuenta que nuestro ajuste de 10 como máximo es un poco arbitrario. Como estamos alejando los valores de 0.5 multiplicando con nuestro valor de contraste, si el color es 0.51 y el contraste es 10, terminaremos haciendo que el nuevo color sea 0.60 (0.5 + 10 * 0.01). Eso no llega hasta 1. En la práctica, sin embargo, si lo pruebas a continuación, verás que incluso por encima de 6 no cambia mucho. Tal vez tendrías que elegir una imagen de contraste muy bajo para necesitar valores de contraste más altos.

{{{example url="../webgpu-post-processing-image-adjustments-contrast.html"}}}

Es importante notar que estas operaciones dependen del orden. Aplicamos el brillo y luego el contraste. Dado que el contraste empuja los colores lejos de 0.5 y el brillo suma al color general, tal como está, para un ajuste de brillo determinado estamos eligiendo efectivamente dónde está el nivel de 0.5 en la imagen antes de que se aplique el contraste.

# <a id="a-hue-saturation-lightness"></a> Tono, Saturación y Luminosidad (Hue Saturation Lightness - HSL)

Es común permitir ajustes de tono (hue), saturación (saturation) y luminosidad (lightness).

<div class="webgpu_center center"><div data-diagram="hsl" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div></div>

Estos ajustes generalmente van juntos, y veremos por qué cuando repasemos cómo funcionan.

Recuerda que nuestros colores están representados por los canales rojo, verde y azul (red, green, blue), cada uno de 0 a 1. Esto puede representarse como un cubo donde el rojo es una dimensión, el verde otra y el azul una tercera.

HSL toma todos esos colores y los mapea a un cilindro donde H (hue/tono) es el ángulo alrededor del cilindro, S (saturation/saturación) es la distancia desde el centro, siendo 0 el centro (sin saturación) y 1 el borde (saturación máxima). La L (lightness/luminosidad) es la posición a lo largo de la longitud del cilindro, donde 0 es sin luminosidad (negro) y 1 es la luminosidad máxima (blanco).

Cada color en el espacio RGB tiene un valor HSL correspondiente.

<div class="webgpu_center center">
  <div class="rgb-hsl" style="max-width: 1100px;">
    <div data-diagram="rgbDiagram" data-labels='{"r": "r", "g": "g", "b": "b"}'></div>
    <div data-diagram="hslDiagram" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div>
  </div>
</div>

No es demasiado difícil convertir de un espacio al otro. En realidad, es más difícil explicar la conversión. En cualquier caso, aquí hay una función de shader para convertir de RGB a HSL:

```wgsl
struct HSL {
  h: f32,
  s: f32,
  l: f32,
};

fn rgbToHsl(rgb: vec3f) -> HSL {
  let cMin = min(min(rgb.r, rgb.b), rgb.g);
  let cMax = max(max(rgb.r, rgb.b), rgb.g);
  let delta = cMax - cMin;

  let l = (cMax + cMin) / 2.0;
  if (delta == 0.0) {
    return HSL(0, 0, l);
  }

  var h = 0.0;
  if (rgb.r == cMax) {
    h = (rgb.g - rgb.b) / delta;
  } else if (rgb.g == cMax) {
    h = 2.0 + (rgb.b - rgb.r) / delta;
  } else {
    h = 4.0 + (rgb.r - rgb.g) / delta;
  }
  h = h / 6.0;
  let s = delta / (1.0 - abs(2.0 * l - 1.0));
  return HSL(h, s, l);
}
```

Esta función devuelve 3 valores en el rango de 0 a 1. Podríamos haber devuelto un `vec3f` para el resultado, pero parecía más agradable declarar un struct `HSL` para que se pueda referir a los miembros como `h`, `s` y `l` en lugar de `x`, `y` y `z`.

Aquí está la función opuesta que convierte de HSL a RGB:

```wgsl
fn hslToRgb(hsl: HSL) -> vec3f {
  let c = vec3f(fract(hsl.h), clamp(vec2f(hsl.s, hsl.l), vec2f(0), vec2f(1)));
  let rgb = clamp(abs((c.x * 6.0 + vec3f(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3f(0), vec3f(1));
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}
```

Esta función limita (clamp) la saturación y la luminosidad entre 0 y 1. También utiliza `fract(hsl.h)`, lo que significa que es seguro pasar cualquier valor [~precision]. Por ejemplo, podrías establecer la saturación en 50 y simplemente se limitará a 1. Podrías establecer el tono en 75.3 y será lo mismo que 0.3.

Dadas esas 2 funciones, podemos cambiar nuestros shaders para incluir un ajuste HSL:

```wgsl
...

+fn adjustHSL(color: vec3f, adjust: HSL) -> vec3f {
+  let hsl = rgbToHsl(color);
+  let newHSL = HSL(hsl.h + adjust.h, hsl.s + adjust.s, hsl.l + adjust.l);
+  return hslToRgb(newHSL);
+}

...

struct Uniforms {
  brightness: f32,
  contrast: f32,
+  @align(16) hsl: HSL,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustHSL(rgb, uni.hsl);
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

Una cosa que podría llamar la atención aquí es el `@align(16)` que necesitamos al añadir `HSL` al struct `Uniforms`. La razón por la que necesitamos esto es porque, [por defecto, los structs utilizados en uniformes deben estar alineados a límites de 16 bytes](webgpu-memory-layout.html#a-struct-array-size-alignment). Además, significa que la estructura es utilizable tanto para buffers de uniformes como de almacenamiento (storage buffers). Si eliminas el `@align(16)`, solo será utilizable para buffers de almacenamiento. WGSL no añade esta alineación automáticamente para que en el futuro los requisitos de alineación puedan eliminarse y para que las estructuras solo necesiten un diseño (layout). Si no requiriera el `@align(16)` ahora, y en su lugar se alineara automáticamente, más adelante, cuando se eliminara la restricción, mucho código dejaría de funcionar. [^alignment]

[^alignment]: la eliminación de esta restricción [ya está en progreso](https://github.com/gpuweb/gpuweb/issues/4973), al menos para los dispositivos más nuevos.

Para usar esto, todavía necesitamos actualizar el JavaScript para establecer los nuevos valores de uniformes.

```js
  const postProcessUniformBuffer = device.createBuffer({
-    size: 16,
+    size: 32,
     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
   });

...

   function postProcess(encoder, srcTexture, dstTexture) {
     device.queue.writeBuffer(
       postProcessUniformBuffer,
       0,
       new Float32Array([
         settings.brightness,
         settings.contrast,
+        0,
+        settings.hue,
+        settings.saturation,
+        settings.lightness,
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
+    hue: 0,
+    saturation: 0,
+    lightness: 0,
   };

   const gui = new GUI();
   gui.name('Drag-n-Drop Image');
   gui.onChange(render);
   gui.add(settings, 'brightness', -1, 1);
   gui.add(settings, 'contrast', -1, 10);
+  gui.add(settings, 'hue', -0.5, 0.5);
+  gui.add(settings, 'saturation', -1, 1);
+  gui.add(settings, 'lightness', -1, 1);
```

Y ahora deberías poder ajustar el tono, la saturación y la luminosidad.

{{{example url="../webgpu-post-processing-image-adjustments-hsl.html"}}}

Espero que esto te haya dado algunas ideas para los ajustes de imagen y el post-procesamiento. En el [siguiente artículo](webgpu-1dlut.html) utilizaremos una textura 1D para obtener más flexibilidad.

<!-- keep this at the bottom of the article -->
<link href="webgpu-image-adjustments.css" rel="stylesheet">
<script type="module" src="webgpu-image-adjustments.js"></script>
