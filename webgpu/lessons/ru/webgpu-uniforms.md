Title: WebGPU Uniforms
Description: Прокидываем константные данные в шейдер
TOC: Uniforms

Предыдущая статья была об [inter-stage переменных](webgpu-inter-stage-variables.html).
В этой статье я расскажу об uniforms.

( от переводчика ) Uniforms правильнее всего перевести как *универсальный*, то есть используется везде.

Uniforms - это что-то вроде глобальных переменных для вашего шейдера. Вы можете установить значение для них до вызова шейдера и они будут знать эти значения каждую итерацию вашего шейдера. Вы можете установить другое значение для них в любое время, когда вы просите видеокарту вызвать шейдер.

Мы снова начнем с треугольника из [первой статьи](webgpu-fundamentals.html) и изменим код, добавив uniforms.

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

Сначала мы создаем структуру с тремя переменными.

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

Далее, мы создаем uniform переменную с типом этой структуры.
Переменная `ourStruct` с типом `OurStruct`.

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

Далее, мы изменяем возвращаемое значение из vertex shader'a, чтобы использовать в uniforms.

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

Вы можете увидеть, что мы умножаем позицию вершины с помощью размера и далее добавляем смещение.
Это поможет нам указать размер треугольника и его позицию.

Мы также изменяем fragment shader, чтобы вернуть цвет из нашего uniforms.

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

Теперь, чтобы использовать uniforms нам нужно создать буфер на видеокарте и взять значение из шейдеров.

Это место, где если вы никогда не работали с собственными данными и размерами данных, то есть чему поучиться. Это большая тема, поэтому изучить ее вы можете [здесь](webgpu-memory-layout.html). Если вы не знаете как создавать структуры в памяти, пожалуйста, прочитайте [эту статью](webgpu-memory-layout.html). Вернемся назад. Эта статья предполагает, что вы уже прочитали [это](webgpu-memory-layout.html).

Прочитав [эту статью](webgpu-memory-layout.html), мы теперь можем заполнить наши буферы данными, которые совпадают со структурами в нашем шейдере.

Сначала, мы сделаем буфер и назначим ему *флаг использования* ( в оригинале usage flags ), таким образом мы сможем использовать его с uniforms и также обновлять его копирая новые данные в него.

```js
  const uniformBufferSize =
    4 * 4 + // цвет - это четыре 32-битных чисел с плавающей запятой (Каждое число по 4 байта)
    2 * 4 + // Размер - это два 32-битных числа с плавающей запятой (Каждое число по 4 байта)
    2 * 4;  // Смещение - это два 32-битных числа с плавающей запятой (Каждое число по 4 байта)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

Когда мы делаем `TypedArray`, мы можем устанавливать значения в JavaScript'e.

```js
  // Создаем typedarray, чтоюы получать значения для uniforms в JavaScript'e
  const uniformValues = new Float32Array(uniformBufferSize / 4);
```

И мы заполняем два значение нашей структуры, которые не будут изменяться позже.
Смещение будет расчитываться способом, которые мы изучили [тут](webgpu-memory-layout.html).

```js
  // Смещение для различных uniform значение в float32 индексах
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);        // устанавливаем цвет
  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // устанавливаем смещение
