Title: WebGPU: Picking (Selección)
Description: Haciendo clic en los objetos
TOC: Picking

Este artículo es el tercero de una breve serie sobre cómo crear partes para un editor 3D. Cada uno se basa en la lección anterior, por lo que te resultará más fácil entenderlos si los lees en orden.

{{{toc-steps list="editor.hanson"}}}

El *picking* es el acto de seleccionar objetos haciendo clic en la pantalla y determinar qué objetos han sido pulsados.

## Picking basado en CPU

En nuestra serie sobre matemáticas 3D aprendimos cómo usar matrices para proyectar posiciones de vértices 3D en posiciones del espacio de recorte (clip space). Para el picking podemos hacer lo contrario. Podemos tomar el lugar donde el usuario hizo clic en la pantalla, convertirlo a posiciones en el espacio de recorte y luego, utilizando la inversa de la matriz que convirtió las posiciones de los vértices al espacio de recorte, transformar las posiciones del espacio de recorte de vuelta al espacio de los vértices.

Una vez que están en el mismo espacio, es relativamente fácil comprobar si el rayo que va desde el frente del frustum actual hasta la parte posterior interseca algún objeto.

Vayamos por pasos. Primero debemos decidir cuándo realizar el picking. Dado que también usamos el puntero para mover la cámara, hagámoslo en el evento `pointerup`, siempre que el usuario no haya movido el puntero.

```js
  function addOrbitCameraEventListeners(cam, elem) {
    let startX;
    let startY;
+    let moved;
    let lastMode;
    let camHelper;
    let doubleTapMode;
    let lastSingleTapTime;
    let startPinchDistance;
    const pointerToLastPosition = new Map();

    ...

    const onMove = (e) => {
      if (!pointerToLastPosition.has(e.pointerId) ||
          !canvas.hasPointerCapture(e.pointerId)) {
        return;
      }
      pointerToLastPosition.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const mode = pointerToLastPosition.size === 2
        ? 'pinch'
        : pointerToLastPosition.size > 2
        ? 'undefined'
        : doubleTapMode
        ? 'doubleTapZoom'
        : e.shiftKey || (e.buttons & 4) !== 0
        ? 'track'
        : 'panAndTilt';

      if (mode !== lastMode) {
        lastMode = mode;
        updateStartPosition(e);
      }

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

+      if (pointerToLastPosition.size === 1 &&
+          Math.hypot(deltaX, deltaY) > 1) {
+        moved = true;
+      }

      switch (mode) {
        case 'pinch': {
          const pinchDistance = computePinchDistance();
          const delta = pinchDistance - startPinchDistance;
          camHelper.dolly(cam.radius * 0.002 * -delta);
          break;
        }
        case 'track': {
          const s = cam.radius * 0.001;
          camHelper.track(-deltaX * s, deltaY * s);
          break;
        }
        case 'panAndTilt':
          camHelper.panAndTilt(deltaX * 0.01, deltaY * 0.01);
          break;
        case 'doubleTapZoom':
          camHelper.dolly(cam.radius * 0.002 * deltaY);
          break;
      }

      render();
    };

    const onUp = (e) => {
+      const numPointers = pointerToLastPosition.size;
      pointerToLastPosition.delete(e.pointerId);
      canvas.releasePointerCapture(e.pointerId);
-      if (pointerToLastPosition.size === 0) {
+      if (numPointers === 1 && pointerToLastPosition.size === 0) {
        doubleTapMode = false;
+        if (!moved) {
+          pickMeshes(e, cam, moved);
+        }
      }
    };

    const kDoubleClickTimeMS = 300;
    const onDown = (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointerToLastPosition.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerToLastPosition.size === 1) {
+        moved = false;
        if (!doubleTapMode) {
          const now = performance.now();
          const deltaTime = now - lastSingleTapTime;
          if (deltaTime < kDoubleClickTimeMS) {
            doubleTapMode = true;
          }
          lastSingleTapTime = now;
        }
      } else {
        doubleTapMode = false;
      }
      updateStartPosition(e);
    };

    ...
  }
```

Con esto llamamos a `pickMeshes` si el usuario no ha movido el puntero. Necesitamos suministrar esa función, pero antes vamos a necesitar una matriz de vista-proyección, así que vamos a extraer el código actual que la genera.

