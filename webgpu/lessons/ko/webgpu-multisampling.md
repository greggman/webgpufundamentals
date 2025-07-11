Title: WebGPU 멀티 샘플링
Description: 멀티 샘플링 / MSAA
TOC: 멀티 샘플링 / MSAA

MSAA는 멀티샘플링 안티앨리어싱(Multi-Sampling Anti-aliasing)의 약자입니다. 안티앨리어싱이란, 벡터 형태를 개별 픽셀로 그릴 때 발생하는 계단 현상 문제를 해결하는 기술입니다.

[기본 원리 문서](webgpu-fundamentals.html)에서 설명한 대로 WebGPU는 버텍스 셰이더의 `@builtin(position)` 값으로 반환된 클립 공간의 꼭짓점들을 받아 삼각형을 계산한 뒤, 해당 삼각형 내 각 픽셀의 중심에 대해 프래그먼트 셰이더를 호출하여 색상을 결정합니다.

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels"></div>
    <div>버텍스 끌기</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-result"></div>
    <div>결과</div>
  </div>
</div>

이 삼각형은 계단 현상이 심하게 나타납니다. 해상도를 높여 볼 수도 있겠지만, 최대 해상도는 디스플레이의 한계에 불과하며, 그마저도 충분하지 않을 수 있습니다.

한 가지 해결법은 더 높은 해상도로 렌더링하는 것입니다. 예를 들어 해상도를 4배(가로 2배, 세로 2배)로 높인 뒤, "이중 선형 필터링(bilinear filtering)을 이용해 캔버스에 결과를 표시할 수 있습니다."
"이중 선형 필터링(bilinear filtering)"에 대해서는 
[텍스쳐 설명 글](webgpu-textures.html)을 참고하세요.

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x"></div>
    <div>4x 해상도</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-result"></div>
    <div>이중 선형 필터링 결과</div>
  </div>
</div>

이 해결책이 유효하긴 하지만 비효율적입니다. 왼쪽 이미지의 2x2 픽셀은 오른쪽 이미지에서 1픽셀로 변환되는데, 많은 경우 이 4개의 픽셀이 모두 삼각형 안에 있어서 안티 앨리어싱이 필요 없습니다. 4개의 픽셀 모두 빨간색이기 때문입니다.

<div class="webgpu_center side-by-side flex-gap">
  <div class="multisample-example">
    <div data-diagram="clip-space-to-texels-4x-waste"></div>
    <div>4개중 3개의<span style="color: cyan;">청록색</span>픽셀들이 낭비됩니다.</div>
  </div>
</div>

1픽셀만 그리면 될 것을 4개의 빨간색 픽셀을 그리는 건 비효율적입니다. GPU는 프래그먼트 셰이더(fragment shader)를 4번 호출했습니다. 프래그먼트 셰이더는 상당히 크고 많은 연산을 수행할 수 있으므로 가능한 한 적게 호출하는 게 좋습니다. 심지어 삼각형이 3개의 픽셀만을 지나갈 때에도 이런 문제가 발생합니다.

<div class="webgpu_center">
  <img src="resources/antialias-4x.svg" width="600">
</div>

위 예시에서는 4배 렌더링(4x rendering)을 사용할 때, 삼각형이 3개 픽셀의 중심을 덮으면 프래그먼트 셰이더가 3번 호출됩니다. 이후 결과에 이중선형 필터링(bilinear filtering)을 적용하게 됩니다.

바로 이 부분에서 멀티샘플링(multisampling)의 효율성이 더 뛰어납니다. 멀티샘플링을 사용하면 특수한 '멀티샘플 텍스처(multisample texture)'를 생성합니다. 이 멀티샘플 텍스처에 삼각형을 그릴 때, 4개의 '샘플(samples)' 중 하나라도 삼각형 내부에 있으면 GPU는 프래그먼트 셰이더를 단 한 번 호출합니다. 그 후 삼각형 내부에 위치한 샘플에만 결과를 기록하게 됩니다.

<div class="webgpu_center">
  <img src="resources/antialias-multisample-4.svg" width="600">
</div>

위의 예시에서 멀티샘플링 렌더링을 사용할 경우, 삼각형이 3개의 *샘플(samples)*을 덮더라도 프래그먼트 셰이더는 단 한 번만 호출됩니다. 그런 다음, 이 결과를 하나의 픽셀로 병합하는 *병합(resolve)* 과정을 거칩니다. 삼각형이 만약 4개의 샘플 모두를 덮는 경우에도 과정은 비슷합니다. 프래그먼트 셰이더는 한 번만 호출되며, 그 결과는 4개의 샘플 모두에 기록됩니다.

