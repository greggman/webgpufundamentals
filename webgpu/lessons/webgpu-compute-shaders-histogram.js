import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';
import {
  createElem as el, select, makeTable,
} from './resources/elem.js';
import { clamp01, hsl, lerp, rgba, rgbaFloatFromCSS, rgba8unormFromCSS, zip } from './resources/utils.js';


const image = [
  '🟦🟨🟨🟨🟨🟦',
  '🟦🟨🟥🟥🟨🟦',
  '🟦🟦🟥🟥🟦🟦',
  '🟥🟥🟥🟥🟥🟥',
  '🟦🟦🟥🟥🟦🟦',
  '🟦🟥🟦🟦🟥🟦',
  '🟨🟥🟦🟦🟥🟨',
  /*
  '🟦🟥🟥🟥🟥🟦',
  '🟥🟥🟦🟦🟥🟥',
  '🟥🟨🟦🟦🟨🟥',
  '🟥🟦🟦🟦🟦🟥',
  '🟥🟨🟦🟦🟨🟥',
  '🟥🟥🟨🟨🟥🟥',
  '🟦🟥🟥🟥🟥🟦',
  */
].map(s => s.match(/../g));

const binNdxFromTexelColor = {
  '🟥': 1,
  '🟨': 2,
  '🟦': 0,
};

const cssFromUnicodeColor = {
  '⬛️': 'black',
  '🟥': '#f55',
  '🟧': 'orange',
  '🟨': '#FD0',
  '🟩': 'green',
  '🟦': '#23F',
  '🟪': 'purple',
  '🟫': 'brown',
  '⬜️': 'white',
};

// const unicodeBinColorsToCSS = {
//   '🟥': '#800',
//   '🟨': '#880',
//   '🟦': '#008',
// };

// Returns a value from 0 to 1 for luminance.
// where r, g, b each go from 0 to 1.
function srgbLuminance(r, g, b) {
  // from: https://www.w3.org/WAI/GL/wiki/Relative_luminance
  return r * 0.2126 +
         g * 0.7152 +
         b * 0.0722;
}

function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 1; --i) {
    const j = Math.random() * i | 0;
    const t = b[i];
    b[i] = b[j];
    b[j] = t;
  }
  return b;
}

const imgChunkData = [];

{
  const numBins = 3;
  const numChunks = 14;
  for (let chunkNdx = 0; chunkNdx < numChunks; ++chunkNdx) {
    const data = new Array(numBins).fill(0);
    const xOff = (chunkNdx % 2) * numBins;
    const yOff = chunkNdx / 2 | 0;
    for (let x = 0; x < numBins; ++x) {
      const color = image[yOff][xOff + x];
      const binNdx = binNdxFromTexelColor[color];
      ++data[binNdx];
    }
    imgChunkData.push(data);
  }
}

function createImage(draw, image, size) {
  const group = draw.group();
  image.forEach((pixels, y) => {
    pixels.forEach((pixel, x) => {
      group.rect(size, size).move(x * size, y * size).fill(cssFromUnicodeColor[pixel]);
    });
  });
  return {
    group,
  };
}

const makeText = (parent, t) => {
  return parent.text(t)
    .font({
      family: 'monospace',
      weight: 'bold',
      size: '10',
    })
    .css({
      filter: `
        drop-shadow( 1px  0px 0px #fff) 
        drop-shadow( 0px  1px 0px #fff) 
        drop-shadow(-1px  0px 0px #fff) 
        drop-shadow( 0px -1px 0px #fff) 
      `,
    });
};

function createBin(draw, color, size, lockColor) {
  // [X]
  const group = draw.group();
  const rect = group.rect(size, size).fill(color).stroke('black');
  const text = makeText(group, '0').font({anchor: 'middle'});
  text.attr({cx: 0, cy: 0, 'dominant-baseline': 'central'});
  text.transform({translateX: size / 2, translateY: size / 2});
  const lock = group.rect(size - 4, size - 4).move(2, 2).fill('none').stroke(lockColor).attr({'stroke-width': 4}).hide();
  const lockText = group.text('0').font({
    family: 'monospace',
    weight: 'bold',
    size: '8',
  }).move(0, -2).fill('rgba(0, 0, 0, 0.5)').hide();
  const cover = group.rect(size, size).fill(rgba(0, 0, 0, 0.5)).hide();
  return {
    group,
    text,
    rect,
    lock,
    lockText,
    cover,
  };
}

// [0]
// [0]
// [0]
const kBins = '🟥🟨🟦'.match(/../g);
const numBins = kBins.length;
function createChunk(draw, size, lockColor) {
  const group = draw.group();
  const bins = kBins.map((color, binNdx) => {
    const bin = createBin(group, hsl(1, 0, (binNdx + 0.5) / numBins), size, lockColor);
    //const bin = createBin(group, unicodeBinColorsToCSS[color], size, lockColor);
    bin.group.transform({translateY: binNdx * size});
    return bin;
  });
  return {
    group,
    bins,
  };
}

const binNdxToBinColor = kBins.map((_, i) => hsl(0, 0, (i + 0.5) / kBins.length));

const setTranslation = (e, x, y) => e.attr({transform: `translate(${x}, ${y})`});
const range = (n, fn) => new Array(n).fill(0).map((_, v) => fn(v));
const sineOut = t => 1 - Math.cos(t * Math.PI * 0.5);

const luminanceFromUnicodeColor = color => srgbLuminance(...rgbaFloatFromCSS(cssFromUnicodeColor[color]));
const sortByLuminance = (colorA, colorB) => {
  const luminanceA = luminanceFromUnicodeColor(colorA);
  const luminanceB = luminanceFromUnicodeColor(colorB);
  return Math.sign(luminanceA - luminanceB);
};

//const darkColors = {
//  main: '#fff',
//  point: '#80DDFF80',
//};
//const lightColors = {
//  main: '#000',
//  point: '#8000FF20',
//};
//const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
// let colorScheme;

class CoroutineManager {
  #stepCount = 0;
  #runners = [];
  #targetStepCount = -1;
  #haveStep = false;

  get stepCount() {
    return this.#stepCount;
  }

  get targetStepCount() {
    return this.#targetStepCount;
  }
  set targetStepCount(v) {
    this.#targetStepCount = Math.max(0, v);
  }
  get isSeeking() {
    return this.#targetStepCount >= this.stepCount;
  }

  reset() {
    this.#stepCount = 0;
    this.#targetStepCount = -1;
    this.#haveStep = false;
    this.#runners.forEach(runner => runner.reset());
  }

  addStep() {
    this.#haveStep = true;
  }

  update() {
    this.#runners.forEach(runner => runner.update());
    if (this.#haveStep) {
      this.#haveStep = false;
      ++this.#stepCount;
    }
  }

  createRunner() {
    const runner = new CoroutineRunner(this);
    this.#runners.push(runner);
    return runner;
  }
}

/**
 * To use
 *
 * ```
 * function* do5(msg) {
 *   for (let i = 0; i < 5; ++i) {
 *     console.log(i, msg);
 *     yield;
 *   }
 * }
 * function* do5By5() {
 *   for (let i = 0; i < 5; ++i) {
 *     yield* do5();
 *   }
 * }
 *
 * const runner = new CoroutineRunner();
 * runner.add(do5by5());
 * setInterval(() => runner.update(), 1000);
 * ```
 *
 * yielding a generator starts executing that generator until it finishes
 * runner.add adds the next step to the current sequence. In other words
 *
 * ```
 * runner.add(do5('foo'))
 * runner.add(do5('bar'))
 * ```
 *
 * Will print foo 5 times followed by bar 5 times
 *
 *
 */
