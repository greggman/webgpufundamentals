Title: WebGPU Picking
Description: Clicking on Objects 
TOC: Picking

This article is the 3nd in a short series about making parts for a 3D editor.
Each one builds on the previous lesson so you may find them easiest to
understand by reading them in order.

{{{toc-steps list="editor.hanson"}}}

Picking is the act of selecting objects by clicking on the screen
and then figuring out which objects were clicked on.

## CPU Based Picking

In our series on 3D math we learned how to use matrices to
project 3D vertex positions into clip space positions. For picking
we can do the reverse. We can take where the user clicked on the
screen, convert that to clip space positions, then using the inverse
of the matrix that converted vertex positions to clip space, we can
convert clip space positions to vertex space.

Once they are in the same space it's relatively easy to check
if the ray from the front of the current frustum to the back of
the current frustum, intersects any objects.

Let's work down. First we need to decide when the pick. Because
we also use the pointer to move the camera, let's pick on
pointerup, if the user hasn't moved the pointer.

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

With that we're calling `pickMeshes` if the user hasn't moved
the pointer. We need to supply that function, but before that
we're going to need a view projection matrix so let's pull out
the current view project matrix code.

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
+    // combine the view and projection matrixes
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
-    // make a view matrix from the camera's
-    const viewMatrix = mat4.inverse(orbitCamera.getCameraMatrix());
-
-    // combine the view and projection matrixes
-    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
+    const viewProjectionMatrix = getViewProjectionMatrix(orbitCamera, canvas);
```

Now we can use that to start making `pickMeshes`

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

`pickMeshes` computes a clip space X and Y, a view projection matrix,
and passes them to `getIntersectionMeshes` expecting an array of
meshes.

Let's make `getIntersectingMeshes`

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {
    const clipNear = [clipX, clipY, 0];
    const clipFar = [clipX, clipY, 1];

    // make some temp math variables
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
      // put mat in model space (the space of the vertex data)
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // invert it so putting in clip space coords will transform them
      // to model space.
      mat4.inverse(worldViewProjection, mat);

      // now transform the clip space coords to model space
      // so we can compare them to the model vertices and AABB
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices } = mesh.vertices;

      const numTriangles = numVertices / 3;
      let closest;
      for (let t = 0; t < numTriangles; ++t) {
        // get the 3 positions for the triangle
        verts.forEach((v, i) => {
          const offset = (t * 3 + i) * 4;
          v[0] = vertexData[offset + 0];
          v[1] = vertexData[offset + 1];
          v[2] = vertexData[offset + 2];
        });

        const result = intersectLineSegmentAndTriangle(near, far, ...verts);
        if (result) {
          // Convert back to clip space so we can check Z to keep
          // the closest hit.
          vec3.transformMat4(result, worldViewProjection, result);
          if (closest = == undefined || result[2] < closest[2]) {
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

I hope this code is relatively straight forward. It creates `clipNear`
and `clipFar`. These are easy as they're just the `clipX` and `clipY`
that were passed in with `clipNear` z set to 0 and `clipFar` set to 1.

Then, for each mesh we get its `worldMatrix` and multiply with our
camera's view projection. We then take the inverse. This lets us
convert `clipNear` and `clipFar` to the same positions but in the
same space as the vertex data. We call the results `near` and `far`.

We then walk the triangles of the vertex data and for each one
call `intersectLineSegmentAndTriangle` which will return undefined
if the `near` `far` line segment does not intersect, or, it returns
where the intersection happened if it did.

We convert back to clip space so the positions are oriented back
relative to the viewer. This lets us keep the closest point relative
to the camera.

If we found any one of the triangles interested then we push that
mesh onto our results.

With that in place we can go back and finish `pickMeshes`

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // sort the results by their z
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // pick the first one
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

We still have a few more things we need to do. We need to
supply `intersectLineSegmentAndTriangle`. This is called
[The Möller–Trumbore ray-triangle intersection algorithm](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm).

```js
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  function intersectLineSegmentAndTriangle(p0, p1, v0, v1, v2) {
    const edge1 = vec3.subtract(v1, v0);
    const edge2 = vec3.subtract(v2, v0);
    const dir = vec3.subtract(p1, p0); // Line segment direction

    const h = vec3.cross(dir, edge2);
    const a = vec3.dot(edge1, h);

    // If 'a' is near zero, the line is parallel
    // to the triangle's plane
    if (Math.abs(a) < 0.00001) {
      return undefined;
    }

    const f = 1 / a;
    const s = vec3.subtract(p0, v0);
    const u = f * vec3.dot(s, h);

    // Check if the intersection point is outside
    // the triangle's U parameter range [0, 1]
    if (u < 0.0 || u > 1.0) {
      return undefined;
    }

    const q = vec3.cross(s, edge1);
    const v = f * vec3.dot(dir, q);

    // Check if the intersection point is outside
    // the triangle's V parameter range [0, 1] or S+T range [0, 1]
    if (v < 0.0 || u + v > 1.0) {
      return undefined;
    }

    // At this stage, the intersection point lies on
    // the infinite line and within the triangle
    const t = f * vec3.dot(edge2, q);

    // Check if the intersection point lies within
    // the line segment's T parameter range [0, 1]
    if (t < 0.0 || t > 1.0) {
      return undefined;
    }

    // Return the intersection point
    return vec3.addScaled(p0, dir, t);
  }
