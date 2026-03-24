Title: WebGPU Utils and wgpu-matrix
Description: Utils and Math for WebGPU
TOC: WebGPU Utils and Math

> ## What you should take away from this article
>
> Using WebGPU is very verbose. So verbose that it gets easier to understand
> if you use some helpers so that you can concentrate on the higher level concepts.
>
> For example, say you were learning math. Your teacher teaches you what "average"
> means and how to compute the average of some set of numbers. Once they've taught
> you, they then move on to other things and just say "here you compute the average".
> For example:
>
> > To compute the standard deviation
> > 
> > * Calculate the Average of all your data
> > * For each number in your data set, calculate the difference between that number and the average.
> > * After finding each difference, square it.
> > * Take the Square root of the average the squared differences
>
> They don't re-explain how to calculate an average. You've already learned it and
> they can now just refer to what you've already learned
>
> Similarly in WebGPU we have the concept of creating structures for uniforms in WGSL.
> Then creating one or more uniform buffers,
> filling those buffers with data using `TypedArrays`. We've covered this extensively
> in the first 20-30 articles on this site and in [the article on memory layout](webgpu-memory-layout.html).
>
> At some point though, it becomes harder
> to understand the code dealing with these details instead of just saying
> "set the uniforms" and you, having learned previously that "set the uniforms" means
> "compute the offset to the various pieces of data, make typed arrays views to
> make it possible to set that data. And then later, before rendering, set it and
> upload the values to the GPU.
>
> As such, don't be afraid of the libraries used on this site. Almost all of their
> functionality is explained extensively in the first articles on the site.
> Some more details are provided below.

Many of the examples on this site use two libraries.

## wgpu-matrix

The first is [wgpu-matrix](https://github.com/greggman/wgpu-matrix). wgpu-matrix is a collection of
the same functions we wrote in 
[the article on matrix math](webgpu-matrix-math.html) through
[the article on perspective projection](webgpu-perspective-projection.html) as well
as [the article on lighting](webgpu-lighting-directional.html).

There's nothing special happening here. If you want
to know how any of the math functions work you can
go read the articles listed above.

## webgpu-utils

The second is [webgpu-utils](https://github.com/greggman/webgpu-utils).

WebGPU Utils is a collection of the other useful
functions we've written in various articles.
For example, the functions

* `numMipLevels`
* `loadImageBitmap`
* `copySourceToTexture`
* `createTextureFromSource`
* `createTextureFromImage`
* `generateMips`

All of which we created in [the article on importing textures](webgpu-importing-textures.html).

It also includes

* `copySourcesToTexture`
* `createTextureFromSources`
* `generateMips`

From [the article on cubemaps](webgpu-cubemaps.html).
In that article we updated `generateMips` to handle
multiple layers.

And it includes how we added support for `premultipliedAlpha` in
[the article on transparency and blending](webgpu-transparency.html).

The library also includes

* `createTextureFromImages`

from [the article on environment maps](webgpu-environment-maps.html).

### `makeShaderDataDefinitions` and `makeStructuredView`

These 2 functions were mentioned briefly in [the article on memory layout](webgpu-memory-layout.html).

As you've seen in all the [fundamental articles](webgpu-fundamentals.html), 
as well as the [articles on matrix math](webgpu-matrix-math.html) and
[the articles on lighting](webgpu-lighting-direction.html) when we make
a structure in WGSL, we then usually have to go make a uniform buffer or storage buffer, and somehow put data in it.

You can particularly see this in the articles on lighting. We had this structure

```wgsl
struct Uniforms {
  matrix: mat4x4f,
  color: vec4f,
  lightDirection: vec3f,
};
```

Then is changed to this

```wgsl
struct Uniforms {
  world: mat4x4f,
  worldViewProjection: mat4x4f,
  color: vec4f,
  lightDirection: vec3f,
};
```

Then this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  color: vec4f,
  lightDirection: vec3f,
};
```

and then this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightPosition: vec3f,
};
```

followed by this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
};
```

and this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
};
```

and this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
  lightDirection: vec3f,
  limit: f32,
};
```

and this

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
  lightDirection: vec3f,
  innerLimit: f32,
  outerLimit: f32,
};
```

Each time we made these changes, we had to go into the code that sets up views
and edit so many things. To illustrate what we had to do, here's the progression

We started here in [the article on directional lighting](webgpu-lighting-directional.html).

```js
  // matrix + color + light direction
  const uniformBufferSize = (16 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;
  const kColorOffset = 16;
  const kLightDirectionOffset = 20;

  const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightDirectionValue =
      uniformValues.subarray(kLightDirectionOffset, kLightDirectionOffset + 3);
```

Then this

