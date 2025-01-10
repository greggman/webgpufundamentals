/**
 * I'm not sure what the best way of styling muigui buttons is.
 * Maybe we shouldn't style them at all and instead make our own.
 * For now, just using this hack.
 */
export function addButtonLeftJustified(gui, name, fn) {
  const button = gui.addButton(name, fn);
  Object.assign(
    button.domElement.querySelector('button').style,
    {
      textAlign: 'left',
      fontFamily: 'monospace',
      whiteSpace: 'pre',
    }
  );
  return button;
}
