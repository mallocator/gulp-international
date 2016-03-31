# gulp-international 
[![npm version](https://badge.fury.io/js/gulp-international.svg)](http://badge.fury.io/js/gulp-international)
[![Build Status](https://travis-ci.org/mallocator/gulp-international.svg?branch=master)](https://travis-ci.org/mallocator/gulp-international)
[![Coverage Status](https://coveralls.io/repos/mallocator/gulp-international/badge.svg?branch=master&service=github)](https://coveralls.io/github/mallocator/gulp-international?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/gulp-international.svg)](https://david-dm.org/mallocator/gulp-international) 

This is a plugin for gulp that allows you to replace your custom placeholders for different language versions of your translations.

There are already a few plugins for i18n out there, but none of them seem to work properly. Rather than dig in their code I wanted
to use this opportunity to learn how to write plugins for gulp.  


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


## API

### international(options)

#### options

###### delimiter

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
