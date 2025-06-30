Title: WebGPU Bind Group Layouts
Description: Explicit Bind Group Layouts
TOC: Bind Group Layouts

Bind Group Layouts are used to make it easy and efficient
for WebGPU to match Bind Groups to Compute and Render Pipelines.

## How it works: 

A Pipeline, like a `GPUComputePipeline` or `GPURenderPipeline`
uses a `GPUPipelineLayout` which defines 0 or more
`GPUBindGroupLayout`s. Each `GPUBindGroupLayout` is assigned
to a specific group index.

<div class="webgpu_center"><img src="resources/webgpu-bind-group-layouts.svg" style="width: 900px;"></div>

Bind Groups are each created with a specific `GPUBindGroupLayout`
as well.

When you go to `draw` or to `dispatchWorkgroups`, WebGPU only
needs to check, does the `GPUBindGroupLayout` for each group index
on the current pipeline's `GPUPipelineLayout` match the
currently bound bind groups, the ones set with `setBindGroup`.
This check is trivially simple. Most of the detailed checking
happens when you create the bind group. That way, when you're
actually drawing or computing, there's almost nothing left to
check.

Pipelines will generate their own `GPUPipelineLayout` and
populate it with `GPUBindGroupLayouts` automatically if you
create the pipeline with `layout: 'auto'` which is what
most of the samples on this website do.

There are 2 main reasons to **NOT** use `layout: 'auto'`.

1. **You want a layout that's different than the default `'auto'` layout**

   For example you want to use a `rgba32float` as a texture
   but you get an error when you try. (see below)

2. **You want to use a bind group with more than 1 pipeline**

   You can not use a bind group made from a bindGroupLayout
   that was made from a pipeline with `layout: 'auto'` with a
   different pipeline.

## <a id="a-rgba32float"></a> Using a bind group layout different than `layout: 'auto'` - `'rgba32float'`

