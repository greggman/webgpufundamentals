// yea, gross
export const range = (n, fn) => new Array(n).fill(0).map((_, i) => fn(i));

const kebabRE = /-([a-z])/g;
export function kebabCaseToCamelCase(s) {
  return s.replace(kebabRE, (_, m1) => m1.toUpperCase());
}

export function convertHexToBytes(text) {
  const array = [];
  for (let i = 0; i < text.length; i += 2) {
    const tmpHex = text.substring(i, i + 2);
    array.push(parseInt(tmpHex, 16));
  }
  return array;
}

export function convertBytesToHex(byteArray) {
  let hex = '';
  const il = byteArray.length;
  for (let i = 0; i < il; i++) {
    if (byteArray[i] < 0) {
      byteArray[i] = byteArray[i] + 256;
    }
    let tmpHex = byteArray[i].toString(16);
    // add leading zero
    if (tmpHex.length === 1) {
      tmpHex = '0' + tmpHex;
    }
    hex += tmpHex;
  }
  return hex;
}

export function zip(...arrays) {
  return arrays[0].map((_, i) => arrays.map(arr => arr[i]));
}

export const euclideanModulo = (x, a) => x - a * Math.floor(x / a);
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const clamp01 = v => Math.min(1, Math.max(0, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * make css hsl string from normalized inputs
 * @param {number} h hue 0 to 1
 * @param {number} s saturation 0 to 1
 * @param {number} l luminance 0 to 1
 * @returns css hsl() string
 */
export const hsl = (h, s, l) => `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;

/**
 * make css hsla string from normalized inputs
 * @param {number} h hue 0 to 1
 * @param {number} s saturation 0 to 1
 * @param {number} l luminance 0 to 1
 * @param {number} a alpha 0 to 1
 * @returns css hsla() string
 */
export const hsla = (h, s, l, a) => `hsla(${h * 360}, ${s * 100}%, ${l * 100}%, ${a})`;

/**
 * make css rgb string from normalized inputs
 * @param {number} r red 0 to 1
 * @param {number} g green 0 to 1
 * @param {number} b blue 0 to 1
 * @returns css rgb() string
 */
export const rgb = (r, g, b) => `rgb(${r * 255}, ${g * 255}, ${b * 255})`;

/**
 * make css rgba string from normalized inputs
 * @param {number} r red 0 to 1
 * @param {number} g green 0 to 1
 * @param {number} b blue 0 to 1
 * @param {number} a alpha 0 to 1
 * @returns css rgba() string
 */
export const rgba = (r, g, b, a) => `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;

/**
 * make an rgba8unorm color (Array of 4 values between 0 and 255) from a CSS color
 */
export const rgba8unormFromCSS = (() => {
  let ctx;
  return function rgba8unormFromCSS(cssColor) {
    if (!ctx) {
      ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
      ctx.canvas.width = 1;
      ctx.canvas.height = 1;
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const imgData = ctx.getImageData(0, 0, 1, 1);
    return Array.from(imgData.data);
  };
})();

export const rgbaFloatFromCSS = (cssColor) => {
  return rgba8unormFromCSS(cssColor).map(v => v / 255);
};

export const shortSize = (function() {
  const suffixes = ['b', 'k', 'mb', 'gb', 'tb', 'pb'];
  return function(size) {
    const suffixNdx = Math.log2(Math.abs(size)) / 10 | 0;
    const suffix = suffixes[Math.min(suffixNdx, suffixes.length - 1)];
    const base = 2 ** (suffixNdx * 10);
    return `${(size / base).toFixed(0)}${suffix}`;
  };
})();