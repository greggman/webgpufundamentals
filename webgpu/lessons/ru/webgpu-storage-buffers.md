Title: WebGPU storage буферы
Description: Отправка больших данных в шейдеры
TOC: Storage буферы

Эта статья о storage буферах и продолжение [предыдущей статьи](webgpu-uniforms.html).

Storage буферы во многом похожи на uniform буферы.
Если мы просто поменяем `UNIFORM` на `STORAGE` в JavaScript
и `var<uniform>` на `var<storage, read>` в WGSL, то примеры из предыдущих статей будут работать.

Фактический, это и есть разница. Без переименования переменных имеем более соответствующие имена.

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

И в WSGL

```wsgl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
+@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

И без других изменений это работает как раньше.

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## Разница между uniform буферами и storage буферами

Главное отличие между ними это:

1. Uniform буферы работают быстрее в типичных для них целях

   Это и правда очень зависит от случая. Обычному приложение нужно отрисовывать множество разных вещей. 
   Например это трехмерная игра. Приложение может отрисовывать
   машины, дома, камни, кусты, людей и многое другое... Для каждого
   будет требоваться хранение в осях координат и свойства материалов, которые
   зависят что нужно в нашем примере. В этом случае, использование uniform буфера является хорошим решением.

2. Storage буферы могут быть намного больше, чем uniform буферы.

   * Минимальный и максимальный размер uniform буфера равен 64 килобайт. 
   * Минимальный и максимальный размер storage буфера равен 128 мегабайтам.

   С помощью минимума и максимума, где максимальный размер буфера определенного типа может быть таким. 
   Для uniform буферов максимальный размер не больше 64 килобайтов.
   Для storage буферов максимальный размер не больше 128 мегабайтам. Мы изучим лимиты в [другой статье](webgpu-limits-and-features.html).

3. Storage буферы могут быть прочтены/записаны, а Uniform буферы только для чтения.

   Мы можем увидеть пример написания storage буфера в compute shader'e [в первой статье](webgpu-fundamentals.html).

## <a id="a-instancing"></a>Создание storage буферов

Отталкиваясь от двух пунктов выше, давайте возьмем наш последний пример и поменяем отрисовку всех ста треугольников в один вызов отрисовки. 
Это пример, где *может* использоваться storage буферы. Я сказал может, потому что, повторюсь, WebGPU похож
на другие языки программирования. Есть много путей сделать одну и туже вещь.
`array.forEach` против `for (const elem of array)` против `for (let i = 0; i < array.length; ++i)`. Все это работает. Разнообразие вариантов решение - это правда об WebGPU. Каждая вещь, которую мы пытаемся сделать имеет множество путей решения. 
Когда мы хотим отрисовать треугольник,
Все о чем волнуется WebGPU - это возврат значения для `builtin(position)` из
vertex шейдера и возврат цвета/значения для `location(0)` из fragment шейдера.[^colorAttachments] 

[^colorAttachments]: Мы можем иметь множество цветов и нам нужно вернуть следующие цвета/значения в `location(1)`, `location(2)` и многое другое...

Первая вещь, которую мы сделаем - это поменяем наш код нашего хранилище на runtime-sized массивы (от переводчика: изменяемые при работе приложения).

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

Далее мы изменяем шейдер для использования этих значений.

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

Мы добавляем новый параметр для нашего vertex шейдера вызывая
`instanceIndex` и давая ему `@builtin(instance_index)` атрибут
именя которых означают получение значения из WebGPU для каждого "созданного" ( в оригинале instance ) отрисованного обьекта.
Когда мы вызываем `draw` мы можем прокинуть второй аргумент для *числа созданных обьектов*
И для каждого созданного отрисованного обьекта число созданных обьектов будет изменяться и переноситься в нашу функцию.

Использование `instanceIndex` мы можем получить уникальные элементы структуры из нашего массива структур.

Нам также нужно получить цвет из правильного массива элементов и использовать это для нашего fragment shader'a. 
Fragment shader не имеет доступа к
`@builtin(instance_index)`, потому что это не имеет смысла. Мы должны прокинуть его как [inter-stage переменную](webgpu-inter-stage-variables.html) 
Но это будет более привычный способ поиска цвет в vertex shader'e и просто получить цвет.

Чтобы сделать это мы должны использовать другую структуры, похожую на ту, которую мы делали в
[статье об inter-stage переменных](webgpu-inter-stage-variables.html).

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

Теперь мы обновили наш WGSL шейдер и давайте изменим JavaScript код.

Здесь настройка.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // Создает два storage буфера
  const staticUnitSize =
    4 * 4 + // Цвет - это 4 32-битных числа с плавающей запятой (4 байта каждое)
    2 * 4 + // Смещение - это 2 32-битных числа с плавающей запятой (4 байта каждое)
    2 * 4;  // padding
  const changingUnitSize =
    2 * 4;  // Размер - это 2 32-битных числа с плавающей запятой (4 байта каждое)
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

  // Смещения для разных uniform значений в float32 индексах
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // Здесь установка происходит только один раз, поэтому давайте сделаем это сейчас
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // Устанавливаем цвет
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // Устанавливаем смещение

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // Мы можем использовать строго-типизированный массив для обновления changingStorageBuffer
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

Выше мы создаем два storage буфера. Один для массива, состоящего из `OurStruct`.
А другие используется для массива, состоящего из `OtherStruct`.

We then fill out the values for the array of `OurStruct` with offsets
and colors and then upload that data to the `staticStorageBuffer`.

We make just one bind group that references both buffers.

The new rendering code is

```js
  function render() {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;

-    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
-      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
-      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
-
-      pass.setBindGroup(0, bindGroup);
-      pass.draw(3);  // call our vertex shader 3 times
-    }

