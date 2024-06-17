import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el,
} from './resources/elem.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';
import { clamp } from './resources/utils.js';

const darkColors = {
  main: '#fff',
  outline: '#000',
  point: '#80DDFF80',
  clear: [0.3, 0.3, 0.3, 1],
  pixel: [1, 0, 0, 1],
  dots: 'yellow',
  grid: '#000',
  handle: 'rgba(255, 255, 255, 0.5)',
};
const lightColors = {
  main: '#000',
  outline: '#fff',
  point: '#8000FF20',
  clear: [0.9, 0.9, 0.9, 1],
  pixel: [1, 0.25, 0.25, 1],
  dots: 'blue',
  grid: '#888',
  handle: 'rgba(0, 0, 0, 0.25)',
};
const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
let colorScheme;

const updateColorScheme = () => {
  const isDarkMode = darkMatcher.matches;
  colorScheme = isDarkMode ? darkColors : lightColors;
  //hLine.stroke(colorScheme.main);
  //vLine.stroke(colorScheme.main);
  //marker.fill(colorScheme.main);
  //pointOuter.stroke(colorScheme.main);
  //pointInner.fill(colorScheme.point);
};
updateColorScheme();

const devicePromise = navigator.gpu?.requestAdapter()
   .then(adapter => adapter?.requestDevice());

const makeText = (parent, t) => {
  return parent.text(t)
    .font({
      family: 'monospace',
      weight: 'bold',
      size: '20',
      anchor: 'middle',
    })
    .fill(colorScheme.main)
    .css({
      'user-select': 'none',
      filter: `
        drop-shadow( 1px  0px 0px ${colorScheme.outline}) 
        drop-shadow( 0px  1px 0px ${colorScheme.outline}) 
        drop-shadow(-1px  0px 0px ${colorScheme.outline}) 
        drop-shadow( 0px -1px 0px ${colorScheme.outline}) 
      `,
    });
};

