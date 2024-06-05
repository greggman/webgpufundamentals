
import { makeTable } from '/webgpu/lessons/resources/elem.js';
import { zip } from '/webgpu/lessons/resources/utils.js';

document.querySelectorAll('[data-table]').forEach(elem => {
  const data = JSON.parse(elem.dataset.table);
  const addRow = makeTable(elem, data.cols);
  data.rows.forEach(row => addRow(zip(data.classNames, row)));
});