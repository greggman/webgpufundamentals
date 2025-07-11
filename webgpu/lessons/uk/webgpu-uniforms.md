Title: Юніформи в WebGPU
Description: Надсилання констант в шейдери
TOC: Юніформи

Попередня стаття була про [міжетапні змінні](webgpu-inter-stage-variables.html).
Ця стаття буде про юніформи.

Юніформи це наче глобальні змінні для вашого шейдера. Ви можете встановити їх
перед тим як запустите шейдер і тоді на кожній ітерації свого виконання шейдер
буде мати доступ до цих змінних. Ви також можете встановити їм інше значення
наступного разу, коли попросите графічний процесор заново виконати цей шейдер.

Ми знову почнемо з прикладу з трикутником з нашої [першої статті](webgpu-fundamentals.html)
і зробимо певні зміни, щоб використати юніформи.

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

Спершу ми оголошуємо структуру з 3 полями.

```wsgl
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };
```

Далі ми оголошуємо юніформ-змінну з типом цієї структури. Це буде
змінна `ourStruct` з типом `OurStruct`.

```wsgl
      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
```

Після цього ми робимо зміни в коді для використання нашої
юніформ-змінної в обчисленні результату.

```wgsl
      @vertex fn vs(
         ...
      ) ... {
        ...
        return vec4f(
          pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }
```

Ви можете побачити, що ми множимо значення позиції вершини на значення поля
`scale` і далі додаємо зміщення (`offset`). Це дозволить нам задати розмір трикутника
та змінити його позицію.

Ми також внесли зміни в фрагментний шейдер. Тепер він повертає значення
кольору з нашої юніформ-змінної.

```wgsl
      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
```

Тепер, коли ми використовуємо юніформ-змінну в шейдері, ми мусимо створити
буфер на графічному процесорі, щоб він містив дані цієї змінної.

Це місце, де якщо ви ніколи не мали справи з нативними даними та розмірами,
то тут вам прийдеться дещо підівчити. Це досить велика тема, тому 
[тут ви знайдете окрему статтю на цю тему](webgpu-memory-layout.html).
Якщо ви нічого не знаєте про схему розміщення пам’яті, то обов’язково 
[прочитайте цю статтю](webgpu-memory-layout.html). Після цього повертайтесь сюди.
Ця стаття припускає, що ви [уже прочитали все це](webgpu-memory-layout.html).

Прочитавши [цю статтю](webgpu-memory-layout.html), ми можемо продовжити 
і заповнити буфер даними, які співпадають з структурою в нашому шейдері.

Спершу ми створюємо буфер і задаємо йому прапорці, які вказують
не те, що він може використовуватись юніформ змінною та бути оновлений
копіюванням даних в середину нього ж.

```js
  const uniformBufferSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // scale is 2 32bit floats (4bytes each)
    2 * 4;  // offset is 2 32bit floats (4bytes each)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
```

Далі ми створюємо `TypedArray` для того, щоб мати змогу встановити
значення юніформ змінної з JavaScript коду.

```js
  // create a typedarray to hold the values for the uniforms in JavaScript
  const uniformValues = new Float32Array(uniformBufferSize / 4);
```

І після цього ми заповнимо 2 з 3 полів нашої структури, які не будуть
змінюватись пізніше. Значення зміщень полів ми вирахували так, як це 
описано в [цій статті про розміщення даних в пам’яті](webgpu-memory-layout.html).

```js
  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);        // set the color
  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // set the offset
```

В коді вище, ми встановлюємо значення кольору в зелений. Змінна offset
змістить трикутник вліво на 1/4 розміру полотна і вниз на 1/8. 
(згадуємо, що простір відсікання лежить в координатах від -1 до 1, тому
0.25 - це 1/8 від довжини всього простору, що дорівнює 2). 

