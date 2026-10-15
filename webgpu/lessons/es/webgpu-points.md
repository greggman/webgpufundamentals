Title: Puntos en WebGPU
Description: Dibujando puntos en WebGPU
TOC: Puntos

WebGPU soporta el dibujo de puntos. Hacemos esto estableciendo la topología primitiva (primitive topology) a `'point-list'` en una render pipeline.

Vamos a crear un ejemplo sencillo con puntos aleatorios, partiendo de las ideas presentadas en [el artículo sobre buffers de vértices](webgpu-vertex-buffers.html).

Primero, un vertex shader y un fragment shader sencillos. Para simplificar, solo usaremos coordenadas de espacio de recorte (clip space) para las posiciones y codificaremos a piñón el color amarillo en nuestro fragment shader.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex fn vs(vert: Vertex,) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vert.position;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // amarillo
}
```

Luego, cuando creamos una pipeline, establecemos la topología a `'point-list'`:

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos de 1 píxel',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes cada uno
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // posición
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    primitive: {
+      topology: 'point-list',
+    },
  });
```

Llenemos un buffer de vértices con algunos puntos aleatorios en el espacio de recorte:

```js
  const rand = (min, max) => min + Math.random() * (max - min);

  const kNumPoints = 100;
  const vertexData = new Float32Array(kNumPoints * 2);
  for (let i = 0; i < kNumPoints; ++i) {
    const offset = i * 2;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
  }

  const vertexBuffer = device.createBuffer({
    label: 'vértices del buffer de vértices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

Y luego dibujamos:

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(kNumPoints);
    pass.end();
```

Y con eso obtenemos 100 puntos amarillos aleatorios.

{{{example url="../webgpu-points.html" }}}

Desafortunadamente, todos tienen solo 1 píxel de tamaño. WebGPU solo soporta puntos de 1 píxel. Si queremos algo más grande, tenemos que hacerlo nosotros mismos. Afortunadamente, es fácil de hacer. Simplemente crearemos un quad y usaremos [instanciado (instancing)](webgpu-vertex-buffers.html#a-instancing).

Añadamos un quad a nuestro vertex shader y un atributo de tamaño. También añadamos un uniform para pasar el tamaño de la textura en la que estamos dibujando.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
+  @location(1) size: f32,
};

+struct Uniforms {
+  resolution: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
};

+@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
   var vsOut: VSOutput;
+  let pos = points[vNdx];
-  vsOut.position = vec4f(vert.position, 0, 1);
+  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
   return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 1, 0, 1); // amarillo
}
```

En JavaScript, necesitamos añadir un atributo para el tamaño por punto, establecer los atributos para que avancen por instancia configurando `stepMode: 'instance'`, y podemos eliminar la configuración de la topología ya que queremos la predeterminada `'triangle-list'`:

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos de tamaño variable',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: 2 * 4, // 2 floats, 4 bytes cada uno
+          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes cada uno
+          stepMode: 'instance',
           attributes: [
             {shaderLocation: 0, offset: 0, format: 'float32x2'},  // posición
+            {shaderLocation: 1, offset: 8, format: 'float32'},  // tamaño
           ],
         },
       ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });
```

Añadamos un tamaño aleatorio por punto a nuestros datos de vértices:

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 2);
+  const vertexData = new Float32Array(kNumPoints * 3);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 2;
+    const offset = i * 3;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
+    vertexData[offset + 2] = rand(1, 32);
  }
```

Necesitamos un uniform buffer para poder pasar la resolución:

```js
  const uniformValues = new Float32Array(2);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kResolutionOffset = 0;
  const resolutionValue = uniformValues.subarray(
      kResolutionOffset, kResolutionOffset + 2);
```

Y necesitamos un bind group para vincular el uniform buffer:

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

Luego, al renderizar, podemos actualizar el uniform buffer con la resolución actual:

```js
    // Obtén la textura actual del contexto del canvas y
    // establécela como la textura en la que renderizar.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

+    // Actualiza la resolución en el uniform buffer
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

luego establecemos nuestro bind group y renderizamos una instancia por punto:

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setBindGroup(0, bindGroup);
-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);
    pass.end();
