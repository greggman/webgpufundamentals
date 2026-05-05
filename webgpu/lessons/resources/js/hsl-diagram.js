import {
  createElem as el
} from './elem.js';
export async function hslDiagram() {
  const div = el('div');
  const {
    BufferGeometry,
    ClippingGroup,
    CylinderGeometry,
    DoubleSide,
    Line,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshBasicNodeMaterial,
    PerspectiveCamera,
    Object3D,
    Plane,
    PlaneGeometry,
    PolarGridHelper,
    Scene,
    SphereGeometry,
    Vector3,
    WebGPURenderer,
  } = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const {
    Fn: tslFn,
    positionWorld,
    vec2, vec3,
    atan,
    length,
    clamp,
    abs,
    mod,
    oneMinus,
    TWO_PI,
  } = await import('three/tsl');

  const hsl2rgb = tslFn(([ h, s, l ]) => {
    const k = vec3(0.0, 4.0, 2.0);
    const p = abs(
      mod(h.mul(6.0).add(k), 6.0)
        .sub(3.0)
    ).sub(1.0);

    const rgb = clamp(p, 0.0, 1.0);
    const c = oneMinus(abs(l.mul(2.0).sub(1.0))).mul(s);

    return vec3(l).add(c.mul(rgb.sub(0.5)));
  });

  const cylinderHSL = tslFn(() => {
    const p = positionWorld;

    const h = atan(p.z, p.x)
      .div(TWO_PI)
      .add(0.5);

    const s = clamp(
      length(vec2(p.x, p.z)),
      0.0,
      1.0
    );

    const l = oneMinus(
      p.y.add(-1.0).mul(-0.5)
    );

    return hsl2rgb(h, s, l);
  });

  const lerp = (a, b, t) => a + (b - a) * t;

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  const canvas = el('canvas', {
    style: {
      width: '100%',
      height: '100%',
      aspectRatio: '1 / 1',
    },
  });

  let hTarget = 0;

  const renderer = new WebGPURenderer({ device, canvas });
  div.append(canvas);

  const scene = new Scene();

  const clipPlane1 = new Plane(new Vector3(1, 0, 0), 0);
  const clipPlane2 = new Plane(new Vector3(0, 1, 0), 0);
  const clipPlane3 = new Plane(new Vector3(0, -1, 0), 0);

  const clippingGroup = new ClippingGroup();
  clippingGroup.clippingPlanes = [ clipPlane1, clipPlane2, clipPlane3 ];
  clippingGroup.enabled = true;
  clippingGroup.clipIntersection = true;
  scene.add(clippingGroup);

  const cameraRoot = new Object3D();
  scene.add(cameraRoot);
  const camera = new PerspectiveCamera(40, 1, 1, 10);
  camera.position.set(-2.8, 2.8, -2.8);
  cameraRoot.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;

  const lineMaterial = new MeshBasicNodeMaterial();
  lineMaterial.colorNode = vec3(0.5, 0.5, 0.5);

  const radialSegments = 16;
  const bigCylinderGeo = new CylinderGeometry(
    1, // radius top,
    1, // radius bottom,
    2, // height,
    radialSegments * 4, // radial segments
    1, // height segments
    false, // open ended
    0, // start
    Math.PI * 2, // end
  );
  const smallCylinderGeo = new CylinderGeometry(
    1, // radius top,
    1, // radius bottom,
    2, // height,
    radialSegments * 4, // radial segments
    1, // height segments
    false, // open ended
    Math.PI * 2 * 1 / 3 * 0, // start
    Math.PI * 2 * 2 / 3, // end
  );
  const plane = new PlaneGeometry(1, 2);

  const planeLine = (() => {
    const points = [];
    points.push(new Vector3(-0.5, -1, 0));
    points.push(new Vector3( 0.5, -1, 0));
    points.push(new Vector3( 0.5,  1, 0));
    points.push(new Vector3(-0.5,  1, 0));
    points.push(new Vector3(-0.5, -1, 0));
    return new BufferGeometry().setFromPoints(points);
  })();

  const hslMaterial = new MeshBasicNodeMaterial({
    side: DoubleSide,
  });
  hslMaterial.colorNode = cylinderHSL();

  const bigCylinder = new Mesh(bigCylinderGeo, hslMaterial);
  const smallCylinder = new Mesh(smallCylinderGeo, hslMaterial);
  const p1Mesh = new Mesh(plane, hslMaterial);
  const p2Mesh = new Mesh(plane, hslMaterial);
  const p1Line = new Line(planeLine, lineMaterial);
  const p2Line = new Line(planeLine, lineMaterial);
  p1Mesh.position.x = 0.5;
  p2Mesh.position.x = 0.5;
  p1Line.position.x = 0.5;
  p2Line.position.x = 0.5;
  const p1 = new Object3D();
  const p2 = new Object3D();
  const cyl = new Object3D();
  p1.add(p1Mesh);
  p2.add(p2Mesh);
  p1.add(p1Line);
  p2.add(p2Line);
  cyl.add(bigCylinder);
  cyl.add(smallCylinder);
  cyl.add(p1);
  cyl.add(p2);
  p1.rotation.y = Math.PI * -0.5 + Math.PI * 2 * 2 / 3;
  p2.rotation.y = Math.PI * -0.5;
  scene.add(cyl);

  const stuff = new Object3D();
  //scene.add(stuff);
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
    const points = [];
    for (let i = 0; i <= radialSegments; ++i) {
      const a = i / radialSegments * Math.PI * 2;
      const r = 1.01;
      points.push(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }

    const circle = new BufferGeometry().setFromPoints(points);
    for (let y = -1; y <= 1; y += 0.25) {
      const line = new Line(circle, lineMaterial);
      line.position.y = y;
      line.scale.x = 1.01;
      line.scale.z = 1.01;
      stuff.add(line);
    }

    const gridGeo = (() => {
      const points = [];
      const hParts = 5;
      for (let i = 1; i < hParts; ++i) {
        const x = i / hParts;
        points.push(new Vector3(x, -1, 0));
        points.push(new Vector3(x,  1, 0));
      }
      const vParts = 8;
      for (let i = 1; i < vParts; ++i) {
        const y = i / vParts * 2 - 1;
        points.push(new Vector3(0, y, 0));
        points.push(new Vector3(1, y, 0));
      }
      return new BufferGeometry().setFromPoints(points);
    })();

    const pg1 = new LineSegments(gridGeo, lineMaterial);
    const pg2 = new LineSegments(gridGeo, lineMaterial);
    pg1.position.z = -0.01;
    pg2.position.z =  0.01;
    p1.add(pg1);
    p2.add(pg2);

    const helper = new PolarGridHelper(
      1, // radius,
      radialSegments, // sectors,
      5, // rings,
      64, // divisions
      0x808080,
      0x808080,
    );
    midDisc.add(helper);

    for (let r = 0; r < 1; r += 0.2) {
      for (let y = -1; y <= 1; y += 2) {
        const line = new Line(circle, lineMaterial);
        line.position.y = y * 1.01;
        line.scale.x = r;
        line.scale.z = r;
        stuff.add(line);
      }
    }
    for (let i = 0; i <= radialSegments; ++i) {
      const line = new Line(planeLine, lineMaterial);
      line.position.x = 0.5;
      line.scale.x = 1.01;
      line.scale.y = 1.01;
      const o = new Object3D();
      o.add(line);
      o.rotation.y = i / radialSegments * Math.PI * 2;
      stuff.add(o);
    }
  }

  await renderer.init();

  function render() {
    requestId = undefined;

    const angleDiff = hTarget - cameraRoot.rotation.y;
    cameraRoot.rotation.y = lerp(cameraRoot.rotation.y, hTarget, 1);

    renderer.render(scene, camera);

    if (Math.abs(angleDiff) > 0.001) {
      requestRender();
    }

  }

  let requestId;
  function requestRender() {
    if (requestId) {
      return;
    }
    requestId = requestAnimationFrame(render);
  }

  controls.addEventListener('change', requestRender);

  function setHSL(hsl) {
    const [h, s, l] = hsl;
    const a = h * Math.PI * 2 + Math.PI;
    const r = s;
    const y = l * 2 - 1;
    marker.position.x = Math.cos(a) * r;
    marker.position.z = Math.sin(a) * r;
    marker.position.y = y;
    cyl.rotation.y = -a + Math.PI * 0.5;
    bigCylinder.scale.y = l;
    bigCylinder.position.y = -(1 - l);
    midDisc.position.y = l * 2 - 1 + 0.01;

    const a1 = a + Math.PI + 0.5;
    clipPlane2.normal.set(Math.cos(a1), 0, Math.sin(a1));
    const a2 = a1 + 60 * Math.PI / 180;
    clipPlane1.normal.set(Math.cos(a2), 0, Math.sin(a2));
    clipPlane3.constant = l * 2 - 1;
    markerMaterial.color.setHSL(0, 0, (l + 0.5) % 1);

    hTarget = -h * Math.PI * 2;
    requestRender();
  }

  const observer = new ResizeObserver(entries => {
    const entry = entries[0];
    const width = entry.devicePixelContentBoxSize?.[0].inlineSize ||
                    entry.contentBoxSize[0].inlineSize * devicePixelRatio;
    const height = entry.devicePixelContentBoxSize?.[0].blockSize ||
                     entry.contentBoxSize[0].blockSize * devicePixelRatio;
    renderer.setSize(
      Math.max(1, Math.min(width, device.limits.maxTextureDimension2D)),
      Math.max(1, Math.min(height, device.limits.maxTextureDimension2D)),
      false,
    );
    requestRender();
  });
  observer.observe(renderer.domElement);

  return { elem: div, setHSL };
}
