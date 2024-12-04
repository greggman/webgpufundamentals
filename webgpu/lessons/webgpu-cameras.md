Title: WebGPU Cameras
Description: Cameras via Matrices
TOC: Cameras

This article is the 7th in a series of articles that will hopefully teach
you about 3D math. Each one builds on the previous lesson so you may find
them easiest to understand by reading them in order.

1. [Translation](webgpu-translation.html)
2. [Rotation](webgpu-rotation.html)
3. [Scaling](webgpu-scale.html)
4. [Matrix Math](webgpu-matrix-math.html)
5. [Orthographic Projection](webgpu-orthographic-projection.html)
6. [Perspective Projection](webgpu-perspective-projection.html)
7. [Cameras](webgpu-cameras.html) ⬅ you are here
8. [Matrix Stacks](webgpu-matrix-stacks.html)
9. [Scene Graphs](webgpu-scene-graphs.html)


In the last post we had to move the F in front of the frustum because the
`mat4.perspective` function puts the eye at at the origin (0, 0, 0) and
that objects in the frustum are between `-zNear` to `-zFar` in front of it.
This means, anything we want to appear, needs to be placed this this space.

In the real world you usually move your camera to take a picture of a
some object

<div class="webgpu_center" style="width: 512px">
   <div data-diagram="move-camera"></div>
   <div class="caption">moving the camera to the objects</div>
</div>

But, in our last post, we came up with a projection matrix that requires things to
be in front of the origin on the -Z axis.  To achieve this, what we want to
do is, move the camera to the origin and move everything else the right
amount so it's still in the same place *relative to the camera*.

<div class="webgpu_center" style="width: 512px">
   <div data-diagram="move-world"></div>
   <div class="caption">moving the objects to the view</div>
</div>

We need to effectively move the world in front of the camera.  The easiest way
to do this is to use an "inverse" matrix.  The math to compute an inverse matrix
in the general case is complex but conceptually it's easy. The inverse is the
value you'd use to negate some other value.  For example, the inverse of a
matrix that translates in X by 123 is a matrix that translates in X by -123.
The inverse of a matrix that scales by 5 is a matrix that scales by 1/5th or
0.2.  The inverse of a matrix that rotates 30&deg; around the X axis would be
one that rotates -30&deg; around the X axis.

Up until this point we've used translation, rotation and scale to affect the
position and orientation of our 'F'.  After multiplying all the matrices
together we have a single matrix that represents how to move the 'F' from the
origin to the place, size and orientation we want it.  We can do the same for a
camera.  Once we have the matrix that tells us how to move and rotate the camera
from the origin to where we want it we can compute its inverse which will give
us a matrix that tells us how to move and rotate everything else the opposite
amount which will effectively make it so the camera is at (0, 0, 0) and we've
moved everything in front of it.

Let's make a 3D scene with a circle of 'F's like the diagrams above.

First things first, lets adjust our F vertex data. We originally started in 2D
with pixels. The top left corner of the F is at 0,0 and extends 100 pixels right
and 150 pixels down. "Pixels" probably make no sense as a unit in 3D and the
perspective projection matrix we made uses positive Y up so, let's flip our F so
positive Y is up and let's center it around the origin.

```js
  const positions = [
-    // left column
-    0, 0, 0,
-    30, 0, 0,
-    0, 150, 0,
-    30, 150, 0,
-
-    // top rung
-    30, 0, 0,
-    100, 0, 0,
-    30, 30, 0,
-    100, 30, 0,
-
-    // middle rung
-    30, 60, 0,
-    70, 60, 0,
-    30, 90, 0,
-    70, 90, 0,
-
-    // left column back
-    0, 0, 30,
-    30, 0, 30,
-    0, 150, 30,
-    30, 150, 30,
-
-    // top rung back
-    30, 0, 30,
-    100, 0, 30,
-    30, 30, 30,
-    100, 30, 30,
-
-    // middle rung back
-    30, 60, 30,
-    70, 60, 30,
-    30, 90, 30,
-    70, 90, 30,
+    // left column
+     -50,  75,  15,
+     -20,  75,  15,
+     -50, -75,  15,
+     -20, -75,  15,
+
+    // top rung
+     -20,  75,  15,
+      50,  75,  15,
+     -20,  45,  15,
+      50,  45,  15,
+
+    // middle rung
+     -20,  15,  15,
+      20,  15,  15,
+     -20, -15,  15,
+      20, -15,  15,
+
+    // left column back
+     -50,  75, -15,
+     -20,  75, -15,
+     -50, -75, -15,
+     -20, -75, -15,
+
+    // top rung back
+     -20,  75, -15,
+      50,  75, -15,
+     -20,  45, -15,
+      50,  45, -15,
+
+    // middle rung back
+     -20,  15, -15,
+      20,  15, -15,
+     -20, -15, -15,
+      20, -15, -15,
  ];
```

