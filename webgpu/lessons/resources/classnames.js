// function classNames(...classes: (Record<string, boolean> | string | undefined)[]): string {
export function classNames(...classes) {
  const names = [];
  for (const cl of classes) {
    if (typeof cl === 'undefined') {
      //
    } else if (typeof cl === 'string') {
      names.push(cl);
    } else {
      names.push(
          ...Object.entries(cl)
              .filter(([, bool]) => bool)
              .map(([className]) => className)
      );
    }
  }
  return names.join(' ');
}
