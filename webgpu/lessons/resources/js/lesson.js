import './data-tables.js';
// Licensed under a BSD license. See license.html for license
/* eslint-disable strict */
/* global settings, contributors, jQuery */
(function($){

function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

//
function replaceParams(str, subs) {
  return str.replace(/\${(\w+)}/g, function(m, key) {
    return subs[key];
  });
}

function showContributors() {
  // contribTemplate: 'Thank you
  // <a href="${html_url}">
  // <img src="${avatar_url}">${login}<a/>
  //  for <a href="https://github.com/${owner}/${repo}/commits?author=${login}">${contributions} contributions</a>',
  try {
    const subs = {...settings, ...contributors[Math.random() * contributors.length | 0]};
    const template = settings.contribTemplate;
    const html = replaceParams(template, subs);
    const parent = document.querySelector('#forkongithub a');
    const div = document.createElement('div');
    div.className = 'contributors';
    div.innerHTML = html;
    parent.appendChild(div);
  } catch (e) {
    console.error(e);
  }
}
showContributors();

function supportsDirectBufferBinding(device) {
  const buffer = device.createBuffer({size: 16, usage: GPUBufferUsage.UNIFORM});
  const layout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} }],
  });

  try {
    device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: buffer }],
    });
    return true;
  } catch {
    return false;
  } finally {
    buffer.destroy();
  }
}

function supportsDirectTextureBinding(device) {
  const texture = device.createTexture({size: [1], usage: GPUTextureUsage.TEXTURE_BINDING, format: 'rgba8unorm'});
  const layout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} }],
  });

  try {
    device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: texture }],
    });
    return true;
  } catch {
    return false;
  } finally {
    texture.destroy();
  }
}

function supportsDirectTextureAttachments(device) {
  const texture = device.createTexture({size: [1], usage: GPUTextureUsage.RENDER_ATTACHMENT, format: 'rgba8unorm', sampleCount: 4});
  const resolveTarget = device.createTexture({size: [1], usage: GPUTextureUsage.RENDER_ATTACHMENT, format: 'rgba8unorm' });
  const depthTexture = device.createTexture({size: [1], usage: GPUTextureUsage.RENDER_ATTACHMENT, format: 'depth16unorm', sampleCount: 4 });
  const encoder = device.createCommandEncoder();
  try {
    const pass = encoder.beginRenderPass({
      colorAttachments: [{view: texture, resolveTarget, loadOp: 'load', storeOp: 'store' }],
      depthStencilAttachment: { view: depthTexture, depthLoadOp: 'load', depthStoreOp: 'store' },
    });
    pass.end();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  } finally {
    encoder.finish();
    texture.destroy();
    resolveTarget.destroy();
  }
}

async function checkWebGPU() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (device) {
    if (!supportsDirectBufferBinding(device) ||
        !supportsDirectTextureBinding(device) ||
        !supportsDirectTextureAttachments(device)) {
      $('#need-newer-webgpu').show();
    }
  }
}

const DIFF_MODE_KEY = 'webgpufundamentals.diffMode';
// Cycle order for the per-block "diff mode" button. Until the user clicks once,
// no preference is stored and the page is in "auto": viewport width decides
// between side-by-side and inline-diff.
const DIFF_MODES = ['side-by-side', 'inline-diff', 'hide-deleted'];
const DIFF_AUTO_WIDE_MQ = '(min-width: 1100px)';

function getStoredDiffMode() {
  const v = localStorage.getItem(DIFF_MODE_KEY);
  return DIFF_MODES.includes(v) ? v : null;
}

function getEffectiveDiffMode() {
  return getStoredDiffMode() ||
    (window.matchMedia(DIFF_AUTO_WIDE_MQ).matches ? 'side-by-side' : 'inline-diff');
}

function refreshDiffModeUI() {
  document.body.dataset.diffMode = getStoredDiffMode() || 'auto';
  const label = `diff: ${getEffectiveDiffMode()}`;
  document.querySelectorAll('.diff-mode-btn').forEach(b => {
    b.textContent = label;
  });
}

function cycleDiffMode() {
  const cur = getEffectiveDiffMode();
  const i = DIFF_MODES.indexOf(cur);
  const next = DIFF_MODES[(i + 1) % DIFF_MODES.length];
  localStorage.setItem(DIFF_MODE_KEY, next);
  refreshDiffModeUI();
}

