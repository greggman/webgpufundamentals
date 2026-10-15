Title: Velocidad y Optimización en WebGPU
Description: Cómo ir más rápido en WebGPU
TOC: Velocidad y Optimización

La mayoría de los ejemplos en este sitio están escritos para ser lo más comprensibles
posible. Eso significa que funcionan y son correctos, pero no necesariamente
muestran la forma más eficiente de hacer algo en WebGPU. Además, dependiendo de
lo que necesites hacer, existen muchísimas optimizaciones posibles.

En este artículo cubriremos algunas de las optimizaciones más básicas y discutiremos
algunas otras. Para ser claros, en mi opinión, **normalmente no necesitas llegar tan lejos. La mayoría de
los ejemplos en la red que usan WebGPU dibujan un par de cientos de cosas y, por lo tanto,
realmente no se beneficiarían de estas optimizaciones**. Aun así, siempre es bueno
saber cómo hacer que las cosas vayan más rápido.

Lo básico: **Cuanto menos trabajo hagas, y menos trabajo le pidas a WebGPU que haga,
más rápido irán las cosas.**

En casi todos los ejemplos hasta la fecha, si dibujamos varias formas, hemos
seguido los siguientes pasos:

* En el momento de la inicialización (Init):
   * para cada cosa que queremos dibujar
      * crear un uniform buffer (buffer de uniformes)
      * crear un bindGroup que haga referencia a ese buffer

* En el momento del renderizado (Render):
   * iniciar un encoder (codificador) y un render pass (pase de renderizado)
   * para cada cosa que queremos dibujar
      * actualizar un typed array (arreglo con tipo) con nuestros valores de uniformes para este objeto
      * copiar el typed array al uniform buffer para este objeto
      * establecer cualquier pipeline, vertex buffer (buffer de vértices) e index buffer (buffer de índices) si es necesario
      * codificar un comando(s) para vincular los bindGroup(s) para este objeto
      * codificar un comando para dibujar (draw)
   * finalizar el render pass, terminar el encoder, enviar (submit) el buffer de comandos

Hagamos un ejemplo que podamos optimizar que siga los pasos anteriores para que luego podamos
optimizarlo.

Ten en cuenta que este es un ejemplo ficticio. Solo vamos a dibujar un montón de cubos y,
como tal, ciertamente podríamos optimizar las cosas usando *instanciación* (instancing), lo cual cubrimos
en los artículos sobre [buffers de almacenamiento (storage buffers)](webgpu-storage-buffers.html#a-instancing)
y [buffers de vértices (vertex buffers)](webgpu-vertex-buffers.html#a-instancing). No quería
complicar el código manejando toneladas de diferentes tipos de objetos. La instanciación es
sin duda una excelente manera de optimizar si tu proyecto utiliza muchos ejemplares del mismo modelo.
Las plantas, los árboles, las rocas, la basura, etc., a menudo se optimizan mediante instanciación. Para
otros modelos, es posiblemente menos común.

Por ejemplo, una mesa puede tener 4, 6 u 8 sillas a su alrededor y probablemente
sería más rápido usar instanciación para dibujar esas sillas, excepto que en una lista de más de 500
cosas para dibujar, si las sillas son las únicas excepciones, probablemente no
valga la pena el esfuerzo de descubrir alguna organización de datos óptima que de alguna manera
organice las sillas para usar instanciación pero no encuentre otras situaciones para usar
instanciación.

El punto del párrafo anterior es: usa instanciación cuando sea apropiado. Si
vas a dibujar cientos o más de la misma cosa, entonces la instanciación es
probablemente apropiada. Si solo vas a dibujar unas pocas de la misma cosa, entonces
probablemente no valga la pena el esfuerzo de tratar esos pocos casos de forma especial.

En cualquier caso, aquí está nuestro código. Tenemos el código de inicialización que hemos estado usando
en general.

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
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
  });