The rules for how a bind group layout is automatically created are
[detailed in the spec](https://www.w3.org/TR/webgpu/#abstract-opdef-default-pipeline-layout), but, as one example...

Let's say we want to use an `rgba32float` texture. Let's take
[our first example of using a texture from the article on textures](http://localhost:8080/webgpu/lessons/webgpu-textures.html) which drew an upside down 5x7 texel 'F'.  Let's update it to use an `rgba32float` texture.

Here are the changes.

```js
  const kTextureWidth = 5;
  const kTextureHeight = 7;
-  const _ = [255,   0,   0, 255];  // red
-  const y = [255, 255,   0, 255];  // yellow
-  const b = [  0,   0, 255, 255];  // blue
-  const textureData = new Uint8Array([
+  const _ = [1, 0, 0, 1];  // red
+  const y = [1, 1, 0, 1];  // yellow
+  const b = [0, 0, 1, 1];  // blue
+  const textureData = new Float32Array([
    b, _, _, _, _,
    _, y, y, y, _,
    _, y, _, _, _,
    _, y, y, _, _,
    _, y, _, _, _,
    _, y, _, _, _,
    _, _, _, _, _,
  ].flat());

  const texture = device.createTexture({
    label: 'yellow F on red',
    size: [kTextureWidth, kTextureHeight],
-    format: 'rgba8unorm',
+    format: 'rgba32float',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
      { texture },
      textureData,
-      { bytesPerRow: kTextureWidth * 4 },
+      { bytesPerRow: kTextureWidth * 4 * 4 },
      { width: kTextureWidth, height: kTextureHeight },
  );

```

When we run it we'll get an error.

{{{example url="../webgpu-bind-group-layouts-rgba32float-broken.html"}}}

The error I got in the browser I tested in was:

> - WebGPU GPUValidationError: None of the supported sample types (UnfilterableFloat) of [Texture "yellow F on red"] match the expected sample types (Float).`<br>
> - While validating entries[1] as a Sampled Texture. Expected entry layout: {sampleType: TextureSampleType::Float, viewDimension: 2, multisampled: 0}`<br>
> - While validating [BindGroupDescriptor] against [BindGroupLayout (unlabeled)]`<br>
> - While calling [Device].CreateBindGroup([BindGroupDescriptor])`

What's up with that? It turns out that `rgba32float` (and all `xxx32float`)
textures are not filterable by default. There is an [optional feature](webgpu-limits-and-features.html) to make them filterable but, that
feature might not be available everywhere. This is especially likely on
mobile devices, at least in 2024.

By default, when you declare a binding with a `texture_2d<f32>` like
this:

```wgsl
      @group(0) @binding(1) var ourTexture: texture_2d<f32>;
```

And you use `layout: 'auto'` when creating your pipeline, WebGPU creates
a bind group layout that specifically requires filterable textures. If
you try to bind an unfilterable one you get an error.

If you want to use a texture that can not be filtered then you'll need
to manually create a bind group layout.

There's a tool, [here](resources/wgsl-offset-computer.html), that if you
paste your shaders, it will generate the auto layout for you. Pasting
in the shader from the example above it gives me

```js
const bindGroupLayoutDescriptors = [
  {
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: "filtering",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: false,
        },
      },
    ],
  },
];
```

This is an array of `GPUBindGroupLayoutDescriptor`s. Above you can
see the bind group uses `sampleType: "float"`. That's the type for
`'rgba8unorm'` but it's not the type for `'rgba32float'`. You can read
the sample types a particular texture format works with in
[this table in the spec](https://www.w3.org/TR/webgpu/#texture-format-caps).

To fix the example we need to adjust both the texture binding and the
sampler binding. The sampler binding needs to be changed into a
`'non-filtering'` sampler. The texture binding needs to be changed to
an `'unfilterable-float'`.

So, first, we need to create a `GPUBindGroupLayout`

```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
*          type: 'non-filtering',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
*          sampleType: 'unfilterable-float',
          viewDimension: '2d',
          multisampled: false,
        },
      },
    ],
  });
```

The two changes are marked above.

Then we need to create a `GPUPipelineLayout` which is an array
of the `GPUBindGroupLayout`s used by a pipeline.

```js
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [ bindGroupLayout ],
  });
```

`createPipelineLayout` takes an object with an array of `GPUBindGroupLayout`s. 
They are ordered by group index so the first entry becomes `@group(0)`,
the 2nd entry becomes `@group(1)`, etc... If you need
to skip one you'll need to add empty or undefined element.

Finally, when we create the pipeline, we pass in the pipeline layout

```js
  const pipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
-    layout: 'auto',
+    layout: pipelineLayout,
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
```

With that, our example works again but now it's using an `rgba32float`
texture.

{{{example url="../webgpu-bind-group-layouts-rgba32float-fixed.html"}}}

Note: the example works both because we did the work above to make
a bind group layout that accepted unfilterable-float but it also happens
to work because the example uses a `GPUSampler` using only `'nearest'`
filtering. If we set any of the filters, `magFilter`, `minFilter` or
`mipmapFilter` to `'linear'` we'd get an error saying that we tried
to use a `'filtering'` sampler on a `'non-filtering'` sampler binding.

## Using a bind group layout different than `layout: 'auto'` - dynamic offsets

By default, when you make a bind group and you bind a uniform or storage buffer, the entire buffer is bound. You can also pass in an offset and length when creating your bind group. In both cases, once set, they can not
be changed.

WebGPU has an option to let you change the offset when you call
`setBindGroup`. To use this feature, you have to manually create bind group
layouts and set `hasDynamicOffsets: true` for each binding you want to be
able to set later.

To keep this simple, let's use the simple compute example
from [the article on fundamentals](webgpu-fundamentals.html#a-run-computations-on-the-gpu). We'll modify it to add
2 sets of values from the same buffer and we'll choose which
set using dynamic offsets.

First lets change the shader to this

```wgsl
@group(0) @binding(0) var<storage, read_write> a: array<f32>;
@group(0) @binding(1) var<storage, read_write> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> dst: array<f32>;

@compute @workgroup_size(1) fn computeSomething(
  @builtin(global_invocation_id) id: vec3u
) {
  let i = id.x;
  dst[i] = a[i] + b[i];
}
```

you can see it just adds `a` to `b` and writes into `dst`.

Next let's make the bind group layout

```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          hasDynamicOffset: true,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          hasDynamicOffset: true,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          hasDynamicOffset: true,
        },
      },
    ],
  });
```

All of them are marked as `hasDynamicStorage: true`

now let's use it to create our pipeline

```js
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [ bindGroupLayout ],
  });

  const pipeline = device.createComputePipeline({
-    label: 'double compute pipeline',
-    layout: 'auto',
+    label: 'add elements compute pipeline',
+    layout: pipelineLayout,
    compute: {
      module,
    },
  });
```

Let's setup the buffer. Offset must be a multiple of 256 [^minStorageBufferOffsetAlignment] so, let's create a buffer
256 * 3 bytes large so we have at least 3 valid offsets, 0, 256, and 512.

[^minStorageBufferOffsetAlignment]: It's possible your device
supports smaller offsets. See the `minStorageBufferOffsetAlignment`
or `minUniformBufferOffsetAlignment` in [limits and features](webgpu-limits-and-features.html).

```js
-  const input = new Float32Array([1, 3, 5]);
+  const input = new Float32Array(64 * 3);
+  input.set([1, 3, 5]);
+  input.set([11, 12, 13], 64);

  // create a buffer on the GPU to hold our computation
  // input and output
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  // Copy our input data to that buffer
  device.queue.writeBuffer(workBuffer, 0, input);
```

The code above makes an array of `64 * 3` 32bit floats. That's 768 bytes.

Since our original example read and wrote to the same buffer
we'll just bind the same buffer 3 times.

```js
  // Setup a bindGroup to tell the shader which
  // buffers to use for the computation
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
-      { binding: 0, resource: { buffer: workBuffer } },
+      { binding: 0, resource: { buffer: workBuffer, size: 256 } },
+      { binding: 1, resource: { buffer: workBuffer, size: 256 } },
+      { binding: 2, resource: { buffer: workBuffer, size: 256 } },
    ],
  });
```

Note, we must specify the size, otherwise it will default to the size
of the entire buffer. If we were to then set an offset > 0 we'd get an
error since we'd be specifying a portion of the buffer that's out of range.

In `setBindGroup` we now pass in 1 offset for each buffer that has dynamic offsets. Since we marked all 3 entries in the bind group layout as
`hasDynamicOffset: true` we need 3 offsets in the order of their binding slot.

```js
  ...
  pass.setPipeline(pipeline);
-  pass.setBindGroup(0, bindGroup);
+  pass.setBindGroup(0, bindGroup, [0, 256, 512]);
  pass.dispatchWorkgroups(3);
  pass.end();
```

Finally, we need to change the code to show the result

```js
-  console.log(input);
-  console.log(result);
+  console.log('a', input.slice(0, 3));
+  console.log('b', input.slice(64, 64 + 3));
+  console.log('dst', result.slice(128, 128 + 3));
```

{{{example url="../webgpu-bind-group-layouts-dynamic-offsets.html"}}}

Note that, using dynamic offsets is slightly slower than non-dynamic offsets. The reason is, with non-dynamic offsets, whether the offset and size are in range of the buffer is checked when you create the bind group. With dynamic offsets, that check can not be made until you call `setBindGroup`. If you're only calling `setBindGroup` a few hundred times
that difference probably won't matter. If you're calling `setBindGroup`
1000s of times it might be more noticeable.

## <a id="a-sharing-bind-groups"></a> Using a bind group with more than 1 pipeline

Another reason to create bind group layouts manually is so we
can use the same bind group with more than one pipeline.

A common places you might want to be able to reuse a bind group is in a basic 3d scene renderer with shadows.

In a basic 3d scene renderer it's common to separate bindings
into

* globals (like the perspective and view matrices)
* materials (the textures, colors)
* locals (like the model matrix)

You then render like this

```
setBindGroup(0, globalsBG)
for each material
  setBindGroup(1, materialBG)
  for each object that uses material
    setBindGroup(2, localBG)
    draw(...)
```

When you add [shadows](webgpu-shadows.html), you need to first
draw the shadow maps with a shadow map pipeline. Rather than
having separate bind groups of all of those things, ones to work
with the pipeline that draws and different bind groups to work
with the pipeline that renders the shadow map, it would be much
easier to just make one set of bind groups and use the same ones
for both cases.

That's a rather large sample to write, just to show off sharing
bind groups. Although, [the article on shadows](webgpu-shadows.html)
uses shared bind groups we'll take the simple compute example from [the article on fundamentals](webgpu-fundamentals.html#a-run-computations-on-the-gpu) again and make it use 2 compute pipelines with one bind group.

First let's add another shader module that adds 3

```js
-  const module = device.createShaderModule({
+  const moduleTimes2 = device.createShaderModule({
    label: 'doubling compute module',
    code: `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;

      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        let i = id.x;
        data[i] = data[i] * 2.0;
      }
    `,
  });

+  const modulePlus3 = device.createShaderModule({
+    label: 'adding 3 compute module',
+    code: `
+      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
+
+      @compute @workgroup_size(1) fn computeSomething(
+        @builtin(global_invocation_id) id: vec3u
+      ) {
+        let i = id.x;
+        data[i] = data[i] + 3.0;
+      }
+    `,
+  });
```

Then let's create a `GPUBindGroupLayout` and `GPUPipelineLayout`
we can use to make the 2 pipelines share the same `GPUBindGroup`.

```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
          minBindingSize: 0,
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [ bindGroupLayout ],
  });
```

Now let's use them when creating the pipelines.

```js
-  const pipeline = device.createComputePipeline({
+  const pipelineTimes2 = device.createComputePipeline({
    label: 'doubling compute pipeline',
-    layout: 'auto',
+    layout: pipelineLayout,
    compute: {
      module: moduleTimes2,
    },
  });

+  const pipelinePlus3 = device.createComputePipeline({
+    label: 'plus 3 compute pipeline',
+    layout: pipelineLayout,
+    compute: {
+      module: modulePlus3,
+    },
+  });
```

When we setup the bind group, let's use the `bindGroupLayout`
directly

```js
  // Setup a bindGroup to tell the shader which
  // buffer to use for the computation
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
-    layout: pipeline.getBindGroupLayout(0),
+    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: workBuffer } },
    ],
  });
```

Finally let's use both pipelines

```js
  // Encode commands to do the computation
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
-  pass.setPipeline(pipeline);
+  pass.setPipeline(pipelineTimes2);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(input.length);
+  pass.setPipeline(pipelinePlus3);
+  pass.dispatchWorkgroups(input.length);
  pass.end();
```

The result is we multiply by 2 and add 3 with one bind group.

{{{example url="../webgpu-bind-group-layouts-multiple-pipelines.html"}}}

Not very exciting but at least it's a working and simple example.

When to manually make bind group layouts and when to not is really up
to you. In the example above it would arguably have been easier to
just make 2 bind groups, 1 for each pipeline.

For simple situations it's often not necessary to manually make bind group layouts but, as your
WebGPU programs get more complex, it's likely making bind group layouts
will be a technique you reach for.

## <a id="a-bind-group-layout-notes"></a> Bind Group Layout notes:

Some things to note about creating a `GPUBindGroupLayout`

* ## Each entry must declare which `binding` it is for

* ## Each entry must declare which stages it will be visible in.

  In our examples above we declared just one visibility.
  If, for example, we wanted to reference the bind group both
  the vertex and the fragment shader we'd use:

  ```js
     visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX
  ```

  or all 3 stages:

  ```js
     visibility: GPUShaderStage.COMPUTE |
                 GPUShaderStage.FRAGMENT | 
                 GPUShaderStage.VERTEX
  ```

* ## There are several defaults:

  For `texture:` bindings the defaults are:

  ```js
  {
    sampleType: 'float',
    viewDimension: '2d',
    multisampled: false,
  }
  ```

  For a `sampler:` bindings the defaults are:

  ```js
  {
    type: 'filtering',
  }
  ```

  That means, in the most common sampler and texture usages, you could declare
  the sampler and texture entries like this

  ```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},  // use the defaults
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},  // use the defaults
      },
    ],
  });
  ```

* ## buffer entries should declare a `minBindingSize` when possible.

  When you declare a buffer binding you can specify a `minBindingSize`.

  A good example might be you make a struct for uniforms. For example
  in [the article on uniforms](webgpu-uniforms.html) we had this struct:

  ```wgsl
  struct OurStruct {
    color: vec4f,
    scale: vec2f,
    offset: vec2f,
  };

  @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
  ``` 

  It requires 32 bytes so, we should declare it's `minBindingSize` like
  this:

  ```js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'uniform',
          minBindingSize: 32,
        },
      },
    ],
  });
  ```

  The reason to declare a `minBindingSize` is it lets WebGPU check
  if your buffer size/offset is the correct size when you call
  `createBindGroup`.  If you don't set a `minBindingSize`, then
  WebGPU will have to check at draw/dispatchWorkgroups time that
  the buffer is the correct size of the pipeline. Checking every
  draw calls is slower than checking once when you create a bind
  group.

  On the the other hand, in our example above that used a storage
  buffer to double numbers etc, we didn't declare a `minBindingSize`.
  That's because, since the storage buffer is declared as an `array`,
  are able to bind different size buffers depending on how
  many values you pass in.


[This part of the spec](https://www.w3.org/TR/webgpu/#dictdef-gpubindgrouplayoutentry) details all the options for making
bind group layouts.

[This article](https://toji.dev/webgpu-best-practices/bind-groups) also
has some advice on bind groups and bind group layouts.

[This Library](https://greggman.github.io/webgpu-utils) will compute
struct sizes and default bind group layouts for you.
