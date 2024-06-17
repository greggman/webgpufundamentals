import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el
} from './resources/elem.js';
import {
  createRequestAnimationFrameLoop,
} from './resources/good-raf.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';
import * as twgl from '../../3rdparty/twgl-full.module.js';

const darkColors = {
  lines: [1, 1, 1, 1],
  axes: '#fff',
  f: '#f4f',
  camera: '#48F',
  innerRadius: '#AAA',
  outerRadius: '#F44',
  base: '#DDD',
  background: '#444',
  cone: '#663',
  angleLines: '',
  angleNumbersInLight: '#AAA',
  angleNumbers: '#222',
  surfaceNormalOutline: '#444',
  gridLight: [0.4, 0.4, 0.4, 1],
  gridHard: [1, 1, 1, 1],
};
const lightColors = {
  lines: [0, 0, 0, 1],
  axes: '#000',
  f: 'purple',
  camera: 'blue',
  innerRadius: '#888',
  outerRadius: '#F00',
  base: '#000',
  background: '#FFF',
  cone: '#FFC',
  angleNumbersInLight: '#888',
  angleNumbers: '#EEE',
  surfaceNormalOutline: '#FFF',
  gridLight: [0.75, 0.75, 0.75, 1],
  gridHard: [0, 0, 0, 1],
};
const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
const isDarkMode = darkMatcher.matches;
const colors = isDarkMode ? darkColors : lightColors;

const setTranslation = (e, x, y) => e.attr({transform: `translate(${x}, ${y})`});
const setRotation = (e, a) => e.attr({transform: `rotate(${a * 180})`});
const setScale = (e, s) => e.attr({transform: `scale(${s})`});