// Build a side-by-side variant of a diff list and inject it next to the inline list.
// Strategy: a run of `-` lines goes on the left with blanks on the right; a run of `+` lines
// goes on the right with blanks on the left. Unchanged and `*`-modified lines appear on both
// sides. No 1:1 pairing of `-`/`+` runs (avoids implying a line correspondence that wasn't
// authored).
function buildSideBySideForList(list) {
  const left = list.cloneNode(false);
  const right = list.cloneNode(false);
  left.classList.add('sbs-side', 'sbs-left');
  right.classList.add('sbs-side', 'sbs-right');

  for (const li of Array.from(list.children)) {
    const isAdd = li.classList.contains('lineadded');
    const isDel = li.classList.contains('linedeleted');
    if (isAdd) {
      left.appendChild(makeBlankLi());
      right.appendChild(li.cloneNode(true));
    } else if (isDel) {
      left.appendChild(li.cloneNode(true));
      right.appendChild(makeBlankLi());
    } else {
      left.appendChild(li.cloneNode(true));
      right.appendChild(li.cloneNode(true));
    }
  }

  const sbs = document.createElement('div');
  sbs.className = 'sbs-diff';
  sbs.append(left, right);

  // Wrap original list in an inline-only container so CSS can show one or the other.
  const inlineWrap = document.createElement('div');
  inlineWrap.className = 'sbs-inline';
  list.parentNode.insertBefore(inlineWrap, list);
  inlineWrap.appendChild(list);
  inlineWrap.parentNode.insertBefore(sbs, inlineWrap.nextSibling);
}

function makeBlankLi() {
  const blank = document.createElement('li');
  blank.className = 'sbs-blank';
  blank.appendChild(document.createTextNode(' '));
  return blank;
}

function setupDiffModes() {
  // :has() not supported in some older browsers — fall back to no-op there.
  let diffPres;
  try {
    diffPres = document.querySelectorAll('pre:has(.lineadded), pre:has(.linedeleted)');
  } catch (e) {
    return;
  }
  if (!diffPres.length) {
    return;
  }

  diffPres.forEach(pre => {
    const list = pre.querySelector('ul.modifiedlines, ol.modifiedlines');
    if (list) {
      buildSideBySideForList(list);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diff-mode-btn';
    btn.title = 'Cycle diff display mode (side-by-side / inline-diff / hide-deleted)';
    btn.addEventListener('click', cycleDiffMode);
    pre.appendChild(btn);
  });

  // While in auto, the effective mode follows viewport width, so update labels on resize.
  window.matchMedia(DIFF_AUTO_WIDE_MQ).addEventListener('change', () => {
    if (!getStoredDiffMode()) {
      refreshDiffModeUI();
    }
  });

  refreshDiffModeUI();
}

$(document).ready(function($) {
  const linkImgs = function(bigHref) {
    return function() {
      const a = document.createElement('a');
      a.href = bigHref;
      a.title = this.alt;
      a.className = this.className;
      a.setAttribute('align', this.align);
      this.setAttribute('align', '');
      this.className = '';
      this.style.border = '0px';
      return a;
    };
  };
  const linkSmallImgs = function(ext) {
    return function() {
      const src = this.src;
      return linkImgs(src.substr(0, src.length - 7) + ext);
    };
  };
  const linkBigImgs = function() {
    const src = $(this).attr('big');
    return linkImgs(src);
  };
  $('img[big$=".jpg"]').wrap(linkBigImgs);
  $('img[src$="-sm.jpg"]').wrap(linkSmallImgs('.jpg'));
  $('img[src$="-sm.gif"]').wrap(linkSmallImgs('.gif'));
  $('img[src$="-sm.png"]').wrap(linkSmallImgs('.png'));
  $('pre>code')
     .unwrap()
     .replaceWith(function() {
      return $('<pre class="prettyprint showlinemods notranslate" translate="no">' + this.innerHTML + '</pre>');
    });
  checkWebGPU();
  if (window.prettyPrint) {
    window.prettyPrint();
    setupDiffModes();
  }
  $('span[class=com]')
    .addClass('translate yestranslate')
    .attr('translate', 'yes');

  const params = getQueryParams();
  if (params.doubleSpace || params.doublespace) {
    document.body.className = document.body.className + ' doubleSpace';
  }

  $('.language').on('change', function() {
    window.location.href = this.value;
  });

  $('a[data-href]').on('click', function() {
    window.location.href = this.dataset.href;
  });

  $('#search').on('keyup', function(e) {
    if (e.key !== 'Enter') {
      return;
    }
    const a = document.createElement('a');
    a.target = '_blank';
    const u = new URL('https://google.com/search');
    u.searchParams.set('q', `site:webgpufundamentals.org ${this.value}`);
    a.href = u.toString();
    a.click();
  });

  $('[data-table]').html();
  $('a[id]:not([href])')
    .addClass('permalink')
    .each(function(i, e) {
      $(e).attr('href', `#${$(e).attr('id')}`);
    })
    .append('<div class="permalink">#</div>');

});
}(jQuery));

// ios needs this to allow touch events in an iframe
window.addEventListener('touchstart', {});
