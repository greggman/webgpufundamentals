Title: WebGPU 텍스처
Description: 텍스처 사용하기
TOC: 텍스처

이 글에서는 텍스처(texture)의 기본에 대해 알아보겠습니다.
이전 글에서 우리는 데이터를 셰이더에 전달하는 주요 방법들을 설명했습니다.
이는 [스테이지간 변수](webgpu-inter-stage-variables.html),
[uniforms](webgpu-uniforms.html), [스토리지 버퍼](webgpu-storage-buffers.html),
[정점 버퍼](webgpu-vertex-buffers)였습니다.
셰이더에 데이터를 전달하는 마지막 주요 방법은 텍스처입니다.

텍스처는 주로 2차원 이미지로 표현됩니다.
2차원 이미지는 색상값의 2차원 배열일 뿐이라는 것을 생각해보면 왜 2차원 배열 데이터를 전달하기 위해 텍스처를 사용해야 하는지 의문이 생기실 수 있습니다.
그냥 스토리지 버퍼를 2차원 배열로 만들어도 되죠.
텍스처가 특별한 이유는 *샘플러(sampler)*라는 특수한 하드웨어로 접근할 수 있기 때문입니다. 
샘플러는 텍스처로부터 16개의 서로 다른 값을 읽을 수 있고, 이들을 다양한 사용 용도에 맞게 적절히 섞을 수 있는 기능을 가지고 있습니다.

하나의 예시로, 2차원 이미지를 원래 크기보다 더 크게 그리고 싶다고 해 봅시다.

<div class="center">
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 128px; height: 128px; image-rendering: pixelated; image-rendering: crisp-edges;"></div>
    <div style="text-align: center;">원본</div>
  </div>
</div>

단순히 원본 이미지로부터 하나의 픽셀을 가져와 각 픽셀을 더 큰 이미지로 만들면 아래 첫 번째 예제같이 보이게 됩니다.
대신에 하나의 픽셀을 가지고 더 큰 이미지를 만들 때 원본 이미지의 여러 픽셀을 고려해서 만들면, 아래 오른쪽처럼 덜 픽셀화(pixelated)된 이미지를 볼 수 있게 됩니다.

<div class="webgpu_center compare">
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 512px; height: 512px; image-rendering: pixelated; image-rendering: crisp-edges;"></div>
    <div>필터링 되지 않았을 때</div>
  </div>
  <div>
    <div><img class="pixel-perfect" src="resources/kiana.png" style="max-width: 100%; width: 512px; height: 512px;"></div>
    <div>필터링 되었을 때</div>
  </div>
</div>

텍스처로부터 개별적인 픽셀을 얻어오는 WGSL 함수가 있고, 이들도 사용을 안하는 것은 아니지만 
이러한 함수들은 흥미롭지 않은 것이, 동일한 작업을 스토리지 버퍼로도 할 수 있기 때문입니다. 
WGSL의 텍스처 관련한 흥미로운 함수들은 여러 픽셀들을 필터링하고 섞는 함수들입니다.

WGSL 함수는 데이터를 표현하는 텍스처와, 텍스처로부터 데이터를 어떻게 얻어올 것인지를 표현하는 샘플러, 
그리고 값을 얻어오고자 하는 텍스처 좌표를 입력으로 받습니다.

샘플링된 텍스처에 대한 텍스처 좌표는 가로세로 0.0에서 1.0 사이이고 이는 실제 텍스처의 크기와는 관계 없습니다. [^up-or-down]

[^up-or-down]: 텍스처 좌표가 위(0 = bottom, 1 = top)인지 아래(0 = top, 1 = bottom)인지는 관점의 차이입니다.
중요한 것은 텍스처 좌표 0,0이 텍스처의 첫 데이터를 참조한다는 사실입니다.

<div class="webgpu_center"><img src="resources/texture-coordinates-diagram.svg" style="width: 500px;"></div>

[스테이지간 변수에 관한 글](webgpu-inter-stage-variables.html)의 예제를 가지고 
수정해서 사각형(삼각형 두 개)에 텍스처를 그리도록 해 봅시다.

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
-  @location(0) color: vec4f,
+  @location(0) texcoord: vec2f,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );
-  var color = array<vec4f, 3>(
-    vec4f(1, 0, 0, 1), // red
-    vec4f(0, 1, 0, 1), // green
-    vec4f(0, 0, 1, 1), // blue
-  );
+  let pos = array(
+    // 1st triangle
+    vec2f( 0.0,  0.0),  // center
+    vec2f( 1.0,  0.0),  // right, center
+    vec2f( 0.0,  1.0),  // center, top
+
+    // 2st triangle
+    vec2f( 0.0,  1.0),  // center, top
+    vec2f( 1.0,  0.0),  // right, center
+    vec2f( 1.0,  1.0),  // right, top
+  );

  var vsOutput: OurVertexShaderOutput;
-  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
-  vsOutput.color = color[vertexIndex];
+  let xy = pos[vertexIndex];
+  vsOutput.position = vec4f(xy, 0.0, 1.0);
+  vsOutput.texcoord = xy;
  return vsOutput;
}

+@group(0) @binding(0) var ourSampler: sampler;
+@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-  return fsInput.color;
+  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

위 예제에서 우리는 캔버스 중심에 삼각형을 그리기 위한 세 개의 정점을 
캔버스 오른쪽 위에 사각형을 그리기 위한 여섯 개의 정점으로 수정했습니다.

`OutVertexShaderOutput`를 `vec2f`인 `texcoord`를 전달하도록 수정하였고, 이를 통해 텍스처 좌표를 프래그먼트 셰이더로 넘길 수 있습니다.
정점 셰이더에서 `vsOutput.texcoord`를 클립 공간 위치와 같은 값으로 설정하였고, 
이는 하드코딩된 위치값과 같은 값입니다. 
`vsOutput.texcoord`는 프래그먼트 셰이더로 넘어가면서 삼각형의 세 개 정점 사이에서 보간됩니다.

그리고 샘플러와 텍스처를 선언하고 프래그먼트 셰이더에서 이들을 참조합니다.
`textureSample`함수는 텍스처를 *샘플링*합니다. 
첫 번째 인자는 샘플링할 텍스처이고, 두 번째 인자는 텍스처를 샘플링한 방법이 명시된 샘플러이며 
세 번째 인자는 어디서 샘플링할 것인지에 대한 텍스처 좌표입니다.

> Note: 텍스처 좌표로 위치값을 넘기는 것은 흔한 일이 아닙니다.
> 이 예제와 같은 단위 사각형 (너비와 높이가 1인 사각형)에서는 
> 우연히 위치값과 텍스처 좌표가 일치한 것 뿐입니다.
> 이런 방식으로 우리 예제가 간결하고 단순해 집니다.
> 텍스처 좌표는 [정점 버퍼](webgpu-vertex-buffers.html)를 통해
> 전달하는 것이 훨씬 일반적입니다.

이제 텍스처 데이터를 만들어야 합니다. 5x7 크기의 `F` 텍셀(texel)을 만들겠습니다. [^texel]