```

Luego hagamos un módulo de shader.

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
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

        // Orientar las normales y pasarlas al fragment shader
        vsOut.normal = uni.normalMatrix * vert.normal;

        // Calcular la posición en el mundo de la superficie
        let surfaceWorldPosition = (uni.world * vert.position).xyz;

        // Calcular el vector de la superficie a la luz
        // y pasarlo al fragment shader
        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;

        // Calcular el vector de la superficie a la vista
        // y pasarlo al fragment shader
        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;

        // Pasar la coordenada de textura al fragment shader
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // Debido a que vsOut.normal es una variable inter-stage
        // está interpolada, por lo que no será un vector unitario.
        // Normalizarla la convertirá de nuevo en un vector unitario
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // Calcular la luz tomando el producto escalar (dot product)
        // de la normal con la dirección hacia la luz
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // valor si la condición es falsa
            pow(specular, uni.shininess),  // valor si la condición es verdadera
            specular > 0.0);               // condición

        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // Multipliquemos solo la porción de color (no el alfa)
        // por la luz
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

Este módulo de shader utiliza una iluminación similar a
[la luz puntual con reflejos especulares cubierta en otro lugar](webgpu-lighting-point.html#a-specular).
Utiliza una textura porque la mayoría de los modelos 3D usan texturas, así que pensé que sería mejor incluir una.
Multiplica la textura por un color para que podamos ajustar los colores de cada cubo.
Y tiene todos los valores de uniformes que necesitamos para realizar la iluminación y
[proyectar el cubo en 3D](webgpu-perspective-projection.html).

Necesitamos datos para un cubo y poner esos datos en buffers.

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

Necesitamos un pipeline de renderizado (render pipeline)

```js
  const pipeline = device.createRenderPipeline({
    label: 'modelo texturizado con luz puntual y reflejo especular',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // posición
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

El pipeline anterior utiliza 1 buffer por atributo. Uno para los datos de posición, uno para
los datos normales y otro para las coordenadas de textura (UVs). Descarta los triángulos que miran
hacia atrás (back-facing) y espera una textura de profundidad para la prueba de profundidad. Todas cosas que hemos
cubierto en otros artículos.

Insertemos algunas utilidades para crear colores y números aleatorios.

```js
/** Dado un string de color CSS, devuelve un array de 4 valores de 0 a 255 */
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

/** Dado un string de color CSS, devuelve un array de 4 valores de 0 a 1 */
const cssColorToRGBA = cssColor => cssColorToRGBA8(cssColor).map(v => v / 255);

/**
 * Dados los valores de matiz (hue), saturación (saturation) y luminancia (luminance) en el rango de 0 a 1
 * devuelve el string CSS hsl correspondiente
 */
const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;

/**
 * Dados los valores de matiz, saturación y luminancia en el rango de 0 a 1
 * devuelve un array de 4 valores de 0 a 1
 */
const hslToRGBA = (h, s, l) => cssColorToRGBA(hsl(h, s, l));

/**
 * Devuelve un número aleatorio entre min y max.
 * Si no se especifican min y max, devuelve de 0 a 1
 * Si no se especifica max, devuelve de 0 a min.
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

/** Selecciona un elemento aleatorio de un array */
const randomArrayElement = arr => arr[Math.random() * arr.length | 0];
```

Con suerte, todos son bastante sencillos.

Ahora hagamos algunas texturas y un sampler. Usaremos
un canvas, dibujaremos un emoji en él y luego usaremos nuestra función
`createTextureFromSource` que escribimos en
[el artículo sobre importación de texturas](webgpu-importing-textures.html)
para crear una textura a partir de él.

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

Creemos un conjunto de información de materiales. No hemos hecho esto en ningún otro lugar, pero es
una configuración común. Unity, Unreal, Blender, Three.js, Babylon.js tienen un concepto
de *material*. Generalmente, un material contiene cosas como el color del
material, qué tan brillante es, así como qué textura usar, etc...

Haremos 20 "materiales" y luego elegiremos un material al azar para cada cubo.

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

Ahora hagamos los datos para cada cosa (cubo) que queramos dibujar. Admitiremos un
máximo de 30000. Como hemos hecho en el pasado, haremos un uniform buffer para cada
objeto, así como un typed array que podamos actualizar con valores de uniformes. También
haremos un bind group para cada objeto. Y elegiremos algunos valores aleatorios que podamos usar
para posicionar y animar cada objeto.

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

    // offsets a los diversos valores de uniformes en índices float32
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
      label: 'bind group para el objeto',
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

Pre-creamos un descriptor de pase de renderizado (render pass descriptor) que actualizaremos para comenzar un pase de renderizado
en el momento del renderizado.

```js
  const renderPassDescriptor = {
    label: 'nuestro renderPass básico de canvas',
    colorAttachments: [
      {
        // view: <- se completará cuando rendericemos
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- se completará cuando rendericemos
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
```

Necesitamos una interfaz de usuario simple para poder ajustar cuántas cosas estamos dibujando.

```js
  const settings = {
    numObjects: 1000,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
```

Ahora podemos escribir nuestro bucle de renderizado.

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // convertir a segundos
    const deltaTime = time - then;
    then = time;


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

Dentro del bucle de renderizado actualizaremos nuestro descriptor de pase de renderizado. También
crearemos una textura de profundidad si no existe o si la que
tenemos tiene un tamaño diferente al de nuestra textura del canvas. Hicimos esto en
[el artículo sobre 3D](webgpu-orthographic-projection.html#a-depth-textures).

```js
    // Obtener la textura actual del contexto del canvas y
    // establecerla como la textura en la que renderizar.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    // Si no tenemos una textura de profundidad O si su tamaño es diferente
    // de la canvasTexture, creamos una nueva textura de profundidad
    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;
```

Iniciaremos un buffer de comandos (command buffer) y un pase de renderizado (render pass) y estableceremos nuestros buffers de vértices e índices.

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setVertexBuffer(1, normalBuffer);
    pass.setVertexBuffer(2, texcoordBuffer);
    pass.setIndexBuffer(indicesBuffer, 'uint16');
```

Luego calcularemos una matriz viewProjection como cubrimos en
[el artículo sobre proyección en perspectiva](webgpu-perspective-projection.html).

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
+    // Calcular una matriz de vista (view matrix)
+    const viewMatrix = mat4.lookAt(eye, target, up);
+
+    // Combinar las matrices de vista y proyección
+    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
```

Ahora podemos iterar sobre todos los objetos y dibujarlos; para cada uno necesitamos
actualizar todos sus valores de uniformes, copiar los valores de uniformes a su uniform buffer,
vincular el bind group para este objeto y dibujar.

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

      // Copiar la viewProjectionMatrix en los valores de uniformes para este objeto
      viewProjectionValue.set(viewProjectionMatrix);

      // Calcular una matriz de mundo (world matrix)
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Invertirla y trasponerla en el valor normalMatrix
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      // copiar los valores del material.
      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      // subir los valores de uniformes al uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

> Ten en cuenta que la parte del código etiquetada como "Calcular una matriz de mundo" no es tan común. Sería
más común tener un [grafo de escena (scene graph)](webgpu-scene-graphs.html), pero eso habría complicado
aún más el ejemplo. Necesitábamos algo que mostrara animación, así que improvisé algo.

Luego podemos finalizar el pase, terminar el buffer de comandos y enviarlo (submit).

```js
+    pass.end();
+
+    const commandBuffer = encoder.finish();
+    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

Quedan algunas cosas por hacer. Añadamos el cambio de tamaño (resizing).

```js
+  const canvasToSizeMap = new WeakMap();

  function render(time) {
    time *= 0.001;  // convertir a segundos
    const deltaTime = time - then;
    then = time;

+    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+
+    // No establezcas el tamaño del canvas si ya tiene ese tamaño, ya que puede ser lento.
+    if (canvas.width !== width || canvas.height !== height) {
+      canvas.width = width;
+      canvas.height = height;
+    }

    // Obtener la textura actual del contexto del canvas y
    // establecerla como la textura en la que renderizar.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

+  const observer = new ResizeObserver(entries => {
+    entries.forEach(entry => {
+      canvasToSizeMap.set(entry.target, {
+        width: Math.max(1, Math.min(entry.contentBoxSize[0].inlineSize, device.limits.maxTextureDimension2D)),
+        height: Math.max(1, Math.min(entry.contentBoxSize[0].blockSize, device.limits.maxTextureDimension2D)),
+      });
+    });
+  });
+  observer.observe(canvas);
```

Añadamos también algo de medición de tiempo. Usaremos las clases `NonNegativeRollingAverage` y `TimingHelper`
que hicimos en [el artículo sobre temporización (timing)](webgpu-timing.html).

```js
// ver https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import TimingHelper from './resources/js/timing-helper.js';
// ver https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import NonNegativeRollingAverage from './resources/js/non-negative-rolling-average.js';

const fpsAverage = new NonNegativeRollingAverage();
const jsAverage = new NonNegativeRollingAverage();
const gpuAverage = new NonNegativeRollingAverage();
const mathAverage = new NonNegativeRollingAverage();
```

Luego cronometraremos nuestro JavaScript desde el principio hasta el final de nuestro código de renderizado.

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

Cronometraremos la parte del JavaScript que hace las matemáticas 3D.

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

      // Copiar la viewProjectionMatrix en los valores de uniformes para este objeto
      viewProjectionValue.set(viewProjectionMatrix);

      // Calcular una matriz de mundo
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Invertirla y trasponerla en el valor normalMatrix
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

+      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // subir los valores de uniformes al uniform buffer
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

Cronometraremos el tiempo entre las llamadas de retorno de `requestAnimationFrame`.

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // convertir a segundos
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

Y cronometraremos nuestro pase de renderizado.

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
    fail('no se pudo inicializar WebGPU');
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

Y necesitamos mostrar los tiempos:

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

Una cosa más, solo para ayudar con mejores comparaciones. Un problema que tenemos ahora es que,
cada cubo visible tiene cada píxel renderizado, o al menos se verifica si necesita
ser renderizado. Dado que no estamos optimizando el renderizado de píxeles, sino más bien
optimizando el uso de WebGPU en sí, puede ser útil poder dibujar en un
canvas de 1x1 píxel. Esto elimina efectivamente casi todo el tiempo dedicado a
rasterizar triángulos y, en su lugar, deja solo la parte de nuestro código que está haciendo
matemáticas y comunicándose con WebGPU.

Así que añadamos una opción para hacer eso:

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
    time *= 0.001;  // convertir a segundos
    const deltaTime = time - then;
    then = time;
    ++frameCount;

    const startTimeMs = performance.now();

-    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+    const {width, height} = settings.render
+       ? canvasToSizeMap.get(canvas) ?? canvas
+       : { width: 1, height: 1 };
```

Ahora, si desmarcamos 'render', eliminaremos casi todo el... emm... renderizado.

Y con eso, tenemos nuestro primer ejemplo "sin optimizar". Sigue los
pasos enumerados cerca de la parte superior del artículo y funciona.

{{{example url="../webgpu-optimization-none.html"}}}

Aumenta el número de objetos y mira cuándo cae la tasa de frames (framerate) para ti. Para mí,
en mi monitor de 75 Hz en un Mac M1, obtuve ~8000 cubos antes de que la tasa de frames cayera.

# <a id="a-mapped-on-creation"></a> Optimización: Mapeado al crear (Mapped On Creation)

En el ejemplo anterior, y en la mayoría de los ejemplos de este sitio, hemos utilizado
`writeBuffer` para copiar datos en un buffer de vértices o de índices. Como una
optimización muy menor, para este caso particular, cuando creas un buffer puedes pasar
`mappedAtCreation: true`. Esto tiene 2 beneficios:

1. Es un poco más rápido poner los datos en el nuevo buffer.

2. No tienes que agregar `GPUBufferUsage.COPY_DST` al uso (usage) del buffer.

   Esto asume que no vas a cambiar los datos más tarde a través de `writeBuffer` ni
   mediante una de las funciones de copia a buffer.

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

Ten en cuenta que esta optimización solo ayuda en el momento de la creación, por lo que no afectará
nuestro rendimiento en el momento del renderizado.

# <a id="a-pack-verts"></a> Optimización: Empaqueta e intercala tus vértices

En el ejemplo anterior tenemos 3 atributos: uno para la posición, uno para las normales
y otro para las coordenadas de textura. Es común tener de 4 a 6 atributos donde
tendríamos [tangentes para el mapeo de normales (normal mapping)](webgpu-normal-mapping.html) y, si
tuviéramos [un modelo con piel (skinned)](webgpu-skinning.html), añadiríamos pesos (weights) y articulaciones (joints).

En el ejemplo anterior, cada atributo utiliza su propio buffer. Esto es más lento tanto
en la CPU como en la GPU. Es más lento en la CPU en JavaScript porque necesitamos llamar
a `setVertexBuffer` una vez por cada buffer para cada modelo que queramos dibujar.

Imagina que en lugar de solo un cubo tuviéramos cientos de modelos. Cada vez que cambiáramos
qué modelo dibujar, tendríamos que llamar a `setVertexBuffer` hasta 6 veces. 100 * 6
llamadas por modelo = 600 llamadas.

Siguiendo la regla "menos trabajo = ir más rápido", si fusionáramos los datos de los
atributos en un solo buffer, entonces solo necesitaríamos una llamada a
`setVertexBuffer` por modelo. 100 llamadas. ¡Eso es como un 600% más rápido!

En la GPU, cargar cosas que están juntas en memoria suele ser más rápido que
cargar desde diferentes lugares de la memoria, por lo que, además de poner los datos de los vértices
para un solo modelo en un solo buffer, es mejor intercalar (interleave) los
datos.

Hagamos ese cambio.

```js
-  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
-  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
-  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
+  const vertexData = new Float32Array([
+  // posición       normal        texcoord
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
     label: 'modelo texturizado con luz puntual y reflejo especular',
     layout: 'auto',
     vertex: {
       module,
       buffers: [
-        // posición
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
+            {shaderLocation: 0, offset: 0 * 4, format: 'float32x3'}, // posición
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

Arriba pusimos los datos de los 3 atributos en un solo buffer y luego cambiamos
nuestro pase de renderizado para que espere los datos intercalados en un solo buffer.

Nota: si estás cargando archivos gLTF, posiblemente sea bueno procesarlos
previamente para que los datos de sus vértices se intercalen en un solo buffer (lo mejor) o bien
intercalar los datos en el momento de la carga.

# Optimización: Dividir los uniform buffers (compartidos, de material, por modelo)

Nuestro ejemplo ahora mismo tiene un uniform buffer por objeto.

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

Algunos de esos valores de uniformes como `viewProjection`, `lightWorldPosition`
y `viewWorldPosition` pueden ser compartidos.

Podemos dividirlos en el shader para usar 2 uniform buffers. Uno para los
valores compartidos y otro para los *valores por objeto*.

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

Con este cambio, nos ahorraremos tener que copiar
`viewProjection`, `lightWorldPosition` y `viewWorldPosition`
en cada uniform buffer. También copiaremos menos datos por objeto
con `device.queue.writeBuffer`.

Aquí está el nuevo shader:

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
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

         // Orientar las normales y pasarlas al fragment shader
-        vsOut.normal = uni.normalMatrix * vert.normal;
+        vsOut.normal = obj.normalMatrix * vert.normal;

         // Calcular la posición en el mundo de la superficie
-        let surfaceWorldPosition = (uni.world * vert.position).xyz;
+        let surfaceWorldPosition = (obj.world * vert.position).xyz;

         // Calcular el vector de la superficie a la luz
         // y pasarlo al fragment shader
-        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

         // Calcular el vector de la superficie a la vista
         // y pasarlo al fragment shader
-        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

         // Pasar la coordenada de textura al fragment shader
         vsOut.texcoord = vert.texcoord;

         return vsOut;
       }

       @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
         // Debido a que vsOut.normal es una variable inter-stage
         // está interpolada, por lo que no será un vector unitario.
         // Normalizarla la convertirá de nuevo en un vector unitario
         let normal = normalize(vsOut.normal);

         let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
         let surfaceToViewDirection = normalize(vsOut.surfaceToView);
         let halfVector = normalize(
           surfaceToLightDirection + surfaceToViewDirection);

         // Calcular la luz tomando el producto escalar
         // de la normal con la dirección hacia la luz
         let light = dot(normal, surfaceToLightDirection);

         var specular = dot(normal, halfVector);
         specular = select(
             0.0,                           // valor si la condición es falsa
-            pow(specular, uni.shininess),  // valor si la condición es verdadera
+            pow(specular, obj.shininess),  // valor si la condición es verdadera
             specular > 0.0);               // condición

-        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
         // Multipliquemos solo la porción de color (no el alfa)
         // por la luz
         let color = diffuse.rgb * light + specular;
         return vec4f(color, diffuse.a);
       }
    `,
  });
```

Necesitamos crear un global uniform buffer para los uniformes globales.

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

Luego podemos eliminar estos uniformes de nuestro uniform buffer perObject y agregar el
global uniform buffer al bind group de cada objeto.

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

    // offsets a los diversos valores de uniformes en índices float32
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
      label: 'bind group para el objeto',
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

Luego, en el momento del renderizado, actualizamos el global uniform buffer solo una vez, fuera del
bucle de renderizado de nuestros objetos.

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

    // Calcular una matriz de vista
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combinar las matrices de vista y proyección
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

-      // Copiar la viewProjectionMatrix en los valores de uniformes para este objeto
-      viewProjectionValue.set(viewProjectionMatrix);

      // Calcular una matriz de mundo
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Invertirla y trasponerla en el valor normalMatrix
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;
      colorValue.set(color);
-      lightWorldPositionValue.set([-10, 30, 300]);
-      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // subir los valores de uniformes al uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    pass.end();
```

Eso no cambió el número de llamadas a WebGPU, de hecho agregó 1. Pero redujo gran parte del trabajo que estábamos haciendo por modelo.

{{{example url="../webgpu-optimization-step3-global-vs-per-object-uniforms.html"}}}

En mi máquina, con ese cambio, nuestra porción de matemáticas cayó un ~16%.

# Optimización: Separar más uniformes

Una organización común en una biblioteca 3D es tener "modelos" (los datos de los vértices),
"materiales" (los colores, el brillo y las texturas), "luces" (qué luces
usar), "viewInfo" (la matriz de vista y proyección). En particular, en nuestro
ejemplo, `color` y `shininess` nunca cambian, por lo que es un desperdicio seguir copiándolos
al uniform buffer en cada frame.

Hagamos un uniform buffer por material. Copiaremos los ajustes del material en
ellos en el momento de la inicialización y luego simplemente los agregaremos a nuestro bind group.

Primero cambiemos los shaders para usar otro uniform buffer.

```js
  const module = device.createShaderModule({
    code: /* wgsl */ `
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

         // Orientar las normales y pasarlas al fragment shader
         vsOut.normal = obj.normalMatrix * vert.normal;

         // Calcular la posición en el mundo de la superficie
         let surfaceWorldPosition = (obj.world * vert.position).xyz;

         // Calcular el vector de la superficie a la luz
         // y pasarlo al fragment shader
         vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

         // Calcular el vector de la superficie a la vista
         // y pasarlo al fragment shader
         vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

         // Pasar la coordenada de textura al fragment shader
         vsOut.texcoord = vert.texcoord;

         return vsOut;
       }

       @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
         // Debido a que vsOut.normal es una variable inter-stage
         // está interpolada, por lo que no será un vector unitario.
         // Normalizarla la convertirá de nuevo en un vector unitario
         let normal = normalize(vsOut.normal);

         let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
         let surfaceToViewDirection = normalize(vsOut.surfaceToView);
         let halfVector = normalize(
           surfaceToLightDirection + surfaceToViewDirection);

         // Calcular la luz tomando el producto escalar
         // de la normal con la dirección hacia la luz
         let light = dot(normal, surfaceToLightDirection);

         var specular = dot(normal, halfVector);
         specular = select(
             0.0,                           // valor si la condición es falsa
-            pow(specular, obj.shininess),  // valor si la condición es verdadera
+            pow(specular, material.shininess),  // valor si la condición es verdadera
             specular > 0.0);               // condición

-        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = material.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
         // Multipliquemos solo la porción de color (no el alfa)
         // por la luz
         let color = diffuse.rgb * light + specular;
         return vec4f(color, diffuse.a);
       }
    `,
  });
```

