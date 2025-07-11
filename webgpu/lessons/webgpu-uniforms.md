Title: WebGPU Uniforms
Description: Passing Constant Data to a Shader
TOC: Uniforms

The previous article was about [inter-stage variables](webgpu-inter-stage-variables.html).
This article will be about uniforms.

Uniforms are kind of like global variables for your shader. You can set their
values before you execute the shader and they'll have those values for every
iteration of the shader. You can set them to something else the next time
you ask the GPU to execute the shader.

We'll start again with the triangle example from [the first article](webgpu-fundamentals.html) and modify it to use some uniforms.

```js
  const module = device.createShaderModule({
    label: 'triangle shaders with uniforms',
    code: `
+      struct OurStruct {
+        color: vec4f,
+        scale: vec2f,
+        offset: vec2f,
+      };
+
+      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

-        return vec4f(pos[vertexIndex], 0.0, 1.0);
+        return vec4f(
+          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
-        return vec4f(1, 0, 0, 1);
+        return ourStruct.color;
      }
    `,
  });

  });
```

First, we declared a struct with 3 members.

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

Then we declared a uniform variable with a type of that struct.
The variable is `ourStruct` and its type is `OurStruct`.

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

Next, we changed what is returned from the vertex shader to use
the uniforms.

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

You can see we multiply the vertex position by scale and then add an offset.
This will let us set the size of a triangle and position it.

We also changed the fragment shader to return the color from our uniforms.

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

Now that we've set up the shader to use uniforms, we need to create
a buffer on the GPU to hold values for them.

This is an area where if you've never dealt with native data and sizes,
there's a bunch to learn. It's a big topic so [here is a separate
article about the topic](webgpu-memory-layout.html). If you don't
know how to layout structs in memory, please [go read the article](webgpu-memory-layout.html). Then come back here. This article
will assume you [already read it](webgpu-memory-layout.html).

Having read [the article](webgpu-memory-layout.html), we can
now go ahead and fill out a buffer with data that matches the
struct in our shader.

First, we make a buffer and assign it usage flags so it can
be used with uniforms, and so that we can update by copying
data to it.

```js
  const uniformBufferSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // scale is 2 32bit floats (4bytes each)
    2 * 4;  // offset is 2 32bit floats (4bytes each)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

Then we make a `TypedArray` so we can set values in JavaScript.

```js
  // create a typedarray to hold the values for the uniforms in JavaScript
  const uniformValues = new Float32Array(uniformBufferSize / 4);
```

and we'll fill out 2 of the values of our struct that won't be changing later.
The offsets were computed using what we covered in
[the article on memory-layout](webgpu-memory-layout.html).

```js
  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);        // set the color
  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // set the offset