Далі, [як нам ілюструє діаграма з першої статті](webgpu-fundamentals.html#a-draw-diagram), для того, щоб повідомити шейдеру про наш буфер,
ми повинні створити групу прив’язки і прив’язати цей буфер до того
самого `@binding(?)`, який ми описали в нашому шейдері.

```js
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: uniformBuffer},
    ],
  });
```

Тепер, перед тим як ми відправимо наш буфер команд на виконання, ми
маємо встановити решту значень `uniformValues` і скопіювати їх 
в буфер на графічному процесорі. Ми зробимо це на початку нашої
`render` функції. 

```js
  function render() {
    // встановлюємо решту значень в нашому типізованому масиві
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // встановлюємо scale

    // копіюємо ці значення з JavaScript в пам’ять графічного процесора
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```

> Примітка: `writeBuffer` - це лише один із способів копіювання
> даних в буфер. Існують інші способи, про які більш детально
> описано в [цій статті](webgpu-copying-data.html).

Ми встановлюємо масштаб в пів розміру полотна і беремо в розрахунок
співвідношення його сторін для того, щоб трикутник зберігав однакове 
відношення висоти до ширини не залежно від розміру цього полотна.

Врешті нам потрібно задати групу прив’язки перед початком малювання.

```js
    pass.setPipeline(pipeline);
+    pass.setBindGroup(0, bindGroup);
    pass.draw(3);  // викликаємо наш вершинний шейдер 3 рази
    pass.end();
```

З допомогою цього всього, ми отримали наш зелений трикутник.

{{{example url="../webgpu-simple-triangle-uniforms.html"}}}

Після виконання команди `draw` для цього одного трикутника, стан системи
виглядатиме так.

<div class="webgpu_center"><img src="resources/webgpu-draw-diagram-triangle-uniform.svg" style="width: 863px;"></div>

До цього часу, усі дані, які ми використовували в наших шейдерах
були захардкоджені (позиції вершин у вершинному шейдері чи кольори
в фрагментному шейдері). Тепер, коли ми маємо можливість передати
дані в середину нашого шейдера, ми можемо викликати команду `draw`
безліч разів з різними наборами даних.

Ми можемо малювати трикутники в різних місцях, з різними відступами,
масштабами та кольорами оновлюючи наш буфер. Важливо пригадати, що
незважаючи на те, що команди відправляються в командний буфер одразу,
вони не виконуються поки ми не відправимо цей буфер на виконання. 
Саме тому ми **НЕ можемо** робити таким чином: 

```js
    // НЕ РОБІТЬ ТАК!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, x], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.draw(3);
    }
    pass.end();

    // закінчуємо кодування команд і відправляємо їх на виконання
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
```

Причина полягає в тому, що функції `device.queue.xxx` записуються в чергу 
`queue`, а функції `pass.xxx` просто кодують команди в буфер команд. Коли
ми викликаємо функцію `submit` з нашим буфером команд, то в буфері з даними
будуть тільки останні записані туди дані.

Ми можемо змінити це в такий спосіб:

```js
    // НЕ РОБІТЬ ТАК! Це працюватиме повільно!
    for (let x = -1; x < 1; x += 0.1) {
      uniformValues.set([x, 0], kOffsetOffset);
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      // закінчуємо кодування команд і відправляємо їх на виконання
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }
```

Цей код оновлює один буфер, створює один буфер команд, додає туди
команди для малювання одного трикутника, далі відправляє цей буфер
на виконання. Це працюватиме, але працюватиме повільно через декілька
причин. Одна з причин полягає в тому, що найкращою практикою є використання
одного буфера команд для виконання більшої кількості задач.

Тому натомість ми можемо створити один юніформ буфер на кожен трикутник, який
ми хочемо намалювати. І, оскільки буфери використовуються не напряму, а через
групи прив’язки, то ми мусимо також створити одну таку групу на кожен трикутник.
Після цього, ми зможемо вкласти усі команди малювання в один буфер команд.

Давайте зробимо це.

Для початку, зробимо функцію `random`.

```js
// випадкове число між [min та max)
// з одним аргументом це буде між [0 to min)
// без аргументів це буде між [0 to 1)
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

Тепер, давайте налаштуємо буфери з значеннями різних кольорів
та відступів, з якими ми зможемо малювати наші трикутники.
```js
  // відступи для різних юніформ змінних
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
+    // створюємо типізований масив для зберігання даних для юніформ змінної в JavaScript
+    const uniformValues = new Float32Array(uniformBufferSize / 4);
-  uniformValues.set([0, 1, 0, 1], kColorOffset);        // задаємо колір
-  uniformValues.set([-0.5, -0.25], kOffsetOffset);      // задаємо відступ
+    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // задаємо колір
+    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset); // задаємо відступ
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

Ми не встановлюємо значення в буфер поки що через те, що ми поки не знаємо
відношення сторін нашого полотна і не можемо його дізнатись перед рендерингом.

