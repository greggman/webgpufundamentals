Title: WebGPU 비디오의 효율적인 사용
Description: WebGPU에서 비디오를 사용하는 방법
TOC: 비디오 사용하기

[이전 글](webgpu-importing-textures.html)에서 이미지, 캔버스, 비디오를 텍스처로 로딩하는 방법을 알아봤습니다. 
이 글에서는 WebGPU에서 비디오를 사용하는 보다 효율적인 방법을 설명합니다.

이전 글에서 비디오를 WEbGPU 텍스처로 로딩할 때 `copyExternalImageToTexture`를 호출하였습니다. 
이 함수는 비디오의 현재 프레임을 우리가 만들어둔, 이미 존재하는 텍스처에 복사하였습니다.

WebGPU에는 비디오를 사용하는 또다른 방법이 있습니다. 
`importExternalTexture`인데 이름에서 알 수 있듯이 이 함수는 `GPUExternalTexture`를 반환해줍니다. 
이 외부(external) 텍스처는 비디오데이터를 직접 표현합니다. 복사가 필요하지 않습니다. [^no-copy]
`importExternalTexture`에 비디오를 넣어주면 텍스처가 반환되고, 바로 사용할 수 있습니다.

[^no-copy]: 실제 동작 방식은 브라우저 구현에 달려 있습니다. 
WebGPU 명세(spec)는 브라우저가 복사를 하지 않기를 바라며 만들어졌습니다.

`importExternalTexture`의 텍스처를 사용할 때는 몇 가지 큰 유의사항이 있습니다.


* ## 텍스처는 현재 자바스크립트 작업이 종료될 때까지만 유효합니다.

  대부분의 WebGPU 앱의 경우 위 말은 텍스처가 `requestAnimationCallback` 함수가 끝날때까지만 존재한다는 뜻입니다. 
  또는 `requestVideoFrameCallback`, `setTimeout`, `mouseMove` 와 같은 다른 렌더링을 수행하는 이벤트일 수도 있습니다. 
  함수가 종료되면 텍스처가 만료(expired)됩니다. 
  비디오를 다시 사용하려면 `importExternalTexture`를 다시 호출해야만 합니다.
  
  이 말인즉, `importExternalTexture`를 호출할 때마다 새로운 바인드그룹을 만들어서[^bindgroup-exception] 새로운 텍스처를 셰이더에 전달할 수 있어야 한다는 뜻입니다.
  
  [^bindgroup-exception]: 명세에는 구현에 따라 같은 텍스처를 반환할 수 있어야 한다고 되어 있지만 꼭 요구되는 사항은 아닙니다. 
  같은 텍스처가 반환되었는지 확인하려면 이를 다음과 같이 확인해야 합니다. 
  <pre><code>const newTexture = device.importExternalTexture(...);<br>const same = oldTexture === newTexture;</code></pre> 
  같은 텍스처라면 이미 존재하는 바인드그룹과 참조된 `oldTexture`를 사용 가능합니다.

* ## 셰이더에서 `texture_external` 를 사용해야만 합니다.

  이전 텍스처 예제에서는 모두 `texture_2d<f32>`를 사용했지만 `importExternalTexture`에서 만들어진 텍스처는 `texture_external`를 사용한 바인딩 포인트에만 바인딩 될 수 있습니다.
  
* ## 셰이더에서 `textureSampleBaseClampToEdge` 를 사용해야만 합니다.

  이전 텍스처 예제에서는 모두 `textureSample`를 사용했지만 `importExternalTexture`에서 만들어진 텍스처는 `textureSampleBaseClampToEdge`만 사용할 수 있습니다. [^textureLoad] 
  이름 그대로, `textureSampleBaseClampToEdge`는 기본 텍스터 밉 레벨 (레벨 0)만 샘플링합니다. 
  다시 말해, 외부 텍스처는 밉맵을 사용할 수 없습니다. 
  게다가, edge clamping을 하기 때문에 `addressModeU: 'repeat'`는 무시됩니다.
  
  `fract`를 아래와 같이 사용하면 직접 반복(repeat)을 할 수 있습니다.

  ```wgsl
  let color = textureSAmpleBaseClampToEdge(
     someExternalTexture,
     someSampler,
     fract(texcoord)
  );`
  ```

  [^textureLoad]: `textureLoad`도 외부 텍스처에 사용할 수 있습니다.

이러한 제약들이 문제가 있다면 [이전 글](webgpu-importing-textures.html)에서와 같이 `copyExternalImageToTexture`를 사용해야만 합니다.

`importExternalTexture`를 사용한 예제를 만들어 봅시다. 
비디오는 아래와 같습니다.

<div class="webgpu_center">
  <div>
     <video muted controls src="../resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4" style="width: 320px";></video>
     <div class="copyright"><a href="https://www.pexels.com/video/dog-walking-outside-the-house-5534310/">by Anna Bondarenko</a></div>
  </div>
</div>

이전 예제에서 수정해야 할 사항은 아래와 같습니다.

먼저 셰이더를 수정해야 합니다.

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

    vec2f( 0.0,  0.0),  // center
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 0.0,  1.0),  // center, top

    // 2st triangle
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

위에서, 텍스처 좌표에 50을 곱하는 것은 삭제했는데, 이는 반복을 보여주기 위함이었고, 외부 텍스처는 반복이 불가능하기 때문입니다.

그리고 위해서 이야기한 제약 사항들을 수정했습니다. 
`texture_2d<f32>`는 `texture_external`로 바뀌었고 `textureSample`은 `textureSampleBaseClampToEdge`로 바뀌었습니다.

텍스처 생성과 밉맵 생성 관련한 코드는 모두 제거합니다.

물론 비디오의 출처를 명시해야 합니다.

```js
-  video.src = 'resources/videos/Golden_retriever_swimming_the_doggy_paddle-360-no-audio.webm';
+  video.src = 'resources/videos/pexels-anna-bondarenko-5534310 (540p).mp4';
```

밉 레벨이 없으므로 이를 샘플러가 고려한 필요도 없습니다.

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

`importExternalTexture`를 호출하기 전까지는 텍스처가 없기 때문에 바인드그룹을 미리 만들수도 없습니다. 
따라서 나중에 생성하기 위한 정보만 저장해 둡니다. [^bindgroups-in-advance]

[^bindgroups-in-advance]: 바인드 그룹을 나누어서 하나는 샘플러와 uniform 버퍼만을 가지고 있도록 미리 만들고, 다른 하나는 렌더링 시점에 생성할 외부 텍스처를 참조하기만 하는 것을 만들어 둘 수도 있습니다. 
이렇게 하는 것이 좋을지는 여러분의 필요에 따라 선택하시면 됩니다.

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

렌더링 시점에 `importExternalTexture`를 호출하고 바인드그룹을 만듭니다.

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

또한 텍스처의 반복이 불가능하니 그리는 사각형이 보다 잘 보이도록 행렬 계산을 수정하여 50배 크기로 만들지는 않도록 합시다.

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

이로써 WebGPU에서 복사를 하지 않는 비디오 텍스처가 만들어졌습니다.

{{{example url="../webgpu-simple-textured-quad-external-video.html"}}}
