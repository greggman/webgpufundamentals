import {
  renderDiagrams
} from './resources/diagrams.js';
import { SVG as svg } from '../../3rdparty/svg.esm.js';

function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const positions = new Float32Array(numSubdivisions * 2 * 3 * 2);

  // 2 vertices per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const offset = i * 6 * 2;
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // first triangle
    positions[offset +  0] = c1 * radius;
    positions[offset +  1] = s1 * radius;
    positions[offset +  2] = c2 * radius;
    positions[offset +  3] = s2 * radius;
    positions[offset +  4] = c1 * innerRadius;
    positions[offset +  5] = s1 * innerRadius;

    positions[offset +  6] = c1 * innerRadius;
    positions[offset +  7] = s1 * innerRadius;
    positions[offset +  8] = c2 * radius;
    positions[offset +  9] = s2 * radius;
    positions[offset + 10] = c2 * innerRadius;
    positions[offset + 11] = s2 * innerRadius;
  }

  return {
    positions,
  };
}

renderDiagrams({
  circle(elem) {
    const draw = svg().addTo(elem).viewbox(0, 0, 300, 300);
    const { positions } = createCircleVertices({
      radius: 0.5,
      innerRadius: 0.25,
    });
    for (let i = 0; i < positions.length; i += 6) {
      const angle = i / positions.length * Math.PI * 2;
      const offset = [Math.cos(angle), Math.sin(angle)].map(v => v * 25);

      const polyline = draw.polygon(Array.from(positions.subarray(i, i + 6)).map((v, i) => v * 250 + 150 + offset[i % 2]));
      polyline.fill('none').stroke({ color: '#f06', width: 1, linecap: 'round', linejoin: 'round' });
    }
  },
});