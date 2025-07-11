Title: Буфери зберігання в WebGPU
Description: Передача великих об’ємів даних в шейдери
TOC: Буфери зберігання

В цій статті ми розглянемо буфери зберігання і продовжимо
з того місця, на якому ми зупинились в [попередній статті](webgpu-uniforms.html).

Буфери зберігання в багатьох аспектах є схожими до юніформ
буферів. Якщо ми просто змінимо `UNIFORM` на `STORAGE` в 
нашому JavaScript коді та `var<uniform>` на `var<storage, read>`
в нашому WGSL коді з попередньої статті, то усе працюватиме як
і працювало.

Насправді, ось і усі ці зміни (не враховуючи необхідність
перейменувати змінні для кращого читання):

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

і зміни в WSGL коді:

```wsgl
-@group(0) @binding(0) var<uniform> ourStruct: OurStruct;
-@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
+@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
```

Без жодних додаткових змін усе працює як і до того.

{{{example url="../webgpu-simple-triangle-storage-split-minimal-changes.html"}}}

## Різниця між юніформ буферами та буферами зберігання

Основні відмінності між юніформ буферами та буферами зберігання 
такі:

1. Юніформ буфери можуть бути швидшими в певних типових для
них випадках використання.

   Це справді дуже залежить від випадку використання. Типовий
   додаток хотітиме намалювати багато різних речей. Скажімо
   це 3D гра. Такий додаток буде малювати машини, будівлі,
   каміння, кущі, людей та багато іншого. Кожна з цих речей
   потребуватиме даних про орієнтацію в просторі та характеристики
   матеріалі. В цьому випадку рекомендовано використовувати 
   юніформ буфери.

2. Буфери зберігання можуть бути значно більшими ніж юніформ
буфери.

   * Мінімальний максимальний розмір юніформ буфера - 64k
   * Мінімальний максимальний розмір буфера зберігання - 128meg

   Під мінімальним максимальним значенням розуміється те, що
   існує нижня планка максимального розміру для кожного типу буфера. Для юніформ буфера цей розмір становить мінімум 64k.
   Для буфера зберігання це мінімум 128meg. Ми розглянемо ліміти
   в [іншій статті](webgpu-limits-and-features.html).

3. Буфери зберігання можуть працювати в режимі читання та 
запису, а юніформ буфери працюють тільки в режимі читання.

   Ми уже бачили приклад запису в буфер зберігання в 
   обчислювальному шейдері з нашої [першої статті](webgpu-fundamentals.html).

## <a id="a-instancing"></a>Створення однакових екземплярів з допомогою буферів зберігання

Враховуючи перших два пункти вище, візьмемо наш приклад і змінимо його
так, щоб намалювати усі 100 трикутників одним викликом функції. Це той
випадок використання, який *може* підійти для буферів зберігання. 
Я вживаю слово може через те, що WebGPU дуже схожий до інших мов 
програмування. А це означає, що є багато різних способів досягнути
однієї цілі. Наприклад, `array.forEach` чи `for (const elem of array)`,
або `for (let i = 0; i < array.length; ++i)`. Кожен з цих варіантів
має своє місце. Так само і в WebGPU. Кожна річ, яку ми хочемо зробити
має кілька способів як її досягнути. Коли йдеться про малювання
трикутників, все про що WebGPU переймається це значення, яке ми вертаємо
з вершинного шейдера в `builtin(position)` та значення кольору з фрагментного
шейдера в `location(0)`.[^colorAttachments] 

[^colorAttachments]: Ми можемо мати декілька прив’язок кольорів иа
повертати з фрагментного шейдера більше даних для `location(1)`, 
`location(2)` і так далі.

Перше, що нам потрібно зробити це змінити тип нашого буфера на масив.

```wgsl
-@group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
-@group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
+@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
+@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
```

Далі ми змінюємо наш шейдер так, щоб він використовував ці нові значення.

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

Ми додали новий параметр `instanceIndex` до нашого шейдера з
атрибутом `@builtin(instance_index)`, що означає те, що це
значення буде отримано від WebGPU для кожного "екземпляра" (instance)
малювання. Коли ми викликаємо функцію `draw`, ми можемо передати
другий аргумент *кількості екземплярів* і під час малювання
кожного з цих екземплярів, ми будемо отримувати кількість екземплярів,
які уже було оброблено.

Використовуючи `instanceIndex`, ми можемо отримати конкретну структуру з
нашого масиву структур.

