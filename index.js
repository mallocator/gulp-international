'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var flat = require('flat');
var gutil = require('gulp-util');
var through = require('through2');


/**
 * Any loaded dictionaries are stored here with the path as key and the translation map as value.
 * @type {Object}
 */
var dictionaries = {};

/**
 * A cache for previously loaded dictionaries so we don't have to load them again
 * @type {Array}
 */
var cache = [];

/**
 * Defauls options that are used if they are not overwritten by the user.
 * @type {Object}
 */
var defaults = {
  locales: './locales',
  delimiter: {
    prefix: 'R.',
    stopCondition: /[^\.\w_\-]/
  },
  filename: '${path}/${name}-${lang}.${ext}',
  blacklist: [],
  warn: true,
  cache: true,
  ignoreErrors: false,
  dryRun: false,
  includeOriginal: false,
  ignoreTokens: false
};

/**
 * Loads the dictionaries from the locale directory.
 * @param {Object} options
 */
function load(options) {
  if (cache[options.locales]) {
    dictionaries = cache[options.locales];
  } else {
    try {
      var files = fs.readdirSync(options.locales);
      for (var i in files) {
        var file = files[i];
        switch (path.extname(file)) {
          case '.json':
          case '.js':
            dictionaries[path.basename(file, path.extname(file))] = flat(require(path.join(process.cwd(), options.locales, file)));
            break;
          case '.ini':
            var iniData = fs.readFileSync(path.join(process.cwd(), options.locales, file));
            dictionaries[path.basename(file, path.extname(file))] = flat(ini2json(iniData));
            break;
          case '.csv':
            var csvData = fs.readFileSync(path.join(process.cwd(), options.locales, file));
            dictionaries[path.basename(file, path.extname(file))] = csv2json(csvData);
            break;
        }
      }
      if (options.cache) {
        cache[options.locales] = dictionaries;
      }
    } catch (e) {
      throw new Error('No translation dictionaries have been found!');
    }
  }
}

/**
 * Splits a line from an ini file into 2. Any subsequent '=' are ignored.
 * @param {string} line
 * @returns {string[]}
 */
function splitIniLine(line) {
  var separator = line.indexOf('=');
  if (separator == -1) {
    return [line];
  }
  return [
    line.substr(0, separator),
    line.substr(separator + 1)
  ]
}

/**
 * Simple conversion helper to get a json file from an ini file.
 * @param {string} iniData
 * @returns {{}}
 */
function ini2json(iniData) {
  var result = {};
  var iniLines = iniData.toString().split('\n');
  var context = null;
  for (var i in iniLines) {
    var fields = splitIniLine(iniLines[i]);
    for (var j in fields) {
      fields[j] = fields[j].trim();
    }
    if (fields[0].length) {
      if (fields[0].indexOf('[')==0) {
        context = fields[0].substring(1, fields[0].length -1)
      } else {
        if (context) {
          if (!result[context]) {
            result[context] = {};
          }
          result[context][fields[0]] = fields[1];
        } else {
          result[fields[0]] = fields[1];
        }
      }
    }
  }
  return result;
}

/**
 * Converts a line of a CSV file to an array of strings, omitting empty fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  if (!line.trim().length) {
    return [];
  }
  var fields = [];
  var inQuotes = false;
  var separator = 0;
  for (var i = 0; i < line.length; i++) {
    switch(line[i]) {
      case "\"":
        if (i>0 && line[i-1] != "\\") {
          inQuotes = !inQuotes;
        }
        break;
      case ",":
        if (!inQuotes) {
          if (separator < i) {
            var field = line.substring(separator, i).trim();
            if (field.length) {
              fields.push(field);
            }
          }
          separator = i + 1;
        }
        break;
    }
  }
  fields.push(line.substring(separator).trim());
  return fields;
}

/**
 * Simple conversion helper to get a json file from a csv file.
 * @param {string} csvData
 * @returns {Object}
 */
function csv2json(csvData) {
  var result = {};
  var csvLines = csvData.toString().split('\n');
  for (var i in csvLines) {
    var fields = splitCsvLine(csvLines[i]);
    if (fields.length) {
      var key = '';
      for (var k = 0; k < fields.length - 1; k++) {
        if (fields[k].length) {
          key += '.' + fields[k];
        }
      }
      result[key.substr(1)] = fields[fields.length - 1];
    }
  }
  return result;
}