[^texel]: 텍셀은 "texture element"의 약어로 픽셀이 "picture element"의 약어닌 것과 대응됩니다.
저는 픽셀이나 텍셀이나 동일하다고 생각하지만 어떤 사람들은 텍스처에 대해 이야기 할 때 *텍셀*이라는 단어를 사용하는 것을 더 선호합니다.

```js
  const kTextureWidth = 5;
  const kTextureHeight = 7;
  const _ = [255,   0,   0, 255];  // red
  const y = [255, 255,   0, 255];  // yellow
  const b = [  0,   0, 255, 255];  // blue
  const textureData = new Uint8Array([
    b, _, _, _, _,
    _, y, y, y, _,
    _, y, _, _, _,
    _, y, y, _, _,
    _, y, _, _, _,
    _, y, _, _, _,
    _, _, _, _, _,
  ].flat());
```

`F`가 보이실 것이고, 왼쪽 위 코너(첫 번째 값)에는 파란색 텍셀이 있습니다.

우리는 `rgba8unorm` 텍스처를 만들 것입니다. 
`rgba8unorm`는 텍스처가 빨강, 초록, 파랑색과 알파(alpha)값을 가질 것이라는 의미입니다. 
각 값은 8비트 부호없는 값이고 텍스처에 사용될 떄 정규화될 것입니다.
`unorm`은 `unsigned normalzed`라는 뜻인데 이 값이 0에서 255 사이의 
값을 갖는 부호없는 바이트에서 0.0과 1.0 사이의 부동소수점으로 변환된 것임을 
이야기하는 멋있는 단어입니다.

다시 말해 우리가 텍스처에 넣은 값이 `[64, 128, 192, 255]`라면 셰이더에서는 `[64 / 255, 128 / 255, 192 / 255, 255 / 255]`가 되고, 
이는 다시말해 `[0.25, 0.50, 0.75, 1.00]` 입니다.

이제 데이터가 준비되었으니 텍스처를 만듭니다.

```js
  const texture = device.createTexture({
    size: [kTextureWidth, kTextureHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
```

`device.createTexture`에서 `size` 매개변수는 이름 그대로죠.
포맷은 위에서 이야기한대로 `rgba8unorm`이고요. 
`usage`의 `GPUTextureUsage.TEXTURE_BINDING`는 우리가 이 텍스처를 바인드그룹[^texture-binding]에 바인딩할 것임을 의미하고, 
`COPY_DST`는 데이터를 복사할 수 있도록 하겠다는 의미입니다.

[^texture-binding]: 텍스처의 다른 사용 용도 중 하나는 `GPUTextureUsage.RENDER_ATTACHMENT` 입니다.
이는 텍스처를 우리가 렌더링을 하는 대상으로 쓰겠다는 의미입니다. 
예제에서 `context.getCurrentTexture()`를 통해 우리가 사용하는 캔버스의 텍스처는 
`GPUTextureUsage.RENDER_ATTACHMENT`가 기본으로 설정되어 있습니다.

다음으로 할 일은 데이터를 복사하는 것입니다.

```js
  device.queue.writeTexture(
      { texture },
      textureData,
      { bytesPerRow: kTextureWidth * 4 },
      { width: kTextureWidth, height: kTextureHeight },
  );
```

`device.queue.writeTexture`의 첫 번째 매개변수는 업데이트하고자 하는 텍스처입니다. 
두 번째는 복사하고자 하는 데이터, 세 번째는 텍스처에 복사할 때 데이터를 어떻게 읽을지를 명시합니다. 
`bytesPerRow`가 한 행(row)에서 다음 행으로 넘어갈때까지 얼마나 많은 바이트가 사용되는지를 의미합니다. 
마지막 매개변수는 복사 대상의 크기입니다.

추가적으로 샘플러를 만들어야 합니다.

```js
  const sampler = device.createSampler();
```

텍스처화 샘플러를 모두 바인드그룹에 추가하고 이는 우리가 셰이더에 추가한 
`@binding(?)`와 매칭되어야 합니다.

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture },
    ],
  });
```

렌더링 부분에서는 바인드그룹을 명시하고 두 개의 삼각형으로 이루어진 사각형을 
렌더링하기위해 여섯 개의 정점을 그려야 합니다.

```js
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
-    pass.draw(3);  // call our vertex shader 3 times
+    pass.draw(6);  // call our vertex shader 6 times
    pass.end();