Нам також потрібно буде отримати колір з правильного елемента масиву
і використати це значення в фрагментному шейдері. Фрагментний шейдер
не має доступу до `@builtin(instance_index)`. Тому могли б передати
це значення як [міжетапну змінну](webgpu-inter-stage-variables.html)
але краще знайти значення кольору в вершинному шейдері і передати
саме колір.

Для цього ми використаємо іншу структуру так, як ми це робили в
[цій статті про міжетапні змінні](webgpu-inter-stage-variables.html).

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

Тепер, коли ми змінили наші WGSL шейдери, давайте оновимо наш
JavaScript код.

```js
  const kNumObjects = 100;
  const objectInfos = [];

  // створюємо 2 буфери зберігання
  const staticUnitSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // offset is 2 32bit floats (4bytes each)
    2 * 4;  // padding
  const changingUnitSize =
    2 * 4;  // scale is 2 32bit floats (4bytes each)
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

  // зміщення для кожного елемента буфера
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  {
    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffset = i * (staticUnitSize / 4);

      // ці значення встановлюються лише раз, тому ми робимо це тут
      staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // встановлюємо колір
      staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // встановлюємо зміщення

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
  }

  // типізований масив, який ми будемо використовувати для оновлення changingStorageBuffer
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

Вище ми створили 2 буфери зберігання. Один для масиву структур
`OurStruct` та інший для масиву структур `OtherStruct`.

Далі ми заповнюємо значеннями зміщень та кольорів масив з `OurStruct`
і завантажуємо ці дані в `staticStorageBuffer`.

Ми створили тільки одну групу прив’язки, яка вказує на обидва буфери.

Тепер код рендерингу виглядає так:

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

Код вище намалює кількість екземплярів, що дорівнюватиме `kNumObjects`. 
Для кожного екземпляру WebGPU викличе вершинний шейдер 3 рази з значенням 
`vertex_index` - 0, 1, 2 та `instance_index` - від 0 до `kNumObjects` - 1.

{{{example url="../webgpu-simple-triangle-storage-buffer-split.html"}}}

Ми зуміли намалювати 100 трикутників, кожен з різним масштабом, кольором та
відступом з допомогою лише одного виклику функції `draw`. У випадках, де 
вам потрібно намалювати багато екземплярів одного і того ж об’єкта, це
один із способів це досягти.

## Використання буферів зберігання для даних вершин

До цього моменту ми використовували захардкоджені трикутники прямо в нашому
шейдері. Один із способів використання буферів зберігання - зберігання 
даних вершин. Так само, як ми індексували поточний буфер зберігання з
допомогою `instance_index`, ми можемо індексувати іще один буфер з
допомогою `vertex_index`.

Давайте зробимо це!

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

Тепер ми маємо створити ще один буфер зберігання з даними про вершини.
Спочатку, давайте зробимо функцію для генерування цих даних. Наприклад,
зробимо коло.
<a id="a-create-circle"></a>

```js
function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x, y) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // 2 triangles per subdivision
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

Коди вище створює коло, яке сформоване з трикутників так, як на малюнку нижче.

<div class="webgpu_center"><div class="center"><div data-diagram="circle" style="width: 300px;"></div></div></div>

Тепер, ми можемо використовувати це для заповнення нашого буфера вершинами
цього кола.

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

Нам також потрібно додати цей буфер в нашу групу прив’язки.

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

Нарешті, в момент рендерингу, ми маємо попросити намалювати всі вершини
нашого кола.

```js
-    pass.draw(3, kNumObjects);  // call our vertex shader 3 times for several instances
+    pass.draw(numVertices, kNumObjects);
```

{{{example url="../webgpu-storage-buffer-vertices.html"}}}

Вище ми використали цю структуру:

```wsgl
struct Vertex {
  pos: vec2f;
};

@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
```

Ми могли б не використовувати цю структуру і просто напряму 
передати дані в `vec2f`.

```wgsl
-@group(0) @binding(2) var<storage, read> pos: array<Vertex>;
+@group(0) @binding(2) var<storage, read> pos: array<vec2f>;
...
-pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
+pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
```

Проте, використовуючи саме структуру, ми полегшуємо додавання додаткових
даних для вершини в майбутньому.

Передавання даних про вершини через буфери зберігання набирає
певну популярність. Проте, мені казали, що для певних старіших
пристроїв цей метод повільніший ніж *класичний* спосіб, який
ми розглянемо в статті про [буфери вершин](webgpu-vertex-buffers.html).

<!-- keep this at the bottom of the article -->
<script type="module" src="./webgpu-storage-buffers.js"></script>
