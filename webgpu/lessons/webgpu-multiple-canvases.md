Title: WebGPU Multiple Canvases
Description: Multiple Canvases
TOC: Multiple Canvases

Drawing to multiple canvases in WebGPU is super easy.
In [the article on fundamentals](webgpu-fundamentals.html)
we looked up a canvas, then called `getContext` and we
configured the context.

```js
  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

To draw to the canvas we used that context to get a texture for the canvas
and set that texture as the first `colorAttachment` of a render pass

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
*        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  

  function render() {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
*    renderPassDescriptor.colorAttachments[0].view =
*        context.getCurrentTexture();

    // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // make a render pass encoder to encode render specific commands
    const pass = encoder.beginRenderPass(renderPassDescriptor);

```

All we have to do to draw to a different canvas is follow the same steps for
that canvas. 

1. Lookup the canvas (or create one)
2. Get a "webgpu" context
3. Configure the context
4. When we want to render to that canvas, call `context.getCurrentTexture`
   and use that texture as a `colorAttachment` in a render pass

Let's take our very first example and render to 3 canvases

First let's add 2 more canvases

```html
  <body>
    <canvas></canvas>
+    <canvas></canvas>
+    <canvas></canvas>
  </body>
```

Next let's get contexts and configure all the canvases

```js
  // Get a WebGPU context for each canvas and configure it
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const infos = [];
  for (const canvas of document.querySelectorAll('canvas')) {
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });
    infos.push({ context });
  }
```

And finally let's render to all of them

```js
  function render() {
*    // make a command encoder to start encoding commands
*    const encoder = device.createCommandEncoder({ label: 'our encoder' });

+    for (const {context} of infos) {
      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();

      // make a render pass encoder to encode render specific commands
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // call our vertex shader 3 times.
      pass.end();
+    }

*    const commandBuffer = encoder.finish();
*    device.queue.submit([commandBuffer]);
  }

  render();
```

Changes we made are (1) where we create our command encoded so it
can be shared to render all 3 canvases. (2) looping over the
contexts. 

And we that we've rendered to 3 canvases

{{{example url="../webgpu-multiple-canvases.html" }}}

Note: It's not strictly necessary to make a single command encoder but it
is slightly more efficient.

So what else is left?

## Optimizing Lots of Canvases

Let's say we wanted to show spinning products. To keep this simple
let's stick with our hard coded triangle but let's make it spin
by passing in a matrix [like we covered in the articles on matrix math](webgpu-matrix-math.html).
and let's also pass in a color so we can make each one appear slightly
different. 

```wgsl
+  struct Uniforms {
+    matrix: mat4x4f,
+    color: vec4f,
+  };
+
+  @group(0) @binding(0) var<uniform> uni: Uniforms;

  @vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
  ) -> @builtin(position) vec4f {
    let pos = array(
      vec2f( 0.0,  0.5),  // top center
      vec2f(-0.5, -0.5),  // bottom left
      vec2f( 0.5, -0.5)   // bottom right
    );

-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+    return uni.matrix * vec4f(pos[vertexIndex], 0.0, 1.0);
  }

  @fragment fn fs() -> @location(0) vec4f {
-    return vec4f(1, 0, 0, 1);
+    return uni.color;
  }
```


We'll need a [uniform buffer](webgpu-uniforms.html) for each as well
as a bind group and related things

Let's make 200 canvases and configure them for WebGPU

```js
  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // making this
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');

    const container = document.createElement('div');
    container.className = `product size${i % 4}`;

    const description = document.createElement('div');
    description.textContent = `product#: ${i + 1}`;

    container.appendChild(canvas);
    container.appendChild(description);
    document.body.appendChild(container);

    // Get a WebGPU context and configure it.
    const context = canvas.getContext('webgpu');
    context.configure({
      device,
      format: presentationFormat,
    });

    infos.push({
      context,
    });
  }