```

실행하면 아래와 같은 결과를 얻게됩니다.

{{{example url="../webgpu-simple-textured-quad.html"}}}

**왜 F가 뒤집혀있을까?**

위로 다시 올라가 텍스처 좌표와 관련한 다이어그램을 살펴보면 
텍스처 좌표 0,0이 텍스처의 첫 번째 텍셀을 참조하는 것을 볼 수 있습니다. 
사각형의 캔버스 중심 부분의 위치가 0,0이고 그 값을 텍스처 좌표로 사용하므로, 
다이어그램에 대응해 보면 0,0은 첫 번째인 파란색 값을 참조하는 것을 알 수 있습니다.

이를 수정하는 방법은 일반적으로 두 가지입니다.

1. 텍스처 좌표를 뒤집는다(flip).

   이 예제의 경우 텍스처 좌표의 수정은 정점 셰이더에서 수정하거나,
      
   ```wgsl
   -  vsOutput.texcoord = xy;
   +  vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
   ```
   
   프래그먼트 셰이더에서 수정할 수 있습니다.

   ```wgsl
   -  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
   +  let texcoord = vec2f(fsInput.texcoord.x, 1.0 - fsInput.texcoord.y);
   +  return textureSample(ourTexture, ourSampler, texcoord);
   ```
   
   당연히 [정점 버퍼](webgpu-vertex-buffers.html), 또는 [스토리지 버퍼](webgpu-storage-buffers.html)를 사용해 텍스처 좌표를 넘겨주는 경우, 
   이를 원본 데이터에서 뒤집는 것이 좋습니다.

2. 텍스처 데이터를 뒤집는다.

   ```js
    const textureData = new Uint8Array([
   -   b, _, _, _, _,
   -   _, y, y, y, _,
   -   _, y, _, _, _,
   -   _, y, y, _, _,
   -   _, y, _, _, _,
   -   _, y, _, _, _,
   -   _, _, _, _, _,
   +   _, _, _, _, _,
   +   _, y, _, _, _,
   +   _, y, _, _, _,
   +   _, y, y, _, _,
   +   _, y, _, _, _,
   +   _, y, y, y, _,
   +   b, _, _, _, _,
    ].flat());
   ```

   데이터를 뒤집으면 위에 있는 값이 아래로 와서, 바꾸기 전의 왼쪽 아래 데이터가 
   첫 번째 데이터, 즉 0,0 텍스처 좌표가 참조하는 데이터가 됩니다. 
   이것이 텍스처 좌표를 대개 아래쪽이 0, 위쪽이 1로 생각하는 이유입니다.
   
   <div class="webgpu_center"><img src="resources/texture-coordinates-y-flipped.svg" style="width: 500px;"></div>

   데이터를 뒤집는 것은 흔한 일이라 이미지, 비디오, 캔버스로부터 데이터를 읽어 올 때 데이터를 뒤집어주는 옵션이 존재하기도 합니다.

## <a id="a-mag-filter"></a>magFilter

위 예제에서 우리는 기본 설정으로 샘플러를 사용했습니다. 
5x7 크기의 텍스처를 원본 5x7 텍셀 크기보다 크게 그리고 있기 때문에 샘플러는 
`magFilter`, 즉 텍스처가 확대(magnifying)될 때 사용되는 필터를 사용하고 있습니다. 
이를 `nearest` 에서 `linear`로 바꾸면 네 개 픽셀 사이에서 선형(linear) 보간합니다.

<a id="a-linear-interpolation"></a>
<div class="webgpu_center center diagram"><div data-diagram="linear-interpolation" style="display: inline-block; width: 600px;"></div></div>

텍스처 좌표는 일반적으로 "UV"(you-vee로 발음)로 불리며, 따라서 위 다이어그램에서 
`uv`는 텍스처 좌표를 의미합니다. 주어진 uv에 대해 가까운 네 개 픽셀이 선택됩니다. 
`t1`은 선택된 왼쪽 위 픽셀의 중심에서부터 `u`좌표까지의 수평 거리 비율이며 0은 `u` 
가 왼쪽 픽셀의 중심선상에 있다는 뜻이고 1은 오른쪽 픽셀의 중심선상에 있다는 뜻입니다. 
`t2`도 비슷한데 수평 거리가 아닌 수직 거리입니다.

`t1`값은 위쪽 두 개의 픽셀값을 *mix*하여 중간 색상값을 계산하는데 사용됩니다. 
*mix*는 두 값 사이를 선형 보간하며, `t1`이 0이면 첫 번째 값이 선택됩니다. 
`t1`이 1이면 두 번째 값이 선택됩니다. 0과 1 사이의 값에서는 비율에 따라 섞이게 됩니다. 
예를들어 0.3일 경우 첫 번째 값을 70%, 두 전째 값을 30% 섞습니다. 
비슷하게 두 번째 중간 색상도 아래 두 픽셀값으로 계산됩니다. 
마지막으로, `t2`를 사용해 이 두개의 중간 색상값을 다시 섞으면 최종 색상이 됩니다.

중요한 또다른 점은 다이어그램 아래쪽에 있는 두 개의 샘플러 설정인 `addressModeU`와 
`addressModeV`입니다. 이 값들을 `repeat` 또는 
`clamp-to-edge`로 설정할 수 있습니다. [^mirror-repeat]
`repeat`로 설정하면 텍스처 좌표가 모서리 픽셀에 대해 바깥쪽으로 절반을 넘어가게 되면 반대쪽의 픽셀로 되돌아와 색상을 섞습니다. 
`clamp-to-edge`인 경우 텍스처 좌표가 clamp되어 모서리 픽셀 절반 밖으로 넘어가 계산될 수 없습니다. 
이렇게 되면 텍스처 좌표 범위 밖의 값에 대해서는 모서리 색상만이 보여집니다.

[^mirror-repeat]: 추가적으로 `mirror-repeat` 모드도 있습니다. 우리 텍스처가 "🟥🟩🟦"라면, repeat는 "🟥🟩🟦🟥🟩🟦🟥🟩🟦🟥🟩🟦"인데 mirror-repeat는 "🟥🟩🟦🟦🟩🟥🟥🟩🟦🟦🟩🟥"입니다.

예제를 수정하여 이런 모든 옵션을 사용해 사각형을 그려볼 수 있도록 하겠습니다.

먼저 각 설정값의 조합으로 샘플러들을 만듭니다. 
또한 이 샘플러를 사용하는 바인드그룹도 만듭니다.

```js
+  const bindGroups = [];
+  for (let i = 0; i < 8; ++i) {
-   const sampler = device.createSampler();
+   const sampler = device.createSampler({
+      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
+      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
+      magFilter: (i & 4) ? 'linear' : 'nearest',
+    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture },
      ],
    });
+    bindGroups.push(bindGroup);
+  }
```

아래과 같이 설정들을 만듭니다.

```js
  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
  };
```

그리고 렌더링 시에 설정값을 탐색해 어떤 바인드 그룹을 사용할지 결정합니다.

```js
  function render() {
+    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
+                (settings.addressModeV === 'repeat' ? 2 : 0) +
+                (settings.magFilter === 'linear' ? 4 : 0);
+    const bindGroup = bindGroups[ndx];
   ...
```

이제 남은 것은 이러한 설정을 바꿀 수 있는 UI를 만들고 값이 바뀔때 마다 다시 렌더링하는 것입니다. 
저는 "muigui"라는, [dat.GUI](https://github.com/dataarts/dat.gui)와 유사한 API를 갖는 라이브러리를 사용합니다.

```js
import GUI from '../3rdparty/muigui-0.x.module.js';

...

  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
  };

  const addressOptions = ['repeat', 'clamp-to-edge'];
  const filterOptions = ['nearest', 'linear'];

  const gui = new GUI();
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  gui.add(settings, 'addressModeU', addressOptions).onChange(render);
  gui.add(settings, 'addressModeV', addressOptions).onChange(render);
  gui.add(settings, 'magFilter', filterOptions).onChange(render);
```

위 코드는 `settings`를 선언하고 이들을 설정하는 UI를 만든 후, 
값이 변경되는 경우에 `render`를 호출합니다.

{{{example url="../webgpu-simple-textured-quad-linear.html"}}}

우리 프래그먼트 셰이더는 보간된 텍스처 좌표를 받고 이를 바탕으로 
`textureSample`를 호출하기 때문에 각 픽셀에 대한 색상을 요청할 때 다른 섞인 색상이 반환될 수 있습니다. 
`repeat`모드일 때 WebGPU가 텍스처의 반대쪽에서 텍셀을 "샘플링"해 오는 것에 주목하세요.

## <a id="a-min-filter"></a>minFilter

`minFilter` 설정도 있는데 텍스처가 원래 크기보다 작게 그려질 때 `magFilter`와 비슷한 연산을 합니다. 
`linear`로 설정하면 마찬가지로 네 개의 픽셀을 선택하고 비슷한 수식을 통해 섞습니다.

문제는, 큰 텍스처로부터 네 개의 섞을 픽셀을 선택하여 예를들어 하나의 픽셀 
색상을 결정하려고 하면, 색상이 바뀌어 깜박임(flickering) 현상이 발생하게 됩니다.

직접 만들어서 문제를 살펴 봅시다.

먼저 캔버스를 저해상도로 만듭니다. 이를 위해서는 css를 수정해서 브라우저가 
우리의 캔버스에 대해 `magFilter: 'linear'`와 같은 처리를 하지 않도록 합니다. 
아래와 같이 css를 설정하면 됩니다.

```css
canvas {
  display: block;  /* make the canvas act like a block   */
  width: 100%;     /* make the canvas fill its container */
  height: 100%;
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
}
```

다음으로 `ResizeObserver` 콜백에서 캔버스의 해상도를 낮춥니다.

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // re-render
      render();
    }
  });
  observer.observe(canvas);
```

[uniforms에 관한 글](webgpu-uniforms.html)의 첫 번째 예제에서처럼 
사각형을 옮기고 크기를 조정할 수 있도록 하기 위해 uniform 버퍼를 추가합니다.

