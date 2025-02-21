Title: WebGPU Matrix Stacks
Description: Matrix Stacks
TOC: Matrix Stacks

This article is the 8th in a series of articles that will hopefully teach
you about 3D math. Each one builds on the previous lesson so you may find
them easiest to understand by reading them in order.

1. [Translation](webgpu-translation.html)
2. [Rotation](webgpu-rotation.html)
3. [Scaling](webgpu-scale.html)
4. [Matrix Math](webgpu-matrix-math.html)
5. [Orthographic Projection](webgpu-orthographic-projection.html)
6. [Perspective Projection](webgpu-perspective-projection.html)
7. [Cameras](webgpu-cameras.html)
8. [Matrix Stacks](webgpu-matrix-stacks.html) ⬅ you are here
9. [Scene Graphs](webgpu-scene-graphs.html)

A matrix stack is exactly what it sounds like, a [stack](https://en.wikipedia.org/wiki/Stack_(abstract_data_type)) of matrices.
It is useful for positioning and orientating things relative to each other.
To demonstrate, let's make a set of file cabinets. Using a matrix stack will make this easy.

To keep it simple we'll make them from cubes starting with
[the last example from the previous article](webgpu-cameras#a-aim-fs).

The first thing we'll do is swap the F we'be been drawing for a unit cube.

```js
-function createFVertices() {
+function createCubeVertices() {
*    // left
*    0, 0,  0,
*    0, 0, -1,
*    0, 1,  0,
*    0, 1, -1,
*
*    // right
*    1, 0,  0,
*    1, 0, -1,
*    1, 1,  0,
*    1, 1, -1,
*  ];
*
*  const indices = [
*     0,  2,  1,    2,  3,  1,   // left
*     4,  5,  6,    6,  5,  7,   // right
*     0,  4,  2,    2,  4,  6,   // front
*     1,  3,  5,    5,  3,  7,   // back
*     0,  1,  4,    4,  1,  5,   // bottom
*     2,  6,  3,    3,  6,  7,   // top
*  ];
*
*  const quadColors = [
*      200,  70, 120,  // left column front
*       80,  70, 200,  // left column back
*       70, 200, 210,  // top
*      160, 160, 220,  // top rung right
*       90, 130, 110,  // top rung bottom
*      200, 200,  70,  // between top and middle rung
*  ];

  ...
```

The data above makes a cube like this.

<div class="webgpu_center"><img src="resources/unit-cube.png" class="nobg"></div>

The old code pre-created 26 "objectsInfos" where each "objectInfo" was a set of
uniform buffer, and bindGroup, one for each thing we want to draw. Let's change
the code to instead create these on demand. That way we can just draw as many
things as we want.

```js
-  const numFs = 5 * 5 + 1;
  const objectInfos = [];
-  for (let i = 0; i < numFs; ++i) {
  function createObjectInfo() {
    // matrix
    const uniformBufferSize = (16) * 4;
    const uniformBuffer = device.createBuffer({
    
    ...

-    objectInfos.push({
+    return {
      uniformBuffer,
      uniformValues,
      matrixValue,
      bindGroup,
-    });
+    };
  }
```

We're going to be using the same unit cube for everything just to keep things
simple but we need some way to change the color a little so we can tell cubes
apart. So, let's update the fragment to take a color via our uniform buffer and
we'll multiply the vertex colors by this uniform color. That will let us
slightly change the vertex colors for each cube.

```wgsl
struct Uniforms {
  matrix: mat4x4f,
+  color: vec4f,
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
-  return vsOut.color;
+  return vsOut.color * uni.color;
}
```

We need to update the uniform buffer creation to
add space for the new color.

```js
  function createObjectInfo() {
-    // matrix
-    const uniformBufferSize = (16) * 4;
+    // matrix and color
+    const uniformBufferSize = (16 + 4) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;
+    const kColorOffset = 16;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
+    const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
      ],
    });

    return {
      uniformBuffer,
      uniformValues,
+      colorValue,
      matrixValue,
      bindGroup,
    };
  }
```

Now we need to extract the code that "draws" an object into a
function.

```js
  let depthTexture;
+  let objectNdx = 0;

+  function drawObject(ctx, matrix, color) {
+    const { pass, viewProjectionMatrix } = ctx;
+    if (objectNdx === objectInfos.length) {
+      objectInfos.push(createObjectInfo());
+    }
+    const {
+      matrixValue,
+      colorValue,
+      uniformBuffer,
+      uniformValues,
+      bindGroup,
+    } = objectInfos[objectNdx++];
+
+    mat4.multiply(viewProjectionMatrix, matrix, matrixValue);
+    colorValue.set(color);
+
+    // upload the uniform values to the uniform buffer
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(numVertices);
+  }

  function render() {
    ...

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);

-    // update target X,Z based on angle
-    settings.target[0] = Math.cos(settings.targetAngle) * radius;
-    settings.target[2] = Math.sin(settings.targetAngle) * radius;

    ...

+    objectNdx = 0;
-    objectInfos.forEach(({
-      matrixValue,
-      uniformBuffer,
-      uniformValues,
-      bindGroup,
-    }, i) => {
-      const deep = 5;
-      const across = 5;
-      if (i < 25) {
-        // compute grid positions
-        const gridX = i % across;
-        const gridZ = i / across | 0;
-
-        // compute 0 to 1 positions
-        const u = gridX / (across - 1);
-        const v = gridZ / (deep - 1);
-
-        // center and spread out
-        const x = (u - 0.5) * across * 150;
-        const z = (v - 0.5) * deep * 150;
-
-        // aim this F from it's position toward the target F
-        const aimMatrix = mat4.aim([x, 0, z], settings.target, up);
-        mat4.multiply(viewProjectionMatrix, aimMatrix, matrixValue);
-      } else {
-        mat4.translate(viewProjectionMatrix, settings.target, matrixValue);
-      }
-
-      // upload the uniform values to the uniform buffer
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(numVertices);
-    });

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

We added a function `drawObject` that will make a new "objectInfo" (a uniform
buffer, and typed array views) if it needs to. `drawObject` takes a context
called `ctx` that has the render pass encoder and the current
`viewProjectionMatrix`. It also takes a matrix and a color. It fills out the
uniform buffer for this object by multiplying the matrix passed in with the
`viewProjectionMatrix` and then sets the bind group to use that specific uniform
buffer and calls `draw`.

Now let's add some code to use it to draw the cube

```js
  function render() {

    ...

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);

    ...

    objectNdx = 0;
+    const ctx = { pass, viewProjectionMatrix };
+    drawObject(ctx, mat4.rotationY(settings.baseRotation), [1, 1, 1, 1]);

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}
```

Above we pass in a matrix that rotates around the y axis and the color white.
This means the cube will be drawn with its vertex colors unchanged.

We need a few more tweaks for the gui and camera

```js
-  const radius = 200;
  const settings = {
-    target: [0, 200, 300],
-    targetAngle: 0,
+    baseRotation: 0,
  };

  const radToDegOptions = { min: -360, max: 360, step: 1, converters: GUI.converters.radToDeg };

  const gui = new GUI();
  gui.onChange(render);
-  gui.add(settings.target, '1', -100, 300).name('target height');
-  gui.add(settings, 'targetAngle', radToDegOptions).name('target angle');
+  gui.add(settings, 'baseRotation', radToDegOptions);

  ...

  function render() {
    ...

-    const eye = [-500, 300, -500];
-    const target = [0, -100, 0];
+    const eye = [0, 2, 3];
+    const target = [0, 1, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

```

We have a cube.

{{{example url="../webgpu-matrix-stack-cube.html" }}}

Now that we are able to render cubes, lets use a matrix stack
to help us make a set of file cabinets.

First, lets make a matrix stack class.

```js
class MatrixStack {
  #matrix;
  #stack;

  constructor() {
    this.reset();
  }
  reset() {
    this.#matrix = mat4.identity();
    this.#stack = [];
    return this;
  }
  save() {
    this.#stack.push(this.#matrix);
    this.#matrix = mat4.copy(this.#matrix);
    return this;
  }
  restore() {
    this.#matrix = this.#stack.pop();
    return this;
  }
  get() {
    return this.#matrix;
  }
  set(matrix) {
    return this.#matrix.set(matrix);
  }
  translate(translation) {
    mat4.translate(this.#matrix, translation, this.#matrix);
    return this;
  }
  rotateX(angle) {
    mat4.rotateX(this.#matrix, angle, this.#matrix);
    return this;
  }
  rotateY(angle) {
    mat4.rotateY(this.#matrix, angle, this.#matrix);
    return this;
  }
  rotateZ(angle) {
    mat4.rotateZ(this.#matrix, angle, this.#matrix);
    return this;
  }
  scale(scale) {
    mat4.scale(this.#matrix, scale, this.#matrix);
    return this;
  }
}
```

The class above is pretty straight forward. It keeps a `#stack` which is
an array of matrices. And, it keeps a `#matrix` which is effectively
the top matrix on the stack.

It adds a bunch of methods that use the `mat4` functions
[we wrote previously](webgpu-orthograph-projection.html)
to manipulate the matrix at the top of the stack.

Note: It's a stack but I choose the names `save` and `restore` instead of
the more traditional `push` and `pop` because `save` and `restore` match
the functions from the Canvas 2D API's
[save](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save) and
[restore](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/restore)
which are used to manipulate its own matrix stack.

One thing we referenced above that didn't exist yet is a `mat4.copy` function
so let's supply that.

```js
const mat4 = {
+  copy(src, dst) {
+    dst = dst || new Float32Array(16);
+    dst.set(src);
+    return dst;
+  },

  ...
```

With that, let's draw a single filing cabinet drawer with a handle.
The drawer will be a large cube. The handle will be a small
cube.

```js
+  const kHandleColor = [0.5, 0.5, 0.5, 1];
+  const kDrawerColor = [1, 1, 1, 1];
+
+  const kDrawerSize = [40, 30, 50];
+  const kHandleSize = [10, 2, 2];
+
+  const [kWidth, kHeight, kDepth] = [0, 1, 2];
+
+  const kHandlePosition = [
+    (kDrawerSize[kWidth] - kHandleSize[kWidth]) / 2,
+    kDrawerSize[kHeight] * 2 / 3,
+    kHandleSize[kDepth],
+  ];
+
+  function drawDrawer(ctx) {
+    const { stack } = ctx;
+    stack.save();
+      stack.scale(kDrawerSize);
+      drawObject(ctx, stack.get(), kDrawerColor);
+    stack.restore();
+
+    stack.save();
+      stack.translate(kHandlePosition);
+      stack.scale(kHandleSize);
+      drawObject(ctx, stack.get(), kHandleColor);
+    stack.restore();
+  }
+
+  const stack = new MatrixStack();

  ...

  function render() {
    ...

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

+    stack.save();
+    stack.rotateY(settings.baseRotation);
+    stack.translate([(kDrawerSize[kWidth] * -0.5), 0, 0]);
    objectNdx = 0;
-    const ctx = { pass, stack, viewProjectionMatrix };
-    drawObject(ctx, mat4.rotationY(settings.baseRotation), [1, 1, 1, 1]);
+    const ctx = { stack, viewProjectionMatrix };
+    drawDrawer(ctx);
+    stack.restore();

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

The code above creates a `MatrixStack` and adds it to the
context (ctx) passed into `drawDrawer`. It uses this to
help us compute matrices. Instead of creating a rotation
matrix directly, we do it on the stack, then translate
half the width of the drawer so as to center it.

We pass the stack into `drawDrawer` which draws 2 cubes.
One it scales to the size of `kDrawerSize`. The other it
positions to `kHandlePosition` and scales to the size of
`kHandleSize`. Because it's using the matrix stack, both
will be relative to the rotation and translation already
on the stack.

The drawer cube is drawn with color `kDrawerColor`, which is
white, and so will leave the vertex colors unchanged. 
The handle is drawn with color `kHandleColor`, which is 50% gray,
and so will draw the cube darker.

A minor tweak for the camera position:

```js
-    const eye = [0, 2, 3];
-    const target = [0, 1, 0];
+    const eye = [0, 20, 100];
+    const target = [0, 20, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);
```

That gives us a filing cabinet drawer.

{{{example url="../webgpu-matrix-stack-filing-drawer.html"}}}

You might be asking, why go through all this trouble of a
matrix stack? Let's draw a filing cabinet with 4 draws and
we'll see why.

```js
  const kHandleColor = [0.5, 0.5, 0.5, 1];
  const kDrawerColor = [1, 1, 1, 1];
+  const kCabinetColor = [0.75, 0.75, 0.75, 0.75];
+  const kNumDrawersPerCabinet = 4;

  const kDrawerSize = [40, 30, 50];
  const kHandleSize = [10, 2, 2];

  const [kWidth, kHeight, kDepth] = [0, 1, 2];

  const kHandlePosition = [
    (kDrawerSize[kWidth] - kHandleSize[kWidth]) / 2,
    kDrawerSize[kHeight] * 2 / 3,
    kHandleSize[kDepth],
  ];

+  const kDrawerSpacing = kDrawerSize[kHeight] + 3;

  function drawDrawer(ctx) {
    const { stack } = ctx;
    stack.save();
      stack.scale(kDrawerSize);
      drawObject(ctx, stack.get(), kDrawerColor);
    stack.restore();

    stack.save();
      stack.translate(kHandlePosition);
      stack.scale(kHandleSize);
      drawObject(ctx, stack.get(), kHandleColor);
    stack.restore();
  }

+  function drawCabinet(ctx, numDrawersPerCabinet) {
+    const { stack } = ctx;
+
+    const kCabinetSize = [
+      kDrawerSize[kWidth] + 6,
+      kDrawerSpacing * numDrawersPerCabinet + 6,
+      kDrawerSize[kDepth] + 4,
+    ];
+
+    stack.save();
+      stack.scale(kCabinetSize);
+      drawObject(ctx, stack.get(), kCabinetColor);
+    stack.restore();
+
+    for (let i = 0; i < numDrawersPerCabinet; ++i) {
+      stack.save();
+        stack.translate([3, i * kDrawerSpacing + 5, 1]);
+        drawDrawer(ctx);
+      stack.restore();
+    }
+  }

  function render() {
    ...
-    const eye = [0, 20, 100];
-    const target = [0, 20, 0];
+    const eye = [0, 80, 200];
+    const target = [0, 80, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    stack.save();
    stack.rotateY(settings.baseRotation);
    stack.translate([(kDrawerSize[kWidth] * -0.5), 0, 0]);
    objectNdx = 0;
    const ctx = { pass, stack, viewProjectionMatrix };
-    drawDrawer(ctx);
+    drawCabinet(ctx, kNumDrawersPerCabinet);
    stack.restore();

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

```

Above, `drawCabinet` draws a cube the size of
`kCabinetSize` which is slightly taller than the number
of cabinets we ask it to draw.

It then just uses the matrix stack to translate each
drawer to appears at the correct position and slightly
in front of the cabinet cube.

{{{example url="../webgpu-matrix-stack-filing-cabinet.html"}}}

We didn't have to change `drawDrawer` at all. Because of
the matrix stack we were able to just use it as is.

Let's keep going. Let's draw multiple cabinets.

```js
  const kHandleColor = [0.5, 0.5, 0.5, 1];
  const kDrawerColor = [1, 1, 1, 1];
  const kCabinetColor = [0.75, 0.75, 0.75, 0.75];
  const kNumDrawersPerCabinet = 4;
+  const kNumCabinets = 5;

  const kDrawerSize = [40, 30, 50];
  const kHandleSize = [10, 2, 2];

  const [kWidth, kHeight, kDepth] = [0, 1, 2];

  const kHandlePosition = [
    (kDrawerSize[kWidth] - kHandleSize[kWidth]) / 2,
    kDrawerSize[kHeight] * 2 / 3,
    kHandleSize[kDepth],
  ];

  const kDrawerSpacing = kDrawerSize[kHeight] + 3;
+  const kCabinetSpacing = kDrawerSize[kWidth] + 10;

  ...

  function drawCabinet(ctx, numDrawersPerCabinet) {
    const { stack } = ctx;

    const kCabinetSize = [
      kDrawerSize[kWidth] + 6,
      kDrawerSpacing * numDrawersPerCabinet + 6,
      kDrawerSize[kDepth] + 4,
    ];

    stack.save();
      stack.scale(kCabinetSize);
      drawObject(ctx, stack.get(), kCabinetColor);
    stack.restore();

    for (let i = 0; i < numDrawersPerCabinet; ++i) {
      stack.save();
        stack.translate([3, i * kDrawerSpacing + 5, 1]);
        drawDrawer(ctx);
      stack.restore();
    }
  }

+  function drawCabinets(ctx, numCabinets) {
+    const { stack } = ctx;
+    for (let i = 0; i < numCabinets; ++i) {
+      stack.save();
+        stack.translate([i * kCabinetSpacing, 0, 0]);
+        drawCabinet(ctx, kNumDrawersPerCabinet);
+      stack.restore();
+    }
+  }

  function render() {
    ...
    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    stack.save();
    stack.rotateY(settings.baseRotation);
-    stack.translate([(kDrawerSize[kWidth] * -0.5), 0, 0]);
+    stack.translate([(kNumCabinets - 0.5) * kCabinetSpacing * -0.5, 0, 0]);
    objectNdx = 0;
    const ctx = { pass, stack, viewProjectionMatrix };
-    drawCabinet(ctx, kNumDrawersPerCabinet);
+    drawCabinets(ctx, kNumCabinets);
    stack.restore();

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

```

Now we have `drawCabinets` that just uses `drawCabinet`
to draw however many cabinets we specify.

Back out in `render` we translate half the width of the
cabinets to center them.

{{{example url="../webgpu-matrix-stack-filing-cabinets.html"}}}

Hopefully this gives some idea of the usefulness of a matrix
stack. It lets us easily re-use things and/or position, orient,
and scale them.

## <a id="a-recursive-tree"></a> Recursive Tree

Let's make another example. Let's create a recursive tree out
of cubes. To do this we need a function that will add a "branch" of the
tree. We'll make it recursive and pass in `treeDepth`. If the
depth is > 0 then we will recursively add 2 more branches and pass
in one lower depth.

```js
  const degToRad = d => d * Math.PI / 180;

  const settings = {
    baseRotation: 0,
+    scale: 0.9,
+    rotationX: degToRad(20),
+    rotationY: degToRad(10),
  };

  const radToDegOptions = { min: -180, max: 180, step: 1, converters: GUI.converters.radToDeg };
+  const treeRadToDegOptions = { min: 0, max: 90, step: 1, converters: GUI.converters.radToDeg };

  const gui = new GUI();
  gui.onChange(render);
+  gui.add(settings, 'scale', 0.1, 1.2);
+  gui.add(settings, 'rotationX', treeRadToDegOptions);
+  gui.add(settings, 'rotationY', treeRadToDegOptions);
  gui.add(settings, 'baseRotation', radToDegOptions);

+  const kTreeDepth = 6;
+  const [/*kWidth*/, kHeight, /*kDepth*/] = [0, 1, 2];
+  // Moves the 1 unit cube so it's center above the origin so that when it scales
+  // it scales out in x and z and up (y) from the origin
+  const kBranchPosition = [-0.5, 0, 0.5];
+  const kBranchSize = [20, 150, 20];
+
+  const kWhite = [1, 1, 1, 1];
+
+  function drawBranch(ctx) {
+    const { stack } = ctx;
+    stack
+      .save()
+      .scale(kBranchSize)
+      .translate(kBranchPosition);
+    drawObject(ctx, stack.get(), kWhite);
+    stack.restore();
+  }
+
+  function drawTreeLevel(ctx, offset, treeDepth) {
+    const { stack } = ctx;
+    const s = offset ? settings.scale : 1;
+    const y = offset ? kBranchSize[kHeight] : 0;
+    stack
+      .save()
+      .translate([0, y, 0])
+      .rotateZ(offset * settings.rotationX)
+      .rotateY(Math.abs(offset) * settings.rotationY)
+      .scale([s, s, s]);
+
+    drawBranch(ctx);
+
+    if (treeDepth > 0) {
+      drawTreeLevel(ctx, -1, treeDepth - 1);
+      drawTreeLevel(ctx, +1, treeDepth - 1);
+    }
+
+    stack.restore();
+  }

  function render() {
    ...

-    const eye = [0, 80, 200];
-    const target = [0, 80, 0];
+    const eye = [0, 450, 1000];
+    const target = [0, 450, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    stack.save();
    stack.rotateY(settings.baseRotation);
-    stack.translate([(kNumCabinets - 0.5) * kCabinetSpacing * -0.5, 0, 0]);
    objectNdx = 0;
    const ctx = { pass, stack, viewProjectionMatrix };
-    drawCabinets(ctx, kNumCabinets);
+    drawTreeLevel(ctx, 0, kTreeDepth);
    stack.restore();

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

```

`drawTreeLevel` uses our matrix stack. First it calls `save` to save the current
matrix. Then `translate`s it to move the branch to the end of the current
branch. If the `offset` is `0` it's the root so no translation needed.

The `offset` is then used to `rotateZ` the current branch either clockwise or
counter-clockwise. Because of the matrix stack it will be rotated relative to
the parent branch.

The `offset` is used again to `rotateY` the branch. This time we use the
absolute value of `offset`. Feel free to remove the `Math.abs` so see the
difference.

Finally we `scale` the branch, making each one smaller (or larger) than its
parent, except for the root, the branch with an `offset` of `0`.

We then call `drawBranch`. Draw branch draws a cube that is `kBranchSize` big.
It also translates the original unit cube so that the cube will be centered over
and above the origin. That way, when it scales, it will grow up (along the +Y
axis).

Then, if the depth > 0 we recursively call `drawTreeLevel` to add 2 more
branches. One with an offset of `-1` and one with `+1`. Each branch will start
with the matrix on the stack and so will be positioned and oriented relative
to its parent.

Finally we `restore` the stack. 

{{{example url="../webgpu-matrix-stack-tree.html"}}}

Adjust "rotationX" and you'll see the branches fan out or bunch up.
Adjust "rotationY" and you'll see the branches spread out from the x-plane.
You may need to adjust "baseRotation" to see what's happening.
Adjust "scale" and you'll see each branch get smaller or larger than its
parent.

Maybe this could give you some inspiration to make an algorithmic tree generator. [^tree-gen]

[^tree-gen]: It would likely not be normal to generate a tree from individual
cubes or cylinders. The technique of recursion and a matrix stack would be used
but instead of drawing cubes we'd use the matrices to help generate vertices and
build a single mesh for the entire tree.

Let's add an ornament to each branch. Instead of using a cube, let's use a cone
for the ornament. Here's some code to generate cone vertices.

```js
// tip is at origin, base is below
function createConeVertices({radius = 1, height = 1, subdivisions = 6} = {}) {
  const positions = [];
  const colors = [];

  function addVertex(angle, radius, height, color) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    positions.push(c * radius, height, s * radius);
    colors.push(...color);
  }

  for (let i = 0; i < subdivisions; ++i) {
    const angle0 = (i + 0) / subdivisions * Math.PI * 2;
    const angle1 = (i + 1) / subdivisions * Math.PI * 2;

    const u = (i + 1) / subdivisions;
    const color = [u * 128 + 127, 0, 0];

    // add side
    addVertex(angle0, 0, 0, color);
    addVertex(angle1, radius, -height, color);
    addVertex(angle0, radius, -height, color);

    // add top
    addVertex(angle0, radius, -height, color);
    addVertex(angle1, radius, -height, color);
    addVertex(angle0, 0, -height, color);
  }

  const numVertices = positions.length / 3;
  const vertexData = new Float32Array(numVertices * 4); // xyz + color
  const colorData = new Uint8Array(vertexData.buffer);

  for (let i = 0; i < numVertices; ++i) {
    const position = positions.slice(i * 3, i * 3 + 3);
    vertexData.set(position, i * 4);

    const color = colors.slice(i * 3, i * 3 + 3);
    colorData.set(color, i * 16 + 12);
    colorData[i * 16 + 15] = 255;
  }

  return {
    vertexData,
    numVertices,
  };
}
```

The code above walks around a circle and adds a triangle on each side and a
corresponding triangle on top. It sets each face to a shade of red. Like the
cube function it returns `vertexData` and `numVertices`. We'll go over [making
various geometric primitives in another article](webgpu-primitives.html).

Let's wrap our code that makes a vertex buffer into a function so we can call it
twice, once for the cube and once for the cone.

```js
-  const { vertexData, numVertices } = createCubeVertices();

+  function createVertices({vertexData, numVertices}, name) {
*    const vertexBuffer = device.createBuffer({
-      label: `vertex buffer vertices`,
+      label: `${name}: vertex buffer vertices`,
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
+    return {
+      vertexBuffer,
+      numVertices,
+    };
*  }

+  const cubeVertices = createVertices(createCubeVertices(), 'cube');
+  const ornamentVertices = createVertices(createConeVertices({
+    radius: 20,
+    height: 60,
+  }), 'ornament');
```

Then let's update are `drawObject` function to take a vertices parameter.

```js
-  function drawObject(ctx, matrix, color) {
+  function drawObject(ctx, vertices, matrix, color) {
    const { pass, viewProjectionMatrix } = ctx;
+    const { vertexBuffer, numVertices } = vertices;
    if (objectNdx === objectInfos.length) {
      objectInfos.push(createObjectInfo());
    }
    const {
      matrixValue,
      colorValue,
      uniformBuffer,
      uniformValues,
      bindGroup,
    } = objectInfos[objectNdx++];

    mat4.multiply(viewProjectionMatrix, matrix, matrixValue);
    colorValue.set(color);

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

+    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices);
  }
```

and update the code that draws a branch to pass in the cube vertices

```js
  function drawBranch(ctx) {
    const { stack } = ctx;
    stack
      .save()
      .scale(kBranchSize)
      .translate(kBranchPosition);
-    drawObject(ctx, stack.get(), kWhite);
+    drawObject(ctx, cubeVertices, stack.get(), kWhite);
    stack.restore();
  }
```

And we no longer need to set the vertex buffer early.

```js
  function render() {

    ...
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
-    pass.setVertexBuffer(0, vertexBuffer);

    ...
```

And then, let's add some code to `drawTreeLevel` to draw an ornament when
depth equals zero.

```js
  function drawTreeLevel(ctx, offset, treeDepth) {
    const { stack } = ctx;
    const s = offset ? settings.scale : 1;
    const y = offset ? kBranchSize[kHeight] : 0;
    stack
      .save()
      .translate([0, y, 0])
      .rotateZ(offset * settings.rotationX)
      .rotateY(Math.abs(offset) * settings.rotationY)
      .scale([s, s, s]);

    drawBranch(ctx);

    if (treeDepth > 0) {
      drawTreeLevel(ctx, -1, treeDepth - 1);
      drawTreeLevel(ctx, +1, treeDepth - 1);
    }

+    if (treeDepth === 0 && offset > 0) {
+      const position = vec3.getTranslation(stack.get());
+      drawObject(ctx, ornamentVertices, mat4.translation(position), kWhite);
+    }

    stack.restore();
  }
```

We're using a function `vec3.getTranslation` which we need to supply.

```js
const vec3 = {
  ...
  getTranslation(m, dst) {
    dst = dst || new Float32Array(3);

    dst[0] = m[12];
    dst[1] = m[13];
    dst[2] = m[14];

    return dst;
  },
};
```

`getTranslation` gets the current translation from a matrix like we covered in
[the article on 3d math](webgpu-orthographic-projection.html).

Above, the code we added to draw an ornament, calls `getTranslation` to get the
current translation of the matrix stack. This will be the base of the last
branch. We can not just draw an ornament directly from the matrix stack because
it would be oriented and scaled with the branch and we want the ornaments to
hang down. So, instead, we get the current translation from the stack and then
pass in a matrix with that translation. Because the translation is at the base
of the branch we only need to draw one which is why we only draw if `offset >
0`. Otherwise we'd draw 2 ornaments at the exact same location.

{{{example url="../webgpu-matrix-stack-tree-with-ornaments.html"}}}

Next Up, [Scene graphs](webgpu-scene-graphs.html).