```js
-  const uniformBufferSize = (16 + 4 + 4) * 4;
+  const uniformBufferSize = (16 + 16 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
-  const kMatrixOffset = 0;
-  const kColorOffset = 16;
-  const kLightDirectionOffset = 20;
+  const kWorldOffset = 0;
+  const kWorldViewProjectionOffset = 16;
+  const kColorOffset = 32;
+  const kLightDirectionOffset = 36;

-  const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + 16);
+  const worldValue = uniformValues.subarray(kWorldOffset, kWorldOffset + 16);
+  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightDirectionValue =
      uniformValues.subarray(kLightDirectionOffset, kLightDirectionOffset + 3);
```

Then this

```js
-  const uniformBufferSize = (16 + 16 + 4 + 4) * 4;
+  const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
-  const kWorldOffset = 0;
-  const kWorldViewProjectionOffset = 16;
-  const kColorOffset = 32;
-  const kLightDirectionOffset = 36;
+  const kNormalMatrixOffset = 0;
+  const kWorldViewProjectionOffset = 12;
+  const kColorOffset = 28;
+  const kLightDirectionOffset = 32;

-  const worldValue = uniformValues.subarray(kWorldOffset, kWorldOffset + 16);
+  const normalMatrixValue = uniformValues.subarray(
+      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightDirectionValue =
      uniformValues.subarray(kLightDirectionOffset, kLightDirectionOffset + 3);
```

and this

```js
-  const uniformBufferSize = (12 + 16 + 4 + 4) * 4;
+  const uniformBufferSize = (12 + 16 + 16 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kNormalMatrixOffset = 0;
  const kWorldViewProjectionOffset = 12;
-  const kColorOffset = 28;
-  const kLightDirectionOffset = 32;
+  const kWorldOffset = 28;
+  const kColorOffset = 44;
+  const kLightPositionOffset = 48;

  const normalMatrixValue = uniformValues.subarray(
      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
+  const worldValue = uniformValues.subarray(
+      kWorldOffset, kWorldOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
-  const lightDirectionValue =
-      uniformValues.subarray(kLightDirectionOffset, kLightDirectionOffset + 3);
+  const lightPositionValue =
+      uniformValues.subarray(kLightPositionOffset, kLightPositionOffset + 3);
```

followed by this

```js
-  const uniformBufferSize = (12 + 16 + 16 + 4 + 4) * 4;
+  const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kNormalMatrixOffset = 0;
  const kWorldViewProjectionOffset = 12;
  const kWorldOffset = 28;
  const kColorOffset = 44;
  const kLightPositionOffset = 48;
+  const kViewWorldPositionOffset = 52;

  const normalMatrixValue = uniformValues.subarray(
      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const worldValue = uniformValues.subarray(
      kWorldOffset, kWorldOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightPositionValue = uniformValues.subarray(
      kLightPositionOffset, kLightPositionOffset + 3);
+  const viewWorldPositionValue = uniformValues.subarray(
+      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
```

and this

```js
  const kNormalMatrixOffset = 0;
  const kWorldViewProjectionOffset = 12;
  const kWorldOffset = 28;
  const kColorOffset = 44;
  const kLightWorldPositionOffset = 48;
  const kViewWorldPositionOffset = 52;
+  const kShininessOffset = 55;

  const normalMatrixValue = uniformValues.subarray(
      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const worldValue = uniformValues.subarray(
      kWorldOffset, kWorldOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightWorldPositionValue = uniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = uniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
+  const shininessValue = uniformValues.subarray(
+      kShininessOffset, kShininessOffset + 1);
```

and this

```js
-  const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4) * 4;
+  const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kNormalMatrixOffset = 0;
  const kWorldViewProjectionOffset = 12;
  const kWorldOffset = 28;
  const kColorOffset = 44;
  const kLightWorldPositionOffset = 48;
  const kViewWorldPositionOffset = 52;
  const kShininessOffset = 55;
+  const kLightDirectionOffset = 56;
+  const kLimitOffset = 59;

  const normalMatrixValue = uniformValues.subarray(
      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const worldValue = uniformValues.subarray(
      kWorldOffset, kWorldOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightWorldPositionValue = uniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = uniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
  const shininessValue = uniformValues.subarray(
      kShininessOffset, kShininessOffset + 1);
+  const lightDirectionValue = uniformValues.subarray(
+      kLightDirectionOffset, kLightDirectionOffset + 3);
+  const limitValue = uniformValues.subarray(
+      kLimitOffset, kLimitOffset + 1);
```

and finally this from the end of [the article on spot lighting](webgpu-lighting-spot.html).