Further, as we went over in
[the previous article](webgpu-perspective-projection.html),
because we were using positive Y = down to match most 2D pixel libraries, we had
our triangle vertex order backward for normal 3D and ended up culling the the
`'front'` facing triangles instead of the normal `'back'` facing triangles since
were scaling Y by negative 1. Now that we're doing *normal* 3D with positive Y =
up, let's flip the order of the vertices so that clockwise triangles are facing
out.

```js
  const indices = [
-     0,  1,  2,    2,  1,  3,  // left column
-     4,  5,  6,    6,  5,  7,  // top run
-     8,  9, 10,   10,  9, 11,  // middle run
-
-    12, 14, 13,   14, 15, 13,  // left column back
-    16, 18, 17,   18, 19, 17,  // top run back
-    20, 22, 21,   22, 23, 21,  // middle run back
-
-     0, 12,  5,   12, 17,  5,   // top
-     5, 17,  7,   17, 19,  7,   // top rung right
-     6,  7, 18,   18,  7, 19,   // top rung bottom
-     6, 18,  8,   18, 20,  8,   // between top and middle rung
-     8, 20,  9,   20, 21,  9,   // middle rung top
-     9, 21, 11,   21, 23, 11,   // middle rung right
-    10, 11, 22,   22, 11, 23,   // middle rung bottom
-    10, 22,  3,   22, 15,  3,   // stem right
-     2,  3, 14,   14,  3, 15,   // bottom
-     0,  2, 12,   12,  2, 14,   // left
+     0,  2,  1,    2,  3,  1,   // left column
+     4,  6,  5,    6,  7,  5,   // top run
+     8, 10,  9,   10, 11,  9,   // middle run
+
+    12, 13, 14,   14, 13, 15,   // left column back
+    16, 17, 18,   18, 17, 19,   // top run back
+    20, 21, 22,   22, 21, 23,   // middle run back
+
+     0,  5, 12,   12,  5, 17,   // top
+     5,  7, 17,   17,  7, 19,   // top rung right
+     6, 18,  7,   18, 19,  7,   // top rung bottom
+     6,  8, 18,   18,  8, 20,   // between top and middle rung
+     8,  9, 20,   20,  9, 21,   // middle rung top
+     9, 11, 21,   21, 11, 23,   // middle rung right
+    10, 22, 11,   22, 23, 11,   // middle rung bottom
+    10,  3, 22,   22,  3, 15,   // stem right
+     2, 14,  3,   14, 15,  3,   // bottom
+     0, 12,  2,   12, 14,  2,   // left
  ];
```

Finally let's set the `cullMode` to cull *back facing* triangles.

```js
  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
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
      targets: [{ format: presentationFormat }],
    },
    primitive: {
-      cullMode: 'front',  // note: uncommon setting. See article
+      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });
```

Here's a function that given a matrix will compute its inverse matrix.