```

Y ahora tenemos puntos de tamaño variable.

{{{example url="../webgpu-points-w-size.html" }}}

¿Qué pasaría si quisiéramos texturizar nuestros puntos? Solo necesitamos pasar coordenadas de textura desde el vertex shader al fragment shader.

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
+  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
```

Y, por supuesto, usar una textura en el fragment shader:

```wgsl
+@group(0) @binding(1) var s: sampler;
+@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return vec4f(1, 1, 0, 1); // amarillo
+  return textureSample(t, s, vsOut.texcoord);
}
```

Crearemos una textura sencilla usando un canvas tal como cubrimos en [el artículo sobre importación de texturas](webgpu-importing-textures.html).

```js
  const ctx = new OffscreenCanvas(32, 32).getContext('2d');
  ctx.font = '27px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥑', 16, 16);

  const texture = device.createTexture({
    size: [32, 32],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING |
           GPUTextureUsage.COPY_DST |
           GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: ctx.canvas, flipY: true },
    { texture, premultipliedAlpha: true },
    [32, 32],
  );
```

Y necesitamos un sampler y añadirlos a nuestro bind group:

```js
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
+      { binding: 1, resource: sampler },
+      { binding: 2, resource: texture },
    ],
  });
```

Añadamos también el blending para obtener [transparencia](webgpu-transparency.html):

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos de tamaño variable con textura',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes cada uno
          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // posición
            {shaderLocation: 1, offset: 8, format: 'float32'},  // tamaño
          ],
        },
      ],
    },
    fragment: {
      module,
-      targets: [{ format: presentationFormat }],
+      targets: [
+        {
+         format: presentationFormat,
+          blend: {
+            color: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+            alpha: {
+              srcFactor: 'one',
+              dstFactor: 'one-minus-src-alpha',
+              operation: 'add',
+            },
+          },
+        },
+      ],
    },
  });
```

Y ahora tenemos puntos texturizados.

{{{example url="../webgpu-points-w-texture.html" }}}

Y podríamos seguir: ¿qué tal una rotación por punto? Usando las matemáticas que cubrimos en [el artículo sobre matemáticas de matrices](webgpu-matrix-math.html).

```wgsl
struct Vertex {
  @location(0) position: vec2f,
  @location(1) size: f32,
+  @location(2) rotation: f32,
};

struct Uniforms {
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
+  let c = cos(vert.rotation);
+  let s = sin(vert.rotation);
+  let rot = mat2x2f(
+     c, s,
+    -s, c,
+  );
-  vsOut.position = vec4f(vert.position + pos * vert.size / uni.resolution, 0, 1);
+  vsOut.position = vec4f(vert.position + rot * pos * vert.size / uni.resolution, 0, 1);
  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
```

Necesitamos añadir el atributo de rotación a nuestra pipeline:

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos texturizados, con tamaño y rotación',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (2 + 1) * 4, // 3 floats, 4 bytes cada uno
+          arrayStride: (2 + 1 + 1) * 4, // 4 floats, 4 bytes cada uno
           stepMode: 'instance',
           attributes: [
             {shaderLocation: 0, offset: 0, format: 'float32x2'},  // posición
             {shaderLocation: 1, offset: 8, format: 'float32'},  // tamaño
+            {shaderLocation: 2, offset: 12, format: 'float32'},  // rotación
           ],
         },
       ],
    },
    ...
```

Necesitamos añadir la rotación a nuestros datos de vértices:

```js
  const kNumPoints = 100;
-  const vertexData = new Float32Array(kNumPoints * 3);
+  const vertexData = new Float32Array(kNumPoints * 4);
  for (let i = 0; i < kNumPoints; ++i) {
-    const offset = i * 3;
+    const offset = i * 4;
    vertexData[offset + 0] = rand(-1, 1);
    vertexData[offset + 1] = rand(-1, 1);
*    vertexData[offset + 2] = rand(10, 64);
+    vertexData[offset + 3] = rand(0, Math.PI * 2);
  }

```

Cambiemos también la textura de 🥑 a 👉:

```js
-  ctx.fillText('🥑', 16, 16);
+  ctx.fillText('👉', 16, 16);
```

{{{example url="../webgpu-points-w-rotation.html" }}}

# ¿Y qué hay de los puntos en 3D?

La respuesta sencilla es simplemente añadir los valores del quad después de realizar [las matemáticas 3D para los vértices](webgpu-perspective-projection.html).

Por ejemplo, aquí tienes un código para crear posiciones 3D para una [esfera de Fibonacci](https://www.google.com/search?q=fibonacci+sphere).

```js
function createFibonacciSphereVertices({
  numSamples,
  radius,
}) {
  const vertices = [];
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < numSamples; ++i) {
    const offset = 2 / numSamples;
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - Math.pow(y, 2));
    const phi = (i % numSamples) * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    vertices.push(x * radius, y * radius, z * radius);
  }
  return new Float32Array(vertices);
}
```

Podemos dibujar los vértices como puntos aplicando matemáticas 3D a los mismos, tal como [cubrimos en la serie sobre matemáticas 3D](webgpu-cameras.js).

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
*  matrix: mat4x4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
*  let clipPos = uni.matrix * vert.position;
  vsOut.position = clipPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);  // naranja
}
```

Aquí tenemos nuestra pipeline y buffer de vértices:

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos 3D con tamaño fijo',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes cada uno
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // posición
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'point-list',
    },
  });

  const vertexData = createFibonacciSphereVertices({
    radius: 1,
    numSamples: 1000,
  });
  const kNumPoints = vertexData.length / 3;

  const vertexBuffer = device.createBuffer({
    label: 'vértices del buffer de vértices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
```