```

We need some CSS to go along with this

```js
  .product {
    display: inline-block;
    padding: 1em;
    background: #888;
    margin: 1em;
  }
  .size0>canvas {
    width: 200px;
    height: 200px;
  }
  .size1>canvas {
    width: 250px;
    height: 200px;
  }
  .size2>canvas {
    width: 300px;
    height: 200px;
  }
  .size3>canvas {
    width: 100px;
    height: 200px;
  }
```

The 4 sizes are just to make sure we're doing things correctly. If we
made them all the same size we might hide a mistake.

We need a uniform buffer and bind group for each one. We won't change
the color later so we'll pick one now. Let's pick a rand clearValue as well (why not? 🤷‍♂️)

```js
+  function randomColor() {
+    return [Math.random(), Math.random(), Math.random(), 1];
+  }

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    ...

+    // Make a uniform buffer and type array views
+    // for our uniforms.
+    const uniformValues = new Float32Array(16 + 4);
+    const uniformBuffer = device.createBuffer({
+      size: uniformValues.byteLength,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+    const kMatrixOffset = 0;
+    const kColorOffset = 16;
+    const matrixValue = uniformValues.subarray(
+        kMatrixOffset, kMatrixOffset + 16);
+    const colorValue = uniformValues.subarray(
+        kColorOffset, kColorOffset + 4);
+    colorValue.set(randomColor());
+
+    // Make a bind group for this uniform
+    const bindGroup = device.createBindGroup({
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer},
+      ],
+    });

    infos.push({
      context,
+      clearValue: randomColor(),
+      matrixValue,
+      uniformValues,
+      uniformBuffer,
+      bindGroup,
    });

```

Let's also add a `ResizeObserver` to [resize each canvas](webgpu-fundamentals.html#a-resizing).

```js
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
  });

  ...

  const infos = [];
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // making this
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);

    ...
```

At render time, we'll use a requestAnimationFrame (rAF) loop to animate.

```js
+  function render(time) {
+    time *= 0.001; // convert to seconds

    ...

+    requestAnimationFrame(render);
  }

-  render();
+  requestAnimationFrame(render);
```

And, we need to update the matrix for each canvas, upload the new values
to the uniform buffer, and set the bind group.

```js
  function render(time) {
    time *= 0.001; // convert to seconds

    // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    for (const {
      context,
      uniformBuffer,
      uniformValues,
      matrixValue,
      bindGroup,
      clearValue,
    } of infos) {
      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
+      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;
+
+      const { canvas } = context;
+      const aspect = canvas.clientWidth / canvas.clientHeight;
+      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
+      mat4.rotateZ(matrixValue, time * 0.1, matrixValue);
+
+      // Upload our uniform values.
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // make a render pass encoder to encode render specific commands
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
+      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // call our vertex shader 3 times.
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
```

Let's add a few more things. We'll get to why below.

Let's add a way to stop and start the entire thing. First
we'll add a button

```js
  <body>
+    <button type="button" id="stop">Stop/Start</button>
  </body>
```

And some CSS for it.

```css
  #stop {
    position: fixed;
    right: 0;
    top: 0;
    margin: 0.5em;
    z-index: 1;
  }
```

Then let's change the code to start and stop the animation.

```js
+  let requestId;
  function render(time) {
    ...

-    requestAnimationFrame(render);
+    requestId = requestAnimationFrame(render);
  }

-  requestAnimationFrame(render);

+  function toggleAnimation() {
+    if (requestId) {
+      cancelAnimationFrame(requestId);
+      requestId = undefined;
+    } else {
+      requestId = requestAnimationFrame(render);
+    }
+  }
+
+  toggleAnimation();
+  document.querySelector('#stop')
+      .addEventListener('click', toggleAnimation);

```

This would work but, all the objects would jump after we pause
and then later unpaused. That's because, even though we stopped
rendering, the `time` value is the time since the page loaded
which is used to compute our rotation.

So, let's fix that by keeping our own time that only advances
when we're animating.

```js
+  let time = 0;
+  let then = 0;
  let requestId;
