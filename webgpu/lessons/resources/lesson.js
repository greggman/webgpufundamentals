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
  if (window.prettyPrint) {
    window.prettyPrint();
    // Firefox doesn't support the has() css selector as of 2023-09-09
    try {
      document.querySelectorAll('pre:has(.linedeleted)').forEach(e => {
        const b = $('<button>').text('hide deleted').addClass('linedeleted-button').attr('type', 'button').on('click', () => {
          const hide = e.classList.toggle('hide-linedeleted');
          b.text(hide ? 'show deleted' : 'hide deleted');
        });
        $(e).append(b);
      });
    } catch (e) {
      console.error(e);
    }
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

  $('[data-table]').html();

});
}(jQuery));

// ios needs this to allow touch events in an iframe
window.addEventListener('touchstart', {});
