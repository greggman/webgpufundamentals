Title: WebGPU Cubemaps
Description: How to use cubemaps in WebGPU
TOC: Cube Maps

This article assumes you've read [the article on textures](webgpu-textures.html) and [the article on importing images into textures](webgpu-importing-textures.html).
This article also uses concepts covered in [the article on directional lighting](webgpu-lighting-directional.html).
If you have not read those articles already you might want to read them first.

In a [previous article](webgpu-textures.html) we covered how to use textures,
how they are referenced by texture coordinates that go from 0 to 1 across and up
the texture, and how they are filtered optionally using mips.

Another kind of texture is a *cubemap*. A cubemap consists of 6 faces representing
the 6 faces of a cube. Instead of the traditional texture coordinates that
have 2 dimensions, a cubemap uses a normal or in other words a 3D direction.
Depending on the direction the normal points one of the 6 faces of the cube
is selected and then within that face the pixels are sampled to produce a color.

Let's make a simple example, we'll use a 2D canvas to make the images used in
each of the 6 faces.

Here's some code to fill a canvas with a color and a centered message

```js
function generateFace(size, {faceColor, textColor, text}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = faceColor;
  ctx.fillRect(0, 0, size, size);
  ctx.font = `${size * 0.7}px sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const m = ctx.measureText(text);
  ctx.fillText(
    text,
    (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
    (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
  );
  return canvas;
}
```

And here's some code to call it to generate 6 images

```js
const faceSize = 128;
const faceCanvases = [
  { faceColor: '#F00', textColor: '#0FF', text: '+X' },
  { faceColor: '#FF0', textColor: '#00F', text: '-X' },
  { faceColor: '#0F0', textColor: '#F0F', text: '+Y' },
  { faceColor: '#0FF', textColor: '#F00', text: '-Y' },
  { faceColor: '#00F', textColor: '#FF0', text: '+Z' },
  { faceColor: '#F0F', textColor: '#0F0', text: '-Z' },
].map(faceInfo => generateFace(faceSize, faceInfo));

// show the results
for (const canvas of faceCanvases) {
  document.body.appendChild(canvas);
}
```

{{{example url="../webgpu-cube-faces.html" }}}

Now let's apply those to a cube using a cubemap. We'll start with the code
from the texture atlas example [in the article on importing textures](webgpu-importing-textures.html#a-texture-atlases).

First off let's change the shaders to use a cube map

```wgsl
struct Uniforms {
  matrix: mat4x4f,
};

struct Vertex {
  @location(0) position: vec4f,
-  @location(1) texcoord: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
-  @location(0) texcoord: vec2f,
+  @location(0) normal: vec3f,
};

...

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = uni.matrix * vert.position;
-  vsOut.texcoord = vert.texcoord;
+  vsOut.normal = normalize(vert.position.xyz);
  return vsOut;
}
```

We've removed the texture coordinates from the shader and
changed the inter-stage variable to pass a normal to the fragment shader.
Since the positions of our cube are perfectly centered around the origin
we can just use them as our normals.

Recall from [the article on lighting](webgpu-lighting-directional.html) that
normals are a direction and are usually used to specify the direction of
the surface of some vertex. Because we are using the normalized positions
for our normals if we were to light this we'd get smooth lighting across
the cube.

{{{diagram url="resources/cube-normals.html" caption="standard cube normals vs this cube's normals" width="700" height="400"}}}

Since we're not using texture coordinates we can remove all code related to
setting up the texture coordinates.

```js
  const vertexData = new Float32Array([
-     // front face     select the top left image
-    -1,  1,  1,        0   , 0  ,
-    -1, -1,  1,        0   , 0.5,
-     1,  1,  1,        0.25, 0  ,
-     1, -1,  1,        0.25, 0.5,
-     // right face     select the top middle image
-     1,  1, -1,        0.25, 0  ,
-     1,  1,  1,        0.5 , 0  ,
-     1, -1, -1,        0.25, 0.5,
-     1, -1,  1,        0.5 , 0.5,
-     // back face      select to top right image
-     1,  1, -1,        0.5 , 0  ,
-     1, -1, -1,        0.5 , 0.5,
-    -1,  1, -1,        0.75, 0  ,
-    -1, -1, -1,        0.75, 0.5,
-    // left face       select the bottom left image
-    -1,  1,  1,        0   , 0.5,
-    -1,  1, -1,        0.25, 0.5,
-    -1, -1,  1,        0   , 1  ,
-    -1, -1, -1,        0.25, 1  ,
-    // bottom face     select the bottom middle image
-     1, -1,  1,        0.25, 0.5,
-    -1, -1,  1,        0.5 , 0.5,
-     1, -1, -1,        0.25, 1  ,
-    -1, -1, -1,        0.5 , 1  ,
-    // top face        select the bottom right image
-    -1,  1,  1,        0.5 , 0.5,
-     1,  1,  1,        0.75, 0.5,
-    -1,  1, -1,        0.5 , 1  ,
-     1,  1, -1,        0.75, 1  ,
+     // front face
+    -1,  1,  1,
+    -1, -1,  1,
+     1,  1,  1,
+     1, -1,  1,
+     // right face
+     1,  1, -1,
+     1,  1,  1,
+     1, -1, -1,
+     1, -1,  1,
+     // back face
+     1,  1, -1,
+     1, -1, -1,
+    -1,  1, -1,
+    -1, -1, -1,
+    // left face
+    -1,  1,  1,
+    -1,  1, -1,
+    -1, -1,  1,
+    -1, -1, -1,
+    // bottom face
+     1, -1,  1,
+    -1, -1,  1,
+     1, -1, -1,
+    -1, -1, -1,
+    // top face
+    -1,  1,  1,
+     1,  1,  1,
+    -1,  1, -1,
+     1,  1, -1,
  ]);

  ...

  const pipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
