Title: WebGPU 拾取
Description: 点击对象
TOC: 拾取

本文是关于制作 3D 编辑器组件的短系列文章的第三篇。每个章节都建立在前一篇的基础上，因此你可能会发现按顺序阅读更容易理解。

1. [高亮显示](webgpu-highlighting.html)
2. [相机控制](webgpu-camera-controls.html)
3. [拾取](webgpu-picking.html) ⬅ 你在这里

拾取是指通过点击屏幕来选择对象，然后找出被点击的是哪些对象。

## 基于 CPU 的拾取

在我们关于 3D 数学的系列文章中，我们学习了如何使用矩阵将 3D 顶点位置投影到裁剪空间位置。对于拾取，我们可以做相反的事情。我们可以获取用户在屏幕上点击的位置，将其转换为裁剪空间位置，然后使用将顶点位置转换为裁剪空间位置的矩阵的逆矩阵，将裁剪空间位置转换回顶点空间。

一旦它们处于同一空间，检查从当前视锥体前部到后部的射线是否与任何对象相交就相对容易了。

让我们逐步来。首先我们需要决定何时拾取。因为我们也使用指针来移动相机，让我们在 `pointerup` 时进行拾取——前提是用户没有移动指针。

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

这样，如果用户没有移动指针，我们就会调用 `pickMeshes`。我们需要提供这个函数，但在此之前，我们需要一个视图投影矩阵，所以让我们先提取出当前的视图投影矩阵代码。

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
+    // 合并视图矩阵和投影矩阵
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

现在我们可以使用它来开始创建 `pickMeshes`：

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

`pickMeshes` 计算裁剪空间的 X 和 Y、一个视图投影矩阵，并将它们传递给 `getIntersectionMeshes`，期望返回一个网格数组。