```js
const mat4 = {
  ...

+  inverse(m, dst) {
+    dst = dst || new Float32Array(16);
+
+    const m00 = m[0 * 4 + 0];
+    const m01 = m[0 * 4 + 1];
+    const m02 = m[0 * 4 + 2];
+    const m03 = m[0 * 4 + 3];
+    const m10 = m[1 * 4 + 0];
+    const m11 = m[1 * 4 + 1];
+    const m12 = m[1 * 4 + 2];
+    const m13 = m[1 * 4 + 3];
+    const m20 = m[2 * 4 + 0];
+    const m21 = m[2 * 4 + 1];
+    const m22 = m[2 * 4 + 2];
+    const m23 = m[2 * 4 + 3];
+    const m30 = m[3 * 4 + 0];
+    const m31 = m[3 * 4 + 1];
+    const m32 = m[3 * 4 + 2];
+    const m33 = m[3 * 4 + 3];
+
+    const tmp0 = m22 * m33;
+    const tmp1 = m32 * m23;
+    const tmp2 = m12 * m33;
+    const tmp3 = m32 * m13;
+    const tmp4 = m12 * m23;
+    const tmp5 = m22 * m13;
+    const tmp6 = m02 * m33;
+    const tmp7 = m32 * m03;
+    const tmp8 = m02 * m23;
+    const tmp9 = m22 * m03;
+    const tmp10 = m02 * m13;
+    const tmp11 = m12 * m03;
+    const tmp12 = m20 * m31;
+    const tmp13 = m30 * m21;
+    const tmp14 = m10 * m31;
+    const tmp15 = m30 * m11;
+    const tmp16 = m10 * m21;
+    const tmp17 = m20 * m11;
+    const tmp18 = m00 * m31;
+    const tmp19 = m30 * m01;
+    const tmp20 = m00 * m21;
+    const tmp21 = m20 * m01;
+    const tmp22 = m00 * m11;
+    const tmp23 = m10 * m01;
+
+    const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
+               (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
+    const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
+               (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
+    const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
+               (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
+    const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
+               (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
+
+    const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
+
+    dst[0] = d * t0;
+    dst[1] = d * t1;
+    dst[2] = d * t2;
+    dst[3] = d * t3;
+
+    dst[4] = d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
+                  (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
+    dst[5] = d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
+                  (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
+    dst[6] = d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
+                  (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
+    dst[7] = d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
+                  (tmp5 * m00 + tmp8 * m10 + tmp11 * m20));
+
+    dst[8] = d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
+                  (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
+    dst[9] = d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
+                  (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
+    dst[10] = d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
+                   (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
+    dst[11] = d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
+                   (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));
+
+    dst[12] = d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
+                   (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
+    dst[13] = d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
+                   (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
+    dst[14] = d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
+                   (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
+    dst[15] = d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
+                   (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
+    return dst;
+  },
...
```

Like we've done in previous examples, to draw 5 things we need 5
uniform buffers and 5 bind groups.

```js
+  const numFs = 5;
+  const objectInfos = [];
+  for (let i = 0; i < numFs; ++i) {
    // matrix
    const uniformBufferSize = (16) * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;

    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
      ],
    });

+    objectInfos.push({
+      uniformBuffer,
+      uniformValues,
+      matrixValue,
+      bindGroup,
+    });
+  }
```

Let's get rid of some of the settings to unclutter our example

```js
  const settings = {
    fieldOfView: degToRad(100),
-    translation: [-65, 0, -120],
-    rotation: [degToRad(220), degToRad(25), degToRad(325)],
-    scale: [1, 1, 1],
  };

  ...

-      mat4.translate(matrixValue, settings.translation, matrixValue);
-      mat4.rotateX(matrixValue, settings.rotation[0], matrixValue);
-      mat4.rotateY(matrixValue, settings.rotation[1], matrixValue);
-      mat4.rotateZ(matrixValue, settings.rotation[2], matrixValue);
-      mat4.scale(matrixValue, settings.scale, matrixValue);
```

Because we are drawing 5 things and they will all use the same
projection matrix we'll calculate it before the loop of drawing the Fs

```js
  function render() {
    ...

    const aspect = canvas.clientWidth / canvas.clientHeight;
-    mat4.perspective(
+    const projection = mat4.perspective(
        settings.fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
-        matrixValue,
    );
```

Next we'll compute a camera matrix. This matrix represents the
position and orientation of the camera in the world.  The code
below makes a matrix that rotates the camera around the origin
radius * 1.5 distance out and looking at the origin.

<div class="webgpu_center" style="width: 512px">
   <div data-diagram="camera-movement"></div>
   <div class="caption">camera movement</div>
</div>

```js
+  const radius = 200;
  const settings = {
    fieldOfView: degToRad(100),
+    cameraAngle: 0,
  };

  ...

  function render() {

     ...
 

+    // compute a matrix for the camera.
+    const cameraMatrix = mat4.rotationY(settings.cameraAngle);
+    mat4.translate(cameraMatrix, [0, 0, radius * 1.5], cameraMatrix);
```

We then compute a "view matrix" from the camera matrix.  A "view matrix"
is the matrix that moves everything the opposite of the camera effectively
making everything relative to the camera as though the camera was at the
origin (0,0,0). We can do this by using the `inverse` function that computes
the inverse matrix (the matrix that does the exact opposite of the supplied matrix).
In this case the supplied matrix would move the camera to some position
and orientation relative to the origin. The inverse of that is a matrix
that will move everything else such that the camera is at the origin.