```

Выше мы установили зеленый цвет. Смещение будет двигать треугольник к левой четверти нашего canvas'a и до нижней одной-восьмой (запомните, что clip space распологается в значениях от -1 до 1, где 0.25 будет 1/8 от двух). 

Далее, [мы делаем как диаграмме показаной в первой статье](webgpu-fundamentals.html#a-draw-diagram),
чтобы сказать шейдеру о нашем буфере, нам нужно создать bind group и забиндить (bind) буфер в тот же самый `@binding(?)` куда мы установили наш шейдер.

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

Теперь, перед тем как мы подтвердим команды буфера нам нужно установить оставшиеся команды для `uniformValues` и после скопировать эти значение в буфер на нашей видеокарте.
Мы будем делать это в самом верху нашей функции `render`. 

```js
  function render() {
    // Устанавливаем uniform значение для Float32Array на стороне JavaScript'a
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // Устанавливаем размер

    // Копируем значения из JavaScript'a в видеокарту
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> Заметка: `writeBuffer` - это один из способ копирования данных в буфер. 
> Также имеются несколько другие способы, которые описаны [тут](webgpu-copying-data.html).

Мы устанавливаем размер в половину размер И берем во внимание аспект canvas'a, поэтому треугольник будет сохранять туже самую ширину и высоту в зависимости от размера canvas'a. 

Наконец нам нужно установить bind group перед отрисовкой.

```js
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
    pass.draw(3);  // Вызываем наш vertex shader 3 раза
    pass.end();
```

И таким образом мы получаем зеленый треугольник.

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

Для этого треугольника наш state вызывает команду отрисовки это выглядит примерно так.

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

До этого момента, все наши данные использовавшиеся в нашем шейдере были очень не гибкие и назначены *грубо* ( в оригинале hardcoded ) ( позиции вершин треугольника в vertex shader и цвета во fragment shader'e ).
Теперь мы можем перенести наши значение в шейдер, мы вызываем метод `draw`
несколько раз с разными данными.

Мы вызвали метод отрисовки в разных местах с разным смещением, размером и цветом с помощью обновления нашего буфера. Это важно понимать, хотя наши команды отправляются в командный буфер, они сейчас не вызываются пока мы не подтвердим их. Поэтому, мы **НЕ МОЖЕМ** делать это

```js
    // ПЛОХО!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, x], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.draw(3);
    }
    pass.end();

    // Завершаем создание и подтверждение команд
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

Как вы можете увидеть выше `device.queue.xxx` функции вызываются в "очереди", но `pass.xxx` функции просто создают команду в командном буфере.
Когда мы вызываем `submit` с нашим командным буфером,
В нашем буфере будут храниться только последние записанные значения.

Мы будем изменять их так. 

```js
    // ПЛОХО! МЕДЛЕННО!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, 0], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      // Завершает создание и подтверждает команды
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

Код выше обновляет один буфер, создает один командный буфер, добавляет команды для отрисовки одной штуки и завершаем командный буфер и подтверждаем его. Это работает, но медленно по множеству причин. Самая большая проблема - это то, что лучшей практикой является делать больше работы в одном командном буфере.

Поэтому, мы должны создать один uniform буфер для каждой вещи, которую мы хотим отрисовать. И с буферами использовать косвенно через bind groups, нам также нужно один bind group для каждой штуки, которую мы хотим отрисовать. Далее, если мы хотим положить все наши штуки, мы хотим отрисовать в одном командном буфере.

Давайте сделаем это!

Сначала, давайте сделаем функцию, которая будет возвращать случайное число.

```js
// Случайное число между [минимальным и максимальным)
// С аргументом один будет [0 до минимального)
// Если аргументы будут отсутствовать, то значение будет [0 до 1)
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

И теперь, давайте установим буферы со списком цветом и смещений, с помощью которых мы сможем отрисовать несколько уникальных вещей ( треугольников ).

```js
  // Смещения в виде уникальных uniform значений в виде float23 индексов
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
+    // Создаем typedarray, чтобы взять значение из uniforms в JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-  uniformValues.set([0, 1, 0, 1], kColorOffset);        // Устанавливаем цвет
-  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // Устанавливаем смещение
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // Устанавливаем цвет
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // Устанавливаем смещение
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

Мы еще не устанавливаем значения в наш буфер, потому что мы хотим также знать аспект canvas'a и мы не хотим знать аспект canvas'a до времени отрисовки.

Во время рендера мы будем обновлять все буферы с правильным размером, который скорректирован от аспекта.

```js
  function render() {
-    // Устанавливаем uniform значения в JavaScript как Float32Array
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // Устанавливаем размер
-
-    // Копируем данные из JavaScript'a в видеокарту
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // Получаем текущую текстуру из контекста canvas'a и
    // устанавливаем как текстуру для рендеринга.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // Устанавливаем uniform значения в JavaScript как Float32Array
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset); // Устанавливаем размер
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // Вызываем наш vertex shader 3 раза
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Повторюсь, важно понимать, что `encoder` и `pass` обьекты - это просто созданные команды
в командный буфер. Далее, когда `render` функция завершается мы эффективно отдаем эти *команды* в поток.

```js
device.queue.writeBuffer(...) // Обновляем uniform буфер 0 с данными для обьекта 0
device.queue.writeBuffer(...) // Обновляем uniform буфер 1 с данными для обьекта 1
device.queue.writeBuffer(...) // Обновляем uniform буфер 2 с данными для обьекта 2
device.queue.writeBuffer(...) // Обновляем uniform буфер 3 с данными для обьекта 3
...
// Вызывает команды, которые отрисовывают 100 треугольников, каждая из которых имеет собственный uniform буфер.
device.queue.submit([commandBuffer]);
```

Выглядит вот так

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

Пока мы здесь нужно изучить еще одну тему. Вы свободно можете ссылаться на несколько uniform буферов в твоем шейдере. 
В нашем примере выше, каждый кадр при отрисовке мы обновляем размер, когда мы `writeBuffer` для выгрузки `uniformValues` для этого обьекта для соответствующего uniform буфера. 
Но, только размер будет обновляться, цвет и смещение не будут, таким образом мы тратим время на выгрузку цвета и смещения.

Нам нужно разделить uniforms в uniforms которым нужно установить один раз для uniforms, которые будут обновляться каждый кадр отрисовки.

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

Тогда нам нужно 2 uniform буфера для каждого треугольника

```js
-  // Создает буфер для uniform значений
-  const uniformBufferSize =
-    4 * 4 + // цвет - это 4 32-битных числа с плавающей запятой (4 бита каждое)
-    2 * 4 + // размер - это 2 32-битных числа с плавающей запятой (4 бита каждое)
-    2 * 4;  // смещение - это 2 32-битных числа с плавающей запятой (4 бита каждое)
-  // Смещение для разных uniform значений в float32 индексах
-  const kColorOffset = 0;
-  const kScaleOffset = 4;
-  const kOffsetOffset = 6;
+  // Создаем 2 буфера для uniform значений
+  const staticUniformBufferSize =
+    4 * 4 + // цвет - это 4 32-битных числа с плавающей запятой (4 бита каждое)
+    2 * 4 + // смещение - это 2 32-битных числа с плавающей запятой (4 бита каждое)
+    2 * 4;  // padding ( не знаю как перевести, сори )
+  const uniformBufferSize =
+    2 * 4;  // размер - это 2 32-битных числа с плавающей запятой (4 бита каждое)
+
+  // Смещения для разных uniform значение в формате float32 индексов
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
+    // Здесь устанавливается только однажды, поэтому установим их сейчас
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // Устанавливаем цвет
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // Устанавливаем смещение

+      // Копируем эти данные в видеокарту
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // Создаем typedarray, чтобы взять значение из uniforms в JavaScript
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

Ничего не меняется в коде рендеринга. Bind group для каждого обьекта содержит ссылку на оба uniform буфера для каждого обьекта. Просто раньше мы обновляли размер. Но сейчас мы только выгружаем размер, когда мы вызываем `device.queue.writeBuffer`, чтобы обновить uniform буфер, который получает значение размера, где как мы раньше выгружали цвет + смещение + размер для каждого обьекта.

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

Пока в этом простом примере разделение на несколько uniform буферов вероятно излишнее много раз очищает память ( в оригинале overkill ). Это обычно для разделения, основанного на изменениях данных. Примеры могут включать один uniform буфер для матриц, которые будут общими. Для примера проекции матриц, view matrix и матрицы камеры. Часто с этими одинаковыми для всего вещами мы хотим отрисовать нам нужно просто сделать один буфер и использовать все обьекты в одном uniform буфере.

По отдельности наши шейдеры могут ссылаться на другой uniform буфер, который содержить еще вещи, которые специфичны для этого обьекта по типу мира/матрицы модели и матрицы нормалей ( в оригинале normal matrix ).

Другой uniform буфер может содержать настройки материала. Эти настройки могут быть общими для нескольких обьектов.

Мы еще изучим много материала по этой теме и тогда перейдем к отрисовке 3д графики.

Далее, [хранилище буферов](webgpu-storage-buffers.html)