-          arrayStride: (3 + 2) * 4, // (3+2) floats 4 bytes each
+          arrayStride: (3) * 4, // (3) floats 4 bytes each
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
-            {shaderLocation: 1, offset: 12, format: 'float32x2'},  // texcoord
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

In the fragment shader we need to use a `texture_cube` instead of a `texture_2d`
and `textureSample` when used with a `texture_cube` takes a `vec3f` direction
so we pass the normal. Since the normal is a inter-stage variable and will be interpolated
we need to normalize it.

```wgsl
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var ourSampler: sampler;
-@group(0) @binding(2) var ourTexture: texture_2d<f32>;
+@group(0) @binding(2) var ourTexture: texture_cube<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
-  return textureSample(ourTexture, ourSampler, vsOut.texcoord);
+  return textureSample(ourTexture, ourSampler, normalize(vsOut.normal));
}
```

To actually make a cube map we make a 2D texture with 6 layers. Let's change all our helpers
so they handle multiple sources.

## <a id="a-texture-helpers"></a> Making our texture helpers handle multiple layers

First let's take our `createTextureFromSource` and change it to `createTextureFromSources`
where it takes an array of sources

```js
-  function createTextureFromSource(device, source, options = {}) {
+  function createTextureFromSources(device, sources, options = {}) {
+    // Assume are sources all the same size so just use the first one for width and height
+    const source = sources[0];
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
-      size: [source.width, source.height],
+      size: [source.width, source.height, sources.length],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
-    copySourceToTexture(device, texture, source, options);
+    copySourcesToTexture(device, texture, sources, options);
    return texture;
  }
```

The code above makes a texture where multiple layers, one for each source.
It also assumes all the sources are the same size. This seems like a good bet
because it would be very rare for them to be different sizes for layers of the same texture.

Now we need to update `copySourceToTexture` to handle multiple sources.

```js
-  function copySourceToTexture(device, texture, source, {flipY} = {}) {
+  function copySourcesToTexture(device, texture, sources, {flipY} = {}) {
+    sources.forEach((source, layer) => {
*      device.queue.copyExternalImageToTexture(
*        { source, flipY, },
-        { texture },
+        { texture, origin: [0, 0, layer] },
*        { width: source.width, height: source.height },
*      );
+  });

    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }
```

Above, the only major difference is we added a loop to loop over the sources
and we set an `origin` for where in the texture to copy the source so that
we copy each source to its respective layer.

Now we need to update `generateMips` to handle multiple sources.