```js
+  function getViewProjectionMatrix(cam, canvas) {
+    const aspect = canvas.clientWidth / canvas.clientHeight;
+    const projection = mat4.perspective(
+        settings.fieldOfView,
+        aspect,
+        1,      // zNear
+        2000,   // zFar
+    );
+
+    const viewMatrix = mat4.inverse(cam.getCameraMatrix());
+
+    // combinamos las matrices de vista y proyección
+    return mat4.multiply(projection, viewMatrix);
+  }

    ...

  function render() {
    ...


-    const aspect = canvas.clientWidth / canvas.clientHeight;
-    const projection = mat4.perspective(
-        settings.fieldOfView,
-        aspect,
-        1,      // zNear
-        2000,   // zFar
-    );
-
    root.updateWorldMatrix();
-
-    // creamos una matriz de vista a partir de la de la cámara
-    const viewMatrix = mat4.inverse(orbitCamera.getCameraMatrix());
-
-    // combinamos las matrices de vista y proyección
-    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
+    const viewProjectionMatrix = getViewProjectionMatrix(orbitCamera, canvas);
```

Ahora podemos usar eso para empezar a crear `pickMeshes`:

```js
+  function pickMeshes(e, cam) {
+    const rect = e.target.getBoundingClientRect();
+    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
+    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;
+
+    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
+    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
+    ???
+  }
```

`pickMeshes` calcula las coordenadas X e Y en el espacio de recorte, una matriz de vista-proyección y se las pasa a `getIntersectingMeshes` esperando un array de mallas (meshes).

Vamos a crear `getIntersectingMeshes`:

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {
    const clipNear = [clipX, clipY, 0];
    const clipFar = [clipX, clipY, 1];

    // creamos algunas variables matemáticas temporales
    const worldViewProjection = mat4.identity();
    const mat = mat4.identity();
    const near = vec3.create();
    const far = vec3.create();

    const verts = [
      vec3.create(),
      vec3.create(),
      vec3.create(),
    ];

    const intersectingMeshes = [];
    for (const mesh of meshes) {
      // ponemos mat en el espacio del modelo (el espacio de los datos de vértices)
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // la invertimos para que al introducir coordenadas del espacio de recorte se transformen
      // al espacio del modelo.
      mat4.inverse(worldViewProjection, mat);

      // ahora transformamos las coordenadas del espacio de recorte al espacio del modelo
      // para poder compararlas con los vértices del modelo y el AABB
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices } = mesh.vertices;

      const numTriangles = numVertices / 3;
      let closest;
      for (let t = 0; t < numTriangles; ++t) {
        // obtenemos las 3 posiciones para el triángulo
        verts.forEach((v, i) => {
          const offset = (t * 3 + i) * 4;
          v[0] = vertexData[offset + 0];
          v[1] = vertexData[offset + 1];
          v[2] = vertexData[offset + 2];
        });

        const result = intersectLineSegmentAndTriangle(near, far, ...verts);
        if (result) {
          // Convertimos de vuelta al espacio de recorte para poder comprobar la Z y quedarnos
          // con el impacto más cercano.
          vec3.transformMat4(result, worldViewProjection, result);
          if (closest === undefined || result[2] < closest[2]) {
            closest = result;
          }
        }
      }

      if (closest !== undefined) {
        intersectingMeshes.push({
          position: closest,
          mesh,
        });
      }
    }

    return intersectingMeshes;
  }
```

Espero que este código sea relativamente sencillo. Crea `clipNear` y `clipFar`. Estos son fáciles de obtener, ya que son solo los `clipX` y `clipY` que se pasaron, con la z de `clipNear` establecida en 0 y la de `clipFar` en 1.

Luego, para cada malla obtenemos su `worldMatrix` y la multiplicamos por la matriz de vista-proyección de nuestra cámara. Después calculamos la inversa. Esto nos permite convertir `clipNear` y `clipFar` a las mismas posiciones pero en el mismo espacio que los datos de vértices. Llamamos a los resultados `near` (cercano) y `far` (lejano).

A continuación recorremos los triángulos de los datos de vértices y, para cada uno, llamamos a `intersectLineSegmentAndTriangle`, que devolverá `undefined` si el segmento de línea entre `near` y `far` no interseca, o bien devolverá dónde ocurrió la intersección si la hubo.

Convertimos el resultado de vuelta al espacio de recorte para que las posiciones vuelvan a estar orientadas respecto al espectador. Esto nos permite quedarnos con el punto más cercano a la cámara.

Si encontramos que alguno de los triángulos interseca, añadimos esa malla a nuestros resultados.

Con esto en su lugar, podemos volver y terminar `pickMeshes`:

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // ordenamos los resultados por su z
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // elegimos el primero
    if (intersectingMeshes.length > 0) {
      let node = intersectingMeshes[0].mesh.node;
      if (!settings.showMeshNodes) {
        while (node.name.includes('mesh')) {
          node = node.parent;
        }
      }
      setCurrentSceneGraphNode(node);
    }
  }
```

Aún nos quedan algunas cosas por hacer. Necesitamos suministrar `intersectLineSegmentAndTriangle`. Este es el llamado [algoritmo de intersección rayo-triángulo de Möller–Trumbore](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm).

