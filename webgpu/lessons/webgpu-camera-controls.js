import {
  renderDiagrams
} from './resources/js/diagrams.js';
import {
  createElem as el
} from './resources/js/elem.js';
import GUI from '../../3rdparty/muigui-0.x.module.js';

import { importThreeJS } from './resources/js/import-three.js.js';
const threeP = importThreeJS('r182');

async function cameraRig() {
  const {
    ArrowHelper,
    BoxGeometry,
    BufferGeometry,
    CameraHelper,
    ClippingGroup,
    CylinderGeometry,
    DoubleSide,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    Object3D,
    PointLight,
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

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  const canvas = el('canvas', {
    style: {
      width: '100%',
      height: '100%',
      aspectRatio: '1.5 / 1',
    },
  });

  const renderer = new WebGPURenderer({ device, canvas });
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.id = 'labels';

  const clipPlane1 = new Plane(new Vector3(-1, 0, 0), 0);
  const clipPlane2 = new Plane(new Vector3(0, -1, 0), 0);
  const clipPlane3 = new Plane(new Vector3(0, 0, -1), 0);

  const scene = new Scene();

  const clippingGroup = new ClippingGroup();
  clippingGroup.clippingPlanes = [ clipPlane1, clipPlane2, clipPlane3 ];
  clippingGroup.enabled = true;
  clippingGroup.clipIntersection = true;

  scene.add(clippingGroup);

  const degToRad = d => d * Math.PI / 180;

  const camera = new PerspectiveCamera(40, 1, 1, 100);
  const a = degToRad(33);
  camera.position.set(Math.cos(a) * 25, 25, Math.sin(a) * 25);

  const light1 = new PointLight(0xffffff, 10000, 1000);
  light1.position.set(50, 50, 50);
  scene.add(light1);
  const light2 = new PointLight(0xffffff, 10000, 1000);
  light2.position.set(-50, 40, -10);
  scene.add(light2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.y = 7.5;
  controls.update();

  const camTarget = new Object3D();
  const camPitch = new Object3D();
  const camTilt = new Object3D();
  const camExtend = new Object3D();
  const cam = new Object3D();
  scene.add(camTarget);
  camTarget.add(camPitch);
  camPitch.add(camTilt);
  camTilt.add(camExtend);
  camExtend.add(cam);

  camTarget.position.z = -4;
  camPitch.rotation.y = degToRad(-15);
  camTilt.rotation.x = degToRad(-20);

  const tankMaterial = new MeshStandardMaterial({ color: 0x80A0FF });
  const tankGeo = new BoxGeometry(10, 3, 10);
  const tankMesh = new Mesh(tankGeo, tankMaterial);
  camTarget.add(tankMesh);

  const tankHeadMaterial = new MeshStandardMaterial({ color: 0x80FFA0, flatShading: true });
  const tankHeadGeo = new CylinderGeometry( 4.5, 4.5, 3, 6 );
  const tankHead = new Mesh(tankHeadGeo, tankHeadMaterial);
  camPitch.position.y = 3;
  camPitch.add(tankHead);

  const tankTiltMaterial = new MeshStandardMaterial({ color: 0xFF80A0 });
  const tankTiltGeo = new BoxGeometry(6, 3, 3);
  const tankTilt = new Mesh(tankTiltGeo, tankTiltMaterial);
  camTilt.position.y = 3;
  camTilt.add(tankTilt);

  const tankBarrelMaterial = new MeshStandardMaterial({ color: 0xFFA0FF });
  const tankBarrelGeo = new BoxGeometry(3, 3, 1);
  const tankBarrel = new Object3D();
  const tankBarrelH = new Object3D();
  const tankBarrelMesh = new Mesh(tankBarrelGeo, tankBarrelMaterial);
  tankBarrelMesh.position.z = 0.5;
  tankBarrelH.add(tankBarrelMesh);
  tankBarrelH.scale.z = 15;
  tankBarrel.add(tankBarrelH);
  tankBarrel.position.z = 1.5;
  camTilt.add(tankBarrel);
  camExtend.position.z = tankBarrelH.scale.z;

  const camera2 = new PerspectiveCamera(45, 1.5, 3, 10);
  const camHelper = new CameraHelper(camera2);
  cam.add(camHelper);
  cam.position.y = 3;

  const cameraRadToDegOptions = { min: -180, max: 180, step: 1, converters: GUI.converters.radToDeg };

  const uiElem = el('div', { className: 'ui' });
  const gui = new GUI(uiElem);
  gui.onChange(render);
  GUI.setTheme('float');
  gui.add(camTarget.position, 'x', -10, 10).name('camTarget x');
  gui.add(camTarget.position, 'z', -10, 10).name('camTarget z');
  gui.add(camPitch.rotation, 'y', cameraRadToDegOptions).name('camPitch rotY');
  gui.add(camTilt.rotation, 'x', cameraRadToDegOptions).name('camTilt rotX');
  gui.add(tankBarrelH.scale, 'z', 0.1, 20).name('camExtend z')
    .onChange(v => {
      camExtend.position.z = v;
    });
  const settings = { collapse: false };
  gui.add(settings, 'collapse').onChange(function(v) {
    if (!v) {
      camPitch.position.y = 3;
      camTilt.position.y = 3;
      cam.position.y = 3;
      tankBarrelMesh.scale.x = 1;
      tankBarrelMesh.scale.y = 1;
      tankMesh.scale.y = 1;
      tankHead.scale.y = 1;
      tankTilt.scale.y = 1;
      tankTilt.scale.z = 1;
      tankBarrel.position.z = 1.5;
    } else {
      camPitch.position.y = 0;
      camTilt.position.y = 0;
      cam.position.y = 0;
      tankBarrelMesh.scale.x = 0.12;
      tankBarrelMesh.scale.y = 0.12;
      tankMesh.scale.y = 0.1;
      tankHead.scale.y = 0.11;
      tankTilt.scale.y = 0.3;
      tankTilt.scale.z = 0.3;
      tankBarrel.position.z = 1.5 * 0.3;
    }
    render();
  });

  const div = el('div', {className: 'camera-rig'}, [
    canvas,
    labelRenderer.domElement,
    uiElem,
  ]);

  await renderer.init();

  function render() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
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

  return { elem: div };
}

async function main() {
  renderDiagrams({
    'camera-rig': async(elem) => {
      await threeP;
      const { elem: diagramElem } = await cameraRig();

      elem.append(el('div', {}, [
        diagramElem,
      ]));

    },
  });
}

main();