```wgsl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

+struct Uniforms {
+  scale: vec2f,
+  offset: vec2f,
+};
+
+@group(0) @binding(2) var<uniform> uni: Uniforms;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  let pos = array(
    // 1st triangle
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
-  vsOutput.position = vec4f(xy, 0.0, 1.0);
+  vsOutput.position = vec4f(xy * uni.scale + uni.offset, 0.0, 1.0);
  vsOutput.texcoord = xy;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

uniform이 추가되었으니 uniform 버퍼를 만들고 바인드 그룹에 추가합니다.

```js
+  // create a buffer for the uniform values
+  const uniformBufferSize =
+    2 * 4 + // scale is 2 32bit floats (4bytes each)
+    2 * 4;  // offset is 2 32bit floats (4bytes each)
+  const uniformBuffer = device.createBuffer({
+    label: 'uniforms for quad',
+    size: uniformBufferSize,
+    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+  });
+
+  // create a typedarray to hold the values for the uniforms in JavaScript
+  const uniformValues = new Float32Array(uniformBufferSize / 4);
+
+  // offsets to the various uniform values in float32 indices
+  const kScaleOffset = 0;
+  const kOffsetOffset = 2;

  const bindGroups = [];
  for (let i = 0; i < 8; ++i) {
    const sampler = device.createSampler({
      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
      magFilter: (i & 4) ? 'linear' : 'nearest',
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture },
+        { binding: 2, resource: uniformBuffer},
      ],
    });
    bindGroups.push(bindGroup);
  }
```

uniform의 값을 설정하고 GPU에 업로드하는 코드도 추가해야 합니다. 
이 과정을 애니메이션할 예정이므로 `requestAnimationFrame`를 사용하도록 
코드를 수정하여 연속적인 렌더링이 이루어지도록 합니다.

```js
  function render(time) {
    time *= 0.001;
    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
                (settings.addressModeV === 'repeat' ? 2 : 0) +
                (settings.magFilter === 'linear' ? 4 : 0);
    const bindGroup = bindGroups[ndx];

+    // compute a scale that will draw our 0 to 1 clip space quad
+    // 2x2 pixels in the canvas.
+    const scaleX = 4 / canvas.width;
+    const scaleY = 4 / canvas.height;
+
+    uniformValues.set([scaleX, scaleY], kScaleOffset); // set the scale
+    uniformValues.set([Math.sin(time * 0.25) * 0.8, -0.8], kOffsetOffset); // set the offset
+
+    // copy the values from JavaScript to the GPU
+    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    ...

+    requestAnimationFrame(render);
  }
+  requestAnimationFrame(render);

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
-      // re-render
-      render();
    }
  });
  observer.observe(canvas);
}
```

위 코드에서는 scale을 설정하여 사각형을 캔버스에 2x2 픽셀 크기로 그리도록 하였습니다. 
또한 `Math.sin`를 사용하여 offset을 -0.8에서 +0.8로 설정해서 사각형이 캔버스에서 천천히 앞뒤로 이동하도록 하였습니다.

마지막으로 `minFilter` 설정의 조합들을 추가합니다.

```js
  const bindGroups = [];
  for (let i = 0; i < 16; ++i) {
    const sampler = device.createSampler({
      addressModeU: (i & 1) ? 'repeat' : 'clamp-to-edge',
      addressModeV: (i & 2) ? 'repeat' : 'clamp-to-edge',
      magFilter: (i & 4) ? 'linear' : 'nearest',
+      minFilter: (i & 8) ? 'linear' : 'nearest',
    });

...

  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
+    minFilter: 'linear',
  };

  const addressOptions = ['repeat', 'clamp-to-edge'];
  const filterOptions = ['nearest', 'linear'];

  const gui = new GUI();
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  -gui.add(settings, 'addressModeU', addressOptions).onChange(render);
  -gui.add(settings, 'addressModeV', addressOptions).onChange(render);
  -gui.add(settings, 'magFilter', filterOptions).onChange(render);
