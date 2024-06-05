/* muigui@0.0.14, license MIT */
var css = {
  default: `
.muigui {
  --bg-color: #ddd;
  --color: #222;
  --contrast-color: #eee;
  --value-color: #145 ;
  --value-bg-color: #eeee;
  --disabled-color: #999;
  --menu-bg-color: #f8f8f8;
  --menu-sep-color: #bbb;
  --hover-bg-color: #999;
  --focus-color: #8BF;
  --range-color: #AAA;
  --invalid-color: #FF0000;
  --selected-color: rgb(255, 255, 255, 0.9);

  --button-bg-color: var(--value-bg-color);

  --image-open: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjNDQ0OyIgeD0iMjAlIiB5PSI0NSUiIHdpZHRoPSI2MCUiIGhlaWdodD0iMTAlIj48L3JlY3Q+Cjwvc3ZnPg==);
  --image-closed: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjNDQ0OyIgeD0iNDUlIiB5PSIyMCUiIHdpZHRoPSIxMCUiIGhlaWdodD0iNjAlIj48L3JlY3Q+CiAgPHJlY3Qgc3R5bGU9ImZpbGw6ICM0NDQ7IiB4PSIyMCUiIHk9IjQ1JSIgd2lkdGg9IjYwJSIgaGVpZ2h0PSIxMCUiPjwvcmVjdD4KPC9zdmc+);
  --image-checkerboard: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjNDA0MDQwOyIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSI+PC9yZWN0PgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjODA4MDgwOyIgeD0iMCIgeT0iMCIgd2lkdGg9IjUwJSIgaGVpZ2h0PSI1MCUiPjwvcmVjdD4KICA8cmVjdCBzdHlsZT0iZmlsbDogIzgwODA4MDsiIHg9IjUwJSIgeT0iNTAlIiB3aWR0aD0iNTAlIiBoZWlnaHQ9IjUwJSI+PC9yZWN0Pgo8L3N2Zz4=);

  --range-left-color: var(--value-color);
  --range-right-color: var(--value-bg-color); 
  --range-right-hover-color: var(--hover-bg-color);
  --button-image: 
    linear-gradient(
      rgba(255, 255, 255, 1), rgba(0, 0, 0, 0.2)
    );

  color: var(--color);
  background-color: var(--bg-color);
}

@media (prefers-color-scheme: dark) {
  .muigui {
    --bg-color: #222222;
    --color: #dddddd;
    --contrast-color: #000;
    --value-color: #43e5f7;
    --value-bg-color: #444444;
    --disabled-color: #666666;
    --menu-bg-color: #080808;
    --menu-sep-color: #444444;
    --hover-bg-color: #666666;
    --focus-color: #458; /*#88AAFF*/;
    --range-color: #888888;
    --invalid-color: #FF6666;
    --selected-color: rgba(255, 255, 255, 0.3);

    --button-bg-color: var(--value-bg-color);

    --range-left-color: var(--value-color);
    --range-right-color: var(--value-bg-color); 
    --range-right-hover-color: var(--hover-bg-color);
    --button-image: linear-gradient(
        rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4)
      );

    color: var(--color);
    background-color: var(--bg-color);

    --image-closed: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjREREOyIgeD0iMjAlIiB5PSI0NSUiIHdpZHRoPSI2MCUiIGhlaWdodD0iMTAlIj48L3JlY3Q+Cjwvc3ZnPg==);
    --image-open: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHN0eWxlPSJmaWxsOiAjREREOyIgeD0iNDUlIiB5PSIyMCUiIHdpZHRoPSIxMCUiIGhlaWdodD0iNjAlIj48L3JlY3Q+CiAgPHJlY3Qgc3R5bGU9ImZpbGw6ICNEREQ7IiB4PSIyMCUiIHk9IjQ1JSIgd2lkdGg9IjYwJSIgaGVpZ2h0PSIxMCUiPjwvcmVjdD4KPC9zdmc+);
  }
}

.muigui {
  --width: 250px;
  --label-width: 45%;
  --number-width: 40%;

  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-size: 11px;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --font-size-mono: 11px;

  --line-height: 1.7em;
  --border-radius: 0px;

  width: var(--width);
  font-family: var(--font-family);
  font-size: var(--font-size);
  box-sizing: border-box;
  line-height: 100%;
}
.muigui * {
  box-sizing: inherit;
}

.muigui-no-scroll {
  touch-action: none;
}
.muigui-no-h-scroll {
  touch-action: pan-y;
}
.muigui-no-v-scroll {
  touch-action: pan-x;
}

.muigui-invalid-value {
  background-color: red !important;
  color: white !important;
}

.muigui-grid {
  display: grid;
}
.muigui-rows {
  display: flex;
  flex-direction: column;

  min-height: 20px;
  border: 2px solid red;
}
.muigui-columns {
  display: flex;
  flex-direction: row;

  height: 20px;
  border: 2px solid green;
}
.muigui-rows>*,
.muigui-columns>* {
  flex: 1 1 auto;
  align-items: stretch;
  min-height: 0;
  min-width: 0;
}

.muigui-row {
  border: 2px solid yellow;
  min-height: 10px
}
.muigui-column {
  border: 2px solid lightgreen;
}

/* -------- */

.muigui-show { /* */ }
.muigui-hide { 
  display: none !important;
}
.muigui-disabled {
  pointer-events: none;
  --color: var(--disabled-color) !important;
  --value-color: var(--disabled-color) !important;
  --range-left-color: var(--disabled-color) !important;
}

.muigui canvas,
.muigui svg {
  display: block;
  border-radius: var(--border-radius);
}
.muigui canvas {
  background-color: var(--value-bg-color);
}

.muigui-controller {
  min-width: 0;
  min-height: var(--line-height);
}
.muigui-root {
  z-index: 1;
}
.muigui-root,
.muigui-menu {
  display: flex;
  flex-direction: column;
  position: relative;
  user-select: none;
  height: fit-content;
  margin: 0;
  padding-bottom: 0.1em;
  border-radius: var(--border-radius);
}
.muigui-menu {
  border-bottom: 1px solid var(--menu-sep-color);
}

.muigui-root>button:nth-child(1),
.muigui-menu>button:nth-child(1) {
  border-top: 1px solid var(--menu-sep-color);
  border-bottom: 1px solid var(--menu-sep-color);
  position: relative;
  text-align: left;
  color: var(--color);
  background-color: var(--menu-bg-color);
  min-height: var(--line-height);
  padding: 0.2em;
  cursor: pointer;
  border-radius: var(--border-radius);
}
.muigui-root>div:nth-child(2),
.muigui-menu>div:nth-child(2) {
  flex: 1 1 auto;
}

.muigui-controller {
  margin-left: 0.2em;
  margin-right: 0.2em;
}
.muigui-root.muigui-controller,
.muigui-menu.muigui-controller {
  margin-left: 0;
  margin-right: 0;
}
.muigui-controller>*:nth-child(1) {
  flex: 1 0 var(--label-width);
  min-width: 0;
  /* white-space: pre; why?? */
}
.muigui-controller>label:nth-child(1) {
  place-content: center start;
  display: inline-grid;
  overflow: hidden;
}
.muigui-controller>*:nth-child(2) {
  flex: 1 1 75%;
  min-width: 0;
}

/* -----------------------------------------
  a label controller is  [[label][value]]
*/

.muigui-label-controller {
  display: flex;
  margin: 0.4em 0 0.4em 0;
  word-wrap: initial;
  align-items: stretch;
}

.muigui-value {
  display: flex;
  align-items: stretch;
}
.muigui-value>* {
  flex: 1 1 auto;
  min-width: 0;
}
.muigui-value>*:nth-child(1) {
  flex: 1 1 calc(100% - var(--number-width));
}
.muigui-value>*:nth-child(2) {
  flex: 1 1 var(--number-width);
  margin-left: 0.2em;
}

/* fix! */
.muigui-open>button>label::before,
.muigui-closed>button>label::before {
  content: "X";
  color: rgba(0, 0, 0, 0);
  background-color: var(--range-color);
  border-radius: 0.2em;
  width: 1.25em;
  margin-right: 0.25em;
  height: 1.25em; /*var(--line-height);*/
  display: inline-grid;
  place-content: center start;
  pointer-events: none;
}
.muigui-open>button>label::before {
  background-image: var(--image-open);
}
.muigui-closed>button>label::before {
  background-image: var(--image-closed);
}

.muigui-open>.muigui-open-container {
  transition: all 0.1s ease-out;
  overflow: auto;
  height: 100%;
}
.muigui-closed>.muigui-open-container {
  transition: all 0.1s ease-out;
  overflow: hidden;
  min-height: 0;
}
.muigui-open>.muigui-open-container>* {
  transition: all 0.1s ease-out;
  margin-top: 0px;
}
.muigui-closed>.muigui-open-container>* {
  transition: all 0.1s ease-out;
  margin-top: -100%;
}

/* ---- popdown ---- */

.muigui-pop-down-top {
  display: flex;
}
/* fix? */
.muigui-value>*:nth-child(1).muigui-pop-down-top {
  flex: 0;
}
.muigui-closed .muigui-pop-down-bottom {
  max-height: 0;
}

.muigui-value .muigui-pop-down-bottom {
  margin: 0;
}

.muigui-pop-down-values {
  min-width: 0;
  display: flex;
}
.muigui-pop-down-values>* {
  flex: 1 1 auto;
  min-width: 0;
}

.muigui-value.muigui-pop-down-controller {
  flex-direction: column;
}

.muigui-pop-down-top input[type=checkbox] {
  -webkit-appearance: none;
  appearance: none;
  width: auto;
  color: var(--value-color);
  background-color: var(--value-bg-color);
  background-image: var(--image-checkerboard);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;

  cursor: pointer;

  display: grid;
  place-content: center;
  margin: 0;
  font: inherit;
  color: currentColor;
  width: 1.7em;
  height: 1.7em;
  transform: translateY(-0.075em);
}

.muigui-pop-down-top input[type=checkbox]::before {
  content: "+";
  display: grid;
  place-content: center;
  border-radius: calc(var(--border-radius) + 2px);
  border-left: 1px solid rgba(255,255,255,0.3);
  border-top: 1px solid rgba(255,255,255,0.3);
  border-bottom: 1px solid rgba(0,0,0,0.2);
  border-right: 1px solid rgba(0,0,0,0.2);
  background-color: var(--range-color);
  color: var(--value-bg-color);
  width: calc(var(--line-height) - 4px);
  height: calc(var(--line-height) - 4px);
}

.muigui-pop-down-top input[type=checkbox]:checked::before {
  content: "Ｘ";
}


/* ---- select ---- */

.muigui select,
.muigui option,
.muigui input,
.muigui button {
  color: var(--value-color);
  background-color: var(--value-bg-color);
  font-family: var(--font-family);
  font-size: var(--font-size);
  border: none;
  margin: 0;
  border-radius: var(--border-radius);
}
.muigui select {
  appearance: none;
  margin: 0;
  margin-left: 0; /*?*/
  overflow: hidden; /* Safari */
}

.muigui select:focus,
.muigui input:focus,
.muigui button:focus {
  outline: 1px solid var(--focus-color);
}

.muigui select:hover,
.muigui option:hover,
.muigui input:hover,
.muigui button:hover {
  background-color: var(--hover-bg-color);  
}

/* ------ [ label ] ------ */

.muigui-label {
  border-top: 1px solid var(--menu-sep-color);
  border-bottom: 1px solid var(--menu-sep-color);
  padding-top: 0.4em;
  padding-bottom: 0.3em;
  place-content: center start;
  background-color: var(--menu-bg-color);
  white-space: pre;
  border-radius: var(--border-radius);
}

/* ------ [ divider] ------ */

.muigui-divider {
    min-height: 6px;
    border-top: 2px solid var(--menu-sep-color);
    margin-top: 6px;
}

/* ------ [ button ] ------ */

.muigui-button {
  display: grid;
  padding: 2px 0 2px 0;
}
.muigui-button button {
  border: none;
  color: var(--value-color);
  background-color: var(--button-bg-color);
  background-image: var(--button-image);
  cursor: pointer;
  place-content: center center;
  height: var(--line-height);
}

/* ------ [ color ] ------ */

.muigui-color>div {
  overflow: hidden;
  position: relative;
  margin-left: 0;
  margin-right: 0; /* why? */
  max-width: var(--line-height);
  border-radius: var(--border-radius);
}

.muigui-color>div:focus-within {
  outline: 1px solid var(--focus-color);
}

.muigui-color input[type=color] {
  border: none;
  padding: 0;
  background: inherit;
  cursor: pointer;
  position: absolute;
  width: 200%;
  left: -10px;
  top: -10px;
  height: 200%;
}
.muigui-disabled canvas,
.muigui-disabled svg,
.muigui-disabled img,
.muigui-disabled .muigui-color input[type=color] {
  opacity: 0.2;
}

/* ------ [ checkbox ] ------ */

.muigui-checkbox>label:nth-child(2) {
  display: grid;
  place-content: center start;
  margin: 0;
}

.muigui-checkbox input[type=checkbox] {
  -webkit-appearance: none;
  appearance: none;
  width: auto;
  color: var(--value-color);
  background-color: var(--value-bg-color);
  cursor: pointer;

  display: grid;
  place-content: center;
  margin: 0;
  font: inherit;
  color: currentColor;
  width: 1.7em;
  height: 1.7em;
  transform: translateY(-0.075em);
}

.muigui-checkbox input[type=checkbox]::before {
  content: "";
  color: var(--value-color);
  display: grid;
  place-content: center;
}

.muigui-checkbox input[type=checkbox]:checked::before {
  content: "✔";
}

.muigui input[type=number]::-webkit-inner-spin-button, 
.muigui input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none;
  appearance: none;
  margin: 0; 
}
.muigui input[type=number] {
  -moz-appearance: textfield;
}

/* ------ [ radio grid ] ------ */

.muigui-radio-grid>div {
  display: grid;
  gap: 2px;
}

.muigui-radio-grid input {
  appearance: none;
  display: none;
}

.muigui-radio-grid button {
  color: var(--color);
  width: 100%;
  text-align: left;
}

.muigui-radio-grid input:checked + button {
  color: var(--value-color);
  background-color: var(--selected-color);
}

/* ------ [ color-chooser ] ------ */

.muigui-color-chooser-cursor {
  stroke-width: 1px;
  stroke: white;
  fill: none;
}
.muigui-color-chooser-circle {
  stroke-width: 1px;
  stroke: white;
  fill: none;
}


/* ------ [ vec2 ] ------ */

.muigui-vec2 svg {
  background-color: var(--value-bg-color);
}

.muigui-vec2-axis {
  stroke: 1px;
  stroke: var(--focus-color);
}

.muigui-vec2-line {
  stroke-width: 1px;
  stroke: var(--value-color);
  fill: var(--value-color);
}

/* ------ [ direction ] ------ */

.muigui-direction svg {
  background-color: rgba(0,0,0,0.2);
}

.muigui-direction:focus-within svg {
  outline: none;
}
.muigui-direction-range {
  fill: var(--value-bg-color);
}
.muigui-direction svg:focus {
  outline: none;
}
.muigui-direction svg:focus .muigui-direction-range {
  stroke-width: 0.5px;
  stroke: var(--focus-color);
}

.muigui-direction-arrow {
  fill: var(--value-color);
}

/* ------ [ slider ] ------ */

.muigui-slider>div {
  display: flex;
  align-items: stretch;
  height: var(--line-height);
}
.muigui-slider svg {
  flex: 1 1 auto;
}
.muigui-slider .muigui-slider-up #muigui-orientation {
  transform: scale(1, -1) translateY(-100%);
}

.muigui-slider .muigui-slider-up #muigui-number-orientation {
  transform: scale(1,-1);
}

.muigui-ticks {
  stroke: var(--range-color);
}
.muigui-thicks {
  stroke: var(--color);
  stroke-width: 2px;
}
.muigui-svg-text {
  fill: var(--color);
  font-size: 7px;
}
.muigui-mark {
  fill: var(--value-color);
}

/* ------ [ range ] ------ */


.muigui-range input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
}

.muigui-range input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  border-radius: calc(var(--border-radius) + 2px);
  border-left: 1px solid rgba(255,255,255,0.3);
  border-top: 1px solid rgba(255,255,255,0.3);
  border-bottom: 1px solid rgba(0,0,0,0.2);
  border-right: 1px solid rgba(0,0,0,0.2);
  background-color: var(--range-color);
  margin-top: calc((var(--line-height) - 6px) / -2);
  width: calc(var(--line-height) - 6px);
  height: calc(var(--line-height) - 6px);
}

.muigui-range input[type=range]::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  appearance: none;
  border: 1px solid var(--menu-sep-color);
  height: 2px;
}


/* dat.gui style - doesn't work on Safari iOS */

/*
.muigui-range input[type=range] {
  cursor: ew-resize;
  overflow: hidden;
}

.muigui-range input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  background-color: var(--range-right-color);
  margin: 0;
}
.muigui-range input[type=range]:hover {
  background-color: var(--range-right-hover-color);
}

.muigui-range input[type=range]::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  appearance: none;
  height: max-content;
  color: var(--range-left-color);
  margin-top: -1px;
}

.muigui-range input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 0px;
  height: max-content;
  box-shadow: -1000px 0 0 1000px var(--range-left-color);
}
*/

/* FF */
/*
.muigui-range input[type=range]::-moz-slider-progress {
  background-color: var(--range-left-color); 
}
.muigui-range input[type=range]::-moz-slider-thumb {
  height: max-content;
  width: 0;
  border: none;
  box-shadow: -1000px 0 0 1000px var(--range-left-color);
  box-sizing: border-box;
}
*/

.muigui-checkered-background {
  background-color: #404040;
  background-image:
     linear-gradient(45deg, #808080 25%, transparent 25%),
     linear-gradient(-45deg, #808080 25%, transparent 25%),
     linear-gradient(45deg, transparent 75%, #808080 75%),
     linear-gradient(-45deg, transparent 75%, #808080 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

/* ---------------------------------------------------------- */

/* needs to be at bottom to take precedence */
.muigui-auto-place {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 100001;
}

`,
themes: {
  default: {
    include: ['default'],
    css: `
    `,
  },
  float: {
    include: ['default'],
    css: `
  :root {
    color-scheme: light dark,
  }

  .muigui {
    --width: 400px;
    --bg-color: initial;
    --label-width: 25%;
    --number-width: 20%;
  }

  input,
  .muigui-label-controller>label {
      text-shadow:
       -1px -1px 0 var(--contrast-color),
        1px -1px 0 var(--contrast-color),
       -1px  1px 0 var(--contrast-color),
        1px  1px 0 var(--contrast-color);
  }

  .muigui-controller > label:nth-child(1) {
      place-content: center end;
      margin-right: 1em;
  }

  .muigui-value > :nth-child(2) {
      margin-left: 1em;
  }

  .muigui-root>*:nth-child(1) {
      display: none;
  }

  .muigui-range input[type=range]::-webkit-slider-thumb {
    border-radius: 1em;
  }

  .muigui-range input[type=range]::-webkit-slider-runnable-track {
    -webkit-appearance: initial;
    appearance: none;
    border: 1px solid rgba(0, 0, 0, 0.25);
    height: 2px;
  }

  .muigui-colors {
    --value-color: var(--color  );
    --value-bg-color: rgba(0, 0, 0, 0.1);
    --disabled-color: #cccccc;
    --menu-bg-color: rgba(0, 0, 0, 0.1);
    --menu-sep-color: #bbbbbb;
    --hover-bg-color: rgba(0, 0, 0, 0);
    --invalid-color: #FF0000;
    --selected-color: rgba(0, 0, 0, 0.3);
    --range-color: rgba(0, 0, 0, 0.125);
  }
`,
  },
  form: {
    include: [],
    css: `
    .muigui {
      --width: 100%;
      --label-width: 45%;
      --number-width: 40%;
    }
    .muigui-root>button {
      display: none;
    }
    .muigui-controller {
      margin-top: 1em;
    }
    .muigui-label-controller {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin-top: 1em;
    }
    .muigui-label-controller:has(.muigui-checkbox) {
      flex-direction: row;
    }
    .muigui-value {
      display: flex;
      align-items: stretch;
    }
    .muigui-value>* {
      flex: 1 1 auto;
      min-width: 0;
    }
    .muigui-controller>*:nth-child(1) {
      flex: 1 0 var(--label-width);
      min-width: 0;
      white-space: pre;
    }
    .muigui-controller>label:nth-child(1) {
      place-content: center start;
      display: inline-grid;
      overflow: hidden;
    }
    .muigui-controller>*:nth-child(2) {
      flex: 1 1 75%;
      min-width: 0;
    }
  `,
  },
  none: {
    include: [],
    css: '',
  },
},
};

