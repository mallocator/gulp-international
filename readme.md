# gulp-international 
[![npm version](https://badge.fury.io/js/gulp-international.svg)](http://badge.fury.io/js/gulp-international)
[![Build Status](https://travis-ci.org/mallocator/gulp-international.svg?branch=master)](https://travis-ci.org/mallocator/gulp-international)
[![Coverage Status](https://coveralls.io/repos/mallocator/gulp-international/badge.svg?branch=master&service=github)](https://coveralls.io/github/mallocator/gulp-international?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/gulp-international.svg)](https://david-dm.org/mallocator/gulp-international) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmallocator%2Fgulp-international.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmallocator%2Fgulp-international?ref=badge_shield)


This is a plugin for gulp that allows you to replace your custom placeholders for different language versions of your translations.
Call it i18n, localization, translation or whatever you want, in the end it's basically a token replacer with multiple source 
files to create multiple versions of your original.

There are a few other plugins out there that I've tried but couldn't quite get to do what I wanted. Maybe they work better for you:
[gulp-i18n](https://www.npmjs.com/package/gulp-i18n) 
[gulp-localize](https://www.npmjs.com/package/gulp-localize)
[gulp-static-i18n](https://www.npmjs.com/package/gulp-static-i18n)
[gulp-i18n-localize](https://www.npmjs.com/package/gulp-i18n-localize)
[gulp-l10n](https://www.npmjs.com/package/gulp-l10n)
Rather than dig in their code I wanted to use this opportunity to learn how to write plugins for gulp. So if none of those do the
trick you can try this little plugin.

Features (cause we all love features):
 
 * Custom token formats
 * Custom language descriptors
 * Custom filename format
 * Custom translation source directory
 * Read from .json, .js, .ini or .csv file (for examples check the test folder),
 * Filters for individual files
 


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

Or with your custom options if the out of box config doesn't work:

```js
var gulp = require('gulp');
var international = require('gulp-international');

gulp.task('default', function () {
	return gulp.src('src/file.ext')
		.pipe(international({
		  whitelist: 'en_US'
		}))
		.pipe(gulp.dest('dist'));
});
```



## Options

This module tries to be very flexible with it's configuration option. For many options you can define either a boolean, a string, a 
regular expression or an array with a mixture of string and regular expressions. If a boolean is passed in the option is simply set 
to true or false for all files. If the option is a string the filename is searched for this substring. If the option is regular
expression it is tested against each file, and finally if the option is an array the test is executed against every element of the
array and accepted if any of the elements returns true with the previous rules defined. You could even nest arrays if you wanted to.

An example:
```
options.ignoreTokens = [ 'de_DE', /en_*/ ]
// => matches any english language as well the German translation for Germany
```


### locales

Type: string (path)  
Default: ```./locales```

This tells the script where to look for translation files. Currently supported are .json, .js, .ini and .csv files. Each format supports
nested keys (.ini only 1 level via sections). The name of the file is used for generating the output file. A source file with name
```index.html``` with a translation file called ```en_US.json``` would result in an output file called ```index-en_US.html```.  
You don't have to use this format. Basically any name is valid for the file and will be used later on as the language placeholder.


### filename

Type: string  
Default: ```${path}/${name}-${lang}.${ext}```

This option allows the user to configure the output format as desired. The default will generate all files in the same directory
with the language suffix.

There are 4 placeholders available:

 * ```lang```: The filename of the translation file without extension (e.g. 'en_US')
 * ```path```: The relative filepath inside the target directory (e.g. 'static')
 * ```name```: The original filename (e.g. 'index')
 * ```ext```: The original file extension (e.g. 'html')
 
Here are a few examples of what the results would be:
 
 ```
 ${path}/${name}-${lang}.${ext} = static/index-en_US.html
 ${lang}/${path}/${name}.${ext} = en_US/static/index.html
 ${path}/${name}.${ext}.${lang} = static/index.html.en_US
 ${lang}/${name}.${ext} = en_US/index.html   // ignores the path and copies everything in the same dir
 ```


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
is used to determine where a token ends (exclusively). The default settings look for either whitespace or a selection of special 
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

For help a flow graph of the files and content generated during the process:
```
source.file -> source-lang1.file -> translated content
            -> source-lang2.file -> translated content
```


### whitelist

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```true```

This option allows to limit the number of translations that can be used. The names that are whitelisted need to match the filename 
(without the extension). Any other files will still be loaded into the list of available dictionaries, but no files will be
generated. The option will allow any locale if it's set to true. You can either define a single locale with a string/RegExp or multiple 
with an array of strings and RegExp's.


### blacklist

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```false```

The opposite of the whitelist. Any language specified here will be ignored during processing. You can either define a single locale 
with a string or multiple with an array of strings.


### encodeEntities

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```true```

Any non utf8 characters that do not map to html are replaced with html entities if this option is enabled. A translation such as "über"
would be replaced with "&uuml;ber". If the setting is a regular expression then only files with a matching (original) filename will be 
escaped. If the option is instead a string then the filename is searched for this substring.


### warn

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```true```

This enables warnings to be printed out if any tokens are missing. If the setting is a regular expression then only files with a matching 
(original) filename will throw warnings. If the option is instead a string then the filename is searched for this substring.


### cache

Type: boolean  
Default: ```true```

This enables caching of dictionaries, so that reruns of the plugin will not have to read in the translation tokens again. Depending
on your configuration you might want to disable caching based on how your livereloads are configured.


### ignoreErrors

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```false```

Allows to disable throwing of any errors that might occur so that the pipe will continue executing. If the setting is a regular expression 
then only files with a matching (original) filename will ignore errors. If the option is instead a string then the filename is searched for 
this substring.


### dryRun

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```false```

When set to true the plugin will perform all operations for a translation, but will pass on the original file along the pipe instead
of the newly generated ones. If the setting is a regular expression then only files with a matching (original) filename will be 
ignored. If the option is instead a string then the filename is searched for this substring.

Flow graph:
```
source.file -> source.file -> original content
```


### ignoreTokens

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```false```

When set to true the plugin will ignore all tokens, but still create new files as if they were different for each language. This
differs from a dryRun, which would instead pass on the original file. If the setting is a regular expression then only files 
with a matching (original) filename will be ignored. If the option is instead a string then the filename is searched for this substring.

Flow graph:
```
source.file -> source-lang1.file -> original content
            -> source-lang2.file -> original content
```


### includeOriginal

Type: boolean|string|string[]|RegExp|RegExp[]  
Default: ```false```

When set to true the original file is passed along the pipe along with all translated files. If the setting is a regular expression then 
only files with a matching (original) filename will be included. If the option is instead a string then the filename is searched for this 
substring.

Flow graph:
```
source.file -> source.file       -> original content
            -> source-lang1.file -> translated content
            -> source-lang2.file -> translated content
```


### verbose

Type: boolean  
Default: ```false```

This option will log a lot more information to the console. Enable this if you can't quite get the plugin to do what you want it to and
need some more details.



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

The tokens map the same way as a JSON file would. If you don't know which format to choose I would suggest this one. 


### CSV

In this format all except for the last readable field will make up the token. The last field will be the translation.
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



## Tips and Tricks

### Dynamic scripts based on language

Sometimes you have dynamic scripts that you generate where you want to react differently based on the language that is being used. For 
example let's say that you have a javascript file and need the language to be available from a variable. Simply set up the plugin to run
before the script is being executed on the script itself and include a line such as ```var lang = 'R.lang'```. All you have to do to 
make this working is have a key in your definition with the name "lang".


### Placeholder formatting

Again if you replace the string that is already there it is easy to integrate with existing formatting functions. Run the plugin before 
the script is being executed and you can make use of formatters such as sprintf, util.format, console.log and others. Since it's common
to use gulp for browser projects here's a simple formatting function you can make use of (taken from 
[StackOverflow](http://stackoverflow.com/questions/1038746/equivalent-of-string-format-in-jquery)):
 
```
/**
 * Add formating function to string objects.
 * @returns {string}
 */
String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{\{|}}|\{(\d+)}/g, function (m, n) {
        if (m == "{{") { return "{"; }
        if (m == "}}") { return "}"; }
        return args[n];
    });
};
```

With a function like this you can create smarter translations such as:

```
token1={0} is {1}, isn't it?

"R.token1".format('JS', 'awesome');

=> "JS is awesome, isn't it?"
```



## Feature Ideas for the future

Maybe I'll implement these one day, maybe not.

 * Replace links to standard versions with internationalized versions (can probably also just be done with using tokens for imports)
 * Extract non code strings from source and list them as still missing translations (difficult to doif this should work for any type of
 source file
 * Warn about unused translation strings (probably easy to do, but not sure if it's worth the effort)
 * Make translations available as environment variables in jade/js/coffeescript/etc. (although you can already replace strings anywhere)
 * Support streams... although that seems like a pain to implement
 * Support printing of token trees if they are nested (as a json object that can e.g. be parsed by another script... although at this
 point you might just as well include the original source file and not have it run through here.)
 * Look for language files recursively
 * Merge multiple language files (Using some sort of merge pattern? or by just merging files that have the same filename without ext & path)


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmallocator%2Fgulp-international.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmallocator%2Fgulp-international?ref=badge_large)