+  gui.add(settings, 'addressModeU', addressOptions);
+  gui.add(settings, 'addressModeV', addressOptions);
+  gui.add(settings, 'magFilter', filterOptions);
+  gui.add(settings, 'minFilter', filterOptions);

  function render(time) {
    time *= 0.001;
    const ndx = (settings.addressModeU === 'repeat' ? 1 : 0) +
                (settings.addressModeV === 'repeat' ? 2 : 0) +
-                (settings.magFilter === 'linear' ? 4 : 0);
+                (settings.magFilter === 'linear' ? 4 : 0) +
+                (settings.minFilter === 'linear' ? 8 : 0);
```

`requestAnimationFrame`를 통해 렌더링을 지속적으로 수행하니 설정이 변할 때마다 `render`를 호출할 필요는 없어졌습니다. 
(`requestAnimationFrame`는 "rAF"로 불리며 이러한 스타일의 렌더링 루프(loop)를 "rAF 루프"라고 부릅니다.)

{{{example url="../webgpu-simple-textured-quad-minfilter.html"}}}

사각형의 색상이 바뀌며 깜박거리는 것을 볼 수 있습니다. 
`minFilter`가 `nearest`면 2x2 픽셀의 각 픽셀마다 텍스처로부터 하나의 값을 선택합니다. 
`linear`로 설정하면 앞서 설명한 것처럼 이중선형(bilinear) 필터링을 수행하지만 여전히 깜박거립니다.

원인 중 하나는, 사각형은 실수(real number) 위치로 표현되지만 픽셀은 정수라는 점입니다. 
텍스처 좌표는 실수를 기반으로 보간되는데, 좀 더 정확히 말하자면 실수 기준으로 계산된다고 할 수 있습니다.

<a id="a-pixel-to-texcoords"></a>
<div class="webgpu_center center diagram">
  <div class="fit-container">
    <div class="text-align: center">drag to move</div>
    <div class="fit-container" data-diagram="pixel-to-texcoords" style="display: inline-block; width: 600px;"></div>
  </div>
</div>

위 다이어그램에서 <span style="color: red;">빨간색</span> 사각형은 
정점 셰이더에서 반환된 위치값을 가지고 GPU가 그리는 사각형입니다. 
GPU가 그리기를 수행할 때, 어떤 픽셀의 중심이 사각형(두 개의 삼각형) 
안에 들어오는지를 먼저 계산합니다.
그리고 스테이지간 변수로 보간되어 프래그먼트 셰이더로 전달될 값을, 
원래 위치에 상대적인 그려질 픽셀의 중심을 기준으로 계산합니다. 
그리고 프래그먼트 셰이더에서는 WGSL의 `textureSample` 함수에 
텍스처 좌표를 전달하고 기존 다이어그램에서 보여준 것과 같은 방식으로 샘플링된 색상을 반환 받습니다. 
그려질 픽셀에 대해 어떤 UV좌표가 계산되었는지에 따라 다른 색상이 혼합(blend)되는 것을 보실 수 있습니다.
(*역주: 빨간 사각형을 조금만 움직이면, 그려지는 픽셀(하늘색으로 표시되는) 
위치는 바뀌지 않지만 그 픽셀에 대해 보간된 UV값은 바뀝니다. 따라서 위에서 
설명한 이중선형 보간 결과가 바뀌고 색깔이 계속 바뀝니다.)
 
텍스처는 이러한 문제에 대한 해결 방법을 가지고 있습니다. 
이는 밉맵핑(mip-mapping)이라고 하는 방법입니다. 
제 생각에 밉맵은 "multi-image-pyramid-map"의 약자인 것 같습니다. (아닐수도 있고요.)

텍스처를 가지고 가로세로 크기가 절반(내림)인 더 작은 텍스처를 만듭니다. 
그리고 더 작은 텍스처의 색상들을 원본 텍스처의 색상들을 혼합하여 채웁니다. 
이러한 과정들을 1x1 크기의 텍스처를 얻을 때까지 반복합니다. 
우리 예제에서 5x7 텍셀의 텍스처로부터 가로세로 2로 나누고 내림하면 2x3 텍셀의 텍스처가 됩니다. 
그리고 이 텍스처를 가지고 반복하면 최종적으로 1x1 텍셀 텍스처가 될겁니다.

<div class="webgpu_center center diagram"><div data-diagram="mips" style="display: inline-block;"></div></div>

이러한 밉맵을 가지고 GPU에게 원본 텍스처 크기보다 작게 그려져야 할 때에는 
더 작은 밉 레벨을 선택하게 할 수 있습니다. 
이렇게 하면 "미리 혼합(pre-blended)"되었기 때문에 훨씬 결과가 나아 보이며, 
텍스처의 크기가 작아졌을 때 보여져야 할 색상이 훨씬 잘 표현됩니다.

하나의 밉에서 다른 밉을 만들 때의 알고리즘은 연구의 영역, 또는 개인적인 취향의 문제입니다. 
여기서는 우선 새로운 밉을 (위에서 설명한 것과 동일한) 이중선형 필터링으로 만드는 코드를 구현했습니다.

```js
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const bilinearFilter = (tl, tr, bl, br, t1, t2) => {
  const t = mix(tl, tr, t1);
  const b = mix(bl, br, t1);
  return mix(t, b, t2);
};

const createNextMipLevelRgba8Unorm = ({data: src, width: srcWidth, height: srcHeight}) => {
  // compute the size of the next mip
  const dstWidth = Math.max(1, srcWidth / 2 | 0);
  const dstHeight = Math.max(1, srcHeight / 2 | 0);
  const dst = new Uint8Array(dstWidth * dstHeight * 4);

  const getSrcPixel = (x, y) => {
    const offset = (y * srcWidth + x) * 4;
    return src.subarray(offset, offset + 4);
  };

  for (let y = 0; y < dstHeight; ++y) {
    for (let x = 0; x < dstWidth; ++x) {
      // compute texcoord of the center of the destination texel
      const u = (x + 0.5) / dstWidth;
      const v = (y + 0.5) / dstHeight;

      // compute the same texcoord in the source - 0.5 a pixel
      const au = (u * srcWidth - 0.5);
      const av = (v * srcHeight - 0.5);

      // compute the src top left texel coord (not texcoord)
      const tx = au | 0;
      const ty = av | 0;

      // compute the mix amounts between pixels
      const t1 = au % 1;
      const t2 = av % 1;

      // get the 4 pixels
      const tl = getSrcPixel(tx, ty);
      const tr = getSrcPixel(tx + 1, ty);
      const bl = getSrcPixel(tx, ty + 1);
      const br = getSrcPixel(tx + 1, ty + 1);

      // copy the "sampled" result into the dest.
      const dstOffset = (y * dstWidth + x) * 4;
      dst.set(bilinearFilter(tl, tr, bl, br, t1, t2), dstOffset);
    }
  }
  return { data: dst, width: dstWidth, height: dstHeight };
};

const generateMips = (src, srcWidth) => {
  const srcHeight = src.length / 4 / srcWidth;

  // populate with first mip level (base level)
  let mip = { data: src, width: srcWidth, height: srcHeight, };
  const mips = [mip];

  while (mip.width > 1 || mip.height > 1) {
    mip = createNextMipLevelRgba8Unorm(mip);
    mips.push(mip);
  }
  return mips;
};
```

GPU를 사용해 이러한 작업을 하는 방법은 [다른 글](webgpu-importing-textures.html)에서 살펴볼겁니다. 
지금은 위 코드를 사용해 밉맵을 만들 것입니다.

위 함수에 텍스처 데이터를 전달하면 밉 레벨 데이터의 배열이 반환됩니다. 
이를 사용해 모든 밉 레벨이 포함된 텍스처를 만듭니다.

```js
  const mips = generateMips(textureData, kTextureWidth);

  const texture = device.createTexture({
    label: 'yellow F on red',
+    size: [mips[0].width, mips[0].height],
+    mipLevelCount: mips.length,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
  });
  mips.forEach(({data, width, height}, mipLevel) => {
    device.queue.writeTexture(
-      { texture },
-      textureData,
-      { bytesPerRow: kTextureWidth * 4 },
-      { width: kTextureWidth, height: kTextureHeight },
+      { texture, mipLevel },
+      data,
+      { bytesPerRow: width * 4 },
+      { width, height },
    );
  });
```

`mipLevelCount`에 밉 레벨 숫자를 넘겨주는 점을 주목하세요. 
WebGPU는 그러면 각 레벨에 대해 올바른 크기의 밉을 만듭니다. 
그러고 나서 각 레벨에 대해 `mipLevel`로 명시하면서 데이터를 복사합니다.

추가로 스케일 설정을 더해서 사각형이 다른 크기로 그려질 수 있도록 해 봅시다.

```js
  const settings = {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
+    scale: 1,
  };

  ...

  const gui = new GUI();
  Object.assign(gui.domElement.style, {right: '', left: '15px'});
  gui.add(settings, 'addressModeU', addressOptions);
  gui.add(settings, 'addressModeV', addressOptions);
  gui.add(settings, 'magFilter', filterOptions);
  gui.add(settings, 'minFilter', filterOptions);
+  gui.add(settings, 'scale', 0.5, 6);

  function render(time) {

    ...

-    const scaleX = 4 / canvas.width;
-    const scaleY = 4 / canvas.height;
+    const scaleX = 4 / canvas.width * settings.scale;
+    const scaleY = 4 / canvas.height * settings.scale;

```

이렇게 하면 GPU가 그려야 할 가장 작은 밉을 선택하게 되고, 깜박임이 사라집니다.

{{{example url="../webgpu-simple-textured-quad-mipmap.html"}}}

scale을 조정해 보면 크기가 커질 때 어떤 밉 레벨을 사용하는지가 바뀌는 것을 볼 수 있습니다. 
scale이 2.4에서 2.5로 바뀔 때 변화가 큰데 이 구간이 밉 레벨 0 (가장 큰 밉 레벨) 에서 밉 레벨 1 (중간 크기) 로 바뀌는 지점입니다. 
이 문제는 어떻게 해야 할까요?

## <a id="a-mipmap-filter"></a>mipmapFilter

`magFilter`와 `minFilter`가 `nearest` 또는 `linear`를 선택할 수 있는 것처럼, 
`mipmapFilter` 설정도 `nearest` 또는 `linear`를 선택할 수 있습니다.

이는 밉 레벨 사이에 혼합을 할 것인지 여부를 결정합니다. 
`mipmapFilter: 'linear'`의 경우 두 개의 밉 레벨로부터 색상이 샘플링되는데, 
이렇게 샘플링되는 값은 이전 설정에 따라 nearest에 의해 계산된 값일수도, linear에 의해 계산된 값일수도 있습니다. 
그러고나서 이 두 색상이 비슷한 방식으로 다시 `mix`됩니다.

이는 3차원으로 물체를 그릴 때 자주 사용됩니다. 
3차원을 그리는 것에 대해서는 [다른 글](webgpu-perspective.html)에서 
설명할 것이므로 여기서 이야기하지는 않겠습니다.
하지만 이전 예제를 조금 바꿔서 3차원으로 `mipmapFilter`가 어떻게 
동작하는지를 좀 더 잘 볼수있도록 해 보겠습니다.

먼저 텍스처를 만듭니다. `mipmapFilter`의 효과를 좀 더 잘 보여줄 수 있는 
16x16 텍스처를 하나 만들 것입니다.

```js
  const createBlendedMipmap = () => {
    const w = [255, 255, 255, 255];
    const r = [255,   0,   0, 255];
    const b = [  0,  28, 116, 255];
    const y = [255, 231,   0, 255];
    const g = [ 58, 181,  75, 255];
    const a = [ 38, 123, 167, 255];
    const data = new Uint8Array([
      w, r, r, r, r, r, r, a, a, r, r, r, r, r, r, w,
      w, w, r, r, r, r, r, a, a, r, r, r, r, r, w, w,
      w, w, w, r, r, r, r, a, a, r, r, r, r, w, w, w,
      w, w, w, w, r, r, r, a, a, r, r, r, w, w, w, w,
      w, w, w, w, w, r, r, a, a, r, r, w, w, w, w, w,
      w, w, w, w, w, w, r, a, a, r, w, w, w, w, w, w,
      w, w, w, w, w, w, w, a, a, w, w, w, w, w, w, w,
      b, b, b, b, b, b, b, b, a, y, y, y, y, y, y, y,
      b, b, b, b, b, b, b, g, y, y, y, y, y, y, y, y,
      w, w, w, w, w, w, w, g, g, w, w, w, w, w, w, w,
      w, w, w, w, w, w, r, g, g, r, w, w, w, w, w, w,
      w, w, w, w, w, r, r, g, g, r, r, w, w, w, w, w,
      w, w, w, w, r, r, r, g, g, r, r, r, w, w, w, w,
      w, w, w, r, r, r, r, g, g, r, r, r, r, w, w, w,
      w, w, r, r, r, r, r, g, g, r, r, r, r, r, w, w,
      w, r, r, r, r, r, r, g, g, r, r, r, r, r, r, w,
    ].flat());
    return generateMips(data, 16);
  };
```

생성된 밉 레벨들은 아래와 같습니다.

<div class="webgpu_center center diagram"><div data-diagram="blended-mips" style="display: inline-block;"></div></div>

각 밉 레벨에 어떻 데이터를 넣을지는 자유이기 때문에 어떤 일이 벌어지고 
있는지를 확인하는 좋은 방법으로 각 밉 레벨을 다른 색으로 채우는 방법이 있습니다. 
캔버스 2D API를 사용해 밉 레벨들을 만들어 봅시다.

```js
  const createCheckedMipmap = () => {
    const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    const levels = [
      { size: 64, color: 'rgb(128,0,255)', },
      { size: 32, color: 'rgb(0,255,0)', },
      { size: 16, color: 'rgb(255,0,0)', },
      { size:  8, color: 'rgb(255,255,0)', },
      { size:  4, color: 'rgb(0,0,255)', },
      { size:  2, color: 'rgb(0,255,255)', },
      { size:  1, color: 'rgb(255,0,255)', },
    ];
    return levels.map(({size, color}, i) => {
      ctx.canvas.width = size;
      ctx.canvas.height = size;
      ctx.fillStyle = i & 1 ? '#000' : '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
      return ctx.getImageData(0, 0, size, size);
    });
  };
```

위 코드를 통해 아래와 같은 밉 레벨들이 만들어집니다.

<div class="webgpu_center center diagram"><div data-diagram="checkered-mips" style="display: inline-block;"></div></div>

데이터를 만들었으니 텍스처를 만들어봅시다.

```js
+  const createTextureWithMips = (mips, label) => {
    const texture = device.createTexture({
-      label: 'yellow F on red',
+      label,
      size: [mips[0].width, mips[0].height],
      mipLevelCount: mips.length,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST,
    });
    mips.forEach(({data, width, height}, mipLevel) => {
      device.queue.writeTexture(
          { texture, mipLevel },
          data,
          { bytesPerRow: width * 4 },
          { width, height },
      );
    });
    return texture;
+  };

+  const textures = [
+    createTextureWithMips(createBlendedMipmap(), 'blended'),
+    createTextureWithMips(createCheckedMipmap(), 'checker'),
+  ];
```

점점 멀어지는 사각형을 여덟 군데에 그리도록 확장할 것입니다. 
행렬 계산을 사용하는데, 자세한 내용은 [3차원에 관한 글들](webgpu-cameras.html)에서 다룰 것입니다.

```wsgl
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
-  scale: vec2f,
-  offset: vec2f,
+  matrix: mat4x4f,
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
-  vsOutput.position = vec4f(xy * uni.scale + uni.offset, 0.0, 1.0);
+  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(1, 50);
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
```

여덟 개의 평면이 각각 다른 조합의 `minFilter`, `magFilter`, `mipmapFilter` 설정을 가질 것입니다. 
그 말인즉, 각각은 서로 다른 필터 설정을 갖는 샘플러를 포함한 각각의 바인드 그룹을 가져야 한다는 뜻입니다. 
또한 지금은 두 개의 텍스처가 있습니다. 
텍스처는 바인드 그룹의 일부이므로 객체마다 두 개의 바인드 그룹이 있어야 합니다. 
그리고 렌더링 시점에 어떤 텍스처를 사용할지 선택할 것입니다. 
여덟 군데 위치에 평면을 그리기 위해서는 또한 [uniform에 관한 글](webgpu-uniforms.html)에서처럼 위치마다 uniform 버퍼가 있어야 합니다.

```js
  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;

  const objectInfos = [];
  for (let i = 0; i < 8; ++i) {
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: (i & 1) ? 'linear' : 'nearest',
      minFilter: (i & 2) ? 'linear' : 'nearest',
      mipmapFilter: (i & 4) ? 'linear' : 'nearest',
    });

    // create a buffer for the uniform values
    const uniformBufferSize =
      16 * 4; // matrix is 16 32bit floats (4bytes each)
    const uniformBuffer = device.createBuffer({
      label: 'uniforms for quad',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // create a typedarray to hold the values for the uniforms in JavaScript
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    const matrix = uniformValues.subarray(kMatrixOffset, 16);

    const bindGroups = textures.map(texture =>
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture },
          { binding: 2, resource: uniformBuffer},
        ],
      }));

    // Save the data we need to render this object.
    objectInfos.push({
      bindGroups,
      matrix,
      uniformValues,
      uniformBuffer,
    });
  }