function setElemProps(elem, attrs, children) {
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

function createElem(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  setElemProps(elem, attrs, children);
  return elem;
}

function addElem(tag, parent, attrs = {}, children = []) {
  const elem = createElem(tag, attrs, children);
  parent.appendChild(elem);
  return elem;
}

let nextId = 0;
function getNewId() {
  return `muigui-id-${nextId++}`;
}

function removeArrayElem(array, value) {
  const ndx = array.indexOf(value);
  if (ndx) {
    array.splice(ndx, 1);
  }
  return array;
}

/**
 * Converts an camelCase or snake_case id to "camel case" or "snake case"
 * @param {string} id
 */
const underscoreRE = /_/g;
const upperLowerRE = /([A-Z])([a-z])/g;
function idToLabel(id) {
  return id.replace(underscoreRE, ' ')
           .replace(upperLowerRE, (m, m1, m2) => `${m1.toLowerCase()} ${m2}`);
}

function clamp$1(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const isTypedArray = typeof SharedArrayBuffer !== 'undefined'
  ? function isArrayBufferOrSharedArrayBuffer(a) {
    return a && a.buffer && (a.buffer instanceof ArrayBuffer || a.buffer instanceof SharedArrayBuffer);
  }
  : function isArrayBuffer(a) {
    return a && a.buffer && a.buffer instanceof ArrayBuffer;
  };

const isArrayOrTypedArray = v => Array.isArray(v) || isTypedArray(v);

// Yea, I know this should be `Math.round(v / step) * step
// but try step = 0.1, newV = 19.95
//
// I get
//     Math.round(19.95 / 0.1) * 0.1
//     19.900000000000002
// vs
//     Math.round(19.95 / 0.1) / (1 / 0.1)
//     19.9
//
const stepify = (v, from, step) => Math.round(from(v) / step) / (1 / step);

const euclideanModulo$1 = (v, n) => ((v % n) + n) % n;
const lerp$1 = (a, b, t) => a + (b - a) * t;
function copyExistingProperties(dst, src) {
  for (const key in src) {
    if (key in dst) {
      dst[key] = src[key];
    }
  }
  return dst;
}

const mapRange = (v, inMin, inMax, outMin, outMax) => (v - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

const makeRangeConverters = ({from, to}) => {
  return {
    to: v => mapRange(v, ...from, ...to),
    from: v => [true, mapRange(v, ...to, ...from)],
  };
};

const makeRangeOptions = ({from, to, step}) => {
  return {
    min: to[0],
    max: to[1],
    ...(step && {step}),
    converters: makeRangeConverters({from, to}),
  };
};

// TODO: remove an use one in conversions. Move makeRangeConverters there?
const identity$1 = {
  to: v => v,
  from: v => [true, v],
};
function makeMinMaxPair(gui, properties, minPropName, maxPropName, options) {
  const { converters: { from } = identity$1 } = options;
  const { min, max } = options;
  const guiMinRange = options.minRange || 0;
  const valueMinRange = from(guiMinRange)[1];
  const minGui = gui
    .add(properties, minPropName, {
      ...options,
      min,
      max: max - guiMinRange,
    })
    .onChange(v => {
      maxGui.setValue(Math.min(max, Math.max(v + valueMinRange, properties[maxPropName])));
    });
  const maxGui = gui
    .add(properties, maxPropName, {
      ...options,
      min: min + guiMinRange,
      max,
    })
    .onChange(v => {
      minGui.setValue(Math.max(min, Math.min(v - valueMinRange, properties[minPropName])));
    });
  return [ minGui, maxGui ];
}

class View {
    domElement;
    #childDestElem;
    #views = [];
    constructor(elem) {
        this.domElement = elem;
        this.#childDestElem = elem;
    }
    addElem(elem) {
        this.#childDestElem.appendChild(elem);
        return elem;
    }
    removeElem(elem) {
        this.#childDestElem.removeChild(elem);
        return elem;
    }
    pushSubElem(elem) {
        this.#childDestElem.appendChild(elem);
        this.#childDestElem = elem;
    }
    popSubElem() {
        this.#childDestElem = this.#childDestElem.parentElement;
    }
    add(view) {
        this.#views.push(view);
        this.addElem(view.domElement);
        return view;
    }
    remove(view) {
        this.removeElem(view.domElement);
        removeArrayElem(this.#views, view);
        return view;
    }
    pushSubView(view) {
        this.pushSubElem(view.domElement);
    }
    popSubView() {
        this.popSubElem();
    }
    setOptions(options) {
        for (const view of this.#views) {
            view.setOptions(options);
        }
    }
    updateDisplayIfNeeded(newV, ignoreCache) {
        for (const view of this.#views) {
            view.updateDisplayIfNeeded(newV, ignoreCache);
        }
        return this;
    }
    $(selector) {
        return this.domElement.querySelector(selector);
    }
}

class Controller extends View {
  #changeFns;
  #finishChangeFns;
  #parent;

  constructor(className) {
    super(createElem('div', {className: 'muigui-controller'}));
    this.#changeFns = [];
    this.#finishChangeFns = [];
    // we need the specialization to come last so it takes precedence.
    if (className) {
      this.domElement.classList.add(className);
    }
  }
  get parent() {
    return this.#parent;
  }
  setParent(parent) {
    this.#parent = parent;
    this.enable(!this.disabled());
  }
  show(show = true) {
    this.domElement.classList.toggle('muigui-hide', !show);
    this.domElement.classList.toggle('muigui-show', show);
    return this;
  }
  hide() {
    return this.show(false);
  }
  disabled() {
    return !!this.domElement.closest('.muigui-disabled');
  }

  enable(enable = true) {
    this.domElement.classList.toggle('muigui-disabled', !enable);

    // If disabled we need to set the attribute 'disabled=true' to all
    // input/select/button/textarea's below
    //
    // If enabled we need to set the attribute 'disabled=false' to all below
    // until we hit a disabled controller.
    //
    // ATM the problem is we can find the input/select/button/textarea elements
    // but we can't easily find which controller they belong do.
    // But we don't need to? We can just check up if it or parent has
    // '.muigui-disabled'
    ['input', 'button', 'select', 'textarea'].forEach(tag => {
      this.domElement.querySelectorAll(tag).forEach(elem => {
        const disabled = !!elem.closest('.muigui-disabled');
        elem.disabled = disabled;
      });
    });

    return this;
  }
  disable(disable = true) {
    return this.enable(!disable);
  }
  onChange(fn) {
    this.removeChange(fn);
    this.#changeFns.push(fn);
    return this;
  }
  removeChange(fn) {
    removeArrayElem(this.#changeFns, fn);
    return this;
  }
  onFinishChange(fn) {
    this.removeFinishChange(fn);
    this.#finishChangeFns.push(fn);
    return this;
  }
  removeFinishChange(fn) {
    removeArrayElem(this.#finishChangeFns, fn);
    return this;
  }
  #callListeners(fns, newV) {
    for (const fn of fns) {
      fn.call(this, newV);
    }
  }
  emitChange(value, object, property) {
    this.#callListeners(this.#changeFns, value);
    if (this.#parent) {
      if (object === undefined) {
        this.#parent.emitChange(value);
      } else {
        this.#parent.emitChange({
          object,
          property,
          value,
          controller: this,
        });
      }
    }
  }
  emitFinalChange(value, object, property) {
    this.#callListeners(this.#finishChangeFns, value);
    if (this.#parent) {
      if (object === undefined) {
        this.#parent.emitChange(value);
      } else {
        this.#parent.emitFinalChange({
          object,
          property,
          value,
          controller: this,
        });
      }
    }
  }
  updateDisplay() {
    // placeholder. override
  }
  getColors() {
    const toCamelCase = s => s.replace(/-([a-z])/g, (m, m1) => m1.toUpperCase());
    const keys = [
      'color',
      'bg-color',
      'value-color',
      'value-bg-color',
      'hover-bg-color',
      'menu-bg-color',
      'menu-sep-color',
      'disabled-color',
    ];
    const div = createElem('div');
    this.domElement.appendChild(div);
    const colors = Object.fromEntries(keys.map(key => {
      div.style.color = `var(--${key})`;
      const s = getComputedStyle(div);
      return [toCamelCase(key), s.color];
    }));
    div.remove();
    return colors;
  }
}

class Button extends Controller {
  #object;
  #property;
  #buttonElem;
  #options = {
    name: '',
  };

  constructor(object, property, options = {}) {
    super('muigui-button', '');
    this.#object = object;
    this.#property = property;

    this.#buttonElem = this.addElem(
        createElem('button', {
          type: 'button',
          onClick: () => {
            this.#object[this.#property](this);
          },
        }));
    this.setOptions({name: property, ...options});
  }
  name(name) {
    this.#buttonElem.textContent = name;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {name} = this.#options;
    this.#buttonElem.textContent = name;
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function copyArrayElementsFromTo(src, dst) {
  dst.length = src.length;
  for (let i = 0; i < src.length; ++i) {
    dst[i] = src[i];
  }
}

class EditView extends View {
  #oldV;
  #updateCheck;

  #checkArrayNeedsUpdate(newV) {
    // It's an array, we need to compare all elements
    // Example, vec2, [r,g,b], ...
    const needUpdate = !arraysEqual(newV, this.#oldV);
    if (needUpdate) {
      copyArrayElementsFromTo(newV, this.#oldV);
    }
    return needUpdate;
  }

  #checkTypedArrayNeedsUpdate() {
    let once = true;
    return function checkTypedArrayNeedsUpdateImpl(newV) {
      // It's a typedarray, we need to compare all elements
      // Example: Float32Array([r, g, b])
      let needUpdate = once;
      once = false;
      if (!needUpdate) {
        needUpdate = !arraysEqual(newV, this.#oldV);
      }
      return needUpdate;
    };
  }

  #checkObjectNeedsUpdate(newV) {
    let needUpdate = false;
    for (const key in newV) {
      if (newV[key] !== this.#oldV[key]) {
        needUpdate = true;
        this.#oldV[key] = newV[key];
      }
    }
    return needUpdate;
  }

  #checkValueNeedsUpdate(newV) {
    const needUpdate = newV !== this.#oldV;
    this.#oldV = newV;
    return needUpdate;
  }

  #getUpdateCheckForType(newV) {
    if (Array.isArray(newV)) {
      this.#oldV = [];
      return this.#checkArrayNeedsUpdate.bind(this);
    } else if (isTypedArray(newV)) {
      this.#oldV = new newV.constructor(newV);
      return this.#checkTypedArrayNeedsUpdate(this);
    } else if (typeof newV === 'object') {
      this.#oldV = {};
      return this.#checkObjectNeedsUpdate.bind(this);
    } else {
      return this.#checkValueNeedsUpdate.bind(this);
    }
  }

  // The point of this is updating DOM elements
  // is slow but if we've called `listen` then
  // every frame we're going to try to update
  // things with the current value so if nothing
  // has changed then skip it.
  updateDisplayIfNeeded(newV, ignoreCache) {
    this.#updateCheck = this.#updateCheck || this.#getUpdateCheckForType(newV);
    // Note: We call #updateCheck first because it updates
    // the cache
    if (this.#updateCheck(newV) || ignoreCache) {
      this.updateDisplay(newV);
    }
  }
  setOptions(/*options*/) {
    // override this
    return this;
  }
}

