'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var flat = require('flat');
var gutil = require('gulp-util');
var he = require('he');
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
 * Default options that are used if they are not overwritten by the user.
 * @type {Object}
 */
var defaults = {
  locales: './locales',
  delimiter: {
    prefix: 'R.',
    stopCondition: /[^\.\w_\-]/
  },
  filename: '${path}/${name}-${lang}.${ext}',
  whitelist: true,
  blacklist: false,
  warn: true,
  cache: true,
  ignoreErrors: false,
  dryRun: false,
  includeOriginal: false,
  ignoreTokens: false,
  encodeEntities: true,
  verbose: false
};

/**
 * A helper function to test whether an option was set to true or the value matches the options regular expression.
 * @param {boolean|string|RegExp} needle
 * @param {String} haystack
 * @returns {boolean}
 */
function trueOrMatch(needle, haystack) {
  if (needle === true) {
    return true;
  }
  if (_.isRegExp(needle) && needle.test(haystack)) {
    return true;
  }
  if (_.isString(needle) && haystack.indexOf(needle) !== -1) {
    return true;
  }
  if (needle instanceof Array) {
    for (var i in needle) {
      if (trueOrMatch(needle[i], haystack)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Splits a line from an ini file into 2. Any subsequent '=' are ignored.
 * @param {String} line
 * @returns {String[]}
 */
function splitIniLine(line) {
  var separator = line.indexOf('=');
  if (separator === -1) {
    return [line];
  }
  return [
    line.substr(0, separator),
    line.substr(separator + 1)
  ];
}

/**
 * Simple conversion helper to get a json file from an ini file.
 * @param {String} iniData
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
      if (fields[0].indexOf('[')===0) {
        context = fields[0].substring(1, fields[0].length - 1);
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
 * @param {String} line
 * @returns {String[]}
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
 * @param {String} csvData
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
 * Loads the dictionaries from the locale directory.
 * @param {Object} options
 */
function load(options) {
  if (cache[options.locales]) {
    options.verbose && gutil.log('Skip loading cached translations from', options.locales);
    return dictionaries = cache[options.locales];
  }
  try {
    options.verbose && gutil.log('Loading translations from', options.locales);
    var files = fs.readdirSync(options.locales);
    var count = 0;
    for (var i in files) {
      var file = files[i];
      switch (path.extname(file)) {
        case '.json':
        case '.js':
          dictionaries[path.basename(file, path.extname(file))] = flat(require(path.join(process.cwd(), options.locales, file)));
          options.verbose && gutil.log('Added translations from', file);
          count++;
          break;
        case '.ini':
          var iniData = fs.readFileSync(path.join(process.cwd(), options.locales, file));
          dictionaries[path.basename(file, path.extname(file))] = flat(ini2json(iniData));
          options.verbose && gutil.log('Added translations from', file);
          count++;
          break;
        case '.csv':
          var csvData = fs.readFileSync(path.join(process.cwd(), options.locales, file));
          dictionaries[path.basename(file, path.extname(file))] = csv2json(csvData);
          options.verbose && gutil.log('Added translations from', file);
          count++;
          break;
        default:
          options.verbose && gutil.log('Ignored file', file);
      }
    }
    options.verbose && gutil.log('Loaded', count,  'translations from', options.locales);
    if (options.cache) {
      options.verbose && gutil.log('Cashing translations from', options.locales);
      cache[options.locales] = dictionaries;
    }
  } catch (e) {
    e.message = 'No translation dictionaries have been found!';
    throw e;
  }
}

/**
 * Helper function that detects whether a buffer is binary or utf8.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isBinary(buffer) {
  var chunk = buffer.toString('utf8', 0, Math.min(buffer.length, 24));
  for (var i in chunk) {
    var charCode = chunk.charCodeAt(i);
    if (charCode == 65533 || charCode <= 8) {
      return true;
    }
  }
  return false;
}

/**
 * Performs the actual translation from a tokenized source to the final content.
 * @param {Object} options
 * @param {Buffer|String} contents
 * @param {number} copied
 * @param {String} filePath
 * @returns {Object}
 */
function translate(options, contents, copied, filePath) {
  var processed = {};
  for (var lang in dictionaries) {
    if (!processed[lang] && trueOrMatch(options.whitelist, lang) && !trueOrMatch(options.blacklist, lang)) {
      processed[lang] = '';
    }
  }
  if (!Object.keys(processed).length) {
    throw new Error('No translation dictionaries available to create any files!');
  }
  options.verbose && gutil.log('Starting translation for', processed.length, 'languages');
  if (trueOrMatch(options.ignoreTokens, filePath)) {
    options.verbose && gutil.log('Ignoring file', filePath, 'because of ignoreTokens option');
  } else if(isBinary(contents)) {
    options.verbose && gutil.log('Ignoring file', filePath, 'because file is binary');
  } else {
    contents = contents.toString('utf8');
    var i = contents.indexOf(options.delimiter.prefix);
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
          if (trueOrMatch(options.encodeEntities, filePath)) {
            processed[lang] += he.encode(dictionaries[lang][key], { useNamedReferences: true });
          } else {
            processed[lang] += dictionaries[lang][key];
          }
        } else if (options.verbose || trueOrMatch(options.warn, filePath)) {
          gutil.log('Missing translation of language', lang, 'for key', key, 'in file', filePath);
        }
        processed[lang] += contents.substring(i + length, next == -1 ? contents.length : next);
      }
      copied = next;
      i = next;
    }
  }
  for (var procLang in processed) {
    if (!processed[procLang].length) {
      options.verbose && gutil.log('Copying original content to target language', procLang, 'because no replacements have happened');
      processed[procLang] = contents;
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
  var contents = file.contents;
  var copied = 0;

  var processed = translate(options, contents, copied, file.path);

  var files = [];
  for (var lang in processed) {
    var params = {};
    params.ext = path.extname(file.path).substr(1);
    params.name = path.basename(file.path, path.extname(file.path));
    params.path = file.path.substring(file.base.length, file.path.lastIndexOf('/'));
    params.lang = lang;

    var filePath = options.filename;
    for (var param in params) {
      filePath = filePath.replace('${' + param + '}', params[param]);
    }
    filePath = path.join(file.base,filePath);

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
  options.verbose && gutil.log('gulp-international is starting');
  options = _.assign({}, defaults, options);
  load(options);

  options.verbose && gutil.log('Parsed options:', JSON.toString(options));

  module.exports.options = options;
  module.exports.dictionaries = dictionaries;

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      options.verbose && gutil.log('gulp-international is skipping stream processing as it only supports buffered files.');
      return cb(new gutil.PluginError('gulp-international', 'Streaming not supported'));
    }

    try {
      var files = replace(file, options);
      if (trueOrMatch(options.dryRun, file.path)) {
        options.verbose && gutil.log('Ignoring all translations and passing on original file because "dryRun" was set');
        this.push(file);
      } else {
        if (trueOrMatch(options.includeOriginal, file.path)) {
          options.verbose && gutil.log('Passing on original file because "includeOriginal" was set');
          this.push(file);
        }
        for (var i in files) {
          options.verbose && gutil.log('Passing on translated file', files[i].path);
          this.push(files[i]);
        }
      }
    } catch (err) {
      if (!trueOrMatch(options.ignoreErrors, file.path)) {
        this.emit('error', new gutil.PluginError('gulp-international', err));
      }
    }

    options.verbose && gutil.log('gulp-international has finished');
    cb();
  });
};
