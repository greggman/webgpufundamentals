Title: Múltiples Canvas en WebGPU
Description: Múltiples Canvas
TOC: Múltiples Canvas

Dibujar en múltiples canvas en WebGPU es súper fácil. En [el artículo sobre los fundamentos](webgpu-fundamentals.html) buscamos un canvas, luego llamamos a `getContext` y configuramos el contexto (context).

```js
  // Obtén un contexto de WebGPU del canvas y configúralo
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

Para dibujar en el canvas, usamos ese contexto para obtener una textura para el canvas y establecimos esa textura como el primer `colorAttachment` de un render pass.

```js
  const renderPassDescriptor = {
    label: 'nuestro renderPass básico de canvas',
    colorAttachments: [
      {
*        // view: <- se rellenará cuando rendericemos
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  

  function render() {
    // Obtén la textura actual del contexto del canvas y
    // establécela como la textura en la que renderizar.
*    renderPassDescriptor.colorAttachments[0].view =
*        context.getCurrentTexture();

    // crea un encoder de comandos para empezar a codificar comandos
    const encoder = device.createCommandEncoder({ label: 'nuestro encoder' });

    // crea un encoder de render pass para codificar comandos específicos de renderizado
    const pass = encoder.beginRenderPass(renderPassDescriptor);

```

Todo lo que tenemos que hacer para dibujar en un canvas diferente es seguir los mismos pasos para ese canvas:

1. Buscar el canvas (o crearlo).
2. Obtener un contexto "webgpu".
3. Configurar el contexto.
4. Cuando queramos renderizar en ese canvas, llamar a `context.getCurrentTexture` y usar esa textura como un `colorAttachment` en un render pass.

Tomemos nuestro primer ejemplo y rendericemos en 3 canvas.

Primero, añadamos 2 canvas más:

```html
  <body>
    <canvas></canvas>
+    <canvas></canvas>
+    <canvas></canvas>
  </body>
```

A continuación, obtengamos los contextos y configuremos todos los canvas:

```js
  // Obtén un contexto de WebGPU para cada canvas y configúralo
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const infos = [];
  for (const canvas of document.querySelectorAll('canvas')) {
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });
    infos.push({ context });
  }
```

Y finalmente, rendericemos en todos ellos:

```js
  function render() {
*    // crea un encoder de comandos para empezar a codificar comandos
*    const encoder = device.createCommandEncoder({ label: 'nuestro encoder' });

+    for (const {context} of infos) {
      // Obtén la textura actual del contexto del canvas y
      // establécela como la textura en la que renderizar.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();

      // crea un encoder de render pass para codificar comandos específicos de renderizado
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // llama a nuestro vertex shader 3 veces.
      pass.end();
+    }

*    const commandBuffer = encoder.finish();
*    device.queue.submit([commandBuffer]);
  }

  render();
```

Los cambios que hicimos son: (1) dónde creamos nuestro encoder de comandos para que pueda ser compartido para renderizar en los 3 canvas. (2) iterar sobre los contextos.

Y con eso, hemos renderizado en 3 canvas.

{{{example url="../webgpu-multiple-canvases.html" }}}

Nota: No es estrictamente necesario crear un único encoder de comandos, pero es ligeramente más eficiente.

Entonces, ¿qué más queda?

## Optimizando muchos canvas

Supongamos que queremos mostrar productos girando. Para simplificarlo, sigamos con nuestro triángulo codificado a piñón, pero hagámoslo girar pasando una matriz [como cubrimos en los artículos sobre matemáticas de matrices](webgpu-matrix-math.html). También pasaremos un color para que cada uno pueda verse ligeramente diferente.

```wgsl
+  struct Uniforms {
+    matrix: mat4x4f,
+    color: vec4f,
+  };
+
+  @group(0) @binding(0) var<uniform> uni: Uniforms;

   @vertex fn vs(
     @builtin(vertex_index) vertexIndex : u32
   ) -> @builtin(position) vec4f {
     let pos = array(
       vec2f( 0.0,  0.5),  // centro superior
       vec2f(-0.5, -0.5),  // inferior izquierda
       vec2f( 0.5, -0.5)   // inferior derecha
     );

-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+    return uni.matrix * vec4f(pos[vertexIndex], 0.0, 1.0);
   }

   @fragment fn fs() -> @location(0) vec4f {
-    return vec4f(1, 0, 0, 1);
+    return uni.color;
   }
```

Necesitaremos un [uniform buffer](webgpu-uniforms.html) para cada uno, así como un bind group y cosas relacionadas.

Vamos a crear 200 canvas y configurarlos para WebGPU:

```js
  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // creando esto:
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');

    const container = document.createElement('div');
    container.className = `product size${i % 4}`;

    const description = document.createElement('div');
    description.textContent = `producto#: ${i + 1}`;

    container.appendChild(canvas);
    container.appendChild(description);
    document.body.appendChild(container);

    // Obtén un contexto de WebGPU y configúralo.
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });

    infos.push({
      context,
    });
  }