function showMove(elem, mode) {
  const areaWidth = 420;
  const areaHeight = 300;

  const draw = svg().addTo(elem).viewbox(-areaWidth / 2, -areaHeight / 2, areaWidth, areaHeight);

  const iMarker = draw.marker(20, 8, function(add) {
    add.polygon([0, 0, 10, 4, 0, 8]).fill(colors.innerRadius).attr({orient: 'auto'});
  });
  const oMarker = draw.marker(20, 8, function(add) {
    add.polygon([0, 0, 10, 4, 0, 8]).fill(colors.outerRadius).attr({orient: 'auto'});
  });


  const lineFont = {
    family: 'monospace',
    size: '10',
  };
  const axisFont = {
    family: 'monospace',
    weight: 'bold',
    size: '14',
  };

  const fRadius = 60;
  const camRadius = (mode === 'camera-movement') ? fRadius * 1.5 : 120;
  const gridSpacing = 20;
  const gridsAcross = Math.ceil(areaWidth / gridSpacing);
  const gridsDown = Math.ceil(areaHeight / gridSpacing);
  const gridLines = Math.max(gridsAcross, gridsDown);

  const bg = draw.group();
  const grid = bg.group().stroke({color: '#888'});
  for (let i = -gridLines; i <= gridLines; ++i) {
    const max = gridLines * gridSpacing;
    const min = -max;
    const v = i * gridSpacing;
    const style = {width: 0.5, ...(i === 0 && {color: colors.axes})};
    grid.line([v, min, v, max]).stroke(style);
    grid.line([min, v, max, v]).stroke(style);
  }
  switch (mode) {
    case 'move-world':
      setTranslation(bg, 0, 120);
  }
  const tx = bg.group().fill(colors.axes).font(axisFont);
  tx.text('-x').move(-areaWidth / 2, 0);
  tx.text('+x').move( areaWidth / 2 - 20, 0);
  const ty = draw.group().fill(colors.axes).font(axisFont);
  ty.text('-z').move(0, -areaHeight / 2);
  ty.text('+z').move(0,  areaHeight / 2 - 16);

  const fs = draw.group().fill(colors.f);
  const numFs = 5;
  for (let i = 0; i < numFs; ++i) {
    const angle = i / numFs * Math.PI * 2;
    const fg = fs.group();
    const f = fg.group();
    f.rect(30, 10).move(-15,  0 - 25);
    f.rect(10, 10).move(-15, 10 - 25);
    f.rect(20, 10).move(-15, 20 - 25);
    f.rect(10, 20).move(-15, 30 - 25);
    setTranslation(fg,
      Math.cos(angle) * fRadius,
      Math.sin(angle) * fRadius
    );
    switch (mode) {
      case 'camera-movement':
        setScale(f, 0.5);
        break;
    }
  }

  if (mode === 'camera-movement') {
    draw.circle(fRadius * 2).fill('none').stroke(colors.innerRadius).move(-fRadius, -fRadius);
    draw.circle(fRadius * 3).fill('none').stroke(colors.outerRadius).move(-fRadius * 1.5, -fRadius * 1.5);
  }

  const cg = draw.group();
  const camGroup = cg.group();
  camGroup.polygon([
      0,   0,
     10,   0,
     10,  20,
    -10,  20,
    -10,   0,
      0,   0,
    -10, -10,
     10, -10,
      0,   0,
  ]).fill(colors.camera);

  const ig = draw.group();
  if (mode === 'camera-movement') {
    ig.line(0, 0, 0, fRadius).stroke(colors.innerRadius).marker('end', iMarker);
    const fRadiusText = ig.text('fRadius').move(10, -20).font(lineFont).fill(colors.innerRadius);
    setRotation(fRadiusText, 0.5);
    setRotation(ig, 1.25);

    cg.line(0, 0, 0, fRadius * 1.5).stroke(colors.outerRadius).marker('end', oMarker);
    const camRadiusText = cg.text('fRadius*1.5').move(10, -20).font(lineFont).fill(colors.outerRadius);
    setRotation(camRadiusText, 0.5);
  }

  switch (mode) {
    case 'camera-movement':
      break;
    default:
      camGroup.polygon([
         -20,  -20,
        -170, -210,
         170, -210,
          20,  -20,
      ]).fill('#80FF4060');
  }
  setTranslation(camGroup, 0, camRadius);

  function update(time) {
    time *= 0.001;

    switch (mode) {
      case 'move-camera':
        setRotation(cg, time * 0.1);
        break;
      case 'move-world':
        setRotation(fs, time * 0.1);
        break;
      case 'camera-movement':
        setRotation(cg, time * 0.1);
        break;
    }
  }

  createRequestAnimationFrameLoop(elem, update);
}


const vertexColorVertexShader = `
attribute vec4 position;
attribute vec4 color;
uniform mat4 u_worldViewProjection;
varying vec4 v_color;
void main() {
  gl_Position = u_worldViewProjection * position;
  v_color = color;
}

`;
const vertexColorFragmentShader = `
precision mediump float;
uniform vec4 u_color;
varying vec4 v_color;
void main() {
  gl_FragColor = u_color * v_color;
}
`;
const vertexColorFakeLightVertexShader = `
attribute vec4 position;
attribute vec4 color;
attribute vec3 normal;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
varying vec4 v_color;
varying vec3 v_normal;
void main() {
  gl_Position = u_worldViewProjection * position;
  v_color = color;
  v_normal = (u_worldInverseTranspose * vec4(normal, 0)).xyz;
}

`;
const vertexColorFakeLightFragmentShader = `
precision mediump float;
uniform vec4 u_color;
varying vec4 v_color;
varying vec3 v_normal;
void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(vec3(0.5, 0.7, 1));
  float d = dot(normal, lightDir) * 0.5 + 0.5;
  gl_FragColor = u_color * v_color * vec4(d, d, d, 1);
}
`;
/*
const baseVertexShader = `
attribute vec4 position;
attribute vec4 a_color;
uniform mat4 u_worldViewProjection;
uniform mat4 u_exampleWorldViewProjection;
varying vec4 v_color;
varying vec4 v_position;
void main() {
  gl_Position = u_worldViewProjection * position;
  v_position = u_exampleWorldViewProjection * position;
  v_position = v_position / v_position.w;
  v_color = a_color;
}

`;
const colorFragmentShader = `
precision mediump float;
varying vec4 v_color;
varying vec4 v_position;
uniform vec4 u_color;
void main() {
  bool blend = (v_position.x < -1.0 || v_position.x > 1.0 ||
                v_position.y < -1.0 || v_position.y > 1.0 ||
                v_position.z < -1.0 || v_position.z > 1.0);
  vec4 blendColor = blend ? vec4(0.35, 0.35, 0.35, 1.0) : vec4(1, 1, 1, 1);
  gl_FragColor = v_color * u_color * blendColor;
}
`;
*/