class CoroutineRunner {
  #generatorStacks = [];
  #addQueue = [];
  #removeQueue = new Set();
  #manager = undefined;

  constructor(manager) {
    this.#manager = manager;
  }
  isBusy() {
    return this.#addQueue.length + this.#generatorStacks.length > 0;
  }
  add(generator) {
    const genStack = [generator];
    this.#addQueue.push(genStack);
  }
  remove(generator) {
    this.removeQueue.add(generator);
  }
  reset() {
    this.#generatorStacks.length = 0;
    this.#addQueue.length = 0;
    this.#removeQueue.clear();
  }
  update() {
    this.#addQueued();
    this.#removeQueued();
    for (const genStack of this.#generatorStacks) {
      const main = genStack[0];
      // Handle if one coroutine removes another
      if (this.#removeQueue.has(main)) {
        continue;
      }
      while (genStack.length) {
        const topGen = genStack[genStack.length - 1];
        const {value, done} = topGen.next();
        if (done) {
          if (genStack.length === 1) {
            this.#removeQueue.add(topGen);
            break;
          }
          genStack.pop();
        } else if (value) {
          genStack.push(value);
        } else {
          break;
        }
      }
    }
    this.#removeQueued();
  }
  #addQueued() {
    if (this.#addQueue.length) {
      this.#generatorStacks.splice(this.#generatorStacks.length, 0, ...this.#addQueue);
      this.#addQueue = [];
    }
  }
  #removeQueued() {
    if (this.#removeQueue.size) {
      this.#generatorStacks = this.#generatorStacks.filter(genStack => !this.#removeQueue.has(genStack[0]));
      this.#removeQueue.clear();
    }
  }
}

const getTransformToElement = (toElement, fromElement) =>
    toElement.getScreenCTM().inverse().multiply(fromElement.getScreenCTM());

const getBinPosition = (draw, bin, size) => {
  const toInvocation = getTransformToElement(draw.node, bin.group.node);
  const p = new DOMPoint(size / 2, size / 2).matrixTransform(toInvocation);
  return [p.x, p.y];
};

const updateColorScheme = () => {
  //const isDarkMode = darkMatcher.matches;
  //colorScheme = isDarkMode ? darkColors : lightColors;
  //hLine.stroke(colorScheme.main);
  //vLine.stroke(colorScheme.main);
  //marker.fill(colorScheme.main);
  //pointOuter.stroke(colorScheme.main);
  //pointInner.fill(colorScheme.point);
};
updateColorScheme();

