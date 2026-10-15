Title: WebGPU Highlighting
Description: Highlighting Selected Objects
TOC: Highlighting

This article is the 1st in a short series
about making parts of a 3D editor. Each one builds on the previous lesson so you may find them easiest to understand by reading them in order.
These article assumes you've already read
[the article on scene graphs](webgpu-scene-graphs.html) as well as
[the article on post processing](webgpu-post-processing.html).

{{{toc-steps list="editor.hanson"}}}

Let's assume we want to make a kind of simple 3D editor with inspiration from 
Blender or Maya or Unity or Unreal. We want something that lets us select and
manipulate objects in 3D. We kind of started this path in
[the article on scene graphs](webgpu-scene-graphics.html) where we had nodes
and we could select one from buttons in the UI and edit that node's translation,
rotation, and scale. It would be nice if we could see visually, which one was
selected. Let's do that.

Starting with [the example where we first added the ability to select nodes](webgpu-scene-graphs.html#a-gui), we started with a scene like this

<div class="webgpu_center center">
  <div data-diagram="standardPass" style="width: 600px"></div>
</div>

To highlight what's selected we could render just what's selected
to a separate texture.

<div class="webgpu_center center">
  <div data-diagram="selectedPass" style="width: 600px"></div>
</div>

The alpha values would effectively make a silhouette of the selected objects.

<div class="webgpu_center center">
  <div data-diagram="alpha" style="width: 600px"></div>
</div>

We could then use that alpha mask as input to a post process like pass where
we draw the highlight color if the mask's alpha is 0 but there's a non-zero
value nearby. This would effectively give us an outline.

<div class="webgpu_center center">
  <div data-diagram="outline" style="width: 600px"></div>
</div>

Here's a post processing like shader that given the alpha mask will draw an outline

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
  // Note: we need to make sure we don't use out of bounds
  // texel coordinates with textureLoad as that returns
  // different results on different GPUs
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
  // If it's not 0 we're inside the selected objects
  let s = textureLoad(mask, pos, 0).a;
  if (s > 0) {
    discard;
  }

  let hit = isOnEdge(pos);
  if (!hit) {
    discard;
  }
  return vec4f(1, 0.5, 0, 1); // orange
}
```

The shader first checks if the pixel in the mask is > 0. If it is
then it's inside the mask which represent the selected objects and
so we don't want to draw anything and so we `discard`.

Otherwise, it calls `isOnEdge` to check neighboring pixels.
If non of them are > 0 then it's not the edge and we don't draw
anything via `discard`.

Otherwise we were at an edge and draw orange.

Now that we have a shader we need the post processing setup code
from [the article on post processing](webgpu-post-processing.html).

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
        // Note: we need to make sure we don't use out of bounds
        // texel coordinates with textureLoad as that returns
        // different results on different GPUs
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

        // get the current. If it's not 0 we're inside the selected objects
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
-    renderPassDescriptor.colorAttachments[0].view = renderTarget;

+    if (!postProcessBindGroup || texture !== lastPostProcessTexture) {
+      lastPostProcessTexture = texture;
*      postProcessBindGroup = device.createBindGroup({
*        layout: postProcessPipeline.getBindGroupLayout(0),
*        entries: [
-          { binding: 0, resource: renderTarget },
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

We also need to use the post processing objects when rendering.

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

    // Compute a view matrix
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

+    // draw selected objects to postTexture
+    {
+       if (!postTexture ||
+            postTexture.width !== canvasTexture.width)
+            postTexture.height !== canvasTexture.height) {
+         postTexture?.destroy();
+         postTexture = device.createTexture({
+          format: canvasTexture.format,
+          canvasTexture, // for size,
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
+      // Draw outline based on alpha of postTexture
+      // on to the canvasTexture
+      postProcess(encoder, undefined, canvasTexture);
+    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

The code above draws the original scene. Then it draws `selectedMeshes`
to `postTexture`. We pass that `postTexture` to the post processing code
to draw the outline onto the `canvasTexture`.

Since we have 2 pieces of code recreating a texture if the size of another has changed
we could simplify the code a little by adding a helper.

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
    // from the canvasTexture when make a new depth texture
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
+      canvasTexture, // for size
+      'depth24plus',
+      GPUTextureUsage.RENDER_ATTACHMENT,
+    );

...

    // draw selected objects to postTexture
    {
-      if (!postTexture ||
-           postTexture.width !== canvasTexture.width)
-           postTexture.height !== canvasTexture.height) {
-        postTexture?.destroy();
-        postTexture = device.createTexture({
-         format: canvasTexture.format,
-         canvasTexture, // for size,
-         usage: GPUTextureUsage.RENDER_ATTACHMENT |
-                GPUTextureUsage.TEXTURE_BINDING,
-        });
-      }
+      postTexture = makeNewTextureIfSizeDifferent(
+        postTexture,
+        canvasTexture, // for size
+        canvasTexture.format,
+        GPUTextureUsage.RENDER_ATTACHMENT |
+        GPUTextureUsage.TEXTURE_BINDING,
+      );
      setupPostProcess(postTexture);
```

What's left is we need a way to fill out `selectedMeshes`.
This is slightly complicated by the fact that we we made everything
out of cubes and by default we hide some of those nodes. Well take
that hiding into account when setting `selectedMeshes`  by checking
all the children of a node for more meshes.

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

  const kUnelected = '\u3000'; // full-width space
  const kSelected = '➡️';
  const prefixRE = new RegExp(`^(?:${kUnelected}|${kSelected})`);

  function setCurrentSceneGraphNode(node) {
    trsUIHelper.setTRS(node.source);
    trsFolder.name(`orientation: ${node.name}`);
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

And with that the selected objects are highlighted.

{{{example url="../webgpu-highlighting.html"}}}

Now that we can highlight a selection, let's make it possible
to [move the camera by dragging](webgpu-camera-controls.html)
instead of having to use the buttons in the UI.

<!-- keep this at the bottom of the article -->
<link href="webgpu-highlighting.css" rel="stylesheet">
<script type="module" src="webgpu-highlighting.js"></script>
