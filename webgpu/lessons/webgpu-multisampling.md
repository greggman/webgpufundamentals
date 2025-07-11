Title: WebGPU Multisampling
Description: Multisampling / MSAA
TOC: Multisampling / MSAA

MSAA stands for Multi-Sampling Anti-aliasing. Anti-aliasing
means, trying to prevent the problem of aliasing where aliasing
is the blocky problem we get when we try to draw a vector shape as
discrete pixels.

We showed how WebGPU draws things in [the article on fundamentals](webgpu-fundamentals.html).
It takes the clip space vertices we return for the `@builtin(position)` value in the vertex shader
and for every 3 it computes a triangle and then calls the fragment shader for each pixel's center
that is inside that triangle to ask what color to make the pixel.

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels"></div>
    <div>drag the vertices</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-result"></div>
    <div>result</div>
  </div>
</div>

The triangle above is very blocky. We can increase the resolution but, the highest resolution we can
show is the resolution of the display, which might not be enough to not look blocky.

One solution is to render at a higher resolution. For example, say we raise the resolution 4x
(2x in both width and height) and then "bilinear filter" the result into the canvas.
We covered "bilinear filtering" in
[the article on textures](webgpu-textures.html).

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x"></div>
    <div>4x resolution</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-result"></div>
    <div>bilinear filtered result</div>
  </div>
</div>

This solution works but it's wasteful. Every 2x2 pixels in the image on the left gets converted
into 1 pixel in the image on the right but often, all 4 of those pixels are inside the triangle
so there is no need for anti-aliasing. All 4 pixels are red.

<div class="webgpu_center side-by-side flex-gap">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-waste"></div>
    <div>3 of every 4 <span style="color: cyan;">cyan</span> pixels are wasted</div>
  </div>
</div>

Drawing 4 red pixels instead of 1 pixel is a waste of time.
The GPU called our fragment shader 4 times. Fragment shaders can be fairly large and do a lots
of work so we'd like to call them as few times as possible. Even when the triangle crosses 3 pixels
we get this

<div class="webgpu_center">
  <img src="resources/antialias-4x.svg" width="600">
</div>

Above, with 4x rendering and the triangle covering 3 pixels' centers, the fragment shader is called 3 times.
Later we then bilinear filter the result.

This is where multisampling is more efficient. We create a special "multisample texture".
When we draw a triangle to a multisample texture, If any of the 4 *samples*
are inside the triangle, the GPU calls our fragment shader one time, it then writes
the result in only those *samples* that are inside the triangle.

<div class="webgpu_center">
  <img src="resources/antialias-multisample-4.svg" width="600">
</div>

Above, with multisampled rendering and the triangle covering 3 *samples*, the fragment shader is called only 1 time.
We then *resolve* the result. The process would be similar if the triangle covered all 4 sample points. The fragment
shader would only be called once but its result would be written to all 4 samples.

Notice that, unlike the 4x rendering where the CPU checked if the centers of the 4 pixels were inside the triangle,
with multisampled rendering the GPU checks "sample positions" which are not in a grid. Similarly, the sample
values themselves do not represent a grid so the process of "resolving" them is not bilinear filtering but rather
up to the GPU. These un-centered sample positions apparently result in better anti-aliasing for most situations.

## <a id="a-multisampling"></a> How to use multisampling.

So how do we use multisampling? We do it via 3 basic steps

1. Set our pipeline to render to a multisample texture
2. Create a multisample texture the same size as the final texture.
3. Set our render pass to render to the multisample texture and *resolve* to the final texture (our canvas)

