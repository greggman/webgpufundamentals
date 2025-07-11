Title: WebGPU Uniforms
Description: 셰이더에 상수 데이터 전달하기
TOC: Uniforms

이전 글은 [스테이지간 변수](webgpu-inter-stage-variables.html)에 관한 글이었습니다.
이번 글은 uniform에 관한 글입니다.

uniform은 셰이더에서 사용하는 전역 변수같은 겁니다.
셰이더를 실행하기 전에 값을 설정하고 그 값을 셰이더의 모든 반복 과정에서 사용할 수 있습니다. 
그리고 GPU에게 다음 번 셰이더 실행 명령을 내릴 때에 다른 값으로 설정할 수 있습니다.

[첫 번째 글](webgpu-fundamentals.html)에서의 삼각형 예제 코드부터 시작해서 uniform을 사용하도록 수정합니다.

```js
  const module = device.createShaderModule({
    label: 'triangle shaders with uniforms',
    code: `
+      struct OurStruct {
+        color: vec4f,
+        scale: vec2f,
+        offset: vec2f,
+      };
+
+      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

-        return vec4f(pos[vertexIndex], 0.0, 1.0);
+        return vec4f(
+          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
-        return vec4f(1, 0, 0, 1);
+        return ourStruct.color;
      }
    `,
  });

  });
```

먼저 세 개의 멤버를 갖는 구조체를 선언합니다.

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

그리고 그 구조체 타입인 uniform 변수를 선언합니다.
변수는 `ourStruct`이고 타입은 `OurStruct`입니다.

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

다음으로 정점 셰이더의 반환값을 uniform을 사용하도록 변경합니다.

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

정점의 위치에 scale을 곱하고 offset을 더한 것을 볼 수 있습니다.
이렇게 하면 삼각형의 크기와 위치를 설정할 수 있습니다.

또한 정점 셰이더가 uniform의 color값을 반환하도록 수정합니다.

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

이제 셰이더가 uniform을 사용하도록 설정하였으니 여기에 사용할 값을 저장할 버퍼를 GPU에 만들어야 합니다.

이제부터의 내용은 여러분이 네이티브(native) 데이터와 크기를 다루어 본 적이 없다면 배울 것이 많을 것입니다.
이는 꽤 큰 주제이므로 [해당 주제에 대한 별도의 글이 있습니다](webgpu-memory-layout.html).
구조체를 메모리에 어떻게 레이아웃(layout)하는지 모르면, [이 글을 읽어보고](webgpu-memory-layout.html) 다시 돌아오세요. 여기서는 여러분이 [이 글을 읽었다고](webgpu-memory-layout.html) 가정하고 진행합니다.

[이 글](webgpu-memory-layout.html)을 읽으셨으면 이제 셰이더의 구조체와 매칭되도록 버퍼에 데이터를 채울 것입니다.

먼저 버퍼를 만들고 usage 플래그를 통해 그것이 uniform을 위해 사용될 것이고 데이터를 여기에 복사하여 갱신할 것임을 명시합니다.

```js
  const uniformBufferSize =
    4 * 4 + // color는 4개의 32비트 부동소수점 (각각 4바이트)
    2 * 4 + // scale은 2개의 32비트 부동소수점 (각각 4바이트)
    2 * 4;  // offset은 2개의 32비트 부동소수점 (각각 4바이트)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

그리고 자바스크립트에서 값을 저장할 `TypedArray`를 만듭니다.

```js
  // uniform을 위해 사용할 값을 저장할 typedarray를 자바스크립트에서 만듬
  const uniformValues = new Float32Array(uniformBufferSize / 4);
```

그리고 구조체에서, 나중에 바뀌지 않을 두 개의 값을 채울 것입니다.
오프셋은 [메모리 레이아웃에 관한 글](webgpu-memory-layout.html)에서 설명한 방식대로 계산합니다.

```js
  // float32 기준의 uniform 값들에 대한 오프셋
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);        // color 설정
  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // offset 설정