class CheckboxView extends EditView {
  #checkboxElem;
  constructor(setter, id) {
    const checkboxElem = createElem('input', {
      type: 'checkbox',
      id,
      onInput: () => {
        setter.setValue(checkboxElem.checked);
      },
      onChange: () => {
        setter.setFinalValue(checkboxElem.checked);
      },
    });
    super(createElem('label', {}, [checkboxElem]));
    this.#checkboxElem = checkboxElem;
  }
  updateDisplay(v) {
    this.#checkboxElem.checked = v;
  }
}

const tasks = [];
const tasksToRemove = new Set();

let requestId;
let processing;

function removeTasks() {
  if (!tasksToRemove.size) {
    return;
  }

  if (processing) {
    queueProcessing();
    return;
  }

  tasksToRemove.forEach(task => {
    removeArrayElem(tasks, task);
  });
  tasksToRemove.clear();
}

function processTasks() {
  requestId = undefined;
  processing = true;
  for (const task of tasks) {
    if (!tasksToRemove.has(task)) {
      task();
    }
  }
  processing = false;
  removeTasks();
  queueProcessing();
}

function queueProcessing() {
  if (!requestId && tasks.length) {
    requestId = requestAnimationFrame(processTasks);
  }
}

function addTask(fn) {
  tasks.push(fn);
  queueProcessing();
}

function removeTask(fn) {
  tasksToRemove.set(fn);

  const ndx = tasks.indexOf(fn);
  if (ndx >= 0) {
    tasks.splice(ndx, 1);
  }
}

let id = 0;

function makeId() {
  return `muigui-${++id}`;
}

class ValueView extends View {
  constructor(className = '') {
    super(createElem('div', {className: 'muigui-value'}));
    if (className) {
      this.domElement.classList.add(className);
    }
  }
}

class LabelController extends Controller {
  #id;
  #nameElem;

  constructor(className = '', name = '') {
    super('muigui-label-controller');
    this.#id = makeId();
    this.#nameElem = createElem('label', {for: this.#id});
    this.domElement.appendChild(this.#nameElem);
    this.pushSubView(new ValueView(className));
    this.name(name);
  }
  get id() {
    return this.#id;
  }
  name(name) {
    if (this.#nameElem.title === this.#nameElem.textContent) {
      this.#nameElem.title = name;
    }
    this.#nameElem.textContent = name;
    return this;
  }
  tooltip(tip) {
    this.#nameElem.title = tip;
  }
}

class ValueController extends LabelController {
  #object;
  #property;
  #initialValue;
  #listening;
  #views;
  #updateFn;

  constructor(object, property, className = '') {
    super(className, property);
    this.#object = object;
    this.#property = property;
    this.#initialValue = this.getValue();
    this.#listening = false;
    this.#views = [];
  }
  get initialValue() {
    return this.#initialValue;
  }
  get object() {
    return this.#object;
  }
  get property() {
    return this.#property;
  }
  add(view) {
    this.#views.push(view);
    super.add(view);
    this.updateDisplay();
    return view;
  }
  #setValueImpl(v, ignoreCache) {
    let isDifferent = false;
    if (typeof v === 'object') {
      const dst = this.#object[this.#property];
      // don't replace objects, just their values.
      if (Array.isArray(v) || isTypedArray(v)) {
        for (let i = 0; i < v.length; ++i) {
          isDifferent ||= dst[i] !== v[i];
          dst[i] = v[i];
        }
      } else {
        for (const key of Object.keys(v)) {
          isDifferent ||= dst[key] !== v[key];
        }
        Object.assign(dst, v);
      }
    } else {
      isDifferent = this.#object[this.#property] !== v;
      this.#object[this.#property] = v;
    }
    this.updateDisplay(ignoreCache);
    if (isDifferent) {
      this.emitChange(this.getValue(), this.#object, this.#property);
    }
    return isDifferent;
  }
  setValue(v) {
    this.#setValueImpl(v);
  }
  setFinalValue(v) {
    const isDifferent = this.#setValueImpl(v, true);
    if (isDifferent) {
      this.emitFinalChange(this.getValue(), this.#object, this.#property);
    }
    return this;
  }
  updateDisplay(ignoreCache) {
    const newV = this.getValue();
    for (const view of this.#views) {
      view.updateDisplayIfNeeded(newV, ignoreCache);
    }
    return this;
  }
  setOptions(options) {
    for (const view of this.#views) {
      view.setOptions(options);
    }
    this.updateDisplay();
    return this;
  }
  getValue() {
    return this.#object[this.#property];
  }
  value(v) {
    this.setValue(v);
    return this;
  }
  reset() {
    this.setValue(this.#initialValue);
    return this;
  }
  listen(listen = true) {
    if (!this.#updateFn) {
      this.#updateFn = this.updateDisplay.bind(this);
    }
    if (listen) {
      if (!this.#listening) {
        this.#listening = true;
        addTask(this.#updateFn);
      }
    } else {
      if (this.#listening) {
        this.#listening = false;
        removeTask(this.#updateFn);
      }
    }
    return this;
  }
}

class Checkbox extends ValueController {
  constructor(object, property) {
    super(object, property, 'muigui-checkbox');
    const id = this.id;
    this.add(new CheckboxView(this, id));
    this.updateDisplay();
  }
}

const identity = {
  to: v => v,
  from: v => [true, v],
};

// from: from string to value
// to: from value to string
const strToNumber = {
  to: v => v.toString(),
  from: v => {
    const newV = parseFloat(v);
    return [!Number.isNaN(newV), newV];
  },
};

const converters = {
  radToDeg: makeRangeConverters({to: [0, 180], from: [0, Math.PI]}),
};

function createWheelHelper() {
  let wheelAccum = 0;
  return function (e, step, wheelScale = 5) {
    wheelAccum -= e.deltaY * step / wheelScale;
    const wheelSteps = Math.floor(Math.abs(wheelAccum) / step) * Math.sign(wheelAccum);
    const delta = wheelSteps * step;
    wheelAccum -= delta;
    return delta;
  };
}

class NumberView extends EditView {
  #to;
  #from;
  #step;
  #skipUpdate;
  #options = {
    step: 0.01,
    converters: strToNumber,
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };

  constructor(setter, options) {
    const setValue = setter.setValue.bind(setter);
    const setFinalValue = setter.setFinalValue.bind(setter);
    const wheelHelper = createWheelHelper();
    super(createElem('input', {
      type: 'number',
      onInput: () => {
        this.#handleInput(setValue, true);
      },
      onChange: () => {
        this.#handleInput(setFinalValue, false);
      },
      onWheel: e => {
        e.preventDefault();
        const {min, max, step} = this.#options;
        const delta = wheelHelper(e, step);
        const v = parseFloat(this.domElement.value);
        const newV = clamp$1(stepify(v + delta, v => v, step), min, max);
        const [valid, outV] = this.#from(newV);
        if (valid) {
          setter.setValue(outV);
        }
      },
    }));
    this.setOptions(options);
  }
  #handleInput(setFn, skipUpdate) {
    const v = parseFloat(this.domElement.value);
    const [valid, newV] = this.#from(v);
    let inRange;
    if (valid && !Number.isNaN(v)) {
      const {min, max} = this.#options;
      inRange = newV >= min && newV <= max;
      this.#skipUpdate = skipUpdate;
      setFn(clamp$1(newV, min, max));
    }
    this.domElement.classList.toggle('muigui-invalid-value', !valid || !inRange);
  }
  updateDisplay(v) {
    if (!this.#skipUpdate) {
      this.domElement.value = stepify(v, this.#to, this.#step);
    }
    this.#skipUpdate = false;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {
      step,
      converters: {to, from},
    } = this.#options;
    this.#to = to;
    this.#from = from;
    this.#step = step;
    return this;
  }
}

// Wanted to name this `Number` but it conflicts with
// JavaScript `Number`. It most likely wouldn't be
// an issue? But users might `import {Number} ...` and
// things would break.
class TextNumber extends ValueController {
  #textView;
  #step;

  constructor(object, property, options = {}) {
    super(object, property, 'muigui-text-number');
    this.#textView = this.add(new NumberView(this, options));
    this.updateDisplay();
  }
}

class SelectView extends EditView {
  #values;

  constructor(setter, keyValues) {
    const values = [];
    super(createElem('select', {
      onChange: () => {
        setter.setFinalValue(this.#values[this.domElement.selectedIndex]);
      },
    }, keyValues.map(([key, value]) => {
      values.push(value);
      return createElem('option', {textContent: key});
    })));
    this.#values = values;
  }
  updateDisplay(v) {
    const ndx = this.#values.indexOf(v);
    this.domElement.selectedIndex = ndx;
  }
}

// 4 cases
//   (a) keyValues is array of arrays, each sub array is key value
//   (b) keyValues is array and value is number then keys = array contents, value = index
//   (c) keyValues is array and value is not number, key = array contents, value = array contents
//   (d) keyValues is object then key->value
function convertToKeyValues(keyValues, valueIsNumber) {
  if (Array.isArray(keyValues)) {
    if (Array.isArray(keyValues[0])) {
      // (a) keyValues is array of arrays, each sub array is key value
      return keyValues;
    } else {
      if (valueIsNumber) {
        // (b) keyValues is array and value is number then keys = array contents, value = index
        return keyValues.map((v, ndx) => [v, ndx]);
      } else {
        // (c) keyValues is array and value is not number, key = array contents, value = array contents
        return keyValues.map(v => [v, v]);
      }
    }
  } else {
    // (d)
    return [...Object.entries(keyValues)];
  }
}

class Select extends ValueController {
  constructor(object, property, options) {
    super(object, property, 'muigui-select');
    const valueIsNumber = typeof this.getValue() === 'number';
    const {keyValues: keyValuesInput} = options;
    const keyValues = convertToKeyValues(keyValuesInput, valueIsNumber);
    this.add(new SelectView(this, keyValues));
    this.updateDisplay();
  }
}

class RangeView extends EditView {
  #to;
  #from;
  #step;
  #skipUpdate;
  #options = {
    step: 0.01,
    min: 0,
    max: 1,
    converters: identity,
  };

  constructor(setter, options) {
    const wheelHelper = createWheelHelper();
    super(createElem('input', {
      type: 'range',
      onInput: () => {
        this.#skipUpdate = true;
        const {min, max, step} = this.#options;
        const v = parseFloat(this.domElement.value);
        const newV = clamp$1(stepify(v, v => v, step), min, max);
        const [valid, validV] = this.#from(newV);
        if (valid) {
          setter.setValue(validV);
        }
      },
      onChange: () => {
        this.#skipUpdate = true;
        const {min, max, step} = this.#options;
        const v = parseFloat(this.domElement.value);
        const newV = clamp$1(stepify(v, v => v, step), min, max);
        const [valid, validV] = this.#from(newV);
        if (valid) {
          setter.setFinalValue(validV);
        }
      },
      onWheel: e => {
        e.preventDefault();
        const [valid, v] = this.#from(parseFloat(this.domElement.value));
        if (!valid) {
          return;
        }
        const {min, max, step} = this.#options;
        const delta = wheelHelper(e, step);
        const newV = clamp$1(stepify(v + delta, v => v, step), min, max);
        setter.setValue(newV);
      },
    }));
    this.setOptions(options);
  }
  updateDisplay(v) {
    if (!this.#skipUpdate) {
      this.domElement.value = stepify(v, this.#to, this.#step);
    }
    this.#skipUpdate = false;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {
      step,
      min,
      max,
      converters: {to, from},
    } = this.#options;
    this.#to = to;
    this.#from = from;
    this.#step = step;
    this.domElement.step = step;
    this.domElement.min = min;
    this.domElement.max = max;
    return this;
  }
}

class Range extends ValueController {
  constructor(object, property, options) {
    super(object, property, 'muigui-range');
    this.add(new RangeView(this, options));
    this.add(new NumberView(this, options));
  }
}

class TextView extends EditView {
  #to;
  #from;
  #skipUpdate;
  #options = {
    converters: identity,
  };

  constructor(setter, options) {
    const setValue = setter.setValue.bind(setter);
    const setFinalValue = setter.setFinalValue.bind(setter);
    super(createElem('input', {
      type: 'text',
      onInput: () => {
        this.#handleInput(setValue, true);
      },
      onChange: () => {
        this.#handleInput(setFinalValue, false);
      },
    }));
    this.setOptions(options);
  }
  #handleInput(setFn, skipUpdate) {
    const [valid, newV] = this.#from(this.domElement.value);
    if (valid) {
      this.#skipUpdate = skipUpdate;
      setFn(newV);
    }
    this.domElement.style.color = valid ? '' : 'var(--invalid-color)';

  }
  updateDisplay(v) {
    if (!this.#skipUpdate) {
      this.domElement.value = this.#to(v);
      this.domElement.style.color = '';
    }
    this.#skipUpdate = false;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {
      converters: {to, from},
    } = this.#options;
    this.#to = to;
    this.#from = from;
    return this;
  }
}

