import {
  renderDiagrams
} from './resources/diagrams.js';

renderDiagrams({
  'dpr': (elem) => {
    const update = () => {
      elem.textContent = window.devicePixelRatio;
    };
    update();
    window.addEventListener('resize', update);
  },
});