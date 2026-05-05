let importedVersion;
let importP;

function createVersionPromise(version) {
  return new Promise((resolve) => {
    const prefix = `/3rdparty/three.js/${version}`;
    const importMap = {
      imports: {
        'three': `${prefix}/build/three.webgpu.js`,
        'three/webgpu': `${prefix}/build/three.webgpu.js`,
        'three/tsl': `${prefix}/build/three.tsl.js`,
        'three/addons/': `${prefix}/examples/jsm/`,
      },
    };
    const script = document.createElement('script');
    script.type = 'importmap';
    script.text = JSON.stringify(importMap, null, 2);
    document.head.append(script);
    resolve();
  });
}

export function importThreeJS(version) {
  if (importedVersion && importedVersion !== version) {
    throw new Error(`version: ${importedVersion} already imported, you can not import 2 versions`)
  }

  importedVersion = version;

  importP = importP ?? createVersionPromise(version);
  return importP;
}