async function initWebGPUPixelRender(webgpuCanvas) {
  const device = await devicePromise;
  if (!device) {
    webgpuCanvas.parentElement.insertBefore(
      el('div', {className: 'fill-container center'}, [
        el('div', {textContent: 'Need WebGPU', style: { color: 'red'}}),
      ]),
      webgpuCanvas);
    return () => { /* */ };
  }

  const context = webgpuCanvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: 'our hardcoded "a" triangle',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      @vertex fn vs(
        @location(0) xy: vec2f
      ) -> OurVertexShaderOutput {
        var vsOutput: OurVertexShaderOutput;
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        return vsOutput;
      }

      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(${colorScheme.pixel});
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {shaderLocation: 0, offset: 0, format: 'float32x2'},
          ],
        },
      ],
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  const vertexBuffer = device.createBuffer({
    size: 3 * 2 * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: colorScheme.clear,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  return points => {
    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(points.flat()));

    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({
      label: 'render quad encoder',
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(3);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
}

async function showClipSpaceToTexels({webgpuCanvas, infoCanvas}) {
  webgpuCanvas.width = 15;
  webgpuCanvas.height = 11;

  const points = [
    [  0.0,  0.5, ],
    [ -0.5, -0.5, ],
    [  0.5, -0.5, ],
  ];

  const webgpuPixelRender = await initWebGPUPixelRender(webgpuCanvas);

  const svgWidth = 750;
  const svgHeight = 550;
  const draw = svg().addTo(infoCanvas).viewbox(0, 0, svgWidth, svgHeight);
  const grid = draw.group().stroke(colorScheme.grid);

  const clipSpaceToSVG = (x, y) => {
    return [(x * 0.5 + 0.5) * svgWidth + 0.5, (-y * 0.5 + 0.5) * svgHeight + 0.5];
  };
  const clipSpaceToSVGPathPart = (x, y) => {
    return clipSpaceToSVG(x, y).join(' ');
  };

  const gridPath = [];
  for (let y = 1; y < webgpuCanvas.height; ++y) {
    const yy = y / webgpuCanvas.height * 2 - 1;
    gridPath.push(`M${clipSpaceToSVGPathPart(-1, yy)} L${clipSpaceToSVGPathPart(1, yy)}`);
  }
  for (let x = 1; x < webgpuCanvas.width; ++x) {
    const xx = x / webgpuCanvas.width * 2 - 1;
    gridPath.push(`M${clipSpaceToSVGPathPart(xx, 1)} L${clipSpaceToSVGPathPart(xx, -1)}`);
  }
  grid.path(gridPath.join(' '));

  const dots = draw.group().fill(colorScheme.dots);
  for (let y = 0; y < webgpuCanvas.height; ++y) {
    for (let x = 0; x < webgpuCanvas.width; ++x) {
      dots.circle(3).center(
          (x + 0.5) / webgpuCanvas.width * svgWidth,
          (y + 0.5) / webgpuCanvas.height * svgHeight);
    }
  }

  const triangle = draw.path('').stroke(colorScheme.main).fill('none');
  const triPoints = points.map((_, i) => {
    const group = draw.group();
    group.rect(20, 20).center(0, 0).fill(colorScheme.handle);
    const rect = group.rect(50, 50).center(0, 0).fill('rgba(0,0,0,0)');
    rect.node.addEventListener('pointerdown', (e) => onDown(e, i), {passive: false});
    rect.node.addEventListener('touchstart', preventScroll, {passive: false});
    return {
      group,
      text: makeText(group, `p${i}`),
    };
  });

  let handleNdx;
  let startMousePos;
  let startHandlePos;

  const svgSize = [svgWidth, svgHeight];
  const clipFlip = [1, -1];

  function getRelativePointerPosition(e) {
    const rect = draw.node.getBoundingClientRect();
    return [
      /*e.offsetX*/ (e.clientX - rect.left) * svgWidth / draw.node.clientWidth,
      /*e.offsetY*/ (e.clientY - rect.top ) * svgHeight / draw.node.clientHeight,
    ];
  }

  function getRelativePointerClipSpacePosition(e) {
    return getRelativePointerPosition(e).map((v, i) => (v / svgSize[i] * 2 - 1) * clipFlip[i]);
  }

  function preventScroll(e) {
    e.preventDefault();
  }

  function onMove(e) {
    e.preventDefault();
    e.stopPropagation();

    const p = getRelativePointerClipSpacePosition(e);
    points[handleNdx] = startHandlePos.map((startHandlePos, ndx) =>
      clamp(p[ndx] - startMousePos[ndx] + startHandlePos, -1, 1)
    );

    render();
  }

  function onUp() {
    window.removeEventListener('touchmove', preventScroll);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('touchend', onUp);
  }

  function onDown(e, _handleNdx) {
    startMousePos = getRelativePointerClipSpacePosition(e);
    startHandlePos = points[_handleNdx].slice();
    handleNdx = _handleNdx;
    window.addEventListener('touchmove', preventScroll, {passive: false});
    window.addEventListener('pointermove', onMove, {passive: false});
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);
    onMove(e);
  }

  function updatePoints() {
    const ps = points.map((p, i) => {
      const {group, text} = triPoints[i];
      const pp = clipSpaceToSVG(...p);
      group.transform({translateX: pp[0], translateY: pp[1]});
      text
        .text(p.map(v => v.toFixed(2)).join(','))
        .transform({
          translateX: Math.max(70 - pp[0], 0) + Math.min(svgWidth - 70 - pp[0], 0),
          translateY: -20 + Math.max(40 - pp[1], 0),
        });
      return `${i === 0 ? 'M' : 'L'}${clipSpaceToSVGPathPart(...p)}`;
    }).join(' ');
    triangle.plot(`${ps} Z`);
  }

  //const t2 = v => v.toFixed(2).padStart(5);

  function render() {
    updatePoints();
    //info.textContent = points.map((p, i) => `p${i}: ${p.map(v => t2(v)).join(', ')}`).join('\n');

    webgpuPixelRender(points);
  }
  render();

  const waitRAF = () => new Promise(resolve => requestAnimationFrame(resolve));
  // workaround chrome image-rendering bug
  await waitRAF();
  webgpuCanvas.style.display = 'inline-block';
  await waitRAF();
  webgpuCanvas.style.display = 'block';
}

renderDiagrams({
  'clip-space-to-texels': (elem) => {
    const webgpuCanvas = el('canvas', {style: { display: 'block' }, className: 'fill-container nearest-neighbor-like'});
    const infoCanvas = el('div', {style: { display: 'block' }, className: 'fill-container align-top-left'});
    const diagramDiv = el('div', { style: { position: 'relative' } }, [
      webgpuCanvas,
      infoCanvas,
    ]);

    showClipSpaceToTexels({infoCanvas, webgpuCanvas});

    elem.appendChild(diagramDiv);
  },
});