```js
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  function intersectLineSegmentAndTriangle(p0, p1, v0, v1, v2) {
    const edge1 = vec3.subtract(v1, v0);
    const edge2 = vec3.subtract(v2, v0);
    const dir = vec3.subtract(p1, p0); // Dirección del segmento de línea

    const h = vec3.cross(dir, edge2);
    const a = vec3.dot(edge1, h);

    // Si 'a' es cercano a cero, la línea es paralela
    // al plano del triángulo
    if (Math.abs(a) < 0.00001) {
      return undefined;
    }

    const f = 1 / a;
    const s = vec3.subtract(p0, v0);
    const u = f * vec3.dot(s, h);

    // Comprobar si el punto de intersección está fuera
    // del rango [0, 1] del parámetro U del triángulo
    if (u < 0.0 || u > 1.0) {
      return undefined;
    }

    const q = vec3.cross(s, edge1);
    const v = f * vec3.dot(dir, q);

    // Comprobar si el punto de intersección está fuera
    // del rango [0, 1] del parámetro V o del rango S+T [0, 1]
    if (v < 0.0 || u + v > 1.0) {
      return undefined;
    }

    // En esta etapa, el punto de intersección se encuentra en la línea infinita
    // y dentro del triángulo
    const t = f * vec3.dot(edge2, q);

    // Comprobar si el punto de intersección se encuentra dentro
    // del rango [0, 1] del parámetro T del segmento de línea
    if (t < 0.0 || t > 1.0) {
      return undefined;
    }

    // Devolver el punto de intersección
    return vec3.addScaled(p0, dir, t);
  }
```

Esa función llama a `vec3.dot`, así que debemos suministrarla.

```js
const vec3 = {
  ...

+  dot(a, b) {
+    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
+  },

}
```

Hemos usado `dot` (producto escalar) en [los artículos sobre iluminación](webgpu-lighting-directional.html) entre otros lugares. Multiplica los componentes correspondientes de 2 vec3 y suma los resultados.

También necesitamos conservar los datos de los vértices.

```js
  function createVertices({vertexData, numVertices, aabb}, name) {
    const vertexBuffer = device.createBuffer({
      label: `${name}: vertex buffer vertices`,
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    return {
      vertexBuffer,
      numVertices,
      aabb,
+      vertexData,
    };
  }
```

¡Y con eso ya podemos seleccionar objetos!

{{{example url="../webgpu-picking-cpu-step-01.html"}}}

Sería estupendo si al hacer clic en ningún lugar se deseleccionara lo que esté seleccionado actualmente. Hagamos eso:

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // ordenamos los resultados por su z
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // elegimos el primero
    if (intersectingMeshes.length > 0) {
      let node = intersectingMeshes[0].mesh.node;
      if (!settings.showMeshNodes) {
        while (node.name.includes('mesh')) {
          node = node.parent;
        }
      }
      setCurrentSceneGraphNode(node);
-    }
+    } else {
+      setCurrentSceneGraphNode(undefined);
+    }
  }

  ...

  // Presenta un TRS a la interfaz de usuario. Permite establecer qué TRS
  // se está editando.
  class TRSUIHelper {
    #trs = new TRS();

    constructor() {}

    setTRS(trs) {
-      this.#trs = trs;
+      this.#trs = trs ?? new TRS();
    }

    ...
  }

  ...

  let currentNode;
  function setCurrentSceneGraphNode(node) {
    currentNode = node;
-    trsUIHelper.setTRS(node.source);
-    trsFolder.name(`orientation: ${node.name}`);
+    trsUIHelper.setTRS(node?.source);
+    trsFolder.name(`orientación: ${node?.name ?? '--ninguno--'}`);
    trsFolder.updateDisplay();

    showTRS();

    // Marcamos qué nodo está seleccionado.
    for (const b of nodeButtons) {
      const name = b.button.getName().replace(prefixRE, '');
      b.button.name(`${b.node === node ? kSelected : kUnelected}${name}`);
    }

    selectedMeshes = meshes.filter(mesh => meshUsesNode(mesh, node));

    render();
  }

...