class Text extends ValueController {
  constructor(object, property) {
    super(object, property, 'muigui-text');
    this.add(new TextView(this));
    this.updateDisplay();
  }
}

// const isConversion = o => typeof o.to === 'function' && typeof o.from === 'function';

/**
 * possible inputs
 *    add(o, p, min: number, max: number)
 *    add(o, p, min: number, max: number, step: number)
 *    add(o, p, array: [value])
 *    add(o, p, array: [[key, value]])
 *
 * @param {*} object
 * @param {string} property
 * @param  {...any} args
 * @returns {Controller}
 */
function createController(object, property, ...args) {
  const [arg1] = args;
  if (Array.isArray(arg1)) {
    return new Select(object, property, {keyValues: arg1});
  }
  if (arg1 && arg1.keyValues) {
    return new Select(object, property, {keyValues: arg1.keyValues});
  }

  const t = typeof object[property];
  switch (t) {
    case 'number':
      if (typeof args[0] === 'number' && typeof args[1] === 'number') {
        const min = args[0];
        const max = args[1];
        const step = args[2];
        return new Range(object, property, {min, max, ...(step && {step})});
      }
      return args.length === 0
          ? new TextNumber(object, property, ...args)
          : new Range(object, property, ...args);
    case 'boolean':
      return new Checkbox(object, property, ...args);
    case 'function':
      return new Button(object, property, ...args);
    case 'string':
      return new Text(object, property, ...args);
    case 'undefined':
      throw new Error(`no property named ${property}`);
    default:
      throw new Error(`unhandled type ${t} for property ${property}`);
  }
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fract = v => v >= 0 ? v % 1 : 1 - (v % 1);

const f0 = v => +v.toFixed(0);  // converts to string (eg 1.2 => "1"), then converts back to number (eg, "1.200" => 1.2)
const f3 = v => +v.toFixed(3);  // converts to string (eg 1.2 => "1.200"), then converts back to number (eg, "1.200" => 1.2)

const hexToUint32RGB = v => (parseInt(v.substring(1, 3), 16) << 16) |
                            (parseInt(v.substring(3, 5), 16) << 8 ) |
                            (parseInt(v.substring(5, 7), 16)      );
const uint32RGBToHex = v => `#${(Math.round(v)).toString(16).padStart(6, '0')}`;
const hexToUint32RGBA = v => (parseInt(v.substring(1, 3), 16) * 2 ** 24) +
                             (parseInt(v.substring(3, 5), 16) * 2 ** 16) +
                             (parseInt(v.substring(5, 7), 16) * 2 **  8) +
                             (parseInt(v.substring(7, 9), 16)      );
const uint32RGBAToHex = v => `#${(Math.round(v)).toString(16).padStart(8, '0')}`;

const hexToUint8RGB = v => [
    parseInt(v.substring(1, 3), 16),
    parseInt(v.substring(3, 5), 16),
    parseInt(v.substring(5, 7), 16),
];
const uint8RGBToHex = v => `#${Array.from(v).map(v => v.toString(16).padStart(2, '0')).join('')}`;

const hexToUint8RGBA = v => [
    parseInt(v.substring(1, 3), 16),
    parseInt(v.substring(3, 5), 16),
    parseInt(v.substring(5, 7), 16),
    parseInt(v.substring(7, 9), 16),
];
const uint8RGBAToHex = v => `#${Array.from(v).map(v => v.toString(16).padStart(2, '0')).join('')}`;

const hexToFloatRGB = v => hexToUint8RGB(v).map(v => f3(v / 255));
const floatRGBToHex = v => uint8RGBToHex(Array.from(v).map(v => Math.round(clamp(v * 255, 0, 255))));

const hexToFloatRGBA = v => hexToUint8RGBA(v).map(v => f3(v / 255));
const floatRGBAToHex = v => uint8RGBAToHex(Array.from(v).map(v => Math.round(clamp(v * 255, 0, 255))));

const scaleAndClamp = v => clamp(Math.round(v * 255), 0, 255).toString(16).padStart(2, '0');

const hexToObjectRGB = v => ({
  r: parseInt(v.substring(1, 3), 16) / 255,
  g: parseInt(v.substring(3, 5), 16) / 255,
  b: parseInt(v.substring(5, 7), 16) / 255,
});
const objectRGBToHex = v => `#${scaleAndClamp(v.r)}${scaleAndClamp(v.g)}${scaleAndClamp(v.b)}`;
const hexToObjectRGBA = v => ({
  r: parseInt(v.substring(1, 3), 16) / 255,
  g: parseInt(v.substring(3, 5), 16) / 255,
  b: parseInt(v.substring(5, 7), 16) / 255,
  a: parseInt(v.substring(7, 9), 16) / 255,
});
const objectRGBAToHex = v => `#${scaleAndClamp(v.r)}${scaleAndClamp(v.g)}${scaleAndClamp(v.b)}${scaleAndClamp(v.a)}`;

const hexToCssRGB = v => `rgb(${hexToUint8RGB(v).join(', ')})`;
const cssRGBRegex = /^\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/;
const cssRGBToHex = v => {
  const m = cssRGBRegex.exec(v);
  return uint8RGBToHex([m[1], m[2], m[3]].map(v => parseInt(v)));
};
const hexToCssRGBA = v => `rgba(${hexToUint8RGBA(v).map((v, i) => i === 3 ? v / 255 : v).join(', ')})`;
const cssRGBARegex = /^\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+\.\d+|\d+)\s*\)\s*$/;
const cssRGBAToHex = v => {
  const m = cssRGBARegex.exec(v);
  return uint8RGBAToHex([m[1], m[2], m[3], m[4]].map((v, i) => i === 3 ? (parseFloat(v) * 255 | 0) : parseInt(v)));
};

const hexToCssHSL = v => {
  const hsl = rgbUint8ToHsl(hexToUint8RGB(v)).map(v => f0(v));
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
};
const hexToCssHSLA = v => {
  const hsla = rgbaUint8ToHsla(hexToUint8RGBA(v)).map((v, i) => i === 3 ? f3(v) : f0(v));
  return `hsl(${hsla[0]} ${hsla[1]}% ${hsla[2]}% / ${hsla[3]})`;
};
const cssHSLRegex = /^\s*hsl\(\s*(\d+)(?:deg|)\s*(?:,|)\s*(\d+)%\s*(?:,|)\s*(\d+)%\s*\)\s*$/;
const cssHSLARegex = /^\s*hsl\(\s*(\d+)(?:deg|)\s*(?:,|)\s*(\d+)%\s*(?:,|)\s*(\d+)%\s*\/\s*(\d+\.\d+|\d+)\s*\)\s*$/;

const hex3DigitTo6Digit = v => `${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`;
const cssHSLToHex = v => {
  const m = cssHSLRegex.exec(v);
  const rgb = hslToRgbUint8([m[1], m[2], m[3]].map(v => parseFloat(v)));
  return uint8RGBToHex(rgb);
};
const cssHSLAToHex = v => {
  const m = cssHSLARegex.exec(v);
  const rgba = hslaToRgbaUint8([m[1], m[2], m[3], m[4]].map(v => parseFloat(v)));
  return uint8RGBAToHex(rgba);
};

const euclideanModulo = (v, n) => ((v % n) + n) % n;

function hslToRgbUint8([h, s, l]) {
  h = euclideanModulo(h, 360);
  s = clamp(s / 100, 0, 1);
  l = clamp(l / 100, 0, 1);

  const a = s * Math.min(l, 1 - l);

  function f(n) {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  }

  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}

function hslaToRgbaUint8([h, s, l, a]) {
  const rgb = hslToRgbUint8([h, s, l]);
  return [...rgb, a * 255 | 0];
}

function rgbFloatToHsl01([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (min + max) * 0.5;
  const d = max - min;
  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = (l === 0 || l === 1)
        ? 0
        : (max - l) / Math.min(l, 1 - l);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4;
    }
  }

  return [h / 6, s, l];
}

function rgbaFloatToHsla01([r, g, b, a]) {
  const hsl = rgbFloatToHsl01([r, g, b]);
 return [...hsl, a];
}

const rgbUint8ToHsl = (rgb) => {
  const [h, s, l] = rgbFloatToHsl01(rgb.map(v => v / 255));
  return [h * 360, s * 100, l * 100];
};

const rgbaUint8ToHsla = (rgba) => {
  const [h, s, l, a] = rgbaFloatToHsla01(rgba.map(v => v / 255));
  return [h * 360, s * 100, l * 100, a];
};

function hsv01ToRGBFloat([hue, sat, val]) {
  sat = clamp(sat, 0, 1);
  val = clamp(val, 0, 1);
  return [hue, hue + 2 / 3, hue + 1 / 3].map(
      v => lerp(1, clamp(Math.abs(fract(v) * 6 - 3.0) - 1, 0, 1), sat) * val
  );
}

function hsva01ToRGBAFloat([hue, sat, val, alpha]) {
  const rgb = hsv01ToRGBFloat([hue, sat, val]);
  return [...rgb, alpha];
}

const round3 = v => Math.round(v * 1000) / 1000;

function rgbFloatToHSV01([r, g, b]) {
  const p = b > g
      ? [b, g, -1, 2 / 3]
      : [g, b, 0, -1 / 3];
  const q = p[0] > r
      ? [p[0], p[1], p[3], r]
      : [r, p[1], p[2], p[0]];
  const d = q[0] - Math.min(q[3], q[1]);
  return [
    Math.abs(q[2] + (q[3] - q[1]) / (6 * d + Number.EPSILON)),
    d / (q[0] + Number.EPSILON),
    q[0],
  ].map(round3);
}

function rgbaFloatToHSVA01([r, g, b, a]) {
  const hsv = rgbFloatToHSV01([r, g, b]);
  return [...hsv, a];
}

// window.hsv01ToRGBFloat = hsv01ToRGBFloat;
// window.rgbFloatToHSV01 = rgbFloatToHSV01;

// Yea, meh!
const hasAlpha = format => format.endsWith('a') || format.startsWith('hex8');