```js
-  const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4 + 4) * 4;
+  const uniformBufferSize = (12 + 16 + 16 + 4 + 4 + 4 + 4 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kNormalMatrixOffset = 0;
  const kWorldViewProjectionOffset = 12;
  const kWorldOffset = 28;
  const kColorOffset = 44;
  const kLightWorldPositionOffset = 48;
  const kViewWorldPositionOffset = 52;
  const kShininessOffset = 55;
  const kLightDirectionOffset = 56;
-  const kLimitOffset = 59;
+  const kInnerLimitOffset = 59;
+  const kOuterLimitOffset = 60;

  const normalMatrixValue = uniformValues.subarray(
      kNormalMatrixOffset, kNormalMatrixOffset + 12);
  const worldViewProjectionValue = uniformValues.subarray(
      kWorldViewProjectionOffset, kWorldViewProjectionOffset + 16);
  const worldValue = uniformValues.subarray(
      kWorldOffset, kWorldOffset + 16);
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  const lightWorldPositionValue = uniformValues.subarray(
      kLightWorldPositionOffset, kLightWorldPositionOffset + 3);
  const viewWorldPositionValue = uniformValues.subarray(
      kViewWorldPositionOffset, kViewWorldPositionOffset + 3);
  const shininessValue = uniformValues.subarray(
      kShininessOffset, kShininessOffset + 1);
  const lightDirectionValue = uniformValues.subarray(
      kLightDirectionOffset, kLightDirectionOffset + 3);
-  const limitValue = uniformValues.subarray(
-      kLimitOffset, kLimitOffset + 1);
+  const innerLimitValue = uniformValues.subarray(
+      kInnerLimitOffset, kInnerLimitOffset + 1);
+  const outerLimitValue = uniformValues.subarray(
+      kOuterLimitOffset, kOuterLimitOffset + 1);
```

I hope you can see, **THIS VERBOSITY IS DISTRACTING FROM THE POINT OF THE ARTICLES!**
All we really wanted to say is "change your WGSL structure to this, then set the values
before drawing" but instead we have 40+ lines of code changes to show **PER EXAMPLE**.

Using the `makeShaderDataDefinitions` and `makeStructuredView`,
all the JavaScript above can be changed to these 7 lines.

```js
const defs = makeShaderDataDefinitions(code);
const uni = makeStructuredView(defs.uniforms.uni);

const uniformBuffer = device.createBuffer({
  size: uni.arrayBuffer.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
```

That's it. Between samples, we'd change our structure
as appropriate but these 2 functions would create all of those offsets and views for us.

To take the last example structure

```wgsl
struct Uniforms {
  normalMatrix: mat3x3f,
  worldViewProjection: mat4x4f,
  world: mat4x4f,
  color: vec4f,
  lightWorldPosition: vec3f,
  viewWorldPosition: vec3f,
  shininess: f32,
  lightDirection: vec3f,
  innerLimit: f32,
  outerLimit: f32,
};

*@group(0) @binding(0) var<uniform> uni: Uniforms;
```

these 2 lines

```js
const defs = makeShaderDataDefinitions(code);
const uni = makeStructuredView(defs.uniforms.uni);
```

Make a "structured view" for `uni`, the uniform binding we defined
in our `WGSL`.

Effectively those lines make this

```js
const arrayBuffer = new ArrayBuffer(256);
const uni = {
  arrayBuffer,
  set: function(data) { /* helper */ },
  views: {
    normalMatrix: new Float32Array(arrayBuffer, 0, 12),
    worldViewProjection: new Float32Array(arrayBuffer, 48, 16),
    world: new Float32Array(arrayBuffer, 112, 16),
    color: new Float32Array(arrayBuffer, 176, 4),
    lightWorldPosition: new Float32Array(arrayBuffer, 192, 3),
    viewWorldPosition: new Float32Array(arrayBuffer, 208, 3),
    shininess: new Float32Array(arrayBuffer, 220, 1),
    lightDirection: new Float32Array(arrayBuffer, 224, 3),
    innerLimit: new Float32Array(arrayBuffer, 236, 1),
    outerLimit: new Float32Array(arrayBuffer, 240, 1),
  },
};
```

There's no magic here, except maybe the fact that
`makeShaderDataDefinitions` actually parses the WGSL
to pull out enough data to make these views.

In the articles mentioned above there was code like this to set the values