여기서 주목할 점은, 기존의 4배 렌더링 방식에서는 CPU가 픽셀 4개의 중심이 삼각형 안에 있는지 확인한 반면, 멀티샘플링(multisampled) 렌더링에서는 GPU가 격자(grid)에 정렬되지 않은 '샘플 위치(sample positions)'를 검사한다는 점입니다. 비슷하게 샘플 값(sample values) 또한 정형화된 격자를 이루지 않기 때문에, 이 값들을 하나의 픽셀로 "병합(resolving)" 하는 과정 역시 이중선형 필터링(bilinear filtering)이 아니라 GPU에 의해 처리됩니다. 이렇게 픽셀 중심에서 벗어난 비정형 샘플 위치는 대부분의 상황에서 더 나은 안티 앨리어싱 효과를 제공하게 됩니다.

## <a id="a-multisampling"></a> 멀티샘플링 사용 방법

그래서 어떻게 멀티샘플링을 할 수 있을까요? 3개 단계를 따르면 됩니다.

1. 파이프라인에서 멀티 샘플 텍스처로 렌더링하도록 설정하세요.
2. 멀티 샘플 텍스처를 최종 텍스처와 같은 크기로 만드세요.
3. 렌더 패스(render pass)를 설정할 때, 멀티샘플 텍스처로 렌더링한 후 그 결과를 최종 텍스처(canvas)에 병합(resolve)하도록 합니다.

