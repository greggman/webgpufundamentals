Title: Post-procesamiento en WebGPU - Efecto CRT básico
Description: Post-procesamiento
TOC: Efecto CRT básico

El post-procesamiento (post-processing) simplemente significa realizar algún procesamiento después de haber creado la imagen "original". El post-procesamiento puede aplicarse a una foto, un video, una escena 2D o una escena 3D. En general, significa que tienes una imagen y le aplicas algunos efectos, como elegir un filtro en Instagram.

En casi todos los ejemplos de este sitio renderizamos a la textura del canvas. Para realizar el post-procesamiento, en su lugar renderizamos a una textura diferente. Luego renderizamos esa textura al canvas mientras aplicamos algunos efectos de procesamiento de imagen.

Como ejemplo sencillo, intentemos post-procesar una imagen para que parezca una televisión de los años 80 con líneas de escaneo (scanlines) y elementos RGB de CRT.

<div class="webgpu_center"><img class="nobg" src="resources/gemini-generated-1980s-tv-1024.png" style="width: 700px"></div>

Para hacer eso, tomemos el ejemplo animado de la parte superior de [el artículo sobre temporización](webgpu-timing.html). Lo primero que haremos será hacer que se renderice en una textura separada y luego renderizar esa textura en el canvas.

Aquí tienes un shader que dibuja un [triángulo grande que cubre el espacio de recorte (clip space)](webgpu-large-triangle-to-cover-clip-space.html) y pasa las coordenadas UV correctas para permitirnos dibujar una textura que cubra la parte del triángulo que cabe en el espacio de recorte.

```js
  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
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
        vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
        return vsOutput;
      }

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        return vec4f(color);
      }
    `,
  })
```

Es bastante directo y es similar al shader que usamos para generar mipmaps en [el artículo sobre el uso de imágenes con texturas](webgpu-importing-textures.html). La única diferencia importante es que el shader original usa 2 triángulos para cubrir el espacio de recorte, mientras que este usa [1 triángulo grande](webgpu-large-triangle-to-cover-clip-space.html).

Luego, para usar estos shaders necesitamos un pipeline:

```js
  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });
```

Este pipeline se renderizará en el canvas, por lo que debemos establecer el formato de destino como el `presentationFormat` que buscamos antes.

Necesitaremos un sampler y un renderPassDescriptor.

```js
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
```

Luego, en lugar de hacer que nuestro renderPass original renderice en el canvas, necesitamos que renderice en una textura separada.

```js
+  let renderTarget;
+
+  function setupPostProcess(canvasTexture) {
+    if (renderTarget?.width === canvasTexture.width &&
+        renderTarget?.height === canvasTexture.height) {
+      return;
+    }
+
+    renderTarget?.destroy();
+    renderTarget = device.createTexture({
+      size: canvasTexture,
+      format: 'rgba8unorm',
+      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
+    });
+    const renderTargetView = renderTarget;
+    renderPassDescriptor.colorAttachments[0].view = renderTargetView;
+  }

  let then = 0;
  function render(now) {
    now *= 0.001;  // convertir a segundos
    const deltaTime = now - then;
    then = now;

-    // Obtener la textura actual del contexto del canvas y
-    // establecerla como la textura a renderizar.
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();
+    const canvasTexture = context.getCurrentTexture();
+    setupPostProcess(canvasTexture);

    ...
```

Arriba, pasamos el `canvasTexture` actual a `setupPostProcess`. Este verifica si el tamaño de nuestra textura "renderTarget" es el mismo tamaño que el canvas. Si no, crea una nueva textura del mismo tamaño.

Luego establece el attachment de color de nuestro `renderPassDescriptor` original a esta textura renderTarget.

Dado que nuestro antiguo pipeline renderizará en esta textura, necesitamos actualizarlo para el formato de esta textura:

```js
  const pipeline = device.createRenderPipeline({
    label: 'per vertex color',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        ...
      ],
    },
    fragment: {
      module,
-      targets: [{ format: presentationFormat }],
+      targets: [{ format: 'rgba8unorm' }],
    },
  });