```js
    // Make a view matrix from the camera matrix.
    const viewMatrix = mat4.inverse(cameraMatrix);
```

Now we combine the view and projection matrix into a view projection matrix.

```js
+    // combine the view and projection matrixes
+    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
```

Finally we draw a circle of Fs. For each F we start with the
view projection matrix, then compute a position on a circle and
translate to that position.

```js
  function render() {
    ...

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        settings.fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    // compute a matrix for the camera.
    const cameraMatrix = mat4.rotationY(settings.cameraAngle);
    mat4.translate(cameraMatrix, [0, 0, radius * 1.5], cameraMatrix);

    // Make a view matrix from the camera matrix.
    const viewMatrix = mat4.inverse(cameraMatrix);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

+    objectInfos.forEach(({
+      matrixValue,
+      uniformBuffer,
+      uniformValues,
+      bindGroup,
+    }, i) => {
+      const angle = i / numFs * Math.PI * 2;
+      const x = Math.cos(angle) * radius;
+      const z = Math.sin(angle) * radius;

+      mat4.translate(viewProjectionMatrix, [x, 0, z], matrixValue);

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(numVertices);
+    });
```

And voila!  A camera that goes around the circle of 'F's.  Drag the
`cameraAngle` slider to move the camera around.

{{{example url="../webgpu-cameras-step-1-direct-math.html" }}}

That's all fine but using rotate and translate to move a camera where you
want it and point toward what you want to see is not always easy.  For
example if we wanted the camera to always point at a specific one of the
'F's it would take some pretty crazy math to compute how to rotate the
camera to point at that 'F' while it goes around the circle of 'F's.

Fortunately there's an easier way.  We can just decide where we want the
camera and what we want it to point at and then compute a matrix that will
put the camera there.  Based on how matrices work this is surprisingly
easy.

First we need to know where we want the camera.  We'll call this the
`eye`.  Then we need to know the position of the thing we want
to look at or aim at.  We'll call it the `target`.  If we subtract the
`target` from the `eye` we'll have a vector that points in the
direction we'd need to go from the camera to get to the target.  Let's
call it `zAxis`.  Since we know the camera points in the -Z direction we
can subtract the other way `eye - target`. We normalize the
results and copy it directly into the `z` part of a matrix.

<div class="webgpu_center">
  <div class="glocal-center">
    <table class="glocal-center-content glocal-mat">
      <tr>
        <td class="m11"> </td>
        <td class="m12"> </td>
        <td class="m13">Zx</td>
        <td class="m14"> </td>
      </tr>
      <tr>
        <td class="m21"> </td>
        <td class="m22"> </td>
        <td class="m23">Zy</td>
        <td class="m24"> </td>
      </tr>
      <tr>
        <td class="m31"> </td>
        <td class="m32"> </td>
        <td class="m33">Zz</td>
        <td class="m34"> </td>
      </tr>
      <tr>
        <td class="m41"> </td>
        <td class="m42"> </td>
        <td class="m43"> </td>
        <td class="m44"> </td>
      </tr>
    </table>
  </div>
</div>

This part of a matrix represents the Z axis.  In this case the Z-axis of
the camera.  Normalizing a vector means making it a vector that represents
1.0 unit.  If you go back to [the rotation article](webgpu-rotation.html)
where we talked about unit circles and how those helped with 2D rotation.
In 3D we need unit spheres and a normalized vector represents a point on a
unit sphere.

<div class="webgpu_center" style="width: 768px">
  <div data-diagram="cross-product-00"></div>
  <div class="caption">the <span class='z-axis'>z axis</span></div>
</div>

That's not enough info though.  Just a single vector gives us a point on a
unit sphere but which orientation from that point to orient things?  We
need to fill out the other parts of the matrix.  Specifically the X axis
and Y axis parts.  We know that in general, these 3 parts are perpendicular
to each other.  We also know that "in general", we don't point the camera
straight up.  Given that, if we know which way is up, in this case
(0,1,0), We can use that and something called a "cross product" to compute
the X axis and Y axis for the matrix.

