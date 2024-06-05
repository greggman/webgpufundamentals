import {
  renderDiagrams
} from './resources/diagrams.js';
import {
  createElem as el,
} from './resources/elem.js';
import UnitCircle from '../resources/js/unit-circle.js';

renderDiagrams({
  'unit-circle': (elem) => {
    const div = el('div');
    elem.appendChild(div);
    const circle = new UnitCircle();
    div.appendChild(circle.domElement);
  },
  'static-circle-30': (elem) => {
    const div = el('div');
    elem.appendChild(div);
    const circle = new UnitCircle({
      angle: 30 * Math.PI / 180,
      frozen: true,
    });
    div.appendChild(circle.domElement);
  },
  'static-circle-60': (elem) => {
    const div = el('div');
    elem.appendChild(div);
    const circle = new UnitCircle({
      angle: 60 * Math.PI / 180,
      frozen: true,
    });
    div.appendChild(circle.domElement);
  },
});