간단히 하기 위해, [기본 개념 문서](webgpu-fundamentals.html#a-resizing) 끝부분에 있는 반응형(responsive) 삼각형 예제를 가져와서, 여기에 멀티샘플링(multisampling)을 추가해 봅시다.

### 파이프라인에서 멀티 샘플 텍스처로 렌더링하도록 설정하세요.

```js
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
+    multisample: {
+      count: 4,
+    },
  });
```

위에 `multisample` 설정을 추가하면, 이 파이프라인은 멀티샘플 텍스처로 렌더링할 수 있게 됩니다.

### 멀티 샘플 텍스처를 최종 텍스처와 같은 크기로 만드세요.

최종 텍스처는 캔버스(canvas)의 텍스처입니다. 사용자가 창 크기를 조절하는 등의 이유로 캔버스 크기가 바뀔 수 있으므로, 이 텍스처는 렌더링할 때마다 생성해주어야 합니다.


```js
  let multisampleTexture;

  function render() {
+    // Get the current texture from the canvas context
+    const canvasTexture = context.getCurrentTexture();
+
+    // If the multisample texture doesn't exist or
+    // is the wrong size then make a new one.
+    if (!multisampleTexture ||
+        multisampleTexture.width !== canvasTexture.width ||
+        multisampleTexture.height !== canvasTexture.height) {
+
+      // If we have an existing multisample texture destroy it.
+      if (multisampleTexture) {
+        multisampleTexture.destroy();
+      }
+
+      // Create a new multisample texture that matches our
+      // canvas's size
+      multisampleTexture = device.createTexture({
+        format: canvasTexture.format,
+        usage: GPUTextureUsage.RENDER_ATTACHMENT,
+        size: [canvasTexture.width, canvasTexture.height],
*        sampleCount: 4,
+      });
+    }

  ...
```

위 코드에서는 다음 두 가지 경우에 멀티샘플 텍스처를 생성합니다:
(a) 아직 멀티샘플 텍스처가 없는 경우
(b) 기존 텍스처의 크기가 캔버스와 일치하지 않는 경우

캔버스와 동일한 크기의 텍스처를 생성하되, sampleCount: 4를 추가하여 이 텍스처가 멀티샘플 텍스처가 되도록 합니다.



### 렌더 패스(render pass)를 설정할 때, 멀티샘플 텍스처로 렌더링한 후 그 결과를 최종 텍스처(canvas)에 병합(resolve)하도록 합니다.

```js
-    // 캔버스 컨텍스트에서 현재 텍스처를 가져와서
-    // 렌더링할 텍스처로 설정합니다.
-    renderPassDescriptor.colorAttachments[0].view =
-        context.getCurrentTexture();

+    // 멀티샘플 텍스처를 렌더링할 텍스처로 설정합니다
+    renderPassDescriptor.colorAttachments[0].view =
+        multisampleTexture;
+    // 캔버스 텍스처를 멀티샘플 텍스처를 "병합"할
+    // 대상 텍스처로 설정합니다.
+    renderPassDescriptor.colorAttachments[0].resolveTarget =
+        canvasTexture;
```

*병합(resolve)*이란 멀티샘플 텍스처의 데이터를 우리가 실제로 원하는 크기의 텍스처로 변환하는 과정입니다. 이 예제에서는 그 대상이 바로 캔버스입니다.

앞서 4배(4x) 렌더링 예제에서는 4배 크기의 텍스처를 생성한 후, 그것을 1배 크기의 텍스처로 이중선형 필터링(bilinear filtering)을 통해 직접접 축소(resize)했었습니다.

멀티샘플링에서도 이와 유사한 방식으로 처리되긴 하지만, 멀티샘플 텍스처는 실제로는 이중선형 필터링을 사용하지 않습니다.

자세한 내용은 아래의  [격자가 아닌 구조](#a-not-a-grid)를 참고하세요.

그리고 아래는 예제입니다:

{{{example url="../webgpu-multisample-simple.html"}}}

저해상도에서 두 이미지를 나란히 비교해 보면 겉보기에 큰 차이가 없어 보이지만
왼쪽은 멀티샘플링이 적용되지 않은 원본이고, 오른쪽은 멀티샘플링이 적용된 버전입니다.

오른쪽의 경우, 계단 현상이 줄어들어 안티 앨리어싱(Anti-Aliasing) 처리가 된 것을 확인할 수 있습니다.

<div class="webgpu_center side-by-side flex-gap" style="max-width: 850px">
  <div class="multisample-example">
    <div data-diagram="simple-triangle"></div>
    <div>원본</div>
  </div>
  <div class="multisample-example">
    <div data-diagram="simple-triangle-multisample"></div>
    <div>멀티샘플링이 적용된 버전</div>
  </div>
</div>

다음을 기억하세요.

## `count`는 반드시 `4`여야 합니다.

WebGPU 버전 1에서는 렌더 파이프라인의 `multisample: { count }` 설정 값으로 1 또는 4만 사용할 수 있습니다.
마찬가지로 텍스처를 생성할 때 설정하는 `sampleCount` 역시 1 또는 4만 허용됩니다.

1은 기본값이며, 텍스처가 멀티샘플링되지 않은(non-multisampled) 상태임을 의미합니다.
4를 설정하면 4x 멀티샘플링이 적용되어 안티 앨리어싱 품질이 향상됩니다.

## <a id="a-not-a-grid"></a> 멀티샘플링은 격자(grid)를 사용하지 않습니다

앞서 언급했듯이, 멀티샘플링은 일반적인 격자(grid) 형태로 이루어지지 않습니다.
sampleCount = 4일 때, 샘플 위치는 다음과 같은 방식으로 배치됩니다:

<div class="webgpu_center">
  <img src="resources/multisample-4x.svg" width="256">
  <div class="center">count: 4</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-2x.svg" width="256">
  <div class="center">count: 2</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-8x.svg" width="256">
  <div class="center">count: 8</div>
</div>

<div class="webgpu_center">
  <img src="resources/multisample-16x.svg" width="256">
  <div class="center">count: 16</div>
</div>

**WebGPU 는 현재 count 4만 지원합니다.**

## 모든 렌더 패스에서 `resolveTarget`을 설정할 필요는 없습니다.

`colorAttachment[0].resolveTarget`을 설정하면 WebGPU에게 다음과 같이 지시하는 것입니다. "이 렌더 패스의 모든 그리기가 완료되면, 멀티샘플 텍스처를 `resolveTarget`에 설정된 텍스처로 다운스케일하라" 여러 개의 렌더 패스가 있는 경우, 마지막 패스까지 resolve하지 않는 것이 좋습니다. 마지막 패스에서 resolve하는 것이 가장 빠르지만, resolve만을 위한 빈 마지막 렌더 패스를 만드는 것도 완전히 허용됩니다.
단, 첫 번째 패스를 제외한 모든 패스에서 `loadOp`를 `'clear'`가 아닌 `'load'`로 설정해야 합니다. 그렇지 않으면 텍스처가 지워질 것입니다.

## 선택적으로 각 샘플 포인트에서 프래그먼트 셰이더를 실행할 수 있습니다.

앞서 우리는 프래그먼트 셰이더가 멀티샘플 텍스처의 4개 샘플마다 한 번만 실행된다고 설명했습니다. 셰이더는 한 번 실행되고 그 결과를 실제로 삼각형 내부에 있는 샘플들에 저장합니다. 이것이 4배 해상도로 렌더링하는 것보다 더 빠른 이유입니다.

[WebGPU에서 인터스테이지 변수에 관한 글](webgpu-inter-stage-variables.html#a-interpolate)에서 우리는 `@interpolate(...)` 속성을 사용하여 인터스테이지 변수의 보간 방법을 지정할 수 있다고 언급했습니다. 여러 옵션 중 하나인 `sample`을 사용하면 프래그먼트 셰이더가 각 샘플마다 한 번씩 실행됩니다.
WebGPU에는 몇 가지 유용한 내장 변수들이 있습니다. `@builtin(sample_index)`는 현재 작업 중인 샘플이 어떤 것인지 알려주며, `@builtin(sample_mask)`는 입력으로 사용될 때 삼각형 내부에 있는 어떤 샘플들이 있는지 알려주고, 출력으로 사용될 때는 샘플 포인트가 업데이트되는 것을 방지할 수 있게 해줍니다.

## `center` 대 `centroid`

3가지 *샘플링* 보간 모드가 있습니다. 위에서 우리는 각 샘플마다 프래그먼트 셰이더가 한 번씩 호출되는 `'sample'` 모드에 대해 언급했습니다. 다른 두 가지 모드는 기본값인 `'center'`와 `'centroid'`입니다.

* `'center'` 는 픽셀의 중심을 기준으로 값을 보간합니다.

<div class="webgpu_center">
  <img src="resources/multisample-centroid-issue.svg" width="400">
</div>

위에서 우리는 샘플 포인트 `s1`과 `s3`가 삼각형 내부에 있는 단일 픽셀/텍셀을 볼 수 있습니다. 프래그먼트 셰이더는 한 번 호출되며, 픽셀의 중심(`c`)을 기준으로 보간된 값을 가진 단계 간 변수들을 전달받게 됩니다. 문제는 **`c`가 삼각형 외부에 있다는 것입니다.**

이것이 중요하지 않을 수도 있지만, 값이 삼각형 내부에 있다고 가정하는 수학 계산이 있을 수 있습니다. 좋은 예를 들기는 어렵지만, 각 점에 무게중심 좌표(barycentric coordinates)를 추가한다고 상상해 보세요. 무게중심 좌표는 기본적으로 0에서 1 사이의 값을 가지는 3개의 좌표로, 각 값은 특정 위치가 삼각형의 세 꼭짓점 중 하나로부터 얼마나 떨어져 있는지를 나타냅니다. 이를 위해, 우리는 다음과 같이 무게중심 점들을 추가합니다.

```wgsl
+struct VOut {
+  @builtin(position) position: vec4f,
+  @location(0) baryCoord: vec3f,
+};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
-) -> @builtin(position) vec4f {
+) -> VOut {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );
+  let bary = array(
+    vec3f(1, 0, 0),
+    vec3f(0, 1, 0),
+    vec3f(0, 0, 1),
+  );
-    return vec4f(pos[vertexIndex], 0.0, 1.0);
+  var vout: VOut;
+  vout.position = vec4f(pos[vertexIndex], 0.0, 1.0);
+  vout.baryCoord = bary[vertexIndex];
+  return vout;
}

-@fragment fn fs() -> @location(0) vec4f {
-  return vec4f(1, 0, 0, 1);
+@fragment fn fs(vin: VOut) -> @location(0) vec4f {
+  let allAbove0 = all(vin.baryCoord >= vec3f(0));
+  let allBelow1 = all(vin.baryCoord <= vec3f(1));
+  let inside = allAbove0 && allBelow1;
+  let red = vec4f(1, 0, 0, 1);
+  let yellow = vec4f(1, 1, 0, 1);
+  return select(yellow, red, inside);
}
```

위 내용에서는 첫 번째 점에 `1, 0, 0`, 두 번째 점에 `0, 1, 0`, 세 번째 점에 `0, 0, 1`을 연결하고 있습니다. 이들 사이를 보간할 때, 어떤 값도 0보다 작거나 1보다 크면 안 됩니다.

프래그먼트 셰이더에서는 보간된 세 값(x, y, z)이 모두 `>= 0`인지 `all(vin.baryCoord >= vec3f(0))`로 확인합니다. 또한 모두 `<= 1`인지 `all(vin.baryCoord <= vec3f(1))`로 확인합니다. 그리고 이 두 조건을 `&`로 결합합니다. 이는 우리가 삼각형 내부에 있는지 외부에 있는지 알려줍니다. 결과적으로 내부에 있으면 빨간색을, 내부가 아니면 노란색을 선택합니다. 정점들 *사이*를 보간하고 있으므로 항상 내부에 있을 것으로 예상합니다.

이 결과를 더 쉽게 확인하기 위해 예제의 해상도를 낮춰 보겠습니다.

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
-      const width = entry.contentBoxSize[0].inlineSize;
-      const height = entry.contentBoxSize[0].blockSize;
+      const width = entry.contentBoxSize[0].inlineSize / 16 | 0;
+      const height = entry.contentBoxSize[0].blockSize / 16 | 0;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // re-render
      render();
    }
  });
  observer.observe(canvas);