Luego haremos un uniform buffer para cada material.

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

Cuando configuramos la información por objeto, ya no necesitamos pasar los
ajustes del material. En su lugar, solo necesitamos agregar el uniform buffer del material al
bind group del objeto.

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

    // offsets a los diversos valores de uniformes en índices float32
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
      label: 'bind group para el objeto',
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

También dejamos de necesitar manejar estas cosas en el momento del renderizado.

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

      // Calcular una matriz de mundo
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Invertirla y trasponerla en el valor normalMatrix
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

-      const {color, shininess} = material;
-      colorValue.set(color);
-      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // subir los valores de uniformes al uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

{{{example url="../webgpu-optimization-step4-material-uniforms.html"}}}

# Optimización: Usar un solo Uniform Buffer grande con offsets de buffer

En este momento, cada objeto tiene su propio uniform buffer. En el momento del renderizado, para cada
objeto, actualizamos un typed array con los valores de uniformes para ese objeto y luego
llamamos a `device.queue.writeBuffer` para actualizar los valores de ese único uniform buffer.
Si estamos renderizando 8000 objetos, son 8000 llamadas a `device.queue.writeBuffer`.

En su lugar, podríamos crear un uniform buffer más grande. Luego podemos configurar el bind
group de cada objeto para que use su propia porción del buffer más grande. En el momento del
renderizado, podemos actualizar todos los valores para todos los objetos en un solo typed array
grande y hacer solo una llamada a `device.queue.writeBuffer`, lo que debería ser
más rápido.

