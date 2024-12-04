import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from '../../../3rdparty/three.js/three.module.min.js';
import * as resizeUtils from './resize-utils.js';
import {
  createRequestAnimationFrameLoop,
} from './good-raf.js';

export default function mipmapDiagram(canvas) {
	const renderer = new WebGLRenderer( { antialias: true, canvas } );

	const camera = new PerspectiveCamera(75, 2, 0.1, 5);
	camera.position.z = 2;

	const scene = new Scene();
	const geometry = new BoxGeometry(1, 1, 1);
	const material = new MeshBasicMaterial({color: 0x44aa88});

	const cube = new Mesh(geometry, material);
	scene.add(cube);

  // fake device
  const device = {
    limits: {
      maxTextureDimension2D: 4096,
    },
  };

  function render() {
    resizeUtils.resizeThreeJS(renderer, device);

		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  createRequestAnimationFrameLoop(canvas, (time) => {
    time *= 0.001;
    cube.rotation.x = time;
    cube.rotation.y = time * 1.1;
    render();
  });
  resizeUtils.add(canvas/*, render*/);
}
