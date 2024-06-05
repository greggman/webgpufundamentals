export function createElem(tag, attrs = {}, children = []) {
  if (Array.isArray(attrs)) {
    children = attrs;
    attrs = {};
  }
  const elem = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
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
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}

const el = createElem;
const c = (tag, children = [], textContent = '') => {
  return createElem(tag, {textContent}, children);
};

/**
 * ```
 * const addRow = makeTable(parent, ['name', 'location']);
 * addRow(['Gregg', 'SF']);
 * addRow(['Tami', 'Glendora']);
 * addRow(['Mom', 'Temecula']);
 * addRow([['red', 'apple'], ['yellow', 'banana']]);
 *   // makes
 *   // <tr>
 *   //   <td><span class="red">apple</span></td>
 *   //   <td><span class="green">banana</span></td>
 *   // </tr>
 * addRow([createElem('div')])
 * ```
*/
export function makeTable(parent, columnNames) {
  const makeRow = (arr, tag = 'td') => c('tr', arr.map(
    v => v instanceof HTMLElement
      ? createElem(tag, {}, [v])
      : Array.isArray(v)
        ? createElem(tag, {className: v[0], textContent: v[1]})
        : c(tag, [], v)));

  const tbody = c('tbody');
  parent.appendChild(c('table', [
    c('thead', [makeRow(columnNames, 'th')]),
    tbody,
  ]));
  return function(columnData) {
    tbody.appendChild(makeRow(columnData));
  };
}

export function radio(label, options, value, callback) {
  const name = crypto.randomUUID();
  const parent = el('div', {className: 'radio center', textContent: `${label}:`}, options.map(option => {
    return el('label', {}, [
      el('input', {
        name,
        type: 'radio',
        value: option,
        checked: option === value,
        onInput: () => {
          callback(parent.querySelector('input:checked').value);
        },
      }),
      el('div', {textContent: option}),
    ]);
  }));
  return parent;
}

export function checkbox(label, checked, callback) {
  const parent = el('div', {className: 'checkbox center'}, [
    el('label', {}, [
      el('input', {
        type: 'checkbox',
        checked,
        onInput: function() {
          callback(this.checked);
        },
      }),
      el('div', {textContent: label}),
    ]),
  ]);
  return parent;
}

export function select(label, options, selectedIndex, callback) {
  const select = el(
    'select',
    {
      onInput: function() {
        callback(select.selectedIndex);
      },
    },
    options.map((option, ndx) => el('option', { selected: selectedIndex === ndx, textContent: option})),
  );
  const parent = el('div', {className: 'select center'}, [
    select,
  ]);
  return parent;
}