```

Necesitaremos algo de CSS para acompañar esto:

```css
  .product {
    display: inline-block;
    padding: 1em;
    background: #888;
    margin: 1em;
  }
  .size0>canvas {
    width: 200px;
    height: 200px;
  }
  .size1>canvas {
    width: 250px;
    height: 200px;
  }
  .size2>canvas {
    width: 300px;
    height: 200px;
  }
  .size3>canvas {
    width: 100px;
    height: 200px;
  }
```

Los 4 tamaños son solo para asegurarnos de que estamos haciendo las cosas correctamente. Si los hiciéramos todos del mismo tamaño, podríamos ocultar algún error.

Necesitamos un uniform buffer y un bind group para cada uno. No cambiaremos el color más tarde, así que elegiremos uno ahora. También elijamos un `clearValue` aleatorio (¿por qué no? 🤷‍♂️).

```js
+  function randomColor() {
+    return [Math.random(), Math.random(), Math.random(), 1];
+  }

   const infos = [];
   const numProducts = 200;
   for (let i = 0; i < numProducts; ++i) {
     ...

+    // Crea un uniform buffer y vistas de array de tipos
+    // para nuestros uniforms.
+    const uniformValues = new Float32Array(16 + 4);
+    const uniformBuffer = device.createBuffer({
+      size: uniformValues.byteLength,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+    const kMatrixOffset = 0;
+    const kColorOffset = 16;
+    const matrixValue = uniformValues.subarray(
+        kMatrixOffset, kMatrixOffset + 16);
+    const colorValue = uniformValues.subarray(
+        kColorOffset, kColorOffset + 4);
+    colorValue.set(randomColor());
+
+    // Crea un bind group para este uniform
+    const bindGroup = device.createBindGroup({
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer },
+      ],
+    });

     infos.push({
       context,
+      clearValue: randomColor(),
+      matrixValue,
+      uniformValues,
+      uniformBuffer,
+      bindGroup,
     });

```

Añadamos también un `ResizeObserver` para [redimensionar cada canvas](webgpu-fundamentals.html#a-resizing).

```js
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
  });

  ...

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // creando esto:
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);

    ...
```

Al renderizar, usaremos un bucle de requestAnimationFrame (rAF) para animar.

```js
+  function render(time) {
+    time *= 0.001; // convertir a segundos

     ...

+    requestId = requestAnimationFrame(render);
+  }

-  render();
+  requestAnimationFrame(render);
```

Y necesitamos actualizar la matriz de cada canvas, subir los nuevos valores al uniform buffer y establecer el bind group.

```js
  function render(time) {
    time *= 0.001; // convertir a segundos

    // crea un encoder de comandos para empezar a codificar comandos
    const encoder = device.createCommandEncoder({ label: 'nuestro encoder' });

    for (const {
      context,
      uniformBuffer,
      uniformValues,
      matrixValue,
      bindGroup,
      clearValue,
    } of infos) {
      // Obtén la textura actual del contexto del canvas y
      // establécela como la textura en la que renderizar.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
+      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;
+
+      const { canvas } = context;
+      const aspect = canvas.clientWidth / canvas.clientHeight;
+      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
+      mat4.rotateZ(matrixValue, time * 0.1, matrixValue);
+
+      // Sube nuestros valores uniform.
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // crea un encoder de render pass para codificar comandos específicos de renderizado
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
+      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // llama a nuestro vertex shader 3 veces.
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
```

Añadamos algunas cosas más. Veremos por qué a continuación.

Añadamos una forma de detener e iniciar todo el proceso. Primero, añadiremos un botón:

```html
  <body>
+    <button type="button" id="stop">Stop/Start</button>
  </body>
```

Y algo de CSS para él:

```css
  #stop {
    position: fixed;
    right: 0;
    top: 0;
    margin: 0.5em;
    z-index: 1;
  }
```

Luego cambiemos el código para iniciar y detener la animación:

```js
+  let requestId;
   function render(time) {
     ...

-    requestAnimationFrame(render);
+    requestId = requestAnimationFrame(render);
   }

-  requestAnimationFrame(render);

+  function toggleAnimation() {
+    if (requestId) {
+      cancelAnimationFrame(requestId);
+      requestId = undefined;
+    } else {
+      requestId = requestAnimationFrame(render);
+    }
+  }
+
+  toggleAnimation();
+  document.querySelector('#stop')
+      .addEventListener('click', toggleAnimation);

```

Esto funcionaría pero, todos los objetos darían un salto después de pausar y volver a reanudar. Esto se debe a que, aunque detuvimos el renderizado, el valor de `time` es el tiempo transcurrido desde que se cargó la página, que se utiliza para calcular nuestra rotación.

Así que, vamos a arreglarlo manteniendo nuestro propio tiempo que solo avance cuando estemos animando.

```js
+  let time = 0;
+  let then = 0;
   let requestId;
-  function render(time) {
-    time *= 0.001
+  function render(now) {
+    now *= 0.001; // convertir a segundos;
+    const deltaTime = now - then;
+    time += deltaTime;
+    then = now;

   ...

     requestId = requestAnimationFrame(render);
   }

   function toggleAnimation() {
     if (requestId) {
       cancelAnimationFrame(requestId);
       requestId = undefined;
     } else {
       requestId = requestAnimationFrame(render);
+      then = performance.now() * 0.001;
     }
   }
```

Y ahora tenemos 200 canvas.

{{{example url="../webgpu-multiple-canvases-x200.html"}}}

¡Podrías notar que este ejemplo es MUY PESADO! El problema es que estamos renderizando los 200 canvas aunque solo unos pocos sean visibles. Sería mucho, mucho peor si estuviéramos dibujando modelos de productos detallados en lugar de solo un triángulo por canvas. Por eso añadimos el botón de stop/start. Esta página podría ser demasiado pesada si el ejemplo está en ejecución, así que quizás quieras detenerlo ahora antes de continuar.

> Nota: Este sitio intenta que los ejemplos solo se rendericen y animen si el ejemplo en sí es visible.

Una forma en la que potencialmente podemos resolver este problema es usando `IntersectionObserver`.

## <a id="a-intersection-observer"></a> Usar `IntersectionObserver`

`IntersectionObserver` fue diseñado específicamente para este tipo de situaciones. Un `IntersectionObserver` hace lo que dice: observa intersecciones. Por defecto, observa la intersección de un elemento con la ventana del navegador. Usando esto, podemos mantener un conjunto de cuáles canvas son realmente visibles y solo renderizar esos.

Aquí está el código.

Primero, creamos un `IntersectionObserver`. Al igual que `ResizeObserver`, recibe una función que se llama cuando un elemento observado comienza o deja de intersecarse con la ventana.

```js
  const visibleCanvasSet = new Set();
  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visibleCanvasSet.add(target);
      } else {
        visibleCanvasSet.delete(target);
      }
    }
  });