```

렌더링 시점에는 [viewProjection 행렬](webgpu-cameras.html)을 계산합니다.

```js
  function render() {
    const fov = 60 * Math.PI / 180;  // 60 degrees in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear  = 1;
    const zFar   = 2000;
    const projectionMatrix = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition = [0, 0, 2];
    const up = [0, 1, 0];
    const target = [0, 0, 0];
    const cameraMatrix = mat4.lookAt(cameraPosition, target, up);
    const viewMatrix = mat4.inverse(cameraMatrix);
    const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);

    ...
```

각 평면마다 어떤 텍스처를 그릴 것인지를 바탕으로 바인드 그룹을 선택하고 
평면을 위치시키기 위한 각각의 행렬을 계산합니다.

```js
  let texNdx = 0;

  function render() {
    ...

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
      const bindGroup = bindGroups[texNdx];

      const xSpacing = 1.2;
      const ySpacing = 0.7;
      const zDepth = 50;

      const x = i % 4 - 1.5;
      const y = i < 4 ? 1 : -1;

      mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
      mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
      mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
      mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

      // copy the values from JavaScript to the GPU
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(6);  // call our vertex shader 6 times
    });

    pass.end();
```

기존 UI 코드는 제거하고 rAF 루프에서 `ResizeObserver` 콜백에서 렌더링 하는 것으로 다시 바꿨습니다. 
그리고 해상도를 낮추는 부분도 되돌렸습니다.

```js
-  function render(time) {
-    time *= 0.001;
+  function render() {

    ...

-    requestAnimationFrame(render);
  }
-  requestAnimationFrame(render);

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize / 64 | 0;
-      const height = entry.contentBoxSize[0].blockSize / 64 | 0;
+      const width = entry.contentBoxSize[0].inlineSize;
+      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
+      render();
    }
  });
  observer.observe(canvas);