-  function render(time) {
-    time *= 0.001
+  function render(now) {
+    now *= 0.001; // convert to seconds;
+    const deltaTime = now - then;
+    time += deltaTime;
+    then = now;

  ...

    requestId = requestAnimationFrame(render);
  }

  function toggleAnimation() {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = undefined;
    } else {
      requestId = requestAnimationFrame(render);
+      then = performance.now() * 0.001;
    }
  }
```

And now we have 200 canvas.

{{{example url="../webgpu-multiple-canvases-x200.html"}}}

You might notice this example is HEAVY! The problem is, we're rendering
all 200 canvases even though only a few are visible. It would be
much much worse if we were drawing detailed product models instead
of just a single triangle per canvas. This is why we added the stop/start
button. This page might be too heavy if the example is running so you
might want to stop it now, before continuing.

> Note: This site tries to make the examples only render and animate if the example
> itself is visible.

One way we can potentially solve this problem is by using `IntersectionObserver`.

## <a id="a-intersection-observer"></a> Using `IntersectionObserver`

`IntersectionObserver` was designed specifically for this kind of
situation. An `IntersectionObserver` does that it says, it observes
intersections. By default it observes the intersection of an element
with the browser window. Using this, we can keep a set of which
canvases are actually visible and only render those canvas.

Here's the code.

First we create a `IntersectionObserver`. Like `ResizeObserver` it takes
a function that gets called when an observed element starts or stops
intersecting the window.

```js
  const visibleCanvasSet = new Set();
  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visibleCanvasSet.add(target);
      } else {
        visibleCanvasSet.delete(target);
      }
    }
  });
```

You can see above, it calls our callback with an array of entries.
Each entry says whether it is intersecting or not. 
We use it to keep a `Set` of which canvases are visible.

We need to tell it to observe each canvas. We also need a way to get
from a canvas to the info for that canvas. In this case that is the
context, uniform buffer, bind group, etc. We'll use a `Map` to get
from a canvas to that info.

```js
-  const infos = [];
+  const canvasToInfoMap = new Map();
  const numProducts = 200;
  for (let i = 0; i < numProducts; ++i) {
    // making this
    // <div class="product size?">
    //   <canvas></canvas>
    //   <div>Product#: ?</div>
    // </div>
    const canvas = document.createElement('canvas');
    resizeObserver.observe(canvas);
+    intersectionObserver.observe(canvas);

    ...

-    infos.push({
+    canvasToInfoMap.set(canvas, {
      context,
      clearValue: randomColor(),
      matrixValue,
      uniformValues,
      uniformBuffer,
      bindGroup,
      rotation: Math.random() * Math.PI * 2,
    });
  }
```

In our render function, we can just only render the visible canvases

```js
  function render(now) {
    ...

    // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

-    for (const {
+    visibleCanvasSet.forEach(canvas => {
*      const {
*       context,
*       uniformBuffer,
*       uniformValues,
*       matrixValue,
*       bindGroup,
*       clearValue,
*       rotation,
-    } of infos) {
+      } = canvasToInfoMap.get(canvas);

      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view =
          context.getCurrentTexture();
      renderPassDescriptor.colorAttachments[0].clearValue = clearValue;

-      const { canvas } = context;
      const aspect = canvas.clientWidth / canvas.clientHeight;
      mat4.ortho(-aspect, aspect, -1, 1, -1, 1, matrixValue);
      mat4.rotateZ(matrixValue, time * 0.1 + rotation, matrixValue);

      // Upload our uniform values.
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      // make a render pass encoder to encode render specific commands
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);  // call our vertex shader 3 times.
      pass.end();
-    }
+    };

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestId = requestAnimationFrame(render);
  }
```

And with that, we're only drawing the canvases that are actually visible, which should
hopefully be much lighter.

{{{example url="../webgpu-multiple-canvases-x200-optimized.html"}}}

`IntersectionObserver` will probably not cover every case. If you are drawing very heavy
things in each canvas then you might want to only animate canvases the user selects.
In any case, hopefully you have on more tool in your toolbox.