const cssStringFormats = [
  { re: /^#(?:[0-9a-f]){6}$/i, format: 'hex6' },
  { re: /^(?:[0-9a-f]){6}$/i, format: 'hex6-no-hash' },
  { re: /^#(?:[0-9a-f]){8}$/i, format: 'hex8' },
  { re: /^(?:[0-9a-f]){8}$/i, format: 'hex8-no-hash' },
  { re: /^#(?:[0-9a-f]){3}$/i, format: 'hex3' },
  { re: /^(?:[0-9a-f]){3}$/i, format: 'hex3-no-hash' },
  { re: cssRGBRegex, format: 'css-rgb' },
  { re: cssHSLRegex, format: 'css-hsl' },
  { re: cssRGBARegex, format: 'css-rgba' },
  { re: cssHSLARegex, format: 'css-hsla' },
];

function guessStringColorFormat(v) {
  for (const formatInfo of cssStringFormats) {
    if (formatInfo.re.test(v)) {
      return formatInfo;
    }
  }
  return undefined;
}

function guessFormat(v) {
  switch (typeof v) {
    case 'number':
      console.warn('can not reliably guess format based on a number. You should pass in a format like {format: "uint32-rgb"} or {format: "uint32-rgb"}');
      return v <= 0xFFFFFF ? 'uint32-rgb' : 'uint32-rgba';
    case 'string': {
      const formatInfo = guessStringColorFormat(v.trim());
      if (formatInfo) {
        return formatInfo.format;
      }
      break;
    }
    case 'object':
      if (v instanceof Uint8Array || v instanceof Uint8ClampedArray) {
        if (v.length === 3) {
          return 'uint8-rgb';
        } else if (v.length === 4) {
          return 'uint8-rgba';
        }
      } else if (v instanceof Float32Array) {
        if (v.length === 3) {
          return 'float-rgb';
        } else if (v.length === 4) {
          return 'float-rgba';
        }
      } else if (Array.isArray(v)) {
        if (v.length === 3) {
          return 'float-rgb';
        } else if (v.length === 4) {
          return 'float-rgba';
        }
      } else {
        if ('r' in v && 'g' in v && 'b' in v) {
          if ('a' in v) {
            return 'object-rgba';
          } else {
            return 'object-rgb';
          }
        }
      }
  }
  throw new Error(`unknown color format: ${v}`);
}

function fixHex6(v) {
  return v.trim(v);
  //const formatInfo = guessStringColorFormat(v.trim());
  //const fix = formatInfo ? formatInfo.fix : v => v;
  //return fix(v.trim());
}

function fixHex8(v) {
  return v.trim(v);
  //const formatInfo = guessStringColorFormat(v.trim());
  //const fix = formatInfo ? formatInfo.fix : v => v;
  //return fix(v.trim());
}

function hex6ToHex3(hex6) {
  return (hex6[1] === hex6[2] &&
          hex6[3] === hex6[4] &&
          hex6[5] === hex6[6])
      ? `#${hex6[1]}${hex6[3]}${hex6[5]}`
      : hex6;
}

const hex3RE = /^(#|)([0-9a-f]{3})$/i;
function hex3ToHex6(hex3) {
  const m = hex3RE.exec(hex3);
  if (m) {
    const [, , m2] = m;
    return `#${hex3DigitTo6Digit(m2)}`;
  }
  return hex3;
}

function fixHex3(v) {
  return hex6ToHex3(fixHex6(v));
}

const strToRGBObject = (s) => {
  try {
    const json = s.replace(/([a-z])/g, '"$1"');
    const rgb = JSON.parse(json);
    if (Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) {
      throw new Error('not {r, g, b}');
    }
    return [true, rgb];
  } catch (e) {
    return [false];
  }
};

const strToRGBAObject = (s) => {
  try {
    const json = s.replace(/([a-z])/g, '"$1"');
    const rgba = JSON.parse(json);
    if (Number.isNaN(rgba.r) || Number.isNaN(rgba.g) || Number.isNaN(rgba.b) || Number.isNaN(rgba.a)) {
      throw new Error('not {r, g, b, a}');
    }
    return [true, rgba];
  } catch (e) {
    return [false];
  }
};

const strToCssRGB = s => {
  const m = cssRGBRegex.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3]].map(v => parseInt(v));
  const outOfRange = v.find(v => v > 255);
  return [!outOfRange, `rgb(${v.join(', ')})`];
};

const strToCssRGBA = s => {
  const m = cssRGBARegex.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3], m[4]].map((v, i) => i === 3 ? parseFloat(v) : parseInt(v));
  const outOfRange = v.find(v => v > 255);
  return [!outOfRange, `rgba(${v.join(', ')})`];
};

const strToCssHSL = s => {
  const m = cssHSLRegex.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3]].map(v => parseFloat(v));
  const outOfRange = v.find(v => Number.isNaN(v));
  return [!outOfRange, `hsl(${v[0]}, ${v[1]}%, ${v[2]}%)`];
};

const strToCssHSLA = s => {
  const m = cssHSLARegex.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3], m[4]].map(v => parseFloat(v));
  const outOfRange = v.find(v => Number.isNaN(v));
  return [!outOfRange, `hsl(${v[0]} ${v[1]}% ${v[2]}% / ${v[3]})`];
};

const rgbObjectToStr = rgb => {
  return `{r:${f3(rgb.r)}, g:${f3(rgb.g)}, b:${f3(rgb.b)}}`;
};
const rgbaObjectToStr = rgba => {
  return `{r:${f3(rgba.r)}, g:${f3(rgba.g)}, b:${f3(rgba.b)}}, a:${f3(rgba.a)}}`;
};

const strTo3IntsRE = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/;
const strTo3Ints = s => {
  const m = strTo3IntsRE.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3]].map(v => parseInt(v));
  const outOfRange = v.find(v => v > 255);
  return [!outOfRange, v];
};

const strTo4IntsRE = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/;
const strTo4Ints = s => {
  const m = strTo4IntsRE.exec(s);
  if (!m) {
    return [false];
  }
  const v = [m[1], m[2], m[3], m[4]].map(v => parseInt(v));
  const outOfRange = v.find(v => v > 255);
  return [!outOfRange, v];
};

const strTo3Floats = s => {
  const numbers = s.split(',').map(s => s.trim());
  const v = numbers.map(v => parseFloat(v));
  if (v.length !== 3) {
    return [false];
  }
  // Note: using isNaN not Number.isNaN
  const badNdx = numbers.findIndex(v => isNaN(v));
  return [badNdx < 0, v.map(v => f3(v))];
};

const strTo4Floats = s => {
  const numbers = s.split(',').map(s => s.trim());
  const v = numbers.map(v => parseFloat(v));
  if (v.length !== 4) {
    return [false];
  }
  // Note: using isNaN not Number.isNaN
  const badNdx = numbers.findIndex(v => isNaN(v));
  return [badNdx < 0, v.map(v => f3(v))];
};

const strToUint32RGBRegex = /^\s*(?:0x){0,1}([0-9a-z]{1,6})\s*$/i;
const strToUint32RGB = s => {
  const m = strToUint32RGBRegex.exec(s);
  if (!m) {
    return [false];
  }
  return [true, parseInt(m[1], 16)];
};

const strToUint32RGBARegex = /^\s*(?:0x){0,1}([0-9a-z]{1,8})\s*$/i;
const strToUint32RGBA = s => {
  const m = strToUint32RGBARegex.exec(s);
  if (!m) {
    return [false];
  }
  return [true, parseInt(m[1], 16)];
};

const hex6RE = /^\s*#[a-f0-9]{6}\s*$|^\s*#[a-f0-9]{3}\s*$/i;
const hexNoHash6RE = /^\s*[a-f0-9]{6}\s*$/i;
const hex8RE = /^\s*#[a-f0-9]{8}\s*$/i;
const hexNoHash8RE = /^\s*[a-f0-9]{8}\s*$/i;

// For each format converter
//
// fromHex/toHex convert from/to '#RRGGBB'
//
//  fromHex converts from the string '#RRBBGG' to the format
//     (eg: for uint32-rgb, '#123456' becomes 0x123456)
//
//  toHex converts from the format to '#RRGGBB'
//     (eg: for uint8-rgb, [16, 33, 50] becomes '#102132')
//
//
// fromStr/toStr convert from/to what's in the input[type=text] element
//
//  toStr converts from the format to its string representation
//     (eg, for object-rgb, {r: 1, g: 0.5, b:0} becomes "{r: 1, g: 0.5, b:0}")
//                           ^object                     ^string
//
//  fromStr converts its string representation to its format
//     (eg, for object-rgb) "{r: 1, g: 0.5, b:0}" becomes {r: 1, g: 0.5, b:0})
//                           ^string                      ^object
//     fromString returns an array which is [valid, v]
//     where valid is true if the string was a valid and v is the converted
//     format if v is true.
//
// Note: toStr should convert to "ideal" form (whatever that is).
//    (eg, for css-rgb
//    "{   r:  0.10000, g: 001, b:    0}" becomes "{r: 0.1, g: 1, b: 0}"
//    notice that css-rgb is a string to a string
//    )
const colorFormatConverters = {
  'hex6': {
    color: {
      from: v => [true, v],
      to: fixHex6,
    },
    text: {
      from: v => [hex6RE.test(v), v.trim()],
      to: v => v,
    },
  },
  'hex8': {
    color: {
      from: v => [true, v],
      to: fixHex8,
    },
    text: {
      from: v => [hex8RE.test(v), v.trim()],
      to: v => v,
    },
  },
  'hex3': {
    color: {
      from: v => [true, fixHex3(v)],
      to: hex3ToHex6,
    },
    text: {
      from: v => [hex6RE.test(v), hex6ToHex3(v.trim())],
      to: v => v,
    },
  },
  'hex6-no-hash': {
    color: {
      from: v => [true, v.substring(1)],
      to: v => `#${fixHex6(v)}`,
    },
    text: {
      from: v => [hexNoHash6RE.test(v), v.trim()],
      to: v => v,
    },
  },
  'hex8-no-hash': {
    color: {
      from: v => [true, v.substring(1)],
      to: v => `#${fixHex8(v)}`,
    },
    text: {
      from: v => [hexNoHash8RE.test(v), v.trim()],
      to: v => v,
    },
  },
  'hex3-no-hash': {
    color: {
      from: v => [true, fixHex3(v).substring(1)],
      to: hex3ToHex6,
    },
    text: {
      from: v => [hexNoHash6RE.test(v), hex6ToHex3(v.trim())],
      to: v => v,
    },
  },
  'uint32-rgb': {
    color: {
      from: v => [true, hexToUint32RGB(v)],
      to: uint32RGBToHex,
    },
    text: {
      from: v => strToUint32RGB(v),
      to: v => `0x${v.toString(16).padStart(6, '0')}`,
    },
  },
  'uint32-rgba': {
    color: {
      from: v => [true, hexToUint32RGBA(v)],
      to: uint32RGBAToHex,
    },
    text: {
      from: v => strToUint32RGBA(v),
      to: v => `0x${v.toString(16).padStart(8, '0')}`,
    },
  },
  'uint8-rgb': {
    color: {
      from: v => [true, hexToUint8RGB(v)],
      to: uint8RGBToHex,
    },
    text: {
      from: strTo3Ints,
      to: v => v.join(', '),
    },
  },
  'uint8-rgba': {
    color: {
      from: v => [true, hexToUint8RGBA(v)],
      to: uint8RGBAToHex,
    },
    text: {
      from: strTo4Ints,
      to: v => v.join(', '),
    },
  },
  'float-rgb': {
    color: {
      from: v => [true, hexToFloatRGB(v)],
      to: floatRGBToHex,
    },
    text: {
      from: strTo3Floats,
      // need Array.from because map of Float32Array makes a Float32Array
      to: v => Array.from(v).map(v => f3(v)).join(', '),
    },
  },
  'float-rgba': {
    color: {
      from: v => [true, hexToFloatRGBA(v)],
      to: floatRGBAToHex,
    },
    text: {
      from: strTo4Floats,
      // need Array.from because map of Float32Array makes a Float32Array
      to: v => Array.from(v).map(v => f3(v)).join(', '),
    },
  },
  'float-hsv': {
    color: {
      from: v => [true, rgbFloatToHSV01(hexToFloatRGB(v))],
      to: v => hsv01ToRGBFloat(floatRGBToHex(v)),
    },
    text: {
      from: strTo3Floats,
      // need Array.from because map of Float32Array makes a Float32Array
      to: v => Array.from(v).map(v => f3(v)).join(', '),
    },
  },
  'float-hsva': {
    color: {
      from: v => [true, rgbaFloatToHSVA01(hexToFloatRGB(v))],
      to: v => hsva01ToRGBAFloat(floatRGBToHex(v)),
    },
    text: {
      from: strTo4Floats,
      // need Array.from because map of Float32Array makes a Float32Array
      to: v => Array.from(v).map(v => f3(v)).join(', '),
    },
  },
  //'float-hsl': {
  //  color: {
  //    from: v => [true, rgbFloatToHsl01(hexToFloatRGB(v))],
  //    to: v => hsl01ToRGBFloat(floatRGBToHex(v)),
  //  },
  //  text: {
  //    from: strTo3Floats,
  //    // need Array.from because map of Float32Array makes a Float32Array
  //    to: v => Array.from(v).map(v => f3(v)).join(', '),
  //  },
  //},
  //'float-hsla': {
  //  color: {
  //    from: v => [true, hexToFloatRGBA(v)],
  //    to: floatRGBAToHex,
  //  },
  //  text: {
  //    from: strTo4Floats,
  //    // need Array.from because map of Float32Array makes a Float32Array
  //    to: v => Array.from(v).map(v => f3(v)).join(', '),
  //  },
  //},
  'object-rgb': {
    color: {
      from: v => [true, hexToObjectRGB(v)],
      to: objectRGBToHex,
    },
    text: {
      from: strToRGBObject,
      to: rgbObjectToStr,
    },
  },
  'object-rgba': {
    color: {
      from: v => [true, hexToObjectRGBA(v)],
      to: objectRGBAToHex,
    },
    text: {
      from: strToRGBAObject,
      to: rgbaObjectToStr,
    },
  },
  'css-rgb': {
    color: {
      from: v => [true, hexToCssRGB(v)],
      to: cssRGBToHex,
    },
    text: {
      from: strToCssRGB,
      to: v => strToCssRGB(v)[1],
    },
  },
  'css-rgba': {
    color: {
      from: v => [true, hexToCssRGBA(v)],
      to: cssRGBAToHex,
    },
    text: {
      from: strToCssRGBA,
      to: v => strToCssRGBA(v)[1],
    },
  },
  'css-hsl': {
    color: {
      from: v => [true, hexToCssHSL(v)],
      to: cssHSLToHex,
    },
    text: {
      from: strToCssHSL,
      to: v => strToCssHSL(v)[1],
    },
  },
  'css-hsla': {
    color: {
      from: v => [true, hexToCssHSLA(v)],
      to: cssHSLAToHex,
    },
    text: {
      from: strToCssHSLA,
      to: v => strToCssHSLA(v)[1],
    },
  },
};

class ElementView extends View {
  constructor(tag, className) {
    super(createElem(tag, {className}));
  }
}

// TODO: remove this? Should just be user side
class Canvas extends LabelController {
  #canvasElem;

  constructor(name) {
    super('muigui-canvas', name);
    this.#canvasElem = this.add(
      new ElementView('canvas', 'muigui-canvas'),
    ).domElement;
  }
  get canvas() {
    return this.#canvasElem;
  }
}

class ColorView extends EditView {
  #to;
  #from;
  #colorElem;
  #skipUpdate;
  #options = {
    converters: identity,
  };

  constructor(setter, options) {
    const colorElem = createElem('input', {
      type: 'color',
      onInput: () => {
        const [valid, newV] = this.#from(colorElem.value);
        if (valid) {
          this.#skipUpdate = true;
          setter.setValue(newV);
        }
      },
      onChange: () => {
        const [valid, newV] = this.#from(colorElem.value);
        if (valid) {
          this.#skipUpdate = true;
          setter.setFinalValue(newV);
        }
      },
    });
    super(createElem('div', {}, [colorElem]));
    this.setOptions(options);
    this.#colorElem = colorElem;
  }
  updateDisplay(v) {
    if (!this.#skipUpdate) {
      this.#colorElem.value = this.#to(v);
    }
    this.#skipUpdate = false;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {converters: {to, from}} = this.#options;
    this.#to = to;
    this.#from = from;
    return this;
  }
}