Primero asignemos un uniform buffer grande y un typed array grande. Los offsets de
uniform buffer tienen una alineación mínima que por defecto es de 256 bytes, así que
redondearemos el tamaño que necesitamos por objeto a 256 bytes.

```js
+/** Redondea v a un múltiplo de alignment */
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

Ahora podemos cambiar las vistas por objeto para que miren dentro de ese typedarray grande.
También podemos configurar el bind group para que use la porción correcta del uniform buffer grande.

```js
  for (let i = 0; i < maxObjects; ++i) {
+    const uniformBufferOffset = i * uniformBufferSpace;
+    const f32Offset = uniformBufferOffset / 4;

    // offsets a los diversos valores de uniformes en índices float32
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
      label: 'bind group para el objeto',
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

En el momento del renderizado, actualizamos todos los valores de los objetos y luego hacemos
solo una llamada a `device.queue.writeBuffer`.

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

      // Calcular una matriz de mundo
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Invertirla y trasponerla en el valor normalMatrix
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

-      // subir los valores de uniformes al uniform buffer
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

+    // subir todos los valores de uniformes al uniform buffer
+    if (settings.numObjects) {
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
+    }

    pass.end();
```

{{{example url="../webgpu-optimization-step5-use-buffer-offsets.html"}}}

¡En mi máquina, eso redujo un 40% del tiempo de JavaScript!

# Optimización: Usar buffers mapeados (Mapped Buffers)

Cuando llamamos a `device.queue.writeBuffer`, lo que sucede es que WebGPU hace una copia de
los datos en el typed array. Copia esos datos al proceso de la GPU (un proceso separado
que habla con la GPU por seguridad). En el proceso de la GPU, esos datos se
copian al GPU Buffer.

Podemos saltarnos una de esas copias usando buffers mapeados en su lugar. Mapearemos un
buffer, actualizaremos los valores de uniformes directamente en ese buffer mapeado. Luego
desmapearemos (unmap) el buffer y emitiremos un comando `copyBufferToBuffer` para copiar al
uniform buffer. Esto ahorrará una copia.

El mapeo de WebGPU ocurre de forma asíncrona, por lo que en lugar de mapear un buffer y esperar a
que esté listo, mantendremos un array de buffers ya mapeados. En cada frame, obtendremos
un buffer ya mapeado o crearemos uno nuevo que ya esté mapeado.
Después de renderizar, configuraremos una llamada de retorno para mapear el buffer cuando esté disponible
y volver a ponerlo en la lista de buffers ya mapeados. De esta manera, nunca
tendremos que esperar a que un buffer se mapee.

Primero haremos un array de buffers mapeados y una función para obtener un
buffer premapeado o crear uno nuevo.

```js
  const mappedTransferBuffers = [];
  const getMappedTransferBuffer = () => {
    return mappedTransferBuffers.pop() || device.createBuffer({
      label: 'buffer de transferencia (transfer buffer)',
      size: uniformBufferSpace * maxObjects,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
  };
```

Ya no podemos pre-crear vistas de typedarray porque el mapeo de
un buffer nos da un nuevo `ArrayBuffer`. Por lo tanto, tendremos que
crear nuevas vistas de typedarray después de mapear.

```js
+  // offsets a los diversos valores de uniformes en índices float32
+  const kNormalMatrixOffset = 0;
+  const kWorldOffset = 12;

   for (let i = 0; i < maxObjects; ++i) {
     const uniformBufferOffset = i * uniformBufferSpace;
-    const f32Offset = uniformBufferOffset / 4;
-
-    // offsets a los diversos valores de uniformes en índices float32
-    const kNormalMatrixOffset = 0;
-    const kWorldOffset = 12;
-
-    const normalMatrixValue = uniformValues.subarray(
-        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);
-    const material = randomArrayElement(materials);

     const bindGroup = device.createBindGroup({
       label: 'bind group para el objeto',
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

En el momento del renderizado codificamos un comando para copiar el transfer buffer
al uniform buffer *antes* de empezar a recorrer los
objetos. Esto se debe a que el comando `copyBufferToBuffer` es
un comando en el `GPUCommandEncoder`. Necesitamos que se ejecute antes de que los
objetos se rendericen pero, a medida que recorremos los objetos, estamos
codificando comandos de pase de renderizado para renderizarlos. Antes, llamábamos
a `device.queue.writeBuffer` después de actualizar los typed arrays, lo cual,
por supuesto, se ejecuta primero porque no hemos llamado a `submit` todavía
en nuestros comandos. En este caso, sin embargo, nuestra copia es en realidad un comando,
así que tenemos que codificarlo antes de los comandos de dibujo. Esto está bien porque,
recuerda, es solo un comando, no se ejecutará hasta que
enviemos el buffer de comandos, lo que significa que aún podemos actualizar el
transfer buffer ya que la copia aún no ha ocurrido.

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

+    // copiar los valores de uniformes del transfer buffer al uniform buffer
+    if (settings.numObjects) {
+      // Recuerda, esto es solo codificar un comando que sucederá más tarde.
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      encoder.copyBufferToBuffer(transferBuffer, 0, uniformBuffer, 0, size);
+    }

+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
+    pass.setPipeline(pipeline);
+    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setIndexBuffer(indicesBuffer, 'uint16');

     for (let i = 0; i < settings.numObjects; ++i) {
       const {
         bindGroup,
-        normalMatrixValue,
-        worldValue,
         axis,
         radius,
         speed,
         rotationSpeed,
         scale,
       } = objectInfos[i];
       const mathTimeStartMs = performance.now();

+      // Crear vistas en el buffer mapeado.
+      const uniformBufferOffset = i * uniformBufferSpace;
+      const f32Offset = uniformBufferOffset / 4;
+      const normalMatrixValue = uniformValues.subarray(
+          f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+      const worldValue = uniformValues.subarray(
+          f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

       // Calcular una matriz de mundo
       mat4.identity(worldValue);
       mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
       mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
       mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
       mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
       mat4.scale(worldValue, [scale, scale, scale], worldValue);

       // Invertirla y trasponerla en el valor normalMatrix
       mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

       mathElapsedTimeMs += performance.now() - mathTimeStartMs;

       pass.setBindGroup(0, bindGroup);
       pass.drawIndexed(numVertices);
     }
+    transferBuffer.unmap();

-    // subir todos los valores de uniformes al uniform buffer
-    if (settings.numObjects) {
-      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
-      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
-    }

     pass.end();

     const commandBuffer = encoder.finish();
     device.queue.submit([commandBuffer]);
```

Finalmente, tan pronto como hayamos enviado el buffer de comandos, mapeamos el buffer nuevamente.
El mapeo es asíncrono, así que cuando finalmente esté listo, lo agregaremos de nuevo a la lista
de buffers ya mapeados.

```js
     pass.end();

     const commandBuffer = encoder.finish();
     device.queue.submit([commandBuffer]);

+    transferBuffer.mapAsync(GPUMapMode.WRITE).then(() => {
+      mappedTransferBuffers.push(transferBuffer);
+    });
```

En mi máquina, esta versión dibuja alrededor de 15000 objetos a 75 fps, lo cual es aproximadamente
un 87% más de con lo que empezamos.

{{{example url="../webgpu-optimization-step6-use-mapped-buffers.html"}}}

Con el renderizado desactivado, la diferencia es aún mayor. Para mí, obtengo 9000 a
75 fps con el ejemplo original no optimizado y 18000 a 75 fps en esta última
versión. ¡Eso es una mejora de velocidad de 2 veces!

Otras cosas que *podrían* ayudar:

* **Usar doble buffer para el uniform buffer grande**

  Esto surge como una posible optimización porque WebGPU no puede actualizar un
  buffer que está actualmente en uso.

  Así que, imagina que comienzas a renderizar (llamas a `device.queue.submit`). La GPU
  comienza a renderizar usando nuestro uniform buffer grande. Intentas actualizar
  ese buffer inmediatamente. En este caso, WebGPU tendría que pausar y esperar a que la GPU
  termine de usar el buffer para renderizar.

  Es poco probable que esto suceda en nuestro ejemplo anterior. No actualizamos directamente el
  uniform buffer. En su lugar, actualizamos un transfer buffer y luego, más tarde, le pedimos a la
  GPU que lo copie al uniform buffer.

  Este problema sería más probable si actualizaras un buffer directamente en
  la GPU usando un compute shader.

* **Calcular las matemáticas de matrices con offsets**

  La biblioteca matemática que creamos en [la serie sobre matemáticas de matrices](webgpu-matrix-math.html)
  genera `Float32Array`s como salidas y recibe `Float32Array`s como entradas.
  Puede modificar un `Float32Array` en su lugar. Pero lo que no puede hacer es actualizar un
  `Float32Array` en algún offset determinado.
  
  Es por eso que, en nuestro bucle donde actualizamos nuestros valores de uniformes por objeto, para
  cada objeto tenemos que crear 2 vistas de `Float32Array` en nuestro buffer mapeado.
  Para 20000 objetos, eso es crear 40000 de estas vistas temporales.
  
  Agregar offsets a cada entrada los haría pesados de usar en mi opinión
  pero, solo como prueba, escribí una versión modificada de las funciones matemáticas que
  reciben un offset. En otras palabras:

  ```js
      mat4.multiply(a, b, dst);
  ```

  se convierte en

  ```js
     mat4.multiply(a, aOffset, b, bOffset, dst, dstOffset);
  ```

  [Parece ser un 7% más rápido usar los offsets](../webgpu-optimization-step6-use-mapped-buffers-math-w-offsets.html).

  Depende de ti si crees que eso vale la pena. Para mí personalmente, como
  mencioné al principio del artículo, prefiero mantenerlo simple de usar. Rara vez
  intento dibujar 10000 cosas. Pero es bueno saber que, si quisiera
  obtener más rendimiento, este es un lugar donde podría encontrar algo. Lo más probable
  es que investigara WebAssembly si necesitara llegar tan lejos.

* **Mapear directamente el uniform buffer**

  En nuestro ejemplo de arriba mapeamos un transfer buffer, un buffer que solo tiene los
  flags de uso `COPY_SRC` y `MAP_WRITE`. Luego tenemos que llamar a
  `encoder.copyBufferToBuffer` para copiar el contenido de ese buffer en el
  uniform buffer real.

  Sería mucho mejor si pudiéramos mapear directamente el uniform buffer y evitar
  la copia. Desafortunadamente, esa capacidad no está disponible en la versión 1 de WebGPU, pero
  se está considerando como una característica opcional en algún momento en el futuro,
  especialmente para *arquitecturas de memoria uniforme* como algunos dispositivos basados en ARM.

* **Dibujo Indirecto (Indirect Drawing)**

  El dibujo indirecto se refiere a comandos de dibujo que toman sus parámetros de un buffer de la GPU.

  ```js
  pass.draw(vertexCount, instanceCount, firstVertex, firstInstance);  // directo
  pass.drawIndirect(someBuffer, offsetIntoSomeBuffer);                // indirecto
  ```

  En el caso indirecto anterior, `someBuffer` es una porción de 16 bytes de un buffer de la GPU que contiene
  `[vertexCount, instanceCount, firstVertex, firstInstance]`.

  La ventaja del dibujo indirecto es que puedes hacer que la propia GPU rellene los valores.
  Incluso puedes hacer que la GPU establezca `vertexCount` y/o `instanceCount` a cero cuando no
  quieras que esa cosa se dibuje.

  Utilizando el dibujo indirecto, podrías hacer cosas como, por ejemplo, pasar todas las
  cajas delimitadoras (bounding boxes) o esferas delimitadoras (bounding spheres) de los objetos a la GPU y luego hacer que la GPU realice el
  frustum culling (descarte por frustum); si el objeto está dentro del frustum, actualizaría los
  parámetros de dibujo indirecto de ese objeto para que sea dibujado; de lo contrario, los actualizaría
  para que no se dibuje. "Frustum culling" es una forma elegante de decir "comprobar si el objeto
  está posiblemente dentro del frustum (tronco de pirámide) de la cámara". Hablamos de los frustums en
  [el artículo sobre proyección en perspectiva](webgpu-persective-projection.html).

* **Render Bundles**

  Los render bundles te permiten pre-grabar un montón de comandos de buffer de comandos y luego
  solicitar que se ejecuten más tarde. Esto puede ser útil, especialmente si tu
  escena es relativamente estática, lo que significa que no necesitas añadir o eliminar objetos
  más tarde.

  Hay un gran artículo [aquí](https://toji.dev/webgpu-best-practices/render-bundles)
  que combina render bundles, dibujos indirectos y frustum culling por GPU para mostrar
  algunas ideas para obtener más velocidad en situaciones especializadas.
