Title: WebGPU 기초
Description: WebGPU의 기초
TOC: 기초

이 글은 여러분에게 WebGPU의 기초를 가르쳐 드리는 글입니다.

<div class="warn">
여러분이 이 글을 읽기 전에 자바스크립트를 알고 계셔야 합니다.
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map">배열 매핑(mapping arrays)</a>,
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment">구조 분해 할당(destructuring assignment)</a>,
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax">spreading values</a>,
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function">async/await</a>,
<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules">es6 modules</a>과 같은 것들이 많이 사용될 것입니다.
</div>

<div class="warn">WebGL을 알고 계시다면, <a href="webgpu-from-webgl.html">이 글을 읽어보세요</a>.</div>

WebGPU는 여러분에게 두 가지 기본적인 것을 할 수 있게 해주는 API입니다.

1. [삼각형/점/선들을 텍스처에 그리기](#a-drawing-triangles-to-textures)

2. [GPU를 사용해 계산하기](#a-run-computations-on-the-gpu)

이게 다입니다!

이외에 WebGPU와 관련된 것은 여러분들이 하기 나름입니다. 이는 자바스크립트, 러스트, 
C++과 같은 프로그래밍 언어를 배우는 것과 비슷합니다. 기본적인 내용을 배우고 나서, 
이를 창의적으로 활용해서 문제 해결을 하는 것이죠.

WebGPU는 아주 저수준(low-level)의 API입니다. 작은 예제를 만들 수 있지만, 
대부분의 앱(app)을 위해서는 많은 양의 코드와 데이터 구조화 문제를 해결해야 합니다. 
예를 들어 [three.js](https://threejs.org)는 ~600K개의 작은 자바스크립트들로 
이루어져 있고 이것도 기본 라이브러리만 그렇습니다. 데이터 로더(loader), 컨트롤, 
후처리 및 다른 기능들은 포함하지 않은 상태에서요. 
유사하게, [WebGPU 백엔드(backend)의 텐서플로](https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu)는 ~500K개의 자바스크립트로 되어 있습니다.

제가 하고자 하는 말은, 단지 화면에 무언가를 그리고 싶은 거라면 여러분이 직접 만들
어야 하는 것들을 제공해주는 라이브러리를 사용하는 것이 훨씬 낫다는 겁니다.

한편, 특수한 사용 용도가 있다거나, 기존 라이브러리를 수정하고 싶다거나,
아니면 그냥 어떻게 동작하는건지 궁금해 하실 수도 있습니다.
그런 경우에는 계속 읽어 나가시면 됩니다!

# 시작하기

어디서부터 시작해야 할지 모르겠네요. 어느 정도 수준에서는 WebGPU는 아주 간단합니다.
하는 일이라고는 GPU에서 세 가지 종류의 함수를 실행하는 것이지요.
정점 셰이더(Vertex Shader), 프래그먼트 셰이더(Fragment Shader), 컴퓨트 셰이더(Compute Shader) 말입니다.

정점 셰이더는 정점을 계산합니다. 결과로 정점의 위치를 반환해 줍니다.
3개 정점으로 이루어진 그룹마다 그 3개의 위치를 기반으로 한 삼각형이 그려집니다. [^primitives]

[^primitives]: 사실은 다섯 가지 모드가 있습니다.

    * `'point-list'`: 각 위치마다 점을 그림
    * `'line-list'`: 2개 위치마다 직선을 그림
    * `'line-strip'`: 새로운 위치와 이전 위치를 이어 직선을 그림
    * `'triangle-list'`: 3개 위치마다 삼각형을 그림 (**기본값(default)**)
    * `'triangle-strip'`: 새로운 위치와 이전 마지막 2개 위치로 삼각형을 그림

프래그먼트 셰이더는 색상값을 계산합니다[^fragment-output]. 
삼각형이 그려지면, 그려질 각 픽셀마다 GPU는 프래그먼트 셰이더를 호출(call)합니다.
그리고 프래그먼트 셰이더는 색상을 반환합니다.

[^fragment-output]: 프래그먼트 셰이더는 텍스처(texture)에 데이터를 씁니다.
그 데이터가 꼭 색상인 것은 아닙니다. 예를 들어 해당 픽셀이 표현하는 표면(surface)의 방향을 출력하는 경우도 흔합니다.

컴퓨트 셰이더는 보다 일반적입니다. 이는 말하자면 "이 함수를 N번 실행해"라고 하는 것과 비슷합니다.
GPU는 여러분이 제공한 함수를 실행할 때마다 반복 회수를 넘겨주어서 여러분은 그 값을 가지고 각 반복마다 다른 작업을 하도록 할 수 있습니다.

배경 지식이 있으신 분이면 이러한 함수는 [`array.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)나,
[`array.map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)과 비슷하다고 생각하셔도 됩니다.
여러분이 GPU에서 실행하는 함수는 자바스크립트에서의 함수와 같은, 그냥 함수입니다.
다른 점은 이들을 GPU에서 실행한다는 것이고, 그래서 실행하려면 모든 접근해야 할 데이터를 버퍼(buffer)나 텍스처를 사용해 GPU에 넘겨주어야 하고, 함수의 결과도 이러한 버퍼나 텍스처로만 출력됩니다.
함수에 필요한 데이터의 바인딩(binding)이나 위치도 함수에서 알려주어야 합니다. 자바스크립트에서는 데이터가 있는 버퍼와 텍스처를 바인딩하고, 그 바인딩이나 위치에 알려주어야 합니다. 
이렇게 하고 나면 GPU에게 함수를 실행하도록 할 수 있습니다.

<a id="a-draw-diagram"></a>그림이 도움이 될 것 같네요. 아래는 WebGPU에서 정점 셰이더와 프래그먼트 셰이더를 사용해 삼각형을 그리기 위한 설정을 *간단한* 다이어그램으로 표현한 것입니다.

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram.svg" style="width: 960px;"></div>

이 다이어그램에서 아셔야 할 것은

* **파이프라인(pipeline)**이란 것이 있습니다. 여기에 GPU가 실행할 정점 셰이더와 프래그먼트 셰이더가 포함되어 있습니다. 컴퓨트 셰이더가 포함된 파이프라인도 만들 수 있습니다.

* 셰이더는 참조하는 리소스 (버퍼, 텍스처, 샘플러(sampler))를 **바인드 그룹**을 사용해 간접적으로 참조합니다.

* 파이프라인은 내부 상태(state)를 통해 버퍼를 간접적으로 참조하는 어트리뷰트(attribute)를 정의하고 있습니다.

* 어트리뷰트는 버퍼로부터 데이터를 가져오고 정점 셰이더에 넘겨줍니다.

* 정점 셰이더는 프래그먼트 셰이더에 데이터를 넘겨줄 수 있습니다.

* 프래그먼트 셰이더는 렌더 패스(render pass) 기술자(description)을 통해 텍스처에 간접적으로 출력을 씁니다.

GPU에서 셰이더를 실행하려면 이 모든 리소스를 만들고, 상태들을 설정해야 합니다.
리소스의 생성은 상대적으로 간단합니다. 흥미로운 부분은 대부분의 WebGPU 리소스는 생성되고 나면 수정할 수 없다는 점입니다.
내용은 바꿀 수 있지만 크기, 용도, 포맷 등등은 바꿀 수 없습니다.
이것들 중 하나를 바꾸고자 하면 이전 리소스를 버리고 새 리소스를 만들어야 합니다.

몇몇 상태는 생성된 후에 커맨드 버퍼(command buffer)를 통해 실행됩니다.
커맨드 버퍼는 이름 그대로입니다. 커맨드의 버퍼죠.
여러분은 인코더(encoder)를 만들고 이 인코더는 커맨드 버퍼에 커맨드들을 인코딩합니다.
인코딩을 *종료*하면 생성된 커맨드 버퍼를 얻을 수 있습니다.
이후에 커맨드 버퍼를 *제출(submit)*하여 WebGPU가 커맨드를 실행하게 할 수 있습니다.

아래는 커맨드 버퍼를 인코딩하는 의사 코드(pseudo code)와 생성된 커맨드 버퍼를 표현한 그림입니다.

<div class="webgpu_center side-by-side"><div style="min-width: 300px; max-width: 400px; flex: 1 1;"><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
encoder = device.createCommandEncoder()
// 무언가를 그림
{
  pass = encoder.beginRenderPass(...)
  pass.setPipeline(...)
  pass.setVertexBuffer(0, …)
  pass.setVertexBuffer(1, …)
  pass.setIndexBuffer(...)
  pass.setBindGroup(0, …)
  pass.setBindGroup(1, …)
  pass.draw(...)
  pass.end()
}
// 다른 것도 그림
{
  pass = encoder.beginRenderPass(...)
  pass.setPipeline(...)
  pass.setVertexBuffer(0, …)
  pass.setBindGroup(0, …)
  pass.draw(...)
  pass.end()
}
// 무언가를 계산함
{
  pass = encoder.beginComputePass(...)
  pass.beginComputePass(...)
  pass.setBindGroup(0, …)
  pass.setPipeline(...)
  pass.dispatchWorkgroups(...)
  pass.end();
}
commandBuffer = encoder.finish();
{{/escapehtml}}</code></pre></div>
<div><img src="resources/webgpu-command-buffer.svg" style="width: 300px;"></div>
</div>

커맨드 버퍼가 생성되면 실행하기 위해 *제출*합니다.

```js
device.queue.submit([commandBuffer]);
```

위 다이어그램은 커맨드 버퍼에서 뭔가를 `draw`하는 명령의 상태를 표현합니다. 
커맨드를 싱행하면 *내부 상태*가 설정되고 *그리기(draw)* 명령은 GPU에게 정점 셰이더 (그리고 간접적으로 프래그먼트 셰이더도)를 실행하도록 합니다. `dispatchWorkgroup` 커맨드는 GPU에게 컴퓨트 셰이더를 실행하게 하고요.

이 설명을 통해 여러분이 설정해야 할 상태들의 이미지가 그려졌으면 합니다.
앞서 이야기 한 것처럼, WebGPU는 두 가지 일을 할 수 있습니다.

1. [삼각형/점/선들을 텍스처에 그리기](#a-drawing-triangles-to-textures)

2. [GPU를 사용해 계산하기](#a-run-computations-on-the-gpu)

각각의 작업에 대해 짧은 예제를 살펴볼 것입니다.
다른 글에서는 이러한 작업을 위해 데이터를 제공하는 다양한 방법을 보여드립니다.
이것들은 아주 기초적인 내용임을 명심하세요. 이러한 기초를 기반으로 알아야 합니다.
나중에는 이들을 활용해 일반적으로 GPU를 사용해 수행하는 2차원, 3차원 그래픽 등을 보여드릴 것입니다.

# <a id="a-drawing-triangles-to-textures"></a>텍스처에 삼각형 그리기

WebGPU는 [텍스처](webgpu-textures.html)에 삼각형을 그릴 수 있습니다. 이 글의 목적을 생각해서, 텍스처를 2차원 사각형이라고 가정하겠습니다.[^textures]
`<canvas>` 엘리먼트(element)는 웹페이지 내의 텍스처를 의미합니다.
WebGPU에서 우리는 캔버스(canvas)의 텍스처를 요청하고 거기에 렌더링(render)을 할 수 있습니다.

[^textures]: 텍스처는 픽셀로 이루어진 3차원 사각형이나, 큐브맵(cubemap, 육면체를 이루는 6개 정사각형의 픽셀들) 등등일 수 있지만 가장 흔히 사용되는 것은 픽셀로 이루어진 2차원 사각형입니다.

WebGPU를 사용해 삼각형을 그리려면 두 개의 "셰이더"를 제공해야 합니다.
다시 말하지만 셰이더는 GPU에서 실행되는 함수입니다. 두 종류의 셰이더는,

1. 정점 셰이더

   정점 셰이더는 삼각형/직선/점을 그리기 위한 정점의 위치를 계산함
   
2. 프래그먼트 셰이더

   프래그먼트 셰이더는 삼각형/직선/점을 그릴 때, 그려질/래스터화(rasterize)될 각 픽셀의 색상 (또는 다른 데이터)을 계산함
   
삼각형을 그리는 아주 작은 WebGPU 프로그램을 만들어 봅시다.

삼각형을 표현하기 위한 캔버스가 필요하고,

```html
<canvas></canvas>
```

자바스크립트를 위한 `<script>` 태그가 필요합니다.

```html
<canvas></canvas>
+<script type="module">

... javascript goes here ...

+</script>
```

아래 모든 자바스크립트 코드는 이 script 태그 사이에 들어갑니다.

WebGPU는 비동기(asynchronous) API라서 async 함수 안에서 사용하는 것이 편리합니다.
먼저 어댑터(adapter)부터 요청하고, 어댑터로부터 디바이스(device)를 요청합니다.

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
}
main();
```

위 코드는 보시는 그대로입니다. 먼저 [`?.` optional chaining operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)으로 어댑터를 요청했으므로 `navigator.gpu`가 없다면 `adapter`는 정의되지 않을 것입니다.
존재한다면 `requestAdapter`를 호출합니다. 결과가 비동기적으로 반환되므로 `await`가 필요합니다.
어댑터는 특정 GPU를 의미합니다. 어떤 디바이스는 여러 GPU가 있을 수 있습니다.

어댑터로부터 디바이스를 요청하는데 역시 `?.`을 사용했으므로 어댑터가 정의되지 않은 경우 디바이스도 정의되지 않을 겁니다.

`device`가 설정되지 않았으면 사용자가 낡은 브라우저(browser)를 사용하고 있을 가능성이 높습니다.

다음으로 캔버스로부터 `webgpu` 컨텍스트(context)를 찾습니다.
이를 통해 렌더링을 수행할 텍스처를 얻을 수 있습니다.
그 텍스처가 웹페이지에 캔버스를 표시하는 데 사용됩니다.

```js
  // 캔버스로부터 WebGPU 컨텍스트를 얻고 설정함
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });
```

역시 보시는 그대로입니다. `"webgpu"` 컨텍스트를 캔버스로부터 얻었습니다.
시스템에 선호하는 캔버스 포맷이 무엇인지 물어보았고 이는 `"rgba8unorm"` 또는 `"bgra8unorm"`입니다.
무엇인지는 중요하지 않지만 이러한 것을 질의(query)함으로써 사용자의 시스템에서 작업이 보다 빠르게 이루어지게 할 수 있습니다.

우리는 `configure`를 호출하여 이를 `format`으로 webgpu 캔버스 컨텍스트로 넘겼습니다.
또한 `device`도 넘겨 주었는데 이는 이 캔버스와 방금 생성한 장치를 연결시켜 줍니다.

다음으로 셰이더 모듈을 만듭니다. 셰이더 모듈은 하나 이상의 셰이더 함수를 포함합니다.
우리의 경우 하나의 정점 셰이더와 하나의 프래그먼트 셰이더 함수를 만들 겁니다.

```js
  const module = device.createShaderModule({
    label: 'our hardcoded red triangle shaders',
    code: `
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(pos[vertexIndex], 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }
    `,
  });
```

셰이더는 [WebGPU Shading Language (WGSL)](https://gpuweb.github.io/gpuweb/wgsl/) 언어로 작성되었는데, 이는 wig-sil로 발음합니다.
WGSL은 강 타입 언어(strongly typed language)로 [다른 글](webgpu-wgsl.html)에서 보다 자세히 알아볼 것입니다.
지금은 기본적인 이해를 위한 최소한의 설명만 하겠습니다.

위에 `vs`로 정의된 함수가 `@vertex` 어트리뷰트를 가지고 있습니다.
이를 통해 해당 함수가 정점 셰이더 함수임을 알려줍니다.

```wgsl
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
         ...
```

이 함수는 `vertexIndex`라고 이름지은 매개변수 하나를 받습니다. `vertexIndex`는 `u32`인데 이는 *32비트 부호 없는(unsigned) 정수*입니다. 그 값은 내장(builtin)된 `vertex_index`로부터 받습니다. `vertex_index`는 자바스크립트의 `Array.map(function(value, index) { ... })`에서와 같은 반복 회수라고 생각하십시오. 
GPU에 `draw`를 통해 이 함수를 10번 실행하라고 하면 첫 `vertex_index`는 `0`이고, 구 번째는 `1`, 세 번째는 `2`가 될겁니다.[^indices]

[^indices]: `vertex_index`를 명시하기 위해 인덱스(index) 버퍼를 사용할 수도 있습니다. 이 내용은 [정점 버퍼에 관한 글](webgpu-vertex-buffers.html#a-index-buffers)에서 다룰 것입니다.

`vs`함수는 `vec4f`를 반환하도록 선언되었고 이는 32비트 부동소수점(floating point) 네 개로 이루어진 벡터입니다. 
4개 값으로 이루어진 배열이나 `{x: 0, y: 0, z: 0, w: 0}`와 같은 네 개의 속성을 갖는 객체라고 생각하시면 됩니다. 
반환된 값은 `position` 내장 변수에 대입됩니다.
"triangle-list" 모드에서는 정점 셰이더가 세 번 실행되면 세 개의 `position`으로 정의된 삼각형이 하나 그려집니다.

WebGPU의 position은 *클립 공간(clip space)*로 반환되어야 합니다. 이는 X값이 왼쪽 -1.0에서 오른쪽 +1.0, Y값이 아래쪽 -1.0에서 위쪽 +1.0인 공간입니다. 
이는 우리가 그리려고 하는 텍스처의 크기와는 무관합니다.

<div class="webgpu_center"><img src="resources/clipspace.svg" style="width: 500px"></div>

`vs` 함수는 세 개의 `vec2f`로 이루어진 배열을 정의합니다. 각 `vec2f`는 두 개의 32비트 부동소수점으로 정의됩니다.

```wgsl
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
```

마지막으로 `vertexIndex`를 사용해서 배열로부터 이 세 개의 값 중 하나를 반환합니다.
함수는 값을 반환하기 위해 네 개의 부동소수점 값이 필요한데 `pos`는 `vec2f` 배열이므로 코드에서는 `0.0`과 `1.0`을 나머지 두 값으로 설정합니다.

```wgsl
        return vec4f(pos[vertexIndex], 0.0, 1.0);
```

셰이더 모듈은 또한 `fs`라 불리는 함수를 선언하고 `@fragment` 어트리뷰트가 있으므로 프래그먼트 셰이더 함수입니다.

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
```

이 함수는 매개변수를 받지 않고 `vec4f`를 `location(0)`에 반환합니다.
이는 이 함수가 첫 렌더 타겟(render target)에 값을 쓴다는 것을 의미합니다.
나중에 첫 렌더 타겟을 우리의 캔버스 텍스처로 설정할 것입니다.

```wgsl
        return vec4f(1, 0, 0, 1);
```

코드는 `1, 0, 0, 1`를 반환하고, 이는 빨간색입니다.
WebGPU에서 색상은 대개 `0.0`과 `1.0`사이의 부동소수점으로 명시합니다.
위 4개의 값은 각각 빨간색, 초록색, 파란색, 알파(alpha)를 의미합니다.

GPU가 삼각형을 래스터화(rasterize)할 때(즉, 픽셀로 그릴 때), 프래그먼트를 호출하여 어떤 색깔로 각 픽셀을 칠할지 알아봅니다.
우리의 경우 그냥 빨간색을 반환해 주고 있습니다.

주목해야 할 한가지는 `label`입니다. WebGPU에서 생성할 수 있는 거의 모든 객체는 `label`을 받습니다. 레이블(label)은 선택적인 값이지만, 만드는 모든 것에 레이블을 붙이는 것이 *좋은 방식입니다*. 오류가 발생하면 대부분의 WebGPU 구현은 오류 메시지를 출력하는데 해당 오류와 관계된 레이블을 포함하여 출력해 주기 때문입니다.

보통의 앱에서 여러분은 100~1000 개의 버퍼, 텍스처, 셰이더 모듈, 파이프라인 등을 갖게 됩니다. 
`"WGSL syntax error in shaderModule at line 10"`과 같은 오류가 발생했는데 셰이더 모듈이 100개라면 어떤 것이 오류가 난 것일까요?
레이블을 달아 두었으면 `"WGSL syntax error in shaderModule('our hardcoded red triangle shaders') at line 10`와 같은 오류 메시지가 보일 것이고, 이것이 훨씬 유용한 오류 메시지일 것입니다. 
또한 이렇게 하면 문제를 해결하는 데 아주 많은 시간을 아낄 수 있습니다.

이제 셰이더 모듈을 만들었으니, 다음으로 렌더 파이프라인(render pipeline)을 만들어야 합니다.

```js
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
    },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: presentationFormat }],
    },
  });
```

여기는 주목해야 할 것들이 많지는 않습니다. `layout`을 `'auto'`로 설정하여 WebGPU 스스로 셰이더로부터 데이터의 레이아웃을 유추하도록 했습니다. 아직 아무 데이터도 사용하고 있지 않긴 하지만요.

그리고 렌더 파이프라인에게 셰이더 모듈의 `vs` 함수를 정점 셰이더로, `fs` 함수를 프래그먼트 셰이더로 사용하도록 했습니다. 
추가적으로 첫 렌더 타겟(target)의 포맷을 알려 주었습니다. 
"렌더 타겟"이란 우리가 그리기를 수행할 텍스처를 의미합니다.
파이프라인을 만들기 위해서는 우리가 최종적으로 파이프라인을 통해 렌더링을 수행하고자 하는 텍스처의 포맷을 명시해 주어야만 합니다.

`targets` 배열의 0번 요소(element)는 프래그먼트 셰이더의 반환값으로 설정한 0번 로케이션(location)에 대응됩니다. 나중에 우리는 이 타겟이 캔버스의 텍스처가 되도록 설정할 것입니다.

다음으로 어떤 텍스처에 그리기를 할 것인지와, 그것들을 어떻게 사용할 것인지를 기술하는 `GPURenderPassDescriptor`를 준비합니다.

```js
  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- 렌더링을 수행할 때 채워질 예정입니다.
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  
```

`GPURenderPassDescriptor`는 렌더링을 수행할 텍스처들과, 그것들을 어떻게 사용할 것인지를 명시한 `colorAttachments` 배열을 갖습니다.
렌더링을 수행할 텍스처를 명시하는 것은 조금 나중에 하고, 지금은 지우기 색상을 어두운 회색으로 하고 `loadOp` 와 `storeOp`만 설정합니다.
`loadOp: 'clear'`는 그리기 전에 지우기 색상으로 텍스처를 지운다는 것을 명시합니다.
다른 옵션으로는 텍스처에 존재하는 내용(contents)을 GPU로 로드하여 이미 그려진 것에 덮어 그릴 수 있는 `'load'` 옵션이 있습니다. 
`storeOp: 'store'`는 그린 결과를 저장하겠다는 뜻입니다. 
`'discard'` 옵션을 사용하면 그려진 것을 버릴 수 있습니다. 
왜 이러한 옵션도 필요한지는 [다른 글](webgpu-multisampling.html)에서 이야기 할 것입니다.

이제 렌더링을 수행할 때입니다.

```js
  function render() {
    // 캔버스 컨텍스트로부터 현재 텍스처를 가져오고
    // 이를 렌더링 할 텍스처로 설정합니다.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    // 커맨드 인코더가 커맨드를 인코딩을 시작합니다.
    const encoder = device.createCommandEncoder({ label: 'our encoder' });

    // 렌더 패스 인코더가 렌더링 관련한 커맨드를 인코딩하도록 합니다.
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);  // 정점 셰이더를 3번 호출합니다.
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  render();
```

먼저 `context.getCurrentTexture()`를 호출하여 캔버스에 보여질 텍스처를 가져옵니다.
`createView`를 호출하면 텍스처의 특정 부분에 대한 뷰(view)를 얻어올 수 있는데, 아무 매개변수도 넣지 않으면 기본 부분을 반환합니다.
지금 우리가 가진 유일한 `colorAttachment`는 캔버스의 텍스처 뷰이고, 초기에 컨텍스트를 통해 이미 만들어 놓았습니다.
여기서도 `colorAttachments` 배열의 0번 요소는 프래그먼트 셰이더에서 `@location(0)`를 통해 명시한 반환값과 대응됩니다.

다음으로 커맨드 인코더를 만듭니다. 커맨드 인코더는 커맨드 버퍼를 생성하기 위해 사용됩니다.
이를 사용해 커맨드를 인코딩하고 만들어진 커맨드 버퍼를 "submit"하여 커맨드가 실행되도록 할 것입니다.

그리고 `beginRenderPass`를 호출하여 커맨드 인코더로 렌더 패스 인코더를 만듭니다.
렌더 패스 인코더는 렌더링과 관련된 커맨드를 만드는 특수한 인코더입니다.
여기에 `renderPassDescriptor`를 넘겨서 우리가 렌더링을 수행할 텍스처가 무엇인지 알려줍니다.

`setPipeline` 커맨드를 인코딩하여 파이프라인을 설정하고 `draw`에 3을 넘겨 호출함으로써 정점 셰이더를 3번 호출하라고 알려줍니다.
기본적으로 정점 셰이더가 세 번 호출되면 정점 셰이더에서 반환된 세 개 값을 잇는 삼각형이 그려집니다.

렌더 패스를 끝내고 인코딩을 종료합니다.
이렇게 하면 방금 명시한 단계들을 표현하는 커맨드 버퍼가 만들어집니다.
마지막으로 커맨드 버퍼를 제출(submit)하여 실행되도록 합니다.

`draw` 커맨드가 실행되면, 아래와 같은 상태가 됩니다.

<div class="webgpu_center"><img src="resources/webgpu-simple-triangle-diagram.svg" style="width: 723px;"></div>

텍스처도 없고, 버퍼도 없고, 바인드그룹(bindGroup)도 없는 대신, 파이프라인, 정점과 프래그먼트 셰이더, 그리고 렌더 패스 기술자가 있습니다. 
이들을 통해 우리 셰이더가 캔버스 텍스처에 렌더링을 수행하도록 알려주는 것입니다.

결과는 아래와 같습니다.

{{{example url="../webgpu-simple-triangle.html"}}}

`setPipeline`, `draw`와 같은 우리가 호출한 모든 함수는 커맨드 버퍼에 커맨드를 추가하기만 한다는 것을 명심하십시오.
실제 그러한 커맨드를 수행하는 것이 아닙니다.
커맨드는 우리가 커맨드 버퍼를 장치 큐(device queue)에 제출해야 실행됩니다.

<a id="a-rasterization"></a>
WebGPU는 정점 셰이더에서 우리가 반환하는 세 개의 정점을 받아 삼각형을 그리기 위해 래스터화(rasterize)합니다.
이러한 과정은 어떤 픽셀의 중심이 삼각형 내에 있는지를 판별하여 이루어집니다.
그리고 나서 각 픽셀에 대해 프래그먼트 셰이더를 호출하여 어떤 색상으로 채울지를 결정합니다.

우리가 그리기를 수행하는 텍스처가 15x11 픽셀 크기라고 생각해 봅시다.
그려지는 픽셀은 아래와 같을 겁니다.

<div class="webgpu_center">
  <div data-diagram="clip-space-to-texels" style="display: inline-block; max-width: 500px; width: 100%"></div>
  <div>정점을 드래그 해보세요.</div>
</div>

여기까지, 실행이 가능한 아주 간단한 WebGPU 예제를 살펴 봤습니다.
당연히 셰이더 안에 삼각형 정보를 하드 코딩하는 것은 유연성이 떨어지겠죠.
이러한 데이터를 전달할 방법이 필요하고 이러한 내용은 이어지는 글에서 보도록 하겠습니다.
위의 코드에서 중점적으로 알아두셔야 할 내용은,

* WebGPU는 셰이더를 실행할 뿐이다. 유용한 작업을 위해 코드를 작성하는 것은 여러분에게 달려있다.
* 셰이더는 셰이더 모듈에서 명시되고 파이프라인에 넘겨진다.
* WebGPU는 삼각형을 그릴 수 있다.
* WebGPU는 텍스처에 그리기를 수행한다 (우리의 경우 캔버스의 텍스처였다).
* WebGPU는 커맨드를 인코딩하고 제출하는 방식으로 동작한다.

# <a id="a-run-computations-on-the-gpu"></a>GPU로 계산을 수행하기

GPU에서 계산을 수행하는 간단한 예제를 만들어봅시다.

WebGPU 장치를 얻기 위한 코드는 동일합니다.

```js
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
```

그리고 셰이더 모듈을 만듭니다.

```js
  const module = device.createShaderModule({
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
```

먼저 `storage` 타입의 `data`라는 이름의 변수를 선언했는데, 이러한 타입은 데이터를 읽고 쓸 수 있도록 할 때 사용됩니다.

```wgsl
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;
```

해당 변수의 타입을 32비트 부동소수점의 배열인 `array<f32>`로 선언했습니다. 
이 배열을 0번 바인드그룹(`@group(0)`)의 0번 위치에 바인딩(`binding(0)`) 할 것으로 명시하였습니다.

그리고 `@compute` 어트리뷰트가 붙은 `computeSomething` 함수를 선언했는데, 이렇게 되면 이 셰이더는 컴퓨트 셰이더가 됩니다.

```wgsl
      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        ...
```

컴퓨트 셰이더는 워크그룹(workgroup) 크기를 명시해야만 하며, 이에 대한 설명은 나중에 하겠습니다.
지금은 그냥 `@workgroup_size(1)` 어트리뷰트로 1로 설정해둡니다.
매개변수로 `id` 하나만을 받도록 선언했는데 타입은 `vec3u` 입니다.
`vec3u`는 부호없는 32비트 정수값 3개입니다. 위의 정점 셰이더에서처럼, 이 값이 반복 회수를 의미합니다.
다만 컴퓨트 셰이더에서는 반복 회수가 3차원(3개의 값을 가짐)이라는 것이 다릅니다.
`id`의 값은 내장된 `global_invocation_id`로부터 가져오도록 선언했습니다.

*대충* 아래와 같은 식으로 컴퓨트 셰이더가 동작한다고 보면 됩니다.
너무 많이 단순화 하긴 했지만 지금은 이 정도면 될 것 같습니다.

```js
// pseudo code
function dispatchWorkgroups(width, height, depth) {
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const workgroup_id = {x, y, z};
        dispatchWorkgroup(workgroup_id)
      }
    }
  }
}

function dispatchWorkgroup(workgroup_id) {
  // from @workgroup_size in WGSL
  const workgroup_size = shaderCode.workgroup_size;
  const {x: width, y: height, z: depth} = workgroup_size;
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const local_invocation_id = {x, y, z};
        const global_invocation_id =
            workgroup_id * workgroup_size + local_invocation_id;
        computeShader(global_invocation_id)
      }
    }
  }
}
```

`@workgroup_size(1)`로 설정했기 떄문에 위의 의사 코드는 아래와 같아집니다.

```js
// pseudo code
function dispatchWorkgroups(width, height, depth) {
  for (z = 0; z < depth; ++z) {
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        const workgroup_id = {x, y, z};
        dispatchWorkgroup(workgroup_id)
      }
    }
  }
}

function dispatchWorkgroup(workgroup_id) {
  const global_invocation_id = workgroup_id;
  computeShader(global_invocation_id)
}
```

마지막으로 `id`의 `x`값을 `data`의 인덱스로 사용하고 각 값에 2를 곱합니다.

```wgsl
        let i = id.x;
        data[i] = data[i] * 2.0;
```

위의 경우 `i`는 반복 회수 3개중 하나의 값입니다.

이제 셰이더를 만들었으니 파이프라인을 만들어야 합니다.

```js
  const pipeline = device.createComputePipeline({
    label: 'doubling compute pipeline',
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'computeSomething',
    },
  });
```

여기에서 우리는 우리가 만든 셰이더 `module`을 사용한 `compute` 단계만을 사용할 것이고, `computeSomething` 함수를 호출할 것임을 명시하고 있습니다.
`layout`은 여기서도 `'auto'`인데, WebGPU가 셰이더로부터 레이아웃을 알아내도록 합니다.[^layout-auto]

[^layout-auto]: `layout: 'auto'` 는 편리하지만, `layout: 'auto'`를 사용하면 파이프라인간에 바인드그룹을 공유하는 것이 불가능합니다.
이 사이트의 대부분의 예제에서는 여러 파이프라인에서 바인드그룹을 사용하지 않습니다.
명시적인 레이아웃에 대해서는 [이 글](webgpu-bind-group-layouts.html)에서 설명합니다.

다음으로 데이터가 필요합니다.

```js
  const input = new Float32Array([1, 3, 5]);
```

이 데이터는 자바스크립트 상에서만 존재합니다.
WebGPU를 위해서는 GPU에 상주하는 버퍼를 만들고 데이터를 그 버퍼에 복사해야 합니다.

```js
  // 계산의 입출력을 저장할 버퍼를 GPU에 만듭니다.
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  // 입력 데이터를 버퍼에 복사합니다.
  device.queue.writeBuffer(workBuffer, 0, input);
```

위에서는 `device.createBuffer`를 호출하여 버퍼를 생성하고 있습니다.
`size`는 바이트 단위이고, 우리의 경우 12인데 3개의 값을 갖는 `Float32Array`의 크기는 12이기 떄문입니다.
`Float32Array`나 다른 타입이 명시된 배열이 낮설다면 [이 글](webgpu-memory-layout.html)을 참고하세요.

모든 WebGPU 버퍼에는 `usage`가 명시되어야 합니다.
다양한 플래그를 넘겨줄 수 있지만 동시에 같이 사용할 수 없는 것들도 있습니다.
여기서는 `GPUBufferUsage.STORAGE`를 사용해 해당 버퍼가 `storage`로 사용될 수 있도록 하고 있습니다. 
이렇게 하면 `var<storage,...>`와 호환됩니다.
또한 데이터가 버퍼에 복사될 수 있어야 하므로 `GPUBufferUsage.COPY_DST` 플래그를 사용합니다. 
마지막으로 버퍼로부터 데이터를 복사할 수 있도록 `GPUBufferUsage.COPY_SRC`를 추가합니다.

WebGPU 버퍼로부터 데이터를 직접 읽을 수는 없다는 점을 유념하십시오.
그 대신 WebGPU의 버퍼에 접근을 요청할 수 있도록 "map"을 해야 하는데, 버퍼는 GPU에만 존재하고, 이미 사용 중인 상태에 있을 수 있기 때문입니다.

자바스크립트와 맵핑(map)될 수 있는 버퍼는 다른 용도로는 사용 불가능합니다.
다시 말해, 방금 만든 버퍼는 맵핑이 불가능하고, 맵핑이 되도록 플래그를 추가하면 해당 버퍼가 `STORAGE` 상태일 때는 호환되지 않는다는 오류가 발생할겁니다.

따라서 계산의 결과를 보기 위해서는 다른 버퍼가 필요합니다.
계산을 수행한 이후에 위의 버퍼를 이 버퍼에 복사할 것이며, 맵핑할 수 있도록 설정해 둡니다.

```js
  // 결과의 사본을 위한 버퍼를 GPU에 생성함
  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
```

`MAP_READ`는 이 버퍼의 값을 읽기 위해 맵핑이 가능하도록 하겠다는 의미입니다.

셰이더에 버퍼의 존재를 알려주기 위해서는 바인드그룹을 만들어야 합니다.

```js
  // 계산을 위해 어떤 버퍼를 사용해야 할지 알려주기 위해 바인드그룹을 설정함
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: workBuffer },
    ],
  });
```

바인드그룹의 레이아웃은 파이프라인으로부터 얻습니다.
그리고 바인드그룹의 진입점(entries)을 설정합니다.
`pipeline.getBindGroupLayout(0)`의 0은 셰이더의 `@group(0)`에 대응됩니다.
`entries`의 `{binding: 0 ...` 은 셰이더의 `@group(0) @binding(0)`에 대응됩니다.

이제 커맨드를 인코딩합니다.

```js
  // 계산을 위한 커맨드 인코딩
  const encoder = device.createCommandEncoder({
    label: 'doubling encoder',
  });
  const pass = encoder.beginComputePass({
    label: 'doubling compute pass',
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(input.length);
  pass.end();
```

커맨드 인코더를 만들고 컴퓨트 패스를 시작합니다. 파이프라인을 설정하고 바인드그룹을 설정합니다.
여기서 `pass.setBindGroup(0, bindGroup)`의 0은 셰이더의 `@group(0)`에 대응됩니다.
그리고 여기서는 `dispatchWorkgroups`를 호출하고 `input.length`의 값인 `3`을 넘겨주게 되는데 이는 WebGPU에게 셰이더를 세번 호출하라는 의미입니다. 그리고 패스를 종료(end)합니다.

`dispatchWorkgroups`이 실행되면 아래와 같은 상태가 됩니다.

<div class="webgpu_center"><img src="resources/webgpu-simple-compute-diagram.svg" style="width: 553px;"></div>

계산이 끝나면 `workBuffer`로부터 `resultBuffer`로 복사를 수행하도록 WebGPU에 요청합니다.

```js
  // 결과를 맵핑 가능한 버퍼에 복사하는 커맨드를 인코딩
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);
```

이제 인코더를 `finish`하여 커맨드 버퍼를 얻고 제출합니다.

```js
  // 인코딩을 종료하고 커맨드를 제출
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
```

결과 버퍼를 맵핑하여 데이터 사본을 얻습니다.

```js
  // 결과 읽기
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange());

  console.log('input', input);
  console.log('result', result);

  resultBuffer.unmap();
```

결과 버퍼를 맵핑하려면 `mapAsync`를 호출하고 끝날 때까지 `await`해야 합니다.
맵핑이 되면 매개변수 없이 `resultBuffer.getMappedRange()`를 호출하면 전체 버퍼에 대한 `ArrayBuffer`가 반환됩니다.
이를 `Float32Array`로 변환하여 결과를 볼 수 있습니다.
중요한 세부 사항으로, `getMappedRange`로 반환된 `ArrayBuffer`는 `unmap`을 호출하기 전까지만 유효하다는 것입니다.
`unmap`을 하고 나면 길이가 0으로 바뀌고 데이터에 접근할 수 없게 됩니다.

실행하면 받은 결과값을 볼 수 있고, 모든 값이 두 배가 된 것을 볼 수 있습니다.

{{{example url="../webgpu-simple-compute.html"}}}

컴퓨트 셰이더를 사용하는 법은 다른 글에서 이야기 할 것입니다.
지금은 WebGPU가 하는 일에 대한 대략적인 이해만을 하셨기를 바랍니다.
나머지 모든 것들은 여러분에게 달려 있습니다!
WebGPU는 다른 프로그래밍 언어와 다를 것이 없습니다.
기본적인 몇 가지 기능만을 제공하고, 나머지는 여러분의 창의성에 달려 있습니다.

WebGPU가 특별한 점은 이러한 정점 셰이더, 프래그먼트 셰이더, 컴퓨트 셰이더가 여러분의 GPU에서 실행된다는 점입니다.
GPU는 10,000개 이상의 처리장치(processor)가 있을 수 있으며 그 말은 10,000개의 연산이 병렬적으로 실행될 수 있다는 뜻입니다.
이는 일반적으로 CPU에서 할 수 있는 병렬 연산보다 1,000배 이상 높은 수치입니다.

## 간단한 캔버스 리사이징(resizing)

더 진행하기 전에, 삼각형 그리기 예제로 다시 돌아가서 캔버스 리사이징 지원을 위한 기본 기능을 추가해 봅시다.
캔버스 리사이징은 사실 꽤나 까다로운 주제라서 [이를 위한 별도의 글도 있습니다](webgpu-resizing-the-canvas.html).
지금은 기본적인 지원 기능만을 추가하겠습니다.

먼저 캔버스가 페이지 전체를 채우도록 CSS를 추가합니다.

```html
<style>
html, body {
  margin: 0;       /* 기본 마진(margin) 제거                   */
  height: 100%;    /* html과 body가 페이지 전체를 채우도록 함   */
}
canvas {
  display: block;  /* 캔버스를 블럭(block)처럼 동작하게 함      */
  width: 100%;     /* 캔버스가 컨테이너(container) 전체를 채움  */
  height: 100%;
}
</style>
```

이러한 CSS는 캔버스가 페이지 전체를 채우도록 하지만 해상도가 변하지는 않기 떄문에 아래 예제를 예를들어 전체 화면으로 만들어서 크게 키우면, 삼각형의 모서리(edge)에 사각형이 보이게 될 겁니다.

{{{example url="../webgpu-simple-triangle-with-canvas-css.html"}}}

`<canvas>` 태그의 기본 해상도는 300x150입니다. 
캔버스가 표시되는 크기와 해상도를 맞추려고 합니다.
이를 위한 하나의 방법으로 `ResizeObserver`를 사용하는 방법이 있습니다.
`ResizeObserver`를 만들고 관찰(observe)하는 어떤 요소의 크기가 변하면 호출될 함수를 전달해 줄 수 있습니다.
어떤 요소를 관찰할 것인지를 알려주어야 하고요.

```js
    ...
-    render();

+    const observer = new ResizeObserver(entries => {
+      for (const entry of entries) {
+        const canvas = entry.target;
+        const width = entry.contentBoxSize[0].inlineSize;
+        const height = entry.contentBoxSize[0].blockSize;
+        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
+        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
+        // re-render
+        render();
+      }
+    });
+    observer.observe(canvas);
```

위 코드에서는 모든 entry를 순회하였지만 사실 캔버스만 관찰합니다.
캔버스의 크기를 장치가 지원하는 최대 크기로 제한해야 하는데, 그렇지 않으면 텍스처가 너무 커지는 경우 WebGPU가 오류를 생성하기 때문입니다.
0으로 되는 경우에도 오류가 발생합니다.
[세부 사항은 더 자세한 글을 확인하세요](webgpu-resizing-the-canvas.html).

삼각형을 새로운 해상도로 다시 그리기 위해 `render`를 호출합니다.
이전의 `render`는 필요하지 않기 때문에 삭제합니다. 
어떤 요소가 관찰되기 시작하면 `ResizeObserver`는 최소한 한 번 콜백(callback)함수를 호출하게 됩니다.

`render`내에서 `context.getCurrentTexture()`를 호출하면 새로운 크기의 텍스처가 생성되므로 더 추가할 코드는 없습니다.

{{{example url="../webgpu-simple-triangle-with-canvas-resize.html"}}}

아래 글들에서 셰이더에 데이터를 전달하기 위한 다양한 방법을 다룰 것입니다.

* [스테이지간 변수(inter-stage variable)](webgpu-inter-stage-variables.html)
* [uniforms](webgpu-uniforms.html)
* [스토리지 버퍼(storage buffers)](webgpu-storage-buffers.html)
* [정점 버퍼(vertex buffers)](webgpu-vertex-buffers.html)
* [텍스처(textures)](webgpu-textures.html)
* [상수(constants)](webgpu-constants.html)

또한 [WGSL 기초](webgpu-wgsl.html)도 다룰 것입니다.

순서는 간단한 것에서부터 복잡한 것 까지입니다.
스테이지간 변수는 설명하기 위한 별도의 설정이 필요 없습니다.
위에서 본 WGSL을 수정만 하면 사용법을 배울 수 있습니다.
Uniform은 전역 변수와 유사한 개념으로 모든 셰이더(정점, 프래그먼트, 컴퓨트) 사용됩니다. uniform 버퍼부터 스토리지 버퍼까지는 쭉 이어지는 내용입니다.
정점 버퍼는 정점 셰이더에서만 사용됩니다. 이 부분이 복잡한 이유는 WebGPU에 데이터 레이아웃을 알려주어야 하기 때문입니다.
텍스처는 많은 타입과 옵션들이 있어서 가장 복잡합니다.

이 글이 지루해지지 않을까 좀 걱정입니다. 마음이 내키는 대로 돌아다녀 보세요.
단지 뭔가 이해가 안된다면 이 글의 기초 내용을 다시 돌아봐야 할 수 있다는 것만 기억하세요.
기초 내용을 이해하고 나서 실제 기술을 공부해 나가면 됩니다.

하나 더. 모든 예제 프로그램은 웹페이지 상에서 실시간으로 수정할 수 있습니다.
추가적으로 [jsfiddle](https://jsfiddle.net) 이나 [codepen](https://codepen.io) 이나 [stackoverflow](https://stackoverflow.com)로 손쉽게 내보낼 수 있습니다.
"Export" 버튼만 누르시면 됩니다.

<div class="webgpu_bottombar">
<p>
위 코드에에서는 간단한 방식으로 WebGPU 장치를 얻고 있는데, 보다 자세한 방법으로는 아래와 같은 방법이 있습니다.
</p>
<pre class="prettyprint showmods">{{#escapehtml}}
async function start() {
  if (!navigator.gpu) {
    fail('this browser does not support WebGPU');
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    fail('this browser supports webgpu but it appears disabled');
    return;
  }

  const device = await adapter.requestDevice();
  device.lost.then((info) => {
    console.error(`WebGPU device was lost: ${info.message}`);

    // 'reason' will be 'destroyed' if we intentionally destroy the device.
    if (info.reason !== 'destroyed') {
      // try again
      start();
    }
  });
  
  main(device);
}
start();

function main(device) {
  ... do webgpu ...
}
{{/escapehtml}}</pre>
<p>
<code>device.lost</code>는 미해결(unresolve) 상태에 대한 프라미스(promise)입니다. 장치가 미해결 상태에면 해결(resolve)합니다. 
다양한 이유로 장치를 찾지 못할 수 있는데, 사용자가 무거운 맵을 실행해서 GPU에 충돌이 발생한 경우가 한 예입니다. 
드라이버를 업데이트 했을 수도 있고, 외장 GPU를 뽑아버렸을 수도 있고, 다른 페이지가 많은 GPU를 점유해서 우리의 탭이 백그라운드 상태로 들어가 브라우저가 장치를 해제하여 메모리를 확보하려 할 수도 있습니다.
요점은, 중요한 앱이라면 이러한 장치를 찾지 못하는 문제를 해결하는 법이 있어야 한다는 점입니다.
</p>
<p>
<code>requestDevice</code>는 항상 장치를 반환한다는 점을 유념하세요. 그 이후에 찾지 못하게 될 수 있는겁니다. WebGPU는 그래서 적어도 API 수준에서는 대부분의 경우 장치가 동작하는 것처럼 보일 수 있습니다. 무언가를 생성하고 사용하면 잘 동작하는 것처럼 보이지만 사실은 동작하지 않고 있을 수 있습니다. <code>lost</code> 프라미스가 해결될 때 무엇을 해야 할지는 여러분에게 달려 있습니다.
</p>
</div>

<!-- keep this at the bottom of the article -->
<script type="module" src="webgpu-fundamentals.js"></script>