class Color extends ValueController {
  #colorView;
  #textView;

  constructor(object, property, options = {}) {
    super(object, property, 'muigui-color');
    const format = options.format || guessFormat(this.getValue());
    const {color, text} = colorFormatConverters[format];
    this.#colorView = this.add(new ColorView(this, {converters: color}));
    this.#textView = this.add(new TextView(this, {converters: text}));
    this.updateDisplay();
  }
  setOptions(options) {
    const {format} = options;
    if (format) {
      const {color, text} = colorFormatConverters[format];
      this.#colorView.setOptions({converters: color});
      this.#textView.setOptions({converters: text});
    }
    super.setOptions(options);
    return this;
  }
}

// This feels like it should be something else like
// gui.addController({className: 'muigui-divider')};
class Divider extends Controller {
  constructor() {
    super('muigui-divider');
  }
}

class Container extends Controller {
  #controllers;
  #childDestController;

  constructor(className) {
    super(className);
    this.#controllers = [];
    this.#childDestController = this;
  }
  get children() {
    return this.#controllers; // should we return a copy?
  }
  get controllers() {
    return this.#controllers.filter(c => !(c instanceof Container));
  }
  get folders() {
    return this.#controllers.filter(c => c instanceof Container);
  }
  reset(recursive = true) {
    for (const controller of this.#controllers) {
      if (!(controller instanceof Container) || recursive) {
        controller.reset(recursive);
      }
    }
    return this;
  }
  updateDisplay() {
    for (const controller of this.#controllers) {
      controller.updateDisplay();
    }
    return this;
  }
  remove(controller) {
    const ndx = this.#controllers.indexOf(controller);
    if (ndx >= 0) {
      const c = this.#controllers.splice(ndx, 1);
      const c0 = c[0];
      const elem = c0.domElement;
      elem.remove();
      c0.setParent(null);
    }
    return this;
  }
  #addControllerImpl(controller) {
    this.domElement.appendChild(controller.domElement);
    this.#controllers.push(controller);
    controller.setParent(this);
    return controller;
  }
  addController(controller) {
    return this.#childDestController.#addControllerImpl(controller);
  }
  pushContainer(container) {
    this.addController(container);
    this.#childDestController = container;
    return container;
  }
  popContainer() {
    this.#childDestController = this.#childDestController.parent;
    return this;
  }
}

class Folder extends Container {
  #labelElem;

