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

Or with your custom options of the out of box config dones't work:

```js
var gulp = require('gulp');
var international = require('gulp-international');

gulp.task('default', function () {
	return gulp.src('src/file.ext')
		.pipe(international({
		  whitelist: ['en_US']
		}))
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
  stopCondition: /[^\.\w_\-]/
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


### cache

Type: boolean  
Default: ```true```

This enables caching of dictionaries, so that reruns of the plugin will not have to read in the translation tokens again. Depending
on your configuration you might want to disable caching based on how your livereloads are configured.


### ignoreErrors

Type: boolean  
Default: ```false```

Allows to disable throwing of any errors that might occur so that the pipe will continue executing.


### dryRun

Type: boolean  
Default: ```false```

When set to true the plugin will perform all operations for a translation, but will pass on the original file along the pipe instead
of the newly generated ones.


### includeOriginal

Type: boolean  
Default: ```false```

When set to true the original file is passed along the pipe as well along with all translated files.



## Translation Files

A number of formats are supported from where we can read translations:


### JSON

```
{
  "token1": "translation1",
  "section1": {
    "token2": "translation2",
    "subsection1": {
      "token3": "translation3"
    }
  }
}
```

This results in 3 tokens that look like this (With default delimiter settings):

```
R.token1 = translation1
R.section1.token2 = translation2
R.section1.subsection1.token3 = translation3
```


### JS

Similar to JSON you can just use node.js module and export your json:

```
module.exports = {
  token1: 'translation1',
  section1: {
    token2: 'translation2', // This format also allows comments
    subsection1: {
      token3: 'translation3'
    }
  }
}
```

The tokens map the same way as a JSON file would. If you don't know which format to choose I would choose this one. 


### CSV

In this format all except for the last readable field will make up  the token. The last field will be the translation.
To get the same output as with the previous examples the file would look something like this:

```
token1,,,translation1
token2,section1,,translation2
token3,section1,subsection1,translation3
```

This library doesn't really check for a correct CSV format and also doesn't assume a header line. It just scans for fields
that it can use to build it's keys. Another valid format to read translations would be this non standard csv file:

```
token1,translation1
token2,section1,translation2
token3,section1,subsection1,translation3
```

If you have fields with ```,``` in them you can escape them ```"```, which in turn can also be escaped using ```\"```.


### INI

The standard .ini format is supported as well, but only supports one level of nesting. You can simulate multiple levels though:

```
token1=translation1

[section1]
token2=translation2

[section1.subsection1]
token3=translation3
```



## Feature Ideas for the future

Maybe I'll implement these one day, maybe not.

 * Replace links to standard versions with internationalized versions (can probably also just be done with using tokens for imports)
 * Extract non code strings from source and list them as still missing translations
 * Warn about unused translation strings
 * Make translations available as environment variables in jade/js/coffeescript/etc. (although you can already replace strings anywhere)
 * Support streams... although that seems like a pain to implement