function makeComputeDiagram(elem, {
  type,
  kWaveSize,
  chunksAcross,
  chunksDown,
  showImage,
  numWorkgroups,
  hasWorkgroupMem,
  useImageData,
  hideUI,
  workGroupsLabel = 'workgroups',
  bottomLabel = 'bins',
  numLinesVisible,
  showColorBin = true,
  code = '',
}) {
  const diagramDiv = el('div');
  const uiDiv = el('div');
  const div = el('div', {}, [diagramDiv, uiDiv]);
  elem.appendChild(div);

  let deltaTime = 0;
  let speed = 1;
  let playing = true;

  const speeds = [0.25, 0.5, 1, 2, 4, 16, 32];

  const lines = (() => {
    const leadRE = /^ */;
    const lines = code.split('\n').filter(v => v.trim().length > 0);
    const shortestPadding = lines.reduce((min, line) => Math.min(min, leadRE.exec(line)[0].length), Number.MAX_SAFE_INTEGER);
    return lines.map(line => line.substring(shortestPadding));
  })();
  const numCodeLines = Math.max(1, lines.length);
  numLinesVisible = numLinesVisible || numCodeLines;

  let diagram = createComputeDiagram();

  const reset = () => {
    deltaTime = 0;
    diagram.close();
    diagram = createComputeDiagram();
  };
  const playPause = function() {
    playing = !playing;
    const play = this.querySelector('[data-id=play]');
    const pause = this.querySelector('[data-id=pause]');
    play.style.display = playing ? 'none' : '';
    pause.style.display = playing ? '' : 'none';
  };

  if (!hideUI) {
    uiDiv.appendChild(el('div', { className: 'ui'}, [
      el('button', {type: 'button', onClick: reset }, [el('img', {src: '/webgpu/lessons/resources/rewind.svg'})]),
      el('button', {type: 'button', onClick: playPause }, [
        el('img', { dataset: {id: 'pause'}, src: '/webgpu/lessons/resources/pause.svg'}),
        el('img', { style: { display: 'none' }, dataset: {id: 'play'}, src: '/webgpu/lessons/resources/play.svg'}),
      ]),
      select('', ['¼x', '½x', '1x', '2x', '4x', '16x', '32x'], 2, function(ndx) {
        speed = speeds[ndx];
      }),
    ]));
  }

  let then = 0;
  const update = (now) => {
    now *= 0.001;
    deltaTime = Math.min(0.1, now - then);
    then = now;
    diagram.update();
  };
  createRequestAnimationFrameLoop(diagramDiv, update);

  function createComputeDiagram() {
    const size = 20;

    const numChunks = chunksAcross * chunksDown;
    const pixelsAcross = image[0].length;
    const pixelsDown = image.length;
    const imageWidthH = pixelsAcross * size;
    const imageWidth = showImage ? imageWidthH : 0;
    const imageHeight = showImage ? pixelsDown * size : 0;
    const kChunksDrawWidth = chunksAcross * size;
    const kChunkDrawHeight = size * 3.5;
    const imgPlusChunksDrawWidth = imageWidth + kChunksDrawWidth + (chunksAcross - 1) * size * 0 + size * 2.5;
    const kInvocationWidth = numWorkgroups > 2 ? 4 : 7;
    const kInvocationHeight = 1.25 + (numLinesVisible * 0.4 + 0.6);
    const kInvocationDrawWidth = size * (kInvocationWidth + (hasWorkgroupMem ? 0 : 1.5));
    const kInvocationDrawHeight = size * kInvocationHeight;
    const kWorkgroupY = size * 1.5;
    const kWorkgroupDrawWidth = kInvocationDrawWidth + size * (hasWorkgroupMem ? 2 : 0.5);
    const kWorkgroupDrawHeight = size * (kWaveSize * kInvocationHeight + 0.25);
    const drawingWidth = imageWidthH + size * 20;
    const drawingHeight = showImage
        ? imageHeight + size * 3 + kWorkgroupDrawHeight
        : kWorkgroupDrawHeight + size * 3 + chunksDown * kChunkDrawHeight + (chunksDown - 1) * size * 0.25;
    const imgX = drawingWidth / 2 - imgPlusChunksDrawWidth / 2;
    const imgY = kWorkgroupY + kWorkgroupDrawHeight + (showImage ? size * 0.5 : 0);
    const kChunksDrawX = showImage
      ? imgX + imageWidth + size * 2.5
      : drawingWidth / 2 - kChunksDrawWidth / 2;

    const coMgr = new CoroutineManager();

    function* lerpStep(fn, duration = 1) {
      let time = 0;
      for (let t = 0; t < 1;) {
        time += deltaTime * speed * (playing ? 1 : 0);
        t = (coMgr.isSeeking || duration <= 0) ? 1 : clamp01(time / duration);
        fn(t, t === 1);
        if (t < 1) {
          yield;
        }
      }
    }

    function* waitSeconds(duration) {
      yield lerpStep(_ => _, duration);
    }

    // function* scrollText(instructionGroup, instructions, text, duration = 0.5) {
    //   instructions[1].text(text);
    //   yield lerpStep(t => {
    //     const y = lerp(0, -8, sineOut(t));
    //     instructionGroup.transform({translateY: y});
    //   }, duration);
    //   instructions[0].text(text);
    //   instructions[1].text('');
    //   instructionGroup.transform({translateY: 0});
    // }

    function* goToLine(instructionsGroup, prgCursor, lineNo, duration = 0.5) {
      prgCursor.show();
      const sy = prgCursor.transform().translateY;
      const ey = lineNo * 0.4 * size + 1.8;
      const groupSY = instructionsGroup.transform().translateY;
      const groupEY = Math.min(0, -(lineNo - (numLinesVisible - 1)) * 0.4 * size);
      yield lerpStep(t => {
        const y = lerp(sy, ey, sineOut(t));
        prgCursor.transform({translateY: y});
        const groupY = lerp(groupSY, groupEY, sineOut(t));
        instructionsGroup.transform({translateY: groupY});
      }, duration);
      yield waitSeconds(0.25);
    }

    function* advanceLine(instructionsGroup, prgCursor, duration = 0.5) {
      const sy = prgCursor.transform().translateY;
      const lineNo = Math.round((sy - 1.8) / 0.4 / size);
      yield goToLine(instructionsGroup, prgCursor, lineNo + 1, duration);
    }

    // [-]
    // [-]
    // [-]
    function createInvocation(draw, size, id) {
      const group = draw.group().font({
        family: 'monospace',
        weight: 'bold',
        size: '6',
      });
      const kWidth = kInvocationDrawWidth;
      group.rect(kWidth, size * (1 + 0.4 * numLinesVisible + 0.6)).fill('#444').stroke('#000');
      group.rect(kWidth, size * 0.5).fill('#888');
      const header = group.rect(kWidth, size * 0.5).fill('#888').hide();
      const idText = group.text('').translate(2, size * 0.35);
      const codeGroup = group.group().translate(0, size * 0.5);
      codeGroup.rect(kWidth, size * (0.4 * numLinesVisible + 0.1)).fill('#ccc');
      const maskGroup = codeGroup.group();
      const instructionsGroup = maskGroup.group();
      const prgCursor = instructionsGroup.rect(kWidth, size * 0.35).transform({
        translateX: 0,
        translateY: 1.8,
      }).fill('rgba(200, 0, 255, 0.33)');
      instructionsGroup.font({
        family: 'monospace',
        weight: 'bold',
        size: '6',
      });
      const instructions = range(numCodeLines, i => instructionsGroup.text(lines[i] || '').move(2, 1.8 + i * size * 0.4).css({'white-space': 'pre'}));
      const mask = codeGroup.rect(kWidth, size * (0.4 * numLinesVisible + 0.1)).fill('#fff');
      maskGroup.maskWith(mask);
      const belowCodeLinesY = numLinesVisible * size * 0.4 + size * 0.5;

      const color = group.group().transform({translate: [kWidth / 2 - size * 1, belowCodeLinesY + size * 0.625]}).rect(size / 2, size / 2).center(0, 0).stroke({color: '#000', width: 0.5});
      const bin = group.group().transform({translate: [kWidth / 2 + size * 1, belowCodeLinesY + size * 0.625]}).circle(size / 2).center(0, 0).stroke({color: '#000', width: 0.5});
      const text = makeText(group, '0').font({anchor: 'middle', size: '8'});
      //group.text(id).font({
      //  family: 'monospace',
      //  weight: 'bold',
      //  size: '8',
      //}).move(0, -2).fill('rgba(0, 0, 0, 0.5)');
      if (!showColorBin) {
        bin.hide();
        color.hide();
      }
      setTranslation(text, kWidth / 2 + size * 0, belowCodeLinesY + size * (0.75));
      const lock = group
          .polygon([[0, 0], [1, 0], [1, 1], [0, 1]])
          .move(size, belowCodeLinesY + size * 0.25)
          .fill(hsl(1 / 12 + id * 0.1, 0.7, lerp(0.4, 0.8, id / 2)))
          .stroke({width: 0.5})
          .hide();
      const lockStop = group.image('/webgpu/lessons/resources/stop.svg').size(size, size).move((kWidth - size) / 2, belowCodeLinesY + size * 0.125).hide();
      const barrier = group.image('/webgpu/lessons/resources/barrier.svg').size(size, size).move((kWidth - size) / 2, belowCodeLinesY + size * 0.125).hide();
      const fetchHandle = group.group().transform({translateX: kWidth / 2, translateY: belowCodeLinesY + size * 0.75});
      const plus = group.group();
      plus.rect(size / 6, size / 2).center(kWidth / 2, belowCodeLinesY + size * 0.625);
      plus.rect(size / 2, size / 6).center(kWidth / 2, belowCodeLinesY + size * 0.625);
      plus.hide();
      const inv = {
        group,
        color,
        bin,
        text,
        fetchHandle,
        header,
        lock,
        lockStop,
        barrier,
        plus,
        idText,
        setInstructions: (text, duration = 0.5) => setInstructions(instructionsGroup, instructions, text, duration),
        goToLine: (lineNo, duration = 0.5) => goToLine(instructionsGroup, prgCursor, lineNo, duration),
        resetLine: () => {
          instructionsGroup.transform({translateY: 0});
          prgCursor.transform({translateY: 1.8});
        },
        hideLine: () => {
          prgCursor.hide();
          prgCursor.transform({translateY: 1.8});
        },
        advanceLine: (duration = 0.5) => advanceLine(instructionsGroup, prgCursor, duration),
        reset: () => {
          instructions.forEach(i => i.text('-'));
          lock.hide();
          lockStop.hide();
          inv.lockLine.hide();
          barrier.hide();
          plus.hide();
        },
      };
      return inv;
    }

    function* setInstructions(/*instructionGroup, instructions, text, duration*/) {
      coMgr.addStep();
      //yield scrollText(instructionGroup, instructions, text, duration);
    }

    function createWorkgroup(draw, size, lockColor) {
      const group = draw.group();
      group.rect(kWorkgroupDrawWidth, kWorkgroupDrawHeight).move(size * 0, size * -0.25).fill('#555');
      const invocations = [];
      for (let i = 0; i < kWaveSize; ++i) {
        const invocation = createInvocation(group, size, i);
        invocation.group.transform({translateX: size * 0.25, translateY: i * kInvocationDrawHeight});
        invocations.push(invocation);
      }
      // need to create lockLine after so it's not masked by invocations
      for (const invocation of invocations) {
        invocation.lockLine = group
            .line(0, 0, 1, 1)
            .stroke({color: 'red', width: size / 4})
            .hide();

      }
      const workgroup = {
        group,
        invocations,
      };
      if (hasWorkgroupMem) {
        const chunk = createChunk(group, size, lockColor);
        chunk.group.transform({translate: [size * (kInvocationWidth + 0.75), kWorkgroupDrawHeight / 2 - kChunkDrawHeight / 2]});
        workgroup.chunk = chunk;
      }
      return workgroup;
    }

    function createLabel(draw, text) {
      return draw.text(text)
        .font({
          family: 'monospace',
          weight: 'bold',
          size: '10',
          anchor: 'middle',
        })
        .attr({
          class: 'svg-main-text-color-fill',
          'dominant-baseline': 'central',
        });
    }

    const draw = svg().addTo(diagramDiv).viewbox(0, 0, drawingWidth, drawingHeight).css({whiteSpace: 'pre'});

    //const oMarker = draw.marker(size + 2, size + 2, function(add) {
    //  add.circle(size).fill('none').stroke(/*colorScheme.main*/'rgba(255, 255, 255, 0.25)').attr({orient: 'auto'});
    //});

    const lockGradient = draw.gradient('linear', function(add) {
      add.stop(0, '#fd0');
      add.stop(0.3, '#f80');
      add.stop(1, '#640');
    }).from(0, 0).to(0.5, 1);

    if (showImage) {
      const img = createImage(draw, image, size);
      img.group.transform({translateX: imgX, translateY: imgY});
      setTranslation(createLabel(draw, 'texture'), imgX + imageWidth / 2, imageHeight + imgY + size * 0.5);
    }

    setTranslation(
        createLabel(draw, bottomLabel),
        kChunksDrawX + kChunksDrawWidth / 2,
        showImage
          ? imageHeight + imgY + size * 0.5
          : imgY + kChunkDrawHeight * chunksDown + size * 0.5);

    const chunks = [];
    const chunkStorage = [];
    for (let i = 0; i < numChunks; ++i) {
      const x = i % (numChunks / 2);
      const y = chunksDown > 1 ? (i / (numChunks / 2) | 0) : 0.5;
      const chunk = createChunk(draw, size, lockGradient);
      chunk.group.transform({
        translateX: kChunksDrawX + x * size,
        translateY: imgY + size * 0.25 + kChunkDrawHeight * y,
      });
      chunks.push(chunk);
      chunkStorage.push(new Array(kBins).fill(0));
      if (useImageData) {
        const chunkData = imgChunkData[i];
        chunkData.forEach((v, ndx) => chunk.bins[ndx].text.text(v));
      }
    }

    setTranslation(createLabel(draw, workGroupsLabel), drawingWidth / 2, size * 0.5);
    const workGroups = [];
    for (let i = 0; i < numWorkgroups; ++i) {
      const workGroup = createWorkgroup(draw, size, lockGradient);
      const fullWidth = kWorkgroupDrawWidth * numWorkgroups + size * (numWorkgroups - 1) * 0.5;
      const x = (kWorkgroupDrawWidth + size * 0.5) * i;
      workGroup.group.transform({translateX: drawingWidth / 2 - fullWidth / 2 + x, translateY: kWorkgroupY});
      workGroups.push(workGroup);
    }

    // draw.rect(kWorkgroupDrawWidth, 8).move(drawingWidth / 2, 10).fill('green');
    // draw.rect(4, 20).move(drawingWidth / 2 - 2, 0).fill('orange');
    // draw.rect(drawingWidth - 4, 4).move(2, 0).fill('pink');

    function getChunkInfo(chunkNdx, binNdx) {
      const chunk = chunks[chunkNdx];
      const chunkBin = chunk.bins[binNdx];
      const chunkBinPosition = getBinPosition(draw, chunkBin, size);
      const chunkValue = parseInt(chunkBin.text.text());
      return {
        chunk,
        chunkBin,
        chunkBinPosition,
        chunkValue,
      };
    }

    const workForWorkgroups = [];
    const storageBinLocked = new Array(numBins).fill(0);
    let activeWorkgroupCount = 0;
    let uniformStride = 0;

    workGroups.forEach((workgroup/*, workgroupId*/) => {
      const workForCores = [];
      const workgroupStorage = new Array(kWaveSize).fill(0);
      let activeInvocationCount = 0;
      const workgroupBinLocked = new Array(workgroup.invocations.length).fill(false);
      let workgroupBarrierCount = 0;

      function* workgroupBarrier() {
        ++workgroupBarrierCount;
        while (workgroupBarrierCount !== workgroup.invocations.length) {
          yield;
        }
        yield;  // need to wait for all invocations to exit loop
        yield waitSeconds(0.25);
        --workgroupBarrierCount;
      }

      workgroup.invocations.map((invocation/*, id*/) => {
        const toInvocation = getTransformToElement(draw.node, invocation.fetchHandle.node);
        const toColor = getTransformToElement(draw.node, invocation.color.node);
        //const toBin = getTransformToElement(draw.node, invocation.bin.node);
        const toText = getTransformToElement(draw.node, invocation.text.node);
        const invPoint = new DOMPoint(0, 0).matrixTransform(toInvocation);
        // why doesn't this work?
        const colorPoint = new DOMPoint(0, 0).matrixTransform(toColor);
        const numPoint = new DOMPoint(0, 0).matrixTransform(toText);
        //const binPoint = new DOMPoint(0, 0).matrixTransform(toBin);

        const ig = draw.group();
        const sx = invPoint.x;
        const sy = invPoint.y;
        const numX = numPoint.x;
        const numY = numPoint.y - 3;
        const colX = colorPoint.x;
        const colY = colorPoint.y;
        //const binX = binPoint.x;
        //const binY = binPoint.y;

        let ex = sx;
        let ey = sy;

        //let markerCircle;
        //const oMarker = draw.marker(size + 2, size + 2, function(add) {
        //  markerCircle = add.circle(size).fill('none').stroke(/*colorScheme.main*/'rgba(255, 255, 255, 0.25)').attr({orient: 'auto'});
        //});

        const line = ig.line(sx, sy, ex, ey)
          .stroke(/*colorScheme.main*/'rgba(255, 255, 255, 0.5)')
        //  .marker('end', oMarker)
          .hide();
        line.node.style.mixBlendMode = 'difference';
        const targetGroup = ig.group();
        const rect = targetGroup.rect(10, 10).center(0, 0).fill('#ff0').stroke({color: '#000', width: 0.5}).hide();
        const text = makeText(targetGroup, '').font({anchor: 'middle'});
        const circle = targetGroup.circle(size).center(0, 0).fill('none').stroke(/*colorScheme.main*/'rgba(255, 255, 255, 0.5)').hide();
        circle.node.style.mixBlendMode = 'difference';
        text.attr({cx: 0, cy: 0, 'dominant-baseline': 'central'});
        targetGroup.transform({translate: colorPoint});

        function* goto(targetX, targetY, startX, startY, initialX, initialY) {
          line.show();
          circle.show();
          if (initialY !== undefined) {
            ex = initialX;
            ey = initialY;
          }
          yield lerpStep(t => {
            const x = lerp(ex, targetX, t);
            const y = lerp(ey, targetY, t);
            line.plot(startX, startY, x, y);
            targetGroup.transform({translate: [x, y]});
          }, 1);
          yield waitSeconds(0.25);
          ex = targetX;
          ey = targetY;
        }

        function* fadeLine() {
          ex = sx;
          ey = sy;
          yield lerpStep(t => {
            const color = rgba(255, 255, 255, (1 - t) * 0.25);
            line.stroke(color);
            circle.stroke(color);
          }, 0.5);
          line.hide();
          circle.hide();
          line.stroke(rgba(255, 255, 255, 0.25));
          circle.stroke(rgba(255, 255, 255, 0.25));
        }

        function* goUpScaleAndFade(group) {
          group.show();
          const translateY = group.transform().translateY;
          yield lerpStep(t => {
            group.fill(rgba(255, 255, 255, 1 - t)).transform({scale: 1 + t}); //, translateY: translateY - t * size / 2});
          });
          group.transform({translateY});
          group.hide();
        }

        function* fadeOut(group, duration = 0.5) {
          group.show();
          yield lerpStep(t => {
            group.fill(rgba(255, 255, 0, 1 - t));
          }, duration);
          group.hide();
        }

        function* textureLoad(tx, ty, texel) {
          yield invocation.setInstructions('textureLoad(...)');
          yield goto(imgX + (tx + 0.5) * size, imgY + (ty + 0.5) * size, colX, colY, colX, colY);
          const color = cssFromUnicodeColor[texel];
          rect.show();
          rect.fill(color);
          yield goto(colX, colY, colX, colY);
          invocation.color.fill(color);
          rect.hide();
        }

        function* doOne(tx, ty, useBarrier) {
          // read texture
          const texel = image[ty][tx];
          //const color = unicodeColorsToCSS[texel];
          yield invocation.advanceLine();
          yield textureLoad(tx, ty, texel);
          const binNdx = binNdxFromTexelColor[texel];
          const chunk = chunks[0];
          const storageBin = chunk.bins[binNdx];

          yield fadeLine();
          yield invocation.advanceLine();  // convert to luminance
          invocation.bin.fill(binNdxToBinColor[binNdx]);
          yield invocation.advanceLine();  // convert to bin

          if (useBarrier) {
            line.hide();
            circle.hide();

            // wait for bin to be free
            yield invocation.advanceLine();
            yield invocation.setInstructions('atomicAdd(&bin[color], 1)');
            invocation.lockStop.show();
            while (storageBinLocked[binNdx]) {
              yield;
            }
            invocation.lockStop.hide();

            // lock bin
            storageBinLocked[binNdx] = true;
            storageBin.lock.show();
            {
              const toInvocation = getTransformToElement(workgroup.group.node, storageBin.group.node);
              const toBin = getTransformToElement(workgroup.group.node, invocation.bin.node);
              const p2 = new DOMPoint(size / 2, size / 2).matrixTransform(toInvocation);
              const p1 = new DOMPoint(0, 0).matrixTransform(toBin);
              const color = binNdxToBinColor[binNdx];
              invocation.lockLine
                .show()
                .plot(p2.x, p2.y, p1.x, p1.y)
                .stroke(color)
                .css({
                  opacity: '0.75',
                });
            }
          } else {
            yield invocation.advanceLine();
            yield invocation.setInstructions('bin[color] += 1');
          }

          // get value for bin
          const chunkBin = chunk.bins[binNdx];
//                const toInvocation = getTransformToElement(invocation.group.node, chunkBin.group.node);
          const chunkBinPosition = getBinPosition(draw, chunkBin, size);
          yield goto(...chunkBinPosition, numX, numY);

          text.text(chunkBin.text.text());

          yield goto(numX, numY, numX, numY);
          invocation.text.text(text.text());
          text.text('');

          // inc
          invocation.text.text(parseInt(invocation.text.text()) + 1);
          yield goUpScaleAndFade(invocation.plus);

          // put in bin
          text.text(invocation.text.text());
          yield goto(...chunkBinPosition, numX, numY);
          chunkBin.text.text(text.text());
          text.text('');

          if (useBarrier) {
            storageBinLocked[binNdx] = false;
            storageBin.lock.hide();
            storageBin.lockText.hide();
            invocation.lockLine.hide();
          }

          yield fadeLine();
          invocation.color.fill('#888');
          invocation.text.text('');
          yield invocation.setInstructions('-');
        }

        function* reduceImpl({global_invocation_id, local_invocation_id}, numChunks, isReduce) {
          yield invocation.goToLine(0);
          invocation.text.text('0');
          yield invocation.advanceLine();
          if (isReduce) {
            yield invocation.advanceLine();
            yield invocation.advanceLine();
            yield invocation.advanceLine();
          }
          const baseChunkNdx = global_invocation_id.x * uniformStride * 2;
          for (let ndx = 0; ndx < numChunks; ++ndx) {
            if (!isReduce) {
              yield invocation.goToLine(2);
              yield invocation.advanceLine();
            }
            const chunkNdx = baseChunkNdx + ndx * uniformStride;
            yield invocation.setInstructions(`sum += chunks[${chunkNdx}][${local_invocation_id.x}]`);
            const { chunkBinPosition, chunkValue } = getChunkInfo(chunkNdx, local_invocation_id.x);
            yield goto(...chunkBinPosition, numX, numY);
            text.text(chunkValue);

            yield goto(numX, numY, numX, numY);
            text.text('');
            line.hide();
            circle.hide();

            const total = parseInt(invocation.text.text());
            invocation.text.text(total + chunkValue);
            yield goUpScaleAndFade(invocation.plus);
            if (!isReduce) {
              yield invocation.advanceLine();
            }
          }

          {
            text.text(invocation.text.text());
            yield invocation.advanceLine();
            yield invocation.setInstructions(`chunks[${baseChunkNdx}][${local_invocation_id.x}] = sum`);
            const { chunkBinPosition, chunkBin } = getChunkInfo(baseChunkNdx, local_invocation_id.x);
            yield goto(...chunkBinPosition, numX, numY);
            chunkBin.text.text(invocation.text.text());

            for (let ndx = 1; ndx < numChunks; ++ndx) {
              const chunkNdx = baseChunkNdx + ndx * uniformStride;
              const { chunkBin } = getChunkInfo(chunkNdx, local_invocation_id.x);
              chunkBin.cover.show();
            }

            text.text('');
            yield fadeLine();
          }
          yield invocation.setInstructions('-');
        }

        const shaders = {
          single: function*() {
            for (let ty = 0; ty < pixelsDown; ++ty) {
              yield invocation.goToLine(0);
              for (let tx = 0; tx < pixelsAcross; ++tx) {
                yield invocation.goToLine(1);
                yield invocation.advanceLine();
                yield doOne(tx, ty, false);
                yield invocation.advanceLine();
              }
            }
          },
          race: function*({global_invocation_id}) {
            yield invocation.goToLine(0);
            const tx = global_invocation_id.x;
            const ty = global_invocation_id.y;
            yield doOne(tx, ty, false);
            invocation.hideLine();
          },
          noRace: function*({global_invocation_id}) {
            const tx = global_invocation_id.x;
            const ty = global_invocation_id.y;
            yield doOne(tx, ty, true);
          },
          lockedBin: function*({global_invocation_id}) {
            yield invocation.setInstructions('atomicAdd(&histogram[bin], 1)', 0);
            const texel = kBins[2];
            const binNdx = binNdxFromTexelColor[texel];
            const color = binNdxToBinColor[binNdx];
            invocation.bin.fill(color);
            const chunk = chunks[0];
            const storageBin = chunk.bins[binNdx];
            switch (global_invocation_id.x) {
              case 0: {
                storageBin.lock.show();
                {
                  const toInvocation = getTransformToElement(workgroup.group.node, storageBin.group.node);
                  const toBin = getTransformToElement(workgroup.group.node, invocation.bin.node);
                  const p2 = new DOMPoint(size / 2, size / 2).matrixTransform(toInvocation);
                  const p1 = new DOMPoint(0, 0).matrixTransform(toBin);
                  invocation.lockLine
                    .show()
                    .plot(p2.x, p2.y, p1.x, p1.y)
                    .stroke(color)
                    .css({
                      opacity: '0.75',
                    });
                }
                break;
              }
              case 1:
                invocation.lockStop.show();
                break;
            }
          },
          chunks: function*({global_invocation_id, local_invocation_id}) {
            yield invocation.goToLine(0);
            yield invocation.advanceLine();
            workgroupStorage[local_invocation_id.x] = 0;
            workgroup.chunk.bins[local_invocation_id.x].text.text('0');

            const tx = global_invocation_id.x * kWaveSize + local_invocation_id.x;
            const ty = global_invocation_id.y;

            // read texture
            const texel = image[ty][tx];
            yield textureLoad(tx, ty, texel);
            yield invocation.advanceLine();
            const binNdx = binNdxFromTexelColor[texel];
            invocation.bin.fill(binNdxToBinColor[binNdx]);
            yield invocation.advanceLine();

            // wait for bin to be free
            yield invocation.advanceLine();
            yield invocation.setInstructions('atomicAdd(bin[color], 1)');
            invocation.lockStop.show();
            while (workgroupBinLocked[binNdx]) {
              yield;
            }
            invocation.lockStop.hide();

            // lock bin
            workgroupBinLocked[binNdx] = true;
            const workgroupBin = workgroup.chunk.bins[binNdx];
            const binPosition = getBinPosition(draw, workgroupBin, size);
            workgroupBin.lock.show();
            {
              const toInvocation = getTransformToElement(workgroup.group.node, workgroupBin.group.node);
              const toBin = getTransformToElement(workgroup.group.node, invocation.bin.node);
              const p2 = new DOMPoint(size / 2, size / 2).matrixTransform(toInvocation);
              const p1 = new DOMPoint(0, 0).matrixTransform(toBin);
              const color = binNdxToBinColor[binNdx];
              invocation.lockLine
                .show()
                .plot(p2.x, p2.y, p1.x, p1.y)
                .stroke(color)
                .css({
                  opacity: '0.75',
                });
            }

            // get bin value
            yield goto(...binPosition, numX, numY);
            const value = workgroupStorage[binNdx];
            text.text(value);
            yield goto(numX, numY, numX, numY);

            // store bin value
            text.text('');
            invocation.text.text(value);
            yield;
            // inc
            invocation.text.text(value + 1);
            text.text('');
            yield goUpScaleAndFade(invocation.plus);
            text.text(value + 1);
            yield goto(...binPosition, numX, numY);
            workgroupStorage[binNdx] = value + 1;
            workgroupBin.text.text(value + 1);
            text.text('');
            //yield goto(sx, sy, 0);
            yield fadeLine();

            // unlock bin
            workgroupBinLocked[binNdx] = false;
            workgroupBin.lock.hide();
            workgroupBin.lockText.hide();
            invocation.lockLine.hide();

            // wait for others
            invocation.color.fill('#888');
            invocation.barrier.show();
            yield invocation.setInstructions('wGroupBarrier');
            yield invocation.advanceLine();
            yield workgroupBarrier();
            invocation.barrier.hide();

            yield invocation.advanceLine();
            yield invocation.advanceLine();

            // copy bin to chunk
            yield invocation.advanceLine();
            yield invocation.setInstructions('chunks[bin]=');
            const srcBin = workgroup.chunk.bins[local_invocation_id.x];
            const srcBinPosition = getBinPosition(draw, srcBin, size);
            yield goto(...srcBinPosition, numX, numY);
            const binTotal = workgroupStorage[local_invocation_id.x];
            text.text(binTotal);
            yield goto(numX, numY, numX, numY);
            invocation.text.text(binTotal);

            const chunkAcross = (pixelsAcross / kWaveSize);
            const chunkNdx = global_invocation_id.x + global_invocation_id.y * chunkAcross;
            const chunk = chunks[chunkNdx];
            const chunkBin = chunk.bins[local_invocation_id.x];
            const chunkBinPosition = getBinPosition(draw, chunkBin, size);
            yield goto(...chunkBinPosition, numX, numY);
            chunkBin.text.text(binTotal);
            text.text('');
            //yield goto(sx, sy, 0);
            yield fadeLine();
            invocation.color.fill('#888');
            invocation.text.text('');
            yield invocation.setInstructions('-');
          },
          sum: function*(invocationIds) {
            yield reduceImpl(invocationIds, numChunks, false);
          },
          reduce: function*(invocationIds) {
            yield reduceImpl(invocationIds, 2, true);
          },
        };

        const runner = coMgr.createRunner();
        runner.add(function* doit() {
          for (;;) {
            while (workForCores.length === 0) {
              yield;
            }
            ++activeInvocationCount;
            const { global_invocation_id, local_invocation_id } = workForCores.shift();
            invocation.resetLine();
            invocation.idText.text(`wid(${global_invocation_id.x},${global_invocation_id.y},0) lid(${local_invocation_id.x},${local_invocation_id.y || 0},0)`);
            yield fadeOut(invocation.header);
            yield shaders[type]({global_invocation_id, local_invocation_id});
            --activeInvocationCount;
          }
        }());

        invocation.runner = runner;
      });

      const runner = coMgr.createRunner();
      runner.add(function* startInvocations() {
        for (;;) {
          while (workForWorkgroups.length === 0) {
            yield;
          }
          ++activeWorkgroupCount;
          const global_invocation_id = workForWorkgroups.shift();
          for (let i = 0; i < kWaveSize; ++i) {
            workForCores.push({global_invocation_id, local_invocation_id: {x: i}});
          }
          yield;
          while (activeInvocationCount > 0) {
            yield;
          }
          --activeWorkgroupCount;
        }
      }());
    });

    function dispatchWorkgroups(width, depth) {
      for (let y = 0; y < depth; ++y) {
        for (let x = 0; x < width; ++x) {
          workForWorkgroups.push({x, y});
        }
      }
    }

    function* waitForWorkgroups() {
      yield;
      while (activeWorkgroupCount > 0) {
        yield;
      }
      yield;
    }

    const dispatchers = {
      single: function*() {
        dispatchWorkgroups(1, 1);
      },
      race: function*() {
        dispatchWorkgroups(pixelsAcross, pixelsDown);
      },
      noRace: function*() {
        dispatchWorkgroups(pixelsAcross, pixelsDown);
      },
      lockedBin: function*() {
        dispatchWorkgroups(2, 1);
      },
      chunks: function*() {
        dispatchWorkgroups(pixelsAcross / kWaveSize, pixelsDown);
      },
      sum: function*() {
        uniformStride = 1;
        dispatchWorkgroups(1, 1);
      },
      reduce: function*() {
        let chunksLeft = numChunks;
        let i = 0;
        while (chunksLeft) {
          uniformStride = 2 ** i;
          ++i;
          const dispatchCount = Math.floor(chunksLeft / 2);
          chunksLeft -= dispatchCount;
          dispatchWorkgroups(dispatchCount, 1);
          yield waitForWorkgroups();
        }
      },
    };

    // None of this code makes any sense. Don't look at it as an example
    // of how the GPU actually runs.
    const runner = coMgr.createRunner();
    runner.add(function* dispatcher() {
      // make list of workgroup to dispatch
      yield dispatchers[type]();

      for (;;) {
        yield;
      }
    }());

    let closed = false;

    return {
      update() {
        if (!closed) {
          coMgr.update();
        }
      },
      close() {
        if (!closed) {
          closed = true;
          draw.node.remove();
        }
      },
    };
  }
}