```js
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 35, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    // Compute a world matrix
    const world = mat4.rotationY(settings.rotation, worldValue);

    // Combine the viewProjection and world matrices
    mat4.multiply(viewProjectionMatrix, world, worldViewProjectionValue);

    // Inverse and transpose it into the worldInverseTranspose value
    mat3.fromMat4(mat4.transpose(mat4.inverse(world)), normalMatrixValue);

    colorValue.set([0.2, 1, 0.2, 1]);  // green
    lightWorldPositionValue.set([-10, 30, 100]);
    viewWorldPositionValue.set(eye);
    shininessValue[0] = settings.shininess;
    innerLimitValue[0] = Math.cos(settings.innerLimit);
    outerLimitValue[0] = Math.cos(settings.outerLimit);

    // Since we don't have a plane like most spotlight examples
    // let's point the spot light at the F
    {
        const mat = mat4.aim(
            lightWorldPositionValue,
            [
              target[0] + settings.aimOffsetX,
              target[1] + settings.aimOffsetY,
              0,
            ],
            up);
        // get the zAxis from the matrix
        // negate it because lookAt looks down the -Z axis
        lightDirectionValue.set(mat.slice(8, 11));
    }

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

That code could change to this

```js
+    // Pull out the views using the same existing names.
+    const {
+      world: worldValue,
+      worldViewProjection: worldViewProjectionValue,
+      normalMatrix: normalMatrixValue,
+      color: colorValue,
+      lightWorldPosition: lightWorldPositionValue,
+      lightDirection: lightDirectionValue,
+      viewWorldPosition: viewWorldPositionValue,
+      shininess: shininessValue,
+      innerLimit: innerLimitValue,
+      outerLimit: outerLimitValue,
+    } = uni.views;

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 35, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    // Compute a world matrix
    const world = mat4.rotationY(settings.rotation, worldValue);

    // Combine the viewProjection and world matrices
    mat4.multiply(viewProjectionMatrix, world, worldViewProjectionValue);

    // Inverse and transpose it into the worldInverseTranspose value
    mat3.fromMat4(mat4.transpose(mat4.inverse(world)), normalMatrixValue);

    colorValue.set([0.2, 1, 0.2, 1]);  // green
    lightWorldPositionValue.set([-10, 30, 100]);
    viewWorldPositionValue.set(eye);
    shininessValue[0] = settings.shininess;
    innerLimitValue[0] = Math.cos(settings.innerLimit);
    outerLimitValue[0] = Math.cos(settings.outerLimit);

    // Since we don't have a plane like most spotlight examples
    // let's point the spot light at the F
    {
        const mat = mat4.aim(
            lightWorldPositionValue,
            [
              target[0] + settings.aimOffsetX,
              target[1] + settings.aimOffsetY,
              0,
            ],
            up);
        // get the zAxis from the matrix
        // negate it because lookAt looks down the -Z axis
        lightDirectionValue.set(mat.slice(8, 11));
    }

    // upload the uniform values to the uniform buffer
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
+    device.queue.writeBuffer(uniformBuffer, 0, uni.arrayBuffer);
```

Or, we could use the views directly

```js
-    // Pull out the views using the same existing names.
-    const {
-      world: worldValue,
-      worldViewProjection: worldViewProjectionValue,
-      normalMatrix: normalMatrixValue,
-      color: colorValue,
-      lightWorldPosition: lightWorldPositionValue,
-      lightDirection: lightDirectionValue,
-      viewWorldPosition: viewWorldPositionValue,
-      shininess: shininessValue,
-      innerLimit: innerLimitValue,
-      outerLimit: outerLimitValue,
-    } = uni.views;
+   const { views } = uni;

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 35, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    // Compute a world matrix
-    const world = mat4.rotationY(settings.rotation, worldValue);
+    const world = mat4.rotationY(settings.rotation, views.world);

    // Combine the viewProjection and world matrices
-    mat4.multiply(viewProjectionMatrix, world, worldViewProjectionValue);
+    mat4.multiply(viewProjectionMatrix, world, views.worldViewProjection);

    // Inverse and transpose it into the worldInverseTranspose value
-    mat3.fromMat4(mat4.transpose(mat4.inverse(world)), normalMatrixValue);
+    mat3.fromMat4(mat4.transpose(mat4.inverse(world)), views.normalMatrix);