// TODO: Yea I know, should convert to WebGPU. But better to make progress on articles
function crossProductDiagram(elem, mode) {
  const m4 = twgl.m4;
  const v3 = twgl.v3;

  const gridScale = 400;

  const canvas = el('canvas', {className: 'fill-container'});
  const gl = canvas.getContext('webgl');
  elem.appendChild(canvas);

  const devicePixelRatio = window.devicePixelRatio || 1;

  const createGrid = function(size, subdivisions) {
    const numLines = subdivisions;
    const numVertices = numLines * 4;
    const positions = twgl.primitives.createAugmentedTypedArray(3, numVertices);
    const colorValues = twgl.primitives.createAugmentedTypedArray(4, numVertices);

    //  ..|..|..|..
    //  <-  size ->

    const gridSize = size / (subdivisions + 2);
    for (let ii = 0; ii < numLines; ++ii) {
      const jj = ii - ((numLines - 1) / 2);
      const p = jj * gridSize;
      positions.push([p, 0, -size / 2]);
      positions.push([p, 0,  size / 2]);
      positions.push([-size / 2, 0, p]);
      positions.push([ size / 2, 0, p]);
      const color = jj ? colors.gridLight : colors.gridHard;
      colorValues.push(color);
      colorValues.push(color);
      colorValues.push(color);
      colorValues.push(color);
    }

    return {
      position: positions,
      color: colorValues,
    };
  };

  const addVColors = function(arrays) {
    const numVerts = arrays.position.length / 3;
    arrays.color = twgl.primitives.createAugmentedTypedArray(3, numVerts);
    for (let ii = 0; ii < numVerts; ++ii) {
      arrays.color.push([1, 1, 1]);
    }
  };

  /*
  // Create Geometry.
  const wireCubeArrays = {
    position: [
      -1,  1, -1,
       1,  1, -1,
       1, -1, -1,
      -1, -1, -1,

      -1,  1,  1,
       1,  1,  1,
       1, -1,  1,
      -1, -1,  1,
    ],
    color: [
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,

      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
    ],
    indices: {
      numComponents: 2,
      data: [
        0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 1, 5, 2, 6, 3, 7,
      ],
    },
  };
  */

  // Create Shader Program
  const vertexColorProgramInfo = twgl.createProgramInfo(gl, [
      vertexColorVertexShader,
      vertexColorFragmentShader,
  ]);
  // const wireCubeBufferInfo = twgl.createBufferInfoFromArrays(gl, wireCubeArrays);

  /*
  const cubeRaysArrays = {
    position: wireCubeArrays.position,
    color: [
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,

      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
    ],
    indices: {
      numComponents: 2,
      data: [
        0, 4, 1, 5, 2, 6, 3, 7,
      ],
    },
  };
  const cubeRaysBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeRaysArrays);
  const colorProgramInfo = twgl.createProgramInfo(gl, [
      vertexColorVertexShader,
      vertexColorFragmentShader,
  ]);
  */

  const gridArrays = createGrid(13, 21);
  const gridBufferInfo = twgl.createBufferInfoFromArrays(gl, gridArrays);

  const axisProgramInfo = twgl.createProgramInfo(gl, [
      vertexColorFakeLightVertexShader,
      vertexColorFakeLightFragmentShader,
  ]);

  const cubeArrays = twgl.primitives.createCubeVertices(40.0);
  twgl.primitives.reorientPositions(cubeArrays.position, m4.translation([0, 0, 20]));
  const coneArrays = twgl.primitives.createTruncatedConeVertices(30, 10, 30, 24, 2, false, false);
  twgl.primitives.reorientVertices(
    coneArrays,
    m4.multiply(
        m4.translation([0, 0, -15]),
        m4.rotationX(Math.PI / 2)));
  const cameraArrays = twgl.primitives.concatVertices([cubeArrays, coneArrays]);
  addVColors(cameraArrays);
  const cameraBufferInfo = twgl.createBufferInfoFromArrays(gl, cameraArrays);

  const stemArrays = twgl.primitives.createCylinderVertices(5, 100, 24, 1);
  twgl.primitives.reorientVertices(stemArrays, m4.translation([0, 50, 0]));
  const tipArrays = twgl.primitives.createTruncatedConeVertices(10, 0, 20, 24, 2);
  twgl.primitives.reorientVertices(tipArrays, m4.translation([0, 100, 0]));
  const axisArrays = twgl.primitives.concatVertices([stemArrays, tipArrays]);
  addVColors(axisArrays);
  //tdl.primitives.reorient(axisArrays, math.matrix4.rotationX(Math.PI));
  const axisBufferInfo = twgl.createBufferInfoFromArrays(gl, axisArrays);

  const fArrays = twgl.primitives.create3DFVertices();
  twgl.primitives.reorientVertices(
    fArrays,
    m4.multiply(m4.rotationX(Math.PI),
                m4.translation([-50, -75, -15])));
  const fBufferInfo = twgl.createBufferInfoFromArrays(gl, fArrays);


  // pre-allocate a bunch of arrays
  const projection = m4.identity();
  const view = m4.identity();
  const world = m4.identity();
  const worldInverseTranspose = m4.identity();
  const viewProjection = m4.identity();
  const worldViewProjection = m4.identity();
  const fPosition = new Float32Array([-50, 50, -150]);
  const eyePosition = new Float32Array([250, 500, 200]);
  const target = new Float32Array([0, 100, 0]);
  const cameraPosition = new Float32Array([50, 200, 100]);
  const up = new Float32Array([0, 1, 0]);
  const v3t0 = new Float32Array(3);
  const m4t0 = m4.identity();
  const m4t1 = m4.identity();
  const ltRed = new Float32Array([1, 0.5, 0.5, 1]);
  const ltGreen = new Float32Array([0.5, 1, 0.5, 1]);
  const ltBlue = new Float32Array([0.5, 0.5, 1, 1]);
  const flashColor = new Float32Array([1, 1, 1, 0.75]);

  // uniforms.
  const gridUniforms = {
    u_color: [1, 1, 1, 1],
    u_worldViewProjection: worldViewProjection,
  };

  const fUniforms = {
    u_color: [1, 1, 1, 1],
    u_worldViewProjection: worldViewProjection,
  };

  const cameraUniforms = {
    u_color: [0.2, 0.2, 1, 1],
    u_worldViewProjection: worldViewProjection,
    u_worldInverseTranspose: worldInverseTranspose,
  };

  const zAxisUniforms = {
    u_color: [0.5, 0.5, 1, 1],
    u_worldViewProjection: worldViewProjection,
    u_worldInverseTranspose: worldInverseTranspose,
  };

  const yAxisUniforms = {
    u_color: [0.5, 1, 0.5, 1],
    u_worldViewProjection: worldViewProjection,
    u_worldInverseTranspose: worldInverseTranspose,
  };

  const xAxisUniforms = {
    u_color: [1, 0.5, 0.5, 1],
    u_worldViewProjection: worldViewProjection,
    u_worldInverseTranspose: worldInverseTranspose,
  };

  const upAxisUniforms = {
    u_color: [0.5, 0.5, 0.5, 1],
    u_worldViewProjection: worldViewProjection,
    u_worldInverseTranspose: worldInverseTranspose,
  };

  function drawModel(programInfo, bufferInfo, type, uniforms, world) {
    m4.multiply(viewProjection, world, worldViewProjection);
    if (uniforms.u_worldInverseTranspose) {
      m4.inverse(world, uniforms.u_worldInverseTranspose);
      m4.transpose(uniforms.u_worldInverseTranspose, uniforms.u_worldInverseTranspose);
    }
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo, type);
  }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  let clock = 0;
  function render(elapsedTime) {
    clock += elapsedTime;

    // clear the screen.
    gl.enable(gl.DEPTH_TEST);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    m4.perspective(
        degToRad(40),
        aspect,
        1,
        5000,
        projection);

    const dist = v3.length(v3.subtract(target, eyePosition));
    const a = clock / 8;
    v3t0[0] = Math.cos(a) * dist + target[0];
    v3t0[1] = eyePosition[1];
    v3t0[2] = Math.sin(a) * dist + target[2];
    m4.lookAt(
        v3t0,
        target,
        up,
        view);
    m4.inverse(view, view);
    m4.multiply(projection, view, viewProjection);

    m4.scaling([gridScale, gridScale, gridScale], world);
    drawModel(vertexColorProgramInfo, gridBufferInfo, gl.LINES, gridUniforms, world);

    m4.translation(fPosition, world);
    drawModel(vertexColorProgramInfo, fBufferInfo, gl.TRIANGLES, fUniforms, world);

    m4.lookAt(
        cameraPosition,
        fPosition,
        up,
        m4t0);
    const flash = Math.floor(clock * 2) % 2;
    drawModel(axisProgramInfo, cameraBufferInfo, gl.TRIANGLES, cameraUniforms, m4t0);
    if (mode === 2) {
      yAxisUniforms.u_color = flash ? ltGreen : flashColor;
      drawModel(axisProgramInfo, axisBufferInfo, gl.TRIANGLES, yAxisUniforms, m4t0);
    }
    m4.rotationZ(Math.PI / -2, m4t1);
    m4.multiply(m4t0, m4t1, world);
    if (mode === 1) {
      xAxisUniforms.u_color = flash ? ltRed : flashColor;
    }
    if (mode > 0) {
      drawModel(axisProgramInfo, axisBufferInfo, gl.TRIANGLES, xAxisUniforms, world);
    }
    m4.rotationX(Math.PI / 2, m4t1);
    m4.multiply(m4t0, m4t1, world);
    if (mode === 0) {
      zAxisUniforms.u_color = flash ? ltBlue : flashColor;
    }
    drawModel(axisProgramInfo, axisBufferInfo, gl.TRIANGLES, zAxisUniforms, world);
    if (mode === 1) {
      m4.translation(cameraPosition, world);
      drawModel(axisProgramInfo, axisBufferInfo, gl.TRIANGLES, upAxisUniforms, world);
    }
  }

  let then = 0;
  createRequestAnimationFrameLoop(canvas, (now) => {
    const deltaTime = (now - then) * 0.001;
    then = now;

    //debugger;
    twgl.resizeCanvasToDisplaySize(gl.canvas, devicePixelRatio);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    render(deltaTime);
  });
}

async function main() {
  renderDiagrams({
    'move-camera': (elem) => {
      showMove(elem, 'move-camera');
    },
    'move-world': (elem) => {
      showMove(elem, 'move-world');
    },
    'camera-movement': (elem) => {
      showMove(elem, 'camera-movement');
    },
    'cross-product-00': (elem) => {
      crossProductDiagram(elem, 0);
    },
    'cross-product-01': (elem) => {
      crossProductDiagram(elem, 1);
    },
    'cross-product-02': (elem) => {
      crossProductDiagram(elem, 2);
    },
  });
}

main();