```

That calls `vec3.dot` so we need to supply it.

```js
const vec3 = {
  ...

+  dot(a, b) {
+    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
+  },

}
```

We've used `dot` in [the articles on lighting](webgpu-lighting-directional.html) among other places. It multiplies corresponding components
of 2 vec3s and adds the results.

We also need to keep around the vertex data.

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

And with that we can pick!

{{{example url="../webgpu-picking-cpu-step-01.html"}}}

It would be nice if we click no where we unselect
whatever is currently selected. Let's do that

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // sort the results by their z
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // pick the first one
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

  // Presents a TRS to the UI. Letting set which TRS
  // is being edited.
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
+    trsFolder.name(`orientation: ${node?.name ?? '--none--'}`);
    trsFolder.updateDisplay();

    showTRS();

    // Mark which node is selected.
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

A problem we have right now is we can only select the closest object.
A good thing about our code is we get a list of all objects that are under
the user's pointer. It's common in an editor that on the first click
the closest object is picked. On a 2nd click, if the pointer has not moved,
then the next object is picked. This repeats until we've cycled through all
the objects under the pointer. Let's do that.

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
-    // sort the results by their z
-    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
-
-    // pick the first one
-    if (intersectingMeshes.length > 0) {
-      let node = intersectingMeshes[0].mesh.node;
+      lastIntersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
+      lastIntersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
+    }
+
+    // Cycle through the results
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

Now if you click a drawer you'll select the drawer. If you click again
without moving the pointer, you'll select the cabinet behind the drawer

{{{example url="../webgpu-picking-cpu-step-03.html"}}}

A common optimization we can make is to check if the ray intersects
the AABB of the vertex data. If it does not intersect then there's
no reason to check all of the triangles.

We added an AABB in
[the previous article](webgpu-camera-controls.html#a-frame-selected) in
order to implement "frame selected" so we have the data. All we need
to do is add the check.

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {

    ...
    const intersectingMeshes = [];
    for (const mesh of meshes) {
      // put mat in model space (the space of the vertex data)
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // invert it so putting in clip space coords will transform them
      // to model space.
      mat4.inverse(worldViewProjection, mat);

      // now transform the clip space coords to model space
      // so we can compare them to the model vertices and AABB
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices, aabb } = mesh.vertices;

+      // check if the ray passes through the AABB.
+      if (!intersectSegmentAABB(near, far, aabb)) {
+        // no so skip checking every triangle
+        continue;
+      }

      ...
    }

    return intersectingMeshes;
  }
```

Here's the code for checking the a ray with an AABB.

```js
  // Branchless slab ray/segment–AABB intersection (Williams et al.)
  // note: unoptimized for JS.
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

We need to add `vec3.multiply`

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

Because our cabinets are made from scaled unit cubes, our bounding
box perfect matches our cubes. So, just to make sure it's all working
let's add our F back in that we used in other articles.

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

We just needed to compute the F's AABB

Now let's add it to the scene just before we add the cabinets.

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

  const cabinets = addTRSSceneGraphNode('cabinets', root);
  // Add cabinets
  for (let cabinetNdx = 0; cabinetNdx < kNumCabinets; ++cabinetNdx) {
    addCabinet(cabinets, cabinetNdx);
  }
```

