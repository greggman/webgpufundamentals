import {
  createElem as el
} from './elem.js';
import {
  rgbToHsl
} from './utils.js';
export async function rgbDiagram() {
  const div = el('div', {className: 'rgb-diagram'});
  const {
    ArrowHelper,
    BoxGeometry,
    BufferGeometry,
    ClippingGroup,
    CylinderGeometry,
    DoubleSide,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshBasicNodeMaterial,
    PerspectiveCamera,
    Object3D,
    Plane,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    Vector3,
    WebGPURenderer,
  } = await import('three');
  const {
    CSS2DRenderer,
    CSS2DObject,
  } = await import('three/addons/renderers/CSS2DRenderer.js');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const {
    Fn: tslFn,
    positionWorld,
    vec3,
  } = await import('three/tsl');

  const rgbCube = tslFn(() => {
    const p = positionWorld;
    return p.mul(0.5).add(0.5);
  });

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  const canvas = el('canvas', {
    style: {
      width: '100%',
      height: '100%',
      aspectRatio: '1 / 1',
    },
  });

  const renderer = new WebGPURenderer({ device, canvas });
  div.append(canvas);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.id = 'labels';
  div.append(labelRenderer.domElement);

  const clipPlane1 = new Plane(new Vector3(-1, 0, 0), 0);
  const clipPlane2 = new Plane(new Vector3(0, -1, 0), 0);
  const clipPlane3 = new Plane(new Vector3(0, 0, -1), 0);

  const scene = new Scene();

  const clippingGroup = new ClippingGroup();
  clippingGroup.clippingPlanes = [ clipPlane1, clipPlane2, clipPlane3 ];
  clippingGroup.enabled = true;
  clippingGroup.clipIntersection = true;

  scene.add(clippingGroup);

  const camera = new PerspectiveCamera(40, 1, 1, 10);
  camera.position.set(3.5, 3.5, 3.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;

  const lineMaterial = new MeshBasicNodeMaterial();
  lineMaterial.colorNode = vec3(0.5, 0.5, 0.5);

  const cubeGeo = new BoxGeometry(2, 2, 2);
  const plane = new PlaneGeometry(2, 2);

  const rgbMaterial = new MeshBasicNodeMaterial({
    side: DoubleSide,
  });
  rgbMaterial.colorNode = rgbCube();

  const cubeMesh = new Mesh(cubeGeo, rgbMaterial);
  const p1Mesh = new Mesh(plane, rgbMaterial);
  const p2Mesh = new Mesh(plane, rgbMaterial);
  p2Mesh.rotation.y = Math.PI * 0.5;
  const p3Mesh = new Mesh(plane, rgbMaterial);
  p3Mesh.rotation.x = Math.PI * 0.5;
  const p1 = new Object3D();
  const p2 = new Object3D();
  const p3 = new Object3D();
  const cube = new Object3D();
  p1.add(p1Mesh);
  p2.add(p2Mesh);
  p3.add(p3Mesh);
  cube.add(cubeMesh);
  scene.add(p1);
  scene.add(p2);
  scene.add(p3);

const cylMat = new MeshBasicMaterial({color: 0xFFFFFF});
const cylGeo = new CylinderGeometry(0.01, 0.01, 2.1, 32);

function makeAxis() {
  const elem = document.createElement('div');
  elem.className = 'label';
  const obj = new CSS2DObject(elem);
  obj.center.set(0, 1);
  const mesh = new Mesh(cylGeo, cylMat);
  mesh.position.x = 1.1;
  mesh.rotation.z = Math.PI * -0.5;
  const labelParent = new Object3D();
  const root = new Object3D();
  const dir = new Vector3( 1, 0, 0 );
  const origin = new Vector3( 0, 0, 0 );
  const length = 2.2;
  const arrow = new ArrowHelper(dir, origin, length, 0xFFFFFF, 0.05, 0.05);
  root.add(mesh);
  root.add(arrow);
  root.add(labelParent);
  labelParent.add(obj);
  labelParent.position.set(2.2, 0, 0);
  //mark.add(labelParent);
  return { elem, obj, root };
}
const rAxis = makeAxis();
const gAxis = makeAxis();
const bAxis = makeAxis();

rAxis.root.position.set(-1, -1, 1.2);
rAxis.root.rotation.set(Math.PI * 0, Math.PI * 0, Math.PI * 0);
gAxis.root.position.set(-1, -1, 1.2);
gAxis.root.rotation.z = Math.PI * 0.5;
bAxis.root.position.set(1.2, -1, -1);
bAxis.root.rotation.set(Math.PI * 1, Math.PI * 0.5, 0);


scene.add(rAxis.root);
scene.add(gAxis.root);
scene.add(bAxis.root);

  const stuff = new Object3D();
  stuff.add(cube);

  clippingGroup.add(stuff);

  const midDisc = new Object3D();
  scene.add(midDisc);

  const markerMaterial = new MeshBasicMaterial({
    color: 0x0FF0000,
  });
  const marker = (() => {
    const sphere = new SphereGeometry(0.05);
    return new Mesh(sphere, markerMaterial);
  })();
  scene.add(marker);

  {
    const gridSegments = 8;
    const points = [];
    for (let i = 0; i <= gridSegments; ++i) {
      const x = i / gridSegments * 2 - 1;
      points.push(new Vector3(x, -1, 0));
      points.push(new Vector3(x,  1, 0));
    }

    const gridGeo = new BufferGeometry().setFromPoints(points);
    const grids = [];
    for (let i = 0; i < 9; ++i) {
      const grid = new Object3D();
      const l1 = new LineSegments(gridGeo, lineMaterial);
      const l2 = new LineSegments(gridGeo, lineMaterial);
      l2.rotation.z = Math.PI * 0.5;
      grid.add(l1);
      grid.add(l2);
      grids.push(grid);
    }
    stuff.add(grids[0]);
    stuff.add(grids[1]);
    stuff.add(grids[2]);
    stuff.add(grids[3]);
    stuff.add(grids[4]);
    stuff.add(grids[5]);
    grids[0].position.z = -1.001;
    grids[1].position.z =  1.001;
    grids[2].position.x = -1.001;
    grids[2].rotation.y = Math.PI * 0.5;
    grids[3].position.x =  1.001;
    grids[3].rotation.y = Math.PI * -0.5;
    grids[4].position.y = -1.001;
    grids[4].rotation.x = Math.PI * 0.5;
    grids[5].position.y =  1.001;
    grids[5].rotation.x = Math.PI * -0.5;

    p1.add(grids[6]);
    grids[6].position.z = 0.01;
    p2.add(grids[7]);
    p3.add(grids[8]);
    grids[7].position.x = 0.01;
    grids[7].rotation.y = Math.PI * 0.5;
    grids[8].position.y = 0.01;
    grids[8].rotation.x = Math.PI * 0.5;
  }

  await renderer.init();

  function render() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  controls.addEventListener('change', render);

  const observer = new ResizeObserver(entries => {
    const entry = entries[0];
    const width = entry.devicePixelContentBoxSize?.[0].inlineSize ||
                    entry.contentBoxSize[0].inlineSize * devicePixelRatio;
    const height = entry.devicePixelContentBoxSize?.[0].blockSize ||
                     entry.contentBoxSize[0].blockSize * devicePixelRatio;
    const w = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
    const h = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

    renderer.setSize(w, h, false);
    labelRenderer.setSize(labelRenderer.domElement.clientWidth, labelRenderer.domElement.clientHeight);
    // js messes up here. They refuse to learn how HTML and CSS work and keep fighting it (T_T)
    // Setting the width and height of the element means the browser can no longer make it larger or
    // smaller when the user sizes the window. So, we have to remove the damage from js so the
    // browser can do the correct thing.
    labelRenderer.domElement.style.width = '';
    labelRenderer.domElement.style.height = '';
    render();
  });
  observer.observe(renderer.domElement);

  function nf(label, v) {
    return `${label}:${v.toFixed(2)}`;
  }

  function setRGB(rgb) {
    const [x, y, z] = rgb.map(v => v * 2 - 1);

    marker.position.x = x;
    marker.position.z = z;
    marker.position.y = y;

    clipPlane1.constant = x;
    clipPlane2.constant = y;
    clipPlane3.constant = z;

    p2.position.x = x;
    p1.position.z = z;
    p3.position.y = y;

    rAxis.elem.textContent = nf('R', rgb[0]);
    gAxis.elem.textContent = nf('G', rgb[1]);
    bAxis.elem.textContent = nf('B', rgb[2]);

    rAxis.root.position.y = y;
    rAxis.root.position.z = z;
    //rAxis.mark.position.x = rgb[0] * 2;
    //rAxis.root.position.y = y;

    gAxis.root.position.x = x;
    gAxis.root.position.z = z;
    //gAxis.mark.position.x = rgb[1] * 2;
    //gAxis.root.position.x = x;

    bAxis.root.position.x = x;
    bAxis.root.position.y = y;
    //bAxis.mark.position.x = rgb[2] * 2;
    //bAxis.root.position.y = y;

      const [,,l] = rgbToHsl(rgb);
      markerMaterial.color.setHSL(0, 0, (l + 0.5) % 1);
      render();
    }

  return { elem: div, setRGB };
}