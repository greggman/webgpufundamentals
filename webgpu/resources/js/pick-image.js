const fileElem = document.createElement('input');
fileElem.type = 'file';
fileElem.accept = 'image/*';

let resolve;

const finish = (file) => {
  console.log('finish:', file);
  fileElem.removeEventListener('change', onChange);
  fileElem.removeEventListener('cancel', onCancel);
  const r = resolve;
  resolve = undefined;
  r(file);
};

const onChange = fileElem.addEventListener('change', e => {
  finish(e.target.files[0]);
});
const onCancel = () => finish();

const pickImage = () => new Promise(_resolve => {
  resolve = _resolve;
  fileElem.addEventListener('change', onChange);
  fileElem.addEventListener('cancel', onCancel);
  fileElem.click();
});

export default pickImage;
