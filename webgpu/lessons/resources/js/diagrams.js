import {
  kebabCaseToCamelCase,
} from './utils.js';

export function renderDiagrams(fns, tag = 'data-diagram') {
  const name = kebabCaseToCamelCase(tag.substring(5));
  document.querySelectorAll(`[${tag}]`).forEach(elem => {
    const fnName = elem.dataset[name];
    const fn = fns[fnName];
    if (!fn) {
      throw new Error(`no function named: ${fnName} for diagram`);
    }

    // try/catch so that if one diagram fails the others still run
    // unless the debugger is open 😉
    try {
      fn(elem);
    } catch (e) {
      console.error(e, e.stack);
      // eslint-disable-next-line no-debugger
      debugger;
    }
  });
}