让我们创建 `getIntersectingMeshes`：

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {
    const clipNear = [clipX, clipY, 0];
    const clipFar = [clipX, clipY, 1];

    // 创建一些临时数学变量
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
      // 将 mat 放到模型空间（顶点数据的空间）
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // 取逆，这样将裁剪空间坐标放入会将它们转换到模型空间
      mat4.inverse(worldViewProjection, mat);

      // 现在将裁剪空间坐标转换到模型空间
      // 这样我们就可以将它们与模型顶点和 AABB 进行比较
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices } = mesh.vertices;

      const numTriangles = numVertices / 3;
      let closest;
      for (let t = 0; t < numTriangles; ++t) {
        // 获取三角形的 3 个位置
        verts.forEach((v, i) => {
          const offset = (t * 3 + i) * 4;
          v[0] = vertexData[offset + 0];
          v[1] = vertexData[offset + 1];
          v[2] = vertexData[offset + 2];
        });

        const result = intersectLineSegmentAndTriangle(near, far, ...verts);
        if (result) {
          // 转换回裁剪空间，这样我们可以检查 Z 来保留最近的命中点
          vec3.transformMat4(result, worldViewProjection, result);
          if (closest == undefined || result[2] < closest[2]) {
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

我希望这段代码相对直接。它创建 `clipNear` 和 `clipFar`。这些很容易得到，因为它们只是传入的 `clipX` 和 `clipY`，`clipNear` 的 z 设置为 0，`clipFar` 设置为 1。

然后，对于每个网格，我们获取它的 `worldMatrix` 并与相机的视图投影相乘。然后取逆。这允许我们将 `clipNear` 和 `clipFar` 转换到与顶点数据相同的空间中。我们将结果称为 `near` 和 `far`。

然后我们遍历顶点数据的三角形，对每个三角形调用 `intersectLineSegmentAndTriangle`，如果没有相交则返回 undefined，如果有则返回相交发生的位置。

我们转换回裁剪空间，这样位置就相对于观察者重新定位了。这让我们可以保留相对于相机最近的点。

如果我们发现任何一个三角形相交，我们就将该网格 push 到结果中。

有了这些，我们可以回去完成 `pickMeshes`：

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // 按 Z 对结果排序
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // 选择第一个
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

我们还有一些事情要做。我们需要提供 `intersectLineSegmentAndTriangle`。这被称为 [Möller–Trumbore 射线-三角形相交算法](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm)。

```js
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  function intersectLineSegmentAndTriangle(p0, p1, v0, v1, v2) {
    const edge1 = vec3.subtract(v1, v0);
    const edge2 = vec3.subtract(v2, v0);
    const dir = vec3.subtract(p1, p0); // 线段方向

    const h = vec3.cross(dir, edge2);
    const a = vec3.dot(edge1, h);

    // 如果 'a' 接近零，则线段平行于三角形的平面
    if (Math.abs(a) < 0.00001) {
      return undefined;
    }

    const f = 1 / a;
    const s = vec3.subtract(p0, v0);
    const u = f * vec3.dot(s, h);

    // 检查交点是否在三角形 U 参数范围 [0, 1] 之外
    if (u < 0.0 || u > 1.0) {
      return undefined;
    }

    const q = vec3.cross(s, edge1);
    const v = f * vec3.dot(dir, q);

    // 检查交点是否在三角形 V 参数范围 [0, 1] 或 S+T 范围 [0, 1] 之外
    if (v < 0.0 || u + v > 1.0) {
      return undefined;
    }

    // 在这个阶段，交点位于无限线上且在三角形内部
    const t = f * vec3.dot(edge2, q);

    // 检查交点是否在线段 T 参数范围 [0, 1] 之内
    if (t < 0.0 || t > 1.0) {
      return undefined;
    }

    // 返回交点
    return vec3.addScaled(p0, dir, t);
  }
```

这调用了 `vec3.dot`，所以我们需要提供它：

```js
const vec3 = {
  ...

+  dot(a, b) {
+    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
+  },

}
```

我们在[光照相关文章](webgpu-lighting-directional.html)等多处使用过 `dot`。它将 2 个 vec3 的对应分量相乘并相加。

我们还需要保留顶点数据：

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

这样我们就可以拾取了！

{{{example url="../webgpu-picking-cpu-step-01.html"}}}

如果我们点击空白处能取消选择当前选中的对象就好了。让我们来做这个：

```js
  function pickMeshes(e, cam) {
    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
    const intersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);

    // 按 Z 对结果排序
    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);

    // 选择第一个
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

  // 向 UI 呈现 TRS。允许设置正在编辑的 TRS
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

    // 标记选中的节点
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

我们现在面临一个问题：我们只能选择最近的对象。我们的代码有一个优点是我们获得了用户指针下所有对象的列表。在编辑器中，通常第一次点击会选择最近的对象。第二次点击，如果指针没有移动，则选择下一个对象。这样重复直到我们循环遍历指针下的所有对象。让我们来做这个。

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
-    // 按 Z 对结果排序
-    intersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
-
-    // 选择第一个
-    if (intersectingMeshes.length > 0) {
-      let node = intersectingMeshes[0].mesh.node;
+      lastIntersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
+      lastIntersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
+    }
+
+    // 循环遍历结果
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

现在如果你点击一个抽屉，你会选择这个抽屉。如果你再次点击而没有移动指针，你会选择抽屉后面的柜子。

{{{example url="../webgpu-picking-cpu-step-03.html"}}}

我们可以做的一个常见优化是检查射线是否与顶点数据的 AABB 相交。如果没有相交，就没有理由检查所有三角形。

我们在[上一篇文章](webgpu-camera-controls.html#a-frame-selected)中为了实现"帧选中"添加了 AABB，所以我们有这些数据。我们只需要添加这个检查。

```js
  function getIntersectingMeshes(clipX, clipY, viewProjection) {

    ...
    const intersectingMeshes = [];
    for (const mesh of meshes) {
      // 将 mat 放到模型空间（顶点数据的空间）
      mat4.multiply(viewProjection, mesh.node.worldMatrix, worldViewProjection);

      // 取逆，这样将裁剪空间坐标放入会将它们转换到模型空间
      mat4.inverse(worldViewProjection, mat);

      // 现在将裁剪空间坐标转换到模型空间
      // 这样我们就可以将它们与模型顶点和 AABB 进行比较
      vec3.transformMat4(clipNear, mat, near);
      vec3.transformMat4(clipFar, mat, far);

      const { vertexData, numVertices, aabb } = mesh.vertices;

+      // 检查射线是否穿过 AABB
+      if (!intersectSegmentAABB(near, far, aabb)) {
+        // 没有相交，所以跳过检查每个三角形
+        continue;
+      }

      ...
    }

    return intersectingMeshes;
  }
```

这是检查射线与 AABB 相交的代码：

```js
  // 无分支的射线/线段–AABB 相交（Williams et al.）
  // 注意：为 JS 进行了优化
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

我们需要添加 `vec3.multiply`：

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

因为我们的柜子是由缩放的单位立方体构成的，所以我们的包围盒完美地匹配了我们的立方体。所以，为了确保一切正常工作，让我们把 F 加回去，这个 F 在其他文章中用过。

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

我们只需要计算 F 的 AABB。

现在让我们在添加柜子之前把它添加到场景中：

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
  // 添加柜子
  for (let cabinetNdx = 0; cabinetNdx < kNumCabinets; ++cabinetNdx) {
    addCabinet(cabinets, cabinetNdx);
  }
```

其实没什么可见的，只是稍微优化了一下。

{{{example url="../webgpu-picking-cpu-step-04.html"}}}

基于 CPU 的拾取的问题是它可能很慢，而且如果要跟上我们添加的任何新的基于 GPU 的渲染特性，需要做大量工作。它还要求我们在 CPU 上保留对顶点数据的访问。

## <a id="a-gpu-picking"></a> 基于 GPU 的拾取

我们也可以用 GPU 来拾取。方法是：不是用颜色绘制每个对象，而是用整数 ID 来绘制每个对象。然后我们查看指针下的那个纹理像素。我们看到的任何 ID 就是被点击的对象的 ID。

<div class="webgpu_center">
  <div data-diagram="id-render" style="width: 1200px; max-width: 80%;"></div>
  <div>拖动以旋转</div>
</div>

上面是一个立方体、一个球体和一个金字塔的渲染。每个对象上都渲染了它的 ID。

要实现这个功能，我们需要一种用 ID 渲染对象的方法。我们有几个选项。

1. ## 我们可以给着色器添加第二个输出

   我们的片段着色器目前返回一个单一的颜色：

   ```wgsl
   @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
      return vsOut.color * uni.color;
   }
   ```

   我们可以将其更改为同时返回颜色和 ID：

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

   这种方法的优点是我们只需要渲染一次，就可以同时获得图像和 ID。

2. ## 我们可以渲染两次，一次渲染颜色，一次渲染 ID

   我现在选择这种方法，原因希望在看完这一步后会变得清晰。[^render-twice]

   [^render-twice]: 选择方法 2 是因为我们需要一种方法来选择性渲染拾取，以便实现循环遍历指针下的所有对象。

所以，首先让我们在 uniform 中添加 ID 并创建一个输出 ID 的片段着色器：

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

正如我们之前提到的，使用 `layout: 'auto'` 从管道创建的 bindGroup 不能共享。我们希望使用相同的 bindGroup 来处理两个片段着色器，所以我们需要手动创建 bindGroupLayout 和 pipelineLayout。

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

然后我们可以更新现有的管道，并创建一个用于渲染 ID 的新管道：

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes with color',
+    layout: 'auto',
+    layout: pipelineLayout,
    vertex: {
      module,
      buffers: [
        {
          arrayStride: (4) * 4, // (3) 个浮点数每个 4 字节 + 一个 4 字节的颜色
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
+          arrayStride: (4) * 4, // (3) 个浮点数每个 4 字节 + 一个 4 字节的颜色
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

我们需要更新每个对象的 uniform 缓冲区，以便它们有空间存储 ID 并提供一种设置它们的方法：

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

    // 各个 uniform 值在 float32 索引中的偏移量
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

然后我们需要更新渲染代码以包含 ID：

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

    // 上传 uniform 值到 uniform 缓冲区
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices);
  }
```

我们需要使渲染两次成为可能，所以让我们将 `render` 重构为 `renderToTexture`。
我们将传递一个 `GPUCommandEncoder`、一个渲染目标的 `target` 纹理、一个 `pipeline` 以便我们可以传递绘制管道或 ID 渲染管道，以及 `viewProjectionMatrix`。

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
-    {
-      const pass = encoder.beginRenderPass(renderPassDescriptor);
-      pass.setPipeline(pipeline);
-
-      const ctx = { pass, viewProjectionMatrix };
-      for (const mesh of meshes) {
-        drawMesh(ctx, mesh);
-      }
-
-      pass.end();
-    }
  }

+  function render() {
+    root.updateWorldMatrix();
+    const viewProjectionMatrix = getViewProjectionMatrix(orbitCamera, canvas);
+
+    const encoder = device.createCommandEncoder();
+
+    // 从画布上下文获取当前纹理并将其作为渲染目标传递
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

现在为了渲染拾取纹理，让我们创建一个 `pick` 函数：

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

    // 将指针下的纹理像素复制到 pickBuffer
    encoder.copyTextureToBuffer(
      { texture: pickTexture, origin: [x, y] },
      { buffer: pickBuffer },
      [1, 1]
    );

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // 从 pickBuffer 获取值
    await pickBuffer.mapAsync(GPUMapMode.READ);
    const id = new Uint32Array(pickBuffer.getMappedRange())[0];
    pickBuffer.unmap();
    return id;
  }
```

这相当直接。我们将 `clipX` 和 `clipY` 转换为指针下的纹理像素坐标。然后我们创建一个与画布大小相同的 `r32uint` 纹理。我们使用 `renderToTexture` 将场景渲染到这个纹理。然后我们将指针下的单个纹理像素复制到 `pickBuffer`。然后映射它并读取值。

要使用它，我们可以用这个替换旧的 `pickMeshes`：

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
*
*    const rect = e.target.getBoundingClientRect();
*    const clipX = (e.clientX - rect.left) / e.target.clientWidth  *  2 - 1;
*    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;
*
-      const viewProjectionValue = getViewProjectionMatrix(cam, canvas);
-      lastIntersectingMeshes = getIntersectingMeshes(clipX, clipY, viewProjectionValue);
-      lastIntersectingMeshes.sort((a, b) => a.position[2] - b.position[2]);
-    }
-
-    // 循环遍历结果
-    if (lastIntersectingMeshes.length > 0) {
-      let node = lastIntersectingMeshes[lastPickNdx].mesh.node;
-      lastPickNdx = ++lastPickNdx % lastIntersectingMeshes.length;
-
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

这是相当多的改动，但这样我们就有了 GPU 拾取。

{{{example url="../webgpu-picking-gpu-step-01.html"}}}

不幸的是，我们失去了循环遍历指针下所有对象的能力。让我们修复它。我们将创建一个 `pickableMeshes` 数组，其中包含所有可能被拾取的网格。每次我们拾取一个网格时，我们会从 `pickableMeshes` 中移除该网格。这意味着下一次我们点击之前拾取的网格时，它不会被渲染，所以我们会得到它所覆盖的任何 ID。如果我们没有得到任何 ID，我们会将所有网格放回 `pickableMeshes` 并再试一次。

首先让我们让 `renderToTexture` 接受一个网格数组：

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

然后让我们让现有的 `render` 传递网格：

```js
  function render() {
    ...

    // 从画布上下文获取当前纹理并将其作为渲染目标传递
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

然后让我们让 `pick` 允许我们传递一个网格数组：

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

然后我们需要像上面提到的那样调整 `pickMeshes` 代码：

```js
+  let lastPickX;
+  let lastPickY;
+  let pickableMeshes;
  async function pickMeshes(e, cam) {
+    // 如果没有网格或指针移动了
+    if (!pickableMeshes ||
+        lastPickX !== e.clientX ||
+        lastPickY !== e.clientY) {
+      lastPickX = e.clientX;
+      lastPickY = e.clientY;
+
+      // 获取所有网格
+      pickableMeshes = meshes.slice();
+    }

    const rect = e.target.getBoundingClientRect();
    const clipX = (e.clientX - rect.left) / e.target.clientWidth * 2 - 1;
    const clipY = (e.clientY - rect.top ) / e.target.clientHeight * -2 + 1;

    const viewProjectionMatrix = getViewProjectionMatrix(cam, canvas);
    // 从可拾取的网格中拾取
-    const id = await pick(clipX, clipY, viewProjectionMatrix);
-    if (id > 0) {
+    let id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+    if (id === 0) {
+      // 如果没有找到，尝试再次拾取所有网格
+      pickableMeshes = meshes.slice();
+      id = await pick(clipX, clipY, viewProjectionMatrix, pickableMeshes);
+      // 如果仍然没有找到，说明指针下什么都没有
+      if (id === 0) {
+        setCurrentSceneGraphNode(undefined);
+        return;
+      }
+    }

-      let node = meshes[id - 1].node;
+    // 移除拾取的网格并获取其节点
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

<sup>这些改动可能很难看到。可以考虑点击"隐藏已删除"。</sup>

这样，我们就恢复了循环遍历指针下对象的能力。

{{{example url="../webgpu-picking-gpu-step-02.html"}}}

GPU 拾取的一些优点：

* 所有 GPU 顶点效果都会被应用

  一个很好的例子是骨骼蒙皮。[骨骼蒙皮](webgpu-skinning.html)通常只在 GPU 上应用。要对蒙皮对象进行 CPU 拾取，你需要在 CPU 上复制所有蒙皮逻辑。同样，对于[混合目标](webgpu-blend-targets.html)，你也需要制作一个 CPU 版本。即使在我们当前的代码中，在 CPU 拾取中我们也需要遍历顶点并知道它们的格式和步幅。我们将解决方案硬编码为适应我们的一个顶点格式。对于一个应用来说只有一个顶点格式并不罕见。但是，如果它有多个格式，我们就需要更新 CPU 代码来支持每种格式。

* 如果合适，可以考虑透明性

  想象你有一个平面，在这个平面上应用了一个树叶纹理，其中树叶区域外是 100% 透明的，这样你就能看到后面的东西。使用 CPU 拾取，按照我们实现的方式，所有拾取代码看到的是构成树叶平面的 2 个三角形。

  使用 GPU 拾取，我们可以轻松检查纹理的 alpha 值，如果低于某个阈值就 `discard` 写入对象 ID。这可以让我们拾取透过树叶平面的透明部分可以看到的对象，这会感觉更自然。

与我们上面写的 CPU 拾取相比的一个问题是，它只能给我们最前面的对象。要实现点击循环遍历指针下的所有对象（如果指针没有移动），在进行拾取时不绘制上次选择的对象。这将使得下一个最近的对象成为结果。

## 优化

虽然目前以下这些会作为练习留给读者 😛，但我们可以做 3 个相对简单的优化：

1. 将剪裁矩形设置为指针下的纹理像素

   我们可以调用 `pass.setScissorRect(clipX, clipY, 1, 1)`，这将使 GPU 只渲染到那 1 个像素。
   这比渲染数百万个 ID 像素要快，因为我们最终只读取一个像素。

2. 使用视锥体剔除或其他"潜在可见集"剔除

   如果你能轻易确定一个对象肯定不在相机前面，那么你可以跳过让 GPU 查看该对象所有三角形的工作。

   这不是拾取特有的，绘制也会从视锥体剔除中受益。检查对象是否在视锥体内有助于下一项，所以值得提一下。

3. 使用 1x1 像素纹理和不同的投影矩阵

   可以制作一个只表示包含光标下像素的视锥体的投影矩阵。如果我们这样做，我们可以只使用 1x1 像素纹理进行拾取。这有两个好处。首先，我们只需要一个 1x1 像素纹理，这比与画布大小相同的纹理少用很多内存。其次，上面提到的相同视锥体剔除检查将具有小得多的视锥体，因此会拒绝更多对象。


<!-- keep this at the bottom of the article -->
<link href="webgpu-picking.css" rel="stylesheet">
<script type="module" src="webgpu-picking.js"></script>
