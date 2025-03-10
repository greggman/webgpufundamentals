Title: WebGPU Compatibility Mode
Description: Running on older machines
TOC: Compatibility Mode

WebGPU Compatibility mode is a version of WebGPU that,
with some limits, can run on older devices. The idea is,
if you can make your app run within some limits then
you can request a webgpu compatibility adapter.

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
with storage buffers. On example is
[this example of drawing wireframes](https://webgpu.github.io/webgpu-samples/?sample=wireframe).

With vertex data stored in storage buffers we can randomly access the vertex
data. With the vertex data in vertex buffer we can not. Of course there are
always other solutions

## Medium limits and restrictions

## Only a single viewDimension is allowed for a texture.

In normal WebGPU you can make a 2d texture like this

```js
const texture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
});
```

You can then view it 3 different ways

```js
// a view of texture as a 2d array with 6 layers
const as2DArray = texture.createView();

// view layer 3 of texture as a 2d texture
const as2D = texture.createView({
  viewDimension: '2d',
  baseArrayLayer: 3,
  arrayLayerCount: 1,
});

// view as cubemap
const asCube = texture.createView({
  viewDimension: 'cube',
});
```

In compatibility mode you can only use one and you have to choose which
one when you create the texture. A 2D texture with 1 layer defaults to
only being usable as a `'2d'` view. A 2D texture with more than 1 layer
defaults to only being usable as a `'2d-array`' view. If you want a cube
map then you must tell WebGPU when you create the texture

```js
const texture = device.createTexture({
  size: [width, height, 6],
  usage: ...
  format: ...
  textureBindingViewDimension: 'cube', 
});
```

With that at creation time, in compatibility mode, using the the texture
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

This restriction is not that big of a deal AFAICT. Few programs want to use
a texture with different kinds of views.

There was one place though this issue comes up and that is when generating
mipmaps