There's not really anything to see. It's just slightly optimized.

{{{example url="../webgpu-picking-cpu-step-04.html"}}}

The problem with CPU based picking is it's potentially slow and it's a bunch
of work to make it keep up with any new GPU based rendering features we add.
It also requires we keep access to the vertex data for the CPU.

## <a id="a-gpu-picking"></a> GPU Picking

We can also pick with the GPU. We do it by, instead of drawing each object
with a color, we draw each object with an integer ID. We then look at the texel under
the pointer. Whatever ID we see is the ID of the object that was clicked on.

<div class="webgpu_center">
  <div data-diagram="id-render" style="width: 1200px; max-width: 80%;"></div>
  <div>drag to rotate</div>
</div>

Above is a render of a cube, a sphere, an a pyramid. Each has its id rendered over it.

To do that we need a way to render the objects with ids. We have a few options. 

1. ## We could add a 2nd output to our shader

   Our fragment shader is currently returning a single color

   ```wgsl
   @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
      return vsOut.color * uni.color;
   }
   ```

   We could change it to return both a color and an id.

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

   This method has the advantage that we only need to render once and we get
   both the image and ids.

2. ## We could render twice, once for color, once for ids

   I'm going to choose this method for now for reasons that will hopefully become clear after this step. [^render-twice]

   [^render-twice]: Method 2 was chosen because we needed a way to selectively render for picking in order to implement cycling
   through all objects under the pointer.

So, first let's add the id to our uniforms and create a fragment shader
that outputs ids.

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

As we mentioned early on, bindGroups made from pipelines that use `layout: 'auto'`
can not be shared. We'd like to use the same bindGroups with both
fragment shaders so we need to manually create a bindGroupLayout and
pipelineLayout.

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

We can then update our existing pipeline and also create a new one for rendering
the ids.

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes with color',
+    layout: 'auto',
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

We need to update our per object uniform buffers so they have
room for the id and a way to set them.

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

and we need to update the rendering code to include the id

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

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices);
  }
```

We need to make it possible to render twice so let's
refactor `render` into `renderToTexture`.
We'll pass it a `GPUCommandEncoder`, a `target` texture
to render to, a `pipeline` so we can pass on the drawing
pipeline or the id rendering pipeline, and the `viewProjectionMatrix`. 

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

Now in order to render the pick texture let's make a `pick`
function.

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
      canvas,  // for size
      'r32uint',
      GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    );

    renderToTexture(
      encoder,
      pickTexture,
      pickPipeline,
      viewProjectionMatrix,
    );

    // Copy the texel under the pointer to pickBuffer
    encoder.copyTextureToBuffer(
      { texture: pickTexture, origin: [x, y] },
      { buffer: pickBuffer },
      [1, 1]
    );

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // Get the value from the pickBuffer
    await pickBuffer.mapAsync(GPUMapMode.READ);
    const id = new Uint32Array(pickBuffer.getMappedRange())[0];
    pickBuffer.unmap();
    return id;
  }
```

It's pretty straight forward. We convert `clipX` and `clipY`
into the texel coordinate under the pointer. We then create
a an `r32uint` texture the same size as the canvas. We render
the scene to this texture using `renderToTexture`. We then
copy the single texel under the pointer to `pickBuffer`.
Then map it and read the value.

To use it we can replace our old `pickMeshes` with this