I have no idea what a cross product means in mathematical terms.  What I
do know is that, if you have 2 unit vectors and you compute the cross
product of them you'll get a vector that is perpendicular to those 2
vectors.  In other words, if you have a vector pointing south east, and a
vector pointing up, and you compute the cross product you'll get a vector
pointing either south west or north east since those are the 2 vectors
that are perpendicular to south east and up.  Depending on which order you
compute the cross product in, you'll get the opposite answer.

In any case if we compute the cross product of our <span class="z-axis">`zAxis`</span> and
<span style="color: gray;">`up`</span> we'll get the <span class="x-axis">xAxis</span> for the camera.

<div class="webgpu_center" style="width: 768px">
  <div data-diagram="cross-product-01"></div>
  <div class="caption"><span style='color:gray;'>up</span> cross <span class='z-axis'>zAxis</span> = <span class='x-axis'>xAxis</span></div>
</div>

And now that we have the <span class="x-axis">`xAxis`</span> we can cross the <span class="z-axis">`zAxis`</span> and the <span class="x-axis">`xAxis`</span>
which will give us the camera's <span class="y-axis">`yAxis`</span>

<div class="webgpu_center" style="width: 768px">
  <div data-diagram="cross-product-02"></div>
  <div class="caption"><span class='z-axis'>zAxis</span> cross <span class='x-axis'>xAxis</span> = <span class='y-axis'>yAxis</span></div>
</div>

Now all we have to do is plug the 3 axes into a matrix. That gives us a
matrix that will orient something that points at the `target` from the
`eye`. We just need to put in the `eye` position in the final column.

<div class="webgpu_center">
  <div class="glocal-center">
    <table class="glocal-center-content glocal-mat">
      <tbody>
        <tr class="vertical-spans">
          <td><span class="x-axis">x axis →</span></td>
          <td><span class="y-axis">y axis →</span></td>
          <td><span class="z-axis">z axis →</span></td>
          <td><span>eye position →</span></td>
        </tr>
        <tr>
          <td class="m11">Xx</td>
          <td class="m12">Yx</td>
          <td class="m13">Zx</td>
          <td class="m14">Tx</td>
        </tr>
        <tr>
          <td class="m21">Xy</td>
          <td class="m22">Yy</td>
          <td class="m23">Zy</td>
          <td class="m24">Ty</td>
        </tr>
        <tr>
          <td class="m31">Xz</td>
          <td class="m32">Yz</td>
          <td class="m33">Zz</td>
          <td class="m34">Tz</td>
        </tr>
        <tr>
          <td class="m41">0</td>
          <td class="m42">0</td>
          <td class="m43">0</td>
          <td class="m44">1</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

Here's the code to compute the cross product of 2 vectors.
Like our matrix code we'll make it take an optional destination array.

```js
+const vec3 = {
+  cross(a, b, dst) {
+    dst = dst || new Float32Array(3);
+
+    const t0 = a[1] * b[2] - a[2] * b[1];
+    const t1 = a[2] * b[0] - a[0] * b[2];
+    const t2 = a[0] * b[1] - a[1] * b[0];
+
+    dst[0] = t0;
+    dst[1] = t1;
+    dst[2] = t2;
+
+    return dst;
+  },
+};
```

Here's the code to subtract two vectors.


```js
const vec3 = {
  ...
+  subtract(a, b, dst) {
+    dst = dst || new Float32Array(3);
+
+    dst[0] = a[0] - b[0];
+    dst[1] = a[1] - b[1];
+    dst[2] = a[2] - b[2];
+
+    return dst;
+  },
```

Here's the code to normalize a vector (make it into a unit vector).

```js
const vec3 = {
  ...
+  normalize(v, dst) {
+    dst = dst || new Float32Array(3);
+
+    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
+    // make sure we don't divide by 0.
+    if (length > 0.00001) {
+      dst[0] = v[0] / length;
+      dst[1] = v[1] / length;
+      dst[2] = v[2] / length;
+    } else {
+      dst[0] = 0;
+      dst[1] = 0;
+      dst[2] = 0;
+    }
+
+    return dst;
+  },
```

Here's the code to compute a *camera* matrix. It follows the steps described above.