-  setCurrentSceneGraphNode(cabinets.children[1]);
+  setCurrentSceneGraphNode(undefined);
```

{{{example url="../webgpu-picking-cpu-step-02.html"}}}

Un problema que tenemos ahora mismo es que solo podemos seleccionar el objeto más cercano. Algo bueno de nuestro código es que obtenemos una lista de todos los objetos que están bajo el puntero del usuario. Es común en un editor que, en el primer clic, se elija el objeto más cercano. En un segundo clic, si el puntero no se ha movido, se elige el siguiente objeto. Esto se repite hasta que hayamos ciclado por todos los objetos bajo el puntero. Vamos a hacerlo.

```js
+  let lastPickX;
+  let lastPickY;
+  let lastPickNdx;
+  let lastIntersectingMeshes;
  function pickMeshes(e, cam) {
+    if (!lastIntersectingMeshes ||
+        lastPickX !== e.clientX ||
+        lastPickY !== e.clientY) {
+      lastPickNdx = 0;
+      lastPickX = e.clientX;
+      lastPickY = e.clientY;
       const rect = e.target.getBoundingClientRect();
       const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
       const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;
 
       const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
-      const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
-
-    // ordenamos los resultados por su z
-    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
-
-    // elegimos el primero
-    if (intersectingMeshes.length > 0) {
-      let node = intersectingMeshes[0].mesh.node;
+      lastIntersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
+      lastIntersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
+    }
+
+    // Ciclar por los resultados
+    if (lastIntersectingMeshes.length > 0) {
+      let node = lastIntersectingMeshes[lastPickNdx].mesh.node;
+      lastPickNdx = ++lastPickNdx % lastIntersectingMeshes.length;
       if (!settings.showMeshNodes) {
         while (node.name.includes('mesh')) {
           node = node.parent;
         }
       }
       setCurrentSceneGraphNode(node);
     } else {
       setCurrentSceneGraphNode(undefined);
     }
```

Ahora, si haces clic en un cajón, seleccionarás el cajón. Si haces clic de nuevo sin mover el puntero, seleccionarás el armario que está detrás del cajón.

{{{example url="../webgpu-picking-cpu-step-03.html"}}}

Una optimización común que podemos hacer es comprobar si el rayo interseca el AABB de los datos de vértices. Si no lo interseca, no hay razón para comprobar todos los triángulos.

Añadimos un AABB en [el artículo anterior](webgpu-camera-controls.html#a-frame-selected) para implementar "encuadrar selección", así que ya tenemos los datos. Solo tenemos que añadir la comprobación.

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {

    ...
    const intersectingMeshes = [];
    for (const mesh of meshes) {
      // ponemos mat en el espacio del modelo (el espacio de los datos de vértices)
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // la invertimos para que al introducir coordenadas del espacio de recorte se transformen
      // al espacio del modelo.
      mat4.inverse(worldViewProjection, mat);

      // ahora transformamos las coordenadas del espacio de recorte al espacio del modelo
      // para poder compararlas con los vértices del modelo y el AABB
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices, aabb } = mesh.vertices;

+      // comprobamos si el rayo pasa a través del AABB.
+      if (!intersectSegmentAABB(near, far, aabb)) {
+        // si no, saltamos la comprobación de cada triángulo
+        continue;
+      }

      ...
    }

    return intersectingMeshes;
  }
```

Aquí tienes el código para comprobar un rayo contra un AABB.

```js
  // Intersección segmento-AABB tipo "slab" sin saltos (Williams et al.)
  // nota: no optimizado para JS.
  const kEpsilon = 1e-12;
  function intersectSegmentAABB(p0, p1, aabb) {
    const delta = vec3.subtract(p1, p0);

    const invDelta = delta.map(v =>
      1 / (Math.abs(v) > kEpsilon ? v : Math.sign(v) * kEpsilon));

    const t0 = vec3.multiply(vec3.subtract(aabb.min, p0), invDelta);
    const t1 = vec3.multiply(vec3.subtract(aabb.max, p0), invDelta);

    const min = vec3.min(t0, t1);
    const max = vec3.max(t0, t1);

    const tMin = Math.max(0, ...min);
    const tMax = Math.min(1, ...max);

    for (let c = 0; c < 3; ++c) {
      if (Math.abs(delta[c]) <= kEpsilon &&
          (p0[c] < aabb.min[c] || p0[c] > aabb.max[c])) {
        return undefined;
      }
    }

    return tMin > tMax
      ? undefined
      : { tMin, tMax };
  }
```

Necesitamos añadir `vec3.multiply`:

```js
const vec3 = {
  ...

+  multiply(a, b, dst) {
+    dst = dst ?? new Float32Array(3);
+
+    dst[0] = a[0] * b[0];
+    dst[1] = a[1] * b[1];
+    dst[2] = a[2] * b[2];
+
+    return dst;
+  },

  ...
};
```

Debido a que nuestros armarios están hechos de cubos unitarios escalados, nuestra caja envolvente coincide perfectamente con nuestros cubos. Por lo tanto, solo para asegurarnos de que todo funciona, volvamos a añadir nuestra "F" que usamos en otros artículos.

```js
+function computeAABBForVertices(vertexData, stride = 3) {
+  const numVertices = vertexData.length / stride;
+  const min = [...vertexData.slice(0, 3)];
+  const max = [...min];
+
+  for (let i = 1; i < numVertices; ++i) {
+    const offset = i * stride;
+    const p = vertexData.slice(offset, offset + 3);
+    vec3.min(min, p, min);
+    vec3.max(max, p, max);
+  }
+  return { min, max };
+}
+
+function createFVertices() {
   ...

   return {
     vertexData,
     numVertices,
+    aabb: computeAABBForVertices(vertexData, 4),
   };
}
```

Solo necesitamos calcular el AABB de la F.

Ahora vamos a añadirla a la escena justo antes de añadir los armarios.

```js
+  {
+    const fVertices = createVertices(createFVertices(), 'f');
+    const node = addTRSSceneGraphNode('f', root, {
+      translation: [100, 75, 30],
+      rotation: [Math.PI, Math.PI * 0.33, 0],
+      scale: [0.5, 0.5, 0.5],
+    });
+    addMesh(node, fVertices, [1, 1, 1, 1]);
+  }

  const cabinets = addTRSSceneGraphNode('armarios', root);
  // Añadir armarios
  for (let cabinetNdx = 0; cabinetNdx < kNumCabinets; ++cabinetNdx) {
    addCabinet(cabinets, cabinetNdx);
  }
```

No hay nada nuevo que ver realmente. Solo está ligeramente optimizado.

{{{example url="../webgpu-picking-cpu-step-04.html"}}}

El problema del picking basado en CPU es que es potencialmente lento y requiere mucho trabajo para mantenerse al día con cualquier nueva característica de renderizado basada en GPU que añadamos. También requiere que conservemos el acceso a los datos de los vértices para la CPU.

## Picking basado en GPU

También podemos realizar el picking con la GPU. Lo hacemos de la siguiente manera: en lugar de dibujar cada objeto con un color, dibujamos cada objeto con un ID entero. Luego miramos el téxel bajo el puntero. Cualquier ID que veamos es el ID del objeto sobre el que se hizo clic.

<div class="webgpu_center">
  <div data-diagram="id-render" style="width: 1200px; max-width: 80%;"></div>
  <div>arrastra para rotar</div>
</div>

Arriba se muestra un render de un cubo, una esfera y una pirámide. Cada uno tiene su ID renderizado sobre él.

Para ello necesitamos una forma de renderizar los objetos con sus IDs. Tenemos varias opciones:

1. ## Podríamos añadir una segunda salida a nuestro shader

   Nuestro fragment shader está devolviendo actualmente un único color:

   ```wgsl
   @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
      return vsOut.color * uni.color;
   }
   ```

   Podríamos cambiarlo para que devuelva tanto un color como un ID.

   ```wgsl
    struct Uniforms {
      matrix: mat4x4f,
      color: vec4f,
   +   id: u32,
    };

   +struct MyOutput {
   +  @location(0) color: vec4f,
   +  @location(1) id: vec4u,
   +};

   -@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
   -   return vsOut.color * uni.color;
   +@fragment fn fs(vsOut: VSOutput) -> MyOutput {
   +   return MyOutput(
   +     vsOut.color * uni.color,
   +     uni.id,
   +   );
   }
   ```

   Este método tiene la ventaja de que solo necesitamos renderizar una vez para obtener tanto la imagen como los IDs.

2. ## Podríamos renderizar dos veces: una para el color y otra para los IDs

   Voy a elegir este método por ahora por razones que espero queden claras después de este paso. [^render-twice]

   [^render-twice]: Se eligió el Método 2 porque necesitábamos una forma de renderizar selectivamente para el picking a fin de implementar el ciclo por todos los objetos bajo el puntero.

Así que, primero vamos a añadir el ID a nuestros uniforms y crear un fragment shader que devuelva los IDs.

```wgsl
struct Uniforms {
  matrix: mat4x4f,
  color: vec4f,
+  id: u32,
};

struct Vertex {
  @location(0) position: vec4f,
  @location(1) color: vec4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = uni.matrix * vert.position;
  vsOut.color = vert.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color * uni.color;
}

+@fragment fn fsPicking(vsOut: VSOutput) -> @location(0) vec4u {
+  return vec4u(uni.id);
+}
```

Como mencionamos anteriormente, los bindGroups creados a partir de pipelines que usan `layout: 'auto'` no se pueden compartir. Nos gustaría usar los mismos bindGroups con ambos fragment shaders, así que necesitamos crear manualmente un `bindGroupLayout` y un `pipelineLayout`.

```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { minBindingSize: 96 },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });
```

A continuación podemos actualizar nuestra pipeline existente y también crear una nueva para renderizar los IDs.

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes with color',
-    layout: 'auto',
+    layout: pipelineLayout,
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
          ],
        },
      ],
    },
    fragment: {
      module,
+      entryPoint: 'fs',
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

+  const pickPipeline = device.createRenderPipeline({
+    label: '2 attributes with id for picking',
+    layout: pipelineLayout,
+    vertex: {
+      module,
+      buffers: [
+        {
+          arrayStride: (4) * 4, // (3) floats 4 bytes each + one 4 byte color
+          attributes: [
+            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
+            {shaderLocation: 1, offset: 12, format: 'unorm8x4'},  // color
+          ],
+        },
+      ],
+    },
+    fragment: {
+      module,
+      entryPoint: 'fsPicking',
+      targets: [{ format: 'r32uint' }],
+    },
+    primitive: {
+      cullMode: 'back',
+    },
+    depthStencil: {
+      depthWriteEnabled: true,
+      depthCompare: 'less',
+      format: 'depth24plus',
+    },
+  });
```

Necesitamos actualizar nuestros buffers de uniforms por objeto para que tengan espacio para el ID y una forma de establecerlo.

```js
  const objectInfos = [];
  function createObjectInfo() {
-    // matrix and color
-    const uniformBufferSize = (16 + 4) * 4;
+    // matrix, color, id, padding
+    const uniformBufferSize = (16 + 4 + 1 + 3) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);
+    const asU32 = new Uint32Array(uniformValues.buffer);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;
    const kColorOffset = 16;
+    const kIdOffset = 20;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
+    const idValue = asU32.subarray(kIdOffset, kIdOffset + 1);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: uniformBuffer },
      ],
    });

    return {
      uniformBuffer,
      uniformValues,
      colorValue,
      matrixValue,
+      idValue,
      bindGroup,
    };
  }
