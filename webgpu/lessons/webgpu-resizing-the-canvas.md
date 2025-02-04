Title: WebGPU Resizing the Canvas.
Description: How to resize a WebGPU canvas and the issues involved
TOC: Resizing the Canvas

In [the article on webgpu fundamentals](webgpu-fundamentals.html) we setup a basic
structure for setting the resolution of the canvas to match the size it's displayed.
Let's go over some of the details of resizing a canvas.

Every canvas has 2 sizes. The size of its *drawing buffer*. 
This is how many pixels are in the canvas itself.
The second size is the size the canvas is displayed. CSS determines the size the canvas is
displayed.

You can set the size of the canvas's drawing buffer in 2 ways. One using HTML

```html
<canvas id="c" width="400" height="300"></canvas>
```

The other using JavaScript

```html
<canvas id="c"></canvas>
```

JavaScript

```js
const canvas = document.querySelector("#c");
canvas.width = 400;
canvas.height = 300;
```

As for setting a canvas's display size, if you don't have any CSS that affects the canvas's display size
the display size will be the same size as its drawing buffer. So, in the 2 examples above, the canvas's drawingbuffer is 400x300
and its display size is also 400x300.

Here's an example of a canvas whose drawing buffer is 10x15 pixels that is displayed 400x300 pixels on the page

```html
<canvas id="c" width="10" height="15" style="width: 400px; height: 300px;"></canvas>
```

or for example like this

```html
<style>
#c {
  width: 400px;
  height: 300px;
}
</style>
<canvas id="c" width="10" height="15"></canvas>
```

If we draw a single pixel wide rotating line into that canvas we'll see something like this

{{{example url="../webgpu-10x15-canvas-400x300-css.html" }}}

Why is it so blurry? Because the browser takes our 10x15 pixel canvas and stretches it to 400x300 pixels and
generally it *filters* it when it stretches it.

So, what do we do if, for example, we want the canvas to fill the window? Well, first we can get
the browser to stretch the canvas to fill the window with CSS. Example:

```html
<html>
  <head>
    <style>
    html, body {
      margin: 0;       /* remove the default margin          */
      height: 100%;    /* make the html,body fill the page   */
    }
    #c {
      display: block;  /* make the canvas act like a block   */
      width: 100%;     /* make the canvas fill its container */
      height: 100%;
    }
    </style>
  </head>
  <body>
    <canvas id="c"></canvas>
  </body>
</html>
```

Now we just need to make the drawing buffer match whatever size the browser has stretched the canvas. 
This is unfortunately a more complicated topic than you might expect. Let's go over some different methods

## Use `ResizeObserver`

We covered this in [the article on webgpu fundamentals](webgpu-fundamentals.html).
This is the modern way and every browser that supports WebGPU also supports
`ResizeObserver`.

To repeat what we wrote in the other article: You create a
`ResizeObserver` and give it a function to call whenever the elements you've
asked it to observe change their size. You then tell it which elements to
observe.

```js
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const width = entry.contentBoxSize[0].inlineSize;
    const height = entry.contentBoxSize[0].blockSize;
    const canvas = entry.target;
    canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
    canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
  }
});
observer.observe(canvas);
```

In the code above we go over all the entries but there should only ever be one
because we're only observing one canvas. We need to limit the size of the canvas
to the largest size our device supports otherwise WebGPU will start generating
errors that we tried to make a texture that is too large. We also need to make
sure it doesn't go to zero or again we'll get errors. 

If we're only rendering on demand then we might put a call to our render
function inside the code above. Otherwise, if we're animating by using a
`requestAnimationFrame` loop (rAF loop), or other means, then the next time we
render we'll get a texture that matches the size we set on the canvas when we
call `context.getCurrentTexture()`.

> Note that `inlineSize` and `blockSize` are not integers

## Use `clientWidth` and `clientHeight`

Before `ResizeObserver` existed it was common to use
`clientWidth` and `clientHeight`.
These are properties every element in HTML has that tell us
the size of the element in CSS pixels. 

> Note: The client rect includes any CSS padding so if you're using `clientWidth`
and/or `clientHeight` it's best not to put any padding on your canvas element.

Using JavaScript we can check what size that element is being displayed and then adjust
its drawing buffer size to match.

```js
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
  canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
```

We'd use this code just before calling `context.getCurrentTexture()`.