```js
const mat4 = {
  ...
  cameraAim(eye, target, up, dst) {
    dst = dst || new Float32Array(16);

    const zAxis = vec3.normalize(vec3.subtract(eye, target));
    const xAxis = vec3.normalize(vec3.cross(up, zAxis));
    const yAxis = vec3.normalize(vec3.cross(zAxis, xAxis));

    dst[ 0] = xAxis[0];  dst[ 1] = xAxis[1];  dst[ 2] = xAxis[2];  dst[ 3] = 0;
    dst[ 4] = yAxis[0];  dst[ 5] = yAxis[1];  dst[ 6] = yAxis[2];  dst[ 7] = 0;
    dst[ 8] = zAxis[0];  dst[ 9] = zAxis[1];  dst[10] = zAxis[2];  dst[11] = 0;
    dst[12] = eye[0];    dst[13] = eye[1];    dst[14] = eye[2];    dst[15] = 1;

    return dst;
  },
  ...
```

And here is how we might use it to make the camera point at a specific 'F'
as we move it.

```js
-    // compute a matrix for the camera.
-    const cameraMatrix = mat4.rotationY(settings.cameraAngle);
-    mat4.translate(cameraMatrix, [0, 0, radius * 1.5], cameraMatrix);
+    // Compute the position of the first F
+    const fPosition = [radius, 0, 0];
+
+    // Use matrix math to compute a position on a circle where
+    // the camera is
+    const tempMatrix = mat4.rotationY(settings.cameraAngle);
+    mat4.translate(tempMatrix, [0, 0, radius * 1.5], tempMatrix);
+
+    // Get the camera's position from the matrix we computed
+    const eye = tempMatrix.slice(12, 15);
+
+    const up = [0, 1, 0];
+
+    // Compute the camera's matrix using cameraAim
+    const cameraMatrix = mat4.cameraAim(eye, fPosition, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = mat4.inverse(cameraMatrix);
```

And here's the result.

{{{example url="../webgpu-cameras-step-2-camera-aim.html" }}}

Drag the slider and notice how the camera tracks a single 'F'.

Most math libraries don't have a `cameraAim` function. Instead they have a `lookAt` function
which computes exactly what our `cameraAim` function does but ALSO converts it to a view matrix.
Functionally `lookAt` could be implemented like this

```js
const mat4 = {
  ...
+  lookAt(eye, target, up, dst) {
+    return mat4.inverse(mat4.cameraAim(eye, target, up, dst), dst);
+  },
  ...
};
```

Using this `lookAt` function our code would change to this

```js
-    // Compute the camera's matrix using look at.
-    const cameraMatrix = mat4.cameraAim(eye, fPosition, up);
-
-    // Make a view matrix from the camera matrix.
-    const viewMatrix = mat4.inverse(cameraMatrix);
+    // Compute a view matrix
+    const viewMatrix = mat4.lookAt(eye, fPosition, up);
```

{{{example url="../webgpu-cameras-step-3-look-at.html" }}}

Note that you can use this type of "aim" math for more than just cameras.
Common uses are making a character's head follow some target.  Making a turret aim
at a target.  Making an object follow a path.  You compute where on the path the
target is.  Then you compute where on the path the target would be a few moments
in the future.  Plug those 2 values into your `aim` function and you'll get a
matrix that makes your object follow the path and orient toward the path as
well.

Usually to "aim" something you want it to point down the positive Z axis instead
of the negative Z axis as our function above did. So, we need to 
subtract `target` from `eye` instead of `eye` from `target`

