import {
  createElem as el,
} from './resources/elem.js';

if (window.prettyPrint) {
  document.querySelectorAll('.tableprettyprint').forEach(elem => {
    elem.classList.add('prettyprint');
    window.prettyPrint(elem);
    elem.classList.remove('prettyprint');
  });
}

{
  const names = new Map();
  const fnRE = /fn (\w+)/;
  document.querySelectorAll('tr>td:nth-child(1)').forEach(e => {
    const m = fnRE.exec(e.textContent);
    if (m && !names.has(m[1])) {
      names.set(m[1], e);
    }
  });

  const toc = document.querySelector('#func-toc');
  const sortedNames = [...names.entries()];
  sortedNames.sort(([a], [b]) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });

  for (const [name, elem] of sortedNames) {
    const id = `func-${name}`;
    elem.appendChild(el('a', {id}));
    toc.appendChild(el('li', {}, [el('a', {href: `#${id}`, textContent: name})]));
  }
}

