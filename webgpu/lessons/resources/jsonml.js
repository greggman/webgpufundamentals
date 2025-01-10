/**
 * Implements JsonML *like* element creation (http://www.jsonml.org/)
 *
 * The major difference is this takes event handlers for `on` functions
 * and supports nested attributes? Also allows elements.
 *
 * ```js
 * document.body.appendChild(makeElem([
 *   'style',
 *   '.bold { font-weight: bold; }',
 *   '.italic { font-style: italic; }',
 * ]));
 *
 * document.body.appendChild(makeElem([
 *   'div',
 *   'This next word is ',
 *   ['span', {style: 'color: red'}, 'red'],       // style is string
 *   ' and this next word is ',
 *   ['span', {style: {color: 'blue'}}, 'blue'],   // style is object
 *   ' and this next word is ',
 *   ['span', {className: 'bold'}, 'bold'],        // className works
 *   ' and this next word is ',
 *   ['span', {class: 'italic bold'}, 'italic-bold'],  // class works too?
 * ]));
 *
 * document.body.appendChild(makeElem([
 *   'form',
 *   'Enter name:',
 *   ['input', {type: 'text', placeholder: 'Jane Doe'}],
 *   [
 *     'button',
 *     {
 *       type: 'button',
 *       onClick: (e) => {
 *         console.log('name:', e.target.previousElementSibling.value);
 *       },
 *     },
 *     'submit',
 *   ],
 * ]));
 * ```
 */
export function makeElem(elemSpec) {
  const tag = elemSpec[0];
  if (tag instanceof Node) {
    return tag;
  }
  const elem = document.createElement(tag);

  let firstChildNdx = 1;
  if (typeof elemSpec[1] !== Node && typeof elemSpec[1] !== 'string' && !Array.isArray(elemSpec[1])) {
    firstChildNdx = 2;
    for (const [key, value] of Object.entries(elemSpec[1])) {
      if (typeof value === 'function' && key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        elem.addEventListener(eventName, value, {passive: false});
      } else if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          elem[key][k] = v;
        }
      } else if (elem[key] === undefined) {
        elem.setAttribute(key, value);
      } else {
        elem[key] = value;
      }
    }
  }

  for (let ndx = firstChildNdx; ndx < elemSpec.length; ++ndx) {
    const v = elemSpec[ndx];
    if (typeof v === 'string') {
      elem.appendChild(document.createTextNode(v));
    } else if (v instanceof Node) {
      elem.appendChild(v);
    } else {
      elem.appendChild(makeElem(v));
    }
  }
  return elem;
}
