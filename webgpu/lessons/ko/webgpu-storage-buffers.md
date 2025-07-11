Title: WebGPU 스토리지 버퍼
Description: 셰이더에 큰 데이터 전달하기
TOC: 스토리지 버퍼(Storage Buffers)

이 글에서는 [지난 글](webgpu-uniforms.html)에 이어서, 
스토리지 버퍼에 대해 알아보겠습니다.

스토리지 버퍼는 여러 면에서 uniform 버퍼와 비슷합니다.
자바스크립트에서 `UNIFORM`을 `STORAGE`로 바꾸고, WEGSL 예시에서는 
`var<uniform>`를 `var<storage, read>`로 바꾸면 이전 예제가 그대로 동작합니다.

차이점은 아래와 같습니다. 변수 이름은 수정하지 않았습니다.

```js
    const staticUniformBuffer = device.createBuffer({
      label: `static uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });


...

    const uniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: uniformBufferSize,
-      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
```

WSGL에서는 아래와 같습니다.

```wsgl
      @group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
      @group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

더이상 다른 수정 없이도, 이전과 같이 동작합니다.

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## uniform 버퍼와 스토리지 버퍼의 차이점

uniform 버퍼와 스토리지 버퍼의 주요한 차이점은 아래와 같습니다:

1. 일반적인 uniform 버퍼의 사용 예에서는 uniform 버퍼가 더 빠를 수 있음

  사용 법에 따라 다를 수 있습니다. 일반적인 앱에서는 여러가지 다른 것들을 그려야 합니다.
  3D 게임의 예를 들어보죠. 앱에서 자동차, 건물, 바위, 덤불, 사람 등등을 그려야 합니다.
  이들 각각에 대한 방향(orientation)과 머티리얼(material) 속성 등을 위 예제와 같이 넘겨주어야 합니다.
  이러한 경우 uniform 버퍼를 사용하는 것이 좋은 방법입니다.
   
2. 스토리지 버퍼는 uniform 버퍼보다 훨씬 클 수 있음

   * uniform 버퍼의 최대 크기의 하한은 64k 이상
   * 스토리지 버퍼의 최대 크기의 하한은 128M 이상

   버퍼의 종류에 따라 보장되는 최대 크기의 하한이 다를 수 있습니다.
   uniform 버퍼의 경우 최대 크기는 하한이 64k 입니다.
   스토리지 버퍼는 128M입니다. 이러한 제약에 대해서는 
   [다른 글](webgpu-limits-and-features.html)에서 설명합니다.

3. 스토리지 버퍼는 읽기/쓰기가 가능하지만 uniform 버퍼는 읽기 전용

   스토리지 버퍼에 값을 쓰는 예제를 [첫 번째 글](webgpu-fundamentals.html)의 
   컴퓨트 셰이더 예제에서 이미 살펴본 바 있습니다.

## <a id="a-instancing"></a>스토리지 버퍼를 사용한 인스턴싱

위의 첫 두 차이점을 바탕으로 우리의 예제를 한 번의 드로우콜(draw call)로 
100개 삼각형을 모두 그리는 예제로 바꾸어 봅시다.
이러한 경우 스토리지 버퍼를 사용하는 것이 *적절할 수도* 있습니다.
그럴 수도 있다고 이야기 한 이유는 WebGPU가 다른 프로그래밍 언어와 비슷하기 때문입니다.
동일한 목표를 다른 방법으로 달성할 수 있습니다.
`array.forEach` vs `for (const elem of array)` vs `for (let i = 0; i < array.length; ++i)` 모두 가능하죠.
각자는 각자의 용도가 있고, WebGPU도 마찬가지 입니다.
우리가 하는 모든 것들의 달성하는 방법은 여러가지 입니다.
삼각형을 그리는 경우에 대해선, WebGPU는 오직 정점 셰이더에서 `builtin(position)`를 반환하는 것과 
프래그먼트 셰이더에서 `location(0)`에 색상/값을 반환하는 것 뿐입니다.[^colorAttachments] 