To keep it simple, lets take our responsive triangle example at the end of [the article on fundamentals](webgpu-fundamentals.html#a-resizing) and add multisampling.

### Set our pipeline to render to a multisample texture

```js
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    multisample: {
+      count: 4,
+    },
  });
```

Adding the `multisample` setting above makes this pipeline able to render to a multisample
texture.

### Create a multisample texture the same size as our final texture

Our final texture is the canvas's texture. Since the canvas might change size, like when the user resizes the window, we'll create this texture when we render.

```js
+  let multisampleTexture;

  function render() {
+    // Get the current texture from the canvas context
+    const canvasTexture = context.getCurrentTexture();
+
+    // If the multisample texture doesn't exist or
+    // is the wrong size then make a new one.
+    if (!multisampleTexture ||
+        multisampleTexture.width !== canvasTexture.width ||
+        multisampleTexture.height !== canvasTexture.height) {
+
+      // If we have an existing multisample texture destroy it.
+      if (multisampleTexture) {
+        multisampleTexture.destroy();
+      }
+
+      // Create a new multisample texture that matches our
+      // canvas's size
+      multisampleTexture = device.createTexture({
+        format: canvasTexture.format,
+        usage: GPUTextureUsage.RENDER_ATTACHMENT,
+        size: [canvasTexture.width, canvasTexture.height],
*        sampleCount: 4,
+      });
+    }

  ...
```

The code above creates a multisample texture if (a) we don't have one
or (b) the one we have does not match the size of the canvas.
We create a texture the same size as the canvas but we add `sampleCount: 4`
to make it a multisample texture.

### Set our render pass to render to the multisample texture and *resolve* to the final texture (our canvas)

```js
-    // Get the current texture from the canvas context and
-    // set it as the texture to render to.
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();

+    // Set the multisample texture as the texture to render to
+    renderPassDescriptor.colorAttachments[0].view =
+        multisampleTexture;
+    // Set the canvas texture as the texture to "resolve"
+    // the multisample texture to.
+    renderPassDescriptor.colorAttachments[0].resolveTarget =
+        canvasTexture;
```

*Resolving* is the process of taking the multisample texture and converting it to a
the size of the texture we really wanted. In this case, our canvas. Above, in our
4x version we did this step manually by bilinear filtering the 4x texture to the 1x
texture. This is a similar process but it's not actually bilinear filter with multisampled
textures. [See below](#a-not-a-grid)

And here is

{{{example url="../webgpu-multisample-simple.html"}}}

There isn't much to see but if we were to compare them side by side at low-resolution,
the original on the left without multisampling and the one on the right with, we can
see the one on the right has been antialiased.

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="simple-triangle"></div>
    <div>original</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="simple-triangle-multisample"></div>
    <div>with multisampling</div>
  </div>
</div>

Some things to note:

## `count` must be `4`

In WebGPU version 1, you can only set `multisample: { count }` on a render pipeline
to 4 or 1. Similarly you can only set the `sampleCount` on a texture to 4 or 1.
1 is the default and means the texture is not multisampled.

## <a id="a-not-a-grid"></a> Multisampling does not use a grid

As pointed out above, multisampling does not happen on a grid. For sampleCount = 4
the sample locations are like this.

<div class="webgpu_center">
  <img src="resources/multisample-4x.svg" width="256">
  <div class="center">count: 4</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-2x.svg" width="256">
  <div class="center">count: 2</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-8x.svg" width="256">
  <div class="center">count: 8</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-16x.svg" width="256">
  <div class="center">count: 16</div>
</div>

**WebGPU currently only supports a count of 4**

## You do not have to set a resolve target on every render pass

Setting `colorAttachment[0].resolveTarget` says to WebGPU, "when all the drawing in this render pass has finished,
downscale the multisample texture into the texture set on `resolveTarget`. If you have multiple
render passes you probably don't want to resolve until the last pass. While it's fastest to
resolve in the last pass it's also perfectly acceptable
to make an empty last render pass to do nothing but resolve. 
Just make sure you set the `loadOp` to `'load'`
and not `'clear'` in all the passes except the first pass otherwise it will be cleared.

## You can optionally run the fragment shader on each sample point.

Above we said that the fragment shader only runs once for every 4 samples in the multisample
texture. It runs it once and then it stores the result in the samples that were actually inside
the triangle. This is why it's faster than rendering at 4x the resolution.

In [the article on inter-stage variables](webgpu-inter-stage-variables.html#a-interpolate)
we brought up that you can mark how to interpolate inter-stage variables
with the `@interpolate(...)` attribute. One option
is `sample`, in which case the fragment shader will be run once for each sample.
There are also builtins like `@builtin(sample_index)`, which will tell you which sample
you are currently working on, and `@builtin(sample_mask)`, which, as an input, will tell you which
samples were inside the triangle, and, as an output, will let you prevent sample points
from getting updated.

## `center` vs `centroid`

There are 3 *sampling* interpolation modes. Above we mentioned `'sample'` mode
where the fragment shader is called once for each sample. The other two modes are
`'center'`, which is the default, and `'centroid'`. 

* `'center'` interpolates values relative to the center of the pixel.

<div class="webgpu_center">
  <img src="resources/multisample-centroid-issue.svg" width="400">
</div>

Above we can see a single pixel/texel where
sample points `s1` and `s3` are inside the triangle. Our fragment shader will be called one
time and it will be passed inter-stage variables with their values interpolated relative
to the center (`c`) of the pixel. The problem is, **`c` is outside of the triangle**.

This might not matter, but it's possible you have some math that assumes the value is inside
the triangle. I don't know of a good example but imagine we add barycentric coordinates, one
at each point. Barycentric coordinate are basically 3 coordinates that go from zero to
one where each value represents how far from one of the vertices of the triangle a specific
position is. To do this, we just add barycentric points like this.

```wgsl
+struct VOut {
+  @builtin(position) position: vec4f,
+  @location(0) baryCoord: vec3f,
+};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
-) -> @builtin(position) vec4f {
+) -> VOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );
+  let bary = array(
+    vec3f(1, 0, 0),
+    vec3f(0, 1, 0),
+    vec3f(0, 0, 1),
+  );
-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+  var vout: VOut;
+  vout.position = vec4f(pos[vertexIndex], 0.0, 1.0);
+  vout.baryCoord = bary[vertexIndex];
+  return vout;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
+@fragment fn fs(vin: VOut) -> @location(0) vec4f {
+  let allAbove0 = all(vin.baryCoord >= vec3f(0));
+  let allBelow1 = all(vin.baryCoord <= vec3f(1));
+  let inside = allAbove0 && allBelow1;
+  let red = vec4f(1, 0, 0, 1);
+  let yellow = vec4f(1, 1, 0, 1);
+  return select(yellow, red, inside);
}
```

Above we're associating `1, 0, 0` with the first point, `0, 1, 0` with the 2nd,
and `0, 0, 1` with the 3rd. Interpolating between them, no value should be below
0 or above 1.

In the fragment shader we test if all three (x, y, and z) of those interpolated values are `>= 0` with
`all(vin.baryCoord >= vec3f(0))`. We also test if they are all `<= 1` with
`all(vin.baryCoord <= vec3f(1))`. Finally we `&` the 2 together. This tells
us if we're inside or outside the triangle. The end selects red if we're inside
and yellow if not inside. Since we're interpolating *between* the vertices
you'd expect them to always be inside.

To try it out let also make our example be lower resolution so it's easier
to see the results

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 16 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 16 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // re-render
      render();
    }
  });
  observer.observe(canvas);
