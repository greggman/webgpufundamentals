Title: WebGPU Speed and Optimization
Description: How to go faster in WebGPU
TOC: Speed and Optimization

Most of the examples on this site are written to be as understandable as
possible. That means they work, and they're correct, but they don't necessarily
show the most efficient way to do something in WebGPU. Further, depending on
what you need to do, there are a myriad of possible optimizations.

In this article will cover some of the most basic optimizations and discuss a
few others. To be clear, IMO, **you don't usually need to go this far. Most of
the examples around the net using WebGPU draw a couple of hundred things and so
really wouldn't benefit from these optimizations**. Still, it's always good to
know how to make things go faster.

The basics: **The less work you do, and the less work you ask WebGPU to do the
faster things will go.**

In pretty much all of the examples to date, if we draw multiple shapes we've
done the following steps

* At Init time:
   * for each thing we want to draw
      * create a uniform buffer
      * create a bindGroup that references that buffer

* At Render time:
   * start an encoder and render pass
   * for each thing we want to draw
      * update a typed array with our uniform values for this object
      * copy the typed array to the uniform buffer for this object
      * set any pipeline, vertex and index buffers if needed
      * encode a command(s) to bind the bindGroup(s) for this object
      * encode a command to draw 
   * end the render pass, finish the encoder, submit the command buffer

Let's make an example we can optimize that follows the steps above so we can
then optimize it.

Note, this a fake example. We are only going to draw a bunch of cubes and as
such we could certainly optimize things by using *instancing* which we covered
in the articles on [storage buffers](webgpu-storage-buffers.html#a-instancing)
and [vertex buffers](webgpu-vertex-buffers.html#a-instancing). I didn't want to
clutter the code by handling tons of different kinds of objects. Instancing is
certainly a great way to optimize if your project uses lots of the same model.
Plants, trees, rocks, trash, etc are often optimized by using instancing. For
other models, it's arguably less common.

For example a table might have 4, 6 or 8 chairs around it and it would probably
be faster to use instancing to draw those chairs, except in a list of 500+
things to draw, if the chairs are the only exceptions, then it's probably not
worth the effort to figure out some optimal data organization that some how
organizes the chairs to use instancing but finds no other situations to use
instancing.

The point of the paragraph above is, use instancing when it's appropriate. If
you are going to draw hundreds or more of the same thing than instancing is
probably appropriate. If you are going to only draw a few of the same thing then
it's probably not worth the effort to special case those few things.

In any case, here's our code. We've got the initialization code we've been using
in general.

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

Then let's make a shader module.

```js
  const module = device.createShaderModule({
    code: `
      struct Uniforms {
        normalMatrix: mat3x3f,
        viewProjection: mat4x4f,
        world: mat4x4f,
        color: vec4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = uni.viewProjection * uni.world * vert.position;

        // Orient the normals and pass to the fragment shader
        vsOut.normal = uni.normalMatrix * vert.normal;

        // Compute the world position of the surface
        let surfaceWorldPosition = (uni.world * vert.position).xyz;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;

        // Pass the texture coord on to the fragment shader
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // Because vsOut.normal is an inter-stage variable 
        // it's interpolated so it will not be a unit vector.
        // Normalizing it will make it a unit vector again
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // Compute the light by taking the dot product
        // of the normal with the direction to the light
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // value if condition is false
            pow(specular, uni.shininess),  // value if condition is true
            specular > 0.0);               // condition

        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // Lets multiply just the color portion (not the alpha)
        // by the light
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

This shader module is uses lighting similar to
[the point light with specular highlights covered else where](webgpu-lighting-point.html#a-specular).
It uses a texture because most 3d models use textures so I thought it best to include one.
It multiplies the texture by a color so we can adjust the colors of each cube.
And it has all of the uniform values we need to do the lighting and
[project the cube in 3d](webgpu-perspective-projection.html).

We need data for a cube and to put that data in buffers.

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;
```

We need a render pipeline

```js
  const pipeline = device.createRenderPipeline({
    label: 'textured model with point light w/specular highlight',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        // position
        {
          arrayStride: 3 * 4, // 3 floats
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},
          ],
        },
        // normal
        {
          arrayStride: 3 * 4, // 3 floats
          attributes: [
            {shaderLocation: 1, offset: 0, format: 'float32x3'},
          ],
        },
        // uvs
        {
          arrayStride: 2 * 4, // 2 floats
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},
          ],
        },
      ],
    },
    fragment: {
      module,
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
```

The pipeline above uses 1 buffer per attribute. One for position data, one for
normal data, and one for texture coordinates (UVs). It culls back facing
triangles, and it expects a depth texture for depth testing. All things we've
covered in other articles.

Let's insert a few utilities for making colors and random numbers.

```js
/** Given a css color string, return an array of 4 values from 0 to 255 */
const cssColorToRGBA8 = (() => {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  return cssColor => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  };
})();

/** Given a css color string, return an array of 4 values from 0 to 1 */
const cssColorToRGBA = cssColor => cssColorToRGBA8(cssColor).map(v => v / 255);

/**
 * Given hue, saturation, and luminance values in the range of 0 to 1
 * return the corresponding CSS hsl string
 */
const hsl = (h, s, l) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;

/**
 * Given hue, saturation, and luminance values in the range of 0 to 1
 * returns an array of 4 values from 0 to 1
 */
const hslToRGBA = (h, s, l) => cssColorToRGBA(hsl(h, s, l));

/**
 * Returns a random number between min and max.
 * If min and max are not specified, returns 0 to 1
 * If max is not specified, return 0 to min.
 */
