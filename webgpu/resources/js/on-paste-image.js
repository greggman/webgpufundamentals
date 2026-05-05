export default function onPasteImage(fn) {
  document.addEventListener('paste', (e) => {
    e.preventDefault();
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile(); // Get the image as a Blob (File object)
        fn(blob);
        break;
      }
    }
  });
}