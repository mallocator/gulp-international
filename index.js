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
 * Defauls options that are used if they are not overwritten by the user.
 * @type {Object}
 */
var defaults = {
  locales: './locales',
  delimiter: {
    prefix: 'R.',
    stopCondition: /[;,<>\{}()\[\]"'\s$]/
  },
  filename: '${path}/${name}-${lang}.${ext}',
  blacklist: []
};

/**
 * Loads the dictionaries from the locale directory.
 * @param options
 */
function load(options) {
  if (Object.keys(dictionaries).length) {
    return;
  }
  var files = fs.readdirSync(options.locales);
  for (var i in files) {
    var file = files[i];
    switch(path.extname(file)) {
      case '.json':
      case '.js':
        dictionaries[path.basename(file, path.extname(file))] = flat(require(path.join(process.cwd(), options.locales, file)));
        break;
      case '.ini':
        var iniData = fs.readFileSync(path.join(process.cwd(), options.locales, file));
        dictionaries[path.basename(file, path.extname(file))] = flat(ini2json(iniData));
        break;
    }
  }

  if (!Object.keys(dictionaries).length) {
    throw new Error('No translation dictionaries have been found!');
  }
}

/**
 * Simple conversion helper to get a json file from an ini file.
 * @param iniData
 * @returns {{}}
 */
function ini2json(iniData) {
  var result = {};
  var iniLines = iniData.toString().split('\n');
  var context = null;
  for (var i in iniLines) {
    var fields = iniLines[i].split('=');
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
 * Performs the actual translation from a tokenized source to the final content.
 * @param options
 * @param contents
 * @param copied
 * @returns {{}}
 */
function translate(options, contents, copied) {
  var processed = {};
  for (var lang in dictionaries) {
    if (!options.whitelist || options.whitelist.indexOf(lang) != -1) {
      if (!processed[lang] && options.blacklist.indexOf(lang) == -1) {
        processed[lang] = '';
      }
    }
  }
  var i = contents.indexOf(options.delimiter.prefix);
  while ((i !== -1)) {
    var endMatch, length, token, key;
    if (options.delimiter.suffix) {
      endMatch = contents.substr(i).match(options.delimiter.suffix);
      length = endMatch.index + endMatch[0].length;
      token = contents.substr(i, length);
      key = token.substr(options.delimiter.prefix.length, token.length - options.delimiter.prefix.length - options.delimiter.suffix.length);
    }
    else if (options.delimiter.stopCondition) {
      endMatch = contents.substr(i).match(options.delimiter.stopCondition);
      length = endMatch.index + endMatch[0].length - 1;
      token = contents.substr(i, length);
      key = token.substr(options.delimiter.prefix.length);
    }

    var next = contents.indexOf(options.delimiter.prefix, i + length + 1);

    for (var lang in processed) {
      processed[lang] += contents.substring(copied, i);
      processed[lang] += dictionaries[lang][key];
      processed[lang] += contents.substring(i + length, next == -1 ? contents.length : next);
      copied = next + 1;
    }

    i = next;
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
 * @param file
 * @param options
 * @returns {*}
 */
function replace(file, options) {
  var contents = file.contents.toString('utf8');
  var copied = 0;

  var processed = translate(options, contents, copied);

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
      base: path.dirname(filePath) + '/',
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
 */
module.exports = function (options) {
  if (options.whitelist && !_.isArray(options.whitelist)) {
    options.whitelist = [options.whitelist];
  }
  if (options.blacklist && !_.isArray(options.blacklist)) {
    options.blacklist = [options.blacklist];
  }
  options = _.assign({}, defaults, options);
  load(options);

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-international', 'Streaming not supported'));
			return;
		}

    this.options = options;

		try {
			var files = replace(file, options);
      for (var i in files) {
        this.push(files[i]);
      }
		} catch (err) {
			this.emit('error', new gutil.PluginError('gulp-international', err));
		}

		cb();
	});
};
