
const canvasToSizeMap = new WeakMap();
const canvasToCallback = new WeakMap();

const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    canvasToSizeMap.set(entry.target, {
       width: entry.contentBoxSize[0].inlineSize,
       height: entry.contentBoxSize[0].blockSize,
    });
    canvasToCallback.get(entry.target)?.();
  }
});

const noop = () => {};

export function add(canvas, callback = noop) {
  canvasToCallback.set(canvas, callback);
  observer.observe(canvas);
}

function getCanvasDisplaySize(canvas, device, mult = 1) {
  // Get the canvas's current display size
  let { width, height } = canvasToSizeMap.get(canvas) || canvas;

  // Adjust for DPR if we want. Note: this is not perfect but it's good enough.
  width *= mult;
  height *= mult;

  // Make sure it's valid for WebGPU
  width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
  height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

  return {
    width,
    height,
  };
}

export function resizeThreeJS(renderer, device, mult = 1) {
  const { width, height } = getCanvasDisplaySize(renderer.domElement, device, mult);
  renderer.setSize(width, height, false);
}

export function resizeCanvasToDisplaySize(canvas, device, mult = 1) {
  Object.assign(canvas, getCanvasDisplaySize(canvas, device, mult));
}