```

Puedes ver arriba que llama a nuestro callback con un array de entradas (`entries`). Cada entrada indica si está intersecando o no. Lo usamos para mantener un `Set` de qué canvas son visibles.

Necesitamos decirle que observe cada canvas. También necesitamos una forma de pasar de un canvas a la información de ese canvas. En este caso, esa información es el contexto, el uniform buffer, el bind group, etc. Usaremos un `Map` para pasar de un canvas a esa información.

```js
-  const infos = [];
+  const canvasToInfoMap = new Map();
   const numProducts = 200;
   for (let i = 0; i < numProducts; ++i) {
     // creando esto:
     // <div class="product size?">
     //   <canvas></canvas>
     //   <div>Product#: ?</div>
     // </div>
     const canvas = document.createElement('canvas');
     resizeObserver.observe(canvas);
+    intersectionObserver.observe(canvas);

     ...

-    infos.push({
+    canvasToInfoMap.set(canvas, {
       context,
       clearValue: randomColor(),
       matrixValue,
       uniformValues,
       uniformBuffer,
       bindGroup,
       rotation: Math.random() * Math.PI * 2,
     });
   }
```

En nuestra función de renderizado, podemos renderizar solo los canvas visibles:

```js
  function render(now) {
    ...

    // crea un encoder de comandos para empezar a codificar comandos
    const encoder = device.createCommandEncoder({ label: 'nuestro encoder' });

-    for (const {
+    visibleCanvasSet.forEach(canvas => {
+      const {
+       context,
+       uniformBuffer,
+       uniformValues,
+       matrixValue,
+       bindGroup,
+       clearValue,
+       rotation,
-    } of infos) {
+      } = canvasToInfoMap.get(canvas);

       // Obtén la textura actual del contexto del canvas y
       // establécela como la textura en la que renderizar.
       renderPassDescriptor.colorAttachments[0].view =
           context.getCurrentTexture();
       renderPassDescriptor.colorAttachments[0].clearValue = clearValue;

-      const { canvas } = context;
       const aspect = canvas.clientWidth / canvas.clientHeight;
       mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
       mat4.rotateZ(matrixValue, time * 0.1 + rotation, matrixValue);

       // Sube nuestros valores uniform.
       device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

       // crea un encoder de render pass para codificar comandos específicos de renderizado
       const pass = encoder.beginRenderPass(renderPassDescriptor);
       pass.setPipeline(pipeline);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // llama a nuestro vertex shader 3 veces.
       pass.end();
-    }
+    });

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestId = requestAnimationFrame(render);
  }
```

Y con eso, solo estamos dibujando los canvas que son realmente visibles, lo que con suerte debería ser mucho más ligero.

{{{example url="../webgpu-multiple-canvases-x200-optimized.html"}}}

`IntersectionObserver` probablemente no cubrirá todos los casos. Si estás dibujando cosas muy pesadas en cada canvas, es posible que solo quieras animar los canvas que el usuario seleccione. En cualquier caso, espero que tengas una herramienta más en tu caja de herramientas.