```

Above we're setting the color to green. The offset will move the triangle
to the left 1/4th of the canvas and down 1/8th. (remember, clip space goes
from -1 to 1 which is 2 units wide so 0.25 is 1/8 of 2). 

Next, [as the diagram showed in the first article](webgpu-fundamentals.html#a-draw-diagram),
to tell a shader about our buffer we need to create a bind group and bind the buffer.
We need to pass the same `@group(?)` and `@binding(?)` we set in our shader.

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

Now sometimes before we submit our command buffer, we need to set
the remaining values of `uniformValues` and then copy those values to the buffer on the GPU.
We'll do it at the top of our `render` function. 

```js
  function render() {
    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale

    // copy the values from JavaScript to the GPU
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> Note: `writeBuffer` is one way to copy data to a buffer. 
> There are several other ways covered in [this article](webgpu-copying-data.html).

We're setting the scale to half size AND taking into account the aspect of the canvas
so the triangle will keep the same width-to-height ratio regardless
of the size of the canvas. 

Finally, we need to set the bind group before drawing.

```js
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
    pass.draw(3);  // call our vertex shader 3 times
    pass.end();
```

And with that, we get a green triangle as described.

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

For this single triangle, our state when the draw command is
executed is something like this.

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

Up until now, all of the data we've used in our shaders was either
hardcoded (the triangle vertex positions in the vertex shader, 
and the color in the fragment shader).
Now that we're able to pass values into our shader, we can call `draw`
multiple times with different data.

We could draw in different places with different offsets, scales,
and colors by updating our single buffer. It's important to remember
though that our commands get put in a command buffer, they are not
actually executed until we submit them. So, we **can NOT** do this

```js
    // BAD!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, x], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.draw(3);
    }
    pass.end();

    // Finish encoding and submit the commands
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

Because, as you can see above, the `device.queue.xxx` functions happen on
a "queue" but the `pass.xxx` functions just encode a command in the command buffer.\
When we actually call `submit` with our command buffer,
the only thing in our buffer would be the last values we wrote.

We could change it to this. 

```js
    // BAD! Slow!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, 0], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      // Finish encoding and submit the commands
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

The code above updates one buffer, creates one command buffer,
adds commands to draw one thing, then finishes the command buffer
and submits it. This works but is slow for multiple reasons. The biggest is that it's
best practice to do more work in a single command buffer.

So instead, we could create one uniform buffer per thing we want
to draw. And, since buffers are used indirectly through bind groups,
we'll also need one bind group per thing we want to draw. Then we
can put all the things we want to draw into a single command buffer.

Let's do it.

First, let's make a random function.

```js
// A random number between [min and max)
// With 1 argument it will be [0 to min)
// With no arguments it will be [0 to 1)
const rand = (min, max) => {
  if (min === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
};

```

And now, let's set up buffers with a bunch of colors and offsets
we can draw a bunch of individual things.

```js
  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

+  const kNumObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < kNumObjects; ++i) {
+    const uniformBuffer = device.createBuffer({
+      label: `uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // create a typedarray to hold the values for the uniforms in JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-  uniformValues.set([0, 1, 0, 1], kColorOffset);        // set the color
-  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // set the offset
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset
+
+    const bindGroup = device.createBindGroup({
+      label: `bind group for obj: ${i}`,
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer},
+      ],
+    });
+
+    objectInfos.push({
+      scale: rand(0.2, 0.5),
+      uniformBuffer,
+      uniformValues,
+      bindGroup,
+    });
+  }
```

We're not setting the values in our buffer yet because we want it to take into account
the aspect of the canvas and we won't know the aspect of the canvas until
render time.

At render time, we'll update all of the buffers with the correct aspect-adjusted
scale.

```js
  function render() {
-    // Set the uniform values in our JavaScript side Float32Array
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale
-
-    // copy the values from JavaScript to the GPU
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // Set the uniform values in our JavaScript side Float32Array
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // call our vertex shader 3 times
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Again, remember that the `encoder` and `pass` objects are just encoding commands
into a command buffer. So when the `render` function exits we've effectively
issued these *commands* in this order.

```js
device.queue.writeBuffer(...) // update uniform buffer 0 with data for object 0
device.queue.writeBuffer(...) // update uniform buffer 1 with data for object 1
device.queue.writeBuffer(...) // update uniform buffer 2 with data for object 2
device.queue.writeBuffer(...) // update uniform buffer 3 with data for object 3
...
// execute commands that draw 100 things, each with its own uniform buffer.
device.queue.submit([commandBuffer]);
```

Here's that

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

While we're here, one more thing to cover. You're free to reference multiple
uniform buffers in your shaders. In our example above, every time we draw
we update the scale, then we `writeBuffer` to upload `uniformValues` for that
object to the corresponding uniform buffer. But, only the scale is being updated,
color and offset are not, so we're wasting time uploading color and offset.

We could split the uniforms into uniforms that need to be set once and uniforms
that are updated each time we draw.

```js
  const module = device.createShaderModule({
    code: `
      struct OurStruct {
        color: vec4f,
-        scale: vec2f,
        offset: vec2f,
      };

+      struct OtherStruct {
+        scale: vec2f,
+      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
+      @group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(
-          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
+          pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
  });
```

When we need 2 uniform buffers per thing we want to draw

```js
-  // create a buffer for the uniform values
-  const uniformBufferSize =
-    4 * 4 + // color is 4 32bit floats (4bytes each)
-    2 * 4 + // scale is 2 32bit floats (4bytes each)
-    2 * 4;  // offset is 2 32bit floats (4bytes each)
-  // offsets to the various uniform values in float32 indices
-  const kColorOffset = 0;
-  const kScaleOffset = 4;
-  const kOffsetOffset = 6;
+  // create 2 buffers for the uniform values
+  const staticUniformBufferSize =
+    4 * 4 + // color is 4 32bit floats (4bytes each)
+    2 * 4 + // offset is 2 32bit floats (4bytes each)
+    2 * 4;  // padding
+  const uniformBufferSize =
+    2 * 4;  // scale is 2 32bit floats (4bytes each)
+
+  // offsets to the various uniform values in float32 indices
+  const kColorOffset = 0;
+  const kOffsetOffset = 4;
+
+  const kScaleOffset = 0;

  const kNumObjects = 100;
  const objectInfos = [];

  for (let i = 0; i < kNumObjects; ++i) {
+    const staticUniformBuffer = device.createBuffer({
+      label: `static uniforms for obj: ${i}`,
+      size: staticUniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // These are only set once so set them now
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset

+     // copy these values to the GPU
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // create a typedarray to hold the values for the uniforms in JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
+    const uniformBuffer = device.createBuffer({
+      label: `changing uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: staticUniformBuffer},
+        { binding: 1, resource: uniformBuffer},
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }
```

Nothing changes in our render code. The bind group for each object contains
a reference to both uniform buffers for each object. Just as before we are
updating the scale. But now we're only uploading the scale when we call
`device.queue.writeBuffer` to update the uniform buffer that holds the scale value
whereas before we were uploading the color + offset + scale for each object.

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

While in this simple example, splitting into multiple uniform buffers was probably
overkill, it's common to split based on what changes and when. Examples might include
one uniform buffer for matrices that are shared. For example [a projection matrix, a view
matrix, and a camera matrix](webgpu-cameras.html). Since often these are the same for all things we want to draw
we can just make one buffer and have all objects use the same uniform buffer.

Separately our shader might reference another uniform buffer that contains just the
things that are specific to this object like its [world / model matrix](webgpu-cameras.html) and its [normal matrix](webgpu-lighting-directional.html).

Another uniform buffer might contain material settings. Those settings might be shared
by multiple objects.

We'll do much of this when we cover drawing 3D.

Next up, [storage buffers](webgpu-storage-buffers.html)