```js
const mat4 = {
  ...
+  aim(eye, target, up, dst) {
+    dst = dst || new Float32Array(16);
+
+    const zAxis = vec3.normalize(vec3.subtract(target, eye));
+    const xAxis = vec3.normalize(vec3.cross(up, zAxis));
+    const yAxis = vec3.normalize(vec3.cross(zAxis, xAxis));
+
+    dst[ 0] = xAxis[0];  dst[ 1] = xAxis[1];  dst[ 2] = xAxis[2];  dst[ 3] = 0;
+    dst[ 4] = yAxis[0];  dst[ 5] = yAxis[1];  dst[ 6] = yAxis[2];  dst[ 7] = 0;
+    dst[ 8] = zAxis[0];  dst[ 9] = zAxis[1];  dst[10] = zAxis[2];  dst[11] = 0;
+    dst[12] = eye[0];    dst[13] = eye[1];    dst[14] = eye[2];    dst[15] = 1;
+
+    return dst;
+  },

  cameraAim(eye, target, up, dst) {
    dst = dst || new Float32Array(16);

    const zAxis = vec3.normalize(vec3.subtract(eye, target));
    const xAxis = vec3.normalize(vec3.cross(up, zAxis));
    const yAxis = vec3.normalize(vec3.cross(zAxis, xAxis));

    dst[ 0] = xAxis[0];  dst[ 1] = xAxis[1];  dst[ 2] = xAxis[2];  dst[ 3] = 0;
    dst[ 4] = yAxis[0];  dst[ 5] = yAxis[1];  dst[ 6] = yAxis[2];  dst[ 7] = 0;
    dst[ 8] = zAxis[0];  dst[ 9] = zAxis[1];  dst[10] = zAxis[2];  dst[11] = 0;
    dst[12] = eye[0];    dst[13] = eye[1];    dst[14] = eye[2];    dst[15] = 1;

    return dst;
  },
...

<a id="a-aim-fs"></a> Let's make a bunch of Fs point at another F (yea, too many Fs but I don't want to clutter
the example with more data). We'll make a grid of 5x5 Fs + 1 more
for them to "aim" at

```js
-  const numFs = 5;
+  const numFs = 5 * 5 + 1;
```

Then we'll hard code a camera target and change the
settings so we can move one of the Fs

```js
  const settings = {
-    fieldOfView: degToRad(100),
-    cameraAngle: 0,
+    target: [0, 200, 300],
+    targetAngle: 0,
  };

  const radToDegOptions = { min: -360, max: 360, step: 1, converters: GUI.converters.radToDeg };

  const gui = new GUI();
  gui.onChange(render);
-  gui.add(settings, 'fieldOfView', {min: 1, max: 179, converters: GUI.converters.radToDeg});
-  gui.add(settings, 'cameraAngle', radToDegOptions);
+  gui.add(settings.target, '1', -100, 300).name('target height');
+  gui.add(settings, 'targetAngle', radToDegOptions).name('target angle');
```

And finally for the first 25 Fs we'll orient them in
a grid using `aim` and *aim* them at the 26th F

```js
+    // update target X,Z based on angle
+    settings.target[0] = Math.cos(settings.targetAngle) * radius;
+    settings.target[2] = Math.sin(settings.targetAngle) * radius;

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
-        settings.fieldOfView,
+        degToRad(60), // fieldOfView,
        aspect,
        1,      // zNear
        2000,   // zFar
    );

-    // Compute the position of the first F
-    const fPosition = [radius, 0, 0];
-
-    // Use matrix math to compute a position on a circle where
-    // the camera is
-    const tempMatrix = mat4.rotationY(settings.cameraAngle);
-    mat4.translate(tempMatrix, [0, 0, radius * 1.5], tempMatrix);
-
-    // Get the camera's position from the matrix we computed
-    const eye = tempMatrix.slice(12, 15);
+    const eye = [-500, 300, -500];
+    const target = [0, -100, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
-    const viewMatrix = mat4.lookAt(eye, fPosition, up);
+    const viewMatrix = mat4.lookAt(eye, target, up);

    // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    objectInfos.forEach(({
      matrixValue,
      uniformBuffer,
      uniformValues,
      bindGroup,
    }, i) => {
-      const angle = i / numFs * Math.PI * 2;
-      const x = Math.cos(angle) * radius;
-      const z = Math.sin(angle) * radius;
-
-      mat4.translate(viewProjectionMatrix, [x, 0, z], matrixValue);

+      const deep = 5;
+      const across = 5;
+      if (i < 25) {
+        // compute grid positions
+        const gridX = i % across;
+        const gridZ = i / across | 0;
+
+        // compute 0 to 1 positions
+        const u = gridX / (across - 1);
+        const v = gridZ / (deep - 1);
+
+        // center and spread out
+        const x = (u - 0.5) * across * 150;
+        const z = (v - 0.5) * deep * 150;
+
+        // aim this F from it's position toward the target F
+        const aimMatrix = mat4.aim([x, 0, z], settings.target, up);
+        mat4.multiply(viewProjectionMatrix, aimMatrix, matrixValue);
+      } else {
+        mat4.translate(viewProjectionMatrix, settings.target, matrixValue);
+      }

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

And now 25 Fs are facing (their front is positive Z), the 26th F

{{{example url="../webgpu-cameras-step-4-aim-Fs.html" }}}

Move the sliders and see all 25Fs *aim*.


<!-- keep this at the bottom of the article -->
<link href="webgpu-cameras.css" rel="stylesheet">
<script type="module" src="webgpu-cameras.js"></script>
