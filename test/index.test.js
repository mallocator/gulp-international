'use strict';

var fs = require('fs');

var _ = require('lodash');
var expect = require('chai').expect;
var File = require('vinyl');

var plugin = require('../');


/**
 * Performs common tasks that need to be run for every test. Makes setting up and understanding tests way easier.
 */
function helper() {
  var options = {};
  var content = '<html><body><h1>R.token1</h1></body></html>';
  var validatorCb;
  for(let param of arguments) {
    if (_.isString(param)) {
      content = param
    } else if (_.isFunction(param)) {
      validatorCb = param;
    } else if (_.isObject(param)) {
      options = param;
    }
  }
  expect(validatorCb).to.be.a('function');
  expect(content).to.be.a('string');

  var stream = plugin(options);
  var files = [];
  stream.on('data', file => {
    files.push(file);
  });
  stream.on('finish', () => {
    validatorCb(files, stream.options);
  });
  stream.write(new File({
    path: 'test/helloworld.html',
    cwd: 'test/',
    base: 'test/',
    contents: new Buffer(content, 'utf8')
  }));
  stream.end();
}

describe('gulp-international', () => {


  it('should be able to replace token with a default configuration', done => {
    var options = {
      locales: 'test/locales'
    };

    helper(options, (files, options) => {
      expect(options.delimiter.prefix.length).to.be.gt(0);
      expect(options.delimiter.stopCondition).to.be.a('RegExp');
      expect(files.length).to.equal(3);
      expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
      expect(files[0].path).to.equal('test/helloworld-de_DE.html');
      done();
    });
  });


  it('should be able to replace token with custom suffix delimiters', done => {
    var content = '<html><body><h1>${token1}</h1></body></html>';
    var options = {
      locales: 'test/locales',
      delimiter: {
        prefix: '${',
        suffix: '}'
      }
    };
    helper(options, content , files => {
      expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
      done();
    });
  });


  it('should be able to replace token with custom suffix delimiters', done => {
    var options = {
      locales: 'test/locales',
      whitelist: 'en_US'
    };
    helper(options, files => {
      expect(files.length).to.equal(1);
      expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>content1</h1></body></html>');
      expect(files[0].path).to.equal('test/helloworld-en_US.html');
      done();
    });
  });


  it('should not process languages on the blacklist', done => {
    var options = {
      locales: 'test/locales',
      blacklist: 'en_US'
    };
    helper(options, files => {
      expect(files.length).to.equal(2);
      expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
      expect(files[0].path).to.equal('test/helloworld-de_DE.html');
      expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>conteúdo1</h1></body></html>');
      expect(files[1].path).to.equal('test/helloworld-pt-BR.html');
      done();
    });
  });


  it('should leave files without tokens unprocessed', done => {
    var content = '<html><body>Not replaced</body></html>';
    var options = {
      locales: 'test/locales'
    };
    helper(options, content, files => {
      expect(files.length).to.equal(3);
      expect(files[0].contents.toString('utf8')).to.equal('<html><body>Not replaced</body></html>');
      expect(files[0].path).to.equal('test/helloworld-de_DE.html');
      done();
    });
  });


  it('should be able to process an empty file', done => {
    var content = '';
    var options = {
      locales: 'test/locales'
    };
    helper(options, content, files => {
      expect(files.length).to.equal(3);
      expect(files[0].contents.toString('utf8')).to.equal('');
      expect(files[0].path).to.equal('test/helloworld-de_DE.html');
      done();
    });
  });


  it('should be able to processes nested keys', done => {
    var content = '<html><body><h1>R.section1.token2</h1></body></html>';
    var options = {
      locales: 'test/locales'
    };
    helper(options, content, files => {
      expect(files.length).to.equal(3);
      expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt2</h1></body></html>');
      expect(files[0].path).to.equal('test/helloworld-de_DE.html');
      expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>content2</h1></body></html>');
      expect(files[1].path).to.equal('test/helloworld-en_US.html');
      done();
    });
  });


  it('should support a custom filename format', done => {
    var options = {
      locales: 'test/locales',
      filename: '${lang}/${name}.${ext}'
    };
    helper(options, files => {
      expect(files[0].path).to.equal('de_DE/helloworld.html');
      expect(files[1].path).to.equal('en_US/helloworld.html');
      expect(files[2].path).to.equal('pt-BR/helloworld.html');
      done();
    });
  });


  it('should throw an error if a file is null', () => {
    try {
      plugin().write(null);
      expect.fail();
    } catch (e) {
      expect(e).to.be.an('Error');
    }
  });


  it('should throw an error if a file is a stream', () => {
    var stream = plugin();
    try {
      stream.write(new File({
        path: 'test/helloworld.html',
        cwd: 'test/',
        base: 'test/',
        contents: new fs.createReadStream('locales/de_DE.ini')
      }));
      expect.fail();
    } catch (e) {
      expect(e.message).to.equal('Streaming not supported');
    }
  });


  it('should throw an error if no dictionaries have been found', () => {
    var options = {
      locales: 'test/notlocales'
    };
    try {
      helper(options, files => {});
      expect.fail();
    } catch (e) {
      expect(e).to.be.an('Error');
    }
  });
});
