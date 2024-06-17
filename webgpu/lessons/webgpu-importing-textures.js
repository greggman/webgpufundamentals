import {
  renderDiagrams
} from './resources/diagrams.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';
import {
  createElem as el,
} from './resources/elem.js';

const makeText = (parent, t) => {
  return parent.text(t)
    .font({
      family: 'monospace',
      weight: 'bold',
      size: '14',
    })
    .css({
      filter: `
        drop-shadow( 1px  0px 0px #fff) 
        drop-shadow( 0px  1px 0px #fff) 
        drop-shadow(-1px  0px 0px #fff) 
        drop-shadow( 0px -1px 0px #fff) 
      `,
    });
};

function showTextureCoords(elem, zeroZeroBottomLeft) {
    const diagramDiv = el('div');
    const uiDiv = el('div');
    const div = el('div', {}, [diagramDiv, uiDiv]);
    elem.appendChild(div);
    const hEdge = 100;
    const vEdge = 50;
    const size =  100;
    const w = size * 4;
    const h = size * 2;
    const draw = svg().addTo(diagramDiv).viewbox(0, 0, w + hEdge * 2, h + vEdge * 2);
    draw
      .image('/webgpu/resources/images/noodles.jpg')
      .move(hEdge, vEdge)
      .size(w, h)
      .transform({scale: zeroZeroBottomLeft ? [1, -1] : [1, 1]});

    for (let lx = 0; lx < 5; ++lx) {
      const x = hEdge + lx * size;
      draw.line(x , vEdge / 2, x, vEdge + h + vEdge / 2).stroke('white');
      makeText(draw, (lx / 4))
        .transform({
          translate: [
            x,
            zeroZeroBottomLeft ? vEdge + h + vEdge / 5 * 4 : vEdge / 3,
          ],
        })
        .font({anchor: 'middle'});
    }

    for (let ly = 0; ly < 3; ++ly) {
      const y = vEdge + ly * size;
      draw.line(hEdge - vEdge, y, hEdge + w + vEdge / 2, y).stroke('white');
      makeText(draw, (zeroZeroBottomLeft ? (1 - ly / 2) : ly / 2)).transform({translate: [hEdge / 3, y]}).font({anchor: 'middle', 'dominant-baseline': 'middle'});
    }
}

renderDiagrams({
  'texture-atlas': (elem) => {
    showTextureCoords(elem, false);
  },
  'texture-atlas-bottom-left': (elem) => {
    showTextureCoords(elem, true);
  },
});
