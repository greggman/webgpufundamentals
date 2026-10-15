Title: WebGPU: Resaltado
Description: Resaltado de objetos seleccionados
TOC: Resaltado

Este artículo es el primero de una breve serie sobre cómo crear partes de un editor 3D. Cada uno se basa en la lección anterior, por lo que te resultará más fácil entenderlos si los lees en orden.
Estos artículos asumen que ya has leído [el artículo sobre grafos de escena (scene graphs)](webgpu-scene-graphs.html) así como [el artículo sobre post-procesamiento (post processing)](webgpu-post-processing.html).

{{{toc-steps list="editor.hanson"}}}

Supongamos que queremos hacer una especie de editor 3D sencillo inspirado en Blender, Maya, Unity o Unreal. Queremos algo que nos permita seleccionar y manipular objetos en 3D. Empezamos este camino en [el artículo sobre grafos de escena](webgpu-scene-graphs.html), donde teníamos nodos y podíamos seleccionar uno mediante botones en la interfaz de usuario para editar su traslación, rotación y escala. Sería estupendo si pudiéramos ver visualmente cuál está seleccionado. Hagamos eso.

Partiendo del [ejemplo donde añadimos por primera vez la capacidad de seleccionar nodos](webgpu-scene-graphs.html#a-gui), comenzamos con una escena como esta:

<div class="webgpu_center center">
  <div data-diagram="standardPass" style="width: 600px"></div>
</div>

Para resaltar lo seleccionado, podríamos renderizar solo lo que está seleccionado en una textura separada.

<div class="webgpu_center center">
  <div data-diagram="selectedPass" style="width: 600px"></div>
</div>

Los valores alfa formarían efectivamente una silueta de los objetos seleccionados.

<div class="webgpu_center center">
  <div data-diagram="alpha" style="width: 600px"></div>
</div>

Luego podríamos usar esa máscara alfa como entrada para un paso tipo post-procesamiento donde dibujamos el color de resaltado si el alfa de la máscara es 0 pero hay un valor distinto de cero cerca. Esto nos daría efectivamente un contorno (outline).

<div class="webgpu_center center">
  <div data-diagram="outline" style="width: 600px"></div>
</div>

Aquí hay un shader tipo post-procesamiento que, dada la máscara alfa, dibujará un contorno:

```wgsl
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

@group(0) @binding(0) var mask: texture_2d<f32>;

fn isOnEdge(pos: vec2i) -> bool {
  // Note: we need to make sure we don't use texel coords out of bounds
  // with textureLoad as that returns different results on different GPUs
  let size = vec2i(textureDimensions(mask, 0));
  let start = max(pos - 2, vec2i(0));
  let end = min(pos + 2, size);

  for (var y = start.y; y <= end.y; y++) {
    for (var x = start.x; x <= end.x; x++) {
      let s = textureLoad(mask, vec2i(x, y), 0).a;
      if (s > 0) {
        return true;
      }
    }
  }
  return false;
};

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let pos = vec2i(fsInput.position.xy);

  // Get the current texel.
  // If it's not 0 we are inside the selected objects
  let s = textureLoad(mask, pos, 0).a;
  if (s > 0) {
    discard;
  }

  let hit = isOnEdge(pos);
  if (!hit) {
    discard;
  }
  return vec4f(1, 0.5, 0, 1); // naranja
}
```

El shader primero comprueba si el píxel en la máscara es > 0. Si lo es, entonces está dentro de la máscara que representa los objetos seleccionados, por lo que no queremos dibujar nada y ejecutamos `discard`.

De lo contrario, llama a `isOnEdge` para comprobar los píxeles vecinos. Si ninguno de ellos es > 0, entonces no es el borde y no dibujamos nada mediante `discard`.

En caso contrario, estamos en un borde y dibujamos en naranja.

Ahora que tenemos un shader, necesitamos el código de configuración de post-procesamiento del [artículo sobre post-procesamiento](webgpu-post-processing.html).

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

      @group(0) @binding(0) var mask: texture_2d<f32>;

      fn isOnEdge(pos: vec2i) -> bool {
        // Note: we need to make sure we don't use texel coords out of bounds
        // with textureLoad as that returns different results on different GPUs
        let size = vec2i(textureDimensions(mask, 0));
        let start = max(pos - 2, vec2i(0));
        let end = min(pos + 2, size);

        for (var y = start.y; y <= end.y; y++) {
          for (var x = start.x; x <= end.x; x++) {
            let s = textureLoad(mask, vec2i(x, y), 0).a;
            if (s > 0) {
              return true;
            }
          }
        }
        return false;
      };

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
        let pos = vec2i(fsInput.position.xy);

        // Get the current texel. If it's not 0 we are inside the selected objects
        let s = textureLoad(mask, pos, 0).a;
        if (s > 0) {
          discard;
        }

        let hit = isOnEdge(pos);
        if (!hit) {
          discard;
        }
        return vec4f(1, 0.5, 0, 1);
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

-  const postProcessSampler = device.createSampler({
-    minFilter: 'linear',
-    magFilter: 'linear',
-  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
-      { loadOp: 'clear', storeOp: 'store' },
+      { loadOp: 'load', storeOp: 'store' },
    ],
  };

-  let renderTarget;
  let postProcessBindGroup;
+  let lastPostProcessTexture;

  function setupPostProcess(texture) {
-    if (renderTarget?.width === canvasTexture.width &&
-        renderTarget?.height === canvasTexture.height) {
-      return;
-    }
-
-    renderTarget?.destroy();
-    renderTarget = device.createTexture({
-      size: canvasTexture,
-      format: 'rgba8unorm',
-      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
-    });
-    const renderTargetView = renderTarget;
-    renderPassDescriptor.colorAttachments[0].view = renderTargetView;

+    if (!postProcessBindGroup || texture !== lastPostProcessTexture) {
+      lastPostProcessTexture = texture;
*      postProcessBindGroup = device.createBindGroup({
*        layout: postProcessPipeline.getBindGroupLayout(0),
*        entries: [
-          { binding: 0, resource: renderTargetView },
-          { binding: 1, resource: postProcessSampler },
-          { binding: 2, resource: postProcessUniformBuffer },
+          { binding: 0, resource: texture },
*        ],
*      });
+    }
  }

  function postProcess(encoder, srcTexture, dstTexture) {
-    device.queue.writeBuffer(
-      postProcessUniformBuffer,
-      0,
-      new Float32Array([
-        settings.affectAmount,
-        settings.bandMult,
-        settings.cellMult,
-        settings.cellBright,
-      ]),
-    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

También necesitamos usar los objetos de post-procesamiento al renderizar.

```js
+  let selectedMeshes = [];

  function render() {

    ...

-    const encoder = device.createCommandEncoder();
-    const pass = encoder.beginRenderPass(renderPassDescriptor);
-    pass.setPipeline(pipeline);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60), // fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    // Get the camera's position from the matrix we computed
    const cameraMatrix = mat4.identity();
    mat4.translate(cameraMatrix, [120, 100, 0], cameraMatrix);
    mat4.rotateY(cameraMatrix, settings.cameraRotation, cameraMatrix);
    mat4.translate(cameraMatrix, [60, 0, 300], cameraMatrix);

    // Make a view matrix from the camera's
    const viewMatrix = mat4.inverse(cameraMatrix);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

+    const encoder = device.createCommandEncoder();
+    {
+      const pass = encoder.beginRenderPass(renderPassDescriptor);
+      pass.setPipeline(pipeline);

*      const ctx = { pass, viewProjectionMatrix };
*      root.updateWorldMatrix();
*      for (const mesh of meshes) {
*        drawMesh(ctx, mesh);
*      }
*
*      pass.end();
+    }

+    // dibujamos los objetos seleccionados en postTexture
+    {
+       if (!postTexture ||
+            postTexture.width !== canvasTexture.width)
+            postTexture.height !== canvasTexture.height) {
+         postTexture?.destroy();
+         postTexture = device.createTexture({
+          format: canvasTexture.format,
+          canvasTexture, // para el tamaño,
+          usage: GPUTextureUsage.RENDER_ATTACHMENT |
+                 GPUTextureUsage.TEXTURE_BINDING,
+         });
+       }
+      setupPostProcess(postTexture);
+
+      renderPassDescriptor.colorAttachments[0].view = postTexture;
+      const pass = encoder.beginRenderPass(renderPassDescriptor);
+      pass.setPipeline(pipeline);
+
+      const ctx = { pass, viewProjectionMatrix };
+      for (const mesh of selectedMeshes) {
+        drawMesh(ctx, mesh);
+      }
+
+      pass.end();
+
+      // draw the outline based on the alpha in postTexture
+      // over the canvasTexture
+      postProcess(encoder, undefined, canvasTexture);
+    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

El código anterior dibuja la escena original. Luego dibuja `selectedMeshes` en `postTexture`. Pasamos esa `postTexture` al código de post-procesamiento para dibujar el contorno sobre la `canvasTexture`.

Dado que tenemos 2 fragmentos de código que recrean una textura si el tamaño de otra ha cambiado, podríamos simplificar un poco el código añadiendo una función de ayuda.

```js
+  function makeNewTextureIfSizeDifferent(texture, size, format, usage) {
+    if (!texture ||
+        texture.width !== size.width ||
+        texture.height !== size.height) {
+      texture?.destroy();
+      texture = device.createTexture({
+        format,
+        size,
+        usage,
+      });
+    }
+    return texture;
+  }

...

  function render() {
    ...

    // If we don't have a depth texture OR if its size is different
    // from the canvasTexture, make a new depth texture
-    if (!depthTexture ||
-        depthTexture.width !== canvasTexture.width ||
-        depthTexture.height !== canvasTexture.height) {
-      if (depthTexture) {
-        depthTexture.destroy();
-      }
-      depthTexture = device.createTexture({
-        size: [canvasTexture.width, canvasTexture.height],
-        format: 'depth24plus',
-        usage: GPUTextureUsage.RENDER_ATTACHMENT,
-      });
-    }
+    depthTexture = makeNewTextureIfSizeDifferent(
+      depthTexture,
+      canvasTexture, // para el tamaño
+      'depth24plus',
+      GPUTextureUsage.RENDER_ATTACHMENT,
+    );

...

    // dibujamos los objetos seleccionados en postTexture
    {
-      if (!postTexture ||
-           postTexture.width !== canvasTexture.width)
-           postTexture.height !== canvasTexture.height) {
-        postTexture?.destroy();
-        postTexture = device.createTexture({
-         format: canvasTexture.format,
-         canvasTexture, // para el tamaño,
-         usage: GPUTextureUsage.RENDER_ATTACHMENT |
-                GPUTextureUsage.TEXTURE_BINDING,
-        });
-      }
+      postTexture = makeNewTextureIfSizeDifferent(
+        postTexture,
+        canvasTexture, // para el tamaño
+        canvasTexture.format,
+        GPUTextureUsage.RENDER_ATTACHMENT |
+        GPUTextureUsage.TEXTURE_BINDING,
+      );
       setupPostProcess(postTexture);
```

Lo que queda es una forma de rellenar `selectedMeshes`. Esto se complica un poco por el hecho de que hicimos todo a partir de cubos y, por defecto, ocultamos algunos de esos nodos. Tendremos en cuenta esa ocultación al establecer `selectedMeshes` comprobando todos los hijos de un nodo en busca de más mallas (meshes).

```js
+  function meshUsesNode(mesh, node) {
+    if (!node) {
+      return false;
+    }
+    if (mesh.node === node) {
+      return true;
+    }
+    for (const child of node.children) {
+      if (meshUsesNode(mesh, child)) {
+        return true;
+      }
+    }
+    return false;
+  }

  const kUnelected = '\u3000'; // full width space
  const kSelected = '➡️';
  const prefixRE = new RegExp(`^(?:${kUnelected}|${kSelected})`);

  function setCurrentSceneGraphNode(node) {
    trsUIHelper.setTRS(node.source);
    trsFolder.name(`orientación: ${node.name}`);
    trsFolder.updateDisplay();

    // Mark which node is selected.
    for (const b of nodeButtons) {
      const name = b.button.getName().replace(prefixRE, '');
      b.button.name(`${b.node === node ? kSelected : kUnelected}${name}`);
    }

+    selectedMeshes = meshes.filter(mesh => meshUsesNode(mesh, node));

+    render();
  }
```

Y con eso, los objetos seleccionados quedan resaltados.

{{{example url="../webgpu-highlighting.html"}}}

Ahora que podemos resaltar una selección, hagamos posible [mover la cámara arrastrando el ratón](webgpu-camera-controls.html) en lugar de tener que usar los botones de la interfaz de usuario.

<!-- keep this at the bottom of the article -->
<link href="webgpu-highlighting.css" rel="stylesheet">
<script type="module" src="webgpu-highlighting.js"></script>
