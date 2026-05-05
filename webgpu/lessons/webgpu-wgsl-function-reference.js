import {
  createElem as el,
} from './resources/js/elem.js';

if (window.prettyPrint) {
  document.querySelectorAll('.tableprettyprint').forEach(elem => {
    elem.classList.add('prettyprint');
    window.prettyPrint(elem);
    elem.classList.remove('prettyprint');
  });
}

{
  const names = new Map();
  document.querySelectorAll('[data-name]').forEach(e => {
    const elementsForName = names.get(e.dataset.name) ?? [];
    elementsForName.push(e);
    names.set(e.dataset.name, elementsForName);
  });
  const fnRE = /fn (\w+)/;
  document.querySelectorAll('tr>td:nth-child(1)').forEach(e => {
    const m = fnRE.exec(e.textContent);
    if (m) {
      const elementsForName = names.get(m[1]) ?? [];
      elementsForName.push(e);
      names.set(m[1], elementsForName);
    }
  });

  const toc = document.querySelector('#func-toc');
  const sortedNames = [...names.entries()];
  sortedNames.sort(([a], [b]) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });

  for (const [name, elements] of sortedNames) {
    elements.forEach((elem, ndx) => {
      const id = `func-${name}${ndx > 0 ? `-${ndx}` : ''}`;
      elem.prepend(el('a', {id}));
      toc.appendChild(el('li', {}, [el('a', {href: `#${id}`, textContent: name})]));
    });
  }
}

