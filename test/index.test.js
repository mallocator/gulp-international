'use strict';

var fs = require('fs');

var _ = require('lodash');
var expect = require('chai').expect;
var File = require('vinyl');
var gently = new (require('gently'));
var gutil = require('gulp-util');

var plugin = require('../');


describe('gulp-international', () => {

  describe('Usage Examples', () => {

    it('should be able to replace token with a default configuration', done => {
      var options = { locales: 'test/locales' };
      helper(options, (files, options) => {
        expect(options.delimiter.prefix.length).to.be.gt(0);
        expect(options.delimiter.stopCondition).to.be.a('RegExp');
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        done();
      });
    });


    it('should be able to replace token with custom suffix delimiters', done => {
      var content = '<html><body><h1>${token1}</h1></body></html>';
      var options = {
        locales: 'test/locales',
        delimiter: { prefix: '${',  suffix: '}' }
      };
      helper(options, content , files => {
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
        done();
      });
    });


    it('should be able to limit languages to a whitelist', done => {
      var options = { locales: 'test/locales', whitelist: 'en_US' };
      helper(options, files => {
        expect(files.length).to.equal(1);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>content1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-en_US.html');
        done();
      });
    });


    it('should not process languages on the blacklist', done => {
      var options = { locales: 'test/locales', blacklist: 'en_US', encodeEntities: false };
      helper(options, files => {
        expect(files.length).to.equal(3);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        expect(files[2].contents.toString('utf8')).to.equal('<html><body><h1>conteúdo1</h1></body></html>');
        expect(files[2].path).to.equal('test/helloworld-pt-BR.html');
        done();
      });
    });


    it('should be able to processes nested keys', done => {
      var content = '<html><body><h1>R.section1.token2</h1></body></html>';
      var options = { locales: 'test/locales' };
      helper(options, content, files => {
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt2</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>content2</h1></body></html>');
        expect(files[1].path).to.equal('test/helloworld-en_US.html');
        done();
      });
    });


    it('should be able to use csv data as translation files', done => {
      var options = { locales: 'test/locales', whitelist: 'fr_FR' };
      helper(options, files => {
        expect(files.length).to.equal(1);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>contenu1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-fr_FR.html');
        done();
      });
    });


    it('should support a custom filename format', done => {
      var options = { locales: 'test/locales', filename: '${path}/${lang}/${name}.${ext}' };
      helper(options, files => {
        expect(files[0].path).to.equal('test/de_DE/helloworld.html');
        expect(files[1].path).to.equal('test/en_US/helloworld.html');
        expect(files[2].path).to.equal('test/fr_FR/helloworld.html');
        expect(files[3].path).to.equal('test/pt-BR/helloworld.html');
        done();
      });
    });


    it('should pass on the original file if this is just a dry run', done => {
      var options = { locales: 'test/locales', dryRun: true };
      helper(options, files => {
        expect(files.length).to.equal(1);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld.html');
        done();
      });
    });


    it('should ignore tokens if the option is set', done => {
      var options = {locales: 'test/locales', ignoreTokens: true};
      helper(options, files => {
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[1].path).to.equal('test/helloworld-en_US.html');
        expect(files[2].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[2].path).to.equal('test/helloworld-fr_FR.html');
        expect(files[3].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[3].path).to.equal('test/helloworld-pt-BR.html');
        done();
      });
    });


    it('should only ignore matching files if the ignore tokens option is a regular expression', done => {
      var options = {locales: 'test/locales', ignoreTokens: /hello/};
      helper(options, files => {
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[1].path).to.equal('test/helloworld-en_US.html');
        expect(files[2].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[2].path).to.equal('test/helloworld-fr_FR.html');
        expect(files[3].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[3].path).to.equal('test/helloworld-pt-BR.html');
        done();
      });
    });


    it ('should include the original file as well as all translations', done => {
      var options = { locales: 'test/locales', includeOriginal: true };
      helper(options, files => {
        expect(files.length).to.equal(5);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>R.token1</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld.html');
        expect(files[1].contents.toString('utf8')).to.equal('<html><body><h1>Inhalt1</h1></body></html>');
        expect(files[1].path).to.equal('test/helloworld-de_DE.html');
        done();
      });
    });


    it('should log a warning for a missing translation key', done => {
      var content = '<html><body><h1>R.nonExistentToken</h1></body></html>';
      var options = { locales: 'test/locales' };

      gently.expect(gutil, 'log', 4, function() {
        expect(arguments[3]).to.equal('nonExistentToken');
      });

      helper(options, content, () => {
        gently.verify();
        done();
      });
    });


    it('should translate html entities if the option is enabled (default)', done => {
      var content = '<html><body><h1>R.entity</h1></body></html>';
      var options = { locales: 'test/locales', whitelist: 'de_DE' };
      helper(options, content, files => {
        expect(files[0].contents.toString()).to.equal('<html><body><h1>S&uuml;p&auml;r Sp&auml;&szlig;&ouml;!</h1></body></html>');
        done();
      });
    });
  });

  describe('Error cases', () => {

    it('should work with A number of delimiters', done => {
      var stopSignals = "\"'{}[]|~`:;,/!@#$%^&*()=+<>`";
      var options = { locales: 'test/locales', whitelist: 'en_US' };
      var processed = 0;
      for (let i = 0; i < stopSignals.length; i++) {
        var content = stopSignals[i] + "R.token1" + stopSignals[i];
        helper(options, content, files => {
          expect(files[0].contents.toString('utf8')).to.equal(stopSignals[i] + "content1" + stopSignals[i]);
          processed++;
          if (processed == stopSignals.length) {
            done();
          }
        });
      }
    });


    it('should leave files without tokens unprocessed', done => {
      var content = '<html><body>Not replaced</body></html>';
      var options = { locales: 'test/locales' };
      helper(options, content, files => {
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body>Not replaced</body></html>');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        done();
      });
    });


    it('should be able to process an empty file', done => {
      var content = '';
      var options = { locales: 'test/locales' };
      helper(options, content, files => {
        expect(files.length).to.equal(4);
        expect(files[0].contents.toString('utf8')).to.equal('');
        expect(files[0].path).to.equal('test/helloworld-de_DE.html');
        done();
      });
    });


    it('should throw an error if a file is a stream', done => {
      var stream = plugin({ locales: 'test/locales' });
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
        done();
      }
    });


    it('should not ignore translation values that are empty', done => {
      var content = '<html><body><h1>R.emptyToken</h1></body></html>';
      var options = {
        locales: 'test/locales',
        whitelist: 'en_US'
      };
      gently.expect(gutil, 'log', 1, function() {
        expect.fail("Token shouldn't have been logged as missing");
      });
      helper(options, content , files => {
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1></h1></body></html>');
        try { gutil.log() } catch(e) {/* ignore gently cleanup */}
        done();
      });
    });


    it('should throw an error if no dictionaries have been found', done => {
      var options = {
        locales: 'test/notlocales',
        cache: false
      };
      try {
        helper(options, files => {});
        expect.fail();
      } catch (e) {
        expect(e.message).to.equal('No translation dictionaries have been found!');
        done();
      }
    });


    it('should throw an error if no existing dictionaries have been whitelisted', () => {
      var options = {
        locales: 'test/locales',
        whitelist: 'es_ES'
      };
      try{
        helper(options, files => {});
      } catch(e) {
        expect(e.message).to.equal('No translation dictionaries available to create any files!');
      }
    });


    it('should work on source files that have no tokens', done => {
      var content = '<html><body><h1>notatoken</h1></body></html>';
      var options = {
        locales: 'test/locales',
        whitelist: 'en_US'
      };
      helper(options, content, files => {
        expect(files.length).to.equal(1);
        expect(files[0].contents.toString('utf8')).to.equal('<html><body><h1>notatoken</h1></body></html>');
        expect(files[0].path).to.equal('test/helloworld-en_US.html');
        done();
      });
    });


    it('should just continue if the passed in file is null', () => {
      plugin({ locales: 'test/locales'}).write(null);
    });


    it('should just continue if the file content is null', () => {
      plugin({locales: 'test/locales'}).write(new File());
    });


    it('should ignore errors if ignoreErrors is set', () => {
      var options = {
        locales: 'test/locales',
        whitelist: 'es_ES',
        ignoreErrors: true
      };
      try{
        helper(options, files => {});
      } catch(e) {
        expect.fail('No Error should have been thrown.');
      }
    });


    it('should be fast', done => {
      var content = fs.readFileSync('test/locales/lorem.ipsum').toString('utf8');
      var options = { locales: 'test/locales', whitelist: 'en_US' };
      var start = process.hrtime();
      helper(options, content, () => {
        var end = process.hrtime(start);
        expect(end[0] * 1e3 + end[1] * 1e-6).to.be.lt(25);
        done();
      });
    });


    it('should be able to process a larger file with multiple replacements', done => {
      var content = `
<html>
<body>
  <h1>R.section1.token2</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">R.token1</div>
  <hr />
  <p>R.section1.subsection2.token3</p>
</body>
</html>
`;
      var options = {
        locales: 'test/locales',
        whitelist: ['en_US', 'pt-BR'],
        encodeEntities: false
      };
      helper(options, content, files => {
        expect(files.length).to.equal(2);

        expect(files[0].path).to.equal('test/helloworld-en_US.html');
        expect(files[0].contents.toString('utf8')).to.equal(`
<html>
<body>
  <h1>content2</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">content1</div>
  <hr />
  <p>content3</p>
</body>
</html>
`);

        expect(files[1].path).to.equal('test/helloworld-pt-BR.html');
        expect(files[1].contents.toString('utf8')).to.equal(`
<html>
<body>
  <h1>conteúdo2</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">conteúdo1</div>
  <hr />
  <p>conteúdo3</p>
</body>
</html>
`);
        done();
      });


      it('should be able to process a larger file with multiple replacements with a suffix delimiter', done => {
        var content = `
<html>
<body>
  <h1>${section1.token2}</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">${R.token1}</div>
  <hr />
  <p>${R.section1.subsection2.token3}</p>
</body>
</html>
`;
        var options = {
          locales: 'test/locales',
          whitelist: ['en_US', 'pt-BR'],
          delimiter: {
            prefix: '${',
            suffix: '}'
          }
        };
        helper(options, content, files => {
          expect(files.length).to.equal(2);

          expect(files[0].path).to.equal('test/helloworld-en_US.html');
          expect(files[0].contents.toString('utf8')).to.equal(`
<html>
<body>
  <h1>content2</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">content1</div>
  <hr />
  <p>content3</p>
</body>
</html>
`);

          expect(files[1].path).to.equal('test/helloworld-pt-BR.html');
          expect(files[1].contents.toString('utf8')).to.equal(`
<html>
<body>
  <h1>conteúdo2</h1>
  <img src="img/mascot.png" alt="Our funny mascot" />
  <div class="welcome">conteúdo1</div>
  <hr />
  <p>conteúdo3</p>
</body>
</html>
`);
          done();
        });
      });
    });
  });
});

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
    validatorCb(files, plugin.options);
  });
  stream.write(new File({
    path: 'test/helloworld.html',
    cwd: 'test/',
    base: 'test/',
    contents: new Buffer(content, 'utf8')
  }));
  stream.end();
}