```

y necesitamos actualizar el código de renderizado para incluir el ID:

```js
  let depthTexture;
  let postTexture;
  let objectNdx = 0;

  function drawObject(ctx, vertices, matrix, color) {
    const { pass, viewProjectionMatrix } = ctx;
    const { vertexBuffer, numVertices } = vertices;
    if (objectNdx === objectInfos.length) {
      objectInfos.push(createObjectInfo());
    }
    const {
      matrixValue,
      colorValue,
+      idValue,
      uniformBuffer,
      uniformValues,
      bindGroup,
    } = objectInfos[objectNdx++];

    mat4.multiply(viewProjectionMatrix, matrix, matrixValue);
    colorValue.set(color);
+    idValue[0] = objectNdx;

    // subimos los valores de uniforms al buffer de uniforms
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices);
  }
```

Necesitamos que sea posible renderizar dos veces, así que vamos a refactorizar `render` en `renderToTexture`. Le pasaremos un `GPUCommandEncoder`, una textura `target` sobre la que renderizar, una `pipeline` (para que podamos pasar la pipeline de dibujo o la de renderizado de IDs) y la `viewProjectionMatrix`.

```js
+  function renderToTexture(
+      encoder, target, pipeline, viewProjectionMatrix) {
    objectNdx = 0;

-    // Get the current texture from the canvas context and
-    // set it as the texture to render to.
-    const canvasTexture = context.getCurrentTexture();
-    renderPassDescriptor.colorAttachments[0].view = canvasTexture;
+    renderPassDescriptor.colorAttachments[0].view = target;

    depthTexture = makeNewTextureIfSizeDifferent(
      depthTexture,
-      canvasTexture, // for size
+      target,  // for size
      'depth24plus',
      GPUTextureUsage.RENDER_ATTACHMENT,
    );
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;

-    root.updateWorldMatrix();
-    const viewProjectionMatrix = getViewProjectionMatrix(orbitCamera, canvas);
-
-    const encoder = device.createCommandEncoder();
    {
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);

      const ctx = { pass, viewProjectionMatrix };
      for (const mesh of meshes) {
        drawMesh(ctx, mesh);
      }

      pass.end();
    }
  }