```

Este cambio por sí solo haría que comience a renderizar la escena original en esta textura de destino de renderizado, pero aún necesitamos dibujar algo en el canvas o no veremos nada, así que hagamos eso.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  ...


  let then = 0;
  function render(now) {
    now *= 0.001;  // convertir a segundos
    const deltaTime = now - then;
    then = now;

    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);

    ...

    pass.draw(numVertices, settings.numObjects);

    pass.end();

+    postProcess(encoder, renderTarget, canvasTexture);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

Hagamos otro pequeño ajuste. Eliminemos la configuración del recuento de objetos, ya que no es relevante para el post-procesamiento.

```js
  const settings = {
-    numObjects: 100,
+    numObjects: 200,
  };

  const gui = new GUI();
-  gui.add(settings, 'numObjects', 0, kNumObjects, 1);
```

Podríamos habernos deshecho de `settings.numObjects` por completo, pero requiere ediciones en varios lugares diferentes, así que dejémoslo por ahora. Estableceremos el número en 200 solo para llenar la imagen.

Si ejecutamos esto, no habrá ninguna diferencia visible con el original.

{{{example url="../webgpu-post-processing-step-01.html"}}}

La diferencia es que estamos renderizando a la textura renderTarget y luego renderizando esa textura al canvas, así que ahora podemos empezar a aplicar algunos efectos.

El efecto más obvio de un CRT antiguo es que tienen líneas de escaneo (scanlines) visibles. Esto se debe a que la forma en que se proyectaba la imagen era mediante imanes que dirigían un haz a través de la pantalla en un patrón de líneas horizontales.

Podemos obtener un efecto similar simplemente generando un patrón de luz y oscuridad usando una onda senoidal y tomando el valor absoluto.

<div class="webgpu_center">
  <div style="width: 100%;"><img class="ddnobg" src="resources/sinewave-40.svg"></div>
  <div lass="caption">sin(x)</div>
</div>
<div class="webgpu_center">
   <div style="width: 100%;"><img class="ddnobg" src="resources/abs-sinewave-40.svg"></div>
   <div class="caption">abs(sin(x))</div>
</div>
<div class="webgpu_center">
   <div style="width: 100%;"><div data-diagram="sine" style="aspect-ratio: 981 / 50; width: 100%;"></div></div>
   <div class="caption">abs(sin(x)) como color en escala de grises</div>
</div>


Agreguemos eso al código. Primero, editemos el shader para aplicar esta onda senoidal.

```js
  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
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
        vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
        return vsOutput;
      }

+      struct Uniforms {
+        effectAmount: f32,
+        bandMult: f32,
+      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
+      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
+        let banding = abs(sin(fsInput.position.y * uni.bandMult));
+        let effect = mix(1.0, banding, uni.effectAmount);

        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
-        return vec4f(color);
+        return vec4f(color.rgb * effect, color.a);
      }
    `,
  });
```

Nuestra onda senoidal se basa en `fsInput.position.y`, que es la coordenada y del píxel que se está escribiendo. En otras palabras, para cada línea de escaneo que comienza en 0, irá 0.5, 1.5, 2.5, 3.5, etc. `bandMult` nos permitirá ajustar el tamaño de las bandas y `effectAmount` nos permitirá activar y desactivar el efecto para que podamos comparar el efecto con el resultado sin efecto.

Para usar el nuevo shader necesitamos un buffer de uniformes (uniform buffer).

```js
  const postProcessUniformBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

Necesitamos agregarlo a nuestro bind group:

```js
    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTargetView },
        { binding: 1, resource: postProcessSampler },
+        { binding: 2, resource: postProcessUniformBuffer },
      ],
    });
```

Y necesitamos agregar algunas configuraciones:

```js
  const settings = {
    numObjects: 200,
+    affectAmount: 1,
+    bandMult: 1,
  };

  const gui = new GUI();
