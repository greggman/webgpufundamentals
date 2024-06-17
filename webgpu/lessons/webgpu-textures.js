import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';
import {
  rgba8unormFromCSS,
  hsl,
  clamp,
  clamp01,
  euclideanModulo,
} from './resources/utils.js';
import {
  createElem as el, radio, checkbox, makeTable,
} from './resources/elem.js';
import {
  generateMips,
} from './resources/generate-mips-cpu.js';
import {
  kDepthStencilFormats,
  kRegularTextureFormats,
  kTextureFormatInfo,
} from './resources/capabilities-info.js';

const rgba8unorm = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a / 255})`;
const lerp = (a, b, t) => a + (b - a) * t;
const lerpArray = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const f2 = v => v.toFixed(2);
const setTranslation = (e, x, y) => e.attr({transform: `translate(${x}, ${y})`});

function addMipmap(elem, mips, pixelSize) {
  elem.appendChild(
    el(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          textAlign: 'center',
          alignItems: 'end',
        },
      },
      mips.map(({width, height, data}) => {
        const canvas = el('canvas', {
          width,
          height,
          class: 'nearest-neighbor-like',
          style: {
            margin: '1em',
            width: `${width * pixelSize}px`,
            height: `${height * pixelSize}px`,
          },
        });
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(width, height);
        imageData.data.set(data);
        ctx.putImageData(imageData, 0, 0);
        return el('div', {}, [
          canvas,
          el('div', {textContent: `${width}x${height}`}),
        ]);
      }),
    )
  );
}

function addMips(elem, textureData, width, pixelSize) {
  addMipmap(elem, generateMips(textureData, width), pixelSize);
}

function addTextureTable(elem, spec, formats) {
  const addRow = makeTable(elem, Object.values(spec).map(v => v.label));
  for (const format of formats) {
    const values = Object.entries(spec).map(([k /*, field */]) => {
      return k === 'key' ? format : kTextureFormatInfo[format][k];
    });
    addRow(values);
  }
}

renderDiagrams({
  'linear-interpolation': (elem) => {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const texelSize = 100;
    const tw = 4;
    const th = 4;
    const hSize = texelSize / 2;
    const w = tw * texelSize;
    const h = th * texelSize;
    const totalWidth = w + 100;
    const totalHeight = h + 180;
    const pixelsOffX = 50;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, totalWidth, totalHeight);
    draw.css({cursor: 'pointer'});
    const repeat = [true, true];

    const marker = draw.marker(20, 8, function(add) {
      add.polygon([0, 0, 10, 4, 0, 8]).fill('#000').attr({orient: 'auto'});
    });
    const marker2 = draw.marker(40, 16, function(add) {
      add.polygon([0, 0, 20, 8, 0, 16]).addClass('svg-main-text-color-fill').attr({orient: 'auto'});
    });

    const makeText = (parent, t) => {
      return parent.text(t)
        .font({
          family: 'monospace',
          weight: 'bold',
          size: '14',
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

    const colors = [];
    const numHues = tw * (th - 1);
    for (let h = 0; h < numHues; ++h) {
      colors.push(rgba8unormFromCSS(hsl(h / numHues, 1, 0.5)));
    }
    for (let v = 0; v < tw; ++v) {
      colors.push(rgba8unormFromCSS(hsl(0, 0, v / (tw - 1))));
    }

    const mask = draw.rect(w, h).move(pixelsOffX, 0).fill('#fff');

    const bg = draw.group();
    colors.forEach((color, i) => {
      const x = (i % tw) * texelSize;
      const y = (i / tw | 0) * texelSize;
      bg.rect(texelSize, texelSize).fill(rgba8unorm(...color)).move(x, y);
      bg.circle(5).fill('#fff').center(x + hSize, y + hSize).css({'mix-blend-mode': 'difference'});
    });
    bg.move(pixelsOffX, 0);

    const point = draw.group();
    //point.line([-10, 0, 10, 0]).stroke({color: '#000', width: '2'});
    //point.line([0, -10, 0, 10]).stroke({color: '#000', width: '2'});
    const texCoordGroup = point.group();
    const texCoord = makeText(texCoordGroup, 'aa');

    const sampleSize = 32;
    const samplesTop = th * texelSize + 20;

    const makeMix = function() {
      const spacing = 5;
      const mg = draw.group();
      mg.text('= mix(').move(0, 0).attr({
        'dominant-baseline': 'middle',
      }).addClass('svg-main-text-color-fill');
      const inColor0 = mg.rect(sampleSize, sampleSize).fill('#000').stroke('#000');
      inColor0.move(mg.bbox().width + spacing);
      mg.text(',').move(mg.bbox().width + spacing, 0).attr({
        'dominant-baseline': 'middle',
      }).addClass('svg-main-text-color-fill');
      const inColor1 = mg.rect(sampleSize, sampleSize).fill('#000').stroke('#000');
      inColor1.move(mg.bbox().width + spacing);
      const mixAmount = mg.text(', t1(0))').move(mg.bbox().width + spacing, 0).attr({
        'dominant-baseline': 'middle',
      }).addClass('svg-main-text-color-fill');
      return {
        group: mg,
        inColor0,
        inColor1,
        mixAmount,
      };
    };

    const mixXOff = 240;
    const mix0 = makeMix();
    mix0.group.move(mixXOff, samplesTop);
    const mix1 = makeMix();
    mix1.group.move(mixXOff, samplesTop + 40);
    const texels = [mix0.inColor0, mix0.inColor1, mix1.inColor0, mix1.inColor1];

    const resultY = samplesTop + 100;
    draw.text('result').move(0, resultY).attr({
      'dominant-baseline': 'middle',
    }).addClass('svg-main-text-color-fill');
    const result = draw.rect(sampleSize, sampleSize).fill('#000').stroke('#000');
    result.move(50, resultY);
    const mixF = makeMix();
    mixF.group.move(result.bbox().x2 + 5, resultY);

    const makeArrow = (a, b) => {
      const b0 = a.bbox();
      const b1 = b.bbox();
      const arrow = draw.path(`M${b0.x - 5},${b0.cy} C${b1.cx},${b0.cy} ${b1.cx},${b0.cy} ${b1.cx},${b1.y}`)
        .fill('none')
        .addClass('svg-main-text-color-stroke');
      arrow.marker('end', marker2);
      return arrow;
    };

    makeArrow(mix0.group, mixF.inColor0);
    makeArrow(mix1.group, mixF.inColor1);

    const numPoints = 4;
    const infos = [];
    const boxes = [];
    for (let i = 0; i < numPoints; ++i) {
      const texel = texels[i];
      const line = draw
        .line(10, 10 + i * 10, texel.cx(), texel.cy())
        .stroke({color: '#000', width: 1})
        .css({
          opacity: 0.25,
          filter: `
            drop-shadow(-0.5px  0px 0px #fff) 
            drop-shadow( 0.5px  0px 0px #fff) 
            drop-shadow( 0px -0.5px 0px #fff)
            drop-shadow( 0px  0.5px 0px #fff)
          `,});
      line.marker('end', marker);

      infos.push({ line, texel });

      boxes.push(
        bg.rect(texelSize, texelSize)
          .fill('none')
          .stroke({color: '#ffffff80', width: 1})
          .css({'mix-blend-mode': 'difference'})
      );
    }

    const t1Line = bg.group();
    t1Line.line(0, 0, 0, texelSize).stroke('#000').css({
      filter: `
        drop-shadow(-1px  0px 0px #fff)
        drop-shadow( 1px  0px 0px #fff)
      `,
    });
    const t1Text = makeText(draw, 't1').font({anchor: 'middle'});
    const t2Line = bg.group();
    t2Line.line(0, 0, texelSize, 0).stroke('#000').css({
      filter: `
        drop-shadow( 0px -1px 0px #fff)
        drop-shadow( 0px  1px 0px #fff)
      `,
    });
    const t2Text = makeText(draw, 't2');

    bg.clipWith(mask);

    const size = [tw, th];
    const clampOrRepeat = (ndx, v) => {
      const s = size[ndx];
      return repeat[ndx] ? v : clamp(v, 0.5 / s, 1 - 0.5 / s);
    };

    uiDiv.appendChild(el('div', {}, [
      radio('addressModeU', ['repeat', 'clamp-to-edge'], 'repeat', v => {
        repeat[0] = v === 'repeat';
        update();
      }),
      radio('addressModeV', ['repeat', 'clamp-to-edge'], 'repeat', v => {
        repeat[1] = v === 'repeat';
        update();
      }),
    ]));

    let mouseX = texelSize * 1.3;
    let mouseY = texelSize * 1.4;

    function onMove(e) {
      e.preventDefault();

      mouseX = e.offsetX * totalWidth / draw.node.clientWidth - 50;
      mouseY = e.offsetY * totalHeight / draw.node.clientHeight;

      update();
    }

    function update() {
      const u = clampOrRepeat(0, clamp01(mouseX / (texelSize * tw)));
      const v = clampOrRepeat(1, clamp01(mouseY / (texelSize * th)));

      setTranslation(point, pixelsOffX + u * texelSize * tw, v * texelSize * th);

      const t1 = euclideanModulo(u * tw + 0.5, 1);
      const t2 = euclideanModulo(v * th + 0.5, 1);
      mix0.mixAmount.plain(`, t1(${f2(t1)}))`);
      mix1.mixAmount.plain(`, t1(${f2(t1)}))`);
      mixF.mixAmount.plain(`, t2(${f2(t2)}))`);

      texCoord.plain(`uv:${f2(u)},${f2(v)}`);
      setTranslation(
        texCoord,
        u < 0.75 ? 10 : -110,
        v < 0.25 ? 50 : -10,
      );
      t1Text.plain(`t1:${f2(t1)}`);
      t2Text.plain(`t2:${f2(t2)}`);

      const tx = euclideanModulo(u * tw - 0.5, tw) | 0;
      const ty = euclideanModulo(v * th - 0.5, th) | 0;

      const sampledTexels = [];
      for (let i = 0; i < numPoints; ++i) {
        const {line, texel} = infos[i];
        const ox = i % 2;
        const oy = i / 2 | 0;
        const px = (tx + ox) % tw;
        const py = (ty + oy) % th;
        line.plot(px * texelSize + hSize + pixelsOffX, py * texelSize + hSize);
        const c = colors[px + py * tw];
        const cl = rgba8unorm(...c);
        texel.fill(cl);
        sampledTexels.push(c);
      }

      const c0 = lerpArray(sampledTexels[0], sampledTexels[1], t1);
      const c1 = lerpArray(sampledTexels[2], sampledTexels[3], t1);
      const fc = lerpArray(c0, c1, t2);

      mixF.inColor0.fill(rgba8unorm(...c0));
      mixF.inColor1.fill(rgba8unorm(...c1));
      result.fill(rgba8unorm(...fc));

      const offScreen = 100000;
      const offX = tx === tw - 1;
      const offY = ty === th - 1;
      setTranslation(boxes[0], pixelsOffX + tx * texelSize + hSize, ty * texelSize + hSize);
      setTranslation(boxes[1], pixelsOffX + (offX ? -hSize : offScreen), ty * texelSize + hSize);
      setTranslation(boxes[2], pixelsOffX + tx * texelSize + hSize, offY ? -hSize : offScreen);
      setTranslation(boxes[3], ...(offX && offY ? [pixelsOffX + -hSize, -hSize] : [offScreen, offScreen]));

      const tXOff = offX && t1 >= 0.5 ? -tw : 0;
      const tYOff = offY && t2 >= 0.5 ? -th : 0;
      const t1x = pixelsOffX + (tx + t1 + tXOff) * texelSize + hSize;
      const t1y = (ty + tYOff) * texelSize + hSize;
      const t2x = pixelsOffX + (tx + tXOff) * texelSize + hSize;
      const t2y = (ty + t2 + tYOff) * texelSize + hSize;
      setTranslation(t1Line, t1x, t1y);
      setTranslation(t2Line, t2x, t2y);

      setTranslation(t1Text, t1x, t1y + (tYOff ? texelSize + 20 : -10));
      setTranslation(t2Text, t2x + (tXOff ? texelSize + 10 : -70), t2y);
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    draw.on('pointerdown', function(e) {
      window.addEventListener('pointermove', onMove, {passive: false});
      window.addEventListener('pointerup', onUp);
      onMove(e);
    });

    update();
  },
  'pixel-to-texcoords': (elem) => {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const pixelSize = 40;
    const dw = 10;
    const dh = 8;
    const hSize = pixelSize / 2;
    const w = dw * pixelSize;
    const h = dh * pixelSize;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, w, h);

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

    const pixels = [];
    const bg = draw.group();
    for (let y = 0; y < dh; ++y) {
      for (let x = 0; x < dw; ++x) {
        const xx = x * pixelSize;
        const yy = y * pixelSize;
        pixels.push({
          rect: bg.rect(pixelSize, pixelSize).move(xx, yy).fill('#00000000'),
          dot: bg.circle(5).center(xx + hSize, yy + hSize).addClass('svg-main-text-color-fill').stroke('none'),
        });
      }
    }
    const grid = bg.group().addClass('svg-main-text-color-stroke');
    for (let y = 0; y <= dh; ++y) {
      const yy = y * pixelSize;
      grid.line([0, yy, w, yy]).stroke({width: 0.5});
    }
    for (let x = 0; x <= dw; ++x) {
      const xx = x * pixelSize;
      grid.line([xx, 0, xx, h]).stroke({width: 0.5});
    }

    const quadGroup = draw.group();
    const rot = quadGroup.group();
    const quad = rot.rect(pixelSize * 2, pixelSize * 2).fill('none').stroke({color: 'red'});
    // rot.line(0, pixelSize * 2, pixelSize * 2, 0).stroke('#FF000020');
    makeText(rot, ('uv:0,0')).move(-40, pixelSize * 2 + 5);
    makeText(rot, ('uv:1,1')).move(pixelSize * 2 + 10, -15);
    setTranslation(rot, -pixelSize, -pixelSize);
    setTranslation(quadGroup, 4.25 * pixelSize, 3.25 * pixelSize);
    const uLine = rot.group();
    uLine.line(0, 0, 0, pixelSize * 2).stroke('#FF0');
    const uText = makeText(uLine, 'foo').move(0, -15).font({anchor: 'middle'});
    const vLine = rot.group();
    vLine.line(0, 0, pixelSize * 2, 0).stroke('#FF0');
    const vText = makeText(vLine, 'foo').move(-40, -6);

    const getTransformToElement = (toElement, fromElement) =>
        toElement.getScreenCTM().inverse().multiply(fromElement.getScreenCTM());

    const settings = {
      pause: false,
      rotate: false,
      rotation: 0,
      xOffset: 0,
    };
    let offX = 0;
    let offY = 0;
    let move = true;
    let time = 0;

    const pre = el('pre', {style: { 'background-color': 'inherit', margin: '0'}});
    uiDiv.appendChild(
      el('div', {className: 'side-by-side-top-space-around'}, [
        pre,
        el('div', {}, [
          checkbox('pause', settings.pause, v => {
            settings.pause = v;
          }),
          checkbox('rotate', settings.rotate, v => {
            settings.rotate = v;
          }),
          el('button', {
            type: 'button',
            textContent: 'reset',
            onClick() {
              settings.rotation = 0;
              time = 0;
              offX = 0;
              offY = 0;
            },
          }),
        ]),
      ])
    );

    const oldPixels = [];
    const points = [
      [0, 0],
      [pixelSize * 2, 0],
      [0, pixelSize * 2],
      [pixelSize * 2, pixelSize * 2],
    ];

    let then = 0;
    function update(now) {
      const deltaTime = Math.min(0.1, (then - now) * 0.001);
      then = now;

      if (!settings.pause && move) {
        time += deltaTime;
        settings.xOffset = Math.sin(time * 0.25) * pixelSize * 3;
        if (settings.rotate) {
          settings.rotation += deltaTime * 10;
        }
      }
      rot.attr({transform: `translate(${settings.xOffset + offX}, ${offY}) rotate(${settings.rotation}) translate(${-pixelSize}, ${-pixelSize})`});

      for (const {rect, dot} of oldPixels) {
        rect.fill('none');
        dot.fill('').addClass('svg-main-text-color-fill');
      }
      oldPixels.length = 0;

      // I'm too lazy to write a rasterizer so hack
      const toPixels = getTransformToElement(draw.node, quad.node);
      const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
      const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
      for (const point of points) {
        const p = new DOMPoint(...point).matrixTransform(toPixels);
        min[0] = Math.min(min[0], p.x);
        min[1] = Math.min(min[1], p.y);
        max[0] = Math.max(max[0], p.x);
        max[1] = Math.max(max[1], p.y);
      }
      const left   = Math.max(0, min[0] / pixelSize) | 0;
      const top    = Math.max(0, min[1] / pixelSize) | 0;
      const right  = Math.min(dw - 1, max[0] / pixelSize) | 0;
      const bottom = Math.min(dh - 1, max[1] / pixelSize) | 0;

      const coords = [];
      const toQuad = getTransformToElement(quad.node, draw.node);
      for (let y = top; y <= bottom; ++y) {
        for (let x = left; x <= right; ++x) {
          const xx = x * pixelSize + hSize;
          const yy = y * pixelSize + hSize;
          const p = new DOMPoint(xx, yy).matrixTransform(toQuad);
          const inside = p.x >= 0 && p.x < pixelSize * 2 &&
                         p.y >= 0 && p.y < pixelSize * 2;
          if (inside) {
            const u = p.x / (pixelSize * 2);
            const v = p.y / (pixelSize * 2);
            if (coords.length === 0) {
              setTranslation(uLine, p.x, 0);
              setTranslation(vLine, 0, p.y);
              uText.text(`u:${f2(u)}`);
              vText.text(`v:${f2(v)}`);
            }
            coords.push(`pixel ${x},${y}  uv ${f2(u)},${f2(v)}`);
            const pixel = pixels[y * dw + x];
            oldPixels.push(pixel);
            const { dot, rect } = pixel;
            dot.fill('#f00').removeClass('svg-main-text-color-fill');
            rect.fill('#0ff');
          }
        }
      }



      const extra = 6 - coords.length;
      coords.push(...new Array(extra).fill(' '));

      pre.textContent = coords.join('\n');
    }
    createRequestAnimationFrameLoop(elem, update);

    let startX;
    let startY;
    let startMouseX;
    let startMouseY;

    function onMove(e) {
      e.preventDefault();

      const mouseDeltaX = e.pageX - startMouseX;
      const mouseDeltaY = e.pageY - startMouseY;

      const deltaX = mouseDeltaX * w / draw.node.clientWidth;
      const deltaY = mouseDeltaY * h / draw.node.clientHeight;

      offX = startX + deltaX;
      offY = startY + deltaY;
    }

    function onUp() {
      move = true;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    draw.node.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      move = false;

      startX = offX;
      startY = offY;

      startMouseX = e.pageX;
      startMouseY = e.pageY;

      window.addEventListener('pointermove', onMove, {passive: false});
      window.addEventListener('pointerup', onUp);
    }, {passive: false});


  },
  'mips': (elem) => {
    const kTextureWidth = 5;
    const _ = [255,   0,   0, 255];  // red
    const y = [255, 255,   0, 255];  // yellow
    const b = [  0,   0, 255, 255];  // blue
    const textureData = new Uint8Array([
      _, _, _, _, _,
      _, y, _, _, _,
      _, y, _, _, _,
      _, y, y, _, _,
      _, y, _, _, _,
      _, y, y, y, _,
      b, _, _, _, _,
    ].flat());

    const pixelSize = 40;
    addMips(elem, textureData, kTextureWidth, pixelSize);
  },
  'blended-mips': (elem) => {
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
    const pixelSize = 16;
    addMips(elem, data, 16, pixelSize);
  },
  'checkered-mips': (elem) => {
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
    addMipmap(elem, levels.map(({size, color}, i) => {
      ctx.canvas.width = size;
      ctx.canvas.height = size;
      ctx.fillStyle = i & 1 ? '#000' : '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
      return ctx.getImageData(0, 0, size, size);
    }), 6);
  },
  'color-texture-formats': (elem) => {
    const spec = {
      key: { label: 'format', },
      renderable: { label: 'renderable', },
      multisample: { label: 'multisample', },
      storage: { label: 'storage', },
      sampleType: { label: 'sample type', },
      bytesPerBlock: { label: 'bytes per pixel', },
    };

    addTextureTable(elem, spec, kRegularTextureFormats);
  },
  'depth-stencil-texture-formats': (elem) => {
    const spec = {
      key: { label: 'format', },
      renderable: { label: 'renderable', },
      multisample: { label: 'multisample', },
      storage: { label: 'storage', },
      sampleType: { label: 'sampler type', },
      bytesPerBlock: { label: 'bytes per pixel', },
      copySrc: { label: 'copy src', },
      copyDst: { label: 'copy dst', },
      feature: { label: 'feature', },
    };

    addTextureTable(elem, spec, kDepthStencilFormats);
  },
});
