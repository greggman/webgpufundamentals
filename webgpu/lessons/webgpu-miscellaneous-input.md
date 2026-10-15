Title: Miscellaneous Shader Input
Description: Alternate ways to pass data to a shader.
TOC: Miscellaneous Shader Input

This article is one in a series of the various ways to provide data
to a shader. Each one builds on the previous lesson so you may find
them easiest to understand by reading them in order.

{{{toc-steps list="passing-data.hanson"}}}

In the previous articles we covered the standard ways to pass
data into and out of a shader. Inter-stage variables, uniform buffers,
storage buffers, vertex buffers, and textures.

There are a few less common ways that are sometimes still highly useful.

One is, when calling the `draw` or `drawIndexed` command we can pass in
a `firstInstance` value.

```js
pass.draw(numVertices,
          numInstances = 1,
          firstVertex = 0,
          firstInstance = 0); // <== here
pass.drawIndexed(indexCount,
                 instanceCount = 1,
                 firstIndex = 0,
                 baseVertex = 0,
                 firstInstance = 0); // <== here
```

This value shows up as `@builtin(instance_index)` in the shader. That means
we could use it to select things if we're not aleady using it for actual instancing like we did previous articles.

For example, modifying our simple triangle example from the [first article](webgpu-fundamentals.html).

```wgsl
+struct VertexOut {
+  @builtin(position) pos: vec4f,
+  @location(0) @interpolate(flat, either) colorNdx: u32,
+};

@vertex fn vs(
*  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );
+  let offsets = array(
+    vec2f( 0.0,  0.5),  // top middle
+    vec2f(-0.5, -0.5),  // left bottom
+    vec2f( 0.5, -0.5),  // right bottom
+  );

-  return vec4f(pos[vertexIndex], 0.0, 1.0);
+  return VertexOut(
+    vec4f(pos[vertexIndex] + offsets[instanceIndex], 0.0, 1.0),
+    instanceIndex,
+  );
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
-}
+@fragment fn fs(in: VertexOut) -> @location(0) vec4f {
+  let colors = array(
+    vec4f(1, 1, 0, 1),  // yellow
+    vec4f(0, 1, 1, 1),  // cyan
+    vec4f(1, 0, 1, 1),  // magenta
+  );
+  return colors[in.colorNdx];
+}
```

The code above uses `instanceIndex` to choose an offset.
It then uses it as a `@interpolate(flat, either)` inter-stage
variable to pass it to the fragment shader. `@interpolate(flat, either)`, the `flat` part means "do not interpolate". The `either` part means take the value from either the first or last
vertex of each triangle drawn. Since we're passing the same value for all vertices it
doesn't matter if it's the first or last vertex but choosing
`either` works in compatibility mode so it's the better choice.

Finally, we just need to update our call to `draw` to draw
3 times.

```js
    function render() {
      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

      const encoder = device.createCommandEncoder({ label: 'our encoder' });
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // call our vertex shader 3 times
+      pass.draw(3, 1, 0, 1); // pass 1 for instance_index
+      pass.draw(3, 1, 0, 2); // pass 2 for instance_index
      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

And we get this result.

{{{example url="../webgpu-misc-instance-index.html"}}}

We hard coded some arrays in our shader but we could just as
easily use it to select data from a storage buffer array.

```wgsl
struct VertexOut {
  @builtin(position) pos: vec4f,
  @location(0) @interpolate(flat, either) instanceIndex: u32,
};

struct PerInstanceInfo {
  matrix: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<storage, read> perInst: array<PerInstanceInfo>;

@vertex fn vs(
  @location(0) position: vec4f,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let info = perInst[instanceIndex];

  return VertexOut(
    info.matrix * position,
    instanceIndex,
  );
}

@fragment fn fs(in: VertexOut) -> @location(0) vec4f {
  let info = perInst[in.instanceIndex];
  return info.color;
}
```

When to use this method is up to you. You can also use
[immediates](webgpu-immediates.html) for small changes bewtween
draws. The advantage to using `firstInstance` is less calls
into WebGPU and that we don't need an `ArrayBufferView` just to
pass in a single number.

We will this method when [making our mipmap generation code to
be compatibility mode friendly](webgpu-compatibility-mode.html#a-generating-mipmaps) as it made it easy to select a slice
of a 2d-array or a cube-map without having to setup a uniform
buffer.

Note that you can also control `vertex_index` in the same way.
It's also a parameter in the `draw` call. But, it's rarer to be able to use it for passing data as you usually need it to select vertices.