renderDiagrams({
  /*
   +-----+
   |.....|
   |.....|
   |.....|
   +-----+
  */
  image(elem) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const width = image[0].length;
    const height = image.length;
    const size = 20;
    const totalWidth = width * size;
    const totalHeight = height * size;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, totalWidth, totalHeight);
    createImage(draw, image, size);
  },
  colors(elem) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', { className: 'data-table center'}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const addRow = makeTable(div, ['color', 'r', 'g', 'b']);
    const colors = Object.keys(binNdxFromTexelColor);
    for (const color of colors) {
      const cssColor = cssFromUnicodeColor[color];
      const data = rgba8unormFromCSS(cssColor);
      addRow([
        el('div', {className: 'color-cell', style: { backgroundColor: cssColor}}), data[0], data[1], data[2],
      ]);
    }
  },
  luminance(elem) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', { className: 'data-table center'}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const addRow = makeTable(div, ['color', 'r', 'g', 'b', 'luminance']);
    const colors = Object.keys(binNdxFromTexelColor);
    for (const color of colors) {
      const cssColor = cssFromUnicodeColor[color];
      const data = rgba8unormFromCSS(cssColor);
      const luminance = srgbLuminance(...data.map(v => v / 255));
      addRow([
        el('div', {className: 'color-cell', style: { backgroundColor: cssColor}}),
        data[0],
        data[1],
        data[2],
        el('div', { className: 'center-vertically'}, [
          el('div', {
            className: 'color-cell',
            style: {
              border: '1px solid black',
              backgroundColor: hsl(0, 0, luminance),
            },
          }),
          el('span', {
            textContent: luminance.toFixed(2),
            style: {
              marginLeft: '0.5em',
            },
          }),
        ]),
      ]);
    }
  },
  /*
   []
   []
   []
  */
 imageHistogram(elem) {
    const size = 20;
    const draw = svg().addTo(elem).viewbox(0, 0, size, size * 3);
    const chunk = createChunk(draw, size, 'red');
    const pixels = image.flat();
    kBins.forEach((color) => {
      const count = pixels.filter(v => v === color).length;
      const luminance = luminanceFromUnicodeColor(color);
      const bin = Math.min(kBins.length - 1, luminance * kBins.length | 0);
      chunk.bins[bin].text.text(count);
    });
 },
 imageHistogramGraph(elem) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const binWidth = 16;
    const countHeight = 2;
    const pixels = image.flat();
    const counts = kBins.slice().sort(sortByLuminance).map(color => {
      return pixels.filter(v => v === color).length;
    });
    const max = counts.reduce((a, b) => Math.max(a, b));
    const w = binWidth * kBins.length;
    const h = max * countHeight;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, w, h + binWidth);
    counts.forEach((count, i) => {
      const x = i * binWidth;
      draw.rect(binWidth, count * countHeight).move(x, h - count * countHeight).fill('#fff').stroke('#000');
      const bin = createBin(draw, hsl(0, 0, (i + 0.5) / counts.length), binWidth, 'none');
      bin.group.transform({translate: [x, h]});
      bin.text.text(count);
    });
 },
  /*
   [ | | ] [ | | ]
   [ | | ] [ | | ]

   +-----+
   |.....|          []
   |.....|          []
   |.....|          []
   +-----+
  */
  single(elem) {
    makeComputeDiagram(elem, {
      type: 'single',
      numWorkgroups: 1,
      kWaveSize: 1,
      hasWorkgroupMem: false,
      chunksAcross: 1,
      chunksDown: 1,
      showImage: true,
      workGroupsLabel: 'workgroup',
      code: `
        for (y = 0; y < size.y; y++) {
          for (x = 0; x < size.x; x++) {
            let position = vec2u(x, y);
            let color = texLoad(ourTex, position, 0);
            let v = srgbLuminance(color.rgb);
            let bin = min(u32(v * numBins), lastBinIndex);
            bins[bin] += 1;
          }
        }
      `,
    });
  },
  /*
   [ | | ] [ | | ]
   [ | | ] [ | | ]

   +-----+
   |.....|          []
   |.....|          []
   |.....|          []
   +-----+
  */
  race(elem) {
    makeComputeDiagram(elem, {
      type: 'race',
      numWorkgroups: 4,
      kWaveSize: 1,
      hasWorkgroupMem: false,
      chunksAcross: 1,
      chunksDown: 1,
      showImage: true,
      code: `
        let position = global_invocation_id.xy;
        let color = textureLoad(ourTexture, position, 0);
        let v = srgbLuminance(color.rgb);
        let bin = min(u32(v * numBins), lastBinIndex);
        histogram[bin] += 1;
      `,
    });
  },
  lockedBin(elem) {
    makeComputeDiagram(elem, {
      type: 'lockedBin',
      numWorkgroups: 2,
      kWaveSize: 1,
      hasWorkgroupMem: false,
      chunksAcross: 1,
      chunksDown: 1,
      showImage: false,
      hideUI: true,
      workGroupsLabel: '',
      bottomLabel: '',
      code: `
        atomicAdd(&bin[color], 1)
      `,
    });
  },
  /*
   [ | | ] [ | | ]
   [ | | ] [ | | ]

   +-----+
   |.....|          []
   |.....|          []
   |.....|          []
   +-----+
  */
  noRace(elem) {
    makeComputeDiagram(elem, {
      type: 'noRace',
      numWorkgroups: 4,
      kWaveSize: 1,
      hasWorkgroupMem: false,
      chunksAcross: 1,
      chunksDown: 1,
      showImage: true,
      code: `
        let position = global_invocation_id.xy;
        let color = textureLoad(ourTexture, position, 0);
        let v = srgbLuminance(color.rgb);
        let bin = min(u32(v * numBins), lastBinIndex);
        atomicAdd(&bins[bin], 1);
      `,
    });
  },
  /*
   [ | | ] [ | | ]
   [ | | ] [ | | ]

   +-----+
   |.....|          []
   |.....|          []
   |.....|          []
   +-----+

   [ | | ] [ | | ]
   [ | | ] [ | | ]

   [][][][][][][][][][]
   [][][][][][][][][][]
   [][][][][][][][][][]
  */
  chunks(elem) {
    makeComputeDiagram(elem, {
      type: 'chunks',
      numWorkgroups: 4,
      kWaveSize: 3,
      hasWorkgroupMem: true,
      chunksAcross: 7,
      chunksDown: 2,
      showImage: true,
      bottomLabel: 'chunks',
      workGroupsLabel: 'workgroups (3 invocations each)',
      numLinesVisible: 3,
      code: `
        xy = wid * chunkSize * lid;
        color = texLoad(ourTexture, xy)
        v = srgbLuminance(color.rgb);
        bin = min(u32(v * numBins), lastBinIndex);
        atomicAdd(&histogram[color], 1)
        wkBarrier();
        chunk = wid.y * chunksAcross + wid.x;
        bin = lid.y * chunkWidth + lid.x;
        chunks[chunk][bin] = atmcLoad(???)
      `,
    });
  },
  /*
    [][][][][][][][][][]
    [][][][][][][][][][]
    [][][][][][][][][][]
  */
  sum(elem) {
    makeComputeDiagram(elem, {
      type: 'sum',
      numWorkgroups: 1,
      hasWorkgroupMem: false,
      kWaveSize: 3,
      chunksAcross: 7,
      chunksDown: 2,
      showImage: false,
      useImageData: true,
      workGroupsLabel: 'single workgroup (3 invocations)',
      bottomLabel: 'chunks',
      showColorBin: false,
      code: `
        sum = 0
        bin = lid.x;
        for (chunk = 0; chunk < numChunks; ++chunk) {
          sum += chunks[chunk][bin]
        }
        chunks[0][bin] = sum;
      `,
    });
  },
  reduceDiagram(elem) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    /*

     0   1   2   3   4   5   6   7   8  9   10  11  12
     -------------------------------------------------------
     1   2   3   4   5   6   7   8   9  10  11  12  13   // 2
     3       7       11      15      19     23      13   // 4
     10              26              42             13   // 8
     36                              55                  // 16
     99                                                  // 32
    */
    const numbers = shuffle(range(13, i => i + 1));
    const unitsAcross = numbers.length * 2 - 1;
    const steps = 1 + Math.ceil(Math.log2(numbers.length));
    const size = 16;
    const strideSpace = size * 3.5;
    const unitsDown = steps * 2 - 1;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, size * (unitsAcross + 2) + strideSpace, unitsDown * 1.25 * size);
    const bins = draw.group().transform({translateX: size + strideSpace});

    const iMarker = bins.marker(16, 8, function(add) {
      add.polygon([0, 0, 8, 4, 0, 8]).fill('gray').attr({orient: 'auto'});
    });

    function drawCell(x, y, num, color) {
      const group = bins.group().transform({translate: [x, y]});
      group.rect(size, size).fill(color);
      makeText(group, num.toString()).font({anchor: 'middle'}).center(size / 2, size / 2);
      return group;
    }

    function drawCurvyArrow(x0, y0, x1, y1) {
      return bins.path([
        ['M', x0, y0],
        ['C',
          lerp(x0, x1, 0.2), lerp(y0, y1, 1),
          lerp(x0, x1, 0.8), lerp(y0, y1, -1),
          x1, y1,
        ],
      ].flat().join(' '));
    }

    function drawConnection(x2, y2, i, step, stride) {
      if (step > 0) {
        const x0 = x2;
        const y0 = (step - 1) * 2.5 * size;
        const x1 = x0 + stride * size;

        if (i + stride / 2 < numbers.length) {
          drawCurvyArrow(x0 + size * 0.5, y0 + size, x2 + size * 0.5, y2).fill('none').stroke('gray').marker('end', iMarker);
          drawCurvyArrow(x1 + size * 0.5, y0 + size, x2 + size * 0.8, y2).fill('none').stroke('gray').marker('end', iMarker);
        } else {
          drawCurvyArrow(x0 + size * 0.5, y0 + size, x2 + size * 0.5, y2).fill('none').stroke('gray').marker('end', iMarker);
        }
      }
    }

    for (let step = 0; step < steps; ++step) {
      const color = hsl(step / steps * 0.2, 0.7, 0.5);
      const stride = 2 ** step;
      const y2 = step * 2.5 * size;

      draw.text(`stride: ${stride}`).move(size, y2 - size / 3).font({
        family: 'monospace',
        size: '8',
      })
      .css({fill: 'var(--main-fg-color)'});

      for (let i = 0; i < numbers.length; ++i) {
        const onStride = i % stride === 0;
        const x2 = i * 2 * size;

        drawCell(x2, y2, numbers[i], onStride ? color : '#888').css(onStride ? {} : {opacity: 0.1});
        if (onStride) {
          drawConnection(x2, y2, i, step, stride);
          if (i % (stride * 2) === 0 && i + stride < numbers.length) {
            numbers[i] += numbers[i + stride];
          }
        }
     }
    }
  },
  reduce(elem) {
    makeComputeDiagram(elem, {
      type: 'reduce',
      numWorkgroups: 4,
      kWaveSize: 3,
      hasWorkgroupMem: false,
      chunksAcross: 7,
      chunksDown: 2,
      showImage: false,
      useImageData: true,
      bottomLabel: 'chunks',
      showColorBin: false,
      workGroupsLabel: 'workgroups (3 invocations each)',
      code: `
        sum = 0
        bin = lid.x;
        ch0 = wid.x * stride / 2;
        ch0 = ch0 + stride;
        sum += chunks[ch0][bin] + chunks[ch1][bin];
        chunks[ch0][bin] = sum;
      `,
    });
  },
  timings(elem) {
    const data = {
      cols: [       'machine',                             'js',     'single',  'pixel per workgroup', 'chunks + sum', 'chunks + reduce'],
      classNames: [ 'left',                                'right',  'right',   'right',               'right',        'right' ],
      rows: [
                  [ 'M1 Mac',                              '3ms',    '768ms',   '3.2ms',               '11.2ms',       '0.9ms'  ],
                  [ 'AMD Radeon Pro 5300M+2.6GHz i7',      '39ms',  '1492ms',   '10.3ms',              '12.5ms',       '2.6ms'  ],
                  [ 'Intel UHD Graphics 630+2.6GHz i7',    '39ms',   '737ms',   '29.0ms',              '6.6ms',        '10.7ms' ],
                  [ 'NVidia 2070 Super+AMD 3900XT 3.8Ghz', '19ms',   '365ms',   '4.4ms',               '1.7ms',        '0.8ms'  ],
      ],
    };
    const addRow = makeTable(elem, data.cols);
    data.rows.forEach(row => addRow(zip(data.classNames, row)));
  },
  timings4ch(elem) {
    const data = {
      cols: [       'machine',                             'js',     'single',  'pixel per workgroup', 'chunks + sum', 'chunks + reduce'],
      classNames: [ 'left',                                'right',  'right',   'right',               'right',        'right' ],
      rows: [
                  [ 'M1 Mac',                              '43ms',   '768ms',   '3.2ms',               '11.2ms',       '0.9ms'  ],
                  [ 'AMD Radeon Pro 5300M+2.6GHz i7',      '39ms',  '3500ms',   '13.0ms',              '12.5ms',       '2.6ms'  ],
                  [ 'Intel UHD Graphics 630+2.6GHz i7',    '39ms',  '2978ms',   '31.0ms',              '12.5ms',       '11.7ms' ],
                  [ 'NVidia 2070 Super+AMD 3900XT 3.8Ghz', '73ms',   '910ms',   '20.6ms',               '2.8ms',        '0.8ms' ],
      ],
    };
    const addRow = makeTable(elem, data.cols);
    data.rows.forEach(row => addRow(zip(data.classNames, row)));
  },
});