Y un uniform buffer y valores uniform para nuestra matriz, así como un bindGroup para pasar el uniform buffer a nuestro shader.

```js
  const uniformValues = new Float32Array(16);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kMatrixOffset = 0;
  const matrixValue = uniformValues.subarray(
      kMatrixOffset, kMatrixOffset + 16);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer },
    ],
  });
```

Y el código para dibujar usando una matriz de proyección, cámara y otras matemáticas 3D.

```js
  function render(time) {
    time *= 0.001;

    // Obtén la textura actual del contexto del canvas y
    // establécela como la textura en la que renderizar.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view =
        canvasTexture;

    // Establece la matriz en el uniform buffer
    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // posición
      [0, 0, 0],    // objetivo
      [0, 1, 0],    // arriba
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

    // Copia los valores uniform a la GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(kNumPoints);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
```

También cambiamos a un bucle `requestAnimationFrame`.

{{{example url="../webgpu-points-3d-1px.html"}}}

Eso es difícil de ver, así que para aplicar las técnicas anteriores, simplemente añadimos la posición del quad tal como lo hicimos previamente.

```wgsl
struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
  matrix: mat4x4f,
+  resolution: vec2f,
+  size: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
+    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
+  let points = array(
+    vec2f(-1, -1),
+    vec2f( 1, -1),
+    vec2f(-1,  1),
+    vec2f(-1,  1),
+    vec2f( 1, -1),
+    vec2f( 1,  1),
+  );
  var vsOut: VSOutput;
+  let pos = points[vNdx];
  let clipPos = uni.matrix * vert.position;
+  let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
-  vsOut.position = clipPos;
+  vsOut.position = clipPos + pointPos;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);
}
```

A diferencia del ejemplo anterior, no usaremos un tamaño diferente para cada vértice. En su lugar, pasaremos un único tamaño para todos los vértices.

```js
-  const uniformValues = new Float32Array(16);
+  const uniformValues = new Float32Array(16 + 2 + 1 + 1);
   const uniformBuffer = device.createBuffer({
     size: uniformValues.byteLength,
     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
   });
   const kMatrixOffset = 0;
+  const kResolutionOffset = 16;
+  const kSizeOffset = 18;
   const matrixValue = uniformValues.subarray(
       kMatrixOffset, kMatrixOffset + 16);
+  const resolutionValue = uniformValues.subarray(
+      kResolutionOffset, kResolutionOffset + 2);
+  const sizeValue = uniformValues.subarray(
+      kSizeOffset, kSizeOffset + 1);
```

