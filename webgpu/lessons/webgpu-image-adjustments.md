Title: WebGPU Post Processing - Image Adjustments
Description: Image Adjustments
TOC: Image Adjustments

This is article is the 1st in a short series
about image adjustments. Each one builds on the previous lesson so you may find
them easiest to understand by reading them in order.

{{{toc-steps list="image-adjustments.hanson"}}}

In [a previous article](webgpu-post-processing.html) we covered how to do
[post processing](webgpu-post-processing.html). Some common operations to
want to do are often called, image adjustments as seen in
image editing programs like Photoshop, gIMP, Affinity Photo, etc...

In preparation, lets make an example that load an image and has
a post processing step. This will be effectively the first part
of [the previous article](webgpu-post-processing.html) merged
with our example of loading an image from
[the article on loading images into textures](webgpu-importing-textures.html).

Remember, in the previous post processing article, first we drew something
to a texture. Then we applied a post processing pass to get that texture
to the canvas. Here we'll have a similar setup but for the first part, instead
of drawing a bunch of moving circles we'll just draw an image. [^one-pass]

[^one-pass]: Technically, for image adjustments, we don't need 2 steps. First drawing
the images into a texture, and then applying the adjustments. We could
just apply the adjustments as we draw the image. The advantage of doing
it as a separate process is we can use it in any situation, for example
a game might use post processing based image adjustments to set a tone,
to fade in and out, and for various other effects.

Here's the shaders

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;

@vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
  let positions = array(
    vec2f( 0,  0),
    vec2f( 1,  0),
    vec2f( 0,  1),
    vec2f( 0,  1),
    vec2f( 1,  0),
    vec2f( 1,  1),
  );
  let pos = positions[vNdx];
  return VSOutput(
    uni.matrix * vec4f(pos, 0, 1),
    pos,
  );
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(tex, smp, fsInput.texcoord);
}
```

This shader is hard coded to draw a unit quad, a 1x1 unit rectangle, in the top right
corner. This is effectively what we had in the first example of
[loading an image into a texture](webgpu-importing-textures.html). The difference
this time is we multiply quad's positions by a matrix we pass in in a uniform buffer.
This will let us orient, position, and scale the quad.

Here's the code to use it

```js
import {mat4} from '../3rdparty/wgpu-matrix.module.js';

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
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

  const module = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(0) var<uniform> uni: Uniforms;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      @group(0) @binding(2) var smp: sampler;

      @vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
        let positions = array(
          vec2f( 0,  0),
          vec2f( 1,  0),
          vec2f( 0,  1),
          vec2f( 0,  1),
          vec2f( 1,  0),
          vec2f( 1,  1),
        );
        let pos = positions[vNdx];
        return VSOutput(
          uni.matrix * vec4f(pos, 0, 1),
          pos,
        );
      }

      @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
        return textureSample(tex, smp, fsInput.texcoord);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'textured unit quad',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: 'rgba8unorm' }],
    },
  });

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
  };

  const imageUniformBuffer = device.createBuffer({
    size: 4 * 16,  // mat4x4
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const imageTexture = await createTextureFromImage(
    device,
    'resources/images/david-clode-clown-fish.jpg',
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const imageBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: imageUniformBuffer  },
      { binding: 1, resource: imageTexture },
      { binding: 2, resource: imageSampler },
    ],
  });

```

The image being loaded is by [David Clode](https://unsplash.com/@davidclode) from [here](https://unsplash.com/photos/orange-and-white-clown-fish-x9yfTxHpj5w).

The post processing code is pretty much the same as the first post processing example.
It does nothing but we keep the a superfluous uniform struct just so we don't have to
remove the uniform buffer setting code and add it back in the next step.

```js
  const postProcessModule = device.createShaderModule({
    code: `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
      ) -> VSOutput {
        var pos = array(
          vec2f(-1.0, -1.0),
          vec2f(-1.0,  3.0),
          vec2f( 3.0, -1.0),
        );

        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
        return vsOutput;
      }

      struct Uniforms {
*        unused: f32,
      };

      @group(0) @binding(0) var postTexture2d: texture_2d<f32>;
      @group(0) @binding(1) var postSampler: sampler;
      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
*        _ = uni; // so it's included in the bind group
        let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
        var rgb = color.rgb;
        return vec4f(rgb, color.a);
      }
    `,
  });

  const postProcessPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: postProcessModule },
    fragment: {
      module: postProcessModule,
      targets: [ { format: presentationFormat }],
    },
  });

  const postProcessSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      { loadOp: 'clear', storeOp: 'store' },
    ],
  };

  const postProcessUniformBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let renderTarget;
  let postProcessBindGroup;

  function setupPostProcess(canvasTexture) {
    if (renderTarget?.width === canvasTexture.width &&
        renderTarget?.height === canvasTexture.height) {
      return;
    }

    renderTarget?.destroy();
    renderTarget = device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    renderPassDescriptor.colorAttachments[0].view = renderTarget;

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: renderTarget },
        { binding: 1, resource: postProcessSampler },
        { binding: 2, resource: postProcessUniformBuffer  },
      ],
    });
  }

  function postProcess(encoder, srcTexture, dstTexture) {
    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }
```

The rendering switches from a request animation frame loop
to rendering on demand.

```js
    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

*    // css 'cover'
*    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
*    const imageAspect = imageTexture.width / imageTexture.height;
*    const aspect = canvasAspect / imageAspect;
*    const aspectScale = aspect > 1 ? [1, aspect, 1] : [1 / aspect, 1, 1];
*
*    const matrix = mat4.identity();
*    mat4.scale(matrix, [2, 2, 1], matrix);
*    mat4.scale(matrix, aspectScale, matrix);
*    mat4.translate(matrix, [-0.5, -0.5, 1], matrix);
*
*    // Copy our the uniform values to the GPU
*    device.queue.writeBuffer(imageUniformBuffer, 0, matrix);

    // Draw the image to a texture.
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, imageBindGroup);
    pass.draw(6);
    pass.end();

    postProcess(encoder, renderTarget, canvasTexture);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
    render();
  });
  observer.observe(canvas);
```

The code above computes a matrix that produces a CSS style `cover` mode for our image. In other words, it scales the image so the entire canvas is covered.

Let's add a few tiny embellishments:

Let's make it so you can drag and drop an image.
We'll use a helper library.

```js
+import * as dragAndDrop from './resources/js/drag-and-drop.js';

...

-  const imageTexture = await createTextureFromImage(
+  let imageTexture = await createTextureFromImage(
    device,
    'resources/images/david-clode-clown-fish.jpg',
  );

  const imageSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

-  const imageBindGroup = device.createBindGroup({
+  let imageBindGroup;
+  function updateBindGroup() {
+    imageBindGroup = device.createBindGroup({
*      layout: pipeline.getBindGroupLayout(0),
*      entries: [
*        { binding: 0, resource: imageUniformBuffer  },
*        { binding: 1, resource: imageTexture },
*        { binding: 2, resource: imageSampler },
*      ],
*    });
+  }
+  updateBindGroup();

...

+  const gui = new GUI();
+  gui.name('Drag-n-Drop Image');
+  gui.onChange(render);

...

+  async function readImageFile(file) {
+    const newImageTexture = await createTextureFromImage(device, URL.createObjectURL(file));
+    imageTexture.destroy();
+    imageTexture = newImageTexture;
+    updateBindGroup();
+    render();
+  }
+
+  dragAndDrop.setup({msg: 'Drop Image File here'});
+  dragAndDrop.onDropFile(readImageFile);

```

The `GUI` part is not needed but it will tell the user they can drag-and-drop an image.

Then, since most phone's don't support drag-and-drop, lets
make it so you can paste in an image. Again we'll use a helper.

```js
+import onPasteImage from './resources/js/on-paste-image.js';

...

  dragAndDrop.setup({msg: 'Drop Image File here'});
  dragAndDrop.onDropFile(readImageFile);

+  onPasteImage(readImageFile);
```

Now you should be able to select an image on your phone
and paste it into the example. Note, this will only work
if the same has the focus or if you run it in its own page.

Those details were maybe not important but they were small and will let you try your own images.

So here's that running.

{{{example url="../webgpu-post-processing-image-adjustments-noop.html"}}}

## <a id="a-brightness"></a> Brightness

Probably the easiest image adjustment is "brightness".
Here's another image

<div class="webgpu_center center"><div data-diagram="original" data-labels='{"type": "original"}'></div></div>
<div class="webgpu_center center"><div>
  <a href="https://unsplash.com/photos/a-happy-corgi-dog-rests-outdoors-with-tongue-out-RQFMEBJcolY">Photo</a> by <a href="https://unsplash.com/@alvannee">Alvan Nee</a>
</div></div>

And here it is with a brightness adjustment

<div class="webgpu_center center"><div data-diagram="brightness" data-labels='{"type": "brightness"}'></div></div>

The brightness adjustment goes from -1 to 1 where:

* &nbsp;0 = don't adjust it. 
* -1 = remove 100% of the brightness.
* +1 = make it as bright as possible [^hdr]

[^hdr]: HDR can go higher than 1.

To do this all we need to do is add the brightness setting to the color in our post processing fragment shader.

Here's the change to our shader

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

+fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
+  return color + brightness;
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
-  unused: f32,
+  brightness: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
-  _ = uni; // so it's included in the bind group
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustBrightness(rgb, uni.brightness);
  return vec4f(rgb, color.a);
}
```

Then we need to set the brightness.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
+    device.queue.writeBuffer(
+      postProcessUniformBuffer,
+      0,
+      new Float32Array([
+        settings.brightness,
+      ]),
+    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

+  const settings = {
+    brightness: 0,
+  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
+  gui.add(settings, 'brightness', -1, 1);
```

And with that we can adjust the brightness

{{{example url="../webgpu-post-processing-image-adjustments-brightness.html"}}}

# <a id="a-contrast"></a> Contrast

Another relatively easy one is "contrast"

<div class="webgpu_center center"><div data-diagram="contrast" data-labels='{"type": "contrast"}'></div></div>

For contrast, have a value from -1 to 10 and for each
color channel, if the value is < 0.5 we push it toward 0. If it's > 0.5 we push it toward one. This pushes the colors apart.

Here's the changes to the shader

```wgsl
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

fn adjustBrightness(color: vec3f, brightness: f32) -> vec3f {
  return color + brightness;
}

+fn adjustContrast(color: vec3f, contrast: f32) -> vec3f {
+  let c = contrast + 1.0;
+  return clamp(0.5 + c * (color - 0.5), vec3f(0), vec3f(1));
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5) + vec2f(0.5);
  return vsOutput;
}

struct Uniforms {
  brightness: f32,
+  contrast: f32,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
  rgb = adjustBrightness(rgb, uni.brightness);
+  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

You can see above we take the color and subtract 0.5.
This makes the colors that were below 0.5 to be negative
and the colors that were above 0.5 positive. We then
multiple by our contrast setting +1. So a setting of 0
will multiply by 1 (no change). We then add 0.5 back in.
When the contrast setting is below 0.5 this will push
the colors toward 0.5 and at a contrast setting of -1
they'll all become 0.5 (gray). For contrast settings above 0
the colors will be pushed away from 0.5.

Again we need to make a way to set the new adjustment.

```js
  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
+        settings.contrast,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
+    contrast: 0,
  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
+  gui.add(settings, 'contrast', -1, 10);
```

Note that our setting of 10 as the maximum is a little arbitrary. Since we're
moving the values away from 0.5 by multiplying with our contrast value, if the
color is 0.51 and the contrast is 10 then we'll end up making the new color 0.60
(0.5 + 10 * 0.01). That's not all the way to 1. In practice though, if you try
it below, you'll see that even above 6 not much changes. Maybe you'd have to
pick a very low contrast image to need higher contrast values.

{{{example url="../webgpu-post-processing-image-adjustments-contrast.html"}}}

It's important to note these operations are order dependent. We apply brightness
and then contrast. Since contrast pushes colors away from 0.5 and brightness
adds to the overall color then, as it is, for a given brightness setting we're
effectively choosing where the 0.5 level is in the image before the contrast is
applied.

# <a id="a-hue-saturation-lightness"></a> Hue Saturation Lightness (HSL)

It's common to allow a hue, saturation, and lightness adjustment.

<div class="webgpu_center center"><div data-diagram="hsl" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div></div>

These adjustments generally go together which
we'll see why when we go over how they work.

Recall that our colors are represented by red, green,
and blue channels, each going from 0 to 1. This can
be represented as a cube where red is one dimension,
green another, and blue a 3rd.

HSL takes all of those colors and maps them to a cylinder
where H is the angle around the cylinder, S is the distance
from the center with 0 being at the center (no saturation) and 1 the edge
(maximum saturation). The L is position along the length
of the cylinder were 0 is no lightness (black) and 1 is
maximum lightness (white)

Every color in the RGB space has a corresponding HSL value.

<div class="webgpu_center center">
  <div class="rgb-hsl" style="max-width: 1100px;">
    <div data-diagram="rgbDiagram" data-labels='{"r": "r", "g": "g", "b": "b"}'></div>
    <div data-diagram="hslDiagram" data-labels='{"h": "hue", "s": "saturation", "l": "lightness"}'></div>
  </div>
</div>

It's not too difficult to convert from one space to the other. It's actually
more difficult to explain the conversion. In any case, here's a shader function
to convert from RGB to HSL

```wgsl
struct HSL {
  h: f32,
  s: f32,
  l: f32,
};

fn rgbToHsl(rgb: vec3f) -> HSL {
  let cMin = min(min(rgb.r, rgb.b), rgb.g);
  let cMax = max(max(rgb.r, rgb.b), rgb.g);
  let delta = cMax - cMin;

  let l = (cMax + cMin) / 2.0;
  if (delta == 0.0) {
    return HSL(0, 0, l);
  }

  var h = 0.0;
  if (rgb.r == cMax) {
    h = (rgb.g - rgb.b) / delta;
  } else if (rgb.g == cMax) {
    h = 2.0 + (rgb.b - rgb.r) / delta;
  } else {
    h = 4.0 + (rgb.r - rgb.g) / delta;
  }
  h = h / 6.0;
  let s = delta / (1.0 - abs(2.0 * l - 1.0));
  return HSL(h, s, l);
}
```

This function returns a 3 values in the 0 to 1 range. We could have passed
out a `vec3f` for the result but it seemed nicer to declare an `HSL` struct
so the members can be referred to as `h`, `s`, and `l` instead of `x`, `y`, and `z`.

Here's the opposite function that converts from HSL to RGB.

```wgsl
fn hslToRgb(hsl: HSL) -> vec3f {
  let c = vec3f(fract(hsl.h), clamp(vec2f(hsl.s, hsl.l), vec2f(0), vec2f(1)));
  let rgb = clamp(abs((c.x * 6.0 + vec3f(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3f(0), vec3f(1));
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}
```

This function clamps saturation and lightness between 0 and 1.
It also uses `fract(hsl.h)` which means it's safe to pass in any values
[~precision]. For example you could set the saturation to 50, it will
just get clamped to 1. You could set the hue to 75.3, it will be the same as 0.3.

Given those 2 functions we can change our shaders to include an HSL adjustment

```wgsl
...

+fn adjustHSL(color: vec3f, adjust: HSL) -> vec3f {
+  let hsl = rgbToHsl(color);
+  let newHSL = HSL(hsl.h + adjust.h, hsl.s + adjust.s, hsl.l + adjust.l);
+  return hslToRgb(newHSL);
+}

...

struct Uniforms {
  brightness: f32,
  contrast: f32,
+  @align(16) hsl: HSL,
};

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);
  var rgb = color.rgb;
+  rgb = adjustHSL(rgb, uni.hsl);
  rgb = adjustBrightness(rgb, uni.brightness);
  rgb = adjustContrast(rgb, uni.contrast);
  return vec4f(rgb, color.a);
}
```

One thing that might stick out here is the `@align(16)` we needed when adding
`HSL` to the `Uniforms` struct. The reason we need this is because
[structs used in uniforms, by default, must be aligned to 16 byte boundaries](webgpu-memory-layout.html#a-struct-array-size-alignment).
Further, it means the structure is usable for both uniform and storage buffers.
If you remove the `@align(16)` then it's only useable for storage buffers. WGSL
doesn't add this alignment automatically so that in the future the alignment
requirements can be lifted, and so the structures only need one layout. If it
didn't require the `@align(16)` now, and instead it auto aligned, then later
when restriction was removed, lots of code would break. [^alignment]

[^alignment]: removing this restriction is [already in progress](https://github.com/gpuweb/gpuweb/issues/4973), at least for newer devices.

To use this we still need to update the JavaScript to set the new uniform values.

```js
  const postProcessUniformBuffer = device.createBuffer({
-    size: 16,
+    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

...

  function postProcess(encoder, srcTexture, dstTexture) {
    device.queue.writeBuffer(
      postProcessUniformBuffer,
      0,
      new Float32Array([
        settings.brightness,
        settings.contrast,
+        0,
+        0,
+        settings.hue,
+        settings.saturation,
+        settings.lightness,
      ]),
    );

    postProcessRenderPassDescriptor.colorAttachments[0].view = dstTexture;
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  const settings = {
    brightness: 0,
    contrast: 0,
+    hue: 0,
+    saturation: 0,
+    lightness: 0,
  };

  const gui = new GUI();
  gui.name('Drag-n-Drop Image');
  gui.onChange(render);
  gui.add(settings, 'brightness', -1, 1);
  gui.add(settings, 'contrast', -1, 10);
+  gui.add(settings, 'hue', -0.5, 0.5);
+  gui.add(settings, 'saturation', -1, 1);
+  gui.add(settings, 'lightness', -1, 1);
```

And now you should be able to adjust the hue, saturation, and lightness.

{{{example url="../webgpu-post-processing-image-adjustments-hsl.html"}}}

I hope that gave some ideas for image adjustments and post processing.
In the [next article](webgpu-1dlut.html) we'll use a 1d texture for
more flexibility.

<!-- keep this at the bottom of the article -->
<link href="webgpu-image-adjustments.css" rel="stylesheet">
<script type="module" src="webgpu-image-adjustments.js"></script>
