Title: WebGPU Using Video Efficiently
Description: How to use video in WebGPU
TOC: Using Video

In the [previous article](webgpu-importing-textures.html), we covered
how to load images, canvases, and video into a texture.
This article will cover a more efficient way to use video in WebGPU.

In the previous article we loaded video data into a webgpu texture
by calling `copyExternalImageToTexture`. This function copies
the current frame of video from the video itself into a pre-existing
texture that we created.

WebGPU has another method for using video. It's called `importExternalTexture`
and, like the name suggests, it provides a `GPUExternalTexture`. This external
texture represents the data in the video directly. No copy is made. [^no-copy]
You pass `importExternalTexture` a video and it returns a texture, ready to use.

[^no-copy]: What actually happens is up to the browser implementation.
The WebGPU spec was designed in the hope that browser would not need
to make a copy.

There are a few big caveats to using an texture from `importExternalTexture`.

* ## The texture is only valid until you exit the current JavaScript task.

  For most WebGPU apps that means the texture only exists until your
  `requestAnimationCallback` function ends. Or whatever event you're rendering on; `requestVideoFrameCallback`, `setTimeout`,
  `mouseMove`, etc...  When your function exits the texture is expired.
  To use the video again you must call `importExternalTexture` again.

  An implication of this is that you must make a new bindgroup each
  time you call `importExternalTexture` [^bindgroup-exception] so that
  you can pass the new texture into your shader.

  [^bindgroup-exception]: The spec actually says the implementation
  can return the same texture but it is not required to. If you
  want to check if you got the same texture, compare it to the previous
  texture as in <pre><code>const newTexture = device.importExternalTexture(...);<br>const same = oldTexture === newTexture;</code></pre> If it is
  the same texture then you can reuse your existing bindgroup and
  referenced `oldTexture`.

* ## You must use `texture_external` in your shaders

  We've been using `texture_2d<f32>` in all previous texture examples
  but textures from `importExternalTexture` can only be bound to
  binding points using `texture_external`.

* ## You must use `textureSampleBaseClampToEdge` in your shaders

  We've been using `textureSample` in all previous texture examples
  but textures from `importExternalTexture` can only use
  `textureSampleBaseClampToEdge`. [^textureLoad] Like the name suggests,
  `textureSampleBaseClampToEdge` will only sample the base texture mip level
  (level 0). In other words, external textures can not have a mipmap.
  Further, the function clamps to the edge, meaning, setting a sampler
  to `addressModeU: 'repeat'` will be ignored.

  Note that you can do your own repeating by using `fract` as in:

  ```wgsl
  let color = textureSAmpleBaseClampToEdge(
     someExternalTexture,
     someSampler,
     fract(texcoord)
  );`
  ```

  [^textureLoad]: You can also use `textureLoad` with external textures.

If these restrictions are not okay for your needs then you'll need to use
`copyExternalImageToTexture` like we covered in [the previous article](webgpu-importing-textures.html).

Let's make a working example using `importExternalTexture`. Here's a video

<div class="webgpu_center">
  <div>
     <video muted controls src="../resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4" style="width: 320px";></video>
     <div class="copyright"><a href="https://www.pexels.com/video/dog-walking-outside-the-house-5534310/">by Anna Bondarenko</a></div>
  </div>
</div>

Here are the changes need from our previous example.

First we need to update our shader.

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(2) var<uniform> uni: Uniforms;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
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

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
-  vsOutput.texcoord = xy * vec2f(1, 50);
+  vsOutput.texcoord = xy;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
-@group(0) @binding(1) var ourTexture: texture_2d<f32>;
+@group(0) @binding(1) var ourTexture: texture_external;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
+  return textureSampleBaseClampToEdge(
+      ourTexture,
+      ourSampler,
+      fsInput.texcoord,
+  );
}
```

Above we stopped multiplying the texture coordinates by 50
since that was only there to show repeating and external textures
do not repeat.

We also made the required changes as mentioned above. `texture_2d<f32>`
becomes `texture_external` and `textureSample` becomes `textureSampleBaseClampToEdge`.

We removed all of the code related to creating a texture and
to generating mips.

We of course need to point to our video

