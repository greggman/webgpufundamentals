import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el
} from './resources/elem.js';

async function luts(elem) {
  const luts = [
    { name: 'monochrome',      url: 'resources/images/lut/monochrome-s8.png' },
    { name: 'sepia',           url: 'resources/images/lut/sepia-s8.png' },
    { name: 'saturated',       url: 'resources/images/lut/saturated-s8.png', },
    { name: 'posterize',       url: 'resources/images/lut/posterize-s8n.png', },
    { name: 'posterize-3-rgb', url: 'resources/images/lut/posterize-3-rgb-s8n.png', },
    { name: 'posterize-3-lab', url: 'resources/images/lut/posterize-3-lab-s8n.png', },
    { name: 'posterize-4-lab', url: 'resources/images/lut/posterize-4-lab-s8n.png', },
    { name: 'posterize-more',  url: 'resources/images/lut/posterize-more-s8n.png', },
    { name: 'inverse',         url: 'resources/images/lut/inverse-s8.png', },
    { name: 'color negative',  url: 'resources/images/lut/color-negative-s8.png', },
    { name: 'high contrast',   url: 'resources/images/lut/high-contrast-bw-s8.png', },
    { name: 'funky contrast',  url: 'resources/images/lut/funky-contrast-s8.png', },
    { name: 'nightvision',     url: 'resources/images/lut/nightvision-s8.png', },
    { name: 'thermal',         url: 'resources/images/lut/thermal-s8.png', },
    { name: 'b/w',             url: 'resources/images/lut/black-white-s8n.png', },
    { name: 'hue +60',         url: 'resources/images/lut/hue-plus-60-s8.png', },
    { name: 'hue +180',        url: 'resources/images/lut/hue-plus-180-s8.png', },
    { name: 'hue -60',         url: 'resources/images/lut/hue-minus-60-s8.png', },
    { name: 'red to cyan',     url: 'resources/images/lut/red-to-cyan-s8.png' },
    { name: 'blues',           url: 'resources/images/lut/blues-s8.png' },
    { name: 'infrared',        url: 'resources/images/lut/infrared-s8.png' },
    { name: 'radioactive',     url: 'resources/images/lut/radioactive-s8.png' },
    { name: 'goolgey',         url: 'resources/images/lut/googley-s8.png' },
    { name: 'bgy',             url: 'resources/images/lut/bgy-s8.png' },
  ];

  elem.append(
    el('div', { className: 'img-grid-cols' }, luts.map(({ name, url}) =>
      el('div', { className: 'img-grid-item' }, [
        el('img', { src: `/webgpu/${url}`, alt: name }),
        el('div', { textContent: name }),
      ]))
    )
  );
}


async function main() {
  renderDiagrams({
    luts,
  });
}

main();