function rand(min, max) {
  if (min === undefined) {
    max = 1;
    min = 0;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

/** Selects a random array element */
const randomArrayElement = arr => arr[Math.random() * arr.length | 0];
```

Hopefully they are all pretty straight forward.

Now let's make some textures and a sampler. We'll use
a canvas, draw an emoji on it, and then use our function
`createTextureFromSource` that we wrote in
[the article on importing textures](webgpu-importing-textures.html)
to create a texture from it.

```js
  const textures = [
    '😂', '👾', '👍', '👀', '🌞', '🛟',
  ].map(s => {
    const size = 128;
    const ctx = new OffscreenCanvas(size, size).getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${size * 0.9}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const m = ctx.measureText(s);
    ctx.fillText(
      s,
      (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
      (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
    );
    return createTextureFromSource(device, ctx.canvas, {mips: true});
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'nearest',
  });
```

Let's create a set of material info. We haven't done this anywhere else but it's
a common setup. Unity, Unreal, Blender, Three.js, Babylon,js all have a concept
of a *material*. Generally, a material holds things like the color of the
material, how shiny it is, as well as which texture to use, etc...

We'll make 20 "materials" and then pick a material at random for each cube.

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);
    materials.push({
      color,
      shininess,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

Now let's make data for each thing (cube) we want to draw. We'll support a
maximum of 30000. Like we have in the past, we'll make a uniform buffer for each
object as well as a typed array we can update with uniform values. We'll also
make a bind group for each object. And we'll pick some random values we can use
to position and animate each object.

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kNormalMatrixOffset = 0;
    const kViewProjectionOffset = 12;
    const kWorldOffset = 28;
    const kColorOffset = 44;
    const kLightWorldPositionOffset = 48;
    const kViewWorldPositionOffset = 52;
    const kShininessOffset = 55;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const viewProjectionValue = uniformValues.subarray(
        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
    const lightWorldPositionValue = uniformValues.subarray(
        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
    const viewWorldPositionValue = uniformValues.subarray(
        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
      viewProjectionValue,
      colorValue,
      lightWorldPositionValue,
      viewWorldPositionValue,
      shininessValue,

      axis,
      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

We pre-create a render pass descriptor which we'll update to begin a render pass
at render time.

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- to be filled out when we render
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
```

We need a simple UI so we can adjust how many things we're drawing.

```js
  const settings = {
    numObjects: 1000,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
```

Now we can write our render loop.

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time - then;
    then = time;


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

Inside the render loop we'll update our render pass descriptor. we'll also
create a depth texture if one doesn't exist or if the one
we have has a different size then our canvas texture. We did this in
[the article on 3d](webgpu-orthographic-projection.html#a-depth-textures).

```js
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    // If we don't have a depth texture OR if its size is different
    // from the canvasTexture when make a new depth texture
    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;
```

We'll start a command buffer and a render pass and set our vertex and index buffers.

```js
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setVertexBuffer(1, normalBuffer);
    pass.setVertexBuffer(2, texcoordBuffer);
    pass.setIndexBuffer(indicesBuffer, 'uint16');
```

Then we'll compute a viewProjection matrix like we covered in
[the article on perspective projection](webgpu-perspective-projection.html).

```js
+  const degToRad = d => d * Math.PI / 180;

  function render(time) {
    ...

+    const aspect = canvas.clientWidth / canvas.clientHeight;
+    const projection = mat4.perspective(
+        degToRad(60),
+        aspect,
+        1,      // zNear
+        2000,   // zFar
+    );
+
+    const eye = [100, 150, 200];
+    const target = [0, 0, 0];
+    const up = [0, 1, 0];
+
+    // Compute a view matrix
+    const viewMatrix = mat4.lookAt(eye, target, up);
+
+    // Combine the view and projection matrixes
+    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
```

Now we can loop over all the objects and draw them, for each one we need
to update all of its uniform values, copy the uniform values to its uniform buffer,
bind the bind group for this object, and draw.

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];

      // Copy the viewProjectionMatrix into the uniform values for this object
      viewProjectionValue.set(viewProjectionMatrix);

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      // copy the materials values.
      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

> Note that the portion of the code labeled "Compute a world matrix" is not so common. It would
be more common to have a [scene graph](webgpu-scene-graphs.html) but that would have cluttered
the example even more. We needed something showing animation I threw something together.

Then we can end the pass, finish the command buffer, and submit it.

```js
+    pass.end();
+
+    const commandBuffer = encoder.finish();
+    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

A few more things left to do. Let's add in resizing

```js
+  const canvasToSizeMap = new WeakMap();

  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time - then;
    then = time;

+    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+
+    // Don't set the canvas size if it's already that size as it may be slow.
+    if (canvas.width !== width || canvas.height !== height) {
+      canvas.width = width;
+      canvas.height = height;
+    }

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture;

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  +const observer = new ResizeObserver(entries => {
  +  entries.forEach(entry => {
  +    canvasToSizeMap.set(entry.target, {
  +      width: Math.max(1, Math.min(entry.contentBoxSize[0].inlineSize, device.limits.maxTextureDimension2D)),
  +      height: Math.max(1, Math.min(entry.contentBoxSize[0].blockSize, device.limits.maxTextureDimension2D)),
  +    });
  +  });
  +});
  +observer.observe(canvas);
```

Let's also add in some timing. We'll use the `NonNegativeRollingAverage` and `TimingHelper` classes
we made in [the article on timing](webgpu-timing.html). 

```js
// see https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import TimingHelper from './resources/js/timing-helper.js';
// see https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
import NonNegativeRollingAverage from './resources/js/non-negative-rolling-average.js';

const fpsAverage = new NonNegativeRollingAverage();
const jsAverage = new NonNegativeRollingAverage();
const gpuAverage = new NonNegativeRollingAverage();
const mathAverage = new NonNegativeRollingAverage();
```

Then we'll time our JavaScript from the beginning to the end of our rendering code

```js
  function render(time) {
    ...

+    const startTimeMs = performance.now();

    ...

+    const elapsedTimeMs = performance.now() - startTimeMs;
+    jsAverage.addSample(elapsedTimeMs);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

We'll time the part of the JavaScript that does the 3D math

```js
  function render(time) {
    ...

+    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
        viewProjectionValue,
        colorValue,
        lightWorldPositionValue,
        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
+      const mathTimeStartMs = performance.now();

      // Copy the viewProjectionMatrix into the uniform values for this object
      viewProjectionValue.set(viewProjectionMatrix);

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;

      colorValue.set(color);
      lightWorldPositionValue.set([-10, 30, 300]);
      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

+      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
    jsAverage.addSample(elapsedTimeMs);
+    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

We'll time the time between `requestAnimationFrame` callbacks.

```js
  let depthTexture;
  let then = 0;

  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time - then;
    then = time;

    ...

    const elapsedTimeMs = performance.now() - startTimeMs;
+    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);


    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

And we'll time our render pass

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: 'high-performance',
  });
-  const device = await adapter?.requestDevice();
+  const canTimestamp = adapter.features.has('timestamp-query');
+  const device = await adapter?.requestDevice({
+    requiredFeatures: [
+      ...(canTimestamp ? ['timestamp-query'] : []),
+     ],
+  });
  if (!device) {
    fail('could not init WebGPU');
  }

+  const timingHelper = new TimingHelper(device);

  ...

  function render(time) {
    ...

-    const pass = encoder.beginRenderPass(renderPassEncoder);
+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);

    ...

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

+    timingHelper.getResult().then(gpuTime => {
+      gpuAverage.addSample(gpuTime / 1000);
+    });

    ...

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

And we need to show the timing

```js
async function main() {
  ...

  const timingHelper = new TimingHelper(device);
+  const infoElem = document.querySelector('#info');

  ...

  function render(time) {
    ...

    timingHelper.getResult().then(gpuTime => {
      gpuAverage.addSample(gpuTime / 1000);
    });

    const elapsedTimeMs = performance.now() - startTimeMs;
    fpsAverage.addSample(1 / deltaTime);
    jsAverage.addSample(elapsedTimeMs);
    mathAverage.addSample(mathElapsedTimeMs);

+    infoElem.textContent = `\
+js  : ${jsAverage.get().toFixed(1)}ms
+math: ${mathAverage.get().toFixed(1)}ms
+fps : ${fpsAverage.get().toFixed(0)}
+gpu : ${canTimestamp ? `${(gpuAverage.get() / 1000).toFixed(1)}ms` : 'N/A'}
+`;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
```

One more thing, just to help with better comparisons. An issue we have now is,
every visible cube has every pixel rendered or at least checked if it needs to
be rendered. Since we're not optimizing the rendering of pixels but rather
optimizing the usage of WebGPU itself, it can be useful to be able to draw to a
1x1 pixel canvas. This effectively removes nearly all of the time spent
rasterizing triangles and instead leaves only the part of our code that is doing
math and communicating with WebGPU.

So let's add an option to do that

```js
  const settings = {
    numObjects: 1000,
+    render: true,
  };

  const gui = new GUI();
  gui.add(settings, 'numObjects', { min: 0, max: maxObjects, step: 1});
+  gui.add(settings, 'render');

  let depthTexture;
  let then = 0;
  let frameCount = 0;

  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time - then;
    then = time;
    ++frameCount;

    const startTimeMs = performance.now();

-    const {width, height} = canvasToSizeMap.get(canvas) ?? canvas;
+    const {width, height} = settings.render
+       ? canvasToSizeMap.get(canvas) ?? canvas
+       : { width: 1, height: 1 };
```

Now, if we uncheck 'render', we'll remove almost all of the um, ahh ..., rendering.

And with that, we have our first "un-optimized" example. It's following the
steps listed near the top of the article, and it works.

{{{example url="../webgpu-optimization-none.html"}}}

Increase the number of objects and see when the framerate drops for you. For me,
on my 75hz monitor on an M1 Mac I got ~8000 cubes before the framerate dropped.

# <a id="a-mapped-on-creation"></a> Optimization: Mapped On Creation

In the example above, and in most of the examples on this site, we've used
`writeBuffer` to copy data into a vertex or index buffer. As a very minor
optimization, for this particular case, when you create a buffer you can pass in
`mappedAtCreation: true`. This has 2 benefits.

1. It's slightly faster to put the data into the new buffer

2. You don't have to add `GPUBufferUsage.COPY_DST` to the buffer's usage.

   This assumes you're not going to change the data later via `writeBuffer` nor
   one of the copy to buffer functions.

```js
  function createBufferWithData(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
-      usage: usage | GPUBufferUsage.COPY_DST,
+      usage: usage,
+      mappedAtCreation: true,
    });
-    device.queue.writeBuffer(buffer, 0, data);
+    const dst = new Uint8Array(buffer.getMappedRange());
+    dst.set(new Uint8Array(data.buffer));
+    buffer.unmap();
    return buffer;
  }
```

Note that this optimization only helps at creation time so it will not affect
our performance at render time.

# <a id="a-pack-verts"></a> Optimization: Pack and interleave your vertices

In the example above we have 3 attributes, one for position, one for normals,
and one for texture coordinates. It's common to have 4 to 6 attributes where
we'd have [tangents for normal mapping](webgpu-normal-mapping.html) and, if
we had [a skinned model](webgpu-skinning.html), we'd add in weights and joints.

In the example above, each attribute is using its own buffer. This is slower both
on the CPU and GPU. It's slower on the CPU in JavaScript because we need to call
`setVertexBuffer` once for each buffer for each model we want to draw.

Imagine instead of just a cube we had 100s of models. Each time we switched
which model to draw we'd have to call `setVertexBuffer` up to 6 times. 100 * 6
calls per model = 600 calls. 

Following the rule "less work = go faster", if we merged the data for the
attributes into a single buffer then we'd only need one call to
`setVertexBuffer` once per model. 100 calls. That's like 600% faster!

On the GPU, loading things that are together in memory is usually faster than
loading from different places in memory so on top of just putting the vertex
data for a single model into a single buffer, it's better to interleave the
data.

Let's make that change.

```js
-  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
-  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
-  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
+  const vertexData = new Float32Array([
+  // position       normal        texcoord
+     1,  1, -1,     1,  0,  0,    1, 0,
+     1,  1,  1,     1,  0,  0,    0, 0,
+     1, -1,  1,     1,  0,  0,    0, 1,
+     1, -1, -1,     1,  0,  0,    1, 1,
+    -1,  1,  1,    -1,  0,  0,    1, 0,
+    -1,  1, -1,    -1,  0,  0,    0, 0,
+    -1, -1, -1,    -1,  0,  0,    0, 1,
+    -1, -1,  1,    -1,  0,  0,    1, 1,
+    -1,  1,  1,     0,  1,  0,    1, 0,
+     1,  1,  1,     0,  1,  0,    0, 0,
+     1,  1, -1,     0,  1,  0,    0, 1,
+    -1,  1, -1,     0,  1,  0,    1, 1,
+    -1, -1, -1,     0, -1,  0,    1, 0,
+     1, -1, -1,     0, -1,  0,    0, 0,
+     1, -1,  1,     0, -1,  0,    0, 1,
+    -1, -1,  1,     0, -1,  0,    1, 1,
+     1,  1,  1,     0,  0,  1,    1, 0,
+    -1,  1,  1,     0,  0,  1,    0, 0,
+    -1, -1,  1,     0,  0,  1,    0, 1,
+     1, -1,  1,     0,  0,  1,    1, 1,
+    -1,  1, -1,     0,  0, -1,    1, 0,
+     1,  1, -1,     0,  0, -1,    0, 0,
+     1, -1, -1,     0,  0, -1,    0, 1,
+    -1, -1, -1,     0,  0, -1,    1, 1,
+  ]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

-  const positionBuffer = createBufferWithData(device, positions, GPUBufferUsage.VERTEX);
-  const normalBuffer = createBufferWithData(device, normals, GPUBufferUsage.VERTEX);
-  const texcoordBuffer = createBufferWithData(device, texcoords, GPUBufferUsage.VERTEX);
+  const vertexBuffer = createBufferWithData(device, vertexData, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX);
  const numVertices = indices.length;

  const pipeline = device.createRenderPipeline({
    label: 'textured model with point light w/specular highlight',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
-        // position
-        {
-          arrayStride: 3 * 4, // 3 floats
-          attributes: [
-            {shaderLocation: 0, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // normal
-        {
-          arrayStride: 3 * 4, // 3 floats
-          attributes: [
-            {shaderLocation: 1, offset: 0, format: 'float32x3'},
-          ],
-        },
-        // uvs
-        {
-          arrayStride: 2 * 4, // 2 floats
-          attributes: [
-            {shaderLocation: 2, offset: 0, format: 'float32x2'},
-          ],
-        },
+        {
+          arrayStride: (3 + 3 + 2) * 4, // 8 floats
+          attributes: [
+            {shaderLocation: 0, offset: 0 * 4, format: 'float32x3'}, // position
+            {shaderLocation: 1, offset: 3 * 4, format: 'float32x3'}, // normal
+            {shaderLocation: 2, offset: 6 * 4, format: 'float32x2'}, // texcoord
+          ],
+        },
      ],
    },
    fragment: {
      module,
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

  ...
-    pass.setVertexBuffer(0, positionBuffer);
-    pass.setVertexBuffer(1, normalBuffer);
-    pass.setVertexBuffer(2, texcoordBuffer);
+    pass.setVertexBuffer(0, vertexBuffer);
```

Above we put the data for all 3 attributes into a single buffer and then changed
our render pass so it expects the data interleaved into a single buffer.

Note: if you're loading gLTF files, it's arguably good to either pre-process
them so their vertex data is interleaved into a single buffer (best) or else
interleave the data at load time.

# Optimization: Split uniform buffers (shared, material, per model)

Our example right now has one uniform buffer per object.

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  viewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
};
```

Some of those uniform values like `viewProjection`, `lightWorldPosition`
and `viewWorldPosition` can be shared.

We can split these in the shader to use 2 uniform buffers. One for the shared
values and one for *per object values*.

```wgsl
struct GlobalUniforms {
  viewProjection: mat4x4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
};
struct PerObjectUniforms {
  normalMatrix: mat3x3f,
  world: mat4x4f,
  color: vec4f,
  shininess: f32,
};
```

With this change, we'll save having to copy the 
`viewProjection`, `lightWorldPosition` and `viewWorldPosition`
to every uniform buffer. We'll also copy less data per object
with `device.queue.writeBuffer`

Here's the new shader

```js
  const module = device.createShaderModule({
    code: `
-      struct Uniforms {
-        normalMatrix: mat3x3f,
-        viewProjection: mat4x4f,
-        world: mat4x4f,
-        color: vec4f,
-        lightWorldPosition: vec3f,
-        viewWorldPosition: vec3f,
-        shininess: f32,
-      };

+      struct GlobalUniforms {
+        viewProjection: mat4x4f,
+        lightWorldPosition: vec3f,
+        viewWorldPosition: vec3f,
+      };
+      struct PerObjectUniforms {
+        normalMatrix: mat3x3f,
+        world: mat4x4f,
+        color: vec4f,
+        shininess: f32,
+      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
-      @group(0) @binding(2) var<uniform> uni: Uniforms;
+      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
+      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
-        vsOut.position = uni.viewProjection * uni.world * vert.position;
+        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // Orient the normals and pass to the fragment shader
-        vsOut.normal = uni.normalMatrix * vert.normal;
+        vsOut.normal = obj.normalMatrix * vert.normal;

        // Compute the world position of the surface
-        let surfaceWorldPosition = (uni.world * vert.position).xyz;
+        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
-        vsOut.surfaceToLight = uni.lightWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
-        vsOut.surfaceToView = uni.viewWorldPosition - surfaceWorldPosition;
+        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // Pass the texture coord on to the fragment shader
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // Because vsOut.normal is an inter-stage variable 
        // it's interpolated so it will not be a unit vector.
        // Normalizing it will make it a unit vector again
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // Compute the light by taking the dot product
        // of the normal with the direction to the light
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // value if condition is false
-            pow(specular, uni.shininess),  // value if condition is true
+            pow(specular, obj.shininess),  // value if condition is true
            specular > 0.0);               // condition

-        let diffuse = uni.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // Lets multiply just the color portion (not the alpha)
        // by the light
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

We need to create one global uniform buffer for the global uniforms.

```js
  const globalUniformBufferSize = (16 + 4 + 4) * 4;
  const globalUniformBuffer = device.createBuffer({
    label: 'global uniforms',
    size: globalUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const globalUniformValues = new Float32Array(globalUniformBufferSize / 4);

  const kViewProjectionOffset = 0;
  const kLightWorldPositionOffset = 16;
  const kViewWorldPositionOffset = 20;

  const viewProjectionValue = globalUniformValues.subarray(
      kViewProjectionOffset, kViewProjectionOffset + 16);
  const lightWorldPositionValue = globalUniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = globalUniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
```

Then we can remove these uniforms from our perObject uniform buffer and add the
global uniform buffer to each object's bind group.

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kNormalMatrixOffset = 0;
-    const kViewProjectionOffset = 12;
-    const kWorldOffset = 28;
-    const kColorOffset = 44;
-    const kLightWorldPositionOffset = 48;
-    const kViewWorldPositionOffset = 52;
-    const kShininessOffset = 55;
+    const kWorldOffset = 12;
+    const kColorOffset = 28;
+    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const viewProjectionValue = uniformValues.subarray(
-        kViewProjectionOffset, kViewProjectionOffset + 16);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const lightWorldPositionValue = uniformValues.subarray(
-        kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
-    const viewWorldPositionValue = uniformValues.subarray(
-        kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
    const shininessValue = uniformValues.subarray(
        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer},
+        { binding: 3, resource: globalUniformBuffer},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      viewProjectionValue,
      colorValue,
-      lightWorldPositionValue,
-      viewWorldPositionValue,
      shininessValue,
      material,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

Then, at render time, we update the global uniform buffer just once, outside the
loop of rendering our objects.

```js
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combine the view and projection matrixes
-    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
+    mat4.multiply(projection, viewMatrix, viewProjectionValue);
+
+    lightWorldPositionValue.set([-10, 30, 300]);
+    viewWorldPositionValue.set(eye);
+
+    device.queue.writeBuffer(globalUniformBuffer, 0, globalUniformValues);

    let mathElapsedTimeMs = 0;

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        viewProjectionValue,
        colorValue,
-        lightWorldPositionValue,
-        viewWorldPositionValue,
        shininessValue,

        axis,
        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

-      // Copy the viewProjectionMatrix into the uniform values for this object
-      viewProjectionValue.set(viewProjectionMatrix);

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      const {color, shininess} = material;
      colorValue.set(color);
-      lightWorldPositionValue.set([-10, 30, 300]);
-      viewWorldPositionValue.set(eye);
      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

    pass.end();
```

That didn't change the number of calls into WebGPU, in fact it added 1. But, it
reduced a bunch of the work we were doing per model.

{{{example url="../webgpu-optimization-step3-global-vs-per-object-uniforms.html"}}}

On my machine, with that change, our math portion dropped ~16%

# Optimization: Separate more uniforms

A common organization in a 3D library is to have "models" (the vertex data),
"materials" (the colors, shininess, and textures), "lights" (which lights to
use), "viewInfo" (the view and projection matrix). In particular, in our
example, `color` and `shininess` never change so it's a waste to keep copying
them to the uniform buffer every frame.

Let's make a uniform buffer per material. We'll copy the material settings into
them at init time and then just add them to our bind group.

First let's change the shaders to use another uniform buffer.

```js
  const module = device.createShaderModule({
    code: `
      struct GlobalUniforms {
        viewProjection: mat4x4f,
        lightWorldPosition: vec3f,
        viewWorldPosition: vec3f,
      };

+      struct MaterialUniforms {
+        color: vec4f,
+        shininess: f32,
+      };

      struct PerObjectUniforms {
        normalMatrix: mat3x3f,
        world: mat4x4f,
-        color: vec4f,
-        shininess: f32,
      };

      struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
        @location(2) texcoord: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) surfaceToLight: vec3f,
        @location(2) surfaceToView: vec3f,
        @location(3) texcoord: vec2f,
      };

      @group(0) @binding(0) var diffuseTexture: texture_2d<f32>;
      @group(0) @binding(1) var diffuseSampler: sampler;
      @group(0) @binding(2) var<uniform> obj: PerObjectUniforms;
      @group(0) @binding(3) var<uniform> glb: GlobalUniforms;
+      @group(0) @binding(4) var<uniform> material: MaterialUniforms;

      @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = glb.viewProjection * obj.world * vert.position;

        // Orient the normals and pass to the fragment shader
        vsOut.normal = obj.normalMatrix * vert.normal;

        // Compute the world position of the surface
        let surfaceWorldPosition = (obj.world * vert.position).xyz;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
        vsOut.surfaceToLight = glb.lightWorldPosition - surfaceWorldPosition;

        // Compute the vector of the surface to the light
        // and pass it to the fragment shader
        vsOut.surfaceToView = glb.viewWorldPosition - surfaceWorldPosition;

        // Pass the texture coord on to the fragment shader
        vsOut.texcoord = vert.texcoord;

        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        // Because vsOut.normal is an inter-stage variable 
        // it's interpolated so it will not be a unit vector.
        // Normalizing it will make it a unit vector again
        let normal = normalize(vsOut.normal);

        let surfaceToLightDirection = normalize(vsOut.surfaceToLight);
        let surfaceToViewDirection = normalize(vsOut.surfaceToView);
        let halfVector = normalize(
          surfaceToLightDirection + surfaceToViewDirection);

        // Compute the light by taking the dot product
        // of the normal with the direction to the light
        let light = dot(normal, surfaceToLightDirection);

        var specular = dot(normal, halfVector);
        specular = select(
            0.0,                           // value if condition is false
-            pow(specular, obj.shininess),  // value if condition is true
+            pow(specular, material.shininess),  // value if condition is true
            specular > 0.0);               // condition

-        let diffuse = obj.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
+        let diffuse = material.color * textureSample(diffuseTexture, diffuseSampler, vsOut.texcoord);
        // Lets multiply just the color portion (not the alpha)
        // by the light
        let color = diffuse.rgb * light + specular;
        return vec4f(color, diffuse.a);
      }
    `,
  });
```

Then we'll make a uniform buffer for each material.

```js
  const numMaterials = 20;
  const materials = [];
  for (let i = 0; i < numMaterials; ++i) {
    const color = hslToRGBA(rand(), rand(0.5, 0.8), rand(0.5, 0.7));
    const shininess = rand(10, 120);

+    const materialValues = new Float32Array([
+      ...color,
+      shininess,
+      0, 0, 0,  // padding
+    ]);
+    const materialUniformBuffer = createBufferWithData(
+      device,
+      materialValues,
+      GPUBufferUsage.UNIFORM,
+    );

    materials.push({
-      color,
-      shininess,
+      materialUniformBuffer,
      texture: randomArrayElement(textures),
      sampler,
    });
  }
```

When we setup the per object info we no longer need to pass on the material
settings. Instead we just need to add the material's uniform buffer to the
object's bind group.

```js
  const maxObjects = 30000;
  const objectInfos = [];

  for (let i = 0; i < maxObjects; ++i) {
-    const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
+    const uniformBufferSize = (12 + 16) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;
-    const kColorOffset = 28;
-    const kShininessOffset = 32;

    const normalMatrixValue = uniformValues.subarray(
        kNormalMatrixOffset, kNormalMatrixOffset + 12);
    const worldValue = uniformValues.subarray(
        kWorldOffset, kWorldOffset + 16);
-    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-    const shininessValue = uniformValues.subarray(
-        kShininessOffset, kShininessOffset + 1);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: uniformBuffer},
        { binding: 3, resource: globalUniformBuffer},
+        { binding: 4, resource: material.materialUniformBuffer},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

      uniformBuffer,
      uniformValues,

      normalMatrixValue,
      worldValue,
-      colorValue,
-      shininessValue,

      axis,
-      material,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

We also no longer need to deal with this stuff at render time.

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
        uniformBuffer,
        uniformValues,
        normalMatrixValue,
        worldValue,
-        colorValue,
-        shininessValue,

        axis,
-        material,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

-      const {color, shininess} = material;
-      colorValue.set(color);
-      shininessValue[0] = shininess;

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
```

{{{example url="../webgpu-optimization-step4-material-uniforms.html"}}}

# Optimization: Use One large Uniform Buffer with buffer offsets

Right now, each object has it's own uniform buffer. At render time, for each
object, we update a typed array with the uniform values for that object and then
call `device.queue.writeBuffer` to update that single uniform buffer's values.
If we're rendering 8000 objects that's 8000 calls to `device.queue.writeBuffer`.

Instead, we could make one larger uniform buffer. We can then setup the bind
group for each object to use it's own portion of the larger buffer. At render
time, we can update all the values for all of the objects in one large typed
array and make just one call to `device.queue.writeBuffer` which should be
faster.

First let's allocate a large uniform buffer and large typed array. Uniform
buffer offsets have a minimum alignment which defaults to 256 bytes so we'll
round up the size we need per object to 256 bytes.

```js
+/** Rounds up v to a multiple of alignment */
+const roundUp = (v, alignment) => Math.ceil(v / alignment) * alignment;

  ...

+  const uniformBufferSize = (12 + 16) * 4;
+  const uniformBufferSpace = roundUp(uniformBufferSize, device.limits.minUniformBufferOffsetAlignment);
+  const uniformBuffer = device.createBuffer({
+    label: 'uniforms',
+    size: uniformBufferSpace * maxObjects,
+    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+  });
+  const uniformValues = new Float32Array(uniformBuffer.size / 4);
```

Now we can change the per object views to view into that large typedarray. We
can also set the bind group to use the correct portion of the large uniform
buffer.

```js
  for (let i = 0; i < maxObjects; ++i) {
+    const uniformBufferOffset = i * uniformBufferSpace;
+    const f32Offset = uniformBufferOffset / 4;

    // offsets to the various uniform values in float32 indices
    const kNormalMatrixOffset = 0;
    const kWorldOffset = 12;

-    const normalMatrixValue = uniformValues.subarray(
-        kNormalMatrixOffset, kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        kWorldOffset, kWorldOffset + 16);
+    const normalMatrixValue = uniformValues.subarray(
+        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+    const worldValue = uniformValues.subarray(
+        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
-        { binding: 2, resource: uniformBuffer},
+        {
+          binding: 2,
+          resource: {
+            buffer: uniformBuffer,
+            offset: uniformBufferOffset,
+            size: uniformBufferSize,
+          },
+        },
        { binding: 3, resource: globalUniformBuffer},
        { binding: 4, resource: material.materialUniformBuffer},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      uniformBuffer,
-      uniformValues,

      normalMatrixValue,
      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

At render time we update all the objects values and then make
just one call to `device.queue.writeBuffer`.

```js
    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
-        uniformBuffer,
-        uniformValues,
        normalMatrixValue,
        worldValue,

        axis,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

-      // upload the uniform values to the uniform buffer
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }

+    // upload all uniform values to the uniform buffer
+    if (settings.numObjects) {
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
+    }

    pass.end();
```

{{{example url="../webgpu-optimization-step5-use-buffer-offsets.html"}}}

On my machine that shaved off 40% of the JavaScript time!

# Optimization: Use Mapped Buffers

When we call `device.queue.writeBuffer`, what happens is, WebGPU makes a copy of
the data in the typed array. It copies that data to the GPU process (a separate
process that talks to the GPU for security). In the GPU process that data is
then copied to the GPU Buffer.

We can skip one of those copies by using mapped buffers instead. We'll map a
buffer, update the uniform values directly into that mapped buffer. Then we'll
unmap the buffer and issue a `copyBufferToBuffer` command to copy to the uniform
buffer. This will save a copy.

WebGPU mapping happens asynchronously so rather then map a buffer and wait for
it to be ready, we'll keep an array of already mapped buffers. Each frame, we
either get an already mapped buffer or create a new one that is already mapped.
After we render, we'll setup a callback to map the buffer when it's available
and put it back on the list of already mapped buffers. This way, we'll never
have to wait for a mapped buffer.

First we'll make an array of mapped buffers and a function to either get a
pre-mapped buffer or make a new one.

```js
  const mappedTransferBuffers = [];
  const getMappedTransferBuffer = () => {
    return mappedTransferBuffers.pop() || device.createBuffer({
      label: 'transfer buffer',
      size: uniformBufferSpace * maxObjects,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
  };
```

We can't pre-create typedarray views anymore because mapping
a buffer gives us a new `ArrayBuffer`. So, we'll have to
make new typedarray views after mapping.

```js
+  // offsets to the various uniform values in float32 indices
+  const kNormalMatrixOffset = 0;
+  const kWorldOffset = 12;

  for (let i = 0; i < maxObjects; ++i) {
    const uniformBufferOffset = i * uniformBufferSpace;
-    const f32Offset = uniformBufferOffset / 4;
-
-    // offsets to the various uniform values in float32 indices
-    const kNormalMatrixOffset = 0;
-    const kWorldOffset = 12;
-
-    const normalMatrixValue = uniformValues.subarray(
-        f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
-    const worldValue = uniformValues.subarray(
-        f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);
-    const material = randomArrayElement(materials);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: material.texture },
        { binding: 1, resource: material.sampler },
        { binding: 2, resource: { buffer: uniformBuffer, offset: uniformBufferOffset, size: uniformBufferSize }},
        { binding: 3, resource: globalUniformBuffer},
        { binding: 4, resource: material.materialUniformBuffer},
      ],
    });

    const axis = vec3.normalize([rand(-1, 1), rand(-1, 1), rand(-1, 1)]);
    const radius = rand(10, 100);
    const speed = rand(0.1, 0.4);
    const rotationSpeed = rand(-1, 1);
    const scale = rand(2, 10);

    objectInfos.push({
      bindGroup,

-      normalMatrixValue,
-      worldValue,

      axis,
      radius,
      speed,
      rotationSpeed,
      scale,
    });
  }
```

At render time we encode a command to copy the transfer buffer
to the uniform buffer *before* we start looping through the
objects. This is because the `copyBufferToBuffer` command is
a command on the `GPUCommandEncoder`. We need it to run before
the objects are rendered but, as we loop over the object's we're
encoding render pass commands to render them. Before, we called
`device.queue.writeBuffer` after updating the typed arrays, which
of course, executes first because we have no called `submit` yet
on our commands. In this case though, our copy actually is a command
so we have to encode it before the draw commands. This is fine because
remember, it's just a command, it will not be executed until we
submit the command buffer which means we can still update the transfer
buffer as the copy has not yet happened.


```js
    const encoder = device.createCommandEncoder();
-    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
-    pass.setPipeline(pipeline);
-    pass.setVertexBuffer(0, vertexBuffer);
-    pass.setIndexBuffer(indicesBuffer, 'uint16');

    ...

    let mathElapsedTimeMs = 0;

+    const transferBuffer = getMappedTransferBuffer();
+    const uniformValues = new Float32Array(transferBuffer.getMappedRange());

+    // copy the uniform values from the transfer buffer to the uniform buffer
+    if (settings.numObjects) {
+      // Remember, this is just encoding a command that will happen later.
+      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
+      encoder.copyBufferToBuffer(transferBuffer, 0, uniformBuffer, 0, size);
+    }

+    const pass = timingHelper.beginRenderPass(encoder, renderPassDescriptor);
+    pass.setPipeline(pipeline);
+    pass.setVertexBuffer(0, vertexBuffer);
+    pass.setIndexBuffer(indicesBuffer, 'uint16');

    for (let i = 0; i < settings.numObjects; ++i) {
      const {
        bindGroup,
-        normalMatrixValue,
-        worldValue,
        axis,
        radius,
        speed,
        rotationSpeed,
        scale,
      } = objectInfos[i];
      const mathTimeStartMs = performance.now();

+      // Make views into the mapped buffer.
+      const uniformBufferOffset = i * uniformBufferSpace;
+      const f32Offset = uniformBufferOffset / 4;
+      const normalMatrixValue = uniformValues.subarray(
+          f32Offset + kNormalMatrixOffset, f32Offset + kNormalMatrixOffset + 12);
+      const worldValue = uniformValues.subarray(
+          f32Offset + kWorldOffset, f32Offset + kWorldOffset + 16);

      // Compute a world matrix
      mat4.identity(worldValue);
      mat4.axisRotate(worldValue, axis, i + time * speed, worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 3.721 + time * speed) * radius], worldValue);
      mat4.translate(worldValue, [0, 0, Math.sin(i * 9.721 + time * 0.1) * radius], worldValue);
      mat4.rotateX(worldValue, time * rotationSpeed + i, worldValue);
      mat4.scale(worldValue, [scale, scale, scale], worldValue);

      // Inverse and transpose it into the normalMatrix value
      mat3.fromMat4(mat4.transpose(mat4.inverse(worldValue)), normalMatrixValue);

      mathElapsedTimeMs += performance.now() - mathTimeStartMs;

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);
    }
+    transferBuffer.unmap();

-    // upload all uniform values to the uniform buffer
-    if (settings.numObjects) {
-      const size = (settings.numObjects - 1) * uniformBufferSpace + uniformBufferSize;
-      device.queue.writeBuffer( uniformBuffer, 0, uniformValues, 0, size / uniformValues.BYTES_PER_ELEMENT);
-    }

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

Finally, as soon as we've submitted the command buffer we map the buffer again.
Mapping is asynchronous so when it's finally ready we'll add it back to the list
of already mapped buffers.

```js
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

+    transferBuffer.mapAsync(GPUMapMode.WRITE).then(() => {
+      mappedTransferBuffers.push(transferBuffer);
+    });
```

On my machine, this version draws around 15000 objects at 75fps. which is about
87% more than we started with.

{{{example url="../webgpu-optimization-step6-use-mapped-buffers.html"}}}

With rendering unchecked, the difference is even bigger. For me I get 9000 at
75fps with the original non-optimized example and 18000 at 75fps in this last
version. That's a 2x speed up!

Other things that *might* help

* **Double buffer the large uniform buffer**

  This comes up as a possible optimization because WebGPU can not update a
  buffer that is currently in use.

  So, imagine you start rendering (you call `device.queue.submit`). The GPU
  starts rendering using our large uniform buffer. You immediately try to update
  that buffer. In this case, WebGPU would have to pause and wait for the GPU to
  finish using the buffer for rendering.

  This is unlikely to happen in our example above. We don't directly update the
  uniform buffer. Instead we update a transfer buffer and then later, ask the
  GPU to copy it to the uniform buffer.

  This issue would be more likely to come up if we update a buffer directly on
  the GPU using a compute shader.

* **Compute matrix math with offsets**

  The math library we created in [the series on matrix math](webgpu-matrix-math.html)
  Generates `Float32Array`s as outputs and takes in `Float32Array`s as inputs.
  It can modify a `Float32Array` in place. But, what it can't do is update a
  `Float32Array` at some offset.
  
  This is why, in our loop where we update our per object uniform values, for
  each object we have to create 2 `Float32Array` views into our mapped buffer.
  For 20000 objects that's creating 40000 of these temporary views.
  
  Adding offsets to every input would make them burdensome to use in my opinion
  but, just as a test, I wrote a modified version of the math functions that
  take an offset. In other words. 

  ```js
      mat4.multiply(a, b, dst);
  ```

  becomes

  ```js
     mat4.multiply(a, aOffset, b, bOffset, dst, dstOffset);
  ```

  [It appears to be about 7% faster to use the offsets](../webgpu-optimization-step6-use-mapped-buffers-math-w-offsets.html).

  It's up to you if you feel that's worth it. For me personally, like I
  mentioned at the top of the article, I'd prefer to keep it simple to use. I'm
  rarely trying to draw 10000 things. But, it's good to know, if I wanted to
  squeeze out more performance, this is one place I might find some. More likely
  I'd look into WebAssembly if I needed to go that far.

* **Directly map the uniform buffer**

  In our example above we map a transfer buffer, a buffer that only has
  `COPY_SRC` and `MAP_WRITE` usage flags. We then have to call
  `encoder.copyBufferToBuffer` to copy the contents of that buffer into the
  actual uniform buffer.

  It would be much nicer if we could directly map the uniform buffer and avoid
  the copy. Unfortunately, that ability is not available in WebGPU version 1 but
  it is being considered as an optional feature sometime in the future,
  especially for *uniform memory architectures* like some ARM based devices.

* **Indirect Drawing**

  Indirect drawing refers to draw commands that take their parameters from a GPU buffer.

  ```js
  pass.draw(vertexCount, instanceCount, firstVertex, firstInstance);  // direct
  pass.drawIndirect(someBuffer, offsetIntoSomeBuffer);                // indirect
  ```

  In the indirect case above, `someBuffer` is a 16 byte portion of a GPU buffer that holds
  `[vertexCount, instanceCount, firstVertex, firstInstance]`.

  The advantage to indirect draw is that you can have the GPU itself fill out the values.
  You can even have the GPU set `vertexCount` and/or `instanceCount` to zero when you
  don't want that thing to be drawn.

  Using indirect drawing, you could do things like, for example, passing all of the
  objects' bounding boxes or bounding spheres to the GPU and then have the GPU do
  frustum culling and if the object is inside the frustum it would update that
  object's indirect drawing parameters to be drawn, otherwise it would update them
  to not be drawn. "frustum culling" is a fancy way to say "check if the object
  is possibly inside the frustum of the camera. We talked about frustums in
  [the article on perspective projection](webgpu-persective-projection.html).

* **Render Bundles**

  Render bundles let you pre-record a bunch of command buffer commands and then
  request them to be executed later. This can be useful, especially if your
  scene is relatively static, meaning you don't need to add or remove objects
  later.

  There's a great article [here](https://toji.dev/webgpu-best-practices/render-bundles)
  that combines render bundles, indirect draws, GPU frustum culling, to show
  some ideas for getting more speed in specialized situations.