[^colorAttachments]: 색상 어태치먼트는 여러 개일 수 있고, 이 경우 `location(1)`, `location(2)` 등등을 사용하여 색상/값을 반환해야 합니다.

먼저 할 것은 스토리지 선언을 런타임에 크기가 정해지는 배열로 바꾸는 것입니다.

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

그리고 셰이더에서는 이 값을 사용하도록 변경합니다.

```wgsl
@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
+  @builtin(instance_index) instanceIndex: u32
) -> @builtin(position) {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

+  let otherStruct = otherStructs[instanceIndex];
+  let ourStruct = ourStructs[instanceIndex];

   return vec4f(
     pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
}
```

정점 셰이더에 `instanceIndex`라는 새로운 매개변수를 추가하였고 `@builtin(instance_index)` 
어트리뷰트를 추가하였는데 이는 각 "인스턴스(instance)"가 그려질 때마다 WebGPU로부터 
값을 받는다는 뜻입니다.
`draw`를 호출할 때 두 번째 인자로 *인스턴스의 개수*를 넘겨줄 수 있고, 
각 인스턴스가 그려질 때 처리될 인스턴스의 개수가 함수로 넘어오게 됩니다.

`instanceIndex`를 사용하여 구조체의 배열로부터 특정 구조체 요소를 얻을 수 있습니다.

또한 올바를 배열 요소로부터 색상값을 얻어와 프래그먼트 셰이더에서 사용해야 합니다.
프래먼트 셰이더는 `@builtin(instance_index)`에 접근할 수 없는데 이는 말이 안되기 때문입니다.
[스테이지간 변수](webgpu-inter-stage-variables.html)로 넘겨줄 수도 있지만 정점 셰이더에서 색상값을 읽어와 전달하는 것이 더 일반적입니다.

이를 위해서 [스테이지간 변수에 관한 글](webgpu-inter-stage-variables.html)에서처럼 
새로운 구조체를 사용할 것입니다.

```wgsl
+struct VSOutput {
+  @builtin(position) position: vec4f,
+  @location(0) color: vec4f,
+}

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
-) -> @builtin(position) vec4f {
+) -> VSOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

-  return vec4f(
-    pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  var vsOut: VSOutput;
+  vsOut.position = vec4f(
+      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+  vsOut.color = ourStruct.color;
+  return vsOut;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return ourStruct.color;
+@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
+  return vsOut.color;
}

```

이제 WGSL 셰이더를 수정했으니 자바스크립트도 갱신해 봅시다.

아래와 같습니다.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // 두 개의 스토리지 버퍼를 만듬
  const staticUnitSize =
    4 * 4 + // color는 4개의 32비트 부동소수점 (각각 4바이트)
    2 * 4 + // offset은 2개의 32비트 부동소수점 (각각 4바이트)
    2 * 4;  // padding
  const changingUnitSize =
    2 * 4;  // scale은 2개의 32비트 부동소수점 (각각 4바이트)
  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // float32 기준의 각 uniform에 대한 오프셋
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // 이 값들은 한 번만 설정하므로 여기서 설정
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // set the color
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // set the offset

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // changingStorageBuffer의 값을 갱신하기 위해 사용할 수 있는 typed array
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer},
      { binding: 1, resource: changingStorageBuffer},
    ],
  });
```

위에서 우리는 두 개의 스토리지 버퍼를 만들었습니다.
하나는 `OurStruct`를 위한 배열이고 하나는 `OtherStruct`를 위한 배열입니다.

그리고 `OurStuct`를 위한 배열에 offset과 color값들을 채우고 
그 데이터를 `staticStorageBuffer`에 업로드 하였습니다.

두 버퍼를 참조하는 하나의 바인드그룹만 생성하였습니다.

새로운 렌더링 코드는 아래와 같습니다.

```js
  function render() {
    // 캔버스 컨텍스트로부터 현재 텍스처를 얻어오고
    // 이를 렌더링을 수행할 텍스처로 설정
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // 자바스크립트의 Float32Array로 uniform 값을 설정
    const aspect = canvas.width / canvas.height;

-    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
-      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(3);  // call our vertex shader 3 times
-    }