+  function render() {
+    root.updateWorldMatrix();
+    const viewProjectionMatrix = getViewProjectionMatrix(orbitCamera, canvas);
+
+    const encoder = device.createCommandEncoder();
+
+    // Get the current texture from the canvas context and
+    // pass it as the texture to render to.
+    const canvasTexture = context.getCurrentTexture();
+    renderToTexture(
+      encoder,
+      canvasTexture,
+      pipeline,
+      viewProjectionMatrix,
+      meshes);

      ...
}
```

Ahora, para renderizar la textura de picking, vamos a crear una función `pick`.

```js
  const pickBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  let pickTexture;
  async function pick(clipX, clipY, viewProjectionMatrix) {
    const x = Math.floor((clipX *  0.5 + 0.5) * canvas.width);
    const y = Math.floor((clipY * -0.5 + 0.5) * canvas.height);
    const encoder = device.createCommandEncoder();
    pickTexture = makeNewTextureIfSizeDifferent(
      pickTexture,
      canvas,  // para el tamaño
      'r32uint',
      GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    );

    renderToTexture(
      encoder,
      pickTexture,
      pickPipeline,
      viewProjectionMatrix,
    );

    // Copiamos el téxel bajo el puntero a pickBuffer
    encoder.copyTextureToBuffer(
      { texture: pickTexture, origin: [x, y] },
      { buffer: pickBuffer },
      [1, 1]
    );

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // Obtenemos el valor de pickBuffer
    await pickBuffer.mapAsync(GPUMapMode.READ);
    const id = new Uint32Array(pickBuffer.getMappedRange())[0];
    pickBuffer.unmap();
    return id;
  }