+  gui.add(settings, 'affectAmount', 0, 1);
+  gui.add(settings, 'bandMult', 0.01, 2.0);
```

Y necesitamos subir esas configuraciones al buffer de uniformes:

```js
  function postProcess(encoder, srcTexture, dstTexture) {
+    device.queue.writeBuffer(
+      postProcessUniformBuffer,
+      0,
+      new Float32Array([
+        settings.affectAmount,
+        settings.bandMult,
+      ]),
+    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

Y eso nos da un efecto de línea de escaneo similar al de un CRT.

{{{example url="../webgpu-post-processing-step-02.html"}}}

Los CRT, al igual que los LCD, dividen la imagen en áreas rojas, verdes y azules. En los CRT, esas áreas eran generalmente más grandes que la mayoría de los LCD actuales, por lo que a veces esto resaltaba. Agreguemos algo para aproximar ese efecto.

Primero, cambiemos el shader:

```js
  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
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
        vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
        return vsOutput;
      }

      struct Uniforms {
        effectAmount: f32,
        bandMult: f32,
+        cellMult: f32,
+        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let banding = abs(sin(fsInput.position.y * uni.bandMult));

+        let cellNdx = u32(fsInput.position.x * uni.cellMult) % 3;
+        var cellColor = vec3f(0);
+        cellColor[cellNdx] = 1;
+        let cMult = cellColor + uni.cellBright;

-        let effect = mix(1.0, banding, uni.effectAmount);
+        let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        return vec4f(color.rgb * effect, 1);
      }
    `,
  });