```js
-  let lastPickX;
-  let lastPickY;
-  let lastPickNdx;
-  let lastIntersectingMeshes;
  function pickMeshes(e, cam) {
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
-    // Cycle through the results
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

That was quite a few changes but with that we have GPU picking.

{{{example url="../webgpu-picking-gpu-step-01.html"}}}

Unfortunately we lost the ability to cycle though all the
objects under the pointer. Let's fix that. We'll do it
by making a `pickableMeshes` array that is all of the
meshes it's possible to pick. Each time we pick a mesh
we'll remove that mesh from `pickableMeshes`. That means
the next time we click the previously picked mesh won't
be rendered and so we'll get whatever id it was overwriting.
If we don't get any id we'll put all of the meshes back in
`pickableMeshes` and try a 2nd time.

First let's make `renderToTexture` take an array of meshes

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

And let's make the existing `render` pass the meshes

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

And let's make `pick` let us pass an array of meshes

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

Then we need the adjust the `pickMeshes` code like
we mentioned above.

```js
+  let lastPickX;
+  let lastPickY;
+  let pickableMeshes;
  async function pickMeshes(e, cam) {
+    // if we have no meshes OR the pointer moved
+    if (!pickableMeshes ||
+        lastPickX !== e.clientX ||
+        lastPickY !== e.clientY) {
+      lastPickX = e.clientX;
+      lastPickY = e.clientY;
+
+      // get all the meshes.
+      pickableMeshes = meshes.slice();
+    }

    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth * 2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionMatrix = getViewProjectionMatrix(cam, canvas);
    // pick from the available meshes
-    const id = await pick(clipX, clipY, viewProjectionMatrix);
-    if (id > 0) {
+    let id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+    if (id === 0) {
+      // if we didn't find one, try all of them again
+      pickableMeshes = meshes.slice();
+      id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+      // If we still didn't find one there was nothing under the pointer
+      if (id === 0) {
+        setCurrentSceneGraphNode(undefined);
+        return;
+      }
+    }

-      let node = meshes[id - 1].node;
+    // remove the picked mesh and get its node
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

<sup>Those changes might be hard to see. Consider clicking "hide deleted".</sup>

With that, we're back to being able to click cycle through
the objects under the pointer.

{{{example url="../webgpu-picking-gpu-step-02.html"}}}

Some advantages to GPU picking:

* All GPU vertex effects are applied

  A good example is skinning. [Skinning](webgpu-skinning.html) is often only
  applied on the GPU. To do CPU picking on a skinned object you need to
  reproduce all of the skinning logic on the CPU. Similarly for
  [blend targets](webgpu-blend-targets.html) you would need to make a CPU
  version of that as well. Even in our current code, in the CPU picking we had 
  to walk the vertices knowing what their formats and stride were. We hard
  coded our solution to our one vertex format. It's not uncommon for an app to only
  have one vertex format. But, if it had more than one, we'd need to update the CPU
  code to support each format.

* Transparency can be taken into account if appropriate

  Imagine you have a plane and to that plane is applied a leaf texture
  where areas outside of the leaf are 100% transparent so you can see
  things behind. With CPU picking, as we implemented it, all the picking
  code sees is the 2 triangles making the leaf plane.

  With GPU picking we could easy check the alpha value for the texture
  and `discard` writing the object id if it's below some threshold. 
  This would let us pick things we can see through transparent parts of
  the leaf plane which would feel more natural.

An issue compared to the CPU one we wrote above is that it only gives
us the front most object. To implement clicking to rotate through all objects,
if the pointer hasn't moved, then don't draw the last selected object when
doing the picking. This will make the next closest object be the result.

## Optimizations

There are 3 relatively simple optimizations we could make
though at the moment these will be left as exercises for
the reader 😛

1. Set the scissor to the texel under the pointer

   We can call `pass.setScissorRect(clipX, clipY, 1 1)`
   and this would make the GPU render only to that 1 pixel.
   That would be faster than rendering a millions of id
   pixels since in the end we're only reading a single pixel
   anyway.

2. Use frustum culling or other "potential visible set" culling

   If you can easily determine if an object is definitely not in front of the
   camera then you can skip asking the GPU to look at all of that object's triangles.

   This isn't special to picking,
   drawing benefits from frustum culling as well.
   Checking if an object is inside the view frustum,
   helps the next item so it was worth mentioning.

3. Use a 1x1 pixel texture and a different projection matrix.

   It's possible to make a projection matrix that represents just the frustum
   that includes the pixel under the cursor. If we did that we could just use a
   1x1 pixel texture for picking. This has 2 benefits. First, we only need a 1x1
   pixel texture which is a lot less memory than a canvas sized texture. Second,
   the same frustum culling check mentioned above will have much smaller frustum
   and so reject even more objects.


<!-- keep this at the bottom of the article -->
<link href="webgpu-picking.css" rel="stylesheet">
<script type="module" src="webgpu-picking.js"></script>