  constructor(name = 'Controls', className = 'muigui-menu') {
    super(className);
    this.#labelElem = createElem('label');
    this.addElem(createElem('button', {
      type: 'button',
      onClick: () => this.toggleOpen(),
    }, [this.#labelElem]));
    this.pushContainer(new Container('muigui-open-container'));
    this.pushContainer(new Container());
    this.name(name);
    this.open();
  }
  open(open = true) {
    this.domElement.classList.toggle('muigui-closed', !open);
    this.domElement.classList.toggle('muigui-open', open);
    return this;
  }
  close() {
    return this.open(false);
  }
  name(name) {
    this.#labelElem.textContent = name;
    return this;
  }
  title(title) {
    return this.name(title);
  }
  toggleOpen() {
    this.open(!this.domElement.classList.contains('muigui-open'));
    return this;
  }
}

// This feels like it should be something else like
// gui.addDividing = new Controller()
class Label extends Controller {
  constructor(text) {
    super('muigui-label');
    this.text(text);
  }
  text(text) {
    this.domElement.textContent = text;
    return this;
  }
}

function noop$1() {
}

function computeRelativePosition(elem, event, start) {
  const rect = elem.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const nx = x / rect.width;
  const ny = y / rect.height;
  start = start || [x, y];
  const dx = x - start[0];
  const dy = y - start[1];
  const ndx = dx / rect.width;
  const ndy = dy / rect.width;
  return {x, y, nx, ny, dx, dy, ndx, ndy};
}

function addTouchEvents(elem, {onDown = noop$1, onMove = noop$1, onUp = noop$1}) {
  let start;
  const pointerMove = function (event) {
    const e = {
      type: 'move',
      ...computeRelativePosition(elem, event, start),
    };
    onMove(e);
  };

  const pointerUp = function (event) {
    elem.releasePointerCapture(event.pointerId);
    elem.removeEventListener('pointermove', pointerMove);
    elem.removeEventListener('pointerup', pointerUp);

    document.body.style.backgroundColor = '';

    onUp('up');
  };

  const pointerDown = function (event) {
    elem.addEventListener('pointermove', pointerMove);
    elem.addEventListener('pointerup', pointerUp);
    elem.setPointerCapture(event.pointerId);

    const rel = computeRelativePosition(elem, event);
    start = [rel.x, rel.y];
    onDown({
      type: 'down',
      ...rel,
    });
  };

  elem.addEventListener('pointerdown', pointerDown);

  return function () {
    elem.removeEventListener('pointerdown', pointerDown);
  };
}

const svg$3 = `
<svg class="muigui-checkered-background" tabindex="0" viewBox="0 0 64 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <linearGradient data-src="muigui-color-chooser-light-dark" x1="0" x2="0" y1="0" y2="1">
      <stop stop-color="rgba(0,0,0,0)" offset="0%"/>
      <stop stop-color="#000" offset="100%"/>
    </linearGradient>
    <linearGradient data-src="muigui-color-chooser-hue">
      <stop stop-color="hsl(60 0% 100% / 1)" offset="0%"/>
      <stop stop-color="hsl(60 100% 50% / 1)" offset="100%"/>
    </linearGradient>

    <rect width="64" height="48" data-target="muigui-color-chooser-hue"/>
    <rect width="64" height="48" data-target="muigui-color-chooser-light-dark"/>
    <circle r="4" class="muigui-color-chooser-circle"/>
</svg>
<svg tabindex="0" viewBox="0 0 64 6" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <linearGradient data-src="muigui-color-chooser-hues" x1="0" x2="1" y1="0" y2="0">
      <stop stop-color="hsl(0,100%,50%)" offset="0%"/>
      <stop stop-color="hsl(60,100%,50%)" offset="16.666%"/>
      <stop stop-color="hsl(120,100%,50%)" offset="33.333%"/>
      <stop stop-color="hsl(180,100%,50%)" offset="50%"/>
      <stop stop-color="hsl(240,100%,50%)" offset="66.666%"/>
      <stop stop-color="hsl(300,100%,50%)" offset="83.333%"/>
      <stop stop-color="hsl(360,100%,50%)" offset="100%"/>
    </linearGradient>
    <rect y="1" width="64" height="4" data-target="muigui-color-chooser-hues"/>
    <g class="muigui-color-chooser-hue-cursor">
      <rect x="-3" width="6" height="6" />
    </g>
</svg>
<svg class="muigui-checkered-background" tabindex="0" viewBox="0 0 64 6" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <linearGradient data-src="muigui-color-chooser-alpha" x1="0" x2="1" y1="0" y2="0">
      <stop stop-color="hsla(0,100%,100%,0)" offset="0%"/>
      <stop stop-color="hsla(0,100%,100%,1)" offset="100%"/>
    </linearGradient>
    <rect y="1" width="64" height="4" data-target="muigui-color-chooser-alpha"/>
    <g class="muigui-color-chooser-alpha-cursor">
      <rect x="-3" width="6" height="6" />
    </g>
</svg>
`;

function connectFillTargets(elem) {
  elem.querySelectorAll('[data-src]').forEach(srcElem => {
    const id = getNewId();
    srcElem.id = id;
    elem.querySelectorAll(`[data-target=${srcElem.dataset.src}]`).forEach(targetElem => {
      targetElem.setAttribute('fill', `url(#${id})`);
    });
  });
  return elem;
}

// Was originally going to make alpha an option. Issue is
// hard coded conversions?
class ColorChooserView extends EditView {
  #to;
  #from;
  #satLevelElem;
  #circleElem;
  #hueUIElem;
  #hueElem;
  #hueCursorElem;
  #alphaUIElem;
  #alphaElem;
  #alphaCursorElem;
  #hsva;
  #skipHueUpdate;
  #skipSatLevelUpdate;
  #skipAlphaUpdate;
  #options = {
    converters: identity,
    alpha: false,
  };
  #convertInternalToHex;
  #convertHexToInternal;

  constructor(setter, options) {
    super(createElem('div', {
      innerHTML: svg$3,
      className: 'muigui-no-scroll',
    }));
    this.#satLevelElem = this.domElement.children[0];
    this.#hueUIElem = this.domElement.children[1];
    this.#alphaUIElem = this.domElement.children[2];
    connectFillTargets(this.#satLevelElem);
    connectFillTargets(this.#hueUIElem);
    connectFillTargets(this.#alphaUIElem);
    this.#circleElem = this.$('.muigui-color-chooser-circle');
    this.#hueElem = this.$('[data-src=muigui-color-chooser-hue]');
    this.#hueCursorElem = this.$('.muigui-color-chooser-hue-cursor');
    this.#alphaElem = this.$('[data-src=muigui-color-chooser-alpha]');
    this.#alphaCursorElem = this.$('.muigui-color-chooser-alpha-cursor');

    const handleSatLevelChange = (e) => {
      const s = clamp$1(e.nx, 0, 1);
      const v = clamp$1(e.ny, 0, 1);
      this.#hsva[1] = s;
      this.#hsva[2] = (1 - v);
      this.#skipHueUpdate = true;
      this.#skipAlphaUpdate = true;
      const [valid, newV] = this.#from(this.#convertInternalToHex(this.#hsva));
      if (valid) {
        setter.setValue(newV);
      }
    };

    const handleHueChange = (e) => {
      const h = clamp$1(e.nx, 0, 1);
      this.#hsva[0] = h;
      this.#skipSatLevelUpdate = true;
      this.#skipAlphaUpdate = true;
      const [valid, newV] = this.#from(this.#convertInternalToHex(this.#hsva));
      if (valid) {
        setter.setValue(newV);
      }
    };

    const handleAlphaChange = (e) => {
      const a = clamp$1(e.nx, 0, 1);
      this.#hsva[3] = a;
      this.#skipHueUpdate = true;
      this.#skipSatLevelUpdate = true;
      const [valid, newV] = this.#from(this.#convertInternalToHex(this.#hsva));
      if (valid) {
        setter.setValue(newV);
      }
    };

    addTouchEvents(this.#satLevelElem, {
      onDown: handleSatLevelChange,
      onMove: handleSatLevelChange,
    });
    addTouchEvents(this.#hueUIElem, {
      onDown: handleHueChange,
      onMove: handleHueChange,
    });
    addTouchEvents(this.#alphaUIElem, {
      onDown: handleAlphaChange,
      onMove: handleAlphaChange,
    });
    this.setOptions(options);
  }
  updateDisplay(newV) {
    if (!this.#hsva) {
      this.#hsva = this.#convertHexToInternal(this.#to(newV));
    }
    {
      const [h, s, v, a = 1] = this.#convertHexToInternal(this.#to(newV));
      // Don't copy the hue if it was un-computable.
      if (!this.#skipHueUpdate) {
        this.#hsva[0] = s > 0.001 && v > 0.001 ? h : this.#hsva[0];
      }
      if (!this.#skipSatLevelUpdate) {
        this.#hsva[1] = s;
        this.#hsva[2] = v;
      }
      if (!this.#skipAlphaUpdate) {
        this.#hsva[3] = a;
      }
    }
    {
      const [h, s, v, a] = this.#hsva;
      const [hue, sat, lum] = rgbaFloatToHsla01(hsva01ToRGBAFloat(this.#hsva));

      if (!this.#skipHueUpdate) {
        this.#hueCursorElem.setAttribute('transform', `translate(${h * 64}, 0)`);
      }
      this.#hueElem.children[0].setAttribute('stop-color', `hsl(${hue * 360} 0% 100% / ${a})`);
      this.#hueElem.children[1].setAttribute('stop-color', `hsl(${hue * 360} 100% 50% / ${a})`);
      if (!this.#skipAlphaUpdate) {
        this.#alphaCursorElem.setAttribute('transform', `translate(${a * 64}, 0)`);
      }
      this.#alphaElem.children[0].setAttribute('stop-color', `hsl(${hue * 360} ${sat * 100}% ${lum * 100}% / 0)`);
      this.#alphaElem.children[1].setAttribute('stop-color', `hsl(${hue * 360} ${sat * 100}% ${lum * 100}% / 1)`);

      if (!this.#skipSatLevelUpdate) {
        this.#circleElem.setAttribute('cx', `${s * 64}`);
        this.#circleElem.setAttribute('cy', `${(1 - v) * 48}`);
      }
    }
    this.#skipHueUpdate = false;
    this.#skipSatLevelUpdate = false;
    this.#skipAlphaUpdate = false;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {converters: {to, from}, alpha} = this.#options;
    this.#alphaUIElem.style.display = alpha ? '' : 'none';
    this.#convertInternalToHex = alpha
       ? v => floatRGBAToHex(hsva01ToRGBAFloat(v))
       : v => floatRGBToHex(hsv01ToRGBFloat(v));
    this.#convertHexToInternal = alpha
       ? v => rgbaFloatToHSVA01(hexToFloatRGBA(v))
       : v => rgbFloatToHSV01(hexToFloatRGB(v));
    this.#to = to;
    this.#from = from;
    return this;
  }
}

/*

holder = new TabHolder
tab = holder.add(new Tab("name"))
tab.add(...)


pc = new PopdownController
top = pc.add(new Row())
top.add(new Button());
values = topRow.add(new Div())
bottom = pc.add(new Row());



pc = new PopdownController
pc.addTop
pc.addTop

pc.addBottom


*/

class PopDownController extends ValueController {
  #top;
  #valuesView;
  #checkboxElem;
  #bottom;
  #options = {
    open: false,
  };

  constructor(object, property, options = {}) {
    super(object, property, 'muigui-pop-down-controller');
    /*
    [ValueView
      [[B][values]]   upper row
      [[  visual ]]   lower row
    ]
    */
    this.#top = this.add(new ElementView('div', 'muigui-pop-down-top'));
//    this.#top.add(new CheckboxView(makeSetter(this.#options, 'open')));
    const checkboxElem = this.#top.addElem(createElem('input', {
      type: 'checkbox',
      onChange: () => {
        this.#options.open = checkboxElem.checked;
        this.updateDisplay();
      },
    }));
    this.#checkboxElem = checkboxElem;
    this.#valuesView = this.#top.add(new ElementView('div', 'muigui-pop-down-values'));
    const container = new ElementView('div', 'muigui-pop-down-bottom muigui-open-container');
    this.#bottom = new ElementView('div');
    container.add(this.#bottom);
    this.add(container);
    this.setOptions(options);
  }
  setKnobColor(bgCssColor/*, fgCssColor*/) {
    if (this.#checkboxElem) {
      this.#checkboxElem.style = `
        --range-color: ${bgCssColor};
        --value-bg-color: ${bgCssColor};
      `;
    }
  }
  updateDisplay() {
    super.updateDisplay();
    const {open} = this.#options;
    this.domElement.children[1].classList.toggle('muigui-open', open);
    this.domElement.children[1].classList.toggle('muigui-closed', !open);
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    super.setOptions(options);
    this.updateDisplay();
  }
  addTop(view) {
    return this.#valuesView.add(view);
  }
  addBottom(view) {
    return this.#bottom.add(view);
  }
}

/* eslint-disable no-underscore-dangle */

class ColorChooser extends PopDownController {
  #colorView;
  #textView;
  #to;

  constructor(object, property, options = {}) {
    super(object, property, 'muigui-color-chooser');
    const format = options.format || guessFormat(this.getValue());
    const {color, text} = colorFormatConverters[format];
    this.#to = color.to;
    this.#textView = new TextView(this, {converters: text, alpha: hasAlpha(format)});
    this.#colorView = new ColorChooserView(this, {converters: color, alpha: hasAlpha(format)});
    this.addTop(this.#textView);
    this.addBottom(this.#colorView);
    // WTF! FIX!
    this.___setKnobHelper = true;
    this.updateDisplay();
  }
  #setKnobHelper() {
    if (this.#to) {
      const hex6Or8 = this.#to(this.getValue());
      const alpha = hex6Or8.length === 9 ? hex6Or8.substring(7, 9) : 'FF';
      const hsl = rgbUint8ToHsl(hexToUint8RGB(hex6Or8));
      hsl[2] = (hsl[2] + 50) % 100;
      const hex = uint8RGBToHex(hslToRgbUint8(hsl));
      this.setKnobColor(`${hex6Or8.substring(0, 7)}${alpha}`, hex);
    }
  }
  updateDisplay() {
    super.updateDisplay();
    if (this.___setKnobHelper) {
      this.#setKnobHelper();
    }
  }
  setOptions(options) {
    super.setOptions(options);
    return this;
  }
}

function showCSS(ob) {
  if (ob.prototype.css) {
    showCSS(ob.prototype);
  }
}

class Layout extends View {
  static css = 'bar';
  constructor(tag, className) {
    super(createElem(tag, {className}));

    showCSS(this);
  }
}

/*
class ValueController ?? {
  const row = this.add(new Row());
  const label = row.add(new Label());
  const div = row.add(new Div());
  const row = div.add(new Row());
}
*/

/*
class MyCustomThing extends ValueController {
  constructor(object, property, options) {
    const topRow = this.add(new Row());
    const bottomRow = this.add(new Row());
    topRow.add(new NumberView());
    topRow.add(new NumberView());
    topRow.add(new NumberView());
    topRow.add(new NumberView());
    bottomRow.add(new DirectionView());
    bottomRow.add(new DirectionView());
    bottomRow.add(new DirectionView());
    bottomRow.add(new DirectionView());
  }
}
  new Grid([
    [new
  ]
  */

class Column extends Layout {
  constructor() {
    super('div', 'muigui-row');
  }
}

class Frame extends Layout {
  static css = 'foo';
  constructor() {
    super('div', 'muigui-frame');
  }
  static get foo() {
    return 'boo';
  }
}

class Grid extends Layout {
  constructor() {
    super('div', 'muigui-grid');
  }
}

class Row extends Layout {
  constructor() {
    super('div', 'muigui-row');
  }
}

class GUIFolder extends Folder {
  add(object, property, ...args) {
    const controller = object instanceof Controller
        ? object
        : createController(object, property, ...args);
    return this.addController(controller);
  }
  addCanvas(name) {
    return this.addController(new Canvas(name));
  }
  addColor(object, property, options = {}) {
    const value = object[property];
    if (hasAlpha(options.format || guessFormat(value))) {
      return this.addController(new ColorChooser(object, property, options));
    } else {
      return this.addController(new Color(object, property, options));
    }
  }
  addDivider() {
    return this.addController(new Divider());
  }
  addFolder(name) {
    return this.addController(new GUIFolder(name));
  }
  addLabel(text) {
    return this.addController(new Label(text));
  }
  addButton(name, fn) {
    const o = {fn};
    return this.add(o, 'fn').name(name);
  }
}

class MuiguiElement extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }
}

customElements.define('muigui-element', MuiguiElement);

const baseStyleSheet = new CSSStyleSheet();
//baseStyleSheet.replaceSync(css.default);
const userStyleSheet = new CSSStyleSheet();

function makeStyleSheetUpdater(styleSheet) {
  let newCss;
  let newCssPromise;

  function updateStyle() {
    if (newCss && !newCssPromise) {
      const s = newCss;
      newCss = undefined;
      newCssPromise = styleSheet.replace(s).then(() => {
        newCssPromise = undefined;
        updateStyle();
      });
    }
  }

  return function updateStyleSheet(css) {
    newCss = css;
    updateStyle();
  };
}

const updateBaseStyle = makeStyleSheetUpdater(baseStyleSheet);
const updateUserStyle = makeStyleSheetUpdater(userStyleSheet);

function getTheme(name) {
  const { include, css: cssStr } = css.themes[name];
  return `${include.map(m => css[m]).join('\n')} : css.default}\n${cssStr || ''}`;
}

class GUI extends GUIFolder {
  static converters = converters;
  static mapRange = mapRange;
  static makeRangeConverters = makeRangeConverters;
  static makeRangeOptions = makeRangeOptions;
  static makeMinMaxPair = makeMinMaxPair;
  #localStyleSheet = new CSSStyleSheet();

  constructor(options = {}) {
    super('Controls', 'muigui-root');
    if (options instanceof HTMLElement) {
      options = {parent: options};
    }
    const {
      autoPlace = true,
      width,
      title = 'Controls',
    } = options;
    let {
      parent,
    } = options;

    if (width) {
      this.domElement.style.width = /^\d+$/.test(width) ? `${width}px` : width;
    }
    if (parent === undefined && autoPlace) {
      parent = document.body;
      this.domElement.classList.add('muigui-auto-place');
    }
    if (parent) {
      const muiguiElement = createElem('muigui-element');
      muiguiElement.shadowRoot.adoptedStyleSheets = [this.#localStyleSheet, baseStyleSheet, userStyleSheet];
      muiguiElement.shadow.appendChild(this.domElement);
      parent.appendChild(muiguiElement);
    }
    if (title) {
      this.title(title);
    }
    this.#localStyleSheet.replaceSync(css.default);
    this.domElement.classList.add('muigui', 'muigui-colors');
  }
  setStyle(css) {
    this.#localStyleSheet.replace(css);
  }
  static setBaseStyles(css) {
    updateBaseStyle(css);
  }
  static getBaseStyleSheet() {
    return baseStyleSheet;
  }
  static setUserStyles(css) {
    updateUserStyle(css);
  }
  static getUserStyleSheet() {
    return userStyleSheet;
  }
  setTheme(name) {
    this.setStyle(getTheme(name));
  }
  static setTheme(name) {
    GUI.setBaseStyles(getTheme(name));
  }
}

function noop() {
}

const keyDirections = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

// This probably needs to be global
function addKeyboardEvents(elem, {onDown = noop, onUp = noop}) {
  const keyDown = function (event) {
    const mult = event.shiftKey ? 10 : 1;
    const [dx, dy] = (keyDirections[event.key] || [0, 0]).map(v => v * mult);
    const fn = event.type === 'keydown' ? onDown : onUp;
    fn({
      type: event.type.substring(3),
      dx,
      dy,
      event,
    });
  };

  elem.addEventListener('keydown', keyDown);
  elem.addEventListener('keyup', keyDown);

  return function () {
    elem.removeEventListener('keydown', keyDown);
    elem.removeEventListener('keyup', keyDown);
  };
}

function assert(truthy, msg = '') {
  if (!truthy) {
    throw new Error(msg);
  }
}

function getEllipsePointForAngle(cx, cy, rx, ry, phi, theta) {
  const m = Math.abs(rx) * Math.cos(theta);
  const n = Math.abs(ry) * Math.sin(theta);

  return [
    cx + Math.cos(phi) * m - Math.sin(phi) * n,
    cy + Math.sin(phi) * m + Math.cos(phi) * n,
  ];
}

function getEndpointParameters(cx, cy, rx, ry, phi, theta, dTheta) {
  const [x1, y1] = getEllipsePointForAngle(cx, cy, rx, ry, phi, theta);
  const [x2, y2] = getEllipsePointForAngle(cx, cy, rx, ry, phi, theta + dTheta);

  const fa = Math.abs(dTheta) > Math.PI ? 1 : 0;
  const fs = dTheta > 0 ? 1 : 0;

  return { x1, y1, x2, y2, fa, fs };
}

function arc(cx, cy, r, start, end) {
  assert(Math.abs(start - end) <= Math.PI * 2);
  assert(start >= -Math.PI && start <= Math.PI * 2);
  assert(start <= end);
  assert(end >= -Math.PI && end <= Math.PI * 4);

  const { x1, y1, x2, y2, fa, fs } = getEndpointParameters(cx, cy, r, r, 0, start, end - start);
  return Math.abs(Math.abs(start - end) - Math.PI * 2) > Number.EPSILON
     ? `M${cx} ${cy} L${x1} ${y1} A ${r} ${r} 0 ${fa} ${fs} ${x2} ${y2} L${cx} ${cy}`
     : `M${x1} ${y1} L${x1} ${y1} A ${r} ${r} 0 ${fa} ${fs} ${x2} ${y2}`;
}

const svg$2 = `
<svg tabindex="0" viewBox="-32 -32 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <!--<circle id="muigui-outline" cx="0" cy="0" r="28.871" class="muigui-direction-circle"/>-->
    <path id="muigui-range" class="muigui-direction-range" />
    <g id="muigui-arrow">
        <g transform="translate(-32, -32)">
          <path d="M31.029,33.883c-1.058,-0.007 -1.916,-0.868 -1.916,-1.928c0,-1.065 0.864,-1.929 1.929,-1.929c0.204,0 0.401,0.032 0.586,0.091l14.729,-0l0,-2.585l12.166,4.468l-12.166,4.468l0,-2.585l-15.315,0l-0.013,0Z" class="muigui-direction-arrow"/>
        </g>
    </g>
</svg>
`;

const twoPiMod = v => euclideanModulo$1(v + Math.PI, Math.PI * 2) - Math.PI;

class DirectionView extends EditView {
  #arrowElem;
  #rangeElem;
  #lastV;
  #wrap;
  #options = {
    step: 1,
    min: -180,
    max:  180,

    /*
       --------
      /  -π/2  \
     /     |    \
    |<- -π *     |
    |      * 0 ->|     zero is down the positive X axis
    |<- +π *     |
     \     |    /
      \   π/2  /
       --------
    */
    dirMin: -Math.PI,
    dirMax:  Math.PI,
    //dirMin: Math.PI * 0.5,
    //dirMax: Math.PI * 2.5,
    //dirMin: -Math.PI * 0.75,  // test 10:30 to 7:30
    //dirMax:  Math.PI * 0.75,
    //dirMin:  Math.PI * 0.75,   // test 7:30 to 10:30
    //dirMax: -Math.PI * 0.75,
    //dirMin: -Math.PI * 0.75,  // test 10:30 to 1:30
    //dirMax: -Math.PI * 0.25,
    //dirMin:  Math.PI * 0.25,   // test 4:30 to 7:30
    //dirMax:  Math.PI * 0.75,
    //dirMin:  Math.PI * 0.75,   // test 4:30 to 7:30
    //dirMax:  Math.PI * 0.25,
    wrap: undefined,
    converters: identity,
  };

  constructor(setter, options = {}) {
    const wheelHelper = createWheelHelper();
    super(createElem('div', {
      className: 'muigui-direction muigui-no-scroll',
      innerHTML: svg$2,
      onWheel: e => {
        e.preventDefault();
        const {min, max, step} = this.#options;
        const delta = wheelHelper(e, step);
        let tempV = this.#lastV + delta;
        if (this.#wrap) {
          tempV = euclideanModulo$1(tempV - min, max - min) + min;
        }
        const newV = clamp$1(stepify(tempV, v => v, step), min, max);
        setter.setValue(newV);
      },
    }));
    const handleTouch = (e) => {
      const {min, max, step, dirMin, dirMax} = this.#options;
      const nx = e.nx * 2 - 1;
      const ny = e.ny * 2 - 1;
      const a = Math.atan2(ny, nx);

      const center = (dirMin + dirMax) / 2;

      const centeredAngle = twoPiMod(a - center);
      const centeredStart = twoPiMod(dirMin - center);
      const diff = dirMax - dirMin;

      const n = clamp$1((centeredAngle - centeredStart) / (diff), 0, 1);
      const newV = stepify(min + (max - min) * n, v => v, step);
      setter.setValue(newV);
    };
    addTouchEvents(this.domElement, {
      onDown: handleTouch,
      onMove: handleTouch,
    });
    addKeyboardEvents(this.domElement, {
      onDown: (e) => {
        const {min, max, step} = this.#options;
        const newV = clamp$1(stepify(this.#lastV + e.dx * step, v => v, step), min, max);
        setter.setValue(newV);
      },
    });
    this.#arrowElem = this.$('#muigui-arrow');
    this.#rangeElem = this.$('#muigui-range');
    this.setOptions(options);
  }
  updateDisplay(v) {
    this.#lastV = v;
    const {min, max} = this.#options;
    const n = (v - min) / (max - min);
    const angle = lerp$1(this.#options.dirMin, this.#options.dirMax, n);
    this.#arrowElem.style.transform = `rotate(${angle}rad)`;
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    const {dirMin, dirMax, wrap} = this.#options;
    this.#wrap = wrap !== undefined
       ? wrap
       : Math.abs(dirMin - dirMax) >= Math.PI * 2 - Number.EPSILON;
    const [min, max] = dirMin < dirMax ? [dirMin, dirMax] : [dirMax , dirMin];
    this.#rangeElem.setAttribute('d', arc(0, 0, 28.87, min, max));
  }
}

// deg2rad
// where is 0
// range (0, 360), (-180, +180), (0,0)   Really this is a range

class Direction extends PopDownController {
  #options;
  constructor(object, property, options) {
    super(object, property, 'muigui-direction');
this.#options = options; // FIX
    this.addTop(new NumberView(this,
identity));
    this.addBottom(new DirectionView(this, options));
    this.updateDisplay();
  }
}

class RadioGridView extends EditView {
  #values;

  constructor(setter, keyValues, cols = 3) {
    const values = [];
    const name = makeId();
    super(createElem('div', {}, keyValues.map(([key, value], ndx) => {
      values.push(value);
      return createElem('label', {}, [
        createElem('input', {
          type: 'radio',
          name,
          value: ndx,
          onChange: function () {
            if (this.checked) {
              setter.setFinalValue(that.#values[this.value]);
            }
          },
        }),
        createElem('button', {
          type: 'button',
          textContent: key,
          onClick: function () {
            this.previousElementSibling.click();
          },
        }),
      ]);
    })));
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    this.#values = values;
    this.cols(cols);
  }
  updateDisplay(v) {
    const ndx = this.#values.indexOf(v);
    for (let i = 0; i < this.domElement.children.length; ++i) {
      this.domElement.children[i].children[0].checked = i === ndx;
    }
  }
  cols(cols) {
    this.domElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }
}

class RadioGrid extends ValueController {
  constructor(object, property, options) {
    super(object, property, 'muigui-radio-grid');
    const valueIsNumber = typeof this.getValue() === 'number';
    const {
      keyValues: keyValuesInput,
      cols = 3,
    } = options;
    const keyValues = convertToKeyValues(keyValuesInput, valueIsNumber);
    this.add(new RadioGridView(this, keyValues, cols));
    this.updateDisplay();
  }
}

function onResize(elem, callback) {
  new ResizeObserver(() => {
    callback({rect: elem.getBoundingClientRect(), elem});
  }).observe(elem);
}

function onResizeSVGNoScale(elem, hAnchor, vAnchor, callback) {
  onResize(elem, ({rect}) => {
    const {width, height} = rect;
    elem.setAttribute('viewBox', `-${width * hAnchor} -${height * vAnchor} ${width} ${height}`);
    callback({elem, rect});
  });
}

function onResizeCanvas(elem, callback) {
  onResize(elem, ({rect}) => {
    const {width, height} = rect;
    elem.width = width;
    elem.height = height;
    callback({elem, rect});
  });
}

const svg$1 = `
<svg tabindex="0" viewBox="-32 -32 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
  <g id="muigui-orientation">
    <g id="muigui-origin">
      <g transform="translate(0, 4)">
        <path id="muigui-ticks" class="muigui-ticks"/>
        <path id="muigui-thicks" class="muigui-thicks"/>
      </g>
      <g transform="translate(0, 14)">
        <g id="muigui-number-orientation">
          <g id="muigui-numbers" transform="translate(0, -3)" class="muigui-svg-text"/>
        </g>
      </g>
    </g>
    <linearGradient id="muigui-bg-to-transparent">
      <stop stop-color="var(--value-bg-color)" offset="0%"/>
      <stop stop-color="var(--value-bg-color)" stop-opacity="0" offset="100%"/>
    </linearGradient>
    <linearGradient id="muigui-transparent-to-bg">
      <stop stop-color="var(--value-bg-color)" stop-opacity="0"  offset="0%"/>
      <stop stop-color="var(--value-bg-color)" offset="100%"/>  
    </linearGradient>
    <!--<circle cx="0" cy="2" r="2" class="muigui-mark"/>-->
    <!--<rect x="-1" y="0" width="2" height="10" class="muigui-mark"/>-->
    <path d="M0 4L-2 0L2 0" class="muigui-mark"/>
  </g>
  <rect id="muigui-left-grad" x="0" y="0" width="20" height="20" fill="url(#muigui-bg-to-transparent)"/>
  <rect id="muigui-right-grad" x="48" y="0" width="20" height="20" fill="url(#muigui-transparent-to-bg)"/>
</svg>
`;

function createSVGTicks(start, end, step, min, max, height) {
  const p = [];
  if (start < min) {
    start += stepify(min - start, v => v, step);
  }
  end = Math.min(end, max);
  for (let i = start; i <= end; i += step) {
    p.push(`M${i} 0 l0 ${height}`);
  }
  return p.join(' ');
}

function createSVGNumbers(start, end, unitSize, unit, minusSize, min, max, labelFn) {
  const texts = [];
  if (start < min) {
    start += stepify(min - start, v => v, unitSize);
  }
  end = Math.min(end, max);
  const digits = Math.max(0, -Math.log10(unit));
  const f = v => labelFn(v.toFixed(digits));
  for (let i = start; i <= end; i += unitSize) {
    texts.push(`<text text-anchor="middle" dominant-baseline="hanging" x="${i >= 0 ? i : (i - minusSize / 2) }" y="0">${f(i / unitSize * unit)}</text>`);
  }
  return texts.join('\n');
}

function computeSizeOfMinus(elem) {
  const oldHTML = elem.innerHTML;
  elem.innerHTML = '<text>- </text>';
  const text = elem.querySelector('text');
  const size = text.getComputedTextLength();
  elem.innerHTML = oldHTML;
  return size;
}

class SliderView extends EditView {
  #svgElem;
  #originElem;
  #ticksElem;
  #thicksElem;
  #numbersElem;
  #leftGradElem;
  #rightGradElem;
  #width;
  #height;
  #lastV;
  #minusSize;
  #options = {
    min: -100,
    max: 100,
    step: 1,
    unit: 10,
    unitSize: 10,
    ticksPerUnit: 5,
    labelFn: v => v,
    tickHeight: 1,
    limits: true,
    thicksColor: undefined,
    orientation: undefined,
  };

  constructor(setter, options) {
    const wheelHelper = createWheelHelper();
    super(createElem('div', {
      innerHTML: svg$1,
      className: 'muigui-no-v-scroll',
      onWheel: e => {
        e.preventDefault();
        const {min, max, step} = this.#options;
        const delta = wheelHelper(e, step);
        const newV = clamp$1(stepify(this.#lastV + delta, v => v, step), min, max);
        setter.setValue(newV);
      },
    }));
    this.#svgElem = this.$('svg');
    this.#originElem = this.$('#muigui-origin');
    this.#ticksElem = this.$('#muigui-ticks');
    this.#thicksElem = this.$('#muigui-thicks');
    this.#numbersElem = this.$('#muigui-numbers');
    this.#leftGradElem = this.$('#muigui-left-grad');
    this.#rightGradElem = this.$('#muigui-right-grad');
    this.setOptions(options);
    let startV;
    addTouchEvents(this.domElement, {
      onDown: () => {
        startV = this.#lastV;
      },
      onMove: (e) => {
        const {min, max, unitSize, unit, step} = this.#options;
        const newV = clamp$1(stepify(startV - e.dx / unitSize * unit, v => v, step), min, max);
        setter.setValue(newV);
      },
    });
    addKeyboardEvents(this.domElement, {
      onDown: (e) => {
        const {min, max, step} = this.#options;
        const newV = clamp$1(stepify(this.#lastV + e.dx * step, v => v, step), min, max);
        setter.setValue(newV);
      },
    });
    onResizeSVGNoScale(this.#svgElem, 0.5, 0, ({rect: {width}}) => {
      this.#leftGradElem.setAttribute('x', -width / 2);
      this.#rightGradElem.setAttribute('x', width / 2 - 20);
      this.#minusSize = computeSizeOfMinus(this.#numbersElem);
      this.#width = width;
      this.#updateSlider();
    });
  }
  // |--------V--------|
  // . . | . . . | . . . |
  //
  #updateSlider() {
    // There's no size if ResizeObserver has not fired yet.
    if (!this.#width || this.#lastV === undefined) {
      return;
    }
    const {
      labelFn,
      limits,
      min,
      max,
      orientation,
      tickHeight,
      ticksPerUnit,
      unit,
      unitSize,
      thicksColor,
    } = this.#options;
    const unitsAcross = Math.ceil(this.#width / unitSize);
    const center = this.#lastV;
    const centerUnitSpace = center / unit;
    const startUnitSpace = Math.round(centerUnitSpace - unitsAcross);
    const endUnitSpace = startUnitSpace + unitsAcross * 2;
    const start = startUnitSpace * unitSize;
    const end = endUnitSpace * unitSize;
    const minUnitSpace = limits ? min * unitSize / unit : start;
    const maxUnitSpace = limits ? max * unitSize / unit : end;
    const height = labelFn(1) === '' ? 10 : 5;
    if (ticksPerUnit > 1) {
      this.#ticksElem.setAttribute('d', createSVGTicks(start, end, unitSize / ticksPerUnit, minUnitSpace, maxUnitSpace, height * tickHeight));
    }
    this.#thicksElem.style.stroke =  thicksColor; //setAttribute('stroke', thicksColor);
    this.#thicksElem.setAttribute('d', createSVGTicks(start, end, unitSize, minUnitSpace, maxUnitSpace, height));
    this.#numbersElem.innerHTML = createSVGNumbers(start, end, unitSize, unit, this.#minusSize, minUnitSpace, maxUnitSpace, labelFn);
    this.#originElem.setAttribute('transform', `translate(${-this.#lastV * unitSize / unit} 0)`);
    this.#svgElem.classList.toggle('muigui-slider-up', orientation === 'up');
  }
  updateDisplay(v) {
    this.#lastV = v;
    this.#updateSlider();
  }
  setOptions(options) {
    copyExistingProperties(this.#options, options);
    return this;
  }
}

class Slider extends ValueController {
  constructor(object, property, options = {}) {
    super(object, property, 'muigui-slider');
    this.add(new SliderView(this, options));
    this.add(new NumberView(this, options));
    this.updateDisplay();
  }
}

const svg = `
<svg tabindex="0" viewBox="-32 -32 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
  <path d="m-3200,0L3200,0M0,-3200L0,3200" class="muigui-vec2-axis"/>
  <path id="muigui-arrow" d="" class="muigui-vec2-line"/>
  <g id="muigui-circle" transform="translate(0, 0)">
    <circle r="3" class="muigui-vec2-axis"/>
  </g>
</svg>
`;

class Vec2View extends EditView {
  #svgElem;
  #arrowElem;
  #circleElem;
  #lastV = [];

  constructor(setter) {
    super(createElem('div', {
      innerHTML: svg,
      className: 'muigui-no-scroll',
    }));
    const onTouch = (e) => {
      const {width, height} = this.#svgElem.getBoundingClientRect();
      const nx = e.nx * 2 - 1;
      const ny = e.ny * 2 - 1;
      setter.setValue([nx * width * 0.5, ny * height * 0.5]);
    };
    addTouchEvents(this.domElement, {
      onDown: onTouch,
      onMove: onTouch,
    });
    this.#svgElem = this.$('svg');
    this.#arrowElem = this.$('#muigui-arrow');
    this.#circleElem = this.$('#muigui-circle');
    onResizeSVGNoScale(this.#svgElem, 0.5, 0.5, () => this.#updateDisplayImpl);
  }
  #updateDisplayImpl() {
    const [x, y] = this.#lastV;
    this.#arrowElem.setAttribute('d', `M0,0L${x},${y}`);
    this.#circleElem.setAttribute('transform', `translate(${x}, ${y})`);
  }
  updateDisplay(v) {
    this.#lastV[0] = v[0];
    this.#lastV[1] = v[1];
    this.#updateDisplayImpl();
  }
}

// TODO: zoom with wheel and pinch?
// TODO: grid?
// // options
//   scale:
//   range: number (both x and y + /)
//   range: array (min, max)
//   xRange:
// deg/rad/turn

class Vec2 extends PopDownController {
  constructor(object, property) {
    super(object, property, 'muigui-vec2');

    const makeSetter = (ndx) => {
      return {
        setValue: (v) => {
          const newV = this.getValue();
          newV[ndx] = v;
          this.setValue(newV);
        },
        setFinalValue: (v) => {
          const newV = this.getValue();
          newV[ndx] = v;
          this.setFinalValue(newV);
        },
      };
    };

    this.addTop(new NumberView(makeSetter(0), {
      converters: {
        to: v => v[0],
        from: strToNumber.from,
      },
    }));
    this.addTop(new NumberView(makeSetter(1), {
      converters: {
        to: v => v[1],
        from: strToNumber.from,
      },
    }));
    this.addBottom(new Vec2View(this));
    this.updateDisplay();
  }
}

const darkColors = {
  main: '#ddd',
};
const lightColors = {
  main: '#333',
};

const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');

let colors;
let isDarkMode;

function update() {
  isDarkMode = darkMatcher.matches;
  colors = isDarkMode ? darkColors : lightColors;
}
darkMatcher.addEventListener('change', update);
update();

function graph(canvas, data, {
    min = -1,
    max = 1,
    interval = 16,
    color,
  }) {
  const ctx = canvas.getContext('2d');

  function render() {
    const {width, height} = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    const range = max - min;
    for (let i = 0; i < data.length; ++i) {
      const x = i * width / data.length;
      const y = (data[i] - min) * height / range;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color || colors.main;
    ctx.stroke();
  }
  setInterval(render, interval);
}

function monitor(label, object, property, {interval = 200} = {}) {
  setInterval(() => {
    label.text(JSON.stringify(object[property], null, 2));
  }, interval);
}

const helpers = {
    graph,
    monitor,
};

export { ColorChooser, Direction, RadioGrid, Range, Select, Slider, TextNumber, Vec2, GUI as default, helpers };
//# sourceMappingURL=muigui.module.js.map