-    colorValue.set([0.2, 1, 0.2, 1]);  // green
-    lightWorldPositionValue.set([-10, 30, 100]);
-    viewWorldPositionValue.set(eye);
-    shininessValue[0] = settings.shininess;
-    innerLimitValue[0] = Math.cos(settings.innerLimit);
-    outerLimitValue[0] = Math.cos(settings.outerLimit);
+    views.color.set([0.2, 1, 0.2, 1]);  // green
+    views.lightWorldPosition.set([-10, 30, 100]);
+    views.viewWorldPosition.set(eye);
+    views.shininess[0] = settings.shininess;
+    views.innerLimit[0] = Math.cos(settings.innerLimit);
+    views.outerLimit[0] = Math.cos(settings.outerLimit);

    // Since we don't have a plane like most spotlight examples
    // let's point the spot light at the F
    {
        const mat = mat4.aim(
-            lightWorldPositionValue,
+            views.lightWorldPosition,
            [
              target[0] + settings.aimOffsetX,
              target[1] + settings.aimOffsetY,
              0,
            ],
            up);
        // get the zAxis from the matrix
        // negate it because lookAt looks down the -Z axis
-        lightDirectionValue.set(mat.slice(8, 11));
+        views.lightDirection.set(mat.slice(8, 11));
    }

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uni.arrayBuffer);
```

Or, we could use the `set` function, when appropriate, to make things even easier

```js
    const { views } = uni;

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
        degToRad(60),
        aspect,
        1,      // zNear
        2000,   // zFar
    );

    const eye = [100, 150, 200];
    const target = [0, 35, 0];
    const up = [0, 1, 0];

    // Compute a view matrix
    const viewMatrix = mat4.lookAt(eye, target, up);

    // Combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);

    // Compute a world matrix
    const world = mat4.rotationY(settings.rotation, views.world);

    // Combine the viewProjection and world matrices
    mat4.multiply(viewProjectionMatrix, world, views.worldViewProjection);

    // Inverse and transpose it into the worldInverseTranspose value
    mat3.fromMat4(mat4.transpose(mat4.inverse(world)), views.normalMatrix);

-    views.color.set([0.2, 1, 0.2, 1]);  // green
-    views.lightWorldPosition.set([-10, 30, 100]);
-    views.viewWorldPosition.set(eye);
-    views.shininess[0] = settings.shininess;
-    views.innerLimit[0] = Math.cos(settings.innerLimit);
-    views.outerLimit[0] = Math.cos(settings.outerLimit);
+    uni.set({
+      color: [0.2, 1, 0.2, 1],  // green
+      lightWorldPosition: [-10, 30, 100],
+      viewWorldPosition: eye,
+      shininess: settings.shininess,
+      innerLimit: settings.innerLimit,
+      outerLimit: settings.outerLimit,
+    });

    // Since we don't have a plane like most spotlight examples
    // let's point the spot light at the F
    {
        const mat = mat4.aim(
            views.lightWorldPosition,
            [
              target[0] + settings.aimOffsetX,
              target[1] + settings.aimOffsetY,
              0,
            ],
            up);
        // get the zAxis from the matrix
        // negate it because lookAt looks down the -Z axis
-        views.lightDirection.set(mat.slice(8, 11));
+        uni.set({ lightDirectionValue: mat.slice(8, 11) });
    }

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uni.arrayBuffer);
```

You can imagine the `set` function, at least for the use-case shown above, is
pretty straight forward.

This would work

```js
const arrayBuffer = new ArrayBuffer(256);
const views = {
  normalMatrix: new Float32Array(arrayBuffer, 0, 12),
  worldViewProjection: new Float32Array(arrayBuffer, 48, 16),
  world: new Float32Array(arrayBuffer, 112, 16),
  color: new Float32Array(arrayBuffer, 176, 4),
  lightWorldPosition: new Float32Array(arrayBuffer, 192, 3),
  viewWorldPosition: new Float32Array(arrayBuffer, 208, 3),
  shininess: new Float32Array(arrayBuffer, 220, 1),
  lightDirection: new Float32Array(arrayBuffer, 224, 3),
  innerLimit: new Float32Array(arrayBuffer, 236, 1),
  outerLimit: new Float32Array(arrayBuffer, 240, 1),
};
const uni = {
  arrayBuffer,
  set: function(data) {
    // over simplified
    for (const [key, value] of Object.entries(data)) {
      const view = views[key];
      if (view) {
        view.set(typeof value === 'number' ? [value] : value);
      }
    }
  },
};
```

The actual `set` implementation is slightly more involved to handle
nested structures and arrays. Look in the source if you'd like to
see the details. 
Here's the code for 'set': [link](https://github.com/greggman/webgpu-utils/blob/cb61348691718e22f877e0011673f84d456927b6/src/buffer-views.ts#L291)
And here's the code for the function it calls: [link](https://github.com/greggman/webgpu-utils/blob/cb61348691718e22f877e0011673f84d456927b6/src/buffer-views.ts#L386)

The hope is the example above makes it clear it's
not magic. These simple functions can make using WebGPU much much
less tedious and can make explaining things much simpler. You can just
say "set the uniform values" instead of showing for the 150th time
the tedium of calculating offsets, making views, etc...

## Vertex Buffers and Attributes

Another place we can easily make less tedious is setting up
vertex buffers and attributes. The issue is usually that
we want some data, like vertex positions, vertex normals,
vertex texture coordinates. We can make them in separate
arrays. This is easy.

```js
const positions = [];
const normals = [];
const texcoords = [];

