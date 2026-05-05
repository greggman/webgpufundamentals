
import { makeTable } from './elem.js';
import { zip } from './utils.js';

document.querySelectorAll('[data-table]').forEach(elem => {
  const data = JSON.parse(elem.dataset.table);
  const addRow = makeTable(elem, data.cols);
  data.rows.forEach(row => addRow(zip(data.classNames, row)));
});