```

이제 저해상도가 아니니 브라우저가 캔버스를 필터링 하는 것을 방지하는 
부분도 다시 제거합니다.

```css
canvas {
  display: block;  /* make the canvas act like a block   */
  width: 100%;     /* make the canvas fill its container */
  height: 100%;
-  image-rendering: pixelated;
-  image-rendering: crisp-edges;
}
```

캔버스를 클릭하면 그려질 텍스처를 바꾸고 다시 그리도록 하였습니다.

```js
  canvas.addEventListener('click', () => {
    texNdx = (texNdx + 1) % textures.length;
    render();
  });
```

{{{example url="../webgpu-simple-textured-quad-mipmapfilter.html"}}}

왼쪽 위의 경우 모든 필터링을 `nearest`로, 오른쪽 아래의 경우 모든 필터링을 `linear`로 설정한 것의 차이가 보이시나요? 
특히이 예제에서는 `mipmapFilter`를 추가했기 때문에 이미지를 클릭하면 
모든 레벨이 다른 색상으로 그려진 체크 무늬의 텍스처가 보이고 
위쪽의 경우 모든 `mipmapFilter`가 `nearest`인 경우이니 
하나의 밉 레벨에서 다른 밉 레벨로 전환될때 급격한 변화가 발생하는 것을 볼 수 있을겁니다. 
아래쪽의 경우 `mipmapFilter`이 `linear`여서 밉 레벨 사이에서 혼합이 일어나고 있습니다.

모든 필터링을 `linear`로 설정하면 안되는지 의문이 드실겁니다. 
우선 스타일 문제가 있습니다. 픽셀화된 이미지를 보여주고 싶은 경우에는 
필터링을 하면 안됩니다. 또한 속도 문제가 있습니다. 
모든 필터링이 nearest로 설정되면 텍스처로부터 하나의 픽셀값만 읽어오면 되니 
linear로 설정한 경우처럼 여덟 개의 픽셀 값을 읽어오는 것보다 빠릅니다.

TBD: Repeat

TBD: Anisotropic filtering

## 텍스처 타입과 텍스처 뷰(view)

지금까지 우리는 2차원 텍스처만 사용했습니다. 텍스처에는 세 종류가 있습니다.

* "1차원(1d)"
* "2차원(2d)"
* "3차원(3d)"

어떤 면에서 "2차원" 텍스처는 "3차원" 텍스처인데 깊이값이 1인 텍스처로 생각할 *수도 있습니다*. 
그리고 "1차원" 텍스처는 높이가 1인 "2차원" 텍스처로 생각할 수 있습니다. 
실질적인 차이점이라면 텍스처의 크기에는 사실 제한이 있다는 겁니다. 
그리고 이러한 제한은 "1차원", "2차원", "3차원" 타입에 따라 다릅니다. 
우리는 캔버스의 크기를 설정할 때 "2차원"의 제한을 사용한 바 있습니다.

```js
canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
```

3차원과 2차원 텍스처 사이에는 속도 차이도 있는데 모든 샘플러 필터가 
`linear`라면 3차원 텍스처를 샘플링 하는 것은 16개의 텍셀 값을 얻어와야 
하고 이들을 모두 혼합해야 합니다. 2차원의 경우 8개의 텍셀만 얻어오면 됩니다. 
1차원 텍스처의 경우 4개만 얻어오면 되지만 GPU가 1차원 텍스처에 대해 
최적화 된 경우가 있는지는 모르겠습니다. (*역주: 일반적으로 2차원 텍스처를 
많이 사용하기 때문에 이를 기준으로 최적화되어있고, 따라서 1차원 텍스처가 
접근하는 값이 적다고 하더라도 속도 이득은 별로 없을 수 있음.*)

### 텍스처 뷰

텍스처 뷰는 여섯 종류가 있습니다.

* "1차원"
* "2차원"
* "2차원 배열(2d-array)"
* "3차원"
* "큐브(cube)"
* "큐브 배열(cube-array)"

1차원 텍스처는 1차원 뷰만 가능합니다. 3차원 텍스처는 3차원 뷰만 가능합니다. 
2차원 텍스처는 2차원 배열 뷰가 가능합니다. 2차원 텍스처가 여섯 개의 
레이어를 갖는다면 큐브 뷰가 될 수 있습니다. 
여섯 개의 레이어가 여러개라면 큐브 배열 뷰가 가능합니다. 
텍스처의 뷰는 `someTexture.createView`를 호출할 떄 설정 가능합니다. 
텍스처 뷰는 텍스처의 차원과 일치하는 것이 기본값이지만 `someTexture.createView`를 사용해 다른 차원을 설정할 수 있습니다.

[톤 맵핑(tone mapping) / 3dLUTs 에 관한 글에서](webgpu-3dluts.html) 
3차원 텍스처를 다룰 것입니다.

큐브 텍스처는 정육면체의 여섯 면을 표현하는 텍스처입니다. 
큐브 텍스처는 스카이 박스(sky box)나 반사(reflection), 
환경 맵(environment map)을 그리기 위해 사용됩니다. 
이러한 내용은 [큐브 맵에 관한 글](webgpu-cube-maps.html)에서 설명합니다.

2차원 배열은 2차원 텍스처의 배열입니다. 
셰이더에서 배열의 어떤 텍스처에 접근할 것인지 선택할 수 있습니다. 
이는 지형(terrain) 렌더링 등에서 활용됩니다.

큐브 배열은 큐브 텍스처의 배열입니다.

각 텍스처 타입에 대해 WGSL에 대응되는 타입이 존재합니다.

<div class="webgpu_center data-table" style="max-width: 500px;">
  <style>
    .texture-type {
      text-align: left;
      font-size: large;
      line-height: 1.5em;
    }
    .texture-type td:nth-child(1) {
      white-space: nowrap;
    }
  </style>
  <table class="texture-type">
   <thead>
    <tr>
     <th>type</th>
     <th>WGSL types</th>
    </tr>
   </thead>
   <tbody>
    <tr><td>"1d"</td><td><code>texture_1d</code> or <code>texture_storage_1d</code></td></tr>
    <tr><td>"2d"</td><td><code>texture_2d</code> or <code>texture_storage_2d</code> or <code>texture_multisampled_2d</code> as well as a special case for in certain situations <code>texture_depth_2d</code> and <code>texture_depth_multisampled_2d</code></td></tr>
    <tr><td>"2d-array"</td><td><code>texture_2d_array</code> or <code>texture_storage_2d_array</code> and sometimes <code>texture_depth_2d_array</code></td></tr>
    <tr><td>"3d"</td><td><code>texture_3d</code> or <code>texture_storage_3d</code></td></tr>
    <tr><td>"cube"</td><td><code>texture_cube</code> and sometimes <code>texture_depth_cube</code></td></tr>
    <tr><td>"cube-array"</td><td><code>texture_cube_array</code> and sometimes <code>texture_depth_cube_array</code></td></tr>
   </tbody>
  </table>
</div>

몇몇 경우에 대해서는 사용 예를 설명할 예정이지만, 
텍스처를 생성할 때 (`device.createTexture`를 호출할 때)에는 1차원, 2차원, 
3차원 선택지만이 존재하고 기본값은 2차원이라는 점이 좀 혼동의 여지가 있습니다. 
그래서 지금까지는 차원을 설정할 필요가 없었던 겁니다.

## 텍스처 포맷

지금까지는 텍스처에 대한 기본 내용이었습니다. 
텍스처는 큰 토픽이고 다룰 내용들이 많습니다.

이 글에서는 `rgba8unorm`를 사용했는데 다른 텍스처 포맷도 매우 많습니다.

아래는 "color" 포맷들인데 물론 색상값만 저장할 필요는 없긴 합니다.

<div class="webgpu_center data-table"><div data-diagram="color-texture-formats"></div></div>

포맷을 이해나는 법은, 예를들어 "rg16float"의 경우 첫 부분은 텍스처에서 
지원하는 채널을 의미합니다. 따라서 "rg16float"는 "rg", 즉 빨간색과 
초록색 채널(2개 채널)을 지원합니다. 숫자인 16은 각 채널이 16비트라는 의미입니다. 
마지막 단어는 채널의 데이터 타입으로 "float"이므로 부동소수점입니다.

"unorm"은 부호없는 (0에서 1까지로)정규화되는 데이터이고 텍스처 내의 
데이터는 0에서 N까지인데 N은 해당 비트로 표현 가능한 최대 정수입니다. 
그 정수 범위가 0에서 1 사이의 부동소수점으로 변환됩니다. 
다시 말해 8unorm의 경우 8비트(따라서 값은 0에서 255 사이)가 0에서 1 사이로 
변환된다는 뜻입니다.

"snorm"은 부호있는(signed) (-1에서 1까지) 정규화되는 데이터로 범위는 
비트로 표현되는 최소 음수부터 최대 양수까지립니다. 
예를 들어 8snorm은 8비트이고 가장 작은 숫자는 -128, 가장 큰 숫자는 
+127입니다. 이 범위가 -1에서 +1로 변환됩니다.

"sint"는 부호있는 정수입니다. "uint"는 부호없는 정수이고요. 
숫자가 여러 개 있다면 이는 각 채널의 비트를 의미합니다. 
예를들어 "rg11b10ufloat"라면, "rg11"은 빨간색과 초록색 채널에 대해 
11비트이고 "b10"이 파란색 채널에 대해 10비트를 의미합니다. 
그리고 모든 값은 부호없는 부동소수점입니다.

* **renderable**

  참(True)이라면 이 텍스처에 렌더링이 가능함. (`GPUTextureUsage.RENDER_ATTACHMENT`로 설정)

* **multisample**

  [멀티샘플링(multisampled)](webgpu-multisampling.html)이 가능함

* **storage**

  [스토리지 텍스처(storage texture)](webgpu-storage-textures.html)로 
  값을 쓸 수 있음

* **sampler type**

  이는 WGSL에서 어떤 텍스처로 명시해야 하는지와 샘플러를 어떻게 바인드 
  그룹에 바인딩할것인지를 의미합니다. 
  위에서는 `texture_2d<f32>`를 사용하였는데 만일 `sint`라면 
  `texture_2d<i32>`로, `uint`라면 `texture_2d<u32>`로 
  WGSL에서 사용해야 합니다.
  
  샘플러 타입 열(column)에서 `unfilterable-float`은 샘플러가 해당 
  포맷에 대해 `nearest`만 사용 가능하고 바인드 그룹 레이아웃을 
  예제에서처럼 `'auto'` 레이아웃을 사용하는 대신 매뉴얼하게 설정해야 
  할 수 있다는 뜻입니다. 
  이러한 것이 존재하는 이유는 데스크탑 GPU는 일반적으로 32비트 부동소수점 
  텍스처를 필터링이 가능하지만 2023년 현재를 기준으로 대부분의 모바일 
  장치에서는 불가능하기 때문입니다. 
  여러분의 어댑터(adapter)가 `float32-filterable`
  [기능(feature)](webgpu-limits-and-features.html)을 지원하고 
  장치를 요청할 때 이를 활성화하였다면 `r32float`, `rg32float`, 
  `rgba32float` 포맷이 `float`으로 변화하고 
  이러한 텍스처 포맷이 별도의 수정 없이 잘 동작합니다.

<a id="a-depth-stencil-formats"></a>아래는 깊이(depth)와 스텐실(stemcil) 포맷입니다.

<div class="webgpu_center data-table"><div data-diagram="depth-stencil-texture-formats"></div></div>

* **feature**

  이 포맷을 사용하기 위해서는 [*선택적* 기능](webgpu-limits-and-features.html)이 필요하다는 뜻입니다.

* **copy src**

  `GPUTextureUsage.COPY_SRC`로 설정할 수 있는지 여부입니다.

* **copy dst**

  `GPUTextureUsage.COPY_DST`로 설정할 수 있는지 여부입니다.

[3차원에 관한 글](webgpu-orthographic-projection.html)과 [그림자 맵(shadow map)](webgpu-shadow-maps.html)에 관한 글에서 
깊이 텍스처를 사용할 것입니다

압축(compressed) 텍스처 포맷도 한참 더 있지만 다른 글로 미뤄 두도록 
하겠습니다.

다음 글에서는 [외부 텍스처 임포트(import)](webgpu-importing-textures.html)를 설명하도록 하겠습니다.

<!-- keep this at the bottom of the article -->
<script type="module" src="/3rdparty/pixel-perfect.js"></script>
<script type="module" src="webgpu-textures.js"></script>