```

위에서 우리는 색상을 녹색으로 설정했습니다. 
오프셋은 삼각형을 왼쪽으로 캔버스의 1/4만큼, 아래쪽으로 캔버스의 1/8만큼 이동합니다 (클립 공간은 -1에서 1 사이여서 2유닛이고, 따라서 2유닛의 1/8은 0.25임).

다음으로 [첫 번째 글의 다이어그램에서](webgpu-fundamentals.html#a-draw-diagram) 셰이더에게 버퍼에 대해 알려준 것처럼, 우리는 바인드 그룹을 만들고 해당 버퍼를 셰이더에서 설정한 것과 동일한 `@binding(?)`에 바인딩해야 합니다.

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

이제 커맨드 버퍼를 제출하기 전에 `uniformValues`의 나머지 값을 채우고 그 값들을 GPU 버퍼에 복사할 것입니다.
이 작업은 `render` 함수의 가장 앞쪽에서 수행합니다.

```js
  function render() {
    // 자바스크립트의 Float32Array에 uniform 값을 설정함
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // scale 설정

    // 이 값을 자바스크립트에서 GPU로 복사함
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> 참고: `writeBuffer`는 데이터를 버퍼로 복사하는 방법 중 하나입니다.
> 다른 방법들은 [이 글](webgpu-copying-data.html)에서 설명합니다.

scale은 절반 크기로 하였고 캔버스의 종횡비(aspect ratio)를 고려하였으므로 삼각형은 캔버스의 크기가 변해도 일정한 가로세로 비율을 유지할 것입니다.

마지막으로, 그리기 전에 바인드 그룹을 설정합니다.

```js
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
    pass.draw(3);  // call our vertex shader 3 times
    pass.end();
```

이렇게 하면 명시한대로 초록색 삼각형이 그려집니다.

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

이 단일 삼각형에 대해 그리기 커맨드를 실행할 때의 상태는 아래와 같습니다.

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

지금까지, 셰이더에서 우리가 사용한 데이터들은 하드코딩 되어 있었습니다(정점 셰이더에서의 삼각형 정점 위치와 프래그먼트 셰이더에서의 색상).
이제 셰이더에 데이터를 전달할 수 있게 되었으니 다양한 데이터를 전달하여 `draw`를 호출할 수 있을 겁니다.

버퍼를 갱신하여 서로다른 offset, scale, color를 사용하여 다른 위치에 그릴 수 있습니다.
하지만 중요한 것은 우리의 커맨드는 커맨드 버퍼에 들어가고, 제출하기 전에는 실행되지 않는다는 점입니다.
따라서 아래와 같이는 **할 수 없습니다**.

```js
    // BAD!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, x], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.draw(3);
    }
    pass.end();

    // 인코딩을 끝내고 커맨드를 제출
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

왜냐하면 위에서 볼 수 있는 것처럼 `device.queue.xxx`는 "queue"에 작업을 하는 함수지만 `pass.xxx` 함수는 커맨드를 커맨드 버퍼에 인코딩할 뿐입니다.

실제로 `submit`으로 커맨드 버퍼를 제출하면 마지막으로 쓰여진 값만이 버퍼에 적용됩니다.

아래와 같이 수정할 수도 있습니다.

```js
    // BAD! Slow!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, 0], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      // 인코딩을 끝내고 커맨드를 제출
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

위의 코드는 버퍼 하나를 갱신하고 커맨드 버퍼를 하나 생성한 뒤, 
그리기 한 번을 수행하기 위해 커맨드를 추가하고 제출하여 커맨드 버퍼를 실행하고 있습니다.
이건 동작하긴 하지만 여러 이유로 인해 느립니다.
가장 큰 원인은 하나의 커맨드 버퍼에서 많은 작업을 하는 것이 더 좋다는 사실입니다.

그러니 우리는 그리기를 원하는 상태 하나당 하나의 uniform 버퍼를 만들 것입니다. 
그리고 버퍼는 바인드 그룹을 통해 간접적으로 사용되니 그리기를 원하는 것 하나마다 하나의 바인드 그룹을 만듭니다.
그리고 모든 그리기를 원하는 것을 하나의 커맨드 버퍼에 넣을 겁니다.

한 번 해 보죠.

먼저 랜덤 함수를 만듭니다.

```js
// [min and max) 사이의 무작위 값을 반환
// 하나의 인자를 넣으면 [0 to min)
// 인자가 없으면 [0 to 1)
const rand = (min, max) => {
  if (min === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
};

```

이제 여러 색상과 오프셋을 갖는 버퍼들을 설정해서 여러 물체를 그릴 수 있도록 합시다.

```js
  // float32 기준의 uniform 값들에 대한 오프셋
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

+  const kNumObjects = 100;
+  const objectInfos = [];
+
+  for (let i = 0; i < kNumObjects; ++i) {
+    const uniformBuffer = device.createBuffer({
+      label: `uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // uniform을 위해 사용할 값을 저장할 typedarray를 자바스크립트에서 만듬
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-  uniformValues.set([0, 1, 0, 1], kColorOffset);        // set the color
-  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // set the offset
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset
+
+    const bindGroup = device.createBindGroup({
+      label: `bind group for obj: ${i}`,
+      layout: pipeline.getBindGroupLayout(0),
+      entries: [
+        { binding: 0, resource: uniformBuffer},
+      ],
+    });
+
+    objectInfos.push({
+      scale: rand(0.2, 0.5),
+      uniformBuffer,
+      uniformValues,
+      bindGroup,
+    });
+  }
```

아직 버퍼에 값을 넣지 않았는데, 이는 캔버스의 종횡비를 고려하고 싶은데 렌더링을 하기 전까지는 종횡비를 알 수 없기 때문입니다.

렌더링 시점에는 모든 버퍼를 올바른 종횡비로 scale을 조정하여 갱신합니다.

```js
  function render() {
-    // Set the uniform values in our JavaScript side Float32Array
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale
-
-    // copy the values from JavaScript to the GPU
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // 캔버스 컨텍스트에서 텍스처를 얻고,
    // 이를 렌더링할 텍스처로 설정함
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // 자바스크립트의 Float32Array에 uniform 값을 설정함
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // call our vertex shader 3 times
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

여기서도 `encoder`와 `pass`객체는 커맨드를 커맨드 버퍼에 인코딩할 뿐임을 기억하세요.
따라서 `render` 함수가 끝나면 아래와 같은 *커맨드*들을 실행한 것과 같습니다.

```js
device.queue.writeBuffer(...) // uniform 버퍼 0에 물체 0 데이터 갱신
device.queue.writeBuffer(...) // uniform 버퍼 1에 물체 1 데이터 갱신
device.queue.writeBuffer(...) // uniform 버퍼 2에 물체 2 데이터 갱신
device.queue.writeBuffer(...) // uniform 버퍼 3에 물체 3 데이터 갱신
...
// 그리기를 100번 수행하는 커맨드를 실행하는데, 각각은 각자의 uniform 버퍼로 실행됨
device.queue.submit([commandBuffer]);
```

결과는 아래와 같습니다.

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

이왕 시작한 김에 한 가지 더 이야기 해보겠습니다.
셰이더에서 여러 uniform 버퍼를 참조할 수 있습니다.
우리 예제에서는 그리기를 수행할 때마다 scale을 갱신하고 `writeBuffer`를 통해 `uniformValues`를 각각 해당하는 uniform 버퍼에 갱신하였습니다.
하지만 scale만 갱신되고 color와 offset은 아니기 때문에 이 값들을 업로드하는 낭비가 발생하고 있습니다.

그리기를 수행할 때 갱신되는 uniform과 고정된 uniform을 분리할 수 있습니다.

```js
  const module = device.createShaderModule({
    code: `
      struct OurStruct {
        color: vec4f,
-        scale: vec2f,
        offset: vec2f,
      };

+      struct OtherStruct {
+        scale: vec2f,
+      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
+      @group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(
-          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
+          pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
  });
```

그러면 그리는 물체 하나당 두 개의 uniform 버퍼가 필요합니다.

```js
-  // create a buffer for the uniform values
-  const uniformBufferSize =
-    4 * 4 + // color is 4 32bit floats (4bytes each)
-    2 * 4 + // scale is 2 32bit floats (4bytes each)
-    2 * 4;  // offset is 2 32bit floats (4bytes each)
-  // offsets to the various uniform values in float32 indices
-  const kColorOffset = 0;
-  const kScaleOffset = 4;
-  const kOffsetOffset = 6;
+  // create 2 buffers for the uniform values
+  const staticUniformBufferSize =
+    4 * 4 + // color is 4 32bit floats (4bytes each)
+    2 * 4 + // offset is 2 32bit floats (4bytes each)
+    2 * 4;  // padding
+  const uniformBufferSize =
+    2 * 4;  // scale is 2 32bit floats (4bytes each)
+
+  // offsets to the various uniform values in float32 indices
+  const kColorOffset = 0;
+  const kOffsetOffset = 4;
+
+  const kScaleOffset = 0;

  const kNumObjects = 100;
  const objectInfos = [];

  for (let i = 0; i < kNumObjects; ++i) {
+    const staticUniformBuffer = device.createBuffer({
+      label: `static uniforms for obj: ${i}`,
+      size: staticUniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });
+
+    // These are only set once so set them now
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // set the color
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // set the offset

+      // copy these values to the GPU
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // create a typedarray to hold the values for the uniforms in JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
+    const uniformBuffer = device.createBuffer({
+      label: `changing uniforms for obj: ${i}`,
+      size: uniformBufferSize,
+      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
+    });

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: staticUniformBuffer},
+        { binding: 1, resource: uniformBuffer},
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }
```

렌더링 코드는 변한 것이 없습니다. 각 물체의 바인드 그룹은 각 물체에 대한 두 개의 uniform 버퍼에 대한 참조를 가지고 있습니다.
앞에서와 동일하게 scale을 업데이트하고 있지만 `device.queue.writeBuffer`를 호출해서 uniform 버퍼를 업데이트 할 때에만 scale을 업로드합니다.
이전에는 각 객체에 대해 color + offset + scale를 업로드 하였습니다.

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

이 간단한 예제에서 uniform 버퍼를 구분하는 것은 과할 수도 있지만, 언제 무엇이 변하는지에 따라 구분하는 것이 일반적입니다.
예를 들어 공유되는 행렬에 대한 uniform 버퍼가 있습니다. 
투영(project), 뷰(view)/카메라 행렬이 있을 수 있겠죠.
대부분 이 값들은 우리가 그리고자 하는 대상에 대해 동일한 값을 사용하기 때문에 하나의 버퍼를 만들어서 모든 객체가 동일한 uniform 버퍼를 사용하게 하면 됩니다.

셰이더가 참조하는 또다른 uniform 버퍼는 별도로 구분된, 각 객체에 대해 다른 값을 가지는 world/model 행렬이나 노멀(normal) 행렬이 될 것입니다.

또 다른 uniform 버퍼는 머티리얼(material) 세팅값을 가지고 있을 수 있습니다. 이러한 세팅값은 여러 객체에서 공유될 것입니다.

이러한 내용은 3D 그리기를 다룰 때 많이 활용할 것입니다.

다음은 [스토리지 버퍼(storage buffer)](webgpu-storage-buffers.html)입니다.