This way seems out of date personally but you'll likely see it here and there
probably copy and pasted from old examples using other APIs.

## Use `getBoundingClientRect`

Another way to do this is to call `getBoundingClientRect`.

```js
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const rect = canvas.getBoundingClientRect();
  const width = rect.width; 
  const height = rect.height; 
  canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
  canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
```

The difference between `clientWidth`, `clientHeight` and `getBoundingClientRect`
is that the width and height from `getBoundingClientRect` is not required to
be an integer where as the values of `clientWidth` and `clientHeight` are.

Why would the width or height not be integers? [See below](#a-dpr).

## Use `window.innerWidth` and `window.innerHeight`

I see this often and it really seems like an **anti-pattern**. 
The reason is it's inflexible. The 2 techniques above work in every situation
whereas using `window.innerWidth` and `window.innerHeight` only work in one
specific situation, when you want to fill the page. We've already shown
the techniques above fill the page just fine but they also work in every other
situation.

Having the canvas *not* fill the page. Like a diagram in an article
Or in an editor with a toolbar.

It's not more work to use the first 2 techniques so it seems silly to use
this less useful technique. Unfortunately the "copy and paste" force is strong 😂

## <a id="a-dpr"></a>Handling `devicePixelRatio` and Zoom

Why is that not the end of it? Well, This is where it gets complicated. 

The first thing to understand is that most sizes in the browser are in CSS pixel
units. This is an attempt to make the sizes device independent. So for example
at the top of this article we set the canvas's display size to 400x300 CSS
pixels. Depending on if the user has an HD-DPI display, or is zoomed in or
zoomed out, or has an OS zoom level set, how many actual pixels that becomes on
the monitor will be different.

`devicePixelRatio` will tell us, in general, the ratio of actual pixels
to CSS pixels on your monitor. For example here's your browser's current setting

> <div>devicePixelRatio = <span data-diagram="dpr"></span></div>

If you're on a desktop or laptop try pressing 
<kbd>ctrl</kbd>+<kbd>+</kbd> and <kbd>ctrl</kbd>+<kbd>-</kbd> to zoom in and out
(<kbd>⌘</kbd>+<kbd>+</kbd> and <kbd>⌘</kbd>+<kbd>-</kbd> on Mac). You should see
the number change in Firefox, Chrome, Edge (but not Safari)

So if we want the number of pixels in the canvas to match the number of pixels
actually used to display it the seemingly obvious solution would be to multiply
the values we looked up above like this

```js
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
-    const width = entry.contentBoxSize[0].inlineSize;
-    const height = entry.contentBoxSize[0].blockSize;
+    const width = entry.contentBoxSize[0].inlineSize * devicePixelRatio;
+    const height = entry.contentBoxSize[0].blockSize * devicePixelRatio;
```

Or this

```js
-  const width = canvas.clientWidth;
-  const height = canvas.clientHeight;
+ const width = canvas.clientWidth * devicePixelRatio;
+ const height = canvas.clientHeight * devicePixelRatio;
```

Or this

```js
  const rect = canvas.getBoundingClientRect();
-  const width = rect.width; 
-  const height = rect.height; 
+  const width = rect.width * devicePixelRatio; 
+  const height = rect.height * devicePixelRatio; 
```

> **THE EXAMPLES ABOVE WILL NOT ACTUALLY GIVE THE CORRECT RESULT!!!**

That said, it's close and might be good enough for your needs. If you don't
care you're not getting a perfect 1 to 1 pixel rendering on the screen
then you can use the solutions above.

There are 2 ways to see why the code above doesn't provide the correct answer

1. `devicePixelRatio` is not an integer

   If you are on Firefox, Edge, or Chrome and press the zoom keys like mentioned
   above you can easily see fractional `devicePixelRatio` values.

2. The size of any element itself is not an integer

   Above we saw that both `ResizeObserver` and `getBoundingClientRect`
   return non-integer values for the size of an element.

To as a concrete example of where this issue comes up we can make a div
with 3 children, each set be the 33% the width of their parent

```html
<div id="parent">
  <div id="left">left</div>
  <div id="middle">middle</div>
  <div id="right">right</div>
</div>
```

```css
#parent {
  display: flex;
  width: 299px;
  height: 40px;
  align-items: stretch;
  background-color: red;
}
#parent>* {
  flex: 1 1 33%;
}
#left { background-color: #A44; }
#middle { background-color: #4A4; }
#right { background-color: #66C; }
```

{{{example url="../fractional-element-size-issues.html"}}}

On one of my machines, with a default (un-zoomed) browser window, I get these
results

<pre class="fixed-size-text">
devicePixelRatio: 2
--------------- #left ---------------
                 inlineSize: 99.65625
                clientWidth: 100
getBoundingClientRect.width: 99.6640625
--------------- #middle ---------------
                 inlineSize: 99.65625
                clientWidth: 100
getBoundingClientRect.width: 99.6640625
--------------- #right ---------------
                 inlineSize: 99.65625
                clientWidth: 100
getBoundingClientRect.width: 99.6640625
--------------- #parent ---------------
                 inlineSize: 299
                clientWidth: 299
getBoundingClientRect.width: 299
</pre>

The #1 thing to notice is **the numbers for all 3 children are exactly the same!!**
But, our parent is 299 css pixels wide. If we multiply that by the devicePixelRatio
of 2 we get 598 actual pixels. We have 3 children. `598 / 3 = 199.33333333333334`
We can't have 199.33333333334 actual pixels. If we round to 199 then
199 + 199 + 199 = 597. But our parent is 598. To get to 598, one of those
elements needs an extra pixel but, given the info for all 3 is exactly the same,
which one gets the extra pixel?

## <a id="a-devicepixelcontentboxsize"></a> `devicePixelContentBoxSize`

The solution is that `ResizeObserver` provides the answer. It's called
`devicePixelContentBoxSize`

```
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
-    const width = entry.contentBoxSize[0].inlineSize;
-    const height = entry.contentBoxSize[0].blockSize;
+    const width = entry.devicePixelContentBoxSize[0].inlineSize;
+    const height = entry.devicePixelContentBoxSize[0].blockSize;
```

If we add that measurement to our example it gives us the actual answer

{{{example url="../fractional-element-size-device-pixel-content-box-size.html"}}}

On the machine I used for the results above I get these results

<pre class="fixed-size-text">
devicePixelRatio: 2
--------------- #left ---------------
                          inlineSize: 99.65625
devicePixelContentBoxSize.inlineSize: 199    <=====
                         clientWidth: 100
         getBoundingClientRect.width: 99.6640625
--------------- #middle ---------------
                          inlineSize: 99.65625
devicePixelContentBoxSize.inlineSize: 200    <=====
                         clientWidth: 100
         getBoundingClientRect.width: 99.6640625
--------------- #right ---------------
                          inlineSize: 99.65625
devicePixelContentBoxSize.inlineSize: 199    <=====
                         clientWidth: 100
         getBoundingClientRect.width: 99.6640625
--------------- #parent ---------------
                          inlineSize: 299
devicePixelContentBoxSize.inlineSize: 598    <=====
                         clientWidth: 299
         getBoundingClientRect.width: 299
</pre>

As you can see, on my machine the browser gave the center element the extra pixel.
It's 200 device pixels wide vs the other 2 elements which are 199 device pixels
wide.

This issue isn't limited to this case, it's just the easiest way to show
a concrete example of not being able to get this info any other way.
The point being, if you want pixel perfection, you can not just multiply
some other measurement by `devicePixelRatio`. You must use `ResizeObserver`
and `devicePixelContentBoxSize`.

Note: Safari, as of November 2023, does not support `devicePixelContentBoxSize`
nor does Safari change the `devicePixelRatio` in response to zooming. This means
**It's impossible on Safari to display a 1x1 pixel perfect canvas**.

## `content-box` vs `device-pixel-content-box`

When you call `ResizeObserver.observe` you can tell it to observe the changes
of 1 of 2 box sizes. The default is to observe the `content-box` size. 
This is the CSS size of the element.
Above, the elements may never change CSS size. The parent is set to 299px CSS pixels
and regardless of zoom level. The children are set to 33% which is 33% of 299 which
is always 99.666666 (or whatever they compute, see results above).
On the other hand, if the element is the full size of the page then it would change
as you zoom. [^safari]

You can also observe `device-pixel-content-box`. This is the size of the actual
number of device pixels the element takes. This will change when the zoom level
changes [^safari]. It won't change if the size in device pixels of the element
didn't actually change. For example if the element is the full size of the page
then zooming doesn't change the fact that it's still the full size of the page
and therefore still the same number of device pixels.

[^safari]: Except on Safari 🤬

To tell `ResizeObserver` which size to observe you pass it in when calling
`observe`.

```
resizeObserver.observe(someElement1, {box: 'device-pixel-content-box'});
resizeObserver.observe(someElement2, {box: 'content-box'});
```

Unfortunately, again, Safari does not support this and will throw an
exception if you try to pass `'device-pixel-content-box'`.

## <a id="a-actual-pixels"></a> Actual pixels - solution

As of November 2023 then, the solution to getting the actual number of pixels
is to request both types of boxes above, trap the safari issue, and, if
`devicePixelContentBoxSize` is not available, fallback to `contentBoxSize`.

Here's is our boilerplate canvas resizing code updated to support pixel
perfect rendering on all standards compliant browsers [^safari]

```js
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const width = entry.devicePixelContentBoxSize?.[0].inlineSize ||
                    entry.contentBoxSize[0].inlineSize * devicePixelRatio;
      const height = entry.devicePixelContentBoxSize?.[0].blockSize ||
                     entry.contentBoxSize[0].blockSize * devicePixelRatio;
      const canvas = entry.target;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      // re-render
      render();
    }
  });
  try {
    observer.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(canvas, { box: 'content-box' });
  }
```

We can test this by drawing a pattern that will show a [moiré effect](https://www.google.com/search?q=moire+effect) if
the rendering is not pixel perfect. We drew a pattern like this in [the article on inter-stage variables](webgpu-inter-stage-variables.html#a-builtin-position).

Replacing the canvas resizing code with the snippet above and changing
the pattern to a magenta, green, white, black checkerboard.

```wgsl
  @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
-    let red = vec4f(1, 0, 0, 1);
-    let cyan = vec4f(0, 1, 1, 1);
-    return select(red, cyan, checker);

+    let hv = vec2f(floor(fsInput.position.xy % 2));
+    return vec4f(1, 0, 1, 1) * hv.x +
+           vec4f(0, 1, 0, 1) * hv.y;
  }
```

Let's also make the triangle big enough to cover the canvas [^large-triangle]

[^large-triangle]: See [this article](webgpu-large-triangle-to-cover-clip-space.html) for why these vertex positions.

```js
    let pos = array(
-      vec2f( 0.0,  0.5),  // top center
-      vec2f(-0.5, -0.5),  // bottom left
-      vec2f( 0.5, -0.5)   // bottom right
+      vec2f(-1.0,  3.0),
+      vec2f( 3.0, -1.0),
+      vec2f(-1.0, -1.0),
    );
```

{{{example url="../webgpu-resize-pixel-perfect.html" }}}

Open it in new window and zoom in or out. You should see a monotone pattern that looks almost like a solid color that doesn't change regardless of zoom level
except on Safari where if you zoom you may see [moiré patterns](https://www.google.com/search?q=moire+pattern) showing
that it was impossible to get pixel perfection on Safari.

> Note: If you'd like to
add your polite voice for Safari to support `devicePixelContentBox` you can
add to the bug report [here](https://bugs.webkit.org/show_bug.cgi?id=264158)
as well as the bug about Safari not changing `devicePixelRatio` in response
to zoom [here](https://bugs.webkit.org/show_bug.cgi?id=124862). Bugs are often
worked on by how much attention they get so please add your voice to the bugs.

## Do you need to use `devicePixelRatio`?

Drawing to higher resolutions is slower than drawing to lower resolutions.
It's not always important to use `devicePixelRatio`. Even if you do decide
to support it, [many phones have device pixel ratios as high as 4](https://yesviz.com/viewport/). That's
a total of 16 pixels for every CSS pixel. Drawing 16x the pixels is literally
up to 16x slower than drawing 1. So maybe you'd like to consider limiting
how you use devicePixelRatio like `dpr = Math.min(2, devicePixelRatio)`.

Further, given that games often have a poor experience if they are slow, you
might consider letting the user choose a multiplier which is what many native
computer games do in their graphics options settings. Then the user can choose
if they want resolution or speed.

<!-- keep this at the bottom of the article -->
<script type="module" src="webgpu-resizing-the-canvas.js"></script>