for(each vertex) {
  ...
  position.push(x, y, z);
  normals.push(nx, ny, nz);
  texcoord.push(u, v);
}
```

Now we have the added complication that we need 3 buffers
and 3 sets of attributes.

```js
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: shaderModule,
*      buffers: [
*        // position
*        {
*          arrayStride: 3 * 4, // 3 floats, 4 bytes each
*          attributes: [
*            {shaderLocation: 0, offset: 0, format: 'float32x3'},
*          ],
*        },
*        // normals
*        {
*          arrayStride: 3 * 4, // 3 floats, 4 bytes each
*          attributes: [
*            {shaderLocation: 1, offset: 0, format: 'float32x3'},
*          ],
*        },
*        // texcoords
*        {
*          arrayStride: 2 * 4, // 2 floats, 4 bytes each
*          attributes: [
*            {shaderLocation: 2, offset: 0, format: 'float32x2',},
*          ],
*        },
*      ],
    },

...

  function createBuffer(device, values, usage) {
    const data = new Float32Array(values);
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    });
    const dst = new data.constructor(buffer.getMappedRange());
    dst.set(data);
    buffer.unmap();
    return buffer;
  }

  const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);
  const normalBuffer = createBuffer(device, normals, GPUBufferUsage.VERTEX);
  const texcoordBuffer = createBuffer(device, texcoords, GPUBufferUsage.VERTEX);

```

More tedium. 😮‍💨

Or we can try to interleave them. This may or may not be
easy. If they are all the same type, like all 32-bit floating
point values. Then we can do something like

```js
const vertexData = [];

for (each vertex) {
  ...
  vertexData.push(
      x, y, z,
      nx, ny, nz,
      u, v);
}
```

But as soon as we want to interleave say 8bit colors it becomes
tedious again

```js
const numVertices = ...;
const npmFloatsPerVertex = 3 + 3 + 2 + 1; // pos + nrm + uv + color()
const f32Data = new Float32Array(numFloatsPerVertex * numVertices);
const u8Data = new Uint8Array(f32Data.buffer);
const colorOffset = (3 + 3 + 2) * 4;

for (let i = 0; i < numVertices; ++i) {
   const floatOffset = numFloatsPerVertex * i;
   f32Data.set(
      [
        x, y, z,
        nx, ny, nz,
        u, v,
      ],
      floatOffset);
   const u8Offset =numFloatsPerVertex * i * 4 + colorOffset;
   u8Data.set(
      [ r, g, b, a ],
      u8Offset;
   );
}
```

And were not done. Assuming we put all that data into a buffer
we still need to setup our pipeline

```js
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: shaderModule,
*      buffers: [
*        // position
*        {
*          arrayStride: (3 + 3 + 2 + 1) * 4,
*          attributes: [
*            {shaderLocation: 0, offset: 0,  format: 'float32x3'},
*            {shaderLocation: 1, offset: 12, format: 'float32x3'},
*            {shaderLocation: 2, offset: 24, format: 'float32x2'},
*            {shaderLocation: 3, offset: 32, format: 'unorm8x4'},
*          ],
*        },
*      ],
    ...
```

So again, making some helpers can remove this tedium.

We can make a function that we pass this

```js
const positions = [];
const normals = [];
const texcoords = [];

const data = {
  positions,
  normals,
  texcoords,
};
```

And it creates everything for us. It interleaves the data,
it creates the buffers, and it returns the `buffers` portion
of the pipeline

```js
const {
  bufferLayouts,
  buffers,
  numElements
} = createBuffersAndAttributesFromArrays(device, data);
```

Now the buffers are already created, by default there is only 1 and the 
data is interleaved. That buffer is `buffer[0]`. I've also returned
the `bufferLayout` which is the portion of the pipeline called buffers

```js
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: shaderModule,
*      buffers: bufferLayout
    },
    ...
```

And, given that `buffers` is an array, if we want, we can write
buffer commands like this

```js
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    buffers.forEach((buffer, i) => pass.setVertexBuffer(i, buffer));
    ...
