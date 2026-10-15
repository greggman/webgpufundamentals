Title: WebGPU 高亮显示
Description: 高亮显示所选对象
TOC: 高亮显示

本文是关于制作 3D 编辑器组件的短系列文章的第一篇。每个章节都建立在前一篇的基础上，因此你可能会发现按顺序阅读更容易理解。
本文假设你已经阅读过
[场景图相关文章](webgpu-scene-graphs.html)以及
[后处理相关文章](webgpu-post-processing.html)。

1. [高亮显示](webgpu-highlighting.html) ⬅ 你在这里
2. [相机控制](webgpu-camera-controls.html)
3. [拾取](webgpu-picking.html)

假设我们想制作一个类似 Blender、Maya、Unity 或 Unreal 的简单 3D 编辑器。我们希望它能够选择和操作 3D 中的对象。我们其实在
[场景图相关文章](webgpu-scene-graphics.html)中已经开始了这条路，当时我们有节点，可以通过 UI 中的按钮选择一个节点，并编辑该节点的平移、旋转和缩放。如果能直观地看到哪个对象被选中了，那就更好了。让我们来实现这个功能。

从[第一个添加选择节点功能的示例](webgpu-scene-graphs.html#a-gui)开始，我们的场景是这样的：

<div class="webgpu_center center">
  <div data-diagram="standardPass" style="width: 600px"></div>
</div>

为了高亮显示所选内容，我们可以只将所选内容渲染到一个单独的纹理中。

<div class="webgpu_center center">
  <div data-diagram="selectedPass" style="width: 600px"></div>
</div>

Alpha 值实际上会形成所选对象的轮廓剪影。

<div class="webgpu_center center">
  <div data-diagram="alpha" style="width: 600px"></div>
</div>

然后我们可以将这个 Alpha 遮罩作为输入传递给一个类似后处理的通道，如果遮罩的 Alpha 为 0 但附近有非零值，就绘制高亮颜色。这会有效地给我们一个轮廓线。

<div class="webgpu_center center">
  <div data-diagram="outline" style="width: 600px"></div>
</div>

下面是一个类似后处理的着色器，给定 Alpha 遮罩后会绘制轮廓：

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
  // 注意：我们需要确保不会使用越界的
  // 纹理坐标，因为 textureLoad 在不同 GPU 上
  // 返回的结果不同
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

  // 获取当前像素。
  // 如果不为 0，说明在所选对象内部
  let s = textureLoad(mask, pos, 0).a;
  if (s > 0) {
    discard;
  }

  let hit = isOnEdge(pos);
  if (!hit) {
    discard;
  }
  return vec4f(1, 0.5, 0, 1); // 橙色
}
```

着色器首先检查遮罩中的像素是否大于 0。如果是，
那么它在代表所选对象的遮罩内部，
因此我们不想绘制任何东西，所以执行 `discard`。

否则，它调用 `isOnEdge` 检查相邻像素。
如果相邻像素都不大于 0，则它不在边缘，
因此我们通过 `discard` 不绘制任何内容。

否则我们就在边缘上，绘制橙色。

现在我们有了着色器，接下来需要从
[后处理文章](webgpu-post-processing.html)中获取后处理设置的代码。

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
        // 注意：我们需要确保不会使用越界的
        // 纹理坐标，因为 textureLoad 在不同 GPU 上
        // 返回的结果不同
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

        // 获取当前像素。如果不为 0，说明在所选对象内部
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
+
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

在渲染时我们还需要使用后处理对象。

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

    // 从我们计算的矩阵中获取相机的位置
    const cameraMatrix = mat4.identity();
    mat4.translate(cameraMatrix, [120, 100, 0], cameraMatrix);
    mat4.rotateY(cameraMatrix, settings.cameraRotation, cameraMatrix);
    mat4.translate(cameraMatrix, [60, 0, 300], cameraMatrix);

    // 计算视图矩阵
    const viewMatrix = mat4.inverse(cameraMatrix);

    // 合并视图和投影矩阵
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

+    // 将所选对象绘制到 postTexture
+    {
+       if (!postTexture ||
+            postTexture.width !== canvasTexture.width)
+            postTexture.height !== canvasTexture.height) {
+         postTexture?.destroy();
+         postTexture = device.createTexture({
+          format: canvasTexture.format,
+          canvasTexture, // 用于尺寸
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
+      // 基于 postTexture 的 Alpha 值
+      // 在 canvasTexture 上绘制轮廓
+      postProcess(encoder, undefined, canvasTexture);
+    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

上面的代码首先绘制原始场景。然后将 `selectedMeshes` 绘制到 `postTexture`。我们将 `postTexture` 传递给后处理代码，绘制轮廓到 `canvasTexture`。

由于有两处代码在另一个纹理的尺寸变化时重新创建纹理，我们可以添加一个辅助函数来简化代码。

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

    // 如果没有深度纹理或其尺寸与 canvasTexture 不同
    // 则创建一个新的深度纹理
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
+      canvasTexture, // 用于尺寸
+      'depth24plus',
+      GPUTextureUsage.RENDER_ATTACHMENT,
+    );

...

    // 将所选对象绘制到 postTexture
    {
-      if (!postTexture ||
-           postTexture.width !== canvasTexture.width)
-           postTexture.height !== canvasTexture.height) {
-        postTexture?.destroy();
-        postTexture = device.createTexture({
-         format: canvasTexture.format,
-         canvasTexture, // 用于尺寸
-         usage: GPUTextureUsage.RENDER_ATTACHMENT |
-                GPUTextureUsage.TEXTURE_BINDING,
-        });
-      }
+      postTexture = makeNewTextureIfSizeDifferent(
+        postTexture,
+        canvasTexture, // 用于尺寸
+        canvasTexture.format,
+        GPUTextureUsage.RENDER_ATTACHMENT |
+        GPUTextureUsage.TEXTURE_BINDING,
+      );
      setupPostProcess(postTexture);
```

剩下的就是我们需要一种方式来填充 `selectedMeshes`。
这稍微有点复杂，因为我们将所有东西都用立方体构成，默认情况下会隐藏一些节点。在设置 `selectedMeshes` 时，我们会考虑到这些隐藏，通过检查一个节点的所有子节点来获取更多网格。

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

  const kUnelected = '\u3000'; // 全角空格
  const kSelected = '➡️';
  const prefixRE = new RegExp(`^(?:${kUnelected}|${kSelected})`);

  function setCurrentSceneGraphNode(node) {
    trsUIHelper.setTRS(node.source);
    trsFolder.name(`orientation: ${node.name}`);
    trsFolder.updateDisplay();

    // 标记哪个节点被选中了
    for (const b of nodeButtons) {
      const name = b.button.getName().replace(prefixRE, '');
      b.button.name(`${b.node === node ? kSelected : kUnelected}${name}`);
    }

+    selectedMeshes = meshes.filter(mesh => meshUsesNode(mesh, node));

+    render();
  }
```

有了这些，所选对象就被高亮显示了。

{{{example url="../webgpu-highlighting.html"}}}

现在我们能够高亮显示选中了，接下来让我们实现
[通过拖动来移动相机](webgpu-camera-controls.html)，
而不是使用 UI 中的按钮。

<!-- keep this at the bottom of the article -->
<link href="webgpu-highlighting.css" rel="stylesheet">
<script type="module" src="webgpu-highlighting.js"></script>