```

Arriba estamos usando `fsInput.position.x`, que es la coordenada x del píxel que se está escribiendo. Al multiplicar por `cellMult` podemos elegir un tamaño de celda. Convertimos a un entero y calculamos el módulo 3. Esto nos da un número, 0, 1 o 2, que usamos para establecer el canal rojo, verde o azul de `cellColor` en 1.

Añadimos `cellBright` como un ajuste y luego multiplicamos tanto el antiguo banding como el nuevo efecto juntos. `effect` cambió de un `f32` a un `vec3f` para que pueda afectar a cada canal de forma independiente.

De vuelta en JavaScript necesitamos ajustar el tamaño del buffer de uniformes:

```js
  const postProcessUniformBuffer = device.createBuffer({
-    size: 8,
+    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

Y añadir algunas configuraciones a la GUI:

```js
  const settings = {
    numObjects: 200,
    affectAmount: 1,
    bandMult: 1,
+    cellMult: 0.5,
+    cellBright: 1,
  };

  const gui = new GUI();
  gui.add(settings, 'affectAmount', 0, 1);
  gui.add(settings, 'bandMult', 0.01, 2.0);
+  gui.add(settings, 'cellMult', 0, 1);
+  gui.add(settings, 'cellBright', 0, 2);
```

Y subir las nuevas configuraciones:

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.affectAmount,
        settings.bandMult,
+        settings.cellMult,
+        settings.cellBright,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

Y ahora tenemos un efecto *parecido* a los elementos de color de un CRT.

{{{example url="../webgpu-post-processing-step-03.html"}}}

Los efectos anteriores no pretenden ser representaciones perfectas de cómo funciona un CRT. Más bien, solo pretenden dar la sensación de un CRT y ser, con suerte, fáciles de entender. Puedes encontrar técnicas más sofisticadas por toda la web.

## <a id="compute"></a> Usando un Compute Shader

Surge la pregunta: ¿podríamos usar un compute shader (shader de cómputo) para esto? Y, tal vez más importante, ¿deberíamos? Veamos primero el "¿podemos?".

Cubrimos el uso de un compute shader para renderizar a una textura en [el artículo sobre texturas de almacenamiento (storage textures)](webgpu-storage-textures.html).

Para convertir nuestro código para usar un compute shader, necesitamos añadir el uso `STORAGE_BINDING` a la textura del canvas, lo que, según [el artículo mencionado anteriormente](webgpu-storage-textures.html), requiere comprobar si podemos y elegir un formato de textura que lo soporte.

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
+  const hasBGRA8UnormStorage = adapter?.features.has('bgra8unorm-storage');
-  const device = await adapter?.requestDevice();
+  const device = await adapter?.requestDevice({
+    requiredFeatures: [
+      ...(hasBGRA8UnormStorage ? ['bgra8unorm-storage'] : []),
+    ],
+  });
  if (!device) {
    fail('necesitas un navegador que soporte WebGPU');
    return;
  }

  // Obtener un contexto de WebGPU del canvas y configurarlo
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
-  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
+  const presentationFormat = hasBGRA8UnormStorage
+    ? navigator.gpu.getPreferredCanvasFormat()
+    : 'rgab8unorm';
  context.configure({
    device,
    format: presentationFormat,
+    usage: GPUTextureUsage.RENDER_ATTACHMENT |
+           GPUTextureUsage.TEXTURE_BINDING |
+           GPUTextureUsage.STORAGE_BINDING,
  });
```

Necesitamos cambiar nuestro shader para escribir en una textura de almacenamiento:

```js
  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
-      struct VSOutput {
-        @builtin(position) position: vec4f,
-        @location(0) texcoord: vec2f,
-      };
-
-      @vertex fn vs(
-        @builtin(vertex_index) vertexIndex : u32,
-      ) -> VSOutput {
-        var pos = array(
-          vec2f(-1.0, -1.0),
-          vec2f(-1.0,  3.0),
-          vec2f( 3.0, -1.0),
-        );
-
-        var vsOutput: VSOutput;
-        let xy = pos[vertexIndex];
-        vsOutput.position = vec4f(xy, 0.0, 1.0);
-        vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
-        return vsOutput;
-      }

      struct Uniforms {
        effectAmount: f32,
        bandMult: f32,
        cellMult: f32,
        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;
+      @group(1) @binding(0) var outTexture: texture_storage_2d<${presentationFormat}, write>;

-      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-        let banding = abs(sin(fsInput.position.y * uni.bandMult));
-
-        let cellNdx = u32(fsInput.position.x * uni.cellMult) % 3;
+      @compute @workgroup_size(1) fn cs(@builtin(global_invocation_id) gid: vec3u) {
+        let outSize = textureDimensions(outTexture);
+        let banding = abs(sin(f32(gid.y) * uni.bandMult));
+
+        let cellNdx = u32(f32(gid.x) * uni.cellMult) % 3;
         var cellColor = vec3f(0);
         cellColor[cellNdx] = 1.0;
         let cMult = cellColor + uni.cellBright;

         let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
-        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
-        return vec4f(color.rgb * effect, color.a);
+        let uv = (vec2f(gid.xy) + 0.5) / vec2f(outSize);
+        let color = textureSampleLevel(postTexture2d, postSampler, uv, 0);
+        textureStore(outTexture, gid.xy, vec4f(color.rgb * effect, color.a));
       }
    `,
  });
```

Arriba eliminamos el vertex shader (shader de vértices) y las partes relacionadas. También ya no tenemos `fsInput.position`, que era la coordenada del píxel que se estaba escribiendo. En su lugar, tenemos `gid`, que es el `global_invocation_id` de una invocación individual de nuestro compute shader. Usaremos esto como nuestra coordenada de textura. Es un `vec3u`, así que necesitamos hacer conversiones de tipo aquí y allá. Tampoco tenemos ya `fsInput.texcoord`, pero podemos obtener el equivalente con `(vec2f(gid.xy) + 0.5) / vec2f(outSize)`.

Necesitamos dejar de usar un render pass y, en su lugar, usar un compute pass para nuestro post-procesamiento.

```js
  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
-    vertex: { module: postProcessModule },
-    fragment: {
-      module: postProcessModule,
-      targets: [ { format: presentationFormat }],
-    },
+    compute: { module: postProcessModule },
  });

  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.affectAmount,
        settings.bandMult,
        settings.cellMult,
        settings.cellBright,
      ]),
    );

+    const outBindGroup = device.createBindGroup({
+      layout: postProcessPipeline.getBindGroupLayout(1),
+      entries: [
+        { binding: 0, resource: dstTexture },
+      ],
+    });

-    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
-    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
+    const pass = encoder.beginComputePass();
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
-    pass.draw(3);
+    pass.dispatchWorkgroups(dstTexture.width, dstTexture.height);
    pass.end();
  }
```

Eso funciona:

{{{example url="../webgpu-post-processing-step-03-compute.html"}}}

Desafortunadamente, dependiendo de la GPU, ¡es lento! Cubrimos parte del porqué en [el artículo sobre optimización de compute shaders](webgpu-compute-shaders-historgram.html). Usar un tamaño de workgroup de 1 facilita las cosas, pero es lento.

Podemos actualizar para usar un tamaño de workgroup más grande. Esto requiere que nos saltemos la escritura en la textura cuando estemos fuera de los límites.

```js
+  const workgroupSize = [16, 16];
  const postProcessModule = device.createShaderModule({
    code: /* wgsl */ `
      struct Uniforms {
        effectAmount: f32,
        bandMult: f32,
        cellMult: f32,
        cellBright: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;
      @group(1) @binding(0) var outTexture: texture_storage_2d<${presentationFormat}, write>;

-      @compute @workgroup_size(1) fn cs(@builtin(global_invocation_id) gid: vec3u) {
+      @compute @workgroup_size(${workgroupSize}) fn cs(@builtin(global_invocation_id) gid: vec3u) {
        let outSize = textureDimensions(outTexture);
+        if (gid.x >= outSize.x || gid.y >= outSize.y) {
+          return;
+        }
        let banding = abs(sin(f32(gid.y) * uni.bandMult));

        let cellNdx = u32(f32(gid.x) * uni.cellMult) % 3;
        var cellColor = vec3f(0);
        cellColor[cellNdx] = 1.0;
        let cMult = cellColor + uni.cellBright;

        let effect = mix(vec3f(1), banding * cMult, uni.effectAmount);
        let uv = (vec2f(gid.xy) + 0.5) / vec2f(outSize);
        let color = textureSampleLevel(postTexture2d, postSampler, uv, 0);
        textureStore(outTexture, gid.xy, vec4f(color.rgb * effect, color.a));
      }
    `,
  });
```

Y luego necesitamos enviar (dispatch) menos workgroups:

```js
    const pass = encoder.beginComputePass();
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.setBindGroup(1, outBindGroup);
-    pass.dispatchWorkgroups(dstTexture.width, dstTexture.height);
+    pass.dispatchWorkgroups(
+      Math.ceil(dstTexture.width / workgroupSize[0]),
+      Math.ceil(dstTexture.height / workgroupSize[1]),
+    );
    pass.end();
```

Esto funciona:

{{{example url="../webgpu-post-processing-step-03-compute-workgroups.html"}}}

¡Esto es mucho más rápido! Pero, desafortunadamente, en algunas GPU sigue siendo más lento que usar un render pass.

<div class="webgpu_center data-table">
  <table>
    <thead>
      <tr><th>GPU</th><th>Tiempo de compute pass vs<br>Tiempo de render pass<br>(más alto es peor)</th></tr>
    </thead>
    <tbody>
      <tr><td>M1 Mac                 </td><td>1x</td></tr>
      <tr><td>AMD Radeon Pro 5300M   </td><td>1x</td></tr>
      <tr><td>AMD Radeon Pro WX 32000</td><td>1.3x</td></tr>
      <tr><td>Intel UHD Graphics 630 </td><td>1.7x</td></tr>
      <tr><td>NVidia 2070 Super      </td><td>2x</td></tr>
    </tbody>
  </table>
</div>

Entrar en detalles sobre cómo hacerlo más rápido es un tema demasiado extenso para este artículo en particular. Haciendo referencia a [el artículo sobre optimización de compute shaders](webgpu-compute-shaders-historgram.html), se aplican las mismas reglas. Desafortunadamente, ninguna de ellas es realmente relevante para este ejemplo. Si el post-procesamiento que estás intentando realizar pudiera beneficiarse de la memoria de workgroup compartida, entonces tal vez usar un compute shader sería beneficioso. Los patrones de acceso también podrían ser relevantes para intentar asegurar que la GPU no esté teniendo muchos fallos de caché. Otra posibilidad podría ser aprovechar los [subgroups (subgrupos)](webgpu-subgroups.html).

Por ahora, se recomienda probar diferentes técnicas y comprobar sus tiempos. O bien, quédate con los render passes a menos que el algoritmo que estés implementando pueda beneficiarse verdaderamente de los datos compartidos de los workgroups o subgroups. Las GPU han estado renderizando a texturas durante mucho más tiempo del que han estado ejecutando compute shaders, por lo que muchos aspectos de ese proceso están altamente optimizados.

---

Este artículo introdujo el concepto de *post-procesamiento*. En el próximo artículo cubriremos algunos [ajustes de imagen comunes en el post-procesamiento](webgpu-image-adjustments.html).

<!-- keep this at the bottom of the article -->
<link href="webgpu-post-processing.css" rel="stylesheet">
<script type="module" src="webgpu-post-processing.js"></script>
