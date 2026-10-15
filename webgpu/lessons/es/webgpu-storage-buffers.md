Title: Storage Buffers en WebGPU
Description: Pasando grandes cantidades de datos a los shaders
TOC: Storage Buffers

Este artículo es parte de una serie sobre las diversas formas de proporcionar datos
a un shader. Cada uno se basa en la lección anterior, por lo que te resultará
más fácil entenderlos si los lees en orden.

{{{toc-steps list="passing-data.hanson"}}}

Este artículo trata sobre los storage buffers y continúa donde lo dejó el [artículo anterior](webgpu-uniforms.html).

Los storage buffers son similares a los uniform buffers en muchos sentidos. Si todo lo que hiciéramos fuera cambiar `UNIFORM` por `STORAGE` en nuestro JavaScript y `var<uniform>` por `var<storage, read>` en nuestro WGSL, los ejemplos de la página anterior simplemente funcionarían.

De hecho, aquí están las diferencias, sin renombrar las variables para que tengan nombres más apropiados.

```js
    const staticUniformBuffer = device.createBuffer({
      label: `static uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });


...

    const uniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: uniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
```

y en nuestro WSGL

```wsgl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
+@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

Y sin ningún otro cambio funciona, exactamente como antes.

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## Diferencias entre uniform buffers y storage buffers

Las principales diferencias entre los uniform buffers y los storage buffers son:

1. Los uniform buffers pueden ser más rápidos para su caso de uso típico.

   Realmente depende del caso de uso. Una aplicación típica necesitará dibujar muchas cosas diferentes. Digamos que es un juego 3D. La aplicación podría dibujar coches, edificios, rocas, arbustos, personas, etc. Cada uno de ellos requerirá pasar orientaciones y propiedades de materiales similares a lo que pasa nuestro ejemplo anterior. En este caso, usar un uniform buffer es la solución recomendada.

2. Los storage buffers pueden ser mucho más grandes que los uniform buffers.

   * Por defecto, el tamaño máximo de un uniform buffer es 64 kiB (65536 bytes).
   * Por defecto, el tamaño máximo de un storage buffer es 128 MiB (134217728 bytes).

   Se requiere que todas las implementaciones soporten al menos estos tamaños. Cubriremos cómo verificar y solicitar límites más grandes en detalle en [otro artículo](webgpu-limits-and-features.html).

3. Los storage buffers pueden ser de lectura/escritura (read/write), mientras que los uniform buffers son de solo lectura.

   Vimos un ejemplo de escritura en un storage buffer en el ejemplo de compute shader (shader de cómputo) en el [primer artículo](webgpu-fundamentals.html).

## <a id="a-instancing"></a>Instanciado (Instancing) con Storage Buffers

Dados los dos primeros puntos anteriores, tomemos nuestro último ejemplo y cambiémoslo para dibujar los 100 triángulos en una sola llamada de dibujo. Este es un caso de uso que *podría* encajar con los storage buffers. Digo podría porque, de nuevo, WebGPU es similar a otros lenguajes de programación. Hay muchas formas de lograr lo mismo. `array.forEach` frente a `for (const elem of array)` frente a `for (let i = 0; i < array.length; ++i)`. Cada uno tiene sus usos. Lo mismo ocurre con WebGPU. Cada cosa que intentamos hacer tiene múltiples formas de lograrlo. Cuando se trata de dibujar triángulos, a WebGPU solo le importa que devolvamos un valor para `builtin(position)` desde el vertex shader (shader de vértices) y que devolvamos un color/valor para `location(0)` desde el fragment shader (shader de fragmentos).[^colorAttachments]

[^colorAttachments]: Podemos tener múltiples color attachments y entonces necesitaremos devolver más colores/valores para `location(1)`, `location(2)`, etc.

Lo primero que haremos es cambiar nuestras declaraciones de storage por arrays de tamaño dinámico.