```js
-  video.src = 'resources/videos/Golden_retriever_swimming_the_doggy_paddle-360-no-audio.webm';
+  video.src = 'resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4';
```

Since we can't have mip levels there's no need to create samplers that
would use them.

```js
  const objectInfos = [];
-  for (let i = 0; i < 8; ++i) {
+  for (let i = 0; i < 4; ++i) {
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: (i & 1) ? 'linear' : 'nearest',
      minFilter: (i & 2) ? 'linear' : 'nearest',
-      mipmapFilter: (i & 4) ? 'linear' : 'nearest',
    });

  ...
```

Since we don't get a texture until we call `importExternalTexture` we can't
create our bindgroups in advance so we'll save off the information needed to
create them later . [^bindgroups-in-advance]

[^bindgroups-in-advance]: We could split the bind groups so there's
one that holds the sampler and uniformBuffer which we could create
in advance and another that just references the external texture that
we create at render time. Whether that's worth it is up to your particular needs.

```js
  const objectInfos = [];
  for (let i = 0; i < 4; ++i) {

    ...

-    const bindGroups = textures.map(texture =>
-      device.createBindGroup({
-        layout: pipeline.getBindGroupLayout(0),
-        entries: [
-          { binding: 0, resource: sampler },
-          { binding: 1, resource: texture },
-          { binding: 2, resource: uniformBuffer},
-        ],
-      }));

    // Save the data we need to render this object.
    objectInfos.push({
-      bindGroups,
+     sampler,
      matrix,
      uniformValues,
      uniformBuffer,
    });
```

At render time we'll call `importExternalTexture` and create
the bindgroups

```js
  function render() {
-    copySourceToTexture(device, texture, video);
    ...

    const encoder = device.createCommandEncoder({
      label: 'render quad encoder',
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    const texture = device.importExternalTexture({source: video});

    objectInfos.forEach(({sampler, matrix, uniformBuffer, uniformValues}, i) => {
+      const bindGroup = device.createBindGroup({
+        layout: pipeline.getBindGroupLayout(0),
+        entries: [
+          { binding: 0, resource: sampler },
+          { binding: 1, resource: texture },
+          { binding: 2, resource: uniformBuffer},
+        ],
+      });

      ...

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // call our vertex shader 6 times
    });
```

Also, given we can't repeat the texture, let's adjust the
matrix math to make the quads we are drawing more visible
and not stretch them out 50 to 1 like we had before.

```js
  function render() {
    ...
    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup = bindGroups[texNdx];

      const xSpacing = 1.2;
-      const ySpacing = 0.7;
-      const zDepth = 50;
+      const ySpacing = 0.5;
+      const zDepth = 1;

-      const x = i % 4 - 1.5;
-      const y = i < 4 ? 1 : -1;
+      const x = i % 2 - .5;
+      const y = i < 2 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
-      mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
-      mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
+      mat4.rotateX(matrix, 0.25 * Math.PI * Math.sign(y), matrix);
+      mat4.scale(matrix, [1, -1, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      // copy the values from JavaScript to the GPU
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // call our vertex shader 6 times
    });

```

And with that we get a zero copy video texture in WebGPU

{{{example url="../webgpu-simple-textured-quad-external-video.html"}}}

## Why `texture_external`?

Some of you might notice the fact that this way if using video uses
`texture_external` instead of something more common like `texture_2d<f32>`
and it uses `textureSampleBaseClampToEdge` instead of just `textureSample`
and that means if you want to use this way of using textures and you want
to mix it with with other parts of your rendering, you'll need different
shaders. Shaders that using `texture_2d<f32>` when using a static
texture and different shaders using `texture_external` when you want
to use a video.

I think it's important to understand what's happing under the hood here.

