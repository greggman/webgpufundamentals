export function makePixelPerfect(elem) {
  if (elem instanceof HTMLImageElement && !elem.complete) {
    elem.decode()
      .then(() => {
        makePixelPerfect(elem);
       });
    return;
  }
  const origWidth = elem.naturalWidth || elem.width; // TODO, handle canvas, video?
  const origHeight = elem.naturalHeight || elem.height;
  const options = {
    scale: 1,
  };

  {
    const q = elem.dataset.pixelPerfect;
    if (q) {
      if (q.includes('=')) {
        Object.assign(options, Object.fromEntries(new URLSearchParams(elem.dataset.pixelPerfect || '').entries()));
      } else {
        const scale = parseInt(q);
        if (scale > 0) {
          options.scale = scale;
        }
      }
    } else {
      // guess the scale based on the natural size vs the CSS size
      const cssWidth = Math.round(parseFloat(getComputedStyle(elem).width));
      const scale = Math.round(Math.max(1, cssWidth / origWidth));
      if (scale > 0) {
        elem.dataset.pixelPerfect = scale;
        options.scale = scale;
      }
    }

  }

  let scale = options.scale
  if (scale % 1 !== 0) {
    console.warn('scale must be an integer value');
  }

  const px = v => `${v}px`;

  let good;
  do {
    const desiredWidth = origWidth * scale;
    const targetWidth = desiredWidth * devicePixelRatio;
    const mult = Math.max(1, Math.round(targetWidth / origWidth));
    const cssWidth = origWidth * mult / devicePixelRatio
    const cssHeight = origHeight * mult / devicePixelRatio
    elem.style.width = px(cssWidth);
    elem.style.height = px(cssHeight);

    // get the size it will actually be displayed. If smaller than we asked,
    // try the next smallest integer size
    const {width, height} = elem.getBoundingClientRect();
    const diffX = Math.abs(cssWidth - width);
    const diffY = Math.abs(cssHeight - height);
    good = diffX < 1 && diffY < 1;
    scale -= 1;
  } while (scale > 0 && !good);

}

function makeAllPixelPerfect() {
  document.querySelectorAll(".pixel-perfect").forEach(makePixelPerfect);
}
window.addEventListener('resize', makeAllPixelPerfect);
makeAllPixelPerfect();

// NOTE: ResizeObserver will not work as
// from the POV of HTML the elements are not changing
// size when the user zooms.