```

Then we don't have to change the code if there are more or less buffers.

TBD: need an example. None of the existing examples have enough vertex
data to be simple but interesting except the [webgpu-cube](../webgpu-cube.html)
but it's part of an article on WebGPU from WebGL and seem inappropriate.

It's reasonably ok comparison though:

<div class="webgpu_center compare">
  <div>
    <div>Raw WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  function createBuffer(device, data, usage) {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    });
    const dst = new data.constructor(buffer.getMappedRange());
    dst.set(data);
    buffer.unmap();
    return buffer;
  }

  const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
  const normals   = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
  const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
  const indices   = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

  const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);
  const normalBuffer = createBuffer(device, normals, GPUBufferUsage.VERTEX);
  const texcoordBuffer = createBuffer(device, texcoords, GPUBufferUsage.VERTEX);
  const indicesBuffer = createBuffer(device, indices, GPUBufferUsage.INDEX);

  const pipeline = device.createRenderPipeline({
    label: 'fake lighting',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      buffers: [
        // position
        {
          arrayStride: 3 * 4, // 3 floats, 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},
          ],
        },
        // normals
        {
          arrayStride: 3 * 4, // 3 floats, 4 bytes each
          attributes: [
            {shaderLocation: 1, offset: 0, format: 'float32x3'},
          ],
        },
        // texcoords
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2',},
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      targets: [
        {format: presentationFormat},
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
    ...(canvasInfo.sampleCount > 1 && {
        multisample: {
          count: canvasInfo.sampleCount,
        },
    }),
  });

  ...

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, normalBuffer);
    passEncoder.setVertexBuffer(2, texcoordBuffer);
    passEncoder.setIndexBuffer(indicesBuffer, 'uint16');
    passEncoder.drawIndexed(indices.length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU Utils</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
  const {
    buffers: [vertexBuffer],
    bufferLayouts,
    indexBuffer,
    indexFormat,
    numElements,
  } = createBuffersAndAttributesFromArrays(
    device, {
      positions: [1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1],
      normals: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
      texcoords: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
      indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23],
    });

  const pipeline = device.createRenderPipeline({
    label: 'fake lighting',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      buffers: bufferLayouts,
    },
    fragment: {
      module: shaderModule,
      targets: [
        {format: presentationFormat},
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
    ...(canvasInfo.sampleCount > 1 && {
        multisample: {
          count: canvasInfo.sampleCount,
        },
    }),
  });

...

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, indexFormat);
    passEncoder.drawIndexed(numElements);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
{{/escapehtml}}</code></pre>
  </div>
</div>


What about a more complex example like example from
[the article on vertex buffers](webgpu-vertex-buffers.html#a-normalized-attributes)
that uses 8bit colors. It had 3 buffers. One has positions and per vertex colors. One has per circle colors and per circle offsets, and the last one
has scales.

Changing it to use `createBuffersAndAttributesFromArrays`

First we change the code that makes the circle data

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
-  // 2 triangles per subdivision, 3 verts per tri
-  const numVertices = numSubdivisions * 3 * 2;
-  // 2 32-bit values for position (xy) and 1 32-bit value for color (rgb_)
-  // The 32-bit color value will be written/read as 4 8-bit values
-  const vertexData = new Float32Array(numVertices * (2 + 1));
-  const colorData = new Uint8Array(vertexData.buffer);

+  const positions = [];
+  const colors = [];

-  let offset = 0;
-  let colorOffset = 8;
  const addVertex = (x, y, r, g, b) => {
-    vertexData[offset++] = x;
-    vertexData[offset++] = y;
-    offset += 1;  // skip the color
-    colorData[colorOffset++] = r * 255;
-    colorData[colorOffset++] = g * 255;
-    colorData[colorOffset++] = b * 255;
-    colorOffset += 9;  // skip extra byte and the position
+    positions.push(x, y);
+    colors.push(r, g, b, 1);
  };

  const innerColor = [1, 1, 1];
  const outerColor = [0.1, 0.1, 0.1];

  // 2 vertices per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // first triangle
    addVertex(c1 * radius, s1 * radius, ...outerColor);
    addVertex(c2 * radius, s2 * radius, ...outerColor);
    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
    addVertex(c2 * radius, s2 * radius, ...outerColor);
    addVertex(c2 * innerRadius, s2 * innerRadius, ...innerColor);
  }

  return {
-    vertexData,
-    numVertices,
+    positions: { data: positions, numComponents: 2 },
+    colors,
  };
}
```

So that got simpler.

The code that sets up the vertex buffers changes to this.