```

and some CSS

```js
canvas {
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
  display: block;  /* make the canvas act like a block   */
  width: 100%;     /* make the canvas fill its container */
  height: 100%;
}
```

Which if we run we see this

{{{example url="../webgpu-multisample-center-issue.html"}}}

We can see, some of the edge pixels have yellow in them. This is because, as
pointed out above, the interpolated inter-stage variable values that are
passed to the fragment shader are relative to the center of the pixel.
That center is outside the triangle in the cases where we're seeing
yellow.

Switching the interpolation sample mode to `'centroid'` tries to fix this
issue. In `'centroid'` mode, the GPU uses the centroid of the area of the triangle
that's inside the pixel.

<div class="webgpu_center">
  <img src="resources/multisample-centroid-fix.svg" width="400">
</div>


If we take our sample and change the interpolation mode to `'centroid'`

```wgsl
struct VOut {
  @builtin(position) position: vec4f,
-  @location(0) baryCoord: vec3f,
+  @location(0) @interpolate(perspective, centroid) baryCoord: vec3f,
};
```

Now the GPU passes the inter-stage variables interpolated values relative
to the centroid and the issue of the yellow pixels goes away.

{{{example url="../webgpu-multisample-centroid.html"}}}

> Note: The GPU may or may not actually compute the centroid
of the area of the triangle inside the pixel. All that is guaranteed
is that the inter-stage variables will be interpolated relative to
some area inside the part of the triangle that intersects the pixel.

## What about anti-aliasing inside a triangle?

Multisampling generally only helps the edges of triangles. Since it's only calling the fragment
shader once, when all sample positions are inside the triangle we just get the same result of the fragment shader
written to all samples, which means the result will be no different than if we were not multisampling.

In the example above, since we were drawing solid red, there's clearly nothing wrong.
What about when we're sampling from with a texture, there may be contrasty colors next to each other inside the triangle.
Don't we want each sample's color to come from a different place in the texture?

Inside the triangle we use [mipmaps and filtering](webgpu-textures.html) to pick the appropriate color
so anti-aliasing may be less important inside a triangle. On the other hand, this can also be a problem
with certain rendering techniques which is why there are other solutions to anti-aliasing and also possibly
why you can use `@interpolate(..., sample)` if you want to do per sample processing.

## Multisampling is not the only solution for anti-aliasing.

We mentioned 2 solutions on this page.
(1) Drawing to a higher resolution texture and then drawing that texture at a lower resolution.
(2) Using multisampling. There are many others though.
[Here's an article that covers a few of them](https://vr.arvilab.com/blog/anti-aliasing).

Some other resources:

* [A Quick overview of MSAA](https://therealmjp.github.io/posts/msaa-overview/)
* [Multisampling primer](https://www.rastergrid.com/blog/gpu-tech/2021/10/multisampling-primer/)

<!-- keep this at the bottom of the article -->
<link href="webgpu-multisampling.css" rel="stylesheet">
<script type="module" src="webgpu-multisampling.js"></script>