```wgsl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

Luego cambiaremos el shader para usar estos valores.

```wgsl
@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32
) -> @builtin(position) {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

+  let otherStruct = otherStructs[instanceIndex];
+  let ourStruct = ourStructs[instanceIndex];

   return vec4f(
     pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
}
```

Añadimos un nuevo parámetro a nuestro vertex shader llamado `instanceIndex` y le dimos el atributo `@builtin(instance_index)`, lo que significa que obtiene su valor de WebGPU para cada "instancia" dibujada. Cuando llamamos a `draw`, podemos pasar un segundo argumento para el *número de instancias* y, para cada instancia dibujada, el número de la instancia que se está procesando se pasará a nuestra función.

Usando `instanceIndex`, podemos obtener elementos de struct específicos de nuestros arrays de structs.

También necesitamos obtener el color del elemento de array correcto y usarlo en nuestro fragment shader (shader de fragmentos). El fragment shader no tiene acceso a `@builtin(instance_index)` porque no tendría sentido. Podríamos pasarlo como una [variable de etapa intermedia (inter-stage variable)](webgpu-inter-stage-variables.html), pero sería más común buscar el color en el vertex shader y simplemente pasar el color.

Para hacer esto, usaremos otro struct como hicimos en el [artículo sobre variables de etapa intermedia](webgpu-inter-stage-variables.html).

```wgsl
+struct VSOutput {
+  @builtin(position) position: vec4f,
+  @location(0) color: vec4f,
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
-) -> @builtin(position) vec4f {
+) -> VSOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

-  return vec4f(
-    pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  var vsOut: VSOutput;
+  vsOut.position = vec4f(
+      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  vsOut.color = ourStruct.color;
+  return vsOut;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return ourStruct.color;
+@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
+  return vsOut.color;
}

```

Ahora que hemos modificado nuestros shaders WGSL, actualicemos el JavaScript.

Aquí está la configuración.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // crea 2 storage buffers
  const staticUnitSize =
    4 * 4 + // color son 4 floats de 32 bits (4 bytes cada uno)
    2 * 4 + // offset son 2 floats de 32 bits (4 bytes cada uno)
    2 * 4;  // padding (relleno)
  const changingUnitSize =
    2 * 4;  // scale son 2 floats de 32 bits (4 bytes cada uno)
  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // offsets a los diversos valores uniform en índices de float32
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // Estos solo se establecen una vez, así que establécelos ahora
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // establece el color
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // establece el offset

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // un typed array que podemos usar para actualizar el changingStorageBuffer
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer },
      { binding: 1, resource: changingStorageBuffer },
    ],
  });
```

Arriba creamos 2 storage buffers. Uno para un array de `OurStruct` y el otro para un array de `OtherStruct`.

Luego rellenamos los valores para el array de `OurStruct` con offsets y colores, y después subimos esos datos al `staticStorageBuffer`.

Creamos solo un bind group que hace referencia a ambos buffers.

El nuevo código de renderizado es:

```js
  function render() {
    // Obtén la textura actual del contexto del canvas y
    // establécela como la textura sobre la que renderizar.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // Establece los valores uniform en nuestro Float32Array del lado de JavaScript
    const aspect = canvas.width / canvas.height;

-    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
-      uniformValues.set([scale / aspect, scale], kScaleOffset); // establece la escala
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(3);  // llama a nuestro vertex shader 3 veces
-    }

+    // establece las escalas para cada objeto
+    objectInfos.forEach(({scale}, ndx) => {
+      const offset = ndx * (changingUnitSize / 4);
+      storageValues.set([scale / aspect, scale], offset + kScaleOffset); // establece la escala
+    });
+    // sube todas las escalas a la vez
+    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(3, kNumObjects);  // llama a nuestro vertex shader 3 veces por cada instancia


    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

El código anterior va a dibujar `kNumObjects` instancias. Para cada instancia, WebGPU llamará al vertex shader 3 veces con `vertex_index` establecido en 0, 1, 2 e `instance_index` establecido en 0 ~ kNumObjects - 1.

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

Logramos dibujar los 100 triángulos, cada uno con una escala, color y offset diferentes, con una sola llamada de dibujo. Para situaciones en las que quieras dibujar muchas instancias del mismo objeto, esta es una forma de hacerlo.

## Usando storage buffers para datos de vértices

Hasta este punto, hemos usado un triángulo hard-coded (grabado a fuego) directamente en nuestro shader. Un caso de uso de los storage buffers es almacenar datos de vértices. Al igual que indexamos los storage buffers actuales por `instance_index` en nuestro ejemplo anterior, podríamos indexar otro storage buffer con `vertex_index` para obtener datos de vértices.

¡Hagámoslo!

```wgsl
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

+struct Vertex {
+  position: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
+@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
-      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

Ahora necesitamos configurar un storage buffer más con algunos datos de vértices. Primero, hagamos una función para generar algunos datos de vértices. Hagamos un círculo.
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triángulos por subdivisión, 3 vértices por tri, 2 valores (xy) cada uno.
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // 2 triángulos por subdivisión
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // primer triángulo
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // segundo triángulo
    addVertex(c1 * innerRadius, s1 * innerRadius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c2 * innerRadius, s2 * innerRadius);
  }

  return {
    vertexData,
    numVertices,
  };
}
```

El código anterior crea un círculo a partir de triángulos como este.

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

Así que podemos usar eso para llenar un storage buffer con los vértices para un círculo.

```js
  // configura un storage buffer con datos de vértices
  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);
```

Y luego necesitamos añadirlo a nuestro bind group.

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer },
      { binding: 1, resource: changingStorageBuffer },
+      { binding: 2, resource: vertexStorageBuffer },
    ],
  });
```

y finalmente, en el momento del renderizado, necesitamos pedir que se rendericen todos los vértices del círculo.

```js
-    pass.draw(3, kNumObjects);  // llama a nuestro vertex shader 3 veces para varias instancias
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

Arriba usamos:

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

podríamos haberlo hecho con la misma facilidad sin struct y simplemente usando directamente un `vec2f`.

```wgsl
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
+@group(0) @binding(2) var<storage, read> pos: array<vec2f>;
...
-pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
```

Pero, al hacerlo un struct, ¿podría decirse que sería más fácil añadir datos por vértice más adelante?

Pasar vértices a través de storage buffers está ganando popularidad. Sin embargo, me han dicho que para algunos dispositivos más antiguos, es más lento que la forma *clásica*, que cubriremos a continuación en un artículo sobre [vertex buffers](webgpu-vertex-buffers.html).

<!-- keep this at the bottom of the article -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
