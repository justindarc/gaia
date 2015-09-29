'use strict';

/* global require, exports */
/* exported getHeadStylesheetPaths, replaceHeadStylesheets */
var utils = require('utils');
var jsmin = require('jsmin');

var htmlFileExtension = /\.html$/;
var excludeHTMLPaths  = /^.*(\/node_modules|\/components|\/test).*$/;

exports.execute = function(options) {
  utils.copyToStage(options);

  createConfigFile(options);
  createMetadataScripts(options);
  deleteMediaFolder(options);

  if (options.GAIA_OPTIMIZE === '1') {
    optimize(options);
  }
};

function createConfigFile(options) {
  var targetPath = utils.joinPath(options.STAGE_APP_DIR, 'js', 'config.js');
  var file = utils.getFile(targetPath);
  var content = 'var SERVICE_WORKERS = ' +
    (options.NGA_SERVICE_WORKERS === '1') + ';';

  utils.writeContent(file, content);
}

function createMetadataScripts(options) {
  var targetPath = utils.joinPath(options.STAGE_APP_DIR, 'js',
    'metadata', 'metadata_scripts.js');
  var sharedPath = utils.gaia.getInstance(options).sharedFolder.path;
  var files = [
    [sharedPath, 'js', 'blobview.js'],
    [options.APP_DIR, 'js', 'metadata', 'formats.js'],
    [options.APP_DIR, 'js', 'metadata', 'core.js']
  ];

  utils.concatenatedScripts(files, targetPath);
}

function deleteMediaFolder(options) {
  utils.deleteFile(utils.joinPath(options.STAGE_APP_DIR, 'media'), true);
}

function optimize(options) {
  var paths = getHTMLPaths(options);
  paths.forEach(function(path) {
    var html = utils.getFileContent(utils.getFile(path));

    html = stripHTMLComments(html);

    var headScriptPaths = getHeadScriptPaths(html);
    var bodyScriptPaths = getBodyScriptPaths(html);

    var fileName = path.substring(options.STAGE_APP_DIR.length + 1);
    var dirName  = utils.dirname(fileName);

    headScriptPaths = headScriptPaths.map(function(scriptPath) {
      if (scriptPath.charAt(0) === '/') {
        return [options.STAGE_APP_DIR, scriptPath];
      }

      return [options.STAGE_APP_DIR, dirName, scriptPath];
    });

    bodyScriptPaths = bodyScriptPaths.map(function(scriptPath) {
      if (scriptPath.charAt(0) === '/') {
        return [options.STAGE_APP_DIR, scriptPath];
      }

      return [options.STAGE_APP_DIR, dirName, scriptPath];
    });

    var targetHeadScriptPath =
      utils.joinPath(options.STAGE_APP_DIR, 'opt', fileName + '.head.js');
    var targetBodyScriptPath =
      utils.joinPath(options.STAGE_APP_DIR, 'opt', fileName + '.body.js');

    utils.ensureFolderExists(
      utils.getFile(utils.joinPath(options.STAGE_APP_DIR, 'opt')));

    utils.concatenatedScripts(headScriptPaths, targetHeadScriptPath);
    utils.concatenatedScripts(bodyScriptPaths, targetBodyScriptPath);

    minifyScript(targetHeadScriptPath);
    minifyScript(targetBodyScriptPath);

    html = replaceHeadScripts(fileName, html);
    html = replaceBodyScripts(fileName, html);

    utils.writeContent(utils.getFile(path), html);
  });
}

function stripHTMLComments(html) {
  return html.replace(/<!--(.|\n)*?-->/g, '');
}

function getHTMLPaths(options) {
  var paths = [];

  utils.listFiles(options.STAGE_APP_DIR, utils.FILE_TYPE_FILE, true)
    .forEach(function(path) {
      if (htmlFileExtension.test(path) && !excludeHTMLPaths.test(path)) {
        paths.push(path);
      }
    });

  return paths;
}

function getHeadStylesheetPaths(html) {
  var paths = [];
  var head = html.match(/<head(.*?)>(.|\n)*?<\/head>/)[0];
  var stylesheets = head.match(/<link\srel\=\"stylesheet\"\s.*?>/g);
  stylesheets.forEach(function(stylesheet) {
    paths.push(stylesheet.match(/href\=\"(.*?)\"/)[1]);
  });
  return paths;
}

function getHeadScriptPaths(html) {
  var paths = [];
  var head = html.match(/<head(.*?)>(.|\n)*?<\/head>/)[0];
  var scripts = head.match(/<script\ssrc.*?<\/script>/g);
  scripts.forEach(function(script) {
    paths.push(script.match(/src\=\"(.*?)\"/)[1]);
  });
  return paths;
}

function getBodyScriptPaths(html) {
  var paths = [];
  var body = html.match(/<body(.*?)>(.|\n)*?<\/body>/)[0];
  var scripts = body.match(/<script\ssrc.*?<\/script>/g);
  scripts.forEach(function(script) {
    paths.push(script.match(/src\=\"(.*?)\"/)[1]);
  });
  return paths;
}

function replaceHeadStylesheets(fileName, html) {
  var head = html.match(/<head(.*?)>(.|\n)*?<\/head>/)[0];
  var stylesheets = head.match(/<link\srel\=\"stylesheet\"\s.*?>/g);
  stylesheets.forEach(function(stylesheet, index) {
    if (index === stylesheets.length - 1) {
      html = html.replace(stylesheet,
        '<link rel="stylesheet" href="/opt/' + fileName + '.head.css">');
      return;
    }

    html = html.replace(stylesheet, '');
  });

  return html;
}

function replaceHeadScripts(fileName, html) {
  var head = html.match(/<head(.*?)>(.|\n)*?<\/head>/)[0];
  var scripts = head.match(/<script\ssrc.*?<\/script>/g);
  scripts.forEach(function(script, index) {
    if (index === scripts.length - 1) {
      html = html.replace(script,
        '<script src="/opt/' + fileName + '.head.js"></script>');
      return;
    }

    html = html.replace(script, '');
  });

  return html;
}

function replaceBodyScripts(fileName, html) {
  var body = html.match(/<body(.*?)>(.|\n)*?<\/body>/)[0];
  var scripts = body.match(/<script\ssrc.*?<\/script>/g);
  scripts.forEach(function(script, index) {
    if (index === scripts.length - 1) {
      html = html.replace(script,
        '<script src="/opt/' + fileName + '.body.js"></script>');
      return;
    }

    html = html.replace(script, '');
  });

  return html;
}

function minifyScript(path) {
  try {
    var file = utils.getFile(path);
    var content = utils.getFileContent(file);
    utils.writeContent(file, jsmin(content).code);
  } catch(e) {
    utils.log('Error minifying content: ' + path);
  }
}