Necesitamos establecer la resolución como hicimos antes, y también un tamaño:

```js
  function render(time) {
    ...
+    // Establece el tamaño en el uniform buffer
+    sizeValue[0] = 10;

    const fov = 90 * Math.PI / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 50);
    const view = mat4.lookAt(
      [0, 0, 1.5],  // posición
      [0, 0, 0],    // objetivo
      [0, 1, 0],    // arriba
    );
    const viewProjection = mat4.multiply(projection, view);
    mat4.rotateY(viewProjection, time, matrixValue);
    mat4.rotateX(matrixValue, time * 0.5, matrixValue);

+    // Actualiza la resolución en el uniform buffer
+    resolutionValue.set([canvasTexture.width, canvasTexture.height]);

    // Copia los valores uniform a la GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

Y, como hicimos antes, necesitamos cambiar de dibujar puntos a dibujar quads instanciados:

```js
  const pipeline = device.createRenderPipeline({
    label: 'puntos 3D',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (3) * 4, // 3 floats, 4 bytes cada uno
+          stepMode: 'instance',
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // posición
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [
        {
         format: presentationFormat,
        },
      ],
    },
-    primitive: {
-      topology: 'point-list',
-    },
  });

  ...

  function render(time) {

    ...

-    pass.draw(kNumPoints);
+    pass.draw(6, kNumPoints);

    ...
```

Esto nos da puntos en 3D. Incluso se escalan según su distancia de la cámara.

{{{example url="../webgpu-points-3d.html"}}}

## <a id="a-fixed-size-3d-points"></a> Puntos 3D de tamaño fijo

¿Qué pasa si queremos que los puntos mantengan un tamaño fijo?

Recuerda del [artículo sobre proyección de perspectiva](webgpu-perspective-projection.html) que la GPU divide la posición que devolvemos del vertex shader por W. Esta división nos da la perspectiva al hacer que las cosas que están más lejos parezcan más pequeñas. Por lo tanto, para los puntos que no queremos que cambien de tamaño, simplemente necesitamos multiplicarlos por esa W para que, después de ser divididos, tengan el valor que realmente queríamos.

```wgsl
    var vsOut: VSOutput;
    let pos = points[vNdx];
    let clipPos = uni.matrix * vert.position;
    let pointPos = vec4f(pos * uni.size / uni.resolution * clipPos.w, 0, 0);
    vsOut.position = clipPos + pointPos;
    return vsOut;
```

Y ahora mantienen el mismo tamaño.

{{{example url="../webgpu-points-3d-fixed-size.html"}}}

<div class="webgpu_bottombar">
<h3>¿Por qué WebGPU no soporta puntos más grandes que 1x1 píxel?</h3>
<p>WebGPU se basa en APIs de GPU nativas como Vulkan, Metal, DirectX e incluso OpenGL. Desafortunadamente, esas APIs no se ponen de acuerdo entre sí sobre lo que significa soportar el renderizado de puntos. Algunas APIs tienen límites dependientes del dispositivo sobre el tamaño de los puntos. Algunas APIs no renderizan un punto si su centro está fuera del espacio de recorte (clip space), mientras que otras sí lo hacen. En algunas APIs, este segundo problema depende del controlador (driver). Todo eso significa que WebGPU decidió hacer lo más portable y solo soportar píxeles de tamaño 1x1.</p>
<p>Lo bueno es que es fácil soportar puntos más grandes tú mismo, como se mostró arriba. Las soluciones anteriores son portables entre dispositivos, no tienen límite en el tamaño de un punto y recortan los puntos de manera consistente en todos los dispositivos. Dibujan la porción de cualquier punto que esté dentro del espacio de recorte, independientemente de si el centro del punto está fuera de dicho espacio.</p>
<p>Mejor aún, estas soluciones son más flexibles. Por ejemplo, la rotación de puntos no es algo soportado por las APIs nativas. Al implementar nuestras propias soluciones, podemos añadir fácilmente más características, haciendo las cosas aún más flexibles.</p>
</div>