+    // 각 물체에 대한 scale을 설정
+    objectInfos.forEach(({scale}, ndx) => {
+      const offset = ndx * (changingUnitSize / 4);
+      storageValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
+    });
+    // 모든 scale값을 한번에 업로드
+    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(3, kNumObjects);  // 각 인스턴스에 대해 정점 셰이더를 세 번 호출


    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

위 코드는 `kNumObjects`개의 인스턴스를 그립니다.
각 인스턴스마다 WebGPU는 정점 셰이더를 세 번씩 호출하는데 이 때 `vertex_index`는 0, 1, 2로, `instance_index`는 0 ~ kNumObjects-1로 설정됩니다.

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

각각의 scale, color, offset 값을 갖는 100개의 삼각형 모두를 한 번의 드로우 콜로 그릴 수 있게 되었습니다.
같은 물체에 대한 아주 많은 인스턴스를 그리고 싶은 상황에서는 이러한 방법이 하나의 옵션이 될 수 있습니다.

## 정점 데이터를 위한 스토리지 버퍼의 사용

여기까지는 셰이더에서 하드 코딩을 통해 직접 삼각형을 명시해 주었습니다.
스토리지 버퍼의 사용 예시 중 하나는 정점 데이터를 저장하는 것입니다.
위 예제에서 현재 스토리지 버퍼를 `instance_index`로 인덱싱했던 것처럼, 
다른 스토리지 버퍼를 `vertex_index`로 인덱싱하여 정점 데이터를 얻어올 수 있습니다.

한번 해 보죠!

```wgsl
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

+struct Vertex {
+  position: vec2f,
+};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
+@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
-  let pos = array(
-    vec2f( 0.0,  0.5),  // top center
-    vec2f(-0.5, -0.5),  // bottom left
-    vec2f( 0.5, -0.5)   // bottom right
-  );

  let otherStruct = otherStructs[instanceIndex];
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
-      pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
```

이제 정점 데이터를 갖는 스토리지 버퍼를 하나 더 만들어야 합니다.
먼저 정점 데이터를 생성하는 함수부터 만들어 보죠. 원을 그려봅시다.
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // subdivision하나마다 두 개의 삼각형, 삼각형 하나마다 3개의 정점이 각각 두 개의 값 (xy)를 가짐
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // subdivision하나마다 두 개의 삼각형
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // first triangle
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c2 * innerRadius, s2 * innerRadius);
  }

  return {
    vertexData,
    numVertices,
  };
}
```

위 코드를 통해 아래와 같이 삼각형들로 이루어진 원이 만들어집니다.

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

이제 이 함수를 사용해 원을 그리기 위한 정점들로 스토리지 버퍼를 채울 수 있습니다.

```js
  // setup a storage buffer with vertex data
  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);
```

그리고 바인드그룹 추가해야 합니다.

```js
  const bindGroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: staticStorageBuffer},
      { binding: 1, resource: changingStorageBuffer},
+      { binding: 2, resource: vertexStorageBuffer},
    ],
  });
```

마지막으로 렌더링 시점에 원을 구성하는 모든 정점을 그리도록 요청해야 합니다.

```js
-    pass.draw(3, kNumObjects);  // call our vertex shader 3 times for several instances
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

위에서 우리는 아래와 같은 코드를 사용하였습니다.

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

구조체를 사용하지 않고 바로 `vec2f`를 사용하여 좀 더 쉽게 구현할 수도 있습니다.

```wgsl
@group(0) @binding(2) var<storage, read> pos: vec2f;
```

하지만 구조체를 만들면 나중에 정점별(per-vertex)데이터를 추가하는 것이 훨씬 쉬워지겠죠?

스토리지 버퍼를 사용해 정점을 넘기는 방법이 인기를 얻고 있습니다.
하지만 제가 듣기로 이러한 방법은 오래된 장치에서는 *고전적인* 방법에 비해 느리다고 들었고, 
이 고전적인 방법은 다음 글인 [정점 버퍼(vertex buffers)](webgpu-vertex-buffers.html)에서 설명하도록 하겠습니다.

<!-- keep this at the bottom of the article -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