```

and some CSS

```js
canvas {
+  image-rendering: pixelated;
+  image-rendering: crisp-edges;
  display: block;  /* canvas block 설정   */
  width: 100%;     /* 캔버스가 화면에 꽉차게 설정 */
  height: 100%;
}
```

결과는 다음과 같습니다.

{{{example url="../webgpu-multisample-center-issue.html"}}}

우리가 볼 수 있듯이, 일부 가장자리 픽셀에는 노란색이 나타납니다. 이는 앞서 언급했듯이, 프래그먼트 셰이더에 전달되는 보간된 단계 간 변수 값들이 픽셀의 중심을 기준으로 하기 때문입니다. 노란색이 보이는 경우에는 그 중심이 삼각형 외부에 있는 것입니다.

보간 샘플 모드를 `'centroid'`로 변경하면 이 문제를 해결할 수 있습니다. `'centroid'` 모드에서는 GPU가 픽셀 내부에 있는 삼각형 영역의 중심점을 사용합니다.

<div class="webgpu_center">
  <img src="resources/multisample-centroid-fix.svg" width="400">
</div>


만약 우리의 샘플에서 보간 모드를 `'centroid'`로 변경하면, 

```wgsl
struct VOut {
  @builtin(position) position: vec4f,
-  @location(0) baryCoord: vec3f,
+  @location(0) @interpolate(perspective, centroid) baryCoord: vec3f,
};
```

이제 GPU는 중심점(centroid)을 기준으로 보간된 단계 간 변수 값을 전달하므로 노란색 픽셀 문제가 해결됩니다.

{{{example url="../webgpu-multisample-centroid.html"}}}

> 참고: GPU가 실제로 픽셀 내 삼각형 영역의 중심점을 계산하는지는 확실하지 않습니다. 보장되는 것은 인터스테이지 변수들이 픽셀과 교차하는 삼각형 영역 내의 어떤 위치를 기준으로 보간된다는 점뿐입니다.

## 삼각형 내부의 안티앨리어싱은 어떻게 될까요?

멀티샘플링은 일반적으로 삼각형의 가장자리에만 효과가 있습니다. 프래그먼트 셰이더를 한 번만 호출하기 때문에, 모든 샘플 위치가 삼각형 내부에 있을 때는 프래그먼트 셰이더의 결과가 모든 샘플에 동일하게 적용됩니다. 이는 멀티샘플링을 사용하지 않은 경우와 결과가 다르지 않다는 것을 의미합니다.

위의 예제에서는 단색 빨간색을 그렸기 때문에 문제가 없어 보입니다. 하지만 텍스처를 사용하는 경우, 삼각형 내부에 대비가 강한 색상들이 서로 인접해 있을 수 있습니다. 이런 경우 각 샘플의 색상이 텍스처의 서로 다른 위치에서 가져와야 하지 않을까요?

삼각형 내부에서는 [밉맵과 필터링](webgpu-textures.html)을 사용하여 적절한 색상을 선택하므로, 삼각형 내부의 안티앨리어싱은 상대적으로 덜 중요할 수 있습니다. 그러나 특정 렌더링 기법에서는 이것이 문제가 될 수 있습니다. 이러한 이유로 안티앨리어싱에 대한 다른 해결책들이 존재하며, 샘플별 처리를 원한다면 `@interpolate(..., sample)`을 사용할 수 있습니다.

## 멀티샘플링은 안티 앨리어싱만을 위한 유일한 해결책이 아닙니다.

이 페이지에서는 2가지 해결책을 언급했었습니다.
(1) 더 높은 해상도의 텍스처에 먼저 렌더링한 다음, 그 텍스처를 더 낮은 해상도로 다시 그리는 방식
(2) 멀티샘플링 이용하기

다른 방법들도 있습니다. [그중에 몇가지를 소개합니다.](https://vr.arvilab.com/blog/anti-aliasing).

다른 참고자료:

* [MSAA 개요](https://therealmjp.github.io/posts/msaa-overview/)
* [멀티샘플링 입문](https://www.rastergrid.com/blog/gpu-tech/2021/10/multisampling-primer/)

<!-- keep this at the bottom of the article -->
<link href="webgpu-multisampling.css" rel="stylesheet">
<script type="module" src="webgpu-multisampling.js"></script>