+    // set the scales for each object
+    objectInfos.forEach(({scale}, ndx) => {
+      const offset = ndx * (changingUnitSize / 4);
+      storageValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
+    });
+    // upload all scales at once
+    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);
+
+    pass.setBindGroup(0, bindGroup);
+    pass.draw(3, kNumObjects);  // call our vertex shader 3 times for each instance


    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Код выше отрисовывает `kNumObjects` созданных обьектов. Для каждого созданного обьекта
WebGPU будет вызывать vertex shader 3 раза с `vertex_index` установленным на 0, 1, 2
и `instance_index` установленным на 0 ~ kNumObjects - 1

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

Нам нужно отрисовать все 100 треугольников, каждый с разными размером, цветом и смещение в одном вызове отрисовке. Для ситуаций, где вы хотите отрисовать много разных обьектов имеется один из способов сделать это.

## Использование storage буферов для данных вершин

До этого момента мы использовали данные треугольника прямиком из шейдера.
Один из вариантов, где можно использовать storage буферы - это хранение данных вершин. Как мы храним индесы в нашем storage буферах 
с помощью `instance_index` в примере выше, а сейчас будем хранить индекс в другом storage буфере с помощью `vertex_index`, чтобы получить данные вершин.

Приступим!

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

Теперь нам нужно установить еще один storage буфер с несколькими вершинами.
Сначала, давайте сделаем функцию для генерации данных вершин. Например круга.
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 треугольника на кусочек, 3 вершины для треугольника, 2 значения (xy) везде.
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // 2 треугольника на кусочек
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

    // Первый треугольник
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // Второй треугольник
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

Код выше сделает круг из треугольник.

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

Так мы сможем сделать это, чтобы заполнить наш storage буфер вершинами нашего круга.

```js
  // Устанавливаем storage буфер для данных вершин
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

И далее нужно добавить это в bind group.

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

И во время отрисовки нужно запрашивать все вершины из круга.

```js
-    pass.draw(3, kNumObjects);  // Вызывает vertex shader 3 раза для созданных обьектов
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

Выше мы использовали

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

Мы можем хранить не структуру, а просто тип `vec2f`.

```wgsl
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
+@group(0) @binding(2) var<storage, read> pos: array<vec2f>;
...
-pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
```

Но есть одно НО. Не будет ли проще с помощью структуры добавлять данные об вершине позже?

Прокидывание вершин в storage буферах становится все более популярным решением.
Я могу сказать, что на некоторых старых устройствах этот способ работает медленнее, чем более *классический* метод,
который мы изучим в следующий статье об [буфере вершин](webgpu-vertex-buffers.html).

<!-- keep this at the bottom of the article ( Alice: Deal! ) -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