Video is often delivered with the luminance part of the video (the brightness of each pixel),
separate from the chroma part of the video (the color of each pixel). Often the resolution
of the color is lower than the luminance part. A common way of separating and encoding this is
[YUV](https://en.wikipedia.org/wiki/Y%E2%80%B2UV) where the data is separated into
luminance (Y), and (UV) color info. This representation generally compresses better
too.

WebGPU's goal for external textures is to use the video directly in the format it's provided.
To do this it *pretends* there is a video texture but in the actual implementation
there may be multiple textures. For example, one texture with the luminance values (Y)
and a separate texture with the UV values. And, those UV values might be specially separated.
Instead being a texture of something like 2 values per pixel interleaved

    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv
    uvuvuvuvuvuvuvuv

They might be arranged like this

    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    uuuuuuuu
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv
    vvvvvvvv

one (u) value per pixel in one area of a texture and one (v) value in another area.
Again, because arranging the data like this often compresses better.

When you add `texture_external` and `textureSampleBaseClampToEdge` to your
shader, WebGPU, behind the scenes, injects code into your shader that takes this
video data and gives you back an RGBA value. It may sample from multiple
textures and or have to do texture coordinate math in order to pull the correct
data out from 2, 3 or more places and convert to RGB.

Here are the Y, U, and V channels from the video above

<div class="webgpu_center">
  <div class="side-by-side">
    <div class="separate">
      <img src="../resources/videos/pexels-anna-bordarenko-5534310-y-channel.png" style="width: 300px;">
      <div>Y channel (luminance)</div>
    </div>
    <div class="separate">
      <div class="side-by-side">
        <div class="separate">
          <img src="../resources/videos/pexels-anna-bordarenko-5534310-u-channel.png" style="width: 150px;">
          <div>U channel<br>(red ↔ yellow)</div>
        </div>
        <div class="separate">
          <img src="../resources/videos/pexels-anna-bordarenko-5534310-v-channel.png" style="width: 150px;">
          <div>V channel<br>( blue ↔ yellow)</div>
        </div>
      </div>
    </div>
  </div>
</div>

WebGPU is effectively providing an optimization here. Traditional graphics
libraries this would be left to you. Either you'd write the code yourself
to convert from YUV to RGB, or you'd ask the OS to do it. You'd copy the data
to an RGBA texture and then use that RGBA texture as `texture_2d<f32>`. This
way is more flexible. You don't have to write different shaders for video vs
static textures. But, it's slower because the conversion has to happen from
the YUV textures, to the RGBA texture.

This slower more flexible method is still available in WebGPU and we covered it
[in the previous article](webgpu-importing-textures.html#a-loading-video).
If you need the flexibility, if you want to be able to use video everywhere without
needing different shaders for video vs static images then use that method.

One reason WebGPU provides this optimization for `texture_external` is because this
is the web. What formats of video are supported in the browser change over time.
WebGPU will handle this for you where as if you had to write the shader yourself
to convert from YUV to RGB, you'd also need to know the format of videos will not
change and that is not a guarantee the web can make.

The most obvious places to use the `texture_external` method described
in this article would be video related features like say meet, zoom, FB messenger
related features, like when doing face recognition for adding visualizations or
background separation. Another might be for VR video once WebGPU is supported in WebXR.

## <a id="a-web-camera"></a> Using the Camera

In fact, let's use the camera. It's a very small change.

First, we don't specify a video to play.

```js
  const video = document.createElement('video');
-  video.muted = true;
-  video.loop = true;
-  video.preload = 'auto';
-  video.src = 'resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4'; /* webgpufundamentals: url */
  await waitForClick();
  await startPlayingAndWaitForVideo(video);
```

Then, when the user clicks play, we call `getUserMedia` and ask for the camera. The resulting stream
is then applied to the video. There are no changes to the WebGPU parts of the code.

```js
  function waitForClick() {
    return new Promise(resolve => {
      window.addEventListener(
        'click',
-        () => {
+        async() => {
          document.querySelector('#start').style.display = 'none';
-          resolve();
+          try {
+            const stream = await navigator.mediaDevices.getUserMedia({
+              video: true,
+            });
+            video.srcObject = stream;
+            resolve();
+          } catch (e) {
+            fail(`could not access camera: ${e.message ?? ''}`);
+          }
        },
        { once: true });
    });
  }
```

Done!

{{{example url="../webgpu-simple-textured-quad-external-video-camera.html"}}}

We could make similar changes to
[the video example in the previous article](webgpu-importing-textures.html#a-loading-video)
if wanted the camera image as the more flexible `texture<f32>` type texture instead of
the more efficient `texture_external` type of texture.
