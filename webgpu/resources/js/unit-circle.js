/*
 * Copyright 2023, GFXFundamentals.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of GFXFundamentals. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import { SVG as svg } from '../../../3rdparty/svg.esm.js';


const setTranslation = (e, x, y) => e.attr({transform: `translate(${x}, ${y})`});
const size = 300;

export default class UnitCircle {
  #draw;
  #angle = 0.3;
  #fn = () => { /* */ };
  #update;
  #requestId;

  constructor(options = {angle: 0.3, frozen: false, yUp: false}) {
    this.#angle = options.angle === undefined ? 0.3 : options.angle;
    const {frozen, yUp} = options;
    const draw = svg().viewbox(0, 0, size, size);
    draw.node.style.userSelect = 'none';
    this.#draw = draw;
    const halfSize = size / 2;
    const gridSize = halfSize * 0.8;

    const darkColors = {
      main: '#fff',
      point: '#80DDFF80',
    };
    const lightColors = {
      main: '#000',
      point: '#8000FF20',
    };
    const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    let colorScheme;

    const marker = draw.marker(20, 12, function(add) {
      add.polygon([0, 0, 10, 6, 0, 12]).attr({orient: 'auto'});
    });

    const makeText = (parent, t) => {
      return parent.text(t)
        .font({
          family: 'monospace',
          weight: 'bold',
          size: '10',
        })
        .css({
          filter: `
            drop-shadow( 1px  0px 0px #fff) 
            drop-shadow( 0px  1px 0px #fff) 
            drop-shadow(-1px  0px 0px #fff) 
            drop-shadow( 0px -1px 0px #fff) 
          `,
        });
    };

    const circleGroup = draw.group();
    setTranslation(circleGroup, halfSize, halfSize);
    const point = circleGroup.group();
    const pointInner = point.circle(20).fill('#8000FFF20').center(0, 0);
    if (!frozen) {
      pointInner.addClass('blink');
    }
    const pointOuter = point.circle(20).fill('none').stroke('#000').center(0, 0);
    const grid = circleGroup.group();
    const tri = grid.polygon([0, 0, -100, 0, 0, -100]).fill('#eeffee20');
    const hLine = grid.line(0, 0, -100, 0).marker('end', marker);
    const vLine = grid.line(0, 0, 0, -100).marker('end', marker);
    const hText = makeText(grid, 'X=0').font({anchor: 'middle'});
    const vText = makeText(grid, 'Y=0').font({anchor: 'middle'});
    grid.node.style.pointerEvents = 'none';

    for (let y = -1; y <= 1; ++y) {
      const position = y * gridSize;
      grid.line(-halfSize, position, -halfSize + size, position).stroke({color: '#cccccc80', width: 0.5});
      grid.line(position, -halfSize, position, -halfSize + size).stroke({color: '#cccccc80', width: 0.5});

      grid.text(y).move(position + 5, -5).font({size: 10}).fill('#888');
      if (y) {
        grid.text(yUp ? -y : y).move(5, position - 5).font({size: 10}).fill('#888');

      }
    }

    circleGroup.circle(gridSize * 2).center(0, 0).fill('none').stroke('#00f');

    let mousePoint = new DOMPoint(0, 0);

    const updateColorScheme = () => {
      const isDarkMode = darkMatcher.matches;
      colorScheme = isDarkMode ? darkColors : lightColors;
      hLine.stroke(colorScheme.main);
      vLine.stroke(colorScheme.main);
      marker.fill(colorScheme.main);
      pointOuter.stroke(colorScheme.main);
      pointInner.fill(colorScheme.point);
    };
    updateColorScheme();

    const update = () => {
      const c = Math.cos(this.#angle);
      const s = Math.sin(this.#angle);
      const x = c * gridSize;
      const y = s * gridSize;
      setTranslation(point, x, y);
      tri.plot([[0, 0], [x, 0], [x, y]]);
      hLine.plot([[0, 0], [x, 0]]);
      vLine.plot([[x, 0], [x, y]]);
      hText.text(`X=${c.toFixed(2)}`);
      vText.text(`Y=${s.toFixed(2)}`);
      setTranslation(hText, x / 2, -16);
      setTranslation(vText, x, y / 2);
    };
    update();
    this.#update = update;
    const requestUpdate = this.#requestUpdate.bind(this);
    const callFn = this.#callFn.bind(this);

    darkMatcher.addEventListener('change', () => {
      updateColorScheme();
      requestUpdate();
    });

    const onMove = (e) => {
      e.preventDefault();

      mousePoint.x = e.clientX;
      mousePoint.y = e.clientY;
      mousePoint = mousePoint.matrixTransform(circleGroup.node.getScreenCTM().inverse());

      this.angle = Math.atan2(mousePoint.y, mousePoint.x);

      callFn({
        x: this.x,
        y: this.y,
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    if (!frozen) {
      point.node.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        window.addEventListener('pointermove', onMove, {passive: false});
        window.addEventListener('pointerup', onUp);
      });
    }
  }
  handleRAF() {
    this.#requestId = undefined;
    this.#update();
  }
  #callFn(v) {
    this.#fn(v);
  }
  #requestUpdate() {
    if (!this.#requestId) {
      this.#requestId = requestAnimationFrame(() => this.handleRAF());
    }
  }
  get domElement() {
    return this.#draw.node;
  }
  set angle(v) {
    this.#angle = v;
    this.#requestUpdate();
  }
  get x() {
    return Math.cos(this.#angle);
  }
  get y() {
    return Math.sin(this.#angle);
  }
  set setTarget({x, y}) {
    this.angle = Math.atan2(y, x);
  }
  onChange(fn) {
    this.#fn = fn;
  }
}