Під час рендеринг, ми оновлюємо всі буфери з правильними значеннями масштабу. 

```js
  function render() {
-    // встановлюємо значення масштабу в типізований масив
-    const aspect = canvas.width / canvas.height;
-    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset);
-
-    // копіюємо дані з JavaScript в пам’ять графічного процесору
-    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // отримуємо поточну текстуру з контексту полотна
    // та встановлюємо її як текстуру, в яку потрібно рендерити
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

+    // встановлюємо значення масштабу в типізований масив
+    const aspect = canvas.width / canvas.height;

+    for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
+      uniformValues.set([scale / aspect, scale], kScaleOffset);
+      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
       pass.setBindGroup(0, bindGroup);
       pass.draw(3);  // викликаємо наш шейдер три рази
+    }
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
```

Знову згадаємо, що об’єкти `encoder` та `pass` лише кодують команди в 
буфер команд. Тому коли закінчиться функція `render` ми запустимо ці
команди в такому порядку.

```js
device.queue.writeBuffer(...) // оновлюємо юніформ 0 даними з буфера 0
device.queue.writeBuffer(...) // оновлюємо юніформ 1 даними з буфера 1
device.queue.writeBuffer(...) // оновлюємо юніформ 2 даними з буфера 2
device.queue.writeBuffer(...) // оновлюємо юніформ 3 даними з буфера 3
...
// виконуємо команди, які намалюють 100 трикутників
device.queue.submit([commandBuffer]);
```

Ось наш результат:

{{{example url="../webgpu-simple-triangle-uniforms-multiple.html"}}}

Допоки ми тут, розглянемо ще одну річ. Ви можете покликатись на декілька юніформ
буферів у ваших шейдерах. В нашому прикладі вище, під час малювання ми кожного разу
оновлюємо масштаб, далі ми викликаємо `writeBuffer` для завантаження значень
`uniformValues` в необхідний юніформ буфер. Проте, тут оновлюється лише значення
масштабу, а колі та відступ залишаються незмінними. Виходить, що ми витрачаємо час
на оновлення кольору та відступу.

Ми можемо розділити нашу юніформ змінну на дві: ту, яка буде встановлена тільки раз
і ту, яка має оновлюватись кожного разу, коли ми щось малюємо.

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

Тепер нам потрібні 2 буфери для кожного разу, коли ми хочемо щось намалювати.

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
+  // створюємо 2 буфера для наших юніформ змінних
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
+    // ці значення встановлюються лише раз
+    {
-      const uniformValues = new Float32Array(uniformBufferSize / 4);
+      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // задаємо колір
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // задаємо відступ

+      // копіюємо ці дані на графічний процесор
+      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

+    // створюємо типізований масив для зберігання юніформ змінних в JavaScript
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

В нашому коді рендерингу нічого не змінилось. Група прив’язки кожного 
об’єкту містить в собі посилання на обидва юніформ буфери. Як і раніше, ми
оновлюємо масштаб. Але тепер ми завантажуємо в пам’ять тільки цей масштаб 
викликаючи `device.queue.writeBuffer` та оновлюючи юніформ буфер, який
містить в собі це значення в той час, як раніше ми завантажували в цьому місці
значення кольору, відступу та масштабу для кожного такого об’єкту.

{{{example url="../webgpu-simple-triangle-uniforms-split.html"}}}

В цьому конкретному випадку, поділ на два юніформ буфери міг бути перебором,
але зазвичай поділ цих буферів в залежності від частоти їх оновлення та 
використання є досить поширеним. Прикладом цього може слугувати юніформ буфер
для матриць з спільним доступом. Для прикладу матриця проекції, матриця огляду
та матриця камери. Оскільки дуже часто це одна і та ж матриця ми можемо просто
створити один юніформ буфер і використати його для усіх об’єктів, які ви 
плануєте намалювати.

Окремо, наш шейдер може посилатись на інший юніформ буфер, який міститиме тільки ті
речі, які властиві тільки йому (матриця моделі чи матриця нормалей).

Інший юніформ буфер може містити налаштування матеріалів. Ці налаштування можуть
спільно використовуватись різними об’єктами.

Ми використаємо більшість з описаного вище, коли будемо розглядати малювання в 3D.

Далі за списком [буфери зберігання](webgpu-storage-buffers.html).