/**
 * Performs the actual translation from a tokenized source to the final content.
 * @param {Object} options
 * @param {string} contents
 * @param {number} copied
 * @param {string} filePath
 * @returns {Object}
 */
function translate(options, contents, copied, filePath) {
  var processed = {};
  for (var lang in dictionaries) {
    if (!options.whitelist || options.whitelist.indexOf(lang) != -1) {
      if (!processed[lang] && options.blacklist.indexOf(lang) == -1) {
        processed[lang] = '';
      }
    }
  }
  if (!Object.keys(processed).length) {
    throw new Error('No translation dictionaries available to create any files!');
  }
  var i = contents.indexOf(options.delimiter.prefix);
  if (!(options.ignoreTokens === true || options.ignoreTokens instanceof RegExp && options.ignoreTokens.test(filePath))) {
    while ((i !== -1)) {
      var endMatch, length, token, key;
      var tail = contents.substr(i);
      if (options.delimiter.suffix) {
        endMatch = tail.match(options.delimiter.suffix);
        length = endMatch.index + endMatch[0].length;
        token = tail.substr(0, length);
        key = token.substr(options.delimiter.prefix.length, token.length - options.delimiter.prefix.length - options.delimiter.suffix.length);
      }
      else if (options.delimiter.stopCondition) {
        endMatch = tail.match(options.delimiter.stopCondition);
        length = endMatch == null ? tail.length : length = endMatch.index + endMatch[0].length - 1;
        token = tail.substr(0, length);
        key = token.substr(options.delimiter.prefix.length);
      }
      var next = contents.indexOf(options.delimiter.prefix, i + length + 1);

      for (var lang in processed) {
        processed[lang] += contents.substring(copied, i);
        if (dictionaries[lang][key] !== undefined) {
          processed[lang] += dictionaries[lang][key];
        } else if (options.warn) {
          gutil.log('Missing translation of language', lang, 'for key', key, 'in file', filePath);
        }
        processed[lang] += contents.substring(i + length, next == -1 ? contents.length : next);
      }
      copied = next;

      i = next;
    }
  }
  for (var lang in processed) {
    if (!processed[lang].length) {
      processed[lang] = contents;
    }
  }
  return processed;
}

/**
 * Performs the actual replacing of tokens with translations.
 * @param {File} file
 * @param {Object} options
 * @returns {File[]}
 */
function replace(file, options) {
  var contents = file.contents.toString('utf8');
  var copied = 0;

  var processed = translate(options, contents, copied, file.path);

  var files = [];
  for (var lang in processed) {
    var params = {};
    params.ext = path.extname(file.path).substr(1);
    params.name = path.basename(file.path, path.extname(file.path));
    params.path = file.base.substr(0, file.base.length - 1);
    params.lang = lang;

    var filePath = options.filename;
    for (var param in params) {
      filePath = filePath.replace('${' + param + '}', params[param]);
    }

    var newFile = new gutil.File({
      base: file.base,
      cwd: file.cwd,
      path: filePath,
      contents: new Buffer(processed[lang], 'utf8')
    });
    files.push(newFile);
  }

	return files;
}

/**
 * Returns a stream object that gulp can understand and pipe to.
 * @param options
 * @returns {Stream}
 */
module.exports = function(options) {
  if (options) {
    if (options.whitelist && !_.isArray(options.whitelist)) {
      options.whitelist = [options.whitelist];
    }
    if (options.blacklist && !_.isArray(options.blacklist)) {
      options.blacklist = [options.blacklist];
    }
  }
  options = _.assign({}, defaults, options);
  load(options);

  module.exports.options = options;
  module.exports.dictionaries = dictionaries;

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      return cb(new gutil.PluginError('gulp-international', 'Streaming not supported'));
    }

    try {
      var files = replace(file, options);
      if (options.dryRun === true || options.dryRun instanceof RegExp && options.dryRun.test(file.path)) {
        this.push(file);
      } else {
        if (options.includeOriginal === true || options.includeOriginal instanceof RegExp && options.includeOriginal.test(file.path)) {
          this.push(file);
        }
        for (var i in files) {
          this.push(files[i]);
        }
      }
    } catch (err) {
      if (!options.ignoreErrors) {
        this.emit('error', new gutil.PluginError('gulp-international', err));
      }
    }

    cb();
  });
};