```js
  const generateMips = (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};

    return function generateMips(device, texture) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(
                // 1st triangle
                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2nd triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }

      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module,
          },
          fragment: {
            module,
            targets: [{ format: texture.format }],
          },
        });
      }
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      });

      for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
+        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
*          const bindGroup = device.createBindGroup({
*            layout: pipeline.getBindGroupLayout(0),
*            entries: [
*              { binding: 0, resource: sampler },
-              { binding: 1, resource: texture.createView({baseMipLevel, mipLevelCount: 1}) },
+              {
+                binding: 1,
+                resource: texture.createView({
+                  dimension: '2d',
+                  baseMipLevel: baseMipLevel - 1,
+                  mipLevelCount: 1,
+                  baseArrayLayer: layer,
+                  arrayLayerCount: 1,
+                }),
*              },
*            ],
*          });
*
*          const renderPassDescriptor = {
*            label: 'our basic canvas renderPass',
*            colorAttachments: [
*              {
-                view: texture.createView({baseMipLevel, mipLevelCount: 1}),
+                view: texture.createView({
+                  dimension: '2d',
+                  baseMipLevel: baseMipLevel,
+                  mipLevelCount: 1,
+                  baseArrayLayer: layer,
+                  arrayLayerCount: 1,
+                }),
*                loadOp: 'clear',
*                storeOp: 'store',
*              },
*            ],
*          };
*
*          const pass = encoder.beginRenderPass(renderPassDescriptor);
*          pass.setPipeline(pipeline);
*          pass.setBindGroup(0, bindGroup);
*          pass.draw(6);  // call our vertex shader 6 times
*          pass.end();
+        }
+      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();
```

We added a loop to handle each layer of the texture.
We changed the views so they select a single layer. We also had to explicitly choose
`dimension: '2d'` for our views because by default, a view of a 2d texture with more than
1 layer gets the `dimension: '2d-array'` which for the purpose of generating
mipmaps is not what we want.

> Note: [The article on compatibility mode](webgpu-compatibility-mode.html) provides
> a version of `generateMips` that works in compatibility mode.

Although we won't use them here, our original `createTextureFromSource` and
`copySourceToTexture` functions can easily be replaced with

```js
  function copySourceToTexture(device, texture, source, options = {}) {
    copySourcesToTexture(device, texture, [source], options);
  }

  function createTextureFromSource(device, source, options = {}) {
    return createTextureFromSources(device, [source], options);
  }
```

Now that we have these ready we can use the faces we made at the top of the article

```js
  const texture = await createTextureFromSources(
      device, faceCanvases, {mips: true, flipY: false});
```

All that's left to do is change our texture's view in the bindGroup

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
      { binding: 1, resource: sampler },
-      { binding: 2, resource: texture },
+      { binding: 2, resource: texture.createView({dimension: 'cube'}) },
    ],
  });
```

And poof

{{{example url="../webgpu-cube-map.html" }}}

Note the order of the faces as layers of the texture

* layer 0 => positive x
* layer 1 => negative x
* layer 2 => positive y
* layer 3 => negative y
* layer 4 => positive z
* layer 5 => negative z

Another way to think about this is if you called `textureSample` and passed
the corresponding directions it would return the center pixel(s) color for that layer
of the texture.

* `textureSample(tex, sampler, vec3f( 1, 0, 0))` => center of layer 0
* `textureSample(tex, sampler, vec3f(-1, 0, 0))` => center of layer 1
* `textureSample(tex, sampler, vec3f( 0, 1, 0))` => center of layer 2
* `textureSample(tex, sampler, vec3f( 0,-1, 0))` => center of layer 3
* `textureSample(tex, sampler, vec3f( 0, 0, 1))` => center of layer 4
* `textureSample(tex, sampler, vec3f( 0, 0,-1))` => center of layer 5

Using a cubemap to texture a cube is **not** what cubemaps are normally
used for. The *correct* or rather standard way to texture a cube is
to use a texture atlas like we [mentioned before](webgpu-importing-textures.html#a-texture-atlases).
The point of this article was to introduce the concept of cube map and show how you pass it
directions (normals) and it returns the color of the cube in that direction.

Now that we've learned what a cubemap is and how to set one up what is a cubemap
used for? Probably the single most common thing a cubemap is used for is as an
[*environment map*](webgpu-environment-maps.html).

