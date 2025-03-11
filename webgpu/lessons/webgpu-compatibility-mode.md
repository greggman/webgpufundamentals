Title: WebGPU Compatibility Mode
Description: Running on older machines
TOC: Compatibility Mode

WebGPU Compatibility mode is a version of WebGPU that,
with some limits, can run on older devices. The idea is,
if you can make your app run within some limits then
you can request a webgpu compatibility adapter and have
it run in more places.

Here's how you do it.

```js
const adapter = await navigator.gpu.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter.requestDevice();
```

Simple! Note that every app that follows all the
limits of compatibility mode is a valid "core"
webgpu app. 

# Major limits and restrictions

## Possibly 0 storage buffers in vertex shaders and/or fragment shaders.

The major restrictions that are most likely to affect
WebGPU apps are that ~30% of these old devices do not support
storage buffers in vertex shaders and/or fragment shaders.

We used this feature in [the article on storage buffers](webgpu-storage-buffers.html)
which is the 2nd article on this site. After that article we
[switched to using vertex buffers](webgpu-vertex-buffers.html).
Using vertex buffers is common but certain solutions are easier
with storage buffers. One example is
[this example of drawing wireframes](https://webgpu.github.io/webgpu-samples/?sample=wireframe).

With vertex data stored in storage buffers we can randomly access the vertex
data. With the vertex data in vertex buffer we can not. Of course there are
always other solutions.

## Medium limits and restrictions

## Only a single viewDimension is allowed for a texture.

In normal WebGPU you can make a 2d texture like this

```js
const myTexture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
});
```

You can then view it 3 different view dimensions

```js
// a view of myTexture as a 2d array with 6 layers
const as2DArray = myTexture.createView();

// view layer 3 of myTexture as a 2d texture
const as2D = myTexture.createView({
  viewDimension: '2d',
  baseArrayLayer: 3,
  arrayLayerCount: 1,
});

// view of myTexture as a cubemap
const asCube = myTexture.createView({
  viewDimension: 'cube',
});
```

In compatibility mode you can only use one view dimension and you have to
choose which viewDimension when you create the texture. A 2D texture with
1 layer defaults to only being usable as a `'2d'` view. A 2D texture with
more than 1 layer defaults to only being usable as a `'2d-array`' view. 
If you want a cube map then you must tell WebGPU when you create the texture.

```js
const texture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
  textureBindingViewDimension: 'cube', 
});
```

In compatibility mode, using the the texture
with another type of view will generate a validation error

```js
// a view of texture as a 2d array with 6 layers
const as2DArray = texture.createView(); // ERROR! Texture is a cubemap

// view layer 3 of texture as a 2d texture
const as2D = texture.createView({       // ERROR! Texture is a cubemap
  viewDimension: '2d',
  baseArrayLayer: 3,
  arrayLayerCount: 1,
});

// view as cubemap                     // GOOD!
const asCube = texture.createView({
  viewDimension: 'cube',
});
```

This restriction is not that big of a deal.
Few programs want to use a texture with different kinds of views.

## <a id="a-generating-mipmaps"></a> Generating Mipmaps in compatibility mode.

There is one place though this issue comes up and that is when generating
mipmaps.

Recall that we made a gpu based mipmap generator in 
[the article in importing images into textures](webgpu-importing-textures.html#a-generating-mips-on-the-gpu).
We modified that function to generate mipmaps for 2d-array and cubemaps in
[the article on cube maps](webgpu-cube-maps.html#a-texture-helpers). In that version
we always view each layer of the texture as with a `'2d'` dimension. 
This won't work in compatibility mode.

To make the the code work in compatibility mode we have to work with textures
with the same view dimension they were created with so let's do that.

We'll start with the code for `generateMips` from [the article on cubemaps](webgpu-cube-maps.html#a-texture-helpers).

