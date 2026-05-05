import {
  renderDiagrams
} from './resources/js/diagrams.js';

renderDiagrams({
  'dpr': (elem) => {
    const update = () => {
      elem.textContent = window.devicePixelRatio;
    };
    update();
    window.addEventListener('resize', update);
  },
});