/**
 * Callback
 * @callback Callback
 * @memberOf module:twgl
 */

/**
 * Create a raf loop that is only called if element is on screen
 *
 * @param {HTMLElement} element
 * @param {Callback} callback
 * @returns {start, stop}
 */
export function createRequestAnimationFrameLoop(element, callback) {
  let requestId;
  let isIntersecting;
  let isRunning;

  const loop = (time) => {
    requestId = requestAnimationFrame(loop);
    callback(time);
  };

  const requestFrame = () => {
    if (!requestId) {
      requestId = requestAnimationFrame(loop);
    }
  };

  const cancelFrame = () => {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = undefined;
    }
  };

  const start = () => {
    isRunning = true;
    requestFrame();
  };

  const stop = () => {
    isRunning = false;
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = undefined;
    }
  };

  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    isIntersecting = entry.isIntersecting;
    if (isIntersecting && isRunning) {
      requestFrame();
    } else {
      cancelFrame();
    }
  });

  start();
  observer.observe(element);

  return {
    start,
    stop,
  };
}