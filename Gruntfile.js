/* eslint-disable @typescript-eslint/no-var-requires */
/*eslint-env node*/

'use strict';

process.on('unhandledRejection', up => {
  throw up;
});

const fs = require('fs');
const path = require('path');
const c = require('ansi-colors');
const liveEditor = require('@gfxfundamentals/live-editor');
const fixLinks = require('./build/fix-links.js');
const generateIndex = require('./build/generate-index.js');
const liveEditorPath = path.dirname(require.resolve('@gfxfundamentals/live-editor'));
const webgpuTypesPath = path.join(__dirname, 'node_modules', '@webgpu', 'types');
const dataDir = require('./build/appdata')('servez-cli');
const Servez = require('servez-lib');

// Seems hacky, should probably register something in lesson-builder
const Handlebars = require('handlebars');
const hanson = require('hanson');
Handlebars.registerHelper('toc-steps', function(options) {
  if (!options || !options.hash || !options.hash.list) {
    return '';
  }

  const listFilename = path.basename(options.hash.list);
  const lessonsDir = path.resolve(path.join(process.cwd(), 'webgpu/lessons'));
  const expectedPrefix = lessonsDir + path.sep;
  const resolvedListPath = path.resolve(lessonsDir, listFilename);

  if (!resolvedListPath.startsWith(expectedPrefix)) {
    throw new Error(`Security Error: Path traversal detected for ${resolvedListPath}`);
  }

  if (!fs.existsSync(resolvedListPath)) {
    throw new Error(`List file not found: ${resolvedListPath}`);
  }

  const listContent = fs.readFileSync(resolvedListPath, 'utf-8');
  const articleFilenames = hanson.parse(listContent);

  if (!Array.isArray(articleFilenames)) {
    throw new Error(`Expected array in hanson file: ${resolvedListPath}`);
  }

  const root = options.data && options.data.root ? options.data.root : this;
  const currentLang = root.lang || 'en';
  const currentContentFileName = root.contentFileName || '';
  const currentBasename = path.basename(currentContentFileName);
  const hereText = root.here || '(here)';

  const lis = articleFilenames.map((rawFilename) => {
    const sanitizedFilename = path.basename(rawFilename);

    // Check for localized file first, then fallback to English
    let mdPath = path.resolve(lessonsDir, currentLang === 'en' ? '' : currentLang, sanitizedFilename);
    const expectedMdPrefix = path.resolve(lessonsDir, currentLang === 'en' ? '' : currentLang) + path.sep;

    if (!mdPath.startsWith(expectedMdPrefix)) {
      throw new Error(`Security Error: Path traversal detected for ${mdPath}`);
    }

    if (!fs.existsSync(mdPath)) {
      mdPath = path.resolve(lessonsDir, sanitizedFilename);
      if (!mdPath.startsWith(expectedPrefix)) {
        throw new Error(`Security Error: Path traversal detected for ${mdPath}`);
      }
    }

    let title = sanitizedFilename;
    const htmlFilename = sanitizedFilename.replace(/\.md$/, '.html');
    let href = `${(currentLang === 'en' ? '' : '../')}${htmlFilename}`;
    if (fs.existsSync(mdPath)) {
      href = htmlFilename;
      const content = fs.readFileSync(mdPath, 'utf-8');
      const lines = content.split('\n');
      let headerTitle = '';
      let headerToc = '';
      for (const rawLine of lines) {
        const line = rawLine.trim();
        const m = /([A-Z0-9_-]+): (.*?)$/i.exec(line);
        if (!m) {
          break;
        }
        const key = m[1].toLowerCase();
        if (key === 'title') {
          headerTitle = m[2];
        } else if (key === 'toc') {
          headerToc = m[2];
        }
      }
      title = headerToc || headerTitle || title;
    }

    const escapedTitle = Handlebars.escapeExpression(title);
    const isCurrent = sanitizedFilename === currentBasename;
    const suffix = isCurrent ? ` ⬅ ${Handlebars.escapeExpression(hereText)}` : '';

    return `  <li><a href="${href}">${escapedTitle}</a>${suffix}</li>`;
  });

  return new Handlebars.SafeString(`<ol>\n${lis.join('\n')}\n</ol>`);
});

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  const s_ignoreRE = /\.(md|py|sh|enc)$/i;
  function noMds(filename) {
    return !s_ignoreRE.test(filename);
  }

  const s_isMdRE = /\.md$/i;
  function mdsOnly(filename) {
    return s_isMdRE.test(filename);
  }

  function notFolder(filename) {
    return !fs.statSync(filename).isDirectory();
  }

  function noMdsNoFolders(filename) {
    return noMds(filename) && notFolder(filename);
  }

  grunt.initConfig({
    eslint: {
      lib: {
        src: [
          'webgpu/resources/*.js',
        ],
      },
      support: {
        src: [
          'Gruntfile.js',
          'build/js/build.js',
        ],
      },
      examples: {
        src: [
          'webgpu/*.html',
          'webgpu/lessons/resources/*.js',
          '!webgpu/lessons/resources/js/prettify.js',
          'webgpu/lessons/resources/*.html',
        ],
      },
    },
    copy: {
      main: {
        files: [
          { expand: false, src: '*', dest: 'out/', filter: noMdsNoFolders, },
          { expand: true, cwd: `${liveEditor.monacoEditor}/`, src: 'min/**', dest: 'out/monaco-editor/', nonull: true, },
          { expand: true, cwd: `${liveEditorPath}/src/`, src: '**', dest: 'out/webgpu/resources/', nonull: true, },
          { expand: true, cwd: `${webgpuTypesPath}/`, src: 'dist/**', dest: 'out/types/webgpu/', nonull: true, },
          { expand: true, src: 'webgpu/**', dest: 'out/', filter: noMds, },
          { expand: true, src: '3rdparty/**', dest: 'out/', },
        ],
      },
    },
    clean: [
      'out/**/*',
    ],
    buildlesson: {
      main: {
        files: [],
      },
    },
    watch: {
      main: {
        files: [
          'webgpu/**',
          '3rdparty/**',
          'node_modules/@gfxfundamentals/live-editor/src/**',
        ],
        tasks: ['copy'],
        options: {
          spawn: false,
        },
      },
      lessons: {
        files: [
          'webgpu/lessons/**/webgpu*.md',
        ],
        tasks: ['buildlesson'],
        options: {
          spawn: false,
        },
      },
    },
  });

  let changedFiles = {};
  const onChange = grunt.util._.debounce(function() {
    grunt.config('copy.main.files', Object.keys(changedFiles).filter(noMds).map((file) => {
      const copy = {
        src: file,
        dest: 'out/',
      };
      if (file.indexOf('live-editor') >= 0) {
        copy.cwd = `${path.dirname(file)}/`;
        copy.src = path.basename(file);
        copy.expand = true;
        copy.dest = 'out/webgpu/resources/';
      }
      return copy;
    }));
    grunt.config('buildlesson.main.files', Object.keys(changedFiles).filter(mdsOnly).map((file) => {
      return {
        src: file,
      };
    }));
    changedFiles = {};
  }, 200);
  grunt.event.on('watch', function(action, filepath) {
    changedFiles[filepath] = action;
    onChange();
  });

  const buildSettings = {
    outDir: 'out',
    baseUrl: 'https://webgpufundamentals.org',
    rootFolder: 'webgpu',
    lessonGrep: 'webgpu*.md',
    siteName: 'webgpufundamentals',
    siteThumbnail: 'webgpufundamentals.jpg',  // in rootFolder/lessons/resources
    templatePath: 'build/templates',
    owner: 'gfxfundamentals',
    repo: 'webgpufundamentals',
    postHTMLFn: fixLinks,
    thumbnailOptions: {
      thumbnailBackground: 'webgpufundamentals-background.jpg',
      text: [
        {
          font: 'bold 100px lesson-font',
          verticalSpacing: 100,
          offset: [100, 120],
          textAlign: 'left',
          shadowOffset: [15, 15],
          strokeWidth: 15,
          textWrapWidth: 1000,
        },
        {
          font: 'bold 60px lesson-font',
          text: 'webgpufundamentals.org',
          verticalSpacing: 100,
          offset: [-100, -90],
          textAlign: 'right',
          shadowOffset: [8, 8],
          strokeWidth: 15,
          textWrapWidth: 1000,
          color: 'hsl(340, 100%, 70%)',
        },
      ],
    },
  };

  // just the hackiest way to get this working.
  grunt.registerMultiTask('buildlesson', 'build a lesson', function() {
    const filenames = new Set();
    this.files.forEach((files) => {
      files.src.forEach((filename) => {
        filenames.add(filename);
      });
    });
    const buildStuff = require('@gfxfundamentals/lesson-builder');
    const settings = Object.assign({}, buildSettings, {
      filenames,
    });
    const finish = this.async();
    buildStuff(settings).finally(finish);
  });

  grunt.registerTask('buildlessons', function() {
    const buildStuff = require('@gfxfundamentals/lesson-builder');
    const finish = this.async();
    buildStuff(buildSettings).finally(finish);
  });

  grunt.registerTask('buildindex', function() {
    let dirs = fs.readdirSync('out', { withFileTypes: true, recursive: true });
    dirs = dirs.filter(dir => dir.isDirectory());
    dirs = dirs.filter(dir => !fs.existsSync(path.join(dir.parentPath, dir.name, 'index.html')));
    dirs = dirs.filter(dir => !(/monaco-editor|types/.test(path.join(dir.parentPath, dir.name))));
    dirs.forEach(dir => {
      generateIndex(path.join(dir.parentPath, dir.name));
    });
  });

  grunt.registerTask('serve', function() {
    //const done = this.async();
    const logger = {
      log: console.log,
      error: console.error,
      c,
    };
    const hosts = [];

    const root = path.join(__dirname, 'out');

    const server = new Servez(Object.assign({
      root,
      dataDir,
      logger,
    }, {
      port: 8080,
      scan: true,
      index: true,
      dirs: true,
      extensions: ['html'],
    }));
    server.on('host', function(...args) {
      const localRE = /\D0\.0\.0\.0.\D|\D127\.0\.0\.|\Wlocalhost\W/;
      const [data] = args;
      const {root} = data;
      if (!localRE.test(root)) {
        hosts.push(root);
      }
    });
    server.on('start', function() {
      console.log('press CTRL-C to stop the server.');
    });
  });

  grunt.registerTask('build', ['clean', 'copy:main', 'buildlessons', 'buildindex']);
  grunt.registerTask('buildwatch', ['build', 'serve', 'watch']);

  grunt.registerTask('default', ['eslint', 'build']);
};

