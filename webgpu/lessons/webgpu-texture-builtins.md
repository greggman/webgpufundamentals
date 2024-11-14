In WGSL there are a bunch of built in texture functions

* `textureSample`
* `textureSampleBias`
* `textureSampleGrad`
* `textureSampleLevel`
* `textureGather`
* `textureLoad`
* `textureSampleCompare`
* `textureSampleCompareLevel`
* `textureGatherCompare`

## Short descriptions

* ## `textureSample(texture, sampler, coord)`

  Samples a texture with "implicit derivatives" to choose a mip level (see below)

  Can only be used in a fragment shader.

* ## `textureSampleBias(texture, sampler, coord, bias: f32)`

  The same as `textureSample` except you can add a bias to the mip level selection.
  For example, setting the bias to +1 will select one mip level smaller where as
  setting the bias to -1 will select one mip lever larger.

  Can only be used in a fragment shader.

* ## `textureSampleGrad(texture, sampler, ddx, ddy)`

  Samples a texture with specific gradients. Gradients are
  used to select mip levels. (See below)

* ## `textureSampleLevel(texture, sampler, coord, level: f32)`

  Samples a texture with a specific mip level. For example a level of 1.6
  would sample both mip level 1 and mip level 2 and blend them 40/60.

* ## `textureGather(component, texture, sampler, coords)`

  Returns the values that would be sampled by the previous 4 texture
  builtins but only for mip level 0 but only for 1 component.

  To put it another way, `textureSampleLevel` when level is an integer
  value and filtering is `'linear'` will sample 4 texels from that one level
  and then blend them together. `textureGather` will give you the values
  of those 4 texels directly but it can only give one component at a time.
  In other words, it can give you all 4 red values or a 4 blue values or
  all four green values or all 4 alpha values.

  `textureGather` only works on mip level 0 (though you can choose a different mip level
  by passing in a `baseMipLevel` to `createView` when you setup your bind group.

  Maybe a demo

  ```
  fn textureSampleLevelZero(texture, sampler, coord) {
    let r = textureGather(0, texture, sampler, coord); // get 4 red components
    let g = textureGather(1, texture, sampler, coord); // get 4 green components
    let b = textureGather(2, texture, sampler, coord); // get 4 blue components
    let a = textureGather(3, texture, sampler, coord); // get 4 alpha components

    // +-+-+  The order that textureGather returns
    // |3|2|  components.
    // +-+-+
    // |0|1|
    // +-+-+

    // convert the components back into texel values
    let t0 = vec4f(r[3], g[3], b[3], a[3]);
    let t1 = vec4f(r[2], g[2], b[2], a[2]);
    let t2 = vec4f(r[0], g[0], b[0], a[0]);
    let t3 = vec4f(r[1], g[1], b[1], a[1]);

    // compute a texel coordinate (assuming 'repeat' addressMode)
    // and get the fractional portion to know how much to mix
    // the 4 texels.
    let texelCoord = coord * vec2f(textureDimensions(texture));
    let horizontalMix = fract(texelCoord);
    let verticalMix = fract(texelCoord);

    // bilinear filter the 4 texels.
    let top = mix(t0, t1, horizontalMix);
    let bot = mix(t2, t3, horizontalMix);
    return mix(top, bot, verticalMix);
  }

* ## `textureLoad(texture, texelCoord, level)`

  Loads a single texel with integer texel coordinates.

  Unlike all of the previous builtins, `textureLoad` doesn't take
  a sampler and uses integer texel coordinates instead of normalized
  texture coordinates.

## `textureSampleCompare`, `textureSampleCompareLevel` and `textureGatherCompare`

These functions work exactly the same as their non-compare alternatives
except they only work with depth textures and they return the result of
a comparison. You pass in the value you want to compare with into the function.
You pass the comparison itself in the sampler which can be one of
`'always'`, `'never'`, `'less'`, `'less-equal'`, `'greater'`, `'greater-equal'`, `'equal'`, `'not-equal'`. If the comparison passes the result is `1.0`. If the comparison fails
the result is `0.0`.

If your sampler is setup to linear filter then each texel sampled is compared and
turned into `0.0` or `1.0`. Those results are then bilinear filtered as normal.

# Implementing higher level builtins on lower level builtins

It might be useful to show how some builtin can be implemented on top of others.
We're just going to cover the 2D versions.

## `textureSample`

`textureSample` takes a `coord` parameter and then uses "implicit derivatives"
to select a mip level. See below.

You can build `textureSample` on top of `textureSampleGrad` by using
`dpdx` and `dpdy` on the `coord` parameter to get the "gradients"
to pass to `textureSampleGrad`

```wgsl
fn textureSample(t: texture_2d<f32>, s: sampler, coord: vec2f) -> vec4f {
  return textureSampleGrad(t, s, coord, dpdx(coord), dpdy(coord));
}
```

Note that `dpdx` and `dpdy` are kind of magical in that they provide
what are called *implicit derivatives*. They return how much `coord`
changes for each pixel being drawn. One way to think of this is,
imagine we are drawing to a 2x2 texture. `dpdx` and `dpdy` would
be called once each for each of the 4 texels to be drawn. Each time
they'd be called with different values for `coord`. This assumes`coord` is changing
either because it's based off of an inter-stage variable or because it
is calculated by something that changes for every pixel, for example
`@builtin(position)`.

In any case, we get all 4 of those values

* `v0` = the value of `coord` in `textureSample(t, s, coord)` at x, y 
* `v1` = the value of `coord` in `textureSample(t, s, coord)` at x + 1, y
* `v2` = the value of `coord` in `textureSample(t, s, coord)` at x, y + 1 
* `v3` = the value of `coord` in `textureSample(t, s, coord)` at x + 1, y + 1

Now, `dpdx` is the average horizontal change

```wgsl
dpdx = (p1 - p0 + p3 - p2) / 2
```

and `dpdy` is the average vertical change

```wgsl
dpdy = (p2 - p0 + p3 - p1) / 2
```

The GPU then uses this amount of change, to decide which mip level to use. See below.

## `textureSampleGrad`

`textureSampleGrad` takes the "gradients" passed in. It uses these to compute how fast
we're progressing across the texture we're sampling from in relation to the texture
we're writing too. For example, if for every texel we advance in the destination we
advance 2 texels in the texture we're sampling then we want mip level 1, the 2nd mip.
If we're advancing 4 texels in the texture we're sampling then we want mip level 2,
etc...

`textureSampleGrad` can be built on top of `textureSampleLevel`

```wgsl
fn textureSampleGrad(t: texture_2d<f32>, s: sampler, coord: vec2f, ddx: vec2f, ddy: vec2f) -> vec4f {
  let size = vec2f(textureDimension(t, 0));
  let scaledDdx = ddx * vec2f(size);
  let scaledDdx = ddy * vec2f(size);
  let dotDDX = dot(scaledDdx, scaledDdx);
  let dotDDY = dot(scaledDdy, scaledDdy);
  let deltaMax = max(dotDDX, dotDDY);
  let mipLevel = 0.5 * Math.log2(deltaMax);

  textureSampleLevel(t, s, coord, mipLevel);
}
```

## `textureSampleLevel`

`textureSampleLevel` take a texture coordinate and an explicit mip level.

`textureSampleLevel` could be build on top of `textureGather` except for
the fact that `textureGather` only gets data from mip level 0. We could try
to solve this by passing in the 2 levels we want to sample from by setting
the `baseMipLevel` when calling `createView` on the texture. But, we don't
know which levels we'll need. So, instead we need to do the work that `textureGather`
does by hand by using `textureLoad`.

```wgsl
fn textureSampleLevel(t: texture_2d<f32>, s: sampler: coord: vec2f, level: f32) -> vec4f {
  let l0 = sampleOneLevel(t, coord, u32(floor(level)));
  let l1 = sampleOneLevel(t, coord, u32(ceil(level)));
  return mix(l0, l1, fract(mipLevel))
}

fn sampleOneLevel(t: texture_2d<f32>, coord: vec2f, level: u32) -> vec4f {
  let mipLevel = clamp(level, 0, textureNumLevels(t - 1));
  let size = vec2f(textureDimensions(t, mipLevel));

  // convert from a normalized texture coordinate to an integer based texel coordinate
  let texelCoord = coord * size;
  let p0 = vec2i(floor(texelCoord));
  let p3 = vec2i(ceil(texelCoord));
  let p1 = vec2i(p3.x, p0.y);
  let p2 = vec2i(p0.x, p3.y);
  let level = u32(mipLevel);

  let t0 = textureLoad(t, p0, mipLevel);
  let t1 = textureLoad(t, p1, mipLevel);
  let t2 = textureLoad(t, p2, mipLevel);
  let t3 = textureLoad(t, p3, mipLevel);

  let horizontalMix = fract(texelCoord.x);
  let top = mix(t0, t1, horizontalMix);
  let bot = mix(t0, t1, horizontalMix);

  let verticalMix = fract(texelCoord.y);
  return mix(top, bot, verticalMix);
}
```

Unfortunately that's not the full story because we discarded the sampler.
The sampler defines whether we filter and how we treat out of bounds
texel coordinates. See below.

## Boundary Conditions

These are handled by the sampler settings. Samplers settings are not
available in a shader. We could pass them in ourselves but let's
just pretend we could access them directly.

Then, in `sampleOneLevel` we could do

```
// There's no such thing as GPUAddressMode in WGSL but let's pretend
fn applyAddressModeToValue(v: i32, mode: GPUAddressMode, size: i32) {
  switch (mode) {
    case 'clamp-to-edge':
      return clamp(v, 0, size - 1);
    case 'mirror-repeat': {
      let n = v / size;
      let newV = v - n * size;
      return select(newV, size - newV - 1, n & 1 === 1);
    }
    case 'repeat':
      return v - (v / size) * size;
    }
}

// There's no such thing as sampler.addressModeU/V in WGSL but let's pretend
fn applyAddressMode(c: vec2i, s: sampler, size: vec2i) -> vec2i {
  return vec2i(
    applyAddressModeToValue(c.x, s.addressModeU, size[0]),
    applyAddressModeToValue(c.y, s.addressModeV, size[1]),
  );
}

fn sampleOneLevel(t: texture_2d<f32>, s: sampler: coord: vec2f, level: u32) -> vec4f {
  let mipLevel = clamp(level, 0, textureNumLevels(t) - 1); 
  let size = vec2f(textureDimensions(t, mipLevel));
  let texelCoord = coord * size;

  let p0 = vec2i(floor(texelCoord));
  let p3 = vec2i(ceil(texelCoord));
  let p1 = vec2i(p3.x, p0.y);
  let p2 = vec2i(p0.x, p3.y);

  let t0 = textureLoad(t, applyAddressMode(p0, s, size), mipLevel);
  let t1 = textureLoad(t, applyAddressMode(p1, s, size), mipLevel);
  let t2 = textureLoad(t, applyAddressMode(p2, s, size), mipLevel);
  let t3 = textureLoad(t, applyAddressMode(p3, s, size), mipLevel);

  let horizontalMix = fract(texelCoord.x);
  let top = mix(t0, t1, horizontalMix);
  let bot = mix(t0, t1, horizontalMix);

  let verticalMix = fract(texelCoord.y);
  return mix(top, bot, verticalMix);
}
```

## Filtering modes

The code above is also not dealing with the various filtering modes.
Again, that's not something that's available directly in a shader but we could
pretend in which case

```wgsl
fn textureSampleLevel(t: texture_2d<f32>, s: sampler: coord: vec2f, mipLevel: f32) -> vec4f {
  if (s.mipmapFilter === 'nearest') {
    return sampleOneLevel(t, s, coord, u32(level));
  }

  // it's mipmapFilter === 'linear'
  let l0 = sampleOneLevel(t, s, coord, u32(floor(level)));
  let l1 = sampleOneLevel(t, s, coord, u32(ceil(level)));
  return mix(l0, l1, fract(mipLevel))
}

fn sampleOneLevel(t: texture_2d<f32>, s: sampler: coord: vec2f, level: u32) -> vec4f {
  let mipLevel = clamp(level, 0, textureNumLevels(t) - 1); 
  let size = vec2f(textureDimensions(t, mipLevel));
  let texelCoord = coord * size;

  if ((level < 0 && s.magFilter === 'nearest') || (level >= 0 && s.minFilter === 'nearest')) {
    let p = vec2i(round(texelCoord));
    return textureLoad(t, applyAddresSMode(p, s, size), mipLevel);
  }

  // It's linear
  let p0 = vec2i(floor(texelCoord));
  let p3 = vec2i(ceil(texelCoord));
  let p1 = vec2i(p3.x, p0.y);
  let p2 = vec2i(p0.x, p3.y);

  let t0 = textureLoad(t, applyAddressMode(p0, s, size), mipLevel);
  let t1 = textureLoad(t, applyAddressMode(p1, s, size), mipLevel);
  let t2 = textureLoad(t, applyAddressMode(p2, s, size), mipLevel);
  let t3 = textureLoad(t, applyAddressMode(p3, s, size), mipLevel);

  let horizontalMix = fract(texelCoord.x);
  let top = mix(t0, t1, horizontalMix);
  let bot = mix(t0, t1, horizontalMix);

  let verticalMix = fract(texelCoord.y);
  return mix(top, bot, verticalMix);
}
```

# 3D textures and cube maps.

For 3D textures, not much changes. Just change `vec2?` to `vec3?`
where appropriate. You'll also need to sample 8 texels in `sampleOneLevel`.

For cube maps, at one level we can just convert from a direction into
a face and a 2d texture coord. Once that's done most things are the same.

```wgsl
fn cubeCoordToFaceIndex(coord: vec3f) -> u32 {
  let c = normalize(coord);
  let absC = abs(c);
  if (absC.x > absC.y && absC.x > absC.z) {
    return select(0u, 1u, c.x < 0.0);  // +x / -x
  } else if (absC.y > absC.z) {
    return select(2u, 3u, c.y < 0.0);  // +y / -y
  } else {
    return select(4u, 5u, c.z < 0.0);  // +z / -z;
  }
}

fn convertCubeCoordToNormalized3DCoord(coord: vec3f) -> vec3f {
  let c = normalize(coord);
  let absC = abs(c);
  let faceNdx = cubeCoordToFaceIndex(coord);
  var uvw: vec3f;
  switch (faceNdx) {
    case 0: { uvw = vec3f(-c.z, -c.y, absC.x); break; }
    case 1: { uvw = vec3f( c.z, -c.y, absC.x); break; }
    case 2: { uvw = vec3f( c.x, -c.z, absC.y); break; }
    case 3: { uvw = vec3f( c.x, -c.z, absC.y); break; }
    case 4: { uvw = vec3f( c.x, -c.y, absC.z); break; }
    case 5: { uvw = vec3f(-c.x, -c.y, absC.z); break; }
    default: {}
  }
  return vec3f(
    (uvw[0] / uvw[2] + 1.0) * 0.5,
    (uvw[1] / uvw[2] + 1.0) * 0.5,
    (f32(faceNdx) + 0.5) / 6.0
  );
}

// TBD: need sampleOneLevelCube that converts p1,p2,p3 back to cube and back
// TBD: need to first deal with 2d-array

fn textureSampleLevelCube(t: texture_2d_array<f32>, s: sampler, coord: vec3f, level: f32) {
  let c = convertCubeCoordToNormalized3DCoord(coord);
  let uv = c.xy;
  let layer = u32(uv.z * 6);
  if (s.mipmapFilter === 'nearest') {
    return sampleOneLevelCube(t, s, c, u32(level));
  }

  // it's mipmapFilter === 'linear'
  let l0 = sampleOneLevel(t, s, c, u32(floor(level)));
  let l1 = sampleOneLevel(t, s, c, u32(ceil(level)));
  return mix(l0, l1, fract(mipLevel))
}
```

The exception is that cube maps ignore `addressMode?` and instead
wrap to the corresponding face.

To do that we can just convert from a 2d +

