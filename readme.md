# gulp-international 
[![npm version](https://badge.fury.io/js/gulp-international.svg)](http://badge.fury.io/js/gulp-international)
[![Build Status](https://travis-ci.org/mallocator/gulp-international.svg?branch=master)](https://travis-ci.org/mallocator/gulp-international)
[![Coverage Status](https://coveralls.io/repos/mallocator/gulp-international/badge.svg?branch=master&service=github)](https://coveralls.io/github/mallocator/gulp-international?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/gulp-international.svg)](https://david-dm.org/mallocator/gulp-international) 

This is a plugin for gulp that allows you to replace your custom placeholders for different language versions of your translations.

There are already a few plugins for i18n out there, but none of them seem to work properly. Rather than dig in their code I wanted
to use this opportunity to learn how to write plugins for gulp.  

Features (cause we all love features):
 
 * Custom token formats
 * Custom language descriptors
 * Custom filename format
 * Custom translation source directory
 * Read from .json, .js, .ini or .csv file (for examples check the test folder)
 

## Install

```
$ npm install --save-dev gulp-international
```


## Usage

```js
var gulp = require('gulp');
var international = require('gulp-international');

gulp.task('default', function () {
	return gulp.src('src/file.ext')
		.pipe(international())
		.pipe(gulp.dest('dist'));
});
```


## Options

### locales

Type: string (path)
Default: ```./locales```

This tells the script where to look for translation file. Currently supported are .json, .js and .ini files. Each format supports
nested keys (.ini only 1 level via sections). The name of the file is used for generating the output file. A source file with name
```index.html``` with a translation file called ```en_US.json``` would result in an output file called ```index-en_US.html```.  
You don't have to use this format. Basically any name is valid for the file and will be used later on.


### filename

Type: string
Default: ```${path}/${name}-${lang}.${ext}```

This options allows a user to configure the output format as desired. The default will generate all files in the same directory
with the language suffix. A configuration to store each version in it's own path would be: ```${path}/${lang}/${name}.${ext}```


### delimiter

Type: Object
Default:  
```
{
  prefix: 'R.',
  stopCondition: /[;,\.<>\{}()\[\]"'\s$]/
}
```

The default configuration takes some queues from Android resources. The replacer is using the prefix to find tokens. The stopCondition 
is used to determine where a token ends (exclusively). The defaults settings looks for either whitespace or a selection of special 
characters. Examples of matchable resources are:

 * html: ```<div>R.title<div>```
 * javascript: ```alert('R.message');```, ```var test = a[R.item]```
 * jade: ```div.big#R.field(src="R.link") R.linkDescription```

Alternatively you can also define a suffix that will determine where a token ends while including the result. An example configuration
would be 

```
{
  prefix: '${',
  suffix: '}'
}
```

This configuration would match any tokens formatted like this: ```<div>${title}</div>```.


### whitelist

Type: Array(string)
Default: ```undefined```

This option allows to limit the number of translations that can be used. The names that are whitelisted need to match the filename 
(without the extension). Any other files will still be loaded into the list of available dictionaries, but no files will be
generated. The option is ignored if it is missing.

### blacklist

Type: Array(string)
Default: ```undefined```

The opposite of the whitelist. Any language specified here will be ignored during processing.


### warn

Type: boolean
Default: ```true```

This enables warning to be printed out if any tokens are missing.