```
  const kNumObjects = 100;
  const objectInfos = [];

-  // create 2 vertex buffers
-  const staticUnitSize =
-    4 +     // color is 4 bytes
-    2 * 4;  // offset is 2 32bit floats (4bytes each)
-  const changingUnitSize =
-    2 * 4;  // scale is 2 32bit floats (4bytes each)
-  const staticVertexBufferSize = staticUnitSize * kNumObjects;
-  const changingVertexBufferSize = changingUnitSize * kNumObjects;
-
-  const staticVertexBuffer = device.createBuffer({
-    label: 'static vertex for objects',
-    size: staticVertexBufferSize,
-    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
-  });
-
-  const changingVertexBuffer = device.createBuffer({
-    label: 'changing storage for objects',
-    size: changingVertexBufferSize,
-    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
-  });
-
-  // offsets to the various uniform values in float32 indices
-  const kColorOffset = 0;
-  const kOffsetOffset = 1;

  const kScaleOffset = 0;

-  {
-    const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
-    const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);
+  const staticColors = [];
+  const staticOffsets = [];

    for (let i = 0; i < kNumObjects; ++i) {
-      const staticOffsetU8 = i * staticUnitSize;
-      const staticOffsetF32 = staticOffsetU8 / 4;
-
-      // These are only set once so set them now
-      staticVertexValuesU8.set(        // set the color
-          [rand() * 255, rand() * 255, rand() * 255, 255],
-          staticOffsetU8 + kColorOffset);
-
-      staticVertexValuesF32.set(      // set the offset
-          [rand(-0.9, 0.9), rand(-0.9, 0.9)],
-          staticOffsetF32 + kOffsetOffset);
+      staticColors.push(rand() * 255, rand() * 255, rand() * 255, 255);
+      staticOffsets.push(rand(-0.9, 0.9), rand(-0.9, 0.9));

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
-    device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
-  }

  const {
    buffers: [staticVertexBuffer],
    bufferLayouts: [staticVertexBufferLayout],
  } = createBuffersAndAttributesFromArrays(device, {
    staticOffsets: { data: staticOffsets, numComponents: 2 },
    staticColors: new Uint8Array(staticColors),
  }, {stepMode: 'instance', shaderLocation: 2});

  const {
    buffers: [changingVertexBuffer],
    bufferLayouts: [changingVertexBufferLayout],
  } = createBuffersAndAttributesFromArrays(device, {
    scale: { data: kNumObjects * 2, numComponents: 2 },
  }, { stepMode: 'instance', shaderLocation: 4, usage: GPUBufferUsage.COPY_DST });

+  const vertexValues = new Float32Array(changingVertexBuffer.size / 4);
+  const changingUnitSize = 8;

-  // a typed array we can use to update the changingStorageBuffer
-  const vertexValues = new Float32Array(changingVertexBufferSize / 4);
-
-  const { vertexData, numVertices } = createCircleVertices({
-    radius: 0.5,
-    innerRadius: 0.25,
-  });
-  const vertexBuffer = device.createBuffer({
-    label: 'vertex buffer vertices',
-    size: vertexData.byteLength,
-    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
-  });
-  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

+  const vertexArrays = createCircleVertices({
+    radius: 0.5,
+    innerRadius: 0.25,
+  });
+  const {
+    buffers: [vertexBuffer],
+    numElements,
+    bufferLayouts: [vertexBufferLayout],
+  } = createBuffersAndAttributesFromArrays(device, vertexArrays);
```

That got a lot smaller.

The code that sets up the pipeline changes to this

```js
  const pipeline = device.createRenderPipeline({
    label: 'per vertex color',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
-        {
-          arrayStride: 2 * 4 + 4, // 2 floats, 4 bytes each + 4 bytes
-          attributes: [
-            {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
-            {shaderLocation: 4, offset: 8, format: 'unorm8x4'},   // perVertexColor
-          ],
-        },
-        {
-          arrayStride: 4 + 2 * 4, // 4 bytes + 2 floats, 4 bytes each
-          stepMode: 'instance',
-          attributes: [
-            {shaderLocation: 1, offset: 0, format: 'unorm8x4'},   // color
-            {shaderLocation: 2, offset: 4, format: 'float32x2'},  // offset
-          ],
-        },
-        {
-          arrayStride: 2 * 4, // 2 floats, 4 bytes each
-          stepMode: 'instance',
-          attributes: [
-            {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
-          ],
-        },
+        vertexBufferLayout,
+        staticVertexBufferLayout,
+        changingVertexBufferLayout,
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

So that's simpler.

Is that a win? You'll have to decide.

Going forward though, some examples will start using these functions
in order to concentrate on what the article is really about rather than
get lost in the weeds in these details. Hopefully this article can help
make it clearer what these functions do. They do nothing that hasn't
already been covered. So, when you see something like

```js
const sphereData = createBuffersAndAttributesFromArrays(
   device,
   createSphereVertices(radius),
);
```

I hope you'll see there are 30-40 articles on this site that explain
what it means to `createBuffersAndAttributesFromArrays` and nothing
about these utils are scary or hard to understand. Explaining
a concept, giving it a name, and then just referring to it by name
is the norm in learning. It lets you more easily build up to more
higher level concepts.