```

Es bastante directo. Convertimos `clipX` y `clipY` en la coordenada del téxel bajo el puntero. Luego creamos una textura `r32uint` del mismo tamaño que el canvas. Renderizamos la escena en esta textura usando `renderToTexture`. Después copiamos el único téxel bajo el puntero a `pickBuffer`. Finalmente lo mapeamos y leemos el valor.

Para usarlo, podemos reemplazar nuestro antiguo `pickMeshes` por este:

```js
-  let lastPickX;
-  let lastPickY;
-  let lastPickNdx;
-  let lastIntersectingMeshes;
  async function pickMeshes(e, cam) {
-    if (!lastIntersectingMeshes ||
-        lastPickX !== e.clientX ||
-        lastPickY !== e.clientY) {
-      lastPickNdx = 0;
-      lastPickX = e.clientX;
-      lastPickY = e.clientY;

*    const rect = e.target.getBoundingClientRect();
*    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
*    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

-      const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
-      lastIntersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
-      lastIntersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
-    }
-
-    // Ciclar por los resultados
-    if (lastIntersectingMeshes.length > 0) {
-      let node = lastIntersectingMeshes[lastPickNdx].mesh.node;
-      lastPickNdx = ++lastPickNdx % lastIntersectingMeshes.length;

    const viewProjectionMatrix = getViewProjectionMatrix(cam, canvas);
    const id = await pick(clipX, clipY, viewProjectionMatrix);
    if (id > 0) {
      let node = meshes[id - 1].node;
      if (!settings.showMeshNodes) {
        while (node.name.includes('mesh')) {
          node = node.parent;
        }
      }
      setCurrentSceneGraphNode(node);
    } else {
      setCurrentSceneGraphNode(undefined);
    }
  }
```

Han sido bastantes cambios, pero con esto ya tenemos picking por GPU.

{{{example url="../webgpu-picking-gpu-step-01.html"}}}

Desafortunadamente, hemos perdido la capacidad de ciclar por todos los objetos bajo el puntero. Vamos a solucionarlo. Lo haremos creando un array `pickableMeshes` con todas las mallas que se pueden seleccionar. Cada vez que seleccionemos una malla, la eliminaremos de `pickableMeshes`. Esto significa que la próxima vez que hagamos clic, la malla seleccionada anteriormente no se renderizará y obtendremos el ID que estuviera sobrescribiendo. Si no obtenemos ningún ID, volveremos a poner todas las mallas en `pickableMeshes` e intentaremos una segunda vez.

Primero, hagamos que `renderToTexture` acepte un array de mallas:

```js
  function renderToTexture(
-      encoder, target, pipeline, viewProjectionMatrix) {
+      encoder, target, pipeline, viewProjectionMatrix, meshes) {

      ...

      const ctx = { pass, viewProjectionMatrix };
      for (const mesh of meshes) {
        drawMesh(ctx, mesh);
      }

    ...
  }
```

Y hagamos que el `render` actual pase las mallas:

```js
  function render() {
    ...

    // Get the current texture from the canvas context and
    // pass it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderToTexture(
      encoder,
      canvasTexture,
      pipeline,
      viewProjectionMatrix,
+      meshes,
    );

    ...
```

Y hagamos que `pick` nos permita pasar un array de mallas:

```js
  let pickTexture;
-  async function pick(clipX, clipY, viewProjectionMatrix) {
+  async function pick(clipX, clipY, viewProjectionMatrix, pickableMeshes) {

    ...

    renderToTexture(
      encoder,
      pickTexture,
      pickPipeline,
      viewProjectionMatrix,
+      pickableMeshes,
    );

    ...
  }
```

Luego necesitamos ajustar el código de `pickMeshes` como mencionamos arriba:

```js
+  let lastPickX;
+  let lastPickY;
+  let pickableMeshes;
  async function pickMeshes(e, cam) {
+    // si no tenemos mallas O el puntero se movió
+    if (!pickableMeshes ||
+        lastPickX !== e.clientX ||
+        lastPickY !== e.clientY) {
+      lastPickX = e.clientX;
+      lastPickY = e.clientY;
+
+      // obtenemos todas las mallas.
+      pickableMeshes = meshes.slice();
+    }

    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth * 2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionMatrix = getViewProjectionMatrix(cam, canvas);
    // seleccionamos de entre las mallas disponibles
-    const id = await pick(clipX, clipY, viewProjectionMatrix);
-    if (id > 0) {
+    let id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+    if (id === 0) {
+      // si no encontramos ninguna, intentamos con todas de nuevo
+      pickableMeshes = meshes.slice();
+      id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+      // Si seguimos sin encontrar ninguna, no había nada bajo el puntero
+      if (id === 0) {
+        setCurrentSceneGraphNode(undefined);
+        return;
+      }
+    }

-      let node = meshes[id - 1].node;
+    // eliminamos la malla seleccionada y obtenemos su nodo
+    let node = pickableMeshes.splice(id - 1, 1)[0].node;
    if (!settings.showMeshNodes) {
      while (node.name.includes('mesh')) {
        node = node.parent;
      }
    }
    setCurrentSceneGraphNode(node);
-    } else {
-      setCurrentSceneGraphNode(undefined);
-    }
  }
```

<sup>Esos cambios pueden ser difíciles de ver. Considera hacer clic en "ocultar borrados".</sup>

Con eso, volvemos a ser capaces de ciclar por los objetos bajo el puntero.

{{{example url="../webgpu-picking-gpu-step-02.html"}}}

Algunas ventajas del picking por GPU:

* **Se aplican todos los efectos de vértices de la GPU**

  Un buen ejemplo es el pesado de vértices (skinning). El [skinning](webgpu-skinning.html) a menudo solo se aplica en la GPU. Para realizar el picking en CPU sobre un objeto con skinning, tendrías que reproducir toda la lógica de skinning en la CPU. Del mismo modo, para los [blend targets](webgpu-blend-targets.html) también tendrías que crear una versión de CPU. Incluso en nuestro código actual, en el picking por CPU tuvimos que recorrer los vértices conociendo sus formatos y su zancada (stride). Programamos nuestra solución de forma rígida para nuestro único formato de vértices. No es raro que una aplicación solo tenga un formato, pero si tuviera más de uno, tendríamos que actualizar el código de CPU para soportar cada formato.

* **Se puede tener en cuenta la transparencia si es apropiado**

  Imagina que tienes un plano al que se le aplica una textura de hoja, donde las zonas fuera de la hoja son 100% transparentes para que puedas ver lo que hay detrás. Con el picking por CPU, tal como lo implementamos, todo lo que ve el código de picking son los 2 triángulos que forman el plano de la hoja.

  Con el picking por GPU podríamos comprobar fácilmente el valor alfa de la textura y ejecutar un `discard` al escribir el ID del objeto si está por debajo de cierto umbral. Esto nos permitiría seleccionar cosas que podemos ver a través de las partes transparentes del plano de la hoja, lo cual resultaría más natural.

Un problema comparado con el de CPU que escribimos antes es que solo nos da el objeto más frontal. Para implementar el clic que rota por todos los objetos, si el puntero no se ha movido, simplemente no dibujamos el último objeto seleccionado al realizar el picking. Esto hará que el siguiente objeto más cercano sea el resultado.

## Optimizaciones

Hay 3 optimizaciones relativamente sencillas que podríamos realizar, aunque por el momento las dejaremos como ejercicios para el lector 😛

1. **Establecer el *scissor* al téxel bajo el puntero**

   Podemos llamar a `pass.setScissorRect(x, y, 1, 1)` (donde x e y son las coordenadas del téxel) y esto haría que la GPU renderizara solo ese píxel. Sería más rápido que renderizar millones de píxeles de ID, ya que al final solo vamos a leer un único píxel.

2. **Usar *frustum culling* u otro tipo de descarte de conjuntos potencialmente visibles**

   Si puedes determinar fácilmente si un objeto definitivamente no está frente a la cámara, puedes saltarte el pedirle a la GPU que mire todos los triángulos de ese objeto. Esto no es especial para el picking; el dibujo normal también se beneficia del *frustum culling*. Comprobar si un objeto está dentro del frustum de visión ayuda al siguiente punto, así que valía la pena mencionarlo.

3. **Usar una textura de 1x1 píxeles y una matriz de proyección diferente**

   Es posible crear una matriz de proyección que represente solo el frustum que incluye el píxel bajo el cursor. Si hiciéramos eso, podríamos usar simplemente una textura de 1x1 píxeles para el picking. Esto tiene 2 beneficios: primero, solo necesitamos una textura de 1x1 píxeles, que es mucha menos memoria que una del tamaño del canvas. Segundo, la misma comprobación de *frustum culling* mencionada arriba tendrá un frustum mucho más pequeño y, por lo tanto, rechazará aún más objetos.


<!-- keep this at the bottom of the article -->
<link href="webgpu-picking.css" rel="stylesheet">
<script type="module" src="webgpu-picking.js"></script>
